import { Button, Card, Divider, Input, Modal, Select, Space, Switch, Tabs, Typography, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PageScaffold } from '../PageScaffold'
import {
  archiveGet,
  archiveList,
  codegenGlue,
  orchestratorGenerateCode,
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
import { useArchiveStore } from '../../store/archiveStore'
import { CPP_SPEC } from '../../utils/cppSpec'
import { extractPureCppFromMarkdown } from '../../utils/cppExtract'

const STORAGE_KEY = 'builder:visual-builder:v1'
const EXPORT_EVENT_KEY = 'builder:visual-builder:lastExportEventId:v1'

type ExportMode = 'reuse' | 'llm' | 'controlled'

function loadDraft():
  | {
      rootDir: string
      nodes: WorkflowNode[]
      edges: WorkflowEdge[]
      hideGlue: boolean
      taskContext: string
      lastPublishedModuleKey: string | null
      lastExportEventId: string | null
      exportMode: ExportMode
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
      taskContext: String((v as any).taskContext || ''),
      lastPublishedModuleKey:
        typeof (v as any).lastPublishedModuleKey === 'string' ? (v as any).lastPublishedModuleKey : null,
      lastExportEventId: typeof (v as any).lastExportEventId === 'string' ? String((v as any).lastExportEventId) : null,
      exportMode:
        (v as any).exportMode === 'reuse' || (v as any).exportMode === 'llm' || (v as any).exportMode === 'controlled'
          ? ((v as any).exportMode as ExportMode)
          : 'llm'
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
  taskContext: string
  lastPublishedModuleKey: string | null
  lastExportEventId: string | null
  exportMode: ExportMode
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    return
  }
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

export function VisualBuilderPage() {
  const appendArchive = useArchiveStore((s) => s.append)

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

  const [taskContext, setTaskContext] = useState('')

  const [fnQ, setFnQ] = useState('')
  const [fnItems, setFnItems] = useState<any[]>([])
  const [fnBusy, setFnBusy] = useState(false)
  const [modQ, setModQ] = useState('')
  const [modItems, setModItems] = useState<any[]>([])
  const [modBusy, setModBusy] = useState(false)

  const [fnDrawerOpen, setFnDrawerOpen] = useState(false)
  const [fnDrawerId, setFnDrawerId] = useState<string | null>(null)
  const [modDrawerOpen, setModDrawerOpen] = useState(false)
  const [modDrawerKey, setModDrawerKey] = useState<string | null>(null)

  const [publishOpen, setPublishOpen] = useState(false)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishModuleKey, setPublishModuleKey] = useState('')
  const [publishNameHint, setPublishNameHint] = useState('')
  const [lastPublishedModuleKey, setLastPublishedModuleKey] = useState<string | null>(null)

  const [exportBusy, setExportBusy] = useState(false)
  const [exportedCode, setExportedCode] = useState('')
  const [exportedCodeRaw, setExportedCodeRaw] = useState('')
  const [lastExportEventId, setLastExportEventId] = useState<string | null>(null)
  const [exportMode, setExportMode] = useState<ExportMode>('llm')

  const [gluePromptOpen, setGluePromptOpen] = useState(false)
  const [glueBusy, setGlueBusy] = useState(false)
  const [pendingGlueConnect, setPendingGlueConnect] = useState<{ fromId: string; toId: string } | null>(null)

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n] as const)), [nodes])

  useEffect(() => {
    const saved = loadDraft()
    if (saved) {
      if (saved.rootDir) setRootDir(saved.rootDir)
      setNodes(saved.nodes || [])
      setEdges(saved.edges || [])
      setHideGlue(Boolean(saved.hideGlue))
      setTaskContext(saved.taskContext || '')
      setLastPublishedModuleKey(saved.lastPublishedModuleKey)
      setLastExportEventId(saved.lastExportEventId)
      setExportMode(saved.exportMode || 'llm')
      window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
    }

    let exportId: string | null = null
    try {
      exportId = localStorage.getItem(EXPORT_EVENT_KEY)
    } catch {
      exportId = null
    }
    const finalExportId = exportId || (saved ? saved.lastExportEventId : null)
    if (finalExportId) {
      setLastExportEventId(finalExportId)
      void (async () => {
        try {
          let code = ''
          try {
            const ev = await archiveGet(finalExportId)
            code = String((ev as any)?.payload?.code || '')
          } catch {
            const list = await archiveList(500)
            const ev = list.find((x) => String((x as any)?.id || '') === String(finalExportId))
            code = String((ev as any)?.payload?.code || '')
          }
          if (code.trim()) {
            setExportedCode(code)
            setExportedCodeRaw(code)
          }
        } catch {
        }
      })()
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveDraft({ rootDir, nodes, edges, hideGlue, taskContext, lastPublishedModuleKey, lastExportEventId, exportMode })
    }, 350)
    return () => window.clearTimeout(t)
  }, [edges, exportMode, hideGlue, lastPublishedModuleKey, lastExportEventId, nodes, rootDir, taskContext])

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

  function addNode(n: WorkflowNode) {
    setNodes((prev) => [...prev, n])
  }

  function updateNode(id: string, patch: Partial<WorkflowNode>) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  function updateNodePos(id: string, x: number, y: number) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)))
  }

  function updateNodePosBatch(updates: Array<{ id: string; x: number; y: number }>) {
    const map = new Map(updates.map((u) => [u.id, u] as const))
    setNodes((prev) =>
      prev.map((n) => {
        const u = map.get(n.id)
        if (!u) return n
        return { ...n, x: u.x, y: u.y }
      })
    )
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

  function addEdge(e: WorkflowEdge) {
    setEdges((prev) => {
      const exists = prev.some((x) => x.from === e.from && x.to === e.to)
      if (exists) return prev
      return [...prev, e]
    })
  }

  async function confirmGlue() {
    if (!pendingGlueConnect) return
    const from = nodeById.get(pendingGlueConnect.fromId)
    const to = nodeById.get(pendingGlueConnect.toId)
    if (!from || !to) return
    setGlueBusy(true)
    try {
      const res = await codegenGlue({
        task: taskContext,
        from_node: {
          id: from.id,
          function_id: from.function_id,
          display_name: from.display_name,
          module: from.module,
          kind: from.kind,
          file_path: from.file_path,
          signature: from.signature,
          inputs_json: from.inputsJson,
          outputs_json: from.outputsJson
        },
        to_node: {
          id: to.id,
          function_id: to.function_id,
          display_name: to.display_name,
          module: to.module,
          kind: to.kind,
          file_path: to.file_path,
          signature: to.signature,
          inputs_json: to.inputsJson,
          outputs_json: to.outputsJson
        }
      })

      if (!res.ok) throw new Error(res.error || 'glue_failed')
      const glueId = newId('node')
      const gx = Math.max(12, (from.x + to.x) / 2)
      const gy = Math.max(12, (from.y + to.y) / 2)
      const inJson =
        res.inputs_json && typeof res.inputs_json === 'object'
          ? JSON.stringify(res.inputs_json, null, 2)
          : String(from.outputsJson || '{\n  "input": ""\n}')
      const outJson =
        res.outputs_json && typeof res.outputs_json === 'object'
          ? JSON.stringify(res.outputs_json, null, 2)
          : String(to.inputsJson || '{\n  "output": ""\n}')
      const paramsJson = JSON.stringify({ glue_code: String(res.glue_code || ''), doc_zh: String(res.doc_zh || '') }, null, 2)

      addNode({
        id: glueId,
        function_id: `glue:${glueId}`,
        display_name: String(res.glue_name || '格式转换胶水'),
        module: 'glue',
        kind: 'glue',
        file_path: '(glue)',
        signature: '',
        x: gx,
        y: gy,
        inputsJson: inJson,
        outputsJson: outJson,
        paramsJson,
        testCwd: rootDir,
        testCmd: ''
      })
      addEdge({ id: newId('edge'), from: from.id, to: glueId })
      addEdge({ id: newId('edge'), from: glueId, to: to.id })
      message.success('已生成胶水并完成连接')
      setGluePromptOpen(false)
      setPendingGlueConnect(null)
      window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '胶水生成失败')
    } finally {
      setGlueBusy(false)
    }
  }

  function cancelGlue() {
    setPendingGlueConnect(null)
    setGluePromptOpen(false)
    message.info('已取消连接')
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

      const laidChild = autoLayout(childNodes, childEdges)
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
        source: 'visual-builder',
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
            source: 'visual-builder'
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

  async function hydrateDraggedNode(kind: 'function' | 'module', id: string) {
    try {
      if (kind === 'function') {
        const res = await ragGetFunction(id)
        if (!res.ok || !res.function) return
        const fn = res.function as any
        message.success(`已加载函数：${String(fn.display_name || fn.signature || fn.function_id)}`)
        return
      }
      const res = await ragGetModule(id)
      if (!res.ok || !res.module) return
      const m = res.module as any
      message.success(`已加载模块：${String(m.display_name || m.module_key)}`)
    } catch {
    }
  }

  function buildEdgeText(listNodes: WorkflowNode[], listEdges: WorkflowEdge[]) {
    const byId = new Map(listNodes.map((n) => [n.id, n] as const))
    return listEdges
      .filter((e) => !e.hidden)
      .map((e) => {
        const a = byId.get(e.from)
        const b = byId.get(e.to)
        if (!a || !b) return ''
        const m = ioMatchScore(a.outputsJson, b.inputsJson)
        const shared = m.sharedNames.length ? `（匹配字段：${m.sharedNames.slice(0, 6).join(', ')}）` : ''
        return `- ${a.display_name} -> ${b.display_name}${shared}`
      })
      .filter(Boolean)
      .join('\n')
  }

  function sanitizeRelName(s: string) {
    return String(s || '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 80)
  }

  function clipText(s: string, maxChars: number) {
    const t = String(s || '')
    if (t.length <= maxChars) return { text: t, clipped: false }
    return { text: t.slice(0, Math.max(0, maxChars)) + '\n\n(…已截断)', clipped: true }
  }

  async function fetchFunctionCodeByIds(functionIds: string[]) {
    const ids = Array.from(new Set(functionIds.filter(Boolean)))
    const out = new Map<
      string,
      { ok: boolean; code: string; file_path: string; signature: string; doc_zh: string; display_name?: string }
    >()
    if (!ids.length) return out

    let cursor = 0
    const workers = Array.from({ length: Math.min(6, ids.length) }, async () => {
      while (cursor < ids.length) {
        const fid = ids[cursor]
        cursor += 1
        try {
          const res = await ragGetFunction(fid)
          if (!res.ok || !res.function) {
            out.set(fid, { ok: false, code: '', file_path: '', signature: '', doc_zh: '' })
            continue
          }
          const fn = res.function as any
          out.set(fid, {
            ok: true,
            code: String(fn.code || ''),
            file_path: String(fn.file_path || ''),
            signature: String(fn.signature || ''),
            doc_zh: String(fn.doc_zh || ''),
            display_name: String(fn.display_name || fn.signature || fn.function_id || fid)
          })
        } catch {
          out.set(fid, { ok: false, code: '', file_path: '', signature: '', doc_zh: '' })
        }
      }
    })
    await Promise.all(workers)
    return out
  }

  function buildStrategySection(mode: ExportMode) {
    if (mode === 'reuse') return ''
    const prefer = [
      '优先复用已有函数与类，不要改动其实现细节（除非无法编译/接口不一致）。',
      '优先输出可在门禁工作区独立编译的最小工程（必要时补充缺失头文件与实现）。',
      '优先使用清晰的模块目录结构：include/、src/、test/。',
      '优先用显式类型与显式赋值，避免隐式转换带来的告警。'
    ]
    const must = [
      '必须输出可落地编译运行的 C/C++ 多文件工程（包含必要 .h/.cpp）。',
      '必须保证所有 #include \"xxx\" 在输出文件集合中可找到（不允许引用 ../../Common 之类外部路径）。',
      '必须遵守附录中的 C++ 统一规范（控制流/命名/注释要求）。',
      '必须按“### 相对路径 + ```cpp”格式输出每个文件。'
    ]
    const header = mode === 'controlled' ? '## 策略（受控组合）' : '## 策略（模型调用）'
    return [
      header,
      '### Prefer',
      ...prefer.map((x) => `- ${x}`),
      '',
      '### Must',
      ...must.map((x) => `- ${x}`)
    ].join('\n')
  }

  async function buildExportPrompt(mode: ExportMode) {
    const allNodes = nodes
    const allEdges = edges
    const byId = new Map(allNodes.map((n) => [n.id, n] as const))

    const moduleNodes = allNodes.filter((n) => String(n.kind || '') === 'module')
    const moduleChildrenByModuleId = new Map<string, WorkflowNode[]>()
    for (const m of moduleNodes) {
      const meta = readModuleMeta(String(m.paramsJson || ''))
      const childIds = Array.isArray(meta?.child_node_ids) ? (meta.child_node_ids as any[]).map((x) => String(x)) : []
      let kids: WorkflowNode[] = []
      if (childIds.length) {
        kids = childIds.map((id) => byId.get(id)).filter((x): x is WorkflowNode => Boolean(x))
      } else {
        kids = allNodes.filter((n) => readParentId(String(n.paramsJson || '')) === m.id)
      }
      moduleChildrenByModuleId.set(m.id, kids)
    }

    const functionNodes = allNodes.filter((n) => String(n.kind || '') !== 'module')
    const uniqueFnIds = Array.from(
      new Set(
        functionNodes
          .map((n) => String(n.function_id || ''))
          .filter((id) => id && !id.startsWith('module:') && !id.startsWith('glue:'))
      )
    )

    const fnCodeById = await fetchFunctionCodeByIds(uniqueFnIds)

    function nodeSourceBlock(n: WorkflowNode) {
      const fid = String(n.function_id || '')
      if (fid.startsWith('glue:') || String(n.file_path || '') === '(glue)') {
        try {
          const p = JSON.parse(String(n.paramsJson || '{}'))
          const glueCode = String(p.glue_code || '')
          const docZh = String(p.doc_zh || '')
          const head = `### ${n.display_name} (glue)`
          const docs = docZh ? `\n\n${docZh.trim()}` : ''
          const clipped = clipText(glueCode.trim(), 12000)
          const code = clipped.text.trim() ? `\n\n\`\`\`cpp\n${clipped.text.trim()}\n\`\`\`` : '\n\n(无胶水代码)'
          return `${head}${docs}${code}`
        } catch {
          return `### ${n.display_name} (glue)\n\n(胶水代码解析失败)`
        }
      }

      const info = fnCodeById.get(fid)
      const head = `### ${n.display_name} (${fid})`
      if (!info || !info.ok) return `${head}\n\n(未能获取函数源代码)`
      const meta = [
        info.file_path ? `- 路径：${info.file_path}` : '',
        info.signature ? `- 签名：${info.signature}` : ''
      ]
        .filter(Boolean)
        .join('\n')
      const docs = info.doc_zh ? `\n\n${info.doc_zh.trim()}` : ''
      const clipped = clipText(String((info as any).code || '').trim(), 14000)
      const code = clipped.text.trim() ? `\n\n\`\`\`cpp\n${clipped.text.trim()}\n\`\`\`` : ''
      return `${head}${meta ? `\n\n${meta}` : ''}${docs}${code}`
    }

    const moduleDesc = [
      publishNameHint.trim() ? publishNameHint.trim() : '',
      publishModuleKey.trim() ? `(${publishModuleKey.trim()})` : ''
    ]
      .filter(Boolean)
      .join(' ')
      .trim()

    const part1 = [
      '## 任务描述',
      '根据已有的函数代码和模块连接关系，给出代码模块的描述和简介，整合已有实现代码和调用前后关系，并生成可编译运行的目标 C++代码，给出所需运行必要的h头文件代码和cpp文件源代码。',
      moduleDesc ? `画布目标模块：${moduleDesc}` : '画布目标模块：未命名',
      rootDir ? `工程根目录：${rootDir}` : '',
      taskContext.trim() ? `补充任务描述：${taskContext.trim()}` : ''
    ]
      .filter(Boolean)
      .join('\n')

    const edgesText = buildEdgeText(allNodes, allEdges)
    const edgeSection = edgesText ? `## 连接关系\n${edgesText}` : '## 连接关系\n(无连线)'

    const moduleSections: string[] = []
    for (const m of moduleNodes) {
      const meta = readModuleMeta(String(m.paramsJson || ''))
      const mk = String(meta?.module_key || m.module || '')
      const kids = moduleChildrenByModuleId.get(m.id) || []
      const body = kids.length ? kids.map((n) => nodeSourceBlock(n)).join('\n\n') : '(无子函数)'
      moduleSections.push(`## 模块：${m.display_name}${mk ? ` (${mk})` : ''}\n\n${body}`)
    }

    const moduleChildSet = new Set<string>()
    for (const kids of moduleChildrenByModuleId.values()) for (const n of kids) moduleChildSet.add(n.id)
    const looseNodes = functionNodes.filter((n) => !moduleChildSet.has(n.id))
    const looseSection = looseNodes.length
      ? `## 画布独立函数/胶水\n\n${looseNodes.map((n) => nodeSourceBlock(n)).join('\n\n')}`
      : ''

    const part2 = ['## 源代码与注释', ...moduleSections, looseSection, edgeSection].filter(Boolean).join('\n\n')
    const strategy = buildStrategySection(mode)
    const part3 = [
      '## 生成要求',
      '请输出结果为 Markdown，若多文件请使用以下格式：',
      '',
      '### path/to/file.cpp',
      '```cpp',
      '...',
      '```',
      '',
      strategy ? `---\n\n${strategy}` : '',
      '---',
      '',
      '【C++代码改写统一规范（必须严格遵守）】',
      CPP_SPEC
    ]
      .filter(Boolean)
      .join('\n')

    return [part1, part2, part3].join('\n\n---\n\n').trim()
  }

  function parseFilesFromMarkdown(md: string) {
    const s = String(md || '')
    const re = /^###\s+(.+?)\s*$\n```(?:cpp|c\+\+|c)\s*\n([\s\S]*?)\n```\s*$/gim
    const files: Array<{ path: string; code: string }> = []
    let m: RegExpExecArray | null
    while ((m = re.exec(s))) {
      const path = String(m[1] || '').trim()
      const code = String(m[2] || '').trim()
      if (path && code) files.push({ path, code })
    }
    return files
  }

  function formatFilesToMarkdown(files: Array<{ path: string; code: string }>) {
    return files
      .map((f) => `### ${f.path}\n\`\`\`cpp\n${String(f.code || '').trim()}\n\`\`\``)
      .join('\n\n')
      .trim()
  }

  async function buildReuseExportResult() {
    const functionNodes = nodes.filter((n) => String(n.kind || '') !== 'module')
    const fnIds = functionNodes
      .filter((n) => !String(n.function_id || '').startsWith('glue:') && String(n.file_path || '') !== '(glue)')
      .map((n) => String(n.function_id || ''))
      .filter(Boolean)
    const fnCodeById = await fetchFunctionCodeByIds(fnIds)

    const files: Array<{ path: string; code: string }> = []
    for (const n of functionNodes) {
      const fid = String(n.function_id || '')
      const baseName = sanitizeRelName(String(n.display_name || fid || 'node'))
      if (fid.startsWith('glue:') || String(n.file_path || '') === '(glue)') {
        const p = safeParseJson(String(n.paramsJson || '')) || {}
        const glue = String((p as any).glue_code || '').trim()
        if (!glue) continue
        files.push({ path: `glue/${baseName}.cpp`, code: glue })
        continue
      }
      const info = fnCodeById.get(fid)
      const code = String(info?.ok ? info?.code : '').trim()
      if (!code) continue
      files.push({ path: `reuse/${baseName}.cpp`, code })
    }
    files.push({ path: 'main.cpp', code: 'int main() { return 0; }' })
    return formatFilesToMarkdown(files)
  }

  async function buildControlledExportResult() {
    const functionNodes = nodes.filter((n) => String(n.kind || '') !== 'module')
    const fnIds = functionNodes
      .filter((n) => !String(n.function_id || '').startsWith('glue:') && String(n.file_path || '') !== '(glue)')
      .map((n) => String(n.function_id || ''))
      .filter(Boolean)
    const fnCodeById = await fetchFunctionCodeByIds(fnIds)

    const candidates = functionNodes
      .filter((n) => {
        const fid = String(n.function_id || '')
        const info = fnCodeById.get(fid)
        if (!fid || !info?.ok) return false
        const code = String(info.code || '').trim()
        if (code.length < 120) return false
        if (String(info.doc_zh || '').trim().length < 20) return false
        return true
      })
      .slice(0, 12)

    const hqFiles: Array<{ path: string; code: string }> = []
    const hqPathSet = new Set<string>()
    for (const n of candidates) {
      const fid = String(n.function_id || '')
      const info = fnCodeById.get(fid)
      const code = String(info?.code || '').trim()
      if (!code) continue
      const name = sanitizeRelName(String(n.display_name || fid))
      const path = `hq/${name}.cpp`
      hqPathSet.add(path)
      hqFiles.push({ path, code })
    }

    const edgeText = buildEdgeText(nodes, edges)
    const requirement = [
      '## 受控组合任务',
      '你需要在不修改“高质量函数文件（hq/）”的前提下，生成 glue code 与集成入口，将其按画布连接关系拼装为可编译工程。',
      '',
      '### 必须遵守',
      '- 不允许改动 hq/ 下任何文件内容；若接口不匹配，只能通过新增 glue/ 包装与适配。',
      '- 所有 include 必须在输出文件集合中可找到，不允许引用工作区外相对路径。',
      '- 输出必须为多文件 Markdown（### path + ```cpp）。',
      '',
      '### 连接关系',
      edgeText ? edgeText : '(无连线)',
      '',
      '### 高质量函数（只读，不允许修改）',
      hqFiles.length ? formatFilesToMarkdown(hqFiles) : '(无)'
    ].join('\n')

    const prompt = [requirement, '---', buildStrategySection('controlled'), '---', `【C++代码改写统一规范（必须严格遵守）】\n${CPP_SPEC}`]
      .filter(Boolean)
      .join('\n\n')

    const res = await orchestratorGenerateCode({ prompt, source_event_id: null, source_event_type: 'visual-builder' })
    if (!res.ok) throw new Error(res.error || 'generate_failed')
    const llmMd = String(res.code || '').trim()
    const llmFiles = parseFilesFromMarkdown(llmMd).filter((f) => !hqPathSet.has(f.path))
    const merged = formatFilesToMarkdown([...hqFiles, ...llmFiles])
    return { merged, llmLog: String(res.log || '').trim(), llmKeyPoints: res.key_points, prompt }
  }

  async function runExport() {
    if (!nodes.length) {
      message.error('画布为空，无法导出')
      return
    }
    setExportBusy(true)
    try {
      let prompt = ''
      let rawOut = ''
      let logText = ''
      let keyPoints: string[] = []

      if (exportMode === 'reuse') {
        rawOut = await buildReuseExportResult()
        prompt = '(export_mode=reuse)'
      } else if (exportMode === 'controlled') {
        const out = await buildControlledExportResult()
        rawOut = out.merged
        prompt = out.prompt
        logText = out.llmLog
        keyPoints = Array.isArray(out.llmKeyPoints) ? out.llmKeyPoints.map((x: any) => String(x)) : []
      } else {
        prompt = await buildExportPrompt('llm')
        const res = await orchestratorGenerateCode({ prompt, source_event_id: null, source_event_type: 'visual-builder' })
        if (!res.ok) throw new Error(res.error || 'generate_failed')
        rawOut = String(res.code || '').trim()
        logText = String(res.log || '').trim()
        keyPoints = Array.isArray(res.key_points) ? res.key_points.map((x) => String(x)) : []
      }

      const extracted = extractPureCppFromMarkdown(rawOut)
      setExportedCodeRaw(extracted.raw)
      setExportedCode(extracted.display)
      try {
        const ev = await appendArchive('orchestrator.generate', {
          source_event: null,
          prompt,
          code: extracted.raw,
          log: logText,
          key_points: keyPoints,
          graph: { nodes, edges, root_dir: rootDir, task_context: taskContext, hide_glue: hideGlue },
          source: 'visual-builder',
          export_mode: exportMode
        })
        const exportId = String(ev?.id || '')
        if (exportId) {
          setLastExportEventId(exportId)
          try {
            localStorage.setItem(EXPORT_EVENT_KEY, exportId)
          } catch {
          }
          saveDraft({ rootDir, nodes, edges, hideGlue, taskContext, lastPublishedModuleKey, lastExportEventId: exportId, exportMode })
        }
        message.success('已导出并入档')
      } catch (e2) {
        message.warning(`已导出但入档失败：${e2 instanceof Error ? e2.message : 'archive_failed'}`)
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExportBusy(false)
    }
  }

  return (
    <PageScaffold title="图形化输入" description="拖拽搭建新模块，可选生成胶水，发布到模块库并持久化草稿。">
      <div className="md:col-span-4">
        <Card title="上下文" size="small" bordered style={{ background: '#ffffff', borderColor: 'rgba(24, 24, 27, 0.12)' }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.72)' }}>任务描述（用于胶水生成，可选）</Typography.Text>
            <textarea
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              rows={4}
              value={taskContext}
              onChange={(e) => setTaskContext(e.target.value)}
              placeholder="例如：将上游规划结果字段转换为下游控制模块所需输入"
            />
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.72)' }}>隐藏胶水节点</Typography.Text>
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
          bordered
          style={{ background: '#ffffff', marginTop: 16, borderColor: 'rgba(24, 24, 27, 0.12)' }}
        >
          <Tabs
            items={[
              {
                key: 'functions',
                label: '函数',
                children: (
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <input
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                      placeholder="搜索函数"
                      value={fnQ}
                      onChange={(e) => setFnQ(e.target.value)}
                    />
                    {fnBusy ? (
                      <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.6)' }}>加载中…</Typography.Text>
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
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/x-ai-cbdes-fn', JSON.stringify(payload))
                              }}
                              onClick={() => {
                                setFnDrawerId(payload.function_id)
                                setFnDrawerOpen(true)
                                void hydrateDraggedNode('function', payload.function_id)
                              }}
                              className="cursor-grab rounded-lg border border-zinc-200 bg-white px-3 py-2 hover:bg-[rgba(95,2,107,0.05)]"
                            >
                              <div className="text-sm text-zinc-900">{payload.display_name}</div>
                              <div className="text-xs text-zinc-500">{payload.module}</div>
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
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                      placeholder="搜索模块"
                      value={modQ}
                      onChange={(e) => setModQ(e.target.value)}
                    />
                    {modBusy ? (
                      <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.6)' }}>加载中…</Typography.Text>
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
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/x-ai-cbdes-mod', JSON.stringify(payload))
                              }}
                              className="cursor-grab rounded-lg border border-zinc-200 bg-white px-3 py-2 hover:bg-[rgba(95,2,107,0.05)]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div
                                  className="min-w-0"
                                  onClick={() => {
                                    setModDrawerKey(payload.module_key)
                                    setModDrawerOpen(true)
                                    void hydrateDraggedNode('module', payload.module_key)
                                  }}
                                >
                                  <div className="text-sm text-zinc-900">{payload.display_name}</div>
                                  <div className="text-xs text-zinc-500">{payload.module_key}</div>
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
        <Card bordered style={{ background: '#ffffff', borderColor: 'rgba(24, 24, 27, 0.12)' }}>
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
              <Button onClick={doClearCanvas}>清除</Button>
              <Button danger onClick={doDeleteSelected}>
                删除
              </Button>
            </Space>
            <Space size={8}>
              <Button type="primary" onClick={() => setPublishOpen(true)}>
                发布
              </Button>
              <Select
                value={exportMode}
                onChange={(v) => setExportMode(v as ExportMode)}
                style={{ width: 160 }}
                options={[
                  { value: 'reuse', label: '导出：直接复用' },
                  { value: 'llm', label: '导出：模型调用' },
                  { value: 'controlled', label: '导出：受控组合' }
                ]}
              />
              <Button onClick={() => void runExport()} loading={exportBusy} disabled={!nodes.length}>
                导出
              </Button>
            </Space>
          </div>
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-12">
          <div className="md:col-span-8">
            <Card
              title="画布"
              size="small"
              bordered
              style={{ background: '#ffffff', borderColor: 'rgba(24, 24, 27, 0.12)' }}
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
                onRequestConnect={async (from, to) => {
                  const m = ioMatchScore(from.outputsJson, to.inputsJson)
                  if (m.sharedNames.length > 0) {
                    addEdge({ id: newId('edge'), from: from.id, to: to.id })
                    return true
                  }
                  setPendingGlueConnect({ fromId: from.id, toId: to.id })
                  setGluePromptOpen(true)
                  return true
                }}
              />
            </Card>
          </div>
          <div className="md:col-span-4">
            <Card
              title="属性"
              size="small"
              bordered
              style={{ background: '#ffffff', borderColor: 'rgba(24, 24, 27, 0.12)' }}
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

              <Divider style={{ borderColor: 'rgba(24, 24, 27, 0.12)', margin: '12px 0' }} />
              <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.82)' }}>导出的代码栏</Typography.Text>
              <div className="mt-2">
                <Input.TextArea value={exportedCode} onChange={(e) => setExportedCode(e.target.value)} rows={12} />
              </div>
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
        title="无字段匹配"
        open={gluePromptOpen}
        confirmLoading={glueBusy}
        onCancel={cancelGlue}
        onOk={() => void confirmGlue()}
        okText="生成胶水并连接"
        cancelText="取消连接"
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.82)' }}>
            该连线的上游输出与下游输入没有任何字段名一致，是否生成一个胶水节点做格式转换？
          </Typography.Text>
          <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.62)' }}>
            若服务端未配置 LLM（DashScope/Aliyun），将返回错误，你可以取消并手动调整输入输出 JSON。
          </Typography.Text>
        </Space>
      </Modal>

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
          <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.72)' }}>模块 Key（可选）</Typography.Text>
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
            value={publishModuleKey}
            onChange={(e) => setPublishModuleKey(e.target.value)}
            placeholder="例如：new_visual_module"
          />
          <Typography.Text style={{ color: 'rgba(24, 24, 27, 0.72)' }}>名称提示（可选）</Typography.Text>
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
            value={publishNameHint}
            onChange={(e) => setPublishNameHint(e.target.value)}
            placeholder="例如：图形化输入生成模块"
          />
        </Space>
      </Modal>
    </PageScaffold>
  )
}
