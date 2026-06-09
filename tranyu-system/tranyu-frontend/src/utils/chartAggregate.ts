/**
 * 图表聚合：按 dimension 分组，对 metrics 做 COUNT/SUM/AVG/MIN/MAX。
 */

import type { ChartConfigV1, Dimension, Metric } from './chartConfigTypes';
import type { WorkItemField } from '@/services/workItem';
import { parseFieldOptions } from './workItemFieldMeta';

export type ChartDataRow = Record<string, any>;

function optionLabelMap(field: WorkItemField | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (!field) return m;
  const po = parseFieldOptions(field);
  for (const o of po.options) m.set(o.value, o.label);
  return m;
}

function dayKey(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const d = new Date(String(raw).trim());
  if (!Number.isFinite(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function bucketLabel(
  row: ChartDataRow,
  dim: Dimension,
  fieldByKey: Map<string, WorkItemField>,
): string {
  const fk = dim.fieldKey;
  if (fk === 'status') {
    const s = row.status;
    if (s === 1) return '打开';
    if (s === 0) return '关闭';
    if (s == null || s === undefined) return '(空)';
    return String(s);
  }
  const ft = dim.fieldType || fieldByKey.get(fk)?.fieldType || '';
  const raw = row[fk];
  if (ft === 'date' || ft === 'date_time') {
    const k = dayKey(raw);
    return k || '(空)';
  }
  if (raw == null || raw === '') return '(空)';
  const field = fieldByKey.get(fk);
  if (ft === 'single_select' || ft === 'switch') {
    const labels = optionLabelMap(field);
    const sv = String(raw);
    return labels.get(sv) ?? sv;
  }
  return String(raw);
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function metricDisplayName(m: Metric, index: number): string {
  if (m.label?.trim()) return m.label.trim();
  if (m.agg === 'COUNT' && (!m.fieldKey || m.fieldKey === '*')) return '计数';
  return `${m.agg}${m.fieldKey ? `(${m.fieldKey})` : ''}` || `指标${index + 1}`;
}

function computeMetric(rows: ChartDataRow[], m: Metric): number {
  if (m.agg === 'COUNT') {
    const fk = m.fieldKey;
    if (!fk || fk === '*') return rows.length;
    let c = 0;
    for (const r of rows) {
      const v = r[fk];
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      c++;
    }
    return c;
  }
  const fk = m.fieldKey;
  if (!fk) return 0;
  const nums = rows.map((r) => toNumber(r[fk])).filter((n): n is number => n !== null);
  if (!nums.length) return 0;
  switch (m.agg) {
    case 'SUM':
      return nums.reduce((a, b) => a + b, 0);
    case 'AVG':
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'MIN':
      return Math.min(...nums);
    case 'MAX':
      return Math.max(...nums);
    default:
      return 0;
  }
}

export type AggregatedSeries = { name: string; data: number[] };

export type AggregateChartResult = {
  categories: string[];
  series: AggregatedSeries[];
  pieData: { name: string; value: number }[];
  scalar: number | null;
  tableRows: Record<string, string | number>[];
  tableColumns: { title: string; dataIndex: string }[];
};

const EMPTY_SCALAR = null;

export function aggregateChartData(
  rows: ChartDataRow[],
  config: ChartConfigV1,
  fields: WorkItemField[],
): AggregateChartResult {
  const fieldByKey = new Map<string, WorkItemField>();
  for (const f of fields) fieldByKey.set(f.fieldKey, f);

  const dim = config.dimension;
  const groups = new Map<string, ChartDataRow[]>();

  if (!dim) {
    groups.set('__whole__', [...rows]);
  } else {
    for (const row of rows) {
      const key = bucketLabel(row, dim, fieldByKey);
      const g = groups.get(key);
      if (g) g.push(row);
      else groups.set(key, [row]);
    }
  }

  const categories = dim
    ? Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'zh-CN'))
    : ['__whole__'];

  const metricNames = config.metrics.map((m, i) => metricDisplayName(m, i));
  const series: AggregatedSeries[] = config.metrics.map((m, mi) => ({
    name: metricNames[mi],
    data: categories.map((cat) => computeMetric(groups.get(cat) || [], m)),
  }));

  const pieData = categories.map((cat, i) => ({
    name: cat,
    value: series[0]?.data[i] ?? 0,
  }));

  const scalar =
    config.type === 'metric_card' && series[0] ? (series[0].data[0] ?? 0) : EMPTY_SCALAR;

  let dimColKey = '';
  let dimTitle = '';
  if (dim) {
    dimColKey = `__dim_${dim.fieldKey}`;
    dimTitle =
      dim.fieldKey === 'status' ? '状态' : fieldByKey.get(dim.fieldKey)?.fieldName || dim.fieldKey;
  }

  const tableColumns: { title: string; dataIndex: string }[] = [];
  if (dim) tableColumns.push({ title: dimTitle, dataIndex: dimColKey });
  metricNames.forEach((name, i) => {
    tableColumns.push({ title: name, dataIndex: `__m_${i}` });
  });

  const tableRows: Record<string, string | number>[] = categories.map((cat) => {
    const gRows = groups.get(cat) || [];
    const row: Record<string, string | number> = {};
    if (dim) {
      row[dimColKey] = cat === '(空)' ? '—' : cat;
    }
    config.metrics.forEach((m, mi) => {
      row[`__m_${mi}`] = computeMetric(gRows, m);
    });
    return row;
  });

  return {
    categories: dim ? categories : ['合计'],
    series,
    pieData,
    scalar,
    tableRows,
    tableColumns,
  };
}
