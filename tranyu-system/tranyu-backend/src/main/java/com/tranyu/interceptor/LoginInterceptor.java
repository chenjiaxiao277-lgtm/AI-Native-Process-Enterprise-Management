package com.tranyu.interceptor;

import com.tranyu.config.JwtConfig;
import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * 登录拦截器：
 * - 放行 /api/login
 * - 其余 /api/** 接口需携带有效的 Authorization: Bearer <token>
 *   否则返回 401 和统一错误结构
 *
 * 同时负责初始化 tenant/space/auth-subject 三类请求上下文。
 */
@Component
@RequiredArgsConstructor
public class LoginInterceptor implements HandlerInterceptor {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String HEADER_TENANT = "X-Tenant-Id";
    private static final String HEADER_SPACE = "X-Space-Id";
    private static final String SYSTEM_API_PREFIX = "/api/system/";
    private static final String PLATFORM_API_PREFIX = "/api/platform/";

    private final JwtConfig jwtConfig;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String uri = request.getRequestURI();

        // 只拦截 /api/**，并放行登录接口
        if (!uri.startsWith("/api/")) {
            return true;
        }
        if (uri.equals("/api/login")) {
            return true;
        }
        if ((uri.startsWith(SYSTEM_API_PREFIX) || uri.startsWith(PLATFORM_API_PREFIX))
                && TenantContext.get() != null) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        String token = resolveToken(authHeader);
        if (token == null || token.isBlank()) {
            writeUnauthorized(response, "未登录或登录已过期");
            return false;
        }

        Long userId = jwtConfig.getUserId(token);
        if (userId == null) {
            writeUnauthorized(response, "登录已失效，请重新登录");
            return false;
        }

        Claims claims;
        try {
            claims = jwtConfig.parseToken(token);
        } catch (Exception e) {
            writeUnauthorized(response, "登录已失效，请重新登录");
            return false;
        }

        String tenantId = normalizeHeader(request.getHeader(HEADER_TENANT));
        String spaceId = normalizeHeader(request.getHeader(HEADER_SPACE));
        String username = claims.get("username", String.class);

        TenantContext.setCurrentTenantId(tenantId == null ? TenantContext.getCurrentTenantIdOrDefault() : tenantId);
        if (spaceId != null) {
            SpaceContext.setCurrentSpaceId(spaceId);
        }
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(userId, username, token));

        return true;
    }

    private String resolveToken(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            return null;
        }
        if (authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        AuthSubjectContext.clear();
        SpaceContext.clear();
        TenantContext.clear();
    }

    private String normalizeHeader(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = new HashMap<>();
        body.put("code", -1);
        body.put("message", message);
        body.put("data", null);
        response.getWriter().write(JSON.writeValueAsString(body));
    }
}
