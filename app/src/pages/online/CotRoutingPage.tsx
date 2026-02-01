import { PageScaffold } from '../PageScaffold'
import { Button, Card, Divider, Input, List, Popconfirm, Space, Table, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { cotGeneratePrompt } from '../../utils/api'
import { AddRelatedModal, type RelatedRow } from '../../components/cot/AddRelatedModal'
import { ReviewItemsModal } from '../../components/cot/ReviewItemsModal'
import { useArchiveStore } from '../../store/archiveStore'

const TASK_INPUT_STORAGE_KEY = 'online:task_input_state:v1'
const COT_STORAGE_KEY_V2 = 'online:cot_routing_state:v2'
const COT_STORAGE_KEY_V1 = 'online:cot_routing_state:v1'

function loadJson(key: string) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

function saveJson(key: string, v: any) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    return
  }
}

function extractMarkdownSection(md: string, titles: string[]) {
  if (!md) return ''
  const lines = String(md).split(/\r?\n/)
  const re = /^##\s+(.+)\s*$/
  let inSection = false
  const out: string[] = []
  for (const line of lines) {
    const m = line.match(re)
    if (m) {
      const t = m[1].trim().replace(/^\d+\.?\s*/, '')
      if (inSection) break
      inSection = titles.some((x) => t.includes(x))
      continue
    }
    if (inSection) out.push(line)
  }
  return out.join('\n').trim()
}

function parseListItems(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const items: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^([-*]|\d+\.)\s+(.*)$/)
    const v = (m ? m[2] : line).trim()
    if (!v) continue
    items.push(v)
  }
  return Array.from(new Set(items))
}

export function CotRoutingPage() {
  const appendArchive = useArchiveStore((s) => s.append)
  const [rootDir, setRootDir] = useState('')
  const [goal, setGoal] = useState('')
  const [constraints, setConstraints] = useState('')
  const [subtasks, setSubtasks] = useState('')
  const [riskItems, setRiskItems] = useState<string[]>([])
  const [missingItems, setMissingItems] = useState<string[]>([])
  const [relatedRows, setRelatedRows] = useState<RelatedRow[]>([])
  const [confirmed, setConfirmed] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [riskModalOpen, setRiskModalOpen] = useState(false)
  const [missingModalOpen, setMissingModalOpen] = useState(false)
  const [addRelatedOpen, setAddRelatedOpen] = useState(false)
  const [genBusy, setGenBusy] = useState(false)

  useEffect(() => {
    const saved = loadJson(COT_STORAGE_KEY_V2) || loadJson(COT_STORAGE_KEY_V1)
    if (saved) {
      if (typeof saved.rootDir === 'string') setRootDir(saved.rootDir)
      if (typeof saved.goal === 'string') setGoal(saved.goal)
      if (typeof saved.constraints === 'string') setConstraints(saved.constraints)
      if (typeof saved.subtasks === 'string') setSubtasks(saved.subtasks)
      if (Array.isArray(saved.riskItems)) setRiskItems(saved.riskItems)
      if (Array.isArray(saved.missingItems)) setMissingItems(saved.missingItems)
      if (Array.isArray(saved.relatedRows)) setRelatedRows(saved.relatedRows)
      if (typeof saved.confirmed === 'string') setConfirmed(saved.confirmed)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveJson(COT_STORAGE_KEY_V2, { rootDir, goal, constraints, subtasks, riskItems, missingItems, relatedRows, confirmed })
  }, [hydrated, rootDir, goal, constraints, subtasks, riskItems, missingItems, relatedRows, confirmed])

  function loadFromTaskInput() {
    const saved = loadJson(TASK_INPUT_STORAGE_KEY)
    if (!saved) {
      message.error('未找到任务输入页面保存的问题')
      return
    }
    const taskDraft = saved.taskDraft && typeof saved.taskDraft === 'object' ? saved.taskDraft : {}
    const analysisMarkdown = String(saved.analysisMarkdown || '')
    const analysisHits = Array.isArray(saved.analysisHits) ? saved.analysisHits : []
    const rd = typeof saved.rootDir === 'string' ? saved.rootDir : ''
    setRootDir(rd)

    const mdGoal = extractMarkdownSection(analysisMarkdown, ['任务目标'])
    const mdConstraints = extractMarkdownSection(analysisMarkdown, ['关键约束'])
    const mdRisks =
      extractMarkdownSection(analysisMarkdown, ['风险点/歧义点']) ||
      [
        extractMarkdownSection(analysisMarkdown, ['风险点']),
        extractMarkdownSection(analysisMarkdown, ['歧义点'])
      ]
        .filter(Boolean)
        .join('\n')
        .trim()
    const mdMissing = extractMarkdownSection(analysisMarkdown, ['缺失信息清单'])
    const mdSubtasks = extractMarkdownSection(analysisMarkdown, ['建议拆分的子任务'])

    const feature = String(taskDraft.featureDescription || '')
    const genQ = String(taskDraft.generationQuestion || '')
    const inSpec = String(taskDraft.inputSpec || '')
    const outSpec = String(taskDraft.outputSpec || '')
    const selectedFns = Array.isArray(taskDraft.selectedFunctionIds) ? taskDraft.selectedFunctionIds : []
    const selectedWf = taskDraft.selectedWorkflowId ? String(taskDraft.selectedWorkflowId) : ''

    setGoal(mdGoal || feature || genQ)
    setConstraints(
      [mdConstraints, inSpec ? `输入：\n${inSpec}` : '', outSpec ? `输出：\n${outSpec}` : '']
        .filter(Boolean)
        .join('\n\n')
        .trim()
    )
    setSubtasks(mdSubtasks)
    setRiskItems(parseListItems(mdRisks))
    setMissingItems(parseListItems(mdMissing))

    const rows: RelatedRow[] = []
    if (selectedWf) {
      rows.push({ rowId: `module:workflow:${selectedWf}`, kind: 'module', module_id: selectedWf, name: selectedWf, source: 'workflow' })
    }
    for (const fid of selectedFns) {
      const id = String(fid)
      rows.push({ rowId: `fn:linked:${id}`, kind: 'function', function_id: id, name: id, module: '-', source: 'linked' })
    }
    for (const h of analysisHits.slice(0, 12)) {
      const fid = String((h as any).function_id || '')
      if (!fid) continue
      const rowId = `fn:rag:${fid}`
      if (rows.some((r) => r.rowId === rowId || (r.kind === 'function' && r.function_id === fid))) continue
      rows.push({
        rowId,
        kind: 'function',
        function_id: fid,
        name: String((h as any).name || fid),
        module: String((h as any).module || '-'),
        source: 'rag',
        file_path: String((h as any).file_path || ''),
        signature: String((h as any).signature || ''),
        score: typeof (h as any).score === 'number' ? (h as any).score : undefined
      })
    }
    setRelatedRows(rows)

    message.success('已加载任务输入页面的问题')
  }

  function generateConfirmedDescription() {
    const text = [
      `## 任务目标\n${goal.trim()}`,
      `## 关键约束\n${constraints.trim()}`,
      `## 推荐关联的模块/函数特征\n${relatedRows
        .map((r) => {
          if (r.kind === 'module') return `- [模块] ${r.name}`
          return `- [函数] ${r.module} ${r.name} (${r.function_id})`
        })
        .join('\n')}`,
      `## 建议拆分的子任务\n${subtasks.trim()}`
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim()
    setConfirmed(text)
  }

  async function generateConfirmedByLlm() {
    setGenBusy(true)
    try {
      const functionIds = relatedRows
        .filter((r) => r.kind === 'function')
        .map((r) => r.function_id)
        .filter(Boolean)
      const res = await cotGeneratePrompt({
        goal,
        constraints,
        subtasks,
        risk_items: [],
        missing_items: [],
        related_function_ids: functionIds,
        root_dir: rootDir || null
      })
      if (!res.ok) throw new Error(res.error || 'generate_failed')
      const prompt = String(res.prompt || '').trim()
      if (!prompt) throw new Error('empty_prompt')
      setConfirmed(prompt)
      message.success('已生成最终提示词')
    } catch (e) {
      generateConfirmedDescription()
      message.error(e instanceof Error ? e.message : '生成失败，已使用本地拼接')
    } finally {
      setGenBusy(false)
    }
  }

  async function confirmAndArchive() {
    if (!confirmed.trim()) {
      message.error('请先生成或填写“消歧后的整体描述确认框”')
      return
    }
    const taskInputSnapshot = loadJson(TASK_INPUT_STORAGE_KEY)
    try {
      await appendArchive('cot.disambiguation', {
        root_dir: rootDir,
        source_task_input: taskInputSnapshot,
        sections: {
          goal,
          constraints,
          subtasks
        },
        lists: {
          riskItems,
          missingItems
        },
        related: relatedRows,
        confirmed
      })
      message.success('已保存到档案')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  function clearAll() {
    try {
      localStorage.removeItem(COT_STORAGE_KEY_V2)
      localStorage.removeItem(COT_STORAGE_KEY_V1)
    } catch {
    }
    setRootDir('')
    setGoal('')
    setConstraints('')
    setSubtasks('')
    setRiskItems([])
    setMissingItems([])
    setRelatedRows([])
    setConfirmed('')
    message.success('已清除')
  }

  return (
    <PageScaffold
      title="路由消歧"
      description="基于工单 + RAG 检索做可解释路由决策，并通过问答式消歧补齐关键缺口，生成函数编排计划草案。"
    >
      <div className="md:col-span-12">
        <Card
          title={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>问题加载</span>
              <Space wrap>
                <Popconfirm
                  title="清空本页所有内容？"
                  okText="清除"
                  cancelText="取消"
                  onConfirm={clearAll}
                >
                  <Button danger>清除</Button>
                </Popconfirm>
                <Button onClick={loadFromTaskInput}>加载问题</Button>
                <Button
                  loading={genBusy}
                  onClick={() => {
                    void generateConfirmedByLlm()
                  }}
                  disabled={!goal && !constraints && !subtasks && riskItems.length === 0 && missingItems.length === 0 && relatedRows.length === 0}
                >
                  生成确认后描述
                </Button>
              </Space>
            </div>
          }
          size="small"
          bordered={false}
          style={{ background: 'rgba(9, 9, 11, 0.6)' }}
        >
          <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>来源：任务输入页本地保存 + 分析结果（可编辑确认）。</Typography.Text>
        </Card>
      </div>

      <div className="md:col-span-6">
        <Card title="任务目标（问题描述）" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Input.TextArea value={goal} onChange={(e) => setGoal(e.target.value)} rows={7} placeholder="从任务分析结果填入；你可以补充/修订" />
        </Card>
      </div>

      <div className="md:col-span-6">
        <Card title="关键约束（输入/输出）" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Input.TextArea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={10} placeholder="从任务分析结果 + 任务输入的输入/输出格式填入；你可以补充/修订" />
        </Card>
      </div>

      <div className="md:col-span-6">
        <Card
          title={
            <div className="flex items-center justify-between gap-2">
              <span>风险点 / 歧义点</span>
              <Button size="small" disabled={riskItems.length === 0} onClick={() => setRiskModalOpen(true)}>
                逐条确认
              </Button>
            </div>
          }
          size="small"
          bordered={false}
          style={{ background: 'rgba(9, 9, 11, 0.6)' }}
        >
          {riskItems.length ? (
            <List
              size="small"
              dataSource={riskItems}
              renderItem={(it) => <List.Item><Typography.Text style={{ color: 'rgba(244,244,245,0.78)' }}>{it}</Typography.Text></List.Item>}
            />
          ) : (
            <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>暂无风险/歧义点</Typography.Text>
          )}
        </Card>
      </div>

      <div className="md:col-span-6">
        <Card
          title={
            <div className="flex items-center justify-between gap-2">
              <span>缺失信息清单</span>
              <Button size="small" disabled={missingItems.length === 0} onClick={() => setMissingModalOpen(true)}>
                逐条确认
              </Button>
            </div>
          }
          size="small"
          bordered={false}
          style={{ background: 'rgba(9, 9, 11, 0.6)' }}
        >
          {missingItems.length ? (
            <List
              size="small"
              dataSource={missingItems}
              renderItem={(it) => <List.Item><Typography.Text style={{ color: 'rgba(244,244,245,0.78)' }}>{it}</Typography.Text></List.Item>}
            />
          ) : (
            <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>暂无缺失项</Typography.Text>
          )}
        </Card>
      </div>

      <div className="md:col-span-12">
        <Card
          title={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>推荐关联的模块 / 函数特征</span>
              <Space wrap>
                <Button size="small" onClick={() => setAddRelatedOpen(true)}>
                  增加
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
            rowKey="rowId"
            pagination={false}
            className="dark-table"
            columns={[
              {
                title: '类型',
                key: 'kind',
                width: 86,
                render: (_: any, r: RelatedRow) => (r.kind === 'module' ? '模块' : '函数')
              },
              {
                title: '来源',
                key: 'source',
                width: 90,
                render: (_: any, r: any) => String(r.source || '-')
              },
              {
                title: '名称',
                key: 'name',
                render: (_: any, r: RelatedRow) => {
                  if (r.kind === 'module') return <Typography.Text style={{ color: 'rgba(244,244,245,0.78)' }}>{r.name}</Typography.Text>
                  return (
                    <div className="flex flex-col" style={{ minWidth: 0 }}>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }} ellipsis>
                        {r.name}
                      </Typography.Text>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }} ellipsis>
                        {r.function_id}
                      </Typography.Text>
                    </div>
                  )
                }
              },
              {
                title: '模块',
                key: 'module',
                width: 140,
                render: (_: any, r: RelatedRow) => (r.kind === 'function' ? <Typography.Text>{r.module}</Typography.Text> : <span>-</span>)
              },
              {
                title: '操作',
                key: 'op',
                width: 80,
                render: (_: any, r: RelatedRow) => (
                  <Button
                    danger
                    size="small"
                    onClick={() => {
                      setRelatedRows((prev) => prev.filter((x) => x.rowId !== r.rowId))
                    }}
                  >
                    删除
                  </Button>
                )
              }
            ] as any}
            dataSource={relatedRows}
          />
        </Card>
      </div>

      <div className="md:col-span-12">
        <Card title="建议拆分的子任务" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Input.TextArea value={subtasks} onChange={(e) => setSubtasks(e.target.value)} rows={10} placeholder="从任务分析结果填入；你可以补充/修订" />
        </Card>
      </div>

      <div className="md:col-span-12">
        <Card title="问题确认" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>消歧后的整体描述确认框：</Typography.Text>
            <Input.TextArea value={confirmed} onChange={(e) => setConfirmed(e.target.value)} rows={10} placeholder="点击上方“生成确认后描述”，或在此手动编辑最终描述" />
            <Divider style={{ borderColor: 'rgba(63,63,70,0.6)', margin: '8px 0' }} />
            <Space wrap>
              <Button type="primary" onClick={confirmAndArchive} disabled={!confirmed.trim()}>
                确认问题描述
              </Button>
            </Space>
          </Space>
        </Card>
      </div>

      <ReviewItemsModal
        open={riskModalOpen}
        mode="risk"
        title="风险点 / 歧义点逐条确认"
        items={riskItems}
        goal={goal}
        constraints={constraints}
        subtasks={subtasks}
        riskItems={riskItems}
        missingItems={missingItems}
        onApply={(next) => {
          setGoal(next.goal)
          setConstraints(next.constraints)
          setSubtasks(next.subtasks)
          setRiskItems(next.riskItems)
          setMissingItems(next.missingItems)
        }}
        onClose={() => setRiskModalOpen(false)}
      />

      <ReviewItemsModal
        open={missingModalOpen}
        mode="missing"
        title="缺失信息清单逐条确认"
        items={missingItems}
        goal={goal}
        constraints={constraints}
        subtasks={subtasks}
        riskItems={riskItems}
        missingItems={missingItems}
        onApply={(next) => {
          setGoal(next.goal)
          setConstraints(next.constraints)
          setSubtasks(next.subtasks)
          setRiskItems(next.riskItems)
          setMissingItems(next.missingItems)
        }}
        onClose={() => setMissingModalOpen(false)}
      />

      <AddRelatedModal
        open={addRelatedOpen}
        rootDir={rootDir}
        onAdd={(rows) => {
          setRelatedRows((prev) => {
            const next = [...prev]
            for (const r of rows) {
              if (next.some((x) => x.rowId === r.rowId)) continue
              if (r.kind === 'function' && next.some((x) => x.kind === 'function' && x.function_id === r.function_id)) continue
              if (r.kind === 'module' && next.some((x) => x.kind === 'module' && x.module_id === r.module_id)) continue
              next.push(r)
            }
            return next
          })
        }}
        onClose={() => setAddRelatedOpen(false)}
      />
    </PageScaffold>
  )
}
