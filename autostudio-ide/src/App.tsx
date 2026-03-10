/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import TopBar from './components/Layout/TopBar';
import Toolbar from './components/Layout/Toolbar';
import Workspace, { PipelineStep } from './components/Layout/Workspace';
import CodeManagementPanel from './components/Layout/CodeManagementPanel';
import { useEffect, useState } from 'react';
import {
  cotQuestion,
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
  const [qaBusy, setQaBusy] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [terminalBusy, setTerminalBusy] = useState(false);
  const [graphSnapshot, setGraphSnapshot] = useState<{ nodes: any[]; edges: any[]; activeCanvasId: string }>({
    nodes: [],
    edges: [],
    activeCanvasId: '1'
  });

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
    const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!sorted.length) {
      appendLog('暂无可打开工程，请先新建工程');
      return;
    }
    const tips = sorted.slice(0, 12).map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const input = (window.prompt(`请选择要打开的工程（输入序号）:\n${tips}`, '1') || '').trim();
    if (!input) return;
    const index = Number(input);
    if (!Number.isFinite(index) || index < 1 || index > sorted.length) {
      appendLog('打开工程失败：输入无效');
      return;
    }
    const hit = sorted[index - 1];
    setProjectId(hit.id);
    setProjectName(hit.name);
    setRootDir(hit.rootDir || 'data\\THICV-Pilot_master');
    setPrompt(hit.prompt || '请根据当前需求生成可编译的 C++ 代码，并给出关键实现要点。');
    setGeneratedCode('');
    setLogs([]);
    setPipelineSteps([
      { id: 'compile', label: '编译检测', status: 'pending' },
      { id: 'static', label: '静态检测', status: 'pending' },
      { id: 'unit', label: '单元检测', status: 'pending' },
      { id: 'coverage', label: '覆盖度检测', status: 'pending' }
    ]);
    localStorage.setItem(CURRENT_PROJECT_KEY, hit.id);
  };

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
    if (!prompt.trim()) {
      appendLog('生成失败：提示词不能为空');
      return;
    }
    setBusy(true);
    setAiEditSummary('');
    setAiEditStartSignal((v) => v + 1);
    appendLog('开始调用编排生成接口...');
    try {
      const r = await orchestratorGenerate(prompt);
      if (!r.ok || !r.result) {
        appendLog(`生成失败：${r.error || 'empty result'}`);
        setAiEditFailSignal((v) => v + 1);
        return;
      }
      setGeneratedCode(r.result);
      const briefPrompt = prompt.replace(/\s+/g, ' ').trim();
      const promptText = briefPrompt.length > 42 ? `${briefPrompt.slice(0, 42)}...` : briefPrompt;
      setAiEditSummary(`已按指令“${promptText || '生成代码'}”完成变更，生成结果长度 ${r.result.length}。`);
      setAiEditApplySignal((v) => v + 1);
      appendLog(`生成成功：代码长度=${r.result.length}`);
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
      const selectedFunctionIds = Array.from(
        new Set(
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
      const [risk, ambiguity, missing] = await Promise.all([
        cotQuestion({
          context,
          item: '请给出风险点清单，按“风险-影响-建议”格式输出。'
        }),
        cotQuestion({
          context,
          item: '请给出歧义点清单，按“歧义-需要澄清内容”格式输出。'
        }),
        cotQuestion({
          context,
          item: '请给出缺失信息清单，按“缺失项-建议补充方式”格式输出。'
        })
      ]);
      setQaRisk(String(risk.answer || ''));
      setQaAmbiguity(String(ambiguity.answer || ''));
      setQaMissing(String(missing.answer || ''));
      appendLog('QA分析完成：已生成风险点/歧义点/缺失信息清单');
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
      const started = await gateStart({
        work_dir: rootDir,
        compile_command: 'cmake --build .',
        static_command: 'echo static-check',
        requirement_prompt: prompt,
        generated_result: generatedCode
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
    const uniqueIds = Array.from(new Set(fnNodes.map((n: any) => String(n.functionId))));
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
      <TopBar />
      <Toolbar
        busy={busy}
        backendOk={backendOk}
        onNewProject={doNewProject}
        onOpenProject={doOpenProject}
        onSaveProject={doSaveProject}
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
        aiEditStartSignal={aiEditStartSignal}
        aiEditApplySignal={aiEditApplySignal}
        aiEditFailSignal={aiEditFailSignal}
        aiEditSummary={aiEditSummary}
        onGraphChange={setGraphSnapshot}
        rootDir={rootDir}
        setRootDir={setRootDir}
        prompt={prompt}
        setPrompt={setPrompt}
        generatedCode={generatedCode}
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
        qaBusy={qaBusy}
        onQaAnalyze={() => void runRoutingQa()}
        terminalLines={terminalLines}
        terminalBusy={terminalBusy}
        onRunTerminal={(command) => void runTerminalCommand(command)}
        onRunGate={() => void runGate()}
        onGenerate={() => void runGenerate()}
      />
      {scanManagerOpen && (
        <CodeManagementPanel
          rootDir={rootDir}
          setRootDir={setRootDir}
          onClose={() => setScanManagerOpen(false)}
          onLog={appendLog}
        />
      )}
    </div>
  );
}
