import type { DragEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useMemo, useRef, useState } from 'react'
import { Typography, message } from 'antd'
import type { WorkflowEdge, WorkflowNode } from './workflowTypes'
import { clamp, newId, orthogonalRoundedEdgePath, snap } from './graphUtils'

type DraggingState =
  | { kind: 'node'; nodeId: string; dx: number; dy: number }
  | { kind: 'connect'; fromId: string; x: number; y: number }
  | null

const NODE_W = 280
const NODE_H = 66

function normalizeType(t: string) {
  return String(t)
    .trim()
    .replace(/^const\s+/i, '')
    .replace(/\bconst\b/gi, '')
    .replace(/\s+/g, '')
    .replace(/[&*]+$/g, '')
    .toLowerCase()
}

function extractTypes(ioJson: string) {
  try {
    const obj = JSON.parse(ioJson)
    const fields = Array.isArray(obj?.fields) ? obj.fields : null
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

function isTypeCompatible(from: WorkflowNode, to: WorkflowNode) {
  const outTypes = extractTypes(from.outputsJson)
  const inTypes = extractTypes(to.inputsJson)

  if (!outTypes.length || !inTypes.length) return true

  const inSet = new Set(inTypes)
  for (const t of outTypes) {
    if (inSet.has(t)) return true
  }
  return false
}

export function WorkflowCanvas(props: {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  pendingFromId: string | null
  onSelectNode: (id: string | null) => void
  onSetPendingFrom: (id: string | null) => void
  onAddNode: (node: WorkflowNode) => void
  onUpdateNodePos: (id: string, x: number, y: number) => void
  onAddEdge: (edge: WorkflowEdge) => void
  onDeleteNode: (nodeId: string) => void
  canvasRef: RefObject<HTMLDivElement | null>
  rootDir: string
}) {
  const {
    nodes,
    edges,
    selectedNodeId,
    pendingFromId,
    onSelectNode,
    onSetPendingFrom,
    onAddNode,
    onUpdateNodePos,
    onAddEdge,
    onDeleteNode,
    canvasRef,
    rootDir
  } = props

  const [dragging, setDragging] = useState<DraggingState>(null)
  const pointerIdRef = useRef<number | null>(null)

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n] as const)), [nodes])

  function nodeInputHandle(n: WorkflowNode) {
    return { x: n.x, y: n.y + 24 }
  }

  function nodeOutputHandle(n: WorkflowNode) {
    return { x: n.x + NODE_W, y: n.y + 24 }
  }

  function getCanvasPoint(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function onDropCanvas(e: DragEvent) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/x-ai-cbdes-fn')
    if (!raw) return
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) return
    try {
      const fn = JSON.parse(raw)
      const id = newId('node')
      const x = Math.max(12, pt.x - NODE_W / 2)
      const y = Math.max(12, pt.y - 24)

      const inputs = typeof fn.inputs_json === 'string' && fn.inputs_json.trim() ? String(fn.inputs_json) : ''
      const outputs = typeof fn.outputs_json === 'string' && fn.outputs_json.trim() ? String(fn.outputs_json) : ''
      const node: WorkflowNode = {
        id,
        function_id: String(fn.function_id),
        display_name: String(fn.display_name),
        module: String(fn.module),
        file_path: String(fn.file_path),
        signature: String(fn.signature || ''),
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
    pointerIdRef.current = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragging({ kind: 'node', nodeId, dx: pt.x - n.x, dy: pt.y - n.y })
  }

  function startConnect(e: ReactPointerEvent, fromId: string) {
    if (e.button !== 0) return
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) return
    pointerIdRef.current = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onSelectNode(fromId)
    onSetPendingFrom(fromId)
    setDragging({ kind: 'connect', fromId, x: pt.x, y: pt.y })
  }

  function movePointer(e: ReactPointerEvent) {
    if (pointerIdRef.current !== e.pointerId) return
    const pt = getCanvasPoint(e.clientX, e.clientY)
    if (!pt) return
    if (!dragging) return

    if (dragging.kind === 'node') {
      const rect = canvasRef.current?.getBoundingClientRect()
      const cw = rect?.width ?? 0
      const ch = rect?.height ?? 0
      const nx = snap(clamp(pt.x - dragging.dx, 8, Math.max(8, cw - NODE_W - 8)), 8)
      const ny = snap(clamp(pt.y - dragging.dy, 8, Math.max(8, ch - NODE_H - 8)), 8)
      onUpdateNodePos(dragging.nodeId, nx, ny)
      return
    }

    if (dragging.kind === 'connect') {
      setDragging({ ...dragging, x: pt.x, y: pt.y })
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
          if (from && to && !isTypeCompatible(from, to)) {
            message.warning('连线失败：前一函数输出与后一函数输入的数据类型不匹配')
          } else {
            onAddEdge({ id: newId('edge'), from: dragging.fromId, to: hit.n.id })
          }
        }
      }
    }

    setDragging(null)
    onSetPendingFrom(null)
  }

  const previewPath = useMemo(() => {
    if (!dragging || dragging.kind !== 'connect') return null
    const from = nodeById.get(dragging.fromId)
    if (!from) return null
    const a = nodeOutputHandle(from)
    return orthogonalRoundedEdgePath(a, { x: dragging.x, y: dragging.y }, { cornerRadius: 10, stub: 18 })
  }, [dragging, nodeById])

  return (
    <div
      ref={(el) => {
        ;(canvasRef as any).current = el
      }}
      tabIndex={0}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropCanvas}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerDown={(e) => {
        ;(e.currentTarget as HTMLDivElement).focus()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedNodeId) {
            e.preventDefault()
            onDeleteNode(selectedNodeId)
          }
        }
      }}
      style={{ position: 'relative', height: 560, border: '1px solid rgba(63,63,70,0.7)', borderRadius: 8, overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 1px)',
          backgroundSize: '16px 16px'
        }}
      />

      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {edges.map((e) => {
          const from = nodeById.get(e.from)
          const to = nodeById.get(e.to)
          if (!from || !to) return null
          const a = nodeOutputHandle(from)
          const b = nodeInputHandle(to)
          const d = orthogonalRoundedEdgePath(a, b, { cornerRadius: 10, stub: 18 })
          return (
            <path
              key={e.id}
              d={d}
              fill="none"
              stroke="rgba(99,102,241,0.85)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
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
          />
        ) : null}
      </svg>

      {nodes.map((n) => {
        const isSelected = n.id === selectedNodeId
        const isPending = pendingFromId === n.id
        return (
          <div
            key={n.id}
            onClick={() => onSelectNode(n.id)}
            style={{
              position: 'absolute',
              left: n.x,
              top: n.y,
              width: NODE_W,
              minHeight: NODE_H,
              padding: 10,
              borderRadius: 10,
              border: isSelected ? '1px solid rgba(99,102,241,0.95)' : '1px solid rgba(63,63,70,0.7)',
              background: 'rgba(24,24,27,0.75)',
              backdropFilter: 'blur(6px)',
              userSelect: 'none'
            }}
          >
            <div
              onPointerDown={(e) => startNodeDrag(e, n.id)}
              style={{ cursor: 'grab', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text style={{ color: 'rgba(244,244,245,0.92)' }} ellipsis>
                  {n.display_name}
                </Typography.Text>
                <br />
                <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>{n.module}</Typography.Text>
              </div>
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
  )
}
