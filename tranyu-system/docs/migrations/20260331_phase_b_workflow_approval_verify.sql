-- Phase B 第5步：审批动作链路抽样核对
-- 目标：核对用户 -> 角色 -> 资源 -> approve 绑定是否生效
-- 约束：在 DDL、seed 串行执行完成后再执行

USE ltc_db;

SELECT
  u.id AS user_id,
  ur.role_id,
  prr.id AS binding_id,
  prr.resource_type,
  prr.resource_code,
  prr.action_scope,
  prr.effect_type,
  prr.space_id
FROM sys_user u
JOIN sys_user_role ur ON ur.user_id = u.id
JOIN ltc_permission_role_resource prr ON prr.role_id = ur.role_id
WHERE u.id = 1
  AND IFNULL(prr.deleted, 0) = 0
  AND IFNULL(prr.status, 0) = 1
  AND prr.resource_code = 'workflow_approval_page'
ORDER BY prr.space_id DESC, prr.id DESC
LIMIT 1;
