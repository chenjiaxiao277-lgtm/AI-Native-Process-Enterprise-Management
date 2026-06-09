-- Phase B 第3步：UAT 最小闭环补充
-- 目标：当本地/UAT 库尚未建立任何用户-角色关系时，补一条可验证链路
-- 约束：仅在 sys_user_role 为空时执行；仅绑定 user_id=1 与 role_id=1；幂等、可重复执行

USE ltc_db;

SET @user_role_count = (SELECT COUNT(1) FROM sys_user_role);
SET @user_exists = (SELECT COUNT(1) FROM sys_user WHERE id = 1 AND IFNULL(deleted, 0) = 0);
SET @role_exists = (SELECT COUNT(1) FROM sys_role WHERE id = 1 AND IFNULL(deleted, 0) = 0 AND IFNULL(status, 0) = 1);

INSERT INTO sys_user_role (user_id, role_id)
SELECT 1, 1
FROM dual
WHERE @user_role_count = 0
  AND @user_exists = 1
  AND @role_exists = 1
  AND NOT EXISTS (
    SELECT 1
    FROM sys_user_role ur
    WHERE ur.user_id = 1
      AND ur.role_id = 1
  );

SELECT @user_role_count AS before_user_role_count, @user_exists AS user_1_exists, @role_exists AS role_1_exists;
