import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { RagManagementPage } from './pages/offline/RagManagementPage'
import { ArchiveManagementPage } from './pages/offline/ArchiveManagementPage'
import { SftEvolutionPage } from './pages/offline/SftEvolutionPage'
import { TaskInputPage } from './pages/online/TaskInputPage'
import { CotRoutingPage } from './pages/online/CotRoutingPage'
import { GraphBuilderPage } from './pages/online/GraphBuilderPage'
import { TaskBuilderPage } from './pages/online/TaskBuilderPage'
import { VisualBuilderPage } from './pages/online/VisualBuilderPage'
import { FunctionOrchestrationPage } from './pages/online/FunctionOrchestrationPage'
import { TestGatePage } from './pages/online/TestGatePage'
import { ReleasePage } from './pages/online/ReleasePage'
import { MllmConsolePage } from './pages/mllm/MllmConsolePage'
import { LandingPage } from './pages/LandingPage'

const SHOW_EXPERIMENTAL_BUILDERS = false

function ExternalPathRedirect(props: { target: string; storageKey: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    try {
      const attemptedAt = Number(sessionStorage.getItem(props.storageKey) || '0')
      if (attemptedAt && Date.now() - attemptedAt < 3000) {
        setFailed(true)
        return
      }
      sessionStorage.setItem(props.storageKey, String(Date.now()))
    } catch {
      setFailed(false)
    }
    window.location.replace(props.target)
  }, [props.storageKey, props.target])

  if (failed) return <Navigate to="/" replace />
  return null
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/offline/rag" element={<RagManagementPage />} />
        <Route path="/offline/archive" element={<ArchiveManagementPage />} />
        <Route path="/offline/sft" element={<SftEvolutionPage />} />

        <Route
          path="/online/graph-builder"
          element={SHOW_EXPERIMENTAL_BUILDERS ? <GraphBuilderPage /> : <Navigate to="/visual-builder" replace />}
        />
        <Route path="/online/task" element={<TaskInputPage />} />
        <Route path="/online/routing" element={<CotRoutingPage />} />
        <Route path="/online/orchestration" element={<FunctionOrchestrationPage />} />
        <Route path="/online/testing" element={<TestGatePage />} />
        <Route path="/online/release" element={<ReleasePage />} />

        <Route path="/task-builder" element={SHOW_EXPERIMENTAL_BUILDERS ? <TaskBuilderPage /> : <Navigate to="/visual-builder" replace />} />
        <Route path="/visual-builder" element={<VisualBuilderPage />} />

        <Route path="/mllm" element={<MllmConsolePage />} />
        <Route path="/gaasd" element={<ExternalPathRedirect target="/gaasd/" storageKey="redirect:gaasd" />} />
        <Route path="/gaasd/*" element={<ExternalPathRedirect target="/gaasd/" storageKey="redirect:gaasd" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
