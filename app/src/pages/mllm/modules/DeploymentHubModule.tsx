import { useMemo, useState } from 'react'

type DeployEnv = 'staging' | 'production'
type DeployStatus = 'queued' | 'running' | 'success' | 'failed'

type DeployItem = {
  id: string
  env: DeployEnv
  version: string
  region: string
  status: DeployStatus
  startedAt: string
  duration: string
}

const initialDeploys: DeployItem[] = [
  { id: 'D-20260304-001', env: 'staging', version: 'v3.4.1-rc2', region: 'cn-north-1', status: 'success', startedAt: '09:10', duration: '4m 12s' },
  { id: 'D-20260304-002', env: 'staging', version: 'v3.4.1-rc3', region: 'cn-north-1', status: 'running', startedAt: '10:03', duration: '1m 05s' },
  { id: 'D-20260304-003', env: 'production', version: 'v3.4.0', region: 'cn-east-1', status: 'success', startedAt: '08:20', duration: '6m 30s' },
  { id: 'D-20260304-004', env: 'production', version: 'v3.4.1-rc1', region: 'cn-east-1', status: 'failed', startedAt: '07:55', duration: '2m 40s' }
]

export function DeploymentHubModule() {
  const [env, setEnv] = useState<DeployEnv>('staging')
  const [deploys, setDeploys] = useState<DeployItem[]>(initialDeploys)

  const filtered = useMemo(() => deploys.filter((d) => d.env === env), [deploys, env])

  const pill = (s: DeployStatus) => {
    const cls =
      s === 'success'
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : s === 'running'
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : s === 'failed'
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            : 'bg-slate-700/50 text-slate-300 border-slate-600/40'
    return <span className={'text-xs px-2 py-0.5 rounded-full border ' + cls}>{s}</span>
  }

  const triggerDeploy = () => {
    const ymd = new Date().toISOString().slice(0, 10).split('-').join('')
    const next: DeployItem = {
      id: `D-${ymd}-${String(deploys.length + 1).padStart(3, '0')}`,
      env,
      version: env === 'staging' ? 'v3.4.1-rc4' : 'v3.4.1',
      region: env === 'staging' ? 'cn-north-1' : 'cn-east-1',
      status: 'queued',
      startedAt: 'now',
      duration: '-'
    }
    setDeploys((prev) => [next, ...prev])
  }

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-200">
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Deployment Hub</h2>
          <p className="text-xs text-slate-500 mt-1">Manage releases, rollouts, and environment health.</p>
        </div>

        <div className="p-4 space-y-3 border-b border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase">Environment</div>
          <div className="flex gap-2">
            <button
              onClick={() => setEnv('staging')}
              className={
                'flex-1 px-3 py-2 rounded border text-sm ' +
                (env === 'staging'
                  ? 'bg-brand-900/10 border-brand-500/30 text-brand-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-brand-500')
              }
            >
              Staging
            </button>
            <button
              onClick={() => setEnv('production')}
              className={
                'flex-1 px-3 py-2 rounded border text-sm ' +
                (env === 'production'
                  ? 'bg-brand-900/10 border-brand-500/30 text-brand-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-brand-500')
              }
            >
              Production
            </button>
          </div>
          <button
            onClick={triggerDeploy}
            className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
          >
            Trigger Deploy
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase">Environment Health</div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>API Availability</span>
              <span className="text-emerald-400">99.98%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[95%]" />
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-400 mb-1">
              <span>Rollback Window</span>
              <span className="text-slate-200 font-mono">30m</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-[60%]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Deployments</h1>
            <p className="text-sm text-slate-500 mt-1">Showing {env} history</p>
          </div>
          <div className="text-xs text-slate-500">Evidence Chain: enabled</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Version</th>
                  <th className="px-6 py-3">Region</th>
                  <th className="px-6 py-3">Started</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">{pill(d.status)}</td>
                    <td className="px-6 py-4 text-sm text-white font-mono">{d.version}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{d.region}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{d.startedAt}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{d.duration}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">{d.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
