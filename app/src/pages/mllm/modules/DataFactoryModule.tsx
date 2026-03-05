import { useMemo, useState } from 'react'

type Dataset = {
  id: string
  name: string
  size: string
  samples: number
  updatedAt: string
  status: 'ready' | 'processing' | 'failed'
}

const initialDatasets: Dataset[] = [
  { id: 'ds-001', name: 'Urban-Day-ODD', size: '128 GB', samples: 120340, updatedAt: '2026-03-02', status: 'ready' },
  { id: 'ds-002', name: 'Night-Rain-LongTail', size: '76 GB', samples: 45210, updatedAt: '2026-03-01', status: 'processing' },
  { id: 'ds-003', name: 'Construction-Zones', size: '44 GB', samples: 18400, updatedAt: '2026-02-26', status: 'ready' },
  { id: 'ds-004', name: 'Adversarial-Attacks', size: '12 GB', samples: 6200, updatedAt: '2026-02-20', status: 'failed' }
]

export function DataFactoryModule() {
  const [datasets, setDatasets] = useState<Dataset[]>(initialDatasets)
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return datasets
    return datasets.filter((d) => d.name.toLowerCase().includes(s) || d.id.toLowerCase().includes(s))
  }, [datasets, q])

  const pill = (s: Dataset['status']) => {
    const cls =
      s === 'ready'
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : s === 'processing'
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    return <span className={'text-xs px-2 py-0.5 rounded-full border ' + cls}>{s}</span>
  }

  const addMock = () => {
    const next: Dataset = {
      id: `ds-${String(datasets.length + 1).padStart(3, '0')}`,
      name: `New-Dataset-${datasets.length + 1}`,
      size: '1 GB',
      samples: 1000,
      updatedAt: new Date().toISOString().slice(0, 10),
      status: 'processing'
    }
    setDatasets((prev) => [next, ...prev])
  }

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-200">
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Data Factory</h2>
          <p className="text-xs text-slate-500 mt-1">Prepare, label, clean and version datasets.</p>
        </div>

        <div className="p-4 space-y-3 border-b border-slate-800">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search datasets..."
            className="w-full bg-slate-800 border border-slate-700 rounded text-sm px-3 py-2 focus:outline-none focus:border-brand-500 text-slate-200"
          />
          <button
            onClick={addMock}
            className="w-full flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded text-sm font-medium transition-colors"
          >
            + New Dataset
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase">Pipelines</div>
          <div className="space-y-2">
            {[
              { name: 'Ingestion', desc: 'Upload & decode raw logs' },
              { name: 'Labeling', desc: 'Human-in-the-loop annotation' },
              { name: 'Cleaning', desc: 'Dedup & quality filters' },
              { name: 'Synthesis', desc: 'Generate edge-case data' }
            ].map((p) => (
              <div key={p.name} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="text-xs text-slate-500 mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Datasets</h1>
            <p className="text-sm text-slate-500 mt-1">{filtered.length} items</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 hover:border-brand-500">
              Import Manifest
            </button>
            <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 hover:border-brand-500">
              Export Index
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Size</th>
                  <th className="px-6 py-3">Samples</th>
                  <th className="px-6 py-3">Updated</th>
                  <th className="px-6 py-3">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">{pill(d.status)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{d.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300 font-mono">{d.size}</td>
                    <td className="px-6 py-4 text-sm text-slate-300 font-mono">{d.samples.toLocaleString('en-US')}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{d.updatedAt}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">{d.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm font-bold text-white">Labeling Queue</div>
            <div className="mt-3 space-y-2">
              {[
                { name: 'VRU bounding boxes', value: 1240 },
                { name: 'Traffic light states', value: 560 },
                { name: 'Lane topology', value: 220 }
              ].map((x) => (
                <div key={x.name} className="flex items-center justify-between text-sm text-slate-300">
                  <span>{x.name}</span>
                  <span className="font-mono text-slate-200">{x.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm font-bold text-white">Quality Gates</div>
            <div className="mt-3 space-y-3">
              {[
                { name: 'Schema validation', rate: 98 },
                { name: 'Deduplication', rate: 92 },
                { name: 'Coverage balance', rate: 85 }
              ].map((g) => (
                <div key={g.name}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{g.name}</span>
                    <span className="font-mono text-slate-200">{g.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-600 h-full" style={{ width: `${g.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

