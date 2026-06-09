-- 修复 ltc_delivery_project 表结构（与后端 TableSpecs 一致）
-- 若交付项目保存失败且报错含 Unknown column 'project_name'，请执行本脚本。
-- 使用前请确认数据库为 ltc_db；若表中有需要保留的数据请先备份。
--
-- 执行方式（二选一）：
--   Homebrew 新装 MySQL 默认 root 无密码：  mysql -u root ltc_db < fix_ltc_delivery_project.sql
--   已设置过 root 密码：                    mysql -u root -p ltc_db < fix_ltc_delivery_project.sql

CREATE DATABASE IF NOT EXISTS ltc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ltc_db;

DROP TABLE IF EXISTS ltc_delivery_project;

CREATE TABLE ltc_delivery_project (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  project_name VARCHAR(255) NOT NULL COMMENT '项目名称',
  biz_department VARCHAR(255) DEFAULT NULL COMMENT '所属事业部',
  start_date DATE DEFAULT NULL COMMENT '项目开始时间',
  contract_id BIGINT DEFAULT NULL COMMENT '关联合同ID',
  project_level VARCHAR(64) DEFAULT NULL COMMENT '项目等级',
  project_category VARCHAR(64) DEFAULT NULL COMMENT '项目类别',
  remark TEXT DEFAULT NULL COMMENT '备注',
  risk_rate DECIMAL(5,2) DEFAULT NULL COMMENT '风险概率(%)',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交付项目表';
