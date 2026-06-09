-- P3 第一步：权限审计报表视图
-- 目标：提供按 action/reasonCode/tenant/space 聚合的最小审计报表视图
-- 约束：串行执行第 3 步

USE ltc_db;

CREATE OR REPLACE VIEW vw_permission_audit_report AS
SELECT
  tenant_id,
  space_id,
  action,
  reason_code,
  COUNT(1) AS total_count,
  SUM(CASE WHEN allowed = 1 THEN 1 ELSE 0 END) AS allow_count,
  SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) AS deny_count
FROM ltc_permission_audit_log
GROUP BY tenant_id, space_id, action, reason_code;
