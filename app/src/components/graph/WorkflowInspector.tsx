import { Button, Divider, Form, Input, Segmented, Space, Tabs, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import type { WorkflowEdge, WorkflowNode } from './workflowTypes'
import { computeGraphSummary } from './graphUtils'

export function WorkflowInspector(props: {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  onUpdateNode: (id: string, patch: Partial<WorkflowNode>) => void
  onRemoveNode: (id: string) => void
  onRunTest: (node: WorkflowNode) => Promise<void>
  busy: boolean
}) {
  const { nodes, edges, selectedNodeId, onUpdateNode, onRemoveNode, onRunTest, busy } = props
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId])
  const [view, setView] = useState<'summary' | 'node'>('summary')

  const summary = useMemo(() => computeGraphSummary(nodes, edges), [nodes, edges])
  const summaryJson = useMemo(() => JSON.stringify(summary, null, 2), [summary])

  function copySummary() {
    void navigator.clipboard
      .writeText(summaryJson)
      .then(() => message.success('已复制'))
      .catch(() => message.error('复制失败'))
  }

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        <Segmented
          value={view}
          onChange={(v) => setView(v as any)}
          options={[
            { label: '全图汇总', value: 'summary' },
            { label: '节点属性', value: 'node' }
          ]}
          block
        />

        {view === 'summary' ? (
          <Tabs
            items={[
              {
                key: 'inputs',
                label: `全局输入 (${summary.globalInputs.length})`,
                children:
                  summary.globalInputs.length === 0 ? (
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>所有输入已被满足</Typography.Text>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      {summary.globalInputs.map((it) => (
                        <div
                          key={it.nodeId}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            border: '1px solid rgba(63,63,70,0.7)',
                            background: 'rgba(24,24,27,0.5)'
                          }}
                        >
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.9)' }}>{it.nodeName}</Typography.Text>
                          <br />
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.6)' }}>
                            {it.keys.length ? it.keys.join(', ') : '(无可解析的输入键)'}
                          </Typography.Text>
                        </div>
                      ))}
                    </Space>
                  )
              },
              {
                key: 'outputs',
                label: `全局输出 (${summary.globalOutputs.length})`,
                children:
                  summary.globalOutputs.length === 0 ? (
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>没有未被消费的输出</Typography.Text>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      {summary.globalOutputs.map((it) => (
                        <div
                          key={it.nodeId}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            border: '1px solid rgba(63,63,70,0.7)',
                            background: 'rgba(24,24,27,0.5)'
                          }}
                        >
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.9)' }}>{it.nodeName}</Typography.Text>
                          <br />
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.6)' }}>
                            {it.keys.length ? it.keys.join(', ') : '(无可解析的输出键)'}
                          </Typography.Text>
                        </div>
                      ))}
                    </Space>
                  )
              },
              {
                key: 'connections',
                label: `连接 (${summary.connections.length})`,
                children:
                  summary.connections.length === 0 ? (
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>暂无连接</Typography.Text>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      {summary.connections.map((c, idx) => (
                        <div
                          key={`${c.from.nodeId}_${c.to.nodeId}_${idx}`}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            border: '1px solid rgba(63,63,70,0.7)',
                            background: 'rgba(24,24,27,0.5)'
                          }}
                        >
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.9)' }}>{c.from.nodeName}</Typography.Text>
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}> → </Typography.Text>
                          <Typography.Text style={{ color: 'rgba(244,244,245,0.9)' }}>{c.to.nodeName}</Typography.Text>
                        </div>
                      ))}
                    </Space>
                  )
              },
              {
                key: 'export',
                label: '导出',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Input.TextArea value={summaryJson} readOnly autoSize={{ minRows: 8, maxRows: 18 }} />
                    <Button onClick={copySummary}>复制 JSON</Button>
                  </Space>
                )
              }
            ]}
          />
        ) : null}

        {view === 'node' ? (
          !selectedNode ? (
            <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>选择画布中的节点以编辑输入/输出/参数。</Typography.Text>
          ) : (
            <Form layout="vertical">
              <Form.Item label="函数">
                <Typography.Text style={{ color: 'rgba(244,244,245,0.85)' }}>{selectedNode.display_name}</Typography.Text>
                <br />
                <Typography.Text style={{ color: 'rgba(244,244,245,0.55)' }}>{selectedNode.file_path}</Typography.Text>
              </Form.Item>
              <Form.Item label="Inputs (JSON)">
                <Input.TextArea
                  value={selectedNode.inputsJson}
                  onChange={(e) => onUpdateNode(selectedNode.id, { inputsJson: e.target.value })}
                  autoSize={{ minRows: 4 }}
                />
              </Form.Item>
              <Form.Item label="Outputs (JSON)">
                <Input.TextArea
                  value={selectedNode.outputsJson}
                  onChange={(e) => onUpdateNode(selectedNode.id, { outputsJson: e.target.value })}
                  autoSize={{ minRows: 4 }}
                />
              </Form.Item>
              <Form.Item label="Params (JSON)">
                <Input.TextArea
                  value={selectedNode.paramsJson}
                  onChange={(e) => onUpdateNode(selectedNode.id, { paramsJson: e.target.value })}
                  autoSize={{ minRows: 4 }}
                />
              </Form.Item>
              <Divider style={{ borderColor: 'rgba(63,63,70,0.6)' }} />
              <Form.Item label="测试工作目录 (cwd)">
                <Input value={selectedNode.testCwd} onChange={(e) => onUpdateNode(selectedNode.id, { testCwd: e.target.value })} />
              </Form.Item>
              <Form.Item label="测试命令">
                <Input value={selectedNode.testCmd} onChange={(e) => onUpdateNode(selectedNode.id, { testCmd: e.target.value })} />
              </Form.Item>
              <Space wrap>
                <Button type="primary" onClick={() => void onRunTest(selectedNode)} disabled={!selectedNode.testCmd} loading={busy}>
                  运行测试
                </Button>
                <Button danger onClick={() => onRemoveNode(selectedNode.id)}>
                  删除节点
                </Button>
              </Space>
            </Form>
          )
        ) : null}
      </Space>
    </div>
  )
}

