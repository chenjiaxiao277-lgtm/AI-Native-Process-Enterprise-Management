## 字段系统统一行为规范（v1）

适用范围：IPD 工作项（WorkItem）动态字段系统（第一阶段/第二阶段最小闭环已完成的字段类型）。

严格边界（本规范不覆盖/不承诺）：
- 不新增字段类型
- 不扩展 `formula` 函数/语法能力
- 不扩展 `work_item_relation` 高级能力（关系图、反向关系、父子引擎、联动等）
- 不改变 WorkItem 主链路 API 形态、不改 Flowable、不改泳道、不改权限系统

---

## 1. 字段类型能力总表（当前实现）

| fieldType | 表单控件 | 数据形态（payload.data） | 支持 required | 支持 readonly | 支持 showInDetail | 备注 |
|---|---|---|---|---|---|---|
| `text` | Input | `string` | ✅ | ❌（不从 optionsJson 持久化） | ❌（不从 optionsJson 持久化） | 支持 `maxLength`（optionsJson） |
| `textarea` | TextArea | `string` | ✅ | ❌ | ❌ | 支持 `maxLength`（optionsJson） |
| `rich_text` | 富文本编辑器 | `string(HTML)` | ✅（按纯文本判空） | ❌ | ❌ | required/长度按“去标签后纯文本”语义 |
| `number` | InputNumber | `number`（兜底可保留非数字字符串，但校验会拦截） | ✅ | ✅ | ✅ | 支持 `numberMode/min/max/precision` |
| `single_select` | Select(单选) | `string` | ✅ | ✅ | ✅ | optionsJson.options 为 `{label,value}[]` |
| `multi_select` | Select(多选) | `string[]`（空值兜底为 `[]`） | ✅ | ✅ | ✅ | 兼容历史逗号字符串回填/提交 |
| `date` | DatePicker | `string(YYYY-MM-DD)` | ✅ | ✅ | ✅ | 提交时将 dayjs/moment 格式化为字符串 |
| `date_time` | DatePicker(showTime) | `string(YYYY-MM-DD HH:mm:ss)` | ✅ | ✅ | ✅ | 同上 |
| `date_range` | RangePicker | `string[2]`（`['YYYY-MM-DD','YYYY-MM-DD']`） | ✅（必须 start+end） | ✅ | ✅ | 不完整范围视为空；提交时会兜底为 `undefined` |
| `formula` | 只读 Input | `number \| string \| boolean` | ✅（按 resultType 判空） | 固定只读 | 通过布局控制 | 前端实时计算、提交入库 |
| `work_item_relation` | Select(单选) | `string(workItemId)` | ✅ | ✅ | ✅ | 候选项由 `relationId` 驱动加载 |
| `work_item_relation_multi` | Select(多选) | `string[] (workItemId[])` | ✅ | ✅ | ✅ | 同上 |

说明：
- `required` 的来源：字段实体 `isRequired===1` 或布局层 required 覆盖（以现有实现为准）。
- `readonly/showInDetail`：只有部分类型会从 optionsJson 持久化并生效（见下文 optionsJson 规则）。

---

## 2. optionsJson 统一规则

### 2.1 通用约定
- **存储形态**：字符串 JSON；可为数组或对象（历史兼容）。
- **解析入口**：`parseFieldOptions(field.optionsJson)`。
- **保存清洗入口**：`finalizeFieldOptionsJsonString(fieldType, jsonString)`。
- **统一删除**：`placeholder` 一律在保存时剥离（不持久化）。
- **未知键处理**：除明确剥离项外，清洗逻辑尽量保留未知扩展键（但关系字段会被额外收口，见 2.3）。

### 2.2 各字段类型允许持久化的关键键（当前实现口径）

| fieldType | 允许持久化的关键键（核心） | 说明 |
|---|---|---|
| `text/textarea/rich_text` | `maxLength` | `options` 会被强制置空数组；`readonly/showInDetail` 不持久化 |
| `number` | `numberMode/min/max/precision/readonly/showInDetail` | `precision`：integer 模式按 0 处理 |
| `single_select/multi_select` | `options/allowUserAddOption/readonly/showInDetail` | `options` 会统一为 `{label,value}[]` |
| `date/date_time/date_range` | `readonly/showInDetail` | 本轮不扩日期高级配置 |
| `formula` | `formulaExpression/formulaResultType/freezeFormulaResult` | 公式字段本身渲染只读；`readonly/showInDetail` 不作为公式 optionsJson 规则的一部分 |
| `work_item_relation/work_item_relation_multi` | `relationId/relationMode/readonly/showInDetail` | **保存时会剥离** `relationKind/relationVisibleScope/relationDataRangeCount/relationExtraDisplayEnabled` 等非最小键 |

### 2.3 work_item_relation optionsJson 最小结构（统一口径）

单选：
```json
{
  "relationId": "xxx",
  "relationMode": "single",
  "readonly": false,
  "showInDetail": true
}
```

多选：
```json
{
  "relationId": "xxx",
  "relationMode": "multiple",
  "readonly": false,
  "showInDetail": true
}
```

---

## 3. 空值定义（isFieldValueEmpty 统一表）

| fieldType | 何时视为空（empty=true） | 关键说明 |
|---|---|---|
| `text/textarea/url/attachment/work_item_relation` | `String(value).trim()===''` | `0` 会变成 `"0"`，不为空 |
| `rich_text` | 去标签后的纯文本为空 | 兼容 `<p><br></p>` 等空壳 |
| `number` | `null/undefined/''` 或 `number` 非有限（NaN/Infinity） | **0 不为空** |
| `single_select` | `value === ''` 或 `null/undefined` |  |
| `multi_select/members/multi_attachment/work_item_relation_multi` | 非数组或数组长度为 0 | 多选空数组视为空 |
| `switch` | 永远不空 | `false` 不是空 |
| `date/date_time` | `''/null/undefined` 或 dayjs/moment isValid=false |  |
| `date_range` | 非数组/长度<2/开始或结束为空或无效 | **必须 start+end 都有效** |
| `formula` | 按 `formulaResultType` 判空：`number` 非有限或空；`text` trim 空；`boolean` 仅 null/undefined 为空 | required 与结果类型强绑定 |

---

## 4. required 行为规则（统一口径）

- **统一入口**：`buildFieldFormRules` 对 required 使用 `isFieldValueEmpty`。
- **核心原则**：
  - required 只关心“空值语义”，不依赖控件类型。
  - `0/false` 必须视为“已填写”（不会被 required 拦截）。
  - `date_range`：不完整范围会被 required 拦截（按空处理）。
  - `formula`：required 按结果类型判空（例如 boolean 的 `false` 不拦截）。

---

## 5. readonly 行为规则（统一口径）

- **来源**：`parseFieldOptions(field).readonly === true`（仅对会持久化 readonly 的类型生效）。
- **表单行为**：
  - 控件层禁用（disabled）。
  - **编辑态提交保护**：只读字段在 edit 模式会用原始 `data[key]` 回填覆盖，避免被表单值污染（number/multi_select/date/date_time/date_range/relation 有额外类型兜底）。

不承诺：
- 字段级权限联动（本轮禁止范围）。

---

## 6. showInDetail 行为规则（统一口径）

- **来源**：`parseFieldOptions(field).showInDetail !== false`（默认展示）。
- **生效点**：详情页渲染时过滤字段。
- **类型支持**：对持久化 showInDetail 的类型（number/select/date/relation）有效。

---

## 7. 提交数据格式规范（payload.data）

| fieldType | 期望提交格式 | 关键兜底 |
|---|---|---|
| `text/textarea/rich_text` | `string` | 原样提交 |
| `number` | `number` | 若输入为字符串，提交前会 `Number(trim)`；空串 -> `undefined` |
| `single_select` | `string` | 若意外为数组，取首项 |
| `multi_select` | `string[]` | `null/undefined` -> `[]`；逗号字符串 -> 拆分数组 |
| `date/date_time` | `string` | dayjs/moment -> format |
| `date_range` | `string[2]` 或 `undefined` | 不完整/非标准形态 -> `undefined` |
| `formula` | `number \| string \| boolean` | **前端计算结果写入 payload.data** |
| `work_item_relation` | `string(workItemId)` 或 `undefined` | 若意外为数组，取首项 |
| `work_item_relation_multi` | `string[]` | `null/undefined` -> `[]`；逗号字符串 -> 拆分 |

---

## 8. formula 特殊说明（第一版闭环口径）

### 8.1 支持能力
- 表达式格式：`SUM({a},{b})` / `IF({flag},"A","B")` / `COUNT(...)` / `CONCAT(...)`
- 引用范围：仅当前 WorkItem 表单内字段
- 允许引用类型：`number/text/textarea/switch/single_select`
- 禁止：引用 `formula`、复杂嵌套函数（参数中不允许再次 call）
- 结果类型：`number/text/boolean`
- 运行时：依赖字段变化后实时计算并回填到表单值；保存时随 payload 提交

### 8.2 COUNT 语义（与判空对齐）
- 不计数：`null/undefined/''/纯空白字符串/NaN/Infinity`
- 计数：`0/false/"0"/非空字符串/有限数字`

### 8.3 freezeFormulaResult 语义（占位实现）
- 仅前端逻辑：edit 模式下若 `freezeFormulaResult=true`，不会覆盖已有值
- 与流程状态无关（不代表“完成后冻结”的真实流程能力）

---

## 9. work_item_relation 特殊说明（最小闭环口径）

### 9.1 关系模型接入
- 字段通过 `optionsJson.relationId` 绑定“关系管理”中的配置项（当前实现以 `SpaceRelationAuth.id` 为 relationId）。

### 9.2 候选工作项加载策略（当前实现）
- 基于 `relationId` 找到对应的 `SpaceRelationAuth`：
  - 若 `resourceType === 'work_item_type'`，使用 `resourceKey` 解析为目标 workItemTypeId，然后请求该类型记录列表作为候选项
  - 否则退化为当前 workItemType 的记录列表

### 9.3 展示策略
- 表单：Select 单选/多选（不支持“裸输入 workItemId”模式）
- 详情：优先用候选项的 `title` 展示；历史值不在候选项中时回退显示 id（保证不崩）

不支持：
- 关系图、反向关系、双向联动、父子引擎、跨流程/跨节点联动、复杂筛选 DSL

---

## 10. 当前已知边界与不支持项（汇总）

- 不支持新增字段类型
- 不支持公式嵌套函数、复杂函数、数组、跨工作项/跨节点计算、后端重算
- 不支持关系字段的高级能力（反向关系/父子联动/关系图/权限联动/复杂筛选）
- 列表页实时计算与关系联动展示不在本规范范围

