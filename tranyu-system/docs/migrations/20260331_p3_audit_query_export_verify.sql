-- P3 第三小步：统一审计查询 DTO 与 CSV 导出核对
-- 目标：核对 1 条 DTO 筛选结果 + 1 条导出头部字段顺序样例
-- 约束：串行第 2 步

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
  AND resource_type = 'page'
  AND resource_id = 'workflow_approval_page'
  AND resource_group = 'workflow_approval'
  AND audit_day BETWEEN DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 30 DAY), '%Y-%m-%d')
                    AND DATE_FORMAT(CURDATE(), '%Y-%m-%d')
ORDER BY audit_day DESC, total_count DESC
LIMIT 1;

SELECT 'tenantId,spaceId,resourceType,resourceId,resourceGroup,auditDay,action,reasonCode,reasonLabel,totalCount,allowCount,denyCount' AS csv_header;
