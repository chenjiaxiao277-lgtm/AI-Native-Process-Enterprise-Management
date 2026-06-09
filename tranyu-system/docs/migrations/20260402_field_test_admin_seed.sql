-- 字段联调专用高权限账号种子（可重复执行）
-- 说明：
-- 1) 仅用于字段联调测试，不影响字段系统实现
-- 2) 账号：field_test_admin / 123456（BCrypt）
-- 3) 赋予平台/租户/空间入口最小可用权限

USE ltc_db;

-- 1) 创建测试用户
INSERT INTO sys_user (username, password, real_name, status, deleted, tenant_id)
SELECT 'field_test_admin',
       '$2y$10$lR0c6RLRztUuQkoua3SQheHe5A7UmQLO2x4V1.HQxTlU1a.8RYKda',
       '字段联调管理员', 1, 0, 'default'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'field_test_admin' AND deleted = 0);

-- 2) 角色准备（平台/租户/空间）
INSERT INTO sys_role (role_name, role_code, status, deleted, description, tenant_id, role_scope, role_type)
SELECT '平台管理员', 'PLATFORM_ADMIN', 1, 0, '平台层管理员', 'default', 'TENANT', 'SYSTEM'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE role_code = 'PLATFORM_ADMIN' AND deleted = 0);

INSERT INTO sys_role (role_name, role_code, status, deleted, description, tenant_id, role_scope, role_type)
SELECT '租户管理员', 'TENANT_ADMIN', 1, 0, '租户层管理员', 'default', 'TENANT', 'SYSTEM'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE role_code = 'TENANT_ADMIN' AND deleted = 0);

INSERT INTO sys_role (role_name, role_code, status, deleted, description, tenant_id, role_scope, role_type)
SELECT '超级空间管理员', 'SPACE_SUPER_ADMIN', 1, 0, '超级空间管理员', 'default', 'TENANT', 'SYSTEM'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE role_code = 'SPACE_SUPER_ADMIN' AND deleted = 0);

INSERT INTO sys_role (role_name, role_code, status, deleted, description, tenant_id, role_scope, role_type)
SELECT '空间管理员', 'SPACE_OWNER', 1, 0, '空间管理员', 'default', 'TENANT', 'SYSTEM'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE role_code = 'SPACE_OWNER' AND deleted = 0);

-- 3) 绑定用户角色
INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN sys_role r ON r.role_code = 'PLATFORM_ADMIN'
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (SELECT 1 FROM sys_user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN sys_role r ON r.role_code = 'TENANT_ADMIN'
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (SELECT 1 FROM sys_user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN sys_role r ON r.role_code = 'SPACE_SUPER_ADMIN'
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (SELECT 1 FROM sys_user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN sys_role r ON r.role_code = 'SPACE_OWNER'
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (SELECT 1 FROM sys_user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- 4) 绑定租户管理员关系
INSERT INTO ltc_tenant_admin (tenant_id, user_id, remark)
SELECT 'default', u.id, '字段联调管理员'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_tenant_admin ta WHERE ta.tenant_id = 'default' AND ta.user_id = u.id
  );

-- 5) 创建联调空间并绑定成员
INSERT INTO ltc_space (tenant_id, space_id, space_name, status, remark)
SELECT 'default', 'space_field_test', '字段联调空间', 1, '字段联调用空间'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM ltc_space s WHERE s.tenant_id = 'default' AND s.space_id = 'space_field_test'
);

INSERT INTO ltc_space_member (tenant_id, space_id, user_id, role_id, remark)
SELECT 'default', 'space_field_test', u.id, NULL, '字段联调管理员'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_space_member sm
    WHERE sm.tenant_id = 'default' AND sm.space_id = 'space_field_test' AND sm.user_id = u.id
  );

-- 6) 最小权限策略（平台/租户/空间/字段联调）
-- 平台/租户/空间管理类
INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'tenant', NULL, 'view', 'ALLOW', 'FIELD_TEST_ADMIN', 'TENANT', 1, '字段联调-租户查看'
FROM sys_user u
WHERE u.username = 'field_test_admin'
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
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'tenant', NULL, 'create', 'ALLOW', 'FIELD_TEST_ADMIN', 'TENANT', 1, '字段联调-租户创建'
FROM sys_user u
WHERE u.username = 'field_test_admin'
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
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'tenant', 'tenant_admin_reset', 'manage', 'ALLOW', 'FIELD_TEST_ADMIN', 'TENANT', 1, '字段联调-租户管理员设置'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'tenant'
      AND p.resource_key = 'tenant_admin_reset'
      AND p.action = 'manage'
  );

-- 用户/空间/权限管理类
INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'user', NULL, 'manage', 'ALLOW', 'FIELD_TEST_ADMIN', 'TENANT', 1, '字段联调-用户管理'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'user'
      AND p.action = 'manage'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', NULL, 'USER', CAST(u.id AS CHAR), 'space', NULL, 'manage', 'ALLOW', 'FIELD_TEST_ADMIN', 'TENANT', 1, '字段联调-空间管理'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'space'
      AND p.action = 'manage'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', 'space_field_test', 'USER', CAST(u.id AS CHAR), 'permission', NULL, 'edit', 'ALLOW', 'FIELD_TEST_ADMIN', 'SPACE', 1, '字段联调-空间权限编辑'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.space_id = 'space_field_test'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'permission'
      AND p.action = 'edit'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

-- 字段/工作项相关入口（仅用于联调）
INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', 'space_field_test', 'USER', CAST(u.id AS CHAR), 'field', NULL, 'manage', 'ALLOW', 'FIELD_TEST_ADMIN', 'SPACE', 1, '字段联调-字段管理'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.space_id = 'space_field_test'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'field'
      AND p.action = 'manage'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', 'space_field_test', 'USER', CAST(u.id AS CHAR), 'work_item', NULL, 'manage', 'ALLOW', 'FIELD_TEST_ADMIN', 'SPACE', 1, '字段联调-工作项管理'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.space_id = 'space_field_test'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'work_item'
      AND p.action = 'manage'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

-- 工作项创建能力（部分接口使用 create 而非 manage）
INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', 'space_field_test', 'USER', CAST(u.id AS CHAR), 'work_item', NULL, 'create', 'ALLOW', 'FIELD_TEST_ADMIN', 'SPACE', 1, '字段联调-工作项创建'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.space_id = 'space_field_test'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'work_item'
      AND p.action = 'create'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

-- 工作项类型创建能力（空间配置里新增工作项类型）
INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', 'space_field_test', 'USER', CAST(u.id AS CHAR), 'work_item_type', NULL, 'create', 'ALLOW', 'FIELD_TEST_ADMIN', 'SPACE', 1, '字段联调-工作项类型创建'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.space_id = 'space_field_test'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'work_item_type'
      AND p.action = 'create'
      AND (p.resource_key IS NULL OR p.resource_key = '')
  );

-- WorkItem 页面/路由/菜单权限（PermissionFacade 的 WORK_ITEM_TARGETS）
INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', 'space_field_test', 'USER', CAST(u.id AS CHAR), 'page', 'work_item_manage_page', 'create', 'ALLOW', 'FIELD_TEST_ADMIN', 'SPACE', 1, '字段联调-工作项页面创建'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.space_id = 'space_field_test'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'page'
      AND p.resource_key = 'work_item_manage_page'
      AND p.action = 'create'
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', 'space_field_test', 'USER', CAST(u.id AS CHAR), 'router', 'space_work_items', 'create', 'ALLOW', 'FIELD_TEST_ADMIN', 'SPACE', 1, '字段联调-工作项路由创建'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.space_id = 'space_field_test'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'router'
      AND p.resource_key = 'space_work_items'
      AND p.action = 'create'
  );

INSERT INTO ltc_permission_policy
  (tenant_id, space_id, subject_type, subject_id, resource_type, resource_key, action, effect, policy_name, policy_scope, status, remark)
SELECT 'default', 'space_field_test', 'USER', CAST(u.id AS CHAR), 'menu', 'work_item_management', 'create', 'ALLOW', 'FIELD_TEST_ADMIN', 'SPACE', 1, '字段联调-工作项菜单创建'
FROM sys_user u
WHERE u.username = 'field_test_admin'
  AND NOT EXISTS (
    SELECT 1 FROM ltc_permission_policy p
    WHERE p.tenant_id = 'default'
      AND p.space_id = 'space_field_test'
      AND p.subject_type = 'USER'
      AND p.subject_id = CAST(u.id AS CHAR)
      AND p.resource_type = 'menu'
      AND p.resource_key = 'work_item_management'
      AND p.action = 'create'
  );
