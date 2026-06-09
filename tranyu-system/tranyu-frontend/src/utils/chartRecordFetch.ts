/**
 * 图表取数：仅调用现有 records/page，前端按条数与 status 过滤。
 */

import { fetchWorkItemRecordPage, type WorkItemRecord } from '@/services/workItem';
import type { BiDataSourceScope } from './chartConfigTypes';
import { CHART_LATEST_N_MAX, CHART_LATEST_N_MIN } from './chartConfigRules';

/**
 * 拉取首页记录（后端按 id 降序，即最近创建）。
 * @param latestN 1～200，对应 pageSize
 * @param status 若指定则在前端过滤记录 status
 */
export async function fetchWorkItemRecords(params: {
  workItemTypeId: number;
  latestN: number;
  status?: 0 | 1;
}): Promise<WorkItemRecord[]> {
  const { workItemTypeId, latestN, status } = params;
  if (!workItemTypeId) return [];

  const pageSize = Math.min(CHART_LATEST_N_MAX, Math.max(CHART_LATEST_N_MIN, latestN));
  const res = await fetchWorkItemRecordPage(workItemTypeId, { current: 1, pageSize });
  if (res.code !== 0) throw new Error(res.message || '加载记录失败');

  let records = res.data?.records ?? [];
  if (status !== undefined) {
    records = records.filter((r) => r.status === status);
  }
  return records;
}

/** 根据 chartConfig.dataSource.scope 解析 latestN / status，再取数 */
export async function fetchWorkItemRecordsForChartScope(
  workItemTypeId: number,
  scope: BiDataSourceScope,
): Promise<WorkItemRecord[]> {
  if (!workItemTypeId) return [];
  if (scope.mode === 'latest_n') {
    return fetchWorkItemRecords({ workItemTypeId, latestN: scope.latestN });
  }
  return fetchWorkItemRecords({
    workItemTypeId,
    latestN: CHART_LATEST_N_MAX,
    status: scope.status,
  });
}
