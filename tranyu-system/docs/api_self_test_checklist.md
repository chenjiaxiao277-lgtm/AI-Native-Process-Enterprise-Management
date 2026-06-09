# API 自测清单（MVP 最小版）

> 说明：当前接口仅为最小可跑逻辑，重点验证 CRUD 与配置读写链路可用。

## 1. 租户管理

1. 创建租户  
`POST /api/tenants`

2. 查询租户列表  
`GET /api/tenants`

3. 查询租户详情  
`GET /api/tenants/{id}`

4. 更新租户  
`PUT /api/tenants/{id}`

5. 启用/禁用租户  
`POST /api/tenants/{id}/enable`  
`POST /api/tenants/{id}/disable`

## 2. 用户管理

1. 创建用户  
`POST /api/users`

2. 查询用户列表（可带 tenantId 过滤）  
`GET /api/users?tenantId=...`

3. 查询用户详情  
`GET /api/users/{id}`

4. 更新用户  
`PUT /api/users/{id}`

5. 启用/禁用用户  
`POST /api/users/{id}/enable`  
`POST /api/users/{id}/disable`

## 3. 空间管理

1. 创建空间  
`POST /api/spaces`

2. 查询空间列表  
`GET /api/spaces?tenantId=...`

3. 查询空间详情  
`GET /api/spaces/{spaceId}?tenantId=...`

4. 更新空间  
`PUT /api/spaces/{spaceId}?tenantId=...`

5. 归档空间  
`POST /api/spaces/{spaceId}/archive?tenantId=...`

### 空间成员

6. 查询空间成员  
`GET /api/spaces/{spaceId}/members?tenantId=...`

7. 添加空间成员  
`POST /api/spaces/{spaceId}/members?tenantId=...`

8. 删除空间成员  
`DELETE /api/spaces/{spaceId}/members/{memberId}`

### 空间用户组

9. 查询空间组  
`GET /api/spaces/{spaceId}/groups?tenantId=...`

10. 创建空间组  
`POST /api/spaces/{spaceId}/groups?tenantId=...`

### 空间角色（基于 sys_role）

11. 查询空间角色  
`GET /api/spaces/{spaceId}/roles?tenantId=...`

12. 创建空间角色  
`POST /api/spaces/{spaceId}/roles?tenantId=...`

### 空间关联授权

13. 查询空间关联授权  
`GET /api/spaces/{spaceId}/relation-auth?tenantId=...`

14. 创建空间关联授权  
`POST /api/spaces/{spaceId}/relation-auth?tenantId=...`

## 4. 权限管理

### 租户级

1. 读取默认模板  
`GET /api/tenants/{tenantId}/default-templates`

2. 更新默认模板  
`PUT /api/tenants/{tenantId}/default-templates`

3. 读取功能开关  
`GET /api/tenants/{tenantId}/feature-toggles`

4. 更新功能开关  
`PUT /api/tenants/{tenantId}/feature-toggles`

### 空间级

1. 读取基础权限  
`GET /api/spaces/{spaceId}/permissions/basic?tenantId=...`

2. 更新基础权限  
`PUT /api/spaces/{spaceId}/permissions/basic?tenantId=...`

3. 读取数据权限  
`GET /api/spaces/{spaceId}/permissions/data?tenantId=...`

4. 更新数据权限  
`PUT /api/spaces/{spaceId}/permissions/data?tenantId=...`

5. 读取操作权限  
`GET /api/spaces/{spaceId}/permissions/action?tenantId=...`

6. 更新操作权限  
`PUT /api/spaces/{spaceId}/permissions/action?tenantId=...`

7. 读取功能权限  
`GET /api/spaces/{spaceId}/permissions/feature?tenantId=...`

8. 更新功能权限  
`PUT /api/spaces/{spaceId}/permissions/feature?tenantId=...`
