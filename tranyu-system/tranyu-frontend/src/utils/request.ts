export type PageResponse<T> = {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
};

import { getCurrentTenantId, getToken, clearToken, getUserInfo } from './auth';
import { getCurrentSpaceId, getSpaceIdFromSearch } from './space';
import { history } from 'umi';

export async function request<T>(
  url: string,
  options: RequestInit & { params?: Record<string, any> } = {},
): Promise<T> {
  const { params, headers, ...rest } = options;
  const qs = params
    ? `?${new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()}`
    : '';

  const token = getToken();
  const userInfo = getUserInfo();
  const roles = userInfo?.roles || [];
  const isPlatformAdmin = roles.includes('平台管理员') || roles.includes('PLATFORM_ADMIN');
  const tenantId = userInfo?.tenantId && !isPlatformAdmin ? userInfo.tenantId : getCurrentTenantId();
  const spaceIdFromUrl =
    typeof window !== 'undefined' ? getSpaceIdFromSearch(window.location.search || '') : '';
  const currentSpaceId = spaceIdFromUrl || getCurrentSpaceId();

  const resp = await fetch(`${url}${qs}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
      ...(currentSpaceId ? { 'X-Space-Id': currentSpaceId } : {}),
      ...(headers || {}),
    },
  });

  if (!resp.ok) {
    if (resp.status === 401) {
      // 登录失效，清理本地状态并跳转登录页
      clearToken();
      try {
        history.push('/login');
      } catch {
        // ignore
      }
    }
    const text = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status} ${resp.statusText} ${text}`);
  }

  return (await resp.json()) as T;
}
