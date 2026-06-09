-- 扩展工作流节点表 ltc_workflow_node
-- 在 ltc_db 库中执行本脚本：
--   mysql -u root -p ltc_db < docs/migrations/workflow_node_upgrade.sql

USE ltc_db;

ALTER TABLE ltc_workflow_node
  MODIFY approver_type   VARCHAR(20)   NULL COMMENT '审批人类型：PERSON/ROLE/CUSTOM',
  MODIFY approver_ids    VARCHAR(500)  NULL COMMENT '审批人ID列表（人员ID/角色ID，逗号分隔）',
  MODIFY approval_mode   VARCHAR(10)   NULL COMMENT '审批方式：OR/SIGN_ALL（或签/会签）',
  ADD    allow_add_sign  TINYINT       NOT NULL DEFAULT 0 COMMENT '是否允许加签：0否 1是',
  ADD    allow_remove_sign TINYINT     NOT NULL DEFAULT 0 COMMENT '是否允许减签：0否 1是',
  ADD    reject_strategy VARCHAR(20)   NOT NULL DEFAULT 'END' COMMENT '驳回策略：END/BACK_TO_SUBMITTER/BACK_TO_NODE',
  ADD    reject_node_id  BIGINT        NULL COMMENT '驳回目标节点ID（仅 BACK_TO_NODE 时生效)';

