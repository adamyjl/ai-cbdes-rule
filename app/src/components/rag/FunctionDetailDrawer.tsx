import { Button, Divider, Drawer, Form, Input, InputNumber, Modal, Space, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { ragEnrichFunction, ragGetFunction, ragRunTest, ragSaveFunctionSource } from '../../utils/api'

type Props = {
  open: boolean
  functionId: string | null
  rootDir: string
  onClose: () => void
  onSaved: () => void
}

function guessTestCommand(fn: any) {
  const filePath = String(fn?.file_path ?? '')
  const lang = String(fn?.language ?? '')
  if (lang === 'py' || filePath.toLowerCase().endsWith('.py')) {
    return `python -m py_compile "${filePath}"`
  }
  return ''
}

export function FunctionDetailDrawer(props: Props) {
  const [busy, setBusy] = useState(false)
  const [fn, setFn] = useState<any | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [testOpen, setTestOpen] = useState(false)
  const [testCwd, setTestCwd] = useState('')
  const [testCmd, setTestCmd] = useState('')
  const [testTimeout, setTestTimeout] = useState(60000)
  const [testOut, setTestOut] = useState<any | null>(null)

  const title = useMemo(() => {
    if (!fn) return '函数详情'
    return `${fn.module} · ${fn.display_name}`
  }, [fn])

  async function load() {
    if (!props.functionId) return
    setBusy(true)
    try {
      const res = await ragGetFunction(props.functionId)
      if (!res.ok || !res.function) throw new Error(res.error || 'not_found')
      setFn(res.function)
      setDraft(String(res.function.code ?? ''))
      setEditMode(false)
      setTestOut(null)
      setTestCwd(props.rootDir)
      setTestCmd(guessTestCommand(res.function))
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载函数失败')
      setFn(null)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (props.open) void load()
  }, [props.open, props.functionId])

  async function save() {
    if (!props.functionId) return
    setBusy(true)
    try {
      const res = await ragSaveFunctionSource({
        function_id: props.functionId,
        new_code: draft,
        write_file: true,
        root_dir: props.rootDir,
        re_enrich: false
      })
      if (!res.ok) throw new Error(res.error || 'save_failed')
      message.success('保存成功，并已重新向量化该函数')
      await load()
      props.onSaved()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function enrichNow() {
    if (!props.functionId) return
    setBusy(true)
    try {
      const res = await ragEnrichFunction(props.functionId, props.rootDir)
      if (!res.ok) throw new Error(res.error || 'enrich_failed')
      message.success('已生成描述并更新索引')
      await load()
      props.onSaved()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '生成描述失败')
    } finally {
      setBusy(false)
    }
  }

  async function runTest() {
    setBusy(true)
    try {
      const res = await ragRunTest({ cwd: testCwd, command: testCmd, timeout_ms: testTimeout })
      setTestOut(res)
      if (res.ok) message.success(`测试成功（${res.duration_ms}ms）`)
      else message.error(`测试失败：exit_code=${res.exit_code}`)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '测试执行失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Drawer
        title={title}
        open={props.open}
        onClose={props.onClose}
        width={980}
        styles={{ body: { paddingTop: 12 } }}
        extra={
          <Space>
            <Button onClick={enrichNow} disabled={!fn} loading={busy}>
              生成描述
            </Button>
            <Button onClick={() => setTestOpen(true)} disabled={!fn}>
              测试
            </Button>
            {!editMode ? (
              <Button type="primary" onClick={() => setEditMode(true)} disabled={!fn}>
                编辑
              </Button>
            ) : (
              <>
                <Button onClick={() => setEditMode(false)} disabled={busy}>
                  取消
                </Button>
                <Button type="primary" onClick={save} loading={busy}>
                  保存
                </Button>
              </>
            )}
          </Space>
        }
      >
        {!fn ? (
          <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>未选择函数</Typography.Text>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>
                file: {fn.file_path}:{fn.start_line}-{fn.end_line}
              </Typography.Text>
              {fn.signature ? (
                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {fn.signature}
                </Typography.Paragraph>
              ) : null}
              {fn.doc_zh ? (
                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: 'rgba(244,244,245,0.72)' }}>
                  说明：{fn.doc_zh}
                </Typography.Paragraph>
              ) : null}
              {fn.doc_en ? (
                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: 'rgba(244,244,245,0.6)' }}>
                  Summary: {fn.doc_en}
                </Typography.Paragraph>
              ) : null}
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {!editMode ? (
              <Typography.Paragraph
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                }}
              >
                {String(fn.code ?? '')}
              </Typography.Paragraph>
            ) : (
              <Input.TextArea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoSize={{ minRows: 18 }}
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
              />
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title="测试执行"
        open={testOpen}
        onCancel={() => setTestOpen(false)}
        onOk={() => void runTest()}
        okText="运行"
        confirmLoading={busy}
        width={900}
      >
        <Form layout="vertical">
          <Form.Item label="工作目录 (cwd)" required>
            <Input value={testCwd} onChange={(e) => setTestCwd(e.target.value)} />
          </Form.Item>
          <Form.Item label="命令" required>
            <Input value={testCmd} onChange={(e) => setTestCmd(e.target.value)} placeholder="例如：python -m py_compile file.py" />
          </Form.Item>
          <Form.Item label="超时 (ms)">
            <InputNumber min={1000} max={600000} value={testTimeout} onChange={(v) => setTestTimeout(Number(v ?? 60000))} />
          </Form.Item>
        </Form>

        {testOut ? (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <Typography.Text>exit_code: {testOut.exit_code}，duration_ms: {testOut.duration_ms}</Typography.Text>
            <Divider style={{ margin: '8px 0' }} />
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              stdout
            </Typography.Title>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
              {testOut.stdout || ''}
            </Typography.Paragraph>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              stderr
            </Typography.Title>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
              {testOut.stderr || ''}
            </Typography.Paragraph>
          </>
        ) : null}

        <Typography.Text style={{ color: 'rgba(244,244,245,0.5)' }}>
          为安全起见，仅允许以 python/py/pytest/npm/pnpm/ctest/cmake 等命令开头。
        </Typography.Text>
      </Modal>
    </>
  )
}
