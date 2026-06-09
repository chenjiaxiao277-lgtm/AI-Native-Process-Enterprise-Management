package com.tranyu.service;

/**
 * 角色边界定义（MVP）
 * 仅用于代码层标识与后续扩展，不涉及权限裁决。
 */
public final class RoleBoundary {

    private RoleBoundary() {
    }

    public static final String PLATFORM_ADMIN = "PLATFORM_ADMIN";
    public static final String TENANT_ADMIN = "TENANT_ADMIN";
    public static final String SPACE_SUPER_ADMIN = "SPACE_SUPER_ADMIN";
    public static final String SPACE_OWNER = "SPACE_OWNER";
    public static final String SPACE_USER = "SPACE_USER";
}
