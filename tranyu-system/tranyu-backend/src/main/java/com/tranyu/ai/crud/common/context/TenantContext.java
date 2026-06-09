package com.tranyu.ai.crud.common.context;

/**
 * 平台租户上下文门面，复用现有线程上下文存储。
 */
public final class TenantContext {

    private TenantContext() {
    }

    public static void set(String tenantId) {
        com.tranyu.context.TenantContext.set(tenantId);
    }

    public static String get() {
        return com.tranyu.context.TenantContext.get();
    }

    public static void setCurrentTenantId(String tenantId) {
        com.tranyu.context.TenantContext.setCurrentTenantId(tenantId);
    }

    public static String getCurrentTenantId() {
        return com.tranyu.context.TenantContext.getCurrentTenantId();
    }

    public static String getCurrentTenantIdOrDefault() {
        return com.tranyu.context.TenantContext.getCurrentTenantIdOrDefault();
    }

    public static void clear() {
        com.tranyu.context.TenantContext.clear();
    }
}
