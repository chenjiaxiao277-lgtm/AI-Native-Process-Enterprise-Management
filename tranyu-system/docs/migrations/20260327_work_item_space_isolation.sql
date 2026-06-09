-- 工作项空间隔离：为工作项类型与工作项记录增加 space_id 并建立索引

SET @db = DATABASE();

SET @col1_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'ltc_work_item_type'
      AND COLUMN_NAME = 'space_id'
);
SET @sql1 = IF(@col1_exists = 0,
               'ALTER TABLE ltc_work_item_type ADD COLUMN space_id VARCHAR(64) NOT NULL DEFAULT ''space_1'' AFTER type_code',
               'SELECT 1');
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @col2_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'ltc_work_item_record'
      AND COLUMN_NAME = 'space_id'
);
SET @sql2 = IF(@col2_exists = 0,
               'ALTER TABLE ltc_work_item_record ADD COLUMN space_id VARCHAR(64) NOT NULL DEFAULT ''space_1'' AFTER work_item_type_id',
               'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

UPDATE ltc_work_item_type
SET space_id = 'space_1'
WHERE space_id IS NULL OR space_id = '';

UPDATE ltc_work_item_record
SET space_id = 'space_1'
WHERE space_id IS NULL OR space_id = '';

SET @idx1_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'ltc_work_item_type'
      AND INDEX_NAME = 'idx_ltc_work_item_type_space_id'
);
SET @sql3 = IF(@idx1_exists = 0,
               'CREATE INDEX idx_ltc_work_item_type_space_id ON ltc_work_item_type (space_id)',
               'SELECT 1');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

SET @idx2_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'ltc_work_item_record'
      AND INDEX_NAME = 'idx_ltc_work_item_record_space_id'
);
SET @sql4 = IF(@idx2_exists = 0,
               'CREATE INDEX idx_ltc_work_item_record_space_id ON ltc_work_item_record (space_id)',
               'SELECT 1');
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;
