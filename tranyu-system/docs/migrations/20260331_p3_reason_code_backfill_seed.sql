-- P3 第二小步：reasonCode 回填与资源组补链
-- 目标：规范化 reasonCode 并回填 resource_group
-- 约束：幂等、可重复执行；串行第 2 步

USE ltc_db;

UPDATE ltc_permission_audit_log
SET reason_code = UPPER(TRIM(reason_code))
WHERE reason_code IS NOT NULL
  AND reason_code <> UPPER(TRIM(reason_code));

UPDATE ltc_permission_audit_log
SET resource_group = 'workflow_approval'
WHERE (resource_group IS NULL OR TRIM(resource_group) = '')
  AND resource_id IN ('workflow_approval_page', 'workflow_tasks', 'workflow_approval');

SELECT reason_code, resource_group
FROM ltc_permission_audit_log
WHERE resource_group = 'workflow_approval'
ORDER BY id DESC
LIMIT 1;
