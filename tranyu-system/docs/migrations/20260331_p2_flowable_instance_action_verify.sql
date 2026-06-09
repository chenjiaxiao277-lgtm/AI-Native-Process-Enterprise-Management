-- P2 第2步：FlowableInstanceService terminate 链路与统一审计出口核对
-- 目标：核对用户 -> 角色 -> 资源 -> 动作 与审计关联结果
-- 约束：需在 DDL、seed 串行执行完成后执行

USE ltc_db;

SELECT
  u.id AS user_id,
  ur.role_id,
  prr.resource_code,
  prr.action_scope,
  pal.process_instance_id,
  pal.task_id,
  pal.action,
  pal.reason_code,
  pal.matched_policy_ids,
  fal.comment
FROM sys_user u
JOIN sys_user_role ur ON ur.user_id = u.id
JOIN ltc_permission_role_resource prr ON prr.role_id = ur.role_id
JOIN ltc_permission_audit_log pal
  ON pal.user_id = u.id
 AND pal.resource_id = prr.resource_code
JOIN ltc_flowable_approval_log fal
  ON fal.process_instance_id = pal.process_instance_id
 AND fal.task_id = pal.task_id
 AND fal.user_id = pal.user_id
 AND fal.action = pal.action
WHERE u.id = 1
  AND prr.resource_code = 'workflow_approval_page'
  AND FIND_IN_SET('terminate', prr.action_scope) > 0
  AND pal.process_instance_id = 'p2_flowable_instance_proc_001'
  AND pal.task_id = 'p2_flowable_instance_task_001'
  AND pal.action = 'terminate'
ORDER BY pal.id DESC
LIMIT 1;
