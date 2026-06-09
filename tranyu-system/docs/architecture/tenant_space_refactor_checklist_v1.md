# LTC 多租户（tenant）-多空间（space）整改清单（v1）

> 废弃说明：该文档保留历史参考，不再作为当前实现基线。  
> 当前请统一参考：`/Users/jocelyn/Documents/LTCplatform/tranyu-system/docs/architecture/ipd_architecture_baseline_v2.md`

## 1. 目标

- 固化数据隔离层级：`tenant_id > space_id > 业务数据`
- 业务层默认强制隔离：空间级数据查询必须带 `tenant_id + space_id`
- Flowable 仅执行流程，不承担租户/空间隔离职责

## 2. 表结构整改清单（逐表）

说明：
- `A类（全局租户级）`：仅 `tenant_id`（如租户级字典、租户配置）
- `B类（空间级）`：必须 `tenant_id + space_id`（本次重点）

### 2.1 工作项域（B类）

1. `ltc_work_item_type`
- 新增：`tenant_id`（若无）
- 新增：`space_id`（若无）
- 索引：`idx_tenant_space_type (tenant_id, space_id, id)`

2. `ltc_work_item_field`
- 新增：`tenant_id`、`space_id`
- 索引：`idx_tenant_space_field (tenant_id, space_id, work_item_type_id)`

3. `ltc_work_item_record`
- 新增：`tenant_id`、`space_id`
- 索引：`idx_tenant_space_record (tenant_id, space_id, work_item_type_id, id)`

4. `ltc_work_item_record_data`（或字段值明细表）
- 新增：`tenant_id`、`space_id`
- 索引：`idx_tenant_space_record_data (tenant_id, space_id, record_id)`

5. `ltc_work_item_layout` / `ltc_work_item_layout_tab` / `ltc_work_item_layout_group`
- 新增：`tenant_id`、`space_id`
- 索引：`idx_tenant_space_layout (tenant_id, space_id, work_item_type_id)`

6. `ltc_work_item_role` / `ltc_work_item_role_member`
- 新增：`tenant_id`、`space_id`
- 索引：`idx_tenant_space_role (tenant_id, space_id, work_item_type_id)`

7. `ltc_work_item_flow` / `ltc_work_item_flow_node` / `ltc_work_item_flow_edge`
- 新增：`tenant_id`、`space_id`
- 索引：`idx_tenant_space_flow (tenant_id, space_id, work_item_type_id)`

### 2.2 空间域

1. `ltc_space`
- 必须有：`tenant_id`
- 校验唯一：`uk_tenant_space_code (tenant_id, space_code)`

2. `ltc_space_nav_config`
- 必须有：`tenant_id`、`space_id`
- 用于导航配置“可见/隐藏”的空间级控制

3. `ltc_space_relation_auth`
- 必须有：`tenant_id`、`source_space_id`、`target_space_id`
- 记录跨空间授权范围（资源类型、有效期、授权人）

### 2.3 流程业务映射域（B类）

1. `ltc_process_template`
- `tenant_id`、`space_id`、`template_version`（必有）

2. `ltc_process_instance`
- `tenant_id`、`space_id`
- 映射字段：`flow_process_instance_id`

3. `ltc_process_task`
- `tenant_id`、`space_id`
- 映射字段：`flow_task_id`

4. `ltc_process_comment`
- `tenant_id`、`space_id`

## 3. 数据迁移策略（零停机优先）

1. 第一步：加字段不加约束
- 所有目标表加 `tenant_id`,`space_id`（允许空）

2. 第二步：回填历史数据
- 根据“所属空间/工作项类型/实例关系”回填
- 产出回填对账报表（总量、空值量、异常量）

3. 第三步：应用双写
- 新增/更新同时写入 `tenant_id + space_id`

4. 第四步：查询切换
- 所有查询强制带 `tenant_id + space_id`
- 观察 1~2 天

5. 第五步：加 NOT NULL + 索引 + 约束
- 清理空值后收口

## 4. 后端接口整改清单（逐类）

## 4.1 上下文与中间件

1. `TenantContext`
- 增加 `currentTenantId`, `currentSpaceId`

2. 请求拦截器
- 从登录态/请求头解析租户与空间
- 写入上下文，请求结束清理

3. MyBatis 拦截器/基类
- 空间级表自动附加 `tenant_id + space_id`
- 禁止绕过（白名单表单独声明）

## 4.2 空间接口

1. 空间切换接口
- 切换后返回新的 `space_id`
- 前端刷新菜单与模块缓存

2. 空间列表接口
- 仅返回当前 `tenant_id` 下空间

3. 空间关联授权接口
- 显式声明跨空间资源访问范围

## 4.3 工作项接口

1. 工作项类型列表/创建/编辑
- 参数/落库带 `tenant_id + space_id`

2. 字段管理、页面布局、流程管理、角色管理
- 全部按空间隔离
- 禁止读取其他空间配置

3. 工作项实例列表/详情
- 查询条件强制 `tenant_id + space_id`

## 4.4 流程接口（Flowable 适配）

1. 启动流程
- 业务实例先落库（tenant+space）
- 调 Flowable 启动并写回映射 ID

2. 审批通过/驳回/转办/撤回
- 先业务权限判定（tenant+space+角色）
- 再调用 Flowable

3. 待办/已办
- 先业务侧过滤实例范围（tenant+space）
- 再关联 Flowable 任务

## 5. 前端整改清单

1. 全局状态
- `currentTenantId` + `currentSpaceId` 必须持久化
- 空间切换触发全局 reload（菜单、模块、缓存）

2. 路由与请求
- 所有空间级 API 请求带 `spaceId`
- 切换空间后清空旧空间缓存（列表、详情、布局配置）

3. 导航配置
- 读取当前空间下配置
- 空间配置菜单固定置底
- 其他工作项模块按配置展示为一级菜单

## 6. 回归测试清单（必须）

1. 隔离测试
- 同 tenant 不同 space：互不可见
- 跨 tenant：完全不可见

2. 授权测试
- 配置空间关联后，仅授权资源可见
- 未授权资源仍不可见

3. 流程测试
- 启动、审批、驳回、待办、已办在不同空间互不串

4. 缓存测试
- 切换空间后列表、详情、导航立即刷新，禁止残留旧空间数据

## 7. 交付节奏建议（可直接执行）

1. Sprint 1（地基）
- 表加字段 + 回填脚本 + 上下文/拦截器改造

2. Sprint 2（工作项域）
- 工作项类型/字段/页面布局/流程管理/角色管理接口切换到 tenant+space

3. Sprint 3（流程域）
- 流程映射表 tenant+space 全量改造 + 待办已办链路修复

4. Sprint 4（联调与门禁）
- 跨空间授权、前端空间切换刷新、全链路回归

## 8. 合并门禁（必须全部通过）

- [ ] 空间级表全部具备 `tenant_id + space_id`
- [ ] 空间级查询全部带双条件
- [ ] 空间切换后页面数据100%刷新
- [ ] 流程实例与任务无跨空间串读
- [ ] 跨空间访问必须命中授权表
- [ ] 回归用例通过并留档
