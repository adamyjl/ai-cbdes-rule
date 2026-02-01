import { PageScaffold } from '../PageScaffold'
import { Button, Card, Form, Input, InputNumber, Progress, Select, Space, Switch, Table, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import type { RagQueryHit } from '../../utils/api'
import type { RagIndexJobStatus } from '../../utils/api'
import type { RagBackfillDocsJob } from '../../utils/api'
import {
  ragCancelBackfillDocsJob,
  ragCancelIndexJob,
  ragGetBackfillDocsJob,
  ragGetIndexJob,
  ragQuery,
  ragScan,
  ragStartBackfillDocsJob,
  ragStartIndexJob
} from '../../utils/api'
import { archiveAppend } from '../../utils/api'
import { FunctionDetailDrawer } from '../../components/rag/FunctionDetailDrawer'
import { FunctionIndexBrowser } from '../../components/rag/FunctionIndexBrowser'

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

  async function runIndex() {
    if (indexPolling) return
    setBusy(true)
    try {
      const started = await ragStartIndexJob(rootDir, { enrich })
      setIndexJobId(started.job_id)
      setIndexJob(null)
      setIndexPolling(true)
      message.success('已开始后台索引任务')

      void (async () => {
        try {
          while (true) {
            const st = await ragGetIndexJob(started.job_id)
            if (!st.ok || !st.job) {
              throw new Error(st.error || '获取索引进度失败')
            }
            setIndexJob(st.job)
            if (st.job.stage === 'done') {
              message.success('索引完成')
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

  return (
    <PageScaffold
      title="RAG 管理"
      description="选择本地目录，扫描 cpp/h/python 文件，按函数切分，自动命名/分类/归档，并写入向量索引。"
    >
      <div className="md:col-span-4">
        <Card title="目录与索引" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
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
              <Button onClick={runIndex} disabled={!rootDir} loading={busy}>
                建立索引
              </Button>
              <Button onClick={resumeEmbeddingOnly} disabled={!rootDir} loading={busy}>
                继续向量化
              </Button>
              <Button onClick={cancelIndex} disabled={!indexJobId}>
                取消索引
              </Button>
              <Button onClick={runBackfillDocs} disabled={!rootDir} loading={busy}>
                补全缺失描述/IO
              </Button>
              <Button onClick={cancelBackfillDocs} disabled={!backfillJobId}>
                取消补全
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
                    style={{ margin: 0, color: 'rgba(244,244,245,0.65)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
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
                    style={{ margin: 0, color: 'rgba(244,244,245,0.65)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
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
          </Form>
        </Card>
      </div>
      <div className="md:col-span-4">
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
      </div>
      <div className="md:col-span-4">
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

      <div className="md:col-span-4">
        <FunctionIndexBrowser
          rootDir={rootDir}
          refreshToken={browserRefreshToken}
          onOpenFunction={(fn) => {
            void openFunctionById(fn.function_id)
          }}
        />
      </div>

      <FunctionDetailDrawer
        open={drawerOpen}
        functionId={selectedFunctionId}
        rootDir={rootDir}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setBrowserRefreshToken((v) => v + 1)}
      />
    </PageScaffold>
  )
}
