## 字段系统联调总验收清单（v1）

目标：覆盖已完成最小闭环的字段类型，形成“可执行/可复现/适合手工联调”的验收用例集合。

验收前置：
- 已有至少 1 个空间、至少 1 个 WorkItemType
- 能进入字段配置页（SpaceConfigPage）与工作项表单页（WorkItemRecordFormPage）

---

## A. 通用验收（所有字段类型通用）

- [ ] **创建字段**：新建字段后，能在字段列表看到该字段，且启用状态正确
- [ ] **编辑字段**：编辑字段保存后，`optionsJson` 不包含无关键（按《统一行为规范》口径）
- [ ] **表单渲染**：新建记录页能渲染该字段控件，不报错
- [ ] **必填 required**：必填字段不填/置空时保存被拦截；填入后可保存
- [ ] **只读 readonly**：readonly 字段在编辑态不可修改，且保存不会把值提交为空/脏值（保持原值）
- [ ] **详情展示 showInDetail**：showInDetail=false 时详情页不展示；默认或 true 时展示
- [ ] **历史兼容**：字段值为非标准旧格式时页面不崩溃（允许降级展示）

---

## B. text / textarea / rich_text

### B1. text
- [ ] **输入与提交**：输入普通文本，保存成功，详情页展示一致
- [ ] **required 判空**：输入空格仅空白应视为空，required 拦截
- [ ] **maxLength**：配置 maxLength=5，输入 6 个字符应拦截并提示

### B2. textarea
- [ ] **换行展示**：输入多行文本，详情页按原样展示（保留换行）
- [ ] **maxLength**：同 text

### B3. rich_text
- [ ] **空壳判空**：仅输入空内容（如默认空段落），required 应拦截
- [ ] **非空展示**：输入富文本内容，详情页能正常渲染 HTML

---

## C. number

### C1. integer 模式
- [ ] **整数输入**：输入 `1` 保存成功
- [ ] **拒绝小数**：输入 `1.2` 校验拦截
- [ ] **required**：值为 `0` 时 required 不拦截

### C2. decimal 模式
- [ ] **小数输入**：输入 `1.25` 保存成功
- [ ] **precision**：配置 precision=2，输入 `1.234` 应拦截
- [ ] **precision=0**：行为等同整数（应拦截小数）

### C3. min/max
- [ ] **min 生效**：min=1 输入 0 拦截
- [ ] **max 生效**：max=10 输入 11 拦截
- [ ] **空值不触发 min/max**：未填写时不因 min/max 报错（仅 required 生效）

---

## D. single_select / multi_select

### D1. options 配置
- [ ] **至少 1 项**：空 options 保存应拦截
- [ ] **value 唯一**：重复 value 保存应拦截

### D2. single_select
- [ ] **正常选择**：选择一个 value 保存成功
- [ ] **required**：不选时拦截

### D3. multi_select
- [ ] **多选提交为数组**：选择多项后保存，payload.data 为 `string[]`
- [ ] **required**：空数组视为空并拦截
- [ ] **历史逗号字符串兼容**：将历史值存为 `"a,b"` 时详情页不崩、能展示为两项

---

## E. date / date_time / date_range

### E1. date
- [ ] **提交为字符串**：保存后 payload.data 为 `YYYY-MM-DD` 字符串
- [ ] **required**：未选时拦截

### E2. date_time
- [ ] **提交为字符串**：保存后 payload.data 为 `YYYY-MM-DD HH:mm:ss`
- [ ] **required**：未选时拦截

### E3. date_range
- [ ] **必须完整范围**：只选开始不选结束，required 应拦截
- [ ] **提交为字符串数组**：保存后 payload.data 为 `['YYYY-MM-DD','YYYY-MM-DD']`
- [ ] **异常值兜底**：提交时若为非标准形态应兜底为 undefined（不崩溃）

---

## F. formula

### F1. 基础函数
- [ ] **SUM**：`SUM({a},{b})` 依赖数值变化后实时更新
- [ ] **IF**：`IF({flag},"A","B")`：flag true/false 时结果切换正确
- [ ] **COUNT**：`COUNT({a},{b},{c})`：空白不计数、0/false 计数
- [ ] **CONCAT**：`CONCAT({title},"-",{code})` 拼接稳定

### F2. 配置阶段校验
- [ ] **空表达式**：保存应拦截
- [ ] **未知函数**：保存应拦截
- [ ] **引用不存在字段**：保存应拦截
- [ ] **引用自身**：保存应拦截
- [ ] **引用 formula**：保存应拦截
- [ ] **引用不支持类型**：保存应拦截
- [ ] **未选 resultType**：保存应拦截
- [ ] **嵌套函数**：如 `SUM(SUM({a},{b}),{c})` 保存应拦截

### F3. freezeFormulaResult（占位语义）
- [ ] **edit 模式不覆盖**：freeze=true 且编辑态时，修改依赖字段不覆盖已有结果

---

## G. work_item_relation / work_item_relation_multi

### G1. 关系模型准备
- [ ] 在 SpaceConfigPage “关系管理”里存在 `SpaceRelationAuth`（用于作为 `relationId` 候选）

### G2. 字段配置
- [ ] **可创建**：创建 `work_item_relation` 与 `work_item_relation_multi`
- [ ] **relationId 必选**：不选 relationId 保存应拦截
- [ ] **optionsJson 收口**：保存后 optionsJson 至少包含 `relationId/relationMode/readonly/showInDetail`

### G3. 表单选择与提交
- [ ] **候选项按 relationId 加载**：打开下拉能看到候选工作项
- [ ] **单选提交单个 id**：payload.data 为 `string`
- [ ] **多选提交 id 数组**：payload.data 为 `string[]`

### G4. 详情展示
- [ ] **展示 title 优先**：详情页优先展示候选项 title
- [ ] **历史值兜底**：若值不在候选项里，至少展示 id，不崩溃

---

## H. 禁区自检（必须确认未触碰）

- [ ] 未修改 `swimlane-routing.ts`
- [ ] 未修改 `swimlane-layout.ts`
- [ ] 未修改 Flowable
- [ ] 未修改权限系统（PermissionEngine 等）
- [ ] 未修改 WorkItem 主链路 API 形态

