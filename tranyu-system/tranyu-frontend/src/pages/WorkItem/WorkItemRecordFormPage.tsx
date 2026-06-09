import React, { useEffect, useMemo, useRef, useState } from 'react';
import { history, useLocation, useParams } from 'umi';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from 'antd';
import {
  createWorkItemRecord,
  fetchWorkItemFields,
  fetchWorkItemRecordPage,
  fetchWorkItemRecordDetail,
  fetchWorkItemSettings,
  updateWorkItemRecord,
  type WorkItemField,
  type WorkItemType,
} from '@/services/workItem';
import { fetchSpaceRelationAuths, type SpaceRelationAuth } from '@/services/spaceRelation';
import { withSpaceId } from '@/utils/space';
import {
  isFieldReadonly,
  isFieldShownInDetail,
  isRichTextContentEmpty,
  type FieldOptionItem,
  parseFieldOptions,
} from '@/utils/workItemFieldMeta';
import {
  coerceFormulaResult,
  evaluateFormula,
  validateFormulaReferences,
} from '@/utils/workItemFormula';
import { renderWorkItemFieldFormItem } from '@/components/WorkItem/FieldRenderer';
import {
  buildNodeRects,
  buildSwimlaneEdges,
  routeSwimlaneEdges,
  SWIMLANE_ROUTING_OPTIONS,
  toSvgPath,
  type SwimlaneNode,
} from '@/utils/swimlane-routing';
import type { ChartConfigV1 } from '@/utils/chartConfigTypes';
import LayoutChartWidgetView from '@/components/WorkItem/LayoutChartWidgetView';

type PageMode = 'new' | 'detail' | 'edit';

type LayoutFieldItem = {
  id: string;
  sourceType: 'field' | 'role' | 'control' | 'chart';
  sourceKey: string;
  label: string;
  helpText?: string;
  createVisible?: boolean;
  required?: boolean;
  width?: 'half' | 'full';
  chartConfig?: ChartConfigV1;
};

type LayoutGroup = {
  id: string;
  name: string;
  items: LayoutFieldItem[];
};

type LayoutTab = {
  id: string;
  name: string;
  groups: LayoutGroup[];
};

type LayoutConfig = {
  displayMode: 'side' | 'top';
  detailTabs: LayoutTab[];
  createTabs: LayoutTab[];
};

const LANE_NODE_WIDTH = 104;
const LANE_NODE_GAP = 20;

type LaneConfig = {
  roles: Array<{ id: string; name: string }>;
  stages: Array<{ id: string; name: string }>;
  nodes: Array<{
    id: string;
    name: string;
    roleId: string;
    stageId: string;
    laneOrder?: number;
    laneRow?: number;
    nextIds: string[];
  }>;
  showLines?: boolean;
};

const buildDefaultLayout = (fields: WorkItemField[], workItemName: string): LayoutConfig => {
  const detailTabs: LayoutTab[] = [
    {
      id: 'tab-basic',
      name: '基本信息',
      groups: [
        {
          id: 'group-basic',
          name: `${workItemName}基础信息`,
          items: fields
            .filter((f) => f.isEnabled !== 0)
            .sort((a, b) => (a.sort || 0) - (b.sort || 0))
            .map((f) => ({
              id: `field-${f.id || f.fieldKey}`,
              sourceType: 'field',
              sourceKey: f.fieldKey,
              label: f.fieldName,
              helpText: f.helpText || '',
              createVisible: true,
              required: f.isRequired === 1,
              width: 'full',
            })),
        },
      ],
    },
    { id: 'tab-node', name: '节点详情', groups: [] },
    { id: 'tab-comment', name: '评论/备注', groups: [] },
    { id: 'tab-log', name: '操作记录', groups: [] },
  ];
  return {
    displayMode: 'side',
    detailTabs,
    createTabs: JSON.parse(JSON.stringify(detailTabs)),
  };
};

const normalizeTabs = (tabs: any[] = []): LayoutTab[] =>
  tabs.map((tab: any, tabIndex: number) => ({
    id: tab.id || `tab-${tabIndex + 1}`,
    name: tab.name || `标签${tabIndex + 1}`,
    groups: Array.isArray(tab.groups)
      ? tab.groups.map((group: any, groupIndex: number) => ({
          id: group.id || `group-${tabIndex + 1}-${groupIndex + 1}`,
          name: group.name || `分组${groupIndex + 1}`,
          items: Array.isArray(group.items)
            ? group.items.map((item: any, itemIndex: number) => ({
                id: item.id || `item-${tabIndex + 1}-${groupIndex + 1}-${itemIndex + 1}`,
                sourceType: item.sourceType || 'field',
                sourceKey: item.sourceKey || '',
                label: item.label || '未命名字段',
                helpText: item.helpText || '',
                createVisible: item.createVisible !== false,
                required: !!item.required,
                width: item.width === 'half' ? 'half' : 'full',
                chartConfig:
                  item.sourceType === 'chart' && item.chartConfig && item.chartConfig.version === 1
                    ? (item.chartConfig as ChartConfigV1)
                    : undefined,
              }))
            : [],
        }))
      : [],
  }));

const parseLayout = (json: string | undefined, fields: WorkItemField[], workItemName: string): LayoutConfig => {
  if (!json) return buildDefaultLayout(fields, workItemName);
  try {
    const parsed = JSON.parse(json);
    if (!parsed) {
      return buildDefaultLayout(fields, workItemName);
    }
    if (Array.isArray(parsed.tabs)) {
      const detailTabs = normalizeTabs(parsed.tabs);
      return {
        displayMode: parsed.displayMode === 'top' ? 'top' : 'side',
        detailTabs,
        createTabs: JSON.parse(JSON.stringify(detailTabs)),
      };
    }
    if (Array.isArray(parsed.detailTabs) && Array.isArray(parsed.createTabs)) {
      const detailTabs = normalizeTabs(parsed.detailTabs);
      const createTabs = normalizeTabs(parsed.createTabs);
      if (!detailTabs.length) return buildDefaultLayout(fields, workItemName);
      return {
        displayMode: parsed.displayMode === 'top' ? 'top' : 'side',
        detailTabs,
        createTabs: createTabs.length ? createTabs : JSON.parse(JSON.stringify(detailTabs)),
      };
    }
    return buildDefaultLayout(fields, workItemName);
  } catch {
    return buildDefaultLayout(fields, workItemName);
  }
};

const parseLaneConfig = (flowRuleJson?: string): LaneConfig | null => {
  if (!flowRuleJson) return null;
  try {
    const parsed = JSON.parse(flowRuleJson);
    const pickFlow = (flows: any[]) => flows.find((flow) => flow && flow.enabled !== false) || flows[0];
    const laneConfig = Array.isArray(parsed?.flows)
      ? pickFlow(parsed.flows)?.laneConfig
      : parsed?.laneConfig;
    if (!laneConfig || typeof laneConfig !== 'object') return null;
    const roles = Array.isArray(laneConfig.roles) ? laneConfig.roles : [];
    const stages = Array.isArray(laneConfig.stages) ? laneConfig.stages : [];
    const nodes = Array.isArray(laneConfig.nodes) ? laneConfig.nodes : [];
    const normalizedNodes = nodes.map((node: any, idx: number) => ({
      id: String(node?.id || `node-${idx + 1}`),
      name: String(node?.name || `节点${idx + 1}`),
      roleId: String(node?.roleId || ''),
      stageId: String(node?.stageId || ''),
      laneOrder: Number.isFinite(Number(node?.laneOrder)) ? Number(node?.laneOrder) : 0,
      laneRow: Number.isFinite(Number(node?.laneRow)) ? Number(node?.laneRow) : 0,
      nextIds: Array.isArray(node?.nextIds) ? node.nextIds.map((x: any) => String(x)) : [],
    }));
    const roleFallback = roles.length
      ? roles
      : Array.from(
          normalizedNodes.reduce<Map<string, { id: string; name: string }>>((map, node) => {
            if (!node.roleId || map.has(node.roleId)) return map;
            map.set(node.roleId, { id: node.roleId, name: node.roleId });
            return map;
          }, new Map()).values(),
        );
    const stageFallback = stages.length
      ? stages
      : Array.from(
          normalizedNodes.reduce<Map<string, { id: string; name: string }>>((map, node) => {
            if (!node.stageId || map.has(node.stageId)) return map;
            map.set(node.stageId, { id: node.stageId, name: node.stageId });
            return map;
          }, new Map()).values(),
        );
    return {
      roles: roleFallback.map((role: any, idx: number) => ({
        id: String(role?.id || `role-${idx + 1}`),
        name: String(role?.name || role?.id || `角色${idx + 1}`),
      })),
      stages: stageFallback.map((stage: any, idx: number) => ({
        id: String(stage?.id || `stage-${idx + 1}`),
        name: String(stage?.name || stage?.id || `阶段${idx + 1}`),
      })),
      nodes: normalizedNodes,
      showLines: laneConfig.showLines !== false,
    };
  } catch {
    return null;
  }
};

const LaneDiagram: React.FC<{ laneConfig: LaneConfig }> = ({ laneConfig }) => {
  const laneCanvasRef = useRef<HTMLDivElement | null>(null);
  const laneNodeRefMap = useRef<Record<string, HTMLDivElement | null>>({});
  const [laneNodePositions, setLaneNodePositions] = useState<
    Record<string, { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number }>
  >({});

  const laneRoles = laneConfig.roles || [];
  const laneStages = laneConfig.stages || [];
  const laneNodes = laneConfig.nodes || [];
  const laneShowLines = laneConfig.showLines !== false;

  const swimlaneNodes = useMemo<SwimlaneNode[]>(() => {
    const stageOrder = new Map(laneStages.map((stage, index) => [stage.id, index]));
    const laneOrder = new Map(laneRoles.map((role, index) => [role.id, index]));
    return laneNodes
      .map((node) => ({
        id: node.id,
        laneId: node.roleId,
        stageId: node.stageId,
        row: Number(node.laneRow || 0),
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
  }, [laneNodes, laneStages, laneRoles]);

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

  const routedPaths = useMemo(
    () => routeSwimlaneEdges(swimlaneNodes, swimlaneEdges, swimlaneNodeRects, SWIMLANE_ROUTING_OPTIONS),
    [swimlaneNodes, swimlaneEdges, swimlaneNodeRects],
  );

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

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => computeLaneNodePositions());
    const handleResize = () => computeLaneNodePositions();
    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, [laneNodes, laneRoles, laneStages]);

  return (
    <div
      ref={laneCanvasRef}
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
                <Typography.Text strong>{stage.name}</Typography.Text>
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
                <Typography.Text>{role.name}</Typography.Text>
              </td>
              {laneStages.map((stage) => {
                const cellNodes = laneNodes
                  .filter((node) => node.roleId === role.id && node.stageId === stage.id)
                  .sort((a, b) => Number(a.laneOrder || 0) - Number(b.laneOrder || 0));
                const occupiedRowsByCol: Record<number, Set<number>> = {};
                const positionedNodes = cellNodes
                  .sort((a, b) => {
                    const colDiff = Number(a.laneOrder || 0) - Number(b.laneOrder || 0);
                    if (colDiff !== 0) return colDiff;
                    return Number(a.laneRow || 0) - Number(b.laneRow || 0);
                  })
                  .map((node) => {
                    const col = Number(node.laneOrder || 0);
                    const desiredRow = Number(node.laneRow || 0);
                    if (!occupiedRowsByCol[col]) occupiedRowsByCol[col] = new Set<number>();
                    let row = desiredRow;
                    while (occupiedRowsByCol[col].has(row)) {
                      row += 1;
                    }
                    occupiedRowsByCol[col].add(row);
                    return { node, col, row };
                  });
                const maxCol = positionedNodes.length ? Math.max(...positionedNodes.map((x) => x.col)) : 0;
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
                            border: '1px solid #cfd3dc',
                            background: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 16px',
                            overflow: 'visible',
                            fontWeight: 600,
                          }}
                        >
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
            <marker id="lane-arrow" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 z" fill="#2f54eb" />
            </marker>
          </defs>
          {routedPaths.map((route) => {
            if (!route.points || route.points.length < 2) return null;
            const d = toSvgPath(route.points);
            if (!d) return null;
            return (
              <g key={route.edgeId}>
                <path d={d} stroke="#2f54eb" strokeWidth={2} fill="none" markerEnd="url(#lane-arrow)" />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

const WorkItemRecordFormPage: React.FC = () => {
  const params = useParams<{ workItemTypeId?: string; recordId?: string }>();
  const location = useLocation();
  const workItemTypeId = Number(params.workItemTypeId);
  const recordId = params.recordId ? Number(params.recordId) : undefined;
  const mode: PageMode = location.pathname.endsWith('/new')
    ? 'new'
    : location.pathname.endsWith('/edit')
      ? 'edit'
      : 'detail';

  const [form] = Form.useForm<Record<string, any>>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workItem, setWorkItem] = useState<WorkItemType | null>(null);
  const [fields, setFields] = useState<WorkItemField[]>([]);
  const [data, setData] = useState<Record<string, any>>({});
  const [spaceRelationAuthsCache, setSpaceRelationAuthsCache] = useState<SpaceRelationAuth[]>([]);
  const [relationOptionsBaseByFieldKey, setRelationOptionsBaseByFieldKey] = useState<
    Record<string, FieldOptionItem[]>
  >({});
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    displayMode: 'side',
    detailTabs: [],
    createTabs: [],
  });
  const [activeLayoutTabId, setActiveLayoutTabId] = useState('');

  const enabledFields = useMemo(
    () => (fields || []).filter((f) => f.isEnabled !== 0).sort((a, b) => (a.sort || 0) - (b.sort || 0)),
    [fields],
  );

  const fieldMap = useMemo(
    () =>
      enabledFields.reduce<Record<string, WorkItemField>>((acc, f) => {
        if (f.fieldKey) acc[f.fieldKey] = f;
        return acc;
      }, {}),
    [enabledFields],
  );

  const allFieldMap = useMemo(
    () =>
      (fields || []).reduce<Record<string, WorkItemField>>((acc, f) => {
        if (f.fieldKey) acc[f.fieldKey] = f;
        return acc;
      }, {}),
    [fields],
  );

  const formulaFieldsList = useMemo(
    () => enabledFields.filter((f) => f.fieldType === 'formula'),
    [enabledFields],
  );

  const relationFieldsList = useMemo(
    () =>
      enabledFields.filter(
        (f) => f.fieldType === 'work_item_relation' || f.fieldType === 'work_item_relation_multi',
      ),
    [enabledFields],
  );

  /** 监听整表变化以驱动公式重算（含无 {字段引用} 的公式如 SUM(3,3)）。
   * 勿使用 useWatch([k1,k2])：rc-field-form 会当作嵌套路径 k1.k2，而非两个顶层字段。 */
  const formValuesForFormula = Form.useWatch(undefined, form);

  const formulaFieldsConfigKey = useMemo(
    () =>
      formulaFieldsList
        .map((f) => `${f.fieldKey ?? ''}\0${parseFieldOptions(f).formulaExpression ?? ''}\0${parseFieldOptions(f).formulaResultType ?? ''}`)
        .join('\n'),
    [formulaFieldsList],
  );

  const layoutTabs = useMemo(() => {
    const targetTabs = mode === 'detail' ? layoutConfig.detailTabs : layoutConfig.createTabs;
    return Array.isArray(targetTabs) ? targetTabs : [];
  }, [layoutConfig.detailTabs, layoutConfig.createTabs, mode]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const normalizeRelationValueForForm = (fieldType: string, raw: any): string | string[] | undefined => {
    if (fieldType === 'work_item_relation') {
      if (raw === undefined || raw === null || raw === '') return undefined;
      if (Array.isArray(raw)) return raw.length ? String(raw[0]) : undefined;
      return String(raw);
    }
    if (fieldType === 'work_item_relation_multi') {
      if (raw === undefined || raw === null || raw === '') return [];
      if (Array.isArray(raw)) {
        return raw.map((x) => String(x)).filter(Boolean);
      }
      if (typeof raw === 'string') {
        return raw
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
          .map((s) => String(s));
      }
      return [];
    }
    return undefined;
  };

  const getMergedRelationOptionsForField = (field: WorkItemField): FieldOptionItem[] => {
    if (!field.fieldKey) return [];
    const base = relationOptionsBaseByFieldKey[field.fieldKey] || [];
    const selected = data[field.fieldKey];
    const normalized = normalizeRelationValueForForm(field.fieldType, selected);

    const selectedValues = Array.isArray(normalized) ? normalized : normalized ? [normalized] : [];
    if (!selectedValues.length) return base;

    const seen = new Set(base.map((o) => o.value));
    const extra: FieldOptionItem[] = [];
    for (const v of selectedValues) {
      if (!seen.has(v)) extra.push({ label: v, value: v });
    }
    return extra.length ? [...base, ...extra] : base;
  };

  const renderDetailFieldBody = (value: any, field?: WorkItemField) => {
    if (!field) return formatValue(value);
    if (field.fieldType === 'formula') {
      const meta = parseFieldOptions(field);
      const expr = (meta.formulaExpression || '').trim();
      if (value !== null && value !== undefined && value !== '') {
        return formatValue(value);
      }
      if (!expr) return '-';
      const refErr = validateFormulaReferences(expr, allFieldMap, field.fieldKey);
      if (refErr) return '-';
      const ev = evaluateFormula(expr, data, allFieldMap);
      if (!ev.ok) return '-';
      const rt = meta.formulaResultType || 'number';
      return formatValue(coerceFormulaResult(ev.value, rt));
    }
    if (field.fieldType === 'rich_text') {
      if (isRichTextContentEmpty(value)) return '-';
      return (
        <div
          className="work-item-rich-text-detail"
          style={{ fontWeight: 500, wordBreak: 'break-word' }}
          /* 详情数据来自本系统存储；若后续开放不可信来源需做 HTML 消毒 */
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: String(value) }}
        />
      );
    }
    if (field.fieldType === 'textarea') {
      if (value === null || value === undefined || value === '') return '-';
      return (
        <div style={{ fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(value)}</div>
      );
    }
    if (field.fieldType === 'single_select') {
      if (value === null || value === undefined || value === '') return '-';
      const meta = parseFieldOptions(field);
      const optMap = new Map((meta.options || []).map((o) => [o.value, o.label]));
      const raw = String(value);
      return optMap.get(raw) ?? raw;
    }
    if (field.fieldType === 'multi_select') {
      const meta = parseFieldOptions(field);
      const optMap = new Map((meta.options || []).map((o) => [o.value, o.label]));
      const arr =
        Array.isArray(value)
          ? value
          : typeof value === 'string'
            ? value
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean)
            : [];
      if (!arr.length) return '-';
      const labels = arr.map((v) => optMap.get(String(v)) ?? String(v));
      return labels.join(', ');
    }

    if (field.fieldType === 'work_item_relation') {
      if (value === null || value === undefined || value === '') return '-';
      const opts = getMergedRelationOptionsForField(field);
      const optMap = new Map(opts.map((o) => [o.value, o.label]));
      const raw = Array.isArray(value) ? value[0] : value;
      const id = raw === null || raw === undefined ? '' : String(raw);
      if (!id) return '-';
      return optMap.get(String(id)) ?? String(id);
    }

    if (field.fieldType === 'work_item_relation_multi') {
      const arr =
        Array.isArray(value)
          ? value.map((x) => String(x))
          : typeof value === 'string'
            ? value
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean)
            : [];
      if (!arr.length) return '-';
      const opts = getMergedRelationOptionsForField(field);
      const optMap = new Map(opts.map((o) => [o.value, o.label]));
      const labels = arr.map((v) => optMap.get(String(v)) ?? String(v));
      return labels.join(', ');
    }

    return formatValue(value);
  };

  const renderLabelValue = (label: string, value: any, field?: WorkItemField) => {
    const body = renderDetailFieldBody(value, field);
    if (layoutConfig.displayMode === 'side') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start' }}>
          <Typography.Text type="secondary">{label}</Typography.Text>
          <div>{body}</div>
        </div>
      );
    }
    return (
      <div>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <div style={{ marginTop: 4 }}>{body}</div>
      </div>
    );
  };

  const renderField = (field: WorkItemField, requiredOverride?: boolean, labelOverride?: string) => {
    return renderWorkItemFieldFormItem({
      field,
      required: requiredOverride,
      label: labelOverride,
      relationOptions:
        field.fieldType === 'work_item_relation' || field.fieldType === 'work_item_relation_multi'
          ? getMergedRelationOptionsForField(field)
          : undefined,
    });
  };

  const loadData = async () => {
    if (!workItemTypeId) return;
    setLoading(true);
    try {
      const [settingsRes, fieldRes] = await Promise.all([
        fetchWorkItemSettings(workItemTypeId),
        fetchWorkItemFields(workItemTypeId),
      ]);
      if (settingsRes.code !== 0) {
        message.error(settingsRes.message || '加载工作项失败');
        return;
      }
      const settings = settingsRes.data;
      setWorkItem(settings);
      const nextFields = fieldRes.code === 0 ? fieldRes.data || [] : [];
      setLayoutConfig(parseLayout(settings.detailLayoutJson, nextFields, settings.typeName || '工作项'));
      if (fieldRes.code === 0) {
        setFields(nextFields);
      }
      if ((mode === 'detail' || mode === 'edit') && recordId) {
        const recordRes = await fetchWorkItemRecordDetail(workItemTypeId, recordId);
        if (recordRes.code !== 0) {
          message.error(recordRes.message || '加载记录失败');
          return;
        }
        const raw = recordRes.data || {};
        // relation 字段：确保表单 value 形态与 Select options 一致（string / string[]）
        const nextData = { ...raw };
        for (const f of (nextFields || []).filter(
          (ff) => ff.fieldType === 'work_item_relation' || ff.fieldType === 'work_item_relation_multi',
        )) {
          const key = f.fieldKey;
          if (!key) continue;
          nextData[key] = normalizeRelationValueForForm(f.fieldType, raw[key]);
        }
        setData(nextData);
        form.setFieldsValue(nextData);
      }
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workItemTypeId, recordId, mode]);

  // relation 字段：按 relationId（optionsJson）加载可选工作项候选集合
  useEffect(() => {
    if (!relationFieldsList.length) return;
    if (spaceRelationAuthsCache.length) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetchSpaceRelationAuths();
        if (!alive) return;
        if (res.code === 0) setSpaceRelationAuthsCache(res.data || []);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [relationFieldsList.length, spaceRelationAuthsCache.length]);

  useEffect(() => {
    if (!workItemTypeId) return;
    if (!relationFieldsList.length) {
      setRelationOptionsBaseByFieldKey({});
      return;
    }

    let cancelled = false;
    (async () => {
      const relationFields = relationFieldsList.filter((f) => !!f.fieldKey);
      const relationIdSet = new Set<string>();
      for (const f of relationFields) {
        const meta = parseFieldOptions(f);
        if (meta.relationId) relationIdSet.add(String(meta.relationId));
      }

      const relationIdToTargetTypeId = new Map<string, number>();
      for (const rid of relationIdSet) {
        // relationId 对应 SpaceRelationAuth.id（来自 SpaceConfigPage 的“关系管理”）
        const auth = spaceRelationAuthsCache.find((a) => a.id != null && String(a.id) === rid);
        if (auth?.resourceType === 'work_item_type') {
          const parsed = Number(auth.resourceKey);
          relationIdToTargetTypeId.set(rid, Number.isFinite(parsed) ? parsed : workItemTypeId);
        } else {
          relationIdToTargetTypeId.set(rid, workItemTypeId);
        }
      }

      const targetTypeIds = new Set<number>();
      for (const f of relationFields) {
        const meta = parseFieldOptions(f);
        const rid = meta.relationId ? String(meta.relationId) : undefined;
        const targetTypeId = rid ? relationIdToTargetTypeId.get(rid) ?? workItemTypeId : workItemTypeId;
        targetTypeIds.add(targetTypeId);
      }

      const typeOptionsMap = new Map<number, FieldOptionItem[]>();
      await Promise.all(
        Array.from(targetTypeIds).map(async (tid) => {
          try {
            const res = await fetchWorkItemRecordPage(tid, { current: 1, pageSize: 50 });
            if (res.code !== 0) return;
            const records = res.data?.records || [];
            typeOptionsMap.set(
              tid,
              records.map((r) => ({
                label: r.title || String(r.id ?? ''),
                value: String(r.id ?? ''),
              })),
            );
          } catch {
            // ignore single type failure
          }
        }),
      );

      if (cancelled) return;
      const next: Record<string, FieldOptionItem[]> = {};
      for (const f of relationFields) {
        const meta = parseFieldOptions(f);
        const rid = meta.relationId ? String(meta.relationId) : undefined;
        const targetTypeId = rid ? relationIdToTargetTypeId.get(rid) ?? workItemTypeId : workItemTypeId;
        next[f.fieldKey as string] = typeOptionsMap.get(targetTypeId) || [];
      }
      setRelationOptionsBaseByFieldKey(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [workItemTypeId, relationFieldsList, spaceRelationAuthsCache]);

  useEffect(() => {
    if (mode === 'detail' || loading) return;
    if (!formulaFieldsList.length) return;

    const all = form.getFieldsValue(true) as Record<string, unknown>;
    const updates: { name: string; value?: unknown; errors: string[] }[] = [];

    for (const f of formulaFieldsList) {
      const key = f.fieldKey;
      if (!key) continue;
      const meta = parseFieldOptions(f);
      if (meta.freezeFormulaResult && mode === 'edit') continue;

      const expr = (meta.formulaExpression || '').trim();
      if (!expr) {
        updates.push({ name: key, value: undefined, errors: ['未配置公式'] });
        continue;
      }

      const refErr = validateFormulaReferences(expr, allFieldMap, key);
      if (refErr) {
        updates.push({ name: key, value: undefined, errors: [refErr] });
        continue;
      }

      const ev = evaluateFormula(expr, all, allFieldMap);
      if (!ev.ok) {
        updates.push({ name: key, value: undefined, errors: [ev.error] });
        continue;
      }

      const rt = meta.formulaResultType || 'number';
      updates.push({ name: key, value: coerceFormulaResult(ev.value, rt), errors: [] });
    }

    if (!updates.length) return;

    const prevVals = form.getFieldsValue(true) as Record<string, unknown>;
    const valueChanged = updates.some((u) => prevVals[u.name] !== u.value);
    const errChanged = updates.some((u) => {
      const cur = form.getFieldError(u.name);
      const a = (cur && cur[0]) || '';
      const b = u.errors[0] || '';
      return a !== b;
    });
    if (!valueChanged && !errChanged) return;

    form.setFields(
      updates.map((u) => ({
        name: u.name,
        value: u.value,
        errors: u.errors.length ? u.errors : [],
      })),
    );
  }, [mode, loading, formulaFieldsList, allFieldMap, form, formValuesForFormula, formulaFieldsConfigKey]);

  useEffect(() => {
    if (!layoutTabs.length) {
      setActiveLayoutTabId('');
      return;
    }
    if (!activeLayoutTabId || !layoutTabs.some((tab) => tab.id === activeLayoutTabId)) {
      setActiveLayoutTabId(layoutTabs[0].id);
    }
  }, [layoutTabs, activeLayoutTabId]);

  const submit = async () => {
    if (!workItemTypeId) return;
    const values = await form.validateFields();
    const title = values.title || values.name || values['名称'] || values[enabledFields[0]?.fieldKey || 'title'];
    const fieldTypeMap = enabledFields.reduce<Record<string, string>>((acc, f) => {
      if (f.fieldKey) acc[f.fieldKey] = f.fieldType || '';
      return acc;
    }, {});
    const normalizedValues = Object.entries(values).reduce<Record<string, any>>((acc, [k, v]) => {
      const fieldType = fieldTypeMap[k];
      // date_range 表单值可能是 [start, end]，其中 end/start 未选时可能包含 null；
      // 这里先做兜底，避免 generic array->format 直接 crash。
      if (fieldType === 'date_range') {
        if (!Array.isArray(v) || v.length < 2) {
          acc[k] = undefined;
          return acc;
        }
        const start = v[0] as any;
        const end = v[1] as any;
        if (!start || !end) {
          acc[k] = undefined;
          return acc;
        }
        // 日历控件返回 dayjs/moment 对象的情况
        if (typeof start === 'object' && typeof (start as any).format === 'function' && typeof end === 'object' && typeof (end as any).format === 'function') {
          acc[k] = [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')];
          return acc;
        }
        // 兼容历史数据/特殊回填：若直接是字符串日期，保留语义
        if (typeof start === 'string' && typeof end === 'string') {
          const s1 = start.trim();
          const s2 = end.trim();
          acc[k] = s1 && s2 ? [s1, s2] : undefined;
          return acc;
        }
        // 其它非标准形态按空处理，避免把日期对象/奇怪结构直接塞进 payload
        acc[k] = undefined;
        return acc;
      }
      if (Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === 'object' && typeof (v[0] as any).format === 'function') {
        acc[k] = v.map((x: any) => x.format(fieldType === 'date_time' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'));
        return acc;
      }
      if (v && typeof v === 'object' && typeof (v as any).format === 'function') {
        acc[k] = (v as any).format(fieldType === 'date_time' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');
        return acc;
      }
      // number 字段：确保 payload.data 里是数值语义（避免 "123" 这种字符串落库）。
      if (fieldType === 'number' && typeof v === 'string') {
        const s = v.trim();
        if (!s) {
          acc[k] = undefined;
          return acc;
        }
        const n = Number(s);
        acc[k] = Number.isFinite(n) ? n : v;
        return acc;
      }
      // multi_select 字段：兜底修复历史/异常的字符串形态，确保 payload.data 始终是数组。
      if (fieldType === 'multi_select' && (v === undefined || v === null)) {
        acc[k] = [];
        return acc;
      }
      if (fieldType === 'multi_select' && typeof v === 'string') {
        const s = v.trim();
        if (!s) {
          acc[k] = [];
          return acc;
        }
        acc[k] = s
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
        return acc;
      }

      // work_item_relation 字段：单值 string / 多值 string[]，用于保持 payload.data 语义稳定
      if (fieldType === 'work_item_relation') {
        if (v === undefined || v === null || v === '') {
          acc[k] = undefined;
          return acc;
        }
        if (Array.isArray(v)) {
          acc[k] = v.length ? String(v[0]) : undefined;
          return acc;
        }
        acc[k] = typeof v === 'string' ? v : String(v);
        return acc;
      }

      if (fieldType === 'work_item_relation_multi') {
        if (v === undefined || v === null) {
          acc[k] = [];
          return acc;
        }
        if (Array.isArray(v)) {
          acc[k] = v.map((x) => String(x)).filter(Boolean);
          return acc;
        }
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) {
            acc[k] = [];
            return acc;
          }
          acc[k] = s
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
            .map((x) => String(x));
          return acc;
        }
        acc[k] = [];
        return acc;
      }

      // single_select 字段：若意外是数组，则取首项保证 payload.data 为单值语义。
      if (fieldType === 'single_select' && Array.isArray(v)) {
        acc[k] = v[0] ?? '';
        return acc;
      }
      acc[k] = v;
      return acc;
    }, {});

    if (mode === 'edit') {
      for (const f of enabledFields) {
        const key = f.fieldKey;
        if (!key || !isFieldReadonly(f)) continue;
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const raw = data[key];
          if (fieldTypeMap[key] === 'number' && typeof raw === 'string') {
            const s = raw.trim();
            if (!s) normalizedValues[key] = undefined;
            else {
              const n = Number(s);
              normalizedValues[key] = Number.isFinite(n) ? n : raw;
            }
          } else if (fieldTypeMap[key] === 'multi_select' && typeof raw === 'string') {
            const s = raw.trim();
            normalizedValues[key] = s
              ? s
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean)
              : [];
          } else if (fieldTypeMap[key] === 'multi_select' && (raw === undefined || raw === null)) {
            normalizedValues[key] = [];
          } else if (fieldTypeMap[key] === 'work_item_relation') {
            if (raw === undefined || raw === null || raw === '') {
              normalizedValues[key] = undefined;
            } else if (Array.isArray(raw)) {
              normalizedValues[key] = raw.length ? String(raw[0]) : undefined;
            } else {
              normalizedValues[key] = typeof raw === 'string' ? raw : String(raw);
            }
          } else if (fieldTypeMap[key] === 'work_item_relation_multi') {
            if (raw === undefined || raw === null) {
              normalizedValues[key] = [];
            } else if (Array.isArray(raw)) {
              normalizedValues[key] = raw.map((x) => String(x)).filter(Boolean);
            } else if (typeof raw === 'string') {
              const s = raw.trim();
              normalizedValues[key] = s
                ? s
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean)
                : [];
            } else {
              normalizedValues[key] = [];
            }
          } else if (fieldTypeMap[key] === 'date' || fieldTypeMap[key] === 'date_time') {
            // readonly 编辑态：确保不把 dayjs/moment 对象直接塞进 payload
            if (raw && typeof raw === 'object' && typeof (raw as any).format === 'function') {
              const fmt = fieldTypeMap[key] === 'date_time' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD';
              normalizedValues[key] = (raw as any).format(fmt);
            } else {
              normalizedValues[key] = raw;
            }
          } else if (fieldTypeMap[key] === 'date_range') {
            // readonly 编辑态：date_range 允许 string 数组或 dayjs 对象对
            if (Array.isArray(raw) && raw.length >= 2) {
              const start = raw[0] as any;
              const end = raw[1] as any;
              if (start && end && typeof start === 'object' && typeof end === 'object' && typeof start.format === 'function' && typeof end.format === 'function') {
                normalizedValues[key] = [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')];
              } else if (typeof start === 'string' && typeof end === 'string') {
                const s1 = start.trim();
                const s2 = end.trim();
                normalizedValues[key] = s1 && s2 ? [s1, s2] : undefined;
              } else {
                normalizedValues[key] = undefined;
              }
            } else {
              normalizedValues[key] = undefined;
            }
          } else {
            normalizedValues[key] = raw;
          }
        }
      }
    }

    const payload = {
      title: title ? String(title) : '',
      status: values.status ?? 1,
      data: normalizedValues,
    };
    setSaving(true);
    try {
      if (mode === 'edit' && recordId) {
        const res = await updateWorkItemRecord(workItemTypeId, recordId, payload);
        if (res.code !== 0) {
          message.error(res.message || '保存失败');
          return;
        }
        message.success('保存成功');
        history.replace(withSpaceId(`/space/work-items/${workItemTypeId}/${recordId}`));
      } else {
        const res = await createWorkItemRecord(workItemTypeId, payload);
        if (res.code !== 0) {
          message.error(res.message || '创建失败');
          return;
        }
        message.success('创建成功');
        history.replace(withSpaceId(`/space/work-items/${workItemTypeId}/${res.data}`));
      }
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'new' ? `新建${workItem?.typeName || '工作项'}` : mode === 'edit' ? `编辑${workItem?.typeName || '工作项'}` : `${workItem?.typeName || '工作项'}详情`;
  const laneConfig = useMemo(() => parseLaneConfig(workItem?.flowRuleJson), [workItem?.flowRuleJson]);

  return (
    <PageContainer
      title={title}
      extra={[
        <Button key="back" onClick={() => history.push(withSpaceId(`/space/work-items/${workItemTypeId}`))}>
          返回列表
        </Button>,
        mode === 'detail' ? (
          <Button key="edit" type="primary" onClick={() => history.push(withSpaceId(`/space/work-items/${workItemTypeId}/${recordId}/edit`))}>
            编辑
          </Button>
        ) : (
          <Button key="save" type="primary" loading={saving} onClick={submit}>
            保存
          </Button>
        ),
      ]}
    >
      <Spin spinning={loading}>
        <Card>
          <Tabs
            activeKey={activeLayoutTabId}
            onChange={setActiveLayoutTabId}
            items={layoutTabs.map((tab) => ({
              key: tab.id,
              label: tab.name,
              children:
                mode === 'detail' ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {(tab.id === 'tab-node' || tab.name === '节点详情') && (
                      <Card size="small" title="泳道图" bodyStyle={{ padding: 12 }}>
                        {laneConfig && laneConfig.roles.length && laneConfig.stages.length ? (
                          <LaneDiagram laneConfig={laneConfig} />
                        ) : (
                          <Empty description="暂无泳道配置" />
                        )}
                      </Card>
                    )}
                    {tab.groups.map((group) => {
                      const hasChart = group.items.some((item) => item.sourceType === 'chart');
                      const fieldGroupItems = group.items.filter((item) => {
                        if (item.sourceType !== 'field') return false;
                        const f = fieldMap[item.sourceKey];
                        return !!(f && isFieldShownInDetail(f));
                      });
                      if (!fieldGroupItems.length && !hasChart) return null;
                      return (
                        <Card key={group.id} size="small" title={group.name}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {group.items.map((item) => {
                              if (item.sourceType === 'field') {
                                const f = fieldMap[item.sourceKey];
                                if (!(f && isFieldShownInDetail(f))) return null;
                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      gridColumn: item.width === 'full' ? '1 / span 2' : 'auto',
                                      border: 'none',
                                      boxShadow: 'none',
                                      background: 'transparent',
                                      padding: 0,
                                    }}
                                  >
                                    {renderLabelValue(item.label, data[item.sourceKey], f)}
                                  </div>
                                );
                              }
                              if (item.sourceType === 'chart') {
                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      gridColumn: '1 / span 2',
                                      padding: 16,
                                      background: '#fafafa',
                                      borderRadius: 8,
                                    }}
                                  >
                                    {item.chartConfig ? (
                                      <LayoutChartWidgetView
                                        chartConfig={item.chartConfig}
                                        pageWorkItemTypeId={workItemTypeId}
                                        pageFields={fields}
                                      />
                                    ) : (
                                      <Typography.Text type="secondary">图表未配置</Typography.Text>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </Card>
                      );
                    })}
                    {(tab.id === 'tab-basic' || tab.name === '基本信息') && (
                      <Card size="small" title="系统信息">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ gridColumn: '1 / span 2' }}>
                            {renderLabelValue('标题', data.title)}
                          </div>
                          <div>
                            {renderLabelValue('状态', data.status === 1 ? '打开' : '关闭')}
                          </div>
                          <div>
                            {renderLabelValue('更新时间', data.updateTime)}
                          </div>
                          <div style={{ gridColumn: '1 / span 2' }}>
                            {renderLabelValue('创建时间', data.createTime)}
                          </div>
                        </div>
                      </Card>
                    )}
                    {!tab.groups.some((g) =>
                      g.items.some((item) => {
                        if (item.sourceType === 'field') return !!fieldMap[item.sourceKey];
                        if (item.sourceType === 'chart') return true;
                        return false;
                      }),
                    ) &&
                      !(tab.id === 'tab-basic' || tab.name === '基本信息') &&
                      !(tab.id === 'tab-node' || tab.name === '节点详情') && (
                      <Empty description="暂无内容" />
                    )}
                  </Space>
                ) : (
                  <Form form={form} layout="vertical" initialValues={{ status: 1 }}>
                    {(tab.id === 'tab-basic' || tab.name === '基本信息') && (
                      <>
                        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
                          <Input />
                        </Form.Item>
                        <Form.Item name="status" label="状态">
                          <Select
                            options={[
                              { label: '打开', value: 1 },
                              { label: '关闭', value: 0 },
                            ]}
                          />
                        </Form.Item>
                      </>
                    )}
                    {tab.groups.map((group) => {
                      const hasChart = group.items.some((item) => item.sourceType === 'chart');
                      const groupItems = group.items.filter((item) => item.sourceType === 'field' && fieldMap[item.sourceKey]);
                      if (!groupItems.length && !hasChart) return null;
                      return (
                        <Card key={group.id} size="small" title={group.name} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
                            {group.items.map((item) => {
                              if (item.sourceType === 'chart') {
                                return (
                                  <div key={item.id} style={{ gridColumn: '1 / span 2' }}>
                                    <Typography.Text type="secondary">
                                      图表占位（新建/编辑页暂不渲染）· {item.chartConfig?.type ?? 'chart'}
                                    </Typography.Text>
                                  </div>
                                );
                              }
                              if (item.sourceType !== 'field' || !fieldMap[item.sourceKey]) return null;
                              if (item.createVisible === false) return null;
                              const field = fieldMap[item.sourceKey];
                              return (
                                <div
                                  key={item.id}
                                  style={{ gridColumn: item.width === 'full' ? '1 / span 2' : 'auto' }}
                                >
                                  {renderField(field, item.required, item.label)}
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      );
                    })}
                  </Form>
                ),
            }))}
          />
        </Card>
      </Spin>
    </PageContainer>
  );
};

export default WorkItemRecordFormPage;
