import { request } from '@/utils/request';

export type ApiResult<T> = { code: number; message: string; data: T };

export type PermissionSummary = {
  spaceId?: string;
  summary?: string;
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

export async function getTenantDefaultTemplate(tenantId: string) {
  return request<ApiResult<TenantDefaultTemplateResponse>>(`/api/tenants/${tenantId}/default-templates`, {
    method: 'GET',
  });
}

export async function updateTenantDefaultTemplate(tenantId: string, payload: TenantDefaultTemplateRequest) {
  return request<ApiResult<null>>(`/api/tenants/${tenantId}/default-templates`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function listTenantFeatureToggles(tenantId: string) {
  return request<ApiResult<TenantFeatureToggleItem[]>>(`/api/tenants/${tenantId}/feature-toggles`, {
    method: 'GET',
  });
}

export async function updateTenantFeatureToggle(tenantId: string, payload: TenantFeatureToggleRequest) {
  return request<ApiResult<null>>(`/api/tenants/${tenantId}/feature-toggles`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getSpacePermission(spaceId: string, tenantId: string, type: string) {
  return request<ApiResult<PermissionSummary>>(`/api/spaces/${spaceId}/permissions/${type}`, {
    method: 'GET',
    params: { tenantId },
  });
}

export async function updateSpacePermission(
  spaceId: string,
  tenantId: string,
  type: string,
  payload: PermissionSummary,
) {
  return request<ApiResult<null>>(`/api/spaces/${spaceId}/permissions/${type}`, {
    method: 'PUT',
    params: { tenantId },
    body: JSON.stringify(payload),
  });
}
