-- P3 收尾：审计导出入口标准化核对
-- 目标：核对 1 条 DTO 导出结果、1 个导出文件名样例、1 组分页导出证据

USE ltc_db;

SELECT
  tenant_id,
  space_id,
  resource_type,
  resource_id,
  resource_group,
  audit_day,
  action,
  reason_code,
  total_count
FROM vw_permission_audit_report
WHERE tenant_id = 'default'
  AND space_id = 0
  AND resource_group = 'workflow_approval'
ORDER BY audit_day DESC, total_count DESC, resource_id ASC
LIMIT 1;

SELECT
  CONCAT(
    'approval-audit_',
    'default',
    '_space-0_',
    DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 30 DAY), '%Y-%m-%d'),
    '_',
    DATE_FORMAT(CURDATE(), '%Y-%m-%d'),
    '_',
    DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
    '.csv'
  ) AS export_file_name;

SELECT
  tenant_id,
  space_id,
  resource_id,
  audit_day,
  action,
  total_count
FROM vw_permission_audit_report
WHERE tenant_id = 'default'
  AND space_id = 0
  AND resource_group = 'workflow_approval'
ORDER BY audit_day DESC, total_count DESC, resource_id ASC
LIMIT 2;
