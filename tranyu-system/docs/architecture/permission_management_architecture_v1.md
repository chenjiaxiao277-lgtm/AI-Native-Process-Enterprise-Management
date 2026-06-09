# LTC 权限管理架构方案（v1）

> 废弃说明：该文档保留历史参考，不再作为当前实现基线。  
> 当前请统一参考：`/Users/jocelyn/Documents/LTCplatform/tranyu-system/docs/architecture/ipd_architecture_baseline_v2.md`

> **主体模型更新（2026-04）**：下文中的「流程角色」、建议表 `ltc_perm_process_role_binding` 等属于历史草案口径。当前基线已统一为四类主体：`user`、`group`、`space_role`、`work_item_instance_role`；「流程节点角色」与「工作项实例角色」合并为 **`work_item_instance_role`**，不单独建 `process_role` 域。详见基线 **§5.1 / 5.1.1**。

## 1. 文档目标

本方案用于指导 `tranyu-system` 的权限体系落地，目标如下：

1. 支持“多租户 > 多空间 > 业务资源”分层隔离。
2. 采用 `RBAC + ABAC` 混合权限模型。
3. 保持“禁止优先、默认拒绝、允许并集”计算规则。
4. 与 Flowable 6.8.1 解耦：Flowable 仅执行流程，权限由业务层统一决策。
5. 具备可审计、可缓存、可回收、可扩展能力。

---

## 2. 设计原则（强约束）

1. **最小权限原则**：未显式授权即拒绝。
2. **禁止优先原则**：命中任何禁止规则即拒绝。
3. **分层隔离原则**：租户隔离优先于空间隔离，空间隔离优先于业务授权。
4. **统一入口原则**：所有后端业务写操作、敏感读操作必须经过统一权限引擎。
5. **流程解耦原则**：先鉴权再调用 Flowable API，不在 Flowable 内部做权限判断。
6. **审计可追溯原则**：授权变更、校验失败、越权尝试均可追溯。

---

## 3. 核心模型：RBAC + ABAC

### 3.1 RBAC（主引擎）

授权链路：

`用户 -> 用户组 -> 角色 -> 权限`

适用场景：

1. 菜单/页面级授权
2. 空间配置管理权限
3. 批量岗位权限继承

### 3.2 ABAC（辅引擎）

基于属性条件做细粒度控制，属性维度包含：

1. 主体属性：用户ID、部门、用户组、角色、流程角色
2. 资源属性：资源类型、资源ID、空间ID、字段key、节点ID
3. 环境属性：时间区间、来源端、IP段、是否只读模式
4. 业务属性：工作项状态、优先级、业务线、是否本人创建、是否节点处理人

适用场景：

1. “仅负责人可编辑金额字段”
2. “节点处于审批中时允许驳回”
3. “仅空间管理员可删附件”

---

## 4. 四层分层管控模型

### L1 租户层（tenant）

1. 管控对象：企业、组织、全局管理员能力
2. 典型动作：租户设置、组织结构、全局安全策略、全局审计查看
3. 约束：不同 `tenant_id` 完全隔离

### L2 空间层（space）

1. 管控对象：单空间配置与成员
2. 典型动作：空间设置、工作项类型配置、流程模板配置、空间成员管理
3. 约束：不同 `space_id` 默认隔离，跨空间必须有授权白名单

### L3 实例层（work_item / process_instance）

1. 管控对象：工作项实例、流程实例、任务
2. 典型动作：查看、编辑、审批、驳回、转办、评论、关联
3. 约束：实例访问必须满足“空间权限 + 资源权限 + 状态条件”

### L4 字段/附件层（field / attachment）

1. 管控对象：字段、附件、敏感子资源
2. 典型动作：字段查看/编辑、附件上传/下载/删除
3. 约束：字段与附件权限单独计算，不继承实例“编辑即全可编辑”

---

## 5. 统一资源与动作标准（必须先定义）

## 5.1 资源类型 `resource_type`

1. `space`
2. `work_item_type`
3. `work_item_record`
4. `work_item_field`
5. `attachment`
6. `process_template`
7. `process_instance`
8. `process_task`
9. `process_node`
10. `menu`

## 5.2 动作 `action`

1. `view`
2. `create`
3. `edit`
4. `delete`
5. `approve`
6. `reject`
7. `add_sign`
8. `transfer`
9. `withdraw`
10. `comment`
11. `upload`
12. `download`
13. `config`

---

## 6. 数据库设计（权限域）

> 说明：当前项目历史表前缀存在 `ltc_`，为兼容存量，权限域延续 `ltc_`。  
> 若后续统一命名规范，需以迁移脚本一次性调整，避免混用。

建议新增（或按现有表扩展）：

1. `ltc_perm_role`
2. `ltc_perm_user_role`
3. `ltc_perm_user_group`
4. `ltc_perm_group_user`
5. `ltc_perm_group_role`
6. `ltc_perm_policy`
7. `ltc_perm_policy_subject`
8. `ltc_perm_policy_resource`
9. `ltc_perm_policy_condition`
10. `ltc_perm_process_role_binding`
11. `ltc_perm_audit_log`
12. `ltc_perm_cache_version`

所有权限域表必须包含：

1. `tenant_id`（必填）
2. `space_id`（空间级及以下资源必填）
3. `status`（启用/禁用）
4. `create_time`、`update_time`

关键索引建议：

1. `(tenant_id, space_id, resource_type, resource_id, action, status)`
2. `(tenant_id, subject_type, subject_id, status)`
3. 审计表 `(tenant_id, user_id, event_type, create_time)`

---

## 7. 权限计算引擎设计

## 7.1 核心输入

`PermissionContext`

1. `tenantId`
2. `spaceId`
3. `userId`
4. `resourceType`
5. `resourceId`
6. `action`
7. `attributes`（ABAC扩展属性）

## 7.2 计算流程

1. 校验租户与空间上下文合法性。
2. 汇总主体集合：用户直绑角色、用户组角色、流程角色。
3. 拉取匹配策略（主体 + 资源 + 动作 + 条件）。
4. 先判 `deny`：命中即拒绝并记录审计。
5. 再判 `allow`：命中则允许。
6. 均未命中：默认拒绝并记录审计。
7. 返回 `Decision`（allow/deny + reason + matchedPolicyIds）。

## 7.3 结果缓存

缓存Key建议：

`perm:{tenant}:{space}:{user}:{resourceType}:{resourceId}:{action}:v{policyVersion}`

失效策略：

1. 任意策略、角色、组、成员关系变更 -> 增加 `policyVersion`。
2. 流程角色分配变更 -> 失效流程实例相关key。

---

## 8. 与 Flowable 的边界

1. Flowable负责：
   - 流程定义部署
   - 实例推进
   - 任务生命周期

2. 业务层负责：
   - 谁能启动流程
   - 谁能审批/驳回/转办/加签
   - 谁能看流程数据与字段

3. 调用顺序：
   - `PermissionEngine.check(...) -> pass -> Flowable API`

4. 约束：
   - 不改 `act_*` 表结构
   - 不直接暴露 Flowable 原生接口给前端
   - Flowable ID仅作映射，不作业务权限主键

---

## 9. 鉴权落点（三层防线）

### 9.1 接口层（Controller/Interceptor）

1. 登录态校验
2. 租户头/空间头校验
3. 基础菜单权限快速拒绝（可选）

### 9.2 业务层（Service，强制）

1. 关键业务操作前执行权限引擎
2. 流程操作增加节点角色校验
3. 数据查询做范围裁剪（仅返回有权数据）

### 9.3 前端层（展示控制）

1. 按权限隐藏按钮、菜单、字段
2. 禁用无权限操作入口
3. 仅做体验优化，不替代后端鉴权

---

## 10. 空间隔离与空间关联授权

1. 默认规则：同租户多空间数据隔离。
2. 跨空间读取：仅允许命中 `ltc_space_relation_auth` 白名单。
3. 跨空间写入：默认禁止；如确需开放，必须单独策略与审计。
4. 授权维度：
   - 类型级：`work_item_type`
   - 记录级：`work_item_record`
5. 授权状态：
   - 启用、禁用、过期自动失效

---

## 11. 审计与安全

审计日志需覆盖：

1. 权限策略新增/修改/删除
2. 角色与用户组成员变更
3. 权限校验拒绝（含原因）
4. 流程关键动作（审批/驳回/转办）

安全要求：

1. 敏感操作二次确认（删除/禁用）
2. 高风险动作记录操作者、来源IP、请求ID
3. 禁止前端存储高敏权限策略明文

---

## 12. 配置入口映射（系统内）

1. 租户级：企业管理后台 -> 权限管理
2. 空间级：空间配置 -> 权限管理
3. 流程级：流程管理 -> 节点权限配置
4. 字段级：工作项配置 -> 字段管理 -> 字段权限

---

## 13. 分阶段实施计划

### Phase P0（先保安全）

1. 统一 `resource_type/action` 枚举
2. Service层接入统一 `PermissionEngine`
3. 关键接口强制校验 `tenant_id + space_id`
4. 完成“跨空间读白名单、写默认禁用”

### Phase P1（完善能力）

1. 上线角色/用户组/策略管理页面
2. 上线 ABAC 条件配置（状态、负责人、业务线等）
3. 流程角色与节点绑定自动回收

### Phase P2（治理与可观测）

1. 完成权限审计查询与导出
2. 增加越权告警与灰度策略
3. 增加自动化回归（鉴权矩阵测试）

---

## 14. 风险清单与规避

1. 风险：策略过多导致性能下降  
   - 方案：索引优化 + policyVersion缓存 + 批量鉴权接口

2. 风险：角色爆炸、管理复杂  
   - 方案：优先用户组授权，角色分层命名规范

3. 风险：流程角色未回收导致越权  
   - 方案：节点迁移事件中自动回收，并写审计

4. 风险：跨空间误授权  
   - 方案：授权默认禁用、到期机制、变更审批与日志

---

## 15. 合规检查清单（LTC 基线）

1. 技术域：通过  
   - 未引入新框架，仅定义权限域架构与落地规范。

2. 页面域：通过  
   - 保持“权限控制按钮显隐 + 空态 + 错误反馈”一致交互。

3. 功能域：通过  
   - 强制最小权限、租户与空间隔离、审计可追溯。

4. 数据库域：通过  
   - 明确 `tenant_id + space_id`、索引、状态、审计与变更策略。

5. 代码域：通过  
   - 统一鉴权入口、解耦 Flowable、可扩展、可测试。
