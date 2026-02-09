import type { WorkflowEdge, WorkflowNode, GraphSummary } from './workflowTypes'

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function snap(n: number, step: number) {
  if (step <= 1) return n
  return Math.round(n / step) * step
}

export function safeJsonKeys(s: string): string[] {
  try {
    const v = JSON.parse(s)
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
    }
    return []
  } catch {
    return []
  }
}

export function normalizeType(t: string) {
  return String(t)
    .trim()
    .replace(/^const\s+/i, '')
    .replace(/\bconst\b/gi, '')
    .replace(/\s+/g, '')
    .replace(/[&*]+$/g, '')
    .toLowerCase()
}

export function extractIoFieldNames(ioJson: string): string[] {
  try {
    const obj = JSON.parse(ioJson)
    const fields = Array.isArray((obj as any)?.fields) ? (obj as any).fields : null
    if (fields) {
      const names = fields
        .map((f: any) => (f?.name != null ? String(f.name) : ''))
        .map((n: string) => n.trim().toLowerCase())
        .filter((n: string) => n)
      return Array.from(new Set(names))
    }
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const keys = Object.keys(obj as Record<string, unknown>)
        .filter((k) => k !== 'fields')
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k && !['input', 'output', 'params', 'param'].includes(k))
      return Array.from(new Set(keys))
    }
    return []
  } catch {
    return []
  }
}

export function extractIoTypes(ioJson: string): string[] {
  try {
    const obj = JSON.parse(ioJson)
    const fields = Array.isArray((obj as any)?.fields) ? (obj as any).fields : null
    if (!fields) return []
    const types = fields
      .map((f: any) => (f?.type != null ? String(f.type) : ''))
      .map((t: string) => normalizeType(t))
      .filter((t: string) => t && t !== 'void')
    return Array.from(new Set(types))
  } catch {
    return []
  }
}

export function ioMatchScore(fromOutputsJson: string, toInputsJson: string) {
  const outNames = extractIoFieldNames(fromOutputsJson)
  const inNames = extractIoFieldNames(toInputsJson)
  const outTypes = extractIoTypes(fromOutputsJson)
  const inTypes = extractIoTypes(toInputsJson)

  const inNameSet = new Set(inNames)
  const sharedNames = outNames.filter((n) => inNameSet.has(n))

  const inTypeSet = new Set(inTypes)
  const sharedTypes = outTypes.filter((t) => inTypeSet.has(t))

  const score = sharedNames.length * 3 + sharedTypes.length
  return {
    outNames,
    inNames,
    outTypes,
    inTypes,
    sharedNames,
    sharedTypes,
    score
  }
}

export function computeGraphSummary(nodes: WorkflowNode[], edges: WorkflowEdge[]): GraphSummary {
  const byId = new Map(nodes.map((n) => [n.id, n] as const))
  const hasIncoming = new Set<string>()
  const hasOutgoing = new Set<string>()

  const connections: GraphSummary['connections'] = []
  for (const e of edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    hasOutgoing.add(a.id)
    hasIncoming.add(b.id)
    connections.push({
      from: { nodeId: a.id, nodeName: a.display_name },
      to: { nodeId: b.id, nodeName: b.display_name }
    })
  }

  const globalInputs: GraphSummary['globalInputs'] = []
  const globalOutputs: GraphSummary['globalOutputs'] = []
  for (const n of nodes) {
    const inKeys = safeJsonKeys(n.inputsJson)
    const outKeys = safeJsonKeys(n.outputsJson)
    if (!hasIncoming.has(n.id)) {
      globalInputs.push({ nodeId: n.id, nodeName: n.display_name, keys: inKeys })
    }
    if (!hasOutgoing.has(n.id)) {
      globalOutputs.push({ nodeId: n.id, nodeName: n.display_name, keys: outKeys })
    }
  }

  return { globalInputs, globalOutputs, connections }
}

function roundedCornerPath(points: Array<{ x: number; y: number }>, radius: number): string {
  if (points.length < 2) return ''
  const r = Math.max(0, radius)
  const d: string[] = []
  d.push(`M ${points[0].x} ${points[0].y}`)
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    if (!next || r === 0) {
      d.push(`L ${curr.x} ${curr.y}`)
      continue
    }
    const vx1 = curr.x - prev.x
    const vy1 = curr.y - prev.y
    const vx2 = next.x - curr.x
    const vy2 = next.y - curr.y
    const len1 = Math.hypot(vx1, vy1) || 1
    const len2 = Math.hypot(vx2, vy2) || 1
    const r1 = Math.min(r, len1 / 2)
    const r2 = Math.min(r, len2 / 2)
    const p1x = curr.x - (vx1 / len1) * r1
    const p1y = curr.y - (vy1 / len1) * r1
    const p2x = curr.x + (vx2 / len2) * r2
    const p2y = curr.y + (vy2 / len2) * r2
    d.push(`L ${p1x} ${p1y}`)
    d.push(`Q ${curr.x} ${curr.y} ${p2x} ${p2y}`)
  }
  return d.join(' ')
}

export function orthogonalRoundedEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts?: { cornerRadius?: number; stub?: number }
) {
  const cornerRadius = Math.max(0, opts?.cornerRadius ?? 10)
  const stub = Math.max(8, opts?.stub ?? 18)

  const sx = from.x
  const sy = from.y
  const tx = to.x
  const ty = to.y

  const leftToRight = tx >= sx
  const p0 = { x: sx, y: sy }
  const p4 = { x: tx, y: ty }

  if (leftToRight) {
    const midX = sx + Math.max(stub, (tx - sx) / 2)
    const points = [
      p0,
      { x: sx + stub, y: sy },
      { x: midX, y: sy },
      { x: midX, y: ty },
      { x: tx - stub, y: ty },
      p4
    ]
    return roundedCornerPath(points, cornerRadius)
  }

  const midX1 = sx + stub
  const midX2 = tx - stub
  const midY = sy + (ty - sy) / 2
  const points = [
    p0,
    { x: midX1, y: sy },
    { x: midX1, y: midY },
    { x: midX2, y: midY },
    { x: midX2, y: ty },
    p4
  ]
  return roundedCornerPath(points, cornerRadius)
}

function connectedComponents(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n] as const))
  const undirected = new Map<string, Set<string>>()
  for (const n of nodes) undirected.set(n.id, new Set())
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue
    undirected.get(e.from)?.add(e.to)
    undirected.get(e.to)?.add(e.from)
  }
  const seen = new Set<string>()
  const comps: string[][] = []
  for (const n of nodes) {
    if (seen.has(n.id)) continue
    const q = [n.id]
    seen.add(n.id)
    const comp: string[] = []
    while (q.length) {
      const cur = q.shift()!
      comp.push(cur)
      for (const nb of undirected.get(cur) || []) {
        if (seen.has(nb)) continue
        seen.add(nb)
        q.push(nb)
      }
    }
    comps.push(comp)
  }
  return comps
}

function stronglyConnectedComponents(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n] as const))
  const out = new Map<string, string[]>()
  const rev = new Map<string, string[]>()
  for (const n of nodes) {
    out.set(n.id, [])
    rev.set(n.id, [])
  }
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue
    out.get(e.from)!.push(e.to)
    rev.get(e.to)!.push(e.from)
  }

  const order: string[] = []
  const seen = new Set<string>()
  function dfs1(v: string) {
    seen.add(v)
    for (const to of out.get(v) || []) if (!seen.has(to)) dfs1(to)
    order.push(v)
  }
  for (const n of nodes) if (!seen.has(n.id)) dfs1(n.id)

  const compIndex = new Map<string, number>()
  const comps: string[][] = []
  function dfs2(v: string, idx: number, acc: string[]) {
    compIndex.set(v, idx)
    acc.push(v)
    for (const to of rev.get(v) || []) if (!compIndex.has(to)) dfs2(to, idx, acc)
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i]
    if (compIndex.has(v)) continue
    const acc: string[] = []
    const idx = comps.length
    dfs2(v, idx, acc)
    comps.push(acc)
  }
  return { comps, compIndex }
}

function orderToMinimizeBackEdges(nodes: string[], edges: Array<{ from: string; to: string }>) {
  const set = new Set(nodes)
  const inDeg = new Map<string, number>()
  const outDeg = new Map<string, number>()
  for (const id of nodes) {
    inDeg.set(id, 0)
    outDeg.set(id, 0)
  }
  for (const e of edges) {
    if (!set.has(e.from) || !set.has(e.to)) continue
    outDeg.set(e.from, (outDeg.get(e.from) || 0) + 1)
    inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1)
  }

  const left: string[] = []
  const right: string[] = []
  const remaining = new Set(nodes)
  while (remaining.size) {
    let bestMax: string | null = null
    let bestMaxScore = -1e9
    let bestMin: string | null = null
    let bestMinScore = 1e9
    for (const id of remaining) {
      const score = (outDeg.get(id) || 0) - (inDeg.get(id) || 0)
      if (score > bestMaxScore) {
        bestMaxScore = score
        bestMax = id
      }
      if (score < bestMinScore) {
        bestMinScore = score
        bestMin = id
      }
    }
    const pick = bestMax && bestMaxScore >= -bestMinScore ? bestMax : bestMin
    if (!pick) break

    if (pick === bestMax) left.push(pick)
    else right.push(pick)

    remaining.delete(pick)
    for (const e of edges) {
      if (!remaining.has(e.from) || !remaining.has(e.to)) continue
      if (e.from === pick) {
        inDeg.set(e.to, (inDeg.get(e.to) || 0) - 1)
      } else if (e.to === pick) {
        outDeg.set(e.from, (outDeg.get(e.from) || 0) - 1)
      }
    }
  }
  right.reverse()
  return [...left, ...right]
}

export function autoLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  opts?: { xGap?: number; yGap?: number; margin?: number; mode?: 'square' | 'dag' | 'radial' }
) {
  const mode = opts?.mode ?? 'square'
  if (mode === 'dag') {
    const xGap = Math.max(320, opts?.xGap ?? 420)
    const yGap = Math.max(120, opts?.yGap ?? 160)
    const margin = Math.max(12, opts?.margin ?? 24)

    const byId = new Map(nodes.map((n) => [n.id, n] as const))
    const { comps: sccs, compIndex } = stronglyConnectedComponents(nodes, edges)

    type Comp = { id: string; nodeIds: string[] }
    const compById = new Map<string, Comp>()
    for (let i = 0; i < sccs.length; i++) {
      const id = `c${i}`
      compById.set(id, { id, nodeIds: sccs[i].slice() })
    }
    const compIdByNode = new Map<string, string>()
    for (let i = 0; i < sccs.length; i++) {
      const id = `c${i}`
      for (const nid of sccs[i]) compIdByNode.set(nid, id)
    }

    const compOutgoing = new Map<string, Set<string>>()
    const compIncoming = new Map<string, Set<string>>()
    for (const c of compById.values()) {
      compOutgoing.set(c.id, new Set())
      compIncoming.set(c.id, new Set())
    }
    for (const e of edges) {
      if (!byId.has(e.from) || !byId.has(e.to)) continue
      const cf = compIdByNode.get(e.from)
      const ct = compIdByNode.get(e.to)
      if (!cf || !ct) continue
      if (cf === ct) continue
      compOutgoing.get(cf)!.add(ct)
      compIncoming.get(ct)!.add(cf)
    }

    const compIds = Array.from(compById.keys())
    const indeg = new Map<string, number>()
    for (const cid of compIds) indeg.set(cid, compIncoming.get(cid)!.size)
    const q: string[] = compIds.filter((id) => (indeg.get(id) || 0) === 0).sort()
    const topo: string[] = []
    const indeg2 = new Map(indeg)
    while (q.length) {
      const cur = q.shift()!
      topo.push(cur)
      for (const to of compOutgoing.get(cur) || []) {
        indeg2.set(to, (indeg2.get(to) || 0) - 1)
        if ((indeg2.get(to) || 0) === 0) {
          q.push(to)
          q.sort()
        }
      }
    }
    const order = topo.length === compIds.length ? topo : compIds.slice().sort()

    const layer = new Map<string, number>()
    for (const id of compIds) layer.set(id, 0)
    for (const id of order) {
      const curL = layer.get(id) || 0
      for (const to of compOutgoing.get(id) || []) layer.set(to, Math.max(layer.get(to) || 0, curL + 1))
    }

    const layers = new Map<number, string[]>()
    for (const id of compIds) {
      const l = layer.get(id) || 0
      const arr = layers.get(l) || []
      arr.push(id)
      layers.set(l, arr)
    }

    const maxLayer = Math.max(0, ...Array.from(layers.keys()))
    const layerOrder = new Map<number, string[]>()
    for (let l = 0; l <= maxLayer; l++) layerOrder.set(l, (layers.get(l) || []).slice().sort())

    for (let iter = 0; iter < 4; iter++) {
      for (let l = 1; l <= maxLayer; l++) {
        const prev = layerOrder.get(l - 1) || []
        const prevIndex = new Map(prev.map((id, idx) => [id, idx] as const))
        const ids = (layerOrder.get(l) || []).slice()
        ids.sort((a, b) => {
          const pa = Array.from(compIncoming.get(a) || []).filter((p) => (layer.get(p) || 0) === l - 1)
          const pb = Array.from(compIncoming.get(b) || []).filter((p) => (layer.get(p) || 0) === l - 1)
          const aa = pa.length ? pa.reduce((s, x) => s + (prevIndex.get(x) ?? 0), 0) / pa.length : 9999
          const bb = pb.length ? pb.reduce((s, x) => s + (prevIndex.get(x) ?? 0), 0) / pb.length : 9999
          return aa - bb || String(a).localeCompare(String(b))
        })
        layerOrder.set(l, ids)
      }

      for (let l = maxLayer - 1; l >= 0; l--) {
        const next = layerOrder.get(l + 1) || []
        const nextIndex = new Map(next.map((id, idx) => [id, idx] as const))
        const ids = (layerOrder.get(l) || []).slice()
        ids.sort((a, b) => {
          const ca = Array.from(compOutgoing.get(a) || []).filter((p) => (layer.get(p) || 0) === l + 1)
          const cb = Array.from(compOutgoing.get(b) || []).filter((p) => (layer.get(p) || 0) === l + 1)
          const aa = ca.length ? ca.reduce((s, x) => s + (nextIndex.get(x) ?? 0), 0) / ca.length : 9999
          const bb = cb.length ? cb.reduce((s, x) => s + (nextIndex.get(x) ?? 0), 0) / cb.length : 9999
          return aa - bb || String(a).localeCompare(String(b))
        })
        layerOrder.set(l, ids)
      }
    }

    const compPos = new Map<string, { x: number; y: number }>()
    let yBase = margin

    let maxCount = 0
    for (const ids of layerOrder.values()) maxCount = Math.max(maxCount, ids.length)

    for (let l = 0; l <= maxLayer; l++) {
      const ids = layerOrder.get(l) || []
      for (let i = 0; i < ids.length; i++) {
        compPos.set(ids[i], { x: margin + l * xGap, y: yBase + i * yGap })
      }
    }

    yBase += Math.max(1, maxCount) * yGap + margin

    const nodePos = new Map<string, { x: number; y: number }>()
    const NODE_W = 280
    const localGap = 120
    for (let i = 0; i < sccs.length; i++) {
      const cid = `c${i}`
      const p = compPos.get(cid)
      if (!p) continue
      const ids = sccs[i]
      if (ids.length <= 1) {
        const id = ids[0]
        nodePos.set(id, { x: p.x, y: p.y })
        continue
      }

      const innerEdges = edges
        .filter((e) => byId.has(e.from) && byId.has(e.to) && (compIndex.get(e.from) || 0) === i && (compIndex.get(e.to) || 0) === i)
        .map((e) => ({ from: e.from, to: e.to }))
      const ord = orderToMinimizeBackEdges(ids, innerEdges)
      const startX = p.x
      const baseY = p.y
      for (let k = 0; k < ord.length; k++) {
        nodePos.set(ord[k], { x: startX + k * (NODE_W + localGap), y: baseY })
      }
    }

    return nodes.map((n) => {
      const p = nodePos.get(n.id)
      if (!p) return n
      return { ...n, x: p.x, y: p.y }
    })
  }

  if (mode === 'radial') {
    const xGap = Math.max(240, opts?.xGap ?? 320)
    const yGap = Math.max(140, opts?.yGap ?? 180)
    const margin = Math.max(12, opts?.margin ?? 24)
    const step = 8

    const NODE_W = 280
    const NODE_H = 66

    const byId = new Map(nodes.map((n) => [n.id, n] as const))
    const incoming = new Map<string, string[]>()
    const outgoing = new Map<string, string[]>()
    const undirected = new Map<string, Set<string>>()
    for (const n of nodes) {
      incoming.set(n.id, [])
      outgoing.set(n.id, [])
      undirected.set(n.id, new Set())
    }
    for (const e of edges) {
      if (!byId.has(e.from) || !byId.has(e.to)) continue
      outgoing.get(e.from)!.push(e.to)
      incoming.get(e.to)!.push(e.from)
      undirected.get(e.from)!.add(e.to)
      undirected.get(e.to)!.add(e.from)
    }

    const comps = connectedComponents(nodes, edges)
    const placed: WorkflowNode[] = []
    const boxes: Array<{ w: number; h: number; nodes: WorkflowNode[] }> = []

    for (const ids of comps) {
      const compNodes = ids.map((id) => byId.get(id)).filter((n): n is WorkflowNode => Boolean(n))
      if (!compNodes.length) continue

      const in0 = compNodes.filter((n) => (incoming.get(n.id) || []).length === 0)
      const root = (in0.length ? in0 : compNodes)
        .slice()
        .sort((a, b) => {
          const da = (incoming.get(a.id)?.length || 0) + (outgoing.get(a.id)?.length || 0)
          const db = (incoming.get(b.id)?.length || 0) + (outgoing.get(b.id)?.length || 0)
          return db - da
        })[0]

      const depth = new Map<string, number>()
      const parent = new Map<string, string | null>()
      const q: string[] = [root.id]
      depth.set(root.id, 0)
      parent.set(root.id, null)
      while (q.length) {
        const cur = q.shift()!
        const d = depth.get(cur) || 0
        const nbs = Array.from(undirected.get(cur) || [])
        nbs.sort((a, b) => {
          const da = (incoming.get(a)?.length || 0) + (outgoing.get(a)?.length || 0)
          const db = (incoming.get(b)?.length || 0) + (outgoing.get(b)?.length || 0)
          return db - da
        })
        for (const nb of nbs) {
          if (depth.has(nb)) continue
          depth.set(nb, d + 1)
          parent.set(nb, cur)
          q.push(nb)
        }
      }

      const maxDepth = Math.max(...Array.from(depth.values()))
      const levels: string[][] = Array.from({ length: maxDepth + 1 }, () => [])
      for (const id of ids) {
        const d = depth.get(id)
        if (d == null) continue
        levels[d].push(id)
      }

      for (const lvl of levels) {
        lvl.sort((a, b) => {
          const pa = parent.get(a) || ''
          const pb = parent.get(b) || ''
          if (pa !== pb) return String(pa).localeCompare(String(pb))
          const da = (incoming.get(a)?.length || 0) + (outgoing.get(a)?.length || 0)
          const db = (incoming.get(b)?.length || 0) + (outgoing.get(b)?.length || 0)
          return db - da || String(a).localeCompare(String(b))
        })
      }

      const coords = new Map<string, { x: number; y: number }>()
      coords.set(root.id, { x: 0, y: 0 })

      for (let d = 1; d < levels.length; d++) {
        const idsAt = levels[d]
        if (!idsAt.length) continue
        const minCirc = idsAt.length * (NODE_W + 40)
        const rFromCount = minCirc / (2 * Math.PI)
        const rFromDepth = d * (NODE_H + yGap)
        const r = Math.max(rFromCount, rFromDepth, NODE_W + xGap)

        const stepAng = (2 * Math.PI) / idsAt.length
        const start = -Math.PI / 2
        for (let i = 0; i < idsAt.length; i++) {
          const ang = start + i * stepAng
          coords.set(idsAt[i], { x: r * Math.cos(ang), y: r * Math.sin(ang) })
        }
      }

      const outNodes = compNodes.map((n) => {
        const p = coords.get(n.id) || { x: 0, y: 0 }
        return { ...n, x: snap(p.x, step), y: snap(p.y, step) }
      })

      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY
      for (const n of outNodes) {
        minX = Math.min(minX, n.x)
        minY = Math.min(minY, n.y)
        maxX = Math.max(maxX, n.x + NODE_W)
        maxY = Math.max(maxY, n.y + NODE_H)
      }

      const dx = margin - minX
      const dy = margin - minY
      const shifted = outNodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }))
      boxes.push({ w: maxX - minX + margin * 2, h: maxY - minY + margin * 2, nodes: shifted })
    }

    let cursorX = margin
    let cursorY = margin
    let rowH = 0
    const maxRowW = 2200
    for (const b of boxes) {
      if (cursorX + b.w > maxRowW && cursorX > margin) {
        cursorX = margin
        cursorY += rowH + yGap
        rowH = 0
      }
      for (const n of b.nodes) {
        placed.push({ ...n, x: snap(n.x + cursorX, step), y: snap(n.y + cursorY, step) })
      }
      cursorX += b.w + xGap
      rowH = Math.max(rowH, b.h)
    }

    const byPlacedId = new Map(placed.map((n) => [n.id, n] as const))
    return nodes.map((n) => byPlacedId.get(n.id) || n)
  }

  const xGap = Math.max(240, opts?.xGap ?? 320)
  const yGap = Math.max(110, opts?.yGap ?? 160)
  const margin = Math.max(12, opts?.margin ?? 24)

  const byId = new Map(nodes.map((n) => [n.id, n] as const))
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  for (const n of nodes) {
    outgoing.set(n.id, [])
    incoming.set(n.id, [])
  }
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue
    outgoing.get(e.from)!.push(e.to)
    incoming.get(e.to)!.push(e.from)
  }

  function topoOrder(ids: string[]) {
    const set = new Set(ids)
    const indeg = new Map<string, number>()
    for (const id of ids) indeg.set(id, (incoming.get(id) || []).filter((p) => set.has(p)).length)
    const q: string[] = ids.filter((id) => (indeg.get(id) || 0) === 0).sort()
    const out: string[] = []
    const indeg2 = new Map(indeg)
    while (q.length) {
      const cur = q.shift()!
      out.push(cur)
      for (const to of outgoing.get(cur) || []) {
        if (!set.has(to)) continue
        indeg2.set(to, (indeg2.get(to) || 0) - 1)
        if ((indeg2.get(to) || 0) === 0) {
          q.push(to)
          q.sort()
        }
      }
    }
    return out.length === ids.length ? out : ids.slice().sort()
  }

  const comps = connectedComponents(nodes, edges)
  const pos = new Map<string, { x: number; y: number }>()
  let yBase = margin

  for (const compIds of comps) {
    const order = topoOrder(compIds)
    const n = order.length
    const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
    const rows = Math.max(1, Math.ceil(n / cols))
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols)
      const colRaw = i % cols
      const col = row % 2 === 0 ? colRaw : cols - 1 - colRaw
      pos.set(order[i], { x: margin + col * xGap, y: yBase + row * yGap })
    }
    yBase += rows * yGap + margin
  }

  return nodes.map((n) => {
    const p = pos.get(n.id)
    if (!p) return n
    return { ...n, x: p.x, y: p.y }
  })
}
