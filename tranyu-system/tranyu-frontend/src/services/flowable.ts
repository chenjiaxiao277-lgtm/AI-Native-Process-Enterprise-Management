/**
 * Flowable 流程/任务/实例 API 封装
 */
import { request } from '@/utils/request';

export type FlowableResult<T> = { code: number; message: string; data: T };

export type ProcessDefinitionItem = {
  id: string;
  name: string;
  key: string;
  version: number;
  deploymentId: string;
  suspended: boolean;
};

export type TaskItem = {
  id: string;
  name: string;
  processInstanceId: string;
  processDefinitionId: string;
  assignee?: string;
  createTime?: string;
  taskDefinitionKey?: string;
};

export type InstanceItem = {
  id: string;
  processInstanceId: string;
  processDefinitionId: string;
  activityId?: string;
  businessKey?: string;
  suspended?: boolean;
  startTime?: string;
  endTime?: string;
  deleteReason?: string;
};

// ---------- 流程管理 ----------
export async function deployProcess(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('tranyu_token') : '';
  const resp = await fetch('/api/flowable/deploy', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!resp.ok) throw new Error(resp.statusText);
  return (await resp.json()) as FlowableResult<{ id: string; name: string; deploymentTime?: string }>;
}

export async function getProcessList() {
  return request<FlowableResult<ProcessDefinitionItem[]>>('/api/flowable/process/list');
}

export async function deleteProcess(deploymentId: string) {
  return request<FlowableResult<null>>(`/api/flowable/process/${deploymentId}`, { method: 'DELETE' });
}

export async function setProcessSuspended(processDefinitionId: string, suspended: boolean) {
  return request<FlowableResult<null>>(`/api/flowable/process/${processDefinitionId}/suspended`, {
    method: 'POST',
    body: JSON.stringify({ suspended }),
  });
}

// ---------- 任务 ----------
export async function getTodoTasks() {
  return request<FlowableResult<TaskItem[]>>('/api/flowable/task/todo');
}

export async function getDoneTasks() {
  return request<FlowableResult<TaskItem[]>>('/api/flowable/task/done');
}

export async function approveTask(params: {
  taskId: string;
  userId?: string;
  comment?: string;
  variables?: Record<string, unknown>;
}) {
  return request<FlowableResult<null>>('/api/flowable/task/approve', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function rejectTask(params: { taskId: string; userId?: string; comment?: string }) {
  return request<FlowableResult<null>>('/api/flowable/task/reject', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function addSign(taskId: string, addUserId: string) {
  return request<FlowableResult<null>>('/api/flowable/task/addSign', {
    method: 'POST',
    body: JSON.stringify({ taskId, addUserId }),
  });
}

export async function removeSign(taskId: string, removeUserId: string) {
  return request<FlowableResult<null>>('/api/flowable/task/removeSign', {
    method: 'POST',
    body: JSON.stringify({ taskId, removeUserId }),
  });
}

// ---------- 流程实例 ----------
export async function startInstance(params: {
  processDefinitionKey: string;
  initiatorUserId?: string;
  variables?: Record<string, unknown>;
}) {
  return request<FlowableResult<InstanceItem>>('/api/flowable/instance/start', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getInstanceList() {
  return request<FlowableResult<{ running: InstanceItem[]; historic: InstanceItem[] }>>(
    '/api/flowable/instance/list',
  );
}

export async function terminateInstance(processInstanceId: string, reason?: string) {
  return request<FlowableResult<null>>(
    `/api/flowable/instance/terminate/${processInstanceId}`,
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason || '用户终止' }),
    },
  );
}
