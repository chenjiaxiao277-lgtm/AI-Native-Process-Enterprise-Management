-- P3 第一步：配置化动作链路与报表视图核对
-- 目标：核对 1 条动作链路与 1 条报表聚合结果
-- 约束：串行执行第 4 步

USE ltc_db;

SELECT
  pac.resource_group,
  pac.action_code,
  pac.resource_type,
  pac.resource_code
FROM ltc_permission_action_config pac
WHERE pac.tenant_id = 'default'
  AND pac.space_id = 0
  AND pac.resource_group = 'workflow_approval'
  AND pac.action_code = 'terminate'
ORDER BY pac.sort
LIMIT 1;

SELECT
  tenant_id,
  space_id,
  action,
  reason_code,
  total_count,
  allow_count,
  deny_count
FROM vw_permission_audit_report
WHERE tenant_id = 'default'
  AND space_id = 0
  AND action = 'terminate'
ORDER BY total_count DESC
LIMIT 1;
