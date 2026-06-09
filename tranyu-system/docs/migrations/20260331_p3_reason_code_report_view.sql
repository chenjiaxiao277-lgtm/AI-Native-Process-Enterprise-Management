-- P3 第二小步：增强版权限审计报表视图
-- 目标：支持 reasonCode 标签、按天聚合、resource_group 维度
-- 约束：串行第 3 步

USE ltc_db;

CREATE OR REPLACE VIEW vw_permission_audit_report AS
SELECT
  tenant_id,
  space_id,
  resource_group,
  DATE_FORMAT(create_time, '%Y-%m-%d') AS audit_day,
  action,
  reason_code,
  CASE reason_code
    WHEN 'ALLOW_MATCHED_POLICY' THEN '命中允许策略'
    WHEN 'DENY_MATCHED_POLICY' THEN '命中拒绝策略'
    WHEN 'DEFAULT_DENY' THEN '未命中允许规则，默认拒绝'
    WHEN 'MISSING_SUBJECT' THEN '缺少用户上下文'
    WHEN 'MISSING_TARGET' THEN '缺少权限目标'
    ELSE reason_code
  END AS reason_label,
  COUNT(1) AS total_count,
  SUM(CASE WHEN allowed = 1 THEN 1 ELSE 0 END) AS allow_count,
  SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) AS deny_count
FROM ltc_permission_audit_log
GROUP BY tenant_id, space_id, resource_group, DATE_FORMAT(create_time, '%Y-%m-%d'), action, reason_code;
