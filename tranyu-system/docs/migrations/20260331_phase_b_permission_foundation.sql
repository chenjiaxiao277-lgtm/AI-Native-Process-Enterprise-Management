-- Phase B：权限底座（menu / router / page / role-resource）
-- 目标：最小补齐 UAT 权限资源链路，不改现有接口契约
-- 要求：脚本幂等，可重复执行

USE ltc_db;

CREATE TABLE IF NOT EXISTS ltc_permission_menu (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  tenant_id       VARCHAR(64)  NOT NULL DEFAULT 'default' COMMENT '租户ID',
  space_id        BIGINT       NOT NULL DEFAULT 0 COMMENT '空间ID，0 表示租户级资源',
  menu_code       VARCHAR(100) NOT NULL COMMENT '菜单编码',
  menu_name       VARCHAR(100) NOT NULL COMMENT '菜单名称',
  parent_code     VARCHAR(100) DEFAULT NULL COMMENT '父级菜单编码',
  icon            VARCHAR(100) DEFAULT NULL COMMENT '图标',
  sort            INT          NOT NULL DEFAULT 0 COMMENT '排序',
  visible         TINYINT      NOT NULL DEFAULT 1 COMMENT '是否可见：0 否，1 是',
  status          TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  deleted         TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0 未删，1 已删',
  creator         VARCHAR(64)  DEFAULT NULL COMMENT '创建人',
  updater         VARCHAR(64)  DEFAULT NULL COMMENT '更新人',
  create_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_menu_tenant_space_code (tenant_id, space_id, menu_code),
  KEY idx_menu_parent (tenant_id, space_id, parent_code),
  KEY idx_menu_status (tenant_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限菜单资源表';

CREATE TABLE IF NOT EXISTS ltc_permission_router (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  tenant_id       VARCHAR(64)  NOT NULL DEFAULT 'default' COMMENT '租户ID',
  space_id        BIGINT       NOT NULL DEFAULT 0 COMMENT '空间ID，0 表示租户级资源',
  router_code     VARCHAR(100) NOT NULL COMMENT '路由编码',
  router_name     VARCHAR(100) NOT NULL COMMENT '路由名称',
  path            VARCHAR(255) NOT NULL COMMENT '路由路径',
  component       VARCHAR(255) DEFAULT NULL COMMENT '前端组件',
  menu_code       VARCHAR(100) DEFAULT NULL COMMENT '所属菜单编码',
  sort            INT          NOT NULL DEFAULT 0 COMMENT '排序',
  status          TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  deleted         TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0 未删，1 已删',
  creator         VARCHAR(64)  DEFAULT NULL COMMENT '创建人',
  updater         VARCHAR(64)  DEFAULT NULL COMMENT '更新人',
  create_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_router_tenant_space_code (tenant_id, space_id, router_code),
  UNIQUE KEY uk_router_tenant_space_path (tenant_id, space_id, path),
  KEY idx_router_menu (tenant_id, space_id, menu_code),
  KEY idx_router_status (tenant_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限路由资源表';

CREATE TABLE IF NOT EXISTS ltc_permission_page (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  tenant_id       VARCHAR(64)  NOT NULL DEFAULT 'default' COMMENT '租户ID',
  space_id        BIGINT       NOT NULL DEFAULT 0 COMMENT '空间ID，0 表示租户级资源',
  page_code       VARCHAR(100) NOT NULL COMMENT '页面编码',
  page_name       VARCHAR(100) NOT NULL COMMENT '页面名称',
  router_code     VARCHAR(100) DEFAULT NULL COMMENT '所属路由编码',
  page_type       VARCHAR(50)  NOT NULL DEFAULT 'page' COMMENT '页面类型',
  status          TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  deleted         TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0 未删，1 已删',
  creator         VARCHAR(64)  DEFAULT NULL COMMENT '创建人',
  updater         VARCHAR(64)  DEFAULT NULL COMMENT '更新人',
  create_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_page_tenant_space_code (tenant_id, space_id, page_code),
  KEY idx_page_router (tenant_id, space_id, router_code),
  KEY idx_page_status (tenant_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限页面资源表';

CREATE TABLE IF NOT EXISTS ltc_permission_role_resource (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  tenant_id       VARCHAR(64)  NOT NULL DEFAULT 'default' COMMENT '租户ID',
  space_id        BIGINT       NOT NULL DEFAULT 0 COMMENT '空间ID，0 表示租户级绑定',
  role_id         BIGINT       NOT NULL COMMENT '角色ID，关联 sys_role.id',
  resource_type   VARCHAR(32)  NOT NULL COMMENT '资源类型：menu/router/page',
  resource_code   VARCHAR(100) NOT NULL COMMENT '资源编码',
  effect_type     VARCHAR(16)  NOT NULL DEFAULT 'allow' COMMENT '生效方式：allow/deny',
  status          TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  deleted         TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0 未删，1 已删',
  creator         VARCHAR(64)  DEFAULT NULL COMMENT '创建人',
  updater         VARCHAR(64)  DEFAULT NULL COMMENT '更新人',
  create_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_role_resource (tenant_id, space_id, role_id, resource_type, resource_code),
  KEY idx_role_resource_role (tenant_id, space_id, role_id, status, deleted),
  KEY idx_role_resource_lookup (tenant_id, space_id, resource_type, resource_code),
  CONSTRAINT fk_permission_role_resource_role FOREIGN KEY (role_id) REFERENCES sys_role (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色-资源权限绑定表';

INSERT INTO ltc_permission_menu
  (tenant_id, space_id, menu_code, menu_name, parent_code, icon, sort, visible, status, deleted, creator, updater)
VALUES
  ('default', 0, 'space_management', '空间管理', NULL, 'SettingOutlined', 100, 1, 1, 0, 'system', 'system')
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  parent_code = VALUES(parent_code),
  icon = VALUES(icon),
  sort = VALUES(sort),
  visible = VALUES(visible),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

INSERT INTO ltc_permission_router
  (tenant_id, space_id, router_code, router_name, path, component, menu_code, sort, status, deleted, creator, updater)
VALUES
  ('default', 0, 'space_config', '空间配置', '/space/config', 'Space/SpaceConfigPage', 'space_management', 100, 1, 0, 'system', 'system')
ON DUPLICATE KEY UPDATE
  router_name = VALUES(router_name),
  path = VALUES(path),
  component = VALUES(component),
  menu_code = VALUES(menu_code),
  sort = VALUES(sort),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);

INSERT INTO ltc_permission_page
  (tenant_id, space_id, page_code, page_name, router_code, page_type, status, deleted, creator, updater)
VALUES
  ('default', 0, 'space_config_page', '空间配置页', 'space_config', 'page', 1, 0, 'system', 'system')
ON DUPLICATE KEY UPDATE
  page_name = VALUES(page_name),
  router_code = VALUES(router_code),
  page_type = VALUES(page_type),
  status = VALUES(status),
  deleted = 0,
  updater = VALUES(updater);
