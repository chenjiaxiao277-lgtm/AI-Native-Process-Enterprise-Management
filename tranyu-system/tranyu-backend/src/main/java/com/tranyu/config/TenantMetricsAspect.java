package com.tranyu.config;

import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 租户维度接口监控切面。
 * 仅记录请求指标，不参与业务逻辑。
 */
@Slf4j
@Aspect
@Component
public class TenantMetricsAspect {

    @Around("within(@org.springframework.web.bind.annotation.RestController *)")
    public Object recordTenantMetrics(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Throwable businessError = null;
        try {
            return joinPoint.proceed();
        } catch (Throwable ex) {
            businessError = ex;
            throw ex;
        } finally {
            try {
                String tenantId = TenantContext.getCurrentTenantIdOrDefault();
                String spaceId = normalize(SpaceContext.getCurrentSpaceId());
                String path = resolveRequestPath();
                long duration = System.currentTimeMillis() - start;
                log.info(
                        "tenant_metrics tenant={} space={} path={} duration={}ms",
                        normalize(tenantId),
                        spaceId,
                        path,
                        duration
                );
            } catch (Exception metricEx) {
                log.debug("Failed to record tenant metrics: {}", metricEx.getMessage());
            }
        }
    }

    private String resolveRequestPath() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            HttpServletRequest request = servletAttributes.getRequest();
            if (request != null && request.getRequestURI() != null && !request.getRequestURI().isBlank()) {
                return request.getRequestURI();
            }
        }
        return "unknown";
    }

    private String normalize(String value) {
        return (value == null || value.isBlank()) ? "-" : value;
    }
}
