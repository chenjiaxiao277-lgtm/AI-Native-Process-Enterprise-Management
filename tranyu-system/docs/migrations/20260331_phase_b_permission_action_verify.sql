-- Phase B 第4步：动作级权限抽样核对
-- 用途：核对“用户 -> 角色 -> 工作项资源 -> 动作范围”链路

USE ltc_db;

SET @tenant_id = 'default';
SET @space_id = 0;
SET @user_id = 1;

SELECT
  u.id AS user_id,
  u.username,
  ur.role_id,
  r.role_code,
  r.role_name
FROM sys_user u
JOIN sys_user_role ur ON ur.user_id = u.id
JOIN sys_role r ON r.id = ur.role_id
WHERE u.id = @user_id
  AND IFNULL(u.deleted, 0) = 0
  AND IFNULL(r.deleted, 0) = 0
  AND IFNULL(r.status, 0) = 1;

SELECT
  prr.id,
  prr.role_id,
  prr.resource_type,
  prr.resource_code,
  prr.effect_type,
  prr.action_scope,
  prr.space_id
FROM ltc_permission_role_resource prr
JOIN sys_user_role ur ON ur.role_id = prr.role_id
WHERE ur.user_id = @user_id
  AND prr.tenant_id = @tenant_id
  AND prr.space_id IN (0, @space_id)
  AND prr.resource_code IN ('work_item_management', 'space_work_items', 'work_item_manage_page')
ORDER BY prr.resource_type, prr.resource_code;
