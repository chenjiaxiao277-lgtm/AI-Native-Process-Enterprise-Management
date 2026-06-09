-- P2 第1步：并行审批入口统一鉴权与审计关联查询 DDL
-- 目标：补齐权限审计关联字段，并新增 Flowable 业务审批日志表
-- 约束：幂等、可重复执行；需先于 seed/verify 串行执行

USE ltc_db;

SET @has_process_instance_id = (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ltc_permission_audit_log'
    AND COLUMN_NAME = 'process_instance_id'
);

SET @ddl_process_instance_id = IF(
  @has_process_instance_id = 0,
  'ALTER TABLE ltc_permission_audit_log ADD COLUMN process_instance_id VARCHAR(128) DEFAULT NULL COMMENT ''流程实例ID'' AFTER resource_id',
  'SELECT 1'
);
PREPARE stmt_process_instance_id FROM @ddl_process_instance_id;
EXECUTE stmt_process_instance_id;
DEALLOCATE PREPARE stmt_process_instance_id;

SET @has_task_id = (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ltc_permission_audit_log'
    AND COLUMN_NAME = 'task_id'
);

SET @ddl_task_id = IF(
  @has_task_id = 0,
  'ALTER TABLE ltc_permission_audit_log ADD COLUMN task_id VARCHAR(128) DEFAULT NULL COMMENT ''任务ID'' AFTER process_instance_id',
  'SELECT 1'
);
PREPARE stmt_task_id FROM @ddl_task_id;
EXECUTE stmt_task_id;
DEALLOCATE PREPARE stmt_task_id;

CREATE TABLE IF NOT EXISTS ltc_flowable_approval_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  process_instance_id VARCHAR(128) NOT NULL COMMENT '流程实例ID',
  task_id VARCHAR(128) NOT NULL COMMENT '任务ID',
  user_id BIGINT NOT NULL DEFAULT 0 COMMENT '审批人ID',
  action VARCHAR(32) NOT NULL COMMENT '动作：approve/reject',
  comment TEXT DEFAULT NULL COMMENT '审批意见',
  creator VARCHAR(64) DEFAULT 'system',
  updater VARCHAR(64) DEFAULT 'system',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_process_task_user_action (process_instance_id, task_id, user_id, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Flowable 业务审批日志';
