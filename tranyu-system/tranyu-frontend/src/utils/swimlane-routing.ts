export type SwimlaneNode = {
  id: string;
  laneId: string; // roleId
  stageId: string;
  row: number; // laneRow
  nextIds?: string[];
};

export type SwimlaneEdge = {
  id: string;
  from: string;
  to: string;
};

export type NodeRect = {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

export type AnchorPoint = {
  x: number;
  y: number;
  side?: 'left' | 'right' | 'top' | 'bottom';
};

export type RouteSegment =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number };

export type RoutedPath = {
  edgeId: string;
  points: AnchorPoint[];
  segments?: RouteSegment[];
};

export type RoutingOptions = {
  nodePadding?: number;
  corridorGap?: number;
  laneGap?: number;
  stageGap?: number;
  maxOffsetTracks?: number;
  offsetStep?: number;
  /** 绕行障碍节点时的额外间距（px） */
  passGap?: number;
  minCorridorY?: number;
  tolerance?: number;
  preferTopCorridor?: boolean;
};

export const SWIMLANE_ROUTING_OPTIONS: RoutingOptions = {
  nodePadding: 8,
  corridorGap: 14,
  laneGap: 16,
  stageGap: 16,
  maxOffsetTracks: 3,
  offsetStep: 6,
  passGap: 20,
  minCorridorY: 8,
  tolerance: 1,
  preferTopCorridor: true,
};

const DEFAULT_OPTIONS: Required<RoutingOptions> = {
  nodePadding: SWIMLANE_ROUTING_OPTIONS.nodePadding ?? 8,
  corridorGap: SWIMLANE_ROUTING_OPTIONS.corridorGap ?? 14,
  laneGap: SWIMLANE_ROUTING_OPTIONS.laneGap ?? 16,
  stageGap: SWIMLANE_ROUTING_OPTIONS.stageGap ?? 16,
  maxOffsetTracks: SWIMLANE_ROUTING_OPTIONS.maxOffsetTracks ?? 3,
  offsetStep: SWIMLANE_ROUTING_OPTIONS.offsetStep ?? 6,
  passGap: SWIMLANE_ROUTING_OPTIONS.passGap ?? 20,
  minCorridorY: SWIMLANE_ROUTING_OPTIONS.minCorridorY ?? 8,
  tolerance: SWIMLANE_ROUTING_OPTIONS.tolerance ?? 1,
  preferTopCorridor: SWIMLANE_ROUTING_OPTIONS.preferTopCorridor ?? true,
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const nearlyEqual = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance;

export function buildSwimlaneEdges(nodes: SwimlaneNode[]): SwimlaneEdge[] {
  const edges: SwimlaneEdge[] = [];
  const seen = new Set<string>();
  nodes.forEach((node) => {
    (node.nextIds || []).forEach((toId) => {
      const id = `${node.id}->${toId}`;
      if (seen.has(id)) return;
      seen.add(id);
      edges.push({ id, from: node.id, to: toId });
    });
  });
  return edges;
}

export function buildNodeRects(
  raw: Array<Pick<NodeRect, 'id' | 'left' | 'right' | 'top' | 'bottom'>>,
): Record<string, NodeRect> {
  const map: Record<string, NodeRect> = {};
  raw.forEach((rect) => {
    map[rect.id] = {
      ...rect,
      centerX: (rect.left + rect.right) / 2,
      centerY: (rect.top + rect.bottom) / 2,
    };
  });
  return map;
}

export function getStartAnchor(rect: NodeRect): AnchorPoint {
  return { x: rect.right, y: rect.centerY, side: 'right' };
}

export function getEndAnchor(rect: NodeRect): AnchorPoint {
  return { x: rect.left, y: rect.centerY, side: 'left' };
}

type NodeOrderMeta = {
  stageIndex: Map<string, number>;
  laneIndex: Map<string, number>;
  nodeMap: Map<string, SwimlaneNode>;
};

const buildStageIndex = (nodes: SwimlaneNode[]): Map<string, number> => {
  const map = new Map<string, number>();
  nodes.forEach((node) => {
    if (!map.has(node.stageId)) {
      map.set(node.stageId, map.size);
    }
  });
  return map;
};

const buildLaneIndex = (nodes: SwimlaneNode[]): Map<string, number> => {
  const map = new Map<string, number>();
  nodes.forEach((node) => {
    if (!map.has(node.laneId)) {
      map.set(node.laneId, map.size);
    }
  });
  return map;
};

export function computeOffsetIndex(
  edge: SwimlaneEdge,
  grouped: Map<string, SwimlaneEdge[]>,
  meta: NodeOrderMeta,
): number {
  const list = grouped.get(edge.from) || [];
  if (list.length <= 1) return 0;
  const sorted = [...list].sort((a, b) => {
    const nodeA = meta.nodeMap.get(a.to);
    const nodeB = meta.nodeMap.get(b.to);
    const stageDiff =
      (meta.stageIndex.get(nodeA?.stageId || '') ?? Number.MAX_SAFE_INTEGER) -
      (meta.stageIndex.get(nodeB?.stageId || '') ?? Number.MAX_SAFE_INTEGER);
    if (stageDiff !== 0) return stageDiff;
    const laneDiff =
      (meta.laneIndex.get(nodeA?.laneId || '') ?? Number.MAX_SAFE_INTEGER) -
      (meta.laneIndex.get(nodeB?.laneId || '') ?? Number.MAX_SAFE_INTEGER);
    if (laneDiff !== 0) return laneDiff;
    const rowDiff = (nodeA?.row ?? 0) - (nodeB?.row ?? 0);
    if (rowDiff !== 0) return rowDiff;
    return a.to.localeCompare(b.to);
  });
  const index = Math.max(0, sorted.findIndex((e) => e.id === edge.id));
  const mid = (sorted.length - 1) / 2;
  return Math.round(index - mid);
}

/** 多条边汇入同一 to 时，在目标侧岔开纵向间距（与 computeOffsetIndex 对称，按 from 排序） */
export function computeIncomingOffsetIndex(
  edge: SwimlaneEdge,
  edgesByTo: Map<string, SwimlaneEdge[]>,
  meta: NodeOrderMeta,
): number {
  const list = edgesByTo.get(edge.to) || [];
  if (list.length <= 1) return 0;
  const sorted = [...list].sort((a, b) => {
    const nodeA = meta.nodeMap.get(a.from);
    const nodeB = meta.nodeMap.get(b.from);
    const stageDiff =
      (meta.stageIndex.get(nodeA?.stageId || '') ?? Number.MAX_SAFE_INTEGER) -
      (meta.stageIndex.get(nodeB?.stageId || '') ?? Number.MAX_SAFE_INTEGER);
    if (stageDiff !== 0) return stageDiff;
    const laneDiff =
      (meta.laneIndex.get(nodeA?.laneId || '') ?? Number.MAX_SAFE_INTEGER) -
      (meta.laneIndex.get(nodeB?.laneId || '') ?? Number.MAX_SAFE_INTEGER);
    if (laneDiff !== 0) return laneDiff;
    const rowDiff = (nodeA?.row ?? 0) - (nodeB?.row ?? 0);
    if (rowDiff !== 0) return rowDiff;
    return a.from.localeCompare(b.from);
  });
  const index = Math.max(0, sorted.findIndex((e) => e.id === edge.id));
  const mid = (sorted.length - 1) / 2;
  return Math.round(index - mid);
}

function computeTrunkXForFrom(
  fromRect: NodeRect,
  toRects: NodeRect[],
  options: Required<RoutingOptions>,
): number {
  const minToLeft = Math.min(...toRects.map((r) => r.left));
  const minX = fromRect.right + options.nodePadding;
  const maxX = minToLeft - options.nodePadding;
  if (maxX < minX) {
    return Math.max(fromRect.right, maxX);
  }
  const base = (fromRect.right + minToLeft) / 2;
  return clamp(base, minX, maxX);
}

/** 多条边汇入同一 to：在目标左侧共用一条竖线 joinX，再水平入节点 */
function computeJoinXForTo(
  toRect: NodeRect,
  fromRects: NodeRect[],
  options: Required<RoutingOptions>,
): number {
  if (!fromRects.length) return toRect.left - options.nodePadding;
  const maxFromRight = Math.max(...fromRects.map((r) => r.right));
  const minX = maxFromRight + options.nodePadding;
  const maxX = toRect.left - options.nodePadding;
  if (maxX < minX) {
    return Math.max(maxFromRight, Math.min(toRect.left, maxX));
  }
  const base = (maxFromRight + toRect.left) / 2;
  return clamp(base, minX, maxX);
}

function computeSingleEdgeMidX(from: NodeRect, to: NodeRect, options: Required<RoutingOptions>): number | null {
  const minX = from.right + options.nodePadding;
  const maxX = to.left - options.nodePadding;
  if (maxX < minX) return null;
  return clamp((from.right + to.left) / 2, minX, maxX);
}

type EdgeLaneKind = 'main' | 'fork' | 'bypass';

function computeLaneY(
  startY: number,
  endY: number,
  baseOffset: number,
  kind: EdgeLaneKind,
  options: Required<RoutingOptions>,
): number {
  // 三类水平通道：主链 < fork < bypass（优先更低一层，视觉更“外侧”）
  const biasTracks = kind === 'main' ? 0 : kind === 'fork' ? 1 : 2;
  return resolveJoinCorridorY(startY, endY, baseOffset + biasTracks * options.offsetStep, options);
}

/**
 * 统一结构化路径（强约束）：
 * 出线水平 → (可选) trunkX → (可选) joinX → 入线水平
 */
function routeStructuredEdge(params: {
  from: NodeRect;
  to: NodeRect;
  useTrunk: boolean;
  trunkX: number;
  useJoin: boolean;
  joinX: number;
  laneKind: EdgeLaneKind;
  laneOffset: number;
  options: Required<RoutingOptions>;
}): AnchorPoint[] {
  const { from, to, useTrunk, trunkX, useJoin, joinX, laneKind, laneOffset, options } = params;
  const start = getStartAnchor(from);
  const end = getEndAnchor(to);

  // Rule 1：第一段必须水平
  const xOut = useTrunk ? trunkX : useJoin ? joinX : (computeSingleEdgeMidX(from, to, options) ?? (start.x + options.nodePadding));
  const laneY = computeLaneY(start.y, end.y, laneOffset, laneKind, options);

  const pts: AnchorPoint[] = [
    start,
    { x: xOut, y: start.y },
    { x: xOut, y: laneY },
  ];

  // trunk → join 汇入（共享竖线）
  if (useJoin) {
    if (!nearlyEqual(xOut, joinX, options.tolerance)) {
      pts.push({ x: joinX, y: laneY });
    }
    pts.push({ x: joinX, y: end.y });
  } else {
    pts.push({ x: xOut, y: end.y });
  }

  // Rule 2：最后一段必须水平入节点
  pts.push(end);
  return pts;
}

export function routeSingleEdge(
  from: NodeRect,
  to: NodeRect,
  options: Required<RoutingOptions>,
): AnchorPoint[] {
  // 保留导出：单边也走统一结构化路径，保证出线/入线均水平
  const midX = computeSingleEdgeMidX(from, to, options) ?? (from.right + options.nodePadding);
  return routeStructuredEdge({
    from,
    to,
    useTrunk: false,
    trunkX: midX,
    useJoin: false,
    joinX: midX,
    laneKind: 'main',
    laneOffset: 0,
    options,
  });
}

/**
 * 同一 from 多条出边（fork）：必须先共线到 trunkX，经汇入走廊再拉到目标 join 竖线，最后水平入节点。
 * 与「仅 trunk 后长横线直冲目标」不同，避免后加边看起来像独立 single-edge。
 */
export function routeForkViaTrunkToJoin(
  from: NodeRect,
  to: NodeRect,
  trunkX: number,
  joinX: number,
  offset: number,
  options: Required<RoutingOptions>,
): AnchorPoint[] {
  // 保留导出：fork 场景走统一结构化路径
  return routeStructuredEdge({
    from,
    to,
    useTrunk: true,
    trunkX,
    useJoin: true,
    joinX,
    laneKind: 'fork',
    laneOffset: offset,
    options,
  });
}

/** 遗留：fork 且目标仅单入时的旧路径（trunk 垂线后直接水平入节点）。路由主路径已改用 routeForkViaTrunkToJoin。 */
export function routeTrunkEdge(
  from: NodeRect,
  to: NodeRect,
  offset: number,
  trunkX: number,
  _options: Required<RoutingOptions>,
): AnchorPoint[] {
  const start = getStartAnchor(from);
  const end = getEndAnchor(to);
  const branchY = end.y + offset;
  return [
    start,
    { x: trunkX, y: start.y },
    { x: trunkX, y: branchY },
    { x: trunkX, y: end.y },
    end,
  ];
}

/**
 * 汇入走廊 Y：与源锚点同高时若不做抬升，三点共线 + compactPoints 会把 joinX 拐点吃掉，退化成横穿目标的直线。
 */
function resolveJoinCorridorY(
  startY: number,
  endY: number,
  offset: number,
  options: Required<RoutingOptions>,
): number {
  let y = endY + offset;
  if (nearlyEqual(y, startY, options.tolerance)) {
    y = startY + options.offsetStep;
  }
  return y;
}

/**
 * Join 且单出：无 fork 干线；先垂直到汇入走廊再水平到 joinX，末段水平入节点左侧。
 */
export function routeJoinEdge(
  from: NodeRect,
  to: NodeRect,
  joinX: number,
  offset: number,
  options: Required<RoutingOptions>,
): AnchorPoint[] {
  // 保留导出：单出 + 多入（join）也走统一结构化路径
  return routeStructuredEdge({
    from,
    to,
    useTrunk: false,
    trunkX: joinX,
    useJoin: true,
    joinX,
    laneKind: 'main',
    laneOffset: offset,
    options,
  });
}

export function routeSwimlaneEdges(
  nodes: SwimlaneNode[],
  edges: SwimlaneEdge[],
  nodeRects: Record<string, NodeRect>,
  options?: RoutingOptions,
): RoutedPath[] {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...(options || {}) };

  // 1) 统计拓扑
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const meta: NodeOrderMeta = {
    stageIndex: buildStageIndex(nodes),
    laneIndex: buildLaneIndex(nodes),
    nodeMap,
  };
  const edgesByFrom = new Map<string, SwimlaneEdge[]>();
  const edgesByTo = new Map<string, SwimlaneEdge[]>();
  edges.forEach((edge) => {
    const out = edgesByFrom.get(edge.from) || [];
    out.push(edge);
    edgesByFrom.set(edge.from, out);
    const inc = edgesByTo.get(edge.to) || [];
    inc.push(edge);
    edgesByTo.set(edge.to, inc);
  });

  // 2) 统一 trunkX（按 from 分组）
  const trunkXByFrom = new Map<string, number>();
  edgesByFrom.forEach((list, fromId) => {
    if (list.length <= 1) return;
    const fromRect = nodeRects[fromId];
    if (!fromRect) return;
    const toRects = list
      .map((e) => nodeRects[e.to])
      .filter((r): r is NodeRect => !!r);
    if (!toRects.length) return;
    trunkXByFrom.set(fromId, computeTrunkXForFrom(fromRect, toRects, mergedOptions));
  });

  // 3) 统一 joinX（按 to 分组）
  const joinXByTo = new Map<string, number>();
  edgesByTo.forEach((list, toId) => {
    if (list.length <= 1) return;
    const toRect = nodeRects[toId];
    if (!toRect) return;
    const fromRects = list
      .map((e) => nodeRects[e.from])
      .filter((r): r is NodeRect => !!r);
    if (!fromRects.length) return;
    joinXByTo.set(toId, computeJoinXForTo(toRect, fromRects, mergedOptions));
  });

  // debug：暴露 trunk/join 坐标
  if (typeof window !== 'undefined') {
    (window as any).__swimlaneDebug = (window as any).__swimlaneDebug || {};
    (window as any).__swimlaneDebug.trunkXByFrom = Object.fromEntries(trunkXByFrom.entries());
    (window as any).__swimlaneDebug.joinXByTo = Object.fromEntries(joinXByTo.entries());
  }

  // 4) 每条 edge 结构化 routing：出线水平 → trunk（可选）→ join（可选）→ 入线水平；必要时下绕避障
  return edges.flatMap((edge) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    const fromRect = nodeRects[edge.from];
    const toRect = nodeRects[edge.to];
    if (!fromNode || !toNode || !fromRect || !toRect) return [];

    const outgoingCount = (edgesByFrom.get(edge.from) || []).length;
    const incomingCount = (edgesByTo.get(edge.to) || []).length;

    const useTrunk = outgoingCount > 1;
    const useJoin = incomingCount > 1;

    const outOffsetIndex = useTrunk ? computeOffsetIndex(edge, edgesByFrom, meta) : 0;
    const inOffsetIndex = useJoin ? computeIncomingOffsetIndex(edge, edgesByTo, meta) : 0;

    const trunkX = useTrunk ? (trunkXByFrom.get(edge.from) ?? fromRect.right + mergedOptions.nodePadding) : fromRect.right + mergedOptions.nodePadding;
    const joinX =
      useJoin
        ? (joinXByTo.get(edge.to) ?? (toRect.left - mergedOptions.nodePadding))
        : computeJoinXForTo(toRect, [fromRect], mergedOptions);

    // 通道分层：fork 更低一层；长边/旁路由避障时再降一层
    const laneKind: EdgeLaneKind = useTrunk ? 'fork' : 'main';
    const laneOffset = (outOffsetIndex + inOffsetIndex) * mergedOptions.offsetStep;

    let points = routeStructuredEdge({
      from: fromRect,
      to: toRect,
      useTrunk,
      trunkX,
      useJoin,
      joinX,
      laneKind,
      laneOffset,
      options: mergedOptions,
    });

    points = applyObstacleAvoidance(points, edge.from, edge.to, nodeRects, mergedOptions);

    if (typeof window !== 'undefined') {
      (window as any).__swimlaneDebug = (window as any).__swimlaneDebug || {};
      (window as any).__swimlaneDebug.edgeMeta = {
        ...(window as any).__swimlaneDebug.edgeMeta,
        [edge.id]: {
          routeKind: useTrunk && useJoin ? 'fork+join' : useTrunk ? 'fork' : useJoin ? 'join' : 'single',
          useTrunk,
          useJoin,
          outOffsetIndex,
          inOffsetIndex,
          laneKind,
          laneOffset,
          trunkX: useTrunk ? trunkX : undefined,
          joinX: useJoin ? joinX : undefined,
          incomingCount,
          outgoingCount,
          from: edge.from,
          to: edge.to,
        },
      };
    }

    return [{ edgeId: edge.id, points: compactPoints(points) }];
  });
}

export function toSvgPath(points: AnchorPoint[]): string {
  const compacted = compactPoints(points);
  if (!compacted.length) return '';
  const parts = compacted.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`);
  return parts.join(' ');
}

export function compactPoints(points: AnchorPoint[]): AnchorPoint[] {
  if (points.length <= 1) return points;
  const deduped: AnchorPoint[] = [];
  points.forEach((p) => {
    const prev = deduped[deduped.length - 1];
    if (!prev || prev.x !== p.x || prev.y !== p.y) {
      deduped.push(p);
    }
  });
  if (deduped.length <= 2) return deduped;
  const compacted: AnchorPoint[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i += 1) {
    const prev = compacted[compacted.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];
    const sameX = prev.x === curr.x && curr.x === next.x;
    const sameY = prev.y === curr.y && curr.y === next.y;
    if (sameX || sameY) {
      continue;
    }
    compacted.push(curr);
  }
  compacted.push(deduped[deduped.length - 1]);
  return compacted;
}

type ObstacleRect = Pick<NodeRect, 'id' | 'left' | 'right' | 'top' | 'bottom'>;

function isHorizontal(a: AnchorPoint, b: AnchorPoint, tol: number): boolean {
  return nearlyEqual(a.y, b.y, tol) && !nearlyEqual(a.x, b.x, tol);
}

function segmentIntersectsRectH(
  y: number,
  x1: number,
  x2: number,
  r: ObstacleRect,
  tol: number,
  clearance: number,
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  // 将节点矩形视为“带安全边界”的障碍物：避免连线贴着节点上边缘擦过造成视觉穿线
  const top = r.top - clearance;
  const bottom = r.bottom + clearance;
  const left = r.left - clearance;
  const right = r.right + clearance;
  const yInside = y > top - tol && y < bottom + tol;
  const xOverlap = maxX > left - tol && minX < right + tol;
  return yInside && xOverlap;
}

function collectHorizontalObstacles(
  y: number,
  x1: number,
  x2: number,
  obstacles: ObstacleRect[],
  tol: number,
  clearance: number,
): ObstacleRect[] {
  return obstacles.filter((r) => segmentIntersectsRectH(y, x1, x2, r, tol, clearance));
}

function routeBypassHorizontalSegment(
  a: AnchorPoint,
  b: AnchorPoint,
  bypassY: number,
): AnchorPoint[] {
  // a(y) ---- b(y) 变为：a -> (a.x, bypassY) -> (b.x, bypassY) -> b
  return [
    a,
    { x: a.x, y: bypassY },
    { x: b.x, y: bypassY },
    b,
  ];
}

/**
 * 障碍绕行（优先下方）：若某个水平段会穿过节点矩形，则切到 bypassY 再穿越。
 * 仅修改折线的中间段，保证最后一段仍水平进入目标节点左侧。
 */
function applyObstacleAvoidance(
  points: AnchorPoint[],
  fromId: string,
  toId: string,
  nodeRects: Record<string, NodeRect>,
  options: Required<RoutingOptions>,
): AnchorPoint[] {
  if (points.length < 2) return points;
  const tol = options.tolerance;
  // 安全边界：用 passGap 的一半做“矩形外扩”，让擦边也触发绕行（偏向下方）
  const clearance = Math.max(0, Math.floor(options.passGap / 2));
  const obstacles: ObstacleRect[] = Object.values(nodeRects)
    .filter((r) => r.id !== fromId && r.id !== toId)
    .map((r) => ({ id: r.id, left: r.left, right: r.right, top: r.top, bottom: r.bottom }));

  if (!obstacles.length) return points;

  const out: AnchorPoint[] = [points[0]];
  const lastIdx = points.length - 2;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = out[out.length - 1];
    const b = points[i + 1];

    if (!isHorizontal(a, b, tol)) {
      out.push(b);
      continue;
    }

    // Rule 1/2：不要破坏首段“水平出线”和末段“水平入线”
    // - i === 0: 第一段必须水平离开 source，不能插入竖线
    // - i === lastIdx: 最后一段必须水平进入 target，不能把水平段改成末尾竖插
    if (i === 0 || i === lastIdx) {
      out.push(b);
      continue;
    }

    let blockers = collectHorizontalObstacles(a.y, a.x, b.x, obstacles, tol, clearance);
    if (blockers.length === 0) {
      out.push(b);
      continue;
    }

    // 同时计算上/下绕行候选：根据冲突更少、共线更少（更远离拥挤带）选择；默认偏向下方
    const rawTopY = Math.min(...blockers.map((r) => r.top)) - options.passGap;
    const rawBottomY = Math.max(...blockers.map((r) => r.bottom)) + options.passGap;

    const adjustCandidate = (initialY: number, dir: 'up' | 'down'): number => {
      let y = initialY;
      // 避免跑到可视区之外（上绕至少高于 minCorridorY）
      if (dir === 'up') {
        y = Math.max(options.minCorridorY, y);
      }
      for (let round = 0; round < 6; round += 1) {
        const hits = collectHorizontalObstacles(y, a.x, b.x, obstacles, tol, clearance);
        if (hits.length === 0) break;
        if (dir === 'down') {
          y = Math.max(y, Math.max(...hits.map((r) => r.bottom)) + options.passGap);
        } else {
          y = Math.min(y, Math.min(...hits.map((r) => r.top)) - options.passGap);
          y = Math.max(options.minCorridorY, y);
        }
      }
      return y;
    };

    const topY = adjustCandidate(rawTopY, 'up');
    const bottomY = adjustCandidate(rawBottomY, 'down');

    const scoreCandidate = (y: number, preferBottom: boolean): number => {
      const hits = collectHorizontalObstacles(y, a.x, b.x, obstacles, tol, clearance).length;
      // 主目标：冲突越少越好
      let score = hits * 10000;
      // 次目标：离当前段越近越不容易形成“超长大回环”（但也避免挤在同一通道）；用距离作为轻量项
      const midY = (a.y + b.y) / 2;
      score += Math.abs(y - midY);
      // 默认偏向下方：同分时选 bottom；用轻微惩罚让 top 更难胜出
      if (!preferBottom) score += 200;
      // “拥挤”近似：如果 y 落在某些障碍的安全边界附近，增加小惩罚，倾向走更空的通道
      const crowd = obstacles.reduce((acc, r) => {
        const dTop = Math.abs(y - (r.top - clearance));
        const dBottom = Math.abs(y - (r.bottom + clearance));
        const near = Math.min(dTop, dBottom);
        return acc + (near < options.offsetStep * 2 ? 50 : 0);
      }, 0);
      score += crowd;
      return score;
    };

    const topScore = scoreCandidate(topY, false);
    const bottomScore = scoreCandidate(bottomY, true);
    const bypassY = bottomScore <= topScore ? bottomY : topY;

    const detour = routeBypassHorizontalSegment(a, b, bypassY);
    // detour[0] 是 a（已在 out 末尾），跳过它避免重复
    out.push(...detour.slice(1));
  }

  return out;
}

export const SWIMLANE_ROUTING_EXAMPLE = (() => {
  const nodes: SwimlaneNode[] = [
    { id: 'A', laneId: 'L1', stageId: 'S1', row: 0, nextIds: ['B', 'C', 'D', 'E'] },
    { id: 'B', laneId: 'L1', stageId: 'S1', row: 0, nextIds: [] },
    { id: 'C', laneId: 'L1', stageId: 'S2', row: 0, nextIds: [] },
    { id: 'D', laneId: 'L2', stageId: 'S1', row: 0, nextIds: [] },
    { id: 'E', laneId: 'L2', stageId: 'S2', row: 0, nextIds: [] },
  ];
  const edges = buildSwimlaneEdges(nodes);
  const nodeRects = buildNodeRects([
    { id: 'A', left: 100, right: 200, top: 100, bottom: 140 },
    { id: 'B', left: 260, right: 360, top: 100, bottom: 140 },
    { id: 'C', left: 420, right: 520, top: 100, bottom: 140 },
    { id: 'D', left: 260, right: 360, top: 200, bottom: 240 },
    { id: 'E', left: 420, right: 520, top: 200, bottom: 240 },
  ]);
  const routes = routeSwimlaneEdges(nodes, edges, nodeRects, SWIMLANE_ROUTING_OPTIONS);
  const compacted = compactPoints([
    { x: 10, y: 10 },
    { x: 10, y: 10 },
    { x: 10, y: 20 },
    { x: 10, y: 30 },
    { x: 20, y: 30 },
  ]);
  return { nodes, edges, nodeRects, routes, compacted };
})();
