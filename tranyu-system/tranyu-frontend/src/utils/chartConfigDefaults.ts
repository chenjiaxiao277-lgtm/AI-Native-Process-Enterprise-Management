import type { BiDataSource, ChartConfigV1, ChartFieldMetaMap, ChartWidgetType } from './chartConfigTypes';
import { CHART_CONFIG_VERSION } from './chartConfigTypes';

/** 与 WorkItem 字段列表形状兼容，避免 utils 依赖 services */
export type ChartFieldMetaInput = {
  fieldKey: string;
  fieldType: string;
  fieldName?: string;
};

const KNOWN_WIDGET_TYPES: ChartWidgetType[] = ['metric_card', 'pie', 'bar', 'line', 'area', 'table'];

/** 左侧资源 sourceKey（如 chart-bar、历史 chart-burndown）→ 图表类型 */
export function sourceKeyToChartWidgetType(sourceKey: string): ChartWidgetType {
  const k = String(sourceKey || '').replace(/^chart-/, '');
  if (k === 'burndown') return 'line';
  if (k === 'metric') return 'metric_card';
  if (KNOWN_WIDGET_TYPES.includes(k as ChartWidgetType)) return k as ChartWidgetType;
  return 'bar';
}

export function buildChartFieldMetaMap(fields: ChartFieldMetaInput[] | undefined): ChartFieldMetaMap {
  const m: ChartFieldMetaMap = {};
  for (const f of fields || []) {
    if (!f?.fieldKey) continue;
    m[f.fieldKey] = {
      fieldKey: f.fieldKey,
      fieldType: f.fieldType,
      fieldName: f.fieldName,
    };
  }
  return m;
}

const DEFAULT_LATEST_N = 100;

function defaultDataSource(): BiDataSource {
  return {
    kind: 'work_item_records',
    workItemTypeId: 0,
    scope: { mode: 'latest_n', latestN: DEFAULT_LATEST_N },
  };
}

/** 默认单指标：COUNT(*)，无 fieldKey */
function defaultCountStarMetric() {
  return [{ agg: 'COUNT' as const, fieldKey: undefined, label: undefined }];
}

/**
 * 按图表类型返回可初始化的默认配置。
 * workItemTypeId=0、dimension 可缺省：拖入后需用户补全，校验会提示直至合法。
 */
export function getDefaultChartConfig(type: ChartWidgetType): ChartConfigV1 {
  const dataSource = defaultDataSource();
  const metrics = defaultCountStarMetric();

  switch (type) {
    case 'metric_card':
      return {
        version: CHART_CONFIG_VERSION,
        type: 'metric_card',
        dataSource,
        dimension: undefined,
        metrics,
      };
    case 'pie':
      return {
        version: CHART_CONFIG_VERSION,
        type: 'pie',
        dataSource,
        dimension: { fieldKey: '', fieldType: undefined, bucket: undefined },
        metrics,
      };
    case 'bar':
    case 'line':
    case 'area':
      return {
        version: CHART_CONFIG_VERSION,
        type,
        dataSource,
        dimension: { fieldKey: '', fieldType: undefined, bucket: undefined },
        metrics,
      };
    case 'table':
      return {
        version: CHART_CONFIG_VERSION,
        type: 'table',
        dataSource,
        dimension: undefined,
        metrics,
      };
  }
}

export const DEFAULT_LATEST_N_LIMIT = DEFAULT_LATEST_N;
