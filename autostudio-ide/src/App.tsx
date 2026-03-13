/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import TopBar from './components/Layout/TopBar';
import Toolbar from './components/Layout/Toolbar';
import Workspace, { PipelineStep } from './components/Layout/Workspace';
import CodeManagementPanel from './components/Layout/CodeManagementPanel';
import ReuseModulePanel from './components/Layout/ReuseModulePanel';
import { DiffOverlay, loadDiffSnapshot, saveDiffSnapshot, type DiffSnapshot } from './components/DiffOverlay';
import { useEffect, useState } from 'react';
import {
  gateGetJob,
  gateStart,
  healthPython,
  orchestratorGenerate,
  ragGetFunction,
  ragListIndexedModules,
  ragRunTest,
  ragScan,
  ragUpsertModule,
  releaseModulesUpsert,
  releaseRagIndex,
  taskAnalyze
} from './services/backend';

type ProjectMeta = {
  id: string;
  name: string;
  rootDir: string;
  prompt: string;
  updatedAt: number;
};

const PROJECTS_KEY = 'gaasd:projects:v1';
const CURRENT_PROJECT_KEY = 'gaasd:projects:current:v1';
const GENERATED_FUNCTIONS_KEY_PREFIX = 'gaasd:generated-functions:v1:';
const GENERATED_MODULES_KEY_PREFIX = 'gaasd:generated-modules:v1:';

function loadJsonFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [] as ProjectMeta[];
    return arr
      .map((x: any) => ({
        id: String(x?.id || ''),
        name: String(x?.name || ''),
        rootDir: String(x?.rootDir || ''),
        prompt: String(x?.prompt || ''),
        updatedAt: Number(x?.updatedAt || 0)
      }))
      .filter((x: ProjectMeta) => x.id && x.name);
  } catch {
    return [] as ProjectMeta[];
  }
}

function extractCnNameFromDoc(docZh: string) {
  const t = String(docZh || '');
  const m = t.match(/@cn_name\s+([^\n\r]+)/);
  if (m && m[1]) return String(m[1]).trim();
  const m2 = t.match(/\*\s*@cn_name\s+([^\n\r]+)/);
  if (m2 && m2[1]) return String(m2[1]).trim();
  const first = t
    .split(/\r?\n/)
    .map((x) => x.trim().replace(/^\*+\s*/, '').trim())
    .filter(Boolean)[0];
  return first || '';
}

function deriveDisplayNameFromPrompt(p: string) {
  const s = String(p || '').trim();
  if (!s) return '';
  let x = s;
  x = x.replace(/[，。；、,.]/g, ' ');
  x = x.replace(/请|根据|当前|工程|内容|生成|实现|一个|用于|函数|模块/g, ' ');
  x = x.replace(/\s+/g, ' ').trim();
  x = x.replace(/^[的\s]+/g, '').replace(/[的\s]+$/g, '').trim();
  if (!x) return s.slice(0, 12);
  return x.slice(0, 12);
}

function sanitizeCnDisplayName(v: string) {
  let s = String(v || '').trim();
  s = s.replace(/[“”"'《》【】\[\]（）()]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/^[的\s]+/g, '').replace(/[的\s]+$/g, '').trim();
  return s;
}

function parseMarkdownCodeFiles(raw: string) {
  const s = String(raw || '').replace(/\r\n/g, '\n');
  const lines = s.split('\n');
  const files: Array<{ name: string; lang: string; content: string }> = [];

  const stripCommentPrefix = (line: string) => {
    const t = String(line || '');
    return t.replace(/^\s*\/\/\s*/, '');
  };

  const isLikelyFilename = (t: string) => {
    const x = String(t || '').trim();
    if (!x) return false;
    if (x.length > 160) return false;
    if (!/\.(h|hpp|hh|hxx|c|cc|cpp|cxx)\b/i.test(x)) return false;
    return true;
  };

  const findFilenameNearLine = (idx: number) => {
    for (let k = idx; k >= 0 && k >= idx - 6; k -= 1) {
      const t = stripCommentPrefix(String(lines[k] || '')).trim();
      if (!t) continue;
      const m1 = t.match(/^#{1,6}\s*([^\s].*\.(?:h|hpp|hh|hxx|c|cc|cpp|cxx))\s*$/i);
      if (m1 && m1[1] && isLikelyFilename(m1[1])) return String(m1[1]).trim();
      const m2 = t.match(/^(?:File\s*:\s*|文件\s*[:：]\s*)([^\s].*\.(?:h|hpp|hh|hxx|c|cc|cpp|cxx))\s*$/i);
      if (m2 && m2[1] && isLikelyFilename(m2[1])) return String(m2[1]).trim();
      const m3 = t.match(/^([^\s].*\.(?:h|hpp|hh|hxx|c|cc|cpp|cxx))\s*$/i);
      if (m3 && m3[1] && isLikelyFilename(m3[1])) return String(m3[1]).trim();
    }
    return '';
  };

  const fenceStartRe = /^\s*(?:\/\/\s*)?```\s*([a-zA-Z0-9_+\-]*)\s*$/;
  for (let i = 0; i < lines.length; i += 1) {
    const m = String(lines[i] || '').match(fenceStartRe);
    if (!m) continue;
    const lang = String(m[1] || '').trim();
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      if (/^\s*(?:\/\/\s*)?```\s*$/.test(String(lines[j] || ''))) break;
    }
    if (j >= lines.length) break;
    const content = lines.slice(i + 1, j).join('\n').trimEnd();
    const filename = findFilenameNearLine(i - 1);
    if (filename) files.push({ name: filename, lang, content });
    i = j;
  }
  return files;
}

function buildMultiFileMarkdown(files: Array<{ name: string; lang?: string; content: string }>) {
  return files
    .map((f) => {
      const name = String(f.name || '').trim();
      const lang = String(f.lang || '').trim() || 'cpp';
      const content = String(f.content || '').replace(/\r\n/g, '\n').trimEnd();
      return `//### ${name}\n\n//\`\`\`${lang}\n${content}\n//\`\`\`\n\n`;
    })
    .join('')
    .trim();
}

function normalizeGeneratedCodePayload(raw: string) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const files = parseMarkdownCodeFiles(s);
  if (files.length) return buildMultiFileMarkdown(files);
  return s;
}

function pickCppFromPayload(raw: string) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const files = parseMarkdownCodeFiles(s);
  const cpp = files.find((f) => /\.(cpp|cc|cxx|c)\b/i.test(String(f.name || '')));
  if (cpp) return String(cpp.content || '').trim();
  return s;
}

function ensureHeaderAndCpp(raw: string, opts: { baseName: string }) {
  const s = String(raw || '').trim();
  const base = String(opts.baseName || '').trim() || 'gen';
  const files = parseMarkdownCodeFiles(s);
  if (!files.length) return s;

  const hasCpp = files.some((f) => /\.(cpp|cc|cxx|c)\b/i.test(String(f.name || '')));
  const hasH = files.some((f) => /\.(h|hpp|hh|hxx)\b/i.test(String(f.name || '')));
  if (hasCpp || !hasH) return s;

  const header = files.find((f) => /\.(h|hpp|hh|hxx)\b/i.test(String(f.name || '')));
  if (!header) return s;
  const headerText = String(header.content || '');
  const fnName = base;

  const m = headerText.match(new RegExp(`\\b${fnName}\\s*\\([^)]*\\)\\s*\\{`, 'm'));
  if (!m || m.index == null) return s;
  const start = m.index;
  const braceStart = headerText.indexOf('{', start);
  if (braceStart < 0) return s;
  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < headerText.length; i += 1) {
    const ch = headerText[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return s;

  const defBlock = headerText.slice(start, end).trim();
  const declHead = defBlock.split('{')[0].trim().replace(/\s+/g, ' ');
  const decl = `${declHead};`;
  const newHeaderContent = (headerText.slice(0, start) + decl + headerText.slice(end)).trimEnd();
  const headerName = `${base}.h`;
  const srcContent = `#include "${headerName}"\n\n${defBlock}\n`;

  return buildMultiFileMarkdown([
    { name: headerName, lang: 'cpp', content: newHeaderContent },
    { name: `${base}.cpp`, lang: 'cpp', content: srcContent.trimEnd() }
  ]);
}

function commentMarkdownMarkers(text: string) {
  const s = String(text || '').replace(/\r\n/g, '\n');
  if (!s.trim()) return '';
  const lines = s.split('\n');
  const out = lines.map((line) => {
    const t = String(line || '');
    const trimmed = t.trimStart();
    if (trimmed.startsWith('```') || trimmed.startsWith('###')) {
      const already = trimmed.startsWith('//');
      if (already) return t;
      return `//${t}`;
    }
    return t;
  });
  return out.join('\n');
}

function extractCnNameFromCode(code: string) {
  const s = String(code || '');
  const m = s.match(/@cn_name\s+([^\n\r]+)/);
  if (m && m[1]) return String(m[1]).trim();
  const m2 = s.match(/\*\s*@cn_name\s+([^\n\r]+)/);
  if (m2 && m2[1]) return String(m2[1]).trim();
  return '';
}

function parseFunctionBlocksFromCode(raw: string) {
  const s = String(raw || '').replace(/\r\n/g, '\n');
  const re = /\/\*\*[\s\S]*?\*\/\s*(?:static\s+)?[^\n;{}]+\([^;{}]*\)\s*\{/g;
  const blocks: Array<{ start: number; end: number; text: string; name: string; cn_name: string; signature: string }> = [];
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(s))) {
    const start = m.index;
    const braceStart = s.indexOf('{', start);
    if (braceStart < 0) continue;
    let depth = 0;
    let i = braceStart;
    for (; i < s.length; i += 1) {
      const ch = s[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
    }
    const end = Math.min(i, s.length);
    const text = s.slice(start, end).trim();
    const comment = (text.match(/\/\*\*[\s\S]*?\*\//) || [''])[0];
    const cn = sanitizeCnDisplayName(extractCnNameFromDoc(comment) || extractCnNameFromCode(comment) || '');
    const afterComment = text.replace(/^[\s\S]*?\*\/\s*/, '');
    const sigPart = afterComment.split('{')[0] || '';
    const signature = sigPart.replace(/\s+/g, ' ').trim();
    const nm = (signature.match(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/) || [])[1] || '';
    blocks.push({ start, end, text, name: nm, cn_name: cn, signature, });
  }
  if (!blocks.length) return { preamble: s.trim(), blocks: [] as typeof blocks };
  const preamble = s.slice(0, blocks[0].start).trim();
  return { preamble, blocks };
}

function validateGeneratedFunctionCode(code: string) {
  const s = String(code || '').trim();
  if (!s) return { ok: false, reason: 'empty_code' };
  const low = s.toLowerCase();
  if (/(^|\n)\s*int\s+main\s*\(/i.test(s) || /(^|\n)\s*void\s+main\s*\(/i.test(s)) return { ok: false, reason: 'contains_main' };
  if (/\btemplate\b/i.test(s) || /\bclass\b/i.test(s)) return { ok: false, reason: 'uses_class_or_template' };
  if (/\bgoto\b/i.test(s)) return { ok: false, reason: 'uses_goto' };
  if (!/@brief\b/i.test(s) || !/@cn_name\b/i.test(s) || !/@en_name\b/i.test(s)) return { ok: false, reason: 'missing_doxygen_fields' };
  const fns = Array.from(s.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/g)).map((m) => String(m[1] || ''));
  for (const name of fns) {
    if (name && /[_\.]/.test(name)) return { ok: false, reason: 'invalid_function_name' };
  }
  if (low.includes('hello, world')) return { ok: false, reason: 'hello_world_placeholder' };
  return { ok: true, reason: '' };
}

function ensureDoxygenFieldsInFunctionCode(code: string, p: { cnName: string; enName: string }) {
  const s = String(code || '').replace(/\r\n/g, '\n');
  if (!s.trim()) return s;
  const cn = sanitizeCnDisplayName(String(p.cnName || '').trim()) || '新函数';
  const en = String(p.enName || '').trim() || 'newFunction';

  const hasBrief = /@brief\b/i.test(s);
  const hasCn = /@cn_name\b/i.test(s);
  const hasEn = /@en_name\b/i.test(s);
  if (hasBrief && hasCn && hasEn) return s;

  const injectLines = (comment: string) => {
    const lines = comment.replace(/\r\n/g, '\n').split('\n');
    const out: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/\*\/\s*$/.test(line)) {
        if (!hasBrief) out.push(` * @brief ${cn}`);
        if (!hasEn) out.push(` * @en_name ${en}`);
        if (!hasCn) out.push(` * @cn_name ${cn}`);
        out.push(line);
        out.push(...lines.slice(i + 1));
        return out.join('\n');
      }
      out.push(line);
    }
    return comment;
  };

  const doxygenRe = /\/\*\*[\s\S]*?\*\//;
  const m = s.match(doxygenRe);
  if (m && m.index != null) {
    const patched = injectLines(String(m[0]));
    return s.slice(0, m.index) + patched + s.slice(m.index + String(m[0]).length);
  }

  const funcRe = /(^|\n)\s*(?:static\s+)?[^\n;{}]+\([^;{}]*\)\s*\{/;
  const fm = s.match(funcRe);
  if (fm && fm.index != null) {
    const idx = fm.index + (fm[1] ? fm[1].length : 0);
    const comment = ['/**', ` * @brief ${cn}`, ` * @en_name ${en}`, ` * @cn_name ${cn}`, ' */', ''].join('\n');
    return s.slice(0, idx) + comment + s.slice(idx);
  }

  return s;
}

function loadGeneratedFunctions(projectId: string) {
  return loadJsonFromStorage<Record<string, { display_name: string; signature: string; module: string; doc_zh: string; doc_en?: string; code: string }>>(
    `${GENERATED_FUNCTIONS_KEY_PREFIX}${projectId}`,
    {}
  );
}

function loadGeneratedModules(projectId: string) {
  return loadJsonFromStorage<Record<string, { module_key: string; display_name: string; doc_zh: string; nodes: any[]; edges: any[] }>>(
    `${GENERATED_MODULES_KEY_PREFIX}${projectId}`,
    {}
  );
}

export default function App() {
  const [projects, setProjects] = useState<ProjectMeta[]>(() => loadProjects());
  const [projectId, setProjectId] = useState<string>(() => {
    const arr = loadProjects();
    const cur = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (cur && arr.some((p) => p.id === cur)) return cur;
    if (arr.length) return arr[0].id;
    return `prj_${Date.now()}`;
  });
  const [projectName, setProjectName] = useState<string>(() => {
    const arr = loadProjects();
    const cur = localStorage.getItem(CURRENT_PROJECT_KEY);
    const hit = arr.find((p) => p.id === cur) || arr[0];
    return hit?.name || '默认工程';
  });
  const [rootDir, setRootDir] = useState('data\\THICV-Pilot_master');
  const [prompt, setPrompt] = useState('请根据当前需求生成可编译的 C++ 代码，并给出关键实现要点。');
  const [generatedCode, setGeneratedCode] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [backendOk, setBackendOk] = useState(false);
  const [runtimeInjectModuleKey, setRuntimeInjectModuleKey] = useState<string | null>(null);
  const [runtimeInjectSignal, setRuntimeInjectSignal] = useState(0);
  const [newModelPayload, setNewModelPayload] = useState<{ moduleKey: string; displayName: string } | null>(null);
  const [newModelSignal, setNewModelSignal] = useState(0);
  const [aiEditStartSignal, setAiEditStartSignal] = useState(0);
  const [aiEditApplySignal, setAiEditApplySignal] = useState(0);
  const [aiEditFailSignal, setAiEditFailSignal] = useState(0);
  const [aiEditSummary, setAiEditSummary] = useState('');
  const [scanManagerOpen, setScanManagerOpen] = useState(false);
  const [reuseManagerOpen, setReuseManagerOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffSnapshot, setDiffSnapshot] = useState<DiffSnapshot | null>(() => loadDiffSnapshot());

  const openDiffOverlay = (s?: DiffSnapshot | null) => {
    const next = s ?? loadDiffSnapshot();
    setDiffSnapshot(next);
    setDiffOpen(true);
  };

  const commitDiffSnapshot = (p: { oldCode: string; newCode: string; source: string }) => {
    const s: DiffSnapshot = { ts: Date.now(), source: p.source, old_code: p.oldCode, new_code: p.newCode };
    saveDiffSnapshot(s);
    setDiffSnapshot(s);
    setDiffOpen(true);
  };
  const [injectReusePayload, setInjectReusePayload] = useState<{ functions: any[]; modules: any[] } | null>(null);
  const [injectReuseSignal, setInjectReuseSignal] = useState(0);
  const [saveCanvasSignal, setSaveCanvasSignal] = useState(0);
  const [taskTargetModule, setTaskTargetModule] = useState('');
  const [taskIntent, setTaskIntent] = useState('');
  const [taskFeatureDescription, setTaskFeatureDescription] = useState('');
  const [taskInputSpec, setTaskInputSpec] = useState('');
  const [taskOutputSpec, setTaskOutputSpec] = useState('');
  const [taskGenerationQuestion, setTaskGenerationQuestion] = useState('');
  const [taskAnalysisResult, setTaskAnalysisResult] = useState('');
  const [taskAnalyzeBusy, setTaskAnalyzeBusy] = useState(false);
  const [qaRisk, setQaRisk] = useState('');
  const [qaAmbiguity, setQaAmbiguity] = useState('');
  const [qaMissing, setQaMissing] = useState('');
  const [qaPrefill, setQaPrefill] = useState<{
    goal: string;
    constraints: string;
    subtasks: string;
    risk_items: string[];
    missing_items: string[];
  } | null>(null);
  const [qaBusy, setQaBusy] = useState(false);
  const [generationMode, setGenerationMode] = useState<'canvas' | 'analyze' | 'new_function' | 'new_module' | 'reuse'>('canvas');
  const [qaAutoOpenSignal, setQaAutoOpenSignal] = useState(0);
  const [qaCanvasCodeContext, setQaCanvasCodeContext] = useState('');
  const [generatedFunctions, setGeneratedFunctions] = useState<Record<string, { display_name: string; signature: string; module: string; doc_zh: string; doc_en?: string; code: string }>>(
    {}
  );
  const [generatedModules, setGeneratedModules] = useState<Record<string, { module_key: string; display_name: string; doc_zh: string; nodes: any[]; edges: any[] }>>(
    {}
  );

  const upsertGeneratedFunction = (fn: {
    function_id: string;
    display_name: string;
    signature: string;
    module: string;
    doc_zh: string;
    doc_en?: string;
    code: string;
  }) => {
    const fid = String(fn.function_id || '').trim();
    if (!fid) return;
    setGeneratedFunctions((prev) => ({
      ...(prev || {}),
      [fid]: {
        display_name: String(fn.display_name || fid),
        signature: String(fn.signature || ''),
        module: String(fn.module || 'common'),
        doc_zh: String(fn.doc_zh || ''),
        doc_en: String(fn.doc_en || ''),
        code: String(fn.code || '')
      }
    }));
  };

  useEffect(() => {
    if (!projectId) return;
    setGeneratedFunctions(loadGeneratedFunctions(projectId));
    setGeneratedModules(loadGeneratedModules(projectId));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    try {
      localStorage.setItem(`${GENERATED_FUNCTIONS_KEY_PREFIX}${projectId}`, JSON.stringify(generatedFunctions || {}));
    } catch {
    }
  }, [projectId, generatedFunctions]);

  useEffect(() => {
    if (!projectId) return;
    try {
      localStorage.setItem(`${GENERATED_MODULES_KEY_PREFIX}${projectId}`, JSON.stringify(generatedModules || {}));
    } catch {
    }
  }, [projectId, generatedModules]);
  const [injectFunctionPayload, setInjectFunctionPayload] = useState<{ functionId: string; displayName: string; signature?: string; module?: string } | null>(null);
  const [injectFunctionSignal, setInjectFunctionSignal] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [terminalBusy, setTerminalBusy] = useState(false);
  const [graphSnapshot, setGraphSnapshot] = useState<{ canvases: any[]; nodes: any[]; edges: any[]; activeCanvasId: string }>(() => ({
    canvases: [],
    nodes: [],
    edges: [],
    activeCanvasId: '1'
  }));
  const [importGraphPayload, setImportGraphPayload] = useState<any | null>(null);
  const [importGraphSignal, setImportGraphSignal] = useState(0);

  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { id: 'compile', label: '编译检测', status: 'pending' },
    { id: 'static', label: '静态检测', status: 'pending' },
    { id: 'unit', label: '单元检测', status: 'pending' },
    { id: 'coverage', label: '覆盖度检测', status: 'pending' }
  ]);

  const appendLog = (line: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${ts}] ${line}`]);
  };

  const doSaveProject = () => {
    const next: ProjectMeta = {
      id: projectId,
      name: projectName,
      rootDir,
      prompt,
      updatedAt: Date.now()
    };
    setProjects((prev) => {
      const i = prev.findIndex((p) => p.id === next.id);
      const arr = i >= 0 ? [...prev.slice(0, i), next, ...prev.slice(i + 1)] : [next, ...prev];
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(arr));
      localStorage.setItem(CURRENT_PROJECT_KEY, next.id);
      return arr;
    });
    appendLog(`工程已保存：${projectName}`);
    setSaveCanvasSignal((v) => v + 1);
    appendLog('画布已保存');
  };

  const doExportCanvasFile = async () => {
    doSaveProject();
    const userName = (window.prompt('请输入工程文件用户名（用于命名）', projectName) || '').trim();
    if (!userName) return;

    const activeCanvasId = String(graphSnapshot.activeCanvasId || '1');
    const canvasMeta = (Array.isArray(graphSnapshot.canvases) ? graphSnapshot.canvases : []).find((c: any) => String(c?.id || '') === activeCanvasId);
    const canvasName = String(canvasMeta?.name || 'canvas').trim() || 'canvas';
    const nodes = (Array.isArray(graphSnapshot.nodes) ? graphSnapshot.nodes : []).filter((n: any) => String(n?.canvasId || '') === activeCanvasId);
    const edges = (Array.isArray(graphSnapshot.edges) ? graphSnapshot.edges : []).filter((e: any) => String(e?.canvasId || '') === activeCanvasId);

    const data = {
      version: 1,
      meta: {
        userName,
        projectId,
        projectName,
        savedAt: new Date().toISOString()
      },
      rootDir,
      canvas: {
        id: activeCanvasId,
        name: canvasName,
        nodes,
        edges
      }
    };

    const text = JSON.stringify(data, null, 2);
    const safeBase = `${userName}_${canvasName}`.replace(/[\\/:*?"<>|]+/g, '_');
    const suggestedName = `${safeBase}.json`;

    const picker = (window as any).showSaveFilePicker as undefined | ((opts: any) => Promise<any>);
    try {
      if (picker) {
        const handle = await picker({
          suggestedName,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        appendLog(`工程文件已导出：${suggestedName}`);
        return;
      }
    } catch (e) {
      appendLog(`保存对话框失败，改用下载：${e instanceof Error ? e.message : 'unknown'}`);
    }

    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
    appendLog(`工程文件已下载：${suggestedName}`);
  };

  const doNewProject = () => {
    const name = (window.prompt('请输入新工程名称', `工程_${new Date().toLocaleDateString()}`) || '').trim();
    if (!name) return;
    const id = `prj_${Date.now()}`;
    setProjectId(id);
    setProjectName(name);
    setRootDir('data\\THICV-Pilot_master');
    setPrompt('请根据当前需求生成可编译的 C++ 代码，并给出关键实现要点。');
    setGeneratedCode('');
    setLogs([]);
    setPipelineSteps([
      { id: 'compile', label: '编译检测', status: 'pending' },
      { id: 'static', label: '静态检测', status: 'pending' },
      { id: 'unit', label: '单元检测', status: 'pending' },
      { id: 'coverage', label: '覆盖度检测', status: 'pending' }
    ]);
    setProjects((prev) => {
      const arr = [{ id, name, rootDir: 'data\\THICV-Pilot_master', prompt: '请根据当前需求生成可编译的 C++ 代码，并给出关键实现要点。', updatedAt: Date.now() }, ...prev];
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(arr));
      localStorage.setItem(CURRENT_PROJECT_KEY, id);
      return arr;
    });
    appendLog(`已新建工程：${name}`);
  };

  const doOpenProject = () => {
    const applyImportedProjectData = (data: any, fileName?: string) => {
      const version = Number(data?.version || 0);
      const canvas = data?.canvas;
      const nodes = canvas?.nodes;
      const edges = canvas?.edges;
      if (version !== 1 || !canvas || !Array.isArray(nodes) || !Array.isArray(edges)) {
        appendLog('导入失败：工程文件格式不正确（version/canvas/nodes/edges）');
        alert('导入失败：工程文件格式不正确（version/canvas/nodes/edges）');
        return false;
      }

      const canvasId = String(canvas?.id || `import_${Date.now()}`);
      const canvasName = String(canvas?.name || '导入画布');
      const fixedNodes = nodes.map((n: any) => ({ ...n, canvasId }));
      const fixedEdges = edges.map((e: any) => ({ ...e, canvasId }));
      setImportGraphPayload({ canvases: [{ id: canvasId, name: canvasName }], activeCanvasId: canvasId, nodes: fixedNodes, edges: fixedEdges });
      setImportGraphSignal((v) => v + 1);

      const importedRoot = String(data?.rootDir || '').trim();
      if (importedRoot) setRootDir(importedRoot);
      if (data?.meta?.projectId) setProjectId(String(data.meta.projectId));
      if (data?.meta?.projectName) setProjectName(String(data.meta.projectName));
      appendLog(`工程文件已导入：${String(fileName || 'unknown')}`);
      return true;
    };

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      let raw = '';
      try {
        raw = await f.text();
      } catch (e) {
        appendLog(`读取文件失败：${e instanceof Error ? e.message : 'unknown'}`);
        return;
      }
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        appendLog('导入失败：JSON 解析错误');
        alert('导入失败：JSON 解析错误');
        return;
      }

      applyImportedProjectData(data, f.name);
    };
    input.click();
  };

  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('selftestPanZoom') !== '1') return;
      console.info('[gaasd selftest] start');
      const sample = {
        version: 1,
        meta: {
          userName: '1',
          projectId: 'prj_1773109528887',
          projectName: '默认工程',
          savedAt: '2026-03-13T14:40:18.069Z'
        },
        rootDir: 'data\\THICV-Pilot_master',
        canvas: {
          id: 'a2zqt02hq',
          name: 'map0312_1',
          nodes: [
            {
              id: '3xsn8ikk',
              canvasId: 'a2zqt02hq',
              kind: 'function',
              status: 'clean',
              functionId:
                'cpp::C:\\srv\\ai-cbdes-rule\\app\\data\\THICV-Pilot_master\\Perception\\Camera\\DynamicObjectDetection\\DynamicObjectDetectionDL\\VehiclePedestrianCyclistDetection\\dependence\\smoke.hh::log::14-39',
              displayName: 'log',
              module: 'perception',
              signature: 'void log(Severity severity, const char *msg) noexcept {',
              inputsJson: '{}',
              outputsJson: '{}',
              x: 216.09375,
              y: 250
            }
          ],
          edges: []
        }
      };

      const importOk = (() => {
        const version = Number((sample as any)?.version || 0);
        const canvas = (sample as any)?.canvas;
        const nodes = canvas?.nodes;
        const edges = canvas?.edges;
        if (version !== 1 || !canvas || !Array.isArray(nodes) || !Array.isArray(edges)) return false;
        const canvasId = String(canvas?.id || `import_${Date.now()}`);
        const canvasName = String(canvas?.name || '导入画布');
        const fixedNodes = nodes.map((n: any) => ({ ...n, canvasId }));
        const fixedEdges = edges.map((e: any) => ({ ...e, canvasId }));
        setImportGraphPayload({ canvases: [{ id: canvasId, name: canvasName }], activeCanvasId: canvasId, nodes: fixedNodes, edges: fixedEdges });
        setImportGraphSignal((v) => v + 1);
        const importedRoot = String((sample as any)?.rootDir || '').trim();
        if (importedRoot) setRootDir(importedRoot);
        setProjectId(String((sample as any).meta.projectId));
        setProjectName(String((sample as any).meta.projectName));
        return true;
      })();

      if (!importOk) {
        console.error('[gaasd selftest] import failed');
        return;
      }

      window.setTimeout(() => {
        const area = document.querySelector('[data-testid="gaasd-canvas-area"]') as HTMLElement | null;
        const layer = document.querySelector('[data-testid="gaasd-viewport-layer"]') as HTMLElement | null;
        if (!area || !layer) {
          console.error('[gaasd selftest] missing elements', { area: !!area, layer: !!layer });
          return;
        }

        const before = String((layer as any).style?.transform || '');
        const r = area.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const rectInfo = `${Math.round(r.width)}x${Math.round(r.height)}`;

        let zoomViaClick = false;
        let hasZoomBtn = false;
        let afterClick = '';
        try {
          const btn = document.querySelector('button[title="放大（+）"]') as HTMLButtonElement | null;
          if (btn) {
            hasZoomBtn = true;
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            zoomViaClick = true;
            afterClick = String((layer as any).style?.transform || '');
          }
        } catch (e) {
          console.error('[gaasd selftest] click zoom dispatch failed', e);
        }

        let zoomViaWheel = false;
        try {
          area.dispatchEvent(
            new WheelEvent('wheel', {
              bubbles: true,
              cancelable: true,
              clientX: cx,
              clientY: cy,
              deltaY: -160
            })
          );
          zoomViaWheel = true;
        } catch (e) {
          console.error('[gaasd selftest] wheel dispatch failed', e);
        }

        try {
          area.dispatchEvent(
            new PointerEvent('pointerdown', {
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              buttons: 1,
              button: 0,
              clientX: cx,
              clientY: cy
            })
          );
          window.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              buttons: 1,
              button: 0,
              clientX: cx + 80,
              clientY: cy + 60
            })
          );
          window.dispatchEvent(
            new PointerEvent('pointerup', {
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              buttons: 0,
              button: 0,
              clientX: cx + 80,
              clientY: cy + 60
            })
          );
        } catch (e) {
          console.error('[gaasd selftest] pointer dispatch failed', e);
        }

        window.setTimeout(() => {
          const after = String((layer as any).style?.transform || '');
          const ok = Boolean(before && after && before !== after);
          const note = ok ? 'ok' : 'failed';
          const payload = {
            ok,
            before,
            after,
            note: `${note};rect=${rectInfo};hasZoomBtn=${hasZoomBtn ? 1 : 0};zoomViaClick=${zoomViaClick ? 1 : 0};zoomViaWheel=${zoomViaWheel ? 1 : 0};afterClick=${encodeURIComponent(afterClick)}`,
            at: new Date().toISOString()
          };
          if (ok) console.info('[gaasd selftest] pan/zoom OK', payload);
          else console.error('[gaasd selftest] pan/zoom FAILED', payload);
          try {
            void fetch('/py/debug/selftest/panzoom', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload)
            });
          } catch {
          }
        }, 200);
      }, 1200);
    } catch (e) {
      console.error('[gaasd selftest] unexpected error', e);
    }
  }, []);

  const runHealthCheck = async () => {
    setBusy(true);
    try {
      const r = await healthPython();
      setBackendOk(Boolean(r.ok));
      appendLog(`健康检查：${r.ok ? 'ok' : 'fail'}`);
    } catch (e) {
      setBackendOk(false);
      appendLog(`健康检查失败：${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  const runScan = async () => {
    setBusy(true);
    appendLog(`开始扫描目录：${rootDir}`);
    try {
      const r = await ragScan(rootDir);
      appendLog(`扫描完成：files=${r.files} functions=${r.functions}`);
    } catch (e) {
      appendLog(`扫描失败：${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  const runGenerate = async () => {
    void runGenerateByMode();
  };

  const extractFirstCppBlock = (text: string) => {
    const s = String(text || '').trim();
    if (!s) return '';
    const files = parseMarkdownCodeFiles(s);
    if (files.length) return buildMultiFileMarkdown(files);
    const m = s.match(/```(?:cpp|c\+\+|c)?\s*\n([\s\S]*?)\n```/i);
    if (m && m[0]) return commentMarkdownMarkers(String(m[0]).trim());
    return commentMarkdownMarkers(s);
  };

  const buildCanvasCodeContext = async () => {
    const fnIds: string[] = Array.from(
      new Set<string>(
        graphSnapshot.nodes
          .filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'))
          .map((n: any) => String(n.functionId))
      )
    );
    if (!fnIds.length) return '';
    const details = await Promise.all(
      fnIds.map((id) => {
        if (generatedFunctions[id]) return Promise.resolve({ function: generatedFunctions[id] } as any);
        return ragGetFunction(id).catch(() => null);
      })
    );
    const blocks = details
      .map((d: any, i) => {
        const id = fnIds[i];
        const local = generatedFunctions[id];
        const fn = d?.function || d || local;
        const name = String(fn?.display_name || fn?.name || id);
        const file = String((fn as any)?.file_path || '');
        const sig = String(fn?.signature || '');
        const code = String(fn?.code || '');
        const head = `===== ${name} (${id}) =====`;
        const meta = [file ? `file_path: ${file}` : '', sig ? `signature: ${sig}` : ''].filter(Boolean).join('\n');
        return [head, meta, code].filter(Boolean).join('\n');
      })
      .join('\n\n');
    return blocks;
  };

  const buildDirectReuseCpp = async () => {
    const nodeFn = new Map<string, string>();
    const fnNodes = graphSnapshot.nodes.filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'));
    for (const n of fnNodes) nodeFn.set(String(n.id), String(n.functionId));

    const nodeIds = Array.from(nodeFn.keys());
    if (!nodeIds.length) {
      return '#include <iostream>\n\nint main() {\n  return 0;\n}\n';
    }

    const edges = graphSnapshot.edges
      .filter((e: any) => nodeFn.has(String(e.from)) && nodeFn.has(String(e.to)))
      .map((e: any) => ({ from: String(e.from), to: String(e.to) }));

    const indeg = new Map<string, number>(nodeIds.map((id) => [id, 0] as [string, number]));
    const out = new Map<string, string[]>(nodeIds.map((id) => [id, []] as [string, string[]]));
    for (const e of edges) {
      out.get(e.from)!.push(e.to);
      indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    }
    const q = nodeIds.filter((id) => (indeg.get(id) || 0) === 0);
    q.sort();
    const order: string[] = [];
    while (q.length) {
      const id = q.shift()!;
      order.push(id);
      for (const to of out.get(id) || []) {
        indeg.set(to, (indeg.get(to) || 0) - 1);
        if ((indeg.get(to) || 0) === 0) {
          q.push(to);
          q.sort();
        }
      }
    }
    for (const id of nodeIds) if (!order.includes(id)) order.push(id);

    const fnIds = Array.from(new Set(order.map((id) => nodeFn.get(id)!).filter(Boolean)));
    const details = await Promise.all(
      fnIds.map((id) => {
        if (generatedFunctions[id]) return Promise.resolve({ function: generatedFunctions[id] } as any);
        return ragGetFunction(id).catch(() => null);
      })
    );
    const pieces: string[] = [];
    pieces.push('#include <iostream>');
    pieces.push('');
    pieces.push('int main() {');
    pieces.push('  return 0;');
    pieces.push('}');
    pieces.push('');
    for (let i = 0; i < details.length; i += 1) {
      const d: any = details[i];
      const fn = d?.function || d;
      const code = String(fn?.code || '').trim();
      if (!code) continue;
      pieces.push(code);
      pieces.push('');
    }
    return pieces.join('\n');
  };

  const buildCanvasGateStubCpp = () => {
    const fnNodes = graphSnapshot.nodes.filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'));
    const nodeFn = new Map<string, { functionId: string; displayName: string }>();
    for (const n of fnNodes) {
      nodeFn.set(String(n.id), { functionId: String(n.functionId), displayName: String(n.displayName || n.functionId) });
    }
    const nodeIds = Array.from(nodeFn.keys());
    const edges = graphSnapshot.edges
      .filter((e: any) => nodeFn.has(String(e.from)) && nodeFn.has(String(e.to)))
      .map((e: any) => ({ from: String(e.from), to: String(e.to) }));
    const indeg = new Map<string, number>(nodeIds.map((id) => [id, 0] as [string, number]));
    const out = new Map<string, string[]>(nodeIds.map((id) => [id, []] as [string, string[]]));
    for (const e of edges) {
      out.get(e.from)!.push(e.to);
      indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    }
    const q = nodeIds.filter((id) => (indeg.get(id) || 0) === 0);
    q.sort();
    const order: string[] = [];
    while (q.length) {
      const id = q.shift()!;
      order.push(id);
      for (const to of out.get(id) || []) {
        indeg.set(to, (indeg.get(to) || 0) - 1);
        if ((indeg.get(to) || 0) === 0) {
          q.push(to);
          q.sort();
        }
      }
    }
    for (const id of nodeIds) if (!order.includes(id)) order.push(id);

    const lines: string[] = [];
    lines.push('#include <iostream>');
    lines.push('#include <string>');
    lines.push('');
    lines.push('struct CanvasContext {};');
    lines.push('');
    for (let i = 0; i < order.length; i += 1) {
      const it = nodeFn.get(order[i]);
      if (!it) continue;
      const label = (it.displayName || it.functionId).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      lines.push(`static void node_${i}(CanvasContext&) { std::cout << "[node] ${label}" << std::endl; }`);
    }
    lines.push('');
    lines.push('int main() {');
    lines.push('  CanvasContext ctx;');
    for (let i = 0; i < order.length; i += 1) {
      if (!nodeFn.get(order[i])) continue;
      lines.push(`  node_${i}(ctx);`);
    }
    lines.push('  return 0;');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  };

  const buildQaStylePrompt = (p: { requirement: string; analysis: string; risk: string; ambiguity: string; missing: string; canvasCode: string }) => {
    const norm = (s: string) => String(s || '').trim();
    const req = norm(p.requirement);
    const analysis = norm(p.analysis);
    const risk = norm(p.risk);
    const ambiguity = norm(p.ambiguity);
    const missing = norm(p.missing);
    const canvasCode = norm(p.canvasCode);
    const rules = String.raw`【C++代码改写统一规范（必须严格遵守）】
生成 C++ 代码改写时需按统一表格字段与编码规范填写与实现：完成日期与姓名按“每个函数一行”分别记录以便追溯与工时统计；改写后文件夹名称采用大驼峰命名（如 BezierSpline），改写后源文件与头文件采用小驼峰命名（如 funBezier.cpp、funBezier.h），改写后路径按实际工程路径填写；改写前类型仅能在“类/函数”中二选一；改写后一级函数名必须同时满足三条约束：提供 Doxygen 函数说明、使用小驼峰且不得包含“_”“.”等分隔符、并作为测试用例中可由 main 直接调用的最上层入口（如 generateBezierPath），二级函数名为一级函数调用的下层函数（如 pointOnCubicBezier），三级函数名为二级函数调用的更下层函数（若有则同样小驼峰命名）；同时需给出函数中文名称（如“贝塞尔曲线”）用于组件展示与检索；整体质量与设计要求为：编译器警告/错误等级必须拉到最高并消除全部告警，代码结构必须包含注释说明、设计文档与函数主体三部分，不允许使用全局变量且静态变量不推荐使用（尽量将状态保存在顶层函数变量中），函数职责应单一，函数/类命名统一采用驼峰法，函数名展示长度建议不超过 12 个汉字，源码统一使用 UTF-8 编码，注释统一采用 Doxygen 格式且使用中文标点；控制流与语言特性限制为：禁止使用 goto，以及在 if-else 的 body 内禁止出现 return、break 等逻辑跳出语句，单个函数代码行数上限为 200 行；代码改写遵循“整体按 C 语言规范书写”的原则：复合函数必须采用 C 风格接口与实现形态，原子函数内部可采用少量 C++ 语法但对外接口必须呈现 C 语法格式，不支持类与模板语法，容器类（如 vector）需改为定长数组或 malloc 动态分配，指针使用方式需统一为“数组化”呈现并保持风格一致，表达式需拆解为清晰的逐步计算节点（禁止 ++/--，+=/-= 等复合赋值必须展开为显式赋值，三目运算符必须改为 if-else）；逻辑控制语句需满足“条件为单一变量、执行体为单一函数、禁止逻辑跳出语句”的约束：if-else 的条件变量应来自变量赋值或函数返回的单值比较，执行体封装为单一原子/复合函数且允许只有 if 无 else，但禁止在 if/else 内提前 return；for 循环必须将起始值、步进值、结束值拆为单一变量并以显式赋值/函数赋值方式获得，循环体同样封装为单一函数；注释细则为：函数头注释按给定 Doxygen 字段模板完整填写（含 @brief、@en_name、@cn_name、@type、@param、@param[IN]/[OUT]、@var、@retval、@granularity、@tag_level1/@tag_level2、@formula、@version、@date、@author 等），复合函数体内局部变量声明/定义必须在行尾注释说明变量含义；结构体字段采用大驼峰命名并在行尾注释中标注物理单位，数组字段在 @field 中用 Array<元素类型, 维度> 书写；枚举、宏定义与宏函数分别按对应 Doxygen 规范注释，其中宏定义可按日常习惯行尾注释即可，宏函数需提供 @tag MACRO_Function 与入参/返回值说明。`;
    return [
      '你是智能驾驶代码生产线的 C++ 代码生成器。',
      '',
      '【用户需求】',
      req || '-',
      '',
      '【问题分析】',
      analysis || '-',
      '',
      '【风险点】',
      risk || '-',
      '',
      '【歧义点】',
      ambiguity || '-',
      '',
      '【缺失信息】',
      missing || '-',
      '',
      '【画布现有代码（只读引用）】',
      canvasCode || '-',
      '',
      '【生成要求】',
      rules
    ].join('\n');
  };

  const buildNewFunctionJsonPrompt = (p: {
    requirement: string;
    analysis: string;
    canvasCode: string;
    functionId: string;
  }) => {
    const base = buildQaStylePrompt({ requirement: p.requirement, analysis: p.analysis, risk: '', ambiguity: '', missing: '', canvasCode: p.canvasCode });
    return [
      '你需要在现有工程中新增一个 C/C++ 复合函数。请严格输出 JSON（不要 markdown，不要解释文字）。',
      '必须满足：',
      '1) 只生成一个“函数”，不要生成 main()，不要生成示例程序。',
      '2) code 必须是【单个函数】的完整实现（允许必要的 #include 与 Doxygen 注释），且能在门禁工作区独立编译。',
      '3) 函数名必须是小驼峰，且不得包含 _ 或 .。',
      `4) function_id 固定为：${p.functionId}`,
      '',
      '输出 schema：',
      '{ "function_id": string, "display_name": string, "cn_name": string, "module": string, "signature": string, "doc_zh": string, "doc_en": string, "code": string }',
      '',
      base
    ].join('\n');
  };

  const runGenerateByMode = async () => {
    if (!prompt.trim() && generationMode !== 'canvas') {
      appendLog('生成失败：需求不能为空');
      return;
    }
    if (generationMode === 'reuse') {
      setReuseManagerOpen(true);
      appendLog('已打开模块管理：请选择要复用的函数/模块并注入画布');
      return;
    }
    setBusy(true);
    setAiEditSummary('');
    setAiEditStartSignal((v) => v + 1);
    try {
      if (generationMode === 'canvas') {
        appendLog('开始按照画布直接复用生成...');
        let oldCode = '';
        try {
          oldCode = await buildCanvasCodeContext();
        } catch {
          oldCode = '';
        }
        const cpp = await buildDirectReuseCpp();
        setGeneratedCode(cpp);
        commitDiffSnapshot({ oldCode, newCode: cpp, source: '画布生成' });
        setAiEditSummary(`已按画布直接复用生成，代码长度 ${cpp.length}。`);
        setAiEditApplySignal((v) => v + 1);
        appendLog(`生成成功：代码长度=${cpp.length}`);
        return;
      }

      if (generationMode === 'analyze') {
        appendLog('开始任务分析...');
        const selectedFunctionIds: string[] = Array.from(
          new Set<string>(
            graphSnapshot.nodes
              .filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'))
              .map((n: any) => String(n.functionId))
          )
        );
        const res = await taskAnalyze({
          target_module: 'default',
          intent: '实现需求',
          feature_description: prompt.trim(),
          input_spec: '',
          output_spec: '',
          generation_question: prompt.trim(),
          selected_function_ids: selectedFunctionIds,
          selected_workflow: null,
          root_dir: rootDir,
          rag_top_k: 8
        });
        if (!res.ok) {
          appendLog(`任务分析失败：${res.error || 'unknown'}`);
          setAiEditFailSignal((v) => v + 1);
          return;
        }
        const struct = res.analysis_struct;
        const analysisMdRaw = String(res.analysis_markdown || '').trim();
        const analysisMd = analysisMdRaw || '';
        if (!analysisMd && (!struct || (!String(struct.goal || '').trim() && !String(struct.constraints || '').trim() && !String(struct.subtasks || '').trim()))) {
          appendLog('任务分析失败：后端返回为空（analysis_markdown/analysis_struct）。');
          setAiEditFailSignal((v) => v + 1);
          return;
        }
        setTaskAnalysisResult(analysisMd);
        if (res.llm_model) appendLog(`任务分析模型：${res.llm_model}`);
        if (res.debug_id) appendLog(`任务分析调试ID：${res.debug_id}`);
        appendLog('开始从问题分析中提取 QA 清单...');

        if (struct && (String(struct.constraints || '').trim() || String(struct.subtasks || '').trim() || (struct.risk_items || []).length || (struct.missing_items || []).length)) {
          const riskLines = Array.from(new Set((struct.risk_items || []).map((x) => String(x || '').trim()).filter(Boolean)));
          const missingLines = Array.from(new Set((struct.missing_items || []).map((x) => String(x || '').trim()).filter(Boolean)));
          setQaRisk(riskLines.join('\n'));
          setQaAmbiguity('');
          setQaMissing(missingLines.join('\n'));
          setQaPrefill({
            goal: String(struct.goal || '').trim() || prompt.trim(),
            constraints: String(struct.constraints || '').trim(),
            subtasks: String(struct.subtasks || '').trim(),
            risk_items: riskLines,
            missing_items: missingLines
          });
          const ctx = await buildCanvasCodeContext();
          setQaCanvasCodeContext(ctx);
          setQaAutoOpenSignal((v) => v + 1);
          appendLog('已生成问题分析与 QA 清单，请在 QA 面板逐条确认后生成代码。');
          setAiEditApplySignal((v) => v + 1);
          return;
        }

        const md = analysisMd.replace(/\r\n/g, '\n');
        const pickMd = (titleRe: string) => {
          const re = new RegExp(
            `^\\s*#{1,6}\\s*(?:[\\d一二三四五六七八九十]+[\\.、\)]\\s*)?${titleRe}(?:\\s*[（(].*?[）)])?(?:\\s*[：:])?\\s*$([\\s\\S]*?)(^\\s*#{1,6}\\s|$)`,
            'm'
          );
          const m = md.match(re);
          if (!m) return '';
          return String(m[1] || '').trim();
        };
        const stripList = (line: string) => {
          let s = String(line || '').trim();
          if (!s) return '';
          if (/^#{1,6}\s+/.test(s)) return '';
          s = s.replace(/^\s*[-*•·–—]\s*(?:\[[ xX]\]\s*)?/, '');
          s = s.replace(/^\s*(?:\(?\d+\)?[.)、:]|[（(]\d+[）)]|\d+[、.]|\d+\)|[①②③④⑤⑥⑦⑧⑨⑩])\s*/, '');
          return s.trim();
        };
        const parseItems = (block: string) => {
          const lines = String(block || '')
            .split('\n')
            .map(stripList)
            .filter(Boolean);
          return Array.from(new Set(lines));
        };

        const goalBlock = pickMd('任务目标') || pickMd('需求目标') || pickMd('整体描述\\s*\\(goal\\)') || pickMd('整体描述') || '';
        const constraintsBlock = pickMd('关键约束') || pickMd('约束条件') || '';
        const subtasksBlock = pickMd('建议拆分的子任务') || pickMd('建议拆分子任务') || pickMd('子任务\\s*\\(subtasks\\)') || pickMd('实现步骤') || '';
        const riskBlock = pickMd('风险点\\s*/\\s*歧义点') || pickMd('风险点') || pickMd('歧义点') || '';
        const missingBlock = pickMd('缺失信息清单') || pickMd('缺失信息') || '';

        const riskLines = parseItems(riskBlock);
        const missingLines = parseItems(missingBlock);

        setQaRisk(riskLines.join('\n'));
        setQaAmbiguity('');
        setQaMissing(missingLines.join('\n'));
        setQaPrefill({
          goal: goalBlock.trim() || prompt.trim(),
          constraints: constraintsBlock.trim(),
          subtasks: subtasksBlock.trim(),
          risk_items: riskLines,
          missing_items: missingLines
        });
        const ctx = await buildCanvasCodeContext();
        setQaCanvasCodeContext(ctx);
        setQaAutoOpenSignal((v) => v + 1);
        appendLog('已生成问题分析与 QA 清单，请在 QA 面板逐条确认后生成代码。');
        setAiEditApplySignal((v) => v + 1);
        return;
      }

      if (generationMode === 'new_function') {
        appendLog('开始生成新函数...');
        const canvasCode = await buildCanvasCodeContext();
        let analysis = '';
        try {
          const selectedFunctionIds: string[] = Array.from(
            new Set<string>(
              graphSnapshot.nodes
                .filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'))
                .map((n: any) => String(n.functionId))
            )
          );
          const res = await taskAnalyze({
            target_module: 'default',
            intent: '新增函数',
            feature_description: prompt.trim(),
            input_spec: '',
            output_spec: '',
            generation_question: prompt.trim(),
            selected_function_ids: selectedFunctionIds,
            selected_workflow: null,
            root_dir: rootDir,
            rag_top_k: 8
          });
          analysis = String(res.analysis_markdown || '');
        } catch {
          analysis = '';
        }
        const functionId = `genfn_${Date.now()}`;
        const llmPrompt = buildNewFunctionJsonPrompt({ requirement: prompt, analysis, canvasCode, functionId });
        let r = await orchestratorGenerate(llmPrompt);
        if (!r.ok || !r.result) {
          appendLog(`生成失败：${r.error || 'empty result'}`);
          setAiEditFailSignal((v) => v + 1);
          return;
        }
        const tryParseObj = (text: string) => {
          try {
            return JSON.parse(String(text || ''));
          } catch {
            return null;
          }
        };
        let obj: any = tryParseObj(String(r.result));
        let code = obj?.code ? String(obj.code) : extractFirstCppBlock(String(r.result));
        const pickImpl = (payload: string) => {
          const s = String(payload || '').trim();
          if (!s) return '';
          const files = parseMarkdownCodeFiles(s);
          if (files.length) {
            const cpp = files.find((f) => /\.(cpp|cc|cxx|c)\b/i.test(String(f.name || '')));
            if (cpp?.content) return String(cpp.content);
            const h = files.find((f) => /\.(h|hpp|hh|hxx)\b/i.test(String(f.name || '')));
            if (h?.content) return String(h.content);
          }
          const m = s.match(/(?:^|\n)\s*(?:\/\/\s*)?```[a-zA-Z0-9_+\-]*\s*\n([\s\S]*?)\n\s*(?:\/\/\s*)?```\s*(?:\n|$)/);
          if (m && m[1]) return String(m[1]).trim();
          return s;
        };
        let impl = pickImpl(code);
        const deriveFnName = (sigLike: string, fallbackCode: string) => {
          const a = String(sigLike || '').trim();
          const b = String(fallbackCode || '').trim();
          const n1 = (a.match(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/) || [])[1] || '';
          if (n1) return n1;
          const n2 = (b.match(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/) || [])[1] || '';
          if (n2) return n2;
          return 'newFunction';
        };
        const enName = deriveFnName(String(obj?.signature || ''), impl);
        const cnNameHint = String(obj?.cn_name || obj?.display_name || '').trim();
        impl = ensureDoxygenFieldsInFunctionCode(impl, { cnName: cnNameHint || deriveDisplayNameFromPrompt(prompt) || '新函数', enName });
        let v = validateGeneratedFunctionCode(impl);
        if (!v.ok) {
          const retryPrompt = [
            '上一次输出不符合要求，请重试并严格输出 JSON。',
            `不合格原因：${v.reason}`,
            '再次强调：不要输出 main()，code 必须是单个函数实现且包含 Doxygen 字段（@brief/@en_name/@cn_name 等）。',
            '',
            llmPrompt
          ].join('\n');
          r = await orchestratorGenerate(retryPrompt);
          if (!r.ok || !r.result) {
            appendLog(`生成失败：${r.error || 'empty result'}`);
            setAiEditFailSignal((v2) => v2 + 1);
            return;
          }
          obj = tryParseObj(String(r.result));
          code = obj?.code ? String(obj.code) : extractFirstCppBlock(String(r.result));
          impl = pickImpl(code);
          const en2 = deriveFnName(String(obj?.signature || ''), impl);
          const cn2 = String(obj?.cn_name || obj?.display_name || '').trim();
          impl = ensureDoxygenFieldsInFunctionCode(impl, { cnName: cn2 || deriveDisplayNameFromPrompt(prompt) || '新函数', enName: en2 });
          v = validateGeneratedFunctionCode(impl);
        }
        if (!v.ok) {
          appendLog(`新函数生成失败：${v.reason}`);
          setAiEditFailSignal((v2) => v2 + 1);
          return;
        }
        const preferredName = (() => {
          const n = String(obj?.display_name || '').trim();
          if (n && !/genfn_\d+/.test(n) && !/^新函数_/i.test(n)) return n;
          const cn = String(obj?.cn_name || '').trim();
          if (cn) return sanitizeCnDisplayName(cn).slice(0, 12);
          const dz = String(obj?.doc_zh || '').trim();
          if (dz) {
            const cn2 = extractCnNameFromDoc(dz);
            if (cn2) return sanitizeCnDisplayName(cn2).slice(0, 12);
            const first = dz.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)[0] || '';
            if (first) return first.slice(0, 24);
          }
          const cn3 = extractCnNameFromCode(code);
          if (cn3) return sanitizeCnDisplayName(cn3).slice(0, 12);
          const d = deriveDisplayNameFromPrompt(prompt);
          return d ? d : `新函数_${functionId}`;
        })();
        const displayName = sanitizeCnDisplayName(preferredName);
        const sig = String(obj?.signature || '');
        const mod = String(obj?.module || 'common');

        const parsed = parseFunctionBlocksFromCode(impl);
        if (parsed.blocks.length > 1) {
          const moduleKey = `genmod_${Date.now()}`;
          const moduleName = sanitizeCnDisplayName(parsed.blocks[0]?.cn_name || displayName || deriveDisplayNameFromPrompt(prompt) || `新模块_${moduleKey}`);
          setGeneratedFunctions((prev) => {
            const next = { ...prev };
            for (let i = 0; i < parsed.blocks.length; i += 1) {
              const b = parsed.blocks[i];
              const fid = i === 0 ? functionId : `genfn_${Date.now()}_${i}`;
              const dn = sanitizeCnDisplayName(b.cn_name || b.name || moduleName || fid);
              const fnName = b.name || (b.signature.match(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/) || [])[1] || `fn_${Date.now()}_${i}`;
              const comment = (b.text.match(/\/\*\*[\s\S]*?\*\//) || [''])[0].trim();
              const declSig = (b.signature || '').trim();
              const decl = declSig ? `${declSig.replace(/\s*\{\s*$/, '').trim()};` : '';
              const h = ['#pragma once', '', comment, decl].filter(Boolean).join('\n').trimEnd();
              const cpp = [`#include "${fnName}.h"`, '', b.text.trim()].filter(Boolean).join('\n').trimEnd();
              const full = buildMultiFileMarkdown([
                { name: `${fnName}.h`, lang: 'cpp', content: h },
                { name: `${fnName}.cpp`, lang: 'cpp', content: cpp }
              ]);
              next[fid] = {
                display_name: dn,
                signature: b.signature || '',
                module: mod,
                doc_zh: String(obj?.doc_zh || ''),
                doc_en: String(obj?.doc_en || ''),
                code: full
              };
            }
            return next;
          });

          const nodes = parsed.blocks.map((b, i) => {
            const fid = i === 0 ? functionId : `genfn_${Date.now()}_${i}`;
            return {
              id: `n${i + 1}`,
              kind: 'function',
              functionId: fid,
              displayName: sanitizeCnDisplayName(b.cn_name || b.name || `fn${i + 1}`),
              module: mod,
              signature: b.signature || '',
              inputsJson: '{}',
              outputsJson: '{}',
              x: i * 240,
              y: 0
            };
          });
          const edges = parsed.blocks.slice(1).map((_, i) => ({ id: `e${i + 1}`, from: `n${i + 1}`, to: `n${i + 2}` }));

          setGeneratedModules((prev) => ({
            ...prev,
            [moduleKey]: { module_key: moduleKey, display_name: moduleName, doc_zh: String(obj?.doc_zh || ''), nodes, edges }
          }));
          setNewModelPayload({ moduleKey, displayName: moduleName });
          setNewModelSignal((v) => v + 1);
          appendLog(`新模块已生成并加入画布：${moduleName}`);
          setAiEditApplySignal((v) => v + 1);
          return;
        }

        const fnName = (() => {
          const fromSig = (sig.match(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/) || [])[1] || '';
          if (fromSig) return fromSig;
          const fromCode = (impl.match(/\b([a-zA-Z][a-zA-Z0-9]*)\s*\(/) || [])[1] || '';
          if (fromCode) return fromCode;
          return `gen_${Date.now()}`;
        })();
        const comment = (impl.match(/\/\*\*[\s\S]*?\*\//) || [''])[0].trim();
        const declSig = (sig || parsed.blocks[0]?.signature || '').trim();
        const decl = declSig ? `${declSig.replace(/\s*\{\s*$/, '').trim()};` : '';
        const h = ['#pragma once', '', comment, decl].filter(Boolean).join('\n').trimEnd();
        const cpp = [`#include "${fnName}.h"`, '', impl.trim()].filter(Boolean).join('\n').trimEnd();
        const full = buildMultiFileMarkdown([
          { name: `${fnName}.h`, lang: 'cpp', content: h },
          { name: `${fnName}.cpp`, lang: 'cpp', content: cpp }
        ]);

        setGeneratedFunctions((prev) => ({
          ...prev,
          [functionId]: {
            display_name: displayName,
            signature: sig,
            module: mod,
            doc_zh: String(obj?.doc_zh || ''),
            doc_en: String(obj?.doc_en || ''),
            code: full
          }
        }));
        setInjectFunctionPayload({ functionId, displayName, signature: sig, module: mod });
        setInjectFunctionSignal((v) => v + 1);
        appendLog(`新函数已生成并加入画布：${displayName}`);
        setAiEditApplySignal((v) => v + 1);
        return;
      }

      if (generationMode === 'new_module') {
        appendLog('开始生成新模块...');
        const canvasCode = await buildCanvasCodeContext();
        let analysis = '';
        try {
          const selectedFunctionIds: string[] = Array.from(
            new Set<string>(
              graphSnapshot.nodes
                .filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'))
                .map((n: any) => String(n.functionId))
            )
          );
          const res = await taskAnalyze({
            target_module: 'default',
            intent: '新增模块',
            feature_description: prompt.trim(),
            input_spec: '',
            output_spec: '',
            generation_question: prompt.trim(),
            selected_function_ids: selectedFunctionIds,
            selected_workflow: null,
            root_dir: rootDir,
            rag_top_k: 8
          });
          analysis = String(res.analysis_markdown || '');
        } catch {
          analysis = '';
        }
        const reqPrompt = buildQaStylePrompt({ requirement: prompt, analysis, risk: '', ambiguity: '', missing: '', canvasCode });
        const moduleKey = `genmod_${Date.now()}`;
        const llmPrompt = [
          '你需要新增一个模块（多个函数 + 连接关系），并以画布图的形式输出。请严格输出 JSON（不要 markdown）。',
          '输出 schema：{ "module_key": string, "display_name": string, "doc_zh": string, "functions": Array<{"function_id":string,"display_name":string,"module":string,"signature":string,"doc_zh":string,"doc_en":string,"code":string}>, "nodes": any[], "edges": any[] }',
          `module_key 固定为：${moduleKey}`,
          'nodes/edges 需可直接用于画布（节点需包含 kind=function/module、functionId/moduleKey、displayName、module、signature、inputsJson、outputsJson、x、y 等关键字段）。',
          '',
          reqPrompt
        ].join('\n');
        const r = await orchestratorGenerate(llmPrompt);
        if (!r.ok || !r.result) {
          appendLog(`生成失败：${r.error || 'empty result'}`);
          setAiEditFailSignal((v) => v + 1);
          return;
        }
        let obj: any = null;
        try {
          obj = JSON.parse(String(r.result));
        } catch {
          obj = null;
        }
        if (!obj || !obj.module_key) {
          appendLog('生成失败：未得到有效的模块 JSON');
          setAiEditFailSignal((v) => v + 1);
          return;
        }
        const displayName = (() => {
          const n = String(obj?.display_name || '').trim();
          if (n && !/genmod_\d+/.test(n) && !/^新模块_/i.test(n)) return n;
          const dz = String(obj?.doc_zh || '').trim();
          if (dz) {
            const first = dz.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)[0] || '';
            if (first) return first.slice(0, 24);
          }
          const p = prompt.trim();
          return p ? p.slice(0, 24) : `新模块_${moduleKey}`;
        })();
        const docZh = String(obj.doc_zh || `模块 ${displayName}`);
        const nodes = Array.isArray(obj.nodes) ? obj.nodes : [];
        const edges = Array.isArray(obj.edges) ? obj.edges : [];
        const fns = Array.isArray(obj.functions) ? obj.functions : [];
        if (fns.length) {
          setGeneratedFunctions((prev) => {
            const next = { ...prev };
            for (const it of fns) {
              const fid = String(it?.function_id || '').trim();
              if (!fid) continue;
              next[fid] = {
                display_name: String(it?.display_name || fid),
                signature: String(it?.signature || ''),
                module: String(it?.module || 'common'),
                doc_zh: String(it?.doc_zh || ''),
                doc_en: String(it?.doc_en || ''),
                code: String(it?.code || '')
              };
            }
            return next;
          });
        }
        setGeneratedModules((prev) => ({
          ...prev,
          [moduleKey]: { module_key: moduleKey, display_name: displayName, doc_zh: docZh, nodes, edges }
        }));
        setNewModelPayload({ moduleKey, displayName });
        setNewModelSignal((v) => v + 1);
        appendLog(`新模块已生成并加入画布：${moduleKey}`);
        setAiEditApplySignal((v) => v + 1);
        return;
      }
    } catch (e) {
      appendLog(`生成异常：${e instanceof Error ? e.message : 'unknown'}`);
      setAiEditFailSignal((v) => v + 1);
    } finally {
      setBusy(false);
    }
  };

  const runGenerateFromQaPrompt = async (finalPrompt: string) => {
    const p = String(finalPrompt || '').trim();
    if (!p) {
      appendLog('生成失败：提示词不能为空');
      return;
    }
    setBusy(true);
    setAiEditSummary('');
    setAiEditStartSignal((v) => v + 1);
    appendLog('开始调用编排生成接口...');
    try {
      let oldCode = '';
      try {
        oldCode = await buildCanvasCodeContext();
      } catch {
        oldCode = '';
      }
      const needRetry = (text: string) => {
        const files = parseMarkdownCodeFiles(String(text || ''));
        if (!files.length) return false;
        const hasH = files.some((f) => /\.(h|hpp|hh|hxx)\b/i.test(String(f.name || '')));
        const hasCpp = files.some((f) => /\.(cpp|cc|cxx|c)\b/i.test(String(f.name || '')));
        return hasH && !hasCpp;
      };

      let r = await orchestratorGenerate(p);
      if (!r.ok || !r.result) {
        appendLog(`生成失败：${r.error || 'empty result'}`);
        setAiEditFailSignal((v) => v + 1);
        return;
      }
      if (needRetry(String(r.result))) {
        appendLog('检测到仅生成头文件，开始自动重试补全 .cpp...');
        const retryPrompt = [
          '上一次输出缺少 .cpp 源文件，请重试并严格补全：',
          '1) 必须同时给出 .h 与 .cpp；',
          '2) .h 只放声明与必要结构体/宏，函数实现放在 .cpp；',
          '',
          p
        ].join('\n');
        const r2 = await orchestratorGenerate(retryPrompt);
        if (r2.ok && r2.result) r = r2;
      }

      const code = extractFirstCppBlock(String(r.result));
      setGeneratedCode(code);
      commitDiffSnapshot({ oldCode, newCode: code, source: 'QA生成' });
      const briefPrompt = p.replace(/\s+/g, ' ').trim();
      const promptText = briefPrompt.length > 42 ? `${briefPrompt.slice(0, 42)}...` : briefPrompt;
      setAiEditSummary(`已按指令“${promptText || '生成代码'}”完成变更，生成结果长度 ${code.length}。`);
      setAiEditApplySignal((v) => v + 1);
      appendLog(`生成成功：代码长度=${code.length}`);
    } catch (e) {
      appendLog(`生成异常：${e instanceof Error ? e.message : 'unknown'}`);
      setAiEditFailSignal((v) => v + 1);
    } finally {
      setBusy(false);
    }
  };

  const runTaskAnalyze = async () => {
    const feature = taskFeatureDescription.trim() || prompt.trim();
    if (!feature) {
      appendLog('任务分析失败：请先填写需求或功能描述');
      return;
    }
    setTaskAnalyzeBusy(true);
    try {
    const selectedFunctionIds: string[] = Array.from(
      new Set<string>(
        graphSnapshot.nodes
          .filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'))
          .map((n: any) => String(n.functionId))
      )
    );
      const res = await taskAnalyze({
        target_module: taskTargetModule || 'default',
        intent: taskIntent || '实现需求',
        feature_description: feature,
        input_spec: taskInputSpec,
        output_spec: taskOutputSpec,
        generation_question: taskGenerationQuestion || prompt,
        selected_function_ids: selectedFunctionIds,
        selected_workflow: null,
        root_dir: rootDir,
        rag_top_k: 8
      });
      if (!res.ok) {
        appendLog(`任务分析失败：${res.error || 'unknown'}`);
        return;
      }
      setTaskAnalysisResult(String(res.analysis_markdown || ''));
      appendLog(`任务分析完成：命中函数 ${(res.rag_hits || []).length}`);
    } catch (e) {
      appendLog(`任务分析异常：${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setTaskAnalyzeBusy(false);
    }
  };

  const runRoutingQa = async () => {
    const context = taskAnalysisResult.trim() || prompt.trim();
    if (!context) {
      appendLog('QA分析失败：缺少任务分析结果');
      return;
    }
    setQaBusy(true);
    try {
      const md = context.replace(/\r\n/g, '\n');
      const pickSection = (title: string) => {
        const re = new RegExp(`^#{1,6}\\s*${title}\\s*$([\\s\\S]*?)(^#{1,6}\\s|$)`, 'm');
        const m = md.match(re);
        if (!m) return '';
        return String(m[1] || '').trim();
      };
      const riskBlock = pickSection('风险点/歧义点') || pickSection('风险点') || '';
      const missingBlock = pickSection('缺失信息清单') || pickSection('缺失信息') || '';
      const listLines = (block: string) =>
        block
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean)
          .filter((x) => /^[-*\d.、]/.test(x))
          .map((x) => x.replace(/^[-*\d.、\s]+/, '').trim())
          .filter(Boolean);

      setQaRisk(listLines(riskBlock).join('\n'));
      setQaAmbiguity('');
      setQaMissing(listLines(missingBlock).join('\n'));
      appendLog('QA分析完成：已从任务分析结果提取风险点/缺失信息清单');
    } catch (e) {
      appendLog(`QA分析异常：${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setQaBusy(false);
    }
  };

  const runTerminalCommand = async (command: string) => {
    const cmd = command.trim();
    if (!cmd) return;
    setTerminalBusy(true);
    setTerminalLines((prev) => [...prev, `$ ${cmd}`]);
    try {
      const out = await ragRunTest({ cwd: rootDir || '.', command: cmd, timeout_ms: 120000 });
      const lines = [
        out.stdout ? out.stdout : '',
        out.stderr ? out.stderr : '',
        `exit=${out.returncode} duration=${out.duration_ms}ms`
      ]
        .filter(Boolean)
        .join('\n');
      setTerminalLines((prev) => [...prev, lines]);
    } catch (e) {
      setTerminalLines((prev) => [...prev, `error: ${e instanceof Error ? e.message : 'unknown'}`]);
    } finally {
      setTerminalBusy(false);
    }
  };

  const runGate = async () => {
    if (!generatedCode.trim()) {
      appendLog('门禁失败：请先生成代码');
      return;
    }
    setBusy(true);
    setPipelineSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' })));
    appendLog('开始执行门禁任务...');
    try {
      const gatePayload = /```/.test(generatedCode) ? generatedCode : `\n\n\`\`\`cpp\n${generatedCode}\n\`\`\`\n`;
      const effectivePayload =
        generationMode === 'canvas'
          ? `\n\n\`\`\`cpp\n${buildCanvasGateStubCpp()}\n\`\`\`\n`
          : gatePayload;
      const started = await gateStart({
        work_dir: 'AUTO',
        compile_command: 'AUTO',
        static_command: 'AUTO',
        requirement_prompt: prompt,
        generated_result: effectivePayload
      });
      if (!started.ok || !started.job_id) {
        appendLog(`门禁启动失败：${started.error || 'unknown'}`);
        return;
      }
      appendLog(`门禁任务已启动：${started.job_id}`);
      while (true) {
        const st = await gateGetJob(started.job_id);
        setPipelineSteps((prev) =>
          prev.map((p) => {
            const hit = st.statuses.find((x) => x.step === p.id);
            if (!hit) return p;
            return {
              ...p,
              status: hit.status === 'failed' ? 'failure' : hit.status === 'success' ? 'success' : hit.status === 'running' ? 'running' : 'pending'
            };
          })
        );
        const summary = st.statuses.map((s) => `${s.step}:${s.status}`).join(' | ');
        appendLog(`门禁进度：${summary}`);
        if (st.done) {
          appendLog(st.error ? `门禁结束（失败）：${st.error}` : '门禁结束（完成）');
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    } catch (e) {
      appendLog(`门禁异常：${e instanceof Error ? e.message : 'unknown'}`);
      setPipelineSteps((prev) =>
        prev.map((p) => (p.status === 'running' ? { ...p, status: 'failure' } : p))
      );
    } finally {
      setBusy(false);
    }
  };

  const doNewModel = async () => {
    const name = (window.prompt('请输入模型名称', `model_${Date.now().toString().slice(-5)}`) || '').trim();
    if (!name) return;
    const moduleKey = name.replace(/\s+/g, '_').replace(/[^\w\u4e00-\u9fa5-]/g, '').toLowerCase() || `model_${Date.now()}`;
    setBusy(true);
    try {
      const res = await ragUpsertModule({
        root_dir: rootDir,
        module: {
          module_key: moduleKey,
          display_name: name,
          doc_zh: `模型 ${name}`,
          nodes: [],
          edges: [],
          source: 'builder'
        }
      });
      if (!res.ok) {
        appendLog(`新建模型失败：${res.error || 'unknown'}`);
        return;
      }
      setNewModelPayload({ moduleKey, displayName: name });
      setNewModelSignal((v) => v + 1);
      appendLog(`新建模型成功：${name}`);
    } catch (e) {
      appendLog(`新建模型异常：${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  const doRuntimeDesign = async () => {
    setBusy(true);
    try {
      const mods = await ragListIndexedModules({ root_dir: rootDir, limit: 12, offset: 0 });
      const items = mods.items || [];
      if (!items.length) {
        appendLog('运行时设计：暂无可用模块');
        return;
      }
      const tips = items.map((m, i) => `${i + 1}. ${m.display_name || m.module_key}`).join('\n');
      const pick = (window.prompt(`选择运行时模块（输入序号）:\n${tips}`, '1') || '').trim();
      if (!pick) return;
      const idx = Number(pick);
      if (!Number.isFinite(idx) || idx < 1 || idx > items.length) {
        appendLog('运行时设计：选择无效');
        return;
      }
      const hit = items[idx - 1];
      setRuntimeInjectModuleKey(hit.module_key);
      setRuntimeInjectSignal((v) => v + 1);
      appendLog(`运行时设计：已注入模块 ${hit.display_name || hit.module_key}`);
    } catch (e) {
      appendLog(`运行时设计异常：${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  const doDeploy = async () => {
    const fnNodes = graphSnapshot.nodes.filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'));
    const uniqueIds: string[] = Array.from(new Set<string>(fnNodes.map((n: any) => String(n.functionId))));
    if (!uniqueIds.length) {
      appendLog('部署失败：当前画布没有可发布函数节点');
      return;
    }
    const version = (window.prompt('请输入部署版本号', `v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`) || '').trim();
    if (!version) return;
    setBusy(true);
    try {
      const details = await Promise.all(uniqueIds.map((id) => ragGetFunction(id)));
      const functions = details
        .map((d: any) => ({
          name: String(d?.display_name || d?.name || ''),
          signature: String(d?.signature || ''),
          content: String(d?.code || ''),
          file_path: String(d?.file_path || ''),
          comment: String(d?.doc_zh || '')
        }))
        .filter((f) => f.name && f.signature && f.content);
      if (!functions.length) {
        appendLog('部署失败：未取到可发布函数内容');
        return;
      }
      const ragRes = await releaseRagIndex({ version, functions });
      if (!ragRes.ok) {
        appendLog(`部署失败（rag-index）：${ragRes.error || 'unknown'}`);
        return;
      }
      const modRes = await releaseModulesUpsert({ version, namespace: projectName || 'default', functions });
      if (!modRes.ok) {
        appendLog(`部署失败（modules-upsert）：${modRes.error || 'unknown'}`);
        return;
      }
      appendLog(`部署成功：version=${version} functions=${functions.length}`);
    } catch (e) {
      appendLog(`部署异常：${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  const runExportModule = async (payload: { canvasId: string; canvasName: string; nodes: any[]; edges: any[] }) => {
    const name = (window.prompt('请输入导出模块名称', payload.canvasName || `module_${Date.now().toString().slice(-5)}`) || '').trim();
    if (!name) return;
    const moduleKey = name.replace(/\s+/g, '_').replace(/[^\w\u4e00-\u9fa5-]/g, '').toLowerCase() || `module_${Date.now()}`;
    const doc = (window.prompt('请输入模块说明（可选）', `模块 ${name}`) || '').trim();

    setBusy(true);
    setAiEditSummary('');
    setAiEditStartSignal((v) => v + 1);
    setPipelineSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' })));
    appendLog(`开始导出模块：${name} (${moduleKey})`);

    try {
      let oldCode = '';
      try {
        oldCode = await buildCanvasCodeContext();
      } catch {
        oldCode = '';
      }
      const upsert = await ragUpsertModule({
        root_dir: rootDir,
        module: {
          module_key: moduleKey,
          display_name: name,
          doc_zh: doc || `模块 ${name}`,
          nodes: payload.nodes,
          edges: payload.edges,
          source: 'canvas-export'
        }
      });
      if (!upsert.ok) {
        appendLog(`导出失败：模块写入失败：${upsert.error || 'unknown'}`);
        return;
      }
      appendLog(`模块已写入模块库：${moduleKey}`);

      const moduleSpec = JSON.stringify({ canvas: { id: payload.canvasId, name: payload.canvasName }, nodes: payload.nodes, edges: payload.edges }, null, 2);
      const exportPrompt = [
        prompt.trim(),
        `\n\n请基于以下模块定义生成可编译的代码变更，并说明关键实现要点。`,
        `模块Key：${moduleKey}`,
        `模块名：${name}`,
        `模块定义(JSON)：\n${moduleSpec}`
      ]
        .filter(Boolean)
        .join('\n');

      appendLog('开始生成代码...');
      const r = await orchestratorGenerate(exportPrompt);
      if (!r.ok || !r.result) {
        appendLog(`生成失败：${r.error || 'empty result'}`);
        setAiEditFailSignal((v) => v + 1);
        return;
      }
      const normalized = commentMarkdownMarkers(normalizeGeneratedCodePayload(String(r.result)));
      setGeneratedCode(normalized);
      commitDiffSnapshot({ oldCode, newCode: normalized, source: '导出模块生成' });
      const brief = exportPrompt.replace(/\s+/g, ' ').trim();
      const briefText = brief.length > 42 ? `${brief.slice(0, 42)}...` : brief;
      setAiEditSummary(`已按指令“${briefText || '导出模块'}”完成变更，生成结果长度 ${r.result.length}。`);
      setAiEditApplySignal((v) => v + 1);
      appendLog(`生成成功：代码长度=${r.result.length}`);

      appendLog('开始执行门禁任务...');
      const started = await gateStart({
        work_dir: 'AUTO',
        compile_command: 'AUTO',
        static_command: 'AUTO',
        requirement_prompt: exportPrompt,
        generated_result: normalized
      });
      if (!started.ok || !started.job_id) {
        appendLog(`门禁启动失败：${started.error || 'unknown'}`);
        return;
      }
      appendLog(`门禁任务已启动：${started.job_id}`);
      let gateOk = false;
      while (true) {
        const st = await gateGetJob(started.job_id);
        setPipelineSteps((prev) =>
          prev.map((p) => {
            const hit = st.statuses.find((x) => x.step === p.id);
            if (!hit) return p;
            return {
              ...p,
              status: hit.status === 'failed' ? 'failure' : hit.status === 'success' ? 'success' : hit.status === 'running' ? 'running' : 'pending'
            };
          })
        );
        const summary = st.statuses.map((s) => `${s.step}:${s.status}`).join(' | ');
        appendLog(`门禁进度：${summary}`);
        if (st.done) {
          gateOk = !st.error;
          appendLog(st.error ? `门禁结束（失败）：${st.error}` : '门禁结束（完成）');
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      if (!gateOk) return;

      const fnIds: string[] = Array.from(
        new Set<string>(
          (payload.nodes || [])
            .filter((n: any) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'))
            .map((n: any) => String(n.functionId))
        )
      );
      if (!fnIds.length) {
        appendLog('发布跳过：当前选择子图没有可发布函数节点');
        return;
      }
      const version = (window.prompt('请输入发布版本号', `v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${moduleKey}`) || '').trim();
      if (!version) return;

      appendLog('开始发布函数到函数库...');
      const details = await Promise.all(fnIds.map((id) => ragGetFunction(id)));
      const functions = details
        .map((d: any) => {
          const fn = d?.function || d;
          return {
            name: String(fn?.display_name || fn?.name || ''),
            signature: String(fn?.signature || ''),
            content: String(fn?.code || ''),
            file_path: String(fn?.file_path || ''),
            comment: String(fn?.doc_zh || '')
          };
        })
        .filter((f: any) => f.name && f.signature && f.content);
      if (!functions.length) {
        appendLog('发布失败：未取到可发布函数内容');
        return;
      }
      const ragRes = await releaseRagIndex({ version, functions });
      if (!ragRes.ok) {
        appendLog(`发布失败（rag-index）：${ragRes.error || 'unknown'}`);
        return;
      }
      const modRes = await releaseModulesUpsert({ version, namespace: projectName || 'default', functions });
      if (!modRes.ok) {
        appendLog(`发布失败（modules-upsert）：${modRes.error || 'unknown'}`);
        return;
      }
      appendLog(`发布成功：version=${version} functions=${functions.length}`);
    } catch (e) {
      appendLog(`导出模块异常：${e instanceof Error ? e.message : 'unknown'}`);
      setPipelineSteps((prev) => prev.map((p) => (p.status === 'running' ? { ...p, status: 'failure' } : p)));
      setAiEditFailSignal((v) => v + 1);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void runHealthCheck();
  }, []);

  useEffect(() => {
    const hit = projects.find((p) => p.id === projectId);
    if (!hit) return;
    const next = { ...hit, name: projectName, rootDir, prompt, updatedAt: Date.now() };
    const arr = projects.map((p) => (p.id === projectId ? next : p));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(arr));
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
  }, [projectId, projectName, rootDir, prompt]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white text-[#4A148C]">
      <TopBar
        onMenuAction={(menuName, item) => {
          if (menuName === '调测工具' && item === 'diff') {
            openDiffOverlay();
          }
        }}
      />
      <Toolbar
        busy={busy}
        backendOk={backendOk}
        onNewProject={doNewProject}
        onOpenProject={doOpenProject}
        onSaveProject={() => void doExportCanvasFile()}
        onNewModel={() => void doNewModel()}
        onRuntimeDesign={() => void doRuntimeDesign()}
        onDeploy={() => void doDeploy()}
        onHealth={() => void runHealthCheck()}
        onScanManager={() => setScanManagerOpen(true)}
        onScan={() => void runScan()}
        onGenerate={() => void runGenerate()}
        onGate={() => void runGate()}
      />
      <Workspace
        projectId={projectId}
        injectModuleKey={runtimeInjectModuleKey}
        injectModuleSignal={runtimeInjectSignal}
        createModel={newModelPayload}
        createModelSignal={newModelSignal}
        injectFunctionPayload={injectFunctionPayload}
        injectFunctionSignal={injectFunctionSignal}
        generatedFunctions={generatedFunctions}
        generatedModules={generatedModules}
        aiEditStartSignal={aiEditStartSignal}
        aiEditApplySignal={aiEditApplySignal}
        aiEditFailSignal={aiEditFailSignal}
        aiEditSummary={aiEditSummary}
        onGraphChange={setGraphSnapshot}
        importGraphPayload={importGraphPayload}
        importGraphSignal={importGraphSignal}
        onExportModule={(p) => void runExportModule(p)}
        rootDir={rootDir}
        setRootDir={setRootDir}
        prompt={prompt}
        setPrompt={setPrompt}
        generatedCode={generatedCode}
        generationMode={generationMode}
        setGenerationMode={setGenerationMode}
        qaAutoOpenSignal={qaAutoOpenSignal}
        qaCanvasCodeContext={qaCanvasCodeContext}
        onGenerateFromQa={(p) => void runGenerateFromQaPrompt(p)}
        logs={logs}
        pipelineSteps={pipelineSteps}
        busy={busy}
        saveCanvasSignal={saveCanvasSignal}
        taskTargetModule={taskTargetModule}
        setTaskTargetModule={setTaskTargetModule}
        taskIntent={taskIntent}
        setTaskIntent={setTaskIntent}
        taskFeatureDescription={taskFeatureDescription}
        setTaskFeatureDescription={setTaskFeatureDescription}
        taskInputSpec={taskInputSpec}
        setTaskInputSpec={setTaskInputSpec}
        taskOutputSpec={taskOutputSpec}
        setTaskOutputSpec={setTaskOutputSpec}
        taskGenerationQuestion={taskGenerationQuestion}
        setTaskGenerationQuestion={setTaskGenerationQuestion}
        taskAnalysisResult={taskAnalysisResult}
        taskAnalyzeBusy={taskAnalyzeBusy}
        onTaskAnalyze={() => void runTaskAnalyze()}
        qaRisk={qaRisk}
        qaAmbiguity={qaAmbiguity}
        qaMissing={qaMissing}
        qaPrefill={qaPrefill}
        qaBusy={qaBusy}
        onQaAnalyze={() => void runRoutingQa()}
        terminalLines={terminalLines}
        terminalBusy={terminalBusy}
        onRunTerminal={(command) => void runTerminalCommand(command)}
        onRunGate={() => void runGate()}
        onGenerate={() => void runGenerateByMode()}
        injectReusePayload={injectReusePayload}
        injectReuseSignal={injectReuseSignal}
        onUpsertGeneratedFunction={upsertGeneratedFunction}
      />
      {scanManagerOpen && (
        <CodeManagementPanel
          rootDir={rootDir}
          setRootDir={setRootDir}
          onClose={() => setScanManagerOpen(false)}
          onLog={appendLog}
        />
      )}
      {reuseManagerOpen && (
        <ReuseModulePanel
          rootDir={rootDir}
          requirementText={prompt}
          canvasDigestText={(() => {
            const ns = Array.isArray(graphSnapshot.nodes) ? graphSnapshot.nodes : [];
            const es = Array.isArray(graphSnapshot.edges) ? graphSnapshot.edges : [];
            const nameParts = ns
              .filter((n: any) => String(n?.kind || '') === 'function')
              .map((n: any) => String(n?.displayName || n?.functionId || '').trim())
              .filter(Boolean)
              .slice(0, 24);
            const moduleParts = ns
              .filter((n: any) => String(n?.kind || '') === 'module')
              .map((n: any) => String(n?.displayName || n?.moduleKey || '').trim())
              .filter(Boolean)
              .slice(0, 12);
            const edgeParts = es
              .map((e: any) => {
                const a = String(e?.from || '').trim();
                const b = String(e?.to || '').trim();
                if (!a || !b) return '';
                return `${a} -> ${b}`;
              })
              .filter(Boolean)
              .slice(0, 24);
            return [
              nameParts.length ? `functions: ${nameParts.join(', ')}` : '',
              moduleParts.length ? `modules: ${moduleParts.join(', ')}` : '',
              edgeParts.length ? `edges: ${edgeParts.join(', ')}` : ''
            ]
              .filter(Boolean)
              .join('\n');
          })()}
          existingFunctionIds={Array.from(
            new Set(
              (Array.isArray(graphSnapshot.nodes) ? graphSnapshot.nodes : [])
                .filter((n: any) => String(n?.kind || '') === 'function' && n?.functionId)
                .map((n: any) => String(n.functionId))
            )
          )}
          existingModuleKeys={Array.from(
            new Set(
              (Array.isArray(graphSnapshot.nodes) ? graphSnapshot.nodes : [])
                .filter((n: any) => String(n?.kind || '') === 'module' && n?.moduleKey)
                .map((n: any) => String(n.moduleKey))
            )
          )}
          onClose={() => setReuseManagerOpen(false)}
          onConfirm={(p) => {
            setReuseManagerOpen(false);
            const funcs = Array.isArray((p as any)?.functions) ? ((p as any).functions as any[]) : [];
            const mods = Array.isArray((p as any)?.modules) ? ((p as any).modules as any[]) : [];
            setInjectReusePayload({ functions: funcs, modules: mods });
            setInjectReuseSignal((v) => v + 1);
            appendLog(`已注入复用项到画布：函数 ${funcs.length}，模块 ${mods.length}`);
          }}
        />
      )}
      <DiffOverlay open={diffOpen} snapshot={diffSnapshot} onClose={() => setDiffOpen(false)} />
    </div>
  );
}
