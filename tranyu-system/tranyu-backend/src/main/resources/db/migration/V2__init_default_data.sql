INSERT INTO tr_tenant (
    tenant_code,
    tenant_name,
    tenant_type,
    status,
    remark
)
VALUES (
    'TRANYU_DEFAULT',
    '创与科技默认租户',
    'INTERNAL',
    'ENABLED',
    'V2平台默认初始化租户'
)
ON CONFLICT (tenant_code) DO NOTHING;

INSERT INTO tr_space (
    tenant_id,
    space_code,
    space_name,
    space_type,
    status,
    sort_no,
    remark
)
SELECT
    t.id,
    'MASTER',
    '主数据空间',
    'MASTER',
    'ENABLED',
    1,
    '租户级共享主数据空间'
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, space_code) DO NOTHING;

INSERT INTO tr_space (
    tenant_id,
    space_code,
    space_name,
    space_type,
    status,
    sort_no,
    remark
)
SELECT
    t.id,
    'IPD',
    'IPD产品开发空间',
    'IPD',
    'ENABLED',
    2,
    'IPD阶段门验证空间'
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, space_code) DO NOTHING;

INSERT INTO tr_space (
    tenant_id,
    space_code,
    space_name,
    space_type,
    status,
    sort_no,
    remark
)
SELECT
    t.id,
    'LTC',
    'LTC经营管理空间',
    'LTC',
    'ENABLED',
    3,
    'LTC经营管理模板空间'
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, space_code) DO NOTHING;

INSERT INTO tr_space (
    tenant_id,
    space_code,
    space_name,
    space_type,
    status,
    sort_no,
    remark
)
SELECT
    t.id,
    'PPM',
    'PPM项目组合空间',
    'PPM',
    'ENABLED',
    4,
    'PPM项目组合管理模板空间'
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, space_code) DO NOTHING;

INSERT INTO tr_org_role (
    tenant_id,
    role_code,
    role_name,
    role_type,
    status,
    sort_no
)
SELECT
    t.id,
    'PLATFORM_ADMIN',
    '平台管理员',
    'SYSTEM',
    'ENABLED',
    1
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, role_code) DO NOTHING;

INSERT INTO tr_org_role (
    tenant_id,
    role_code,
    role_name,
    role_type,
    status,
    sort_no
)
SELECT
    t.id,
    'TENANT_ADMIN',
    '租户管理员',
    'SYSTEM',
    'ENABLED',
    2
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, role_code) DO NOTHING;

INSERT INTO tr_org_role (
    tenant_id,
    role_code,
    role_name,
    role_type,
    status,
    sort_no
)
SELECT
    t.id,
    'NORMAL_USER',
    '普通用户',
    'SYSTEM',
    'ENABLED',
    3
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, role_code) DO NOTHING;

INSERT INTO tr_dict_type (
    tenant_id,
    dict_code,
    dict_name,
    status,
    remark
)
SELECT
    t.id,
    'SPACE_TYPE',
    '空间类型',
    'ENABLED',
    '平台空间类型字典'
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, dict_code) DO NOTHING;

INSERT INTO tr_dict_item (
    tenant_id,
    dict_code,
    item_code,
    item_name,
    item_value,
    sort_no,
    status
)
SELECT t.id, 'SPACE_TYPE', 'MASTER', '主数据空间', 'MASTER', 1, 'ENABLED'
FROM tr_tenant t WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, dict_code, item_code) DO NOTHING;

INSERT INTO tr_dict_item (
    tenant_id,
    dict_code,
    item_code,
    item_name,
    item_value,
    sort_no,
    status
)
SELECT t.id, 'SPACE_TYPE', 'LTC', 'LTC经营管理空间', 'LTC', 2, 'ENABLED'
FROM tr_tenant t WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, dict_code, item_code) DO NOTHING;

INSERT INTO tr_dict_item (
    tenant_id,
    dict_code,
    item_code,
    item_name,
    item_value,
    sort_no,
    status
)
SELECT t.id, 'SPACE_TYPE', 'IPD', 'IPD产品开发空间', 'IPD', 3, 'ENABLED'
FROM tr_tenant t WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, dict_code, item_code) DO NOTHING;

INSERT INTO tr_dict_item (
    tenant_id,
    dict_code,
    item_code,
    item_name,
    item_value,
    sort_no,
    status
)
SELECT t.id, 'SPACE_TYPE', 'PPM', 'PPM项目组合空间', 'PPM', 4, 'ENABLED'
FROM tr_tenant t WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, dict_code, item_code) DO NOTHING;

INSERT INTO tr_dict_type (
    tenant_id,
    dict_code,
    dict_name,
    status,
    remark
)
SELECT
    t.id,
    'COMMON_STATUS',
    '通用状态',
    'ENABLED',
    '平台通用状态字典'
FROM tr_tenant t
WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, dict_code) DO NOTHING;

INSERT INTO tr_dict_item (
    tenant_id,
    dict_code,
    item_code,
    item_name,
    item_value,
    sort_no,
    status
)
SELECT t.id, 'COMMON_STATUS', 'ENABLED', '启用', 'ENABLED', 1, 'ENABLED'
FROM tr_tenant t WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, dict_code, item_code) DO NOTHING;

INSERT INTO tr_dict_item (
    tenant_id,
    dict_code,
    item_code,
    item_name,
    item_value,
    sort_no,
    status
)
SELECT t.id, 'COMMON_STATUS', 'DISABLED', '停用', 'DISABLED', 2, 'ENABLED'
FROM tr_tenant t WHERE t.tenant_code = 'TRANYU_DEFAULT'
ON CONFLICT (tenant_id, dict_code, item_code) DO NOTHING;
