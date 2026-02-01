import { Button, Input, Modal, Space, Table, Tabs, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { ragListFunctions } from '../../utils/api'

export type RelatedRow =
  | {
      rowId: string
      kind: 'function'
      function_id: string
      name: string
      module: string
      source: 'linked' | 'rag' | 'manual'
      file_path?: string
      signature?: string
      score?: number
    }
  | {
      rowId: string
      kind: 'module'
      module_id: string
      name: string
      source: 'workflow' | 'manual'
    }

export function AddRelatedModal(props: {
  open: boolean
  rootDir: string
  onAdd: (rows: RelatedRow[]) => void
  onClose: () => void
}) {
  const { open, rootDir, onAdd, onClose } = props
  const [active, setActive] = useState<'functions' | 'modules'>('functions')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [moduleId, setModuleId] = useState('')
  const [moduleName, setModuleName] = useState('')

  useEffect(() => {
    if (!open) return
    setActive('functions')
    setQ('')
    setItems([])
    setModuleId('')
    setModuleName('')
  }, [open])

  async function search() {
    setBusy(true)
    try {
      const res = await ragListFunctions({ root_dir: rootDir || undefined, q: q || undefined, limit: 20, offset: 0 })
      setItems(Array.isArray(res.items) ? (res.items as any) : [])
    } catch (e) {
      message.error(e instanceof Error ? e.message : '搜索失败')
    } finally {
      setBusy(false)
    }
  }

  const functionColumns = useMemo(
    () =>
      [
        { title: '函数', key: 'fn', render: (_: any, r: any) => <Typography.Text>{String(r.display_name || r.function_id)}</Typography.Text> },
        { title: '模块', dataIndex: 'module', key: 'module', width: 110 },
        {
          title: '加入',
          key: 'add',
          width: 80,
          render: (_: any, r: any) => (
            <Button
              size="small"
              onClick={() => {
                const fid = String(r.function_id)
                onAdd([
                  {
                    rowId: `fn:manual:${fid}`,
                    kind: 'function',
                    function_id: fid,
                    name: String(r.display_name || fid),
                    module: String(r.module || '-'),
                    source: 'manual',
                    file_path: String(r.file_path || ''),
                    signature: String(r.signature || '')
                  }
                ])
                message.success('已加入')
              }}
            >
              +
            </Button>
          )
        }
      ] as any,
    [onAdd]
  )

  return (
    <Modal open={open} onCancel={onClose} footer={null} title="增加关联项" width={900} destroyOnClose>
      <Tabs
        activeKey={active}
        onChange={(k) => setActive(k as any)}
        items={[
          {
            key: 'functions',
            label: '关联函数',
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="按函数名/ID/路径搜索" />
                  <Button type="primary" loading={busy} onClick={search}>
                    搜索
                  </Button>
                </Space.Compact>
                <Table size="small" rowKey="function_id" pagination={false} columns={functionColumns} dataSource={items} />
              </Space>
            )
          },
          {
            key: 'modules',
            label: '关联模块',
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Input value={moduleId} onChange={(e) => setModuleId(e.target.value)} placeholder="模块ID（如 workflow id / module name）" />
                <Input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="显示名称（可选）" />
                <Space wrap>
                  <Button
                    type="primary"
                    onClick={() => {
                      if (!moduleId.trim()) {
                        message.error('请填写模块ID')
                        return
                      }
                      const id = moduleId.trim()
                      onAdd([
                        {
                          rowId: `module:manual:${id}`,
                          kind: 'module',
                          module_id: id,
                          name: moduleName.trim() || id,
                          source: 'manual'
                        }
                      ])
                      message.success('已加入')
                    }}
                  >
                    加入模块
                  </Button>
                  <Button onClick={onClose}>完成</Button>
                </Space>
              </Space>
            )
          }
        ]}
      />
    </Modal>
  )
}

