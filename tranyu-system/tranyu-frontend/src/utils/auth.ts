const TOKEN_KEY = 'tranyu_token';
const USER_KEY = 'tranyu_user';
const REMEMBER_USERNAME_KEY = 'tranyu_remember_username';
const TENANT_KEY = 'tranyu_tenant_id';
const DEFAULT_TENANT_ID = 'default';

export type LoginUser = {
  id: number;
  username: string;
  realName?: string;
  tenantId?: string;
  deptName?: string;
  roles?: string[];
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function clearUserInfo() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
}

export function clearCurrentTenantId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TENANT_KEY);
}

export function getCurrentTenantId(): string {
  if (typeof window === 'undefined') return DEFAULT_TENANT_ID;
  const tenantId = window.localStorage.getItem(TENANT_KEY);
  if (tenantId && tenantId.trim()) return tenantId.trim();
  window.localStorage.setItem(TENANT_KEY, DEFAULT_TENANT_ID);
  return DEFAULT_TENANT_ID;
}

export function setCurrentTenantId(tenantId?: string) {
  if (typeof window === 'undefined') return;
  const normalized = tenantId && tenantId.trim() ? tenantId.trim() : DEFAULT_TENANT_ID;
  window.localStorage.setItem(TENANT_KEY, normalized);
}

export function setUserInfo(user: LoginUser) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUserInfo(): LoginUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginUser;
  } catch {
    return null;
  }
}

export function setRememberedUsername(username: string | undefined) {
  if (typeof window === 'undefined') return;
  if (username && username.trim()) {
    window.localStorage.setItem(REMEMBER_USERNAME_KEY, username.trim());
  } else {
    window.localStorage.removeItem(REMEMBER_USERNAME_KEY);
  }
}

export function getRememberedUsername(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const v = window.localStorage.getItem(REMEMBER_USERNAME_KEY);
  return v || undefined;
}

export function clearAuthStorage() {
  clearToken();
  clearUserInfo();
  clearCurrentTenantId();
}
