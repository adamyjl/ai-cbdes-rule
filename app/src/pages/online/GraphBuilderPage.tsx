import { PageScaffold } from '../PageScaffold'
import { Button, Card, Input, Modal, Select, Space, Switch, Tree, Typography, message } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ragGetModule, ragListFunctions, ragListIndexedModules, ragListModules, ragRunTest, ragUpsertModule } from '../../utils/api'
import { WorkflowCanvas } from '../../components/graph/WorkflowCanvas'
import { WorkflowInspector } from '../../components/graph/WorkflowInspector'
import type { WorkflowDraft, WorkflowEdge, WorkflowNode } from '../../components/graph/workflowTypes'
import { autoLayout, newId } from '../../components/graph/graphUtils'
import { FunctionDetailDrawer } from '../../components/rag/FunctionDetailDrawer'
import { useArchiveStore } from '../../store/archiveStore'
import { ModuleDetailDrawer } from '../../components/rag/ModuleDetailDrawer'

const LS_KEY = 'online:workflows'

function loadWorkflows(): WorkflowDraft[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as WorkflowDraft[]) : []
  } catch {
    return []
  }
}

function saveWorkflows(items: WorkflowDraft[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export function GraphBuilderPage() {
  const appendArchive = useArchiveStore((s) => s.append)
  const [rootDir, setRootDir] = useState('data\\THICV-Pilot_master')
  const [moduleFilter, setModuleFilter] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [treeLoading, setTreeLoading] = useState(false)
  const [moduleNodes, setModuleNodes] = useState<DataNode[]>([])
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [loadedQueryByModule, setLoadedQueryByModule] = useState<Record<string, string>>({})
  const [loadedRootDirByModule, setLoadedRootDirByModule] = useState<Record<string, string>>({})

  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [pendingFromId, setPendingFromId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerFunctionId, setDrawerFunctionId] = useState<string | null>(null)

  const [moduleLibraryBusy, setModuleLibraryBusy] = useState(false)
  const [moduleLibraryQ, setModuleLibraryQ] = useState('')
  const [moduleLibrary, setModuleLibrary] = useState<any[]>([])

  const [saveModuleOpen, setSaveModuleOpen] = useState(false)
  const [saveModuleKey, setSaveModuleKey] = useState('')
  const [saveModuleName, setSaveModuleName] = useState('')

  const [hideGlue, setHideGlue] = useState(false)
  const [canvasResetToken, setCanvasResetToken] = useState(0)
  const [fitViewToken, setFitViewToken] = useState(0)
  const [moduleDetailOpen, setModuleDetailOpen] = useState(false)
  const [moduleDetailKey, setModuleDetailKey] = useState<string | null>(null)

  const [pendingLayoutAfterLoad, setPendingLayoutAfterLoad] = useState<{ expectedNodes: number; expectedEdges: number } | null>(null)

  const BUILDER_DRAFT_KEY = 'online:builder_draft'

  const canvasRef = useRef<HTMLDivElement | null>(null)

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId])

  function removeNode(id: string) {
    if (selectedNodeId === id) setSelectedNodeId(null)
    if (pendingFromId === id) setPendingFromId(null)
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id))
    setNodes((prev) => prev.filter((n) => n.id !== id))
  }

  function removeEdge(id: string) {
    if (selectedEdgeId === id) setSelectedEdgeId(null)
    setEdges((prev) => prev.filter((e) => e.id !== id))
  }

  function deleteSelected() {
    if (selectedEdgeId) {
      removeEdge(selectedEdgeId)
      return
    }
    if (selectedNodeId) {
      removeNode(selectedNodeId)
    }
  }

  function clearCanvas() {
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setPendingFromId(null)
    setCanvasResetToken((v) => v + 1)
  }

  function runAutoLayout() {
    setNodes((prev) => autoLayout(prev, edges, { mode: 'dag' }))
    window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
  }

  useEffect(() => {
    if (!pendingLayoutAfterLoad) return
    if (nodes.length < pendingLayoutAfterLoad.expectedNodes) return
    if (edges.length < pendingLayoutAfterLoad.expectedEdges) return
    setNodes((prev) => autoLayout(prev, edges, { mode: 'dag' }))
    setPendingLayoutAfterLoad(null)
    window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
  }, [edges, nodes.length, pendingLayoutAfterLoad])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUILDER_DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d && Array.isArray(d.nodes) && Array.isArray(d.edges)) {
        setRootDir(typeof d.rootDir === 'string' && d.rootDir ? d.rootDir : rootDir)
        setNodes(d.nodes as WorkflowNode[])
        setEdges(d.edges as WorkflowEdge[])
        if (typeof d.hideGlue === 'boolean') setHideGlue(d.hideGlue)
        window.setTimeout(() => setFitViewToken((v) => v + 1), 0)
      }
    } catch {
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setTreeLoading(true)
      try {
        const res = await ragListModules(rootDir)
        const mods = (res.modules || []).map((m: any) => ({
          key: String(m.module),
          title: (
            <Space size={8}>
              <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }}>{String(m.module)}</Typography.Text>
              <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>{Number(m.count || 0)}</Typography.Text>
            </Space>
          ),
          isLeaf: false
        }))
        setModuleNodes(mods)
        setExpandedKeys([])
        setLoadedQueryByModule({})
        setLoadedRootDirByModule({})
      } catch (e) {
        message.error(e instanceof Error ? e.message : '加载模块失败')
      } finally {
        setTreeLoading(false)
      }
    })()
  }, [rootDir])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        setModuleLibraryBusy(true)
        try {
          const res = await ragListIndexedModules({ root_dir: rootDir, q: moduleLibraryQ || undefined, limit: 100, offset: 0 })
          const items = (res.items || []) as any[]
          const filtered: any[] = []
          const concurrency = 6
          for (let i = 0; i < items.length; i += concurrency) {
            const part = items.slice(i, i + concurrency)
            const checks = await Promise.all(
              part.map(async (m) => {
                const key = String(m.module_key)
                try {
                  const detail = await ragGetModule(key)
                  const mod = (detail as any).module
                  if (!mod) return { keep: true, item: m }
                  const rawNodes = JSON.parse(String(mod.nodes_json || '[]')) as any[]
                  const hasNonGlue = rawNodes.some((n) => String(n?.kind || 'glue') !== 'glue')
                  return { keep: hasNonGlue, item: m }
                } catch {
                  return { keep: true, item: m }
                }
              })
            )
            for (const c of checks) {
              if (c.keep) filtered.push(c.item)
            }
          }
          setModuleLibrary(filtered)
        } catch {
          setModuleLibrary([])
        } finally {
          setModuleLibraryBusy(false)
        }
      })()
    }, 250)
    return () => window.clearTimeout(t)
  }, [rootDir, moduleLibraryQ])

  async function loadFunctionsForModule(moduleName: string) {
    setTreeLoading(true)
    try {
      const res = await ragListFunctions({ root_dir: rootDir, module: moduleName, q: q || undefined, limit: 200, offset: 0 })
      const items = (res.items || [])
        .filter((it: any) => {
          const s = Number(it?.start_line)
          const e = Number(it?.end_line)
          if (Number.isFinite(s) && Number.isFinite(e)) return e - s + 1 >= 2
          return true
        })
        .map((it: any) => {
        const payload = {
          function_id: String(it.function_id),
          display_name: String(it.display_name || it.signature || it.function_id),
          module: String(it.module || moduleName),
          kind: String(it.kind || 'glue'),
          file_path: String(it.file_path || ''),
          signature: String(it.signature || ''),
          inputs_json: String(it.inputs_json || '{}'),
          outputs_json: String(it.outputs_json || '{}')
        }
        return {
          key: String(it.function_id),
          isLeaf: true,
          title: (
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-ai-cbdes-fn', JSON.stringify(payload))
              }}
              onClick={(e) => {
                e.stopPropagation()
                setDrawerFunctionId(payload.function_id)
                setDrawerOpen(true)
              }}
              style={{ cursor: 'grab' }}
            >
              <Typography.Text style={{ color: 'rgba(244,244,245,0.82)' }}>{payload.display_name}</Typography.Text>
              <Typography.Text style={{ color: 'rgba(244,244,245,0.45)', marginLeft: 8 }} ellipsis>
                {payload.file_path.split('\\').slice(-2).join('\\')}
              </Typography.Text>
            </div>
          )
        } as DataNode
        })

      setModuleNodes((prev) =>
        prev.map((m) => {
          if (String(m.key) !== moduleName) return m
          return { ...m, children: items }
        })
      )
      setLoadedQueryByModule((prev) => ({ ...prev, [moduleName]: q }))
      setLoadedRootDirByModule((prev) => ({ ...prev, [moduleName]: rootDir }))
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载函数失败')
    } finally {
      setTreeLoading(false)
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      const keys = expandedKeys.map((k) => String(k)).filter(Boolean)
      if (!keys.length) return
      for (const k of keys) {
        const loadedQ = loadedQueryByModule[k]
        const loadedRoot = loadedRootDirByModule[k]
        if (loadedQ !== q || loadedRoot !== rootDir) {
          void loadFunctionsForModule(k)
        }
      }
    }, 250)
    return () => window.clearTimeout(t)
  }, [expandedKeys, loadedQueryByModule, loadedRootDirByModule, q, rootDir])

  function selectNode(nid: string | null) {
    if (!nid) {
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      setPendingFromId(null)
      return
    }
    setSelectedNodeId(nid)
    setSelectedEdgeId(null)
    if (pendingFromId && pendingFromId !== nid) {
      setEdges((prev) => {
        const exists = prev.some((e) => e.from === pendingFromId && e.to === nid)
        if (exists) return prev
        return [...prev, { id: newId('edge'), from: pendingFromId, to: nid }]
      })
      setPendingFromId(null)
      message.success('已连接')
    }
  }

  function selectEdge(eid: string | null) {
    setSelectedEdgeId(eid)
    setSelectedNodeId(null)
    setPendingFromId(null)
  }

  function updateNode(id: string, patch: Partial<WorkflowNode>) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  async function loadModuleToCanvas(moduleKey: string) {
    setBusy(true)
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

      const baseX = nodes.length ? Math.max(...nodes.map((n) => n.x)) + 320 : 24
      const baseY = 24

      const idMap = new Map<string, string>()
      for (const n of rawNodes) {
        idMap.set(String(n.id), newId('node'))
      }
      const newNodes: WorkflowNode[] = rawNodes.map((n: any, idx: number) => {
        const nid = idMap.get(String(n.id)) || newId('node')
        return {
          id: nid,
          function_id: String(n.function_id || n.id || ''),
          display_name: String(n.display_name || ''),
          module: String(n.module || 'common'),
          kind: String(n.kind || 'glue'),
          file_path: String(n.file_path || ''),
          signature: String(n.signature || ''),
          x: Number.isFinite(Number(n.x)) ? Number(n.x) + baseX : baseX + (idx % 3) * 260,
          y: Number.isFinite(Number(n.y)) ? Number(n.y) + baseY : baseY + Math.floor(idx / 3) * 140,
          inputsJson: String(n.inputsJson || n.inputs_json || '{\n  "input": ""\n}'),
          outputsJson: String(n.outputsJson || n.outputs_json || '{\n  "output": ""\n}'),
          paramsJson: String(n.paramsJson || '{\n  "params": {}\n}'),
          testCwd: String(n.testCwd || rootDir),
          testCmd: String(n.testCmd || '')
        }
      })

      const newEdges: WorkflowEdge[] = rawEdges
        .map((e: any) => {
          const from = idMap.get(String(e.from))
          const to = idMap.get(String(e.to))
          if (!from || !to) return null
          return { id: newId('edge'), from, to } as WorkflowEdge
        })
        .filter(Boolean) as any

      setNodes((prev) => [...prev, ...newNodes])
      setEdges((prev) => [...prev, ...newEdges])
      setPendingLayoutAfterLoad({ expectedNodes: nodes.length + newNodes.length, expectedEdges: edges.length + newEdges.length })
      message.success(`已加载模块：${mod.display_name || mod.module_key}`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载模块失败')
    } finally {
      setBusy(false)
    }
  }

  function openModuleDetail(moduleKey: string) {
    setModuleDetailKey(moduleKey)
    setModuleDetailOpen(true)
  }

  function openSaveModule() {
    const first = nodes[0]
    setSaveModuleKey(first ? `mod_${first.function_id.slice(0, 8)}` : '')
    setSaveModuleName(first ? `模块_${first.display_name}` : '')
    setSaveModuleOpen(true)
  }

  async function saveAsModule() {
    if (!saveModuleKey.trim()) {
      message.warning('请填写 module_key')
      return
    }
    setBusy(true)
    try {
      const module = {
        module_key: saveModuleKey.trim(),
        display_name: saveModuleName.trim() || saveModuleKey.trim(),
        entry_function_id: nodes[0]?.function_id || '',
        nodes,
        edges,
        source: 'manual'
      }
      const res = await ragUpsertModule({ root_dir: rootDir, module })
      if (!res.ok) throw new Error(res.error || 'save_failed')
      message.success('已保存模块（可覆盖旧模块）')
      setSaveModuleOpen(false)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存模块失败')
    } finally {
      setBusy(false)
    }
  }

  async function runTest(node: WorkflowNode) {
    if (!node.testCmd) return
    setBusy(true)
    try {
      const res = await ragRunTest({ cwd: node.testCwd, command: node.testCmd, timeout_ms: 60000 })
      if (res.ok) message.success(`测试成功（${res.duration_ms}ms）`)
      else message.error(`测试失败：exit_code=${res.exit_code}`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '测试执行失败')
    } finally {
      setBusy(false)
    }
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

  async function saveWorkflow(toArchive: boolean) {
    const wf: WorkflowDraft = {
      id: newId('wf'),
      name: `workflow_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`,
      rootDir,
      nodes,
      edges,
      updatedAt: Date.now()
    }
    const all = loadWorkflows()
    saveWorkflows([wf, ...all].slice(0, 50))
    message.success('已保存为本地工作流')
    if (toArchive) {
      try {
        await appendArchive('workflow.saved', wf as any)
        message.success('已写入档案（Archive）')
      } catch (e) {
        message.warning(e instanceof Error ? e.message : '写入档案失败')
      }
    }
  }

  function saveBuilderDraft() {
    const payload = {
      rootDir,
      hideGlue,
      nodes,
      edges,
      updatedAt: Date.now()
    }
    localStorage.setItem(BUILDER_DRAFT_KEY, JSON.stringify(payload))
    message.success('已保存（页面可继续编辑）')
  }

  function saveBuilderDraftSilently() {
    const payload = {
      rootDir,
      hideGlue,
      nodes,
      edges,
      updatedAt: Date.now()
    }
    localStorage.setItem(BUILDER_DRAFT_KEY, JSON.stringify(payload))
  }

  const moduleSelectOptions = useMemo(
    () =>
      [{ value: '', label: '全部模块' }].concat(
        moduleNodes.map((m) => ({ value: String(m.key), label: String(m.key) }))
      ),
    [moduleNodes]
  )

  const filteredTree = useMemo(() => {
    if (!moduleFilter) return moduleNodes
    return moduleNodes.filter((m) => String(m.key) === moduleFilter)
  }, [moduleNodes, moduleFilter])

  return (
    <PageScaffold
      title="图形化搭建"
      description="将现有函数库拖拽到画布，连接成自动驾驶 workflow；右侧编辑输入/输出/参数并进行测试（当前为前端交互样例）。"
    >
      <div className="md:col-span-3">
        <Card title="模块与函数" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input value={rootDir} onChange={(e) => setRootDir(e.target.value)} placeholder="Root Dir" />
            <Select
              value={moduleFilter ?? ''}
              onChange={(v) => setModuleFilter(v ? String(v) : null)}
              options={moduleSelectOptions as any}
            />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索函数名/路径" />
            {treeLoading ? (
              <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>加载中…</Typography.Text>
            ) : null}
            <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>
              拖动函数到中间画布。点击模块可加载函数列表。
            </Typography.Text>
            <Tree
              treeData={filteredTree}
              showLine
              selectable={false}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys)}
              loadData={async (node) => {
                const moduleName = String(node.key)
                const loadedQ = loadedQueryByModule[moduleName]
                const loadedRoot = loadedRootDirByModule[moduleName]
                if (node.children && loadedQ === q && loadedRoot === rootDir) return
                await loadFunctionsForModule(moduleName)
              }}
            />

            <div style={{ marginTop: 10 }}>
              <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }}>模块库</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Input value={moduleLibraryQ} onChange={(e) => setModuleLibraryQ(e.target.value)} placeholder="搜索模块" allowClear />
              </div>
              <div style={{ marginTop: 8, maxHeight: 220, overflow: 'auto', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 8, padding: 8 }}>
                {moduleLibraryBusy ? (
                  <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>加载中…</Typography.Text>
                ) : moduleLibrary.length ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={6}>
                    {moduleLibrary.map((m: any) => (
                      <div key={String(m.module_key)} className="flex items-center justify-between gap-2">
                        <div style={{ minWidth: 0 }}>
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }} ellipsis>
                            {String(m.display_name || m.module_key)}
                          </Typography.Text>
                          <br />
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.5)' }}>
                            {String(m.node_count || 0)}/{String(m.edge_count || 0)} · {String(m.source || '')}
                          </Typography.Text>
                        </div>
                        <Space size={6}>
                          <Button size="small" onClick={() => openModuleDetail(String(m.module_key))}>
                            详情
                          </Button>
                          <Button size="small" onClick={() => void loadModuleToCanvas(String(m.module_key))} disabled={busy}>
                            加载
                          </Button>
                        </Space>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>暂无模块</Typography.Text>
                )}
              </div>
            </div>
          </Space>
        </Card>
      </div>

      <div className="md:col-span-7">
        <Card
          title="工作流画布"
          size="small"
          bordered={false}
          style={{ background: 'rgba(9, 9, 11, 0.6)' }}
          styles={{ body: { padding: 0 } }}
          extra={
            <Space wrap>
              <Button onClick={clearCanvas} disabled={nodes.length === 0}>
                清除
              </Button>
              <Button onClick={runAutoLayout} disabled={nodes.length < 2}>
                自动布局
              </Button>
              <Space size={6}>
                <Typography.Text style={{ color: 'rgba(244,244,245,0.65)' }}>隐藏胶水</Typography.Text>
                <Switch checked={hideGlue} onChange={(v) => setHideGlue(v)} />
              </Space>
              <Button onClick={() => setPendingFromId(selectedNodeId)} disabled={!selectedNodeId}>
                从当前节点开始连线
              </Button>
              <Button danger onClick={deleteSelected} disabled={!selectedNodeId && !selectedEdgeId}>
                删除
              </Button>
              <Button onClick={saveBuilderDraft} disabled={nodes.length === 0}>
                保存
              </Button>
              <Button
                onClick={() => {
                  saveBuilderDraftSilently()
                  void saveWorkflow(true)
                }}
                disabled={nodes.length === 0}
              >
                保存并写入档案
              </Button>
              <Button onClick={openSaveModule} disabled={nodes.length === 0}>
                保存为模块
              </Button>
            </Space>
          }
        >
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            pendingFromId={pendingFromId}
            onSelectNode={selectNode}
            onSelectEdge={selectEdge}
            onSetPendingFrom={setPendingFromId}
            onAddNode={(n) => setNodes((prev) => [...prev, n])}
            onUpdateNodePos={updateNodePos}
            onUpdateNodePosBatch={updateNodePosBatch}
            onAddEdge={(e) => setEdges((prev) => [...prev, e])}
            onDeleteNode={removeNode}
            onDeleteEdge={removeEdge}
            canvasRef={canvasRef}
            rootDir={rootDir}
            hideGlue={hideGlue}
            resetViewToken={canvasResetToken}
            fitViewToken={fitViewToken}
          />
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card title="属性与测试" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <WorkflowInspector
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onUpdateNode={updateNode}
            onRemoveNode={removeNode}
            onRemoveEdge={removeEdge}
            onRunTest={async (node) => runTest(node)}
            busy={busy}
          />
        </Card>
      </div>

      <FunctionDetailDrawer
        open={drawerOpen}
        functionId={drawerFunctionId}
        rootDir={rootDir}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => void 0}
      />

      <Modal
        title="保存为模块（可覆盖旧模块）"
        open={saveModuleOpen}
        onCancel={() => setSaveModuleOpen(false)}
        onOk={() => void saveAsModule()}
        okText="保存"
        confirmLoading={busy}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Typography.Text>module_key</Typography.Text>
            <Input value={saveModuleKey} onChange={(e) => setSaveModuleKey(e.target.value)} placeholder="例如：planning_speed_module" />
          </div>
          <div>
            <Typography.Text>模块名</Typography.Text>
            <Input value={saveModuleName} onChange={(e) => setSaveModuleName(e.target.value)} placeholder="用于列表展示" />
          </div>
          <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>
            保存内容为当前画布的节点与连线；相同 module_key 会直接覆盖。
          </Typography.Text>
        </Space>
      </Modal>

      <ModuleDetailDrawer open={moduleDetailOpen} moduleKey={moduleDetailKey} onClose={() => setModuleDetailOpen(false)} />
    </PageScaffold>
  )
}
