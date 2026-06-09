import React, { useMemo } from 'react';
import { Alert, Button, Input, InputNumber, Radio, Select, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type {
  ChartConfigError,
  ChartConfigV1,
  ChartFieldMetaMap,
  ChartWidgetType,
  Metric,
  MetricAgg,
} from '@/utils/chartConfigTypes';
import { getDefaultChartConfig } from '@/utils/chartConfigDefaults';
import {
  CHART_LATEST_N_MAX,
  CHART_LATEST_N_MIN,
  CHART_MAX_METRICS,
  CHART_TYPE_RULES,
  DIMENSION_ALLOWED_FIELD_TYPES,
  getChartConfigErrors,
  type ChartTypeRuleRow,
} from '@/utils/chartConfigRules';

const CHART_TYPE_LABELS: Record<ChartWidgetType, string> = {
  metric_card: '指标卡',
  pie: '饼图',
  bar: '柱状图',
  line: '折线图',
  area: '面积图',
  table: '表格',
};

const METRIC_AGG_OPTIONS: { value: MetricAgg; label: string }[] = [
  { value: 'COUNT', label: 'COUNT' },
  { value: 'SUM', label: 'SUM' },
  { value: 'AVG', label: 'AVG' },
  { value: 'MIN', label: 'MIN' },
  { value: 'MAX', label: 'MAX' },
];

export type ChartLayoutWidgetConfigPanelProps = {
  chartConfig: ChartConfigV1;
  onChange: (next: ChartConfigV1) => void;
  workItemTypeOptions: Array<{ value: number; label: string }>;
  fieldMeta: ChartFieldMetaMap;
  loadingMeta?: boolean;
};

function ruleFor(type: ChartWidgetType): ChartTypeRuleRow | undefined {
  return CHART_TYPE_RULES.find((r: ChartTypeRuleRow) => r.type === type);
}

function dimensionOptions(meta: ChartFieldMetaMap): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [
    { value: 'status', label: '状态（系统）' },
  ];
  const keys = Object.keys(meta).sort();
  for (const key of keys) {
    if (key === 'status') continue;
    const item = meta[key];
    if (!item?.fieldType) continue;
    if (!DIMENSION_ALLOWED_FIELD_TYPES.has(item.fieldType)) continue;
    opts.push({
      value: key,
      label: `${item.fieldName || key}（${item.fieldType}）`,
    });
  }
  return opts;
}

function metricFieldOptions(agg: MetricAgg, meta: ChartFieldMetaMap): { value: string; label: string }[] {
  if (agg === 'COUNT') {
    const opts: { value: string; label: string }[] = [{ value: '', label: 'COUNT(*) 全体' }];
    const keys = Object.keys(meta).sort();
    for (const key of keys) {
      const item = meta[key];
      opts.push({ value: key, label: item?.fieldName || key });
    }
    return opts;
  }
  const opts: { value: string; label: string }[] = [];
  const keys = Object.keys(meta).sort();
  for (const key of keys) {
    const item = meta[key];
    if (item?.fieldType !== 'number') continue;
    opts.push({ value: key, label: item.fieldName || key });
  }
  return opts;
}

export const ChartLayoutWidgetConfigPanel: React.FC<ChartLayoutWidgetConfigPanelProps> = ({
  chartConfig,
  onChange,
  workItemTypeOptions,
  fieldMeta,
  loadingMeta,
}) => {
  const row = ruleFor(chartConfig.type);
  const errors = useMemo(() => getChartConfigErrors(chartConfig, fieldMeta), [chartConfig, fieldMeta]);

  const onTypeChange = (type: ChartWidgetType) => {
    const next = getDefaultChartConfig(type);
    onChange({
      ...next,
      dataSource: { ...chartConfig.dataSource },
    });
  };

  const setDataSourceWorkItemType = (workItemTypeId: number) => {
    onChange({
      ...chartConfig,
      dataSource: {
        ...chartConfig.dataSource,
        workItemTypeId,
      },
    });
  };

  const switchScopeMode = (mode: 'latest_n' | 'status') => {
    if (mode === 'latest_n') {
      onChange({
        ...chartConfig,
        dataSource: {
          ...chartConfig.dataSource,
          scope: { mode: 'latest_n', latestN: 100 },
        },
      });
    } else {
      onChange({
        ...chartConfig,
        dataSource: {
          ...chartConfig.dataSource,
          scope: { mode: 'status', status: 1 },
        },
      });
    }
  };

  const onDimensionFieldChange = (fieldKey: string) => {
    if (!fieldKey) {
      if (row && row.dimensionCount.min >= 1) {
        onChange({
          ...chartConfig,
          dimension: { fieldKey: '', fieldType: undefined, bucket: undefined },
        });
      } else {
        onChange({ ...chartConfig, dimension: undefined });
      }
      return;
    }
    const ft = fieldKey === 'status' ? 'status' : fieldMeta[fieldKey]?.fieldType;
    const bucket = ft === 'date' || ft === 'date_time' ? ('day' as const) : undefined;
    onChange({
      ...chartConfig,
      dimension: { fieldKey, fieldType: ft, bucket },
    });
  };

  const setMetric = (index: number, patch: Partial<Metric>) => {
    const metrics = [...(chartConfig.metrics || [])];
    metrics[index] = { ...metrics[index], ...patch };
    if (patch.agg === 'COUNT') {
      const m = metrics[index];
      if (m.fieldKey === undefined || String(m.fieldKey).trim() === '') {
        metrics[index] = { ...m, fieldKey: undefined };
      }
    }
    onChange({ ...chartConfig, metrics });
  };

  const addMetric = () => {
    const max = row?.metricsCount.max ?? CHART_MAX_METRICS;
    if (chartConfig.metrics.length >= max) return;
    onChange({
      ...chartConfig,
      metrics: [...chartConfig.metrics, { agg: 'COUNT', fieldKey: undefined }],
    });
  };

  const removeMetric = (index: number) => {
    const min = row?.metricsCount.min ?? 1;
    if (chartConfig.metrics.length <= min) return;
    const metrics = chartConfig.metrics.filter((_, i) => i !== index);
    onChange({ ...chartConfig, metrics });
  };

  const dimOpts = dimensionOptions(fieldMeta);
  const showDimension = row && row.dimensionCount.max >= 1;
  const dimensionSelectValue =
    chartConfig.dimension && String(chartConfig.dimension.fieldKey || '').trim() !== ''
      ? chartConfig.dimension.fieldKey
      : undefined;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      {errors.length > 0 && (
        <Alert
          type="error"
          showIcon
          message="配置未通过校验"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((e: ChartConfigError, i: number) => (
                <li key={`${e.code}-${i}`}>{e.message}</li>
              ))}
            </ul>
          }
        />
      )}

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        轻量 BI 图表配置（v1）；保存前须通过校验。
      </Typography.Text>

      <div>
        <Typography.Text type="secondary">图表类型</Typography.Text>
        <Select<ChartWidgetType>
          style={{ width: '100%', marginTop: 4 }}
          value={chartConfig.type}
          onChange={onTypeChange}
          options={CHART_TYPE_RULES.map((r: ChartTypeRuleRow) => ({
            value: r.type,
            label: CHART_TYPE_LABELS[r.type],
          }))}
        />
      </div>

      <div>
        <Typography.Text type="secondary">数据源 · 工作项类型</Typography.Text>
        <Select<number>
          style={{ width: '100%', marginTop: 4 }}
          placeholder="请选择工作项类型"
          loading={loadingMeta}
          value={chartConfig.dataSource.workItemTypeId || undefined}
          onChange={(v) => setDataSourceWorkItemType(v)}
          options={workItemTypeOptions.filter((o) => o.value > 0)}
          allowClear={false}
        />
      </div>

      <div>
        <Typography.Text type="secondary">数据范围</Typography.Text>
        <Radio.Group
          style={{ display: 'block', marginTop: 8 }}
          value={chartConfig.dataSource.scope.mode}
          onChange={(e) => switchScopeMode(e.target.value)}
        >
          <Radio value="latest_n">最近 N 条</Radio>
          <Radio value="status">按记录状态</Radio>
        </Radio.Group>
        {chartConfig.dataSource.scope.mode === 'latest_n' && (
          <InputNumber
            style={{ width: '100%', marginTop: 8 }}
            min={CHART_LATEST_N_MIN}
            max={CHART_LATEST_N_MAX}
            value={chartConfig.dataSource.scope.latestN}
            onChange={(v) =>
              onChange({
                ...chartConfig,
                dataSource: {
                  ...chartConfig.dataSource,
                  scope: { mode: 'latest_n', latestN: v ?? CHART_LATEST_N_MIN },
                },
              })
            }
          />
        )}
        {chartConfig.dataSource.scope.mode === 'status' && (
          <Select
            style={{ width: '100%', marginTop: 8 }}
            value={chartConfig.dataSource.scope.status ?? 1}
            onChange={(v) =>
              onChange({
                ...chartConfig,
                dataSource: {
                  ...chartConfig.dataSource,
                  scope: { mode: 'status', status: v as 0 | 1 },
                },
              })
            }
            options={[
              { value: 1, label: '打开' },
              { value: 0, label: '关闭' },
            ]}
          />
        )}
      </div>

      {showDimension && (
        <div>
          <Typography.Text type="secondary">维度</Typography.Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            placeholder={row.dimensionCount.min >= 1 ? '请选择维度字段' : '可选维度'}
            allowClear={row.dimensionCount.min < 1}
            value={dimensionSelectValue}
            onChange={(v) => onDimensionFieldChange(v ?? '')}
            options={dimOpts}
          />
        </div>
      )}

      <div>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Text type="secondary">指标</Typography.Text>
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            disabled={chartConfig.metrics.length >= (row?.metricsCount.max ?? CHART_MAX_METRICS)}
            onClick={addMetric}
          >
            添加指标
          </Button>
        </Space>
        {chartConfig.metrics.map((m: Metric, idx: number) => (
          <Space key={idx} direction="vertical" style={{ width: '100%', marginTop: 8 }} size={6}>
            <Space wrap style={{ width: '100%' }}>
              <Select<MetricAgg>
                style={{ width: 120 }}
                value={m.agg}
                onChange={(agg) => setMetric(idx, { agg, fieldKey: agg === 'COUNT' ? undefined : m.fieldKey })}
                options={METRIC_AGG_OPTIONS}
              />
              <Select
                style={{ flex: 1, minWidth: 140 }}
                placeholder={m.agg === 'COUNT' ? 'COUNT 字段（可选）' : '数值字段'}
                value={
                  m.agg === 'COUNT' && (m.fieldKey === undefined || String(m.fieldKey).trim() === '')
                    ? ''
                    : m.fieldKey
                }
                onChange={(v) =>
                  setMetric(idx, {
                    fieldKey: v === '' || v === undefined ? undefined : v,
                  })
                }
                options={metricFieldOptions(m.agg, fieldMeta)}
                allowClear={m.agg === 'COUNT'}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={chartConfig.metrics.length <= (row?.metricsCount.min ?? 1)}
                onClick={() => removeMetric(idx)}
              />
            </Space>
            <Input
              size="small"
              placeholder="指标显示名（可选）"
              value={m.label || ''}
              onChange={(e) => setMetric(idx, { label: e.target.value || undefined })}
            />
          </Space>
        ))}
      </div>
    </Space>
  );
};
