import React, { useState } from 'react'
import { PROMPT_TECHNIQUES, PROMPT_OPTIMIZERS } from '../constants'
import {
  MessageSquareCode,
  Sliders,
  PlayCircle,
  GitCommit,
  Split,
  Sparkles,
  Wand2,
  Lightbulb,
  Zap
} from 'lucide-react'

export const PromptStudio: React.FC<{ pageTitle?: string }> = (props) => {
  const [useOptimizer, setUseOptimizer] = useState(false)

  return (
    <div className="flex h-full w-full flex-col" style={{ background: 'var(--mllm-bg)', color: 'var(--mllm-text)' }}>
      {props.pageTitle && (
        <div className="h-14 shrink-0 border-b flex items-center justify-center" style={{ borderColor: 'var(--mllm-border)' }}>
          <h1 className="text-xl font-bold" style={{ color: 'var(--mllm-text)' }}>
            {props.pageTitle}
          </h1>
        </div>
      )}

      <div className="flex-1 min-h-0 flex w-full">
        <div className="w-64 border-r flex flex-col" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--mllm-border)' }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--mllm-text)' }}>
              Prompt Packages
            </h2>
          <button
            className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm transition-colors border"
            style={{ background: '#ffffff', borderColor: 'var(--mllm-primary)', color: 'var(--mllm-primary)' }}
          >
            + New From Template
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <div
            className="p-3 rounded-lg cursor-pointer border"
            style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-primary)' }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold" style={{ color: 'var(--mllm-text)' }}>
                p0.1-aggressive
              </span>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </div>
            <p className="text-xs" style={{ color: 'var(--mllm-text-muted)' }}>
              Decision logic for unprotected left turns.
            </p>
          </div>
          <div
            className="p-3 border rounded-lg cursor-pointer"
            style={{ background: '#ffffff', borderColor: 'var(--mllm-border)' }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold" style={{ color: 'var(--mllm-text)' }}>
                p0.1-safe-base
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--mllm-text-muted)' }}>
              Conservative baseline with high safety weights.
            </p>
          </div>
        </div>
      </div>

        <div className="flex-1 flex flex-col">
        <div className="h-14 border-b flex justify-between items-center px-4" style={{ borderColor: 'var(--mllm-border)' }}>
          <div className="flex items-center gap-4">
            <span
              className="text-sm font-mono px-2 py-1 rounded border"
              style={{ color: 'var(--mllm-primary)', borderColor: 'var(--mllm-primary)', background: 'rgba(95, 2, 107, 0.06)' }}
            >
              v0.1.4 (Draft)
            </span>
            <div className="h-4 w-px" style={{ background: 'var(--mllm-border)' }}></div>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--mllm-text)' }}>
              <Split className="h-4 w-4" />
              <span>A/B Testing Active</span>
              <div className="relative inline-flex items-center h-5 rounded-full w-9" style={{ background: 'var(--mllm-primary)' }}>
                <span className="inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform translate-x-1" />
              </div>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all border"
              style={{ background: 'rgba(79, 70, 229, 0.08)', borderColor: 'rgba(79, 70, 229, 0.25)', color: 'rgb(67, 56, 202)' }}
            >
              <Sparkles className="h-4 w-4" /> Run Eval
            </button>
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all"
              style={{ background: 'var(--mllm-primary)', color: '#ffffff', boxShadow: '0 10px 25px rgba(95, 2, 107, 0.18)' }}
            >
              <GitCommit className="h-4 w-4" /> Commit
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-4 font-mono text-sm overflow-y-auto outline-none resize-none" style={{ background: 'var(--mllm-canvas)', color: 'var(--mllm-text)' }}>
            <div className="select-none mb-2 border-b pb-1 flex justify-between" style={{ color: 'var(--mllm-text-muted)', borderColor: 'var(--mllm-border)' }}>
              <span># SYSTEM INSTRUCTION</span>
              <span className="text-xs" style={{ color: 'var(--mllm-text-muted)' }}>
                Token Count: 1,420
              </span>
            </div>
            <textarea
              className="w-full outline-none h-[600px] leading-relaxed border rounded-lg p-4"
              style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}
              spellCheck={false}
              defaultValue={`# ROLE
You are "AutoDrive-Agent", an expert autonomous driving decision-making system. 
Your input is a structured JSON description of the environment (Ego State, Perception, Map). 
Your output must be a JSON object containing the trajectory plan and control signals.

# SAFETY CONSTRAINTS (HIGHEST PRIORITY)
1. Never collide with VRUs (Vulnerable Road Users). Maintain >1.5m lateral distance.
2. Adhere to speed limits unless emergency evasion is required.
3. Max jerk shall not exceed 2.0 m/s^3 for passenger comfort.

# REASONING STRATEGY (Chain-of-Thought)
1. **Perception Analysis**: Identify critical objects and their forecasted intent.
2. **Risk Assessment**: Calculate Time-to-Collision (TTC) for all dynamic objects.
3. **Behavior Selection**: Choose a high-level semantic action (Yield, Overtake, Follow).
4. **Trajectory Generation**: Plan path points (x, y, t).

# FEW-SHOT EXAMPLE
[Input]: {
  "ego": {"v": 10.0, "state": "lane_keep"},
  "objects": [{"id": 1, "type": "pedestrian", "pos": [20, -2], "v": [0, 1.5]}]
}
[Thought]:
- Pedestrian 1 is moving perpendicular to the road (y-velocity 1.5m/s).
- Predicted to enter ego lane in 1.3 seconds.
- At current speed 10m/s, ego will reach x=20 in 2.0 seconds.
- RISK: High collision probability if speed maintained.
- ACTION: Yield. Decelerate to stop before x=15.
[Output]: {
  "decision": "YIELD",
  "reason": "Pedestrian crossing from right",
  "target_speed": 0.0,
  "trajectory": [...] 
}`}
            />
          </div>
        </div>
      </div>

      <div className="w-80 border-l overflow-y-auto" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--mllm-border)' }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--mllm-text)' }}>
            <Lightbulb className="h-4 w-4 text-amber-600" /> Engineering Tactics
          </h3>
          <div className="space-y-3">
            {PROMPT_TECHNIQUES.map((tech) => (
              <label key={tech.id} className="flex items-start gap-3 p-2 rounded cursor-pointer group hover:bg-[rgb(252,248,242)]">
                <input type="checkbox" className="mt-1 rounded border text-brand-500 focus:ring-0" style={{ borderColor: 'var(--mllm-border)' }} />
                <div>
                  <span className="block text-sm font-medium transition-colors" style={{ color: 'var(--mllm-text)' }}>
                    {tech.label}
                  </span>
                  <span className="block text-xs leading-tight mt-0.5" style={{ color: 'var(--mllm-text-muted)' }}>
                    {tech.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="p-5 border-b" style={{ borderColor: 'var(--mllm-border)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--mllm-text)' }}>
              <Wand2 className="h-4 w-4" style={{ color: 'var(--mllm-primary)' }} /> Auto-Optimization
            </h3>
            <div
              className={`relative inline-flex items-center h-4 rounded-full w-8 cursor-pointer transition-colors ${
                useOptimizer ? '' : ''
              }`}
              style={{ background: useOptimizer ? 'var(--mllm-primary)' : 'rgb(212, 212, 216)' }}
              onClick={() => setUseOptimizer(!useOptimizer)}
            >
              <span
                className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${
                  useOptimizer ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </div>
          </div>

          <div className={`space-y-3 transition-opacity ${useOptimizer ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <select
              className="w-full border rounded text-xs px-2 py-2 outline-none"
              style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}
            >
              <option value="">Select Optimizer...</option>
              {PROMPT_OPTIMIZERS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-[10px] p-2 rounded border" style={{ color: 'var(--mllm-text-muted)', background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)' }}>
              <span className="font-bold" style={{ color: 'var(--mllm-primary)' }}>
                DSPy
              </span>{' '}
              will compile your prompt into optimized weights by running 50 iterations against the "Urban-Day" validation set.
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--mllm-text)' }}>
            <Sliders className="h-4 w-4" /> Parameters
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                <span>Temperature</span>
                <span>0.4</span>
              </div>
              <input type="range" className="w-full h-1 rounded-lg appearance-none cursor-pointer" style={{ background: 'rgb(228, 228, 231)', accentColor: 'var(--mllm-primary)' }} />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                <span>Top P</span>
                <span>0.95</span>
              </div>
              <input type="range" className="w-full h-1 rounded-lg appearance-none cursor-pointer" style={{ background: 'rgb(228, 228, 231)', accentColor: 'var(--mllm-primary)' }} />
            </div>

            <div className="border-t pt-4" style={{ borderColor: 'var(--mllm-border)' }}>
              <h4 className="text-xs font-bold mb-2" style={{ color: 'var(--mllm-text)' }}>
                Safety Rollback
              </h4>
              <div className="p-3 rounded border" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)' }}>
                <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked className="rounded border" style={{ borderColor: 'var(--mllm-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--mllm-text-muted)' }}>
                    Auto-Revert on Fail
                  </span>
                </label>
                <div className="text-[10px]" style={{ color: 'var(--mllm-text-muted)' }}>
                  Triggers if safety violation rate &gt; 0.5% in Evaluation Gate.
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
