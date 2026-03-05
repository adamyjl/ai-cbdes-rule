export enum NavSection {
  PROJECT_CENTER = 'project_center',
  WORKFLOW_BUILDER = 'workflow_builder',
  PROMPT_STUDIO = 'prompt_studio',
  MODEL_STUDIO = 'model_studio',
  DATA_FACTORY = 'data_factory',
  EVALUATION_GATE = 'evaluation_gate',
  DEPLOYMENT_HUB = 'deployment_hub'
}

export enum NodeType {
  VLM = 'VLM Module',
  VLA = 'VLA Module',
  RULE = 'Rule/Function',
  SOTA = 'SOTA Algo'
}

export interface NodeData {
  id: string
  type: NodeType
  label: string
  x: number
  y: number
  status: 'idle' | 'running' | 'success' | 'error'
  inputs: string[]
  outputs: string[]
}

export interface EdgeData {
  id: string
  source: string
  target: string
  label?: string
  type: 'data' | 'control'
}

export interface KpiMetric {
  subject: string
  A: number
  B: number
  fullMark: number
}

