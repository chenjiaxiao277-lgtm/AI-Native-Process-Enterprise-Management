-- 工作项管理（空间配置）表
CREATE TABLE IF NOT EXISTS ltc_work_item_type (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  type_name VARCHAR(64) NOT NULL COMMENT '工作项类型名称',
  type_code VARCHAR(64) NOT NULL COMMENT '工作项类型编码',
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '租户ID',
  space_id VARCHAR(64) NOT NULL DEFAULT 'space_1' COMMENT '空间ID',
  item_category VARCHAR(32) NOT NULL DEFAULT 'custom' COMMENT '类型分类：requirement/bug/task/custom',
  source_type VARCHAR(16) NOT NULL DEFAULT 'custom' COMMENT '创建方式：custom/reuse',
  source_space VARCHAR(128) DEFAULT NULL COMMENT '复用来源空间',
  source_work_item VARCHAR(128) DEFAULT NULL COMMENT '复用来源工作项类型',
  reuse_source_id BIGINT DEFAULT NULL COMMENT '复用源工作项ID',
  reuse_bound TINYINT DEFAULT 0 COMMENT '复用同步状态：0未同步/已解绑，1同步中',
  flow_mode VARCHAR(16) DEFAULT 'state' COMMENT '流程模式：state状态模式，node节点模式',
  system_identifier VARCHAR(128) DEFAULT NULL COMMENT '系统标识',
  icon_color VARCHAR(32) DEFAULT NULL COMMENT '图标色',
  icon_key VARCHAR(64) DEFAULT NULL COMMENT '图标标识',
  copy_fields_json TEXT DEFAULT NULL COMMENT '复制管理-字段范围',
  copy_roles_json TEXT DEFAULT NULL COMMENT '复制管理-角色范围',
  baseline_enabled TINYINT DEFAULT 0 COMMENT '启用基线管理：0否1是',
  nav_entry_enabled TINYINT DEFAULT 1 COMMENT '设置为导航入口：0否1是',
  detail_layout_json TEXT DEFAULT NULL COMMENT '详情页布局配置JSON',
  flow_rule_json TEXT DEFAULT NULL COMMENT '流程规则配置JSON',
  flow_role_json TEXT DEFAULT NULL COMMENT '流程角色配置JSON',
  view_layout_json TEXT DEFAULT NULL COMMENT '视图布局配置JSON',
  owner_role VARCHAR(64) DEFAULT NULL COMMENT '默认负责人角色',
  workflow_name VARCHAR(128) DEFAULT NULL COMMENT '流程模板名称',
  required_policy VARCHAR(255) DEFAULT NULL COMMENT '必填字段策略',
  sla_hours INT DEFAULT NULL COMMENT 'SLA时长（小时）',
  sort INT DEFAULT 100 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '状态：0禁用，1启用',
  description VARCHAR(500) DEFAULT NULL COMMENT '描述',
  deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删，1已删',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_type_code_deleted (tenant_id, space_id, type_code, deleted),
  KEY idx_tenant_space_sort (tenant_id, space_id, sort),
  KEY idx_status_sort (status, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作项类型配置';

-- 初始化一批常用工作项类型（可选）
INSERT INTO ltc_work_item_type
  (type_name, type_code, tenant_id, space_id, item_category, source_type, owner_role, workflow_name, required_policy, sla_hours, sort, status, description)
VALUES
  ('需求', 'REQ', 'default', 'space_1', 'requirement', 'custom', '产品经理', '需求评审流', '标题/优先级/验收标准', 48, 100, 1, '默认需求工作项'),
  ('缺陷', 'BUG', 'default', 'space_1', 'bug', 'custom', '测试负责人', '缺陷流转', '严重等级/复现步骤/影响范围', 24, 110, 1, '默认缺陷工作项')
ON DUPLICATE KEY UPDATE
  update_time = CURRENT_TIMESTAMP;

-- 已有表的兼容升级（幂等，兼容不支持 ADD COLUMN IF NOT EXISTS 的 MySQL）
SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'reuse_source_id'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN reuse_source_id BIGINT DEFAULT NULL COMMENT ''复用源工作项ID'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为历史工作项回填系统默认字段（幂等）
INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '名称', 'name', 'text', '管理员,创建人,PM,QA', 1, 1, 'none', NULL, NULL, '记录和命名工作项名称', 100
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'name'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '描述', 'description', 'rich_text', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '对工作项详细描述说明', 110
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'description'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '所属空间', 'owned_project', 'text', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '默认记录当前工作项所在空间', 115
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'owned_project'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '状态', 'work_item_status', 'single_select', '管理员,创建人,PM,QA', 1, 1, 'none', NULL,
  CASE
    WHEN t.item_category = 'requirement' THEN '["开始","评审中","已完成","已终止"]'
    WHEN t.item_category = 'bug' THEN '["OPEN","IN_PROGRESS","RESOLVED","REOPENED","CLOSED"]'
    WHEN t.item_category = 'task' THEN '["未完成","已完成"]'
    ELSE '["未开始","进行中","已完成","已终止"]'
  END,
  '当前工作项状态', 120
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'work_item_status'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '工作项', 'work_item_type_key', 'single_select', '管理员,创建人,PM,QA', 1, 0, 'none', t.type_code, NULL, '工作项类别编码', 125
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'work_item_type_key'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '优先级', 'priority', 'single_select', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, '["P0","P1","P2","P3"]', '优先级配置', 130
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'priority'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '提出时间', 'start_time', 'date', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '自动记录工作项创建时间', 140
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'start_time'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '更新时间', 'updated_at', 'date', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '记录最近一次更新时间', 150
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'updated_at'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '创建者', 'owner', 'member', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '自动记录工作项创建人', 160
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'owner'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '当前负责人', 'current_status_operator', 'member', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '当前状态节点负责人', 170
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'current_status_operator'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '当前状态授权角色', 'current_status_operator_role', 'multi_select', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, '["管理员","创建人","PM","QA"]', '负责当前状态流转的角色', 175
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'current_status_operator_role'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '更新人', 'updated_by', 'member', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '最近一次更新人员', 180
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'updated_by'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '关注人', 'watchers', 'members', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '关注工作项进度人员', 190
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'watchers'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '是否完成', 'finish_status', 'switch', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '自动记录节点完成状态', 200
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'finish_status'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '是否归档', 'archiving_status', 'switch', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '自动记录是否达到归档状态', 205
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'archiving_status'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '需求文档', 'wiki', 'url', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '需求关联文档链接', 210
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'wiki'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '工作项ID', 'work_item_id', 'number', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '工作项唯一标识', 220
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'work_item_id'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '自增数字', 'auto_number', 'number', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '自增序号', 230
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'auto_number'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '工作项类型', 'template', 'single_select', '管理员,创建人,PM,QA', 1, 0, 'none', t.type_name, NULL, '工作项流程类型', 240
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'template'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '归档时间', 'archiving_date', 'date', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '归档状态达到时的时间', 245
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'archiving_date'
WHERE t.deleted = 0 AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '终止原因', 'abort_reason', 'single_select', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, '["需求变更","不再需要","方案调整","其他"]', '终止实例时可选择原因', 248
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'abort_reason'
WHERE t.deleted = 0 AND t.flow_mode = 'node' AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '补充终止原因', 'abort_detail', 'text', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '终止工作项时填写补充原因', 249
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'abort_detail'
WHERE t.deleted = 0 AND t.flow_mode = 'node' AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '完成日期', 'finish_time', 'date', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '实例完成时间', 250
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'finish_time'
WHERE t.deleted = 0 AND (t.flow_mode = 'node' OR t.item_category = 'task') AND f.id IS NULL;

-- 需求专属字段
INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '排期', 'schedule', 'date_range', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '记录需求排期区间', 300
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'schedule'
WHERE t.deleted = 0 AND t.item_category = 'requirement' AND f.id IS NULL;

-- 任务专属字段
INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '备注', 'note', 'textarea', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '任务补充说明', 310
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'note'
WHERE t.deleted = 0 AND t.item_category = 'task' AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '排期', 'sub_task_schedule', 'date_range', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '记录任务排期区间', 320
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'sub_task_schedule'
WHERE t.deleted = 0 AND t.item_category = 'task' AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '实际工时', 'actual_work_time', 'number', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '记录任务实际投入工时', 330
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'actual_work_time'
WHERE t.deleted = 0 AND t.item_category = 'task' AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '版本类型', 'version_template', 'single_select', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '版本工作项流程类型', 335
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'version_template'
WHERE t.deleted = 0
  AND (UPPER(t.type_code) LIKE 'VER%' OR UPPER(t.type_code) LIKE '%VERSION%')
  AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '版本封版日期', 'envelope_date', 'date', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '版本封版时间', 336
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'envelope_date'
WHERE t.deleted = 0
  AND (UPPER(t.type_code) LIKE 'VER%' OR UPPER(t.type_code) LIKE '%VERSION%')
  AND f.id IS NULL;

-- 缺陷专属字段
INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '严重程度', 'severity', 'single_select', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, '["严重","重要","一般","次要","建议"]', '缺陷严重程度', 340
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'severity'
WHERE t.deleted = 0 AND t.item_category = 'bug' AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '发现阶段', 'issue_stage', 'single_select', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, '["UI测试","UE测试","开发自测","冒烟测试","第一轮测试","第二轮测试","回归测试","灰度阶段","线上阶段"]', '缺陷发现阶段', 350
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'issue_stage'
WHERE t.deleted = 0 AND t.item_category = 'bug' AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '解决版本', 'resolve_version', 'work_item_relation', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '关联修复版本', 360
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'resolve_version'
WHERE t.deleted = 0 AND t.item_category = 'bug' AND f.id IS NULL;

INSERT INTO ltc_work_item_field
  (work_item_id, field_name, field_key, field_type, authorized_roles, is_enabled, is_required, default_value_mode, default_value, options_json, help_text, sort)
SELECT t.id, '多个附件', 'multi_attachment', 'multi_attachment', '管理员,创建人,PM,QA', 1, 0, 'none', NULL, NULL, '可上传多个附件', 370
FROM ltc_work_item_type t
LEFT JOIN ltc_work_item_field f ON f.work_item_id = t.id AND f.field_key = 'multi_attachment'
WHERE t.deleted = 0 AND t.item_category = 'bug' AND f.id IS NULL;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'icon_color'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN icon_color VARCHAR(32) DEFAULT NULL COMMENT ''图标色'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'icon_key'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN icon_key VARCHAR(64) DEFAULT NULL COMMENT ''图标标识'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'copy_fields_json'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN copy_fields_json TEXT DEFAULT NULL COMMENT ''复制管理-字段范围'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'copy_roles_json'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN copy_roles_json TEXT DEFAULT NULL COMMENT ''复制管理-角色范围'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'baseline_enabled'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN baseline_enabled TINYINT DEFAULT 0 COMMENT ''启用基线管理：0否1是'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'nav_entry_enabled'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN nav_entry_enabled TINYINT DEFAULT 1 COMMENT ''设置为导航入口：0否1是'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'detail_layout_json'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN detail_layout_json TEXT DEFAULT NULL COMMENT ''详情页布局配置JSON'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'flow_rule_json'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN flow_rule_json TEXT DEFAULT NULL COMMENT ''流程规则配置JSON'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'flow_role_json'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN flow_role_json TEXT DEFAULT NULL COMMENT ''流程角色配置JSON'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'view_layout_json'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN view_layout_json TEXT DEFAULT NULL COMMENT ''视图布局配置JSON'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 工作项字段配置表
CREATE TABLE IF NOT EXISTS ltc_work_item_field (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  work_item_id BIGINT NOT NULL COMMENT '工作项ID',
  field_name VARCHAR(128) NOT NULL COMMENT '字段名称',
  field_key VARCHAR(128) NOT NULL COMMENT '字段标识',
  field_type VARCHAR(32) NOT NULL DEFAULT 'text' COMMENT '字段类型',
  authorized_roles VARCHAR(255) DEFAULT NULL COMMENT '授权角色（逗号分隔）',
  is_enabled TINYINT DEFAULT 1 COMMENT '是否启用',
  is_required TINYINT DEFAULT 0 COMMENT '是否必填',
  default_value_mode VARCHAR(32) DEFAULT 'none' COMMENT '默认值模式',
  default_value VARCHAR(255) DEFAULT NULL COMMENT '默认值',
  options_json TEXT DEFAULT NULL COMMENT '单选/多选选项(JSON)',
  help_text VARCHAR(500) DEFAULT NULL COMMENT '帮助说明',
  sort INT DEFAULT 100 COMMENT '排序',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_work_item_field_key (work_item_id, field_key),
  KEY idx_work_item_sort (work_item_id, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作项字段配置';

-- 工作项实例数据表（用于一级模块列表/详情/编辑）
CREATE TABLE IF NOT EXISTS ltc_work_item_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  work_item_type_id BIGINT NOT NULL COMMENT '工作项类型ID',
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '租户ID',
  space_id VARCHAR(64) NOT NULL DEFAULT 'space_1' COMMENT '空间ID',
  title VARCHAR(255) NOT NULL COMMENT '标题',
  status TINYINT DEFAULT 1 COMMENT '状态：0关闭，1打开',
  data_json JSON DEFAULT NULL COMMENT '动态字段数据(JSON)',
  deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0未删，1已删',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant_space_deleted (tenant_id, space_id, deleted),
  KEY idx_type_deleted (work_item_type_id, deleted),
  KEY idx_type_status (work_item_type_id, status),
  KEY idx_type_update (work_item_type_id, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作项实例数据';

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'reuse_bound'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN reuse_bound TINYINT DEFAULT 0 COMMENT ''复用同步状态：0未同步/已解绑，1同步中'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_field'
        AND COLUMN_NAME = 'options_json'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_field ADD COLUMN options_json TEXT DEFAULT NULL COMMENT ''单选/多选选项(JSON)'' AFTER default_value'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'flow_mode'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN flow_mode VARCHAR(16) DEFAULT ''state'' COMMENT ''流程模式：state状态模式，node节点模式'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_work_item_type'
        AND COLUMN_NAME = 'system_identifier'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_work_item_type ADD COLUMN system_identifier VARCHAR(128) DEFAULT NULL COMMENT ''系统标识'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
