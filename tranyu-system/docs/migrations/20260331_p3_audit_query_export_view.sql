-- P3 第三小步：统一审计查询 DTO 与导出视图增强
-- 目标：支持 resourceType/resourceId 筛选与 CSV 导出字段顺序核对
-- 约束：本轮无 DDL/backfill，仅串行执行 view -> verify

USE ltc_db;

CREATE OR REPLACE VIEW vw_permission_audit_report AS
SELECT
  tenant_id,
  space_id,
  resource_type,
  resource_id,
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
GROUP BY tenant_id,
         space_id,
         resource_type,
         resource_id,
         resource_group,
         DATE_FORMAT(create_time, '%Y-%m-%d'),
         action,
         reason_code;
