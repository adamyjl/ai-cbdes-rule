import '../mllm/mllm.css'
import { useMemo, useState } from 'react'
import { NAV_ITEMS } from '../mllm/original/constants'
import { NavSection } from '../mllm/original/types'
import { ProjectCenter } from '../mllm/original/components/ProjectCenter'
import { WorkflowBuilder } from '../mllm/original/components/WorkflowBuilder'
import { PromptStudio } from '../mllm/original/components/PromptStudio'
import { ModelStudio } from '../mllm/original/components/ModelStudio'
import { EvaluationGate } from '../mllm/original/components/EvaluationGate'
import { DeploymentHub } from '../mllm/original/components/DeploymentHub'
import { DataFactory } from '../mllm/original/components/DataFactory'
import { GaasdMenuBar } from './components/GaasdMenuBar'
import { VlmTabToolbar } from './components/VlmTabToolbar'

const CN_LABEL: Record<string, string> = {
  ProjectCenter: '项目中心',
  WorkflowBuilder: '工作流构建',
  PromptStudio: '提示词工作台',
  ModelStudio: '模型工作台',
  DataFactory: '数据工厂',
  EvaluationGate: '评测门禁',
  DeploymentHub: '部署中心'
}

export function VlmPage() {
  const [activeSection, setActiveSection] = useState<NavSection>(NavSection.PROJECT_CENTER)

  const tabs = useMemo(
    () =>
      NAV_ITEMS.map((t) => {
        const key = String(t.id)
        const cn =
          key === String(NavSection.PROJECT_CENTER)
            ? CN_LABEL.ProjectCenter
            : key === String(NavSection.WORKFLOW_BUILDER)
              ? CN_LABEL.WorkflowBuilder
              : key === String(NavSection.PROMPT_STUDIO)
                ? CN_LABEL.PromptStudio
                : key === String(NavSection.MODEL_STUDIO)
                  ? CN_LABEL.ModelStudio
                  : key === String(NavSection.DATA_FACTORY)
                    ? CN_LABEL.DataFactory
                    : key === String(NavSection.EVALUATION_GATE)
                      ? CN_LABEL.EvaluationGate
                      : CN_LABEL.DeploymentHub
        return { id: String(t.id), label: cn, icon: t.icon }
      }),
    []
  )

  const renderContent = () => {
    switch (activeSection) {
      case NavSection.PROJECT_CENTER:
        return <ProjectCenter pageTitle="视觉语言模型开发" />
      case NavSection.WORKFLOW_BUILDER:
        return <WorkflowBuilder pageTitle={CN_LABEL.WorkflowBuilder} />
      case NavSection.PROMPT_STUDIO:
        return <PromptStudio pageTitle={CN_LABEL.PromptStudio} />
      case NavSection.MODEL_STUDIO:
        return <ModelStudio pageTitle={CN_LABEL.ModelStudio} />
      case NavSection.EVALUATION_GATE:
        return <EvaluationGate pageTitle={CN_LABEL.EvaluationGate} />
      case NavSection.DEPLOYMENT_HUB:
        return <DeploymentHub pageTitle={CN_LABEL.DeploymentHub} />
      case NavSection.DATA_FACTORY:
        return <DataFactory pageTitle={CN_LABEL.DataFactory} />
      default:
        return <ProjectCenter pageTitle="视觉语言模型开发" />
    }
  }

  return (
    <div className="mllm-root" data-theme="cast-light">
      <div className="h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--mllm-bg)', color: 'var(--mllm-text)' }}>
        <div className="flex h-full w-full flex-col">
          <GaasdMenuBar />
          <VlmTabToolbar activeId={String(activeSection)} tabs={tabs} onChange={(id) => setActiveSection(id as any)} />
          <main className="flex-1 relative overflow-hidden">{renderContent()}</main>
        </div>
      </div>
    </div>
  )
}
