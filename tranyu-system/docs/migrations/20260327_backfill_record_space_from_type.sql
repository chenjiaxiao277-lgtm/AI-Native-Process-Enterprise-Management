-- 将历史工作项记录的 space_id 按所属工作项类型回填，修复跨空间串读

UPDATE ltc_work_item_record r
JOIN ltc_work_item_type t ON t.id = r.work_item_type_id
SET r.space_id = t.space_id
WHERE (r.space_id IS NULL OR r.space_id = '' OR r.space_id <> t.space_id);

-- 校验：是否还有与类型空间不一致的数据
SELECT COUNT(*) AS mismatch_count
FROM ltc_work_item_record r
JOIN ltc_work_item_type t ON t.id = r.work_item_type_id
WHERE (r.space_id IS NULL OR r.space_id = '' OR r.space_id <> t.space_id);
