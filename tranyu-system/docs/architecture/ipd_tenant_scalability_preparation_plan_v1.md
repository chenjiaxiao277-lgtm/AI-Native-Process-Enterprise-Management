# IPD 租户扩展性准备执行计划（v1）

> 更新日期：2026-03-30  
> 适用范围：`tranyu-system`（IPD 项目）  
> 目标：在不做大规模架构改造的前提下，为多租户规模增长提前铺底。

## 1. 结论与边界

1. 本计划与当前 IPD 架构基线一致，建议执行。  
2. 属于“渐进式改造”，不拆服务、不改 Flowable 引擎职责、不改现有业务路由契约。  
3. 只新增：租户配置模型、可观测性埋点、性能基线文档与扩展触发规则。  

## 2. 任务拆解（对应你的 4 项）

## 2.1 任务 1：租户配置表迁移脚本（P0）

文件：
- `docs/migrations/add_tenant_config_table.sql`

目标：
- 新建 `ltc_tenant_config`，用于租户容量与扩展预留信息管理。

字段（建议）：
- `id` BIGINT PK
- `tenant_id` VARCHAR(64) UNIQUE
- `tenant_name` VARCHAR(128)
- `tier` VARCHAR(16) default `small`（`small/medium/large`）
- `max_users` INT default 100
- `max_spaces` INT default 10
- `max_work_items` BIGINT default 10000
- `db_shard_hint` VARCHAR(64) NULL
- `cache_shard_hint` VARCHAR(64) NULL
- `status` VARCHAR(16) default `active`（`active/inactive`）
- `create_time` DATETIME
- `update_time` DATETIME

索引：
- `uk_tenant_id (tenant_id)`
- `idx_tenant_tier (tier, status)`

风险与约束：
- 不回写现有业务表，不影响现网查询计划。
- 迁移脚本需做 `IF NOT EXISTS` 幂等保护。

## 2.2 任务 2：实体与 Mapper（P0）

文件：
- `tranyu-backend/src/main/java/com/tranyu/entity/TenantConfig.java`
- `tranyu-backend/src/main/java/com/tranyu/mapper/TenantConfigMapper.java`

目标：
- 提供租户配置的最小读写载体，先不接入复杂业务逻辑。

约束：
- 对齐现有实体风格（Lombok + MyBatis-Plus 注解）。
- 仅新增，不修改现有服务调用链。

## 2.3 任务 3：租户监控切面（P0）

文件：
- `tranyu-backend/src/main/java/com/tranyu/config/TenantMetricsAspect.java`

目标：
- 为全部 Controller 请求记录基础租户指标日志：
  - tenant
  - space
  - path
  - duration

日志格式（固定）：
- `tenant_metrics tenant={} space={} path={} duration={}ms`

实现要求：
- `@Aspect + @Component`
- 使用 `@Around` 包裹 Controller 方法
- `finally` 中记录日志，异常不中断请求

风险与约束：
- 不做重 IO 操作，不落库，仅日志输出。
- 严禁吞异常，必须继续抛出原异常给全局异常处理。

## 2.4 任务 4：性能基线文档（P1）

文件：
- `docs/performance_baseline.md`

内容最小模板：
1. 当前状态：
- 租户数量
- 各租户数据量
- 核心接口基线（P50/P95/P99）
- 数据库指标（CPU、慢查询、连接数）

2. 扩展触发条件：
- 租户数 > 50
- 单租户工作项 > 5 万
- 核心接口 P99 > 2 秒
- 数据库 CPU > 70%

3. 扩展方向（概要）：
- 数据库分片（按 tenant/tier 的渐进策略）
- Flowable 多实例（按租户层级或容量分组）

## 3. 与现有架构的关系

1. 不改变“`tenant > space > resource`”隔离模型。  
2. 不改变“Flowable 仅执行内核”的边界。  
3. 不引入新的权限模型，仍走现有 RBAC + ABAC 演进路线。  
4. 作为 Phase F 的观测与容量基础设施，为后续拆分/扩容提供客观依据。  

## 4. 执行顺序（建议）

1. 任务 1（SQL）  
2. 任务 2（Entity/Mapper）  
3. 任务 3（Metrics Aspect）  
4. 任务 4（Baseline 文档）  

说明：
- 先建表再落代码，避免实体与库结构脱节。
- 切面可独立上线，不依赖业务改造。

## 5. 验收清单

- [ ] SQL 脚本执行成功且可重复执行（幂等）。  
- [ ] `TenantConfig` 与 `TenantConfigMapper` 编译通过。  
- [ ] 后端启动后可见 `tenant_metrics ...` 日志。  
- [ ] 文档可用于周度记录并支持触发条件判断。  
- [ ] 未引入已有业务接口行为变化（向后兼容）。  

## 6. 后续扩展预留（不在本次实现）

1. 租户容量告警（阈值触发钉钉/飞书通知）。  
2. 租户配额校验接入创建空间/创建工作项入口。  
3. `tenant_metrics` 接入指标系统（Prometheus/ELK）并形成租户健康看板。  
