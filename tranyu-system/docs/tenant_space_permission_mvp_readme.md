# 租户/用户/空间/权限管理 MVP 骨架说明

本说明用于阶段 3 的 controller + DTO/VO skeleton 收口，明确边界、映射关系、当前完成范围与后续最小实现顺序。

## 1. 模块边界说明

### 1.1 租户管理
- 负责：租户基础信息、启停、管理员、配置、能力开关（MVP）。
- 不负责：租户级权限策略的复杂裁决与 ABAC。

### 1.2 用户管理
- 负责：用户基础信息、启停、租户归属。
- 不负责：登录、认证、token、密码流程。
- 认证与审计仅保留结构字段（后续扩展）。

### 1.3 空间管理
- 负责：空间创建/编辑/归档、成员、用户组、空间关联授权（space_relation_auth）。
- 角色：使用扩展后的 sys_role（role_scope=SPACE 且 space_id=空间ID）。
- 不负责：角色成员分配接口，不提供 group 绑定角色。

### 1.4 权限管理
- 租户级：默认模板与功能开关。
- 空间级：基础信息/数据权限/操作权限/功能权限（仅骨架）。
- 权限主体维度预留：user / group / space_role / work_item_instance_role。
- 方案 A 生效：当前阶段 group 不作为实际授权主体，不提供 group 授权接口。

## 2. 表结构与接口映射关系

### 2.1 租户管理
- 表：
  - ltc_tenant
  - ltc_tenant_admin
  - ltc_tenant_config（已存在）
  - ltc_tenant_feature_toggle
- 接口：
  - GET/POST/PUT /api/tenants
  - POST /api/tenants/{id}/enable
  - POST /api/tenants/{id}/disable
  - GET/PUT /api/tenants/{id}/default-templates
  - GET/PUT /api/tenants/{id}/feature-toggles

### 2.2 用户管理
- 表：
  - sys_user（新增 tenant_id，可空）
  - ltc_user_auth_account
  - ltc_user_status_log
  - sys_user_role（继续复用，绑定 user 与 role）
- 接口：
  - GET/POST/PUT /api/users
  - POST /api/users/{id}/enable
  - POST /api/users/{id}/disable

### 2.3 空间管理
- 表：
  - ltc_space
  - ltc_space_member
  - ltc_space_group
  - ltc_space_group_member
  - ltc_space_relation_auth（已存在）
- 接口：
  - GET/POST/PUT /api/spaces
  - POST /api/spaces/{id}/archive
  - GET/POST /api/spaces/{id}/members
  - DELETE /api/spaces/{id}/members/{memberId}
  - GET/POST /api/spaces/{id}/groups
  - GET/POST /api/spaces/{id}/roles（基于 sys_role.role_scope=SPACE 且 space_id=空间ID）
  - GET/POST /api/spaces/{id}/relation-auth

### 2.4 权限管理
- 表：
  - ltc_permission_policy（补齐 subject/resource/action/effect）
  - ltc_permission_menu_binding
  - ltc_permission_feature_binding
  - ltc_permission_data_binding
  - ltc_permission_field_binding
- 接口：
  - GET/PUT /api/spaces/{id}/permissions/basic
  - GET/PUT /api/spaces/{id}/permissions/data
  - GET/PUT /api/spaces/{id}/permissions/action
  - GET/PUT /api/spaces/{id}/permissions/feature

## 3. 当前 skeleton 范围

### 3.1 Controller
- 仅路由 + 方法签名 + 入参/出参 DTO 结构。
- 不做 PermissionEngine 复杂裁决。
- 不做跨模块业务逻辑编排。

### 3.2 DTO/VO
- 轻量字段，仅覆盖当前阶段所需。
- 不包含 ABAC、字段权限、节点权限复杂结构。

### 3.3 Service
- 简单 CRUD skeleton，复用 MyBatis-Plus Mapper。
- 不引入新 service 体系，不使用额外 base/serviceimpl 结构。

## 4. 暂未实现清单

- 用户登录/认证/token/密码流程。
- 角色成员分配接口。
- group 绑定角色接口（方案 A 暂不落地）。
- 权限条件策略（ABAC）、字段级/节点级权限裁决。
- PermissionEngine 真实策略加载与执行。

## 5. 后续 MVP 最小实现顺序

1. 租户管理最小可用：
   - ltc_tenant CRUD + 启停
   - tenant_admin 增删（后续补）
2. 用户管理最小可用：
   - /api/users CRUD + 启停（租户过滤）
3. 空间管理最小可用：
   - /api/spaces CRUD + 归档
   - /members /groups 最小读写
4. 权限管理最小可用：
   - /api/spaces/{id}/permissions/basic 读写（只存结构）
   - /api/tenants/{id}/feature-toggles 读写

## 6. 当前最小实现落地点

- Controller 已覆盖四个模块的最小 CRUD 路由与入参/出参结构。
- Service 仅做最小可跑的 MyBatis-Plus 查询与保存逻辑。
- 权限配置暂存于 `ltc_permission_policy.remark`（仅作为配置载体）。

## 7. 已知基线冲突（暂不处理）

- API 前缀：当前仓库使用 `/api`，基线要求 `/ltc/v1.0/`。
- 表前缀：当前仓库使用 `ltc_`，基线要求 `l_`。
本阶段仅记录冲突，不做改造。

## 8. 前端对接说明（MVP）

- 平台层新增页面：租户管理、用户管理、空间管理、权限管理（租户模板/开关/空间权限）。
- 仅做“能打开、能调接口、能保存、能回显”的最小交互。
- 未接入动态菜单与权限生效，不影响现有空间配置与泳道图页面。

## 9. 字段联调账号（仅用于联调）

- `field_test_admin`（默认密码 `123456`）
- 账号用于字段系统联调打通，覆盖平台/租户/空间入口与最小权限策略。

---

**注意：** 本说明不涉及泳道图、流程图、节点布局、连线路由相关模块，严格避开该范围。
