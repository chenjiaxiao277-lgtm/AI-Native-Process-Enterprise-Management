ALTER TABLE ltc_permission_policy
  ADD COLUMN resource_key VARCHAR(128) DEFAULT NULL COMMENT '资源Key';
