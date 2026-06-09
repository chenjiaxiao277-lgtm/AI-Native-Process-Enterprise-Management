/**
 * 泳道图「运行时布局层」：并行组识别 + 按子树块分配垂向 layoutRow。
 * 不修改持久化的 laneConfig / nextIds / laneRow；供 UI 渲染用 overlay 覆盖展示。
 */

export type SwimlaneLayoutNode = {
  id: string;
  stageId: string;
  roleId: string;
  /** 业务侧列序号（阶段内），与现有表格列一致 */
  laneOrder?: number;
  /** 业务侧行序号；无 overlay 时沿用 */
  laneRow?: number;
  nextIds: string[];
};

/** 每个节点一条运行时布局结果 */
export type SwimlaneLayoutOverlay = {
  nodeId: string;
  /** 同父、同 sibling 层的并行堆叠组；无则 '' */
  parallelGroupKey: string;
  /** 定义该子节点相对父 P 的兄弟 DAG 层级（同层即彼此无先后依赖的并行波次） */
  siblingLevel: number;
  /** 记录用于分组的父节点（多父时 MVP 取字典序最小的 parentId） */
  layoutParentId: string;
  /**
   * 垂向显示行（相对阶段内，不含 stageTopOffset）。
   * 唯一权威：由并行兄弟块 + 同格子树展开得到。
   */
  layoutRow: number;
  /** 该节点为根的子树在「同泳道格 + 布局锚父边」下占用的行数，至少为 1 */
  subtreeSpanRows: number;
  /** 所属并行兄弟块在本桶内的起始行（根节点等于其 layoutRow；子节点为所属兄弟根的块起点） */
  blockStartRow: number;
  /** layoutRow - blockStartRow */
  rowInBlock: number;
  /**
   * 与 layoutRow 相同，保留兼容旧读法。
   * @deprecated 请使用 layoutRow
   */
  autoRow: number;
};

const uniq = <T>(arr: T[]) => Array.from(new Set(arr));

/** 逆向：子节点 -> 父节点列表（nextIds 指向谁，谁记录来源） */
export function buildParentMap(nodes: SwimlaneLayoutNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const idSet = new Set(nodes.map((n) => n.id));
  nodes.forEach((n) => {
    (n.nextIds || []).forEach((to) => {
      if (!idSet.has(to)) return;
      const list = map.get(to) || [];
      list.push(n.id);
      map.set(to, list);
    });
  });
  map.forEach((list, k) => {
    map.set(k, uniq(list).sort());
  });
  return map;
}

/**
 * 多父节点时选「布局锚父」：MVP 取 id 字典序最小，避免同一子节点多 key 冲突。
 */
export function pickLayoutParent(parents: string[] | undefined): string | undefined {
  if (!parents?.length) return undefined;
  return [...parents].sort()[0];
}

function sameSwimlaneCell(a: SwimlaneLayoutNode, b: SwimlaneLayoutNode): boolean {
  return (
    a.stageId === b.stageId &&
    a.roleId === b.roleId &&
    Number(a.laneOrder || 0) === Number(b.laneOrder || 0)
  );
}

/**
 * 同格内、沿 nextIds 的「布局子」：目标必须在同一泳道格，且父 id 出现在该子的父列表中。
 * 用「是否相连」而非仅 pickLayoutParent，避免多父时子被只归到字典序父导致兄弟块 span 偏小、与并行层错位。
 */
function layoutChildrenSameCell(
  parentId: string,
  nodeById: Map<string, SwimlaneLayoutNode>,
  parentsMap: Map<string, string[]>,
): string[] {
  const n = nodeById.get(parentId);
  if (!n) return [];
  return (n.nextIds || [])
    .filter((to) => {
      const t = nodeById.get(to);
      if (!t || !sameSwimlaneCell(n, t)) return false;
      return (parentsMap.get(to) || []).includes(parentId);
    })
    .sort((x, y) => x.localeCompare(y));
}

/**
 * 对单个父节点 P，在其子集上只看「子—子」之间的 nextIds 边，构造邻接表。
 */
function buildSiblingAdjacency(
  children: string[],
  nodeById: Map<string, SwimlaneLayoutNode>,
): Map<string, string[]> {
  const set = new Set(children);
  const adj = new Map<string, string[]>();
  children.forEach((c) => adj.set(c, []));
  children.forEach((c) => {
    const n = nodeById.get(c);
    if (!n) return;
    (n.nextIds || []).forEach((to) => {
      if (set.has(to)) adj.get(c)!.push(to);
    });
  });
  return adj;
}

/**
 * 兄弟 DAG 上计算层级：无来自兄弟的入边为 0；否则 1 + max(前驱层级)。
 * 同一 level 的子节点视为同一并行波次（彼此不存在兄弟边带来的先后约束）。
 */
function siblingLevels(children: string[], adj: Map<string, string[]>): Map<string, number> {
  const level = new Map<string, number>();
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  const dfs = (c: string): number => {
    if (memo.has(c)) return memo.get(c)!;
    if (visiting.has(c)) return 0;
    visiting.add(c);
    const preds = children.filter((p) => (adj.get(p) || []).includes(c));
    const v =
      preds.length === 0 ? 0 : 1 + Math.max(...preds.map((p) => dfs(p)), 0);
    visiting.delete(c);
    memo.set(c, v);
    return v;
  };

  children.forEach((c) => dfs(c));
  children.forEach((c) => level.set(c, memo.get(c) ?? 0));
  return level;
}

/**
 * 并行组 key：同一父、同一 siblingLevel 为一组（组内无兄弟 DAG 上的先后边，故同层并行）。
 */
export function parallelGroupKey(parentId: string, siblingLevel: number): string {
  return `${parentId}#L${siblingLevel}`;
}

type GroupBucket = {
  stageId: string;
  roleId: string;
  laneOrder: number;
  parallelGroupKey: string;
  nodeIds: string[];
};

function computeSubtreeSpanRows(
  nodeId: string,
  nodeById: Map<string, SwimlaneLayoutNode>,
  parentsMap: Map<string, string[]>,
  memo: Map<string, number>,
  visiting: Set<string>,
): number {
  if (memo.has(nodeId)) return memo.get(nodeId)!;
  if (visiting.has(nodeId)) {
    return 1;
  }
  visiting.add(nodeId);
  const kids = layoutChildrenSameCell(nodeId, nodeById, parentsMap);
  let v: number;
  if (kids.length === 0) {
    v = 1;
  } else {
    v = 1 + kids.reduce((sum, c) => sum + computeSubtreeSpanRows(c, nodeById, parentsMap, memo, visiting), 0);
  }
  visiting.delete(nodeId);
  memo.set(nodeId, v);
  return v;
}

function ancestorDepth(
  nodeId: string,
  pending: Map<string, Partial<SwimlaneLayoutOverlay>>,
  memo: Map<string, number>,
): number {
  if (memo.has(nodeId)) return memo.get(nodeId)!;
  const pr = pending.get(nodeId);
  const lp = pr?.layoutParentId;
  if (!lp) {
    memo.set(nodeId, 0);
    return 0;
  }
  const d = 1 + ancestorDepth(lp, pending, memo);
  memo.set(nodeId, d);
  return d;
}

function assignFromRoot(
  nodeId: string,
  startRow: number,
  blockStartRow: number,
  nodeById: Map<string, SwimlaneLayoutNode>,
  parentsMap: Map<string, string[]>,
  subtreeSpanMemo: Map<string, number>,
  layoutRow: Map<string, number>,
  blockStart: Map<string, number>,
): void {
  layoutRow.set(nodeId, startRow);
  blockStart.set(nodeId, blockStartRow);
  const kids = layoutChildrenSameCell(nodeId, nodeById, parentsMap);
  let y = startRow + 1;
  for (const c of kids) {
    assignFromRoot(c, y, blockStartRow, nodeById, parentsMap, subtreeSpanMemo, layoutRow, blockStart);
    y += subtreeSpanMemo.get(c) ?? 1;
  }
}

/**
 * 为全图节点计算布局 overlay（不读写节点上的业务字段）。
 */
export function computeSwimlaneLayoutOverlay(nodes: SwimlaneLayoutNode[]): Map<string, SwimlaneLayoutOverlay> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const parentsMap = buildParentMap(nodes);
  const pending = new Map<string, Partial<SwimlaneLayoutOverlay>>();

  nodes.forEach((n) => {
    const parents = parentsMap.get(n.id);
    const lp = pickLayoutParent(parents);
    if (!lp) {
      pending.set(n.id, {
        nodeId: n.id,
        parallelGroupKey: '',
        siblingLevel: 0,
        layoutParentId: '',
      });
      return;
    }
    const children = uniq((nodeById.get(lp)?.nextIds || []).filter((id) => nodeById.has(id)));
    const adj = buildSiblingAdjacency(children, nodeById);
    const levels = siblingLevels(children, adj);
    const sl = levels.get(n.id) ?? 0;
    const pgk = parallelGroupKey(lp, sl);
    pending.set(n.id, {
      nodeId: n.id,
      parallelGroupKey: pgk,
      siblingLevel: sl,
      layoutParentId: lp,
    });
  });

  const buckets = new Map<string, GroupBucket>();
  const bucketKey = (stageId: string, roleId: string, laneOrder: number, pgk: string) =>
    `${stageId}\0${roleId}\0${laneOrder}\0${pgk}`;

  nodes.forEach((n) => {
    const p = pending.get(n.id);
    if (!p) return;
    const pgk = p.parallelGroupKey || '';
    const lo = Number(n.laneOrder || 0);
    const bk = bucketKey(n.stageId, n.roleId, lo, pgk);
    if (!buckets.has(bk)) {
      buckets.set(bk, {
        stageId: n.stageId,
        roleId: n.roleId,
        laneOrder: lo,
        parallelGroupKey: pgk,
        nodeIds: [],
      });
    }
    buckets.get(bk)!.nodeIds.push(n.id);
  });

  const subtreeSpanMemo = new Map<string, number>();
  nodes.forEach((n) => {
    computeSubtreeSpanRows(n.id, nodeById, parentsMap, subtreeSpanMemo, new Set());
  });

  const layoutRow = new Map<string, number>();
  const blockStartMap = new Map<string, number>();
  const depthMemo = new Map<string, number>();

  const sortedBuckets = [...buckets.entries()].sort((a, b) => {
    const minDepth = (bk: GroupBucket) =>
      Math.min(...bk.nodeIds.map((id) => ancestorDepth(id, pending, depthMemo)));
    const da = minDepth(a[1]);
    const db = minDepth(b[1]);
    if (da !== db) return da - db;
    return a[0].localeCompare(b[0]);
  });

  /** 同一泳道格 (stage, role, laneOrder) 内垂向行必须全局连续分配，不能按 parallelGroupKey 分桶各自从 0 起算，否则会与兄弟块/子树抢占同一行（重叠、并行层打散）。 */
  const cellColCursor = new Map<string, number>();
  const cellColKey = (stageId: string, roleId: string, laneOrder: number) =>
    `${stageId}\0${roleId}\0${laneOrder}`;

  for (const [, b] of sortedBuckets) {
    b.nodeIds.sort((x, y) => {
      const sx = pending.get(x)?.siblingLevel ?? 0;
      const sy = pending.get(y)?.siblingLevel ?? 0;
      if (sx !== sy) return sx - sy;
      return x.localeCompare(y);
    });
    const ck = cellColKey(b.stageId, b.roleId, b.laneOrder);
    let cursor = cellColCursor.get(ck) ?? 0;
    for (const id of b.nodeIds) {
      if (layoutRow.has(id)) continue;
      const span = subtreeSpanMemo.get(id) ?? 1;
      const bs = cursor;
      assignFromRoot(id, cursor, bs, nodeById, parentsMap, subtreeSpanMemo, layoutRow, blockStartMap);
      cursor += span;
    }
    cellColCursor.set(ck, cursor);
  }

  const out = new Map<string, SwimlaneLayoutOverlay>();
  nodes.forEach((n) => {
    const p = pending.get(n.id)!;
    const lr = layoutRow.get(n.id) ?? 0;
    const bs = blockStartMap.get(n.id) ?? lr;
    const span = subtreeSpanMemo.get(n.id) ?? 1;
    out.set(n.id, {
      nodeId: n.id,
      parallelGroupKey: p.parallelGroupKey || '',
      siblingLevel: p.layoutParentId ? (p.siblingLevel ?? 0) : 0,
      layoutParentId: p.layoutParentId || '',
      layoutRow: lr,
      subtreeSpanRows: span,
      blockStartRow: bs,
      rowInBlock: lr - bs,
      autoRow: lr,
    });
  });

  return out;
}

/**
 * 阶段顶部预留行数：存在从前序阶段跨入本阶段的边时，为「阶段入线通道」整体下移节点。
 * MVP：无跨入 → 0；有跨入 → 1；多源或同一源多条跨入（trunk/多分支）→ 2。
 */
export function computeStageTopOffsets(
  nodes: SwimlaneLayoutNode[],
  stageIdsInOrder: string[],
): Record<string, number> {
  const offset: Record<string, number> = {};
  stageIdsInOrder.forEach((id) => {
    offset[id] = 0;
  });
  if (stageIdsInOrder.length <= 1) return offset;

  const stageIndex = new Map(stageIdsInOrder.map((id, i) => [id, i]));

  for (let si = 1; si < stageIdsInOrder.length; si += 1) {
    const stageId = stageIdsInOrder[si];
    const targetsInStage = new Set(nodes.filter((n) => n.stageId === stageId).map((n) => n.id));
    if (targetsInStage.size === 0) continue;

    const crossEdges: { fromId: string; fromStage: string }[] = [];
    nodes.forEach((from) => {
      const fi = stageIndex.get(from.stageId);
      if (fi === undefined || fi >= si) return;
      (from.nextIds || []).forEach((toId) => {
        if (!targetsInStage.has(toId)) return;
        crossEdges.push({ fromId: from.id, fromStage: from.stageId });
      });
    });

    if (crossEdges.length === 0) {
      offset[stageId] = 0;
      continue;
    }

    const distinctSources = new Set(crossEdges.map((e) => e.fromId));
    const fanOutBySource = new Map<string, number>();
    crossEdges.forEach((e) => {
      fanOutBySource.set(e.fromId, (fanOutBySource.get(e.fromId) || 0) + 1);
    });
    const hasTrunkOrMultiBranch =
      distinctSources.size >= 2 || [...fanOutBySource.values()].some((c) => c >= 2);

    offset[stageId] = hasTrunkOrMultiBranch ? 2 : 1;
  }

  return offset;
}

/** 运行时垂向行号：阶段预留 + layoutRow（不叠加业务 laneRow） */
export function computeEffectiveRow(
  stageTopOffset: Record<string, number>,
  stageId: string,
  layoutRow: number,
): number {
  return (stageTopOffset[stageId] ?? 0) + layoutRow;
}
