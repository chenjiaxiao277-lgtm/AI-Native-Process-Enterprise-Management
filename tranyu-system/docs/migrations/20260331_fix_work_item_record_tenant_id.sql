-- 修复：工作项记录缺少 tenant_id 列导致查询报错
-- 约束：幂等可重复执行

USE ltc_db;

SET @needs_tenant := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ltc_work_item_record'
    AND COLUMN_NAME = 'tenant_id'
);

SET @ddl_tenant := IF(
  @needs_tenant = 0,
  'ALTER TABLE ltc_work_item_record ADD COLUMN tenant_id varchar(64) NOT NULL DEFAULT ''default'' COMMENT ''租户ID'' AFTER work_item_type_id',
  'SELECT 1'
);
PREPARE stmt FROM @ddl_tenant;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 补齐历史记录 tenant_id
UPDATE ltc_work_item_record
SET tenant_id = 'default'
WHERE tenant_id IS NULL OR tenant_id = '';

SET @needs_idx := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ltc_work_item_record'
    AND INDEX_NAME = 'idx_ltc_work_item_record_tenant_space'
);

SET @ddl_idx := IF(
  @needs_idx = 0,
  'CREATE INDEX idx_ltc_work_item_record_tenant_space ON ltc_work_item_record(tenant_id, space_id)',
  'SELECT 1'
);
PREPARE stmt2 FROM @ddl_idx;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
