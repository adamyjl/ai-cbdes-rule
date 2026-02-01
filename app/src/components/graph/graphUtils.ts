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

