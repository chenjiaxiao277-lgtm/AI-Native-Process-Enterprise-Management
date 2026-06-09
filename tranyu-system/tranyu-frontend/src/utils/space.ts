export const SPACE_CHANGED_EVENT = 'tranyu-space-changed';

const SPACE_LIST_KEY = 'tranyu_spaces';
const CURRENT_SPACE_ID_KEY = 'tranyu_current_space_id';
const SPACE_SCOPED_CACHE_PREFIXES = ['tranyu_space_', 'tranyu_work_item_'];

export type SpaceInfo = {
  id: string;
  name: string;
  icon?: string;
  admins: string[];
  manageable?: boolean;
  accessible?: boolean;
  workArea?: string;
  domain?: string;
  templateType?: string;
  language?: string;
  sampleViewsEnabled?: boolean;
  sampleWorkItemsEnabled?: boolean;
  dataIsolationEnabled?: boolean;
  authorizedSpaceIds?: string[];
};

export const STANDARD_SPACE_ICONS = [
  '🥮', '🍪', '🥑', '🚄', '📦', '🥝',
  '🛰️', '📊', '🧩', '🛠️', '📁', '📌',
  '📎', '🧠', '🔬', '🧪', '💡', '🧭',
  '🏗️', '🚀', '🎯', '📝', '🗂️', '📚',
  '⚙️', '🔗', '🖥️', '📱', '🎬', '🎨',
];

const DEFAULT_SPACES: SpaceInfo[] = [
  { id: 'space_1', name: '技术开发项目管理', icon: '🥮', admins: ['郭坤军', '刘云云'], manageable: true, accessible: true, workArea: '大厂行业专版', domain: 'tech-space', templateType: '行业专版', language: '简体中文', sampleViewsEnabled: true, sampleWorkItemsEnabled: false, dataIsolationEnabled: true, authorizedSpaceIds: [] },
  { id: 'space_2', name: '海辰测试Demo', icon: '🍪', admins: ['赵丁霖', '刘云云'], manageable: true, accessible: true, workArea: '大厂行业专版', domain: 'haichen-demo', templateType: '空白模板', language: '简体中文', sampleViewsEnabled: true, sampleWorkItemsEnabled: false, dataIsolationEnabled: true, authorizedSpaceIds: [] },
  { id: 'space_3', name: 'IPD产品开发项目管理', icon: '🥑', admins: ['陈姣', '王闯'], manageable: false, accessible: true, workArea: '大厂行业专版', domain: 'ipd-space', templateType: '行业专版', language: '简体中文', sampleViewsEnabled: true, sampleWorkItemsEnabled: false, dataIsolationEnabled: true, authorizedSpaceIds: [] },
  { id: 'space_4', name: '轨道交通行业产品开发', icon: '🚄', admins: ['何炳林', '王闯'], manageable: false, accessible: true, workArea: '大厂行业专版', domain: 'rail-space', templateType: '行业专版', language: '简体中文', sampleViewsEnabled: true, sampleWorkItemsEnabled: false, dataIsolationEnabled: true, authorizedSpaceIds: [] },
  { id: 'space_5', name: '场馆建设类项目管理', icon: '📦', admins: ['陈姣', '陈嘉鸿'], manageable: false, accessible: true, workArea: '大厂行业专版', domain: 'venue-space', templateType: '行业专版', language: '简体中文', sampleViewsEnabled: true, sampleWorkItemsEnabled: false, dataIsolationEnabled: true, authorizedSpaceIds: [] },
  { id: 'space_6', name: '城市更新管理系统', icon: '🥝', admins: ['郭坤军', '李冰'], manageable: false, accessible: false, workArea: '大厂行业专版', domain: 'city-update', templateType: '空白模板', language: '简体中文', sampleViewsEnabled: true, sampleWorkItemsEnabled: false, dataIsolationEnabled: true, authorizedSpaceIds: [] },
];

type SpaceChangedDetail = {
  previousSpaceId: string;
  currentSpaceId: string;
  changedAt: number;
};

function emitSpaceChanged(detail: SpaceChangedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SpaceChangedDetail>(SPACE_CHANGED_EVENT, { detail }));
}

function persistCurrentSpaceIdIfNeeded(spaces: SpaceInfo[]) {
  if (typeof window === 'undefined') return;
  if (!spaces.length) return;
  const stored = window.localStorage.getItem(CURRENT_SPACE_ID_KEY);
  if (stored && spaces.some((space) => space.id === stored)) return;
  window.localStorage.setItem(CURRENT_SPACE_ID_KEY, spaces[0].id);
}

export function getSpaceList(): SpaceInfo[] {
  if (typeof window === 'undefined') return DEFAULT_SPACES;
  const raw = window.localStorage.getItem(SPACE_LIST_KEY);
  if (!raw) return DEFAULT_SPACES;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SPACES;
    return parsed.map((item: any, idx: number) => ({
      id: String(item?.id || `space_${idx + 1}`),
      name: String(item?.name || `空间${idx + 1}`),
      icon: item?.icon ? String(item.icon) : '🥮',
      admins: Array.isArray(item?.admins) ? item.admins.map((x: any) => String(x)) : [],
      manageable: item?.manageable !== false,
      accessible: item?.accessible !== false,
      workArea: String(item?.workArea || '大厂行业专版'),
      domain: String(item?.domain || `space-${idx + 1}`),
      templateType: String(item?.templateType || '空白模板'),
      language: String(item?.language || '简体中文'),
      sampleViewsEnabled: item?.sampleViewsEnabled !== false,
      sampleWorkItemsEnabled: item?.sampleWorkItemsEnabled === true,
      dataIsolationEnabled: item?.dataIsolationEnabled !== false,
      authorizedSpaceIds: Array.isArray(item?.authorizedSpaceIds) ? item.authorizedSpaceIds.map((x: any) => String(x)) : [],
    }));
  } catch {
    return DEFAULT_SPACES;
  }
}

export function saveSpaceList(spaces: SpaceInfo[]) {
  if (typeof window === 'undefined') return;
  const previousSpaceId = getCurrentSpaceId();
  window.localStorage.setItem(SPACE_LIST_KEY, JSON.stringify(spaces));
  persistCurrentSpaceIdIfNeeded(spaces);
  const currentSpaceId = getCurrentSpaceId();
  emitSpaceChanged({ previousSpaceId, currentSpaceId, changedAt: Date.now() });
}

export function getCurrentSpaceId(): string {
  const spaces = getSpaceList();
  if (typeof window === 'undefined') return spaces[0]?.id || 'space_1';
  const id = window.localStorage.getItem(CURRENT_SPACE_ID_KEY);
  if (id && spaces.some((space) => space.id === id)) return id;
  const fallback = spaces[0]?.id || 'space_1';
  window.localStorage.setItem(CURRENT_SPACE_ID_KEY, fallback);
  return fallback;
}

export function setCurrentSpaceId(spaceId: string) {
  if (typeof window === 'undefined') return;
  const previousSpaceId = getCurrentSpaceId();
  window.localStorage.setItem(CURRENT_SPACE_ID_KEY, spaceId);
  emitSpaceChanged({ previousSpaceId, currentSpaceId: spaceId, changedAt: Date.now() });
}

/**
 * 切换空间后，统一清理与空间相关的页面状态缓存。
 * 目前前端主要依赖内存状态 + localStorage 空间标识，
 * 这里预留统一清理入口，避免后续新增缓存后漏清理。
 */
export function clearSpaceScopedRuntimeCache() {
  if (typeof window === 'undefined') return;
  try {
    // 删除 sessionStorage 中空间作用域缓存
    Object.keys(window.sessionStorage).forEach((key) => {
      if (SPACE_SCOPED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        window.sessionStorage.removeItem(key);
      }
    });
    // 删除 localStorage 中空间作用域缓存（不删除当前空间选择与空间列表）
    Object.keys(window.localStorage).forEach((key) => {
      if (key === CURRENT_SPACE_ID_KEY || key === SPACE_LIST_KEY) return;
      if (SPACE_SCOPED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }
}

export function switchSpaceWithRefresh(spaceId: string) {
  if (typeof window === 'undefined') return;
  const previousSpaceId = getCurrentSpaceId();
  if (previousSpaceId === spaceId) return;
  setCurrentSpaceId(spaceId);
  clearSpaceScopedRuntimeCache();
}

export function getSpaceIdFromSearch(search: string): string {
  if (!search) return '';
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  return params.get('spaceId') || '';
}

export function withSpaceId(pathname: string, spaceId = getCurrentSpaceId()): string {
  if (!pathname) return pathname;
  const [path, query = ''] = pathname.split('?');
  const params = new URLSearchParams(query);
  if (spaceId) {
    params.set('spaceId', spaceId);
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function getCurrentSpace(): SpaceInfo {
  const spaces = getSpaceList();
  const id = getCurrentSpaceId();
  return spaces.find((space) => space.id === id) || spaces[0] || DEFAULT_SPACES[0];
}

export function setCurrentSpaceName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const currentId = getCurrentSpaceId();
  const spaces = getSpaceList();
  const next = spaces.map((space) =>
    space.id === currentId ? { ...space, name: trimmed } : space,
  );
  saveSpaceList(next);
}

export function setCurrentSpaceIcon(icon: string) {
  if (!icon) return;
  const currentId = getCurrentSpaceId();
  const spaces = getSpaceList();
  const next = spaces.map((space) =>
    space.id === currentId ? { ...space, icon } : space,
  );
  saveSpaceList(next);
}

export function addSpace(payload: {
  name: string;
  icon?: string;
  workArea?: string;
  domain?: string;
  templateType?: string;
  language?: string;
  sampleViewsEnabled?: boolean;
  sampleWorkItemsEnabled?: boolean;
}) {
  const trimmed = payload.name.trim();
  if (!trimmed) return;
  const spaces = getSpaceList();
  const newSpace: SpaceInfo = {
    id: `space_${Date.now()}`,
    name: trimmed,
    icon: payload.icon || '🛰️',
    admins: ['当前用户'],
    manageable: true,
    accessible: true,
    workArea: payload.workArea || '大厂行业专版',
    domain: payload.domain || `space-${Date.now().toString(36).slice(-6)}`,
    templateType: payload.templateType || '空白模板',
    language: payload.language || '简体中文',
    sampleViewsEnabled: payload.sampleViewsEnabled !== false,
    sampleWorkItemsEnabled: !!payload.sampleWorkItemsEnabled,
    dataIsolationEnabled: true,
    authorizedSpaceIds: [],
  };
  saveSpaceList([newSpace, ...spaces]);
  setCurrentSpaceId(newSpace.id);
}
