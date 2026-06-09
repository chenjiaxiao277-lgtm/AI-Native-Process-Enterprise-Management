-- 入口联调最小账号与权限策略种子（可重复执行）
-- 说明：
-- 1) 仅用于本地联调打通平台/租户/空间入口
-- 2) 不涉及字段系统/流程/WorkItem 主链路
-- 3) 密码统一：123456（BCrypt）

USE ltc_db;

-- 预置平台管理员与租户管理员账号
INSERT INTO sys_user (username, password, real_name, status, deleted, tenant_id)
SELECT 'platform_admin',
       '$2y$10$lR0c6RLRztUuQkoua3SQheHe5A7UmQLO2x4V1.HQxTlU1a.8RYKda',
       '平台管理员', 1, 0, 'default'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'platform_admin' AND deleted = 0);

INSERT INTO sys_user (username, password, real_name, status, deleted, tenant_id)
SELECT 'tenant_admin',
       '$2y$10$lR0c6RLRztUuQkoua3SQheHe5A7UmQLO2x4V1.HQxTlU1a.8RYKda',
       '租户管理员', 1, 0, NULL
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'tenant_admin' AND deleted = 0);

-- 预置角色（可选：仅用于可视化/管理）
INSERT INTO sys_role (role_name, role_code, status, deleted, description, tenant_id, role_scope, role_type)
SELECT '平台管理员', 'PLATFORM_ADMIN', 1, 0, '平台层管理员', 'default', 'TENANT', 'SYSTEM'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE role_code = 'PLATFORM_ADMIN' AND deleted = 0);

INSERT INTO sys_role (role_name, role_code, status, deleted, description, tenant_id, role_scope, role_type)
SELECT '租户管理员', 'TENANT_ADMIN', 1, 0, '租户层管理员', 'default', 'TENANT', 'SYSTEM'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE role_code = 'TENANT_ADMIN' AND deleted = 0);

-- 绑定用户角色（可选）
INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN sys_role r ON r.role_code = 'PLATFORM_ADMIN'
WHERE u.username = 'platform_admin'
  AND NOT EXISTS (SELECT 1 FROM sys_user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN sys_role r ON r.role_code = 'TENANT_ADMIN'
WHERE u.username = 'tenant_admin'
  AND NOT EXISTS (SELECT 1 FROM sys_user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- 预置 default 租户（用于平台入口的默认上下文）
INSERT INTO ltc_tenant (tenant_id, tenant_name, status, remark)
SELECT 'default', '默认租户', 1, '联调默认租户'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM ltc_tenant WHERE tenant_id = 'default');

-- 平台管理员权限策略（租户管理）
INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'tenant', NULL, 'view', 'ALLOW', 'PLATFORM_ADMIN', 'TENANT', 1, '平台管理员-租户查看'
FROM sys_user u
WHERE u.username = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'tenant'
      AND p.action = 'view'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'tenant', NULL, 'create', 'ALLOW', 'PLATFORM_ADMIN', 'TENANT', 1, '平台管理员-租户创建'
FROM sys_user u
WHERE u.username = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'tenant'
      AND p.action = 'create'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'tenant', NULL, 'edit', 'ALLOW', 'PLATFORM_ADMIN', 'TENANT', 1, '平台管理员-租户编辑'
FROM sys_user u
WHERE u.username = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'tenant'
      AND p.action = 'edit'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'tenant', NULL, 'enable', 'ALLOW', 'PLATFORM_ADMIN', 'TENANT', 1, '平台管理员-租户启用'
FROM sys_user u
WHERE u.username = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'tenant'
      AND p.action = 'enable'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'tenant', NULL, 'disable', 'ALLOW', 'PLATFORM_ADMIN', 'TENANT', 1, '平台管理员-租户禁用'
FROM sys_user u
WHERE u.username = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'tenant'
      AND p.action = 'disable'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

