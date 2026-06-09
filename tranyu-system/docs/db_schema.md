# 数据库表结构（基础版）

> 说明：下面是“基础表格页 + 通用CRUD/导入导出/筛选排序”所需的最小表结构。  
> `sales/projects` 使用 `ltc_sale_project`；`delivery/projects` 使用 `ltc_delivery_project`（多字段）；其余模块使用统一的 `id + name + create_time + update_time`。
>
> **若已存在旧版 `ltc_delivery_project`（仅 id/name/时间字段）导致插入报错 `Unknown column 'project_name'`**：在项目库中执行  
> `docs/migrations/fix_ltc_delivery_project.sql`（会 DROP 后重建该表，注意备份数据）。

## 1. 通用表（除销售项目外）

```sql
CREATE TABLE IF NOT EXISTS ltc_sales_customer (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_sales_visit (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_sales_lead (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_sales_payment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_sales_project_member (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_sales_reimbursement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_sales_invoice (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 交付项目表（与后端 TableSpecs / 前端模块配置一致）
CREATE TABLE IF NOT EXISTS ltc_delivery_project (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  project_name VARCHAR(255) NOT NULL COMMENT '项目名称',
  biz_department VARCHAR(255) DEFAULT NULL COMMENT '所属事业部',
  start_date DATE DEFAULT NULL COMMENT '项目开始时间',
  contract_id BIGINT DEFAULT NULL COMMENT '关联合同ID',
  project_level VARCHAR(64) DEFAULT NULL COMMENT '项目等级',
  project_category VARCHAR(64) DEFAULT NULL COMMENT '项目类别',
  remark TEXT DEFAULT NULL COMMENT '备注',
  risk_rate DECIMAL(5,2) DEFAULT NULL COMMENT '风险概率(%)',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交付项目表';

CREATE TABLE IF NOT EXISTS ltc_delivery_team (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_delivery_deliverable (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_delivery_purchase_project (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_delivery_purchase_contract (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_delivery_worklog (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_delivery_reimbursement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_common_ops_data (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_common_cockpit (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_common_bonus (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ltc_common_budget (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 2. 销售项目表（示例）

> 你已经有 `SaleProject` 实体映射 `ltc_sale_project`。这里给一个最小可跑通版本（字段可按你 Excel/业务补全）。

```sql
CREATE TABLE IF NOT EXISTS ltc_sale_project (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_code VARCHAR(64),
  project_name VARCHAR(255),
  customer_name VARCHAR(255),
  customer_contact VARCHAR(255),
  customer_phone VARCHAR(64),
  owner_name VARCHAR(255),
  owner_id BIGINT,
  project_status VARCHAR(64),
  contract_amount DECIMAL(18,2),
  sign_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  remark VARCHAR(1024),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 3. 工作流审批模块表

执行脚本：`docs/migrations/workflow_tables.sql`

- **ltc_workflow_config**：工作流模板（关联业务：sales_project / delivery_project），支持启用/禁用
- **ltc_workflow_node**：节点配置（名称、审批人单选/多选、或签/会签、失败处理、自定义表单 schema）
- **ltc_workflow_instance**：流程实例（发起人、业务类型与业务ID、当前节点、状态）
- **ltc_workflow_record**：审批记录（节点、审批人、通过/驳回、意见、时间）

## 4. 系统用户 / 角色 / 部门

执行脚本：`docs/migrations/system_auth_tables.sql`

- **sys_dept**：部门表，支持 parent_id 构成树形结构
- **sys_role**：角色表，role_code 唯一
- **sys_user**：用户表，dept_id 关联部门，username 唯一；含登录信息、逻辑删除字段
- **sys_user_role**：用户-角色多对多关联表，(user_id, role_id) 唯一

## 5. Flowable 7 流程引擎表

Flowable 7.0.1 使用 **与业务同一数据源**（默认库名 `ltc_db`，可在 `.env` 的 `SPRING_DATASOURCE_URL` 中改成其他库），首次启动会根据 `flowable.database-schema-update: true` 自动创建所需表（如 `ACT_*`、`FLW_*` 等）。无需手动执行建表脚本，只需保证数据库用户有建表权限。

**与 sys_user/sys_role 的配合**：在 BPMN 中配置 `candidateUsers`、`candidateGroups` 时使用与 `sys_user.id`、`sys_role.id` 一致的字符串（如 `"1"`、`"2"`）。待办/已办接口通过 JWT 解析当前用户 ID 查询任务；可选在应用启动或用户登录时向 Flowable 同步用户/角色以便设计器或管理界面展示。

## 6. 空间配置 - 工作项管理

执行脚本：`docs/migrations/work_item_management_tables.sql`

- **ltc_work_item_type**：工作项类型配置
  - 支持新建/复用来源（`source_type`）
  - 支持工作项分类（需求/缺陷/任务/自定义）
  - 支持负责人角色、流程模板、必填策略、SLA 小时数
