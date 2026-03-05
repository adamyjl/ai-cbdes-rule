import React, { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { CODE_QUALITY_DATA, KPI_DATA, TRAINING_LOSS_DATA } from '../constants'
import { Download, Eye, Filter, ShieldCheck } from 'lucide-react'

type ScenarioGroup = { id: string; name: string; cases: number }

type EvaluationCase = {
  id: string
  name: string
  time: string
  description: string
  status: 'Pass' | 'Fail'
  severity: 'Critical' | 'Major' | 'Minor'
}

const scenarioGroups: ScenarioGroup[] = [
  { id: 'core', name: 'Core Functionality', cases: 120 },
  { id: 'reg', name: 'Regulation Safety', cases: 165 },
  { id: 'longtail', name: 'Long-tail Cases', cases: 210 },
  { id: 'attack', name: 'Adversarial Attacks', cases: 80 },
  { id: 'weather', name: 'Weather Variations', cases: 260 }
]

const oddPassRate = [
  { name: 'Urban-Day', pass: 98, fail: 2 },
  { name: 'Urban-Night', pass: 92, fail: 8 },
  { name: 'Highway-Rain', pass: 88, fail: 12 },
  { name: 'Construction', pass: 76, fail: 24 },
  { name: 'Unprotected-Left', pass: 85, fail: 15 }
]

const cases: EvaluationCase[] = [
  {
    id: 'C-20260112-001',
    name: 'Unprotected Left Turn - VRU Yield',
    time: '09:15:22',
    description: 'Ego vehicle yielding to pedestrian crossing from right at intersection.',
    status: 'Pass',
    severity: 'Critical'
  },
  {
    id: 'C-20260112-002',
    name: 'Highway Merge - Dense Traffic',
    time: '09:42:10',
    description: 'Merging into 80kph traffic flow with < 20m gap.',
    status: 'Pass',
    severity: 'Major'
  },
  {
    id: 'C-20260112-003',
    name: 'Construction Zone - Lane Narrowing',
    time: '10:15:45',
    description: 'Navigating temporary lane markers with cones. Lateral deviation > 15cm detected.',
    status: 'Fail',
    severity: 'Major'
  },
  {
    id: 'C-20260112-004',
    name: 'Emergency Braking - Cut-in',
    time: '10:30:00',
    description: 'Sudden cut-in by vehicle from left lane. TTC < 1.5s.',
    status: 'Pass',
    severity: 'Critical'
  },
  {
    id: 'C-20260112-005',
    name: 'Roundabout Entry - Multi-agent',
    time: '10:55:12',
    description: 'Entering 2-lane roundabout with 3 dynamic agents.',
    status: 'Pass',
    severity: 'Minor'
  },
  {
    id: 'C-20260112-006',
    name: 'Night Rain - Traffic Light Detection',
    time: '11:10:33',
    description: 'Detecting state of suspended traffic light in heavy rain conditions. Confidence < threshold.',
    status: 'Fail',
    severity: 'Critical'
  }
]

export const EvaluationGate: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<string>('core')

  const passCount = useMemo(() => cases.filter((c) => c.status === 'Pass').length, [])
  const failCount = useMemo(() => cases.filter((c) => c.status === 'Fail').length, [])
  const overallPassRate = useMemo(() => Math.round((passCount / (passCount + failCount)) * 100), [passCount, failCount])

  return (
    <div className="h-full w-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Evaluation Gate</h1>
            <p className="text-slate-400">Six-dimensional evaluation, ODD pass rates, and detailed case execution logs.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100">Scenario Sets</h2>
              <p className="text-xs text-slate-500 mt-1">Select ODD for evaluation</p>
            </div>
            <div className="p-2 space-y-1">
              {scenarioGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  className={
                    'w-full p-3 rounded cursor-pointer text-sm flex justify-between items-center group border ' +
                    (selectedGroup === g.id
                      ? 'bg-brand-900/20 border-brand-500/30 text-brand-400'
                      : 'border-transparent hover:bg-slate-800 text-slate-400')
                  }
                >
                  <span className="text-left">{g.name}</span>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded group-hover:bg-slate-700">{g.cases} cases</span>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800">
              <button className="w-full flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded text-sm font-medium transition-colors">
                Run Simulation
              </button>
            </div>
          </aside>

          <section className="col-span-12 lg:col-span-9 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest">Overall Gate Status</div>
                  <div className="text-3xl font-bold text-white mt-1">PASS</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Build: <span className="font-mono">#142</span> • Model: <span className="font-mono">v0.1-alpha</span> •
                    Dataset: <span className="font-mono">Urban-Day</span>
                  </div>
                </div>
              </div>
              <button className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg shadow-lg shadow-brand-500/20 transition-all">
                Approve for Deployment
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500">Overall Pass Rate</div>
                <div className="mt-2 text-3xl font-bold text-white">{overallPassRate}%</div>
                <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${overallPassRate}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Pass {passCount} / Fail {failCount}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500">Inference Latency (P99)</div>
                <div className="mt-2 text-3xl font-bold text-white">12.4 ms</div>
                <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[30%]" />
                </div>
                <div className="mt-2 text-xs text-slate-500">Target &lt; 40ms</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500">Memory Footprint</div>
                <div className="mt-2 text-3xl font-bold text-white">2.1 GB</div>
                <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[70%]" />
                </div>
                <div className="mt-2 text-xs text-slate-500">Warning: approaching edge limit (3GB)</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">Six-dimensional Evaluation</div>
                    <div className="text-xs text-slate-500">A: current, B: baseline</div>
                  </div>
                  <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                    <Eye className="h-4 w-4" /> View
                  </button>
                </div>
                <div className="h-72 bg-slate-950 border border-slate-800 rounded-xl p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={KPI_DATA}>
                      <PolarGrid stroke="rgba(148, 163, 184, 0.45)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgb(24, 24, 27)', fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fill: 'rgb(82, 82, 91)', fontSize: 10 }} angle={30} domain={[0, 150]} />
                      <Radar name="A" dataKey="A" stroke="rgb(95, 2, 107)" fill="rgba(95, 2, 107, 0.18)" />
                      <Radar name="B" dataKey="B" stroke="#10b981" fill="rgba(16, 185, 129, 0.12)" />
                      <Legend />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--mllm-border)', color: 'rgb(24, 24, 27)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-sm font-bold text-white mb-3">Pass Rate by ODD</div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  {oddPassRate.map((r) => {
                    const total = r.pass + r.fail
                    const passRate = Math.round((r.pass / total) * 100)
                    return (
                      <div key={r.name} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-slate-300">{r.name}</div>
                        <div className="flex-1">
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${passRate}%` }} />
                          </div>
                        </div>
                        <div className="w-14 text-right text-xs font-mono text-slate-200">{passRate}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-sm font-bold text-white mb-3">Training Loss Curve</div>
                <div className="h-64 bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={TRAINING_LOSS_DATA}>
                      <XAxis dataKey="step" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={10} />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--mllm-border)', color: 'rgb(24, 24, 27)' }} />
                      <Line type="monotone" dataKey="train" stroke="rgb(95, 2, 107)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-sm font-bold text-white mb-3">Code Quality Breakdown</div>
                <div className="h-64 bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={CODE_QUALITY_DATA}>
                      <XAxis dataKey="subject" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={10} />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--mllm-border)', color: 'rgb(24, 24, 27)' }} />
                      <Bar dataKey="A" fill="rgb(95, 2, 107)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="B" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Case Execution Log</div>
                  <div className="text-xs text-slate-500">Detailed pass/fail cases</div>
                </div>
                <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  <Eye className="h-4 w-4" /> View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Case Name / ID</th>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3 text-right">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {cases.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          {item.status === 'Pass' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Fail
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{item.name}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{item.id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 font-mono">{item.time}</td>
                        <td className="px-6 py-4 text-sm text-slate-300 max-w-md">{item.description}</td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={
                              'text-xs font-medium ' +
                              (item.severity === 'Critical'
                                ? 'text-rose-400'
                                : item.severity === 'Major'
                                  ? 'text-amber-400'
                                  : 'text-slate-400')
                            }
                          >
                            {item.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
