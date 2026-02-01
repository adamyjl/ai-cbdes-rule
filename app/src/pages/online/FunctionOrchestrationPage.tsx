import { PageScaffold } from '../PageScaffold'
import { Button, Card, Divider, Input, Select, Space, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { orchestratorGenerateCode } from '../../utils/api'
import type { ArchiveEvent } from '../../utils/api'
import { useArchiveStore } from '../../store/archiveStore'

function extractPureCppFromMarkdown(md: string) {
  const s = String(md || '')
  const re = /^###\s+(.+?)\s*$\n```(?:cpp|c\+\+|c)\s*\n([\s\S]*?)\n```\s*$/gim
  const files: Array<{ path: string; code: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const path = String(m[1] || '').trim()
    const code = String(m[2] || '').trim()
    if (code) files.push({ path, code })
  }
  if (!files.length) {
    const re2 = /^```(?:cpp|c\+\+|c)\s*\n([\s\S]*?)\n```\s*$/gim
    while ((m = re2.exec(s))) {
      const code = String(m[1] || '').trim()
      if (code) files.push({ path: 'main.cpp', code })
      break
    }
  }

  if (!files.length) {
    const raw = s.trim()
    if (!raw) return { raw: s, display: '' }
    return { raw: s, display: raw }
  }

  if (files.length === 1) return { raw: s, display: files[0].code }
  const merged = files
    .map((f) => `// ===== ${f.path} =====\n${f.code}`)
    .join('\n\n')
    .trim()
  return { raw: s, display: merged }
}

export function FunctionOrchestrationPage() {
  const STORAGE_KEY = 'online:orchestrator_state:v1'
  const CPP_SPEC =
    '生成 C++ 代码改写时需按统一表格字段与编码规范填写与实现：完成日期与姓名按“每个函数一行”分别记录以便追溯与工时统计；改写后文件夹名称采用大驼峰命名（如 BezierSpline），改写后源文件与头文件采用小驼峰命名（如 funBezier.cpp、funBezier.h），改写后路径按实际工程路径填写；改写前类型仅能在“类/函数”中二选一；改写后一级函数名必须同时满足三条约束：提供 Doxygen 函数说明、使用小驼峰且不得包含“_”“.”等分隔符、并作为测试用例中可由 main 直接调用的最上层入口（如 generateBezierPath），二级函数名为一级函数调用的下层函数（如 pointOnCubicBezier），三级函数名为二级函数调用的更下层函数（若有则同样小驼峰命名）；同时需给出函数中文名称（如“贝塞尔曲线”）用于组件展示与检索；整体质量与设计要求为：编译器警告/错误等级必须拉到最高并消除全部告警，代码结构必须包含注释说明、设计文档与函数主体三部分，不允许使用全局变量且静态变量不推荐使用（尽量将状态保存在顶层函数变量中），函数职责应单一，函数/类命名统一采用驼峰法，函数名展示长度建议不超过 12 个汉字，源码统一使用 UTF-8 编码，注释统一采用 Doxygen 格式且使用中文标点；控制流与语言特性限制为：禁止使用 goto，以及在 if-else 的 body 内禁止出现 return、break 等逻辑跳出语句，单个函数代码行数上限为 200 行；代码改写遵循“整体按 C 语言规范书写”的原则：复合函数必须采用 C 风格接口与实现形态，原子函数内部可采用少量 C++ 语法但对外接口必须呈现 C 语法格式，不支持类与模板语法，容器类（如 vector）需改为定长数组或 malloc 动态分配，指针使用方式需统一为“数组化”呈现并保持风格一致，表达式需拆解为清晰的逐步计算节点（禁止 ++/--，+=/-= 等复合赋值必须展开为显式赋值，三目运算符必须改为 if-else）；逻辑控制语句需满足“条件为单一变量、执行体为单一函数、禁止逻辑跳出语句”的约束：if-else 的条件变量应来自变量赋值或函数返回的单值比较，执行体封装为单一原子/复合函数且允许只有 if 无 else，但禁止在 if/else 内提前 return；for 循环必须将起始值、步进值、结束值拆为单一变量并以显式赋值/函数赋值方式获得，循环体同样封装为单一函数；注释细则为：函数头注释按给定 Doxygen 字段模板完整填写（含 @brief、@en_name、@cn_name、@type、@param、@param[IN]/[OUT]、@var、@retval、@granularity、@tag_level1/@tag_level2、@formula、@version、@date、@author 等），复合函数体内局部变量声明/定义必须在行尾注释说明变量含义；结构体字段采用大驼峰命名并在行尾注释中标注物理单位，数组字段在 @field 中用 Array<元素类型, 维度> 书写；枚举、宏定义与宏函数分别按对应 Doxygen 规范注释，其中宏定义可按日常习惯行尾注释即可，宏函数需提供 @tag MACRO_Function 与入参/返回值说明。'

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
