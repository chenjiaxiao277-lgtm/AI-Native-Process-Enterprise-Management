---
name: tranyu-platform-architecture
description: >-
  Enforces Tranyu/LTCplatform multi-tenant + multi-space architecture, PermissionEngine,
  Flowable-as-engine-only boundaries, SQL tenant/space invariants, and swimlane semantics
  (nextIds as sole flow truth). Use for any backend/frontend/SQL/Flowable/workflow UI change
  in this repo, or when the user mentions tenant, space, PermissionEngine, isolation, or swimlane.
---

# Tranyu 平台架构约束（Skill）

## 何时使用
- 本仓库内任何涉及租户、空间、权限、流程、Flowable、泳道图、CRUD/SQL 的需求、设计、实现与评审。
- 用户未显式提及时：若改动可能触及数据隔离或流程调用链，仍应先对照本 Skill。

## 1. 租户与空间
1. **多租户（tenant）+ 多空间（space）**：业务语义以租户为第一隔离域，空间为租户内第二隔离域。
2. **业务数据必须带 `tenant_id`**；**空间级资源必须带 `space_id`**（及 `tenant_id`）。
3. **所有查询默认按 `tenant` +（如适用）`space` 过滤**；禁止「跨空间默认可见」的默认行为。
4. **不允许缺失 `tenant_id` / `space_id`（在适用表上）的 SQL**；禁止无租户条件的全表扫业务表。

## 2. Flowable 边界
1. Flowable **仅作流程执行引擎**：不承载权限、不承载租户/空间隔离语义。
2. **任何调用 Flowable 之前**必须先完成业务侧鉴权与租户/空间上下文校验。
3. **`Controller` 不得直接调用 Flowable Service**；须经业务 Service / 适配层，并完成上述校验与映射。
4. 业务实例/任务 ID 与 Flowable 原生 ID 的映射留在业务层，不对外暴露裸引擎契约（与既有 guard 一致）。

## 3. 权限（PermissionEngine）
1. 权限判断必须走 **统一 PermissionEngine**（或项目内与之等价的单一入口）。
2. **deny 优先于 allow**；**未命中策略默认拒绝**。
3. 禁止在 Controller 或 SQL 中「手写绕过」替代引擎判断。

## 4. 泳道图 / 流程建模（前端与配置语义）
1. **`nextIds`（及显式连线）才表示真实流程关系**。
2. **UI 布局（横向 `laneOrder` / 纵向 `laneRow` / autoRow）不代表流程顺序**。
3. **并行节点不自动生成边**；无依赖的子节点之间禁止因布局自动写入 `nextIds`。

## 5. 交付自检（实现前/PR 前）
- [ ] 涉及表：是否含 `tenant_id`；空间域是否含 `space_id`。
- [ ] 查询/更新/删除：WHERE 是否带租户与空间（如适用）。
- [ ] Flowable 调用链：是否仅在业务 Service 内、是否在调用前完成鉴权与上下文。
- [ ] 权限：是否经 PermissionEngine；是否 deny 优先、默认拒绝。
- [ ] 泳道/流程配置：是否仅以 `nextIds` 表达依赖，布局是否未冒充顺序。

## 6. 与 Codex Guard 的关系
- Codex 侧可继续引用：`.codex/skills/ltc-workflow-architecture-guard/SKILL.md`（Flowable 内核与分层）。
- 本 Skill 补足：**PermissionEngine**、**默认拒绝**、**Controller→Flowable 禁止**、**泳道 nextIds 语义** 等细项。

## 7. 输出格式建议（架构敏感任务）
1. **Architecture Fit**：是否符合上述条款；违规项列表。
2. **Risk**：跨租户 / 跨空间 / 权限绕过 / 流程与业务状态不一致。
3. **Plan**：最小合规实现。
4. **Verification**：应执行的检查或测试。
