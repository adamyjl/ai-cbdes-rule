import { PageScaffold } from '../PageScaffold'
import { Button, Card, Collapse, Divider, Form, Input, Select, Space, Steps, Tabs, Tag, Typography, message } from 'antd'
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
        <Card
          title="工作流"
          size="small"
          bordered={false}
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
          <Steps
            current={1}
            items={[{ title: '数据集构建' }, { title: 'SFT' }, { title: 'RL' }, { title: '评测' }, { title: '回归上线' }]}
          />
          <Typography.Paragraph style={{ marginTop: 12, color: 'var(--app-text-muted)' }}>
            本页用于配置“训练/评测所用的大模型来源”。后端未接入时，配置仅保存在浏览器本地。
          </Typography.Paragraph>
        </Card>
      </div>

      <div className="md:col-span-6">
        <Card
          title="模型来源"
          size="small"
          bordered={false}
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
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
                    <Divider style={{ borderColor: 'var(--panel-border)' }} />
                    <Typography.Text style={{ color: 'var(--app-text-muted)' }}>
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
                    <Divider style={{ borderColor: 'var(--panel-border)' }} />
                    <Space wrap>
                      <Tag color="blue">样例</Tag>
                      <Typography.Text style={{ color: 'var(--app-text-muted)' }}>
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
        <Card
          title="快速定位"
          size="small"
          bordered={false}
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
          <Typography.Paragraph style={{ marginTop: 0, color: 'var(--app-text-muted)' }}>
            这里集中展示当前系统中所有基于 GLM-4.7（或同类 Chat API）调用的提示词入口与示例，方便统一审计与迭代。
          </Typography.Paragraph>

          <Collapse
            items={[
              {
                key: 'rag-function-enrich',
                label: 'RAG：函数向量化/增强（doc_zh/doc_en/inputs/outputs）',
                children: (
                  <Typography.Paragraph
                    style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }}
                    copyable
                  >
                    {`示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶基础软件的代码分析助手，请为函数生成可检索的结构化档案。","constraints":{"modules":["planning","control","decision"],"kinds":["node","glue","platform"],"output_json_only":true},"input":{"file_path":"Planning/OnVehicle/foo.cpp","signature":"double CalcFoo(const Bar& in)","line_count":42,"code":"..."},"output_schema":{"display_name":"string","module":"one_of_modules","kind":"one_of_kinds","doc_zh":"string","doc_en":"string","inputs_json":"json_object","outputs_json":"json_object"}}\n\n入口：backend/app/services/rag_enricher.py::enrich_function`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'rag-kind-classify',
                label: 'RAG：函数三类分类（node/glue/platform）',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶基础软件的代码分析助手，请给出该函数的类别 kind。","kinds":["node","glue","platform"],"input":{"file_path":"Control/PidController/pid.cpp","signature":"void Update(...)"}}\n\n入口：backend/app/services/rag_enricher.py::classify_function_kind`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'module-index',
                label: 'RAG：模块索引（模块候选发现/描述/入库）',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`说明：模块索引会基于函数索引与调用关系发现候选模块，再对模块生成描述与结构化输入输出。\n\n入口：backend/app/services/module_index_jobs.py + backend/app/services/module_enricher.py`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'task-analyze',
                label: '结构化输入：问题分析（analysis_markdown + suggested_rag_query）',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的任务分析助手。请对输入工单进行问题分析，并输出结构化结果。","constraints":{"language":"zh","output":"markdown","no_secrets":true},"input":{"feature_description":"...","input_spec":"...","output_spec":"..."},"output_schema":{"analysis_markdown":"markdown string","suggested_rag_query":"string"}}\n\n入口：backend/app/services/task_analysis_service.py`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'visual-glue',
                label: '图形化输入：胶水代码生成（字段映射/类型转换）',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶基础软件的胶水代码生成器。请根据上下游节点的输入输出规范，生成一个中间转换节点的胶水代码。","constraints":{"output_json_only":true,"language":"zh"},"input":{"task_context":"...","from_node":{},"to_node":{}},"output_schema":{"glue_name":"string","doc_zh":"string","inputs_json":"json_object","outputs_json":"json_object","glue_code":"string"}}\n\n入口：backend/app/services/glue_codegen_service.py`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'visual-export',
                label: '图形化输入：导出（模型调用/受控组合/直接复用）提示词',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`说明：导出提示词由前端根据画布节点/连线与导出模式拼装，给到下游生成/集成流程。\n\n入口：src/pages/online/VisualBuilderPage.tsx（导出面板）`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'cot-question',
                label: '路由消歧：风险点/缺失项澄清问题生成',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的路由消歧助手。请针对单条风险/歧义或缺失信息，生成一句最关键、最具体的澄清问题。","mode":"risk|missing","item":"...","context":{"goal":"...","constraints":"..."},"output_schema":{"question":"string"}}\n\n入口：backend/app/services/cot_service.py::make_question`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'cot-refine',
                label: '路由消歧：基于回答更新目标/约束/子任务/列表',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的路由消歧助手。根据用户对单条问题的回答，更新任务目标/关键约束/子任务，并更新风险与缺失列表。","current_item":"...","user_answer":"...","state":{"goal":"...","constraints":"..."},"output_schema":{"resolved":"boolean","goal":"string","constraints":"string","subtasks":"string","risk_items":"string[]","missing_items":"string[]"}}\n\n入口：backend/app/services/cot_service.py::refine_with_answer`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'cot-confirmed',
                label: '路由消歧：生成确认后描述（最终可用提示词）',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的提示词工程师。基于消歧后的信息，输出最准确、可直接用于代码生成的中文提示词。","input":{"goal":"...","constraints":"...","subtasks":"...","related_functions":["..."]},"output_schema":{"prompt":"string"}}\n\n入口：backend/app/services/cot_service.py::generate_confirmed_prompt`}
                  </Typography.Paragraph>
                )
              },
              {
                key: 'orchestration-generate',
                label: '函数编排：生成目标 C/C++ 代码（多文件 Markdown）',
                children: (
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: 'var(--app-text)' }} copyable>
                    {`示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的 C/C++ 代码生成器。请基于输入提示词，直接生成目标 C/C++ 源码（可多文件），保证可落地编译。","input":{"prompt":"..."},"output_schema":{"code":"string","key_points":"string[]","log":"string"}}\n\n入口：backend/app/services/orchestrator_service.py::generate_cpp_code`}
                  </Typography.Paragraph>
                )
              }
            ]}
          />
        </Card>
      </div>
    </PageScaffold>
  )
}
