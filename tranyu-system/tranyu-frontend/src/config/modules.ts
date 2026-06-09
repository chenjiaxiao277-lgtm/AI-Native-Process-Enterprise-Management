/**
 * 系统模块配置：表格列、详情/新增/编辑页的标签页与扩展面板结构
 * 所有模块统一：表格页、详情页、编辑页、新增页；详情/编辑/新增采用「标签页 + 扩展面板」布局
 */

export type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'select' | 'textarea';

export interface FieldConfig {
  key: string;
  label: string;
  type?: FieldType;
  valueEnum?: Record<string, string>;
  required?: boolean;
  hideInDetail?: boolean;
}

export interface PanelConfig {
  key: string;
  header: string;
  defaultExpand?: boolean;
  fields: FieldConfig[];
}

export interface TabConfig {
  key: string;
  label: string;
  panels: PanelConfig[];
}

export interface ModuleMeta {
  title: string;
  apiBase: string;
  nameField: string; // 主名称字段，用于列表展示与表单标题
  listColumns: Array<{
    title: string;
    dataIndex: string;
    search?: boolean;
    valueType?: string;
    valueEnum?: Record<string, string>;
  }>;
  tabs: TabConfig[];
}

/** 根据 path 得到模块 key，如 /sales/customer -> sales/customer */
export function getModuleKey(path: string): string {
  const p = path.replace(/^\/+|\/+$/g, '');
  if (p.endsWith('/new') || /\/\d+\/?(edit)?$/.test(p)) {
    return p.replace(/\/new$|\/\d+(\/edit)?$/g, '').replace(/\/$/, '');
  }
  return p;
}

const defaultListColumns = [
  { title: 'ID', dataIndex: 'id', search: false },
  { title: '名称', dataIndex: 'name', search: true },
  { title: '创建时间', dataIndex: 'createTime', search: false },
  { title: '更新时间', dataIndex: 'updateTime', search: false },
];

/** 通用单表模块：仅基础信息一个标签页、一个面板 */
function simpleModule(
  title: string,
  apiBase: string,
  nameField: string = 'name',
): ModuleMeta {
  return {
    title,
    apiBase,
    nameField,
    listColumns: [...defaultListColumns],
    tabs: [
      {
        key: 'basic',
        label: '基本信息',
        panels: [
          {
            key: 'main',
            header: '主要信息',
            defaultExpand: true,
            fields: [
              { key: nameField, label: title === '客户管理' ? '客户名称' : '名称', type: 'text', required: true },
              { key: 'remark', label: '备注', type: 'textarea' },
            ],
          },
        ],
      },
    ],
  };
}

/** 交付项目：多字段、多标签页示例 */
const deliveryProjectTabs: TabConfig[] = [
  {
    key: 'basic',
    label: '基本信息',
    panels: [
      {
        key: 'main',
        header: '项目主要信息',
        defaultExpand: true,
        fields: [
          { key: 'projectName', label: '项目名称', type: 'text', required: true },
          { key: 'bizDepartment', label: '所属事业部', type: 'text' },
          { key: 'startDate', label: '项目开始时间', type: 'date' },
          { key: 'contractId', label: '关联合同ID', type: 'number' },
          { key: 'projectLevel', label: '项目等级', type: 'select', valueEnum: { 高: '高', 中: '中', 低: '低' } },
          { key: 'projectCategory', label: '项目类别', type: 'select', valueEnum: { 实施: '实施', 运维: '运维', 其它: '其它' } },
        ],
      },
    ],
  },
  {
    key: 'extra',
    label: '扩展信息',
    panels: [
      { key: 'risk', header: '风险与备注', defaultExpand: true, fields: [{ key: 'riskRate', label: '风险概率(%)', type: 'number' }, { key: 'remark', label: '备注', type: 'textarea' }] },
    ],
  },
  {
    key: 'audit',
    label: '审计信息',
    panels: [
      { key: 'time', header: '时间', defaultExpand: false, fields: [{ key: 'createTime', label: '创建时间', type: 'datetime' }, { key: 'updateTime', label: '更新时间', type: 'datetime' }] },
    ],
  },
];

/** 销售项目 */
const saleProjectTabs: TabConfig[] = [
  {
    key: 'basic',
    label: '基本信息',
    panels: [
      {
        key: 'main',
        header: '项目信息',
        defaultExpand: true,
        fields: [
          { key: 'projectName', label: '项目名称', type: 'text', required: true },
          { key: 'projectCode', label: '项目编号', type: 'text' },
          { key: 'customerName', label: '客户名称', type: 'text' },
          { key: 'projectStatus', label: '项目状态', type: 'select', valueEnum: { 立项: '立项', 进行中: '进行中', 已结项: '已结项' } },
        ],
      },
    ],
  },
  {
    key: 'audit',
    label: '审计信息',
    panels: [
      { key: 'time', header: '时间', defaultExpand: false, fields: [{ key: 'createTime', label: '创建时间', type: 'datetime' }, { key: 'updateTime', label: '更新时间', type: 'datetime' }] },
    ],
  },
];

/** 模块 path -> 配置 */
export const MODULES: Record<string, ModuleMeta> = {
  // 销售项目
  'sales/customer': simpleModule('客户管理', '/api/crud/sales/customers', 'name'),
  'sales/visit': simpleModule('拜访记录', '/api/crud/sales/visits', 'name'),
  'sales/lead': simpleModule('线索管理', '/api/crud/sales/leads', 'name'),
  'sales/sale-project': {
    title: '销售项目',
    apiBase: '/api/crud/sales/projects',
    nameField: 'projectName',
    listColumns: [
      { title: 'ID', dataIndex: 'id', search: false },
      { title: '项目编号', dataIndex: 'projectCode' },
      { title: '项目名称', dataIndex: 'projectName' },
      { title: '客户名称', dataIndex: 'customerName' },
      { title: '项目状态', dataIndex: 'projectStatus', valueEnum: { 立项: '立项', 进行中: '进行中', 已结项: '已结项' } },
      { title: '更新时间', dataIndex: 'updateTime', search: false },
    ],
    tabs: saleProjectTabs,
  },
  'sales/payment': simpleModule('回款管理', '/api/crud/sales/payments', 'name'),
  'sales/project-member': simpleModule('项目成员管理', '/api/crud/sales/project-members', 'name'),
  'sales/reimbursement': simpleModule('销售项目报销管理', '/api/crud/sales/reimbursements', 'name'),
  'sales/invoice': simpleModule('发票管理', '/api/crud/sales/invoices', 'name'),

  // 交付项目
  'delivery/project': {
    title: '交付项目',
    apiBase: '/api/crud/delivery/projects',
    nameField: 'projectName',
    listColumns: [
      { title: 'ID', dataIndex: 'id', search: false },
      { title: '项目名称', dataIndex: 'projectName' },
      { title: '所属事业部', dataIndex: 'bizDepartment' },
      { title: '项目开始时间', dataIndex: 'startDate', valueType: 'date' },
      { title: '关联合同ID', dataIndex: 'contractId' },
      { title: '项目等级', dataIndex: 'projectLevel' },
      { title: '项目类别', dataIndex: 'projectCategory' },
      { title: '风险概率(%)', dataIndex: 'riskRate' },
      { title: '更新时间', dataIndex: 'updateTime', search: false },
    ],
    tabs: deliveryProjectTabs,
  },
  'delivery/team': simpleModule('交付项目团队', '/api/crud/delivery/teams', 'name'),
  'delivery/deliverable': simpleModule('交付件', '/api/crud/delivery/deliverables', 'name'),
  'delivery/purchase-project': simpleModule('采购项目', '/api/crud/delivery/purchase-projects', 'name'),
  'delivery/purchase-contract': simpleModule('采购合同管理', '/api/crud/delivery/purchase-contracts', 'name'),
  'delivery/worklog': simpleModule('交付工时管理', '/api/crud/delivery/worklogs', 'name'),
  'delivery/reimbursement': simpleModule('交付报销管理', '/api/crud/delivery/reimbursements', 'name'),

  // 公共模块
  'common/ops-data': simpleModule('经营数据管理', '/api/crud/common/ops-data', 'name'),
  'common/cockpit': simpleModule('驾驶舱', '/api/crud/common/cockpit', 'name'),
  'common/bonus': simpleModule('奖金管理', '/api/crud/common/bonuses', 'name'),
  'common/budget': simpleModule('预算管理', '/api/crud/common/budgets', 'name'),
};

export function getModuleConfig(path: string): ModuleMeta | null {
  const key = getModuleKey(path);
  return MODULES[key] ?? null;
}
