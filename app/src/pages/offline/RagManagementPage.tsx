import { PageScaffold } from '../PageScaffold'
import { Button, Card, Form, Input, InputNumber, Progress, Select, Space, Switch, Table, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import type { RagQueryHit } from '../../utils/api'
import type { RagIndexJobStatus } from '../../utils/api'
import type { RagBackfillDocsJob } from '../../utils/api'
import type { RagModuleIndexJobStatus } from '../../utils/api'
import type { RagKindJobStatus } from '../../utils/api'
import {
  ragCancelBackfillDocsJob,
  ragCancelKindJob,
  ragCancelIndexJob,
  ragGetBackfillDocsJob,
  ragGetKindJob,
  ragGetIndexJob,
  ragGetModuleIndexJob,
  ragQuery,
  ragScan,
  ragStartModuleIndexJob,
  ragStartBackfillDocsJob,
  ragStartKindJob,
  ragStartIndexJob
} from '../../utils/api'
import { archiveAppend } from '../../utils/api'
import { FunctionDetailDrawer } from '../../components/rag/FunctionDetailDrawer'
import { FunctionIndexBrowser } from '../../components/rag/FunctionIndexBrowser'
import { ModuleDetailDrawer } from '../../components/rag/ModuleDetailDrawer'
import { ModuleIndexBrowser } from '../../components/rag/ModuleIndexBrowser'

export function RagManagementPage() {
  const [rootDir, setRootDir] = useState('data\\THICV-Pilot_master')
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [busy, setBusy] = useState(false)
  const [hits, setHits] = useState<RagQueryHit[]>([])
  const [module, setModule] = useState<string | undefined>(undefined)
  const [enrich, setEnrich] = useState(true)
  const [browserRefreshToken, setBrowserRefreshToken] = useState(0)
  const [indexJobId, setIndexJobId] = useState<string | null>(null)
  const [indexJob, setIndexJob] = useState<RagIndexJobStatus | null>(null)
  const [indexPolling, setIndexPolling] = useState(false)
  const [backfillJobId, setBackfillJobId] = useState<string | null>(null)
  const [backfillJob, setBackfillJob] = useState<RagBackfillDocsJob | null>(null)
  const [backfillPolling, setBackfillPolling] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null)

  const [moduleJobId, setModuleJobId] = useState<string | null>(null)
  const [moduleJob, setModuleJob] = useState<RagModuleIndexJobStatus | null>(null)
  const [modulePolling, setModulePolling] = useState(false)
  const [moduleBrowserRefreshToken, setModuleBrowserRefreshToken] = useState(0)
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false)
  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null)

  const [kindJobId, setKindJobId] = useState<string | null>(null)
  const [kindJob, setKindJob] = useState<RagKindJobStatus | null>(null)
  const [kindPolling, setKindPolling] = useState(false)

  const columns = useMemo(
    () =>
      [
        { title: '函数 ID', dataIndex: 'function_id', key: 'function_id' },
        { title: '名称', dataIndex: 'name', key: 'name' },
        { title: '模块', dataIndex: 'module', key: 'module' },
        { title: '文件', dataIndex: 'file_path', key: 'file_path', ellipsis: true },
        {
          title: '相似度',
          dataIndex: 'score',
          key: 'score',
          render: (v: number) => <span>{Number.isFinite(v) ? v.toFixed(3) : '-'}</span>
        }
      ] as const,
    []
  )

  async function runScan() {
    setBusy(true)
    try {
      const res = await ragScan(rootDir)
      message.success(`扫描完成：files=${res.files} functions=${res.functions}`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '扫描失败')
    } finally {
      setBusy(false)
    }
  }

  async function startIndexJob(opts: { enrich: boolean; max_functions?: number | null; startedMsg: string; doneMsg: string }) {
    if (indexPolling) return
    setBusy(true)
    try {
      const started = await ragStartIndexJob(rootDir, { enrich: opts.enrich, max_functions: opts.max_functions ?? null })
      setIndexJobId(started.job_id)
      setIndexJob(null)
      setIndexPolling(true)
      message.success(opts.startedMsg)

      void (async () => {
        try {
          while (true) {
            const st = await ragGetIndexJob(started.job_id)
            if (!st.ok || !st.job) {
              throw new Error(st.error || '获取索引进度失败')
            }
            setIndexJob(st.job)
            if (st.job.stage === 'done') {
              message.success(opts.doneMsg)
              setBrowserRefreshToken((v) => v + 1)
              return
            }
            if (st.job.stage === 'error') {
              throw new Error(st.job.error || '索引失败')
            }
            if (st.job.stage === 'canceled') {
              message.info('索引已取消')
              return
            }
            await new Promise((r) => setTimeout(r, 800))
          }
        } catch (e) {
          message.error(e instanceof Error ? e.message : '索引失败')
        } finally {
          setIndexPolling(false)
        }
      })()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '索引失败')
    } finally {
      setBusy(false)
    }
  }

  async function runIngest() {
    await startIndexJob({ enrich: false, startedMsg: '已开始函数入库任务', doneMsg: '函数入库完成' })
  }

  async function runIndexFull() {
    await startIndexJob({ enrich: true, startedMsg: '已开始后台索引任务', doneMsg: '索引完成' })
  }

  async function resumeEmbeddingOnly() {
    if (indexPolling) return
    setBusy(true)
    try {
      const started = await ragStartIndexJob(rootDir, { enrich: true, max_functions: 0 })
      setIndexJobId(started.job_id)
      setIndexJob(null)
      setIndexPolling(true)
      message.success('已开始补全向量任务（跳过增强/重入库）')

      void (async () => {
        try {
          while (true) {
            const st = await ragGetIndexJob(started.job_id)
            if (!st.ok || !st.job) {
              throw new Error(st.error || '获取索引进度失败')
            }
            setIndexJob(st.job)
            if (st.job.stage === 'done') {
              message.success('向量补全完成')
              setBrowserRefreshToken((v) => v + 1)
              return
            }
            if (st.job.stage === 'error') {
              throw new Error(st.job.error || '向量补全失败')
            }
            if (st.job.stage === 'canceled') {
              message.info('向量补全已取消')
              return
            }
            await new Promise((r) => setTimeout(r, 800))
          }
        } catch (e) {
          message.error(e instanceof Error ? e.message : '向量补全失败')
        } finally {
          setIndexPolling(false)
        }
      })()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '向量补全失败')
    } finally {
      setBusy(false)
    }
  }

  async function cancelIndex() {
    if (!indexJobId) return
    try {
      await ragCancelIndexJob(indexJobId)
      message.info('已发送取消请求')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '取消失败')
    }
  }

  async function runBackfillDocs() {
    if (backfillPolling) return
    setBusy(true)
    try {
      const started = await ragStartBackfillDocsJob(rootDir, 2000)
      setBackfillJobId(started.job_id)
      setBackfillJob(null)
      setBackfillPolling(true)
      message.success('已开始补全描述/输入输出任务')

      void (async () => {
        try {
          while (true) {
            const st = await ragGetBackfillDocsJob(started.job_id)
            if (!st.ok || !st.job) throw new Error(st.error || '获取补全进度失败')
            setBackfillJob(st.job)
            if (st.job.stage === 'done') {
              message.success('描述/输入输出补全完成')
              setBrowserRefreshToken((v) => v + 1)
              return
            }
            if (st.job.stage === 'error') throw new Error(st.job.error || '补全失败')
            if (st.job.stage === 'canceled') {
              message.info('补全已取消')
              return
            }
            await new Promise((r) => setTimeout(r, 900))
          }
        } catch (e) {
          message.error(e instanceof Error ? e.message : '补全失败')
        } finally {
          setBackfillPolling(false)
        }
      })()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '补全失败')
    } finally {
      setBusy(false)
    }
  }

  async function cancelBackfillDocs() {
    if (!backfillJobId) return
    try {
      await ragCancelBackfillDocsJob(backfillJobId)
      message.info('已发送取消请求')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '取消失败')
    }
  }

  async function runKindAdjust() {
    if (kindPolling) return
    setBusy(true)
    try {
      const started = await ragStartKindJob(rootDir)
      setKindJobId(started.job_id)
      setKindJob(null)
      setKindPolling(true)
      message.success('已开始函数分类调整任务')

      void (async () => {
        try {
          while (true) {
            const st = await ragGetKindJob(started.job_id)
            if (!st.ok || !st.job) throw new Error(st.error || '获取分类进度失败')
            setKindJob(st.job)
            if (st.job.stage === 'done') {
              message.success('函数分类调整完成')
              setBrowserRefreshToken((v) => v + 1)
              return
            }
            if (st.job.stage === 'error') throw new Error(st.job.error || '分类调整失败')
            if (st.job.stage === 'canceled') {
              message.info('分类调整已取消')
              return
            }
            await new Promise((r) => setTimeout(r, 900))
          }
        } catch (e) {
          message.error(e instanceof Error ? e.message : '分类调整失败')
        } finally {
          setKindPolling(false)
        }
      })()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '分类调整失败')
    } finally {
      setBusy(false)
    }
  }

  async function cancelKindAdjust() {
    if (!kindJobId) return
    try {
      await ragCancelKindJob(kindJobId)
      message.info('已发送取消请求')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '取消失败')
    }
  }

  async function runModuleIndex() {
    if (modulePolling) return
    setBusy(true)
    try {
      const started = await ragStartModuleIndexJob(rootDir)
      setModuleJobId(started.job_id)
      setModuleJob(null)
      setModulePolling(true)
      message.success('已开始后台模块索引任务')

      void (async () => {
        try {
          while (true) {
            const st = await ragGetModuleIndexJob(started.job_id)
            if (!st.ok || !st.job) throw new Error(st.error || '获取模块索引进度失败')
            setModuleJob(st.job)
            if (st.job.stage === 'done') {
              message.success('模块索引完成')
              setModuleBrowserRefreshToken((v) => v + 1)
              return
            }
            if (st.job.stage === 'error') throw new Error(st.job.error || '模块索引失败')
            if (st.job.stage === 'canceled') {
              message.info('模块索引已取消')
              return
            }
            await new Promise((r) => setTimeout(r, 900))
          }
        } catch (e) {
          message.error(e instanceof Error ? e.message : '模块索引失败')
        } finally {
          setModulePolling(false)
        }
      })()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '模块索引失败')
    } finally {
      setBusy(false)
    }
  }

  async function runQuery() {
    setBusy(true)
    try {
      const res = await ragQuery(query, topK, module)
      setHits(res.hits)
      try {
        await archiveAppend('rag.query', {
          root_dir: rootDir,
          query,
          top_k: topK,
          module: module || null,
          hits: res.hits
        })
      } catch {
      }
      message.success(`命中：${res.hits.length} 条`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '检索失败')
    } finally {
      setBusy(false)
    }
  }

  async function openFunctionById(function_id: string) {
    setSelectedFunctionId(function_id)
    setDrawerOpen(true)
  }

  async function openModuleByKey(module_key: string) {
    setSelectedModuleKey(module_key)
    setModuleDrawerOpen(true)
  }

  return (
    <PageScaffold
      title="RAG 管理"
      description="选择本地目录，扫描 cpp/h/python 文件，按函数切分，自动命名/分类/归档，并写入向量索引。"
    >
      <div className="md:col-span-4">
        <div className="space-y-4">
          <Card title="目录与索引（主流程）" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Typography.Paragraph style={{ marginTop: 0, color: 'rgba(244,244,245,0.72)' }}>
              需要启动 FastAPI（默认 `http://localhost:8000`），前端通过 `/py/*` 代理访问。
            </Typography.Paragraph>
            <Form layout="vertical">
              <Form.Item label="Root Dir" required>
                <Input
                  value={rootDir}
                  onChange={(e) => setRootDir(e.target.value)}
                  placeholder="例如：D:\\workspace\\autodrive"
                />
              </Form.Item>
              <Form.Item label="索引增强（可选）">
                <Space wrap>
                  <Switch checked={enrich} onChange={() => setEnrich(true)} disabled />
                  <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>
                    索引默认强制启用增强（生成中文/英文描述；需要后端可读取 ALIYUN_API_KEY）
                  </Typography.Text>
                </Space>
              </Form.Item>
              <Space wrap>
                <Button type="primary" onClick={runScan} disabled={!rootDir} loading={busy}>
                  扫描
                </Button>
                <Button onClick={runIngest} disabled={!rootDir} loading={busy}>
                  函数入库
                </Button>
                <Button onClick={runBackfillDocs} disabled={!rootDir} loading={busy}>
                  函数向量化
                </Button>
                <Button onClick={runModuleIndex} disabled={!rootDir} loading={busy}>
                  模块索引
                </Button>
              </Space>

              {indexJob ? (
                <div style={{ marginTop: 12 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space wrap>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }}>
                        状态：{indexJob.stage}
                      </Typography.Text>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.65)' }}>
                        {indexJob.stage === 'scanning'
                          ? `${indexJob.processed_files}/${indexJob.total_files} 文件`
                          : indexJob.stage === 'enriching'
                            ? `${indexJob.processed_functions}/${indexJob.total_functions} 函数`
                            : `${indexJob.processed_embeddings}/${indexJob.total_embeddings} 向量`}
                      </Typography.Text>
                    </Space>
                    <Progress
                      percent={Math.max(0, Math.min(100, Math.round(indexJob.percent)))}
                      status={indexJob.stage === 'error' ? 'exception' : indexJob.stage === 'done' ? 'success' : 'active'}
                      size="small"
                    />
                    <Typography.Paragraph
                      style={{
                        margin: 0,
                        color: 'rgba(244,244,245,0.65)',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere'
                      }}
                      copyable={{ text: String(indexJob.current_file || '-') }}
                    >
                      当前：{indexJob.current_file || '-'}
                    </Typography.Paragraph>
                    {indexJob.error ? (
                      <Typography.Text style={{ color: 'rgba(244,63,94,0.9)' }}>{indexJob.error}</Typography.Text>
                    ) : null}
                  </Space>
                </div>
              ) : null}

              {backfillJob ? (
                <div style={{ marginTop: 12 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space wrap>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }}>
                        补全：{backfillJob.stage}
                      </Typography.Text>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.65)' }}>
                        {backfillJob.processed}/{backfillJob.total} 条
                      </Typography.Text>
                    </Space>
                    <Progress
                      percent={Math.max(0, Math.min(100, Math.round(backfillJob.percent)))}
                      status={backfillJob.stage === 'error' ? 'exception' : backfillJob.stage === 'done' ? 'success' : 'active'}
                      size="small"
                    />
                    <Typography.Paragraph
                      style={{
                        margin: 0,
                        color: 'rgba(244,244,245,0.65)',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere'
                      }}
                      copyable={{ text: String(backfillJob.current_file || '-') }}
                    >
                      当前：{backfillJob.current_file || '-'}
                    </Typography.Paragraph>
                    {backfillJob.error ? (
                      <Typography.Text style={{ color: 'rgba(244,63,94,0.9)' }}>{backfillJob.error}</Typography.Text>
                    ) : null}
                  </Space>
                </div>
              ) : null}

              {moduleJob ? (
                <div style={{ marginTop: 12 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space wrap>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }}>模块：{moduleJob.stage}</Typography.Text>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.65)' }}>
                        {moduleJob.stage === 'scanning'
                          ? `${moduleJob.processed_files}/${moduleJob.total_files} 文件`
                          : moduleJob.stage === 'discovering'
                            ? `${moduleJob.processed_candidates}/${moduleJob.total_candidates} 候选`
                            : `${moduleJob.processed_embeddings}/${moduleJob.total_embeddings} 向量`}
                      </Typography.Text>
                    </Space>
                    <Progress
                      percent={Math.max(0, Math.min(100, Math.round(moduleJob.percent)))}
                      status={moduleJob.stage === 'error' ? 'exception' : moduleJob.stage === 'done' ? 'success' : 'active'}
                      size="small"
                    />
                    <Typography.Paragraph
                      style={{ margin: 0, color: 'rgba(244,244,245,0.65)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                    >
                      当前：{moduleJob.current_file || '-'}
                    </Typography.Paragraph>
                    {moduleJob.error ? (
                      <Typography.Text style={{ color: 'rgba(244,63,94,0.9)' }}>{moduleJob.error}</Typography.Text>
                    ) : null}
                  </Space>
                </div>
              ) : null}
            </Form>
          </Card>

          <Card title="临时交互区" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Typography.Paragraph style={{ marginTop: 0, color: 'rgba(244,244,245,0.72)' }}>
              将不常用/调试用操作集中放置，避免干扰主流程。
            </Typography.Paragraph>
            <Space wrap>
              <Button onClick={runIndexFull} disabled={!rootDir} loading={busy}>
                建立索引（全量）
              </Button>
              <Button onClick={resumeEmbeddingOnly} disabled={!rootDir} loading={busy}>
                继续向量化（补缺向量）
              </Button>
              <Button onClick={cancelIndex} disabled={!indexJobId}>
                取消索引
              </Button>
              <Button onClick={cancelBackfillDocs} disabled={!backfillJobId}>
                取消补全
              </Button>
              <Button onClick={runKindAdjust} disabled={!rootDir} loading={busy}>
                函数分类调整
              </Button>
              <Button onClick={cancelKindAdjust} disabled={!kindJobId}>
                取消分类调整
              </Button>
            </Space>

            {kindJob ? (
              <div style={{ marginTop: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }}>分类：{kindJob.stage}</Typography.Text>
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.65)' }}>
                      {kindJob.processed}/{kindJob.total} 条
                    </Typography.Text>
                  </Space>
                  <Progress
                    percent={Math.max(0, Math.min(100, Math.round(kindJob.percent)))}
                    status={kindJob.stage === 'error' ? 'exception' : kindJob.stage === 'done' ? 'success' : 'active'}
                    size="small"
                  />
                  <Typography.Paragraph
                    style={{ margin: 0, color: 'rgba(244,244,245,0.65)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                    copyable={{ text: String(kindJob.current_function_id || '-') }}
                  >
                    当前：{kindJob.current_function_id || '-'}
                  </Typography.Paragraph>
                  {kindJob.error ? (
                    <Typography.Text style={{ color: 'rgba(244,63,94,0.9)' }}>{kindJob.error}</Typography.Text>
                  ) : null}
                </Space>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="md:col-span-4">
        <div className="space-y-4">
          <FunctionIndexBrowser
            rootDir={rootDir}
            refreshToken={browserRefreshToken}
            onOpenFunction={(fn) => {
              void openFunctionById(fn.function_id)
            }}
          />

          <ModuleIndexBrowser
            rootDir={rootDir}
            refreshToken={moduleBrowserRefreshToken}
            onOpenModule={(m) => {
              void openModuleByKey(m.module_key)
            }}
          />
        </div>
      </div>

      <div className="md:col-span-4">
        <div className="space-y-4">
          <Card title="相似度检索" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Form layout="vertical">
              <Form.Item label="模块过滤（可选）">
                <Select
                  allowClear
                  value={module}
                  onChange={(v) => setModule(v)}
                  options={[
                    { value: 'common', label: 'common' },
                    { value: 'perception', label: 'perception' },
                    { value: 'planning', label: 'planning' },
                    { value: 'decision', label: 'decision' },
                    { value: 'localization', label: 'localization' },
                    { value: 'control', label: 'control' }
                  ]}
                />
              </Form.Item>
              <Form.Item label="Query" required>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="例如：规划模块 速度规划 轨迹平滑"
                />
              </Form.Item>
              <Form.Item label="TopK">
                <InputNumber min={1} max={50} value={topK} onChange={(v) => setTopK(Number(v ?? 5))} />
              </Form.Item>
              <Space wrap>
                <Button type="primary" onClick={runQuery} disabled={!query} loading={busy}>
                  检索
                </Button>
                <Button onClick={() => setHits([])} disabled={hits.length === 0}>
                  清空
                </Button>
              </Space>
            </Form>
          </Card>

          <Card title="命中列表" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Table
              size="small"
              rowKey="function_id"
              columns={columns as any}
              dataSource={hits}
              onRow={(record) => ({
                onClick: () => void openFunctionById(record.function_id)
              })}
              pagination={{ pageSize: 6 }}
            />
          </Card>
        </div>
      </div>

      <FunctionDetailDrawer
        open={drawerOpen}
        functionId={selectedFunctionId}
        rootDir={rootDir}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setBrowserRefreshToken((v) => v + 1)}
      />

      <ModuleDetailDrawer open={moduleDrawerOpen} moduleKey={selectedModuleKey} onClose={() => setModuleDrawerOpen(false)} />
    </PageScaffold>
  )
}
