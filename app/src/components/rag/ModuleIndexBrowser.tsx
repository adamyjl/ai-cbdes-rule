import { Badge, Button, Card, Input, Popconfirm, Space, Table, Typography, message } from 'antd'
import type { Key } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { RagIndexedModuleItem, RagIndexedModulesResponse } from '../../utils/api'
import { ragDeleteModules, ragGetModule, ragListIndexedModules } from '../../utils/api'

type Props = {
  rootDir: string
  refreshToken: number
  onOpenModule: (m: { module_key: string }) => void
}

export function ModuleIndexBrowser(props: Props) {
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [data, setData] = useState<RagIndexedModulesResponse | null>(null)
  const pageSize = 50

  async function load() {
    setBusy(true)
    try {
      const res = await ragListIndexedModules({ root_dir: props.rootDir, q: q || undefined, limit: pageSize, offset: (page - 1) * pageSize })
      setData(res)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载模块失败')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [props.refreshToken])

  useEffect(() => {
    setPage(1)
  }, [q])

  useEffect(() => {
    void load()
  }, [q, page])

  async function deleteSelected(keys: string[]) {
    if (!keys.length) return
    setBusy(true)
    try {
      const res = await ragDeleteModules(keys)
      message.success(`已删除 ${res.deleted} 个模块`)
      setSelectedRowKeys([])
      await load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo(
    () =>
      [
        {
          title: '模块 Key',
          dataIndex: 'module_key',
          key: 'module_key',
          width: 220,
          ellipsis: true
        },
        {
          title: '模块名',
          dataIndex: 'display_name',
          key: 'display_name',
          width: 220,
          ellipsis: true
        },
        {
          title: '节点/边',
          key: 'counts',
          width: 110,
          render: (_: unknown, r: RagIndexedModuleItem) => (
            <span>
              {Number(r.node_count || 0)}/{Number(r.edge_count || 0)}
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
          title: '来源',
          dataIndex: 'source',
          key: 'source',
          width: 110,
          render: (v: string) => <Badge color="geekblue" text={String(v || 'unknown')} />
        },
        {
          title: '操作',
          key: 'actions',
          width: 90,
          render: (_: unknown, r: RagIndexedModuleItem) => (
            <Popconfirm
              title="删除该模块？"
              description="会同时删除向量与模块描述（不可恢复）。"
              okText="删除"
              cancelText="取消"
              onConfirm={() => void deleteSelected([r.module_key])}
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

  const total = data?.total ?? 0

  return (
    <Card
      title="已索引模块"
      size="small"
      bordered={false}
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Text style={{ color: 'var(--app-text-muted)' }}>总数：{total}</Typography.Text>
          <Button onClick={() => void load()} loading={busy}>
            刷新
          </Button>
          <Popconfirm
            title={`删除选中 ${selectedRowKeys.length} 个模块？`}
            description="会同时删除向量与模块描述（不可恢复）。"
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
          <Input style={{ width: 360 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索模块 key/名称" allowClear />
        </Space>
        <Table
          size="small"
          className="light-table"
          rowKey="module_key"
          columns={columns as any}
          dataSource={data?.items ?? []}
          loading={busy}
          scroll={{ x: 980, y: 420 }}
          rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
          onRow={(record) => ({
            onClick: async (e) => {
              const el = e.target as HTMLElement
              if (el.closest('button') || el.closest('.ant-checkbox-wrapper') || el.closest('.ant-checkbox')) return
              try {
                await ragGetModule(record.module_key)
              } catch {
              }
              props.onOpenModule({ module_key: record.module_key })
            }
          })}
          pagination={{ current: page, pageSize, total, onChange: (p) => setPage(p), showSizeChanger: false }}
        />
      </div>
    </Card>
  )
}
