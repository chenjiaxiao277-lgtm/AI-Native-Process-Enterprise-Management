import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { history } from 'umi';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  ApiOutlined,
  AppstoreAddOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  CopyOutlined,
  ExportOutlined,
  LeftOutlined,
  InfoCircleOutlined,
  ImportOutlined,
  LinkOutlined,
  MinusOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingFilled,
  SettingOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  changeWorkItemStatus,
  createWorkItemField,
  deleteWorkItem,
  deleteWorkItemField,
  fetchAllWorkItems,
  fetchWorkItemFields,
  fetchWorkItemPage,
  fetchWorkItemSettings,
  saveWorkItem,
  saveWorkItemSettings,
  unbindReuseWorkItem,
  updateWorkItemField,
  type WorkItemField,
  type WorkItemType,
} from '@/services/workItem';
import {
  createSpaceRelationAuth,
  deleteSpaceRelationAuth,
  fetchSpaceRelationAuths,
  updateSpaceRelationAuth,
  type SpaceRelationAuth,
} from '@/services/spaceRelation';
import {
  SPACE_CHANGED_EVENT,
  STANDARD_SPACE_ICONS,
  getCurrentSpace,
  getSpaceList,
  setCurrentSpaceIcon,
  setCurrentSpaceName,
  withSpaceId,
} from '@/utils/space';
import {
  buildNodeRects,
  buildSwimlaneEdges,
  routeSwimlaneEdges,
  SWIMLANE_ROUTING_OPTIONS,
  toSvgPath,
  type SwimlaneNode,
} from '@/utils/swimlane-routing';
import {
  computeEffectiveRow,
  computeStageTopOffsets,
  computeSwimlaneLayoutOverlay,
  type SwimlaneLayoutNode,
} from '@/utils/swimlane-layout';
import {
  coerceOptionsList,
  finalizeFieldOptionsJsonString,
  validateFieldFormBeforeSave,
  validateOptionPairsInJson,
  type FieldOptionItem,
} from '@/utils/workItemFieldMeta';
import { validateFormulaReferences } from '@/utils/workItemFormula';
import type { ChartConfigV1, ChartFieldMetaMap } from '@/utils/chartConfigTypes';
import { buildChartFieldMetaMap, getDefaultChartConfig, sourceKeyToChartWidgetType } from '@/utils/chartConfigDefaults';
import { validateChartConfig } from '@/utils/chartConfigRules';
import { ChartLayoutWidgetConfigPanel } from '@/components/WorkItem/ChartLayoutWidgetConfigPanel';

const itemCategoryText: Record<string, string> = {
  requirement: '需求',
  bug: '缺陷',
  task: '任务',
  custom: '自定义',
};

const roleColumns = [
  { title: '角色', dataIndex: 'role' },
  { title: '成员数', dataIndex: 'memberCount' },
  {
    title: '权限范围',
    dataIndex: 'scope',
    render: (scope: string[]) => (
      <Space wrap>
        {scope.map((item) => (
          <Tag key={item}>{item}</Tag>
        ))}
      </Space>
    ),
  },
];

const copyFieldOptions = [
  { label: '名称', value: '名称' },
  { label: '关注人', value: '关注人' },
  { label: '优先级', value: '优先级' },
  { label: '描述', value: '描述' },
  { label: '负责人', value: '负责人' },
  { label: '截止时间', value: '截止时间' },
];

const copyRoleOptions = [
  { label: '创建人', value: '创建人' },
  { label: '管理员', value: '管理员' },
  { label: 'PM', value: 'PM' },
  { label: 'QA', value: 'QA' },
  { label: '开发', value: '开发' },
];

const iconColorOptions = [
  '#1677ff',
  '#6f42c1',
  '#8e44ad',
  '#5b8ff9',
  '#5d7092',
  '#3ba0ff',
  '#36cfc9',
  '#73d13d',
  '#fadb14',
  '#faad14',
  '#fa8c16',
  '#ff4d4f',
];

const LANE_NODE_WIDTH = 104;
const LANE_NODE_GAP = 20;

/**
 * 泳道格内按列（laneOrder）全局重算垂向行：在 effectiveRow（overlay.layoutRow + stageTop）基础上保序压实，保证同列内行号严格递增且与布局层一致。
 * 避免「DOM 用 occupied 局部 +1、routing 仍用理论 effectiveRow」错位导致节点重叠、连线穿节点。
 */
function computeSwimlaneCanvasDisplayRows(
  nodes: Array<{ id: string; roleId: string; stageId: string; laneOrder?: number }>,
  laneRoles: Array<{ id: string }>,
  laneStages: Array<{ id: string }>,
  effectiveRow: (nodeId: string, stageId: string) => number,
): Map<string, number> {
  const map = new Map<string, number>();
  laneRoles.forEach((role) => {
    laneStages.forEach((stage) => {
      const cellNodes = nodes.filter((n) => n.roleId === role.id && n.stageId === stage.id);
      const byCol = new Map<number, typeof cellNodes>();
      cellNodes.forEach((n) => {
        const col = Number(n.laneOrder || 0);
        const list = byCol.get(col) || [];
        list.push(n);
        byCol.set(col, list);
      });
      byCol.forEach((nodesInCol) => {
        const sorted = [...nodesInCol].sort((a, b) => {
          const d = effectiveRow(a.id, a.stageId) - effectiveRow(b.id, b.stageId);
          if (d !== 0) return d;
          return a.id.localeCompare(b.id);
        });
        let prev = -1;
        sorted.forEach((n) => {
          const er = effectiveRow(n.id, n.stageId);
          const row = Math.max(er, prev + 1);
          map.set(n.id, row);
          prev = row;
        });
      });
    });
  });
  return map;
}

type WorkItemSettingsForm = WorkItemType & {
  copyFieldsList?: string[];
  copyRolesList?: string[];
  baselineEnabledFlag?: boolean;
  navEntryEnabledFlag?: boolean;
  statusFlag?: boolean;
};

type WorkItemFieldForm = WorkItemField & {
  authorizedRoleList?: string[];
  isEnabledFlag?: boolean;
  isRequiredFlag?: boolean;
  maxLength?: number;
  numberMode?: 'integer' | 'decimal';
  numberMin?: number;
  numberMax?: number;
  numberPrecision?: number;
  // number 字段特性：以 optionsJson 形式持久化 readonly/showInDetail
  readonlyFlag?: boolean;
  showInDetailFlag?: boolean;
  fieldOptions?: string[];
  allowUserAddOption?: boolean;
  repeatCheckEnabled?: boolean;
  batchCreateToOthers?: boolean;
  memberAutoJoin?: boolean;
  timeAutoFillRule?: 'none' | 'now';
  voteResultSwitchField?: string;
  formulaExpression?: string;
  formulaResultType?: 'number' | 'text' | 'boolean';
  freezeFormulaResult?: boolean;
  numberScaleMode?: 'origin' | 'thousand' | 'ten_thousand' | 'hundred_million';
  numberSymbol?: 'none' | 'percent' | 'currency';
  numberDecimalPlaces?: 'unlimited' | '0' | '1' | '2' | '3' | '4';
  numberUseThousands?: boolean;
  // work_item_relation：选择“关系模型”（relationId，来自关系管理列表）
  relationId?: string;
  relationKind?: 'parent_child' | 'block' | 'depend' | 'related';
  relationVisibleScope?: 'fixed' | 'all';
  relationDataRangeCount?: number;
  relationExtraDisplayEnabled?: boolean;
  optionConfigMode?: 'custom';
  selectableLevel?: 'leaf_only' | 'at_least_one_level';
};

type DetailLayoutVisibleRule = {
  mode: 'always' | 'conditional';
  conditions: Array<{ field: string; operator: string; value: string }>;
};

type DetailLayoutFieldItem = {
  id: string;
  sourceType: 'field' | 'role' | 'control' | 'chart';
  sourceKey: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  visibleRule: DetailLayoutVisibleRule;
  defaultValueMode?: 'none' | 'fixed' | 'conditional';
  defaultValue?: string;
  createVisible?: boolean;
  required?: boolean;
  width: 'half' | 'full';
  /** 仅 sourceType === 'chart' 时使用，随布局 JSON 持久化 */
  chartConfig?: ChartConfigV1;
};

type DetailLayoutGroup = {
  id: string;
  name: string;
  items: DetailLayoutFieldItem[];
};

type DetailLayoutTab = {
  id: string;
  name: string;
  builtIn?: boolean;
  pluginGenerated?: boolean;
  visibleRule: DetailLayoutVisibleRule;
  memberScope: {
    users: string[];
    teams: string[];
    roles: string[];
  };
  groups: DetailLayoutGroup[];
};

type DetailLayoutConfig = {
  displayMode: 'side' | 'top';
  detailTabs: DetailLayoutTab[];
  createTabs: DetailLayoutTab[];
};

type SpaceRelationAuthForm = {
  id?: number;
  targetSpaceId: string;
  resourceType: 'work_item_type' | 'work_item_record';
  resourceKeyMode: 'all' | 'single';
  resourceKey?: string;
  status?: number;
  remark?: string;
};

type FlowRoleItem = {
  id: string;
  name: string;
  roleType: '普通类型' | '计算类型';
  appearance: '默认出现' | '自行添加';
  memberAssign: '自行添加' | '指定人员';
  limitSingle: boolean;
  autoJoin: boolean;
  mappingKey?: string;
  displaySetting: string;
  projectOwner?: boolean;
};

type WorkflowCardTransition = {
  from: string;
  to: string;
};

type WorkflowCard = {
  id: string;
  name: string;
  version: number;
  enabled: boolean;
  transitions: WorkflowCardTransition[];
  statusCalcRule?: string;
  advancedDependencyEnabled?: boolean;
  customNodeInfo?: string;
  displayPosition?: string;
  laneConfig?: {
    roles: Array<{ id: string; name: string }>;
    stages: Array<{ id: string; name: string }>;
    nodes: Array<{
      id: string;
      name: string;
      roleId: string;
      stageId: string;
      laneOrder?: number;
      nextIds: string[];
      statusTags?: string[];
      subItems?: string[];
      subTaskDisplayOnCard?: boolean;
      subTasks?: Array<{ id: string; name: string; required: boolean }>;
      subWorkItemTypes?: string[];
      events?: string;
    }>;
    showLines?: boolean;
  };
};

const defaultVisibleRule = (): DetailLayoutVisibleRule => ({
  mode: 'always',
  conditions: [],
});

const safeJsonParse = <T,>(text?: string): T | undefined => {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
};

const createDefaultDetailLayoutConfig = (
  fields: WorkItemField[],
  workItemName = '工作项',
): DetailLayoutConfig => {
  const items: DetailLayoutFieldItem[] = (fields || []).slice(0, 12).map((field) => ({
    id: `field-${field.id || field.fieldKey}`,
    sourceType: 'field',
    sourceKey: field.fieldKey,
    label: field.fieldName,
    placeholder: field.fieldName,
    helpText: field.helpText || '',
    visibleRule: defaultVisibleRule(),
    defaultValueMode: (field.defaultValueMode as any) || 'none',
    defaultValue: field.defaultValue || '',
    createVisible: true,
    required: field.isRequired === 1,
    width: ['switch', 'single_select', 'member', 'vote_attitude', 'vote_single', 'vote_multi'].includes(field.fieldType)
      ? 'half'
      : 'full',
  }));

  const detailTabs: DetailLayoutTab[] = [
    {
      id: 'tab-basic',
      name: '基本信息',
      builtIn: true,
      visibleRule: defaultVisibleRule(),
      memberScope: { users: [], teams: [], roles: [] },
      groups: [
        {
          id: 'group-basic',
          name: `${workItemName}基础信息`,
          items,
        },
      ],
    },
    {
      id: 'tab-node-detail',
      name: '节点详情',
      builtIn: true,
      visibleRule: defaultVisibleRule(),
      memberScope: { users: [], teams: [], roles: [] },
      groups: [{ id: 'group-node', name: '节点信息', items: [] }],
    },
    {
      id: 'tab-comment',
      name: '评论/备注',
      builtIn: true,
      visibleRule: defaultVisibleRule(),
      memberScope: { users: [], teams: [], roles: [] },
      groups: [{ id: 'group-comment', name: '评论', items: [] }],
    },
    {
      id: 'tab-operation-log',
      name: '操作记录',
      builtIn: true,
      visibleRule: defaultVisibleRule(),
      memberScope: { users: [], teams: [], roles: [] },
      groups: [{ id: 'group-log', name: '操作日志', items: [] }],
    },
  ];
  return {
    displayMode: 'side',
    detailTabs,
    createTabs: JSON.parse(JSON.stringify(detailTabs)),
  };
};

const normalizeLayoutTabs = (tabs: any[] = []): DetailLayoutTab[] =>
  tabs.map((tab, tabIndex) => ({
    id: tab.id || `tab-${tabIndex + 1}`,
    name: tab.name || `标签${tabIndex + 1}`,
    builtIn: !!tab.builtIn,
    pluginGenerated: !!tab.pluginGenerated,
    visibleRule: tab.visibleRule || defaultVisibleRule(),
    memberScope: tab.memberScope || { users: [], teams: [], roles: [] },
    groups: (tab.groups || []).map((group: any, groupIndex: number) => ({
      id: group.id || `group-${tabIndex + 1}-${groupIndex + 1}`,
      name: group.name || `分组${groupIndex + 1}`,
      items: (group.items || []).map((item: any, itemIndex: number) => {
        const sourceType = item.sourceType || 'field';
        const base = {
          id: item.id || `item-${tabIndex + 1}-${groupIndex + 1}-${itemIndex + 1}`,
          sourceType,
          sourceKey: item.sourceKey || '',
          label: item.label || '未命名字段',
          placeholder: item.placeholder || '',
          helpText: item.helpText || '',
          visibleRule: item.visibleRule || defaultVisibleRule(),
          defaultValueMode: item.defaultValueMode || 'none',
          defaultValue: item.defaultValue || '',
          createVisible: item.createVisible !== false,
          required: !!item.required,
          width: item.width === 'half' ? 'half' : 'full',
        };
        if (sourceType === 'chart') {
          const hasV1 =
            item.chartConfig &&
            typeof item.chartConfig === 'object' &&
            item.chartConfig.version === 1;
          return {
            ...base,
            chartConfig: hasV1
              ? (item.chartConfig as ChartConfigV1)
              : getDefaultChartConfig(sourceKeyToChartWidgetType(String(item.sourceKey || 'chart-bar'))),
          };
        }
        return base;
      }),
    })),
  }));

const toLayoutConfig = (
  rawJson: string | undefined,
  fields: WorkItemField[],
  workItemName = '工作项',
): DetailLayoutConfig => {
  const parsed = safeJsonParse<any>(rawJson);
  if (!parsed) {
    return createDefaultDetailLayoutConfig(fields, workItemName);
  }
  if (Array.isArray(parsed.tabs)) {
    const detailTabs = normalizeLayoutTabs(parsed.tabs);
    return {
      displayMode: parsed.displayMode === 'top' ? 'top' : 'side',
      detailTabs,
      createTabs: JSON.parse(JSON.stringify(detailTabs)),
    };
  }
  if (!Array.isArray(parsed.detailTabs) || !Array.isArray(parsed.createTabs)) {
    return createDefaultDetailLayoutConfig(fields, workItemName);
  }
  return {
    displayMode: parsed.displayMode === 'top' ? 'top' : 'side',
    detailTabs: normalizeLayoutTabs(parsed.detailTabs),
    createTabs: normalizeLayoutTabs(parsed.createTabs),
  };
};

function parseJsonArray(text?: string): string[] {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

const normalizeWorkflowCards = (
  rawJson: string | undefined,
  workItemName = '工作项',
): WorkflowCard[] => {
  const parsed = safeJsonParse<any>(rawJson);
  const normalizeOne = (item: any, index: number): WorkflowCard => {
    const transitions = Array.isArray(item?.transitions)
      ? item.transitions
          .map((x: any) => ({
            from: String(x?.from || '').trim(),
            to: String(x?.to || '').trim(),
          }))
          .filter((x: any) => x.from && x.to)
      : [];
    return {
      id: String(item?.id || `flow-${Date.now()}-${index + 1}`),
      name: String(item?.name || `${workItemName}流程${index + 1}`),
      version: Number(item?.version || index + 1),
      enabled: item?.enabled !== false,
      statusCalcRule: String(item?.statusCalcRule || ''),
      advancedDependencyEnabled: item?.advancedDependencyEnabled !== false,
      customNodeInfo: String(item?.customNodeInfo || '延期标识'),
      displayPosition: String(item?.displayPosition || '节点名称右侧'),
      laneConfig: item?.laneConfig && typeof item.laneConfig === 'object'
        ? {
            roles: Array.isArray(item.laneConfig.roles) ? item.laneConfig.roles : [],
            stages: Array.isArray(item.laneConfig.stages) ? item.laneConfig.stages : [],
            nodes: Array.isArray(item.laneConfig.nodes)
              ? item.laneConfig.nodes.map((node: any, idx: number) => ({
                  id: String(node?.id || `node-${idx + 1}`),
                  name: String(node?.name || `节点${idx + 1}`),
                  roleId: String(node?.roleId || ''),
                  stageId: String(node?.stageId || ''),
                  laneOrder: Number.isFinite(Number(node?.laneOrder)) ? Number(node?.laneOrder) : 0,
                  nextIds: Array.isArray(node?.nextIds) ? node.nextIds.map((x: any) => String(x)) : [],
                  statusTags: Array.isArray(node?.statusTags) ? node.statusTags.map((x: any) => String(x)) : [],
                  subItems: Array.isArray(node?.subItems) ? node.subItems.map((x: any) => String(x)) : [],
                  subTaskDisplayOnCard: node?.subTaskDisplayOnCard !== false,
                  subTasks: Array.isArray(node?.subTasks)
                    ? node.subTasks.map((task: any, taskIndex: number) => ({
                        id: String(task?.id || `sub-task-${idx + 1}-${taskIndex + 1}`),
                        name: String(task?.name || `任务${taskIndex + 1}`),
                        required: task?.required !== false,
                      }))
                    : [],
                  subWorkItemTypes: Array.isArray(node?.subWorkItemTypes)
                    ? node.subWorkItemTypes.map((x: any) => String(x))
                    : [],
                  events: String(node?.events || ''),
                }))
              : [],
            showLines: item.laneConfig.showLines !== false,
          }
        : undefined,
      transitions: transitions.length
        ? transitions
        : [{ from: 'OPEN', to: 'CLOSED' }],
    };
  };

  if (Array.isArray(parsed?.flows)) {
    const cards = parsed.flows.map((item: any, index: number) => normalizeOne(item, index));
    if (cards.length) return cards;
  }

  if (Array.isArray(parsed?.transitions)) {
    return [
      normalizeOne(
        {
          id: `flow-${Date.now()}-1`,
          name: `${workItemName}默认流程`,
          version: 1,
          enabled: true,
          transitions: parsed.transitions,
        },
        0,
      ),
    ];
  }

  return [
    {
      id: `flow-${Date.now()}-1`,
      name: `${workItemName}默认流程`,
      version: 1,
      enabled: true,
      statusCalcRule: '',
      advancedDependencyEnabled: true,
      customNodeInfo: '延期标识',
      displayPosition: '节点名称右侧',
      laneConfig: undefined,
      transitions: [{ from: 'OPEN', to: 'CLOSED' }],
    },
  ];
};

const stringifyWorkflowCards = (cards: WorkflowCard[]) =>
  JSON.stringify({
    flows: cards.map((item) => ({
      id: item.id,
      name: item.name,
      version: item.version,
      enabled: item.enabled,
      statusCalcRule: item.statusCalcRule || '',
      advancedDependencyEnabled: item.advancedDependencyEnabled !== false,
      customNodeInfo: item.customNodeInfo || '延期标识',
      displayPosition: item.displayPosition || '节点名称右侧',
      laneConfig: item.laneConfig || undefined,
      transitions: item.transitions,
    })),
  });

function parseFieldOptionsJson(text?: string): {
  options: string[];
  allowUserAddOption: boolean;
  repeatCheckEnabled: boolean;
  batchCreateToOthers: boolean;
  memberAutoJoin: boolean;
  timeAutoFillRule: 'none' | 'now';
  voteResultSwitchField?: string;
  formulaExpression?: string;
  formulaResultType: 'number' | 'text' | 'boolean';
  freezeFormulaResult: boolean;
  readonlyFlag: boolean;
  showInDetailFlag: boolean;
  maxLength?: number;
  numberMode: 'integer' | 'decimal';
  numberMin?: number;
  numberMax?: number;
  numberPrecision?: number;
  numberScaleMode: 'origin' | 'thousand' | 'ten_thousand' | 'hundred_million';
  numberSymbol: 'none' | 'percent' | 'currency';
  numberDecimalPlaces: 'unlimited' | '0' | '1' | '2' | '3' | '4';
  numberUseThousands: boolean;
  relationKind?: 'parent_child' | 'block' | 'depend' | 'related';
  relationId?: string;
  relationMode?: 'single' | 'multiple';
  relationVisibleScope: 'fixed' | 'all';
  relationDataRangeCount: number;
  relationExtraDisplayEnabled: boolean;
} {
  if (!text) {
    return {
      options: [],
      allowUserAddOption: false,
      repeatCheckEnabled: false,
      batchCreateToOthers: false,
      memberAutoJoin: false,
      timeAutoFillRule: 'none',
      voteResultSwitchField: undefined,
      formulaExpression: '',
      formulaResultType: 'number',
      freezeFormulaResult: false,
      readonlyFlag: false,
      showInDetailFlag: true,
      maxLength: undefined,
      numberMode: 'decimal',
      numberMin: undefined,
      numberMax: undefined,
      numberPrecision: undefined,
      numberScaleMode: 'origin',
      numberSymbol: 'none',
      numberDecimalPlaces: 'unlimited',
      numberUseThousands: false,
      relationKind: undefined,
      relationId: undefined,
      relationMode: undefined,
      relationVisibleScope: 'fixed',
      relationDataRangeCount: 0,
      relationExtraDisplayEnabled: false,
    };
  }
  try {
    const value = JSON.parse(text);
    if (Array.isArray(value)) {
      return {
        options: coerceOptionsList(value).map((p: FieldOptionItem) => p.value),
        allowUserAddOption: false,
        repeatCheckEnabled: false,
        batchCreateToOthers: false,
        memberAutoJoin: false,
        timeAutoFillRule: 'none',
        voteResultSwitchField: undefined,
        formulaExpression: '',
        formulaResultType: 'number',
        freezeFormulaResult: false,
        readonlyFlag: false,
        showInDetailFlag: true,
        maxLength: undefined,
        numberMode: 'decimal',
        numberMin: undefined,
        numberMax: undefined,
        numberPrecision: undefined,
        numberScaleMode: 'origin',
        numberSymbol: 'none',
        numberDecimalPlaces: 'unlimited',
        numberUseThousands: false,
        relationKind: undefined,
        relationId: undefined,
        relationMode: undefined,
        relationVisibleScope: 'fixed',
        relationDataRangeCount: 0,
        relationExtraDisplayEnabled: false,
      };
    }
    if (value && typeof value === 'object') {
      const options = coerceOptionsList(Array.isArray(value.options) ? value.options : []).map(
        (p: FieldOptionItem) => p.value,
      );
      const maxLengthRaw = value.maxLength;
      const maxLength =
        maxLengthRaw === null || maxLengthRaw === undefined || maxLengthRaw === ''
          ? undefined
          : Number(maxLengthRaw);
      const numberMode = value.numberMode === 'integer' ? 'integer' : 'decimal';
      const numberMin =
        value.min === null || value.min === undefined || value.min === '' ? undefined : Number(value.min);
      const numberMax =
        value.max === null || value.max === undefined || value.max === '' ? undefined : Number(value.max);
      const numberPrecision =
        value.precision === null || value.precision === undefined || value.precision === ''
          ? undefined
          : Number(value.precision);
      return {
        options,
        allowUserAddOption: Boolean(value.allowUserAddOption),
        repeatCheckEnabled: Boolean(value.repeatCheckEnabled),
        batchCreateToOthers: Boolean(value.batchCreateToOthers),
        memberAutoJoin: Boolean(value.memberAutoJoin),
        timeAutoFillRule: value.timeAutoFillRule === 'now' ? 'now' : 'none',
        voteResultSwitchField: value.voteResultSwitchField ? String(value.voteResultSwitchField) : undefined,
        formulaExpression: value.formulaExpression ? String(value.formulaExpression) : '',
        formulaResultType:
          value.formulaResultType === 'text' || value.formulaResultType === 'boolean' || value.formulaResultType === 'number'
            ? value.formulaResultType
            : 'number',
        freezeFormulaResult: Boolean(value.freezeFormulaResult),
        readonlyFlag: Boolean(value.readonly ?? value.readOnly),
        showInDetailFlag: value.showInDetail === false ? false : true,
        maxLength:
          Number.isFinite(maxLength) && Number.isInteger(maxLength as number) && (maxLength as number) >= 1
            ? maxLength
            : undefined,
        numberMode,
        numberMin: Number.isFinite(numberMin as any) ? numberMin : undefined,
        numberMax: Number.isFinite(numberMax as any) ? numberMax : undefined,
        numberPrecision: Number.isFinite(numberPrecision as any) ? numberPrecision : undefined,
        numberScaleMode: ['origin', 'thousand', 'ten_thousand', 'hundred_million'].includes(value.numberScaleMode)
          ? value.numberScaleMode
          : 'origin',
        numberSymbol: ['none', 'percent', 'currency'].includes(value.numberSymbol) ? value.numberSymbol : 'none',
        numberDecimalPlaces: ['unlimited', '0', '1', '2', '3', '4'].includes(value.numberDecimalPlaces)
          ? value.numberDecimalPlaces
          : 'unlimited',
        numberUseThousands: Boolean(value.numberUseThousands),
        relationKind: ['parent_child', 'block', 'depend', 'related'].includes(value.relationKind)
          ? value.relationKind
          : undefined,
        relationId:
          value.relationId === null || value.relationId === undefined || value.relationId === ''
            ? undefined
            : String(value.relationId),
        relationMode: value.relationMode === 'single' || value.relationMode === 'multiple' ? value.relationMode : undefined,
        relationVisibleScope: value.relationVisibleScope === 'all' ? 'all' : 'fixed',
        relationDataRangeCount: Number(value.relationDataRangeCount || 0),
        relationExtraDisplayEnabled: Boolean(value.relationExtraDisplayEnabled),
      };
    }
  } catch {
    // ignore
  }
  return {
    options: [],
    allowUserAddOption: false,
    repeatCheckEnabled: false,
    batchCreateToOthers: false,
    memberAutoJoin: false,
    timeAutoFillRule: 'none',
    voteResultSwitchField: undefined,
    formulaExpression: '',
    formulaResultType: 'number',
    freezeFormulaResult: false,
    readonlyFlag: false,
    showInDetailFlag: true,
    maxLength: undefined,
    numberMode: 'decimal',
    numberMin: undefined,
    numberMax: undefined,
    numberPrecision: undefined,
    numberScaleMode: 'origin',
    numberSymbol: 'none',
    numberDecimalPlaces: 'unlimited',
    numberUseThousands: false,
    relationKind: undefined,
    relationId: undefined,
    relationMode: undefined,
    relationVisibleScope: 'fixed',
    relationDataRangeCount: 0,
    relationExtraDisplayEnabled: false,
  };
}

function buildFieldOptionsJson(values: WorkItemFieldForm): string | undefined {
  const fieldType = values.fieldType || '';
  const isTextType = textFieldTypes.includes(fieldType);
  const isSelectType = selectFieldTypes.includes(fieldType);
  const isMemberType = memberFieldTypes.includes(fieldType);
  const isDateType = dateFieldTypes.includes(fieldType);
  const isVoteType = voteFieldTypes.includes(fieldType);
  const isFormulaType = formulaFieldTypes.includes(fieldType);
  const isNumberType = numberFieldTypes.includes(fieldType);
  const isAttachmentType = attachmentFieldTypes.includes(fieldType);
  const isCompositeType = compositeFieldTypes.includes(fieldType);
  const isRelationType = relationFieldTypes.includes(fieldType);
  if (
    !isTextType &&
    !isSelectType &&
    !isMemberType &&
    !isDateType &&
    !isVoteType &&
    !isFormulaType &&
    !isNumberType &&
    !isAttachmentType &&
    !isCompositeType &&
    !isRelationType
  ) return undefined;
  const options = (values.fieldOptions || []).map((x) => String(x).trim()).filter(Boolean);
  const payload = {
    maxLength: (() => {
      if (!isTextType) return undefined;
      if (values.maxLength === undefined || values.maxLength === null || values.maxLength === '') return undefined;
      const n = Number(values.maxLength);
      if (!Number.isInteger(n) || n < 1) return undefined;
      return n;
    })(),
    numberMode: isNumberType ? (values.numberMode === 'integer' ? 'integer' : 'decimal') : 'decimal',
    min: isNumberType && values.numberMin !== undefined && values.numberMin !== null ? Number(values.numberMin) : undefined,
    max: isNumberType && values.numberMax !== undefined && values.numberMax !== null ? Number(values.numberMax) : undefined,
    precision:
      isNumberType && values.numberMode !== 'integer' && values.numberPrecision !== undefined && values.numberPrecision !== null
        ? Number(values.numberPrecision)
        : isNumberType && values.numberMode === 'integer'
          ? 0
          : undefined,
    options: isSelectType || isVoteType ? options : [],
    allowUserAddOption: !!values.allowUserAddOption,
    repeatCheckEnabled: isTextType ? !!values.repeatCheckEnabled : false,
    batchCreateToOthers: !!values.batchCreateToOthers,
    memberAutoJoin: isMemberType ? !!values.memberAutoJoin : false,
    timeAutoFillRule: fieldType === 'date_time' ? values.timeAutoFillRule || 'none' : 'none',
    voteResultSwitchField: isVoteType ? values.voteResultSwitchField || '' : '',
    formulaExpression: isFormulaType ? (values.formulaExpression || '').trim() : '',
    formulaResultType: isFormulaType
      ? values.formulaResultType === 'text' || values.formulaResultType === 'boolean'
        ? values.formulaResultType
        : 'number'
      : undefined,
    freezeFormulaResult: isFormulaType ? !!values.freezeFormulaResult : false,
    readonly: isNumberType || isSelectType || isDateType || isRelationType ? !!values.readonlyFlag : undefined,
    showInDetail:
      isNumberType || isSelectType || isDateType || isRelationType ? !!values.showInDetailFlag : undefined,
    numberScaleMode: isNumberType ? values.numberScaleMode || 'origin' : 'origin',
    numberSymbol: isNumberType ? values.numberSymbol || 'none' : 'none',
    numberDecimalPlaces: isNumberType ? values.numberDecimalPlaces || 'unlimited' : 'unlimited',
    numberUseThousands: isNumberType ? !!values.numberUseThousands : false,
    relationId: isRelationType ? String(values.relationId || '') : undefined,
    relationMode: isRelationType ? (fieldType === 'work_item_relation' ? 'single' : 'multiple') : undefined,
    relationKind: isRelationType ? values.relationKind || '' : '',
    relationVisibleScope: isRelationType ? values.relationVisibleScope || 'fixed' : 'fixed',
    relationDataRangeCount: isRelationType ? Number(values.relationDataRangeCount || 0) : 0,
    relationExtraDisplayEnabled: isRelationType ? !!values.relationExtraDisplayEnabled : false,
  };
  return JSON.stringify(payload);
}

const textFieldTypes = ['text', 'textarea', 'rich_text'];
const selectFieldTypes = ['single_select', 'multi_select'];
const memberFieldTypes = ['member', 'members'];
const dateFieldTypes = ['date', 'date_range', 'date_time'];
const voteFieldTypes = ['vote_attitude', 'vote_single', 'vote_multi'];
const formulaFieldTypes = ['formula'];
const numberFieldTypes = ['number'];
const attachmentFieldTypes = ['attachment', 'multi_attachment'];
const compositeFieldTypes = ['composite'];
const relationFieldTypes = ['work_item_relation', 'work_item_relation_multi'];

const SpaceConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('spaceInfo');
  const [spaceName, setSpaceName] = useState(getCurrentSpace().name || '');
  const [spaceIcon, setSpaceIcon] = useState(getCurrentSpace().icon || '🥮');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [workItems, setWorkItems] = useState<WorkItemType[]>([]);
  const [workItemLoading, setWorkItemLoading] = useState(false);
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [editingRelation, setEditingRelation] = useState<SpaceRelationAuth | null>(null);
  const [relationAuths, setRelationAuths] = useState<SpaceRelationAuth[]>([]);
  const [workItemModalOpen, setWorkItemModalOpen] = useState(false);
  const [editingWorkItem, setEditingWorkItem] = useState<WorkItemType | null>(null);
  const [reuseCandidates, setReuseCandidates] = useState<WorkItemType[]>([]);

  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [settingsDrawerFullscreen, setSettingsDrawerFullscreen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState('basic');
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemType | null>(null);

  const [fieldLoading, setFieldLoading] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<WorkItemField | null>(null);
  const [workItemFields, setWorkItemFields] = useState<WorkItemField[]>([]);
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaDraft, setFormulaDraft] = useState('');
  const [workflowCards, setWorkflowCards] = useState<WorkflowCard[]>([]);
  const [workflowConfigOpen, setWorkflowConfigOpen] = useState(false);
  const [workflowConfigTab, setWorkflowConfigTab] = useState('basic');
  const [activeWorkflowCardId, setActiveWorkflowCardId] = useState('');
  const [laneRoles, setLaneRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [laneStages, setLaneStages] = useState<Array<{ id: string; name: string }>>([]);
  const [laneNodes, setLaneNodes] = useState<
    Array<{
      id: string;
      name: string;
      roleId: string;
      stageId: string;
      laneOrder?: number;
      laneRow?: number;
      nextIds: string[];
      statusTags?: string[];
      subItems?: string[];
      subTaskDisplayOnCard?: boolean;
      subTasks?: Array<{ id: string; name: string; required: boolean }>;
      subWorkItemTypes?: string[];
      events?: string;
    }>
  >([]);
  const [laneShowLines, setLaneShowLines] = useState(true);
  const [laneFullscreen, setLaneFullscreen] = useState(false);
  const [selectedLaneNodeId, setSelectedLaneNodeId] = useState('');
  const [selectedLaneEdge, setSelectedLaneEdge] = useState<{ fromId: string; toId: string; x: number; y: number } | null>(null);
  const [roleKeyword, setRoleKeyword] = useState('');
  const [flowRoles, setFlowRoles] = useState<FlowRoleItem[]>([
    {
      id: 'role_c9eee9',
      name: '大项目经理',
      roleType: '普通类型',
      appearance: '默认出现',
      memberAssign: '自行添加',
      limitSingle: false,
      autoJoin: true,
      displaySetting: '默认显示 / 允许用户增删',
      projectOwner: true,
    },
    {
      id: 'role_d64fa7',
      name: '高层领导',
      roleType: '普通类型',
      appearance: '默认出现',
      memberAssign: '自行添加',
      limitSingle: false,
      autoJoin: false,
      displaySetting: '默认显示 / 允许用户增删',
      projectOwner: false,
    },
    {
      id: 'role_57c8ab',
      name: '施工人员',
      roleType: '普通类型',
      appearance: '自行添加',
      memberAssign: '自行添加',
      limitSingle: false,
      autoJoin: false,
      displaySetting: '默认显示 / 允许用户增删',
      projectOwner: false,
    },
  ]);
  const [selectedFlowRoleId, setSelectedFlowRoleId] = useState('role_c9eee9');
  const [laneRightTab, setLaneRightTab] = useState('nodeInfo');
  const laneCanvasRef = useRef<HTMLDivElement | null>(null);
  const laneNodeRefMap = useRef<Record<string, HTMLDivElement | null>>({});
  const [laneNodePositions, setLaneNodePositions] = useState<
    Record<string, { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number }>
  >({});
  const [lineDraft, setLineDraft] = useState<{
    fromId: string;
    x: number;
    y: number;
    removeToId?: string;
  } | null>(null);
  const [detailLayoutConfig, setDetailLayoutConfig] = useState<DetailLayoutConfig>({
    displayMode: 'side',
    detailTabs: [],
    createTabs: [],
  });
  const [layoutPageMode, setLayoutPageMode] = useState<'detail' | 'create'>('detail');
  const [activeDetailTabId, setActiveDetailTabId] = useState<string>('');
  const [selectedLayoutItemId, setSelectedLayoutItemId] = useState<string>('');
  const [tagVisibleModalOpen, setTagVisibleModalOpen] = useState(false);
  const [editingTabVisibleId, setEditingTabVisibleId] = useState<string>('');
  const [resourceKeyword, setResourceKeyword] = useState('');
  const [previewLayoutOpen, setPreviewLayoutOpen] = useState(false);
  const [previewActiveTabId, setPreviewActiveTabId] = useState('');
  const [draggingResource, setDraggingResource] = useState<{ key: string; label: string; sourceType: DetailLayoutFieldItem['sourceType'] } | null>(null);
  const [draggingLayoutItem, setDraggingLayoutItem] = useState<{ groupId: string; itemId: string } | null>(null);
  const [fieldActionItemId, setFieldActionItemId] = useState('');
  const longPressTimerRef = useRef<number | null>(null);
  const [chartFieldMetaByTypeId, setChartFieldMetaByTypeId] = useState<Record<number, ChartFieldMetaMap>>({});
  const chartMetaFetchedRef = useRef<Set<number>>(new Set());

  const [workItemForm] = Form.useForm<WorkItemType>();
  const [settingsForm] = Form.useForm<WorkItemSettingsForm>();
  const [fieldForm] = Form.useForm<WorkItemFieldForm>();
  const [workflowConfigForm] = Form.useForm<{
    name: string;
    statusCalcRule?: string;
    advancedDependencyEnabled: boolean;
    customNodeInfo: string;
    displayPosition: string;
  }>();
  const [laneNodeForm] = Form.useForm<{
    name: string;
    statusTags?: string[];
    nextIds?: string[];
    subItems?: string[];
    subTaskDisplayOnCard?: boolean;
    subTasks?: Array<{ id: string; name: string; required: boolean }>;
    subWorkItemTypes?: string[];
    events?: string;
  }>();
  const [flowRoleForm] = Form.useForm<FlowRoleItem>();
  const [relationForm] = Form.useForm<SpaceRelationAuthForm>();

  const tabs = useMemo(
    () => [
      { key: 'spaceInfo', label: '空间信息' },
      { key: 'workItem', label: '工作项管理' },
      { key: 'permission', label: '权限管理' },
      { key: 'plugin', label: '插件管理' },
      { key: 'relation', label: '空间关联' },
      { key: 'automation', label: '自动化' },
    ],
    [],
  );

  const settingsReadonly =
    selectedWorkItem?.sourceType === 'reuse' && selectedWorkItem?.reuseBound === 1;
  const currentSpace = getCurrentSpace();
  const relationTargetSpaceOptions = useMemo(
    () =>
      getSpaceList()
        .filter((space) => space.id !== currentSpace.id)
        .map((space) => ({
          label: `${space.name} (${space.id})`,
          value: space.id,
        })),
    [currentSpace.id],
  );

  const currentLayoutTabs = useMemo(
    () => (layoutPageMode === 'detail' ? detailLayoutConfig.detailTabs : detailLayoutConfig.createTabs),
    [layoutPageMode, detailLayoutConfig.detailTabs, detailLayoutConfig.createTabs],
  );

  const activeDetailTab = useMemo(
    () => currentLayoutTabs.find((tab) => tab.id === activeDetailTabId),
    [currentLayoutTabs, activeDetailTabId],
  );

  const selectedLayoutItem = useMemo(() => {
    if (!selectedLayoutItemId || !activeDetailTab) return undefined;
    for (const group of activeDetailTab.groups) {
      const item = group.items.find((x) => x.id === selectedLayoutItemId);
      if (item) return item;
    }
    return undefined;
  }, [activeDetailTab, selectedLayoutItemId]);

  useEffect(() => {
    chartMetaFetchedRef.current.clear();
  }, [selectedWorkItem?.id]);

  useEffect(() => {
    if (!selectedWorkItem?.id) return;
    setChartFieldMetaByTypeId((prev) => ({
      ...prev,
      [selectedWorkItem.id]: buildChartFieldMetaMap(workItemFields),
    }));
    chartMetaFetchedRef.current.add(selectedWorkItem.id);
  }, [selectedWorkItem?.id, workItemFields]);

  const ensureChartFieldMeta = useCallback(async (workItemTypeId: number) => {
    if (!workItemTypeId || chartMetaFetchedRef.current.has(workItemTypeId)) return;
    chartMetaFetchedRef.current.add(workItemTypeId);
    try {
      const res = await fetchWorkItemFields(workItemTypeId);
      if (res.code === 0) {
        setChartFieldMetaByTypeId((prev) => ({
          ...prev,
          [workItemTypeId]: buildChartFieldMetaMap(res.data || []),
        }));
      }
    } catch {
      chartMetaFetchedRef.current.delete(workItemTypeId);
    }
  }, []);

  useEffect(() => {
    if (!selectedLayoutItem || selectedLayoutItem.sourceType !== 'chart' || !selectedLayoutItem.chartConfig) return;
    const tid = selectedLayoutItem.chartConfig.dataSource.workItemTypeId;
    if (!tid || tid === selectedWorkItem?.id) return;
    void ensureChartFieldMeta(tid);
  }, [
    selectedLayoutItem?.chartConfig?.dataSource.workItemTypeId,
    selectedLayoutItem?.sourceType,
    selectedLayoutItem?.chartConfig,
    selectedWorkItem?.id,
    ensureChartFieldMeta,
  ]);

  const chartWorkItemTypeOptions = useMemo(
    () =>
      (workItems || [])
        .filter((w) => w.id != null && Number(w.id) > 0)
        .map((w) => ({ value: Number(w.id), label: w.typeName || String(w.id) })),
    [workItems],
  );

  const chartPanelFieldMeta = useMemo(() => {
    if (!selectedLayoutItem?.chartConfig) return {} as ChartFieldMetaMap;
    const tid = selectedLayoutItem.chartConfig.dataSource.workItemTypeId;
    return chartFieldMetaByTypeId[tid] || {};
  }, [selectedLayoutItem, chartFieldMetaByTypeId]);

  const resourceLibrary = useMemo(() => {
    const fieldTypeGroupMap: Record<string, string> = {
      text: '文本',
      textarea: '文本',
      rich_text: '文本',
      single_select: '选择',
      multi_select: '选择',
      member: '人员',
      members: '人员',
      date: '日期',
      date_range: '日期',
      date_time: '日期',
      vote_attitude: '投票',
      vote_single: '投票',
      vote_multi: '投票',
      work_item_relation: '关联工作项',
      work_item_relation_multi: '关联工作项',
      number: '其他',
      switch: '其他',
      formula: '其他',
      url: '其他',
      attachment: '其他',
      multi_attachment: '其他',
      composite: '其他',
    };
    const groups: Record<string, Array<{ key: string; label: string; sourceType: DetailLayoutFieldItem['sourceType'] }>> = {
      文本: [],
      选择: [],
      人员: [],
      日期: [],
      投票: [],
      关联工作项: [],
      其他: [],
      图表: [
        { key: 'chart-metric_card', label: '指标卡', sourceType: 'chart' },
        { key: 'chart-pie', label: '饼图', sourceType: 'chart' },
        { key: 'chart-bar', label: '柱状图', sourceType: 'chart' },
        { key: 'chart-line', label: '折线图', sourceType: 'chart' },
        { key: 'chart-area', label: '面积图', sourceType: 'chart' },
        { key: 'chart-table', label: '表格', sourceType: 'chart' },
        { key: 'chart-burndown', label: '燃尽图（折线）', sourceType: 'chart' },
      ],
      控件: [{ key: 'control-divider', label: '分割线', sourceType: 'control' }],
      角色: [{ key: 'role-panel', label: '角色与人员', sourceType: 'role' }],
    };
    workItemFields.forEach((field) => {
      const group = fieldTypeGroupMap[field.fieldType] || '其他';
      groups[group].push({
        key: field.fieldKey,
        label: field.fieldName,
        sourceType: 'field',
      });
    });
    return groups;
  }, [workItemFields]);

  const filteredResourceLibrary = useMemo(() => {
    const keyword = resourceKeyword.trim().toLowerCase();
    if (!keyword) return resourceLibrary;
    const result: typeof resourceLibrary = {} as any;
    Object.entries(resourceLibrary).forEach(([group, resources]) => {
      result[group] = resources.filter((item) => item.label.toLowerCase().includes(keyword));
    });
    return result;
  }, [resourceLibrary, resourceKeyword]);

  const editingTabVisible = useMemo(
    () => detailLayoutConfig.detailTabs.find((tab) => tab.id === editingTabVisibleId),
    [detailLayoutConfig.detailTabs, editingTabVisibleId],
  );

  const mutateLayoutConfig = (updater: (cfg: DetailLayoutConfig) => DetailLayoutConfig) => {
    setDetailLayoutConfig((prev) => updater(prev));
  };

  const updateCurrentTabs = (updater: (tabs: DetailLayoutTab[]) => DetailLayoutTab[]) => {
    mutateLayoutConfig((prev) => {
      if (layoutPageMode === 'detail') {
        const nextDetailTabs = updater(prev.detailTabs);
        return {
          ...prev,
          detailTabs: nextDetailTabs,
          createTabs: JSON.parse(JSON.stringify(nextDetailTabs)),
        };
      }
      return {
        ...prev,
        createTabs: updater(prev.createTabs),
      };
    });
  };

  const startItemLongPress = (itemId: string) => {
    if (layoutPageMode !== 'detail') return;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTimerRef.current = window.setTimeout(() => {
      setSelectedLayoutItemId(itemId);
      setFieldActionItemId(itemId);
    }, 420);
  };

  const clearItemLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const renderFieldDisplayRow = (label: string, value: React.ReactNode) => {
    if (detailLayoutConfig.displayMode === 'side') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start' }}>
          <Typography.Text type="secondary">{label}</Typography.Text>
          <div style={{ fontWeight: 500 }}>{value}</div>
        </div>
      );
    }
    return (
      <div>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <div style={{ marginTop: 4, fontWeight: 500 }}>{value}</div>
      </div>
    );
  };

  const setSelectedLayoutItemPatch = (patch: Partial<DetailLayoutFieldItem>) => {
    if (!activeDetailTabId || !selectedLayoutItemId) return;
    updateCurrentTabs((tabs) =>
      tabs.map((tab) => {
        if (tab.id !== activeDetailTabId) return tab;
        return {
          ...tab,
          groups: tab.groups.map((group) => ({
            ...group,
            items: group.items.map((item) => (item.id === selectedLayoutItemId ? { ...item, ...patch } : item)),
          })),
        };
      }),
    );
  };

  const buildNewLayoutFieldItem = (
    resource: { key: string; label: string; sourceType: DetailLayoutFieldItem['sourceType'] },
    itemId: string,
  ): DetailLayoutFieldItem => {
    const base: DetailLayoutFieldItem = {
      id: itemId,
      sourceType: resource.sourceType,
      sourceKey: resource.key,
      label: resource.label,
      placeholder: '',
      helpText: '',
      visibleRule: defaultVisibleRule(),
      defaultValueMode: 'none',
      defaultValue: '',
      createVisible: true,
      required: false,
      width: 'full',
    };
    if (resource.sourceType === 'chart') {
      let chartConfig = getDefaultChartConfig(sourceKeyToChartWidgetType(resource.key));
      if (selectedWorkItem?.id) {
        chartConfig = {
          ...chartConfig,
          dataSource: { ...chartConfig.dataSource, workItemTypeId: selectedWorkItem.id },
        };
      }
      return { ...base, chartConfig };
    }
    return base;
  };

  const addItemToCurrentLayout = (resource: {
    key: string;
    label: string;
    sourceType: DetailLayoutFieldItem['sourceType'];
  }) => {
    if (!activeDetailTabId) return;
    const itemId = `${resource.sourceType}-${resource.key}-${Date.now()}`;
    updateCurrentTabs((tabs) =>
      tabs.map((tab) => {
        if (tab.id !== activeDetailTabId) return tab;
        const groups = tab.groups.length ? tab.groups : [{ id: `${tab.id}-group-1`, name: '未命名分组', items: [] }];
        const firstGroup = groups[0];
        const newItem = buildNewLayoutFieldItem(resource, itemId);
        return {
          ...tab,
          groups: groups.map((group) => (group.id === firstGroup.id ? { ...group, items: [...group.items, newItem] } : group)),
        };
      }),
    );
    setSelectedLayoutItemId(itemId);
    message.success(`已添加资源：${resource.label}`);
  };

  const addItemToGroup = (
    tabId: string,
    groupId: string,
    resource: { key: string; label: string; sourceType: DetailLayoutFieldItem['sourceType'] },
  ) => {
    const itemId = `${resource.sourceType}-${resource.key}-${Date.now()}`;
    updateCurrentTabs((tabs) =>
      tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          groups: tab.groups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  items: [...group.items, buildNewLayoutFieldItem(resource, itemId)],
                }
              : group,
          ),
        };
      }),
    );
    setSelectedLayoutItemId(itemId);
    message.success(`已添加到分组：${resource.label}`);
  };

  const addLayoutGroup = () => {
    if (!activeDetailTabId) return;
    updateCurrentTabs((tabs) =>
      tabs.map((tab) => {
        if (tab.id !== activeDetailTabId) return tab;
        const nextIndex = tab.groups.length + 1;
        return {
          ...tab,
          groups: [
            ...tab.groups,
            {
              id: `${tab.id}-group-${Date.now()}`,
              name: `分组${nextIndex}`,
              items: [],
            },
          ],
        };
      }),
    );
  };

  const removeLayoutItem = (itemId: string) => {
    if (!activeDetailTabId) return;
    updateCurrentTabs((tabs) =>
      tabs.map((tab) => {
        if (tab.id !== activeDetailTabId) return tab;
        return {
          ...tab,
          groups: tab.groups.map((group) => ({
            ...group,
            items: group.items.filter((item) => item.id !== itemId),
          })),
        };
      }),
    );
    if (selectedLayoutItemId === itemId) {
      setSelectedLayoutItemId('');
    }
  };

  const moveLayoutItem = (groupId: string, itemId: string, direction: 'up' | 'down') => {
    if (!activeDetailTabId) return;
    updateCurrentTabs((tabs) =>
      tabs.map((tab) => {
        if (tab.id !== activeDetailTabId) return tab;
        return {
          ...tab,
          groups: tab.groups.map((group) => {
            if (group.id !== groupId) return group;
            const idx = group.items.findIndex((x) => x.id === itemId);
            if (idx < 0) return group;
            const target = direction === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= group.items.length) return group;
            const nextItems = [...group.items];
            const tmp = nextItems[idx];
            nextItems[idx] = nextItems[target];
            nextItems[target] = tmp;
            return { ...group, items: nextItems };
          }),
        };
      }),
    );
  };

  const reorderLayoutItemByDrag = (groupId: string, targetItemId: string) => {
    if (!draggingLayoutItem || !activeDetailTabId || draggingLayoutItem.groupId !== groupId) return;
    updateCurrentTabs((tabs) =>
      tabs.map((tab) => {
        if (tab.id !== activeDetailTabId) return tab;
        return {
          ...tab,
          groups: tab.groups.map((group) => {
            if (group.id !== groupId) return group;
            const fromIndex = group.items.findIndex((x) => x.id === draggingLayoutItem.itemId);
            const toIndex = group.items.findIndex((x) => x.id === targetItemId);
            if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return group;
            const nextItems = [...group.items];
            const [moved] = nextItems.splice(fromIndex, 1);
            nextItems.splice(toIndex, 0, moved);
            return { ...group, items: nextItems };
          }),
        };
      }),
    );
  };

  const addLayoutTab = () => {
    if (layoutPageMode === 'create') return;
    const tabId = `tab-custom-${Date.now()}`;
    mutateLayoutConfig((prev) => ({
      ...prev,
      detailTabs: [
        ...prev.detailTabs,
        {
          id: tabId,
          name: '新增tab',
          visibleRule: defaultVisibleRule(),
          memberScope: { users: [], teams: [], roles: [] },
          groups: [{ id: `${tabId}-group-1`, name: '未命名分组', items: [] }],
        },
      ],
      createTabs: [
        ...prev.createTabs,
        {
          id: tabId,
          name: '新增tab',
          visibleRule: defaultVisibleRule(),
          memberScope: { users: [], teams: [], roles: [] },
          groups: [{ id: `${tabId}-group-1`, name: '未命名分组', items: [] }],
        },
      ],
    }));
    setActiveDetailTabId(tabId);
    setSelectedLayoutItemId('');
  };

  const removeLayoutTab = (tabId: string) => {
    if (layoutPageMode === 'create') return;
    setDetailLayoutConfig((prev) => {
      const detailRest = prev.detailTabs.filter((tab) => tab.id !== tabId);
      const createRest = prev.createTabs.filter((tab) => tab.id !== tabId);
      if (activeDetailTabId === tabId) {
        setActiveDetailTabId(detailRest[0]?.id || '');
        setSelectedLayoutItemId('');
      }
      return { ...prev, detailTabs: detailRest, createTabs: createRest };
    });
  };

  const updateCurrentTab = (patch: Partial<DetailLayoutTab>) => {
    if (!activeDetailTabId) return;
    updateCurrentTabs((tabs) => tabs.map((tab) => (tab.id === activeDetailTabId ? { ...tab, ...patch } : tab)));
  };

  const updateTabVisibleRule = (
    tabId: string,
    rule: DetailLayoutVisibleRule,
    memberScope?: DetailLayoutTab['memberScope'],
  ) => {
    if (layoutPageMode === 'create') return;
    mutateLayoutConfig((prev) => ({
      ...prev,
      detailTabs: prev.detailTabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              visibleRule: rule,
              memberScope: memberScope || tab.memberScope,
            }
          : tab,
      ),
    }));
  };

  const workItemColumns = useMemo(
    () => [
      {
        title: '工作项类型',
        dataIndex: 'typeName',
        render: (_: any, record: WorkItemType) => (
          <Space>
            <Typography.Text strong>{record.typeName}</Typography.Text>
            <Tag>{itemCategoryText[record.itemCategory || 'custom'] || '自定义'}</Tag>
          </Space>
        ),
      },
      { title: '编码', dataIndex: 'typeCode' },
      {
        title: '创建方式',
        dataIndex: 'sourceType',
        render: (v: string) => <Tag color={v === 'reuse' ? 'blue' : 'green'}>{v === 'reuse' ? '复用' : '新建'}</Tag>,
      },
      { title: '默认负责人角色', dataIndex: 'ownerRole' },
      {
        title: '流程模式',
        dataIndex: 'flowMode',
        render: (v: string) => (v === 'node' ? '节点模式（流程图）' : '状态模式'),
      },
      { title: '流程模板', dataIndex: 'workflowName' },
      { title: '必填字段策略', dataIndex: 'requiredPolicy' },
      {
        title: 'SLA',
        dataIndex: 'slaHours',
        render: (v: number) => (v ? `${v} 小时` : '-'),
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (_: any, record: WorkItemType) => (
          <Switch
            checked={record.status === 1}
            onChange={async (checked) => {
              if (!record.id) return;
              await changeWorkItemStatus(record.id, checked ? 1 : 0);
              message.success('状态已更新');
              loadWorkItems();
            }}
          />
        ),
      },
      {
        title: '操作',
        dataIndex: 'action',
        render: (_: any, record: WorkItemType) => (
          <Space>
            <Button
              type="link"
              onClick={() => {
                setEditingWorkItem(record);
                workItemForm.setFieldsValue(record);
                loadReuseCandidates();
                setWorkItemModalOpen(true);
              }}
            >
              编辑
            </Button>
            <Button
              type="link"
              onClick={() => {
                if (!record.id) return;
                openWorkItemSettings(record.id);
              }}
            >
              配置
            </Button>
            {record.sourceType === 'reuse' && record.reuseBound === 1 && (
              <Popconfirm
                title="确认解除配置同步？解除后不可再复用"
                onConfirm={async () => {
                  if (!record.id) return;
                  const res = await unbindReuseWorkItem(record.id);
                  if (res.code !== 0) {
                    message.error(res.message || '解绑失败');
                    return;
                  }
                  message.success('已解除配置同步');
                  loadWorkItems();
                  if (selectedWorkItem?.id === record.id && settingsDrawerOpen) {
                    openWorkItemSettings(record.id);
                  }
                }}
              >
                <Button type="link">解绑同步</Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="确认删除该工作项类型？"
              onConfirm={async () => {
                if (!record.id) return;
                await deleteWorkItem(record.id);
                message.success('删除成功');
                loadWorkItems();
              }}
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [selectedWorkItem?.id, settingsDrawerOpen, workItemForm],
  );

  const relationColumns = useMemo(
    () => [
      {
        title: '目标空间',
        dataIndex: 'targetSpaceId',
        render: (targetSpaceId: string) =>
          relationTargetSpaceOptions.find((x) => x.value === targetSpaceId)?.label || targetSpaceId,
      },
      {
        title: '授权范围',
        dataIndex: 'resourceType',
        render: (resourceType: string) =>
          resourceType === 'work_item_record' ? <Tag color="purple">记录级</Tag> : <Tag color="blue">类型级</Tag>,
      },
      {
        title: '资源标识',
        dataIndex: 'resourceKey',
        render: (resourceKey?: string) =>
          resourceKey ? <Typography.Text code>{resourceKey}</Typography.Text> : <Tag color="green">全部</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (status: number, record: SpaceRelationAuth) => (
          <Switch
            checked={status === 1}
            onChange={async (checked) => {
              if (!record.id) return;
              const res = await updateSpaceRelationAuth(record.id, {
                ...record,
                status: checked ? 1 : 0,
              });
              if (res.code !== 0) {
                message.error(res.message || '更新失败');
                return;
              }
              message.success('状态已更新');
              loadSpaceRelationAuths();
            }}
          />
        ),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        render: (remark?: string) => remark || '-',
      },
      {
        title: '操作',
        dataIndex: 'action',
        render: (_: any, record: SpaceRelationAuth) => (
          <Space>
            <Button type="link" onClick={() => openEditRelationAuth(record)}>
              编辑
            </Button>
            <Popconfirm
              title="确认删除该授权？"
              onConfirm={async () => {
                if (!record.id) return;
                const res = await deleteSpaceRelationAuth(record.id);
                if (res.code !== 0) {
                  message.error(res.message || '删除失败');
                  return;
                }
                message.success('授权已删除');
                loadSpaceRelationAuths();
              }}
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [relationTargetSpaceOptions],
  );

  const fieldColumns = useMemo(
    () => [
      { title: '字段名称', dataIndex: 'fieldName' },
      { title: '字段标识', dataIndex: 'fieldKey' },
      { title: '字段类型', dataIndex: 'fieldType' },
      {
        title: '授权角色',
        dataIndex: 'authorizedRoles',
        render: (v: string) => {
          const values = (v || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean);
          if (!values.length) return '-';
          return (
            <Space wrap>
              {values.map((x) => (
                <Tag key={x}>{x}</Tag>
              ))}
            </Space>
          );
        },
      },
      {
        title: '默认值规则',
        dataIndex: 'defaultValueMode',
        render: (v: string, record: WorkItemField) => {
          const mode = v || 'none';
          if (mode === 'none') return '不展示默认值';
          if (mode === 'fixed') return `固定默认值：${record.defaultValue || '-'}`;
          return `条件展示：${record.defaultValue || '-'}`;
        },
      },
      {
        title: '状态',
        dataIndex: 'isEnabled',
        render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
      },
      {
        title: '操作',
        dataIndex: 'action',
        render: (_: any, record: WorkItemField) => (
          <Space>
            <Button
              type="link"
              disabled={settingsReadonly}
              onClick={() => {
                setEditingField(record);
                const parsedOptionMeta = parseFieldOptionsJson(record.optionsJson);
                fieldForm.setFieldsValue({
                  ...record,
                  authorizedRoleList: (record.authorizedRoles || '')
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                  fieldOptions: parsedOptionMeta.options,
                  allowUserAddOption: parsedOptionMeta.allowUserAddOption,
                  repeatCheckEnabled: parsedOptionMeta.repeatCheckEnabled,
                  batchCreateToOthers: parsedOptionMeta.batchCreateToOthers,
                  memberAutoJoin: parsedOptionMeta.memberAutoJoin,
                  timeAutoFillRule: parsedOptionMeta.timeAutoFillRule,
                  voteResultSwitchField: parsedOptionMeta.voteResultSwitchField,
                  formulaExpression: parsedOptionMeta.formulaExpression,
                  formulaResultType: parsedOptionMeta.formulaResultType,
                  freezeFormulaResult: parsedOptionMeta.freezeFormulaResult,
                  numberScaleMode: parsedOptionMeta.numberScaleMode,
                  numberSymbol: parsedOptionMeta.numberSymbol,
                  numberDecimalPlaces: parsedOptionMeta.numberDecimalPlaces,
                  numberUseThousands: parsedOptionMeta.numberUseThousands,
                  maxLength: parsedOptionMeta.maxLength,
                  numberMode: parsedOptionMeta.numberMode,
                  numberMin: parsedOptionMeta.numberMin,
                  numberMax: parsedOptionMeta.numberMax,
                  numberPrecision: parsedOptionMeta.numberPrecision,
                  readonlyFlag: parsedOptionMeta.readonlyFlag,
                  showInDetailFlag: parsedOptionMeta.showInDetailFlag,
                  relationKind: parsedOptionMeta.relationKind,
                  relationId: parsedOptionMeta.relationId,
                  relationVisibleScope: parsedOptionMeta.relationVisibleScope,
                  relationDataRangeCount: parsedOptionMeta.relationDataRangeCount,
                  relationExtraDisplayEnabled: parsedOptionMeta.relationExtraDisplayEnabled,
                  optionConfigMode: 'custom',
                  selectableLevel: record.fieldType === 'multi_select' ? 'at_least_one_level' : 'leaf_only',
                  isEnabledFlag: record.isEnabled === 1,
                  isRequiredFlag: record.isRequired === 1,
                });
                setFormulaDraft(parsedOptionMeta.formulaExpression || '');
                setFieldModalOpen(true);
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除该字段？"
              disabled={settingsReadonly}
              onConfirm={async () => {
                if (!selectedWorkItem?.id || !record.id) return;
                const res = await deleteWorkItemField(selectedWorkItem.id, record.id);
                if (res.code !== 0) {
                  message.error(res.message || '删除字段失败');
                  return;
                }
                message.success('字段删除成功');
                loadWorkItemFields(selectedWorkItem.id);
              }}
            >
              <Button type="link" danger disabled={settingsReadonly}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [fieldForm, selectedWorkItem?.id, settingsReadonly],
  );

  const switchFieldOptions = useMemo(
    () =>
      (workItemFields || [])
        .filter((f) => f.fieldType === 'switch')
        .map((f) => ({ label: `${f.fieldName} (${f.fieldKey})`, value: f.fieldKey || '' }))
        .filter((f) => !!f.value),
    [workItemFields],
  );

  useEffect(() => {
    if (activeTab === 'workItem') {
      loadWorkItems();
    }
    if (activeTab === 'relation') {
      loadSpaceRelationAuths();
    }
  }, [activeTab]);

  // 字段配置弹窗打开时，如果是 relation 字段且尚未加载 relation 列表，则补载一次
  useEffect(() => {
    if (!fieldModalOpen) return;
    const fieldType = fieldForm.getFieldValue('fieldType');
    const isRelationType = relationFieldTypes.includes(fieldType);
    if (!isRelationType) return;
    if (relationAuths.length) return;
    if (relationLoading) return;
    loadSpaceRelationAuths();
  }, [fieldModalOpen, relationAuths.length, relationLoading]);

  useEffect(() => {
    const syncSpaceName = () => {
      const current = getCurrentSpace();
      setSpaceName(current.name || '');
      setSpaceIcon(current.icon || '🥮');
      if (activeTab === 'workItem') {
        loadWorkItems();
      }
      if (activeTab === 'relation') {
        loadSpaceRelationAuths();
      }
    };
    window.addEventListener(SPACE_CHANGED_EVENT, syncSpaceName as EventListener);
    return () => {
      window.removeEventListener(SPACE_CHANGED_EVENT, syncSpaceName as EventListener);
    };
  }, [activeTab]);

  useEffect(() => {
    if (!detailLayoutConfig.detailTabs.length || !detailLayoutConfig.createTabs.length) return;
    settingsForm.setFieldValue('detailLayoutJson', JSON.stringify(detailLayoutConfig));
  }, [detailLayoutConfig, settingsForm]);

  useEffect(() => {
    if (!workflowCards.length) return;
    settingsForm.setFieldValue('flowRuleJson', stringifyWorkflowCards(workflowCards));
  }, [workflowCards, settingsForm]);

  useEffect(() => {
    if (!currentLayoutTabs.length) {
      setActiveDetailTabId('');
      return;
    }
    if (!activeDetailTabId || !currentLayoutTabs.some((tab) => tab.id === activeDetailTabId)) {
      setActiveDetailTabId(currentLayoutTabs[0].id);
    }
  }, [activeDetailTabId, currentLayoutTabs]);

  useEffect(() => {
    if (!previewLayoutOpen) return;
    if (!currentLayoutTabs.length) {
      setPreviewActiveTabId('');
      return;
    }
    if (!previewActiveTabId || !currentLayoutTabs.some((tab) => tab.id === previewActiveTabId)) {
      setPreviewActiveTabId(currentLayoutTabs[0].id);
    }
  }, [previewLayoutOpen, previewActiveTabId, currentLayoutTabs]);

  useEffect(() => {
    setFieldActionItemId('');
    clearItemLongPress();
  }, [layoutPageMode, activeDetailTabId]);

  const loadWorkItems = async () => {
    setWorkItemLoading(true);
    try {
      const res = await fetchWorkItemPage({ current: 1, pageSize: 100 });
      if (res.code === 0) {
        setWorkItems(res.data.records || []);
      } else {
        message.error(res.message || '加载工作项失败');
      }
    } catch (e: any) {
      message.error(e?.message || '加载工作项失败');
    } finally {
      setWorkItemLoading(false);
    }
  };

  const loadSpaceRelationAuths = async () => {
    setRelationLoading(true);
    try {
      const res = await fetchSpaceRelationAuths();
      if (res.code === 0) {
        setRelationAuths(res.data || []);
      } else {
        message.error(res.message || '加载空间关联授权失败');
      }
    } catch (e: any) {
      message.error(e?.message || '加载空间关联授权失败');
    } finally {
      setRelationLoading(false);
    }
  };

  const openCreateRelationAuth = () => {
    setEditingRelation(null);
    relationForm.resetFields();
    relationForm.setFieldsValue({
      targetSpaceId: undefined as any,
      resourceType: 'work_item_type',
      resourceKeyMode: 'all',
      resourceKey: '',
      status: 1,
      remark: '',
    });
    setRelationModalOpen(true);
  };

  const openEditRelationAuth = (record: SpaceRelationAuth) => {
    setEditingRelation(record);
    relationForm.setFieldsValue({
      id: record.id,
      targetSpaceId: record.targetSpaceId,
      resourceType: (record.resourceType || 'work_item_type') as 'work_item_type' | 'work_item_record',
      resourceKeyMode: record.resourceKey ? 'single' : 'all',
      resourceKey: record.resourceKey || '',
      status: record.status ?? 1,
      remark: record.remark || '',
    });
    setRelationModalOpen(true);
  };

  const submitRelationAuth = async () => {
    const values = await relationForm.validateFields();
    const payload: SpaceRelationAuth = {
      targetSpaceId: values.targetSpaceId,
      resourceType: values.resourceType,
      resourceKey: values.resourceKeyMode === 'single' ? (values.resourceKey || '').trim() : undefined,
      status: values.status ?? 1,
      remark: (values.remark || '').trim(),
    };
    if (values.resourceKeyMode === 'single' && !payload.resourceKey) {
      message.error('请填写资源标识');
      return;
    }
    const res =
      editingRelation?.id != null
        ? await updateSpaceRelationAuth(editingRelation.id, payload)
        : await createSpaceRelationAuth(payload);
    if (res.code !== 0) {
      message.error(res.message || '保存授权失败');
      return;
    }
    message.success(editingRelation?.id ? '授权已更新' : '授权已创建');
    setRelationModalOpen(false);
    loadSpaceRelationAuths();
  };

  const openCreateWorkItem = () => {
    setEditingWorkItem(null);
    workItemForm.resetFields();
    workItemForm.setFieldsValue({
      sourceType: 'custom',
      itemCategory: 'custom',
      flowMode: 'state',
      status: 1,
    });
    loadReuseCandidates();
    setWorkItemModalOpen(true);
  };

  const loadReuseCandidates = async () => {
    try {
      const res = await fetchAllWorkItems();
      if (res.code === 0) {
        setReuseCandidates(res.data || []);
      }
    } catch {
      // ignore
    }
  };

  const openWorkItemSettings = async (workItemId: number) => {
    setSettingsDrawerOpen(true);
    setSettingsDrawerFullscreen(false);
    setSettingsTab('basic');
    setSettingsLoading(true);
    try {
      const [settingsRes, fieldsRes] = await Promise.all([
        fetchWorkItemSettings(workItemId),
        fetchWorkItemFields(workItemId),
      ]);

      if (settingsRes.code !== 0) {
        message.error(settingsRes.message || '加载工作项配置失败');
        return;
      }

      const settings = settingsRes.data;
      setSelectedWorkItem(settings);
      setWorkflowCards(normalizeWorkflowCards(settings.flowRuleJson, settings.typeName || '工作项'));
      settingsForm.setFieldsValue({
        ...settings,
        copyFieldsList: parseJsonArray(settings.copyFieldsJson),
        copyRolesList: parseJsonArray(settings.copyRolesJson),
        baselineEnabledFlag: settings.baselineEnabled === 1,
        navEntryEnabledFlag: settings.navEntryEnabled === 1,
        statusFlag: settings.status === 1,
      });

      if (fieldsRes.code === 0) {
        const nextFields = fieldsRes.data || [];
        setWorkItemFields(nextFields);
        const nextLayout = toLayoutConfig(settings.detailLayoutJson, nextFields, settings.typeName);
        setDetailLayoutConfig(nextLayout);
        setLayoutPageMode('detail');
        setActiveDetailTabId(nextLayout.detailTabs[0]?.id || nextLayout.createTabs[0]?.id || '');
        setSelectedLayoutItemId('');
        settingsForm.setFieldValue('detailLayoutJson', JSON.stringify(nextLayout));
      } else {
        message.error(fieldsRes.message || '加载字段列表失败');
      }
    } catch (e: any) {
      message.error(e?.message || '加载工作项配置失败');
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadWorkItemFields = async (workItemId: number) => {
    setFieldLoading(true);
    try {
      const res = await fetchWorkItemFields(workItemId);
      if (res.code === 0) {
        setWorkItemFields(res.data || []);
      } else {
        message.error(res.message || '加载字段列表失败');
      }
    } catch (e: any) {
      message.error(e?.message || '加载字段列表失败');
    } finally {
      setFieldLoading(false);
    }
  };

  const submitWorkItem = async () => {
    const values = await workItemForm.validateFields();
    if (values.sourceType !== 'reuse') {
      const nextCode = (values.typeCode || '').trim();
      const duplicate = workItems.find((x) => x.typeCode?.trim() === nextCode && x.id !== editingWorkItem?.id);
      if (duplicate) {
        message.error('类型编码已存在，请使用其他编码');
        return;
      }
    }
    const res = await saveWorkItem({
      ...editingWorkItem,
      ...values,
    });
    if (res.code !== 0) {
      message.error(res.message || '保存失败');
      return;
    }
    message.success(editingWorkItem ? '保存成功' : '新增成功');
    setWorkItemModalOpen(false);
    loadWorkItems();
  };

  const buildSettingsPayload = (values: WorkItemSettingsForm, overrides?: Partial<WorkItemType>): WorkItemType => {
    const payload: WorkItemType = {
      ...selectedWorkItem,
      ...values,
      ...overrides,
      copyFieldsJson: JSON.stringify(values.copyFieldsList || []),
      copyRolesJson: JSON.stringify(values.copyRolesList || []),
      detailLayoutJson: JSON.stringify(detailLayoutConfig),
      baselineEnabled: values.baselineEnabledFlag ? 1 : 0,
      navEntryEnabled: values.navEntryEnabledFlag ? 1 : 0,
      status: values.statusFlag ? 1 : 0,
    };

    delete (payload as any).copyFieldsList;
    delete (payload as any).copyRolesList;
    delete (payload as any).baselineEnabledFlag;
    delete (payload as any).navEntryEnabledFlag;
    delete (payload as any).statusFlag;
    return payload;
  };

  const submitWorkItemSettings = async () => {
    if (!selectedWorkItem?.id) {
      message.error('未选择工作项');
      return;
    }

    const values = await settingsForm.validateFields();

    const collectChartEntries = (tabs: DetailLayoutTab[]) => {
      const acc: { label: string; config: ChartConfigV1 }[] = [];
      for (const tab of tabs) {
        for (const g of tab.groups) {
          for (const it of g.items) {
            if (it.sourceType !== 'chart') continue;
            const config =
              it.chartConfig ||
              getDefaultChartConfig(sourceKeyToChartWidgetType(String(it.sourceKey || 'chart-bar')));
            acc.push({ label: it.label, config });
          }
        }
      }
      return acc;
    };
    const chartEntries = [
      ...collectChartEntries(detailLayoutConfig.detailTabs),
      ...collectChartEntries(detailLayoutConfig.createTabs),
    ];
    const chartTypeIds = [...new Set(chartEntries.map((e) => e.config.dataSource.workItemTypeId).filter((id) => id > 0))];
    const metaByType: Record<number, ChartFieldMetaMap> = {};
    for (const id of chartTypeIds) {
      const res = await fetchWorkItemFields(id);
      if (res.code !== 0) {
        message.error(res.message || `无法加载工作项类型 ${id} 的字段，图表校验中止`);
        return;
      }
      metaByType[id] = buildChartFieldMetaMap(res.data || []);
    }
    for (const { label, config } of chartEntries) {
      const tid = config.dataSource.workItemTypeId;
      const meta = metaByType[tid] || {};
      const { valid, errors } = validateChartConfig(config, meta);
      if (!valid) {
        message.error(`图表「${label}」未通过校验：${errors.map((e) => e.message).join('；')}`);
        return;
      }
    }

    const payload = buildSettingsPayload(values);

    setSettingsSaving(true);
    try {
      const res = await saveWorkItemSettings(selectedWorkItem.id, payload);
      if (res.code !== 0) {
        message.error(res.message || '保存配置失败');
        return;
      }
      message.success('配置已保存');
      await openWorkItemSettings(selectedWorkItem.id);
      loadWorkItems();
    } catch (e: any) {
      message.error(e?.message || '保存配置失败');
    } finally {
      setSettingsSaving(false);
    }
  };

  const openCreateField = () => {
    setEditingField(null);
    fieldForm.resetFields();
    setFormulaDraft('');
    fieldForm.setFieldsValue({
      fieldType: 'text',
      defaultValueMode: 'none',
      maxLength: undefined,
      numberMode: 'decimal',
      numberMin: undefined,
      numberMax: undefined,
      numberPrecision: undefined,
      readonlyFlag: false,
      showInDetailFlag: true,
      fieldOptions: [],
      allowUserAddOption: false,
      repeatCheckEnabled: false,
      batchCreateToOthers: false,
      memberAutoJoin: false,
      timeAutoFillRule: 'none',
      voteResultSwitchField: undefined,
      formulaExpression: '',
      formulaResultType: 'number',
      freezeFormulaResult: true,
      numberScaleMode: 'origin',
      numberSymbol: 'none',
      numberDecimalPlaces: 'unlimited',
      numberUseThousands: false,
      relationId: undefined,
      relationKind: undefined,
      relationVisibleScope: 'fixed',
      relationDataRangeCount: 0,
      relationExtraDisplayEnabled: false,
      optionConfigMode: 'custom',
      selectableLevel: 'leaf_only',
      isEnabledFlag: true,
      isRequiredFlag: false,
    });
    setFieldModalOpen(true);
  };

  const submitField = async () => {
    if (!selectedWorkItem?.id) return;
    const values = await fieldForm.validateFields();
    if (values.fieldType === 'formula' && !(values.formulaExpression || '').trim()) {
      message.error('请先配置计算公式');
      return;
    }
    if (values.fieldType === 'formula') {
      const fieldByKey = workItemFields.reduce<Record<string, WorkItemField>>((acc, f) => {
        if (f.fieldKey) acc[f.fieldKey] = f;
        return acc;
      }, {});
      const selfKey = values.fieldKey || editingField?.fieldKey;
      const ferr = validateFormulaReferences(values.formulaExpression || '', fieldByKey, selfKey);
      if (ferr) {
        message.error(ferr);
        return;
      }
    }
    if (
      (values.fieldType === 'work_item_relation' || values.fieldType === 'work_item_relation_multi') &&
      !values.relationId
    ) {
      message.error('请选择关系模型');
      return;
    }

    const formErr = validateFieldFormBeforeSave(values.fieldType || '', values);
    if (formErr) {
      message.error(formErr);
      return;
    }
    const builtOptions = buildFieldOptionsJson(values);
    const optionsJsonNormalized = finalizeFieldOptionsJsonString(values.fieldType || '', builtOptions) ?? builtOptions;
    const pairErr = validateOptionPairsInJson(values.fieldType || '', optionsJsonNormalized);
    if (pairErr) {
      message.error(pairErr);
      return;
    }

    const payload: WorkItemField = {
      ...editingField,
      ...values,
      authorizedRoles: (values.authorizedRoleList || []).join(','),
      optionsJson: optionsJsonNormalized,
      isEnabled: values.isEnabledFlag ? 1 : 0,
      isRequired: values.isRequiredFlag ? 1 : 0,
    };

    delete (payload as any).authorizedRoleList;
    delete (payload as any).fieldOptions;
    delete (payload as any).allowUserAddOption;
    delete (payload as any).repeatCheckEnabled;
    delete (payload as any).batchCreateToOthers;
    delete (payload as any).memberAutoJoin;
    delete (payload as any).timeAutoFillRule;
    delete (payload as any).voteResultSwitchField;
    delete (payload as any).formulaExpression;
    delete (payload as any).formulaResultType;
    delete (payload as any).freezeFormulaResult;
    delete (payload as any).readonlyFlag;
    delete (payload as any).showInDetailFlag;
    delete (payload as any).numberScaleMode;
    delete (payload as any).numberSymbol;
    delete (payload as any).numberDecimalPlaces;
    delete (payload as any).numberUseThousands;
    delete (payload as any).maxLength;
    delete (payload as any).numberMode;
    delete (payload as any).numberMin;
    delete (payload as any).numberMax;
    delete (payload as any).numberPrecision;
    delete (payload as any).relationKind;
    delete (payload as any).relationId;
    delete (payload as any).relationVisibleScope;
    delete (payload as any).relationDataRangeCount;
    delete (payload as any).relationExtraDisplayEnabled;
    delete (payload as any).optionConfigMode;
    delete (payload as any).selectableLevel;
    delete (payload as any).isEnabledFlag;
    delete (payload as any).isRequiredFlag;

    const res = editingField?.id
      ? await updateWorkItemField(selectedWorkItem.id, editingField.id, payload)
      : await createWorkItemField(selectedWorkItem.id, payload);

    if (res.code !== 0) {
      message.error(res.message || '字段保存失败');
      return;
    }

    message.success(editingField?.id ? '字段更新成功' : '字段新增成功');
    setFieldModalOpen(false);
    loadWorkItemFields(selectedWorkItem.id);
  };

  const renderSectionTitle = (title: string) => (
    <Space size={8} style={{ marginBottom: 8 }}>
      <span style={{ width: 4, height: 24, borderRadius: 2, background: '#2f54eb', display: 'inline-block' }} />
      <Typography.Text strong style={{ fontSize: 34 / 2 }}>
        {title}
      </Typography.Text>
    </Space>
  );

  const openFormulaEditor = () => {
    setFormulaDraft(fieldForm.getFieldValue('formulaExpression') || '');
    setFormulaModalOpen(true);
  };

  const applyFormulaEditor = () => {
    fieldForm.setFieldValue('formulaExpression', formulaDraft);
    setFormulaModalOpen(false);
  };

  const promptWorkflowName = (
    title: string,
    defaultValue: string,
    onSubmit: (name: string) => void,
  ) => {
    let nextName = defaultValue;
    Modal.confirm({
      title,
      content: (
        <Input
          autoFocus
          defaultValue={defaultValue}
          maxLength={50}
          onChange={(e) => {
            nextName = e.target.value;
          }}
          placeholder="请输入流程名称"
        />
      ),
      onOk: () => {
        const finalName = (nextName || '').trim();
        if (!finalName) {
          message.warning('流程名称不能为空');
          return Promise.reject();
        }
        onSubmit(finalName);
        return Promise.resolve();
      },
    });
  };

  const createWorkflowCard = () => {
    promptWorkflowName('新建流程', `${selectedWorkItem?.typeName || '工作项'}流程`, (name) => {
      setWorkflowCards((prev) => [
        ...prev,
        {
          id: `flow-${Date.now()}`,
          name,
          version: prev.length + 1,
          enabled: true,
          statusCalcRule: '',
          advancedDependencyEnabled: true,
          customNodeInfo: '延期标识',
          displayPosition: '节点名称右侧',
          transitions: [{ from: 'OPEN', to: 'CLOSED' }],
        },
      ]);
      message.success('流程已创建');
    });
  };

  const renameWorkflowCard = (cardId: string) => {
    const target = workflowCards.find((x) => x.id === cardId);
    if (!target) return;
    promptWorkflowName('修改名称', target.name, (name) => {
      setWorkflowCards((prev) => prev.map((x) => (x.id === cardId ? { ...x, name } : x)));
      message.success('流程名称已更新');
    });
  };

  const duplicateWorkflowCard = (cardId: string) => {
    const target = workflowCards.find((x) => x.id === cardId);
    if (!target) return;
    setWorkflowCards((prev) => [
      ...prev,
      {
        ...target,
        id: `flow-${Date.now()}`,
        name: `${target.name} 副本`,
        version: Math.max(...prev.map((x) => x.version || 0), 0) + 1,
      },
    ]);
    message.success('流程副本已创建');
  };

  const toggleWorkflowCardStatus = (cardId: string) => {
    setWorkflowCards((prev) =>
      prev.map((x) => (x.id === cardId ? { ...x, enabled: !x.enabled } : x)),
    );
  };

  const deleteWorkflowCard = (cardId: string) => {
    if (workflowCards.length <= 1) {
      message.warning('至少保留一个流程');
      return;
    }
    setWorkflowCards((prev) => prev.filter((x) => x.id !== cardId));
    message.success('流程已删除');
  };

  const renderWorkflowThumbnail = (card: WorkflowCard) => {
    const transitions = card.transitions.slice(0, 3);
    return (
      <Space align="center" wrap>
        {transitions.map((item, index) => (
          <React.Fragment key={`${item.from}-${item.to}-${index}`}>
            <Tag color="blue" style={{ marginRight: 0 }}>
              {item.from || 'START'}
            </Tag>
            <Typography.Text type="secondary">→</Typography.Text>
            <Tag color="processing" style={{ marginLeft: 0 }}>
              {item.to || 'END'}
            </Tag>
            {index < transitions.length - 1 && <Typography.Text type="secondary">···</Typography.Text>}
          </React.Fragment>
        ))}
      </Space>
    );
  };

  const activeWorkflowCard = useMemo(
    () => workflowCards.find((item) => item.id === activeWorkflowCardId),
    [workflowCards, activeWorkflowCardId],
  );

  const buildDefaultLaneConfig = (card: WorkflowCard) => {
    const roles = [
      { id: 'role-1', name: '项目经理' },
      { id: 'role-2', name: '方案设计' },
      { id: 'role-3', name: '商务代表' },
    ];
    const stages = [
      { id: 'stage-1', name: '立项' },
      { id: 'stage-2', name: '方案' },
      { id: 'stage-3', name: '交付' },
    ];
    const nodes = (card.transitions || []).flatMap((transition, idx) => [
      {
        id: `node-${idx + 1}-a`,
        name: transition.from || `节点${idx + 1}`,
        roleId: roles[idx % roles.length].id,
        stageId: stages[Math.min(idx, stages.length - 1)].id,
        laneOrder: 0,
        laneRow: 0,
        nextIds: [`node-${idx + 1}-b`],
        statusTags: [],
        subItems: [],
        subTaskDisplayOnCard: true,
        subTasks: [],
        subWorkItemTypes: [],
        events: '',
      },
      {
        id: `node-${idx + 1}-b`,
        name: transition.to || `节点${idx + 1}-完成`,
        roleId: roles[(idx + 1) % roles.length].id,
        stageId: stages[Math.min(idx + 1, stages.length - 1)].id,
        laneOrder: 0,
        laneRow: 0,
        nextIds: [],
        statusTags: [],
        subItems: [],
        subTaskDisplayOnCard: true,
        subTasks: [],
        subWorkItemTypes: [],
        events: '',
      },
    ]);
    return { roles, stages, nodes, showLines: true };
  };

  const autoArrangeLaneNodes = (
    inputNodes: typeof laneNodes,
    inputRoles: typeof laneRoles,
    inputStages: typeof laneStages,
  ) => {
    if (!inputNodes.length || !inputRoles.length || !inputStages.length) return inputNodes;
    const stageIndexById = new Map(inputStages.map((s, idx) => [s.id, idx]));
    const nodeMap = new Map(
      inputNodes.map((n) => [
        n.id,
        {
          ...n,
          roleId: inputRoles.find((r) => r.id === n.roleId)?.id || inputRoles[0].id,
          stageId: inputStages.find((s) => s.id === n.stageId)?.id || inputStages[0].id,
        },
      ]),
    );
    const next = Array.from(nodeMap.values());
    for (let round = 0; round < next.length; round += 1) {
      let changed = false;
      next.forEach((fromNode) => {
        const fromStageIndex = stageIndexById.get(fromNode.stageId) ?? 0;
        (fromNode.nextIds || []).forEach((toId) => {
          const toNode = nodeMap.get(toId);
          if (!toNode) return;
          const toStageIndex = stageIndexById.get(toNode.stageId) ?? 0;
          if (toStageIndex < fromStageIndex) {
            toNode.stageId = inputStages[fromStageIndex]?.id || toNode.stageId;
            changed = true;
          }
        });
      });
      if (!changed) break;
    }
    return Array.from(nodeMap.values());
  };

  const reflowLaneOrdersByRelation = (nodes: typeof laneNodes) => {
    const next = nodes.map((n) => ({
      ...n,
      laneOrder: Number(n.laneOrder || 0),
      laneRow: Number(n.laneRow || 0),
    }));
    const nodeMap = new Map(next.map((n) => [n.id, n]));
    for (let round = 0; round < next.length; round += 1) {
      let changed = false;
      next.forEach((fromNode) => {
        (fromNode.nextIds || []).forEach((toId) => {
          const toNode = nodeMap.get(toId);
          if (!toNode) return;
          if (fromNode.stageId !== toNode.stageId) return;
          const candidate = Number(fromNode.laneOrder || 0) + 1;
          if (candidate > Number(toNode.laneOrder || 0)) {
            toNode.laneOrder = candidate;
            changed = true;
          }
        });
      });
      if (!changed) break;
    }
    // 同一来源节点多分叉时：第一个后继默认最近列，第二个开始下移一行，避免连线/节点重叠
    next.forEach((fromNode) => {
      const branchTargets = (fromNode.nextIds || [])
        .map((id) => nodeMap.get(id))
        .filter((node): node is NonNullable<typeof node> => !!node)
        .filter((toNode) => toNode.roleId === fromNode.roleId && toNode.stageId === fromNode.stageId);
      if (!branchTargets.length) return;
      const targetCol = Number(fromNode.laneOrder || 0) + 1;
      branchTargets.forEach((toNode, idx) => {
        toNode.laneOrder = Math.max(Number(toNode.laneOrder || 0), targetCol);
        toNode.laneRow = Math.max(Number(toNode.laneRow || 0), idx);
      });
    });
    return next;
  };

  const laneStageWidthMap = useMemo(() => {
    const map: Record<string, number> = {};
    laneStages.forEach((stage) => {
      const stageNodes = laneNodes.filter((n) => n.stageId === stage.id);
      const maxOrder = stageNodes.length ? Math.max(...stageNodes.map((n) => Number(n.laneOrder || 0))) : 0;
      const colCount = Math.max(maxOrder + 1, 1);
      map[stage.id] = Math.max(260, colCount * (LANE_NODE_WIDTH + LANE_NODE_GAP) + 24);
    });
    return map;
  }, [laneNodes, laneStages]);

  const laneTableMinWidth = useMemo(
    () => 180 + laneStages.reduce((sum, stage) => sum + (laneStageWidthMap[stage.id] || 260), 0),
    [laneStageWidthMap, laneStages],
  );

  const computeLaneNodePositions = () => {
    const container = laneCanvasRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const next: Record<
      string,
      { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number }
    > = {};
    Object.entries(laneNodeRefMap.current).forEach(([nodeId, element]) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const left = rect.left - containerRect.left + container.scrollLeft;
      const right = rect.right - containerRect.left + container.scrollLeft;
      const top = rect.top - containerRect.top + container.scrollTop;
      const bottom = rect.bottom - containerRect.top + container.scrollTop;
      next[nodeId] = {
        left,
        right,
        top,
        bottom,
        centerX: (left + right) / 2,
        centerY: (top + bottom) / 2,
      };
    });
    setLaneNodePositions(next);
  };

  const swimlaneLayoutNodes = useMemo(
    (): SwimlaneLayoutNode[] =>
      laneNodes.map((n) => ({
        id: n.id,
        stageId: n.stageId,
        roleId: n.roleId,
        laneOrder: n.laneOrder,
        laneRow: n.laneRow,
        nextIds: n.nextIds || [],
      })),
    [laneNodes],
  );

  const swimlaneLayoutOverlay = useMemo(
    () => computeSwimlaneLayoutOverlay(swimlaneLayoutNodes),
    [swimlaneLayoutNodes],
  );

  const stageTopOffset = useMemo(
    () => computeStageTopOffsets(swimlaneLayoutNodes, laneStages.map((s) => s.id)),
    [swimlaneLayoutNodes, laneStages],
  );

  const effectiveSwimlaneRow = useCallback(
    (nodeId: string, stageId: string) => {
      const o = swimlaneLayoutOverlay.get(nodeId);
      const layoutRow = o?.layoutRow ?? o?.autoRow ?? 0;
      return computeEffectiveRow(stageTopOffset, stageId, layoutRow);
    },
    [swimlaneLayoutOverlay, stageTopOffset],
  );

  /** 结构签名：节点增删、阶段/角色/列、nextIds 变化时变化，用于全局布局测量与 overlay 重算对齐 */
  const laneLayoutStructureKey = useMemo(
    () =>
      laneStages.map((s) => s.id).join('>') +
      '|' +
      laneNodes
        .map((n) =>
          [
            n.id,
            n.stageId,
            n.roleId,
            Number(n.laneOrder || 0),
            Number(n.laneRow || 0),
            (n.nextIds || []).slice().sort().join(','),
          ].join(':'),
        )
        .sort()
        .join('|'),
    [laneNodes, laneStages],
  );

  /** 画布上与 routing 共用的垂向行（全局重算，非列内临时 bump） */
  const swimlaneDisplayRowByNodeId = useMemo(
    () => computeSwimlaneCanvasDisplayRows(laneNodes, laneRoles, laneStages, effectiveSwimlaneRow),
    [laneNodes, laneRoles, laneStages, effectiveSwimlaneRow],
  );

  const swimlaneNodes = useMemo<SwimlaneNode[]>(() => {
    const stageOrder = new Map(laneStages.map((stage, index) => [stage.id, index]));
    const laneOrder = new Map(laneRoles.map((role, index) => [role.id, index]));
    return laneNodes
      .map((node) => ({
        id: node.id,
        laneId: node.roleId,
        stageId: node.stageId,
        row: swimlaneDisplayRowByNodeId.get(node.id) ?? effectiveSwimlaneRow(node.id, node.stageId),
        nextIds: node.nextIds || [],
      }))
      .sort((a, b) => {
        const stageDiff = (stageOrder.get(a.stageId) ?? 0) - (stageOrder.get(b.stageId) ?? 0);
        if (stageDiff !== 0) return stageDiff;
        const laneDiff = (laneOrder.get(a.laneId) ?? 0) - (laneOrder.get(b.laneId) ?? 0);
        if (laneDiff !== 0) return laneDiff;
        const rowDiff = a.row - b.row;
        if (rowDiff !== 0) return rowDiff;
        return a.id.localeCompare(b.id);
      });
  }, [laneNodes, laneStages, laneRoles, swimlaneDisplayRowByNodeId, effectiveSwimlaneRow]);

  const swimlaneEdges = useMemo(() => buildSwimlaneEdges(swimlaneNodes), [swimlaneNodes]);

  const swimlaneNodeRects = useMemo(
    () =>
      buildNodeRects(
        Object.entries(laneNodePositions).map(([id, rect]) => ({
          id,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        })),
      ),
    [laneNodePositions],
  );

  const swimlaneEdgeMap = useMemo(() => {
    const map = new Map<string, { from: string; to: string }>();
    swimlaneEdges.forEach((edge) => {
      map.set(edge.id, { from: edge.from, to: edge.to });
    });
    return map;
  }, [swimlaneEdges]);

  const routedPaths = useMemo(
    () => routeSwimlaneEdges(swimlaneNodes, swimlaneEdges, swimlaneNodeRects, SWIMLANE_ROUTING_OPTIONS),
    [swimlaneNodes, swimlaneEdges, swimlaneNodeRects],
  );

  useEffect(() => {
    if (!laneNodes.length) return;
    const debugPayload = {
      laneNodePositions,
      edges: swimlaneEdges,
      routedPaths,
      trunkXByFrom: (typeof window !== 'undefined' && (window as any).__swimlaneDebug?.trunkXByFrom) || {},
      edgeMeta: (typeof window !== 'undefined' && (window as any).__swimlaneDebug?.edgeMeta) || {},
    };
    console.log('[swimlane-debug] ALL', debugPayload);
  }, [laneNodes, laneNodePositions, swimlaneEdges, routedPaths]);

  const openWorkflowConfig = (card: WorkflowCard) => {
    const laneCfg = card.laneConfig || buildDefaultLaneConfig(card);
    const unifiedRoles = laneRolesFromFlowRoles(flowRoles);
    const effectiveRoles = unifiedRoles.length ? unifiedRoles : (laneCfg.roles || []);
    const alignedNodes = alignLaneNodesRoleIds(laneCfg.nodes || [], effectiveRoles);
    setActiveWorkflowCardId(card.id);
    setWorkflowConfigTab('basic');
    workflowConfigForm.setFieldsValue({
      name: card.name,
      statusCalcRule: card.statusCalcRule || '',
      advancedDependencyEnabled: card.advancedDependencyEnabled !== false,
      customNodeInfo: card.customNodeInfo || '延期标识',
      displayPosition: card.displayPosition || '节点名称右侧',
    });
    setLaneRoles(effectiveRoles);
    setLaneStages(laneCfg.stages || []);
    setLaneNodes(
      autoArrangeLaneNodes(
        alignedNodes,
        effectiveRoles,
        laneCfg.stages || [],
      ),
    );
    setLaneShowLines(laneCfg.showLines !== false);
    setSelectedLaneNodeId((alignedNodes || [])[0]?.id || '');
    setLaneRightTab('nodeInfo');
    setWorkflowConfigOpen(true);
  };

  const saveWorkflowConfig = async () => {
    if (!activeWorkflowCard) return;
    if (!selectedWorkItem?.id) {
      message.error('未选择工作项');
      return;
    }
    const values = await workflowConfigForm.validateFields();
    const nextCards = workflowCards.map((item) =>
        item.id === activeWorkflowCard.id
          ? {
              ...item,
              name: values.name,
              statusCalcRule: values.statusCalcRule || '',
              advancedDependencyEnabled: !!values.advancedDependencyEnabled,
              customNodeInfo: values.customNodeInfo,
              displayPosition: values.displayPosition,
              laneConfig: {
                roles: laneRoles,
                stages: laneStages,
                nodes: alignLaneNodesRoleIds(laneNodes, laneRoles),
                showLines: laneShowLines,
              },
            }
          : item,
    );
    setWorkflowCards(nextCards);
    try {
      const settingsValues = await settingsForm.validateFields();
      const payload = buildSettingsPayload(settingsValues, {
        flowRuleJson: stringifyWorkflowCards(nextCards),
      });
      setSettingsSaving(true);
      const res = await saveWorkItemSettings(selectedWorkItem.id, payload);
      if (res.code !== 0) {
        message.error(res.message || '保存配置失败');
        return;
      }
      message.success('流程配置已保存');
      await openWorkItemSettings(selectedWorkItem.id);
      loadWorkItems();
      setWorkflowConfigOpen(false);
    } catch (e: any) {
      message.error(e?.message || '保存配置失败');
    } finally {
      setSettingsSaving(false);
    }
  };

  const promptSimpleName = (title: string, defaultValue: string, onConfirm: (value: string) => void) => {
    let value = defaultValue;
    Modal.confirm({
      title,
      content: (
        <Input
          defaultValue={defaultValue}
          onChange={(e) => {
            value = e.target.value;
          }}
          placeholder="请输入名称"
        />
      ),
      onOk: () => {
        const finalValue = value.trim();
        if (!finalValue) {
          message.warning('名称不能为空');
          return Promise.reject();
        }
        onConfirm(finalValue);
        return Promise.resolve();
      },
    });
  };

  const addLaneRole = () => {
    promptSimpleName('新增角色', `角色${laneRoles.length + 1}`, (name) => {
      const role = {
        id: `role_${Math.random().toString(36).slice(2, 8)}`,
        name,
        roleType: '普通类型' as const,
        appearance: '自行添加' as const,
        memberAssign: '自行添加' as const,
        limitSingle: false,
        autoJoin: false,
        displaySetting: '默认显示 / 允许用户增删',
        mappingKey: '',
        projectOwner: false,
      };
      setFlowRoles((prev) => [role, ...prev]);
      setSelectedFlowRoleId(role.id);
      message.success('角色已新增并同步到角色管理');
    });
  };

  const renameLaneRole = (roleId: string, currentName: string) => {
    promptSimpleName('编辑角色', currentName, (name) => {
      setFlowRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, name } : r)));
      message.success('角色名称已同步更新');
    });
  };

  const removeLaneRole = (roleId: string) => {
    if (flowRoles.length <= 1) {
      message.warning('至少保留一个角色');
      return;
    }
    setFlowRoles((prev) => prev.filter((x) => x.id !== roleId));
    if (selectedFlowRoleId === roleId) {
      setSelectedFlowRoleId('');
    }
    message.success('角色已删除并同步到角色管理');
  };

  const addLaneStage = () => {
    promptSimpleName('新增阶段', `阶段${laneStages.length + 1}`, (name) => {
      const nextStages = [...laneStages, { id: `stage-${Date.now()}`, name }];
      setLaneStages(nextStages);
      setLaneNodes((prev) => autoArrangeLaneNodes(prev, laneRoles, nextStages));
    });
  };

  const renameLaneStage = (stageId: string, currentName: string) => {
    promptSimpleName('编辑阶段', currentName, (name) => {
      setLaneStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name } : s)));
    });
  };

  const removeLaneStage = (stageId: string) => {
    if (laneStages.length <= 1) {
      message.warning('至少保留一个阶段');
      return;
    }
    const nextStages = laneStages.filter((x) => x.id !== stageId);
    const fallbackStageId = nextStages[0]?.id;
    setLaneStages(nextStages);
    setLaneNodes((prev) =>
      autoArrangeLaneNodes(
        prev
          .filter((x) => x.stageId !== stageId)
          .map((x) => ({ ...x, stageId: fallbackStageId || x.stageId })),
        laneRoles,
        nextStages,
      ),
    );
  };

  const addLaneNodeToCell = (roleId: string, stageId: string) => {
    const id = `node-${Date.now()}`;
    setLaneNodes((prev) => {
      const nextNode = {
        id,
        name: `节点${prev.length + 1}`,
        roleId,
        stageId,
        laneOrder: 0,
        laneRow: 0,
        nextIds: [] as string[],
        statusTags: [] as string[],
        subItems: [] as string[],
        subTaskDisplayOnCard: true,
        subTasks: [] as Array<{ id: string; name: string; required: boolean }>,
        subWorkItemTypes: [] as string[],
        events: '',
      };
      const selectedInCurrentCell = prev.find(
        (node) => node.id === selectedLaneNodeId && node.roleId === roleId && node.stageId === stageId,
      );
      if (!selectedInCurrentCell) {
        const lastSameCellIndex = [...prev]
          .map((node, index) => ({ node, index }))
          .filter(({ node }) => node.roleId === roleId && node.stageId === stageId)
          .map(({ index }) => index)
          .pop();
        if (lastSameCellIndex == null) return [...prev, nextNode];
        const sameCellNodes = prev.filter((x) => x.roleId === roleId && x.stageId === stageId);
        const maxOrder = Math.max(...sameCellNodes.map((x) => Number(x.laneOrder || 0)), 0);
        nextNode.laneOrder = maxOrder + 1;
        const next = [...prev];
        next.splice(lastSameCellIndex + 1, 0, nextNode);
        return reflowLaneOrdersByRelation(next);
      }
      nextNode.stageId = stageId;
      nextNode.roleId = roleId;
      // 同泳道格内新增：与选中节点并行（同 laneOrder、递增 laneRow），不自动写入 nextIds。
      // 边仅由「增加连线」或节点流转表单显式配置，避免把横向相邻误判为串行。
      const selOrder = Number(selectedInCurrentCell.laneOrder || 0);
      const peersSameCol = prev.filter(
        (n) => n.roleId === roleId && n.stageId === stageId && Number(n.laneOrder || 0) === selOrder,
      );
      const maxRow = peersSameCol.length
        ? Math.max(...peersSameCol.map((n) => Number(n.laneRow || 0)))
        : -1;
      nextNode.laneOrder = selOrder;
      nextNode.laneRow = maxRow + 1;
      const next = [...prev];
      const selectedIndex = next.findIndex((node) => node.id === selectedInCurrentCell.id);
      next.splice(selectedIndex + 1, 0, nextNode);
      return reflowLaneOrdersByRelation(next);
    });
    setSelectedLaneNodeId(id);
  };

  const removeLaneNode = (nodeId: string) => {
    const filtered = laneNodes
      .filter((x) => x.id !== nodeId)
      .map((x) => ({ ...x, nextIds: (x.nextIds || []).filter((id) => id !== nodeId) }));
    const next = reflowLaneOrdersByRelation(autoArrangeLaneNodes(filtered, laneRoles, laneStages));
    setLaneNodes(next);
    if (selectedLaneNodeId === nodeId) {
      setSelectedLaneNodeId(next[0]?.id || '');
    }
  };

  const deleteLaneEdge = (fromId: string, toId: string) => {
    setLaneNodes((prev) =>
      reflowLaneOrdersByRelation(
        autoArrangeLaneNodes(
          prev.map((node) =>
            node.id === fromId
              ? { ...node, nextIds: (node.nextIds || []).filter((id) => id !== toId) }
              : node,
          ),
          laneRoles,
          laneStages,
        ),
      ),
    );
    setSelectedLaneEdge(null);
  };

  const startLineDraftFromNode = (fromId: string) => {
    const from = laneNodePositions[fromId];
    setLineDraft({
      fromId,
      x: from?.right || 0,
      y: from?.centerY || 0,
    });
    setSelectedLaneEdge(null);
  };

  const finishLineDraft = (toId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!lineDraft) return;
    if (lineDraft.fromId === toId) {
      setLineDraft(null);
      return;
    }
    const fromNode = laneNodes.find((n) => n.id === lineDraft.fromId);
    const toNode = laneNodes.find((n) => n.id === toId);
    if (!fromNode || !toNode) {
      setLineDraft(null);
      return;
    }
    const fromStageIndex = laneStages.findIndex((x) => x.id === fromNode.stageId);
    const toStageIndex = laneStages.findIndex((x) => x.id === toNode.stageId);
    if (toStageIndex < fromStageIndex) {
      message.warning('仅支持从前置节点连接到后置节点（尾连头）。');
      setLineDraft(null);
      return;
    }
    setLaneNodes((prev) =>
      reflowLaneOrdersByRelation(
        autoArrangeLaneNodes(
          prev.map((node) =>
          node.id === lineDraft.fromId
            ? { ...node, nextIds: Array.from(new Set([...(node.nextIds || []), toId])) }
            : node,
          ),
          laneRoles,
          laneStages,
        ),
      ),
    );
    setLineDraft(null);
    setSelectedLaneEdge(null);
  };

  const selectedLaneNode = useMemo(
    () => laneNodes.find((x) => x.id === selectedLaneNodeId),
    [laneNodes, selectedLaneNodeId],
  );

  const selectedFlowRole = useMemo(
    () => flowRoles.find((r) => r.id === selectedFlowRoleId) || flowRoles[0],
    [flowRoles, selectedFlowRoleId],
  );

  const filteredFlowRoles = useMemo(() => {
    const kw = roleKeyword.trim().toLowerCase();
    if (!kw) return flowRoles;
    return flowRoles.filter((r) => r.name.toLowerCase().includes(kw) || r.id.toLowerCase().includes(kw));
  }, [flowRoles, roleKeyword]);

  const createFlowRole = (roleType: FlowRoleItem['roleType']) => {
    const role: FlowRoleItem = {
      id: `role_${Math.random().toString(36).slice(2, 8)}`,
      name: roleType === '计算类型' ? `新建计算角色${flowRoles.length + 1}` : `新建角色${flowRoles.length + 1}`,
      roleType,
      appearance: '自行添加',
      memberAssign: '自行添加',
      limitSingle: false,
      autoJoin: false,
      displaySetting: '默认显示 / 允许用户增删',
      mappingKey: '',
      projectOwner: false,
    };
    setFlowRoles((prev) => [role, ...prev]);
    setSelectedFlowRoleId(role.id);
    message.success('角色已创建');
    return role;
  };

  const updateSelectedFlowRole = (patch: Partial<FlowRoleItem>) => {
    if (!selectedFlowRole) return;
    setFlowRoles((prev) =>
      prev.map((item) => (item.id === selectedFlowRole.id ? { ...item, ...patch } : item)),
    );
  };

  const removeSelectedFlowRole = () => {
    if (!selectedFlowRole) return;
    setFlowRoles((prev) => prev.filter((item) => item.id !== selectedFlowRole.id));
    message.success('角色已删除');
  };

  const laneRolesFromFlowRoles = (roles: FlowRoleItem[]) =>
    roles.map((role) => ({ id: role.id, name: role.name }));

  const alignLaneNodesRoleIds = (
    nodes: Array<{
      id: string;
      name: string;
      roleId: string;
      stageId: string;
      laneOrder?: number;
      laneRow?: number;
      nextIds: string[];
      statusTags?: string[];
      subItems?: string[];
      events?: string;
    }>,
    roles: Array<{ id: string; name: string }>,
  ) => {
    if (!roles.length) return nodes;
    const roleIdSet = new Set(roles.map((r) => r.id));
    const fallbackRoleId = roles[0].id;
    return nodes.map((node) => ({
      ...node,
      roleId: roleIdSet.has(node.roleId) ? node.roleId : fallbackRoleId,
    }));
  };

  useEffect(() => {
    if (!selectedLaneNode) {
      laneNodeForm.resetFields();
      return;
    }
    laneNodeForm.setFieldsValue({
      name: selectedLaneNode.name,
      statusTags: selectedLaneNode.statusTags || [],
      nextIds: selectedLaneNode.nextIds || [],
      subItems: selectedLaneNode.subItems || [],
      subTaskDisplayOnCard: selectedLaneNode.subTaskDisplayOnCard !== false,
      subTasks: selectedLaneNode.subTasks || [],
      subWorkItemTypes: selectedLaneNode.subWorkItemTypes || [],
      events: selectedLaneNode.events || '',
    });
  }, [selectedLaneNode, laneNodeForm]);

  useEffect(() => {
    if (!selectedFlowRole) {
      flowRoleForm.resetFields();
      return;
    }
    flowRoleForm.setFieldsValue(selectedFlowRole);
  }, [flowRoleForm, selectedFlowRole]);

  useEffect(() => {
    if (!flowRoles.length) {
      setSelectedFlowRoleId('');
      return;
    }
    if (!selectedFlowRoleId || !flowRoles.some((item) => item.id === selectedFlowRoleId)) {
      setSelectedFlowRoleId(flowRoles[0].id);
    }
  }, [flowRoles, selectedFlowRoleId]);

  useEffect(() => {
    if (!flowRoles.length) return;
    const unifiedRoles = laneRolesFromFlowRoles(flowRoles);

    setWorkflowCards((prev) =>
      prev.map((card) => {
        const laneCfg = card.laneConfig || buildDefaultLaneConfig(card);
        return {
          ...card,
          laneConfig: {
            ...laneCfg,
            roles: unifiedRoles,
            nodes: alignLaneNodesRoleIds(laneCfg.nodes || [], unifiedRoles),
            showLines: laneCfg.showLines !== false,
          },
        };
      }),
    );

    if (workflowConfigOpen) {
      setLaneRoles(unifiedRoles);
      setLaneNodes((prev) =>
        reflowLaneOrdersByRelation(
          autoArrangeLaneNodes(
            alignLaneNodesRoleIds(prev, unifiedRoles),
            unifiedRoles,
            laneStages,
          ),
        ),
      );
    }
  }, [flowRoles, workflowConfigOpen]);

  useEffect(() => {
    const run = () => window.requestAnimationFrame(computeLaneNodePositions);
    run();
    window.addEventListener('resize', run);
    return () => {
      window.removeEventListener('resize', run);
    };
  }, [
    laneLayoutStructureKey,
    swimlaneDisplayRowByNodeId,
    laneRoles,
    laneStages,
    laneShowLines,
    workflowConfigOpen,
    workflowConfigTab,
    laneFullscreen,
  ]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      computeLaneNodePositions();
    }, 60);
    return () => window.clearTimeout(id);
  }, [laneFullscreen]);

  useEffect(() => {
    if (!lineDraft) return;
    const onMove = (event: MouseEvent) => {
      const container = laneCanvasRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setLineDraft((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - rect.left + container.scrollLeft,
              y: event.clientY - rect.top + container.scrollTop,
            }
          : null,
      );
    };
    const onUp = () => {
      setLineDraft(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [lineDraft]);

  const saveLaneNodeForm = async () => {
    if (!selectedLaneNode) return;
    const values = await laneNodeForm.validateFields();
    setLaneNodes((prev) => {
      const next = prev.map((x) =>
        x.id === selectedLaneNode.id
          ? {
              ...x,
              name: values.name,
              statusTags: values.statusTags || [],
              nextIds: values.nextIds || [],
              subItems: values.subItems || [],
              subTaskDisplayOnCard: values.subTaskDisplayOnCard !== false,
              subTasks: values.subTasks || [],
              subWorkItemTypes: values.subWorkItemTypes || [],
              events: values.events || '',
            }
          : x,
      );
      return reflowLaneOrdersByRelation(autoArrangeLaneNodes(next, laneRoles, laneStages));
    });
    message.success('节点配置已更新');
  };

  const patchSelectedLaneNode = (
    updater: (
      node: {
        id: string;
        name: string;
        roleId: string;
        stageId: string;
        laneOrder?: number;
        laneRow?: number;
        nextIds: string[];
        statusTags?: string[];
        subItems?: string[];
        subTaskDisplayOnCard?: boolean;
        subTasks?: Array<{ id: string; name: string; required: boolean }>;
        subWorkItemTypes?: string[];
        events?: string;
      },
    ) => typeof selectedLaneNode,
  ) => {
    if (!selectedLaneNode) return;
    setLaneNodes((prev) =>
      prev.map((node) => (node.id === selectedLaneNode.id ? ({ ...node, ...updater(node) } as any) : node)),
    );
  };

  const addNodeSubTask = () => {
    if (!selectedLaneNode) return;
    let taskName = `任务${(selectedLaneNode.subTasks || []).length + 1}`;
    Modal.confirm({
      title: '添加任务',
      content: (
        <Input
          defaultValue={taskName}
          onChange={(e) => {
            taskName = e.target.value;
          }}
          placeholder="请输入任务名称"
        />
      ),
      onOk: () => {
        const finalName = taskName.trim();
        if (!finalName) {
          message.warning('任务名称不能为空');
          return Promise.reject();
        }
        patchSelectedLaneNode((node) => ({
          subTasks: [
            ...(node.subTasks || []),
            { id: `sub-task-${Date.now()}`, name: finalName, required: false },
          ],
        }));
        return Promise.resolve();
      },
    });
  };

  const renameNodeSubTask = (taskId: string, currentName: string) => {
    let taskName = currentName;
    Modal.confirm({
      title: '编辑任务',
      content: (
        <Input
          defaultValue={currentName}
          onChange={(e) => {
            taskName = e.target.value;
          }}
          placeholder="请输入任务名称"
        />
      ),
      onOk: () => {
        const finalName = taskName.trim();
        if (!finalName) {
          message.warning('任务名称不能为空');
          return Promise.reject();
        }
        patchSelectedLaneNode((node) => ({
          subTasks: (node.subTasks || []).map((task) =>
            task.id === taskId ? { ...task, name: finalName } : task,
          ),
        }));
        return Promise.resolve();
      },
    });
  };

  const toggleNodeSubTaskRequired = (taskId: string) => {
    patchSelectedLaneNode((node) => ({
      subTasks: (node.subTasks || []).map((task) =>
        task.id === taskId ? { ...task, required: !task.required } : task,
      ),
    }));
  };

  const removeNodeSubTask = (taskId: string) => {
    patchSelectedLaneNode((node) => ({
      subTasks: (node.subTasks || []).filter((task) => task.id !== taskId),
    }));
  };

  const moveNodeSubTask = (taskId: string, direction: 'up' | 'down') => {
    patchSelectedLaneNode((node) => {
      const tasks = [...(node.subTasks || [])];
      const index = tasks.findIndex((task) => task.id === taskId);
      if (index < 0) return { subTasks: tasks };
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= tasks.length) return { subTasks: tasks };
      const tmp = tasks[index];
      tasks[index] = tasks[target];
      tasks[target] = tmp;
      return { subTasks: tasks };
    });
  };

  const addSubWorkItemType = () => {
    if (!selectedLaneNode) return;
    let value = `子工作项类型${(selectedLaneNode.subWorkItemTypes || []).length + 1}`;
    Modal.confirm({
      title: '新增子工作项类型',
      content: (
        <Input
          defaultValue={value}
          onChange={(e) => {
            value = e.target.value;
          }}
          placeholder="请输入子工作项类型"
        />
      ),
      onOk: () => {
        const finalValue = value.trim();
        if (!finalValue) {
          message.warning('名称不能为空');
          return Promise.reject();
        }
        patchSelectedLaneNode((node) => ({
          subWorkItemTypes: Array.from(new Set([...(node.subWorkItemTypes || []), finalValue])),
        }));
        return Promise.resolve();
      },
    });
  };

  const removeSubWorkItemType = (name: string) => {
    patchSelectedLaneNode((node) => ({
      subWorkItemTypes: (node.subWorkItemTypes || []).filter((item) => item !== name),
    }));
  };

  const renderSpaceIconBox = (icon?: string, size = 64) => {
    const isImage = !!icon && (icon.startsWith('data:image/') || icon.startsWith('http'));
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          background: '#fff7e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isImage ? (
          <img src={icon} alt="space-icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: size * 0.45 }}>{icon || '🥮'}</span>
        )}
      </div>
    );
  };

  const applySpaceIcon = (nextIcon: string) => {
    setSpaceIcon(nextIcon);
    setCurrentSpaceIcon(nextIcon);
    message.success('空间图标已更新');
  };

  const handleCustomIconUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('仅支持图片格式');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('图片大小不能超过 2MB');
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        applySpaceIcon(reader.result);
      }
    };
    reader.readAsDataURL(file);
    return false;
  };

  return (
    <PageContainer
      title={
        <Space>
          <SettingOutlined />
          空间配置
        </Space>
      }
      extra={[
        <Button key="log">操作记录</Button>,
        <Button key="create" type="primary" icon={<PlusOutlined />}>
          新建
        </Button>,
      ]}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />

      {activeTab === 'spaceInfo' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card title="基础信息">
            <Form layout="vertical">
              <Form.Item label="空间名称" required>
                <Input
                  value={spaceName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSpaceName(value);
                    setCurrentSpaceName(value);
                  }}
                />
              </Form.Item>
              <Form.Item label="空间图标">
                <Space direction="vertical" size={10}>
                  <Button type="text" style={{ padding: 0, height: 'auto' }} onClick={() => setIconPickerOpen(true)}>
                    {renderSpaceIconBox(spaceIcon, 88)}
                  </Button>
                  <Button type="link" style={{ padding: 0 }} onClick={() => setIconPickerOpen(true)}>
                    选择空间图标
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          <Modal
            title="选择空间图标"
            open={iconPickerOpen}
            onCancel={() => setIconPickerOpen(false)}
            footer={null}
            width={680}
          >
            <Tabs
              defaultActiveKey="standard"
              items={[
                {
                  key: 'standard',
                  label: '标准图标',
                  children: (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        gap: 12,
                      }}
                    >
                      {STANDARD_SPACE_ICONS.map((icon) => {
                        const selected = spaceIcon === icon;
                        return (
                          <Button
                            key={icon}
                            type={selected ? 'primary' : 'default'}
                            onClick={() => applySpaceIcon(icon)}
                            style={{ width: 52, height: 52, borderRadius: 12, padding: 0 }}
                          >
                            <span style={{ fontSize: 22 }}>{icon}</span>
                          </Button>
                        );
                      })}
                    </div>
                  ),
                },
                {
                  key: 'custom',
                  label: '自定义上传',
                  children: (
                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                      <Upload accept="image/png,image/jpeg,image/webp" showUploadList={false} beforeUpload={handleCustomIconUpload}>
                        <Button icon={<UploadOutlined />}>上传自定义图标</Button>
                      </Upload>
                      <Typography.Text type="secondary">支持 png / jpg / webp，文件大小不超过 2MB</Typography.Text>
                      <Space align="center">
                        <Typography.Text type="secondary">当前预览：</Typography.Text>
                        {renderSpaceIconBox(spaceIcon, 72)}
                      </Space>
                    </Space>
                  ),
                },
              ]}
            />
            <Divider style={{ margin: '16px 0 12px' }} />
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button
                onClick={() => applySpaceIcon(STANDARD_SPACE_ICONS[0])}
              >
                恢复默认图标
              </Button>
              <Button type="primary" onClick={() => setIconPickerOpen(false)}>
                完成
              </Button>
            </Space>
          </Modal>

          <Card title="空间访问设置" extra={<Button type="link">添加审批人</Button>}>
            <List
              dataSource={[
                { name: '王闯', email: 'wangchuang@tranyu.com' },
                { name: '李敏', email: 'limin@tranyu.com' },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{item.name.slice(0, 1)}</Avatar>}
                    title={item.name}
                    description={item.email}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card
            title="导航配置"
            extra={
              <Button type="link" onClick={() => history.push(withSpaceId('/space/nav-config'))}>
                前往配置
              </Button>
            }
          >
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              导航功能配置
            </Typography.Title>
            <Typography.Text type="secondary">
              配置在导航上显示的功能及排列顺序，对空间所有成员生效
            </Typography.Text>
          </Card>

          <Card title="语言配置">
            <Space direction="vertical" size={6}>
              <Checkbox>语言管理</Checkbox>
              <Typography.Text type="secondary">
                启用多语言设置，即可为自定义内容设置多语言版本
              </Typography.Text>
              <Button type="link" style={{ padding: 0 }}>
                查看功能说明
              </Button>
            </Space>
          </Card>

          <Card title="基准时区">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Typography.Text type="secondary">
                该时区为空间的标准时区，所有日期和时间以此为基准进行计算和展示。
              </Typography.Text>
              <Select
                defaultValue="(GMT+08:00) 中国标准时间-北京"
                options={[{ label: '(GMT+08:00) 中国标准时间-北京', value: '(GMT+08:00) 中国标准时间-北京' }]}
              />
            </Space>
          </Card>

          <Card title="流程图设置">
            <Space direction="vertical" size={6}>
              <Checkbox defaultChecked>节点延期标识</Checkbox>
              <Typography.Text type="secondary">
                开启后，若节点实际结束时间晚于排期结束时间，将展示延期标识
              </Typography.Text>
            </Space>
          </Card>

          <Card title="业务线配置">
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Input prefix={<SearchOutlined />} placeholder="搜索业务线名称" />
              <List
                dataSource={[
                  { name: '通用机', color: '#eef1ff' },
                  { name: '专用机', color: '#f1eaff' },
                  { name: '精密机', color: '#daf6f2' },
                  { name: '两板机', color: '#eee8ff' },
                  { name: 'iSee4.0', color: '#ffe9ea' },
                ]}
                renderItem={(item) => (
                  <List.Item
                    style={{ paddingInline: 0 }}
                    actions={[
                      <Button key="drop" shape="circle" icon={<DownOutlined />} />,
                      <Button key="setting" shape="circle" icon={<SettingFilled />} />,
                      <Button key="more" type="text" icon={<MoreOutlined />} />,
                    ]}
                  >
                    <Space>
                      <Typography.Text type="secondary">⋮⋮</Typography.Text>
                      <Typography.Text
                        style={{
                          background: item.color,
                          borderRadius: 8,
                          padding: '2px 10px',
                          fontWeight: 600,
                        }}
                      >
                        {item.name}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              <Button type="link" icon={<PlusOutlined />} style={{ padding: 0 }}>
                添加业务线
              </Button>
            </Space>
          </Card>

          <Card title="数据管理">
            <List
              dataSource={[
                {
                  key: 'import',
                  title: '导入数据',
                  desc: '可将 Jira 或其他平台数据快速迁移至本空间',
                  actionText: '导入',
                  icon: <ImportOutlined />,
                },
                {
                  key: 'share',
                  title: '分享空间配置',
                  desc: '可将本空间的配置数据分享给其他用户使用',
                  actionText: '分享',
                  icon: <ExportOutlined />,
                },
                {
                  key: 'template',
                  title: '上传为模板',
                  desc: '将本空间配置上传为模板，后续可快速复用',
                  actionText: '上传',
                  icon: <CloudUploadOutlined />,
                },
                {
                  key: 'delete',
                  title: '删除空间',
                  desc: '删除后，该空间所有数据不可访问，且不可恢复',
                  actionText: '删除',
                  icon: <DeleteOutlined />,
                },
              ]}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key={item.key}
                      danger={item.key === 'delete'}
                      onClick={() => message.info(`${item.actionText}功能待接入后端`)}
                    >
                      {item.actionText}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta avatar={item.icon} title={item.title} description={item.desc} />
                </List.Item>
              )}
            />
          </Card>
        </Space>
      )}

      {activeTab === 'workItem' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                工作项流程模板
              </Space>
            }
            extra={
              <Button icon={<PlusOutlined />} onClick={openCreateWorkItem}>
                新增工作项类型
              </Button>
            }
          >
            <Table rowKey="id" loading={workItemLoading} pagination={false} columns={workItemColumns as any} dataSource={workItems} />
          </Card>

          <Modal
            title={editingWorkItem ? '编辑工作项类型' : '新增工作项类型'}
            open={workItemModalOpen}
            onCancel={() => setWorkItemModalOpen(false)}
            onOk={submitWorkItem}
            destroyOnClose
          >
            <Form form={workItemForm} layout="vertical">
              <Form.Item name="sourceType" label="新建方式" rules={[{ required: true }]}> 
                <Select
                  options={[
                    { label: '从零新建', value: 'custom' },
                    { label: '复用工作项', value: 'reuse' },
                  ]}
                />
              </Form.Item>

              <Form.Item noStyle shouldUpdate>
                {() =>
                  workItemForm.getFieldValue('sourceType') === 'reuse' ? (
                    <Space style={{ width: '100%' }} direction="vertical" size={12}>
                      <Alert
                        type="info"
                        showIcon
                        message="复用配置说明"
                        description="源工作项的基本信息、字段、详情页布局、流程、角色和关系会同步。同步后相关配置不可编辑，可在后续解除同步。"
                      />
                      <Form.Item
                        name="reuseSourceId"
                        label="选择源工作项"
                        rules={[{ required: true, message: '请选择源工作项' }]}
                      >
                        <Select
                          placeholder="选择要复用的工作项"
                          options={reuseCandidates
                            .filter((x) => x.id !== editingWorkItem?.id)
                            .map((x) => ({
                              label: `${x.typeName}（${x.typeCode}）`,
                              value: x.id,
                            }))}
                        />
                      </Form.Item>
                    </Space>
                  ) : (
                    <Space style={{ width: '100%' }} direction="vertical" size={0}>
                      <Form.Item name="typeName" label="名称" rules={[{ required: true, message: '请输入名称' }]}> 
                        <Input placeholder="请输入工作项名称" />
                      </Form.Item>
                      <Form.Item
                        name="typeCode"
                        label="系统标识（编码）"
                        rules={[{ required: true, message: '请输入系统标识' }]}
                      >
                        <Input placeholder="如：REQ、BUG、TASK" />
                      </Form.Item>
                      <Form.Item name="flowMode" label="流程模式" rules={[{ required: true }]}> 
                        <Radio.Group>
                          <Space direction="vertical">
                            <Radio value="state">状态模式</Radio>
                            <Radio value="node">节点模式（流程图）</Radio>
                          </Space>
                        </Radio.Group>
                      </Form.Item>
                      <Form.Item name="itemCategory" label="类型分类" rules={[{ required: true }]}> 
                        <Select
                          options={[
                            { label: '需求', value: 'requirement' },
                            { label: '缺陷', value: 'bug' },
                            { label: '任务', value: 'task' },
                            { label: '自定义', value: 'custom' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="systemIdentifier" label="系统标识">
                        <Input placeholder="用于外部系统映射（可选）" />
                      </Form.Item>
                    </Space>
                  )
                }
              </Form.Item>
              <Form.Item name="ownerRole" label="默认负责人角色">
                <Input placeholder="如：产品经理" />
              </Form.Item>
              <Form.Item name="workflowName" label="流程模板">
                <Input placeholder="如：需求评审流" />
              </Form.Item>
              <Form.Item name="requiredPolicy" label="必填字段策略">
                <Input placeholder="如：标题/优先级/验收标准" />
              </Form.Item>
              <Form.Item name="slaHours" label="SLA（小时）">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="status" label="状态" initialValue={1}>
                <Select
                  options={[
                    { label: '启用', value: 1 },
                    { label: '禁用', value: 0 },
                  ]}
                />
              </Form.Item>
              <Form.Item name="description" label="说明">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>
          </Modal>

          <Drawer
            title={selectedWorkItem ? `${selectedWorkItem.typeName} - 工作项配置` : '工作项配置'}
            width={settingsDrawerFullscreen ? '100vw' : 1200}
            open={settingsDrawerOpen}
            onClose={() => {
              setSettingsDrawerOpen(false);
              setSettingsDrawerFullscreen(false);
            }}
            destroyOnClose
            extra={
              <Space>
                <Button
                  icon={settingsDrawerFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  onClick={() => setSettingsDrawerFullscreen((prev) => !prev)}
                >
                  {settingsDrawerFullscreen ? '退出全屏' : '全屏'}
                </Button>
                <Button
                  onClick={() => {
                    setSettingsDrawerOpen(false);
                    setSettingsDrawerFullscreen(false);
                  }}
                >
                  退出编辑
                </Button>
                <Button
                  type="primary"
                  loading={settingsSaving}
                  disabled={settingsReadonly || settingsTab === 'field'}
                  onClick={submitWorkItemSettings}
                >
                  保存修改
                </Button>
              </Space>
            }
          >
            {settingsReadonly && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前工作项来自复用同步，配置不可编辑。请先在工作项列表中执行“解绑同步”。"
              />
            )}

            <Form form={settingsForm} layout="vertical" disabled={settingsLoading || settingsReadonly}>
              <Tabs
                activeKey={settingsTab}
                onChange={setSettingsTab}
                items={[
                  {
                    key: 'basic',
                    label: '基本信息',
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }} size={16}>
                        <Card title="基础信息配置">
                          <Form.Item name="typeName" label="名称" rules={[{ required: true, message: '请输入名称' }]}> 
                            <Input placeholder="请输入工作项名称" />
                          </Form.Item>
                          <Form.Item name="typeCode" label="系统标识" rules={[{ required: true, message: '请输入系统标识' }]}> 
                            <Input placeholder="如 story / bug / task" />
                          </Form.Item>
                          <Form.Item name="flowMode" label="流程模式" rules={[{ required: true }]}> 
                            <Radio.Group>
                              <Space>
                                <Radio value="state">状态模式</Radio>
                                <Radio value="node">节点模式（流程图）</Radio>
                              </Space>
                            </Radio.Group>
                          </Form.Item>
                          <Form.Item name="systemIdentifier" label="系统标识（外部映射）">
                            <Input />
                          </Form.Item>
                          <Form.Item name="description" label="描述">
                            <Input.TextArea rows={3} />
                          </Form.Item>
                          <Form.Item name="iconColor" label="图标颜色">
                            <Radio.Group optionType="button" buttonStyle="solid">
                              {iconColorOptions.map((color) => (
                                <Radio.Button key={color} value={color} style={{ paddingInline: 8 }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: 14,
                                      height: 14,
                                      borderRadius: 8,
                                      background: color,
                                    }}
                                  />
                                </Radio.Button>
                              ))}
                            </Radio.Group>
                          </Form.Item>
                          <Form.Item name="iconKey" label="图标">
                            <Select
                              options={[
                                { label: '需求图标', value: 'requirement' },
                                { label: '缺陷图标', value: 'bug' },
                                { label: '任务图标', value: 'task' },
                                { label: '版本图标', value: 'release' },
                                { label: '里程碑图标', value: 'milestone' },
                              ]}
                            />
                          </Form.Item>
                        </Card>

                        <Card title="场景规则配置">
                          <Form.Item name="copyFieldsList" label="需求复制管理（字段）">
                            <Select mode="multiple" options={copyFieldOptions} placeholder="选择复制时允许带出的字段" />
                          </Form.Item>
                          <Form.Item name="copyRolesList" label="需求复制管理（角色）">
                            <Select mode="multiple" options={copyRoleOptions} placeholder="选择复制时允许带出的角色" />
                          </Form.Item>
                          <Form.Item name="baselineEnabledFlag" valuePropName="checked">
                            <Checkbox>启用基线管理</Checkbox>
                          </Form.Item>
                        </Card>

                        <Card title="高级信息配置">
                          <Form.Item name="statusFlag" valuePropName="checked">
                            <Checkbox>启用该工作项类型</Checkbox>
                          </Form.Item>
                          <Form.Item name="navEntryEnabledFlag" valuePropName="checked">
                            <Checkbox>设置为导航入口</Checkbox>
                          </Form.Item>
                        </Card>
                      </Space>
                    ),
                  },
                  {
                    key: 'field',
                    label: '字段管理',
                    children: (
                      <Card
                        title="字段配置"
                        extra={
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            disabled={settingsReadonly}
                            onClick={openCreateField}
                          >
                            新建字段
                          </Button>
                        }
                      >
                        <Table
                          rowKey="id"
                          loading={fieldLoading || settingsLoading}
                          columns={fieldColumns as any}
                          dataSource={workItemFields}
                          pagination={false}
                        />
                      </Card>
                    ),
                  },
                  {
                    key: 'detailLayout',
                    label: '页面布局',
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Card
                          title="页面布局"
                          extra={
                            <Space>
                              <Select
                                value={detailLayoutConfig.displayMode}
                                style={{ width: 160 }}
                                onChange={(v) =>
                                  mutateLayoutConfig((prev) => ({
                                    ...prev,
                                    displayMode: v,
                                  }))
                                }
                                options={[
                                  { label: '侧面标签', value: 'side' },
                                  { label: '顶部标签', value: 'top' },
                                ]}
                              />
                              <Button icon={<EyeOutlined />} onClick={() => setPreviewLayoutOpen(true)}>
                                预览详情页
                              </Button>
                            </Space>
                          }
                        >
                          <Tabs
                            activeKey={layoutPageMode}
                            onChange={(k) => setLayoutPageMode(k as 'detail' | 'create')}
                            items={[
                              { key: 'detail', label: '详情页' },
                              { key: 'create', label: '新建页' },
                            ]}
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: 12 }}>
                            <Card size="small" title="表单项资源库">
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Input
                                  allowClear
                                  value={resourceKeyword}
                                  onChange={(e) => setResourceKeyword(e.target.value)}
                                  prefix={<SearchOutlined />}
                                  placeholder="搜索字段/控件/图表/角色"
                                />
                                <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                                  {Object.entries(filteredResourceLibrary).map(([group, resources]) => (
                                    <div key={group} style={{ marginBottom: 10 }}>
                                      <Typography.Text strong>{group}</Typography.Text>
                                      <Space direction="vertical" style={{ width: '100%', marginTop: 6 }}>
                                        {resources.length ? (
                                          resources.map((item) => (
                                            <Button
                                              key={`${group}-${item.key}`}
                                              block
                                              style={{ textAlign: 'left' }}
                                              draggable={layoutPageMode === 'detail'}
                                              onDragStart={() => setDraggingResource(item)}
                                              onDragEnd={() => setDraggingResource(null)}
                                              onClick={() => addItemToCurrentLayout(item)}
                                              disabled={layoutPageMode === 'create'}
                                            >
                                              {item.label}
                                            </Button>
                                          ))
                                        ) : (
                                          <Typography.Text type="secondary">暂无匹配资源</Typography.Text>
                                        )}
                                      </Space>
                                    </div>
                                  ))}
                                </div>
                                <Button icon={<PlusOutlined />} onClick={openCreateField}>
                                  添加新字段
                                </Button>
                                {layoutPageMode === 'create' && (
                                  <Typography.Text type="secondary">
                                    新建页仅支持拖动调整字段顺序，资源库新增仅在详情页操作。
                                  </Typography.Text>
                                )}
                              </Space>
                            </Card>

                            <Card size="small" title={selectedWorkItem?.typeName || '工作项'}>
                              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                                <Space wrap>
                                  {currentLayoutTabs.map((tab) => (
                                    <Button
                                      key={tab.id}
                                      type={tab.id === activeDetailTabId ? 'primary' : 'default'}
                                      onClick={() => {
                                        setActiveDetailTabId(tab.id);
                                        setSelectedLayoutItemId('');
                                      }}
                                    >
                                      {tab.name}
                                    </Button>
                                  ))}
                                  {layoutPageMode === 'detail' && (
                                    <Button icon={<PlusOutlined />} onClick={addLayoutTab}>
                                      新增标签
                                    </Button>
                                  )}
                                  {layoutPageMode === 'detail' && activeDetailTab && !activeDetailTab.builtIn && (
                                    <Dropdown
                                      menu={{
                                        items: [
                                          { key: 'rename', label: '编辑标签页名称', icon: <EditOutlined /> },
                                          { key: 'visible', label: '设置显示条件', icon: <EyeOutlined /> },
                                          { key: 'delete', label: '删除标签页', icon: <DeleteOutlined />, danger: true },
                                        ],
                                        onClick: ({ key }) => {
                                          if (!activeDetailTab) return;
                                          if (key === 'rename') {
                                            Modal.confirm({
                                              title: '编辑标签页名称',
                                              content: (
                                                <Input
                                                  defaultValue={activeDetailTab.name}
                                                  onChange={(e) => updateCurrentTab({ name: e.target.value })}
                                                />
                                              ),
                                              okText: '关闭',
                                              cancelButtonProps: { style: { display: 'none' } },
                                            });
                                          } else if (key === 'visible') {
                                            setEditingTabVisibleId(activeDetailTab.id);
                                            setTagVisibleModalOpen(true);
                                          } else if (key === 'delete') {
                                            removeLayoutTab(activeDetailTab.id);
                                          }
                                        },
                                      }}
                                    >
                                      <Button icon={<MoreOutlined />}>标签页操作</Button>
                                    </Dropdown>
                                  )}
                                </Space>

                                {!activeDetailTab && <Empty description="请选择标签页" />}
                                {activeDetailTab && (
                                  <>
                                    <Space>
                                      <Tooltip title="设置显示条件">
                                        <Button
                                          icon={<EyeOutlined />}
                                          disabled={layoutPageMode === 'create'}
                                          onClick={() => {
                                            setEditingTabVisibleId(activeDetailTab.id);
                                            setTagVisibleModalOpen(true);
                                          }}
                                        >
                                          设置显示条件
                                        </Button>
                                      </Tooltip>
                                      <Button icon={<PlusOutlined />} onClick={addLayoutGroup} disabled={layoutPageMode === 'create'}>
                                        添加新分组
                                      </Button>
                                      <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        disabled={layoutPageMode === 'create' || activeDetailTab.builtIn}
                                        onClick={() => removeLayoutTab(activeDetailTab.id)}
                                      >
                                        删除标签
                                      </Button>
                                    </Space>
                                    {activeDetailTab.groups.map((group) => (
                                      <Card
                                        key={group.id}
                                        type="inner"
                                        title={group.name}
                                        extra={
                                          <Button
                                            size="small"
                                            icon={<EditOutlined />}
                                            disabled={layoutPageMode === 'create'}
                                            onClick={() => {
                                              Modal.confirm({
                                                title: '重命名分组',
                                                content: (
                                                  <Input
                                                    defaultValue={group.name}
                                                    onChange={(e) => {
                                                      const v = e.target.value;
                                                      updateCurrentTabs((tabs) =>
                                                        tabs.map((tab) =>
                                                          tab.id !== activeDetailTabId
                                                            ? tab
                                                            : {
                                                                ...tab,
                                                                groups: tab.groups.map((g) =>
                                                                  g.id === group.id ? { ...g, name: v } : g,
                                                                ),
                                                              },
                                                        ),
                                                      );
                                                    }}
                                                  />
                                                ),
                                                okText: '关闭',
                                                cancelButtonProps: { style: { display: 'none' } },
                                              });
                                            }}
                                          />
                                        }
                                        onDragOver={(e) => {
                                          if (layoutPageMode === 'detail' && draggingResource) e.preventDefault();
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          if (layoutPageMode === 'detail' && draggingResource) {
                                            addItemToGroup(activeDetailTab.id, group.id, draggingResource);
                                            setDraggingResource(null);
                                          }
                                        }}
                                      >
                                        {!group.items.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="拖拽或点击左侧资源添加" />}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                          {group.items.map((item, idx) => (
                                            <div
                                              key={item.id}
                                              draggable={layoutPageMode === 'create'}
                                              onDragStart={() => setDraggingLayoutItem({ groupId: group.id, itemId: item.id })}
                                              onDragEnd={() => setDraggingLayoutItem(null)}
                                              onMouseDown={() => startItemLongPress(item.id)}
                                              onMouseUp={clearItemLongPress}
                                              onMouseLeave={clearItemLongPress}
                                              onTouchStart={() => startItemLongPress(item.id)}
                                              onTouchEnd={clearItemLongPress}
                                              onDragOver={(e) => {
                                                if (layoutPageMode === 'create') e.preventDefault();
                                              }}
                                              onDrop={(e) => {
                                                e.preventDefault();
                                                if (layoutPageMode === 'create') {
                                                  reorderLayoutItemByDrag(group.id, item.id);
                                                  setDraggingLayoutItem(null);
                                                }
                                              }}
                                              style={{
                                                gridColumn: item.width === 'full' ? '1 / span 2' : 'auto',
                                                border: 'none',
                                                borderRadius: 8,
                                                padding: 10,
                                                boxShadow: 'none',
                                                background: item.id === selectedLayoutItemId ? '#f0f7ff' : 'transparent',
                                              }}
                                              onClick={() => setSelectedLayoutItemId(item.id)}
                                            >
                                              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                <Typography.Text strong>{item.label}</Typography.Text>
                                                <Space size={4}>
                                                  {layoutPageMode === 'detail' && fieldActionItemId !== item.id && (
                                                    <Typography.Text type="secondary">长按字段可配置</Typography.Text>
                                                  )}
                                                </Space>
                                              </Space>
                                              <div style={{ marginTop: 6 }}>
                                                {renderFieldDisplayRow(
                                                  item.label,
                                                  item.sourceType === 'field'
                                                    ? `字段：${item.sourceKey}`
                                                    : item.sourceType === 'chart'
                                                      ? `图表 · ${item.chartConfig?.type ?? '未配置'}（${item.sourceKey}）`
                                                      : `资源：${item.sourceType}`,
                                                )}
                                              </div>
                                              {layoutPageMode === 'detail' && fieldActionItemId === item.id && (
                                                <Space size={4} style={{ marginTop: 8 }}>
                                                  <Button
                                                    type="text"
                                                    icon={<PlusOutlined />}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedLayoutItemId(item.id);
                                                      setSelectedLayoutItemPatch({ width: item.width === 'full' ? 'half' : 'full' });
                                                    }}
                                                  />
                                                  <Button
                                                    type="text"
                                                    icon={<MinusOutlined />}
                                                    disabled={idx === 0}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveLayoutItem(group.id, item.id, 'up');
                                                    }}
                                                  />
                                                  <Button
                                                    type="text"
                                                    icon={<DownOutlined />}
                                                    disabled={idx === group.items.length - 1}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveLayoutItem(group.id, item.id, 'down');
                                                    }}
                                                  />
                                                  <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      removeLayoutItem(item.id);
                                                    }}
                                                  />
                                                </Space>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </Card>
                                    ))}
                                  </>
                                )}
                              </Space>
                            </Card>

                            <Card size="small" title={selectedLayoutItem ? selectedLayoutItem.label : '表单检查器'}>
                              {!selectedLayoutItem && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先选择中间画布中的表单项" />}
                              {selectedLayoutItem && layoutPageMode === 'detail' && (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  <Form.Item label={selectedLayoutItem.sourceType === 'chart' ? '组件标题' : '表单项名称'}>
                                    <Input
                                      value={selectedLayoutItem.label}
                                      onChange={(e) => setSelectedLayoutItemPatch({ label: e.target.value })}
                                    />
                                  </Form.Item>
                                  {selectedLayoutItem.sourceType === 'chart' && selectedLayoutItem.chartConfig ? (
                                    <ChartLayoutWidgetConfigPanel
                                      chartConfig={selectedLayoutItem.chartConfig}
                                      onChange={(next: ChartConfigV1) => setSelectedLayoutItemPatch({ chartConfig: next })}
                                      workItemTypeOptions={chartWorkItemTypeOptions}
                                      fieldMeta={chartPanelFieldMeta}
                                    />
                                  ) : null}
                                  {selectedLayoutItem.sourceType === 'chart' && !selectedLayoutItem.chartConfig ? (
                                    <Alert type="warning" showIcon message="图表配置缺失，请删除后重新从左侧拖入图表组件。" />
                                  ) : null}
                                  {selectedLayoutItem.sourceType !== 'chart' && (
                                    <>
                                      <Form.Item label="附加说明">
                                        <Input
                                          value={selectedLayoutItem.helpText}
                                          onChange={(e) => setSelectedLayoutItemPatch({ helpText: e.target.value })}
                                        />
                                      </Form.Item>
                                      <Form.Item label="是否可见">
                                        <Select
                                          value={selectedLayoutItem.visibleRule.mode}
                                          onChange={(value) =>
                                            setSelectedLayoutItemPatch({
                                              visibleRule: {
                                                ...selectedLayoutItem.visibleRule,
                                                mode: value,
                                              },
                                            })
                                          }
                                          options={[
                                            { label: '默认全部可见', value: 'always' },
                                            { label: '在条件下可见', value: 'conditional' },
                                          ]}
                                        />
                                      </Form.Item>
                                      <Form.Item label="是否展示默认值">
                                        <Select
                                          value={selectedLayoutItem.defaultValueMode || 'none'}
                                          onChange={(value) =>
                                            setSelectedLayoutItemPatch({
                                              defaultValueMode: value,
                                            })
                                          }
                                          options={[
                                            { label: '不展示默认值', value: 'none' },
                                            { label: '展示统一默认值', value: 'fixed' },
                                            { label: '在条件下展示默认值', value: 'conditional' },
                                          ]}
                                        />
                                      </Form.Item>
                                      <Form.Item label="新建页可见">
                                        <Switch
                                          checked={selectedLayoutItem.createVisible !== false}
                                          onChange={(checked) => setSelectedLayoutItemPatch({ createVisible: checked })}
                                        />
                                      </Form.Item>
                                      <Form.Item label="是否必填">
                                        <Select
                                          value={selectedLayoutItem.required ? 'required' : 'optional'}
                                          onChange={(v) => setSelectedLayoutItemPatch({ required: v === 'required' })}
                                          options={[
                                            { label: '非必填', value: 'optional' },
                                            { label: '必填', value: 'required' },
                                          ]}
                                        />
                                      </Form.Item>
                                    </>
                                  )}
                                </Space>
                              )}
                              {selectedLayoutItem && layoutPageMode === 'create' && (
                                <Typography.Text type="secondary">新建页仅支持拖动调整字段顺序。</Typography.Text>
                              )}
                              <Form.Item name="detailLayoutJson" hidden>
                                <Input.TextArea />
                              </Form.Item>
                            </Card>
                          </div>
                        </Card>

                        <Modal
                          open={tagVisibleModalOpen}
                          title="设置显示条件"
                          onCancel={() => setTagVisibleModalOpen(false)}
                          onOk={() => setTagVisibleModalOpen(false)}
                          destroyOnClose
                        >
                          {!editingTabVisible ? (
                            <Empty />
                          ) : (
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                              <Radio.Group
                                value={editingTabVisible.visibleRule.mode}
                                onChange={(e) =>
                                  updateTabVisibleRule(editingTabVisible.id, {
                                    ...editingTabVisible.visibleRule,
                                    mode: e.target.value,
                                  })
                                }
                              >
                                <Space direction="vertical">
                                  <Radio value="always">默认可见</Radio>
                                  <Radio value="conditional">满足条件可见</Radio>
                                </Space>
                              </Radio.Group>
                              <Form.Item label="条件字段">
                                <Select
                                  value={editingTabVisible.visibleRule.conditions[0]?.field}
                                  onChange={(v) =>
                                    updateTabVisibleRule(editingTabVisible.id, {
                                      ...editingTabVisible.visibleRule,
                                      mode: 'conditional',
                                      conditions: [
                                        {
                                          field: v,
                                          operator: editingTabVisible.visibleRule.conditions[0]?.operator || 'contains',
                                          value: editingTabVisible.visibleRule.conditions[0]?.value || '',
                                        },
                                      ],
                                    })
                                  }
                                  options={[
                                    { label: '角色', value: 'role' },
                                    { label: '业务线', value: 'business' },
                                    { label: '产品线', value: 'product' },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item label="运算符">
                                <Select
                                  value={editingTabVisible.visibleRule.conditions[0]?.operator || 'contains'}
                                  onChange={(v) =>
                                    updateTabVisibleRule(editingTabVisible.id, {
                                      ...editingTabVisible.visibleRule,
                                      mode: 'conditional',
                                      conditions: [
                                        {
                                          field: editingTabVisible.visibleRule.conditions[0]?.field || 'role',
                                          operator: v,
                                          value: editingTabVisible.visibleRule.conditions[0]?.value || '',
                                        },
                                      ],
                                    })
                                  }
                                  options={[
                                    { label: '包含', value: 'contains' },
                                    { label: '等于', value: 'eq' },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item label="目标值">
                                <Select
                                  mode="tags"
                                  value={editingTabVisible.visibleRule.conditions[0]?.value ? [editingTabVisible.visibleRule.conditions[0].value] : []}
                                  onChange={(v) =>
                                    updateTabVisibleRule(editingTabVisible.id, {
                                      ...editingTabVisible.visibleRule,
                                      mode: 'conditional',
                                      conditions: [
                                        {
                                          field: editingTabVisible.visibleRule.conditions[0]?.field || 'role',
                                          operator: editingTabVisible.visibleRule.conditions[0]?.operator || 'contains',
                                          value: v[0] || '',
                                        },
                                      ],
                                    })
                                  }
                                  placeholder="如：测试经理"
                                />
                              </Form.Item>
                              <Alert
                                type="warning"
                                showIcon
                                message="显示条件包括当前标签页中的字段，可能会导致标签页不可见后无法再出现。"
                              />
                            </Space>
                          )}
                        </Modal>

                        <Modal
                          open={previewLayoutOpen}
                          title="预览详情页"
                          footer={null}
                          onCancel={() => setPreviewLayoutOpen(false)}
                          width={1080}
                        >
                          <Tabs
                            activeKey={previewActiveTabId}
                            onChange={setPreviewActiveTabId}
                            items={currentLayoutTabs.map((tab) => ({
                              key: tab.id,
                              label: tab.name,
                              children: (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  {(tab.groups || []).map((group) => (
                                    <Card key={group.id} size="small" title={group.name}>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        {group.items.map((item) => (
                                          <div
                                            key={item.id}
                                            style={{ gridColumn: item.width === 'full' ? '1 / span 2' : 'auto' }}
                                          >
                                            {renderFieldDisplayRow(
                                              item.label,
                                              item.sourceType === 'field'
                                                ? `字段：${item.sourceKey}`
                                                : item.sourceType === 'chart'
                                                  ? `图表占位（${item.chartConfig?.type ?? '未配置'}）`
                                                  : '-',
                                            )}
                                            {item.helpText && (
                                              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                                {item.helpText}
                                              </Typography.Paragraph>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                      {!group.items.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容" />}
                                    </Card>
                                  ))}
                                  {!tab.groups?.length && <Empty description="暂无分组内容" />}
                                </Space>
                              ),
                            }))}
                          />
                        </Modal>
                      </Space>
                    ),
                  },
                  {
                    key: 'flowRule',
                    label: '流程规则',
                    children: (
                      <Card
                        title="流程"
                        extra={
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={createWorkflowCard}
                            disabled={settingsReadonly}
                          >
                            新建流程
                          </Button>
                        }
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                            gap: 16,
                          }}
                        >
                          {workflowCards.map((card) => (
                            <Card
                              key={card.id}
                              size="small"
                              bodyStyle={{ padding: 0 }}
                              style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}
                              onClick={() => openWorkflowConfig(card)}
                            >
                              <div
                                style={{
                                  background: '#f5f6f8',
                                  minHeight: 172,
                                  padding: 16,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {renderWorkflowThumbnail(card)}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderTop: '1px solid #f0f0f0',
                                }}
                              >
                                <Space>
                                  <Typography.Text strong>{card.name}</Typography.Text>
                                  <Typography.Text type="secondary">v{card.version}</Typography.Text>
                                  <Tag color={card.enabled ? 'green' : 'default'}>
                                    {card.enabled ? '启用中' : '已禁用'}
                                  </Tag>
                                </Space>
                                <Dropdown
                                  trigger={['click']}
                                  menu={{
                                    items: [
                                      {
                                        key: 'rename',
                                        label: '修改名称',
                                        icon: <EditOutlined />,
                                      },
                                      {
                                        key: 'duplicate',
                                        label: '创建副本',
                                        icon: <CopyOutlined />,
                                      },
                                      {
                                        key: 'toggle',
                                        label: card.enabled ? '禁用该流程' : '启用该流程',
                                        icon: card.enabled ? <MinusOutlined /> : <PlayCircleOutlined />,
                                      },
                                      {
                                        key: 'divider',
                                        type: 'divider',
                                      },
                                      {
                                        key: 'delete',
                                        label: '删除',
                                        icon: <DeleteOutlined />,
                                        danger: true,
                                      },
                                    ],
                                    onClick: ({ key }) => {
                                      if (settingsReadonly) return;
                                      if (key === 'rename') {
                                        renameWorkflowCard(card.id);
                                      } else if (key === 'duplicate') {
                                        duplicateWorkflowCard(card.id);
                                      } else if (key === 'toggle') {
                                        toggleWorkflowCardStatus(card.id);
                                      } else if (key === 'delete') {
                                        Modal.confirm({
                                          title: '确认删除该流程？',
                                          content: '删除后不可恢复。',
                                          okButtonProps: { danger: true },
                                          onOk: () => deleteWorkflowCard(card.id),
                                        });
                                      }
                                    },
                                  }}
                                >
                                  <Button
                                    icon={<MoreOutlined />}
                                    disabled={settingsReadonly}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Dropdown>
                              </div>
                            </Card>
                          ))}
                        </div>
                        {!workflowCards.length && <Empty description="暂无流程，请新建流程" style={{ marginTop: 24 }} />}
                        <Form.Item name="flowRuleJson" hidden>
                          <Input.TextArea />
                        </Form.Item>
                      </Card>
                    ),
                  },
                  {
                    key: 'flowRole',
                    label: '角色管理',
                    children: (
                      <div
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 12,
                          overflow: 'hidden',
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr',
                          minHeight: 640,
                        }}
                      >
                        <div style={{ padding: 16, borderRight: '1px solid #f0f0f0' }}>
                          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Input
                              value={roleKeyword}
                              onChange={(e) => setRoleKeyword(e.target.value)}
                              allowClear
                              style={{ width: 320 }}
                              prefix={<SearchOutlined />}
                              placeholder="搜索角色名称或角色id"
                            />
                            <Space>
                              <Button onClick={() => createFlowRole('计算类型')}>创建计算角色至其他工作项</Button>
                              <Button type="primary" onClick={() => createFlowRole('普通类型')}>
                                新建角色
                              </Button>
                            </Space>
                          </Space>

                          <Table
                            rowKey="id"
                            size="small"
                            pagination={false}
                            dataSource={filteredFlowRoles}
                            onRow={(record) => ({
                              onClick: () => setSelectedFlowRoleId(record.id),
                            })}
                            rowClassName={(record) =>
                              record.id === selectedFlowRole?.id ? 'ant-table-row-selected' : ''
                            }
                            columns={[
                              {
                                title: '角色名称',
                                dataIndex: 'name',
                                ellipsis: true,
                              },
                              {
                                title: '角色类型',
                                dataIndex: 'roleType',
                                width: 110,
                                render: (value) => <Tag>{value}</Tag>,
                              },
                              {
                                title: '角色出现',
                                dataIndex: 'appearance',
                                width: 110,
                                render: (value) => <Tag>{value}</Tag>,
                              },
                              {
                                title: '成员分配方式',
                                dataIndex: 'memberAssign',
                                width: 120,
                                render: (value) => <Tag>{value}</Tag>,
                              },
                              {
                                title: '限制为单人',
                                dataIndex: 'limitSingle',
                                width: 100,
                                render: (value) => (value ? '是' : '否'),
                              },
                              {
                                title: '成员自动入群',
                                dataIndex: 'autoJoin',
                                width: 110,
                                render: (value) => (value ? '是' : '否'),
                              },
                              {
                                title: '角色id',
                                dataIndex: 'id',
                                width: 140,
                                ellipsis: true,
                              },
                            ]}
                          />
                        </div>

                        <div style={{ padding: 16 }}>
                          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Typography.Title level={4} style={{ margin: 0 }}>
                              流程角色
                            </Typography.Title>
                            <Popconfirm
                              title="确认删除该角色？"
                              okButtonProps={{ danger: true }}
                              onConfirm={removeSelectedFlowRole}
                              disabled={settingsReadonly || !selectedFlowRole}
                            >
                              <Button danger icon={<DeleteOutlined />} disabled={settingsReadonly || !selectedFlowRole} />
                            </Popconfirm>
                          </Space>
                          <Divider style={{ margin: '8px 0 16px' }} />
                          <Form
                            form={flowRoleForm}
                            layout="vertical"
                            disabled={settingsReadonly || !selectedFlowRole}
                            onValuesChange={(_, allValues) => updateSelectedFlowRole(allValues)}
                          >
                            <Typography.Title level={5}>基本信息</Typography.Title>
                            <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
                              <Input placeholder="请输入角色名称" />
                            </Form.Item>
                            <Form.Item name="id" label="角色id">
                              <Input disabled />
                            </Form.Item>
                            <Form.Item name="mappingKey" label="对接标识">
                              <Input placeholder="请填写对接标识" />
                            </Form.Item>

                            <Divider />
                            <Typography.Title level={5}>角色配置</Typography.Title>
                            <Form.Item name="displaySetting" label="角色显示设置">
                              <Select
                                options={[
                                  { label: '默认显示 / 允许用户增删', value: '默认显示 / 允许用户增删' },
                                  { label: '默认隐藏 / 允许用户添加', value: '默认隐藏 / 允许用户添加' },
                                  { label: '默认显示 / 不允许用户删除', value: '默认显示 / 不允许用户删除' },
                                ]}
                              />
                            </Form.Item>
                            <Form.Item name="projectOwner" valuePropName="checked">
                              <Checkbox>产品开发项目负责人</Checkbox>
                            </Form.Item>
                            <Form.Item name="roleType" label="角色类型">
                              <Select
                                options={[
                                  { label: '普通类型', value: '普通类型' },
                                  { label: '计算类型', value: '计算类型' },
                                ]}
                              />
                            </Form.Item>

                            <Divider />
                            <Typography.Title level={5}>成员配置</Typography.Title>
                            <Form.Item name="memberAssign" label="成员分配方式">
                              <Select
                                options={[
                                  { label: '自行添加', value: '自行添加' },
                                  { label: '指定人员', value: '指定人员' },
                                ]}
                              />
                            </Form.Item>
                            <Form.Item name="limitSingle" valuePropName="checked">
                              <Checkbox>限制为单人</Checkbox>
                            </Form.Item>
                            <Form.Item name="autoJoin" valuePropName="checked">
                              <Checkbox>成员自动入群</Checkbox>
                            </Form.Item>
                          </Form>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'viewLayout',
                    label: '视图布局',
                    children: (
                      <Card title="视图布局配置（JSON）">
                        <Typography.Paragraph type="secondary">
                          配置列表视图、分组、默认筛选及排序字段。
                        </Typography.Paragraph>
                        <Form.Item name="viewLayoutJson">
                          <Input.TextArea rows={16} placeholder='例如：{"columns":["name","owner","status"]}' />
                        </Form.Item>
                      </Card>
                    ),
                  },
                ]}
              />
            </Form>
          </Drawer>

          <Drawer
            title={null}
            open={workflowConfigOpen}
            width="100vw"
            onClose={() => setWorkflowConfigOpen(false)}
            destroyOnClose
            bodyStyle={{ padding: 0 }}
            extra={
              <Space>
                <Button
                  type="primary"
                  onClick={saveWorkflowConfig}
                  disabled={settingsReadonly || !activeWorkflowCard}
                >
                  保存
                </Button>
              </Space>
            }
          >
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <Avatar
                    shape="square"
                    style={{ background: selectedWorkItem?.iconColor || '#52c41a' }}
                    icon={<AppstoreAddOutlined />}
                  />
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {selectedWorkItem?.typeName || '工作项'}
                  </Typography.Title>
                </Space>
              </Space>
            </div>

            <div style={{ padding: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Space>
                  <Button
                    icon={<LeftOutlined />}
                    onClick={() => setWorkflowConfigOpen(false)}
                  >
                    返回流程卡片
                  </Button>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    {activeWorkflowCard?.name || '流程配置'}
                  </Typography.Title>
                </Space>

                <Tabs
                  activeKey={workflowConfigTab}
                  onChange={setWorkflowConfigTab}
                  items={[
                    {
                      key: 'basic',
                      label: '基本信息',
                      children: (
                        <Form form={workflowConfigForm} layout="vertical" disabled={settingsReadonly || !activeWorkflowCard}>
                          <Form.Item name="name" label="流程名称" rules={[{ required: true, message: '请输入流程名称' }]}>
                            <Input placeholder="请输入流程名称" />
                          </Form.Item>

                          <Card title="流程配置" bordered={false} bodyStyle={{ padding: 0 }}>
                            <Space direction="vertical" style={{ width: '100%' }} size={14}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Typography.Text strong>状态计算规则</Typography.Text>
                                  <div>
                                    <Typography.Text type="secondary">配置条件与状态计算值</Typography.Text>
                                  </div>
                                </div>
                                <Button onClick={() => message.info('状态计算规则配置页待接入')}>去配置</Button>
                              </div>

                              <Form.Item name="advancedDependencyEnabled" valuePropName="checked">
                                <Checkbox>开启高级依赖</Checkbox>
                              </Form.Item>
                              <Typography.Text type="secondary">
                                启用高级依赖后，可在配置中预定义流程中的依赖项，也可在用户侧灵活增删依赖。
                              </Typography.Text>

                              <Form.Item name="customNodeInfo" label="自定义节点信息">
                                <Select
                                  options={[
                                    { label: '延期标识', value: '延期标识' },
                                    { label: '负责人标识', value: '负责人标识' },
                                    { label: '风险标识', value: '风险标识' },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item name="displayPosition" label="展示位置">
                                <Select
                                  options={[
                                    { label: '节点名称右侧', value: '节点名称右侧' },
                                    { label: '节点名称下方', value: '节点名称下方' },
                                    { label: '节点名称左侧', value: '节点名称左侧' },
                                  ]}
                                />
                              </Form.Item>
                            </Space>
                          </Card>

                          <Card title="流程操作" bordered={false} bodyStyle={{ padding: 0 }}>
                            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Typography.Text strong>流程被引用明细</Typography.Text>
                                </div>
                                <Button onClick={() => message.info('引用明细页待接入')}>查看</Button>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Typography.Text strong>禁用流程</Typography.Text>
                                  <div>
                                    <Typography.Text type="secondary">禁用流程后，使用当前流程的实例将无法使用</Typography.Text>
                                  </div>
                                </div>
                                <Button onClick={() => activeWorkflowCard && toggleWorkflowCardStatus(activeWorkflowCard.id)}>
                                  {activeWorkflowCard?.enabled ? '禁用' : '启用'}
                                </Button>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Typography.Text strong>删除流程</Typography.Text>
                                  <div>
                                    <Typography.Text type="secondary">删除流程后，当前流程的数据将会被清空</Typography.Text>
                                  </div>
                                </div>
                                <Button
                                  danger
                                  onClick={() => {
                                    if (!activeWorkflowCard) return;
                                    deleteWorkflowCard(activeWorkflowCard.id);
                                    setWorkflowConfigOpen(false);
                                  }}
                                >
                                  删除
                                </Button>
                              </div>
                            </Space>
                          </Card>
                        </Form>
                      ),
                    },
                    {
                      key: 'flow',
                      label: '流程图',
                      children: <Empty description="流程图配置待接入" />,
                    },
                    {
                      key: 'wbs',
                      label: 'WBS',
                      children: <Empty description="WBS 配置待接入" />,
                    },
                    {
                      key: 'lane',
                      label: '泳道图',
                      children: (
                        <div style={{ display: 'grid', gridTemplateColumns: laneFullscreen ? '1fr' : '1.6fr 0.9fr', gap: 16, minHeight: 640 }}>
                          <Card
                            size="small"
                            title="泳道图泳道配置"
                            extra={
                              <Space>
                                <Button onClick={addLaneStage} icon={<PlusOutlined />}>
                                  添加阶段
                                </Button>
                                <Button onClick={addLaneRole} icon={<PlusOutlined />}>
                                  添加角色
                                </Button>
                                <Button onClick={() => setLaneShowLines((v) => !v)} icon={<EditOutlined />}>
                                  {laneShowLines ? '隐藏连线' : '显示连线'}
                                </Button>
                                <Button
                                  onClick={() =>
                                    setLaneNodes((prev) =>
                                      reflowLaneOrdersByRelation(autoArrangeLaneNodes(prev, laneRoles, laneStages)),
                                    )
                                  }
                                >
                                  自动布局
                                </Button>
                                <Button
                                  onClick={() => {
                                    setLaneFullscreen((v) => !v);
                                    setSelectedLaneEdge(null);
                                    window.requestAnimationFrame(() => computeLaneNodePositions());
                                  }}
                                >
                                  {laneFullscreen ? '退出最大化' : '最大化'}
                                </Button>
                              </Space>
                            }
                          >
                            <div
                              ref={laneCanvasRef}
                              onClick={() => setSelectedLaneEdge(null)}
                              onScroll={() => computeLaneNodePositions()}
                              style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'auto', position: 'relative' }}
                            >
                              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: laneTableMinWidth }}>
                                <thead>
                                  <tr>
                                    <th
                                      style={{
                                        width: 180,
                                        padding: '10px 12px',
                                        borderBottom: '1px solid #f0f0f0',
                                        borderRight: '1px solid #f0f0f0',
                                        textAlign: 'left',
                                        background: '#fafafa',
                                      }}
                                    >
                                      角色
                                    </th>
                                    {laneStages.map((stage) => (
                                      <th
                                        key={stage.id}
                                        style={{
                                          width: laneStageWidthMap[stage.id] || 260,
                                          minWidth: laneStageWidthMap[stage.id] || 260,
                                          padding: '10px 12px',
                                          borderBottom: '1px solid #f0f0f0',
                                          borderRight: '1px solid #f0f0f0',
                                          background: '#fafafa',
                                        }}
                                      >
                                        <Space>
                                          <Typography.Text strong>{stage.name}</Typography.Text>
                                          <Button type="text" icon={<EditOutlined />} onClick={() => renameLaneStage(stage.id, stage.name)} />
                                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeLaneStage(stage.id)} />
                                        </Space>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {laneRoles.map((role) => (
                                    <tr key={role.id}>
                                      <td
                                        style={{
                                          padding: '10px 12px',
                                          borderBottom: '1px solid #f0f0f0',
                                          borderRight: '1px solid #f0f0f0',
                                          background: '#fafafa',
                                        }}
                                      >
                                        <Space>
                                          <Typography.Text>{role.name}</Typography.Text>
                                          <Button type="text" icon={<EditOutlined />} onClick={() => renameLaneRole(role.id, role.name)} />
                                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeLaneRole(role.id)} />
                                        </Space>
                                      </td>
                                      {laneStages.map((stage) => {
                                        const cellNodes = laneNodes
                                          .filter((node) => node.roleId === role.id && node.stageId === stage.id)
                                          .sort((a, b) => Number(a.laneOrder || 0) - Number(b.laneOrder || 0));
                                        const positionedNodes = cellNodes
                                          .sort((a, b) => {
                                            const colDiff = Number(a.laneOrder || 0) - Number(b.laneOrder || 0);
                                            if (colDiff !== 0) return colDiff;
                                            const ra = swimlaneDisplayRowByNodeId.get(a.id) ?? effectiveSwimlaneRow(a.id, a.stageId);
                                            const rb = swimlaneDisplayRowByNodeId.get(b.id) ?? effectiveSwimlaneRow(b.id, b.stageId);
                                            if (ra !== rb) return ra - rb;
                                            return a.id.localeCompare(b.id);
                                          })
                                          .map((node) => {
                                            const col = Number(node.laneOrder || 0);
                                            const row =
                                              swimlaneDisplayRowByNodeId.get(node.id) ??
                                              effectiveSwimlaneRow(node.id, node.stageId);
                                            return { node, col, row };
                                          });
                                        const maxCol = positionedNodes.length
                                          ? Math.max(...positionedNodes.map((x) => x.col))
                                          : 0;
                                        return (
                                          <td
                                            key={`${role.id}-${stage.id}`}
                                            style={{
                                              width: laneStageWidthMap[stage.id] || 260,
                                              minWidth: laneStageWidthMap[stage.id] || 260,
                                              minHeight: 126,
                                              verticalAlign: 'top',
                                              padding: 10,
                                              borderBottom: '1px solid #f0f0f0',
                                              borderRight: '1px solid #f0f0f0',
                                              position: 'relative',
                                            }}
                                          >
                                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                              <div
                                                style={{
                                                  display: 'grid',
                                                  gridTemplateColumns: `repeat(${Math.max(maxCol + 1, 1)}, ${LANE_NODE_WIDTH + LANE_NODE_GAP}px)`,
                                                  columnGap: 0,
                                                  rowGap: 20,
                                                  alignItems: 'start',
                                                }}
                                              >
                                                {positionedNodes.map(({ node, col, row }) => (
                                                  <div
                                                    key={node.id}
                                                    ref={(el) => {
                                                      laneNodeRefMap.current[node.id] = el;
                                                    }}
                                                      onClick={() => {
                                                        setSelectedLaneNodeId(node.id);
                                                        setSelectedLaneEdge(null);
                                                      }}
                                                    onMouseUp={(e) => {
                                                      if (lineDraft && lineDraft.fromId !== node.id) {
                                                        finishLineDraft(node.id, e);
                                                      }
                                                    }}
                                                    style={{
                                                      position: 'relative',
                                                      width: LANE_NODE_WIDTH,
                                                      minWidth: LANE_NODE_WIDTH,
                                                      maxWidth: LANE_NODE_WIDTH,
                                                      boxSizing: 'border-box',
                                                      minHeight: 42,
                                                      gridColumn: col + 1,
                                                      gridRow: row + 1,
                                                      borderRadius: 12,
                                                      border: node.id === selectedLaneNodeId ? '2px solid #2f54eb' : '1px solid #cfd3dc',
                                                      background: '#fff',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      padding: '6px 16px',
                                                      overflow: 'visible',
                                                      fontWeight: 600,
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    {node.id === selectedLaneNodeId && (
                                                      <Button
                                                        size="small"
                                                        style={{ position: 'absolute', right: 4, top: -28 }}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          startLineDraftFromNode(node.id);
                                                        }}
                                                      >
                                                        增加连线
                                                      </Button>
                                                    )}
                                                    <span
                                                      style={{
                                                        minWidth: 0,
                                                        flex: 1,
                                                        whiteSpace: 'normal',
                                                        wordBreak: 'break-all',
                                                        lineHeight: 1.25,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                      }}
                                                    >
                                                      {node.name}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                              <Button
                                                size="small"
                                                type="dashed"
                                                icon={<PlusOutlined />}
                                                onClick={() => addLaneNodeToCell(role.id, stage.id)}
                                              >
                                                添加节点
                                              </Button>
                                            </Space>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {laneShowLines && (
                                <svg
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    pointerEvents: 'none',
                                  }}
                                  width="100%"
                                  height="100%"
                                >
                                  <defs>
                                    <marker
                                      id="lane-arrow"
                                      markerWidth="4"
                                      markerHeight="4"
                                      refX="3.5"
                                      refY="2"
                                      orient="auto"
                                    >
                                      <path d="M0,0 L4,2 L0,4 z" fill="#2f54eb" />
                                    </marker>
                                  </defs>
                                  {routedPaths.map((route) => {
                                    const edge = swimlaneEdgeMap.get(route.edgeId);
                                    const points = route.points || [];
                                    if (!edge || points.length < 2) return null;
                                    const d = toSvgPath(points);
                                    if (!d) return null;
                                    const anchor = points[points.length - 1];
                                    return (
                                      <g key={route.edgeId}>
                                        <path
                                          d={d}
                                          stroke="#2f54eb"
                                          strokeWidth={2}
                                          fill="none"
                                          markerEnd="url(#lane-arrow)"
                                          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLaneEdge({
                                              fromId: edge.from,
                                              toId: edge.to,
                                              x: anchor.x,
                                              y: anchor.y,
                                            });
                                          }}
                                        />
                                      </g>
                                    );
                                  })}
                                  {lineDraft && laneNodePositions[lineDraft.fromId] && (
                                    <path
                                      d={`M ${laneNodePositions[lineDraft.fromId].right} ${laneNodePositions[lineDraft.fromId].centerY} L ${(laneNodePositions[lineDraft.fromId].right + lineDraft.x) / 2} ${laneNodePositions[lineDraft.fromId].centerY} L ${(laneNodePositions[lineDraft.fromId].right + lineDraft.x) / 2} ${lineDraft.y} L ${lineDraft.x} ${lineDraft.y}`}
                                      stroke="#2f54eb"
                                      strokeDasharray="6 4"
                                      strokeWidth={2}
                                      fill="none"
                                      markerEnd="url(#lane-arrow)"
                                    />
                                  )}
                                </svg>
                              )}
                              {laneShowLines && selectedLaneEdge && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: selectedLaneEdge.x - 40,
                                    top: selectedLaneEdge.y - 34,
                                    pointerEvents: 'all',
                                    zIndex: 5,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    size="small"
                                    type="default"
                                    onClick={() => deleteLaneEdge(selectedLaneEdge.fromId, selectedLaneEdge.toId)}
                                  >
                                    删除连线
                                  </Button>
                                </div>
                              )}
                              {laneShowLines && (
                                <div style={{ padding: 8, borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                                  <Typography.Text type="secondary">
                                    连线可拖动线尾调整关系。前后代表串行，上下代表并行。
                                  </Typography.Text>
                                </div>
                              )}
                            </div>
                          </Card>

                          {!laneFullscreen && <Card size="small" title="节点配置区">
                            {!selectedLaneNode ? (
                              <Empty description="请选择左侧节点进行配置" />
                            ) : (
                              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                <Tabs
                                  activeKey={laneRightTab}
                                  onChange={setLaneRightTab}
                                  items={[
                                    { key: 'nodeInfo', label: '节点信息' },
                                    { key: 'nodeTransfer', label: '节点流转' },
                                    { key: 'nodeSub', label: '节点子项' },
                                    { key: 'nodeEvent', label: '节点事件' },
                                  ]}
                                />
                                <Form form={laneNodeForm} layout="vertical">
                                  {laneRightTab === 'nodeInfo' && (
                                    <>
                                      <Form.Item name="name" label="节点名称" rules={[{ required: true, message: '请输入节点名称' }]}>
                                        <Input />
                                      </Form.Item>
                                      <Form.Item name="statusTags" label="节点所属状态">
                                        <Select mode="tags" placeholder="请输入状态，如：投标" />
                                      </Form.Item>
                                    </>
                                  )}
                                  {laneRightTab === 'nodeTransfer' && (
                                    <Form.Item name="nextIds" label="流转到节点">
                                      <Select
                                        mode="multiple"
                                        options={laneNodes
                                          .filter((node) => node.id !== selectedLaneNode.id)
                                          .map((node) => ({ label: node.name, value: node.id }))}
                                      />
                                    </Form.Item>
                                  )}
                                  {laneRightTab === 'nodeSub' && (
                                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                                      <Card
                                        size="small"
                                        title={
                                          <Space>
                                            <Checkbox checked disabled />
                                            <Typography.Text strong>子任务</Typography.Text>
                                          </Space>
                                        }
                                      >
                                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                          <Checkbox
                                            checked={selectedLaneNode.subTaskDisplayOnCard !== false}
                                            onChange={(e) =>
                                              patchSelectedLaneNode(() => ({
                                                subTaskDisplayOnCard: e.target.checked,
                                              }))
                                            }
                                          >
                                            默认在节点卡片展示
                                          </Checkbox>
                                          <Divider style={{ margin: 0 }} />
                                          <Typography.Text strong>预置任务</Typography.Text>
                                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                            {(selectedLaneNode.subTasks || []).map((task, index, arr) => (
                                              <div
                                                key={task.id}
                                                style={{
                                                  border: '1px solid #e5e6eb',
                                                  borderRadius: 10,
                                                  padding: '10px 12px',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                }}
                                              >
                                                <Space>
                                                  <Typography.Text type="secondary">⋮⋮</Typography.Text>
                                                  <Typography.Text strong>{task.name}</Typography.Text>
                                                </Space>
                                                <Space>
                                                  <Tag>{task.required ? '必填' : '选填'}</Tag>
                                                  <Button
                                                    size="small"
                                                    onClick={() => moveNodeSubTask(task.id, 'up')}
                                                    disabled={index === 0}
                                                  >
                                                    上移
                                                  </Button>
                                                  <Button
                                                    size="small"
                                                    onClick={() => moveNodeSubTask(task.id, 'down')}
                                                    disabled={index === arr.length - 1}
                                                  >
                                                    下移
                                                  </Button>
                                                  <Button size="small" onClick={() => toggleNodeSubTaskRequired(task.id)}>
                                                    {task.required ? '改为选填' : '改为必填'}
                                                  </Button>
                                                  <Button size="small" icon={<EditOutlined />} onClick={() => renameNodeSubTask(task.id, task.name)} />
                                                  <Popconfirm title="确认删除该任务？" onConfirm={() => removeNodeSubTask(task.id)}>
                                                    <Button size="small" icon={<DeleteOutlined />} danger />
                                                  </Popconfirm>
                                                </Space>
                                              </div>
                                            ))}
                                            <Button type="dashed" onClick={addNodeSubTask}>
                                              添加任务
                                            </Button>
                                          </Space>
                                        </Space>
                                      </Card>
                                      <div>
                                        <Typography.Title level={5} style={{ marginBottom: 8 }}>
                                          子工作项
                                        </Typography.Title>
                                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                          <Button type="dashed" onClick={addSubWorkItemType}>
                                            新增子工作项类型
                                          </Button>
                                          {!!(selectedLaneNode.subWorkItemTypes || []).length && (
                                            <Space wrap>
                                              {(selectedLaneNode.subWorkItemTypes || []).map((item) => (
                                                <Tag
                                                  key={item}
                                                  closable
                                                  onClose={(e) => {
                                                    e.preventDefault();
                                                    removeSubWorkItemType(item);
                                                  }}
                                                >
                                                  {item}
                                                </Tag>
                                              ))}
                                            </Space>
                                          )}
                                        </Space>
                                      </div>
                                    </Space>
                                  )}
                                  {laneRightTab === 'nodeEvent' && (
                                    <Form.Item name="events" label="节点事件">
                                      <Input.TextArea rows={8} placeholder="请输入节点事件或触发规则" />
                                    </Form.Item>
                                  )}
                                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <Popconfirm
                                      title="确认删除该节点？"
                                      onConfirm={() => removeLaneNode(selectedLaneNode.id)}
                                    >
                                      <Button danger>删除节点</Button>
                                    </Popconfirm>
                                    <Button type="primary" onClick={saveLaneNodeForm}>
                                      保存节点配置
                                    </Button>
                                  </Space>
                                </Form>
                              </Space>
                            )}
                          </Card>}
                        </div>
                      ),
                    },
                  ]}
                />
              </Space>
            </div>
          </Drawer>

          <Modal
            title={editingField ? '编辑字段' : '新建字段'}
            open={fieldModalOpen}
            onCancel={() => setFieldModalOpen(false)}
            onOk={submitField}
            width={980}
            bodyStyle={{ maxHeight: '72vh', overflowY: 'auto', paddingInline: 28 }}
            destroyOnClose
          >
            <Form form={fieldForm} layout="vertical">
              {renderSectionTitle('基础信息配置')}
              <Form.Item name="fieldName" label="字段名称" rules={[{ required: true, message: '请输入字段名称' }]}>
                <Input placeholder="请输入字段名称" />
              </Form.Item>
              <Form.Item name="fieldType" label="字段类型" rules={[{ required: true, message: '请选择字段类型' }]}>
                <Select
                  suffixIcon={<AppstoreAddOutlined />}
                  onChange={(v) => {
                    const ft = String(v);
                    if (relationFieldTypes.includes(ft as any) && !relationAuths.length && !relationLoading) {
                      loadSpaceRelationAuths();
                    }
                  }}
                  options={[
                    { label: '单行文本', value: 'text' },
                    { label: '多行文本', value: 'textarea' },
                    { label: '富文本', value: 'rich_text' },
                    { label: '单选', value: 'single_select' },
                    { label: '多选', value: 'multi_select' },
                    { label: '单选人员', value: 'member' },
                    { label: '多选人员', value: 'members' },
                    { label: '日期', value: 'date' },
                    { label: '日期区间', value: 'date_range' },
                    { label: '日期+时间', value: 'date_time' },
                    { label: '公式计算', value: 'formula' },
                    { label: '复合字段', value: 'composite' },
                    { label: '数值', value: 'number' },
                    { label: '开关', value: 'switch' },
                    { label: '表态投票', value: 'vote_attitude' },
                    { label: '单选投票', value: 'vote_single' },
                    { label: '多选投票', value: 'vote_multi' },
                    { label: 'URL链接', value: 'url' },
                    { label: '单选关联工作项', value: 'work_item_relation' },
                    { label: '多选关联工作项', value: 'work_item_relation_multi' },
                    { label: '单附件', value: 'attachment' },
                    { label: '多附件', value: 'multi_attachment' },
                  ]}
                />
              </Form.Item>
              <Space size={24} wrap>
                <Form.Item name="isEnabledFlag" valuePropName="checked" label="是否启用" style={{ marginBottom: 0 }}>
                  <Switch />
                </Form.Item>
                <Form.Item name="isRequiredFlag" valuePropName="checked" label="是否必填" style={{ marginBottom: 0 }}>
                  <Switch />
                </Form.Item>
              </Space>

              <Form.Item noStyle shouldUpdate>
                {() => {
                  const fieldType = fieldForm.getFieldValue('fieldType');
                  const isTextType = textFieldTypes.includes(fieldType);
                  const isSelectType = selectFieldTypes.includes(fieldType);
                  const isMemberType = memberFieldTypes.includes(fieldType);
                  const isDateType = dateFieldTypes.includes(fieldType);
                  const isVoteType = voteFieldTypes.includes(fieldType);
                  const isFormulaType = formulaFieldTypes.includes(fieldType);
                  const isNumberType = numberFieldTypes.includes(fieldType);
                  const isAttachmentType = attachmentFieldTypes.includes(fieldType);
                  const isCompositeType = compositeFieldTypes.includes(fieldType);
                  const isRelationType = relationFieldTypes.includes(fieldType);
                  if (
                    !isTextType &&
                    !isSelectType &&
                    !isMemberType &&
                    !isDateType &&
                    !isVoteType &&
                    !isFormulaType &&
                    !isNumberType &&
                    !isAttachmentType &&
                    !isCompositeType &&
                    !isRelationType
                  ) return null;
                  return (
                    <>
                      <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 18px' }} />
                      {isFormulaType && (
                        <>
                          <Form.Item
                            name="formulaExpression"
                            label="配置计算公式"
                            rules={[{ required: true, message: '请配置计算公式' }]}
                          >
                            <Button style={{ width: '100%' }} onClick={openFormulaEditor}>
                              去配置
                            </Button>
                          </Form.Item>
                          <Form.Item
                            name="formulaResultType"
                            label="公式结果类型"
                            rules={[{ required: true, message: '请选择结果类型' }]}
                          >
                            <Select
                              options={[
                                { label: '数值', value: 'number' },
                                { label: '文本', value: 'text' },
                                { label: '是/否', value: 'boolean' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="freezeFormulaResult" valuePropName="checked">
                            <Checkbox>工作项完成后冻结计算结果</Checkbox>
                          </Form.Item>
                        </>
                      )}
                      {isNumberType && (
                        <>
                          {renderSectionTitle('数字配置')}
                          <Form.Item name="numberMode" label="数值类型" initialValue="decimal">
                            <Select options={[{ label: '小数', value: 'decimal' }, { label: '整数', value: 'integer' }]} />
                          </Form.Item>
                          <Space size={12} style={{ width: '100%' }} wrap>
                            <Form.Item name="numberMin" label="最小值" style={{ flex: 1, minWidth: 180 }}>
                              <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="numberMax" label="最大值" style={{ flex: 1, minWidth: 180 }}>
                              <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item noStyle shouldUpdate={(p, c) => p.numberMode !== c.numberMode}>
                              {() =>
                                fieldForm.getFieldValue('numberMode') === 'integer' ? null : (
                                  <Form.Item name="numberPrecision" label="精度" style={{ flex: 1, minWidth: 180 }}>
                                    <InputNumber min={0} style={{ width: '100%' }} />
                                  </Form.Item>
                                )
                              }
                            </Form.Item>
                          </Space>
                          <Form.Item noStyle shouldUpdate={(p, c) => p.numberMin !== c.numberMin || p.numberMax !== c.numberMax}>
                            {() => {
                              const min = fieldForm.getFieldValue('numberMin');
                              const max = fieldForm.getFieldValue('numberMax');
                              if (min === undefined || min === null || max === undefined || max === null) return null;
                              if (Number(min) > Number(max)) {
                                return (
                                  <Alert
                                    type="warning"
                                    showIcon
                                    message="数值范围提示"
                                    description="最小值不能大于最大值，请调整。"
                                    style={{ marginBottom: 12 }}
                                  />
                                );
                              }
                              return null;
                            }}
                          </Form.Item>
                          <Form.Item
                            name="numberScaleMode"
                            label={
                              <Space size={6}>
                                数值位数缩放
                                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                              </Space>
                            }
                          >
                            <Select
                              options={[
                                { label: '原值', value: 'origin' },
                                { label: '千', value: 'thousand' },
                                { label: '万', value: 'ten_thousand' },
                                { label: '亿', value: 'hundred_million' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="numberSymbol" label="符号设置">
                            <Select
                              options={[
                                { label: '不显示符号', value: 'none' },
                                { label: '百分比(%)', value: 'percent' },
                                { label: '货币符号(¥)', value: 'currency' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="numberDecimalPlaces" label="小数显示位数">
                            <Select
                              options={[
                                { label: '不限', value: 'unlimited' },
                                { label: '0位', value: '0' },
                                { label: '1位', value: '1' },
                                { label: '2位', value: '2' },
                                { label: '3位', value: '3' },
                                { label: '4位', value: '4' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="numberUseThousands" valuePropName="checked">
                            <Checkbox>使用千分位符</Checkbox>
                          </Form.Item>
                          <Space size={12} style={{ width: '100%' }} wrap>
                            <Form.Item name="readonlyFlag" valuePropName="checked" style={{ marginBottom: 0 }}>
                              <Checkbox>只读</Checkbox>
                            </Form.Item>
                            <Form.Item name="showInDetailFlag" valuePropName="checked" style={{ marginBottom: 0 }}>
                              <Checkbox>详情页展示</Checkbox>
                            </Form.Item>
                          </Space>
                          <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 18px' }} />
                        </>
                      )}
                      {isDateType && (
                        <>
                          {renderSectionTitle('日期显示设置')}
                          <Space size={12} style={{ width: '100%' }} wrap>
                            <Form.Item name="readonlyFlag" valuePropName="checked" style={{ marginBottom: 0 }}>
                              <Checkbox>只读</Checkbox>
                            </Form.Item>
                            <Form.Item name="showInDetailFlag" valuePropName="checked" style={{ marginBottom: 0 }}>
                              <Checkbox>详情页展示</Checkbox>
                            </Form.Item>
                          </Space>
                          <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 18px' }} />
                        </>
                      )}
                      {isSelectType && (
                        <>
                          {renderSectionTitle('选项配置')}
                          <Form.Item name="optionConfigMode" label="选项配置方式" rules={[{ required: true }]} initialValue="custom">
                            <Select options={[{ label: '自定义选项', value: 'custom' }]} />
                          </Form.Item>
                          <Space size={12} style={{ width: '100%' }} wrap>
                            <Form.Item name="readonlyFlag" valuePropName="checked" style={{ marginBottom: 0 }}>
                              <Checkbox>只读</Checkbox>
                            </Form.Item>
                            <Form.Item name="showInDetailFlag" valuePropName="checked" style={{ marginBottom: 0 }}>
                              <Checkbox>详情页展示</Checkbox>
                            </Form.Item>
                          </Space>
                          <Form.List
                            name="fieldOptions"
                            rules={[
                              {
                                validator: async (_, value) => {
                                  const valid = (value || []).map((x: any) => String(x || '').trim()).filter(Boolean);
                                  if (!valid.length) {
                                    throw new Error('请至少配置一个选项');
                                  }
                                },
                              },
                            ]}
                          >
                            {(fields, { add, remove }, { errors }) => (
                              <Form.Item label="配置选项" required>
                                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                  {fields.map((field, idx) => (
                                    <Space key={field.key} style={{ width: '100%' }}>
                                      <Form.Item
                                        {...field}
                                        style={{ flex: 1, marginBottom: 0 }}
                                        rules={[{ required: true, whitespace: true, message: '请输入选项内容' }]}
                                      >
                                        <Input placeholder={`选项${idx + 1}`} />
                                      </Form.Item>
                                      <Button danger onClick={() => remove(field.name)}>
                                        删除
                                      </Button>
                                    </Space>
                                  ))}
                                  <Button type="dashed" onClick={() => add()}>
                                    添加选项
                                  </Button>
                                  <Form.ErrorList errors={errors} />
                                </Space>
                              </Form.Item>
                            )}
                          </Form.List>
                          <Form.Item name="allowUserAddOption" valuePropName="checked">
                            <Checkbox>
                              允许用户添加选项 <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                            </Checkbox>
                          </Form.Item>
                        </>
                      )}
                      {isTextType && (
                        <>
                          {renderSectionTitle('文本配置')}
                          <Form.Item
                            name="maxLength"
                            label="最大长度"
                            extra="正整数，不填表示不限制；0 无效"
                          >
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="不填表示不限制" />
                          </Form.Item>
                          <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 18px' }} />
                        </>
                      )}
                      {isRelationType && (
                        <>
                          <div style={{ marginBottom: 10 }}>{renderSectionTitle('关联工作项设置')}</div>
                          <Form.Item name="readonlyFlag" valuePropName="checked" style={{ marginBottom: 0 }}>
                            <Checkbox>只读</Checkbox>
                          </Form.Item>
                          <Form.Item name="showInDetailFlag" valuePropName="checked" style={{ marginBottom: 0 }}>
                            <Checkbox>详情页展示</Checkbox>
                          </Form.Item>
                          <Divider style={{ margin: '10px 0' }} />
                          <Form.Item
                            name="relationId"
                            label="绑定关系（relationId）"
                            rules={[{ required: true, message: '请选择关系模型' }]}
                          >
                            <Select
                              loading={relationLoading}
                              placeholder="请选择关系模型"
                              options={relationAuths
                                .filter((r) => r.id != null)
                                .map((r) => ({
                                  label: `${r.resourceType || 'unknown'}:${r.resourceKey || 'all'}（目标空间：${r.targetSpaceId || '-'})`,
                                  value: String(r.id),
                                }))}
                            />
                          </Form.Item>
                          <Form.Item
                            name="relationKind"
                            label="关系"
                            rules={[{ required: true, message: '请选择关系' }]}
                          >
                            <Select
                              options={[
                                { label: '父子关系', value: 'parent_child' },
                                { label: '阻塞关系', value: 'block' },
                                { label: '依赖关系', value: 'depend' },
                                { label: '一般关联', value: 'related' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="relationVisibleScope" label="数据可见范围">
                            <Select
                              options={[
                                { label: '固定数据范围', value: 'fixed' },
                                { label: '全部数据', value: 'all' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item label="设置数据范围">
                            <Button
                              style={{ width: '100%' }}
                              onClick={() => {
                                const currentCount = Number(fieldForm.getFieldValue('relationDataRangeCount') || 0);
                                fieldForm.setFieldValue('relationDataRangeCount', currentCount + 1);
                                message.success('已模拟添加数据范围');
                              }}
                            >
                              设置数据范围（{Number(fieldForm.getFieldValue('relationDataRangeCount') || 0)}个）
                            </Button>
                          </Form.Item>
                          <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 18px' }} />
                        </>
                      )}
                      {isVoteType && (
                        <>
                          {renderSectionTitle(fieldType === 'vote_attitude' ? '结果显示开关' : '配置投票选项')}
                          {fieldType !== 'vote_attitude' && (
                            <Form.List
                              name="fieldOptions"
                              rules={[
                                {
                                  validator: async (_, value) => {
                                    const valid = (value || []).map((x: any) => String(x || '').trim()).filter(Boolean);
                                    if (!valid.length) {
                                      throw new Error('请至少配置一个投票选项');
                                    }
                                  },
                                },
                              ]}
                            >
                              {(fields, { add, remove }, { errors }) => (
                                <Form.Item label="配置投票选项" required>
                                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                    {fields.map((field, idx) => (
                                      <Space key={field.key} style={{ width: '100%' }}>
                                        <Form.Item
                                          {...field}
                                          style={{ flex: 1, marginBottom: 0 }}
                                          rules={[{ required: true, whitespace: true, message: '请输入选项内容' }]}
                                        >
                                          <Input placeholder={`投票选项${idx + 1}`} />
                                        </Form.Item>
                                        <Button danger onClick={() => remove(field.name)}>
                                          删除
                                        </Button>
                                      </Space>
                                    ))}
                                    <Button type="dashed" onClick={() => add()}>
                                      添加选项
                                    </Button>
                                    <Form.ErrorList errors={errors} />
                                  </Space>
                                </Form.Item>
                              )}
                            </Form.List>
                          )}
                          <Form.Item
                            name="voteResultSwitchField"
                            label={
                              <Space size={6}>
                                结果显示开关
                                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                              </Space>
                            }
                          >
                            <Select placeholder="请选择开关字段" allowClear options={switchFieldOptions} />
                          </Form.Item>
                        </>
                      )}
                      {isMemberType && (
                        <Form.Item name="memberAutoJoin" valuePropName="checked">
                          <Checkbox>
                            成员自动入群 <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                          </Checkbox>
                        </Form.Item>
                      )}
                      {fieldType === 'date_time' && (
                        <>
                          {renderSectionTitle('时间配置')}
                          <Form.Item
                            name="timeAutoFillRule"
                            label={
                              <Space size={6}>
                                时间自动填充规则
                                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                              </Space>
                            }
                          >
                            <Select
                              options={[
                                { label: '不自动填充', value: 'none' },
                                { label: '自动填充为当前时间', value: 'now' },
                              ]}
                            />
                          </Form.Item>
                        </>
                      )}
                      {isAttachmentType && (
                        <Typography.Text type="secondary">
                          附件字段支持上传单个或多个文件，默认值仅支持“不展示默认值”。
                        </Typography.Text>
                      )}
                      {isTextType && (
                        <Form.Item name="repeatCheckEnabled" valuePropName="checked">
                          <Checkbox>
                            重复值校验
                            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                              开启后，填写时将校验此字段是否重复（255字符长度以下）
                            </Typography.Text>
                          </Checkbox>
                        </Form.Item>
                      )}
                    </>
                  );
                }}
              </Form.Item>

              <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 18px' }} />
              {renderSectionTitle('数据规则配置')}
              <Form.Item noStyle shouldUpdate>
                {() => {
                  const fieldType = fieldForm.getFieldValue('fieldType');
                  const isAttachmentType = attachmentFieldTypes.includes(fieldType);
                  const isCompositeType = compositeFieldTypes.includes(fieldType);
                  const isFormulaType = formulaFieldTypes.includes(fieldType);
                  const isVoteType = voteFieldTypes.includes(fieldType);
                  const isRelationType = relationFieldTypes.includes(fieldType);
                  const showEnabled = !isAttachmentType;
                  const showDefault = !isCompositeType && !isFormulaType && !isVoteType;
                  return (
                    <>
                      {showEnabled && (
                        <Form.Item
                          name="isEnabledFlag"
                          label={
                            <Space size={6}>
                              字段有效性
                              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                            </Space>
                          }
                        >
                          <Select
                            options={[
                              { label: '字段默认有效', value: true },
                              { label: '字段默认无效', value: false },
                            ]}
                          />
                        </Form.Item>
                      )}
                      {showDefault && (
                        <>
                          <Form.Item
                            name="defaultValueMode"
                            label={
                              <Space size={6}>
                                默认值
                                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                              </Space>
                            }
                          >
                            <Select
                              options={[
                                { label: '不展示默认值', value: 'none' },
                                { label: '固定默认值', value: 'fixed' },
                                { label: '条件展示默认值', value: 'conditional' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item noStyle shouldUpdate>
                            {() => {
                              const mode = fieldForm.getFieldValue('defaultValueMode');
                              if (!mode || mode === 'none') return null;
                              return (
                                <Form.Item name="defaultValue" label="默认值配置">
                                  <Input.TextArea rows={2} placeholder="填写默认值或条件说明" />
                                </Form.Item>
                              );
                            }}
                          </Form.Item>
                        </>
                      )}
                      {isRelationType && (
                        <Form.Item label="数据额外展示信息">
                          <Button
                            style={{ width: '100%' }}
                            onClick={() => {
                              const next = !fieldForm.getFieldValue('relationExtraDisplayEnabled');
                              fieldForm.setFieldValue('relationExtraDisplayEnabled', next);
                              message.success(next ? '已开启额外展示信息' : '已关闭额外展示信息');
                            }}
                          >
                            设置展示信息
                          </Button>
                        </Form.Item>
                      )}
                      <Form.Item name="relationDataRangeCount" hidden>
                        <InputNumber />
                      </Form.Item>
                      <Form.Item name="relationExtraDisplayEnabled" hidden valuePropName="checked">
                        <Checkbox />
                      </Form.Item>
                    </>
                  );
                }}
              </Form.Item>

              <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 18px' }} />
              {renderSectionTitle('权限配置')}
              <Form.Item label="字段权限">
                <Button style={{ width: '100%' }} onClick={() => message.info('权限规则配置待接入')}>
                  配置权限规则
                </Button>
              </Form.Item>
              <Form.Item name="authorizedRoleList" hidden>
                <Select mode="multiple" options={copyRoleOptions} />
              </Form.Item>

              <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 18px' }} />
              {renderSectionTitle('高级信息配置')}
              <Form.Item
                name="fieldKey"
                label="对接标识"
                rules={[
                  { required: true, message: '请填写对接标识' },
                  { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '仅支持字母开头，字母/数字/下划线' },
                  {
                    validator: async (_, value) => {
                      const v = String(value || '').trim();
                      if (!v) return;
                      const exist = (workItemFields || []).find(
                        (f) => String(f.fieldKey || '').trim() === v && (!editingField?.id || f.id !== editingField.id),
                      );
                      if (exist) throw new Error('字段标识已存在，请更换');
                    },
                  },
                ]}
              >
                <Input placeholder="请填写对接标识" />
              </Form.Item>
              <Form.Item name="helpText" label="字段描述">
                <Input placeholder="请填写字段描述" />
              </Form.Item>
              <Form.Item name="batchCreateToOthers" valuePropName="checked">
                <Checkbox>批量创建至其他工作项</Checkbox>
              </Form.Item>
              <Form.Item name="isRequiredFlag" valuePropName="checked" hidden>
                <Checkbox>必填字段</Checkbox>
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="配置计算公式"
            open={formulaModalOpen}
            onCancel={() => setFormulaModalOpen(false)}
            onOk={applyFormulaEditor}
            okText="确认"
            cancelText="取消"
            width={960}
            zIndex={2100}
            getContainer={() => document.body}
            destroyOnClose
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Input.TextArea
                rows={10}
                value={formulaDraft}
                onChange={(e) => setFormulaDraft(e.target.value)}
                placeholder='例如：({hours}/8)*100 或 MUL({price},{qty}) 或 AVG({a},{b},{c})'
              />
              <Typography.Text type="secondary">
                支持字段引用 {'{fieldKey}'}、括号与四则运算 + - * /（除数为 0 时结果为 0）、函数 IF / SUM / AVG / COUNT / CONCAT / MUL；函数参数内不可再嵌套函数，括号与外层的混合运算可以包含函数。
              </Typography.Text>
            </Space>
          </Modal>
        </Space>
      )}

      {activeTab === 'permission' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined />
                角色与权限
              </Space>
            }
            extra={<Button icon={<PlusOutlined />}>新增角色</Button>}
          >
            <Table
              rowKey="role"
              pagination={false}
              columns={roleColumns}
              dataSource={[
                { role: '空间管理员', memberCount: 2, scope: ['配置管理', '成员管理', '自动化管理'] },
                { role: '项目经理', memberCount: 5, scope: ['工作项管理', '报表查看'] },
                { role: '协作成员', memberCount: 18, scope: ['工作项查看', '评论与更新'] },
              ]}
            />
          </Card>
        </Space>
      )}

      {activeTab === 'plugin' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            title={
              <Space>
                <ApiOutlined />
                插件管理
              </Space>
            }
            extra={<Button icon={<PlusOutlined />}>安装插件</Button>}
          >
            <Table
              rowKey="name"
              pagination={false}
              columns={[
                { title: '插件名称', dataIndex: 'name' },
                { title: '来源', dataIndex: 'source' },
                { title: '版本', dataIndex: 'version' },
                {
                  title: '状态',
                  dataIndex: 'enabled',
                  render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
                },
                {
                  title: '操作',
                  dataIndex: 'action',
                  render: (_: any, record: any) => (
                    <Space>
                      <Button type="link" onClick={() => message.info(`配置插件：${record.name}`)}>
                        配置
                      </Button>
                      <Button type="link" onClick={() => message.info(`${record.enabled ? '停用' : '启用'}插件：${record.name}`)}>
                        {record.enabled ? '停用' : '启用'}
                      </Button>
                    </Space>
                  ),
                },
              ]}
              dataSource={[
                { name: '飞书机器人', source: '官方插件市场', version: '1.2.0', enabled: true },
                { name: 'Jira 同步', source: '官方插件市场', version: '2.0.3', enabled: false },
                { name: 'Sentry 缺陷同步', source: '企业自研', version: '0.9.1', enabled: true },
              ]}
            />
          </Card>
        </Space>
      )}

      {activeTab === 'relation' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            title={
              <Space>
                <LinkOutlined />
                空间关联
              </Space>
            }
            extra={
              <Button icon={<PlusOutlined />} type="primary" onClick={openCreateRelationAuth}>
                新增授权
              </Button>
            }
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="多空间数据默认隔离；仅在空间关联授权后，才允许跨空间读取数据。"
            />
            <Table
              rowKey={(row) => String(row.id || `${row.targetSpaceId}-${row.resourceType}-${row.resourceKey || 'all'}`)}
              loading={relationLoading}
              pagination={false}
              columns={relationColumns as any}
              dataSource={relationAuths}
              locale={{ emptyText: <Empty description="暂无空间关联授权" /> }}
            />
          </Card>

          <Modal
            title={editingRelation?.id ? '编辑空间授权' : '新增空间授权'}
            open={relationModalOpen}
            onCancel={() => setRelationModalOpen(false)}
            onOk={submitRelationAuth}
            okText="保存"
            cancelText="取消"
          >
            <Form form={relationForm} layout="vertical">
              <Form.Item
                name="targetSpaceId"
                label="目标空间"
                rules={[{ required: true, message: '请选择目标空间' }]}
              >
                <Select options={relationTargetSpaceOptions} placeholder="选择可授权访问的目标空间" />
              </Form.Item>

              <Form.Item
                name="resourceType"
                label="授权层级"
                rules={[{ required: true, message: '请选择授权层级' }]}
              >
                <Radio.Group
                  options={[
                    { label: '类型级（工作项类型）', value: 'work_item_type' },
                    { label: '记录级（工作项数据）', value: 'work_item_record' },
                  ]}
                />
              </Form.Item>

              <Form.Item name="resourceKeyMode" label="授权范围">
                <Radio.Group
                  options={[
                    { label: '全部资源', value: 'all' },
                    { label: '指定资源ID', value: 'single' },
                  ]}
                />
              </Form.Item>

              <Form.Item noStyle shouldUpdate>
                {() => {
                  const mode = relationForm.getFieldValue('resourceKeyMode');
                  if (mode !== 'single') return null;
                  return (
                    <Form.Item
                      name="resourceKey"
                      label="资源标识"
                      rules={[{ required: true, message: '请填写资源标识' }]}
                      extra="类型级填工作项类型ID；记录级填工作项记录ID"
                    >
                      <Input placeholder="例如：13 或 10023" />
                    </Form.Item>
                  );
                }}
              </Form.Item>

              <Form.Item name="status" label="状态" initialValue={1}>
                <Select
                  options={[
                    { label: '启用', value: 1 },
                    { label: '禁用', value: 0 },
                  ]}
                />
              </Form.Item>

              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={3} placeholder="可填写授权说明" />
              </Form.Item>
            </Form>
          </Modal>
        </Space>
      )}

      {activeTab === 'automation' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            title={
              <Space>
                <RobotOutlined />
                自动化规则
              </Space>
            }
            extra={
              <Space>
                <span>自动化总开关</span>
                <Switch checked={automationEnabled} onChange={setAutomationEnabled} />
                <Button type="primary" icon={<PlusOutlined />}>
                  新增规则
                </Button>
              </Space>
            }
          >
            <List
              dataSource={[
                {
                  name: '需求逾期提醒',
                  trigger: '需求状态=待评审 且超过 48h',
                  action: '通知产品经理和审批人',
                  status: '启用',
                },
                {
                  name: '高优缺陷升级',
                  trigger: '缺陷优先级=P0',
                  action: '自动拉群并 @技术负责人',
                  status: '启用',
                },
              ]}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="run" type="link" icon={<PlayCircleOutlined />}>
                      执行一次
                    </Button>,
                    <Button key="edit" type="link" onClick={() => message.info(`编辑规则：${item.name}`)}>
                      编辑
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<ClockCircleOutlined />}
                    title={
                      <Space>
                        {item.name}
                        <Tag color="green">{item.status}</Tag>
                      </Space>
                    }
                    description={`触发条件：${item.trigger}；执行动作：${item.action}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Space>
      )}
    </PageContainer>
  );
};

export default SpaceConfigPage;
