import { PageScaffold } from '../PageScaffold'
import { Button, Card, Divider, Input, Select, Space, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { orchestratorGenerateCode } from '../../utils/api'
import type { ArchiveEvent } from '../../utils/api'
import { useArchiveStore } from '../../store/archiveStore'
import { CPP_SPEC } from '../../utils/cppSpec'
import { extractPureCppFromMarkdown } from '../../utils/cppExtract'

export function FunctionOrchestrationPage() {
  const STORAGE_KEY = 'online:orchestrator_state:v1'

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

  const events = useArchiveStore((s) => s.events)
  const loadingEvents = useArchiveStore((s) => s.loading)
  const refreshEvents = useArchiveStore((s) => s.refresh)
  const appendArchive = useArchiveStore((s) => s.append)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined)

  const [basePrompt, setBasePrompt] = useState('')
  const [finalPrompt, setFinalPrompt] = useState('')
  const [result, setResult] = useState('')
  const [resultRaw, setResultRaw] = useState('')
  const [log, setLog] = useState('')
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = loadJson(STORAGE_KEY)
    if (saved) {
      if (typeof saved.selectedEventId === 'string') setSelectedEventId(saved.selectedEventId)
      if (typeof saved.basePrompt === 'string') setBasePrompt(saved.basePrompt)
      if (typeof saved.finalPrompt === 'string') setFinalPrompt(saved.finalPrompt)
      if (typeof saved.resultRaw === 'string') {
        const extracted = extractPureCppFromMarkdown(saved.resultRaw)
        setResultRaw(extracted.raw)
        setResult(extracted.display)
      }
      if (typeof saved.result === 'string') {
        const raw = saved.result
        if (raw.includes('```') || raw.includes('\n### ')) {
          const extracted = extractPureCppFromMarkdown(raw)
          setResultRaw(extracted.raw)
          setResult(extracted.display)
        } else {
          setResult(raw)
        }
      }
      if (typeof saved.resultDisplay === 'string') setResult(saved.resultDisplay)
      if (typeof saved.log === 'string') setLog(saved.log)
      if (Array.isArray(saved.keyPoints)) setKeyPoints(saved.keyPoints)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveJson(STORAGE_KEY, { selectedEventId, basePrompt, finalPrompt, result: resultRaw || result, resultRaw, resultDisplay: result, log, keyPoints })
  }, [hydrated, selectedEventId, basePrompt, finalPrompt, result, resultRaw, log, keyPoints])

  async function reloadEvents() {
    await refreshEvents(300)
  }

  const selectedEvent = useMemo(() => events.find((e) => e.id === selectedEventId) || null, [events, selectedEventId])

  const availableEvents = useMemo(() => events.filter((e) => String(e.type) === 'cot.disambiguation'), [events])

  useEffect(() => {
    if (!selectedEventId) return
    if (!availableEvents.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(undefined)
    }
  }, [availableEvents, selectedEventId])

  function derivePrompt(ev: ArchiveEvent | null) {
    if (!ev) return ''
    const payload = (ev.payload as any) || {}
    if (ev.type === 'orchestrator.generate') {
      const p = String(payload.prompt || '').trim()
      const code = String(payload.code || payload.result || '').trim()
      return p || code || ''
    }
    if (ev.type === 'cot.disambiguation') {
      const confirmed = String(payload.confirmed || '')
      return confirmed.trim() || ''
    }
    if (ev.type === 'task.analyze') {
      const md = String(payload.analysis_markdown || '')
      const draft = payload.task_draft && typeof payload.task_draft === 'object' ? payload.task_draft : {}
      const desc = String((draft as any).description || '')
      const inSpec = String((draft as any).inputSpec || '')
      const outSpec = String((draft as any).outputSpec || '')
      const q = String((draft as any).generationQuestion || '')
      const parts = [
        desc ? `## 问题描述\n${desc}` : '',
        inSpec || outSpec ? `## 输入/输出\n### 输入\n${inSpec}\n\n### 输出\n${outSpec}` : '',
        q ? `## 生成目标\n${q}` : '',
        md ? `## 分析结果（参考）\n${md}` : ''
      ]
        .filter(Boolean)
        .join('\n\n')
        .trim()
      return parts
    }
    if (ev.type === 'rag.query') {
      const query = String(payload.query || payload.rag_query || '')
      const hits = Array.isArray(payload.hits || payload.rag_hits) ? (payload.hits || payload.rag_hits) : []
      const hitText = hits.length ? JSON.stringify(hits.slice(0, 8), null, 2) : ''
      return [`## RAG Query\n${query}`, hitText ? `## RAG Hits（参考）\n${hitText}` : ''].filter(Boolean).join('\n\n').trim()
    }
    return JSON.stringify(ev.payload || {}, null, 2)
  }

  useEffect(() => {
    if (!selectedEvent) return
    const p = derivePrompt(selectedEvent)
    setBasePrompt(p)
    const merged = p.includes(CPP_SPEC)
      ? p
      : `${p}\n\n---\n\n【C++代码改写统一规范（必须严格遵守）】\n${CPP_SPEC}`.trim()
    setFinalPrompt(merged)
  }, [selectedEventId, selectedEvent])

  async function runGenerate() {
    if (!finalPrompt.trim()) {
      message.error('请先选择档案并准备好提示词')
      return
    }
    setBusy(true)
    setResult('')
    setResultRaw('')
    setLog('')
    setKeyPoints([])
    try {
      const res = await orchestratorGenerateCode({
        prompt: finalPrompt,
        source_event_id: selectedEvent?.id || null,
        source_event_type: selectedEvent?.type || null
      })
      if (!res.ok) throw new Error(res.error || 'generate_failed')
      const nextResult = String(res.code || '').trim()
      const nextLog = String(res.log || '').trim()
      const nextKeyPoints = Array.isArray(res.key_points) ? res.key_points.map((x) => String(x)) : []
      const extracted = extractPureCppFromMarkdown(nextResult)
      setResultRaw(extracted.raw)
      setResult(extracted.display)
      setLog(nextLog)
      setKeyPoints(nextKeyPoints)
      try {
        await appendArchive('orchestrator.generate', {
          source_event: selectedEvent ? { id: selectedEvent.id, type: selectedEvent.type } : null,
          prompt: finalPrompt,
          code: extracted.raw,
          log: nextLog,
          key_points: nextKeyPoints
        })
      } catch {
      }
      message.success('已生成并入档')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '生成失败')
    } finally {
      setBusy(false)
    }
  }

  function clearAll() {
    setSelectedEventId(undefined)
    setBasePrompt('')
    setFinalPrompt('')
    setResult('')
    setResultRaw('')
    setLog('')
    setKeyPoints([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
    }
  }

  return (
    <PageScaffold
      title="函数编排与生成"
      description="从档案选择完成好的提示词（task.analyze / rag.query / cot.disambiguation），直接生成目标 C++ 代码并持久化与回放。"
    >
      <div className="md:col-span-5">
        <Card
          title={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>编排输入</span>
              <Space wrap>
                <Button size="small" onClick={reloadEvents} loading={loadingEvents}>
                  刷新档案
                </Button>
                <Button size="small" danger onClick={clearAll}>
                  清除
                </Button>
              </Space>
            </div>
          }
          size="small"
          bordered={false}
          style={{ background: 'rgba(9, 9, 11, 0.6)' }}
        >
          <Typography.Paragraph style={{ marginTop: 0, color: 'rgba(244,244,245,0.72)' }}>
            从档案选择来源（推荐：`cot.disambiguation` 的 confirmed 提示词），系统会把最终用于生成的提示词展示在下方；点击“生成”将直接产出目标 C++ 代码。
          </Typography.Paragraph>
          <div className="mb-3">
            <Typography.Text>选择档案事件</Typography.Text>
            <div className="mt-2">
              <Select
                style={{ width: '100%' }}
                value={selectedEventId}
                placeholder="选择 task.analyze / rag.query / cot.disambiguation"
                onChange={(v) => setSelectedEventId(v)}
                options={events
                  .filter((e) => String(e.type) === 'cot.disambiguation')
                  .map((e) => ({
                    value: e.id,
                    label: `${e.type} · ${String(e.id).slice(0, 10)}…`
                  }))}
              />
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />
          <Typography.Text>完成好的提示词（可编辑）</Typography.Text>
          <Input.TextArea value={finalPrompt} onChange={(e) => setFinalPrompt(e.target.value)} rows={16} />
          <div className="mt-3">
            <Space wrap>
              <Button type="primary" loading={busy} onClick={() => void runGenerate()} disabled={!finalPrompt.trim()}>
                生成代码
              </Button>
            </Space>
          </div>
        </Card>
      </div>

      <div className="md:col-span-7">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card title="生成的 C++ 目标代码" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Input.TextArea value={result} onChange={(e) => setResult(e.target.value)} rows={12} />
          </Card>
          <Card title="生成日志 / 解释 / 要点" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            {keyPoints.length ? (
              <div className="mb-3">
                <Typography.Text>要点</Typography.Text>
                <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">
                  {keyPoints.map((x, i) => `- ${x}`).join('\n')}
                </div>
              </div>
            ) : null}
            <Typography.Text>日志</Typography.Text>
            <Input.TextArea value={log} onChange={(e) => setLog(e.target.value)} rows={10} />
          </Card>
        </Space>
      </div>
    </PageScaffold>
  )
}
