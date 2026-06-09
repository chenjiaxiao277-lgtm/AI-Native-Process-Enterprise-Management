-- 用户 / 角色 / 部门 / 用户角色关联 表结构
-- 在 ltc_db 中执行本脚本：
--   mysql -u root -p ltc_db < system_auth_tables.sql

USE ltc_db;

-- 1. 部门表
CREATE TABLE IF NOT EXISTS sys_dept (
  id           BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  dept_name    VARCHAR(50)  NOT NULL COMMENT '部门名称',
  parent_id    BIGINT       NOT NULL DEFAULT 0 COMMENT '上级部门ID，0 为根',
  status       TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  deleted      TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0 未删，1 已删',
  dept_code    VARCHAR(50)  DEFAULT NULL COMMENT '部门编码',
  leader       VARCHAR(50)  DEFAULT NULL COMMENT '部门负责人姓名',
  leader_id    BIGINT       DEFAULT NULL COMMENT '部门负责人用户ID',
  phone        VARCHAR(20)  DEFAULT NULL COMMENT '联系电话',
  sort         INT          DEFAULT 0 COMMENT '排序值，越小越靠前',
  creator      VARCHAR(50)  DEFAULT NULL COMMENT '创建人',
  updater      VARCHAR(50)  DEFAULT NULL COMMENT '更新人',
  create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_parent_id (parent_id),
  KEY idx_dept_status (status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表';

-- 2. 角色表
CREATE TABLE IF NOT EXISTS sys_role (
  id           BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  role_name    VARCHAR(50)  NOT NULL COMMENT '角色名称',
  role_code    VARCHAR(50)  NOT NULL COMMENT '角色编码（唯一）',
  status       TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  deleted      TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0 未删，1 已删',
  description  VARCHAR(255) DEFAULT NULL COMMENT '角色描述',
  sort         INT          DEFAULT 0 COMMENT '排序值',
  creator      VARCHAR(50)  DEFAULT NULL COMMENT '创建人',
  updater      VARCHAR(50)  DEFAULT NULL COMMENT '更新人',
  create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_role_code (role_code),
  KEY idx_role_status (status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 3. 用户表
CREATE TABLE IF NOT EXISTS sys_user (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  username        VARCHAR(50)  NOT NULL COMMENT '登录名（唯一）',
  password        VARCHAR(100) NOT NULL COMMENT '密码（BCrypt 加密）',
  real_name       VARCHAR(50)  DEFAULT NULL COMMENT '真实姓名',
  dept_id         BIGINT       DEFAULT NULL COMMENT '所属部门ID',
  status          TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
  deleted         TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除：0 未删，1 已删',
  phone           VARCHAR(20)  DEFAULT NULL COMMENT '手机号',
  email           VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  avatar          VARCHAR(255) DEFAULT NULL COMMENT '头像地址',
  gender          TINYINT      DEFAULT NULL COMMENT '性别：0 未知，1 男，2 女',
  last_login_time DATETIME     DEFAULT NULL COMMENT '最后登录时间',
  last_login_ip   VARCHAR(64)  DEFAULT NULL COMMENT '最后登录 IP',
  creator         VARCHAR(50)  DEFAULT NULL COMMENT '创建人',
  updater         VARCHAR(50)  DEFAULT NULL COMMENT '更新人',
  create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_username (username),
  KEY idx_user_dept (dept_id),
  KEY idx_user_status (status, deleted),
  CONSTRAINT fk_user_dept_id FOREIGN KEY (dept_id) REFERENCES sys_dept (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 4. 用户角色关联表
CREATE TABLE IF NOT EXISTS sys_user_role (
  id      BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  role_id BIGINT NOT NULL COMMENT '角色ID',
  UNIQUE KEY uk_user_role (user_id, role_id),
  KEY idx_user (user_id),
  KEY idx_role (role_id),
  CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES sys_user (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES sys_role (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

