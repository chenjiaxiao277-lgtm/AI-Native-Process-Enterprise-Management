-- Phase B 第3步：统一权限入口实库核对
-- 用途：核对“用户 -> 角色 -> space_config router/page 绑定”是否生效

USE ltc_db;

SET @tenant_id = 'default';
SET @space_id = 0;
SET @user_id = 1;

SELECT
  u.id        AS user_id,
  u.username  AS username,
  r.id        AS role_id,
  r.role_code AS role_code,
  r.role_name AS role_name
FROM sys_user u
JOIN sys_user_role ur ON ur.user_id = u.id
JOIN sys_role r ON r.id = ur.role_id
WHERE u.id = @user_id
  AND IFNULL(u.deleted, 0) = 0
  AND IFNULL(r.deleted, 0) = 0
  AND IFNULL(r.status, 0) = 1
ORDER BY r.id;

SELECT
  prr.role_id,
  prr.resource_type,
  prr.resource_code,
  prr.effect_type,
  prr.status,
  prr.deleted
FROM ltc_permission_role_resource prr
JOIN sys_user_role ur ON ur.role_id = prr.role_id
WHERE ur.user_id = @user_id
  AND prr.tenant_id = @tenant_id
  AND prr.space_id IN (0, @space_id)
  AND prr.resource_code IN ('space_management', 'space_config', 'space_config_page')
ORDER BY prr.resource_type, prr.resource_code;
