import { PageScaffold } from '../PageScaffold'
import { Button, Card, Divider, Form, Input, Popconfirm, Select, Space, Table, Tabs, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { archiveList, ragListFunctions, ragListModules, taskAnalyze } from '../../utils/api'
import type { TaskAnalysisHit } from '../../utils/api'
import { FunctionDetailDrawer } from '../../components/rag/FunctionDetailDrawer'
import { useArchiveStore } from '../../store/archiveStore'

const TASK_INPUT_STORAGE_KEY = 'online:task_input_state:v1'

function emptyTaskDraft() {
  return {
    targetModule: 'planning',
    intent: 'new',
    description: '',
    featureDescription: '',
    inputSpec: '{\n  "input": ""\n}',
    outputSpec: '{\n  "output": ""\n}',
    generationQuestion: '',
    selectedFunctionIds: [],
    selectedWorkflowId: null
  }
}

type WorkflowDraft = {
  id: string
  name: string
  rootDir: string
  nodes: any[]
  edges: any[]
  updatedAt: number
}

function loadWorkflows(): WorkflowDraft[] {
  try {
    const raw = localStorage.getItem('online:workflows')
    if (!raw) return []
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as WorkflowDraft[]) : []
  } catch {
    return []
  }
}

function loadTaskInputState() {
  try {
    const raw = localStorage.getItem(TASK_INPUT_STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

function saveTaskInputState(v: any) {
  try {
    localStorage.setItem(TASK_INPUT_STORAGE_KEY, JSON.stringify(v))
  } catch {
    return
  }
}

function clearTaskInputState() {
  try {
    localStorage.removeItem(TASK_INPUT_STORAGE_KEY)
  } catch {
    return
  }
}

export function TaskInputPage() {
  const appendArchive = useArchiveStore((s) => s.append)
  const taskDraft = useAppStore((s) => s.taskDraft)
  const setTaskDraft = useAppStore((s) => s.setTaskDraft)
  const [workflows, setWorkflows] = useState<WorkflowDraft[]>([])
  const [archiveWorkflows, setArchiveWorkflows] = useState<WorkflowDraft[]>([])

  const [activeTab, setActiveTab] = useState<'functions' | 'modules'>('functions')
  const [rootDir, setRootDir] = useState('data\\THICV-Pilot_master')
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined)
  const [q, setQ] = useState('')
  const [modules, setModules] = useState<{ module: string; count: number; embedded: number }[]>([])
  const [fnItems, setFnItems] = useState<any[]>([])
  const [fnTotal, setFnTotal] = useState(0)
  const [fnOffset, setFnOffset] = useState(0)
  const [fnLoading, setFnLoading] = useState(false)

  const [analysisBusy, setAnalysisBusy] = useState(false)
  const [analysisMarkdown, setAnalysisMarkdown] = useState('')
  const [analysisRagQuery, setAnalysisRagQuery] = useState('')
  const [analysisHits, setAnalysisHits] = useState<TaskAnalysisHit[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerFunctionId, setDrawerFunctionId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = loadTaskInputState()
    if (saved) {
      if (typeof saved.rootDir === 'string') setRootDir(saved.rootDir)
      if (saved.taskDraft && typeof saved.taskDraft === 'object') {
        setTaskDraft(saved.taskDraft)
      }
      if (typeof saved.analysisMarkdown === 'string') setAnalysisMarkdown(saved.analysisMarkdown)
      if (typeof saved.analysisRagQuery === 'string') setAnalysisRagQuery(saved.analysisRagQuery)
      if (Array.isArray(saved.analysisHits)) setAnalysisHits(saved.analysisHits)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveTaskInputState({
      rootDir,
      taskDraft,
      analysisMarkdown,
      analysisRagQuery,
      analysisHits
    })
  }, [hydrated, rootDir, taskDraft, analysisMarkdown, analysisRagQuery, analysisHits])

  useEffect(() => {
    setWorkflows(loadWorkflows())
    void (async () => {
      try {
        const events = await archiveList(80)
        const wfs = events
          .filter((e) => String(e.type) === 'workflow.saved')
          .map((e) => e.payload as any)
          .filter((p) => p && typeof p === 'object' && p.id && p.name)
          .map(
            (p) =>
              ({
                id: String(p.id),
                name: String(p.name),
                rootDir: String(p.rootDir || ''),
                nodes: Array.isArray(p.nodes) ? p.nodes : [],
                edges: Array.isArray(p.edges) ? p.edges : [],
                updatedAt: Number(p.updatedAt || 0)
              }) as WorkflowDraft
          )
        setArchiveWorkflows(wfs)
      } catch {
        setArchiveWorkflows([])
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const res = await ragListModules(rootDir)
        setModules((res.modules || []) as any)
      } catch (e) {
        message.error(e instanceof Error ? e.message : '加载模块失败')
      }
    })()
  }, [rootDir])

  useEffect(() => {
    void (async () => {
      setFnLoading(true)
      try {
        const res = await ragListFunctions({
          root_dir: rootDir,
          module: moduleFilter,
          q: q || undefined,
          limit: 60,
          offset: fnOffset
        })
        setFnItems(res.items || [])
        setFnTotal(Number(res.total || 0))
      } catch (e) {
        message.error(e instanceof Error ? e.message : '加载函数库失败')
      } finally {
        setFnLoading(false)
      }
    })()
  }, [rootDir, moduleFilter, q, fnOffset])

  const moduleOptions = useMemo(
    () =>
      [
        { value: 'common', label: 'Common' },
        { value: 'perception', label: 'Perception' },
        { value: 'planning', label: 'Planning' },
        { value: 'decision', label: 'Decision' },
        { value: 'localization', label: 'Localization' },
        { value: 'control', label: 'Control' }
      ] as const,
    []
  )

  const intentOptions = useMemo(
    () =>
      [
        { value: 'new', label: 'New' },
        { value: 'fix', label: 'Fix' },
        { value: 'refactor', label: 'Refactor' },
        { value: 'adapt', label: 'Adapt' },
        { value: 'performance', label: 'Performance' }
      ] as const,
    []
  )

  return (
    <PageScaffold
      title="任务输入"
      description="将口头需求转为可执行工单：拖拽函数卡 + 自然语言 + 结构化约束，右侧实时生成验收/KPI/缺口清单。"
    >
      <div className="md:col-span-4">
        <Card title="函数库 / 模块库" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as any)}
            items={[
              {
                key: 'functions',
                label: '函数库',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    <Input value={rootDir} onChange={(e) => setRootDir(e.target.value)} placeholder="Root Dir" />
                    <Space wrap>
                      <Select
                        allowClear
                        style={{ minWidth: 140 }}
                        value={moduleFilter}
                        onChange={(v) => {
                          setFnOffset(0)
                          setModuleFilter(v)
                        }}
                        placeholder="模块过滤"
                        options={modules.map((m) => ({ value: m.module, label: `${m.module} (${m.count})` })) as any}
                      />
                      <Input
                        value={q}
                        onChange={(e) => {
                          setFnOffset(0)
                          setQ(e.target.value)
                        }}
                        placeholder="搜索函数名/路径"
                      />
                    </Space>
                    <Table
                      size="small"
                      rowKey="function_id"
                      loading={fnLoading}
                      pagination={{
                        current: Math.floor(fnOffset / 60) + 1,
                        pageSize: 60,
                        total: fnTotal,
                        onChange: (p) => setFnOffset((p - 1) * 60)
                      }}
                      columns={[
                        { title: '名称', dataIndex: 'display_name', key: 'display_name', ellipsis: true },
                        { title: '模块', dataIndex: 'module', key: 'module', width: 96 },
                        {
                          title: '操作',
                          key: 'op',
                          width: 70,
                          render: (_: any, r: any) => (
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                const id = String(r.function_id)
                                const next = Array.from(new Set([...(taskDraft.selectedFunctionIds || []), id]))
                                setTaskDraft({ selectedFunctionIds: next })
                              }}
                            >
                              加入
                            </Button>
                          )
                        }
                      ]}
                      dataSource={fnItems}
                      onRow={(r: any) => ({
                        onClick: () => {
                          setDrawerFunctionId(String(r.function_id))
                          setDrawerOpen(true)
                        }
                      })}
                    />
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>
                      点击行查看详情；点击“加入”将函数链接到任务。
                    </Typography.Text>
                  </Space>
                )
              },
              {
                key: 'modules',
                label: '模块库',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>来自图形化搭建（本地）</Typography.Text>
                    <Select
                      allowClear
                      value={taskDraft.selectedWorkflowId ?? undefined}
                      options={workflows.map((w) => ({ value: w.id, label: `${w.name} (${w.nodes.length} 节点)` })) as any}
                      onChange={(v) => setTaskDraft({ selectedWorkflowId: v ? String(v) : null })}
                      placeholder="选择已搭建模块（本地）"
                    />
                    <Divider style={{ borderColor: 'rgba(63,63,70,0.6)', margin: '8px 0' }} />
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>来自档案库（Archive）</Typography.Text>
                    <Select
                      allowClear
                      value={undefined}
                      options={archiveWorkflows.map((w) => ({ value: w.id, label: `${w.name} (${w.nodes.length} 节点)` })) as any}
                      onChange={(v) => {
                        const wf = archiveWorkflows.find((x) => x.id === String(v))
                        if (!wf) return
                        setTaskDraft({ selectedWorkflowId: wf.id })
                        message.success('已选择档案模块（仅引用）')
                      }}
                      placeholder="从档案选择模块"
                    />
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>
                      说明：当前仅保存/引用模块结构摘要，后续可扩展为可执行工作流。
                    </Typography.Text>
                  </Space>
                )
              }
            ]}
          />
        </Card>
      </div>
      <div className="md:col-span-5">
        <Card title="结构化工单" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Form layout="vertical">
            <Form.Item label="目标模块">
              <Select
                value={taskDraft.targetModule}
                options={moduleOptions as any}
                onChange={(v) => setTaskDraft({ targetModule: v })}
              />
            </Form.Item>
            <Form.Item label="意图类型">
              <Select
                value={taskDraft.intent}
                options={intentOptions as any}
                onChange={(v) => setTaskDraft({ intent: v })}
              />
            </Form.Item>
            <Form.Item label="代码功能描述" required>
              <Input.TextArea
                value={taskDraft.featureDescription}
                onChange={(e) => setTaskDraft({ featureDescription: e.target.value })}
                rows={6}
                placeholder="描述要实现/修改的代码功能、约束、边界"
              />
            </Form.Item>
            <Form.Item label="输入（JSON / Schema）">
              <Input.TextArea
                value={taskDraft.inputSpec}
                onChange={(e) => setTaskDraft({ inputSpec: e.target.value })}
                rows={5}
                placeholder="输入字段/单位/坐标系等"
              />
            </Form.Item>
            <Form.Item label="输出（JSON / Schema）">
              <Input.TextArea
                value={taskDraft.outputSpec}
                onChange={(e) => setTaskDraft({ outputSpec: e.target.value })}
                rows={5}
                placeholder="输出字段/单位/约束等"
              />
            </Form.Item>
            <Form.Item label="代码生成问题（要问 LLM 的问题）" required>
              <Input.TextArea
                value={taskDraft.generationQuestion}
                onChange={(e) => setTaskDraft({ generationQuestion: e.target.value })}
                rows={4}
                placeholder="例如：基于已选函数/模块，实现xxx，并给出 patch" 
              />
            </Form.Item>

            <Divider style={{ borderColor: 'rgba(63,63,70,0.6)' }} />
            <Form.Item label="已链接函数">
              <Space direction="vertical" style={{ width: '100%' }}>
                {(taskDraft.selectedFunctionIds || []).length === 0 ? (
                  <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>尚未选择函数</Typography.Text>
                ) : (
                  (taskDraft.selectedFunctionIds || []).slice(0, 30).map((fid) => (
                    <div key={fid} className="flex items-start justify-between gap-3" style={{ width: '100%' }}>
                      <Typography.Text
                        style={{ color: 'rgba(244,244,245,0.8)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', flex: 1 }}
                        copyable={{ text: fid }}
                      >
                        {fid}
                      </Typography.Text>
                      <Button
                        size="small"
                        onClick={() =>
                          setTaskDraft({ selectedFunctionIds: (taskDraft.selectedFunctionIds || []).filter((x) => x !== fid) })
                        }
                      >
                        移除
                      </Button>
                    </div>
                  ))
                )}
              </Space>
            </Form.Item>
            <Form.Item label="已选择模块（工作流）">
              <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>
                {taskDraft.selectedWorkflowId || '-'}
              </Typography.Text>
            </Form.Item>
          </Form>
        </Card>
      </div>
      <div className="md:col-span-3">
        <Card title="问题分析与RAG关联" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Button
              type="primary"
              loading={analysisBusy}
              disabled={!taskDraft.generationQuestion && !taskDraft.featureDescription}
              onClick={() => {
                void (async () => {
                  setAnalysisBusy(true)
                  try {
                    const wf = (taskDraft.selectedWorkflowId
                      ? workflows.find((w) => w.id === taskDraft.selectedWorkflowId) ||
                        archiveWorkflows.find((w) => w.id === taskDraft.selectedWorkflowId) ||
                        null
                      : null) as any
                    const res = await taskAnalyze({
                      target_module: taskDraft.targetModule,
                      intent: taskDraft.intent,
                      description: taskDraft.description,
                      feature_description: taskDraft.featureDescription,
                      input_spec: taskDraft.inputSpec,
                      output_spec: taskDraft.outputSpec,
                      generation_question: taskDraft.generationQuestion,
                      selected_function_ids: taskDraft.selectedFunctionIds || [],
                      selected_workflow: wf
                        ? { id: wf.id, name: wf.name, rootDir: wf.rootDir, nodes: wf.nodes?.length || 0, edges: wf.edges?.length || 0 }
                        : null,
                      root_dir: rootDir,
                      rag_top_k: 8
                    })
                    if (!res.ok) throw new Error(res.error || 'analysis_failed')
                    const nextAnalysisMarkdown = String(res.analysis_markdown || '')
                    const nextAnalysisRagQuery = String(res.rag_query || '')
                    const nextAnalysisHits = (res.rag_hits || []) as any
                    setAnalysisMarkdown(nextAnalysisMarkdown)
                    setAnalysisRagQuery(nextAnalysisRagQuery)
                    setAnalysisHits(nextAnalysisHits)
                    saveTaskInputState({
                      rootDir,
                      taskDraft,
                      analysisMarkdown: nextAnalysisMarkdown,
                      analysisRagQuery: nextAnalysisRagQuery,
                      analysisHits: nextAnalysisHits
                    })
                    try {
                      await appendArchive('task.analyze', {
                        root_dir: rootDir,
                        task_draft: taskDraft,
                        analysis_markdown: nextAnalysisMarkdown,
                        rag_query: nextAnalysisRagQuery,
                        rag_hits: nextAnalysisHits
                      })
                    } catch {
                    }
                    message.success('分析完成')
                  } catch (e) {
                    message.error(e instanceof Error ? e.message : '分析失败')
                  } finally {
                    setAnalysisBusy(false)
                  }
                })()
              }}
            >
              问题分析
            </Button>

            <Popconfirm
              title="清空本页所有输入与分析结果？"
              description="会清空结构化工单、已链接函数、分析结果，并移除本页本地缓存。"
              okText="清空"
              cancelText="取消"
              onConfirm={() => {
                clearTaskInputState()
                setRootDir('data\\THICV-Pilot_master')
                setModuleFilter(undefined)
                setQ('')
                setFnOffset(0)
                setActiveTab('functions')
                setTaskDraft(emptyTaskDraft() as any)
                setAnalysisMarkdown('')
                setAnalysisRagQuery('')
                setAnalysisHits([])
                message.success('已清空')
              }}
            >
              <Button danger disabled={analysisBusy}>
                清除
              </Button>
            </Popconfirm>

            <Card size="small" title="分析结果" bordered={false} style={{ background: 'rgba(24,24,27,0.6)' }}>
              {analysisMarkdown ? (
                <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'rgba(244,244,245,0.78)' }}>
                  {analysisMarkdown}
                </Typography.Paragraph>
              ) : (
                <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>点击“问题分析”生成初步分析。</Typography.Text>
              )}
            </Card>

            <Card size="small" title="RAG 关联" bordered={false} style={{ background: 'rgba(24,24,27,0.6)' }}>
              {analysisRagQuery ? (
                <Typography.Text style={{ color: 'rgba(244,244,245,0.6)' }}>query: {analysisRagQuery}</Typography.Text>
              ) : null}
              <Divider style={{ borderColor: 'rgba(63,63,70,0.6)', margin: '8px 0' }} />
              <Table
                size="small"
                rowKey="function_id"
                pagination={false}
                columns={[
                  { title: '函数', dataIndex: 'name', key: 'name', ellipsis: true },
                  { title: '模块', dataIndex: 'module', key: 'module', width: 72 },
                  {
                    title: '加入',
                    key: 'add',
                    width: 64,
                    render: (_: any, r: any) => (
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          const id = String(r.function_id)
                          const next = Array.from(new Set([...(taskDraft.selectedFunctionIds || []), id]))
                          setTaskDraft({ selectedFunctionIds: next })
                        }}
                      >
                        +
                      </Button>
                    )
                  }
                ]}
                dataSource={analysisHits}
                onRow={(r: any) => ({
                  onClick: () => {
                    setDrawerFunctionId(String(r.function_id))
                    setDrawerOpen(true)
                  }
                })}
              />
            </Card>
          </Space>
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
