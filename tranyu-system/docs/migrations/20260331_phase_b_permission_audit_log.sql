-- Phase B 第5步：权限解释审计表
-- 目标：持久化审批前置鉴权的原因码与命中策略，支持最小闭环审计
-- 约束：幂等、可重复执行；需先于 seed/verify 串行执行

USE ltc_db;

CREATE TABLE IF NOT EXISTS ltc_permission_audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '租户ID',
  space_id BIGINT NOT NULL DEFAULT 0 COMMENT '空间ID',
  user_id BIGINT NOT NULL DEFAULT 0 COMMENT '用户ID',
  resource_type VARCHAR(32) NOT NULL COMMENT '资源类型：menu/router/page',
  resource_id VARCHAR(128) NOT NULL COMMENT '资源标识',
  action VARCHAR(32) NOT NULL COMMENT '动作：view/create/edit/delete/approve',
  allowed TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否允许：0否1是',
  reason_code VARCHAR(64) NOT NULL COMMENT '权限解释原因码',
  matched_policy_ids VARCHAR(512) NOT NULL DEFAULT '' COMMENT '命中策略ID列表，逗号分隔',
  creator VARCHAR(64) DEFAULT 'system',
  updater VARCHAR(64) DEFAULT 'system',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_action (user_id, action),
  KEY idx_resource_action (resource_type, resource_id, action),
  KEY idx_tenant_space (tenant_id, space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限解释审计日志';
