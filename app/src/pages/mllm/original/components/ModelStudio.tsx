import React, { useState } from 'react'
import { BASE_MODELS, PUBLIC_DATASETS, PROPRIETARY_DATASETS } from '../constants'
import {
  AlignStartVertical,
  BrainCircuit,
  ChevronRight,
  Database,
  GitBranch,
  Layers,
  Play,
  Scale,
  Server,
  Settings,
  Shuffle,
  Target,
  Zap
} from 'lucide-react'

export const ModelStudio: React.FC = () => {
  const [activeStep, setActiveStep] = useState(1)
  const [tuningType, setTuningType] = useState<'sft' | 'rl'>('sft')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-200">
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white mb-2">Model Versions</h2>
          <button className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded text-sm font-medium transition-colors">
            + New Version
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <div className="p-3 bg-slate-800 border border-brand-500/50 rounded-lg cursor-pointer">
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-bold text-white">v0.1-alpha</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Ready</span>
            </div>
            <p className="text-xs text-slate-400 mb-2">Base: Llama 3 70B</p>
            <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
              <span>SFT: 4000 steps</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg cursor-pointer group">
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-bold text-slate-300">v0.2-beta</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div> Training
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">Base: Gemini Pro Vision</p>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-[45%]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div
          className="h-16 border-b border-slate-800 flex items-center px-8"
          style={{ background: 'var(--mllm-canvas)', color: 'var(--mllm-text)' }}
        >
          <div className="flex items-center gap-4 text-sm">
            <div
              className={`flex items-center gap-2 cursor-pointer ${activeStep === 1 ? 'text-brand-400' : 'text-slate-500'}`}
              onClick={() => setActiveStep(1)}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                  activeStep === 1 ? 'border-brand-500 bg-brand-500/20' : 'border-slate-700'
                }`}
              >
                1
              </div>
              <span style={{ color: activeStep === 1 ? 'var(--mllm-primary)' : 'var(--mllm-text)' }}>Base Model</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-700" />
            <div
              className={`flex items-center gap-2 cursor-pointer ${activeStep === 2 ? 'text-brand-400' : 'text-slate-500'}`}
              onClick={() => setActiveStep(2)}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                  activeStep === 2 ? 'border-brand-500 bg-brand-500/20' : 'border-slate-700'
                }`}
              >
                2
              </div>
              <span style={{ color: activeStep === 2 ? 'var(--mllm-primary)' : 'var(--mllm-text)' }}>Data Source</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-700" />
            <div
              className={`flex items-center gap-2 cursor-pointer ${activeStep === 3 ? 'text-brand-400' : 'text-slate-500'}`}
              onClick={() => setActiveStep(3)}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                  activeStep === 3 ? 'border-brand-500 bg-brand-500/20' : 'border-slate-700'
                }`}
              >
                3
              </div>
              <span style={{ color: activeStep === 3 ? 'var(--mllm-primary)' : 'var(--mllm-text)' }}>Tuning Strategy</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {activeStep === 1 && (
              <section className="animate-fadeIn">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-purple-500" /> Select Foundation Model
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {BASE_MODELS.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`p-4 border rounded-xl bg-slate-900 cursor-pointer transition-all group relative overflow-hidden ${
                        selectedModel === model.id
                          ? 'border-brand-500 ring-1 ring-brand-500'
                          : 'border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            model.family === 'InternVL'
                              ? 'border-indigo-500/30 text-indigo-400 bg-indigo-900/20'
                              : model.family === 'Qwen'
                                ? 'border-blue-500/30 text-blue-400 bg-blue-900/20'
                                : model.family === 'Llama'
                                  ? 'border-amber-500/30 text-amber-400 bg-amber-900/20'
                                  : 'border-slate-500/30 text-slate-400 bg-slate-800'
                          }`}
                        >
                          {model.family}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{model.param}</span>
                      </div>
                      <div className="font-bold text-slate-200 text-sm mb-1">{model.name}</div>
                      <div className="text-[10px] text-slate-500">{model.type}</div>
                      {selectedModel === model.id && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(95,2,107,0.55)]"></div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeStep === 2 && (
              <section className="animate-fadeIn">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5 text-emerald-500" /> Linked Data Sources
                </h3>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Public Benchmarks</h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    {PUBLIC_DATASETS.map((ds) => (
                      <div
                        key={ds.id}
                        className="p-4 flex items-center justify-between border-b border-slate-800 last:border-0 hover:bg-slate-800/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="rounded border-slate-600 bg-slate-950 text-brand-500 focus:ring-0"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-200">{ds.name}</div>
                            <div className="text-xs text-slate-500">{ds.description}</div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{ds.size}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Proprietary / Self-Correction Data</h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    {PROPRIETARY_DATASETS.map((ds) => (
                      <div
                        key={ds.id}
                        className="p-4 flex items-center justify-between border-b border-slate-800 last:border-0 hover:bg-slate-800/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="rounded border-slate-600 bg-slate-950 text-brand-500 focus:ring-0"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-200">{ds.name}</div>
                            <div className="text-xs text-slate-500">{ds.description}</div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-emerald-500">{ds.images}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeStep === 3 && (
              <section className="animate-fadeIn">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-amber-500" /> Advanced Tuning Strategy
                </h3>

                <div className="flex gap-4 mb-6 border-b border-slate-800">
                  <button
                    onClick={() => setTuningType('sft')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                      tuningType === 'sft'
                        ? 'border-brand-500 text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    SFT / Instruction Tuning
                  </button>
                  <button
                    onClick={() => setTuningType('rl')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                      tuningType === 'rl'
                        ? 'border-brand-500 text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Alignment / RL
                  </button>
                </div>

                {tuningType === 'sft' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-900 border border-brand-500/50 rounded-xl relative overflow-hidden group hover:shadow-lg hover:shadow-brand-500/10 transition-all cursor-pointer">
                      <div className="absolute top-0 right-0 p-2 bg-brand-500/20 text-brand-400 text-[10px] font-bold rounded-bl-lg">
                        STANDARD
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <div className="font-bold text-white">LoRA / QLoRA</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 h-12">
                        Low-Rank Adaptation. Best for adapting large models (70B+) to specific ODDs with limited VRAM.
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="block text-slate-500">Rank (r)</span>
                          <input
                            type="number"
                            defaultValue={64}
                            className="bg-transparent text-white w-full outline-none font-mono"
                          />
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="block text-slate-500">Alpha</span>
                          <input
                            type="number"
                            defaultValue={128}
                            className="bg-transparent text-white w-full outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:border-purple-500 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="h-5 w-5 text-purple-400" />
                        <div className="font-bold text-white">DoRA</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 h-12">
                        Weight-Decomposed LoRA. Improved learning capacity by separating magnitude and direction updates.
                      </p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 text-xs flex justify-between">
                        <span className="text-slate-500">Target Modules</span>
                        <span className="text-slate-200 font-mono">All Linear</span>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:border-pink-500 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Shuffle className="h-5 w-5 text-pink-400" />
                        <div className="font-bold text-white">NEFTune</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 h-12">
                        Noisy Embedding Instruction Tuning. Adds noise to embeddings to improve generalization and robustness.
                      </p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 text-xs">
                        <span className="block text-slate-500">Noise Alpha</span>
                        <input
                          type="number"
                          defaultValue={5}
                          className="bg-transparent text-white w-full outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl hover:border-slate-500 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="h-5 w-5 text-blue-400" />
                        <div className="font-bold text-white">Full Fine-Tuning</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 h-12">
                        Updates all model parameters. Requires extensive compute (H100 Cluster) but yields maximum performance.
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="block text-slate-500">Epochs</span>
                          <span className="text-slate-200 font-mono">3</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="block text-slate-500">Batch</span>
                          <span className="text-slate-200 font-mono">1024</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tuningType === 'rl' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-900 border border-brand-500/50 rounded-xl cursor-pointer hover:border-brand-400 transition-colors">
                      <div className="absolute top-0 right-0 p-2 bg-brand-500/20 text-brand-400 text-[10px] font-bold rounded-bl-lg">
                        POPULAR
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-red-400" />
                        <div className="font-bold text-white">DPO</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 h-12">
                        Direct Preference Optimization. Stable, offline preference optimization without a reward model.
                      </p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 text-xs">
                        <span className="block text-slate-500">Beta (KL Penalty)</span>
                        <input
                          type="number"
                          defaultValue={0.1}
                          className="bg-transparent text-white w-full outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:border-orange-500 transition-colors">
                      <div className="absolute top-0 right-0 p-2 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded-bl-lg">
                        NEW
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="h-5 w-5 text-orange-400" />
                        <div className="font-bold text-white">GRPO</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 h-12">
                        Odds Ratio Preference Optimization. Reference-model-free alignment method. Combines SFT and Alignment in one step.
                      </p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 text-xs">
                        <span className="block text-slate-500">Lambda</span>
                        <input
                          type="number"
                          defaultValue={0.05}
                          className="bg-transparent text-white w-full outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:border-cyan-500 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <AlignStartVertical className="h-5 w-5 text-cyan-400" />
                        <div className="font-bold text-white">KTO</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 h-12">
                        Kahneman-Tversky Optimization. Uses unpaired binary signals (good/bad) instead of preference pairs.
                      </p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 text-xs">
                        <span className="block text-slate-500">Loss Config</span>
                        <span className="text-slate-200 font-mono">Desirable/Undesirable</span>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:border-slate-500">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-slate-400" />
                        <div className="font-bold text-white">PPO</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-4 h-12">
                        Proximal Policy Optimization. Classic on-policy RLHF. Requires a trained Reward Model and Value Model.
                      </p>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 text-xs">
                        <span className="block text-slate-500">Reward Model</span>
                        <span className="text-slate-200 font-mono">rm-v1.4-safety</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Estimated Cost:{' '}
            <span className="text-slate-300 font-mono">{activeStep === 3 && tuningType === 'sft' ? '$12.50' : '$85.00'} / hr</span>
          </div>
          <div className="flex gap-3">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
            )}
            {activeStep < 3 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-all"
              >
                Next Step
              </button>
            ) : (
              <button className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all">
                <Play className="h-4 w-4" /> Start Training Job
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
