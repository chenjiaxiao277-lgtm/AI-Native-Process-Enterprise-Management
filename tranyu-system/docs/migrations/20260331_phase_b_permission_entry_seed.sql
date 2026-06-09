-- Phase B 第3步：统一权限入口最小闭环种子
-- 目标：为空间配置链路补齐可验证的角色-资源绑定
-- 约束：幂等、可重复执行；优先绑定管理员语义角色，若系统仅存在一个启用角色则绑定该角色

USE ltc_db;

SET @tenant_id = 'default';
SET @space_id = 0;

SET @candidate_role_id = (
  SELECT r.id
  FROM sys_role r
  WHERE IFNULL(r.deleted, 0) = 0
    AND IFNULL(r.status, 0) = 1
    AND (
      r.role_code IN ('admin', 'space_admin', 'system_admin')
      OR r.role_name IN ('管理员', '空间管理员', '系统管理员')
    )
  ORDER BY r.id
  LIMIT 1
);

SET @active_role_count = (
  SELECT COUNT(1)
  FROM sys_role r
  WHERE IFNULL(r.deleted, 0) = 0
    AND IFNULL(r.status, 0) = 1
);

SET @fallback_role_id = (
  SELECT r.id
  FROM sys_role r
  WHERE IFNULL(r.deleted, 0) = 0
    AND IFNULL(r.status, 0) = 1
  ORDER BY r.id
  LIMIT 1
);

SET @role_id = IFNULL(@candidate_role_id, IF(@active_role_count = 1, @fallback_role_id, NULL));

INSERT INTO ltc_permission_role_resource
  (tenant_id, space_id, role_id, resource_type, resource_code, effect_type, status, deleted, creator, updater)
SELECT
  @tenant_id, @space_id, @role_id, 'menu', 'space_management', 'allow', 1, 0, 'system', 'system'
FROM dual
WHERE @role_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  effect_type = VALUES(effect_type),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

INSERT INTO ltc_permission_role_resource
  (tenant_id, space_id, role_id, resource_type, resource_code, effect_type, status, deleted, creator, updater)
SELECT
  @tenant_id, @space_id, @role_id, 'router', 'space_config', 'allow', 1, 0, 'system', 'system'
FROM dual
WHERE @role_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  effect_type = VALUES(effect_type),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

INSERT INTO ltc_permission_role_resource
  (tenant_id, space_id, role_id, resource_type, resource_code, effect_type, status, deleted, creator, updater)
SELECT
  @tenant_id, @space_id, @role_id, 'page', 'space_config_page', 'allow', 1, 0, 'system', 'system'
FROM dual
WHERE @role_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  effect_type = VALUES(effect_type),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

SELECT @role_id AS seeded_role_id, @active_role_count AS active_role_count;
