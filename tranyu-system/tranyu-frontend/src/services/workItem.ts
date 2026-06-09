import { request } from '@/utils/request';

export type SimpleResult<T> = {
  code: number;
  message: string;
  data: T;
};

export type PageData<T> = {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
};

export type WorkItemType = {
  id?: number;
  typeName: string;
  typeCode: string;
  itemCategory: 'requirement' | 'bug' | 'task' | 'custom';
  sourceType: 'custom' | 'reuse';
  sourceSpace?: string;
  sourceWorkItem?: string;
  reuseSourceId?: number;
  reuseBound?: number;
  flowMode?: 'state' | 'node';
  systemIdentifier?: string;
  iconColor?: string;
  iconKey?: string;
  copyFieldsJson?: string;
  copyRolesJson?: string;
  baselineEnabled?: number;
  navEntryEnabled?: number;
  detailLayoutJson?: string;
  flowRuleJson?: string;
  flowRoleJson?: string;
  viewLayoutJson?: string;
  ownerRole?: string;
  workflowName?: string;
  requiredPolicy?: string;
  slaHours?: number;
  sort?: number;
  status?: number;
  deleted?: number;
  description?: string;
  createTime?: string;
  updateTime?: string;
};

export type WorkItemField = {
  id?: number;
  workItemId?: number;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  authorizedRoles?: string;
  isEnabled?: number;
  isRequired?: number;
  defaultValueMode?: string;
  defaultValue?: string;
  optionsJson?: string;
  helpText?: string;
  sort?: number;
  createTime?: string;
  updateTime?: string;
};

export type WorkItemRecord = {
  id?: number;
  workItemTypeId?: number;
  title?: string;
  status?: number;
  createTime?: string;
  updateTime?: string;
  [key: string]: any;
};

export async function fetchWorkItemPage(params: {
  current: number;
  pageSize: number;
  keyword?: string;
  status?: number;
  sourceType?: string;
}) {
  return request<SimpleResult<PageData<WorkItemType>>>('/api/system/work-items/page', { params });
}

export async function fetchAllWorkItems() {
  return request<SimpleResult<WorkItemType[]>>('/api/system/work-items/all');
}

export async function saveWorkItem(values: WorkItemType) {
  const isEdit = !!values.id;
  const url = isEdit ? `/api/system/work-items/${values.id}` : '/api/system/work-items';
  const method = isEdit ? 'PUT' : 'POST';
  return request<SimpleResult<null>>(url, {
    method,
    body: JSON.stringify(values),
  });
}

export async function changeWorkItemStatus(id: number, status: number) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function deleteWorkItem(id: number) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}`, { method: 'DELETE' });
}

export async function unbindReuseWorkItem(id: number) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}/unbind`, { method: 'POST' });
}

export async function fetchWorkItemSettings(id: number) {
  return request<SimpleResult<WorkItemType>>(`/api/system/work-items/${id}/settings`);
}

export async function saveWorkItemSettings(id: number, values: WorkItemType) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}/settings`, {
    method: 'PUT',
    body: JSON.stringify(values),
  });
}

export async function fetchWorkItemFields(id: number) {
  return request<SimpleResult<WorkItemField[]>>(`/api/system/work-items/${id}/fields`);
}

export async function createWorkItemField(id: number, values: WorkItemField) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}/fields`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export async function updateWorkItemField(id: number, fieldId: number, values: WorkItemField) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}/fields/${fieldId}`, {
    method: 'PUT',
    body: JSON.stringify(values),
  });
}

export async function deleteWorkItemField(id: number, fieldId: number) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}/fields/${fieldId}`, {
    method: 'DELETE',
  });
}

export async function fetchWorkItemRecordPage(
  id: number,
  params: {
    current: number;
    pageSize: number;
    keyword?: string;
  },
) {
  return request<SimpleResult<PageData<WorkItemRecord>>>(`/api/system/work-items/${id}/records/page`, { params });
}

export async function fetchWorkItemRecordDetail(id: number, recordId: number) {
  return request<SimpleResult<WorkItemRecord>>(`/api/system/work-items/${id}/records/${recordId}`);
}

export async function createWorkItemRecord(
  id: number,
  values: {
    title?: string;
    status?: number;
    data: Record<string, any>;
  },
) {
  return request<SimpleResult<number>>(`/api/system/work-items/${id}/records`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export async function updateWorkItemRecord(
  id: number,
  recordId: number,
  values: {
    title?: string;
    status?: number;
    data: Record<string, any>;
  },
) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}/records/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(values),
  });
}

export async function deleteWorkItemRecord(id: number, recordId: number) {
  return request<SimpleResult<null>>(`/api/system/work-items/${id}/records/${recordId}`, {
    method: 'DELETE',
  });
}
