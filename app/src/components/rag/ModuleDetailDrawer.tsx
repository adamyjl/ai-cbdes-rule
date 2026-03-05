import { Button, Divider, Drawer, Space, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { ragGetModule } from '../../utils/api'

type Props = {
  open: boolean
  moduleKey: string | null
  onClose: () => void
}

export function ModuleDetailDrawer(props: Props) {
  const [busy, setBusy] = useState(false)
  const [mod, setMod] = useState<any | null>(null)

  const title = useMemo(() => {
    if (!mod) return '模块详情'
    return `${mod.display_name || mod.module_key}`
  }, [mod])

  async function load() {
    if (!props.moduleKey) return
    setBusy(true)
    try {
      const res = await ragGetModule(props.moduleKey)
      if (!res.ok || !res.module) throw new Error(res.error || 'not_found')
      setMod(res.module)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载模块失败')
      setMod(null)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (props.open) void load()
  }, [props.open, props.moduleKey])

  return (
    <Drawer
      title={title}
      open={props.open}
      onClose={props.onClose}
      width={980}
      extra={
        <Space>
          <Button onClick={load} loading={busy}>
            刷新
          </Button>
        </Space>
      }
    >
      {!mod ? (
        <Typography.Text style={{ color: 'var(--app-text-muted)' }}>未选择模块</Typography.Text>
      ) : (
        <div className="flex flex-col gap-3">
          <Typography.Text style={{ color: 'var(--app-text-muted)' }}>module_key: {mod.module_key}</Typography.Text>
          <Typography.Text style={{ color: 'var(--app-text-muted)' }}>root_dir: {mod.root_dir}</Typography.Text>
          <Typography.Text style={{ color: 'var(--app-text-muted)' }}>entry_function_id: {mod.entry_function_id || '-'}</Typography.Text>
          {mod.doc_zh ? (
            <Typography.Paragraph style={{ margin: 0, color: 'var(--app-text-muted)' }}>说明：{mod.doc_zh}</Typography.Paragraph>
          ) : null}
          {mod.doc_en ? (
            <Typography.Paragraph style={{ margin: 0, color: 'var(--app-text-muted)' }}>Summary: {mod.doc_en}</Typography.Paragraph>
          ) : null}

          <Divider style={{ margin: '8px 0' }} />

          <Typography.Title level={5} style={{ margin: 0 }}>
            模块图（nodes_json / edges_json）
          </Typography.Title>
          <Typography.Paragraph
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            }}
          >
            {JSON.stringify(
              {
                nodes: (() => {
                  try {
                    return JSON.parse(String(mod.nodes_json || '[]'))
                  } catch {
                    return []
                  }
                })(),
                edges: (() => {
                  try {
                    return JSON.parse(String(mod.edges_json || '[]'))
                  } catch {
                    return []
                  }
                })()
              },
              null,
              2
            )}
          </Typography.Paragraph>
        </div>
      )}
    </Drawer>
  )
}
