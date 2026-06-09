-- 租户/空间/权限 MVP 基础表（阶段2：仅骨架）
-- 注意：保持与现有 ltc_ 前缀一致（项目既有命名风格）

USE ltc_db;

-- sys_user 增加 tenant_id（兼容迁移，允许为空）
SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sys_user'
        AND COLUMN_NAME = 'tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE sys_user ADD COLUMN tenant_id VARCHAR(64) DEFAULT NULL COMMENT ''租户ID'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sys_user'
        AND INDEX_NAME = 'idx_user_tenant'
    ),
    'SELECT 1',
    'CREATE INDEX idx_user_tenant ON sys_user (tenant_id)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- sys_role 扩展 tenant/space/scope/type
SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sys_role'
        AND COLUMN_NAME = 'tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE sys_role ADD COLUMN tenant_id VARCHAR(64) DEFAULT NULL COMMENT ''租户ID'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sys_role'
        AND COLUMN_NAME = 'space_id'
    ),
    'SELECT 1',
    'ALTER TABLE sys_role ADD COLUMN space_id VARCHAR(64) DEFAULT NULL COMMENT ''空间ID'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sys_role'
        AND COLUMN_NAME = 'role_scope'
    ),
    'SELECT 1',
    'ALTER TABLE sys_role ADD COLUMN role_scope VARCHAR(16) DEFAULT ''TENANT'' COMMENT ''角色范围：TENANT/SPACE'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sys_role'
        AND COLUMN_NAME = 'role_type'
    ),
    'SELECT 1',
    'ALTER TABLE sys_role ADD COLUMN role_type VARCHAR(16) DEFAULT ''SYSTEM'' COMMENT ''角色类型：SYSTEM/CUSTOM'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- tenant
CREATE TABLE IF NOT EXISTS ltc_tenant (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  tenant_name VARCHAR(128) NOT NULL COMMENT '租户名称',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户表';

-- tenant_admin
CREATE TABLE IF NOT EXISTS ltc_tenant_admin (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_tenant_admin (tenant_id, user_id),
  KEY idx_tenant_admin_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户管理员';

-- tenant_feature_toggle
CREATE TABLE IF NOT EXISTS ltc_tenant_feature_toggle (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  feature_key VARCHAR(64) NOT NULL COMMENT '功能开关键',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
  remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_tenant_feature (tenant_id, feature_key),
  KEY idx_tenant_feature_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户功能开关';

-- space
CREATE TABLE IF NOT EXISTS ltc_space (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  space_id VARCHAR(64) NOT NULL COMMENT '空间ID',
  space_name VARCHAR(128) NOT NULL COMMENT '空间名称',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  archived TINYINT NOT NULL DEFAULT 0 COMMENT '是否归档',
  description VARCHAR(255) DEFAULT NULL COMMENT '描述',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_space_key (tenant_id, space_id),
  KEY idx_space_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='空间表';

-- space_member
CREATE TABLE IF NOT EXISTS ltc_space_member (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  space_id VARCHAR(64) NOT NULL COMMENT '空间ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  role_id BIGINT DEFAULT NULL COMMENT '角色ID(可空)',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_space_member (tenant_id, space_id, user_id),
  KEY idx_space_member_space (tenant_id, space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='空间成员';

-- space_group
CREATE TABLE IF NOT EXISTS ltc_space_group (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  space_id VARCHAR(64) NOT NULL COMMENT '空间ID',
  group_name VARCHAR(64) NOT NULL COMMENT '用户组名称',
  group_code VARCHAR(64) DEFAULT NULL COMMENT '用户组编码',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  description VARCHAR(255) DEFAULT NULL COMMENT '描述',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_space_group_space (tenant_id, space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='空间用户组';

-- space_group_member
CREATE TABLE IF NOT EXISTS ltc_space_group_member (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  group_id BIGINT NOT NULL COMMENT '用户组ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_space_group_member (tenant_id, group_id, user_id),
  KEY idx_space_group_member_group (tenant_id, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='空间用户组成员';

-- user_auth_account
CREATE TABLE IF NOT EXISTS ltc_user_auth_account (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  auth_type VARCHAR(32) NOT NULL COMMENT '认证类型',
  account VARCHAR(128) NOT NULL COMMENT '认证账号',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_auth (tenant_id, auth_type, account),
  KEY idx_user_auth_user (tenant_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户认证账号';

-- user_status_log
CREATE TABLE IF NOT EXISTS ltc_user_status_log (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  from_status TINYINT DEFAULT NULL COMMENT '原状态',
  to_status TINYINT DEFAULT NULL COMMENT '新状态',
  reason VARCHAR(255) DEFAULT NULL COMMENT '变更原因',
  operator_id BIGINT DEFAULT NULL COMMENT '操作人',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_user_status (tenant_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户状态日志';

-- permission_policy (轻量骨架)
CREATE TABLE IF NOT EXISTS ltc_permission_policy (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  space_id VARCHAR(64) DEFAULT NULL COMMENT '空间ID(可空)',
  subject_type VARCHAR(32) DEFAULT NULL COMMENT '主体类型',
  subject_id VARCHAR(128) DEFAULT NULL COMMENT '主体ID',
  resource_type VARCHAR(64) DEFAULT NULL COMMENT '资源类型',
  action VARCHAR(64) DEFAULT NULL COMMENT '动作',
  effect VARCHAR(8) NOT NULL DEFAULT 'ALLOW' COMMENT 'ALLOW/DENY',
  policy_name VARCHAR(128) NOT NULL COMMENT '策略名称',
  policy_scope VARCHAR(16) NOT NULL DEFAULT 'SPACE' COMMENT '策略范围',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_permission_policy_scope (tenant_id, space_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限策略';

-- permission_menu_binding (轻量骨架)
CREATE TABLE IF NOT EXISTS ltc_permission_menu_binding (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  space_id VARCHAR(64) DEFAULT NULL COMMENT '空间ID(可空)',
  policy_id BIGINT NOT NULL COMMENT '策略ID',
  menu_key VARCHAR(128) NOT NULL COMMENT '菜单键',
  effect VARCHAR(8) NOT NULL DEFAULT 'ALLOW' COMMENT 'ALLOW/DENY',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_perm_menu_policy (tenant_id, space_id, policy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限-菜单绑定';

-- permission_feature_binding (轻量骨架)
CREATE TABLE IF NOT EXISTS ltc_permission_feature_binding (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  space_id VARCHAR(64) DEFAULT NULL COMMENT '空间ID(可空)',
  policy_id BIGINT NOT NULL COMMENT '策略ID',
  feature_key VARCHAR(128) NOT NULL COMMENT '功能键',
  effect VARCHAR(8) NOT NULL DEFAULT 'ALLOW' COMMENT 'ALLOW/DENY',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_perm_feature_policy (tenant_id, space_id, policy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限-功能绑定';

-- permission_data_binding (轻量骨架)
CREATE TABLE IF NOT EXISTS ltc_permission_data_binding (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  space_id VARCHAR(64) DEFAULT NULL COMMENT '空间ID(可空)',
  policy_id BIGINT NOT NULL COMMENT '策略ID',
  resource_type VARCHAR(64) NOT NULL COMMENT '资源类型',
  resource_id VARCHAR(128) DEFAULT NULL COMMENT '资源ID(可空)',
  effect VARCHAR(8) NOT NULL DEFAULT 'ALLOW' COMMENT 'ALLOW/DENY',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_perm_data_policy (tenant_id, space_id, policy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限-数据绑定';

-- permission_field_binding (轻量骨架)
CREATE TABLE IF NOT EXISTS ltc_permission_field_binding (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  space_id VARCHAR(64) DEFAULT NULL COMMENT '空间ID(可空)',
  policy_id BIGINT NOT NULL COMMENT '策略ID',
  resource_type VARCHAR(64) NOT NULL COMMENT '资源类型',
  field_key VARCHAR(128) NOT NULL COMMENT '字段Key',
  effect VARCHAR(8) NOT NULL DEFAULT 'ALLOW' COMMENT 'ALLOW/DENY',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_perm_field_policy (tenant_id, space_id, policy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限-字段绑定';

-- tenant_config 扩展默认模板存储（兼容迁移）
SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ltc_tenant_config'
        AND COLUMN_NAME = 'default_template_json'
    ),
    'SELECT 1',
    'ALTER TABLE ltc_tenant_config ADD COLUMN default_template_json TEXT DEFAULT NULL COMMENT ''默认模板JSON'''
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
