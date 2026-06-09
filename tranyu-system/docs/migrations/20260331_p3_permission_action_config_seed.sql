-- P3 第一步：审批资源动作配置化 seed
-- 目标：写入 workflow_approval 资源组动作配置，保持向后兼容
-- 约束：串行执行第 2 步

USE ltc_db;

SET @tenant_id = 'default';
SET @space_id = 0;
SET @resource_group = 'workflow_approval';

INSERT INTO ltc_permission_action_config
  (tenant_id, space_id, resource_group, action_code, resource_type, resource_code, sort, status, deleted, creator, updater)
VALUES
  (@tenant_id, @space_id, @resource_group, 'approve', 'page', 'workflow_approval_page', 10, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'approve', 'router', 'workflow_tasks', 20, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'approve', 'menu', 'workflow_approval', 30, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'reject', 'page', 'workflow_approval_page', 10, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'reject', 'router', 'workflow_tasks', 20, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'reject', 'menu', 'workflow_approval', 30, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'terminate', 'page', 'workflow_approval_page', 10, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'terminate', 'router', 'workflow_tasks', 20, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'terminate', 'menu', 'workflow_approval', 30, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'transfer', 'page', 'workflow_approval_page', 10, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'transfer', 'router', 'workflow_tasks', 20, 1, 0, 'system', 'system'),
  (@tenant_id, @space_id, @resource_group, 'transfer', 'menu', 'workflow_approval', 30, 1, 0, 'system', 'system')
ON DUPLICATE KEY UPDATE
  sort = VALUES(sort),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

SELECT resource_group, action_code, resource_type, resource_code
FROM ltc_permission_action_config
WHERE tenant_id = @tenant_id
  AND space_id = @space_id
  AND resource_group = @resource_group
ORDER BY action_code, sort
LIMIT 4;
