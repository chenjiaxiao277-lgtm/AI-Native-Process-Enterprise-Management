-- 租户扩展性准备：租户配置表

CREATE TABLE IF NOT EXISTS ltc_tenant_config (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  tenant_name VARCHAR(128) NOT NULL COMMENT '租户名称',
  tier VARCHAR(16) NOT NULL DEFAULT 'small' COMMENT '租户等级：small/medium/large',
  max_users INT NOT NULL DEFAULT 100 COMMENT '用户配额',
  max_spaces INT NOT NULL DEFAULT 10 COMMENT '空间配额',
  max_work_items BIGINT NOT NULL DEFAULT 10000 COMMENT '工作项配额',
  db_shard_hint VARCHAR(64) DEFAULT NULL COMMENT '数据库分片标识（预留）',
  cache_shard_hint VARCHAR(64) DEFAULT NULL COMMENT '缓存分片标识（预留）',
  status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT '状态：active/inactive',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ltc_tenant_config_tenant_id (tenant_id),
  KEY idx_tenant_tier (tier, status)
) COMMENT='租户配置表';
