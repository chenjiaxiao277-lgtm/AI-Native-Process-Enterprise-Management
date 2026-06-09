-- P2 第1步：并行审批链路样例 seed
-- 目标：为权限审计日志 + Flowable 业务审批日志提供一条可复核的关联样例
-- 约束：幂等、可重复执行；需在 DDL 后串行执行

USE ltc_db;

SET @tenant_id = 'default';
SET @space_id = 0;
SET @user_id = 1;
SET @action = 'approve';
SET @resource_type = 'page';
SET @resource_id = 'workflow_approval_page';
SET @process_instance_id = 'p2_flowable_sample_proc_001';
SET @task_id = 'p2_flowable_sample_task_001';

SET @matched_policy_ids = (
  SELECT CAST(prr.id AS CHAR)
  FROM sys_user u
  JOIN sys_user_role ur ON ur.user_id = u.id
  JOIN ltc_permission_role_resource prr ON prr.role_id = ur.role_id
  WHERE u.id = @user_id
    AND IFNULL(prr.deleted, 0) = 0
    AND IFNULL(prr.status, 0) = 1
    AND prr.resource_type = @resource_type
    AND prr.resource_code = @resource_id
    AND FIND_IN_SET(@action, prr.action_scope) > 0
  ORDER BY prr.space_id DESC, prr.id DESC
  LIMIT 1
);

INSERT INTO ltc_permission_audit_log
  (tenant_id, space_id, user_id, resource_type, resource_id, process_instance_id, task_id, action, allowed, reason_code, matched_policy_ids, creator, updater)
SELECT
  @tenant_id, @space_id, @user_id, @resource_type, @resource_id, @process_instance_id, @task_id, @action, 1, 'ALLOW_MATCHED_POLICY', IFNULL(@matched_policy_ids, ''), 'system', 'system'
FROM dual
WHERE NOT EXISTS (
  SELECT 1
  FROM ltc_permission_audit_log pal
  WHERE pal.process_instance_id = @process_instance_id
    AND pal.task_id = @task_id
    AND pal.user_id = @user_id
    AND pal.action = @action
);

INSERT INTO ltc_flowable_approval_log
  (process_instance_id, task_id, user_id, action, comment, creator, updater)
SELECT
  @process_instance_id, @task_id, @user_id, @action, 'P2 审批关联样例', 'system', 'system'
FROM dual
WHERE NOT EXISTS (
  SELECT 1
  FROM ltc_flowable_approval_log fal
  WHERE fal.process_instance_id = @process_instance_id
    AND fal.task_id = @task_id
    AND fal.user_id = @user_id
    AND fal.action = @action
);

SELECT @process_instance_id AS seeded_process_instance_id, @task_id AS seeded_task_id, @matched_policy_ids AS seeded_policy_id;
