import { useMemo, useState } from 'react'

type ModelType = 'VLM' | 'VLA' | 'RULE' | 'SOTA'

type ModelCard = {
  id: string
  name: string
  type: ModelType
  provider: string
  context: string
  status: 'ready' | 'training' | 'deprecated'
}

const models: ModelCard[] = [
  { id: 'm1', name: 'VLM-Urban-3B', type: 'VLM', provider: 'Internal', context: '64k', status: 'ready' },
  { id: 'm2', name: 'VLA-Policy-RC2', type: 'VLA', provider: 'Internal', context: '32k', status: 'training' },
  { id: 'm3', name: 'RulePack-Safety', type: 'RULE', provider: 'Compliance', context: '-', status: 'ready' },
  { id: 'm4', name: 'SOTA-Predictor', type: 'SOTA', provider: 'Open', context: '16k', status: 'deprecated' }
]

export function ModelStudioModule() {
  const [active, setActive] = useState<ModelCard>(models[0])
  const [temperature, setTemperature] = useState(0.4)
  const [topP, setTopP] = useState(0.95)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [prompt, setPrompt] = useState('Describe the scene and provide a safety-first driving decision in JSON.')
  const [result, setResult] = useState('')

  const badge = (t: ModelType) => {
    const cls =
      t === 'VLM'
        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
        : t === 'VLA'
          ? 'bg-orange-500/10 text-orange-300 border-orange-500/20'
          : t === 'RULE'
            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    return <span className={'text-[11px] px-2 py-0.5 rounded border ' + cls}>{t}</span>
  }

  const statusPill = useMemo(() => {
    const s = active.status
    const cls =
      s === 'ready'
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : s === 'training'
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : 'bg-slate-700/50 text-slate-300 border-slate-600/40'
    return <span className={'text-xs px-2 py-0.5 rounded-full border ' + cls}>{s}</span>
  }, [active.status])

  const run = () => {
    setResult(
      JSON.stringify(
        {
          decision: 'YIELD',
          reason: 'VRU crossing detected; safety constraints take priority.',
          target_speed: 0,
          trajectory: [{ t: 0, x: 0, y: 0, v: 10 }, { t: 2.0, x: 12, y: 0, v: 0 }]
        },
        null,
        2
      )
    )
  }

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-200">
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Model Studio</h2>
          <p className="text-xs text-slate-500 mt-1">Select model, tune params, and run quick checks.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m)}
              className={
                'w-full text-left p-3 rounded-xl border transition-colors ' +
                (active.id === m.id ? 'bg-brand-900/10 border-brand-500/30' : 'bg-slate-900 border-slate-800 hover:bg-slate-800')
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-white truncate">{m.name}</div>
                {badge(m.type)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span className="truncate">{m.provider}</span>
                <span className="font-mono">ctx {m.context}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="truncate text-sm font-semibold text-white">{active.name}</div>
              {statusPill}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Provider: {active.provider}</div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 hover:border-brand-500">
              Export Config
            </button>
            <button className="px-3 py-1.5 bg-brand-600 text-white rounded text-sm hover:bg-brand-500 shadow-lg shadow-brand-500/20" onClick={run}>
              Run
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 text-xs font-semibold text-slate-400">Prompt</div>
            <div className="p-4 flex-1 overflow-y-auto">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-full min-h-[360px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 text-xs font-semibold text-slate-400">Output</div>
            <div className="p-4 flex-1 overflow-y-auto">
              <pre className="w-full h-full min-h-[360px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 overflow-auto">
                {result || 'Click Run to generate a sample output.'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 bg-slate-900 border-l border-slate-800 overflow-y-auto">
        <div className="p-5 space-y-5">
          <div>
            <div className="text-sm font-bold text-white mb-1">Parameters</div>
            <div className="text-xs text-slate-500">Tune generation behavior for quick experiments.</div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Temperature</span>
              <span className="font-mono text-slate-200">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Top P</span>
              <span className="font-mono text-slate-200">{topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={topP}
              onChange={(e) => setTopP(Number(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Max Tokens</span>
              <span className="font-mono text-slate-200">{maxTokens}</span>
            </div>
            <input
              type="range"
              min={256}
              max={8192}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase">Safety</div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950" />
              Auto-Reject invalid JSON
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950" />
              Enforce constraint priority
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

