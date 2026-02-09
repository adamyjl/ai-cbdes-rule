import { Button, Card, Divider, Modal, Select, Space, Switch, Tabs, Typography, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PageScaffold } from '../PageScaffold'
import { useArchiveStore } from '../../store/archiveStore'
import {
  ragGetFunction,
  ragGetModule,
  ragListFunctions,
  ragListIndexedModules,
  ragPublishModule,
  ragUpsertModule
} from '../../utils/api'
import type { WorkflowEdge, WorkflowNode } from '../../components/graph/workflowTypes'
import { WorkflowCanvas } from '../../components/graph/WorkflowCanvas'
import { WorkflowInspector } from '../../components/graph/WorkflowInspector'
import { autoLayout, ioMatchScore, newId } from '../../components/graph/graphUtils'
import { FunctionDetailDrawer } from '../../components/rag/FunctionDetailDrawer'
import { ModuleDetailDrawer } from '../../components/rag/ModuleDetailDrawer'

const STORAGE_KEY = 'builder:task-builder:v1'

function loadDraft():
  | {
      rootDir: string
      nodes: WorkflowNode[]
      edges: WorkflowEdge[]
      hideGlue: boolean
      analysisEventId: string | null
      lastPublishedModuleKey: string | null
    }
  | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object') return null
    return {
      rootDir: String((v as any).rootDir || ''),
      nodes: Array.isArray((v as any).nodes) ? ((v as any).nodes as WorkflowNode[]) : [],
      edges: Array.isArray((v as any).edges) ? ((v as any).edges as WorkflowEdge[]) : [],
      hideGlue: typeof (v as any).hideGlue === 'boolean' ? (v as any).hideGlue : false,
      analysisEventId: typeof (v as any).analysisEventId === 'string' ? (v as any).analysisEventId : null,
      lastPublishedModuleKey:
        typeof (v as any).lastPublishedModuleKey === 'string' ? (v as any).lastPublishedModuleKey : null
    }
  } catch {
    return null
  }
}

function saveDraft(v: {
  rootDir: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  hideGlue: boolean
  analysisEventId: string | null
  lastPublishedModuleKey: string | null
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    return
  }
}

function autoConnectGreedy(nodes: WorkflowNode[], existingEdges: WorkflowEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n] as const))
  const exists = new Set(existingEdges.map((e) => `${e.from}__${e.to}`))

  const candidates: Array<{ from: string; to: string; score: number }> = []
  for (const a of nodes) {
    if (a.hidden) continue
    if (String(a.kind || '') === 'module') continue
    for (const b of nodes) {
      if (b.hidden) continue
      if (a.id === b.id) continue
      if (String(b.kind || '') === 'module') continue
      const m = ioMatchScore(a.outputsJson, b.inputsJson)
      if (m.score <= 0) continue
      candidates.push({ from: a.id, to: b.id, score: m.score })
    }
  }

  candidates.sort((x, y) => y.score - x.score)

  const usedIn = new Set<string>()
  const out: WorkflowEdge[] = []
  for (const c of candidates) {
    if (usedIn.has(c.to)) continue
    const k = `${c.from}__${c.to}`
    if (exists.has(k)) continue
    if (!byId.has(c.from) || !byId.has(c.to)) continue
    exists.add(k)
    usedIn.add(c.to)
    out.push({ id: newId('edge'), from: c.from, to: c.to })
  }
  return out
}

function safeParseJson(s: string) {
  try {
    const v = JSON.parse(s)
    return v && typeof v === 'object' ? (v as any) : null
  } catch {
    return null
  }
}

function withParentParams(paramsJson: string, parentId: string) {
  const base = safeParseJson(paramsJson) || {}
  base.__parent_module_id = parentId
  return JSON.stringify(base, null, 2)
}

function readParentId(paramsJson: string) {
  const v = safeParseJson(paramsJson)
  const pid = v?.__parent_module_id
  return typeof pid === 'string' ? pid : null
}

function readModuleMeta(paramsJson: string) {
  const v = safeParseJson(paramsJson)
  const m = v?.__module
  return m && typeof m === 'object' ? (m as any) : null
}

function writeModuleMeta(paramsJson: string, meta: any) {
  const v = safeParseJson(paramsJson) || {}
  v.__module = meta
  return JSON.stringify(v, null, 2)
}

export function TaskBuilderPage() {
  const archiveHydrated = useArchiveStore((s) => s.hydrated)
  const archiveEvents = useArchiveStore((s) => s.events)

  const [rootDir, setRootDir] = useState('data\\THICV-Pilot_master')
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [pendingFromId, setPendingFromId] = useState<string | null>(null)
  const [hideGlue, setHideGlue] = useState(false)
  const [canvasResetToken, setCanvasResetToken] = useState(0)
  const [fitViewToken, setFitViewToken] = useState(0)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const [fnQ, setFnQ] = useState('')
  const [fnItems, setFnItems] = useState<any[]>([])
  const [fnBusy, setFnBusy] = useState(false)
  const [modQ, setModQ] = useState('')
  const [modItems, setModItems] = useState<any[]>([])
  const [modBusy, setModBusy] = useState(false)

  const [analysisEventId, setAnalysisEventId] = useState<string | null>(null)
  const [lastPublishedModuleKey, setLastPublishedModuleKey] = useState<string | null>(null)

  const [fnDrawerOpen, setFnDrawerOpen] = useState(false)
  const [fnDrawerId, setFnDrawerId] = useState<string | null>(null)
  const [modDrawerOpen, setModDrawerOpen] = useState(false)
  const [modDrawerKey, setModDrawerKey] = useState<string | null>(null)

  const [publishOpen, setPublishOpen] = useState(false)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishModuleKey, setPublishModuleKey] = useState('')
  const [publishNameHint, setPublishNameHint] = useState('')

  const analyzeEvents = useMemo(() => {
    if (!archiveHydrated) return []
    return archiveEvents.filter((e) => String(e.type) === 'task.analyze')
  }, [archiveEvents, archiveHydrated])

  useEffect(() => {
    const saved = loadDraft()
    if (!saved) return
    if (saved.rootDir) setRootDir(saved.rootDir)
    setNodes(saved.nodes || [])
    setEdges(saved.edges || [])
    setHideGlue(Boolean(saved.hideGlue))
    setAnalysisEventId(saved.analysisEventId)
    setLastPublishedModuleKey(saved.lastPublishedModuleKey)
    window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveDraft({ rootDir, nodes, edges, hideGlue, analysisEventId, lastPublishedModuleKey })
    }, 350)
    return () => window.clearTimeout(t)
  }, [analysisEventId, edges, hideGlue, lastPublishedModuleKey, nodes, rootDir])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        setFnBusy(true)
        try {
          const res = await ragListFunctions({ root_dir: rootDir, q: fnQ || undefined, limit: 60, offset: 0 })
          const items = (res.items || []).filter((it: any) => {
            const s = Number(it?.start_line)
            const e = Number(it?.end_line)
            if (Number.isFinite(s) && Number.isFinite(e)) return e - s + 1 >= 2
            return true
          })
          setFnItems(items)
        } catch {
          setFnItems([])
        } finally {
          setFnBusy(false)
        }
      })()
    }, 250)
    return () => window.clearTimeout(t)
  }, [fnQ, rootDir])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        setModBusy(true)
        try {
          const res = await ragListIndexedModules({ q: modQ || undefined, limit: 60, offset: 0 })
          setModItems(res.items || [])
        } catch {
          setModItems([])
        } finally {
          setModBusy(false)
        }
      })()
    }, 250)
    return () => window.clearTimeout(t)
  }, [modQ, rootDir])

  async function loadFromAnalyzeEvent(eventId: string) {
    const ev = analyzeEvents.find((e) => String(e.id) === String(eventId))
    if (!ev) return
    const payload = (ev.payload || {}) as any
    const taskDraft = (payload.task_draft || {}) as any
    const selectedFunctionIds = Array.isArray(taskDraft.selectedFunctionIds) ? (taskDraft.selectedFunctionIds as string[]) : []
    const selectedModuleKeys = Array.isArray(taskDraft.selectedModuleKeys) ? (taskDraft.selectedModuleKeys as string[]) : []
    const ragHits = Array.isArray(payload.rag_hits) ? (payload.rag_hits as any[]) : []
    const ragFunctionIds = ragHits.map((h) => String(h.function_id)).filter(Boolean)
    const combinedFnIds = Array.from(new Set([...selectedFunctionIds, ...ragFunctionIds])).slice(0, 18)
    const combinedModKeys = Array.from(new Set([...selectedModuleKeys])).slice(0, 12)

    setRootDir(String(payload.root_dir || rootDir))
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setPendingFromId(null)

    const newNodes: WorkflowNode[] = []
    const newEdges: WorkflowEdge[] = []
    for (const fid of combinedFnIds) {
      try {
        const res = await ragGetFunction(fid)
        if (!res.ok || !res.function) continue
        const fn = res.function as any
        const id = newId('node')
        newNodes.push({
          id,
          function_id: String(fn.function_id),
          display_name: String(fn.display_name || fn.signature || fn.function_id),
          module: String(fn.module || ''),
          kind: String(fn.kind || 'glue'),
          file_path: String(fn.file_path || ''),
          signature: String(fn.signature || ''),
          x: 24,
          y: 24,
          inputsJson: String(fn.inputs_json || '{\n  "input": ""\n}'),
          outputsJson: String(fn.outputs_json || '{\n  "output": ""\n}'),
          paramsJson: '{\n  "params": {}\n}',
          testCwd: String(payload.root_dir || rootDir),
          testCmd: ''
        })
      } catch {
      }
    }

    for (const mk of combinedModKeys) {
      try {
        const res = await ragGetModule(mk)
        if (!res.ok || !res.module) continue
        const mod = res.module as any
        const moduleNodeId = newId('node')

        const rawNodes = (() => {
          try {
            return JSON.parse(String(mod.nodes_json || '[]'))
          } catch {
            return []
          }
        })()
        const rawEdges = (() => {
          try {
            return JSON.parse(String(mod.edges_json || '[]'))
          } catch {
            return []
          }
        })()

        const idMap = new Map<string, string>()
        for (const n of rawNodes) idMap.set(String(n.id), newId('node'))

        const childNodes: WorkflowNode[] = rawNodes.map((n: any, idx: number) => {
          const nid = idMap.get(String(n.id)) || newId('node')
          return {
            id: nid,
            function_id: String(n.function_id || n.id || ''),
            display_name: String(n.display_name || ''),
            module: String(n.module || mod.module_key || 'common'),
            kind: String(n.kind || 'glue'),
            file_path: String(n.file_path || ''),
            signature: String(n.signature || ''),
            x: Number.isFinite(Number(n.x)) ? Number(n.x) : 24 + (idx % 3) * 260,
            y: Number.isFinite(Number(n.y)) ? Number(n.y) : 24 + Math.floor(idx / 3) * 140,
            inputsJson: String(n.inputsJson || n.inputs_json || '{\n  "input": ""\n}'),
            outputsJson: String(n.outputsJson || n.outputs_json || '{\n  "output": ""\n}'),
            paramsJson: withParentParams(String(n.paramsJson || '{\n  "params": {}\n}'), moduleNodeId),
            testCwd: String(payload.root_dir || rootDir),
            testCmd: String(n.testCmd || '')
          }
        })

        const childEdges: WorkflowEdge[] = rawEdges
          .map((e: any) => {
            const from = idMap.get(String(e.from))
            const to = idMap.get(String(e.to))
            if (!from || !to) return null
            return { id: newId('edge'), from, to } as WorkflowEdge
          })
          .filter(Boolean) as any

        const laidChild = autoLayout(childNodes, childEdges, { mode: 'dag' })
        const minX = Math.min(...laidChild.map((n) => n.x))
        const minY = Math.min(...laidChild.map((n) => n.y))
        const dx = 24 - minX
        const dy = 24 - minY
        const shiftedChild = laidChild.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }))

        const moduleMeta = {
          module_key: String(mod.module_key),
          expanded: true,
          child_node_ids: shiftedChild.map((n) => n.id),
          child_edge_ids: childEdges.map((e) => e.id)
        }

        const moduleNode: WorkflowNode = {
          id: moduleNodeId,
          function_id: `module:${String(mod.module_key)}`,
          display_name: String(mod.display_name || mod.module_key),
          module: String(mod.module_key),
          kind: 'module',
          file_path: '(module)',
          signature: '',
          x: 24,
          y: 12,
          inputsJson: String(mod.inputs_json || '{\n  "input": ""\n}'),
          outputsJson: String(mod.outputs_json || '{\n  "output": ""\n}'),
          paramsJson: writeModuleMeta('{\n  "params": {}\n}', moduleMeta),
          testCwd: String(payload.root_dir || rootDir),
          testCmd: ''
        }

        newNodes.push(moduleNode)
        newNodes.push(...shiftedChild)
        newEdges.push(...childEdges)
      } catch {
      }
    }

    const laid = autoLayout(newNodes, newEdges)
    const autoEdges = autoConnectGreedy(laid, newEdges)
    setNodes(laid)
    setEdges([...newEdges, ...autoEdges])
    setCanvasResetToken((v) => v + 1)
    window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
    message.success('已加载分析结果')
  }

  function addNode(n: WorkflowNode) {
    setNodes((prev) => [...prev, n])
  }

  function addEdge(e: WorkflowEdge) {
    setEdges((prev) => {
      const exists = prev.some((x) => x.from === e.from && x.to === e.to)
      if (exists) return prev
      return [...prev, e]
    })
  }

  function updateNode(id: string, patch: Partial<WorkflowNode>) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  function updateNodePos(id: string, x: number, y: number) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)))
  }

  function updateNodePosBatch(updates: Array<{ id: string; x: number; y: number }>) {
    const map = new Map(updates.map((u) => [u.id, u] as const))
    setNodes((prev) => prev.map((n) => {
      const u = map.get(n.id)
      if (!u) return n
      return { ...n, x: u.x, y: u.y }
    }))
  }

  function removeNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  function removeEdge(id: string) {
    setEdges((prev) => prev.filter((e) => e.id !== id))
    if (selectedEdgeId === id) setSelectedEdgeId(null)
  }

  function doDeleteSelected() {
    if (selectedEdgeId) {
      removeEdge(selectedEdgeId)
      message.success('已删除连线')
      return
    }
    if (selectedNodeId) {
      removeNode(selectedNodeId)
      message.success('已删除节点')
    }
  }

  function doClearCanvas() {
    Modal.confirm({
      title: '清除画布',
      content: '将清空当前画布上的所有节点与连线，且会覆盖本地草稿。确认继续？',
      okText: '清除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setNodes([])
        setEdges([])
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
        setPendingFromId(null)
        setCanvasResetToken((v) => v + 1)
        window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
        message.success('已清除画布')
      }
    })
  }

  async function addModuleToCanvas(moduleKey: string, pt?: { x: number; y: number }) {
    try {
      const res = await ragGetModule(moduleKey)
      if (!res.ok || !res.module) throw new Error(res.error || 'not_found')
      const mod = res.module as any

      const rawNodes = (() => {
        try {
          return JSON.parse(String(mod.nodes_json || '[]'))
        } catch {
          return []
        }
      })()
      const rawEdges = (() => {
        try {
          return JSON.parse(String(mod.edges_json || '[]'))
        } catch {
          return []
        }
      })()

      const moduleNodeId = newId('node')
      const idMap = new Map<string, string>()
      for (const n of rawNodes) idMap.set(String(n.id), newId('node'))

      const childNodes: WorkflowNode[] = rawNodes.map((n: any, idx: number) => {
        const nid = idMap.get(String(n.id)) || newId('node')
        return {
          id: nid,
          function_id: String(n.function_id || n.id || ''),
          display_name: String(n.display_name || ''),
          module: String(n.module || mod.module_key || 'common'),
          kind: String(n.kind || 'glue'),
          file_path: String(n.file_path || ''),
          signature: String(n.signature || ''),
          x: Number.isFinite(Number(n.x)) ? Number(n.x) : 24 + (idx % 3) * 260,
          y: Number.isFinite(Number(n.y)) ? Number(n.y) : 24 + Math.floor(idx / 3) * 140,
          inputsJson: String(n.inputsJson || n.inputs_json || '{\n  "input": ""\n}'),
          outputsJson: String(n.outputsJson || n.outputs_json || '{\n  "output": ""\n}'),
          paramsJson: withParentParams(String(n.paramsJson || '{\n  "params": {}\n}'), moduleNodeId),
          testCwd: rootDir,
          testCmd: String(n.testCmd || '')
        }
      })

      const childEdges: WorkflowEdge[] = rawEdges
        .map((e: any) => {
          const from = idMap.get(String(e.from))
          const to = idMap.get(String(e.to))
          if (!from || !to) return null
          return { id: newId('edge'), from, to } as WorkflowEdge
        })
        .filter(Boolean) as any

      const laidChild = autoLayout(childNodes, childEdges, { mode: 'dag' })
      const minX = Math.min(...laidChild.map((n) => n.x))
      const minY = Math.min(...laidChild.map((n) => n.y))
      const baseX = pt ? Math.max(8, pt.x) : (nodes.length ? Math.max(...nodes.map((n) => n.x)) + 340 : 24)
      const baseY = pt ? Math.max(8, pt.y) : 24
      const dx = baseX - minX
      const dy = baseY - minY
      const shiftedChild = laidChild.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }))

      const moduleMeta = {
        module_key: String(mod.module_key),
        expanded: true,
        child_node_ids: shiftedChild.map((n) => n.id),
        child_edge_ids: childEdges.map((e) => e.id),
      }

      const moduleNode: WorkflowNode = {
        id: moduleNodeId,
        function_id: `module:${String(mod.module_key)}`,
        display_name: String(mod.display_name || mod.module_key),
        module: String(mod.module_key),
        kind: 'module',
        file_path: '(module)',
        signature: '',
        x: baseX,
        y: Math.max(8, baseY - 90),
        inputsJson: String(mod.inputs_json || '{\n  "input": ""\n}'),
        outputsJson: String(mod.outputs_json || '{\n  "output": ""\n}'),
        paramsJson: writeModuleMeta('{\n  "params": {}\n}', moduleMeta),
        testCwd: rootDir,
        testCmd: ''
      }

      setNodes((prev) => [...prev, moduleNode, ...shiftedChild])
      setEdges((prev) => [...prev, ...childEdges])
      window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
      message.success(`已加载模块：${String(mod.display_name || mod.module_key)}`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载模块失败')
    }
  }

  function toggleModule(nodeId: string) {
    const modNode = nodes.find((n) => n.id === nodeId)
    if (!modNode) return
    const meta = readModuleMeta(modNode.paramsJson)
    if (!meta || String(modNode.kind || '') !== 'module') return
    const expanded = meta.expanded !== false

    const childIds = nodes
      .filter((n) => readParentId(n.paramsJson) === nodeId)
      .map((n) => n.id)
    const childSet = new Set(childIds)

    if (expanded) {
      const affectedEdgeIds: string[] = []
      const replacementEdges: WorkflowEdge[] = []
      const replKey = new Set<string>()

      for (const e of edges) {
        const fromIn = childSet.has(e.from)
        const toIn = childSet.has(e.to)
        if (!fromIn && !toIn) continue
        affectedEdgeIds.push(e.id)
        if (fromIn && !toIn) {
          const k = `${nodeId}__${e.to}`
          if (!replKey.has(k)) {
            replKey.add(k)
            replacementEdges.push({ id: newId('edge'), from: nodeId, to: e.to })
          }
        }
        if (!fromIn && toIn) {
          const k = `${e.from}__${nodeId}`
          if (!replKey.has(k)) {
            replKey.add(k)
            replacementEdges.push({ id: newId('edge'), from: e.from, to: nodeId })
          }
        }
      }

      const nextMeta = {
        ...meta,
        expanded: false,
        collapsed_anchor_x: modNode.x,
        collapsed_anchor_y: modNode.y,
        collapsed_hidden_node_ids: childIds,
        collapsed_hidden_edge_ids: affectedEdgeIds,
        replacement_edge_ids: replacementEdges.map((e) => e.id)
      }

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === nodeId) return { ...n, paramsJson: writeModuleMeta(n.paramsJson, nextMeta) }
          if (childSet.has(n.id)) return { ...n, hidden: true }
          return n
        })
      )
      setEdges((prev) => {
        const affected = new Set(affectedEdgeIds)
        const next = prev.map((e) => (affected.has(e.id) ? { ...e, hidden: true } : e))
        return [...next, ...replacementEdges]
      })
      return
    }

    const hiddenNodeIds = Array.isArray(meta.collapsed_hidden_node_ids) ? (meta.collapsed_hidden_node_ids as string[]) : []
    const hiddenEdgeIds = Array.isArray(meta.collapsed_hidden_edge_ids) ? (meta.collapsed_hidden_edge_ids as string[]) : []
    const replIds = Array.isArray(meta.replacement_edge_ids) ? (meta.replacement_edge_ids as string[]) : []

    const ax = Number.isFinite(Number((meta as any).collapsed_anchor_x)) ? Number((meta as any).collapsed_anchor_x) : modNode.x
    const ay = Number.isFinite(Number((meta as any).collapsed_anchor_y)) ? Number((meta as any).collapsed_anchor_y) : modNode.y
    const shiftX = modNode.x - ax
    const shiftY = modNode.y - ay

    const nextMeta = {
      ...meta,
      expanded: true,
      collapsed_hidden_node_ids: [],
      collapsed_hidden_edge_ids: [],
      replacement_edge_ids: []
    }

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) return { ...n, paramsJson: writeModuleMeta(n.paramsJson, nextMeta) }
        if (hiddenNodeIds.includes(n.id)) return { ...n, x: n.x + shiftX, y: n.y + shiftY, hidden: false }
        return n
      })
    )
    setEdges((prev) => {
      const repSet = new Set(replIds)
      const hidSet = new Set(hiddenEdgeIds)
      return prev
        .filter((e) => !repSet.has(e.id))
        .map((e) => (hidSet.has(e.id) ? { ...e, hidden: false } : e))
    })
  }

  async function publish() {
    setPublishBusy(true)
    try {
      const graph = { nodes, edges }
      const res = await ragPublishModule({
        root_dir: rootDir,
        module_key: publishModuleKey || undefined,
        display_name_hint: publishNameHint || undefined,
        source: 'task-builder',
        similarity_threshold: 0.92,
        graph
      })
      if (!res.ok) {
        const fallbackKey = publishModuleKey.trim() || `builder_${Date.now()}`
        const fallbackName = publishNameHint.trim() || fallbackKey
        const up = await ragUpsertModule({
          root_dir: rootDir,
          module: {
            module_key: fallbackKey,
            display_name: fallbackName,
            nodes,
            edges,
            doc_zh: '',
            doc_en: '',
            inputs_json: '{}',
            outputs_json: '{}',
            source: 'task-builder'
          }
        })
        if (!up.ok) throw new Error(up.error || 'publish_failed')
        setLastPublishedModuleKey(String(up.module?.module_key || fallbackKey))
        message.success('已发布（未启用 LLM 增强）')
        setPublishOpen(false)
        return
      }
      setLastPublishedModuleKey(String(res.module?.module_key || ''))
      message.success(res.replaced ? '已发布并覆盖相似模块' : '已发布到模块库')
      setPublishOpen(false)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '发布失败')
    } finally {
      setPublishBusy(false)
    }
  }

  return (
    <PageScaffold title="模块化搭建" description="加载 task.analyze 结果，自动连线后编辑并发布为模块，支持草稿持久化。">
      <div className="md:col-span-4">
        <Card title="分析结果" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <div>
              <Typography.Text style={{ color: 'rgba(244,244,245,0.7)' }}>选择要加载的 task.analyze 记录</Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 6 }}
                placeholder="从档案中选择"
                value={analysisEventId ?? undefined}
                options={analyzeEvents.map((e) => {
                  const ts = e.ts ? new Date(String(e.ts)).toLocaleString() : String(e.id)
                  const td = (e.payload as any)?.task_draft || {}
                  const label = `${ts} · ${String(td.intent || td.featureDescription || td.generationQuestion || 'task.analyze')}`
                  return { value: String(e.id), label }
                })}
                onChange={(v) => {
                  const id = String(v)
                  setAnalysisEventId(id)
                  void loadFromAnalyzeEvent(id)
                }}
              />
            </div>

            <Divider style={{ borderColor: 'rgba(63,63,70,0.6)', margin: '8px 0' }} />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography.Text style={{ color: 'rgba(244,244,245,0.7)' }}>隐藏胶水节点</Typography.Text>
              <Switch checked={hideGlue} onChange={setHideGlue} />
            </Space>

            {lastPublishedModuleKey ? (
              <Button
                onClick={() => {
                  setModDrawerKey(lastPublishedModuleKey)
                  setModDrawerOpen(true)
                }}
              >
                查看最近发布模块
              </Button>
            ) : null}
          </Space>
        </Card>

        <Card
          title="库（拖拽到画布）"
          size="small"
          bordered={false}
          style={{ background: 'rgba(9, 9, 11, 0.6)', marginTop: 16 }}
        >
          <Tabs
            items={[
              {
                key: 'functions',
                label: '函数',
                children: (
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <input
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                      placeholder="搜索函数"
                      value={fnQ}
                      onChange={(e) => setFnQ(e.target.value)}
                    />
                    {fnBusy ? (
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.6)' }}>加载中…</Typography.Text>
                    ) : (
                      <div className="space-y-2">
                        {fnItems.map((it: any) => {
                          const payload = {
                            function_id: String(it.function_id),
                            display_name: String(it.display_name || it.signature || it.function_id),
                            module: String(it.module || ''),
                            kind: String(it.kind || 'glue'),
                            file_path: String(it.file_path || ''),
                            signature: String(it.signature || ''),
                            inputs_json: String(it.inputs_json || '{}'),
                            outputs_json: String(it.outputs_json || '{}')
                          }
                          return (
                            <div
                              key={payload.function_id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('application/x-ai-cbdes-fn', JSON.stringify(payload))}
                              onClick={() => {
                                setFnDrawerId(payload.function_id)
                                setFnDrawerOpen(true)
                              }}
                              className="cursor-grab rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 hover:bg-zinc-900/40"
                            >
                              <div className="text-sm text-zinc-100">{payload.display_name}</div>
                              <div className="text-xs text-zinc-400">{payload.module}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Space>
                )
              },
              {
                key: 'modules',
                label: '模块',
                children: (
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <input
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                      placeholder="搜索模块"
                      value={modQ}
                      onChange={(e) => setModQ(e.target.value)}
                    />
                    {modBusy ? (
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.6)' }}>加载中…</Typography.Text>
                    ) : (
                      <div className="space-y-2">
                        {modItems.map((m: any) => {
                          const payload = {
                            module_key: String(m.module_key),
                            display_name: String(m.display_name || m.module_key),
                            inputs_json: String(m.inputs_json || '{}'),
                            outputs_json: String(m.outputs_json || '{}')
                          }
                          return (
                            <div
                              key={payload.module_key}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('application/x-ai-cbdes-mod', JSON.stringify(payload))}
                              className="cursor-grab rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 hover:bg-zinc-900/40"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div
                                  className="min-w-0"
                                  onClick={() => {
                                    setModDrawerKey(payload.module_key)
                                    setModDrawerOpen(true)
                                  }}
                                >
                                  <div className="text-sm text-zinc-100">{payload.display_name}</div>
                                  <div className="text-xs text-zinc-400">{payload.module_key}</div>
                                </div>
                                <Space size={6}>
                                  <Button
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void addModuleToCanvas(payload.module_key)
                                    }}
                                  >
                                    加载
                                  </Button>
                                </Space>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Space>
                )
              }
            ]}
          />
        </Card>
      </div>

      <div className="md:col-span-8">
        <Card bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <div className="flex items-center justify-between gap-2">
            <Space>
              <Button
                onClick={() => {
                  const laid = autoLayout(nodes, edges, { mode: 'dag' })
                  setNodes(laid)
                  window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
                }}
              >
                自动布局
              </Button>
              <Button
                onClick={() => {
                  const extra = autoConnectGreedy(nodes, edges)
                  setEdges((prev) => [...prev, ...extra])
                  message.success('已自动连线')
                }}
              >
                自动连线
              </Button>
              <Button onClick={doClearCanvas}>清除</Button>
              <Button danger onClick={doDeleteSelected}>
                删除
              </Button>
            </Space>
            <Button type="primary" onClick={() => setPublishOpen(true)}>
              发布
            </Button>
          </div>
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-12">
          <div className="md:col-span-8">
            <Card
              title="画布"
              size="small"
              bordered={false}
              style={{ background: 'rgba(9, 9, 11, 0.6)' }}
              bodyStyle={{ padding: 0 }}
            >
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                pendingFromId={pendingFromId}
                onAddNode={addNode}
                onAddEdge={addEdge}
                onDeleteNode={removeNode}
                onDeleteEdge={removeEdge}
                onSelectNode={setSelectedNodeId}
                onSelectEdge={setSelectedEdgeId}
                onSetPendingFrom={setPendingFromId}
                onUpdateNodePos={updateNodePos}
                onUpdateNodePosBatch={updateNodePosBatch}
                canvasRef={canvasRef}
                rootDir={rootDir}
                hideGlue={hideGlue}
                resetViewToken={canvasResetToken}
                fitViewToken={fitViewToken}
                onDropModule={(moduleKey, pt) => {
                  void addModuleToCanvas(moduleKey, pt)
                }}
                onToggleModule={toggleModule}
              />
            </Card>
          </div>
          <div className="md:col-span-4">
            <Card
              title="属性"
              size="small"
              bordered={false}
              style={{ background: 'rgba(9, 9, 11, 0.6)' }}
            >
              <WorkflowInspector
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                onUpdateNode={updateNode}
                onRemoveNode={removeNode}
                onRemoveEdge={removeEdge}
                onRunTest={async (_node) => {
                  message.info('此页面不提供测试执行')
                }}
                busy={false}
              />
            </Card>
          </div>
        </div>
      </div>

      <FunctionDetailDrawer
        open={fnDrawerOpen}
        functionId={fnDrawerId}
        rootDir={rootDir}
        onClose={() => setFnDrawerOpen(false)}
        onSaved={() => void 0}
      />
      <ModuleDetailDrawer open={modDrawerOpen} moduleKey={modDrawerKey} onClose={() => setModDrawerOpen(false)} />

      <Modal
        title="发布到模块库"
        open={publishOpen}
        confirmLoading={publishBusy}
        onCancel={() => setPublishOpen(false)}
        onOk={() => void publish()}
        okText="发布"
        cancelText="取消"
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Typography.Text style={{ color: 'rgba(244,244,245,0.7)' }}>
            模块 Key（可选：留空则自动生成/自动覆盖相似模块）
          </Typography.Text>
          <input
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={publishModuleKey}
            onChange={(e) => setPublishModuleKey(e.target.value)}
            placeholder="例如：planning_debug_info"
          />
          <Typography.Text style={{ color: 'rgba(244,244,245,0.7)' }}>名称提示（可选）</Typography.Text>
          <input
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={publishNameHint}
            onChange={(e) => setPublishNameHint(e.target.value)}
            placeholder="例如：发布规划调试信息"
          />
          <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>
            若服务端未配置 LLM（DashScope/Aliyun），将以你输入的 Key/名称直接发布，不做命名与描述增强。
          </Typography.Text>
        </Space>
      </Modal>
    </PageScaffold>
  )
}
