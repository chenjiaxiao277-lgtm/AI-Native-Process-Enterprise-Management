/**
 * 轻量 BI v1 — 图表配置强约束规则（唯一收口处）。
 * 不依赖 UI；后续右侧面板与保存逻辑仅调用本模块。
 */

import type {
  ChartConfigError,
  ChartConfigV1,
  ChartErrorCode,
  ChartFieldMetaMap,
  ChartWidgetType,
  Dimension,
  Metric,
  ValidateResult,
} from './chartConfigTypes';
import { CHART_CONFIG_VERSION } from './chartConfigTypes';

// ---------------------------------------------------------------------------
// 错误码 → 中文文案（配置面板可直接展示）
// ---------------------------------------------------------------------------

export const CHART_ERROR_MESSAGES: Record<ChartErrorCode, string> = {
  CHART_DATASOURCE_REQUIRED: '请选择数据源',
  CHART_WORKITEM_TYPE_REQUIRED: '请选择工作项类型',
  CHART_SCOPE_INVALID: '数据范围配置无效',
  CHART_LATESTN_OUT_OF_RANGE: '最近条数必须在 1～200 之间',
  CHART_DIMENSION_TOO_MANY: '当前图表不支持多个维度',
  CHART_DIMENSION_REQUIRED: '该图表必须配置 1 个维度',
  CHART_DIMENSION_FORBIDDEN: '该图表不允许配置维度',
  CHART_DIMENSION_FIELD_REQUIRED: '请选择维度字段',
  CHART_DIMENSION_FIELD_TYPE_UNSUPPORTED: '该字段类型不能作为维度',
  CHART_DIMENSION_BUCKET_UNSUPPORTED: '日期维度仅支持按「天」聚合（bucket=day）',
  CHART_METRIC_REQUIRED: '请至少配置 1 个指标',
  CHART_METRIC_TOO_MANY: '最多支持 3 个指标',
  CHART_METRIC_COUNT_INVALID: 'COUNT 指标配置无效（请使用 * 或选择有效字段）',
  CHART_METRIC_AGG_REQUIRED: '请选择指标聚合方式',
  CHART_METRIC_FIELD_REQUIRED: '请为指标选择字段',
  CHART_METRIC_FIELD_TYPE_UNSUPPORTED: '该聚合方式仅支持数值（number）字段',
  CHART_TYPE_UNSUPPORTED: '不支持的图表类型',
  CHART_CONFIG_VERSION_UNSUPPORTED: '不支持的配置版本，请升级客户端',
};

function err(code: ChartErrorCode, path?: string): ChartConfigError {
  return { code, message: CHART_ERROR_MESSAGES[code], path };
}

// ---------------------------------------------------------------------------
// 规则表（代码化，供文档与实现对照）
// ---------------------------------------------------------------------------

export type ChartTypeRuleRow = {
  type: ChartWidgetType;
  dimensionCount: { min: number; max: number };
  metricsCount: { min: number; max: number };
};

/** v1 每种图表类型允许的维度数 / 指标数 */
export const CHART_TYPE_RULES: readonly ChartTypeRuleRow[] = [
  { type: 'metric_card', dimensionCount: { min: 0, max: 0 }, metricsCount: { min: 1, max: 1 } },
  { type: 'pie', dimensionCount: { min: 1, max: 1 }, metricsCount: { min: 1, max: 1 } },
  { type: 'bar', dimensionCount: { min: 1, max: 1 }, metricsCount: { min: 1, max: 3 } },
  { type: 'line', dimensionCount: { min: 1, max: 1 }, metricsCount: { min: 1, max: 3 } },
  { type: 'area', dimensionCount: { min: 1, max: 1 }, metricsCount: { min: 1, max: 3 } },
  { type: 'table', dimensionCount: { min: 0, max: 1 }, metricsCount: { min: 1, max: 3 } },
] as const;

export const CHART_LATEST_N_MIN = 1;
export const CHART_LATEST_N_MAX = 200;
export const CHART_MAX_METRICS = 3;
export const CHART_MAX_DIMENSIONS = 1;

/** 允许作为维度的字段类型（含系统字段 status） */
export const DIMENSION_ALLOWED_FIELD_TYPES = new Set([
  'single_select',
  'switch',
  'date',
  'date_time',
  'status',
]);

/** 明确禁止作为维度的字段类型（v1） */
export const DIMENSION_FORBIDDEN_FIELD_TYPES = new Set([
  'text',
  'textarea',
  'rich_text',
  'multi_select',
  'date_range',
  'formula',
  'work_item_relation',
  'work_item_relation_multi',
  'attachment',
  'member',
  'members',
]);

const SUPPORTED_TYPES = new Set<ChartWidgetType>([
  'metric_card',
  'pie',
  'bar',
  'line',
  'area',
  'table',
]);

function ruleForType(type: ChartWidgetType): ChartTypeRuleRow | undefined {
  return CHART_TYPE_RULES.find((r) => r.type === type);
}

function resolveFieldType(fieldKey: string, dim: Dimension | undefined, meta: ChartFieldMetaMap): string | undefined {
  if (fieldKey === 'status') return 'status';
  const fromMeta = meta[fieldKey]?.fieldType;
  if (fromMeta) return fromMeta;
  return dim?.fieldType;
}

function isCountStar(m: Metric): boolean {
  const k = m.fieldKey;
  return k === undefined || k === null || String(k).trim() === '' || String(k).trim() === '*';
}

function fieldExists(fieldKey: string, meta: ChartFieldMetaMap): boolean {
  if (fieldKey === 'status') return true;
  return !!meta[fieldKey];
}

/**
 * 返回当前配置全部错误（0 条表示合法）。
 */
export function getChartConfigErrors(config: ChartConfigV1, fieldMeta: ChartFieldMetaMap): ChartConfigError[] {
  const errors: ChartConfigError[] = [];

  if (config.version !== CHART_CONFIG_VERSION) {
    errors.push(err('CHART_CONFIG_VERSION_UNSUPPORTED'));
    return errors;
  }

  if (!SUPPORTED_TYPES.has(config.type)) {
    errors.push(err('CHART_TYPE_UNSUPPORTED', 'type'));
    return errors;
  }

  const row = ruleForType(config.type);
  if (!row) {
    errors.push(err('CHART_TYPE_UNSUPPORTED', 'type'));
    return errors;
  }

  // --- 数据源 ---
  if (!config.dataSource) {
    errors.push(err('CHART_DATASOURCE_REQUIRED', 'dataSource'));
    return errors;
  }
  if (config.dataSource.kind !== 'work_item_records') {
    errors.push(err('CHART_DATASOURCE_REQUIRED', 'dataSource.kind'));
    return errors;
  }
  if (!Number.isFinite(config.dataSource.workItemTypeId) || config.dataSource.workItemTypeId <= 0) {
    errors.push(err('CHART_WORKITEM_TYPE_REQUIRED', 'dataSource.workItemTypeId'));
  }

  const scope = config.dataSource.scope;
  if (!scope || typeof scope !== 'object' || !('mode' in scope)) {
    errors.push(err('CHART_SCOPE_INVALID', 'dataSource.scope'));
  } else if (scope.mode === 'latest_n') {
    const n = scope.latestN;
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < CHART_LATEST_N_MIN || n > CHART_LATEST_N_MAX) {
      errors.push(err('CHART_LATESTN_OUT_OF_RANGE', 'dataSource.scope.latestN'));
    }
  } else if (scope.mode === 'status') {
    if (scope.status !== undefined && scope.status !== 0 && scope.status !== 1) {
      errors.push(err('CHART_SCOPE_INVALID', 'dataSource.scope.status'));
    }
  } else {
    errors.push(err('CHART_SCOPE_INVALID', 'dataSource.scope.mode'));
  }

  // --- 维度数量（结构层：最多 1 个） ---
  const dim = config.dimension;
  const hasDimensionSlot = dim !== undefined && dim !== null;
  const dimEffective =
    hasDimensionSlot && String(dim!.fieldKey ?? '').trim() !== '' ? dim! : undefined;

  let dimensionCount = 0;
  if (dimEffective) dimensionCount = 1;

  if (dimensionCount > CHART_MAX_DIMENSIONS) {
    errors.push(err('CHART_DIMENSION_TOO_MANY', 'dimension'));
  }

  if (dimensionCount < row.dimensionCount.min) {
    if (row.dimensionCount.min >= 1 && hasDimensionSlot && dim && String(dim.fieldKey ?? '').trim() === '') {
      errors.push(err('CHART_DIMENSION_FIELD_REQUIRED', 'dimension.fieldKey'));
    } else {
      errors.push(err('CHART_DIMENSION_REQUIRED', 'dimension'));
    }
  }

  if (dimensionCount > row.dimensionCount.max) {
    if (config.type === 'metric_card') {
      errors.push(err('CHART_DIMENSION_FORBIDDEN', 'dimension'));
    } else {
      errors.push(err('CHART_DIMENSION_TOO_MANY', 'dimension'));
    }
  }

  // --- 维度字段类型与 bucket ---
  if (dimEffective) {
    const key = String(dimEffective.fieldKey).trim();
    if (!key) {
      errors.push(err('CHART_DIMENSION_FIELD_REQUIRED', 'dimension.fieldKey'));
    } else {
      const ft = resolveFieldType(key, dimEffective, fieldMeta);
      if (!ft) {
        errors.push(err('CHART_DIMENSION_FIELD_TYPE_UNSUPPORTED', 'dimension.fieldKey'));
      } else if (DIMENSION_FORBIDDEN_FIELD_TYPES.has(ft)) {
        errors.push(err('CHART_DIMENSION_FIELD_TYPE_UNSUPPORTED', 'dimension.fieldType'));
      } else if (!DIMENSION_ALLOWED_FIELD_TYPES.has(ft)) {
        errors.push(err('CHART_DIMENSION_FIELD_TYPE_UNSUPPORTED', 'dimension.fieldType'));
      }

      if (ft === 'date' || ft === 'date_time') {
        if (dimEffective.bucket !== 'day') {
          errors.push(err('CHART_DIMENSION_BUCKET_UNSUPPORTED', 'dimension.bucket'));
        }
      } else if (dimEffective.bucket !== undefined && dimEffective.bucket !== null) {
        errors.push(err('CHART_DIMENSION_BUCKET_UNSUPPORTED', 'dimension.bucket'));
      }
    }
  }

  // --- 指标数量 ---
  const metrics = Array.isArray(config.metrics) ? config.metrics : [];
  if (metrics.length < row.metricsCount.min) {
    errors.push(err('CHART_METRIC_REQUIRED', 'metrics'));
  }
  if (metrics.length > row.metricsCount.max || metrics.length > CHART_MAX_METRICS) {
    errors.push(err('CHART_METRIC_TOO_MANY', 'metrics'));
  }

  // --- 每条指标 ---
  metrics.forEach((m, idx) => {
    const base = `metrics.${idx}`;
    if (!m || typeof m !== 'object') {
      errors.push(err('CHART_METRIC_AGG_REQUIRED', base));
      return;
    }
    if (!m.agg) {
      errors.push(err('CHART_METRIC_AGG_REQUIRED', `${base}.agg`));
      return;
    }

    if (m.agg === 'COUNT') {
      if (isCountStar(m)) return;
      const fk = String(m.fieldKey ?? '').trim();
      if (!fk) {
        errors.push(err('CHART_METRIC_COUNT_INVALID', `${base}.fieldKey`));
        return;
      }
      if (!fieldExists(fk, fieldMeta)) {
        errors.push(err('CHART_METRIC_COUNT_INVALID', `${base}.fieldKey`));
      }
      return;
    }

    const fk = String(m.fieldKey ?? '').trim();
    if (!fk) {
      errors.push(err('CHART_METRIC_FIELD_REQUIRED', `${base}.fieldKey`));
      return;
    }
    if (!fieldExists(fk, fieldMeta)) {
      errors.push(err('CHART_METRIC_FIELD_TYPE_UNSUPPORTED', `${base}.fieldKey`));
      return;
    }
    const ft = fieldMeta[fk]?.fieldType;
    if (ft !== 'number') {
      errors.push(err('CHART_METRIC_FIELD_TYPE_UNSUPPORTED', `${base}.fieldKey`));
    }
  });

  return errors;
}

/**
 * 聚合校验结果；valid === errors.length === 0
 */
export function validateChartConfig(config: ChartConfigV1, fieldMeta: ChartFieldMetaMap): ValidateResult {
  const errors = getChartConfigErrors(config, fieldMeta);
  return { valid: errors.length === 0, errors };
}
