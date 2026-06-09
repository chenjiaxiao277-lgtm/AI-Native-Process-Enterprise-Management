import { request } from '@/utils/request';

export type SimpleResult<T> = {
  code: number;
  message: string;
  data: T;
};

export type SpaceRelationAuth = {
  id?: number;
  tenantId?: string;
  sourceSpaceId?: string;
  targetSpaceId: string;
  resourceType: 'work_item_type' | 'work_item_record';
  resourceKey?: string;
  status?: number;
  expireTime?: string;
  grantedBy?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export async function fetchSpaceRelationAuths(params?: { resourceType?: string }) {
  return request<SimpleResult<SpaceRelationAuth[]>>('/api/system/space-relations/auths', {
    params,
  });
}

export async function createSpaceRelationAuth(values: SpaceRelationAuth) {
  return request<SimpleResult<number>>('/api/system/space-relations/auths', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export async function updateSpaceRelationAuth(id: number, values: SpaceRelationAuth) {
  return request<SimpleResult<number>>(`/api/system/space-relations/auths/${id}`, {
    method: 'PUT',
    body: JSON.stringify(values),
  });
}

export async function deleteSpaceRelationAuth(id: number) {
  return request<SimpleResult<null>>(`/api/system/space-relations/auths/${id}`, {
    method: 'DELETE',
  });
}
