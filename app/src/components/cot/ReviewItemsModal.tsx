import { Button, Input, Modal, Space, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import type { CotMode } from '../../utils/api'
import { cotQuestion, cotRefine } from '../../utils/api'

export function ReviewItemsModal(props: {
  open: boolean
  mode: CotMode
  title: string
  items: string[]
  goal: string
  constraints: string
  subtasks: string
  riskItems: string[]
  missingItems: string[]
  onApply: (next: { goal: string; constraints: string; subtasks: string; riskItems: string[]; missingItems: string[] }) => void
  onClose: () => void
}) {
  const { open, mode, title, items, goal, constraints, subtasks, riskItems, missingItems, onApply, onClose } = props
  const [idx, setIdx] = useState(0)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)

  const current = useMemo(() => items[idx] || '', [items, idx])

  useEffect(() => {
    if (!open) return
    setIdx(0)
    setAnswer('')
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!current) {
      setQuestion('')
      return
    }
    void (async () => {
      try {
        const res = await cotQuestion({
          mode,
          item: current,
          goal,
          constraints,
          subtasks,
          risk_items: riskItems,
          missing_items: missingItems
        })
        if (!res.ok) throw new Error(res.error || 'question_failed')
        setQuestion(String(res.question || ''))
      } catch (e) {
        setQuestion(`请补充：${current}（给出具体参数/范围/示例）？`)
      }
    })()
  }, [open, current, mode, goal, constraints, subtasks, riskItems, missingItems])

  async function submit() {
    if (!current) return
    if (!answer.trim()) {
      message.error('请先填写你的回答')
      return
    }
    setBusy(true)
    try {
      const res = await cotRefine({
        mode,
        item: current,
        answer,
        goal,
        constraints,
        subtasks,
        risk_items: riskItems,
        missing_items: missingItems
      })
      if (!res.ok) throw new Error(res.error || 'refine_failed')
      const nextRisk = Array.isArray(res.risk_items) ? (res.risk_items as any) : []
      const nextMissing = Array.isArray(res.missing_items) ? (res.missing_items as any) : []
      const nextItems = mode === 'risk' ? nextRisk : nextMissing
      onApply({
        goal: String(res.goal || ''),
        constraints: String(res.constraints || ''),
        subtasks: String(res.subtasks || ''),
        riskItems: nextRisk,
        missingItems: nextMissing
      })
      setAnswer('')
      message.success(res.resolved ? '该项已解决并更新' : '已更新内容')
      if (!nextItems.length) {
        onClose()
        return
      }
      setIdx((p) => Math.min(p, Math.max(0, nextItems.length - 1)))
    } catch (e) {
      message.error(e instanceof Error ? e.message : '更新失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (busy) return
        onClose()
      }}
      footer={null}
      title={title}
      width={720}
      destroyOnClose
    >
      {items.length === 0 ? (
        <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>暂无需要确认的条目。</Typography.Text>
      ) : (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>
            进度：{idx + 1} / {items.length}
          </Typography.Text>

          <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
            <Typography.Text style={{ color: 'rgba(244,244,245,0.9)' }}>{current}</Typography.Text>
          </div>

          <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>澄清问题：</Typography.Text>
          <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
            <Typography.Text style={{ color: 'rgba(244,244,245,0.8)' }}>{question || '...'}</Typography.Text>
          </div>

          <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>你的回答：</Typography.Text>
          <Input.TextArea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder="请给出具体值/范围/示例" />

          <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space wrap>
              <Button
                onClick={() => {
                  setAnswer('')
                  setIdx((p) => Math.max(0, p - 1))
                }}
                disabled={busy || idx === 0}
              >
                上一条
              </Button>
              <Button
                onClick={() => {
                  setAnswer('')
                  setIdx((p) => Math.min(items.length - 1, p + 1))
                }}
                disabled={busy || idx >= items.length - 1}
              >
                下一条
              </Button>
            </Space>
            <Space wrap>
              <Button onClick={onClose} disabled={busy}>
                关闭
              </Button>
              <Button type="primary" onClick={submit} loading={busy}>
                提交并更新
              </Button>
            </Space>
          </Space>
        </Space>
      )}
    </Modal>
  )
}
