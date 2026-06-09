import type { Rule } from 'antd/es/form';
import type { WorkItemField } from '@/services/workItem';
import type { FormulaResultType } from '@/utils/workItemFormula';

export type FieldOptionItem = { label: string; value: string };

export type ParsedFieldOptions = {
  options: FieldOptionItem[];
  placeholder?: string;
  maxLength?: number;
  numberMode: 'integer' | 'decimal';
  min?: number;
  max?: number;
  precision?: number;
  readonly: boolean;
  showInDetail: boolean;
  formulaExpression?: string;
  formulaResultType?: FormulaResultType;
  freezeFormulaResult?: boolean;
  // work_item_relation: 关系模型绑定（用于加载可选工作项）
  relationId?: string;
  relationMode?: 'single' | 'multiple';
};

function toFiniteNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** 富文本 → 纯文本（去标签、常见空编辑内容视为无字） */
export function stripHtmlToPlainText(html: string): string {
  let s = String(html ?? '');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/gi, ' ');
  s = s.replace(/&#160;/g, ' ');
  s = s.replace(/&#x0*A0;/gi, ' ');
  s = s.replace(/&[a-z]+;/gi, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * 富文本是否「无有效内容」（含 <p><br></p>、仅空白/HTML 壳等）。
 * 策略：去标签后的纯文本长度为 0 即视为空（与 required 对齐）。
 */
export function isRichTextContentEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const raw = String(value);
  if (raw.trim() === '') return true;
  return stripHtmlToPlainText(raw) === '';
}

/** 将 optionsJson 中的 options 段统一为 { label, value }[] */
export function coerceOptionsList(raw: unknown): FieldOptionItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: FieldOptionItem[] = [];
  for (const x of raw) {
    if (x === null || x === undefined) continue;
    if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') {
      const s = String(x).trim();
      if (s) out.push({ label: s, value: s });
      continue;
    }
    if (typeof x === 'object') {
      const o = x as Record<string, unknown>;
      const value = String(o.value ?? '').trim();
      const label = String(o.label ?? '').trim() || value;
      if (value && label) out.push({ label, value });
      else if (value) out.push({ label: value, value });
      else if (label) out.push({ label, value: label });
    }
  }
  return out;
}

/**
 * 统一解析字段 optionsJson（兼容根为数组或对象）。
 * 用于运行时渲染、详情展示判断、只读等。
 */
export function parseFieldOptions(field: Pick<WorkItemField, 'optionsJson'>): ParsedFieldOptions {
  const text = field.optionsJson || '';
  const emptyBase = (): ParsedFieldOptions => ({
    options: [],
    numberMode: 'decimal',
    readonly: false,
    showInDetail: true,
    relationId: undefined,
    relationMode: undefined,
  });
  if (!text) return emptyBase();
  try {
    const raw = JSON.parse(text);
    if (Array.isArray(raw)) {
      return {
        ...emptyBase(),
        options: coerceOptionsList(raw),
      };
    }
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      const options = coerceOptionsList(o.options);
      const placeholder = typeof o.placeholder === 'string' ? o.placeholder : undefined;
      const mlRaw = toFiniteNumber(o.maxLength);
      const maxLength =
        mlRaw !== undefined && Number.isInteger(mlRaw) && mlRaw >= 1 ? mlRaw : undefined;
      const numberMode: 'integer' | 'decimal' = o.numberMode === 'integer' ? 'integer' : 'decimal';
      const min = toFiniteNumber(o.min);
      const max = toFiniteNumber(o.max);
      const precision = toFiniteNumber(o.precision);
      const readonly = Boolean(o.readonly ?? o.readOnly);
      const showInDetail = o.showInDetail === false ? false : true;
      const formulaExpression =
        typeof o.formulaExpression === 'string' ? o.formulaExpression : undefined;
      const fr = o.formulaResultType;
      const formulaResultType: FormulaResultType | undefined =
        fr === 'number' || fr === 'text' || fr === 'boolean' ? fr : undefined;
      const freezeFormulaResult = Boolean(o.freezeFormulaResult);
      const relationId =
        typeof o.relationId === 'string' || typeof o.relationId === 'number' ? String(o.relationId) : undefined;
      const relationMode =
        o.relationMode === 'single' || o.relationMode === 'multiple' ? (o.relationMode as any) : undefined;
      return {
        options,
        placeholder,
        maxLength,
        numberMode,
        min,
        max,
        precision,
        readonly,
        showInDetail,
        formulaExpression,
        formulaResultType,
        freezeFormulaResult,
        relationId,
        relationMode,
      };
    }
  } catch {
    /* ignore */
  }
  return emptyBase();
}

/**
 * 将当前字段的 optionsJson 规范为可持久化的对象（保留未知扩展键，统一 options 与布尔/数值形态）。
 * 同时收口实体上的必填语义，便于与 optionsJson 对照（不写回接口，仅归一化视图）。
 */
export function normalizeFieldOptions(field: WorkItemField): Record<string, unknown> {
  const p = parseFieldOptions(field);
  let rest: Record<string, unknown> = {};
  try {
    const raw = JSON.parse(field.optionsJson || 'null');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      rest = { ...raw };
    }
  } catch {
    /* ignore */
  }
  delete rest.options;
  const placeholder = typeof rest.placeholder === 'string' ? rest.placeholder : p.placeholder ?? '';
  return {
    ...rest,
    options: p.options,
    placeholder,
    maxLength: p.maxLength,
    numberMode: p.numberMode,
    min: p.min,
    max: p.max,
    precision: p.precision,
    readonly: p.readonly,
    showInDetail: p.showInDetail,
    formulaExpression: p.formulaExpression,
    formulaResultType: p.formulaResultType,
    freezeFormulaResult: p.freezeFormulaResult,
    isRequired: field.isRequired === 1,
  };
}

export function isFieldRequired(field: WorkItemField, layoutRequired?: boolean): boolean {
  if (layoutRequired !== undefined && layoutRequired !== null) return Boolean(layoutRequired);
  return field.isRequired === 1;
}

export function isFieldReadonly(field: WorkItemField): boolean {
  return parseFieldOptions(field).readonly;
}

/** 详情页是否展示该动态字段；未配置时默认展示（兼容历史数据）。 */
export function isFieldShownInDetail(field: WorkItemField): boolean {
  return parseFieldOptions(field).showInDetail !== false;
}

/**
 * 与业务 required 一致的空值判断；注意：0、false 不为空；switch 仅 undefined/null 为空。
 * formula 需传入 optionsJson 解析出的 formulaResultType（缺省按 number）。
 */
export function isFieldValueEmpty(
  fieldType: string,
  value: unknown,
  opts?: { formulaResultType?: FormulaResultType },
): boolean {
  if (value === undefined || value === null) return true;

  switch (fieldType) {
    case 'rich_text':
      return isRichTextContentEmpty(value);
    case 'text':
    case 'textarea':
    case 'url':
    case 'attachment':
    case 'work_item_relation':
      return String(value).trim() === '';
    case 'number':
      if (value === '') return true;
      if (typeof value === 'number') return !Number.isFinite(value);
      return false;
    case 'switch':
      return false;
    case 'single_select':
      return value === '';
    case 'multi_select':
    case 'members':
    case 'multi_attachment':
    case 'work_item_relation_multi':
      return !Array.isArray(value) || value.length === 0;
    case 'member':
      if (Array.isArray(value)) return value.length === 0;
      return String(value).trim() === '';
    case 'date':
    case 'date_time':
      if (value === '') return true;
      if (typeof value === 'object' && value !== null && typeof (value as { isValid?: () => boolean }).isValid === 'function') {
        return !(value as { isValid: () => boolean }).isValid();
      }
      return false;
    case 'date_range':
      if (!Array.isArray(value)) return true;
      // date_range required 语义：必须选择完整范围（start/end 均存在且有效），否则按空处理。
      if (value.length < 2) return true;
      const [start, end] = value;
      const partEmpty = (x: unknown): boolean => {
        if (x === null || x === undefined || x === '') return true;
        if (typeof x === 'object' && typeof (x as { isValid?: () => boolean }).isValid === 'function') {
          return !(x as { isValid: () => boolean }).isValid();
        }
        if (typeof x === 'string') return x.trim() === '';
        return true;
      };
      return partEmpty(start) || partEmpty(end);
    case 'formula': {
      const rt = opts?.formulaResultType ?? 'number';
      if (rt === 'boolean') return value === undefined || value === null;
      if (rt === 'text') return String(value ?? '').trim() === '';
      if (value === undefined || value === null || value === '') return true;
      if (typeof value === 'number') return !Number.isFinite(value);
      const n = Number(value);
      return !Number.isFinite(n);
    }
    default:
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      return false;
  }
}

const TEXT_TYPES = new Set(['text', 'textarea', 'rich_text']);
const SELECT_TYPES = new Set(['single_select', 'multi_select']);
const VOTE_OPTION_TYPES = new Set(['vote_single', 'vote_multi']);
const NUMBER_TYPES = new Set(['number']);

export function buildFieldFormRules(field: WorkItemField, opts?: { required?: boolean; label?: string }): Rule[] {
  const label = opts?.label ?? field.fieldName ?? '该字段';
  const required = isFieldRequired(field, opts?.required);
  const meta = parseFieldOptions(field);
  const rules: Rule[] = [];

  if (required) {
    rules.push({
      validator: async (_rule: unknown, value: unknown) => {
        const empty =
          field.fieldType === 'formula'
            ? isFieldValueEmpty(field.fieldType, value, {
                formulaResultType: meta.formulaResultType || 'number',
              })
            : isFieldValueEmpty(field.fieldType, value);
        if (!empty) return;
        throw new Error(`请完善「${label}」`);
      },
    });
  }

  const ml = meta.maxLength;
  if (TEXT_TYPES.has(field.fieldType) && ml !== undefined && Number.isInteger(ml) && ml >= 1) {
    rules.push({
      validator: async (_rule: unknown, value: unknown) => {
        if (isFieldValueEmpty(field.fieldType, value)) return;
        const len =
          field.fieldType === 'rich_text' ? stripHtmlToPlainText(String(value)).length : String(value).length;
        if (len <= ml) return;
        throw new Error(`「${label}」最多 ${ml} 个字符（${field.fieldType === 'rich_text' ? '按纯文本计' : '按字符计'}）`);
      },
    });
  }

  // number 字段表单校验收口：保证 required/min/max/precision/integer/decimal 在“表单层”一致。
  if (field.fieldType === 'number') {
    rules.push({
      validator: async (_rule: unknown, value: unknown) => {
        if (isFieldValueEmpty(field.fieldType, value)) return;

        const n = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(n)) throw new Error(`「${label}」请输入有效数字`);

        const mode = meta.numberMode || 'decimal';
        if (mode === 'integer') {
          if (!Number.isInteger(n)) throw new Error(`「${label}」必须为整数`);
        } else {
          // decimal 模式：若配置了 precision，则按位数校验；未配置则允许任意小数位。
          const p = meta.precision;
          if (p !== undefined && p !== null && p !== '') {
            const prec = Number(p);
            if (Number.isInteger(prec) && prec >= 0) {
              if (prec === 0) {
                if (!Number.isInteger(n)) throw new Error(`「${label}」最多允许 0 位小数（即整数）`);
              } else {
                const factor = 10 ** prec;
                const rounded = Math.round(n * factor) / factor;
                // 浮点误差容忍：rounded 与 n 应足够接近
                const eps = 1e-10;
                if (!Number.isFinite(rounded) || Math.abs(rounded - n) > eps) {
                  throw new Error(`「${label}」最多允许 ${prec} 位小数`);
                }
              }
            }
          }
        }

        if (meta.min !== undefined && meta.min !== null && Number.isFinite(meta.min) && n < meta.min) {
          throw new Error(`「${label}」不能小于最小值 ${meta.min}`);
        }
        if (meta.max !== undefined && meta.max !== null && Number.isFinite(meta.max) && n > meta.max) {
          throw new Error(`「${label}」不能大于最大值 ${meta.max}`);
        }
      },
    });
  }

  return rules;
}

export type FieldFormValidateSlice = {
  fieldOptions?: string[];
  maxLength?: unknown;
  numberMin?: unknown;
  numberMax?: unknown;
  numberPrecision?: unknown;
  numberMode?: string;
  formulaResultType?: string;
};

/** 配置页保存前校验；通过返回 null，否则返回错误文案。 */
export function validateFieldFormBeforeSave(fieldType: string, v: FieldFormValidateSlice): string | null {
  if (SELECT_TYPES.has(fieldType) || VOTE_OPTION_TYPES.has(fieldType)) {
    const items = (v.fieldOptions || []).map((x) => String(x ?? '').trim()).filter(Boolean);
    if (!items.length) return '单选/多选类字段至少需要一个选项';
    const uniq = new Set(items);
    if (uniq.size !== items.length) return '选项值不能重复';
  }
  if (NUMBER_TYPES.has(fieldType)) {
    const min = v.numberMin;
    const max = v.numberMax;
    if (min !== undefined && min !== null && min !== '' && !Number.isFinite(Number(min))) {
      return '最小值必须为有效数字';
    }
    if (max !== undefined && max !== null && max !== '' && !Number.isFinite(Number(max))) {
      return '最大值必须为有效数字';
    }
    if (min !== undefined && min !== null && min !== '' && max !== undefined && max !== null && max !== '') {
      if (Number(min) > Number(max)) return '数值最小值不能大于最大值';
    }
    if (v.numberMode !== 'integer' && v.numberPrecision !== undefined && v.numberPrecision !== null && v.numberPrecision !== '') {
      const p = Number(v.numberPrecision);
      if (!Number.isFinite(p) || !Number.isInteger(p) || p < 0) return '精度必须为非负整数';
    }
  }
  if (TEXT_TYPES.has(fieldType)) {
    const ml = v.maxLength;
    if (ml !== undefined && ml !== null && ml !== '') {
      const n = Number(ml);
      if (!Number.isInteger(n) || n < 1) return '最大长度须为正整数，不填表示不限制';
    }
  }
  if (fieldType === 'formula') {
    const rt = v.formulaResultType;
    if (rt !== 'number' && rt !== 'text' && rt !== 'boolean') return '请选择公式结果类型';
  }
  return null;
}

/** 对已序列化的 optionsJson 做枚举项校验（label/value 非空、value 唯一）。 */
export function validateOptionPairsInJson(fieldType: string, json: string | undefined): string | null {
  if (!json) return null;
  if (!SELECT_TYPES.has(fieldType) && !VOTE_OPTION_TYPES.has(fieldType)) return null;
  try {
    const obj = JSON.parse(json) as { options?: unknown };
    const pairs = coerceOptionsList(obj?.options);
    if (!pairs.length) return '单选/多选类字段至少需要一个有效选项';
    for (const p of pairs) {
      if (!String(p.label).trim() || !String(p.value).trim()) return '枚举项展示文案与取值均不能为空';
    }
    const seen = new Set<string>();
    for (const p of pairs) {
      if (seen.has(p.value)) return '选项取值（value）必须唯一';
      seen.add(p.value);
    }
  } catch {
    return '选项配置解析失败';
  }
  return null;
}

/**
 * 对 buildFieldOptionsJson 产出的 JSON 字符串做清洗：枚举项统一为 {label,value}、去掉 undefined 键。
 * 业务校验请在 validateFieldFormBeforeSave 中完成。
 */
export function finalizeFieldOptionsJsonString(fieldType: string, json: string | undefined): string | undefined {
  if (!json) return undefined;
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    if (!obj || typeof obj !== 'object') return json;

    // 占位/只读/详情改由页面布局与默认值配置承担，保存时剥离遗留键
    delete obj.placeholder;
    // number / 枚举 / 日期字段需要把 readonly/showInDetail 作为 optionsJson 可配置项持久化（用于 FieldRenderer/详情页展示逻辑）。
    const keepReadonlyAndDetail =
      fieldType === 'number' ||
      fieldType === 'date' ||
      fieldType === 'date_time' ||
      fieldType === 'date_range' ||
      SELECT_TYPES.has(fieldType) ||
      fieldType === 'work_item_relation' ||
      fieldType === 'work_item_relation_multi';
    if (!keepReadonlyAndDetail) {
      delete obj.readonly;
      delete obj.readOnly;
      delete obj.showInDetail;
    }

    const selectLike =
      SELECT_TYPES.has(fieldType) || VOTE_OPTION_TYPES.has(fieldType) || fieldType === 'vote_attitude';

    if (selectLike && Array.isArray(obj.options)) {
      obj.options = coerceOptionsList(obj.options);
    }

    if (TEXT_TYPES.has(fieldType)) {
      obj.options = [];
      const m = obj.maxLength;
      if (m !== undefined && m !== null && m !== '') {
        const n = Number(m);
        if (!Number.isInteger(n) || n < 1) {
          delete obj.maxLength;
        } else {
          obj.maxLength = n;
        }
      } else {
        delete obj.maxLength;
      }
    }

    // work_item_relation：本轮最小闭环 optionsJson 收口为 relationId/relationMode + readonly/showInDetail
    if (fieldType === 'work_item_relation' || fieldType === 'work_item_relation_multi') {
      delete obj.relationKind;
      delete obj.relationVisibleScope;
      delete obj.relationDataRangeCount;
      delete obj.relationExtraDisplayEnabled;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(obj)) {
      if (val === undefined) continue;
      cleaned[k] = val;
    }
    return JSON.stringify(cleaned);
  } catch {
    return json;
  }
}
