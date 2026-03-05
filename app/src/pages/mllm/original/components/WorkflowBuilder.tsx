import React, { useState, useRef } from 'react'
import { INITIAL_NODES, INITIAL_EDGES, MODULE_CATEGORIES } from '../constants'
import { NodeData, NodeType } from '../types'
import {
  Play,
  Save,
  RotateCcw,
  Search,
  Settings2,
  Layers,
  Box,
  Cpu,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BrainCircuit,
  ShieldCheck,
  Rocket,
  Move,
  Eye,
  Activity,
  GitBranch,
  Terminal,
  Grid
} from 'lucide-react'

export const WorkflowBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true)
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const renderConnection = (edge: any) => {
    const startNode = nodes.find((n) => n.id === edge.source)
    const endNode = nodes.find((n) => n.id === edge.target)
    if (!startNode || !endNode) return null

    const startX = startNode.x + 200
    const startY = startNode.y + 40
    const endX = endNode.x
    const endY = endNode.y + 40

    const controlPoint1X = startX + (endX - startX) / 2
    const controlPoint1Y = startY
    const controlPoint2X = startX + (endX - startX) / 2
    const controlPoint2Y = endY

    const pathD = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`

    const isControl = edge.type === 'control'

    return (
      <g key={edge.id}>
        <path
          d={pathD}
          fill="none"
          stroke={isControl ? '#e11d48' : '#6b7280'}
          strokeWidth="2"
          strokeDasharray={isControl ? '5,5' : 'none'}
          className="transition-all duration-300"
        />
        <circle cx={endX} cy={endY} r="3" fill={isControl ? '#e11d48' : '#6b7280'} />
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - 10}
          fill="#6b7280"
          fontSize="10"
          textAnchor="middle"
        >
          {edge.label}
        </text>
      </g>
    )
  }

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{ background: 'var(--mllm-bg)', color: 'var(--mllm-text)' }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="w-64 border-r flex flex-col z-20" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--mllm-border)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mllm-text)' }}>
            Module Library
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--mllm-text-muted)' }} />
            <input
              type="text"
              placeholder="Search components..."
              className="w-full border rounded text-sm pl-9 pr-3 py-2 focus:outline-none"
              style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {MODULE_CATEGORIES.map((cat, idx) => (
            <div key={idx}>
              <div className="flex justify-between items-center text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--mllm-text-muted)' }}>
                <span>{cat.name}</span>
                <span className="px-1.5 py-0.5 rounded border" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text-muted)' }}>
                  {cat.count}
                </span>
              </div>
              <div className="space-y-2">
                <div
                  className="p-2 rounded border cursor-pointer flex items-center gap-2 transition-colors group"
                  style={{ background: '#ffffff', borderColor: 'var(--mllm-border)' }}
                >
                  <Cpu className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm" style={{ color: 'var(--mllm-text)' }}>
                    Standard {cat.name} V1
                  </span>
                </div>
                <div
                  className="p-2 rounded border cursor-pointer flex items-center gap-2 transition-colors group"
                  style={{ background: '#ffffff', borderColor: 'var(--mllm-border)' }}
                >
                  <BrainCircuit className="h-4 w-4" style={{ color: 'var(--mllm-primary)' }} />
                  <span className="text-sm" style={{ color: 'var(--mllm-text)' }}>
                    Advanced {cat.name} VLM
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing canvas-bg"
        style={{
          background: 'var(--mllm-canvas)',
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
          <div className="backdrop-blur border rounded-lg p-2 pointer-events-auto flex gap-2" style={{ background: 'rgba(255,255,255,0.75)', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
            <button className="p-2 rounded transition-colors" style={{ color: 'var(--mllm-text-muted)' }} title="Zoom In">
              +
            </button>
            <button className="p-2 rounded transition-colors" style={{ color: 'var(--mllm-text-muted)' }} title="Zoom Out">
              -
            </button>
            <div className="w-px mx-1" style={{ background: 'var(--mllm-border)' }}></div>
            <button className="p-2 rounded flex items-center gap-2 transition-colors" style={{ color: 'var(--mllm-text-muted)' }}>
              <Layers className="h-4 w-4" /> <span className="text-xs">Layers</span>
            </button>
            <button
              className="p-2 rounded flex items-center gap-2 transition-colors"
              style={{ color: 'var(--mllm-text-muted)' }}
              onClick={() => setPan({ x: 0, y: 0 })}
            >
              <Move className="h-4 w-4" /> <span className="text-xs">Reset View</span>
            </button>
          </div>
          <div className="backdrop-blur border rounded-lg px-3 py-1.5 pointer-events-auto" style={{ background: 'rgba(255,255,255,0.75)', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
            <span className="text-xs font-mono flex items-center gap-1" style={{ color: 'rgb(5, 150, 105)' }}>
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
              SYSTEM READY
            </span>
          </div>
        </div>

        <div
          className="absolute inset-0 w-full h-full pointer-events-none transform transition-transform duration-75 ease-out"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">{INITIAL_EDGES.map(renderConnection)}</svg>

          <div className="absolute inset-0 z-0">
            {nodes.map((node) => (
              (() => {
                const active = selectedNodeId === node.id
                const headerBg = 'var(--mllm-block)'
                const headerColor =
                  node.type === NodeType.VLM
                    ? 'var(--mllm-primary)'
                    : node.type === NodeType.VLA
                      ? 'rgb(194, 65, 12)'
                      : node.type === NodeType.RULE
                        ? 'rgb(37, 99, 235)'
                        : 'rgb(5, 150, 105)'
                return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedNodeId(node.id)
                }}
                className={`absolute w-[200px] h-[80px] rounded-lg border-2 cursor-pointer transition-all hover:scale-105 pointer-events-auto ${active ? 'z-10' : ''}`}
                style={{
                  left: node.x,
                  top: node.y,
                  background: 'var(--mllm-block)',
                  borderColor: active ? 'var(--mllm-primary)' : 'rgba(0,0,0,0.18)',
                  boxShadow: active ? '0 18px 35px rgba(95, 2, 107, 0.14)' : '0 12px 26px rgba(15, 23, 42, 0.10)'
                }}
              >
                <div
                  className="h-1/2 px-3 flex items-center gap-2 rounded-t-[6px] border-b"
                  style={{ background: headerBg, borderColor: 'rgba(0,0,0,0.08)' }}
                >
                  {node.type === NodeType.VLM && <BrainCircuit className="h-4 w-4" style={{ color: headerColor }} />}
                  {node.type === NodeType.VLA && <Zap className="h-4 w-4" style={{ color: headerColor }} />}
                  {node.type === NodeType.RULE && <Box className="h-4 w-4" style={{ color: headerColor }} />}
                  {node.type === NodeType.SOTA && <Cpu className="h-4 w-4" style={{ color: headerColor }} />}
                  <span className="text-xs font-bold truncate" style={{ color: 'var(--mllm-text)' }}>
                    {node.label}
                  </span>
                </div>

                <div className="h-1/2 px-3 flex items-center justify-between text-[10px]" style={{ background: 'var(--mllm-block)', color: 'var(--mllm-text-muted)' }}>
                  <div className="flex flex-col">
                    <span>IN: {node.inputs.length}</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                      node.status === 'success'
                        ? 'bg-emerald-600/10 text-emerald-700'
                        : node.status === 'running'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-black/5 text-slate-700'
                    }`}
                  >
                    {node.status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                    {node.status === 'running' && (
                      <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {node.status}
                  </div>
                  <div className="flex flex-col text-right">
                    <span>OUT: {node.outputs.length}</span>
                  </div>
                </div>

                <div
                  className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 rounded-full border transition-colors"
                  style={{ background: 'rgba(0,0,0,0.25)', borderColor: '#ffffff' }}
                ></div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 rounded-full border transition-colors"
                  style={{ background: 'rgba(0,0,0,0.25)', borderColor: '#ffffff' }}
                ></div>
              </div>
                )
              })()
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="backdrop-blur border rounded-xl p-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}>
              <Cpu className="h-4 w-4" /> Assemble
            </button>
            <div className="w-8 h-0.5" style={{ background: 'rgba(0,0,0,0.15)' }}></div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors" style={{ background: 'rgb(79, 70, 229)', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.18)' }}>
              <ShieldCheck className="h-4 w-4" /> Run Gate Eval
            </button>
            <div className="w-8 h-0.5" style={{ background: 'rgba(0,0,0,0.15)' }}></div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors" style={{ background: 'rgb(5, 150, 105)', boxShadow: '0 10px 25px rgba(5, 150, 105, 0.18)' }}>
              <Rocket className="h-4 w-4" /> Release
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--mllm-text-muted)' }}>
            Evidence Chain Recording Active
          </div>
        </div>
      </div>

      <div className="w-96 border-l overflow-y-auto z-20" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
        {selectedNode ? (
          <div className="p-5 space-y-6">
            <div className="pb-4 border-b" style={{ borderColor: 'var(--mllm-border)' }}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold" style={{ color: 'var(--mllm-text)' }}>
                  {selectedNode.label}
                </h3>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded border ${
                    selectedNode.type === NodeType.VLA
                      ? 'text-orange-700 bg-orange-500/10 border-orange-500/20'
                      : selectedNode.type === NodeType.VLM
                        ? 'bg-[rgba(95,2,107,0.10)] border-[rgba(95,2,107,0.25)]'
                        : selectedNode.type === NodeType.SOTA
                          ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-blue-700 bg-blue-500/10 border-blue-500/20'
                  }`}
                  style={{ color: selectedNode.type === NodeType.VLM ? 'var(--mllm-primary)' : undefined }}
                >
                  {selectedNode.type}
                </span>
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--mllm-text-muted)' }}>
                ID: {selectedNode.id}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--mllm-text-muted)' }}>
                <Settings2 className="h-4 w-4" /> Configuration
              </h4>
              <div className="border rounded-lg p-4 space-y-3" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)' }}>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                    Runtime
                  </label>
                  <select className="w-full border rounded px-2 py-2 text-sm outline-none" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}>
                    <option>TensorRT (FP16)</option>
                    <option>ONNX Runtime</option>
                    <option>PyTorch</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                      Batch
                    </label>
                    <input
                      type="number"
                      defaultValue={1}
                      className="w-full border rounded px-2 py-2 text-sm outline-none"
                      style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      defaultValue={60}
                      className="w-full border rounded px-2 py-2 text-sm outline-none"
                      style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--mllm-text-muted)' }}>
                <Terminal className="h-4 w-4" /> Inputs & Outputs
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)' }}>
                  <div className="text-[10px] mb-2" style={{ color: 'var(--mllm-text-muted)' }}>
                    INPUTS
                  </div>
                  <div className="space-y-1">
                    {selectedNode.inputs.length === 0 ? (
                      <div className="text-xs" style={{ color: 'var(--mllm-text-muted)' }}>
                        No inputs
                      </div>
                    ) : (
                      selectedNode.inputs.map((i) => (
                        <div key={i} className="text-xs font-mono" style={{ color: 'var(--mllm-text)' }}>
                          • {i}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="border rounded-lg p-3" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)' }}>
                  <div className="text-[10px] mb-2" style={{ color: 'var(--mllm-text-muted)' }}>
                    OUTPUTS
                  </div>
                  <div className="space-y-1">
                    {selectedNode.outputs.length === 0 ? (
                      <div className="text-xs" style={{ color: 'var(--mllm-text-muted)' }}>
                        No outputs
                      </div>
                    ) : (
                      selectedNode.outputs.map((o) => (
                        <div key={o} className="text-xs font-mono" style={{ color: 'var(--mllm-text)' }}>
                          • {o}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--mllm-text-muted)' }}>
                <Activity className="h-4 w-4" /> Execution
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'var(--mllm-primary)', color: '#ffffff', boxShadow: '0 10px 25px rgba(95, 2, 107, 0.18)' }}
                >
                  <Play className="h-4 w-4" /> Run Node
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}>
                  <Save className="h-4 w-4" /> Save
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}>
                  <FileJson className="h-4 w-4" /> Export
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--mllm-text-muted)' }}>
                <Eye className="h-4 w-4" /> Observability
              </h4>
              <div className="border rounded-lg p-4" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--mllm-text)' }}>
                      Trace Viewer
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--mllm-text-muted)' }}>
                      Latency, tokens, and evidence chain
                    </div>
                  </div>
                  <button className="px-3 py-1.5 border rounded text-sm" style={{ background: '#ffffff', borderColor: 'var(--mllm-primary)', color: 'var(--mllm-primary)' }}>
                    Open
                  </button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4" style={{ background: 'rgba(245, 158, 11, 0.10)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-amber-800">Note</div>
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--mllm-text-muted)' }}>
                    This is a demo workflow builder. Drag-and-drop, execution engine, and validation hooks can be integrated
                    with your backend pipeline.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8" style={{ color: 'var(--mllm-text-muted)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--mllm-text)' }}>
              Select a node
            </div>
            <div className="text-sm mt-1">Click on a node in the canvas to inspect it.</div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <div className="border rounded p-3 flex items-center gap-2" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)' }}>
                <Grid className="h-4 w-4" /> Pan/zoom demo
              </div>
              <div className="border rounded p-3 flex items-center gap-2" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)' }}>
                <GitBranch className="h-4 w-4" /> Evidence chain ready
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
