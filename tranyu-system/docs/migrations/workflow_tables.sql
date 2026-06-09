-- 工作流审批模块：配置表、节点表、流程实例表、审批记录表
-- 执行前请确保数据库为 ltc_db：mysql -u root -p ltc_db < workflow_tables.sql

USE ltc_db;

-- 1. 工作流配置表（模板）
CREATE TABLE IF NOT EXISTS ltc_workflow_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  name VARCHAR(128) NOT NULL COMMENT '工作流名称',
  biz_module VARCHAR(64) NOT NULL COMMENT '关联业务模块：sales_project/delivery_project',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：0否 1是',
  remark VARCHAR(512) DEFAULT NULL COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流配置（模板）';

-- 2. 工作流节点表
CREATE TABLE IF NOT EXISTS ltc_workflow_node (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  workflow_id BIGINT NOT NULL COMMENT '所属工作流ID',
  node_name VARCHAR(128) NOT NULL COMMENT '节点名称',
  node_order INT NOT NULL DEFAULT 0 COMMENT '节点顺序（从1开始）',
  approver_type VARCHAR(32) NOT NULL DEFAULT 'single' COMMENT '审核人员类型：single单选 multi多选',
  approver_ids JSON DEFAULT NULL COMMENT '审批人ID列表，如 [1,2] 或角色 ["role:dept_leader"]',
  approval_mode VARCHAR(32) NOT NULL DEFAULT 'or_sign' COMMENT '审批方式：or_sign或签 and_sign会签',
  fail_rule VARCHAR(32) NOT NULL DEFAULT 'reject_end' COMMENT '失败处理：reject_end驳回结束 back_previous退回上一节点',
  form_schema JSON DEFAULT NULL COMMENT '自定义节点表单 schema',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_workflow_id (workflow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流节点配置';

-- 3. 流程实例表
CREATE TABLE IF NOT EXISTS ltc_workflow_instance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  workflow_id BIGINT NOT NULL COMMENT '工作流配置ID',
  biz_type VARCHAR(64) NOT NULL COMMENT '业务类型：sales_project/delivery_project',
  biz_id BIGINT NOT NULL COMMENT '业务数据ID',
  biz_title VARCHAR(255) DEFAULT NULL COMMENT '业务标题（如项目名称）',
  status VARCHAR(32) NOT NULL DEFAULT 'running' COMMENT '状态：running/completed/rejected',
  current_node_id BIGINT DEFAULT NULL COMMENT '当前审批节点ID',
  initiator_id VARCHAR(64) DEFAULT NULL COMMENT '发起人ID',
  initiator_name VARCHAR(64) DEFAULT NULL COMMENT '发起人姓名',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_workflow_biz (workflow_id, biz_type, biz_id),
  KEY idx_status (status),
  KEY idx_initiator (initiator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程实例';

-- 4. 审批记录表
CREATE TABLE IF NOT EXISTS ltc_workflow_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  instance_id BIGINT NOT NULL COMMENT '流程实例ID',
  node_id BIGINT NOT NULL COMMENT '节点ID',
  node_name VARCHAR(128) DEFAULT NULL COMMENT '节点名称（冗余）',
  approver_id VARCHAR(64) DEFAULT NULL COMMENT '审批人ID',
  approver_name VARCHAR(64) DEFAULT NULL COMMENT '审批人姓名',
  action VARCHAR(32) NOT NULL COMMENT '操作：approve通过 reject驳回',
  comment TEXT DEFAULT NULL COMMENT '审批意见',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_instance (instance_id),
  KEY idx_approver (approver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批记录';
