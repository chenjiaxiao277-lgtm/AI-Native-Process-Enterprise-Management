import { request } from '@/utils/request';

export type ApiResult<T> = { code: number; message: string; data: T };

export type TenantItem = {
  id?: number;
  tenantId?: string;
  tenantName?: string;
  status?: number;
  remark?: string;
  accountLimit?: number;
  adminExpireAt?: string;
  createTime?: string;
  updateTime?: string;
};

export type TenantCreateRequest = {
  tenantId: string;
  tenantName: string;
  status?: number;
  remark?: string;
  adminUserId?: number;
  adminUsername?: string;
  adminPassword?: string;
  adminRealName?: string;
  accountLimit?: number;
  adminExpireAt?: string;
};

export type TenantUpdateRequest = {
  tenantName?: string;
  status?: number;
  remark?: string;
  accountLimit?: number;
  adminExpireAt?: string;
};

export type TenantAdminResetRequest = {
  adminUsername: string;
  adminPassword: string;
  adminRealName?: string;
  accountLimit?: number;
  adminExpireAt?: string;
};

export type TenantDefaultTemplateResponse = { templateJson?: string };
export type TenantDefaultTemplateRequest = { templateJson?: string };

export type TenantFeatureToggleItem = {
  id?: number;
  featureKey?: string;
  enabled?: number;
  remark?: string;
};

export type TenantFeatureToggleRequest = {
  featureKey?: string;
  enabled?: number;
  remark?: string;
};

export async function listTenants() {
  return request<ApiResult<TenantItem[]>>('/api/tenants', { method: 'GET' });
}

export async function getTenant(id: number) {
  return request<ApiResult<TenantItem>>(`/api/tenants/${id}`, { method: 'GET' });
}

export async function createTenant(payload: TenantCreateRequest) {
  return request<ApiResult<null>>('/api/tenants', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTenant(id: number, payload: TenantUpdateRequest) {
  return request<ApiResult<null>>(`/api/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function resetTenantAdmin(id: number, payload: TenantAdminResetRequest) {
  return request<ApiResult<null>>(`/api/tenants/${id}/admin`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function enableTenant(id: number) {
  return request<ApiResult<null>>(`/api/tenants/${id}/enable`, { method: 'POST' });
}

export async function disableTenant(id: number) {
  return request<ApiResult<null>>(`/api/tenants/${id}/disable`, { method: 'POST' });
}

export async function getDefaultTemplates(tenantId: string) {
  return request<ApiResult<TenantDefaultTemplateResponse>>(`/api/tenants/${tenantId}/default-templates`, {
    method: 'GET',
  });
}

export async function updateDefaultTemplates(tenantId: string, payload: TenantDefaultTemplateRequest) {
  return request<ApiResult<null>>(`/api/tenants/${tenantId}/default-templates`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function listFeatureToggles(tenantId: string) {
  return request<ApiResult<TenantFeatureToggleItem[]>>(`/api/tenants/${tenantId}/feature-toggles`, {
    method: 'GET',
  });
}

export async function updateFeatureToggle(tenantId: string, payload: TenantFeatureToggleRequest) {
  return request<ApiResult<null>>(`/api/tenants/${tenantId}/feature-toggles`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
