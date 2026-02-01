import { create } from 'zustand'

export type AppModule = 'common' | 'perception' | 'planning' | 'decision' | 'localization' | 'control'

export type IntentType = 'new' | 'fix' | 'refactor' | 'adapt' | 'performance'

export type TaskDraft = {
  targetModule: AppModule
  intent: IntentType
  description: string
  featureDescription: string
  inputSpec: string
  outputSpec: string
  generationQuestion: string
  selectedFunctionIds: string[]
  selectedWorkflowId: string | null
}

type AppState = {
  taskDraft: TaskDraft
  setTaskDraft: (patch: Partial<TaskDraft>) => void
}

export const useAppStore = create<AppState>((set) => ({
  taskDraft: {
    targetModule: 'planning',
    intent: 'new',
    description: '',
    featureDescription: '',
    inputSpec: '{\n  "input": ""\n}',
    outputSpec: '{\n  "output": ""\n}',
    generationQuestion: '',
    selectedFunctionIds: [],
    selectedWorkflowId: null
  },
  setTaskDraft: (patch) =>
    set((s) => ({
      taskDraft: { ...s.taskDraft, ...patch }
    }))
}))
