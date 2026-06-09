import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Empty, Spin, Statistic, Table } from 'antd';
import * as echarts from 'echarts';
import type { EChartsOption, EChartsType } from 'echarts';

import { fetchWorkItemFields, type WorkItemField } from '@/services/workItem';
import type { ChartConfigV1, ChartFieldMetaMap } from '@/utils/chartConfigTypes';
import { validateChartConfig } from '@/utils/chartConfigRules';
import { aggregateChartData } from '@/utils/chartAggregate';
import { fetchWorkItemRecordsForChartScope } from '@/utils/chartRecordFetch';

const CHART_MIN_HEIGHT = 280;

const ECHARTS_TYPES = new Set<ChartConfigV1['type']>(['pie', 'bar', 'line', 'area']);

function fieldsToMeta(fields: WorkItemField[]): ChartFieldMetaMap {
  const meta: ChartFieldMetaMap = {
    status: { fieldKey: 'status', fieldType: 'status', fieldName: '状态' },
  };
  for (const f of fields) {
    meta[f.fieldKey] = { fieldKey: f.fieldKey, fieldType: f.fieldType, fieldName: f.fieldName };
  }
  return meta;
}

function buildEChartsOption(widgetType: ChartConfigV1['type'], agg: ReturnType<typeof aggregateChartData>): EChartsOption {
  if (widgetType === 'pie') {
    return {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['36%', '64%'],
          data: agg.pieData,
          label: { formatter: '{b}: {c}' },
        },
      ],
    };
  }
  const isLine = widgetType === 'line' || widgetType === 'area';
  return {
    tooltip: { trigger: 'axis' },
    legend: agg.series.length > 1 ? { bottom: 0, type: 'scroll' } : undefined,
    grid: {
      left: 48,
      right: 24,
      top: 24,
      bottom: agg.series.length > 1 ? 40 : 24,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: agg.categories,
      axisLabel: {
        interval: 0,
        rotate: agg.categories.length > 8 ? 30 : 0,
      },
    },
    yAxis: { type: 'value' },
    series: agg.series.map((s) => ({
      name: s.name,
      type: isLine ? 'line' : 'bar',
      data: s.data,
      areaStyle: widgetType === 'area' ? {} : undefined,
      smooth: widgetType === 'line' || widgetType === 'area',
    })),
  };
}

async function fetchRecords(config: ChartConfigV1): Promise<Record<string, any>[]> {
  const typeId = config.dataSource.workItemTypeId;
  if (!typeId) return [];
  return fetchWorkItemRecordsForChartScope(typeId, config.dataSource.scope);
}

export type LayoutChartWidgetViewProps = {
  chartConfig: ChartConfigV1;
  pageWorkItemTypeId: number;
  pageFields: WorkItemField[];
};

const LayoutChartWidgetView: React.FC<LayoutChartWidgetViewProps> = ({
  chartConfig,
  pageWorkItemTypeId,
  pageFields,
}) => {
  const targetTypeId = chartConfig.dataSource.workItemTypeId;
  const [remoteFields, setRemoteFields] = useState<WorkItemField[] | null>(null);
  const [records, setRecords] = useState<Record<string, any>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chartDomRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<EChartsType | null>(null);

  const resolvedFields = useMemo(() => {
    if (targetTypeId === pageWorkItemTypeId) return pageFields;
    return remoteFields ?? [];
  }, [targetTypeId, pageWorkItemTypeId, pageFields, remoteFields]);

  const fieldsReady = targetTypeId === pageWorkItemTypeId || remoteFields !== null;

  const fieldMeta = useMemo(() => fieldsToMeta(resolvedFields), [resolvedFields]);
  const validation = useMemo(() => validateChartConfig(chartConfig, fieldMeta), [chartConfig, fieldMeta]);

  useEffect(() => {
    setRemoteFields(null);
    if (!targetTypeId || targetTypeId === pageWorkItemTypeId) return;
    let cancelled = false;
    fetchWorkItemFields(targetTypeId)
      .then((res) => {
        if (cancelled || res.code !== 0) return;
        setRemoteFields(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setRemoteFields([]);
      });
    return () => {
      cancelled = true;
    };
  }, [targetTypeId, pageWorkItemTypeId]);

  useEffect(() => {
    if (!targetTypeId || !fieldsReady || !validation.valid) return;
    let cancelled = false;
    setRecords(null);
    setError(null);
    fetchRecords(chartConfig)
      .then((rows) => {
        if (cancelled) return;
        setRecords(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || '加载数据失败');
          setRecords([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [targetTypeId, chartConfig.dataSource.scope, fieldsReady, validation.valid]);

  const aggregated = useMemo(() => {
    if (!records || !validation.valid) return null;
    return aggregateChartData(records, chartConfig, resolvedFields);
  }, [records, chartConfig, resolvedFields, validation.valid]);

  const isEChartsWidget = ECHARTS_TYPES.has(chartConfig.type);

  const echartsOption = useMemo((): EChartsOption | null => {
    if (!isEChartsWidget || !aggregated) return null;
    if (
      chartConfig.type !== 'pie' &&
      chartConfig.type !== 'bar' &&
      chartConfig.type !== 'line' &&
      chartConfig.type !== 'area'
    ) {
      return null;
    }
    if (
      (chartConfig.type === 'pie' || chartConfig.type === 'bar' || chartConfig.type === 'line' || chartConfig.type === 'area') &&
      !records?.length
    ) {
      return null;
    }
    return buildEChartsOption(chartConfig.type, aggregated);
  }, [isEChartsWidget, aggregated, chartConfig.type, records?.length]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isEChartsWidget) return;
    chartInstanceRef.current?.dispose();
    chartInstanceRef.current = null;
  }, [isEChartsWidget]);

  useEffect(() => {
    if (!isEChartsWidget) return;
    const el = chartDomRef.current;
    if (!el) return;

    let inst = chartInstanceRef.current;
    if (!inst || inst.isDisposed()) {
      inst = echarts.getInstanceByDom(el) ?? echarts.init(el);
      chartInstanceRef.current = inst;
    }
    if (echartsOption) {
      inst.setOption(echartsOption, true);
    } else {
      inst.clear();
    }

    const onResize = () => {
      const c = chartInstanceRef.current;
      if (c && !c.isDisposed()) c.resize();
    };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [isEChartsWidget, echartsOption]);

  if (!targetTypeId) {
    return <Alert type="warning" message="请在工作项类型中选择数据源" showIcon />;
  }

  if (!fieldsReady) {
    return (
      <div
        style={{
          minHeight: CHART_MIN_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin tip="加载字段…" />
      </div>
    );
  }

  if (!validation.valid) {
    return (
      <Alert type="error" message={validation.errors[0]?.message || '图表配置无效'} showIcon />
    );
  }

  if (error) {
    return <Alert type="error" message={error} showIcon />;
  }

  if (records === null) {
    return (
      <div
        style={{
          minHeight: CHART_MIN_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin tip="加载图表数据…" />
      </div>
    );
  }

  if (!aggregated) return null;

  if (chartConfig.type === 'metric_card') {
    const title = aggregated.series[0]?.name ?? '指标';
    const v = aggregated.scalar ?? 0;
    return <Statistic title={title} value={v} style={{ padding: '8px 0' }} />;
  }

  if (chartConfig.type === 'table') {
    return (
      <Table
        size="small"
        pagination={aggregated.tableRows.length > 12 ? { pageSize: 10 } : false}
        columns={aggregated.tableColumns.map((c) => ({
          title: c.title,
          dataIndex: c.dataIndex,
          key: c.dataIndex,
        }))}
        dataSource={aggregated.tableRows.map((r, i) => ({ ...r, key: i }))}
      />
    );
  }

  return (
    <div>
      {!echartsOption && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记录" />}
      <div ref={chartDomRef} style={{ width: '100%', minHeight: CHART_MIN_HEIGHT }} />
    </div>
  );
};

export default LayoutChartWidgetView;
