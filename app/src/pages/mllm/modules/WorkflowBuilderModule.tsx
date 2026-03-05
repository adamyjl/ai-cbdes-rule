import { useMemo, useState } from 'react'

type NodeStatus = 'idle' | 'running' | 'success' | 'fail'

type WorkflowNode = {
  id: string
  label: string
  kind: 'VLM' | 'VLA' | 'RULE' | 'SOTA'
  status: NodeStatus
  inputs: string[]
  outputs: string[]
}

type ModuleCategory = { name: string; count: number }

const categories: ModuleCategory[] = [
  { name: 'Perception', count: 18 },
  { name: 'Prediction', count: 12 },
  { name: 'Planning', count: 16 },
  { name: 'Control', count: 10 },
  { name: 'Safety', count: 9 }
]

const initialNodes: WorkflowNode[] = [
  {
    id: 'n1',
    label: 'Scene Understanding',
    kind: 'VLM',
    status: 'success',
    inputs: ['camera', 'map'],
    outputs: ['scene_graph']
  },
  {
    id: 'n2',
    label: 'Intent Prediction',
    kind: 'SOTA',
    status: 'running',
    inputs: ['objects'],
    outputs: ['intents']
  },
  {
    id: 'n3',
    label: 'Policy (VLA)',
    kind: 'VLA',
    status: 'idle',
    inputs: ['scene_graph', 'intents'],
    outputs: ['behavior']
  },
  {
    id: 'n4',
    label: 'Safety Gate',
    kind: 'RULE',
    status: 'idle',
    inputs: ['behavior'],
    outputs: ['approved_behavior']
  }
]

export function WorkflowBuilderModule() {
  const [query, setQuery] = useState('')
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes)
  const [selectedId, setSelectedId] = useState<string>(initialNodes[0].id)

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) || nodes[0], [nodes, selectedId])

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [query])

  const statusPill = (s: NodeStatus) => {
    const cls =
      s === 'success'
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : s === 'running'
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : s === 'fail'
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            : 'bg-slate-700/50 text-slate-300 border-slate-600/40'
    return <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs border ' + cls}>{s}</span>
  }

  const kindBadge = (k: WorkflowNode['kind']) => {
    const cls =
      k === 'VLM'
        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
        : k === 'VLA'
          ? 'bg-orange-500/10 text-orange-300 border-orange-500/20'
          : k === 'RULE'
            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    return <span className={'inline-flex items-center px-2 py-0.5 rounded text-[11px] border ' + cls}>{k}</span>
  }

  const setAllStatus = (status: NodeStatus) => {
    setNodes((prev) => prev.map((n) => ({ ...n, status })))
  }

  return (
    <div className="flex h-full w-full bg-slate-950 overflow-hidden text-slate-200">
      <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-3">Module Library</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-slate-800 border border-slate-700 rounded text-sm px-3 py-2 focus:outline-none focus:border-brand-500 text-slate-200"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredCategories.map((cat) => (
            <div key={cat.name}>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2 uppercase">
                <span>{cat.name}</span>
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{cat.count}</span>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-800 p-2 rounded border border-slate-700 hover:border-brand-500 cursor-pointer transition-colors">
                  Standard {cat.name} V1
                </div>
                <div className="bg-slate-800 p-2 rounded border border-slate-700 hover:border-brand-500 cursor-pointer transition-colors">
                  Advanced {cat.name} VLM
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-2 flex gap-2 shadow-lg">
            <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-sm" onClick={() => setAllStatus('running')}>
              Run
            </button>
            <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-sm" onClick={() => setAllStatus('success')}>
              Mark Pass
            </button>
            <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-sm" onClick={() => setAllStatus('idle')}>
              Reset
            </button>
          </div>
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg px-3 py-1.5 shadow-lg text-xs text-emerald-400 font-mono">
            SYSTEM READY
          </div>
        </div>

        <div className="absolute inset-0 z-0 p-10">
          <div className="grid grid-cols-2 gap-6 max-w-4xl">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedId(node.id)}
                className={
                  'text-left w-full rounded-xl border-2 bg-slate-900 shadow-xl transition-all hover:scale-[1.01] ' +
                  (selectedId === node.id ? 'border-brand-500 ring-4 ring-brand-500/20' : 'border-slate-700 hover:border-slate-500')
                }
              >
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="font-bold text-white truncate">{node.label}</div>
                  {kindBadge(node.kind)}
                </div>
                <div className="px-4 py-3 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex gap-4">
                    <span>IN: {node.inputs.length}</span>
                    <span>OUT: {node.outputs.length}</span>
                  </div>
                  {statusPill(node.status)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl shadow-2xl p-2 flex items-center gap-2">
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm font-medium border border-slate-600">
              Assemble
            </button>
            <div className="w-8 h-0.5 bg-slate-600" />
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm font-medium shadow-lg shadow-indigo-500/20">
              Run Gate Eval
            </button>
            <div className="w-8 h-0.5 bg-slate-600" />
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium shadow-lg shadow-emerald-500/20">
              Release
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] text-slate-500 uppercase tracking-widest">Evidence Chain Recording Active</div>
        </div>
      </div>

      <div className="w-96 border-l border-slate-800 bg-slate-900 overflow-y-auto">
        <div className="p-5 space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-white truncate">{selectedNode.label}</h3>
              {kindBadge(selectedNode.kind)}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-slate-500">Node ID: {selectedNode.id}</div>
              {statusPill(selectedNode.status)}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Inputs</div>
            <div className="flex flex-wrap gap-2">
              {selectedNode.inputs.map((i) => (
                <span key={i} className="text-xs px-2 py-1 rounded border border-slate-700 bg-slate-950 text-slate-300">
                  {i}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Outputs</div>
            <div className="flex flex-wrap gap-2">
              {selectedNode.outputs.map((o) => (
                <span key={o} className="text-xs px-2 py-1 rounded border border-slate-700 bg-slate-950 text-slate-300">
                  {o}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm hover:border-brand-500">View Logs</button>
              <button className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm hover:border-brand-500">Export JSON</button>
              <button
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm hover:border-emerald-500"
                onClick={() =>
                  setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, status: 'success' } : n)))
                }
              >
                Mark Pass
              </button>
              <button
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm hover:border-rose-500"
                onClick={() => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, status: 'fail' } : n)))}
              >
                Mark Fail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

