import { PageScaffold } from '../PageScaffold'
import { Button, Card, Divider, Drawer, Input, Select, Space, Steps, Table, Typography, message } from 'antd'
import { CheckCircleTwoTone, ClockCircleTwoTone, CloseCircleTwoTone, LoadingOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import type { ArchiveEvent, GateJobStatus } from '../../utils/api'
import { gateCancel, gateGetJob, gateStart } from '../../utils/api'
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
  if (!files.length) return { raw: s, display: s.trim() }
  if (files.length === 1) return { raw: s, display: files[0].code }
  return {
    raw: s,
    display: files
      .map((f) => `// ===== ${f.path} =====\n${f.code}`)
      .join('\n\n')
      .trim()
  }
}

type SplitFile = {
  path: string
  language: string
  content: string
  comment: string
}

type SplitFunction = {
  file_path: string
  name: string
  signature: string
  content: string
  comment: string
}

function extractFilesFromMarkdown(md: string): SplitFile[] {
  const s = String(md || '')
  const re = /^###\s+(.+?)\s*$\n```([a-zA-Z0-9_+\-]*)\s*\n([\s\S]*?)\n```\s*$/gim
  const files: SplitFile[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const path = String(m[1] || '').trim()
    const language = String(m[2] || '').trim() || 'cpp'
    const content = String(m[3] || '').trim()
    if (!path || !content) continue
    const comment = extractLeadingComment(content)
    files.push({ path, language, content, comment })
  }
  if (files.length) return files

  const re2 = /^```(cpp|c\+\+|c)\s*\n([\s\S]*?)\n```\s*$/gim
  while ((m = re2.exec(s))) {
    const language = String(m[1] || '').trim() || 'cpp'
    const content = String(m[2] || '').trim()
    if (!content) break
    const comment = extractLeadingComment(content)
    files.push({ path: 'main.cpp', language, content, comment })
    break
  }
  return files
}

function extractLeadingComment(code: string) {
  const s = String(code || '')
  const m = s.match(/^\s*(\/\*\*[\s\S]*?\*\/|\/\*[\s\S]*?\*\/|\/\/.*(?:\r?\n\/\/.*)*)/)
  return m ? String(m[1] || '').trim() : ''
}

function findMatchingBrace(src: string, openIndex: number) {
  let depth = 0
  let inSingle = false
  let inDouble = false
  let inLineComment = false
  let inBlockComment = false
  let escape = false
  for (let i = openIndex; i < src.length; i++) {
    const ch = src[i]
    const next = i + 1 < src.length ? src[i + 1] : ''

    if (inLineComment) {
      if (ch === '\n') inLineComment = false
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (inSingle) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === "'") inSingle = false
      continue
    }
    if (inDouble) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') inDouble = false
      continue
    }

    if (ch === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }
    if (ch === "'") {
      inSingle = true
      continue
    }
    if (ch === '"') {
      inDouble = true
      continue
    }
    if (ch === '{') {
      depth++
      continue
    }
    if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function extractFunctionsFromFiles(files: SplitFile[]): SplitFunction[] {
  const out: SplitFunction[] = []
  for (const f of files) {
    const src = String(f.content || '')
    const re = /(^|\n)(?!\s*(if|for|while|switch|catch)\s*\()\s*([_a-zA-Z][\w:\<\>\*\&\s]*?)\s+([_a-zA-Z]\w*)\s*\(([^;]*?)\)\s*(?:const\s*)?\{/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
      const name = String(m[4] || '').trim()
      const headerStart = m.index + String(m[1] || '').length
      const openBraceIndex = re.lastIndex - 1
      const closeBraceIndex = findMatchingBrace(src, openBraceIndex)
      if (!name || closeBraceIndex < 0) continue

      const signature = src.slice(headerStart, openBraceIndex).trim()

      let comment = ''
      let commentStart = headerStart
      const before = src.slice(0, headerStart)
      const beforeTrimmed = before.replace(/\s+$/, '')
      if (beforeTrimmed.endsWith('*/')) {
        const start = beforeTrimmed.lastIndexOf('/**')
        const start2 = beforeTrimmed.lastIndexOf('/*')
        const pick = start >= 0 ? start : start2
        if (pick >= 0) {
          commentStart = pick
          comment = beforeTrimmed.slice(pick).trim()
        }
      }

      const body = src.slice(openBraceIndex, closeBraceIndex + 1)
      const content = src.slice(commentStart, closeBraceIndex + 1).trim()
      out.push({
        file_path: f.path,
        name,
        signature,
        content: content || (signature + ' ' + body),
        comment
      })
    }
  }

  const seen = new Set<string>()
  const unique: SplitFunction[] = []
  for (const fn of out) {
    const key = `${fn.file_path}::${fn.name}::${fn.signature}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(fn)
  }
  return unique
}

const STORAGE_KEY = 'online:gate_state:v1'

const DEFAULT_WORK_DIR = 'AUTO'
const DEFAULT_COMPILE_COMMAND = 'AUTO'
const DEFAULT_STATIC_COMMAND = 'AUTO'

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

function stepIndex(stage: string, statuses: GateJobStatus[]) {
  const order = ['compile', 'static', 'unit', 'coverage']
  if (stage === 'done') return Math.max(0, order.length - 1)
  const i = order.indexOf(stage)
  if (i >= 0) return i
  if (stage === 'error') {
    const failed = statuses.find((s) => s.status === 'failed')
    if (failed) {
      const idx = order.indexOf(String(failed.step))
      return idx >= 0 ? idx : 0
    }
    const running = statuses.find((s) => s.status === 'running')
    if (running) {
      const idx = order.indexOf(String(running.step))
      return idx >= 0 ? idx : 0
    }
  }
  return 0
}

function statusLabel(status?: string) {
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  if (status === 'running') return '进行中'
  if (status === 'queued') return '排队'
  return '-'
}

function statusIcon(status?: string) {
  if (status === 'success') return <CheckCircleTwoTone twoToneColor="#22c55e" />
  if (status === 'failed') return <CloseCircleTwoTone twoToneColor="#ef4444" />
  if (status === 'running') return <LoadingOutlined style={{ color: '#38bdf8' }} />
  if (status === 'queued') return <ClockCircleTwoTone twoToneColor="#a1a1aa" />
  return null
}

function stepVisualStatus(status?: string) {
  if (status === 'success') return 'finish' as const
  if (status === 'failed') return 'error' as const
  if (status === 'running') return 'process' as const
  return 'wait' as const
}

export function TestGatePage() {
  const events = useArchiveStore((s) => s.events)
  const loadingEvents = useArchiveStore((s) => s.loading)
  const refreshEvents = useArchiveStore((s) => s.refresh)
  const appendArchive = useArchiveStore((s) => s.append)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined)

  const selectedEvent = useMemo(() => events.find((e) => e.id === selectedEventId) || null, [events, selectedEventId])

  const availableEvents = useMemo(() => events.filter((e) => String(e.type) === 'orchestrator.generate'), [events])

  const [workDir, setWorkDir] = useState('')
  const [compileCommand, setCompileCommand] = useState('')
  const [staticCommand, setStaticCommand] = useState('')
  const [enableUnit, setEnableUnit] = useState(true)
  const [enableCoverage, setEnableCoverage] = useState(true)

  const [requirementPrompt, setRequirementPrompt] = useState('')
  const [generatedResult, setGeneratedResult] = useState('')
  const [generatedResultRaw, setGeneratedResultRaw] = useState('')

  const [jobId, setJobId] = useState('')
  const [stage, setStage] = useState('idle')
  const [statuses, setStatuses] = useState<GateJobStatus[]>([])
  const [logLines, setLogLines] = useState<string[]>([])
  const [jobError, setJobError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [splitFiles, setSplitFiles] = useState<SplitFile[]>([])
  const [splitFunctions, setSplitFunctions] = useState<SplitFunction[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTitle, setDrawerTitle] = useState('')
  const [drawerText, setDrawerText] = useState('')

  useEffect(() => {
    const saved = loadJson(STORAGE_KEY)
    if (saved) {
      if (typeof saved.selectedEventId === 'string') setSelectedEventId(saved.selectedEventId)
      if (typeof saved.workDir === 'string' && saved.workDir.trim()) setWorkDir(saved.workDir)
      if (typeof saved.compileCommand === 'string' && saved.compileCommand.trim()) setCompileCommand(saved.compileCommand)
      if (typeof saved.staticCommand === 'string' && saved.staticCommand.trim()) setStaticCommand(saved.staticCommand)
      if (typeof saved.enableUnit === 'boolean') setEnableUnit(saved.enableUnit)
      if (typeof saved.enableCoverage === 'boolean') setEnableCoverage(saved.enableCoverage)
      if (typeof saved.requirementPrompt === 'string') setRequirementPrompt(saved.requirementPrompt)
      if (typeof saved.generatedResultRaw === 'string') {
        const extracted = extractPureCppFromMarkdown(saved.generatedResultRaw)
        setGeneratedResultRaw(extracted.raw)
        setGeneratedResult(extracted.display)
      } else if (typeof saved.generatedResult === 'string') {
        const raw = saved.generatedResult
        if (raw.includes('```') || raw.includes('\n### ')) {
          const extracted = extractPureCppFromMarkdown(raw)
          setGeneratedResultRaw(extracted.raw)
          setGeneratedResult(extracted.display)
        } else {
          setGeneratedResult(raw)
        }
      }
      if (typeof saved.jobId === 'string') setJobId(saved.jobId)
      if (typeof saved.stage === 'string') setStage(saved.stage)
      if (Array.isArray(saved.statuses)) setStatuses(saved.statuses)
      if (Array.isArray(saved.logLines)) setLogLines(saved.logLines)

      if (Array.isArray(saved.splitFiles)) setSplitFiles(saved.splitFiles)
      if (Array.isArray(saved.splitFunctions)) setSplitFunctions(saved.splitFunctions)
    }
    setWorkDir((v) => (v && v.trim() ? v : DEFAULT_WORK_DIR))
    setCompileCommand((v) => (v && v.trim() ? v : DEFAULT_COMPILE_COMMAND))
    setStaticCommand((v) => (v && v.trim() ? v : DEFAULT_STATIC_COMMAND))
  }, [])

  useEffect(() => {
    saveJson(STORAGE_KEY, {
      selectedEventId,
      workDir,
      compileCommand,
      staticCommand,
      enableUnit,
      enableCoverage,
      requirementPrompt,
      generatedResult: generatedResultRaw || generatedResult,
      generatedResultRaw,
      generatedResultDisplay: generatedResult,
      jobId,
      stage,
      statuses,
      logLines,
      splitFiles,
      splitFunctions
    })
  }, [
    selectedEventId,
    workDir,
    compileCommand,
    staticCommand,
    enableUnit,
    enableCoverage,
    requirementPrompt,
    generatedResult,
    generatedResultRaw,
    jobId,
    stage,
    statuses,
    logLines,
    splitFiles,
    splitFunctions
  ])

  async function reloadEvents() {
    await refreshEvents(300)
  }

  useEffect(() => {
    setSelectedEventId((prev) => {
      if (prev && availableEvents.some((e) => e.id === prev)) return prev
      const first = availableEvents[0]
      return first ? String(first.id) : undefined
    })
  }, [availableEvents])

  useEffect(() => {
    if (!selectedEvent) return
    const payload = (selectedEvent.payload as any) || {}
    if (selectedEvent.type === 'gate.run') {
      const cfg = payload.config && typeof payload.config === 'object' ? payload.config : {}
      setRequirementPrompt(String(payload.requirement_prompt || '').trim())
      const raw = String(payload.generated_result || '').trim()
      const extracted = extractPureCppFromMarkdown(raw)
      setGeneratedResultRaw(extracted.raw)
      setGeneratedResult(extracted.display)
      const files = Array.isArray(payload.file_splits) ? payload.file_splits : []
      const fns = Array.isArray(payload.function_splits) ? payload.function_splits : []
      if (files.length) setSplitFiles(files)
      else setSplitFiles(extractFilesFromMarkdown(raw))
      if (fns.length) setSplitFunctions(fns)
      else setSplitFunctions(extractFunctionsFromFiles(extractFilesFromMarkdown(raw)))
      setWorkDir(String((cfg as any).work_dir || DEFAULT_WORK_DIR))
      setCompileCommand(String((cfg as any).compile_command || DEFAULT_COMPILE_COMMAND))
      setStaticCommand(String((cfg as any).static_command || DEFAULT_STATIC_COMMAND))
      setEnableUnit(Boolean((cfg as any).enable_unit))
      setEnableCoverage(Boolean((cfg as any).enable_coverage))
      setJobId(String(payload.job_id || ''))
      setStage(String(payload.stage || 'idle'))
      setStatuses(Array.isArray(payload.statuses) ? payload.statuses : [])
      setLogLines(Array.isArray(payload.log_lines) ? payload.log_lines : [])
      return
    }
    if (selectedEvent.type === 'orchestrator.generate') {
      setRequirementPrompt(String(payload.prompt || '').trim())
      const raw = String(payload.code || payload.result || '').trim()
      const extracted = extractPureCppFromMarkdown(raw)
      setGeneratedResultRaw(extracted.raw)
      setGeneratedResult(extracted.display)
      const fs = extractFilesFromMarkdown(raw)
      setSplitFiles(fs)
      setSplitFunctions(extractFunctionsFromFiles(fs))
      setWorkDir(DEFAULT_WORK_DIR)
      setCompileCommand(DEFAULT_COMPILE_COMMAND)
      setStaticCommand(DEFAULT_STATIC_COMMAND)
      return
    }
    if (selectedEvent.type === 'cot.disambiguation') {
      setRequirementPrompt(String(payload.confirmed || '').trim())
      setGeneratedResultRaw(String(payload.confirmed || '').trim())
      setGeneratedResult(String(payload.confirmed || '').trim())
      setWorkDir(DEFAULT_WORK_DIR)
      setCompileCommand(DEFAULT_COMPILE_COMMAND)
      setStaticCommand(DEFAULT_STATIC_COMMAND)
      return
    }
    if (selectedEvent.type === 'task.analyze') {
      setRequirementPrompt(String(payload.analysis_markdown || '').trim())
      setGeneratedResultRaw(String(payload.analysis_markdown || '').trim())
      setGeneratedResult(String(payload.analysis_markdown || '').trim())
      setWorkDir(DEFAULT_WORK_DIR)
      setCompileCommand(DEFAULT_COMPILE_COMMAND)
      setStaticCommand(DEFAULT_STATIC_COMMAND)
      return
    }
    setRequirementPrompt(JSON.stringify(payload, null, 2))
    setGeneratedResult('')
    setGeneratedResultRaw('')
    setSplitFiles([])
    setSplitFunctions([])
    setWorkDir(DEFAULT_WORK_DIR)
    setCompileCommand(DEFAULT_COMPILE_COMMAND)
    setStaticCommand(DEFAULT_STATIC_COMMAND)
  }, [selectedEventId, selectedEvent])

  useEffect(() => {
    if (!jobId) return
    if (stage === 'done' || stage === 'error' || stage === 'canceled') return
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const res = await gateGetJob(jobId)
          if (!res.ok) {
            setStage('error')
            setJobError(res.error || 'job_failed')
            window.clearInterval(timer)
            return
          }
          setStage(res.stage)
          setStatuses(Array.isArray(res.statuses) ? res.statuses : [])
          setLogLines(Array.isArray(res.log_lines) ? res.log_lines : [])
          setJobError(res.error || null)
          if (res.done) {
            try {
              const fs = extractFilesFromMarkdown(generatedResultRaw || generatedResult)
              const fns = extractFunctionsFromFiles(fs)
              setSplitFiles(fs)
              setSplitFunctions(fns)
              await appendArchive('gate.run', {
                source_event: selectedEvent ? { id: selectedEvent.id, type: selectedEvent.type } : null,
                job_id: jobId,
                config: {
                  work_dir: workDir,
                  compile_command: compileCommand,
                  static_command: staticCommand,
                  enable_unit: enableUnit,
                  enable_coverage: enableCoverage
                },
                requirement_prompt: requirementPrompt,
                generated_result: generatedResultRaw || generatedResult,
                stage: res.stage,
                statuses: res.statuses,
                log_lines: res.log_lines,
                error: res.error || null,
                file_splits: fs,
                function_splits: fns
              })
            } catch {
            }
            window.clearInterval(timer)
          }
        } catch {
        }
      })()
    }, 1200)
    return () => window.clearInterval(timer)
  }, [jobId, stage, workDir, compileCommand, staticCommand, enableUnit, enableCoverage, requirementPrompt, generatedResult, selectedEventId])

  async function start() {
    if (!requirementPrompt.trim() || !generatedResult.trim()) {
      message.error('请先选择一条包含 prompt 与生成结果的档案')
      return
    }
    setBusy(true)
    try {
      setStage('starting')
      setStatuses([])
      setLogLines([])
      setJobError(null)
      setSplitFiles([])
      setSplitFunctions([])
      const res = await gateStart({
        work_dir: workDir,
        compile_command: compileCommand,
        static_command: staticCommand,
        enable_unit: enableUnit,
        enable_coverage: enableCoverage,
        requirement_prompt: requirementPrompt,
        generated_result: generatedResultRaw || generatedResult,
        source_event_id: selectedEvent?.id || null,
        source_event_type: selectedEvent?.type || null
      })
      if (!res.ok) throw new Error(res.error || 'start_failed')
      const id = String(res.job_id || '')
      if (!id) throw new Error('missing_job_id')
      setJobId(id)
      setStage('queued')
      message.success('已启动门禁')
    } catch (e) {
      setStage('idle')
      message.error(e instanceof Error ? e.message : '启动失败')
      setJobError(e instanceof Error ? e.message : 'start_failed')
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (!jobId) return
    try {
      await gateCancel(jobId)
      setStage('canceled')
      message.success('已取消')
    } catch {
      message.error('取消失败')
    }
  }

  function clearAll() {
    setSelectedEventId(undefined)
    setWorkDir('')
    setCompileCommand('')
    setStaticCommand('')
    setEnableUnit(true)
    setEnableCoverage(true)
    setRequirementPrompt('')
    setGeneratedResult('')
    setGeneratedResultRaw('')
    setJobId('')
    setStage('idle')
    setStatuses([])
    setLogLines([])
    setSplitFiles([])
    setSplitFunctions([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
    }
  }

  const steps = useMemo(() => {
    const map = new Map<string, GateJobStatus>()
    for (const s of statuses) map.set(s.step, s)
    const base = [
      { key: 'compile', title: 'Compile' },
      { key: 'static', title: 'Static Check' },
      { key: 'unit', title: 'Unit Test' },
      { key: 'coverage', title: 'Coverage' }
    ]
    return base
      .filter((x) => {
        if (x.key === 'unit') return enableUnit
        if (x.key === 'coverage') return enableCoverage
        return true
      })
      .map((x) => {
        const st = map.get(x.key)
        const label = st ? statusLabel(st.status) : '-'
        return {
          title: x.title,
          status: stepVisualStatus(st?.status),
          icon: statusIcon(st?.status) || undefined,
          description: (
            <span className="inline-flex items-center gap-2">
              {statusIcon(st?.status)}
              <span>{label}</span>
            </span>
          )
        }
      })
  }, [statuses, enableUnit, enableCoverage])

  const fileColumns = useMemo(
    () =>
      [
        { title: '文件', dataIndex: 'path', key: 'path', ellipsis: true },
        { title: '语言', dataIndex: 'language', key: 'language', width: 90 },
        {
          title: '操作',
          key: 'actions',
          width: 90,
          render: (_: unknown, r: SplitFile) => (
            <Button
              size="small"
              onClick={() => {
                setDrawerTitle(r.path)
                setDrawerText(r.content)
                setDrawerOpen(true)
              }}
            >
              查看
            </Button>
          )
        }
      ] as const,
    []
  )

  const fnColumns = useMemo(
    () =>
      [
        { title: '函数', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
        { title: '文件', dataIndex: 'file_path', key: 'file_path', ellipsis: true },
        {
          title: '操作',
          key: 'actions',
          width: 90,
          render: (_: unknown, r: SplitFunction) => (
            <Button
              size="small"
              onClick={() => {
                setDrawerTitle(`${r.name} · ${r.file_path}`)
                setDrawerText(r.content)
                setDrawerOpen(true)
              }}
            >
              查看
            </Button>
          )
        }
      ] as const,
    []
  )

  return (
    <PageScaffold
      title="检测测试门禁"
      description="流水线执行编译/静态检查/单测/覆盖率，可选回放仿真；失败自动回滚并生成再生成入口。"
    >
      <div className="md:col-span-4">
        <Card
          title={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>门禁配置</span>
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
            单测与覆盖率脚本由大模型根据“需求提示词 + 生成结果”自动生成，然后在本地执行并实时输出日志。
          </Typography.Paragraph>

          <Typography.Text>选择档案来源</Typography.Text>
          <div className="mt-2">
            <Select
              style={{ width: '100%' }}
              value={selectedEventId}
                placeholder="请选择（仅显示：orchestrator.generate）"
              onChange={(v) => setSelectedEventId(v)}
              options={events
                  .filter((e) => String(e.type) === 'orchestrator.generate')
                .map((e) => ({ value: e.id, label: `${e.type} · ${String(e.id).slice(0, 10)}…` }))}
            />
          </div>

          <Divider style={{ margin: '12px 0' }} />
          <Typography.Text>工作目录（执行命令的 cwd）</Typography.Text>
          <Input value={workDir} onChange={(e) => setWorkDir(e.target.value)} placeholder="例如：C:\\path\\to\\project" />

          <div className="mt-3">
            <Typography.Text>编译命令</Typography.Text>
            <Input value={compileCommand} onChange={(e) => setCompileCommand(e.target.value)} placeholder="例如：cmake --build build" />
          </div>
          <div className="mt-3">
            <Typography.Text>静态检查命令</Typography.Text>
            <Input value={staticCommand} onChange={(e) => setStaticCommand(e.target.value)} placeholder="例如：clang-tidy ..." />
          </div>
          <div className="mt-3">
            <Typography.Text>需求提示词（可编辑）</Typography.Text>
            <Input.TextArea value={requirementPrompt} onChange={(e) => setRequirementPrompt(e.target.value)} rows={6} />
          </div>
          <div className="mt-3">
            <Typography.Text>生成结果（可编辑）</Typography.Text>
            <Input.TextArea value={generatedResult} onChange={(e) => setGeneratedResult(e.target.value)} rows={6} />
          </div>

          <Divider style={{ margin: '12px 0' }} />
          <Space wrap>
            <Button type="primary" loading={busy} onClick={() => void start()}>
              开始检测
            </Button>
            <Button onClick={() => void cancel()} disabled={!jobId}>
              取消
            </Button>
          </Space>
        </Card>
      </div>

      <div className="md:col-span-8">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card title="门禁流水线" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Steps current={Math.max(0, Math.min(stepIndex(stage, statuses), Math.max(0, steps.length - 1)))} items={steps} />
            <div className="mt-3 text-sm text-zinc-300">
              当前状态：{stage} {jobId ? `（job: ${jobId.slice(0, 8)}…）` : ''}
            </div>
            {jobError ? <div className="mt-1 text-sm text-rose-300">错误：{jobError}</div> : null}
          </Card>
          <Card title="日志" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Input.TextArea value={logLines.join('\n')} readOnly rows={22} />
          </Card>
          <Card title="检测产物" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Typography.Text>文件列表（按生成结果分割）</Typography.Text>
            <div className="mt-2">
              <Table
                size="small"
                rowKey={(r) => r.path}
                columns={fileColumns as any}
                dataSource={splitFiles}
                pagination={{ pageSize: 6 }}
              />
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <Typography.Text>函数列表（按源码分割）</Typography.Text>
            <div className="mt-2">
              <Table
                size="small"
                rowKey={(r) => `${r.file_path}:${r.name}:${r.signature}`}
                columns={fnColumns as any}
                dataSource={splitFunctions}
                pagination={{ pageSize: 6 }}
              />
            </div>
          </Card>
        </Space>
      </div>

      <Drawer
        open={drawerOpen}
        title={drawerTitle}
        width={720}
        placement="right"
        onClose={() => setDrawerOpen(false)}
      >
        <Input.TextArea value={drawerText} readOnly autoSize={{ minRows: 16, maxRows: 40 }} />
      </Drawer>
    </PageScaffold>
  )
}
