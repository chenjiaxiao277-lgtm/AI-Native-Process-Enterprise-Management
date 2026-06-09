-- P2 第2步：FlowableInstanceService 统一鉴权与统一审计出口 DDL
-- 目标：为统一审计出口补齐 process/task/user/action 复合索引
-- 约束：幂等、可重复执行；需先于 seed/verify 串行执行

USE ltc_db;

SET @has_permission_audit_link_idx = (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ltc_permission_audit_log'
    AND INDEX_NAME = 'idx_process_task_user_action'
);

SET @ddl_permission_audit_link_idx = IF(
  @has_permission_audit_link_idx = 0,
  'ALTER TABLE ltc_permission_audit_log ADD INDEX idx_process_task_user_action (process_instance_id, task_id, user_id, action)',
  'SELECT 1'
);
PREPARE stmt_permission_audit_link_idx FROM @ddl_permission_audit_link_idx;
EXECUTE stmt_permission_audit_link_idx;
DEALLOCATE PREPARE stmt_permission_audit_link_idx;
