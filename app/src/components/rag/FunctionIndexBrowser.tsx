import { Badge, Button, Card, Input, Popconfirm, Select, Space, Switch, Table, Typography, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Key } from 'react'
import type { FunctionIndexItem, RagFunctionsResponse, RagModulesResponse } from '../../utils/api'
import { ragDeleteFunctions, ragListFunctions, ragListModules } from '../../utils/api'

type Props = {
  rootDir: string
  refreshToken: number
  onOpenFunction: (fn: { function_id: string; display_name: string; module: string }) => void
}

export function FunctionIndexBrowser(props: Props) {
  const [busy, setBusy] = useState(false)
  const [modules, setModules] = useState<RagModulesResponse | null>(null)
  const [functions, setFunctions] = useState<RagFunctionsResponse | null>(null)
  const [selectedModule, setSelectedModule] = useState<string | undefined>(undefined)
  const [selectedKind, setSelectedKind] = useState<string | undefined>(undefined)
  const [q, setQ] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [filterByRootDir, setFilterByRootDir] = useState(false)
  const didInitRef = useRef(false)
  const pageChunk = 1000

  const cacheKeyMods = useMemo(() => {
    const scope = filterByRootDir ? `root:${props.rootDir || ''}` : 'all'
    return `ragmgmt:fnmods:v1:${scope}`
  }, [filterByRootDir, props.rootDir])

  const cacheKeyFns = useMemo(() => {
    const scope = filterByRootDir ? `root:${props.rootDir || ''}` : 'all'
    return `ragmgmt:fns:v1:${scope}`
  }, [filterByRootDir, props.rootDir])

  const readCache = <T,>(key: string): any | null => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const writeCache = (key: string, payload: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({ ...payload, savedAt: Date.now() }))
    } catch {
    }
  }

  const loadAll = async <T,>(loader: (p: { offset: number; limit: number }) => Promise<{ total: number; items: T[] }>) => {
    let offset = 0
    const items: T[] = []
    for (let i = 0; i < 80; i += 1) {
      const res = await loader({ offset, limit: pageChunk })
      const got = Array.isArray((res as any).items) ? ((res as any).items as T[]) : []
      items.push(...got)
      const total = Number((res as any).total ?? items.length)
      if (items.length >= total) break
      if (!got.length) break
      offset += got.length
    }
    return items
  }

  async function deleteSelected(ids: string[]) {
    if (!ids.length) return
    setBusy(true)
    try {
      const res = await ragDeleteFunctions(ids)
      message.success(`已删除 ${res.deleted} 个函数`)
      setSelectedRowKeys([])
      await load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  async function load() {
    setBusy(true)
    try {
      const effectiveRootDir = filterByRootDir ? props.rootDir : undefined
      const useCache = !q && !selectedModule && !selectedKind

      if (useCache) {
        const cachedM = readCache(cacheKeyMods)
        const cachedF = readCache(cacheKeyFns)
        if (cachedM?.modules?.length) {
          setModules({ total: Number(cachedM.total || 0), embedded: Number(cachedM.embedded || 0), modules: cachedM.modules })
        }
        if (cachedF?.items?.length) {
          setFunctions({ total: Number(cachedF.total || cachedF.items.length), limit: cachedF.items.length, offset: 0, items: cachedF.items })
        }

        if (cachedF?.total) {
          const head = await ragListFunctions({ root_dir: effectiveRootDir, limit: 1, offset: 0 })
          if (Number(head.total) === Number(cachedF.total)) {
            if (!cachedM) {
              const m = await ragListModules(effectiveRootDir)
              setModules(m)
              writeCache(cacheKeyMods, { total: Number(m.total || 0), embedded: Number(m.embedded || 0), modules: m.modules })
            }
            return
          }
        }
      }

      const [m, items] = await Promise.all([
        ragListModules(effectiveRootDir),
        loadAll<FunctionIndexItem>(({ offset, limit }) =>
          ragListFunctions({ root_dir: effectiveRootDir, module: selectedModule, kind: selectedKind, q: q || undefined, limit, offset }) as any
        )
      ])
      setModules(m)
      setFunctions({ total: items.length, limit: items.length, offset: 0, items } as any)
      if (useCache) {
        writeCache(cacheKeyMods, { total: Number(m.total || 0), embedded: Number(m.embedded || 0), modules: m.modules })
        writeCache(cacheKeyFns, { total: items.length, items })
      }
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [props.refreshToken])

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true
      return
    }
    setSelectedRowKeys([])
  }, [selectedModule, selectedKind, q])

  useEffect(() => {
    void load()
  }, [selectedModule, selectedKind, q, filterByRootDir])

  const moduleOptions = useMemo(() => {
    const opts = [{ value: '', label: '全部模块' }]
    for (const m of modules?.modules ?? []) {
      opts.push({ value: m.module, label: `${m.module} (${m.count})` })
    }
    return opts
  }, [modules])

  const columns = useMemo(
    () =>
      [
        {
          title: '模块',
          dataIndex: 'module',
          key: 'module',
          width: 130,
          render: (v: string) => <Badge color="geekblue" text={v} />
        },
        {
          title: '分类',
          dataIndex: 'kind',
          key: 'kind',
          width: 110,
          render: (v: string) => {
            const k = String(v || 'glue')
            const color = k === 'node' ? 'green' : k === 'platform' ? 'purple' : 'default'
            return <Badge color={color as any} text={k} />
          }
        },
        {
          title: '函数',
          dataIndex: 'display_name',
          key: 'display_name',
          width: 220,
          ellipsis: true
        },
        { title: '签名', dataIndex: 'signature', key: 'signature', ellipsis: true },
        { title: '文件', dataIndex: 'file_path', key: 'file_path', ellipsis: true },
        {
          title: '行',
          key: 'lines',
          width: 110,
          render: (_: unknown, r: FunctionIndexItem) => (
            <span>
              {r.start_line}-{r.end_line}
            </span>
          )
        },
        {
          title: '索引',
          dataIndex: 'embedded',
          key: 'embedded',
          width: 90,
          render: (v: number) => (v ? <Badge color="green" text="embedded" /> : <Badge color="default" text="pending" />)
        },
        {
          title: '操作',
          key: 'actions',
          width: 90,
          render: (_: unknown, r: FunctionIndexItem) => (
            <Popconfirm
              title="删除该函数？"
              description="会同时删除向量与描述信息（不可恢复）。"
              okText="删除"
              cancelText="取消"
              onConfirm={() => void deleteSelected([r.function_id])}
            >
              <Button
                danger
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                删除
              </Button>
            </Popconfirm>
          )
        }
      ] as const,
    [deleteSelected]
  )

  const total = functions?.total ?? 0
  const embedded = modules?.embedded ?? 0

  return (
    <Card
      title="已索引函数"
      size="small"
      bordered={false}
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Text style={{ color: 'var(--app-text-muted)' }}>
            总数：{modules?.total ?? '-'}，已向量化：{embedded}
          </Typography.Text>
          <Button onClick={() => void load()} loading={busy}>
            刷新
          </Button>
          <Space size={6} align="center">
            <Switch
              checked={filterByRootDir}
              onChange={(v) => {
                setFilterByRootDir(v)
                setSelectedModule(undefined)
                setQ('')
              }}
            />
            <Typography.Text style={{ color: 'var(--app-text-muted)' }}>按 Root Dir 过滤</Typography.Text>
          </Space>
          <Popconfirm
            title={`删除选中 ${selectedRowKeys.length} 个函数？`}
            description="会同时删除向量与描述信息（不可恢复）。"
            okText="删除"
            cancelText="取消"
            onConfirm={() => void deleteSelected(selectedRowKeys.map(String))}
            disabled={selectedRowKeys.length === 0}
          >
            <Button danger disabled={selectedRowKeys.length === 0} loading={busy}>
              删除选中
            </Button>
          </Popconfirm>
        </div>
        <Space wrap>
          <Select
            style={{ width: 240 }}
            value={selectedModule ?? ''}
            onChange={(v) => setSelectedModule(v || undefined)}
            options={moduleOptions}
          />
          <Select
            style={{ width: 200 }}
            value={selectedKind ?? ''}
            onChange={(v) => setSelectedKind(v || undefined)}
            options={[
              { value: '', label: '全部分类' },
              { value: 'node', label: 'node（算法/关键业务）' },
              { value: 'glue', label: 'glue（工程胶水）' },
              { value: 'platform', label: 'platform（基础设施）' }
            ]}
          />
          <Input
            style={{ width: 360 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索函数名/签名/文件路径"
            allowClear
          />
        </Space>
        <Table
          size="small"
          className="light-table"
          rowKey="function_id"
          columns={columns as any}
          dataSource={functions?.items ?? []}
          loading={busy}
          scroll={{ x: 1100, y: 520 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys)
          }}
          onRow={(record) => ({
            onClick: (e) => {
              const el = e.target as HTMLElement
              if (el.closest('button') || el.closest('.ant-checkbox-wrapper') || el.closest('.ant-checkbox')) return
              props.onOpenFunction({
                function_id: record.function_id,
                display_name: record.display_name,
                module: String(record.module)
              })
            }
          })}
          pagination={false}
        />
        <Typography.Text style={{ color: 'var(--app-text-muted)' }}>
          点击行可打开详情（查看源码、编辑保存、测试入口）。
        </Typography.Text>
      </div>
    </Card>
  )
}
