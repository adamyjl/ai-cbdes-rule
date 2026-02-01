export type WorkflowNode = {
  id: string
  function_id: string
  display_name: string
  module: string
  file_path: string
  signature?: string
  x: number
  y: number
  inputsJson: string
  outputsJson: string
  paramsJson: string
  testCwd: string
  testCmd: string
}

export type WorkflowEdge = {
  id: string
  from: string
  to: string
}

export type WorkflowDraft = {
  id: string
  name: string
  rootDir: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  updatedAt: number
}

export type GraphSummary = {
  globalInputs: Array<{ nodeId: string; nodeName: string; keys: string[] }>
  globalOutputs: Array<{ nodeId: string; nodeName: string; keys: string[] }>
  connections: Array<{ from: { nodeId: string; nodeName: string }; to: { nodeId: string; nodeName: string } }>
}

