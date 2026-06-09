-- 空间关联授权表（同租户跨空间访问白名单）

CREATE TABLE IF NOT EXISTS ltc_space_relation_auth (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  source_space_id VARCHAR(64) NOT NULL COMMENT '来源空间ID',
  target_space_id VARCHAR(64) NOT NULL COMMENT '目标空间ID',
  resource_type VARCHAR(32) NOT NULL COMMENT '资源类型：work_item_type/work_item_record/process_instance等',
  resource_key VARCHAR(128) DEFAULT NULL COMMENT '资源标识，NULL表示该类型全部',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1启用 0禁用',
  expire_time DATETIME DEFAULT NULL COMMENT '授权过期时间，NULL表示长期有效',
  granted_by VARCHAR(64) DEFAULT NULL COMMENT '授权人',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_space_relation_scope (tenant_id, source_space_id, target_space_id, resource_type, resource_key),
  KEY idx_space_relation_lookup (tenant_id, source_space_id, target_space_id, status, expire_time)
) COMMENT='空间关联授权表';
