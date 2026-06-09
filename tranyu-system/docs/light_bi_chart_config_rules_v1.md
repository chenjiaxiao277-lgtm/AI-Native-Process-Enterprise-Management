# 轻量 BI 图表配置规则 v1（规则层落地说明）

本文档与代码一致，权威实现见：

- `tranyu-system/tranyu-frontend/src/utils/chartConfigTypes.ts`
- `tranyu-system/tranyu-frontend/src/utils/chartConfigDefaults.ts`
- `tranyu-system/tranyu-frontend/src/utils/chartConfigRules.ts`

---

## 1. 规则表（与 `CHART_TYPE_RULES` 一致）

| type | 维度数量 | 指标数量 |
|------|----------|----------|
| `metric_card` | 0 | 1 |
| `pie` | 1 | 1 |
| `bar` / `line` / `area` | 1 | 1～3 |
| `table` | 0～1 | 1～3 |

全局上限：`dimension ≤ 1`，`metrics ≤ 3`。`latest_n` 范围：`1～200`（`CHART_LATEST_N_MIN` / `CHART_LATEST_N_MAX`）。

---

## 2. 维度字段白名单 / 黑名单

- **允许**：`single_select`、`switch`、`date`、`date_time`、系统字段 **`status`**
- **禁止**：`text`、`textarea`、`rich_text`、`multi_select`、`date_range`、`formula`、`work_item_relation`、`work_item_relation_multi`、`attachment`、`member`、`members` 等（见 `DIMENSION_FORBIDDEN_FIELD_TYPES`）

**日期维度**：`date` / `date_time` 必须 `bucket === 'day'`。

**系统字段 `status`**：`dimension.fieldKey === 'status'` 时视为合法维度类型 `status`，不要求出现在 `fieldMeta` 中；COUNT 等引用 `status` 时同样视为存在字段。

---

## 3. 指标规则

- 允许聚合：`COUNT`、`SUM`、`AVG`、`MIN`、`MAX`
- `COUNT`：无 `fieldKey`、空字符串或 `*` 表示 `COUNT(*)`；否则字段须在 `fieldMeta` 中存在（或 `status`）
- `SUM` / `AVG` / `MIN` / `MAX`：必须指定 `fieldKey`，且元数据类型为 `number`

---

## 4. 错误码与文案

所有错误码与中文文案集中在 `CHART_ERROR_MESSAGES`（`chartConfigRules.ts`），包括：

`CHART_DATASOURCE_REQUIRED`、`CHART_WORKITEM_TYPE_REQUIRED`、`CHART_SCOPE_INVALID`、`CHART_LATESTN_OUT_OF_RANGE`、`CHART_DIMENSION_*`、`CHART_METRIC_*`、`CHART_TYPE_UNSUPPORTED`、`CHART_CONFIG_VERSION_UNSUPPORTED`。

单条错误结构：`{ code, message, path? }`，`path` 供表单定位。

---

## 5. 默认模板（`getDefaultChartConfig`）

- 数据源：`work_item_records`，`latest_n = 100`，`workItemTypeId = 0`（未选类型，校验报错直至用户选择）
- 指标：默认 1 条 `COUNT`（等价 `COUNT(*)`）
- `metric_card`：无维度
- `pie` / `bar` / `line` / `area`：带 `dimension` 占位（`fieldKey: ''`），需用户选择字段
- `table`：无维度占位（可选维度由用户添加）

---

## 6. 对外 API

- `getChartConfigErrors(config, fieldMeta)` → `ChartConfigError[]`
- `validateChartConfig(config, fieldMeta)` → `{ valid, errors }`
- `getDefaultChartConfig(type)` → `ChartConfigV1`（`chartConfigDefaults.ts`）

后续右侧面板：在 `onChange` / `onSave` 调用上述函数即可，无需散落规则。
