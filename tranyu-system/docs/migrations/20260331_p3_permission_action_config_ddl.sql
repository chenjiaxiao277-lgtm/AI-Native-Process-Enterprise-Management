-- P3 第一步：审批资源动作配置化 DDL
-- 目标：新增审批动作配置表，支持库表驱动读取；保持幂等
-- 约束：串行执行第 1 步

USE ltc_db;

CREATE TABLE IF NOT EXISTS ltc_permission_action_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '租户ID',
  space_id BIGINT NOT NULL DEFAULT 0 COMMENT '空间ID',
  resource_group VARCHAR(64) NOT NULL COMMENT '资源组，如 workflow_approval',
  action_code VARCHAR(32) NOT NULL COMMENT '动作编码，如 approve/reject/terminate/transfer/*',
  resource_type VARCHAR(32) NOT NULL COMMENT '资源类型：menu/router/page',
  resource_code VARCHAR(128) NOT NULL COMMENT '资源编码',
  sort INT NOT NULL DEFAULT 0 COMMENT '排序',
  status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态：1启用 0停用',
  deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  creator VARCHAR(64) DEFAULT 'system',
  updater VARCHAR(64) DEFAULT 'system',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_group_action_resource (tenant_id, space_id, resource_group, action_code, resource_type, resource_code),
  KEY idx_group_action (resource_group, action_code, tenant_id, space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限动作配置';
