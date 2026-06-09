# AI 背景信息滚动记录

此文件由 `context-rollover-refresh` 技能维护，采用持续追加策略。

---
## 背景刷新记录 - 2026-03-28 07:53:08 +0800
- 触发原因: 背景信息快用完了

### 任务目标
实现背景滚动刷新技能

### 操作日志
创建技能目录并写入模板、脚本、配置

### 计划
先校验结构，再做触发测试

### 思路与决策
采用append-only防止历史丢失

### 风险与阻塞
自动触发依赖模型判断，不是系统钩子

### 下一步
继续执行手动口令和开场测试
---

## 背景刷新记录 - 2026-03-28 07:53:08 +0800
- 触发原因: 执行背景刷新

### 任务目标
验证手动兜底命令

### 操作日志
调用append命令生成第二条记录

### 计划
检查最新记录可被latest读取

### 思路与决策
手动口令与自动触发共用同一结构化输出

### 风险与阻塞
需要确保字段顺序固定

### 下一步
执行latest模拟新背景开场
---

## 背景刷新记录 - 2026-03-28 07:53:08 +0800
- 触发原因: 追加测试1

### 任务目标
验证连续追加

### 操作日志
追加第3条测试记录

### 计划
统计记录数量

### 思路与决策
持续追加保留时间序

### 风险与阻塞
文件增长较快，后续可分卷

### 下一步
检查记录总数
---

## 背景刷新记录 - 2026-03-28 07:53:08 +0800
- 触发原因: 追加测试2

### 任务目标
验证连续追加

### 操作日志
追加第4条测试记录

### 计划
统计记录数量

### 思路与决策
持续追加保留时间序

### 风险与阻塞
文件增长较快，后续可分卷

### 下一步
检查记录总数
---

## 背景刷新记录 - 2026-03-28 07:53:08 +0800
- 触发原因: 追加测试3

### 任务目标
验证连续追加

### 操作日志
追加第5条测试记录

### 计划
统计记录数量

### 思路与决策
持续追加保留时间序

### 风险与阻塞
文件增长较快，后续可分卷

### 下一步
检查记录总数
---

## 背景刷新记录 - 2026-03-30 21:23:01 +0800
- 触发原因: 防爆策略测试

### 任务目标
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA…

### 操作日志
测试append截断与keep

### 计划
验证latest与prune

### 思路与决策
只保留摘要，不灌全量日志

### 风险与阻塞
过长内容会触发上下文膨胀

### 下一步
执行latest与prune
---

## 背景刷新记录 - 2026-03-31 11:28:51 +0800
- 触发原因: 执行背景刷新并继续 Phase B 第2步

### 任务目标
按IPD架构基线完成权限读取链路最小闭环：新增PermissionQueryService，打通用户到角色到menu/router/page只读查询，并将资源摘要内部接入登录用户装配且不改变Controller返回契约。

### 操作日志
读取背景摘要与LTC基线；定位权限实体、mapper、登录链路与上下文；新增PermissionQueryService；在LoginService内部接入@JsonIgnore资源摘要；新增权限验证SQL与两条定向测试；修复测试Long字面量问题；补充JUnit Platform launcher后完成编译与测试验证。

### 计划
保持Controller入参/返回和流程语义不变；只改tranyu-backend与docs/migrations；用单测证明deny优先与space覆盖，用JSON序列化测试证明接口外部结构不变。

### 思路与决策
复用现有ltc_permission_menu/router/page/role_resource与sys_user_role/sys_role，不新建权限模型；查询同时兼容tenant级space_id=0与空间级资源；allow/deny按deny优先合并；资源摘要通过@JsonIgnore挂到CurrentUserInfo，做到服务层接入而不改变对外JSON。

### 风险与阻塞
当前仓库无Git元信息；项目基础测试运行时缺JUnit Platform launcher，已通过最小依赖补齐；本次仅完成RBAC只读聚合，尚未形成统一权限引擎入口与Controller级菜单快速拒绝。

### 下一步
继续Phase B第3步：抽统一PermissionEngine/PermissionFacade入口，把当前读取摘要沉淀为可复用判定输入，并逐步接入实际敏感读写点。
---

## 背景刷新记录 - 2026-03-31 12:44:11 +0800
- 触发原因: 执行背景刷新并继续 Phase B 第3步

### 任务目标
按IPD架构基线完成统一权限入口最小闭环：抽PermissionEngine与PermissionFacade统一入口，并在SpaceRelationAuthService的敏感读写点接入鉴权。

### 操作日志
读取最新背景与IPD基线；差异核对SpaceRelationAuthService作为最小接入面；新增PermissionEngine和PermissionFacade；在SpaceRelationAuthService的list/save/delete接入统一鉴权；补充PermissionEngine与Service接入测试；新增权限绑定seed/verify SQL；实库执行foundation、seed、UAT user-role seed并完成用户-角色-资源核对。

### 计划
保持Controller契约不变；只在Service层接入3个敏感点；沿用PermissionQueryService保证deny优先、默认拒绝、空间覆盖；以compileJava、3条定向测试和1次实库链路查询作为验证闭环。

### 思路与决策
统一入口分成判定层和门面层：Engine只做资源命中判定，Facade负责当前用户与上下文装配；敏感点优先选择空间配置链路，因为已存在space_config_page和space_config资源种子；实库缺少user-role关系时，增加极保守且幂等的UAT补链脚本，仅在sys_user_role为空时补user1-role1关系。

### 风险与阻塞
当前实库角色/用户名义化数据较弱（role_code=1、role_name=11），本轮只能按现有真实数据做保守seed；统一权限入口目前仍基于menu/router/page基础RBAC摘要，尚未扩展到动作级与ABAC。

### 下一步
继续Phase B后续工作时，可把PermissionFacade扩到WorkItemType/WorkItemRecord等敏感服务点，并逐步抽出更细粒度的action级判定与权限解释。
---

## 背景刷新记录 - 2026-03-31 14:13:50 +0800
- 触发原因: 执行背景刷新并继续 Phase B 第4步

### 任务目标
按IPD架构基线完成权限入口扩面、动作级判定与权限解释的后端最小闭环，覆盖 WorkItemTypeService 与 WorkItemRecordService 的敏感点。

### 操作日志
仅按当前任务差异核对，不回放历史；确认WorkItem服务缺少对应资源编码；新增action_scope列支持与工作项资源seed；扩展PermissionQueryService输出有效策略快照；升级PermissionEngine返回reasonCode与matchedPolicyIds；扩展PermissionFacade到view/create/edit/delete/approve；接入WorkItemTypeService与WorkItemRecordService的敏感读写点；新增动作级与服务接入测试；完成compileJava、定向测试和实库动作链路抽样。

### 计划
保持Controller契约与业务流程不变；继续沿用deny优先、默认拒绝、空间级覆盖；用动作级资源绑定驱动解释信息；通过1条user-role-resource-action_scope实库结果给出证据。

### 思路与决策
动作级最小闭环通过ltc_permission_role_resource.action_scope实现，而不是引入新表；PermissionEngine按target+action先判deny再判allow，并返回内部reasonCode与绑定ID；WorkItem服务统一走模块级资源work_item_management/space_work_items/work_item_manage_page，以最小代价把Facade扩面。

### 风险与阻塞
当前实库角色与用户样本语义化较弱（user=111、role_code=1），本轮动作链路验证基于真实样本但不具业务可读性；approve动作已纳入引擎与种子，但尚未接入审批服务。

### 下一步
下一轮可把approve动作真正接到WorkflowProcessService等审批前置点，并继续补充权限解释到审计日志或专用解释接口。
---

## 背景刷新记录 - 2026-03-31 14:28:41 +0800
- 触发原因: 执行背景刷新

### 任务目标
Phase B 第5步：审批前置鉴权接入 + 权限解释落审计最小闭环

### 操作日志
差异核对 WorkflowProcessService / PermissionFacade / PermissionEngine；新增权限审计实体、Mapper、Service；在 approve/reject 前置接入统一鉴权并记录审计；新增审批资源与 approve 绑定 SQL；串行执行 DDL、seed、verify；完成 compileJava 与定向测试。

### 计划
保持 Controller 契约与业务语义不变；统一走 PermissionFacade/PermissionEngine；审批通过与驳回共用 approve 动作判定；以独立审计表承载 reasonCode 与 matchedPolicyIds；最后用实库链路查询补证据。

### 思路与决策
审批前置最小接入点选在 WorkflowProcessService.approve/reject，避免新增平行鉴权逻辑；权限解释落点选独立 ltc_permission_audit_log，字段只覆盖本轮要求；审批资源采用 workflow_approval / workflow_tasks / workflow_approval_page 新码，便于后续扩审批域。

### 风险与阻塞
当前实库仅完成资源与角色绑定抽样核对，未通过运行中应用真实触发一条审批审计记录；WorkflowInstance 本身不含 tenant/space，当前审计取请求上下文，后续若要离线追溯可考虑把租户/空间冗余入流程实例。

### 下一步
下一步可把 approve 动作继续接到 FlowableTaskService 等审批入口，并把权限审计与业务审计统一串联。
---

## 背景刷新记录 - 2026-03-31 14:45:17 +0800
- 触发原因: 执行背景刷新

### 任务目标
P2 第1步：并行审批入口统一鉴权 + 审计关联查询最小闭环

### 操作日志
差异核对 FlowableTaskService/Controller 与现有权限审计结构；在 FlowableTaskService approve/reject 接入统一鉴权；新增 FlowableApprovalLog 与 ApprovalAuditQueryService；扩展 permission_audit_log 关联字段；新增定向测试；串行执行 DDL、seed、verify 并产出关联样例。

### 计划
保持 Controller 契约不变；并行审批入口统一走 PermissionFacade/PermissionEngine；用 processInstanceId/taskId + userId + action 关联权限审计与业务审批日志；最后给出实库可复核样例。

### 思路与决策
为避免新增平行鉴权逻辑，只在 FlowableTaskService 的 approve/reject 两个真实审批入口做前置鉴权；关联查询采用 ltc_permission_audit_log + ltc_flowable_approval_log 双表最小 join；放弃在 addSign/removeSign 上强行鉴权，避免把目标用户误判成操作人。

### 风险与阻塞
实库关联样例当前通过幂等 seed 生成，尚未经过运行中 Flowable 引擎真实任务触发；若后续要覆盖 addSign/removeSign，需要先补当前操作人上下文入参或线程上下文。

### 下一步
P2 下一小步可将 Flowable 实例终止/转办等并行审批操作纳入统一权限入口，并把关联查询收敛为审计服务统一出口。
---

## 背景刷新记录 - 2026-03-31 15:07:10 +0800
- 触发原因: 执行背景刷新

### 任务目标
P2 第2步：FlowableInstanceService 并行操作统一鉴权 + 审计服务出口收敛

### 操作日志
差异核对 FlowableInstanceService/Controller 与现有审计查询；补齐 PermissionFacade 四类动作常量；将 WorkflowProcessService、FlowableTaskService、FlowableInstanceService 统一切到 workflow action 判定；新增 terminate/transfer 前置鉴权与业务日志；用 ApprovalAuditService 收敛统一查询出口；新增定向测试；串行执行 DDL、seed、verify 并产出 terminate 实库样例。

### 计划
保持 Controller 契约不变；FlowableInstanceService 从上下文获取当前用户并前置鉴权；转办仅补 Service 内部入口，不新增接口；统一审计出口只保留单一 ApprovalAuditService 查询能力；实库抽样走 terminate 链路。

### 思路与决策
为保持 approve/reject/terminate/transfer 口径一致，将动作统一下沉为 PermissionFacade.checkWorkflowAction；terminate 先解析活动任务作为 taskId，兼容统一审计关联键；transfer 通过当前活动任务 setAssignee 完成，不改业务返回结构。

### 风险与阻塞
transfer 当前仅在 Service 层具备能力，尚未暴露 HTTP 入口；terminate 在无活动任务场景下使用 processInstanceId 作为 taskId 回退，仅用于保持统一审计键，不影响流程语义。

### 下一步
P3 第一小步可开始把审批权限动作与资源绑定从静态字符串升级为可配置权限模型，并引入动作解释枚举与审计报表视图。
---

## 背景刷新记录 - 2026-03-31 15:48:06 +0800
- 触发原因: 执行背景刷新

### 任务目标
P3 第一小步：审批资源动作配置化 + 统一动作解释枚举 + 审计报表视图最小闭环

### 操作日志
差异核对 PermissionFacade/PermissionEngine/PermissionQueryService 与审计表结构；新增 ApprovalAction 枚举；新增 ltc_permission_action_config 配置读取服务与 Mapper/Entity；PermissionFacade 优先按库表配置解析 workflow 审批资源并保留静态回退；ApprovalAuditService 扩展报表视图查询；新增报表视图实体/Mapper；新增动作配置、枚举、报表查询定向测试；串行执行 DDL、seed、view、verify。

### 计划
保持 Controller 契约和业务流程不变；配置化只改读取路径，不改现有资源绑定表语义；统一动作解释先收敛到枚举归一化；报表视图只做只读聚合；实库抽样核对 terminate 动作配置链路与一条报表聚合结果。

### 思路与决策
配置化最小实现采用 ltc_permission_action_config 表驱动资源组+动作+资源目标映射，PermissionFacade 读表优先、静态目标兜底，满足向后兼容；动作解释枚举只统一动作码和中文说明，不侵入返回结构；报表视图直接从 ltc_permission_audit_log 聚合，避免影响写链路。

### 风险与阻塞
当前配置化先覆盖 workflow_approval 资源组，其他模块仍走既有静态常量；报表视图基于现有审计表统计，若后续需要时间维度或资源维度分析，需要继续扩展视图或物化表。

### 下一步
P3 第二小步可继续把更多业务模块的资源目标迁移到配置表，并将 reasonCode 也做成统一枚举/字典，补齐审计报表筛选维度。
---

## 背景刷新记录 - 2026-03-31 16:25:06 +0800
- 触发原因: 执行背景刷新（P3第三小步）

### 任务目标
完成统一审计查询 DTO、统一审计服务出口改走 DTO，并补最小 CSV 导出能力。

### 操作日志
核对 ApprovalAuditService 与报表视图差异；新增 ApprovalAuditQuery 与 CSV 支撑；收口 service 查询签名；扩展报表视图到 resource_type/resource_id；执行 compileJava、定向测试、实库 view/verify 串行核对。

### 计划
1. 收口 DTO；2. 去掉分散重载；3. 增加 CSV 导出；4. 更新 SQL 视图与核对脚本；5. 编译、测试、实库验证。

### 思路与决策
选择在 service 层新增统一 DTO 和导出能力，避免改 Controller 契约；报表视图补齐 resourceType/resourceId 以支撑统一筛选；CSV 直接导出当前筛选后的报表结果，保持业务流程不变。

### 风险与阻塞
首次将 view 与 verify 并发执行导致 verify 读到旧视图定义并报 Unknown column；已按串行重跑通过。当前未新增 Controller 暴露，导出能力仅在 service 层。

### 下一步
如需整体收尾，可补一个独立审计导出接口或离线任务接入，并完善导出文件名与分页/大结果集策略。
---

## 背景刷新记录 - 2026-03-31 16:34:13 +0800
- 触发原因: 执行背景刷新（收尾导出入口标准化）

### 任务目标
提供统一审计导出入口，收口文件命名与分批导出策略，并保持 ApprovalAuditQuery 为唯一契约。

### 操作日志
核对 ApprovalAuditService 与控制器现状；新增 ApprovalAuditController 导出入口；为 ApprovalAuditQuery 增加分页参数；在 ApprovalAuditService 中增加文件命名、分页查询与分批 CSV 导出；补 controller/service 定向测试；执行 compileJava、定向测试、实库核对脚本。

### 计划
1. 新增独立导出入口；2. 收口命名规则；3. 落分页与分批导出；4. 更新核对脚本；5. 编译、测试、实库验证。

### 思路与决策
优先选择新增 HTTP 导出入口，改动最小且不破坏旧接口；分页统一收口到 ApprovalAuditQuery.pageNo/pageSize；导出采用分批 selectPage + Writer 流式写出，避免一次性加载全部结果。

### 风险与阻塞
导出仍在 service/controller 层内同步执行，超大数据量场景后续可再切离线任务；本轮未改业务流程，仅新增审计导出能力。

### 下一步
发布前建议补接口鉴权、压测大结果集、确认浏览器下载文件名兼容性，并评估是否增加离线任务版导出。
