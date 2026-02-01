import { PageScaffold } from '../PageScaffold'
import { Button, Card, Divider, Drawer, Input, Select, Space, Table, Tag, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import type { ArchiveEvent, ReleaseModuleItem, ReleaseRagIndexItem } from '../../utils/api'
import { releaseModulesUpsert, releaseRagIndex } from '../../utils/api'
import { useArchiveStore } from '../../store/archiveStore'

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

function extractLeadingComment(code: string) {
  const s = String(code || '')
  const m = s.match(/^\s*(\/\*\*[\s\S]*?\*\/|\/\*[\s\S]*?\*\/|\/\/.*(?:\r?\n\/\/.*)*)/)
  return m ? String(m[1] || '').trim() : ''
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
    files.push({ path, language, content, comment: extractLeadingComment(content) })
  }
  if (files.length) return files
  const re2 = /^```(cpp|c\+\+|c)\s*\n([\s\S]*?)\n```\s*$/gim
  while ((m = re2.exec(s))) {
    const language = String(m[1] || '').trim() || 'cpp'
    const content = String(m[2] || '').trim()
    if (!content) break
    files.push({ path: 'main.cpp', language, content, comment: extractLeadingComment(content) })
    break
  }
  return files
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
      const content = src.slice(commentStart, closeBraceIndex + 1).trim()
      out.push({ file_path: f.path, name, signature, content, comment })
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

function isGatePassed(ev: ArchiveEvent) {
  if (String(ev.type) !== 'gate.run') return false
  const payload = (ev.payload as any) || {}
  if (String(payload.stage || '') !== 'done') return false
  const statuses: any[] = Array.isArray(payload.statuses) ? payload.statuses : []
  const cfg = payload.config && typeof payload.config === 'object' ? payload.config : {}
  const enableUnit = Boolean((cfg as any).enable_unit)
  const enableCoverage = Boolean((cfg as any).enable_coverage)
  const required = ['compile', 'static']
  if (enableUnit) required.push('unit')
  if (enableCoverage) required.push('coverage')
  const map = new Map<string, string>()
  for (const s of statuses) map.set(String((s as any).step || ''), String((s as any).status || ''))
  for (const k of required) {
    if (map.get(k) !== 'success') return false
  }
  return true
}

function makeVersionFromEvent(ev: ArchiveEvent) {
  const ts = (ev as any).ts ? new Date(String((ev as any).ts)) : new Date()
  const yyyy = String(ts.getFullYear())
  const mm = String(ts.getMonth() + 1).padStart(2, '0')
  const dd = String(ts.getDate()).padStart(2, '0')
  const id8 = String(ev.id).slice(0, 8)
  return `v${yyyy}${mm}${dd}-${id8}`
}

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

export function ReleasePage() {
  const STORAGE_KEY = 'online:release_state:v1'

  const events = useArchiveStore((s) => s.events)
  const loadingEvents = useArchiveStore((s) => s.loading)
  const refreshEvents = useArchiveStore((s) => s.refresh)
  const appendArchive = useArchiveStore((s) => s.append)

  const [selectedGateEventId, setSelectedGateEventId] = useState<string | undefined>(undefined)
  const [version, setVersion] = useState('')
  const [generatedResult, setGeneratedResult] = useState('')
  const [fileSplits, setFileSplits] = useState<SplitFile[]>([])
  const [functionSplits, setFunctionSplits] = useState<SplitFunction[]>([])

  const [ragBusy, setRagBusy] = useState(false)
  const [ragRootDir, setRagRootDir] = useState('')
  const [ragItems, setRagItems] = useState<ReleaseRagIndexItem[]>([])
  const [moduleBusy, setModuleBusy] = useState(false)
  const [namespace, setNamespace] = useState('default')
  const [modules, setModules] = useState<ReleaseModuleItem[]>([])
  const [publishedArchiveId, setPublishedArchiveId] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTitle, setDrawerTitle] = useState('')
  const [drawerText, setDrawerText] = useState('')

  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = loadJson(STORAGE_KEY)
    if (saved) {
      if (typeof saved.selectedGateEventId === 'string') setSelectedGateEventId(saved.selectedGateEventId)
      if (typeof saved.version === 'string') setVersion(saved.version)
      if (typeof saved.generatedResult === 'string') setGeneratedResult(saved.generatedResult)
      if (Array.isArray(saved.fileSplits)) setFileSplits(saved.fileSplits)
      if (Array.isArray(saved.functionSplits)) setFunctionSplits(saved.functionSplits)
      if (typeof saved.ragRootDir === 'string') setRagRootDir(saved.ragRootDir)
      if (Array.isArray(saved.ragItems)) setRagItems(saved.ragItems)
      if (typeof saved.namespace === 'string') setNamespace(saved.namespace)
      if (Array.isArray(saved.modules)) setModules(saved.modules)
      if (typeof saved.publishedArchiveId === 'string') setPublishedArchiveId(saved.publishedArchiveId)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveJson(STORAGE_KEY, {
      selectedGateEventId,
      version,
      generatedResult,
      fileSplits,
      functionSplits,
      ragRootDir,
      ragItems,
      namespace,
      modules,
      publishedArchiveId
    })
  }, [hydrated, selectedGateEventId, version, generatedResult, fileSplits, functionSplits, ragRootDir, ragItems, namespace, modules, publishedArchiveId])

  async function reloadEvents() {
    await refreshEvents(300)
  }

  const gateCandidates = useMemo(() => events.filter(isGatePassed), [events])
  const selectedGateEvent = useMemo(
    () => gateCandidates.find((e) => e.id === selectedGateEventId) || null,
    [gateCandidates, selectedGateEventId]
  )

  function applyGateEvent(ev: ArchiveEvent) {
    const payload = (ev.payload as any) || {}
    const raw = String(payload.generated_result || '').trim()
    setGeneratedResult(raw)
    const fs = Array.isArray(payload.file_splits) && payload.file_splits.length ? payload.file_splits : extractFilesFromMarkdown(raw)
    const fns = Array.isArray(payload.function_splits) && payload.function_splits.length ? payload.function_splits : extractFunctionsFromFiles(fs)
    setFileSplits(fs)
    setFunctionSplits(fns)
  }

  async function confirmSource() {
    if (!selectedGateEvent) {
      message.error('请先选择一条门禁通过的 gate.run 档案')
      return
    }
    applyGateEvent(selectedGateEvent)
    if (!version.trim()) setVersion(makeVersionFromEvent(selectedGateEvent))
    setRagRootDir('')
    setRagItems([])
    setModules([])
    setPublishedArchiveId('')
    message.success('已加载发布源')
  }

  async function runRagIndex() {
    if (!version.trim()) {
      message.error('请先生成版本号')
      return
    }
    if (!functionSplits.length) {
      message.error('缺少函数切分结果')
      return
    }
    setRagBusy(true)
    try {
      const res = await releaseRagIndex({ version, functions: functionSplits })
      if (!res.ok) throw new Error(res.error || 'rag_index_failed')
      setRagRootDir(String(res.root_dir || ''))
      setRagItems(Array.isArray(res.items) ? res.items : [])
      message.success(`RAG 索引已写入：${res.upserted ?? 0} 条`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'RAG 索引失败')
    } finally {
      setRagBusy(false)
    }
  }

  async function runModulesUpsert() {
    if (!version.trim()) {
      message.error('请先生成版本号')
      return
    }
    if (!functionSplits.length) {
      message.error('缺少函数切分结果')
      return
    }
    setModuleBusy(true)
    try {
      const res = await releaseModulesUpsert({ version, namespace, functions: functionSplits })
      if (!res.ok) throw new Error(res.error || 'module_upsert_failed')
      setModules(Array.isArray(res.modules) ? res.modules : [])
      message.success(`模块已入库：${res.upserted ?? 0} 个`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '模块入库失败')
    } finally {
      setModuleBusy(false)
    }
  }

  async function publish() {
    if (!selectedGateEvent) {
      message.error('请先选择发布源')
      return
    }
    if (!version.trim()) {
      message.error('请先生成版本号')
      return
    }
    try {
      const ev = await appendArchive('release.publish', {
        source_gate_event_id: selectedGateEvent.id,
        version,
        generated_result: generatedResult,
        file_splits: fileSplits,
        function_splits: functionSplits,
        namespace,
        rag_index: ragRootDir ? { root_dir: ragRootDir, count: ragItems.length } : null,
        rag_items: ragItems,
        modules
      })
      setPublishedArchiveId(String(ev.id))
      message.success('已发布并入档')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '发布失败')
    }
  }

  const ragColumns = useMemo(
    () =>
      [
        { title: '函数ID', dataIndex: 'function_id', key: 'function_id', width: 170, ellipsis: true },
        { title: '名称', dataIndex: 'display_name', key: 'display_name', width: 180, ellipsis: true },
        { title: '模块', dataIndex: 'module', key: 'module', width: 90 },
        { title: '文件', dataIndex: 'file_path', key: 'file_path', ellipsis: true },
        {
          title: '操作',
          key: 'actions',
          width: 90,
          render: (_: unknown, r: ReleaseRagIndexItem) => (
            <Button
              size="small"
              onClick={() => {
                const fn =
                  functionSplits.find((x) => x.name === r.display_name && String(r.file_path).endsWith(String(x.file_path).replace('\\', '/'))) ||
                  functionSplits.find((x) => x.name === r.display_name) ||
                  null
                const text = fn ? fn.content : r.doc_zh
                setDrawerTitle(r.display_name)
                setDrawerText(text)
                setDrawerOpen(true)
              }}
            >
              查看
            </Button>
          )
        }
      ] as const,
    [functionSplits]
  )

  const moduleColumns = useMemo(
    () =>
      [
        { title: '模块Key', dataIndex: 'module_key', key: 'module_key', width: 220, ellipsis: true },
        { title: '根函数', dataIndex: 'root_function', key: 'root_function', width: 160, ellipsis: true },
        { title: '函数数', key: 'count', width: 90, render: (_: unknown, r: ReleaseModuleItem) => <span>{r.functions.length}</span> },
        {
          title: '操作',
          key: 'actions',
          width: 90,
          render: (_: unknown, r: ReleaseModuleItem) => (
            <Button
              size="small"
              onClick={() => {
                setDrawerTitle(r.module_key)
                setDrawerText(JSON.stringify(r, null, 2))
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
      title="任务结束发布"
      description="生成版本号与变更摘要，导出 patch/文件清单/单测/说明与完整证据链包，并沉淀到资产库。"
    >
      <div className="md:col-span-7">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card
            title={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>发布源（门禁通过）</span>
                <Space wrap>
                  <Button size="small" onClick={reloadEvents} loading={loadingEvents}>
                    刷新档案
                  </Button>
                  <Button size="small" type="primary" onClick={confirmSource}>
                    完成选择
                  </Button>
                </Space>
              </div>
            }
            size="small"
            bordered={false}
            style={{ background: 'rgba(9, 9, 11, 0.6)' }}
          >
            <Typography.Paragraph style={{ marginTop: 0, color: 'rgba(244,244,245,0.72)' }}>
              仅支持选择 4 步门禁均通过（compile/static/unit/coverage）的 gate.run 档案作为发布源。
            </Typography.Paragraph>
            <Select
              value={selectedGateEventId}
              onChange={(v) => setSelectedGateEventId(v)}
              style={{ width: '100%' }}
              placeholder="选择通过门禁的 gate.run 档案"
              options={gateCandidates.map((e) => ({ value: e.id, label: `gate.run · ${String(e.id).slice(0, 10)}…` }))}
            />
          </Card>

          <Card title="版本号" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Space wrap>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="自动生成版本号" style={{ width: 260 }} />
              <Button
                onClick={() => {
                  if (!selectedGateEvent) {
                    message.error('请先选择发布源')
                    return
                  }
                  setVersion(makeVersionFromEvent(selectedGateEvent))
                }}
              >
                预生成/刷新
              </Button>
              {publishedArchiveId ? <Tag color="green">已入档：{publishedArchiveId.slice(0, 8)}…</Tag> : <Tag>未发布</Tag>}
            </Space>
          </Card>

          <Card title="发布结果" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Typography.Text>生成结果（原始，多文件 Markdown）</Typography.Text>
            <div className="mt-2">
              <Input.TextArea value={generatedResult} readOnly rows={14} />
            </div>
          </Card>

          <Card title="RAG 索引" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Space wrap>
              <Button type="primary" loading={ragBusy} onClick={runRagIndex}>
                添加 RAG 索引
              </Button>
              {ragRootDir ? <Tag color="blue">root_dir: {ragRootDir}</Tag> : <Tag>未入库</Tag>}
            </Space>
            <div className="mt-3">
              <Table size="small" rowKey={(r) => r.function_id} columns={ragColumns as any} dataSource={ragItems} pagination={{ pageSize: 6 }} />
            </div>
          </Card>

          <Card title="模块入库" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Space wrap>
              <Input value={namespace} onChange={(e) => setNamespace(e.target.value)} placeholder="命名空间" style={{ width: 240 }} />
              <Button type="primary" loading={moduleBusy} onClick={runModulesUpsert}>
                添加模块入库
              </Button>
            </Space>
            <div className="mt-3">
              <Table
                size="small"
                rowKey={(r) => r.module_key}
                columns={moduleColumns as any}
                dataSource={modules}
                pagination={{ pageSize: 6 }}
              />
            </div>
          </Card>

          <Card title="发布并入档" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
            <Typography.Paragraph style={{ marginTop: 0, color: 'rgba(244,244,245,0.72)' }}>
              完成版本号命名、RAG 索引与模块入库后，点击发布将写入档案（release.publish），可从档案管理回放跳转加载。
            </Typography.Paragraph>
            <Space wrap>
              <Button type="primary" onClick={publish}>
                发布并入档
              </Button>
            </Space>
          </Card>
        </Space>
      </div>

      <div className="md:col-span-5">
        <Card title="发布摘要" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div className="flex items-center justify-between">
              <Typography.Text>发布源</Typography.Text>
              <Typography.Text code>{selectedGateEventId ? `${selectedGateEventId.slice(0, 10)}…` : '-'}</Typography.Text>
            </div>
            <div className="flex items-center justify-between">
              <Typography.Text>版本号</Typography.Text>
              <Typography.Text code>{version || '-'}</Typography.Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div className="flex items-center justify-between">
              <Typography.Text>RAG 状态</Typography.Text>
              {ragItems.length ? <Tag color="green">ok · {ragItems.length}</Tag> : <Tag>未入库</Tag>}
            </div>
            <div className="flex items-center justify-between">
              <Typography.Text>模块状态</Typography.Text>
              {modules.length ? <Tag color="green">ok · {modules.length}</Tag> : <Tag>未入库</Tag>}
            </div>
          </Space>
        </Card>
      </div>

      <Drawer open={drawerOpen} title={drawerTitle} width={720} placement="right" onClose={() => setDrawerOpen(false)}>
        <Input.TextArea value={drawerText} readOnly autoSize={{ minRows: 16, maxRows: 40 }} />
      </Drawer>
    </PageScaffold>
  )
}
