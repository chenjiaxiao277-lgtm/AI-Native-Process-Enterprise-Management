import { request } from '@/utils/request';
import type { LoginUser } from '@/utils/auth';

export type SimpleResult<T> = {
  code: number;
  message: string;
  data: T;
};

export type LoginRequest = {
  username: string;
  password: string;
  rememberMe?: boolean;
};

export type LoginResponseBody = {
  token: string;
  user: LoginUser;
};

export async function login(data: LoginRequest) {
  return request<SimpleResult<LoginResponseBody>>('/api/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCurrentUser() {
  return request<SimpleResult<LoginUser>>('/api/current-user');
}

