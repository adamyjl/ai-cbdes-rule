import React from 'react'
import { TARGET_PLATFORMS } from '../constants'
import { Target, Map, Activity, Cpu, CheckCircle2 } from 'lucide-react'

export const ProjectCenter: React.FC = () => {
  return (
    <div className="h-full w-full p-8 overflow-y-auto" style={{ background: 'var(--mllm-bg)', color: 'var(--mllm-text)' }}>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b pb-6" style={{ borderColor: 'var(--mllm-border)' }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--mllm-text)' }}>
            Project Center AI-CBDES-MLLM
          </h1>
          <p style={{ color: 'var(--mllm-text-muted)' }}>Define ODD, operational constraints, and target deployment hardware.</p>
        </div>

        <div className="border rounded-xl p-6" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--mllm-text)' }}>
            <Target className="h-5 w-5" style={{ color: 'var(--mllm-primary)' }} /> Project Definition
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                Project Name
              </label>
              <input
                type="text"
                defaultValue="Urban-Pilot-L2+"
                className="w-full border rounded-lg px-3 py-2 outline-none"
                style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                SOP Date
              </label>
              <input
                type="date"
                defaultValue="2025-12-30"
                className="w-full border rounded-lg px-3 py-2 outline-none"
                style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                Description
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 outline-none h-20"
                style={{ background: '#ffffff', borderColor: 'var(--mllm-border)', color: 'var(--mllm-text)' }}
                defaultValue="L2+ Urban Navigation Pilot focusing on complex intersection handling and VRU interactions."
              />
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-6" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--mllm-text)' }}>
            <Map className="h-5 w-5 text-emerald-600" /> ODD & Scenario Sets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              'Urban High Density',
              'Highway Ramp Merge',
              'Night & Rain',
              'School Zones',
              'Construction Areas',
              'Unprotected Turns'
            ].map((scene) => (
              <label
                key={scene}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                style={{ background: '#ffffff', borderColor: 'var(--mllm-border)' }}
              >
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="peer h-4 w-4 appearance-none rounded border checked:bg-emerald-600 checked:border-emerald-600"
                    style={{ borderColor: 'var(--mllm-border)', background: '#ffffff' }}
                  />
                  <CheckCircle2 className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <span className="text-sm" style={{ color: 'var(--mllm-text)' }}>
                  {scene}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="border rounded-xl p-6" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--mllm-text)' }}>
            <Cpu className="h-5 w-5" style={{ color: 'var(--mllm-primary)' }} /> Target Deployment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {TARGET_PLATFORMS.map((platform) => (
              <div
                key={platform.id}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-105 ${
                  platform.id === 'orin'
                    ? 'ring-1'
                    : ''
                }`}
                style={{
                  background: '#ffffff',
                  borderColor: platform.id === 'orin' ? 'var(--mllm-primary)' : 'var(--mllm-border)',
                  boxShadow: platform.id === 'orin' ? '0 0 0 3px rgba(95, 2, 107, 0.10)' : 'none'
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      platform.type === 'Cloud'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {platform.type}
                  </span>
                  {platform.id === 'orin' && (
                    <div className="h-3 w-3 rounded-full" style={{ background: 'var(--mllm-primary)', boxShadow: '0 0 10px rgba(95, 2, 107, 0.25)' }} />
                  )}
                </div>
                <div className="font-bold mb-1" style={{ color: 'var(--mllm-text)' }}>
                  {platform.name}
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--mllm-text-muted)' }}>
                  {platform.tops} TOPS
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-xl p-6" style={{ background: 'var(--mllm-canvas)', borderColor: 'var(--mllm-border)', boxShadow: 'var(--mllm-shadow)' }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--mllm-text)' }}>
            <Activity className="h-5 w-5 text-amber-600" /> KPI Goals
          </h3>
          <div className="flex gap-6 overflow-x-auto pb-2">
            {[
              { label: 'E2E Latency', unit: 'ms', target: '< 100' },
              { label: 'MPI (Miles Per Intervention)', unit: 'miles', target: '> 50' },
              { label: 'Comfort (Jerk)', unit: 'm/s³', target: '< 2.0' },
              { label: 'Pass Rate (Core)', unit: '%', target: '> 99.5' }
            ].map((kpi, idx) => (
              <div key={idx} className="min-w-[180px] p-4 border rounded-lg" style={{ background: '#ffffff', borderColor: 'var(--mllm-border)' }}>
                <div className="text-xs uppercase mb-1" style={{ color: 'var(--mllm-text-muted)' }}>
                  {kpi.label}
                </div>
                <div className="text-2xl font-mono font-bold" style={{ color: 'var(--mllm-text)' }}>
                  {kpi.target}{' '}
                  <span className="text-sm font-sans font-normal" style={{ color: 'var(--mllm-text-muted)' }}>
                    {kpi.unit}
                  </span>
                </div>
              </div>
            ))}
            <div
              className="min-w-[180px] p-4 border border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              style={{ borderColor: 'var(--mllm-primary)', color: 'var(--mllm-text-muted)', background: '#ffffff' }}
            >
              + Add Metric
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            className="px-8 py-3 font-bold rounded-lg transition-all"
            style={{ background: 'var(--mllm-primary)', color: '#ffffff', boxShadow: '0 10px 25px rgba(95, 2, 107, 0.18)' }}
          >
            Save Project Configuration
          </button>
        </div>
      </div>
    </div>
  )
}
