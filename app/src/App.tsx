import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RagManagementPage } from './pages/offline/RagManagementPage'
import { ArchiveManagementPage } from './pages/offline/ArchiveManagementPage'
import { SftEvolutionPage } from './pages/offline/SftEvolutionPage'
import { TaskInputPage } from './pages/online/TaskInputPage'
import { CotRoutingPage } from './pages/online/CotRoutingPage'
import { GraphBuilderPage } from './pages/online/GraphBuilderPage'
import { FunctionOrchestrationPage } from './pages/online/FunctionOrchestrationPage'
import { TestGatePage } from './pages/online/TestGatePage'
import { ReleasePage } from './pages/online/ReleasePage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/offline/rag" replace />} />

        <Route path="/offline/rag" element={<RagManagementPage />} />
        <Route path="/offline/archive" element={<ArchiveManagementPage />} />
        <Route path="/offline/sft" element={<SftEvolutionPage />} />

        <Route path="/online/graph-builder" element={<GraphBuilderPage />} />
        <Route path="/online/task" element={<TaskInputPage />} />
        <Route path="/online/routing" element={<CotRoutingPage />} />
        <Route path="/online/orchestration" element={<FunctionOrchestrationPage />} />
        <Route path="/online/testing" element={<TestGatePage />} />
        <Route path="/online/release" element={<ReleasePage />} />

        <Route path="*" element={<Navigate to="/offline/rag" replace />} />
      </Routes>
    </AppShell>
  )
}
