import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ragCancelBackfillDocsJob,
  ragCancelIndexJob,
  ragCancelKindJob,
  ragCancelModuleIndexJob,
  ragDeleteFunctions,
  ragDeleteModules,
  ragEnrichFunction,
  ragGetBackfillDocsJob,
  ragGetFunction,
  ragGetIndexJob,
  ragGetKindJob,
  ragGetModuleIndexJob,
  ragListFunctions,
  ragListIndexedModules,
  ragRunTest,
  ragScan,
  ragSaveFunctionSource,
  ragStartBackfillDocsJob,
  ragStartIndexJob,
  ragStartKindJob,
  ragStartModuleIndexJob,
  ragUploadCodeFiles,
  type RagBackfillDocsJob,
  type FunctionIndexItem,
  type RagIndexJobStatus,
  type RagIndexedModuleItem,
  type RagKindJobStatus,
  type RagModuleIndexJobStatus
} from '../../services/backend';

type CodeManagementPanelProps = {
  rootDir: string;
  setRootDir: (v: string) => void;
  onClose: () => void;
  onLog?: (line: string) => void;
};

export default function CodeManagementPanel(props: CodeManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'functions' | 'modules'>('functions');
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [opBusy, setOpBusy] = useState(false);
  const [error, setError] = useState('');
  const [functions, setFunctions] = useState<FunctionIndexItem[]>([]);
  const [modules, setModules] = useState<RagIndexedModuleItem[]>([]);
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);
  const [selectedModuleKeys, setSelectedModuleKeys] = useState<string[]>([]);
  const [selectedFunctionId, setSelectedFunctionId] = useState('');
  const [selectedModuleKey, setSelectedModuleKey] = useState('');
  const [selectedFunctionDetail, setSelectedFunctionDetail] = useState<any>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [editableCode, setEditableCode] = useState('');
  const [testCommand, setTestCommand] = useState('ctest -N');
  const [testOutput, setTestOutput] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [indexJob, setIndexJob] = useState<RagIndexJobStatus | null>(null);
  const [backfillJob, setBackfillJob] = useState<RagBackfillDocsJob | null>(null);
  const [kindJob, setKindJob] = useState<RagKindJobStatus | null>(null);
  const [moduleIndexJob, setModuleIndexJob] = useState<RagModuleIndexJobStatus | null>(null);
  const [scanStats, setScanStats] = useState<{ files: number; functions: number; at: string } | null>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const cacheScope = String(props.rootDir || '').trim() || 'all';
  const cacheKeyFns = `gaasd:scanmgr:fns:v1:${cacheScope}`;
  const cacheKeyMods = `gaasd:scanmgr:mods:v1:${cacheScope}`;

  const readCache = <T,>(key: string): { total: number; items: T[] } | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      const total = Number(obj?.total ?? 0);
      const items = Array.isArray(obj?.items) ? (obj.items as T[]) : [];
      if (!Number.isFinite(total) || total <= 0 || !items.length) return null;
      return { total, items };
    } catch {
      return null;
    }
  };

  const writeCache = <T,>(key: string, payload: { total: number; items: T[] }) => {
    try {
      localStorage.setItem(key, JSON.stringify({ ...payload, savedAt: Date.now() }));
    } catch {
    }
  };

  const loadAll = async <T,>(loader: (p: { limit: number; offset: number }) => Promise<{ total: number; items: T[] }>) => {
    const limit = 1000;
    let offset = 0;
    const items: T[] = [];
    for (let i = 0; i < 80; i += 1) {
      const r = await loader({ limit, offset });
      const got = Array.isArray((r as any).items) ? ((r as any).items as T[]) : [];
      items.push(...got);
      const total = Number((r as any).total ?? items.length);
      if (items.length >= total) break;
      if (!got.length) break;
      offset += got.length;
    }
    return items;
  };

  const selectedModule = useMemo(
    () => modules.find((m) => m.module_key === selectedModuleKey) || null,
    [modules, selectedModuleKey]
  );

  const loadData = async (opts?: { force?: boolean }) => {
    setError('');
    try {
      const canUseCache = !opts?.force && !query && !moduleFilter && !kindFilter;
      if (canUseCache) {
        const cachedFns = readCache<FunctionIndexItem>(cacheKeyFns);
        const cachedMods = readCache<RagIndexedModuleItem>(cacheKeyMods);
        if (cachedFns) setFunctions(cachedFns.items);
        if (cachedMods) setModules(cachedMods.items);
        const hasCache = Boolean(cachedFns?.items?.length || cachedMods?.items?.length);
        if (hasCache) setLoading(false);

        if (cachedFns && cachedMods) {
          const [headFns, headMods] = await Promise.all([
            ragListFunctions({ root_dir: props.rootDir || undefined, limit: 1, offset: 0 }),
            ragListIndexedModules({ root_dir: props.rootDir || undefined, limit: 1, offset: 0 })
          ]);
          if (Number(headFns.total) === Number(cachedFns.total) && Number(headMods.total) === Number(cachedMods.total)) {
            if (!selectedFunctionId && cachedFns.items.length) setSelectedFunctionId(cachedFns.items[0].function_id);
            if (!selectedModuleKey && cachedMods.items.length) setSelectedModuleKey(cachedMods.items[0].module_key);
            return;
          }
        }
      }

      const hasAny = Boolean(functions.length || modules.length);
      if (!hasAny) setLoading(true);
      const [fns, mods] = await Promise.all([
        loadAll<FunctionIndexItem>(({ limit, offset }) =>
          ragListFunctions({
            root_dir: props.rootDir || undefined,
            q: query || undefined,
            module: moduleFilter || undefined,
            kind: kindFilter || undefined,
            limit,
            offset
          }) as any
        ),
        loadAll<RagIndexedModuleItem>(({ limit, offset }) =>
          ragListIndexedModules({
            root_dir: props.rootDir || undefined,
            q: query || undefined,
            limit,
            offset
          }) as any
        )
      ]);
      setFunctions(fns);
      setModules(mods);
      if (!selectedFunctionId && fns.length) setSelectedFunctionId(fns[0].function_id);
      if (!selectedModuleKey && mods.length) setSelectedModuleKey(mods[0].module_key);
      if (!query && !moduleFilter && !kindFilter) {
        writeCache(cacheKeyFns, { total: fns.length, items: fns });
        writeCache(cacheKeyMods, { total: mods.length, items: mods });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    if (!props.rootDir.trim()) {
      setError('请先填写扫描目录');
      return;
    }
    setScanBusy(true);
    setError('');
    props.onLog?.(`开始扫描目录：${props.rootDir}`);
    try {
      const r = await ragScan(props.rootDir);
      setScanStats({
        files: Number(r.files || 0),
        functions: Number(r.functions || 0),
        at: new Date().toLocaleTimeString()
      });
      props.onLog?.(`扫描完成：files=${r.files} functions=${r.functions}`);
      await loadData({ force: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '扫描失败';
      setError(msg);
      props.onLog?.(`扫描失败：${msg}`);
    } finally {
      setScanBusy(false);
    }
  };

  const onPickFolder = () => {
    folderRef.current?.click();
  };

  const isCppLike = (name: string) => {
    const n = String(name || '').toLowerCase();
    return n.endsWith('.cpp') || n.endsWith('.c') || n.endsWith('.cc') || n.endsWith('.cxx') || n.endsWith('.h') || n.endsWith('.hpp') || n.endsWith('.hh') || n.endsWith('.hxx');
  };

  const onFolderChosen = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    const picked = files
      .map((f) => {
        const anyF = f as any;
        const rel = String(anyF?.webkitRelativePath || f.name);
        return { file: f, relativePath: rel };
      })
      .filter((x) => isCppLike(x.relativePath));
    if (!picked.length) {
      setError('所选目录中未找到源码文件');
      return;
    }
    setUploadBusy(true);
    setUploadProgress({ done: 0, total: picked.length });
    try {
      let uploadId = '';
      let uploadedRoot = '';
      for (let i = 0; i < picked.length; i += 50) {
        const batch = picked.slice(i, i + 50);
        const out = await ragUploadCodeFiles({ files: batch, upload_id: uploadId || undefined });
        uploadId = out.upload_id;
        uploadedRoot = out.root_dir;
        setUploadProgress((v) => ({ ...v, done: Math.min(v.total, v.done + batch.length) }));
      }
      if (uploadedRoot) props.setRootDir(uploadedRoot);
      props.onLog?.(`上传完成：files=${picked.length}`);
      await runScan();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '上传失败';
      setError(msg);
      props.onLog?.(`上传失败：${msg}`);
    } finally {
      setUploadBusy(false);
    }
  };

  const startIndexJob = async () => {
    if (!props.rootDir.trim()) return;
    setOpBusy(true);
    try {
      const r = await ragStartIndexJob(props.rootDir, { enrich: true, max_functions: null });
      const s = await ragGetIndexJob(r.job_id);
      setIndexJob(s.job || null);
      props.onLog?.(`索引任务已启动：${r.job_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '索引任务启动失败');
    } finally {
      setOpBusy(false);
    }
  };

  const startBackfillJob = async () => {
    setOpBusy(true);
    try {
      const r = await ragStartBackfillDocsJob(props.rootDir || null, 2000);
      const s = await ragGetBackfillDocsJob(r.job_id);
      setBackfillJob(s.job || null);
      props.onLog?.(`描述补全任务已启动：${r.job_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '描述补全任务启动失败');
    } finally {
      setOpBusy(false);
    }
  };

  const startKindJob = async () => {
    setOpBusy(true);
    try {
      const r = await ragStartKindJob(props.rootDir || null);
      const s = await ragGetKindJob(r.job_id);
      setKindJob(s.job || null);
      props.onLog?.(`分类整理任务已启动：${r.job_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '分类任务启动失败');
    } finally {
      setOpBusy(false);
    }
  };

  const startModuleIndexJob = async () => {
    if (!props.rootDir.trim()) return;
    setOpBusy(true);
    try {
      const r = await ragStartModuleIndexJob(props.rootDir);
      const s = await ragGetModuleIndexJob(r.job_id);
      setModuleIndexJob(s.job || null);
      props.onLog?.(`模块索引任务已启动：${r.job_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '模块索引任务启动失败');
    } finally {
      setOpBusy(false);
    }
  };

  const loadFunctionDetail = async (functionId: string) => {
    if (!functionId) return;
    setDetailBusy(true);
    try {
      const detail = await ragGetFunction(functionId);
      const data = detail?.function || null;
      setSelectedFunctionDetail(data);
      setEditableCode(String(data?.code || ''));
    } catch {
      setSelectedFunctionDetail(null);
    } finally {
      setDetailBusy(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [props.rootDir, query, moduleFilter, kindFilter]);

  useEffect(() => {
    if (activeTab !== 'functions') return;
    if (!selectedFunctionId) return;
    void loadFunctionDetail(selectedFunctionId);
  }, [activeTab, selectedFunctionId]);

  useEffect(() => {
    if (!indexJob?.job_id || indexJob.error || indexJob.canceled || indexJob.percent >= 100) return;
    const timer = window.setInterval(async () => {
      const out = await ragGetIndexJob(indexJob.job_id);
      if (out.job) setIndexJob(out.job);
      if (out.job?.percent && out.job.percent >= 100) void loadData();
    }, 1200);
    return () => window.clearInterval(timer);
  }, [indexJob?.job_id, indexJob?.percent, indexJob?.error, indexJob?.canceled]);

  useEffect(() => {
    if (!backfillJob?.job_id || backfillJob.error || backfillJob.canceled || backfillJob.percent >= 100) return;
    const timer = window.setInterval(async () => {
      const out = await ragGetBackfillDocsJob(backfillJob.job_id);
      if (out.job) setBackfillJob(out.job);
      if (out.job?.percent && out.job.percent >= 100) void loadData();
    }, 1200);
    return () => window.clearInterval(timer);
  }, [backfillJob?.job_id, backfillJob?.percent, backfillJob?.error, backfillJob?.canceled]);

  useEffect(() => {
    if (!kindJob?.job_id || kindJob.error || kindJob.canceled || kindJob.percent >= 100) return;
    const timer = window.setInterval(async () => {
      const out = await ragGetKindJob(kindJob.job_id);
      if (out.job) setKindJob(out.job);
      if (out.job?.percent && out.job.percent >= 100) void loadData();
    }, 1200);
    return () => window.clearInterval(timer);
  }, [kindJob?.job_id, kindJob?.percent, kindJob?.error, kindJob?.canceled]);

  useEffect(() => {
    if (!moduleIndexJob?.job_id || moduleIndexJob.error || moduleIndexJob.canceled || moduleIndexJob.percent >= 100) return;
    const timer = window.setInterval(async () => {
      const out = await ragGetModuleIndexJob(moduleIndexJob.job_id);
      if (out.job) setModuleIndexJob(out.job);
      if (out.job?.percent && out.job.percent >= 100) void loadData();
    }, 1200);
    return () => window.clearInterval(timer);
  }, [moduleIndexJob?.job_id, moduleIndexJob?.percent, moduleIndexJob?.error, moduleIndexJob?.canceled]);

  return (
    <div className="absolute inset-0 z-50 bg-black/20 flex items-center justify-center p-6">
      <div className="w-[1180px] max-w-[98vw] h-[86vh] rounded-lg border border-[#E1BEE7] bg-white shadow-2xl flex flex-col">
        <div className="h-10 px-3 border-b border-[#E1BEE7] bg-[#F3E5F5] flex items-center justify-between">
          <div className="text-sm font-semibold text-[#6A1B9A]">代码管理</div>
          <button onClick={props.onClose} className="text-xs px-2 py-1 rounded hover:bg-white text-[#6A1B9A]">
            关闭
          </button>
        </div>
        <div className="p-3 space-y-3 text-xs flex-1 min-h-0 flex flex-col">
          <input ref={folderRef} type="file" multiple className="hidden" {...({ webkitdirectory: 'true', directory: 'true' } as any)} onChange={(e) => void onFolderChosen(e.target.files)} />
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
            <div>
              <div className="text-[11px] text-gray-500 mb-1">扫描目录</div>
              <input
                value={props.rootDir}
                onChange={(e) => props.setRootDir(e.target.value)}
                className="w-full h-8 px-2 text-xs border border-[#E1BEE7] rounded outline-none"
              />
            </div>
            <button
              onClick={() => void runScan()}
              disabled={scanBusy}
              className="h-8 px-3 rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C] disabled:opacity-50"
            >
              {scanBusy ? '扫描中...' : '执行扫描'}
            </button>
            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="h-8 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50"
            >
              刷新列表
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onPickFolder} disabled={uploadBusy} className="h-7 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50">
              {uploadBusy ? `上传中 ${uploadProgress.done}/${uploadProgress.total}` : '上传本地代码目录'}
            </button>
            <button onClick={() => void startIndexJob()} disabled={opBusy} className="h-7 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50">函数入库任务</button>
            <button onClick={() => void startBackfillJob()} disabled={opBusy} className="h-7 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50">描述补全任务</button>
            <button onClick={() => void startKindJob()} disabled={opBusy} className="h-7 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50">分类整理任务</button>
            <button onClick={() => void startModuleIndexJob()} disabled={opBusy} className="h-7 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50">模块索引任务</button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[11px]">
            <div className="rounded border border-[#E1BEE7] p-2">
              <div className="text-gray-500">函数入库</div>
              <div className="mt-1 text-[#6A1B9A]">{indexJob ? `${Math.floor(indexJob.percent || 0)}% · ${indexJob.stage}` : '-'}</div>
              {indexJob?.job_id && indexJob.percent < 100 && !indexJob.error && !indexJob.canceled && (
                <button onClick={() => void ragCancelIndexJob(indexJob.job_id)} className="mt-1 text-[10px] text-red-500">取消</button>
              )}
            </div>
            <div className="rounded border border-[#E1BEE7] p-2">
              <div className="text-gray-500">描述补全</div>
              <div className="mt-1 text-[#6A1B9A]">{backfillJob ? `${Math.floor(backfillJob.percent || 0)}% · ${backfillJob.stage}` : '-'}</div>
              {backfillJob?.job_id && backfillJob.percent < 100 && !backfillJob.error && !backfillJob.canceled && (
                <button onClick={() => void ragCancelBackfillDocsJob(backfillJob.job_id)} className="mt-1 text-[10px] text-red-500">取消</button>
              )}
            </div>
            <div className="rounded border border-[#E1BEE7] p-2">
              <div className="text-gray-500">分类整理</div>
              <div className="mt-1 text-[#6A1B9A]">{kindJob ? `${Math.floor(kindJob.percent || 0)}% · ${kindJob.stage}` : '-'}</div>
              {kindJob?.job_id && kindJob.percent < 100 && !kindJob.error && !kindJob.canceled && (
                <button onClick={() => void ragCancelKindJob(kindJob.job_id)} className="mt-1 text-[10px] text-red-500">取消</button>
              )}
            </div>
            <div className="rounded border border-[#E1BEE7] p-2">
              <div className="text-gray-500">模块索引</div>
              <div className="mt-1 text-[#6A1B9A]">{moduleIndexJob ? `${Math.floor(moduleIndexJob.percent || 0)}% · ${moduleIndexJob.stage}` : '-'}</div>
              {moduleIndexJob?.job_id && moduleIndexJob.percent < 100 && !moduleIndexJob.error && !moduleIndexJob.canceled && (
                <button onClick={() => void ragCancelModuleIndexJob(moduleIndexJob.job_id)} className="mt-1 text-[10px] text-red-500">取消</button>
              )}
            </div>
          </div>
          <div className="rounded border border-[#E1BEE7] bg-[#FAF5FB] p-2 text-[11px] text-gray-700">
            {!scanStats && <div>暂无扫描结果</div>}
            {scanStats && (
              <div className="grid grid-cols-2 gap-y-1">
                <div>时间：{scanStats.at}</div>
                <div>文件数：{scanStats.files}</div>
                <div>函数数：{scanStats.functions}</div>
                <div>模块数：{modules.length}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-b border-[#E1BEE7] pb-2">
            <button
              onClick={() => setActiveTab('functions')}
              className={`px-3 h-7 rounded ${activeTab === 'functions' ? 'bg-[#F3E5F5] text-[#6A1B9A]' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              函数列表（{functions.length}）
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-3 h-7 rounded ${activeTab === 'modules' ? 'bg-[#F3E5F5] text-[#6A1B9A]' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              模块列表（{modules.length}）
            </button>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索函数/模块"
              className="ml-auto w-[280px] h-7 px-2 text-xs border border-[#E1BEE7] rounded outline-none"
            />
            <input
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              placeholder="模块过滤"
              className="w-[180px] h-7 px-2 text-xs border border-[#E1BEE7] rounded outline-none"
            />
            <input
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              placeholder="分类过滤"
              className="w-[130px] h-7 px-2 text-xs border border-[#E1BEE7] rounded outline-none"
            />
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-[42%_58%] gap-3">
            <div className="rounded border border-[#E1BEE7] overflow-auto">
              {loading && <div className="p-3 text-xs text-gray-500">加载中...</div>}
              {!loading && !!error && <div className="p-3 text-xs text-red-600">{error}</div>}
              {!loading && !error && activeTab === 'functions' && (
                <div className="divide-y divide-[#F1E4F6]">
                  {functions.length === 0 && <div className="p-3 text-xs text-gray-500">暂无函数记录</div>}
                  {!!functions.length && (
                    <div className="px-3 py-2 border-b border-[#F1E4F6] flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!selectedFunctionIds.length) return;
                          await ragDeleteFunctions(selectedFunctionIds);
                          setSelectedFunctionIds([]);
                          await loadData();
                        }}
                        className="h-6 px-2 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA]"
                      >
                        删除选中函数
                      </button>
                    </div>
                  )}
                  {functions.map((fn) => (
                    <div key={fn.function_id} className={`px-3 py-2 text-[11px] ${selectedFunctionId === fn.function_id ? 'bg-[#F8ECFA]' : 'hover:bg-[#FAF7FC]'}`}>
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFunctionIds.includes(fn.function_id)}
                          onChange={(e) =>
                            setSelectedFunctionIds((prev) =>
                              e.target.checked ? [...prev, fn.function_id] : prev.filter((x) => x !== fn.function_id)
                            )
                          }
                        />
                        <button onClick={() => setSelectedFunctionId(fn.function_id)} className="text-left flex-1">
                          <div className="font-semibold text-[#4A148C] truncate">{fn.display_name || fn.function_id}</div>
                          <div className="text-gray-500 mt-0.5 truncate">模块：{fn.module}</div>
                          <div className="text-gray-400 mt-0.5 truncate">
                            {fn.file_path}:{fn.start_line}-{fn.end_line}
                          </div>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && !error && activeTab === 'modules' && (
                <div className="divide-y divide-[#F1E4F6]">
                  {modules.length === 0 && <div className="p-3 text-xs text-gray-500">暂无模块记录</div>}
                  {!!modules.length && (
                    <div className="px-3 py-2 border-b border-[#F1E4F6] flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!selectedModuleKeys.length) return;
                          await ragDeleteModules(selectedModuleKeys);
                          setSelectedModuleKeys([]);
                          await loadData();
                        }}
                        className="h-6 px-2 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA]"
                      >
                        删除选中模块
                      </button>
                    </div>
                  )}
                  {modules.map((m) => (
                    <div key={m.module_key} className={`px-3 py-2 text-[11px] ${selectedModuleKey === m.module_key ? 'bg-[#F8ECFA]' : 'hover:bg-[#FAF7FC]'}`}>
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedModuleKeys.includes(m.module_key)}
                          onChange={(e) =>
                            setSelectedModuleKeys((prev) =>
                              e.target.checked ? [...prev, m.module_key] : prev.filter((x) => x !== m.module_key)
                            )
                          }
                        />
                        <button onClick={() => setSelectedModuleKey(m.module_key)} className="text-left flex-1">
                          <div className="font-semibold text-[#4A148C] truncate">{m.display_name || m.module_key}</div>
                          <div className="text-gray-500 mt-0.5 truncate">模块Key：{m.module_key}</div>
                          <div className="text-gray-400 mt-0.5 truncate">
                            节点/边：{m.node_count}/{m.edge_count}
                          </div>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded border border-[#E1BEE7] overflow-auto p-3 text-[11px] text-gray-600">
              {activeTab === 'functions' && !selectedFunctionId && <div>请选择函数查看详情</div>}
              {activeTab === 'functions' && selectedFunctionId && detailBusy && <div>详情加载中...</div>}
              {activeTab === 'functions' && selectedFunctionId && !detailBusy && selectedFunctionDetail && (
                <div className="space-y-2">
                  <div><span className="text-gray-400">名称：</span>{selectedFunctionDetail.display_name || selectedFunctionDetail.name || '-'}</div>
                  <div><span className="text-gray-400">函数ID：</span>{selectedFunctionDetail.function_id || selectedFunctionId}</div>
                  <div><span className="text-gray-400">模块：</span>{selectedFunctionDetail.module || '-'}</div>
                  <div><span className="text-gray-400">签名：</span>{selectedFunctionDetail.signature || '-'}</div>
                  <div><span className="text-gray-400">文件：</span>{selectedFunctionDetail.file_path || '-'}</div>
                  <div><span className="text-gray-400">说明：</span>{selectedFunctionDetail.doc_zh || '-'}</div>
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await ragEnrichFunction(selectedFunctionId, props.rootDir || null);
                          await loadFunctionDetail(selectedFunctionId);
                        }}
                        className="h-7 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA]"
                      >
                        生成描述
                      </button>
                      <button
                        onClick={async () => {
                          await ragSaveFunctionSource({
                            function_id: selectedFunctionId,
                            new_code: editableCode,
                            write_file: true,
                            root_dir: props.rootDir || null,
                            re_enrich: true
                          });
                          await loadFunctionDetail(selectedFunctionId);
                        }}
                        className="h-7 px-3 rounded bg-[#6A1B9A] text-white"
                      >
                        保存代码
                      </button>
                    </div>
                    <div className="text-gray-400 mb-1">代码</div>
                    <textarea
                      value={editableCode}
                      onChange={(e) => setEditableCode(e.target.value)}
                      className="w-full h-44 bg-[#FAF7FC] border border-[#EDE3F4] rounded p-2 text-[10px] leading-4 outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input value={testCommand} onChange={(e) => setTestCommand(e.target.value)} className="flex-1 h-7 px-2 border border-[#E1BEE7] rounded outline-none" />
                      <button
                        onClick={async () => {
                          const out = await ragRunTest({ cwd: props.rootDir || '.', command: testCommand, timeout_ms: 60000 });
                          setTestOutput(`exit=${out.returncode}\nstdout:\n${out.stdout || ''}\nstderr:\n${out.stderr || ''}`);
                        }}
                        className="h-7 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA]"
                      >
                        测试运行
                      </button>
                    </div>
                    {!!testOutput && <pre className="bg-[#FAF7FC] border border-[#EDE3F4] rounded p-2 text-[10px] leading-4 overflow-auto whitespace-pre-wrap h-28">{testOutput}</pre>}
                  </div>
                </div>
              )}
              {activeTab === 'functions' && selectedFunctionId && !detailBusy && !selectedFunctionDetail && <div>未获取到函数详情</div>}
              {activeTab === 'modules' && !selectedModule && <div>请选择模块查看详情</div>}
              {activeTab === 'modules' && selectedModule && (
                <div className="space-y-2">
                  <div><span className="text-gray-400">名称：</span>{selectedModule.display_name || '-'}</div>
                  <div><span className="text-gray-400">模块Key：</span>{selectedModule.module_key}</div>
                  <div><span className="text-gray-400">来源：</span>{selectedModule.source || '-'}</div>
                  <div><span className="text-gray-400">节点/边：</span>{selectedModule.node_count}/{selectedModule.edge_count}</div>
                  <div><span className="text-gray-400">Root Dir：</span>{selectedModule.root_dir || '-'}</div>
                  <div><span className="text-gray-400">说明：</span>{selectedModule.doc_zh || '-'}</div>
                  <div className="pt-2">
                    <div className="text-gray-400 mb-1">nodes_json</div>
                    <pre className="bg-[#FAF7FC] border border-[#EDE3F4] rounded p-2 text-[10px] leading-4 overflow-auto whitespace-pre-wrap h-32">
                      {selectedModule.nodes_json || '[]'}
                    </pre>
                  </div>
                  <div className="pt-1">
                    <div className="text-gray-400 mb-1">edges_json</div>
                    <pre className="bg-[#FAF7FC] border border-[#EDE3F4] rounded p-2 text-[10px] leading-4 overflow-auto whitespace-pre-wrap h-24">
                      {selectedModule.edges_json || '[]'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
