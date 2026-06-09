-- Phase B 第4步：动作级权限最小支持
-- 目标：为角色-资源绑定表增加 action_scope 字段，支持 view/create/edit/delete/approve
-- 约束：幂等、可重复执行

USE ltc_db;

SET @has_action_scope = (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ltc_permission_role_resource'
    AND COLUMN_NAME = 'action_scope'
);

SET @ddl = IF(
  @has_action_scope = 0,
  'ALTER TABLE ltc_permission_role_resource ADD COLUMN action_scope VARCHAR(128) NOT NULL DEFAULT ''*'' COMMENT ''动作范围：* 或 view,create,edit,delete,approve'' AFTER effect_type',
  'SELECT ''action_scope exists'' AS msg'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE ltc_permission_role_resource
SET action_scope = '*'
WHERE action_scope IS NULL
   OR TRIM(action_scope) = '';
