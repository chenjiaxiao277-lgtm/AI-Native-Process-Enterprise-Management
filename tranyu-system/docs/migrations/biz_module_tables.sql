-- 业务模块配置元数据表（类似 Jeecg 在线开发的表头/字段表）
-- 在 ltc_db 库中执行本脚本：
--   mysql -u root -p ltc_db < biz_module_tables.sql

USE ltc_db;

CREATE TABLE IF NOT EXISTS ltc_biz_module (
  id           BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  module_code  VARCHAR(64)  NOT NULL UNIQUE COMMENT '模块编码，如 delivery/project',
  module_name  VARCHAR(100) NOT NULL COMMENT '模块名称，如 交付项目',
  category     VARCHAR(32)  NOT NULL COMMENT '模块分类：sales/delivery/common 等',
  table_name   VARCHAR(64)  NOT NULL COMMENT '绑定的物理表名',
  bind_type    VARCHAR(16)  NOT NULL COMMENT '绑定类型：BIND_EXIST=绑定已有表, CREATE_NEW=新建表',
  status       TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：1 启用，0 禁用',
  remark       VARCHAR(255) DEFAULT NULL COMMENT '备注说明',
  create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_module_code (module_code),
  KEY idx_category (category),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务模块配置';

CREATE TABLE IF NOT EXISTS ltc_biz_field (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  module_id       BIGINT       NOT NULL COMMENT '所属模块ID',
  field_code      VARCHAR(64)  NOT NULL COMMENT '前端字段编码，如 projectName',
  field_name      VARCHAR(100) NOT NULL COMMENT '字段显示名称，如 项目名称',
  column_name     VARCHAR(64)  NOT NULL COMMENT '数据库列名，如 project_name',
  column_type     VARCHAR(64)  NOT NULL COMMENT '数据库列类型定义，如 VARCHAR(255)/DECIMAL(18,2)',
  is_pk           TINYINT      NOT NULL DEFAULT 0 COMMENT '是否主键：1 是，0 否',
  is_required     TINYINT      NOT NULL DEFAULT 0 COMMENT '是否必填：1 是，0 否',
  show_in_list    TINYINT      NOT NULL DEFAULT 1 COMMENT '是否在列表展示：1 是，0 否',
  show_in_form    TINYINT      NOT NULL DEFAULT 1 COMMENT '是否在表单展示：1 是，0 否',
  list_sort       INT          NOT NULL DEFAULT 100 COMMENT '列表显示排序，越小越靠前',
  form_sort       INT          NOT NULL DEFAULT 100 COMMENT '表单显示排序，越小越靠前',
  widget_type     VARCHAR(32)  NOT NULL DEFAULT 'text' COMMENT '控件类型：text/number/date/datetime/select/textarea 等',
  validate_rule   VARCHAR(255) DEFAULT NULL COMMENT '校验规则（正则/内置规则）',
  max_length      INT          DEFAULT NULL COMMENT '最大长度（字符串类）',
  min_value       DECIMAL(18,4) DEFAULT NULL COMMENT '数值最小值',
  max_value       DECIMAL(18,4) DEFAULT NULL COMMENT '数值最大值',
  options_json    VARCHAR(1000) DEFAULT NULL COMMENT '下拉选项 JSON（[{\"label\":\"高\",\"value\":\"HIGH\"}]）',
  default_value   VARCHAR(255)  DEFAULT NULL COMMENT '默认值',
  ext_config_json VARCHAR(1000) DEFAULT NULL COMMENT '扩展配置 JSON（面板/标签分组等）',
  create_time     DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time     DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_module (module_id),
  CONSTRAINT fk_biz_field_module FOREIGN KEY (module_id) REFERENCES ltc_biz_module(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务模块字段配置';

CREATE TABLE IF NOT EXISTS ltc_biz_template (
  id            BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  template_code VARCHAR(64)  NOT NULL UNIQUE COMMENT '模板编码',
  template_name VARCHAR(100) NOT NULL COMMENT '模板名称',
  category      VARCHAR(32)  NOT NULL COMMENT '模板适用分类：sales/delivery/common 等',
  config_json   TEXT         NOT NULL COMMENT '字段配置 JSON 快照',
  create_time   DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务模块字段模板';

