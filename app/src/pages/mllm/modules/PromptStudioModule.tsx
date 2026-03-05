import { useMemo, useState } from 'react'

type Technique = { id: string; label: string; desc: string }
type Optimizer = { id: string; label: string }

const techniques: Technique[] = [
  { id: 'fewshot', label: 'Few-shot', desc: 'Provide demonstrations to stabilize behavior.' },
  { id: 'constraints', label: 'Hard Constraints', desc: 'Make safety constraints explicit and ranked.' },
  { id: 'formats', label: 'I/O Contracts', desc: 'Enforce JSON schema and error handling rules.' },
  { id: 'tools', label: 'Tool-Calling', desc: 'Plan with tool outputs and cite evidence.' },
  { id: 'selfcheck', label: 'Self-Check', desc: 'Add verification checklist before final output.' }
]

const optimizers: Optimizer[] = [
  { id: 'dspy', label: 'DSPy Compile' },
  { id: 'grid', label: 'Grid Search' },
  { id: 'bandit', label: 'Bandit Tuning' }
]

const defaultPrompt = `# ROLE
You are "AutoDrive-Agent", an expert autonomous driving decision-making system.
Your input is a structured JSON description of the environment (Ego State, Perception, Map).
Your output must be a JSON object containing the trajectory plan and control signals.

# SAFETY CONSTRAINTS (HIGHEST PRIORITY)
1. Never collide with VRUs (Vulnerable Road Users). Maintain >1.5m lateral distance.
2. Adhere to speed limits unless emergency evasion is required.
3. Max jerk shall not exceed 2.0 m/s^3 for passenger comfort.

# OUTPUT FORMAT
Return valid JSON only with fields:
- decision (string)
- reason (string)
- target_speed (number)
- trajectory (array)
`

export function PromptStudioModule() {
  const [useOptimizer, setUseOptimizer] = useState(false)
  const [activePackage, setActivePackage] = useState<'p0.1-aggressive' | 'p0.1-safe-base'>('p0.1-aggressive')
  const [selectedTech, setSelectedTech] = useState<Record<string, boolean>>({})
  const [prompt, setPrompt] = useState(defaultPrompt)

  const tokenCount = useMemo(() => {
    const approx = Math.ceil(prompt.length / 4)
    return approx.toLocaleString('en-US')
  }, [prompt])

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-200">
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white mb-2">Prompt Packages</h2>
          <button className="w-full bg-slate-800 border border-slate-700 hover:border-brand-500 text-slate-300 py-2 rounded text-sm transition-colors">
            + New From Template
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <button
            onClick={() => setActivePackage('p0.1-aggressive')}
            className={
              'w-full text-left p-3 rounded-lg border transition-colors ' +
              (activePackage === 'p0.1-aggressive'
                ? 'bg-brand-900/10 border-brand-500/30'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-800')
            }
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-white">p0.1-aggressive</span>
              <div className="h-2 w-2 bg-green-500 rounded-full" />
            </div>
            <p className="text-xs text-slate-400">Decision logic for unprotected left turns.</p>
          </button>

          <button
            onClick={() => setActivePackage('p0.1-safe-base')}
            className={
              'w-full text-left p-3 rounded-lg border transition-colors ' +
              (activePackage === 'p0.1-safe-base'
                ? 'bg-brand-900/10 border-brand-500/30'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-800')
            }
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-slate-300">p0.1-safe-base</span>
            </div>
            <p className="text-xs text-slate-500">Conservative baseline with high safety weights.</p>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-slate-800 flex justify-between items-center px-4 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-brand-400 bg-brand-900/20 px-2 py-1 rounded">v0.1.4 (Draft)</span>
            <div className="h-4 w-px bg-slate-700" />
            <div className="text-sm text-slate-300">A/B Testing Active</div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-600/50 rounded text-sm hover:bg-indigo-600/30 transition-all">
              Run Eval
            </button>
            <button className="px-3 py-1.5 bg-brand-600 text-white rounded text-sm hover:bg-brand-500 shadow-lg shadow-brand-500/20 transition-all">
              Commit
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-4 font-mono text-sm bg-[#0d1117] text-slate-300 overflow-y-auto">
            <div className="text-slate-500 select-none mb-2 border-b border-slate-800 pb-1 flex justify-between">
              <span># SYSTEM INSTRUCTION</span>
              <span className="text-xs text-slate-600">Token Count: {tokenCount}</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent outline-none min-h-[720px] text-slate-300 leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <div className="w-80 bg-slate-900 border-l border-slate-800 overflow-y-auto">
        <div className="p-5 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4">Engineering Tactics</h3>
          <div className="space-y-3">
            {techniques.map((tech) => (
              <label key={tech.id} className="flex items-start gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={Boolean(selectedTech[tech.id])}
                  onChange={(e) => setSelectedTech((prev) => ({ ...prev, [tech.id]: e.target.checked }))}
                  className="mt-1 rounded border-slate-600 bg-slate-950"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    {tech.label}
                  </span>
                  <span className="block text-xs text-slate-500 leading-tight mt-0.5">{tech.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="p-5 border-b border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white">Auto-Optimization</h3>
            <button
              onClick={() => setUseOptimizer((v) => !v)}
              className={
                'h-6 w-10 rounded-full border transition-colors ' +
                (useOptimizer ? 'bg-purple-600 border-purple-500' : 'bg-slate-800 border-slate-700')
              }
            >
              <span
                className={
                  'block h-4 w-4 bg-white rounded-full transition-transform ' +
                  (useOptimizer ? 'translate-x-4' : 'translate-x-1')
                }
              />
            </button>
          </div>
          <div className={'space-y-3 transition-opacity ' + (useOptimizer ? 'opacity-100' : 'opacity-40 pointer-events-none')}>
            <select className="w-full bg-slate-950 border border-slate-700 rounded text-xs px-2 py-2 text-slate-300 outline-none focus:border-purple-500">
              <option value="">Select Optimizer...</option>
              {optimizers.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-slate-500 bg-slate-950 p-2 rounded border border-slate-800">
              <span className="font-bold text-purple-400">DSPy</span> will compile your prompt into optimized weights by running iterations against the validation set.
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Parameters</h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Temperature</span>
                <span>0.4</span>
              </div>
              <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Top P</span>
                <span>0.95</span>
              </div>
              <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

