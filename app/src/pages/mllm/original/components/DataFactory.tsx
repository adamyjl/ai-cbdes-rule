import React, { useState } from 'react'
import { PUBLIC_DATASETS, PROPRIETARY_DATASETS } from '../constants'
import {
  Cloud,
  Database,
  Download,
  FileText,
  Filter,
  HardDrive,
  Image as ImageIcon,
  Lock,
  Plus
} from 'lucide-react'

export const DataFactory: React.FC<{ pageTitle?: string }> = (props) => {
  const [activeTab, setActiveTab] = useState<'public' | 'proprietary'>('public')

  const datasets = activeTab === 'public' ? PUBLIC_DATASETS : PROPRIETARY_DATASETS

  return (
    <div className="h-full w-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{props.pageTitle ?? 'Data Factory'}</h1>
            <p className="text-slate-400">Manage, curate, and analyze autonomous driving datasets.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg shadow-lg shadow-brand-500/20 transition-all mllm-on-dark">
              <Plus className="h-4 w-4" /> Import Dataset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">5.8 PB</div>
              <div className="text-xs text-slate-500">Total Storage</div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">42.5 M</div>
              <div className="text-xs text-slate-500">Annotated Frames</div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">12.4 k</div>
              <div className="text-xs text-slate-500">Hours of Driving</div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">85%</div>
              <div className="text-xs text-slate-500">Cluster Utilization</div>
            </div>
          </div>
        </div>

        <div className="flex gap-8 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('public')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'public' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4" /> Public Datasets
            </div>
            {activeTab === 'public' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"></div>}
          </button>
          <button
            onClick={() => setActiveTab('proprietary')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'proprietary' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Proprietary Datasets
            </div>
            {activeTab === 'proprietary' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"></div>}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl overflow-hidden transition-all hover:shadow-xl hover:shadow-black/50"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`p-2 rounded-lg ${
                      activeTab === 'public' ? 'bg-slate-800 text-slate-300' : 'bg-brand-900/20 text-brand-400'
                    }`}
                  >
                    {activeTab === 'public' ? <Cloud className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {ds.type}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-400 transition-colors">{ds.name}</h3>
                <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10">{ds.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm text-slate-300 border-t border-slate-800 pt-4 mb-6">
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">Size</span>
                    <span className="font-mono">{ds.size}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">Frames / Content</span>
                    <span className="font-mono">{ds.images}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors">
                    Explore
                  </button>
                  <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {activeTab === 'proprietary' && (
                <div className="h-1 w-full bg-slate-950">
                  <div className="h-full bg-brand-500/50 w-2/3"></div>
                </div>
              )}
            </div>
          ))}

          <div className="bg-slate-900/50 border border-dashed border-slate-800 hover:border-slate-600 rounded-xl flex flex-col items-center justify-center p-6 text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all cursor-pointer min-h-[300px]">
            <Plus className="h-12 w-12 mb-4 opacity-50" />
            <span className="font-medium">Connect New Source</span>
          </div>
        </div>
      </div>
    </div>
  )
}
