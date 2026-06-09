-- 工作项租户隔离：为工作项类型与工作项记录增加 tenant_id，并按 tenant+space 建索引
-- 目标：工作项主数据统一按 tenant_id + space_id 双条件隔离

SET @db = DATABASE();

-- 1) ltc_work_item_type 增加 tenant_id（幂等）
SET @type_tenant_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'ltc_work_item_type'
      AND COLUMN_NAME = 'tenant_id'
);
SET @sql1 = IF(@type_tenant_exists = 0,
               'ALTER TABLE ltc_work_item_type ADD COLUMN tenant_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER type_code',
               'SELECT 1');
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2) ltc_work_item_record 增加 tenant_id（幂等）
SET @record_tenant_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'ltc_work_item_record'
      AND COLUMN_NAME = 'tenant_id'
);
SET @sql2 = IF(@record_tenant_exists = 0,
               'ALTER TABLE ltc_work_item_record ADD COLUMN tenant_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER work_item_type_id',
               'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3) 回填 tenant_id：类型表默认 default
UPDATE ltc_work_item_type
SET tenant_id = 'default'
WHERE tenant_id IS NULL OR tenant_id = '';

-- 4) 回填 tenant_id：记录表优先跟随所属类型
UPDATE ltc_work_item_record r
JOIN ltc_work_item_type t ON t.id = r.work_item_type_id
SET r.tenant_id = t.tenant_id
WHERE r.tenant_id IS NULL OR r.tenant_id = '' OR r.tenant_id <> t.tenant_id;

-- 5) 索引：type 表 tenant+space
SET @idx_type_tenant_space_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'ltc_work_item_type'
      AND INDEX_NAME = 'idx_ltc_work_item_type_tenant_space'
);
SET @sql3 = IF(@idx_type_tenant_space_exists = 0,
               'CREATE INDEX idx_ltc_work_item_type_tenant_space ON ltc_work_item_type (tenant_id, space_id)',
               'SELECT 1');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- 6) 索引：record 表 tenant+space
SET @idx_record_tenant_space_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'ltc_work_item_record'
      AND INDEX_NAME = 'idx_ltc_work_item_record_tenant_space'
);
SET @sql4 = IF(@idx_record_tenant_space_exists = 0,
               'CREATE INDEX idx_ltc_work_item_record_tenant_space ON ltc_work_item_record (tenant_id, space_id)',
               'SELECT 1');
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- 7) 校验：tenant 不一致数据
SELECT COUNT(*) AS tenant_mismatch_count
FROM ltc_work_item_record r
JOIN ltc_work_item_type t ON t.id = r.work_item_type_id
WHERE r.tenant_id <> t.tenant_id;
