-- Phase B 第2步：权限读取链路最小闭环验证
-- 用途：只读核对“用户 -> 角色 -> menu/router/page”查询结果
-- 说明：将变量替换为实际用户、租户、空间后执行

USE ltc_db;

SET @tenant_id = 'default';
SET @space_id = 0;
SET @user_id = 1;

SELECT
  u.id           AS user_id,
  u.username     AS username,
  r.id           AS role_id,
  r.role_code    AS role_code,
  r.role_name    AS role_name
FROM sys_user u
JOIN sys_user_role ur ON ur.user_id = u.id
JOIN sys_role r ON r.id = ur.role_id
WHERE u.id = @user_id
  AND IFNULL(u.deleted, 0) = 0
  AND IFNULL(r.deleted, 0) = 0
  AND IFNULL(r.status, 0) = 1
ORDER BY r.sort ASC, r.id ASC;

SELECT
  prr.role_id,
  prr.resource_type,
  prr.resource_code,
  prr.effect_type,
  prr.space_id
FROM ltc_permission_role_resource prr
JOIN sys_user_role ur ON ur.role_id = prr.role_id
JOIN sys_role r ON r.id = prr.role_id
WHERE ur.user_id = @user_id
  AND prr.tenant_id = @tenant_id
  AND prr.space_id IN (0, @space_id)
  AND IFNULL(prr.deleted, 0) = 0
  AND IFNULL(prr.status, 0) = 1
  AND IFNULL(r.deleted, 0) = 0
  AND IFNULL(r.status, 0) = 1
ORDER BY prr.resource_type ASC, prr.space_id ASC, prr.role_id ASC, prr.id ASC;

SELECT
  m.menu_code,
  m.menu_name,
  m.space_id
FROM ltc_permission_menu m
WHERE m.tenant_id = @tenant_id
  AND m.space_id IN (0, @space_id)
  AND IFNULL(m.deleted, 0) = 0
  AND IFNULL(m.status, 0) = 1
  AND EXISTS (
    SELECT 1
    FROM ltc_permission_role_resource prr
    JOIN sys_user_role ur ON ur.role_id = prr.role_id
    JOIN sys_role r ON r.id = prr.role_id
    WHERE ur.user_id = @user_id
      AND prr.tenant_id = @tenant_id
      AND prr.space_id IN (0, @space_id)
      AND prr.resource_type = 'menu'
      AND prr.resource_code = m.menu_code
      AND prr.effect_type = 'allow'
      AND IFNULL(prr.deleted, 0) = 0
      AND IFNULL(prr.status, 0) = 1
      AND IFNULL(r.deleted, 0) = 0
      AND IFNULL(r.status, 0) = 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM ltc_permission_role_resource prr
    JOIN sys_user_role ur ON ur.role_id = prr.role_id
    JOIN sys_role r ON r.id = prr.role_id
    WHERE ur.user_id = @user_id
      AND prr.tenant_id = @tenant_id
      AND prr.space_id IN (0, @space_id)
      AND prr.resource_type = 'menu'
      AND prr.resource_code = m.menu_code
      AND prr.effect_type = 'deny'
      AND IFNULL(prr.deleted, 0) = 0
      AND IFNULL(prr.status, 0) = 1
      AND IFNULL(r.deleted, 0) = 0
      AND IFNULL(r.status, 0) = 1
  )
ORDER BY m.sort ASC, m.id ASC;

SELECT
  rt.router_code,
  rt.router_name,
  rt.path,
  rt.space_id
FROM ltc_permission_router rt
WHERE rt.tenant_id = @tenant_id
  AND rt.space_id IN (0, @space_id)
  AND IFNULL(rt.deleted, 0) = 0
  AND IFNULL(rt.status, 0) = 1
  AND EXISTS (
    SELECT 1
    FROM ltc_permission_role_resource prr
    JOIN sys_user_role ur ON ur.role_id = prr.role_id
    JOIN sys_role r ON r.id = prr.role_id
    WHERE ur.user_id = @user_id
      AND prr.tenant_id = @tenant_id
      AND prr.space_id IN (0, @space_id)
      AND prr.resource_type = 'router'
      AND prr.resource_code = rt.router_code
      AND prr.effect_type = 'allow'
      AND IFNULL(prr.deleted, 0) = 0
      AND IFNULL(prr.status, 0) = 1
      AND IFNULL(r.deleted, 0) = 0
      AND IFNULL(r.status, 0) = 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM ltc_permission_role_resource prr
    JOIN sys_user_role ur ON ur.role_id = prr.role_id
    JOIN sys_role r ON r.id = prr.role_id
    WHERE ur.user_id = @user_id
      AND prr.tenant_id = @tenant_id
      AND prr.space_id IN (0, @space_id)
      AND prr.resource_type = 'router'
      AND prr.resource_code = rt.router_code
      AND prr.effect_type = 'deny'
      AND IFNULL(prr.deleted, 0) = 0
      AND IFNULL(prr.status, 0) = 1
      AND IFNULL(r.deleted, 0) = 0
      AND IFNULL(r.status, 0) = 1
  )
ORDER BY rt.sort ASC, rt.id ASC;

SELECT
  p.page_code,
  p.page_name,
  p.router_code,
  p.space_id
FROM ltc_permission_page p
WHERE p.tenant_id = @tenant_id
  AND p.space_id IN (0, @space_id)
  AND IFNULL(p.deleted, 0) = 0
  AND IFNULL(p.status, 0) = 1
  AND EXISTS (
    SELECT 1
    FROM ltc_permission_role_resource prr
    JOIN sys_user_role ur ON ur.role_id = prr.role_id
    JOIN sys_role r ON r.id = prr.role_id
    WHERE ur.user_id = @user_id
      AND prr.tenant_id = @tenant_id
      AND prr.space_id IN (0, @space_id)
      AND prr.resource_type = 'page'
      AND prr.resource_code = p.page_code
      AND prr.effect_type = 'allow'
      AND IFNULL(prr.deleted, 0) = 0
      AND IFNULL(prr.status, 0) = 1
      AND IFNULL(r.deleted, 0) = 0
      AND IFNULL(r.status, 0) = 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM ltc_permission_role_resource prr
    JOIN sys_user_role ur ON ur.role_id = prr.role_id
    JOIN sys_role r ON r.id = prr.role_id
    WHERE ur.user_id = @user_id
      AND prr.tenant_id = @tenant_id
      AND prr.space_id IN (0, @space_id)
      AND prr.resource_type = 'page'
      AND prr.resource_code = p.page_code
      AND prr.effect_type = 'deny'
      AND IFNULL(prr.deleted, 0) = 0
      AND IFNULL(prr.status, 0) = 1
      AND IFNULL(r.deleted, 0) = 0
      AND IFNULL(r.status, 0) = 1
  )
ORDER BY p.page_name ASC, p.id ASC;
