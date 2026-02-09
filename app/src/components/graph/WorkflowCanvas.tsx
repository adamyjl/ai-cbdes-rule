import type { DragEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip, Typography, message } from 'antd'
import type { WorkflowEdge, WorkflowNode } from './workflowTypes'
import { clamp, ioMatchScore, newId, orthogonalRoundedEdgePath, snap } from './graphUtils'

type DraggingState =
  | { kind: 'node'; nodeId: string; dx: number; dy: number }
  | { kind: 'connect'; fromId: string; x: number; y: number }
  | { kind: 'select'; startX: number; startY: number; x: number; y: number; additive: boolean }
  | { kind: 'pan'; startX: number; startY: number; startOx: number; startOy: number }
  | null

const NODE_W = 280
const NODE_H = 66
const GLUE_R = 7

function canConnectDefault(from: WorkflowNode, to: WorkflowNode) {
  const m = ioMatchScore(from.outputsJson, to.inputsJson)
  const hasAnySignal = m.outNames.length + m.outTypes.length + m.inNames.length + m.inTypes.length > 0
  if (!hasAnySignal) return true
  return m.score > 0
}

export function WorkflowCanvas(props: {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectedNodeIds?: string[]
  pendingFromId: string | null
  onSelectNode: (id: string | null) => void
  onSelectNodes?: (ids: string[]) => void
  onSelectEdge: (id: string | null) => void
  onSetPendingFrom: (id: string | null) => void
  onAddNode: (node: WorkflowNode) => void
  onUpdateNodePos: (id: string, x: number, y: number) => void
  onUpdateNodePosBatch?: (updates: Array<{ id: string; x: number; y: number }>) => void
  onAddEdge: (edge: WorkflowEdge) => void
  onDeleteNode: (nodeId: string) => void
  onDeleteEdge: (edgeId: string) => void
  canvasRef: RefObject<HTMLDivElement | null>
  rootDir: string
  hideGlue: boolean
  resetViewToken: number
  fitViewToken?: number
  onDropModule?: (moduleKey: string, pt: { x: number; y: number }) => void
  onToggleModule?: (nodeId: string) => void
  onRequestConnect?: (from: WorkflowNode, to: WorkflowNode) => Promise<boolean> | boolean
}) {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    selectedNodeIds,
    pendingFromId,
    onSelectNode,
    onSelectNodes,
    onSelectEdge,
    onSetPendingFrom,
    onAddNode,
    onUpdateNodePos,
    onUpdateNodePosBatch,
    onAddEdge,
    onDeleteNode,
    onDeleteEdge,
    canvasRef,
    rootDir,
    hideGlue,
    resetViewToken,
    fitViewToken,
    onDropModule,
    onToggleModule,
    onRequestConnect
  } = props

  const [dragging, setDragging] = useState<DraggingState>(null)
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([])
  const pointerIdRef = useRef<number | null>(null)
  const didDragRef = useRef(false)

  const hostRef = useRef<HTMLDivElement | null>(null)

  const [view, setView] = useState<{ scale: number; ox: number; oy: number }>({ scale: 1, ox: 0, oy: 0 })
  const viewRef = useRef(view)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    setView({ scale: 1, ox: 0, oy: 0 })
  }, [resetViewToken])

  function fitViewToNodes() {
    const el = hostRef.current
    if (!el) return
    if (!nodes.length) {
      setView({ scale: 1, ox: 0, oy: 0 })
      return
    }
    const rect = el.getBoundingClientRect()
    const pad = 28
    const minX = Math.min(...nodes.map((n) => n.x))
    const minY = Math.min(...nodes.map((n) => n.y))
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W))
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H))
    const w = Math.max(1, maxX - minX)
    const h = Math.max(1, maxY - minY)

    const sx = (rect.width - pad * 2) / w
    const sy = (rect.height - pad * 2) / h
    const nextScale = clamp(Math.min(sx, sy, 1.0), 0.35, 2.8)

    const contentW = w * nextScale
    const contentH = h * nextScale
    const ox = (rect.width - contentW) / 2 - minX * nextScale
    const oy = (rect.height - contentH) / 2 - minY * nextScale
    setView({ scale: nextScale, ox, oy })
  }

  useEffect(() => {
    if (!fitViewToken) return
    fitViewToNodes()
  }, [fitViewToken])

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n] as const)), [nodes])

  const effectiveSelectedIds = selectedNodeIds ?? internalSelectedIds
  const selectedSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds])

  function setSelectedIds(next: string[]) {
    const uniq = Array.from(new Set(next.map(String).filter(Boolean)))
    if (onSelectNodes) onSelectNodes(uniq)
    else setInternalSelectedIds(uniq)
  }

  function toggleSelectedId(id: string) {
    const next = new Set(selectedSet)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(Array.from(next))
  }

  const display = useMemo(() => {
    if (!hideGlue) {
      return { nodes: nodes.filter((n) => !n.hidden), edges: edges.filter((e) => !e.hidden) }
    }

    const kindById = new Map(nodes.map((n) => [n.id, String(n.kind || 'glue')] as const))
    const neighbors = new Map<string, Set<string>>()
    for (const n of nodes) neighbors.set(n.id, new Set())
    for (const e of edges) {
      if (!neighbors.has(e.from)) neighbors.set(e.from, new Set())
      if (!neighbors.has(e.to)) neighbors.set(e.to, new Set())
      neighbors.get(e.from)!.add(e.to)
      neighbors.get(e.to)!.add(e.from)
    }

    const hiddenGlue = new Set<string>()
    for (const n of nodes) {
      const kind = kindById.get(n.id) || 'glue'
      if (kind !== 'glue') continue
      const ns = Array.from(neighbors.get(n.id) || [])
      const nonGlueNeighbors = ns.filter((id) => (kindById.get(id) || 'glue') !== 'glue')
      if (nonGlueNeighbors.length < 2) {
        hiddenGlue.add(n.id)
      }
    }

    const displayNodes = nodes.filter((n) => !n.hidden && !hiddenGlue.has(n.id))
    const displayEdges = edges.filter((e) => !e.hidden && !hiddenGlue.has(e.from) && !hiddenGlue.has(e.to))
    return { nodes: displayNodes, edges: displayEdges }
  }, [edges, hideGlue, nodes])

  const displayNodeById = useMemo(() => new Map(display.nodes.map((n) => [n.id, n] as const)), [display.nodes])

  function readParentId(paramsJson: string) {
    try {
      const obj = JSON.parse(String(paramsJson || '{}'))
      const pid = obj?.__parent
      return typeof pid === 'string' && pid ? pid : null
    } catch {
      return null
    }
  }

  function readModuleExpanded(paramsJson: string) {
    try {
      const obj = JSON.parse(String(paramsJson || '{}'))
      const m = obj?.__module
      if (m && typeof m === 'object' && m.expanded === false) return false
      return true
    } catch {
      return true
    }
  }

  function readModuleChildIds(paramsJson: string) {
    try {
      const obj = JSON.parse(String(paramsJson || '{}'))
      const m = obj?.__module
      const ids = m?.child_node_ids
      if (!Array.isArray(ids)) return []
      return ids.map((x: any) => String(x)).filter(Boolean)
    } catch {
      return []
    }
  }

  const contentSize = useMemo(() => {
    if (!nodes.length) return { w: 0, h: 0 }
    const pad = 240
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W))
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H))
    return { w: Math.max(0, maxX + pad), h: Math.max(0, maxY + pad) }
  }, [nodes])

  function isGlueMiniNode(n: WorkflowNode) {
    return hideGlue && String(n.kind || 'glue') === 'glue'
  }

  function glueCenter(n: WorkflowNode) {
    return { x: n.x + NODE_W / 2, y: n.y + 22 + GLUE_R }
  }

  function nodeInputHandle(n: WorkflowNode) {
    if (isGlueMiniNode(n)) {
      const c = glueCenter(n)
      return { x: c.x - GLUE_R, y: c.y }
    }
    return { x: n.x, y: n.y + 24 }
  }

  function nodeOutputHandle(n: WorkflowNode) {
    if (isGlueMiniNode(n)) {
      const c = glueCenter(n)
      return { x: c.x + GLUE_R, y: c.y }
    }
    return { x: n.x + NODE_W, y: n.y + 24 }
  }

  const edgeRoutes = useMemo(() => {
    type Seg = { x1: number; y1: number; x2: number; y2: number; o: 'h' | 'v' }
    type Pt = { x: number; y: number }
    type Route = { points: Pt[]; segments: Seg[]; d: string }

    const byId = new Map<string, Route>()
    const crossesByEdge = new Map<string, Pt[]>()

    const occupiedH: Seg[] = []
    const occupiedV: Seg[] = []

    const laneStep = 32
    const step = 8
    const stub = 18
    const bridgeR = 7
    const cornerRadius = 10

    function toSeg(a: Pt, b: Pt): Seg | null {
      if (a.x === b.x) {
        const y1 = Math.min(a.y, b.y)
        const y2 = Math.max(a.y, b.y)
        return { x1: a.x, y1, x2: a.x, y2, o: 'v' }
      }
      if (a.y === b.y) {
        const x1 = Math.min(a.x, b.x)
        const x2 = Math.max(a.x, b.x)
        return { x1, y1: a.y, x2, y2: a.y, o: 'h' }
      }
      return null
    }

    function recordCross(edgeId: string, p: Pt) {
      const arr = crossesByEdge.get(edgeId) || []
      arr.push(p)
      crossesByEdge.set(edgeId, arr)
    }

    function checkCrossings(edgeId: string, seg: Seg) {
      if (seg.o === 'h') {
        for (const v of occupiedV) {
          if (v.o !== 'v') continue
          const x = v.x1
          const y = seg.y1
          if (x < seg.x1 + 10 || x > seg.x2 - 10) continue
          if (y < v.y1 + 10 || y > v.y2 - 10) continue
          recordCross(edgeId, { x, y })
        }
      } else {
        for (const h of occupiedH) {
          if (h.o !== 'h') continue
          const x = seg.x1
          const y = h.y1
          if (x < h.x1 + 10 || x > h.x2 - 10) continue
          if (y < seg.y1 + 10 || y > seg.y2 - 10) continue
          recordCross(edgeId, { x, y })
        }
      }
    }

    function polyPath(points: Pt[]) {
      if (!points.length) return ''
      let d = `M ${points[0].x} ${points[0].y}`
      for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`
      return d
    }

    function roundedCornerPath(points: Pt[], radius: number) {
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

    function hashString(s: string) {
      let h = 2166136261
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619)
      }
      return h >>> 0
    }

    function compactPoints(points: Pt[]) {
      const out: Pt[] = []
      for (const p of points) {
        const last = out[out.length - 1]
        if (last && last.x === p.x && last.y === p.y) continue
        out.push(p)
      }
      return out
    }

    function simplifyOrthPoints(points: Pt[]) {
      const pts = compactPoints(points)
      const out: Pt[] = []
      for (let i = 0; i < pts.length; i++) {
        const prev = out[out.length - 1]
        const cur = pts[i]
        const next = pts[i + 1]
        if (prev && next) {
          const collinear = (prev.x === cur.x && cur.x === next.x) || (prev.y === cur.y && cur.y === next.y)
          if (collinear) {
            out[out.length - 1] = cur
            continue
          }
        }
        out.push(cur)
      }
      return out
    }

    const outgoingByFrom = new Map<string, WorkflowEdge[]>()
    for (const e of display.edges) {
      const arr = outgoingByFrom.get(e.from) || []
      arr.push(e)
      outgoingByFrom.set(e.from, arr)
    }

    const outOffsetByEdgeId = new Map<string, number>()
    const outRankByEdgeId = new Map<string, number>()
    for (const [fromId, es] of outgoingByFrom.entries()) {
      const sorted = es
        .slice()
        .sort((a, b) => {
          const ta = displayNodeById.get(a.to)
          const tb = displayNodeById.get(b.to)
          return (ta?.y ?? 0) - (tb?.y ?? 0) || String(a.id).localeCompare(String(b.id))
        })
      const n = sorted.length
      const spread = 44
      for (let i = 0; i < n; i++) {
        const rank = i - (n - 1) / 2
        outRankByEdgeId.set(sorted[i].id, rank)
        outOffsetByEdgeId.set(sorted[i].id, rank * spread)
      }
    }

    const incomingByTo = new Map<string, WorkflowEdge[]>()
    for (const e of display.edges) {
      const arr = incomingByTo.get(e.to) || []
      arr.push(e)
      incomingByTo.set(e.to, arr)
    }

    const inRankByEdgeId = new Map<string, number>()
    for (const [toId, es] of incomingByTo.entries()) {
      const sorted = es
        .slice()
        .sort((a, b) => {
          const fa = displayNodeById.get(a.from)
          const fb = displayNodeById.get(b.from)
          return (fa?.y ?? 0) - (fb?.y ?? 0) || String(a.id).localeCompare(String(b.id))
        })
      const n = sorted.length
      for (let i = 0; i < n; i++) {
        const rank = i - (n - 1) / 2
        inRankByEdgeId.set(sorted[i].id, rank)
      }
    }

    for (const e of display.edges) {
      const from = displayNodeById.get(e.from)
      const to = displayNodeById.get(e.to)
      if (!from || !to) continue
      const a0 = nodeOutputHandle(from)
      const b0 = nodeInputHandle(to)
      const ax = snap(a0.x, step)
      const ay = snap(a0.y, step)
      const bx = snap(b0.x, step)
      const by = snap(b0.y, step)

      const outRank = outRankByEdgeId.get(e.id) || 0
      const inRank = inRankByEdgeId.get(e.id) || 0
      const outDy = snap(Math.max(-30, Math.min(30, outRank * 10)), step)
      const inDy = snap(Math.max(-30, Math.min(30, inRank * 10)), step)
      const outStubX = snap(Math.max(12, stub + Math.max(-12, Math.min(56, outRank * 14))), step)
      const inStubX = snap(Math.max(12, stub + Math.max(-12, Math.min(56, inRank * 14))), step)

      const sy = snap(ay + outDy, step)
      const ty = snap(by + inDy, step)

      const base = (sy + ty) / 2
      const yMin = Math.min(sy, ty) - laneStep * 2
      const yMax = Math.max(sy, ty) + laneStep * 2
      const spread = (outRank - inRank) * (laneStep * 0.55)
      const bias = (outOffsetByEdgeId.get(e.id) || 0) * 0.35
      const yLane = snap(Math.max(yMin, Math.min(yMax, base + spread + bias)), laneStep)

      const p0 = { x: ax, y: ay }
      const p1 = { x: ax, y: sy }
      const p2 = { x: ax + outStubX, y: sy }
      const p5 = { x: bx - inStubX, y: ty }
      const p6 = { x: bx, y: ty }
      const p7 = { x: bx, y: by }

      let points: Pt[]
      const minSpan = ax + outStubX + inStubX + 48
      if (bx >= minSpan) {
        points = [
          p0,
          p1,
          p2,
          { x: p2.x, y: yLane },
          { x: p5.x, y: yLane },
          p5,
          p6,
          p7
        ]
      } else {
        const xLane = snap(Math.max(ax + outStubX, bx) + 200 + Math.abs(outRank) * 36 + Math.abs(inRank) * 36, step)
        points = [
          p0,
          p1,
          p2,
          { x: xLane, y: p2.y },
          { x: xLane, y: yLane },
          { x: p5.x, y: yLane },
          p5,
          p6,
          p7
        ]
      }

      const points2 = simplifyOrthPoints(points)
      const segments: Seg[] = []
      for (let i = 0; i < points2.length - 1; i++) {
        const s = toSeg(points2[i], points2[i + 1])
        if (!s) continue
        segments.push(s)
      }

      for (const s of segments) checkCrossings(e.id, s)
      for (const s of segments) {
        if (s.o === 'h') occupiedH.push(s)
        else occupiedV.push(s)
      }

      byId.set(e.id, { points: points2, segments, d: roundedCornerPath(points2, cornerRadius) })
    }

    for (const [edgeId, pts] of crossesByEdge.entries()) {
      const uniq: Pt[] = []
      const seen = new Set<string>()
      for (const p of pts) {
        const k = `${snap(p.x, 2)}_${snap(p.y, 2)}`
        if (seen.has(k)) continue
        seen.add(k)
        uniq.push(p)
      }
      crossesByEdge.set(edgeId, uniq)
    }

    return { byId, crossesByEdge }
  }, [display.edges, displayNodeById, hideGlue])

  const moduleBoxes = useMemo(() => {
    const step = 8
    const laneStep = 32
    const stub = 18
    const bridgeR = 7

    const liveNodes = nodes.filter((n) => !n.hidden)
    const liveById = new Map(liveNodes.map((n) => [n.id, n] as const))

    const byParent = new Map<string, WorkflowNode[]>()
    for (const n of liveNodes) {
      const pid = readParentId(String(n.paramsJson || ''))
      if (!pid) continue
      const arr = byParent.get(pid) || []
      arr.push(n)
      byParent.set(pid, arr)
    }

    const boxes: Array<{ id: string; x: number; y: number; w: number; h: number }> = []
    for (const m of liveNodes) {
      if (String(m.kind || '') !== 'module') continue
      const expanded = readModuleExpanded(String(m.paramsJson || ''))
      const childIds = expanded ? readModuleChildIds(String(m.paramsJson || '')) : []
      const children = expanded
        ? childIds.length
          ? childIds
              .map((id) => liveById.get(id))
              .filter((n): n is WorkflowNode => Boolean(n))
          : byParent.get(m.id) || []
        : []
      const group = [m, ...children]

      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY

      for (const it of group) {
        const isMini = isGlueMiniNode(it)
        const w = isMini ? GLUE_R * 2 : NODE_W
        const h = isMini ? GLUE_R * 2 : NODE_H
        minX = Math.min(minX, it.x)
        minY = Math.min(minY, it.y)
        maxX = Math.max(maxX, it.x + w)
        maxY = Math.max(maxY, it.y + h)
      }

      if (expanded) {
        const set = new Set(group.map((n) => n.id))
        for (const e of edges) {
          if (e.hidden) continue
          if (!set.has(e.from) || !set.has(e.to)) continue
          const from = liveById.get(e.from)
          const to = liveById.get(e.to)
          if (!from || !to) continue

          const r = edgeRoutes.byId.get(e.id)
          if (r) {
            for (const p of r.points) {
              minX = Math.min(minX, p.x)
              minY = Math.min(minY, p.y)
              maxX = Math.max(maxX, p.x)
              maxY = Math.max(maxY, p.y)
            }
            continue
          }

          const a0 = nodeOutputHandle(from)
          const b0 = nodeInputHandle(to)
          const ax = snap(a0.x, step)
          const ay = snap(a0.y, step)
          const bx = snap(b0.x, step)
          const by = snap(b0.y, step)
          const yLane = snap((ay + by) / 2, laneStep)
          const pts = [
            { x: ax, y: ay },
            { x: ax + stub, y: ay },
            { x: ax + stub, y: yLane },
            { x: bx - stub, y: yLane },
            { x: bx - stub, y: by },
            { x: bx, y: by }
          ]
          for (const p of pts) {
            minX = Math.min(minX, p.x)
            minY = Math.min(minY, p.y)
            maxX = Math.max(maxX, p.x)
            maxY = Math.max(maxY, p.y)
          }
        }

        for (const e of display.edges) {
          if (!set.has(e.from) || !set.has(e.to)) continue
          const pts = edgeRoutes.crossesByEdge.get(e.id) || []
          for (const p of pts) {
            minX = Math.min(minX, p.x - bridgeR)
            minY = Math.min(minY, p.y - bridgeR)
            maxX = Math.max(maxX, p.x + bridgeR)
            maxY = Math.max(maxY, p.y + bridgeR)
          }
        }
      }

      const pad = expanded ? 22 : 12
      boxes.push({
        id: m.id,
        x: Math.max(0, minX - pad),
        y: Math.max(0, minY - pad),
        w: Math.max(60, maxX - minX + pad * 2),
        h: Math.max(60, maxY - minY + pad * 2)
      })
    }
    return boxes
  }, [display.edges, edgeRoutes, edges, hideGlue, nodes])

  function getCanvasPoint(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    const px = clientX - rect.left
    const py = clientY - rect.top
    return { x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale, px, py }
  }

  function onDropCanvas(e: DragEvent) {
    e.preventDefault()
    const rawFn = e.dataTransfer.getData('application/x-ai-cbdes-fn')
    const rawMod = e.dataTransfer.getData('application/x-ai-cbdes-mod')
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) return

    if (rawMod) {
      try {
        const obj = JSON.parse(rawMod)
        const moduleKey = String(obj.module_key || '')
        if (!moduleKey) return
        if (onDropModule) {
          onDropModule(moduleKey, { x: pt.x, y: pt.y })
          return
        }
      } catch {
      }
    }

    const raw = rawFn || rawMod
    if (!raw) return
    try {
      const obj = JSON.parse(raw)
      const id = newId('node')
      const x = Math.max(12, pt.x - NODE_W / 2)
      const y = Math.max(12, pt.y - 24)

      const inputs = typeof obj.inputs_json === 'string' && obj.inputs_json.trim() ? String(obj.inputs_json) : ''
      const outputs = typeof obj.outputs_json === 'string' && obj.outputs_json.trim() ? String(obj.outputs_json) : ''
      const kind = rawMod ? 'module' : String(obj.kind || 'glue')
      const node: WorkflowNode = {
        id,
        function_id: rawMod ? `module:${String(obj.module_key)}` : String(obj.function_id),
        display_name: String(obj.display_name),
        module: rawMod ? String(obj.module_key) : String(obj.module),
        kind,
        file_path: rawMod ? '(module)' : String(obj.file_path),
        signature: String(obj.signature || ''),
        x,
        y,
        inputsJson: inputs || '{\n  "input": ""\n}',
        outputsJson: outputs || '{\n  "output": ""\n}',
        paramsJson: '{\n  "params": {}\n}',
        testCwd: rootDir,
        testCmd: ''
      }
      onAddNode(node)
      onSelectNode(id)
      onSelectEdge(null)
    } catch {
      return
    }
  }

  function startNodeDrag(e: ReactPointerEvent, nodeId: string) {
    const n = nodeById.get(nodeId)
    if (!n) return
    if (e.button !== 0) return
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) return

    didDragRef.current = false
    if (!selectedSet.has(nodeId) && !e.ctrlKey) {
      setSelectedIds([nodeId])
    }
    onSelectNode(nodeId)

    pointerIdRef.current = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onSelectEdge(null)
    setDragging({ kind: 'node', nodeId, dx: pt.x - n.x, dy: pt.y - n.y })
  }

  function startConnect(e: ReactPointerEvent, fromId: string) {
    if (e.button !== 0) return
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) return
    pointerIdRef.current = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onSelectNode(fromId)
    onSelectEdge(null)
    onSetPendingFrom(fromId)
    setDragging({ kind: 'connect', fromId, x: pt.x, y: pt.y })
  }

  function startPan(e: ReactPointerEvent) {
    if (e.button !== 0) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const el = e.target as HTMLElement
    if (el.closest('[data-node]') || el.closest('[data-edge]')) return
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) return
    pointerIdRef.current = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (e.ctrlKey) {
      onSelectEdge(null)
      onSetPendingFrom(null)
      setDragging({ kind: 'select', startX: pt.x, startY: pt.y, x: pt.x, y: pt.y, additive: true })
      return
    }

    onSelectNode(null)
    onSelectEdge(null)
    onSetPendingFrom(null)
    setSelectedIds([])
    setDragging({ kind: 'pan', startX: e.clientX - rect.left, startY: e.clientY - rect.top, startOx: view.ox, startOy: view.oy })
  }

  function movePointer(e: ReactPointerEvent) {
    if (pointerIdRef.current !== e.pointerId) return
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) return
    if (!dragging) return

    if (dragging.kind === 'node') {
      const nx = snap(Math.max(8, pt.x - dragging.dx), 8)
      const ny = snap(Math.max(8, pt.y - dragging.dy), 8)
      const cur = nodeById.get(dragging.nodeId)
      if (!cur) return

      const dx = nx - cur.x
      const dy = ny - cur.y
      if (dx === 0 && dy === 0) return

      didDragRef.current = true

      const baseIds = selectedSet.has(dragging.nodeId) && selectedSet.size > 1 ? effectiveSelectedIds : [dragging.nodeId]
      const upd = new Map<string, { id: string; x: number; y: number }>()
      for (const id of baseIds) {
        const n = nodeById.get(id)
        if (!n) continue
        upd.set(id, { id, x: n.x + dx, y: n.y + dy })
        if (String(n.kind || '') === 'module') {
          for (const c of nodes) {
            if (readParentId(String(c.paramsJson || '')) === id) {
              upd.set(c.id, { id: c.id, x: c.x + dx, y: c.y + dy })
            }
          }
        }
      }

      const updates = Array.from(upd.values())
      if (onUpdateNodePosBatch) onUpdateNodePosBatch(updates)
      else for (const u of updates) onUpdateNodePos(u.id, u.x, u.y)
      return
    }

    if (dragging.kind === 'connect') {
      setDragging({ ...dragging, x: pt.x, y: pt.y })
      return
    }

    if (dragging.kind === 'select') {
      setDragging({ ...dragging, x: pt.x, y: pt.y })
      return
    }

    if (dragging.kind === 'pan') {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const curX = e.clientX - rect.left
      const curY = e.clientY - rect.top
      const dx = curX - dragging.startX
      const dy = curY - dragging.startY
      setView((v) => ({ ...v, ox: dragging.startOx + dx, oy: dragging.startOy + dy }))
    }
  }

  function endPointer(e: ReactPointerEvent) {
    if (pointerIdRef.current !== e.pointerId) return
    pointerIdRef.current = null
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) {
      setDragging(null)
      onSetPendingFrom(null)
      return
    }

    if (dragging?.kind === 'select') {
      const x1 = Math.min(dragging.startX, dragging.x)
      const y1 = Math.min(dragging.startY, dragging.y)
      const x2 = Math.max(dragging.startX, dragging.x)
      const y2 = Math.max(dragging.startY, dragging.y)
      const picked: string[] = []
      for (const n of display.nodes) {
        const isMini = isGlueMiniNode(n)
        const w = isMini ? GLUE_R * 2 : NODE_W
        const h = isMini ? GLUE_R * 2 : NODE_H
        const nx1 = n.x
        const ny1 = n.y
        const nx2 = n.x + w
        const ny2 = n.y + h
        const intersects = nx1 <= x2 && nx2 >= x1 && ny1 <= y2 && ny2 >= y1
        if (intersects) picked.push(n.id)
      }
      setSelectedIds(dragging.additive ? [...effectiveSelectedIds, ...picked] : picked)
      onSelectNode(picked.length ? picked[picked.length - 1] : null)
      setDragging(null)
      return
    }

    if (dragging?.kind === 'connect') {
      const hit = nodes
        .map((n) => {
          const h = nodeInputHandle(n)
          const dx = pt.x - h.x
          const dy = pt.y - h.y
          return { n, dist: Math.hypot(dx, dy) }
        })
        .sort((a, b) => a.dist - b.dist)[0]

      if (hit && hit.dist <= 18 && hit.n.id !== dragging.fromId) {
        const exists = edges.some((ed) => ed.from === dragging.fromId && ed.to === hit.n.id)
        if (!exists) {
          const from = nodeById.get(dragging.fromId)
          const to = nodeById.get(hit.n.id)
          if (from && to) {
            void (async () => {
              if (onRequestConnect) {
                const handled = await onRequestConnect(from, to)
                if (handled) return
              }
              if (!canConnectDefault(from, to)) {
                message.warning('连线失败：前一函数输出与后一函数输入的数据格式不匹配')
                return
              }
              onAddEdge({ id: newId('edge'), from: dragging.fromId, to: hit.n.id })
            })()
          }
        }
      }
    }

    setDragging(null)
    onSetPendingFrom(null)
  }

  const previewPath = useMemo(() => {
    if (!dragging || dragging.kind !== 'connect') return null
    const from = displayNodeById.get(dragging.fromId)
    if (!from) return null
    const a = nodeOutputHandle(from)
    return orthogonalRoundedEdgePath(a, { x: dragging.x, y: dragging.y }, { cornerRadius: 10, stub: 18 })
  }, [displayNodeById, dragging])

  function applyWheel(clientX: number, clientY: number, deltaY: number) {
    const rect = hostRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = clientX - rect.left
    const py = clientY - rect.top
    const cur = viewRef.current
    const scale = cur.scale
    const gx = (px - cur.ox) / scale
    const gy = (py - cur.oy) / scale
    const nextScale = clamp(scale * (deltaY < 0 ? 1.1 : 0.9), 0.35, 2.8)
    const nextOx = px - gx * nextScale
    const nextOy = py - gy * nextScale
    setView({ scale: nextScale, ox: nextOx, oy: nextOy })
  }

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const onWheelNative = (ev: WheelEvent) => {
      if (!el.contains(ev.target as Node)) return
      ev.preventDefault()
      ev.stopPropagation()
      applyWheel(ev.clientX, ev.clientY, ev.deltaY)
    }
    el.addEventListener('wheel', onWheelNative, { passive: false })
    return () => el.removeEventListener('wheel', onWheelNative as any)
  }, [])

  return (
    <div
      ref={(el) => {
        hostRef.current = el
        ;(canvasRef as any).current = el
      }}
      tabIndex={0}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropCanvas}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerDown={(e) => {
        ;(e.currentTarget as HTMLDivElement).focus()
        startPan(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onSetPendingFrom(null)
          setDragging(null)
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedEdgeId) {
            e.preventDefault()
            onDeleteEdge(selectedEdgeId)
            onSelectEdge(null)
            return
          }
          if (selectedNodeId) {
            e.preventDefault()
            onDeleteNode(selectedNodeId)
            onSelectNode(null)
            return
          }
        }
      }}
      style={{
        position: 'relative',
        height: 'calc(100vh - 260px)',
        minHeight: 720,
        border: '1px solid rgba(63,63,70,0.7)',
        borderRadius: 8,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 1px)',
          backgroundSize: '16px 16px',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${view.ox}px, ${view.oy}px) scale(${view.scale})`,
          transformOrigin: '0 0'
        }}
      >
        <svg
          width={contentSize.w || '100%'}
          height={contentSize.h || '100%'}
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
        >
          {display.edges.map((e) => {
            const from = displayNodeById.get(e.from)
            const to = displayNodeById.get(e.to)
            if (!from || !to) return null
            const a = nodeOutputHandle(from)
            const b = nodeInputHandle(to)
            const d = edgeRoutes.byId.get(e.id)?.d || orthogonalRoundedEdgePath(a, b, { cornerRadius: 10, stub: 18 })
            const isSelected = e.id === selectedEdgeId
            const stroke = isSelected ? 'rgba(34,197,94,0.95)' : 'rgba(99,102,241,0.85)'
            return (
              <g key={e.id} data-edge>
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(0,0,0,0)"
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                  onPointerDown={(ev) => {
                    ev.stopPropagation()
                    onSelectNode(null)
                    onSelectEdge(e.id)
                  }}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}

          {display.edges.flatMap((e) => {
            const pts = edgeRoutes.crossesByEdge.get(e.id) || []
            if (!pts.length) return []
            const isSelected = e.id === selectedEdgeId
            const stroke = isSelected ? 'rgba(34,197,94,0.95)' : 'rgba(99,102,241,0.85)'
            const r = 7
            return pts.map((p, idx) => (
              <path
                key={`${e.id}__bridge_${idx}`}
                d={`M ${p.x - r} ${p.y} A ${r} ${r} 0 0 1 ${p.x + r} ${p.y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={isSelected ? 3.5 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: 'none' }}
              />
            ))
          })}
          {previewPath ? (
            <path
              d={previewPath}
              fill="none"
              stroke="rgba(244,244,245,0.5)"
              strokeWidth={2}
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
          ) : null}
        </svg>

        {moduleBoxes.map((b) => (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              borderRadius: 14,
              border: '1px dashed rgba(59,130,246,0.55)',
              background: 'rgba(59,130,246,0.04)',
              pointerEvents: 'none'
            }}
          />
        ))}

        {dragging && dragging.kind === 'select' ? (
          <div
            style={{
              position: 'absolute',
              left: Math.min(dragging.startX, dragging.x),
              top: Math.min(dragging.startY, dragging.y),
              width: Math.max(1, Math.abs(dragging.x - dragging.startX)),
              height: Math.max(1, Math.abs(dragging.y - dragging.startY)),
              border: '1px dashed rgba(244,244,245,0.65)',
              background: 'rgba(244,244,245,0.08)',
              borderRadius: 10,
              pointerEvents: 'none'
            }}
          />
        ) : null}

        {display.nodes.map((n) => {
          const isSelected = selectedSet.has(n.id)
          const isPending = pendingFromId === n.id
          const kind = String(n.kind || 'glue')
          const moduleExpanded = (() => {
            if (kind !== 'module') return true
            try {
              const obj = JSON.parse(String(n.paramsJson || '{}'))
              const m = obj?.__module
              if (m && typeof m === 'object' && m.expanded === false) return false
              return true
            } catch {
              return true
            }
          })()
          const kindColor =
            kind === 'node'
              ? 'rgba(34,197,94,0.85)'
              : kind === 'platform'
                ? 'rgba(168,85,247,0.85)'
                : 'rgba(99,102,241,0.85)'

          const isGlueMini = hideGlue && kind === 'glue'

          if (isGlueMini) {
            return (
              <Tooltip
                key={n.id}
                title={
                  <div style={{ maxWidth: 360 }}>
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.9)' }}>{n.display_name}</Typography.Text>
                    <br />
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.6)' }}>{n.module}</Typography.Text>
                    <br />
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.6)' }}>{n.file_path}</Typography.Text>
                  </div>
                }
              >
                <div
                  data-node
                  onClick={(e) => {
                    e.stopPropagation()
                    if (didDragRef.current) {
                      didDragRef.current = false
                      return
                    }
                    if (e.ctrlKey) toggleSelectedId(n.id)
                    else setSelectedIds([n.id])
                    onSelectNode(n.id)
                    onSelectEdge(null)
                  }}
                  onPointerDown={(e) => startNodeDrag(e, n.id)}
                  style={{
                    position: 'absolute',
                    left: n.x + NODE_W / 2 - GLUE_R,
                    top: n.y + 22,
                    width: GLUE_R * 2,
                    height: GLUE_R * 2,
                    borderRadius: 999,
                    background: 'rgba(244,244,245,0.3)',
                    border: isSelected ? `2px solid ${kindColor}` : '2px solid rgba(63,63,70,0.8)',
                    cursor: 'grab'
                  }}
                />
              </Tooltip>
            )
          }

          return (
            <div
              data-node
              key={n.id}
              onClick={(e) => {
                e.stopPropagation()
                if (didDragRef.current) {
                  didDragRef.current = false
                  return
                }
                if (e.ctrlKey) toggleSelectedId(n.id)
                else setSelectedIds([n.id])
                onSelectNode(n.id)
                onSelectEdge(null)
              }}
              style={{
                position: 'absolute',
                left: n.x,
                top: n.y,
                width: NODE_W,
                minHeight: NODE_H,
                padding: 10,
                borderRadius: 10,
                border: isSelected ? `1px solid ${kindColor}` : '1px solid rgba(63,63,70,0.7)',
                background: 'rgba(24,24,27,0.75)',
                backdropFilter: 'blur(6px)',
                userSelect: 'none'
              }}
            >
              <div onPointerDown={(e) => startNodeDrag(e, n.id)} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: kind === 'platform' ? 999 : 3,
                    background: kindColor,
                    flex: '0 0 auto'
                  }}
                  title={kind}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text style={{ color: 'rgba(244,244,245,0.92)' }} ellipsis>
                    {n.display_name}
                  </Typography.Text>
                  <br />
                  <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>{n.module}</Typography.Text>
                </div>
                {kind === 'module' && onToggleModule ? (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleModule(n.id)
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.35)',
                      color: 'rgba(191,219,254,0.95)',
                      cursor: 'pointer',
                      flex: '0 0 auto'
                    }}
                    title="展开/折叠"
                  >
                    {moduleExpanded ? '▾' : '▸'}
                  </div>
                ) : null}
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteNode(n.id)
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(244,63,94,0.15)',
                    border: '1px solid rgba(244,63,94,0.35)',
                    color: 'rgba(244,63,94,0.95)',
                    cursor: 'pointer',
                    flex: '0 0 auto'
                  }}
                  title="删除节点"
                >
                  ×
                </div>
                {isPending ? <Typography.Text style={{ color: 'rgba(34,197,94,0.9)' }}>起点</Typography.Text> : null}
              </div>

              <div
                onPointerDown={(e) => {
                  e.stopPropagation()
                  startConnect(e, n.id)
                }}
                style={{
                  position: 'absolute',
                  right: -9,
                  top: 18,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: 'rgba(99,102,241,0.95)',
                  border: '2px solid rgba(9,9,11,0.9)',
                  cursor: 'crosshair'
                }}
                title="从输出端口拖拽连线"
              />
              <div
                style={{
                  position: 'absolute',
                  left: -9,
                  top: 18,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: 'rgba(244,244,245,0.6)',
                  border: '2px solid rgba(9,9,11,0.9)'
                }}
                title="输入端口"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
