import React, { useEffect, useMemo, useState } from 'react'
import { Tag } from 'antd'
import { NAV_ITEMS } from './constants'
import { NavSection } from './types'
import { ProjectCenter } from './components/ProjectCenter'
import { WorkflowBuilder } from './components/WorkflowBuilder'
import { PromptStudio } from './components/PromptStudio'
import { ModelStudio } from './components/ModelStudio'
import { EvaluationGate } from './components/EvaluationGate'
import { DeploymentHub } from './components/DeploymentHub'
import { DataFactory } from './components/DataFactory'

export function MllmOriginalApp() {
  const [activeSection, setActiveSection] = useState<NavSection>(NavSection.PROJECT_CENTER)
  const [apiOk, setApiOk] = useState<'unknown' | 'ok' | 'fail'>('unknown')

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then((r) => r.json())
      .then(() => {
        if (!cancelled) setApiOk('ok')
      })
      .catch(() => {
        if (!cancelled) setApiOk('fail')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = useMemo(() => NAV_ITEMS, [])

  const renderContent = () => {
    switch (activeSection) {
      case NavSection.PROJECT_CENTER:
        return <ProjectCenter />
      case NavSection.WORKFLOW_BUILDER:
        return <WorkflowBuilder />
      case NavSection.PROMPT_STUDIO:
        return <PromptStudio />
      case NavSection.MODEL_STUDIO:
        return <ModelStudio />
      case NavSection.EVALUATION_GATE:
        return <EvaluationGate />
      case NavSection.DEPLOYMENT_HUB:
        return <DeploymentHub />
      case NavSection.DATA_FACTORY:
        return <DataFactory />
      default:
        return <ProjectCenter />
    }
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--mllm-bg)', color: 'var(--mllm-text)' }}>
      <div className="flex h-full w-full flex-col">
        <header className="mllm-topbar" style={{ background: '#60006B' }}>
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">AI-CBDES-MLLM</div>
              <div className="mt-1 text-xs text-white/80">智能闭环智驾编码平台（MLLM）</div>
            </div>

            <div className="flex items-center gap-3">
              <Tag color={apiOk === 'ok' ? 'green' : apiOk === 'fail' ? 'red' : 'default'}>API: {apiOk}</Tag>
            </div>
          </div>

          <div className="border-b border-black/10 bg-white">
            <div className="px-6 py-3">
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {tabs.map((t) => {
                  const active = t.id === activeSection
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveSection(t.id)}
                      className={
                        'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ' +
                        (active
                          ? 'bg-[rgba(95,2,107,0.08)] text-[rgb(95,2,107)]'
                          : 'bg-white text-zinc-700 hover:bg-[rgba(95,2,107,0.06)]')
                      }
                      style={{ borderColor: 'rgb(95, 2, 107)' }}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden">{renderContent()}</main>
      </div>
    </div>
  )
}
