-- Phase B 第5步：审批前置鉴权资源与 approve 动作绑定
-- 目标：为 WorkflowProcessService 审批通过/驳回接入统一权限入口
-- 约束：幂等、可重复执行；需在 DDL 后串行执行

USE ltc_db;

SET @tenant_id = 'default';
SET @space_id = 0;

INSERT INTO ltc_permission_menu
  (tenant_id, space_id, menu_code, menu_name, parent_code, icon, sort, visible, status, deleted, creator, updater)
VALUES
  (@tenant_id, @space_id, 'workflow_approval', '流程审批', 'space_management', 'AuditOutlined', 120, 1, 1, 0, 'system', 'system')
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  parent_code = VALUES(parent_code),
  icon = VALUES(icon),
  sort = VALUES(sort),
  visible = VALUES(visible),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

INSERT INTO ltc_permission_router
  (tenant_id, space_id, router_code, router_name, path, component, menu_code, sort, status, deleted, creator, updater)
VALUES
  (@tenant_id, @space_id, 'workflow_tasks', '流程审批任务', '/workflow/tasks', 'Workflow/WorkflowTaskList', 'workflow_approval', 120, 1, 0, 'system', 'system')
ON DUPLICATE KEY UPDATE
  router_name = VALUES(router_name),
  path = VALUES(path),
  component = VALUES(component),
  menu_code = VALUES(menu_code),
  sort = VALUES(sort),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

INSERT INTO ltc_permission_page
  (tenant_id, space_id, page_code, page_name, router_code, page_type, status, deleted, creator, updater)
VALUES
  (@tenant_id, @space_id, 'workflow_approval_page', '流程审批页', 'workflow_tasks', 'page', 1, 0, 'system', 'system')
ON DUPLICATE KEY UPDATE
  page_name = VALUES(page_name),
  router_code = VALUES(router_code),
  page_type = VALUES(page_type),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

SET @candidate_role_id = (
  SELECT r.id
  FROM sys_role r
  WHERE IFNULL(r.deleted, 0) = 0
    AND IFNULL(r.status, 0) = 1
    AND (
      r.role_code IN ('admin', 'space_admin', 'system_admin')
      OR r.role_name IN ('管理员', '空间管理员', '系统管理员')
    )
  ORDER BY r.id
  LIMIT 1
);

SET @active_role_count = (
  SELECT COUNT(1)
  FROM sys_role r
  WHERE IFNULL(r.deleted, 0) = 0
    AND IFNULL(r.status, 0) = 1
);

SET @fallback_role_id = (
  SELECT r.id
  FROM sys_role r
  WHERE IFNULL(r.deleted, 0) = 0
    AND IFNULL(r.status, 0) = 1
  ORDER BY r.id
  LIMIT 1
);

SET @role_id = IFNULL(@candidate_role_id, IF(@active_role_count = 1, @fallback_role_id, NULL));
SET @action_scope = 'approve';

INSERT INTO ltc_permission_role_resource
  (tenant_id, space_id, role_id, resource_type, resource_code, effect_type, action_scope, status, deleted, creator, updater)
SELECT
  @tenant_id, @space_id, @role_id, 'menu', 'workflow_approval', 'allow', @action_scope, 1, 0, 'system', 'system'
FROM dual
WHERE @role_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  effect_type = VALUES(effect_type),
  action_scope = VALUES(action_scope),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

INSERT INTO ltc_permission_role_resource
  (tenant_id, space_id, role_id, resource_type, resource_code, effect_type, action_scope, status, deleted, creator, updater)
SELECT
  @tenant_id, @space_id, @role_id, 'router', 'workflow_tasks', 'allow', @action_scope, 1, 0, 'system', 'system'
FROM dual
WHERE @role_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  effect_type = VALUES(effect_type),
  action_scope = VALUES(action_scope),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

INSERT INTO ltc_permission_role_resource
  (tenant_id, space_id, role_id, resource_type, resource_code, effect_type, action_scope, status, deleted, creator, updater)
SELECT
  @tenant_id, @space_id, @role_id, 'page', 'workflow_approval_page', 'allow', @action_scope, 1, 0, 'system', 'system'
FROM dual
WHERE @role_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  effect_type = VALUES(effect_type),
  action_scope = VALUES(action_scope),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

SELECT @role_id AS seeded_role_id, @action_scope AS seeded_action_scope;
