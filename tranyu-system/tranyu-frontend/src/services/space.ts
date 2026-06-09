import { request } from '@/utils/request';

export type ApiResult<T> = { code: number; message: string; data: T };

export type SpaceItem = {
  id?: number;
  tenantId?: string;
  spaceId?: string;
  spaceName?: string;
  status?: number;
  archived?: number;
  description?: string;
  createTime?: string;
  updateTime?: string;
};

export type SpaceCreateRequest = {
  tenantId?: string;
  spaceId?: string;
  spaceName?: string;
  status?: number;
  description?: string;
  ownerUserId?: number;
};

export type SpaceUpdateRequest = {
  spaceName?: string;
  status?: number;
  archived?: number;
  description?: string;
};

export type SpaceMemberItem = {
  id?: number;
  userId?: number;
  roleId?: number;
  status?: number;
  createTime?: string;
};

export type SpaceMemberCreateRequest = {
  userId?: number;
  roleId?: number;
  status?: number;
};

export type SpaceGroupItem = {
  id?: number;
  groupName?: string;
  groupCode?: string;
  status?: number;
  description?: string;
  createTime?: string;
};

export type SpaceGroupCreateRequest = {
  groupName?: string;
  groupCode?: string;
  status?: number;
  description?: string;
};

export type SpaceRoleItem = {
  id?: number;
  roleName?: string;
  roleCode?: string;
  status?: number;
  description?: string;
  sort?: number;
};

export type SpaceRoleCreateRequest = {
  roleName?: string;
  roleCode?: string;
  status?: number;
  description?: string;
  sort?: number;
};

export type SpaceRelationAuthItem = {
  id?: number;
  targetSpaceId?: string;
  resourceType?: string;
  resourceKey?: string;
  status?: number;
  remark?: string;
  expireTime?: string;
  createTime?: string;
};

export type SpaceRelationAuthCreateRequest = {
  targetSpaceId?: string;
  resourceType?: string;
  resourceKey?: string;
  status?: number;
  remark?: string;
};

export async function listSpaces(tenantId?: string) {
  return request<ApiResult<SpaceItem[]>>('/api/spaces', { method: 'GET', params: { tenantId } });
}

export async function getSpace(spaceId: string, tenantId?: string) {
  return request<ApiResult<SpaceItem>>(`/api/spaces/${spaceId}`, {
    method: 'GET',
    params: { tenantId },
  });
}

export async function createSpace(payload: SpaceCreateRequest) {
  return request<ApiResult<null>>('/api/spaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSpace(spaceId: string, tenantId: string, payload: SpaceUpdateRequest) {
  return request<ApiResult<null>>(`/api/spaces/${spaceId}`, {
    method: 'PUT',
    params: { tenantId },
    body: JSON.stringify(payload),
  });
}

export async function archiveSpace(spaceId: string, tenantId: string) {
  return request<ApiResult<null>>(`/api/spaces/${spaceId}/archive`, {
    method: 'POST',
    params: { tenantId },
  });
}

export async function listMembers(spaceId: string, tenantId: string) {
  return request<ApiResult<SpaceMemberItem[]>>(`/api/spaces/${spaceId}/members`, {
    method: 'GET',
    params: { tenantId },
  });
}

export async function addMember(spaceId: string, tenantId: string, payload: SpaceMemberCreateRequest) {
  return request<ApiResult<null>>(`/api/spaces/${spaceId}/members`, {
    method: 'POST',
    params: { tenantId },
    body: JSON.stringify(payload),
  });
}

export async function removeMember(spaceId: string, memberId: number) {
  return request<ApiResult<null>>(`/api/spaces/${spaceId}/members/${memberId}`, { method: 'DELETE' });
}

export async function listGroups(spaceId: string, tenantId: string) {
  return request<ApiResult<SpaceGroupItem[]>>(`/api/spaces/${spaceId}/groups`, {
    method: 'GET',
    params: { tenantId },
  });
}

export async function createGroup(spaceId: string, tenantId: string, payload: SpaceGroupCreateRequest) {
  return request<ApiResult<null>>(`/api/spaces/${spaceId}/groups`, {
    method: 'POST',
    params: { tenantId },
    body: JSON.stringify(payload),
  });
}

export async function listRoles(spaceId: string, tenantId: string) {
  return request<ApiResult<SpaceRoleItem[]>>(`/api/spaces/${spaceId}/roles`, {
    method: 'GET',
    params: { tenantId },
  });
}

export async function createRole(spaceId: string, tenantId: string, payload: SpaceRoleCreateRequest) {
  return request<ApiResult<null>>(`/api/spaces/${spaceId}/roles`, {
    method: 'POST',
    params: { tenantId },
    body: JSON.stringify(payload),
  });
}

export async function listRelationAuth(spaceId: string, tenantId: string, resourceType?: string) {
  return request<ApiResult<SpaceRelationAuthItem[]>>(`/api/spaces/${spaceId}/relation-auth`, {
    method: 'GET',
    params: { tenantId, resourceType },
  });
}

export async function createRelationAuth(
  spaceId: string,
  tenantId: string,
  payload: SpaceRelationAuthCreateRequest,
) {
  return request<ApiResult<null>>(`/api/spaces/${spaceId}/relation-auth`, {
    method: 'POST',
    params: { tenantId },
    body: JSON.stringify(payload),
  });
}
