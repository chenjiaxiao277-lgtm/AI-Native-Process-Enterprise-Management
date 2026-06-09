# 接口文档（基础版）

## 统一返回

```json
{ "code": 0, "message": "ok", "data": "..." }
```

## 通用 CRUD（除 `/api/sales/projects` 外，其它模块同一套形态）

以 `客户管理` 为例（`/api/sales/customers`）：

- `GET /api/sales/customers/page`
  - **query**: `current`、`pageSize`、`sortField`、`sortOrder` 以及任意筛选字段（例如 `name`）
- `POST /api/sales/customers`
  - **body**: `{ "name": "xxx" }`
- `PUT /api/sales/customers/{id}`
  - **body**: `{ "name": "xxx" }`
- `DELETE /api/sales/customers/{id}`
- `POST /api/sales/customers/import`
  - **multipart**: `file`（CSV，首行表头）
- `GET /api/sales/customers/export`
  - **query**: 同 page，用于导出筛选结果（CSV）

## 销售项目（`/api/sales/projects`）

支持字段（可筛选/排序/导入导出表头可用）：

- `projectCode`
- `projectName`
- `customerName`
- `projectStatus`
- ...（其余在后端 `TableSpecs` 里定义）

## 空间配置 - 工作项管理（`/api/system/work-items`）

- `GET /api/system/work-items/page`
  - **query**: `current`、`pageSize`、`keyword`、`status`、`sourceType`
- `GET /api/system/work-items/all`
- `GET /api/system/work-items/{id}`
- `POST /api/system/work-items`
  - **body**: `typeName`、`typeCode`、`itemCategory`、`sourceType`、`ownerRole`、`workflowName`、`requiredPolicy`、`slaHours`...
- `PUT /api/system/work-items/{id}`
- `POST /api/system/work-items/{id}/status`
  - **body**: `{ "status": 0|1 }`
- `DELETE /api/system/work-items/{id}`
