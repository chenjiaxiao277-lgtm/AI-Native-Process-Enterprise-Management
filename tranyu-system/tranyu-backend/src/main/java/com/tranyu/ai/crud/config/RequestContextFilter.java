package com.tranyu.ai.crud.config;

import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 请求上下文过滤器：从请求头初始化租户、空间、用户主体上下文。
 */
@Component("platformRequestContextFilter")
public class RequestContextFilter extends OncePerRequestFilter {

    private static final String HEADER_TENANT_ID = "X-Tenant-Id";
    private static final String HEADER_SPACE_ID = "X-Space-Id";
    private static final String HEADER_USER_ID = "X-User-Id";
    private static final String HEADER_USERNAME = "X-Username";
    private static final String DEFAULT_TENANT_CODE = "TRANYU_DEFAULT";

    private final JdbcTemplate jdbcTemplate;
    private volatile Long cachedDefaultTenantId;

    public RequestContextFilter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            initTenantContext(request);
            initSpaceContext(request);
            initAuthSubjectContext(request);
            filterChain.doFilter(request, response);
        } finally {
            AuthSubjectContext.clear();
            SpaceContext.clear();
            TenantContext.clear();
        }
    }

    private void initTenantContext(HttpServletRequest request) {
        String tenantId = normalize(request.getHeader(HEADER_TENANT_ID));
        if (tenantId == null) {
            Long defaultTenantId = resolveDefaultTenantId();
            tenantId = defaultTenantId == null ? null : String.valueOf(defaultTenantId);
        }
        if (tenantId != null) {
            TenantContext.set(tenantId);
        }
    }

    private void initSpaceContext(HttpServletRequest request) {
        String spaceId = normalize(request.getHeader(HEADER_SPACE_ID));
        if (spaceId != null) {
            SpaceContext.set(spaceId);
        }
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

    private Long resolveDefaultTenantId() {
        if (cachedDefaultTenantId != null) {
            return cachedDefaultTenantId;
        }
        try {
            Long tenantId = jdbcTemplate.query(
                    """
                    SELECT id
                    FROM tr_tenant
                    WHERE tenant_code = ?
                      AND deleted_flag = 0
                    ORDER BY id
                    LIMIT 1
                    """,
                    ps -> ps.setString(1, DEFAULT_TENANT_CODE),
                    rs -> rs.next() ? rs.getLong("id") : null
            );
            cachedDefaultTenantId = tenantId;
            return tenantId;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
