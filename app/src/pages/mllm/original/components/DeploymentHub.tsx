import React from 'react'
import {
  ArrowRight,
  Cloud,
  Cpu,
  Download,
  FileCode,
  HardDrive,
  History,
  MonitorPlay,
  Package,
  Radio,
  ShieldAlert,
  Smartphone
} from 'lucide-react'

export const DeploymentHub: React.FC = () => {
  return (
    <div className="h-full w-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Deployment Hub</h1>
            <p className="text-slate-400">Generate, validate, and export release artifacts for vehicle and cloud environments.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors">
              <History className="h-4 w-4" /> Release History
            </button>
          </div>
        </div>

        <div
          className="border rounded-2xl p-6 flex items-center justify-between"
          style={{
            borderColor: 'rgba(95, 2, 107, 0.35)',
            background:
              'linear-gradient(90deg, rgba(95, 2, 107, 0.08) 0%, rgba(252, 248, 242, 1) 40%, rgba(255, 255, 255, 1) 100%)'
          }}
        >
          <div>
            <span className="text-brand-400 text-xs font-bold uppercase tracking-widest mb-1 block">Ready for Release</span>
            <h2 className="text-2xl font-bold text-white">
              v3.4.1-rc2 <span className="text-slate-500 font-normal text-lg">/ stable-candidate</span>
            </h2>
            <div className="flex gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Cpu className="h-4 w-4" /> Target: Orin-X (INT8)
              </span>
              <span className="flex items-center gap-1">
                SHA: <span className="font-mono">7d2a9f</span>
              </span>
            </div>
          </div>
          <button className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg shadow-lg shadow-brand-500/20 transition-all transform hover:scale-105">
            Generate Release
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="h-24 w-24 text-blue-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Model Artifact</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
              Quantized model weights with integrated fallback logic and redundancy layers.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-slate-500 font-mono">
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Format</span> <span className="text-slate-300">ONNX / TensorRT</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Precision</span> <span className="text-slate-300">INT8</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Size</span> <span className="text-slate-300">1.2 GB</span>
              </li>
            </ul>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm border border-slate-700">
                Config Gray Scale
              </button>
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded border border-slate-700">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileCode className="h-24 w-24 text-purple-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                <FileCode className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Prompt Package</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
              Structured system prompts, few-shot examples, and rule-based safety overrides.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-slate-500 font-mono">
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Templates</span> <span className="text-slate-300">14 Active</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Context</span> <span className="text-slate-300">4k Tokens</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Strategy</span> <span className="text-slate-300">CoT Enabled</span>
              </li>
            </ul>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm border border-slate-700">
                View Params
              </button>
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded border border-slate-700">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Cloud className="h-24 w-24 text-emerald-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Cloud className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Deploy Package</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
              Unified API container with metadata, vehicle adaptation layer, and health checks.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-slate-500 font-mono">
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Target</span> <span className="text-slate-300">vLLM / LMDeploy</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>API Ver</span> <span className="text-slate-300">v3.0.0</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Checksum</span> <span className="text-emerald-500">Verified</span>
              </li>
            </ul>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm border border-slate-700">
                Deployment Manifest
              </button>
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded border border-slate-700">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <MonitorPlay className="h-24 w-24 text-orange-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-500/10 rounded-lg text-orange-400">
                <MonitorPlay className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Simulation Sandbox</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
              Pre-configured container with high-fidelity sensor models and scenario playlist for VIL/HIL.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-slate-500 font-mono">
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Engine</span> <span className="text-slate-300">Carla / Unigine</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Scenarios</span> <span className="text-slate-300">142 Critical</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Physics</span> <span className="text-orange-500">Rigid Body</span>
              </li>
            </ul>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm border border-slate-700">
                Scenario Config
              </button>
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded border border-slate-700">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Radio className="h-24 w-24 text-cyan-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400">
                <Radio className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Fleet OTA Bundle</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
              Delta-compressed binary package for fleet-wide updates with A/B testing support.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-slate-500 font-mono">
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Compression</span> <span className="text-slate-300">Bsdiff (32%)</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Signature</span> <span className="text-slate-300">RSA-4096</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Rollback</span> <span className="text-cyan-500">Atomic</span>
              </li>
            </ul>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm border border-slate-700">
                Canary Policy
              </button>
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded border border-slate-700">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-600 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldAlert className="h-24 w-24 text-rose-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Compliance Dossier</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
              Comprehensive evidence report including ISO 26262 ASIL-D and SOTIF analysis.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-slate-500 font-mono">
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Standard</span> <span className="text-slate-300">ISO 26262</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>Coverage</span> <span className="text-slate-300">100% Trace</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-1">
                <span>SOTIF</span> <span className="text-rose-500">Pass</span>
              </li>
            </ul>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm border border-slate-700">
                Audit Trail
              </button>
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded border border-slate-700">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
