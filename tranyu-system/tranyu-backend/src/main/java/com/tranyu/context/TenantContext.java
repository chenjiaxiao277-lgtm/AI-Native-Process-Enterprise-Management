package com.tranyu.context;

/**
 * 当前请求租户上下文。
 */
public final class TenantContext {

    public static final String DEFAULT_TENANT_ID = "default";

    private static final ThreadLocal<String> HOLDER = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setCurrentTenantId(String tenantId) {
        HOLDER.set(tenantId);
    }

    public static String getCurrentTenantId() {
        return HOLDER.get();
    }

    public static String getCurrentTenantIdOrDefault() {
        String current = HOLDER.get();
        return (current == null || current.isBlank()) ? DEFAULT_TENANT_ID : current;
    }

    public static void clear() {
        HOLDER.remove();
    }
}

