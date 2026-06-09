-- P3 第二小步：reasonCode 规范化与审计报表维度增强 DDL
-- 目标：为权限审计日志补 resource_group 字段与索引
-- 约束：幂等、可重复执行；串行第 1 步

USE ltc_db;

SET @has_resource_group = (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ltc_permission_audit_log'
    AND COLUMN_NAME = 'resource_group'
);

SET @ddl_resource_group = IF(
  @has_resource_group = 0,
  'ALTER TABLE ltc_permission_audit_log ADD COLUMN resource_group VARCHAR(64) DEFAULT NULL COMMENT ''资源组'' AFTER resource_id',
  'SELECT 1'
);
PREPARE stmt_resource_group FROM @ddl_resource_group;
EXECUTE stmt_resource_group;
DEALLOCATE PREPARE stmt_resource_group;

SET @has_report_group_idx = (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ltc_permission_audit_log'
    AND INDEX_NAME = 'idx_report_dims'
);

SET @ddl_report_group_idx = IF(
  @has_report_group_idx = 0,
  'ALTER TABLE ltc_permission_audit_log ADD INDEX idx_report_dims (tenant_id, space_id, resource_group, action, reason_code, create_time)',
  'SELECT 1'
);
PREPARE stmt_report_group_idx FROM @ddl_report_group_idx;
EXECUTE stmt_report_group_idx;
DEALLOCATE PREPARE stmt_report_group_idx;
