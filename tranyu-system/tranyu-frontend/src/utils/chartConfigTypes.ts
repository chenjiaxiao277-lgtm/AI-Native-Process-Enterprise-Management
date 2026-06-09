/**
 * 轻量 BI（嵌入式分析层）v1 — 配置类型定义。
 * 与 WorkItem 字段系统 fieldType 命名对齐，不引入新字段类型名。
 */

export type ChartWidgetType = 'metric_card' | 'pie' | 'bar' | 'line' | 'area' | 'table';

export type BiDataSourceKind = 'work_item_records';

/** 数据源范围：latest_n 或按记录 status 过滤 */
export type BiDataSourceScope =
  | { mode: 'latest_n'; latestN: number }
  | { mode: 'status'; status?: 0 | 1 };

export type BiDataSource = {
  kind: BiDataSourceKind;
  /** 目标工作项类型 ID；未配置时用 0，校验会报 CHART_WORKITEM_TYPE_REQUIRED */
  workItemTypeId: number;
  scope: BiDataSourceScope;
};

/** 日期类维度仅允许按天分桶（v1） */
export type DimensionDateBucket = 'day';

export type Dimension = {
  fieldKey: string;
  /**
   * 来自字段元数据；系统维度 `status` 使用字面量 `status`。
   * UI 可从 fieldMeta 回填；保存时建议冗余写入便于校验与展示。
   */
  fieldType?: string;
  /** date / date_time 必填且仅允许 day */
  bucket?: DimensionDateBucket;
};

export type MetricAgg = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

export type Metric = {
  agg: MetricAgg;
  /**
   * COUNT：省略或 `*` 表示 COUNT(*)；否则为具体字段 key。
   * SUM/AVG/MIN/MAX：必须为 number 字段的 fieldKey。
   */
  fieldKey?: string;
  label?: string;
};

export const CHART_CONFIG_VERSION = 1 as const;

export type ChartConfigV1 = {
  version: typeof CHART_CONFIG_VERSION;
  type: ChartWidgetType;
  dataSource: BiDataSource;
  /** 0 或 1 个维度；metric_card 必须为无维度（undefined） */
  dimension?: Dimension;
  /** 1～3 个，具体数量依图表类型 */
  metrics: Metric[];
};

/** 布局系统中的图表 widget 载体（与布局 JSON 对齐时可嵌套此结构） */
export type LayoutChartWidget = {
  sourceType: 'chart';
  widgetKey: string;
  config: ChartConfigV1;
};

/**
 * 校验时使用的字段元信息（当前 workItemType 下可选字段）。
 * key 建议为 fieldKey；系统字段 status 可不出现，由规则层特例处理。
 */
export type ChartFieldMetaItem = {
  fieldKey: string;
  fieldType: string;
  fieldName?: string;
};

export type ChartFieldMetaMap = Record<string, ChartFieldMetaItem | undefined>;

/** 规则引擎错误码（与文案表一一对应） */
export type ChartErrorCode =
  | 'CHART_DATASOURCE_REQUIRED'
  | 'CHART_WORKITEM_TYPE_REQUIRED'
  | 'CHART_SCOPE_INVALID'
  | 'CHART_LATESTN_OUT_OF_RANGE'
  | 'CHART_DIMENSION_TOO_MANY'
  | 'CHART_DIMENSION_REQUIRED'
  | 'CHART_DIMENSION_FORBIDDEN'
  | 'CHART_DIMENSION_FIELD_REQUIRED'
  | 'CHART_DIMENSION_FIELD_TYPE_UNSUPPORTED'
  | 'CHART_DIMENSION_BUCKET_UNSUPPORTED'
  | 'CHART_METRIC_REQUIRED'
  | 'CHART_METRIC_TOO_MANY'
  | 'CHART_METRIC_COUNT_INVALID'
  | 'CHART_METRIC_AGG_REQUIRED'
  | 'CHART_METRIC_FIELD_REQUIRED'
  | 'CHART_METRIC_FIELD_TYPE_UNSUPPORTED'
  | 'CHART_TYPE_UNSUPPORTED'
  | 'CHART_CONFIG_VERSION_UNSUPPORTED';

export type ChartConfigError = {
  code: ChartErrorCode;
  message: string;
  /** 便于表单定位，如 dimension、metrics.0.fieldKey */
  path?: string;
};

export type ValidateResult = {
  valid: boolean;
  errors: ChartConfigError[];
};
