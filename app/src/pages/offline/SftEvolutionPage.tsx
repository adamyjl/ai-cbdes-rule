import { PageScaffold } from '../PageScaffold'
import { Button, Card, Divider, Form, Input, Select, Space, Steps, Tabs, Tag, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'

type ApiProviderId = 'glm' | 'openai' | 'claude' | 'grok' | 'qwen' | 'internvl'

type ApiProviderPreset = {
  id: ApiProviderId
  label: string
  defaultBaseUrl: string
  defaultModel: string
  apiKeyEnv: string
  notes?: string
}

type ApiProviderConfig = {
  provider: ApiProviderId
  apiKeyEnv: string
  baseUrl: string
  model: string
}

type OpenSourceConfig = {
  modelFamily: string
  checkpoint: string
  recipe: string
  datasetPath: string
}

const LS_KEY = 'sft:model_provider_config'

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function getProviderPresets(): ApiProviderPreset[] {
  return [
    {
      id: 'glm',
      label: 'GLM（阿里云百炼）',
      defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: 'glm-4.7',
      apiKeyEnv: 'ALIYUN_API_KEY',
      notes: '使用 OpenAI 兼容接口。'
    },
    {
      id: 'openai',
      label: 'OpenAI',
      defaultBaseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
      apiKeyEnv: 'OPENAI_API_KEY'
    },
    {
      id: 'claude',
      label: 'Claude（Anthropic）',
      defaultBaseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-3-5-sonnet-latest',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      notes: '后续可接入 Claude 官方 SDK 或网关。'
    },
    {
      id: 'grok',
      label: 'Grok（xAI）',
      defaultBaseUrl: 'https://api.x.ai/v1',
      defaultModel: 'grok-2-latest',
      apiKeyEnv: 'XAI_API_KEY',
      notes: '后续可根据 xAI 的 API 形式适配。'
    },
    {
      id: 'qwen',
      label: 'Qwen（通义/百炼/自建）',
      defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: 'qwen-plus',
      apiKeyEnv: 'ALIYUN_API_KEY',
      notes: '示例默认仍走百炼 OpenAI 兼容网关。'
    },
    {
      id: 'internvl',
      label: 'InternVL（API/自建）',
      defaultBaseUrl: 'http://localhost:8001/v1',
      defaultModel: 'internvl2.5',
      apiKeyEnv: 'INTERNAL_API_KEY',
      notes: '示例使用自建 OpenAI 兼容网关占位。'
    }
  ]
}

export function SftEvolutionPage() {
  const [activeTab, setActiveTab] = useState<'api' | 'open_source'>('api')
  const [apiForm] = Form.useForm<ApiProviderConfig>()
  const [osForm] = Form.useForm<OpenSourceConfig>()

  const presets = useMemo(() => getProviderPresets(), [])

  useEffect(() => {
    const saved = safeJsonParse<{ api?: ApiProviderConfig; os?: OpenSourceConfig }>(localStorage.getItem(LS_KEY))
    const defaultPreset = presets.find((p) => p.id === 'glm')
    apiForm.setFieldsValue(
      saved?.api ||
        ({
          provider: 'glm',
          apiKeyEnv: defaultPreset?.apiKeyEnv || 'ALIYUN_API_KEY',
          baseUrl: defaultPreset?.defaultBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          model: defaultPreset?.defaultModel || 'glm-4.7'
        } as ApiProviderConfig)
    )
    osForm.setFieldsValue(
      saved?.os ||
        ({
          modelFamily: 'Qwen2.5',
          checkpoint: 'Qwen2.5-7B-Instruct',
          recipe: 'LoRA-SFT',
          datasetPath: 'data/sft_samples.jsonl'
        } as OpenSourceConfig)
    )
  }, [apiForm, osForm, presets])

  function onProviderChange(provider: ApiProviderId) {
    const p = presets.find((x) => x.id === provider)
    if (!p) return
    apiForm.setFieldsValue({
      provider: p.id,
      apiKeyEnv: p.apiKeyEnv,
      baseUrl: p.defaultBaseUrl,
      model: p.defaultModel
    })
  }

  async function saveConfig() {
    const api = await apiForm.validateFields()
    const os = await osForm.validateFields()
    localStorage.setItem(LS_KEY, JSON.stringify({ api, os }))
    message.success('已保存（仅本地浏览器）')
  }

  async function quickValidateApi() {
    const api = await apiForm.validateFields()
    if (!api.baseUrl.startsWith('http')) {
      message.warning('Base URL 看起来不正确')
      return
    }
    message.success('已通过本地校验（未调用后端）')
  }

  return (
    <PageScaffold
      title="大模型管理"
      description="后训练工作流（数据集构建 → SFT → RL → 评测 → 上线回归），当前仅实现前端交互样例。"
    >
      <div className="md:col-span-12">
        <Card title="工作流" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Steps
            current={1}
            items={[{ title: '数据集构建' }, { title: 'SFT' }, { title: 'RL' }, { title: '评测' }, { title: '回归上线' }]}
          />
          <Typography.Paragraph style={{ marginTop: 12, color: 'rgba(244,244,245,0.72)' }}>
            本页用于配置“训练/评测所用的大模型来源”。后端未接入时，配置仅保存在浏览器本地。
          </Typography.Paragraph>
        </Card>
      </div>

      <div className="md:col-span-6">
        <Card title="模型来源" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as any)}
            items={[
              {
                key: 'api',
                label: 'API 模型',
                children: (
                  <Form layout="vertical" form={apiForm}>
                    <Form.Item label="API 类型" name="provider" rules={[{ required: true }]}>
                      <Select
                        onChange={onProviderChange}
                        options={presets.map((p) => ({ value: p.id, label: p.label }))}
                      />
                    </Form.Item>
                    <Form.Item label="API Key 环境变量" name="apiKeyEnv" rules={[{ required: true }]}>
                      <Input placeholder="例如：ALIYUN_API_KEY" />
                    </Form.Item>
                    <Form.Item label="Base URL" name="baseUrl" rules={[{ required: true }]}>
                      <Input placeholder="例如：https://dashscope.aliyuncs.com/compatible-mode/v1" />
                    </Form.Item>
                    <Form.Item label="默认模型" name="model" rules={[{ required: true }]}>
                      <Input placeholder="例如：glm-4.7" />
                    </Form.Item>
                    <Space wrap>
                      <Button onClick={() => void quickValidateApi()}>本地校验</Button>
                      <Button type="primary" onClick={() => void saveConfig()}>
                        保存
                      </Button>
                    </Space>
                    <Divider style={{ borderColor: 'rgba(63,63,70,0.6)' }} />
                    <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>
                      提示：当前仅 UI 交互样例，不会向后端发送 key，也不会实际发起模型调用。
                    </Typography.Text>
                  </Form>
                )
              },
              {
                key: 'open_source',
                label: '开源模型（后续）',
                children: (
                  <Form layout="vertical" form={osForm}>
                    <Form.Item label="模型家族" name="modelFamily" rules={[{ required: true }]}>
                      <Select
                        options={[
                          { value: 'Qwen2.5', label: 'Qwen2.5' },
                          { value: 'Llama', label: 'Llama' },
                          { value: 'InternVL', label: 'InternVL' },
                          { value: 'DeepSeek', label: 'DeepSeek' }
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="Checkpoint" name="checkpoint" rules={[{ required: true }]}>
                      <Input placeholder="例如：Qwen2.5-7B-Instruct" />
                    </Form.Item>
                    <Form.Item label="训练配方" name="recipe" rules={[{ required: true }]}>
                      <Select
                        options={[
                          { value: 'Full-SFT', label: 'Full-SFT（全参）' },
                          { value: 'LoRA-SFT', label: 'LoRA-SFT（推荐示例）' },
                          { value: 'DPO', label: 'DPO（偏好优化）' }
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="数据集路径（示例）" name="datasetPath" rules={[{ required: true }]}>
                      <Input placeholder="例如：data/sft_samples.jsonl" />
                    </Form.Item>
                    <Space wrap>
                      <Button onClick={() => message.info('后端未接入：暂不执行训练')}>生成训练作业（示例）</Button>
                      <Button type="primary" onClick={() => void saveConfig()}>
                        保存
                      </Button>
                    </Space>
                    <Divider style={{ borderColor: 'rgba(63,63,70,0.6)' }} />
                    <Space wrap>
                      <Tag color="blue">样例</Tag>
                      <Typography.Text style={{ color: 'rgba(244,244,245,0.72)' }}>
                        后续可接入：本地/集群训练（SFT、DPO、VLM），复用本代码库的函数索引与评测链路。
                      </Typography.Text>
                    </Space>
                  </Form>
                )
              }
            ]}
          />
        </Card>
      </div>

      <div className="md:col-span-6">
        <Card title="快速定位" size="small" bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
          <Typography.Paragraph style={{ marginTop: 0, color: 'rgba(244,244,245,0.72)' }}>
            你可以先在此页面完成模型来源选择，然后在 RAG 管理页挑选函数做数据构建/评测基线。后续该区域会承载：训练作业列表、
            评测对比与回归策略。
          </Typography.Paragraph>
          <div className="h-64 rounded-md border border-zinc-800 bg-zinc-950/60" />
        </Card>
      </div>
    </PageScaffold>
  )
}
