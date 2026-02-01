import { PageScaffold } from '../PageScaffold'
import { Button, Card, Input, Select, Space, Tree, Typography, message } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ragListFunctions, ragListModules, ragRunTest } from '../../utils/api'
import { WorkflowCanvas } from '../../components/graph/WorkflowCanvas'
import { WorkflowInspector } from '../../components/graph/WorkflowInspector'
import type { WorkflowDraft, WorkflowEdge, WorkflowNode } from '../../components/graph/workflowTypes'
import { newId } from '../../components/graph/graphUtils'
import { FunctionDetailDrawer } from '../../components/rag/FunctionDetailDrawer'
import { useArchiveStore } from '../../store/archiveStore'

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
  const [pendingFromId, setPendingFromId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerFunctionId, setDrawerFunctionId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement | null>(null)

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId])

  function removeNode(id: string) {
    if (selectedNodeId === id) setSelectedNodeId(null)
    if (pendingFromId === id) setPendingFromId(null)
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id))
    setNodes((prev) => prev.filter((n) => n.id !== id))
  }

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

  async function loadFunctionsForModule(moduleName: string) {
    setTreeLoading(true)
    try {
      const res = await ragListFunctions({ root_dir: rootDir, module: moduleName, q: q || undefined, limit: 200, offset: 0 })
      const items = (res.items || []).map((it: any) => {
        const payload = {
          function_id: String(it.function_id),
          display_name: String(it.display_name || it.signature || it.function_id),
          module: String(it.module || moduleName),
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
      setPendingFromId(null)
      return
    }
    setSelectedNodeId(nid)
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

  function updateNode(id: string, patch: Partial<WorkflowNode>) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
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
          </Space>
        </Card>
      </div>

      <div className="md:col-span-6">
        <Card
          title="工作流画布"
          size="small"
          bordered={false}
          style={{ background: 'rgba(9, 9, 11, 0.6)' }}
          extra={
            <Space wrap>
              <Button onClick={() => setPendingFromId(selectedNodeId)} disabled={!selectedNodeId}>
                从当前节点开始连线
              </Button>
              <Button onClick={() => setPendingFromId(null)} disabled={!pendingFromId}>
                取消连线
              </Button>
              <Button onClick={() => void saveWorkflow(false)} disabled={nodes.length === 0}>
                保存
              </Button>
              <Button onClick={() => void saveWorkflow(true)} disabled={nodes.length === 0}>
                保存并写入档案
              </Button>
            </Space>
          }
        >
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            pendingFromId={pendingFromId}
            onSelectNode={selectNode}
            onSetPendingFrom={setPendingFromId}
            onAddNode={(n) => setNodes((prev) => [...prev, n])}
            onUpdateNodePos={updateNodePos}
            onAddEdge={(e) => setEdges((prev) => [...prev, e])}
            onDeleteNode={removeNode}
            canvasRef={canvasRef}
            rootDir={rootDir}
          />
          <Typography.Paragraph style={{ marginTop: 10, color: 'rgba(244,244,245,0.55)' }}>
            说明：拖动节点可移动；从节点右侧圆点拖到目标节点左侧圆点即可创建正交圆角连线。
          </Typography.Paragraph>
        </Card>
      </div>

      <div className="md:col-span-3">
        <Card title="属性与测试" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <WorkflowInspector
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onUpdateNode={updateNode}
            onRemoveNode={removeNode}
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
    </PageScaffold>
  )
}
