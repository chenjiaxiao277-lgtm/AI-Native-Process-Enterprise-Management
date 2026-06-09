-- 平台管理员 - 超级租户管理员：账号上限 / 到期时间
-- 注意：幂等执行，避免重复添加字段

USE ltc_db;

-- ltc_tenant.account_limit
SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_tenant'
        AND COLUMN_NAME = 'account_limit'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_tenant ADD COLUMN account_limit INT DEFAULT NULL COMMENT ''租户账号数上限'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ltc_tenant.admin_expire_at
SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_tenant'
        AND COLUMN_NAME = 'admin_expire_at'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_tenant ADD COLUMN admin_expire_at DATETIME DEFAULT NULL COMMENT ''租户管理员到期时间'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
