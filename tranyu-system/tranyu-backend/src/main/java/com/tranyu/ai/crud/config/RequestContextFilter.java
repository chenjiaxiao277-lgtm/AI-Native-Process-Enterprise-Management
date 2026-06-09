package com.tranyu.ai.crud.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tranyu.ai.crud.common.context.AuthSubjectContext;
import com.tranyu.ai.crud.common.context.SpaceContext;
import com.tranyu.ai.crud.common.context.TenantContext;
import com.tranyu.ai.crud.common.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 请求上下文过滤器：从请求头初始化租户、空间、用户主体上下文。
 */
@Component("platformRequestContextFilter")
public class RequestContextFilter extends OncePerRequestFilter {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String HEADER_TENANT_ID = "X-Tenant-Id";
    private static final String HEADER_SPACE_ID = "X-Space-Id";
    private static final String HEADER_USER_ID = "X-User-Id";
    private static final String HEADER_USERNAME = "X-Username";
    private static final String DEFAULT_TENANT_CODE = "TRANYU_DEFAULT";
    private static final String MASTER_SPACE_CODE = "MASTER";

    private final JdbcTemplate jdbcTemplate;
    private volatile Long cachedDefaultTenantId;

    public RequestContextFilter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            if (!initTenantContext(request, response)) {
                return;
            }
            if (!initSpaceContext(request, response)) {
                return;
            }
            initAuthSubjectContext(request);
            filterChain.doFilter(request, response);
        } finally {
            AuthSubjectContext.clear();
            SpaceContext.clear();
            TenantContext.clear();
        }
    }

    private boolean initTenantContext(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String tenantIdHeader = normalize(request.getHeader(HEADER_TENANT_ID));
        if (tenantIdHeader != null) {
            Long tenantId = parseTenantId(tenantIdHeader);
            if (tenantId == null) {
                writeFailure(response, ErrorCode.PARAM_ERROR.getCode(), "X-Tenant-Id无效", HttpServletResponse.SC_BAD_REQUEST);
                return false;
            }
            TenantRecord tenant = resolveTenantById(tenantId);
            if (tenant == null) {
                writeFailure(response, ErrorCode.DATA_NOT_FOUND.getCode(), "当前租户不存在", HttpServletResponse.SC_NOT_FOUND);
                return false;
            }
            if (!tenant.enabled()) {
                writeFailure(response, ErrorCode.FORBIDDEN.getCode(), "当前租户已停用", HttpServletResponse.SC_FORBIDDEN);
                return false;
            }
            TenantContext.set(String.valueOf(tenant.id()));
            return true;
        }

        TenantRecord defaultTenant = resolveDefaultTenant();
        if (defaultTenant != null && defaultTenant.enabled()) {
            TenantContext.set(String.valueOf(defaultTenant.id()));
        }
        return true;
    }

    private boolean initSpaceContext(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String tenantIdText = TenantContext.get();
        if (tenantIdText == null || tenantIdText.isBlank()) {
            return true;
        }
        Long tenantId = parseTenantId(tenantIdText);
        if (tenantId == null) {
            writeFailure(response, ErrorCode.PARAM_ERROR.getCode(), "当前租户上下文无效", HttpServletResponse.SC_BAD_REQUEST);
            return false;
        }

        String spaceIdHeader = normalize(request.getHeader(HEADER_SPACE_ID));
        if (spaceIdHeader != null) {
            Long spaceId = parseTenantId(spaceIdHeader);
            if (spaceId == null) {
                writeFailure(response, ErrorCode.PARAM_ERROR.getCode(), "X-Space-Id无效", HttpServletResponse.SC_BAD_REQUEST);
                return false;
            }
            SpaceRecord space = resolveSpaceByTenantAndId(tenantId, spaceId);
            if (space == null) {
                SpaceRecord existsInOtherTenant = resolveSpaceById(spaceId);
                if (existsInOtherTenant != null) {
                    writeFailure(response, ErrorCode.FORBIDDEN.getCode(), "当前空间不属于当前租户", HttpServletResponse.SC_FORBIDDEN);
                } else {
                    writeFailure(response, ErrorCode.DATA_NOT_FOUND.getCode(), "当前空间不存在", HttpServletResponse.SC_NOT_FOUND);
                }
                return false;
            }
            if (!space.enabled()) {
                writeFailure(response, ErrorCode.FORBIDDEN.getCode(), "当前空间已停用", HttpServletResponse.SC_FORBIDDEN);
                return false;
            }
            SpaceContext.set(String.valueOf(space.id()));
            return true;
        }

        SpaceRecord masterSpace = resolveMasterSpace(tenantId);
        if (masterSpace != null && masterSpace.enabled()) {
            SpaceContext.set(String.valueOf(masterSpace.id()));
        }
        return true;
    }

    private void initAuthSubjectContext(HttpServletRequest request) {
        String userIdHeader = normalize(request.getHeader(HEADER_USER_ID));
        String username = normalize(request.getHeader(HEADER_USERNAME));
        if (userIdHeader == null && username == null) {
            return;
        }
        Long userId = null;
        if (userIdHeader != null) {
            try {
                userId = Long.valueOf(userIdHeader);
            } catch (NumberFormatException ignored) {
                userId = null;
            }
        }
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(userId, username, null));
    }

    private TenantRecord resolveDefaultTenant() {
        if (cachedDefaultTenantId != null) {
            return resolveTenantById(cachedDefaultTenantId);
        }
        try {
            TenantRecord tenant = jdbcTemplate.query(
                    """
                    SELECT id, status
                    FROM tr_tenant
                    WHERE tenant_code = ?
                      AND deleted_flag = 0
                    ORDER BY id
                    LIMIT 1
                    """,
                    ps -> ps.setString(1, DEFAULT_TENANT_CODE),
                    rs -> rs.next() ? new TenantRecord(rs.getLong("id"), rs.getString("status")) : null
            );
            cachedDefaultTenantId = tenant == null ? null : tenant.id();
            return tenant;
        } catch (Exception ignored) {
            return null;
        }
    }

    private TenantRecord resolveTenantById(Long tenantId) {
        try {
            return jdbcTemplate.query(
                    """
                    SELECT id, status
                    FROM tr_tenant
                    WHERE id = ?
                      AND deleted_flag = 0
                    LIMIT 1
                    """,
                    ps -> ps.setLong(1, tenantId),
                    rs -> rs.next() ? new TenantRecord(rs.getLong("id"), rs.getString("status")) : null
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private SpaceRecord resolveMasterSpace(Long tenantId) {
        try {
            return jdbcTemplate.query(
                    """
                    SELECT id, tenant_id, status
                    FROM tr_space
                    WHERE tenant_id = ?
                      AND space_code = ?
                      AND deleted_flag = 0
                    ORDER BY id
                    LIMIT 1
                    """,
                    ps -> {
                        ps.setLong(1, tenantId);
                        ps.setString(2, MASTER_SPACE_CODE);
                    },
                    rs -> rs.next() ? new SpaceRecord(rs.getLong("id"), rs.getLong("tenant_id"), rs.getString("status")) : null
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private SpaceRecord resolveSpaceByTenantAndId(Long tenantId, Long spaceId) {
        try {
            return jdbcTemplate.query(
                    """
                    SELECT id, tenant_id, status
                    FROM tr_space
                    WHERE tenant_id = ?
                      AND id = ?
                      AND deleted_flag = 0
                    LIMIT 1
                    """,
                    ps -> {
                        ps.setLong(1, tenantId);
                        ps.setLong(2, spaceId);
                    },
                    rs -> rs.next() ? new SpaceRecord(rs.getLong("id"), rs.getLong("tenant_id"), rs.getString("status")) : null
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private SpaceRecord resolveSpaceById(Long spaceId) {
        try {
            return jdbcTemplate.query(
                    """
                    SELECT id, tenant_id, status
                    FROM tr_space
                    WHERE id = ?
                      AND deleted_flag = 0
                    LIMIT 1
                    """,
                    ps -> ps.setLong(1, spaceId),
                    rs -> rs.next() ? new SpaceRecord(rs.getLong("id"), rs.getLong("tenant_id"), rs.getString("status")) : null
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private Long parseTenantId(String tenantId) {
        try {
            return Long.valueOf(tenantId);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private void writeFailure(HttpServletResponse response, int code, String message, int httpStatus) throws IOException {
        response.setStatus(httpStatus);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        body.put("data", null);
        body.put("success", false);
        response.getWriter().write(JSON.writeValueAsString(body));
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record TenantRecord(Long id, String status) {
        private boolean enabled() {
            return "ENABLED".equalsIgnoreCase(status);
        }
    }

    private record SpaceRecord(Long id, Long tenantId, String status) {
        private boolean enabled() {
            return "ENABLED".equalsIgnoreCase(status);
        }
    }
}
