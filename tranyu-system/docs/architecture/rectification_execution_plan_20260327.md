# LTC 架构整改执行计划（2026-03-27）

> 废弃说明：该文档保留历史执行记录，不再作为当前实现基线。  
> 当前请统一参考：`/Users/jocelyn/Documents/LTCplatform/tranyu-system/docs/architecture/ipd_architecture_baseline_v2.md`

## 1. 背景与目标

本次整改目标是把系统统一到以下架构边界：

- 隔离层级：`tenant > space > 业务数据`
- 工作流执行内核：`Flowable 6.8.1`（不自研引擎）
- 业务层负责租户/空间隔离、权限与审计

## 2. 总体原则（不可破坏）

1. 不修改 Flowable `act_*` 表结构。  
2. 不暴露 Flowable 原生 API/ID 作为业务契约。  
3. 空间级数据必须按 `tenant_id + space_id` 隔离。  
4. 跨空间访问仅允许通过“空间关联授权”白名单。  

## 3. 现状（截至 2026-03-27）

### 3.1 已完成

1. 架构方案补充文档已落地：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/docs/architecture/workflow_multitenant_architecture_v1.md`

2. 全局架构守卫 skill 已创建：  
- `/Users/jocelyn/Documents/LTCplatform/.codex/skills/ltc-workflow-architecture-guard/SKILL.md`

3. 工作项空间隔离迁移脚本已执行：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/docs/migrations/20260327_work_item_space_isolation.sql`

4. 历史数据回填脚本已执行（记录空间与类型空间对齐）：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/docs/migrations/20260327_backfill_record_space_from_type.sql`
- 校验结果：`mismatch_count = 0`

5. 后端写接口已加“强制空间头”约束（禁止默认写入 `space_1`）：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend/src/main/java/com/tranyu/controller/WorkItemTypeController.java`

6. 后端读接口已加“强制空间头”约束（去除读取默认 `space_1`）：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend/src/main/java/com/tranyu/controller/WorkItemTypeController.java`

7. 前端空间初始化兜底已补齐（保证 `currentSpaceId` 持久化且合法）：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-frontend/src/utils/space.ts`

8. 空间关联授权表已创建（跨空间白名单底座）：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/docs/migrations/20260328_space_relation_auth.sql`
- 数据库表：`ltc_space_relation_auth`

9. 空间关联授权后端接口已落地（增删改查）：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend/src/main/java/com/tranyu/controller/SpaceRelationAuthController.java`
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend/src/main/java/com/tranyu/service/SpaceRelationAuthService.java`
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend/src/main/java/com/tranyu/mapper/SpaceRelationAuthMapper.java`

10. 工作项查询鉴权已接入（同空间直读，跨空间需授权，写入仍仅同空间）：  
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend/src/main/java/com/tranyu/service/WorkItemTypeService.java`
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend/src/main/java/com/tranyu/service/WorkItemRecordService.java`
- `/Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend/src/main/java/com/tranyu/controller/WorkItemTypeController.java`

### 3.2 仍需完成

1. 读接口从“兼容默认 `space_1`”升级为“强制 `X-Space-Id`”。  
2. 前端首次进入时强制初始化当前空间，避免空头请求。  
3. 全业务表补齐 `tenant_id`，并对空间级表补齐 `space_id`（目前工作项域已部分完成）。  
4. 空间关联授权表与跨空间访问校验落地（后端已完成，待前端配置页接入）。  
5. Flowable 业务映射表统一带 `tenant_id + space_id`。  

## 4. 分阶段执行计划

## Phase A：隔离地基（P0）

目标：保证任何读写都不会跨空间串数据。

任务：
1. 后端读接口强制 `X-Space-Id`。  
2. 前端所有工作项请求统一携带并校验当前空间。  
3. 增加“空间切换后强制刷新缓存”机制（菜单、列表、详情）。  

验收：
- 切换空间后，列表与详情数据不残留旧空间。  
- 缺失空间头时返回明确业务错误。  

## Phase B：模型补齐（P0/P1）

目标：把“tenant + space”提升到数据库结构约束。

任务：
1. 空间级核心表补齐 `tenant_id + space_id`。  
2. 建立组合索引（如 `tenant_id, space_id, status, update_time`）。  
3. 清理历史空值并加 `NOT NULL`。  

验收：
- 空间级表无空 `space_id`。  
- 核心查询命中组合索引。  

## Phase C：流程引擎边界（P1）

目标：流程执行交给 Flowable，业务层只做编排/权限/隔离。

任务：
1. 自定义节点流 -> BPMN 生成与动态部署链路。  
2. 流程实例/任务业务表与 Flowable ID 建映射。  
3. 审批动作统一走流程服务层（禁止 Controller 直接调用引擎）。  

验收：
- 启动、审批、驳回、待办/已办全链路跑通。  
- 无跨空间流程任务串读。  

## Phase D：治理与门禁（P1/P2）

目标：防止后续迭代破坏架构。

任务：
1. 加入架构 Gate（PR 模板/评审清单）。  
2. 增加越权、跨空间、幂等、补偿的自动化回归。  
3. 关键动作审计与告警埋点齐全。  

验收：
- Gate 全通过才能发布。  
- 审计日志可完整追踪核心流程动作。  

## Phase F：租户扩展性准备（P1，渐进式）

目标：在不拆架构的前提下，提前具备租户容量治理与扩展决策数据。

任务：
1. 新增 `ltc_tenant_config` 表（配额 + 分层 + 分片预留）。  
2. 新增 `TenantConfig` 实体与 `TenantConfigMapper`。  
3. 增加 Controller 全局租户指标切面（`tenant_metrics` 日志）。  
4. 新建性能基线文档并约定周期维护。  

验收：
- 可按租户维度观察请求耗时与空间分布。  
- 达到阈值时可基于文档快速判断扩容路径。  
- 不影响现有业务逻辑和接口返回。  

## 5. 风险与应对（执行版）

1. 风险：同租户跨空间串读  
- 应对：读写都强制 `space_id`，跨空间必须授权表校验。

2. 风险：历史数据空间归属错误  
- 应对：按类型空间回填 + 对账脚本 + 差异复核。

3. 风险：新代码回退到默认 `space_1`  
- 应对：禁用默认空间兜底，缺头即失败。

4. 风险：Flowable 与业务状态不一致  
- 应对：统一事务边界 + 补偿任务 + 失败告警。

## 6. 执行清单（勾选推进）

- [x] 架构补充文档
- [x] 全局架构守卫 skill
- [x] 工作项 `space_id` 结构迁移
- [x] 历史记录空间回填
- [x] 写接口强制空间头
- [x] 读接口强制空间头
- [x] 前端空间初始化兜底修复
- [x] 空间关联授权落地（已完成数据表 + 后端鉴权与接口，待前端配置页接入）
- [ ] Flowable 映射表双隔离改造
- [ ] 自动化回归与发布门禁
- [ ] 租户配置表迁移（`ltc_tenant_config`）
- [ ] 租户配置实体与 Mapper
- [ ] 全局租户指标切面（`tenant_metrics`）
- [ ] 性能基线文档与阈值策略

## 7. 协作约定

后续所有需求实现，默认启用以下 skill 约束：
- `ltc-workflow-architecture-guard`

每个需求交付至少输出四段：
1. Architecture Fit  
2. Risk Checklist  
3. Implementation Plan  
4. Verification  
