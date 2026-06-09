-- P3 第二小步：reasonCode 字典与增强版报表视图核对
-- 目标：核对 1 条 reasonCode 字典映射、1 条按时间范围聚合、1 条按 resource_group 聚合
-- 约束：串行第 4 步

USE ltc_db;

SELECT
  reason_code,
  CASE reason_code
    WHEN 'ALLOW_MATCHED_POLICY' THEN '命中允许策略'
    WHEN 'DENY_MATCHED_POLICY' THEN '命中拒绝策略'
    WHEN 'DEFAULT_DENY' THEN '未命中允许规则，默认拒绝'
    WHEN 'MISSING_SUBJECT' THEN '缺少用户上下文'
    WHEN 'MISSING_TARGET' THEN '缺少权限目标'
    ELSE reason_code
  END AS reason_label
FROM ltc_permission_audit_log
WHERE reason_code IS NOT NULL
ORDER BY id DESC
LIMIT 1;

SELECT
  tenant_id,
  space_id,
  audit_day,
  action,
  total_count,
  allow_count,
  deny_count
FROM vw_permission_audit_report
WHERE tenant_id = 'default'
  AND space_id = 0
  AND audit_day BETWEEN DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 30 DAY), '%Y-%m-%d')
                    AND DATE_FORMAT(CURDATE(), '%Y-%m-%d')
ORDER BY audit_day DESC, total_count DESC
LIMIT 1;

SELECT
  tenant_id,
  space_id,
  resource_group,
  action,
  reason_code,
  total_count
FROM vw_permission_audit_report
WHERE tenant_id = 'default'
  AND space_id = 0
  AND resource_group = 'workflow_approval'
ORDER BY total_count DESC
LIMIT 1;
