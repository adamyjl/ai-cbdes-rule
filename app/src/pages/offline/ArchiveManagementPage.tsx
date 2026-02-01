import { PageScaffold } from '../PageScaffold'
import { Button, Card, Popconfirm, Space, Table, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ArchiveEvent } from '../../utils/api'
import { archiveList, ragDeleteByRootDir } from '../../utils/api'

const TASK_INPUT_STORAGE_KEY = 'online:task_input_state:v1'
const COT_STORAGE_KEY = 'online:cot_routing_state:v2'
const ORCH_STORAGE_KEY = 'online:orchestrator_state:v1'
const GATE_STORAGE_KEY = 'online:gate_state:v1'
const RELEASE_STORAGE_KEY = 'online:release_state:v1'

function parseListItems(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^([-*]|\d+\.)\s+(.*)$/)
    const v = (m ? m[2] : line).trim()
    if (!v) continue
    if (!out.includes(v)) out.push(v)
  }
  return out
}

export function ArchiveManagementPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<ArchiveEvent[]>([])
  const [busy, setBusy] = useState(false)

  const columns = useMemo(
    () =>
      [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 160, ellipsis: true },
        {
          title: '时间',
          key: 'ts',
          width: 190,
          render: (_: unknown, r: ArchiveEvent) => {
            const ts = (r as any).ts
            if (!ts) return <span>-</span>
            const d = new Date(String(ts))
            return <span>{Number.isFinite(d.getTime()) ? d.toLocaleString() : String(ts)}</span>
          }
        },
        { title: '类型', dataIndex: 'type', key: 'type', width: 140 },
        {
          title: 'Root Dir',
          key: 'root_dir',
          width: 360,
          render: (_: unknown, r: ArchiveEvent) => {
            const v = (r.payload as any)?.root_dir
            return v ? (
              <Typography.Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {String(v)}
              </Typography.Text>
            ) : (
              <span>-</span>
            )
          }
        },
        {
          title: '新增函数',
          key: 'added',
          width: 110,
          render: (_: unknown, r: ArchiveEvent) => {
            const payload = (r.payload as any) || {}
            const v = payload.added ?? payload.upserted
            if (v == null) return <span>-</span>
            const n = typeof v === 'number' ? v : Number(v)
            return Number.isFinite(n) ? <span>{n}</span> : <span>-</span>
          }
        },
        {
          title: 'Payload',
          dataIndex: 'payload',
          key: 'payload',
          render: (v: unknown) => (
            <Typography.Text ellipsis={{ tooltip: JSON.stringify(v) }}>{JSON.stringify(v)}</Typography.Text>
          )
        },
        {
          title: '操作',
          key: 'actions',
          width: 160,
          render: (_: unknown, r: ArchiveEvent) => {
            const root = (r.payload as any)?.root_dir
            const isRagIndex = r.type === 'rag.index' || r.type === 'rag.index_job'
            const isTaskAnalyze = r.type === 'task.analyze'
            const isCotDisambiguation = r.type === 'cot.disambiguation'
            const isOrchestratorGenerate = r.type === 'orchestrator.generate'
            const isGateRun = r.type === 'gate.run'
            const isReleasePublish = r.type === 'release.publish'

            if (isTaskAnalyze) {
              return (
                <Button
                  size="small"
                  onClick={() => {
                    try {
                      const payload = (r.payload as any) || {}
                      const rootDir = String(payload.root_dir || '')
                      const taskDraft = payload.task_draft && typeof payload.task_draft === 'object' ? payload.task_draft : null
                      const analysisMarkdown = String(payload.analysis_markdown || '')
                      const analysisRagQuery = String(payload.rag_query || '')
                      const analysisHits = Array.isArray(payload.rag_hits) ? payload.rag_hits : []

                      localStorage.setItem(
                        TASK_INPUT_STORAGE_KEY,
                        JSON.stringify({
                          rootDir,
                          taskDraft,
                          analysisMarkdown,
                          analysisRagQuery,
                          analysisHits
                        })
                      )
                      navigate('/online/task')
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : '重载失败')
                    }
                  }}
                >
                  重新加载任务
                </Button>
              )
            }

            if (isCotDisambiguation) {
              return (
                <Button
                  size="small"
                  onClick={() => {
                    try {
                      const payload = (r.payload as any) || {}
                      const rootDir = String(payload.root_dir || '')
                      const sections = payload.sections && typeof payload.sections === 'object' ? payload.sections : {}
                      const lists = payload.lists && typeof payload.lists === 'object' ? payload.lists : {}
                      const related = Array.isArray(payload.related) ? payload.related : []
                      const confirmed = String(payload.confirmed || '')
                      localStorage.setItem(
                        COT_STORAGE_KEY,
                        JSON.stringify({
                          rootDir,
                          goal: String(sections.goal || ''),
                          constraints: String(sections.constraints || ''),
                          subtasks: String(sections.subtasks || ''),
                          riskItems: Array.isArray((lists as any).riskItems)
                            ? (lists as any).riskItems
                            : parseListItems(String((sections as any).risks || '')),
                          missingItems: Array.isArray((lists as any).missingItems)
                            ? (lists as any).missingItems
                            : parseListItems(String((sections as any).missing || '')),
                          relatedRows: related,
                          confirmed
                        })
                      )
                      navigate('/online/routing')
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : '重载失败')
                    }
                  }}
                >
                  重新加载消歧
                </Button>
              )
            }

            if (isOrchestratorGenerate) {
              return (
                <Button
                  size="small"
                  onClick={() => {
                    try {
                      const payload = (r.payload as any) || {}
                      localStorage.setItem(
                        ORCH_STORAGE_KEY,
                        JSON.stringify({
                          selectedEventId: String(r.id),
                          basePrompt: '',
                          finalPrompt: String(payload.prompt || ''),
                          resultRaw: String(payload.code || payload.result || ''),
                          log: String(payload.log || ''),
                          keyPoints: Array.isArray(payload.key_points) ? payload.key_points : []
                        })
                      )
                      navigate('/online/orchestration')
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : '重载失败')
                    }
                  }}
                >
                  重新加载生成
                </Button>
              )
            }

            if (isGateRun) {
              return (
                <Button
                  size="small"
                  onClick={() => {
                    try {
                      const payload = (r.payload as any) || {}
                      const cfg = payload.config && typeof payload.config === 'object' ? payload.config : {}
                      localStorage.setItem(
                        GATE_STORAGE_KEY,
                        JSON.stringify({
                          selectedEventId: String(r.id),
                          workDir: String((cfg as any).work_dir || ''),
                          compileCommand: String((cfg as any).compile_command || ''),
                          staticCommand: String((cfg as any).static_command || ''),
                          enableUnit: Boolean((cfg as any).enable_unit),
                          enableCoverage: Boolean((cfg as any).enable_coverage),
                          requirementPrompt: String(payload.requirement_prompt || ''),
                          generatedResult: String(payload.generated_result || ''),
                          jobId: String(payload.job_id || ''),
                          stage: String(payload.stage || 'idle'),
                          statuses: Array.isArray(payload.statuses) ? payload.statuses : [],
                          logLines: Array.isArray(payload.log_lines) ? payload.log_lines : []
                        })
                      )
                      navigate('/online/testing')
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : '重载失败')
                    }
                  }}
                >
                  重新加载门禁
                </Button>
              )
            }

            if (isReleasePublish) {
              return (
                <Button
                  size="small"
                  onClick={() => {
                    try {
                      const payload = (r.payload as any) || {}
                      localStorage.setItem(
                        RELEASE_STORAGE_KEY,
                        JSON.stringify({
                          selectedGateEventId: String(payload.source_gate_event_id || ''),
                          version: String(payload.version || ''),
                          generatedResult: String(payload.generated_result || ''),
                          fileSplits: Array.isArray(payload.file_splits) ? payload.file_splits : [],
                          functionSplits: Array.isArray(payload.function_splits) ? payload.function_splits : [],
                          ragRootDir: String((payload.rag_index as any)?.root_dir || ''),
                          ragItems: Array.isArray(payload.rag_items) ? payload.rag_items : [],
                          namespace: String(payload.namespace || 'default'),
                          modules: Array.isArray(payload.modules) ? payload.modules : [],
                          publishedArchiveId: String(r.id)
                        })
                      )
                      navigate('/online/release')
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : '重载失败')
                    }
                  }}
                >
                  重新加载发布
                </Button>
              )
            }

            if (isRagIndex && root) {
              return (
                <Popconfirm
                  title="删除该次索引的所有函数？"
                  description="会从函数库中删除该 root_dir 下的全部函数（不可恢复）。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={async () => {
                    try {
                      const res = await ragDeleteByRootDir(String(root))
                      message.success(`已删除 ${res.deleted} 个函数`)
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : '删除失败')
                    }
                  }}
                >
                  <Button danger size="small">
                    删除本次索引函数
                  </Button>
                </Popconfirm>
              )
            }

            return <span>-</span>
          }
        }
      ] as const,
    []
  )

  async function reload() {
    setBusy(true)
    try {
      setEvents(await archiveList(50))
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setBusy(false)
    }
  }


  useEffect(() => {
    void reload()
  }, [])

  return (
    <PageScaffold
      title="档案管理"
      description="记录智能体行为（加载/更新/问答/编排/门禁/回滚），并支持回放与审计。"
    >
      <div className="md:col-span-12">
        <Card
          title={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>事件列表</span>
              <Space wrap>
                <Button onClick={reload} loading={busy}>
                  刷新
                </Button>
              </Space>
            </div>
          }
          size="small"
          bordered={false}
          style={{ background: 'rgba(9, 9, 11, 0.6)' }}
        >
          <Table
            size="small"
            className="dark-table"
            rowKey="id"
            columns={columns as any}
            dataSource={events}
            loading={busy}
            scroll={{ x: 1400, y: 520 }}
            pagination={{ pageSize: 8 }}
          />
        </Card>
      </div>
    </PageScaffold>
  )
}
