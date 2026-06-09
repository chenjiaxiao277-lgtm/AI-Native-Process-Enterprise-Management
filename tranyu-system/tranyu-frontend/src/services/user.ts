import { request } from '@/utils/request';

export type ApiResult<T> = { code: number; message: string; data: T };

export type UserItem = {
  id?: number;
  tenantId?: string;
  username?: string;
  realName?: string;
  status?: number;
  phone?: string;
  email?: string;
  createTime?: string;
  updateTime?: string;
};

export type UserCreateRequest = {
  tenantId?: string;
  username: string;
  realName?: string;
  deptId?: number;
  status?: number;
  phone?: string;
  email?: string;
  gender?: number;
  roleIds?: number[];
  roleCode?: string;
};

export type UserUpdateRequest = {
  realName?: string;
  deptId?: number;
  status?: number;
  phone?: string;
  email?: string;
  gender?: number;
  roleIds?: number[];
};

export type ChangePasswordRequest = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export async function listUsers(params?: {
  tenantId?: string;
  username?: string;
  realName?: string;
  status?: number;
}) {
  return request<ApiResult<UserItem[]>>('/api/users', { method: 'GET', params });
}

export async function getUser(id: number) {
  return request<ApiResult<UserItem>>(`/api/users/${id}`, { method: 'GET' });
}

export async function createUser(payload: UserCreateRequest) {
  return request<ApiResult<null>>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: number, payload: UserUpdateRequest) {
  return request<ApiResult<null>>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function enableUser(id: number) {
  return request<ApiResult<null>>(`/api/users/${id}/enable`, { method: 'POST' });
}

export async function disableUser(id: number) {
  return request<ApiResult<null>>(`/api/users/${id}/disable`, { method: 'POST' });
}

export async function changeMyPassword(payload: ChangePasswordRequest) {
  return request<ApiResult<null>>('/api/users/me/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
