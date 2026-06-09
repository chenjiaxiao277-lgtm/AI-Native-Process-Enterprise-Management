import { request } from '@/utils/request';

export type SimpleResult<T> = { code: number; message: string; data: T };

export type BizModule = {
  id?: number;
  moduleCode: string;
  moduleName: string;
  category: string;
  tableName: string;
  bindType: 'BIND_EXIST' | 'CREATE_NEW';
  status?: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type BizField = {
  id?: number;
  moduleId?: number;
  fieldCode: string;
  fieldName: string;
  columnName: string;
  columnType: string;
  isPk?: number;
  isRequired?: number;
  showInList?: number;
  showInForm?: number;
  listSort?: number;
  formSort?: number;
  widgetType?: string;
  validateRule?: string;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  optionsJson?: string;
  defaultValue?: string;
};

export type PageResult<T> = {
  code: number;
  message: string;
  data: {
    records: T[];
    total: number;
    size: number;
    current: number;
    pages: number;
  };
};

// 模块分页
export async function fetchBizModulePage(params: {
  current: number;
  pageSize: number;
  keyword?: string;
  status?: number;
}) {
  return request<PageResult<BizModule>>('/api/system/biz-modules/page', { params });
}

// 新建/编辑模块
export async function saveBizModule(values: BizModule) {
  const isEdit = !!values.id;
  const url = isEdit ? `/api/system/biz-modules/${values.id}` : '/api/system/biz-modules';
  const method = isEdit ? 'PUT' : 'POST';
  return request<SimpleResult<null>>(url, {
    method,
    body: JSON.stringify(values),
  });
}

// 启用/禁用
export async function changeBizModuleStatus(id: number, status: number) {
  return request<SimpleResult<null>>(`/api/system/biz-modules/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

// 字段列表
export async function fetchBizFields(moduleId: number) {
  return request<SimpleResult<BizField[]>>(`/api/system/biz-modules/${moduleId}/fields`);
}

// 字段批量保存
export async function saveBizFields(moduleId: number, fields: BizField[]) {
  return request<SimpleResult<null>>(`/api/system/biz-modules/${moduleId}/fields/batch-update`, {
    method: 'POST',
    body: JSON.stringify(fields),
  });
}

// 模块字段配置（用于动态渲染）
export async function fetchBizModuleConfig(moduleCode: string) {
  return request<SimpleResult<{ moduleCode: string; moduleName: string; fields: BizField[] }>>(
    `/api/system/biz-modules/config/${moduleCode}`,
  );
}

