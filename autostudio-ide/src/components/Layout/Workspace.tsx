import { Panel, Group, Separator } from 'react-resizable-panels';
import { Search, RotateCw, ChevronDown, ChevronRight, X, Maximize2, LayoutGrid, LayoutList, Plus, Play, Check, Loader2 } from 'lucide-react';
import type React from 'react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  codegenGlue,
  cotQuestion,
  cotRefine,
  cotGeneratePrompt,
  ragGetFunction,
  ragGetModule,
  ragListFunctions,
  ragListIndexedModules,
  ragRepairModuleFromPath,
  type FunctionIndexItem,
  type RagIndexedModuleItem
} from '../../services/backend';

// --- Reusable Components ---

const PanelHeader = ({ title, onClose, actions }: { title: string, onClose?: () => void, actions?: React.ReactNode }) => (
  <div className="h-8 bg-[#F3E5F5] border-b border-[#E1BEE7] flex items-center justify-between px-2 shrink-0 select-none">
    <span className="text-xs font-bold text-[#6A1B9A] px-2 border-b-2 border-[#6A1B9A] h-full flex items-center">{title}</span>
    <div className="flex items-center gap-1">
      {actions}
      {onClose && <X className="w-3 h-3 text-[#6A1B9A] cursor-pointer hover:text-red-500" />}
    </div>
  </div>
);

const SearchBar = () => (
  <div className="p-2 border-b border-[#E1BEE7] flex items-center gap-2 bg-white shrink-0">
    <Search className="w-3 h-3 text-gray-400" />
    <input 
      type="text" 
      placeholder="请输入内容" 
      className="text-xs w-full outline-none text-gray-600 placeholder-gray-400"
    />
    <div className="flex flex-col gap-0.5">
      <ChevronDown className="w-2 h-2 text-gray-400 cursor-pointer" />
      <ChevronDown className="w-2 h-2 text-gray-400 cursor-pointer rotate-180" />
    </div>
    <RotateCw className="w-3 h-3 text-[#6A1B9A] cursor-pointer" />
  </div>
);


type TreeItemProps = { label: string; icon?: any; children?: React.ReactNode; defaultOpen?: boolean };

const TreeItem: React.FC<TreeItemProps> = ({ label, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="pl-2">
      <div 
        className="flex items-center gap-1 py-1 hover:bg-[#F3E5F5] cursor-pointer text-xs text-gray-700 select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {children ? (
          isOpen ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />
        ) : <div className="w-3" />}
        {Icon && <Icon className="w-3 h-3 text-[#AB47BC]" />}
        <span>{label}</span>
      </div>
      {isOpen && children && <div className="pl-2 border-l border-gray-100 ml-1.5">{children}</div>}
    </div>
  );
};

// --- Panels ---

type SelectedLibraryItem =
  | { type: 'function'; data: FunctionIndexItem }
  | { type: 'module'; data: RagIndexedModuleItem }
  | null;

const ComponentLibrary = (props: {
  rootDir: string;
  selectedItem: SelectedLibraryItem;
  onSelectItem: (item: SelectedLibraryItem) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'function' | 'module'>('function');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [functions, setFunctions] = useState<FunctionIndexItem[]>([]);
  const [modules, setModules] = useState<RagIndexedModuleItem[]>([]);
  const didRepairRef = useRef(false);
  const cacheScope = String(props.rootDir || '').trim() || 'all';
  const cacheKeyFns = `gaasd:library:fns:v1:${cacheScope}`;
  const cacheKeyMods = `gaasd:library:mods:v1:${cacheScope}`;

  const readCache = <T,>(key: string): { total: number; items: T[] } | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      const total = Number(obj?.total ?? 0);
      const items = Array.isArray(obj?.items) ? (obj.items as T[]) : [];
      if (!Number.isFinite(total) || total <= 0) return null;
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

  const normalizeCategory = (v: string) => {
    const s = String(v || '').trim().toLowerCase();
    if (!s) return '';
    if (s.includes('control') || s.includes('控制')) return 'control';
    if (s.includes('decision') || s.includes('决策')) return 'decision';
    if (s.includes('localization') || s.includes('定位') || s === 'loc') return 'localization';
    if (s.includes('perception') || s.includes('感知')) return 'perception';
    if (s.includes('planning') || s.includes('规划')) return 'planning';
    return s;
  };

  const detectBaseBucket = (hint: string) => {
    const s = String(hint || '').toLowerCase();
    if (s.includes('glue') || s.startsWith('glue:')) return 'glue';
    if (s.includes('platform') || s.includes('infra') || s.includes('infrastructure')) return 'platform';
    return '';
  };

  const detectCategoryFromPath = (hint: string) => {
    const s = String(hint || '').toLowerCase();
    if (s.includes('\\control\\') || s.includes('/control/')) return 'control';
    if (s.includes('\\decision\\') || s.includes('/decision/')) return 'decision';
    if (s.includes('\\localization\\') || s.includes('/localization/')) return 'localization';
    if (s.includes('\\perception\\') || s.includes('/perception/')) return 'perception';
    if (s.includes('\\planning\\') || s.includes('/planning/')) return 'planning';
    return '';
  };

  const glueSubLabel = (k: string) => {
    if (k === 'math') return '数学运算';
    if (k === 'stmt') return '语句函数';
    if (k === 'sys') return '系统与工具';
    if (k === 'geo') return '几何与坐标变换';
    return '其他';
  };

  const classifyGlueSub = (fn: FunctionIndexItem) => {
    const hint = `${fn.display_name} ${fn.signature} ${fn.function_id} ${fn.file_path}`.toLowerCase();
    const hasAny = (xs: string[]) => xs.some((x) => hint.includes(x));
    if (
      hasAny([
        'transform',
        'tf',
        'quaternion',
        'rotation',
        'euler',
        'yaw',
        'pitch',
        'roll',
        'deg',
        'rad',
        'coordinate',
        'utm',
        'geod',
        'lat',
        'lon',
        'pose',
        'odom',
        'heading',
        'distance',
        'point',
        'vector',
        'map'
      ]) ||
      /坐标|经纬度|投影|变换|旋转|四元数|姿态|几何|距离|角度|方位/.test(hint)
    ) {
      return 'geo';
    }
    if (
      hasAny(['sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'pow', 'exp', 'log', 'abs', 'fmod', 'clamp', 'lerp', 'interpol', 'dot', 'cross', 'matrix']) ||
      /数学|欧几里得|插值|向量|矩阵/.test(hint)
    ) {
      return 'math';
    }
    if (
      hasAny([' bool ', 'bool', 'is_', 'is', 'has_', 'has', 'check', 'validate', 'ensure', 'compare', 'equal', 'less', 'greater', 'inrange', 'within']) ||
      /判断|检查|是否|校验|对比|相等|范围/.test(hint)
    ) {
      return 'stmt';
    }
    if (
      hasAny([
        'log',
        'logger',
        'printf',
        'format',
        'string',
        'time',
        'clock',
        'file',
        'path',
        'config',
        'json',
        'yaml',
        'thread',
        'mutex',
        'sleep',
        'delay',
        'util',
        'helper',
        'convert',
        'parse',
        'serialize',
        'encode',
        'decode',
        'hash',
        'crc',
        'uuid',
        'random'
      ]) ||
      /日志|时间|配置|文件|路径|解析|序列化|编码|解码|工具/.test(hint)
    ) {
      return 'sys';
    }
    return 'other';
  };

  const featureLabel = (k: string) => {
    if (k === 'control') return '控制';
    if (k === 'decision') return '决策';
    if (k === 'localization') return '定位';
    if (k === 'perception') return '感知';
    if (k === 'planning') return '规划';
    return '其他';
  };

  const groupFunctions = useMemo(() => {
    const baseGlue: FunctionIndexItem[] = [];
    const basePlatform: FunctionIndexItem[] = [];
    const feature: Record<string, FunctionIndexItem[]> = {
      control: [],
      decision: [],
      localization: [],
      perception: [],
      planning: [],
      other: []
    };

    const distributeUnknown: FunctionIndexItem[] = [];
    const glueGroups: Record<string, FunctionIndexItem[]> = { math: [], stmt: [], sys: [], geo: [], other: [] };

    for (const fn of functions) {
      const kind = String((fn as any).kind || '').toLowerCase();
      if (kind === 'glue') {
        baseGlue.push(fn);
        glueGroups[classifyGlueSub(fn)].push(fn);
        continue;
      }
      if (kind === 'platform') {
        basePlatform.push(fn);
        continue;
      }

      const cat1 = normalizeCategory(fn.module);
      const cat2 = detectCategoryFromPath(`${fn.file_path} ${fn.function_id}`);
      const cat = (cat1 && cat1 !== 'common') ? cat1 : cat2;
      const key =
        cat === 'control' || cat === 'decision' || cat === 'localization' || cat === 'perception' || cat === 'planning'
          ? cat
          : 'other';
      if (key === 'other') distributeUnknown.push(fn);
      feature[key].push(fn);
    }

    const knownCount = feature.control.length + feature.decision.length + feature.localization.length + feature.perception.length + feature.planning.length;
    if (feature.other.length > 200 && knownCount > 0) {
      const buckets: Array<keyof typeof feature> = ['control', 'decision', 'localization', 'perception', 'planning'];
      const target = new Map<keyof typeof feature, number>(buckets.map((k) => [k, feature[k].length]));
      const others = [...distributeUnknown];
      feature.other = feature.other.filter((fn) => !distributeUnknown.includes(fn));
      let idx = 0;
      for (const fn of others) {
        const k = buckets[idx % buckets.length];
        feature[k].push(fn);
        target.set(k, (target.get(k) || 0) + 1);
        idx += 1;
      }
    }

    return { baseGlue, basePlatform, feature, glueGroups };
  }, [functions]);

  const groupModules = useMemo(() => {
    const baseCandidates: Array<{ m: RagIndexedModuleItem; kind: 'glue' | 'platform' }> = [];
    const feature: Record<string, RagIndexedModuleItem[]> = {
      control: [],
      decision: [],
      localization: [],
      perception: [],
      planning: [],
      other: []
    };

    const platformSubLabel = (k: string) => {
      if (k === 'sys') return '系统与工具';
      if (k === 'config') return '配置与参数';
      if (k === 'log') return '日志与监控';
      if (k === 'io') return '文件与IO';
      if (k === 'time') return '并发与时间';
      if (k === 'ser') return '序列化与编码';
      return '其他';
    };

    const classifyPlatformSub = (m: RagIndexedModuleItem) => {
      const hint = `${m.module_key} ${m.display_name} ${m.doc_zh} ${m.root_dir}`.toLowerCase();
      const hasAny = (xs: string[]) => xs.some((x) => hint.includes(x));
      if (hasAny(['config', 'yaml', 'json', 'toml', 'param', 'flag', 'option']) || /配置|参数|开关|选项/.test(hint)) return 'config';
      if (hasAny(['log', 'logger', 'metric', 'monitor', 'telemetry', 'trace', 'span', 'profil']) || /日志|监控|指标|埋点|追踪/.test(hint)) return 'log';
      if (hasAny(['file', 'path', 'dir', 'folder', 'fs', 'read', 'write', 'stream', 'socket', 'http', 'rpc', 'serial', 'can']) ||
          /文件|路径|目录|读写|网络|通信|串口|CAN/.test(hint)) return 'io';
      if (hasAny(['thread', 'mutex', 'lock', 'atomic', 'queue', 'timer', 'time', 'clock', 'sleep', 'rate']) || /线程|互斥|锁|队列|定时|时间|时钟/.test(hint)) return 'time';
      if (hasAny(['protobuf', 'proto', 'msgpack', 'serialize', 'deserialize', 'encode', 'decode', 'base64', 'crc', 'hash']) ||
          /序列化|反序列化|编码|解码|校验|哈希/.test(hint)) return 'ser';
      if (hasAny(['util', 'utils', 'common', 'helper', 'tool', 'system', 'os']) || /工具|系统|通用/.test(hint)) return 'sys';
      return 'other';
    };

    const shouldTreatGlueAsPlatform = (m: RagIndexedModuleItem) => {
      const hint = `${m.module_key} ${m.display_name} ${m.doc_zh} ${m.root_dir}`.toLowerCase();
      if (
        hint.includes('config') ||
        hint.includes('logger') ||
        hint.includes('log') ||
        hint.includes('util') ||
        hint.includes('utils') ||
        hint.includes('tool') ||
        hint.includes('file') ||
        hint.includes('path') ||
        hint.includes('thread') ||
        hint.includes('mutex') ||
        hint.includes('time') ||
        hint.includes('clock') ||
        hint.includes('json') ||
        hint.includes('yaml') ||
        hint.includes('encode') ||
        hint.includes('decode')
      ) {
        return true;
      }

      try {
        const nodes = JSON.parse(String(m.nodes_json || '[]')) as any;
        if (Array.isArray(nodes)) {
          let glue = 0;
          let platform = 0;
          for (const n of nodes) {
            const k = String(n?.kind || '').toLowerCase();
            if (k === 'platform') platform += 1;
            if (k === 'glue') glue += 1;
          }
          if (platform > 0 && platform >= glue) return true;
        }
      } catch {
      }
      return false;
    };

    const pickCategoryForModule = (m: RagIndexedModuleItem) => {
      const hint = `${m.module_key} ${m.display_name} ${m.doc_zh} ${m.root_dir}`;
      const fromText = normalizeCategory(hint);
      if (fromText && fromText !== 'common') return fromText;

      try {
        const nodes = JSON.parse(String(m.nodes_json || '[]')) as any;
        if (Array.isArray(nodes)) {
          const cats: string[] = [];
          for (const n of nodes) {
            const fid = String(n?.function_id || n?.functionId || '');
            const fp = String(n?.file_path || '');
            const cat = detectCategoryFromPath(`${fp} ${fid}`) || normalizeCategory(String(n?.module || ''));
            if (cat) cats.push(cat);
          }
          const counts = new Map<string, number>();
          for (const c of cats) counts.set(c, (counts.get(c) || 0) + 1);
          const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
          if (sorted.length) return sorted[0][0];
        }
      } catch {
      }
      return '';
    };

    const pickKindForModule = (m: RagIndexedModuleItem) => {
      try {
        const nodes = JSON.parse(String(m.nodes_json || '[]')) as any;
        if (Array.isArray(nodes)) {
          const counts = new Map<string, number>();
          for (const n of nodes) {
            const k = String(n?.kind || '').toLowerCase();
            if (!k) continue;
            counts.set(k, (counts.get(k) || 0) + 1);
          }
          const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
          if (sorted.length) return sorted[0][0];
        }
      } catch {
      }
      return '';
    };

    const fillToMinimum = (dst: RagIndexedModuleItem[], pool: RagIndexedModuleItem[], min: number) => {
      if (dst.length >= min) return;
      while (dst.length < min && pool.length) {
        const x = pool.shift();
        if (!x) break;
        dst.push(x);
      }
    };

    for (const m of modules) {
      const kind = pickKindForModule(m) || detectBaseBucket(`${m.module_key} ${m.display_name} ${m.doc_zh} ${m.root_dir}`);
      if (kind === 'glue') {
        baseCandidates.push({ m, kind: 'glue' });
        continue;
      }
      if (kind === 'platform') {
        baseCandidates.push({ m, kind: 'platform' });
        continue;
      }

      const cat = pickCategoryForModule(m);
      const key =
        cat === 'control' || cat === 'decision' || cat === 'localization' || cat === 'perception' || cat === 'planning'
          ? cat
          : 'other';
      feature[key].push(m);
    }

    const capBase = 50;
    const baseSorted = [...baseCandidates]
      .sort((a, b) => {
        const ta = Date.parse(String(a.m.updated_at || '')) || 0;
        const tb = Date.parse(String(b.m.updated_at || '')) || 0;
        if (tb !== ta) return tb - ta;
        return String(a.m.module_key || '').localeCompare(String(b.m.module_key || ''));
      });
    const chosen = baseSorted.slice(0, capBase);
    const chosenKey = new Set(chosen.map((x) => x.m.module_key));
    const baseGlue: RagIndexedModuleItem[] = [];
    const basePlatform: RagIndexedModuleItem[] = [];
    const platformGroups: Record<string, RagIndexedModuleItem[]> = { sys: [], config: [], log: [], io: [], time: [], ser: [], other: [] };

    for (const x of chosen) {
      const m = x.m;
      const isPlatform = x.kind === 'platform' || (x.kind === 'glue' && shouldTreatGlueAsPlatform(m));
      if (isPlatform) {
        basePlatform.push(m);
        platformGroups[classifyPlatformSub(m)].push(m);
      } else {
        baseGlue.push(m);
      }
    }

    for (const x of baseSorted.slice(capBase)) {
      const m = x.m;
      if (!m || chosenKey.has(m.module_key)) continue;
      const cat = pickCategoryForModule(m);
      const key =
        cat === 'control' || cat === 'decision' || cat === 'localization' || cat === 'perception' || cat === 'planning'
          ? cat
          : 'other';
      feature[key].push(m);
    }

    const otherPool = [...feature.other];
    feature.other = [];
    fillToMinimum(feature.control, otherPool, 5);
    fillToMinimum(feature.decision, otherPool, 5);
    fillToMinimum(feature.localization, otherPool, 5);
    fillToMinimum(feature.perception, otherPool, 5);
    fillToMinimum(feature.planning, otherPool, 5);
    feature.other = otherPool;

    return { baseGlue, basePlatform, platformGroups, platformSubLabel, feature };
  }, [modules]);

  const loadAll = async <T,>(loader: (p: { q?: string; limit: number; offset: number }) => Promise<{ total: number; items: T[] }>) => {
    const limit = 1000;
    let offset = 0;
    const items: T[] = [];
    for (let i = 0; i < 50; i += 1) {
      const r = await loader({ q: query || undefined, limit, offset });
      const got = Array.isArray((r as any).items) ? (r as any).items : [];
      items.push(...got);
      const total = Number((r as any).total || items.length);
      if (items.length >= total) break;
      if (!got.length) break;
      offset += got.length;
    }
    return { total: items.length, items };
  };

  const loadLibraryData = async (opts?: { force?: boolean }) => {
    setError('');
    try {
      const useCache = !opts?.force && !query.trim();
      if (useCache) {
        const cachedFns = readCache<FunctionIndexItem>(cacheKeyFns);
        const cachedMods = readCache<RagIndexedModuleItem>(cacheKeyMods);
        if (cachedFns?.items?.length) setFunctions(cachedFns.items);
        if (cachedMods?.items?.length) setModules(cachedMods.items);
        const hasCache = Boolean(cachedFns?.items?.length || cachedMods?.items?.length);
        if (hasCache) setLoading(false);

        if (cachedFns && cachedMods) {
          const [headFns, headMods] = await Promise.all([
            ragListFunctions({ limit: 1, offset: 0 }),
            ragListIndexedModules({ limit: 1, offset: 0 })
          ]);
          const sameTotal = Number(headFns.total) === Number(cachedFns.total) && Number(headMods.total) === Number(cachedMods.total);
          if (sameTotal) return;
        }
      }

      const hasAny = Boolean(functions.length || modules.length);
      if (!hasAny) setLoading(true);
      const [fns, mods] = await Promise.all([
        loadAll<FunctionIndexItem>(({ q, limit, offset }) => ragListFunctions({ q, limit, offset }) as any),
        loadAll<RagIndexedModuleItem>(({ q, limit, offset }) => ragListIndexedModules({ q, limit, offset }) as any)
      ]);
      setFunctions(fns.items);
      setModules(mods.items);
      if (!query.trim()) {
        writeCache(cacheKeyFns, { total: fns.items.length, items: fns.items });
        writeCache(cacheKeyMods, { total: mods.items.length, items: mods.items });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didRepairRef.current) return;
    didRepairRef.current = true;
    try {
      const key = 'gaasd:rag:repairModuleFromPath:done';
      if (localStorage.getItem(key) === '1') return;
      localStorage.setItem(key, '1');
      void ragRepairModuleFromPath(props.rootDir || null).then(() => {
        if (!query.trim()) void loadLibraryData();
      });
    } catch {
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLibraryData();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex p-1 gap-1 bg-white border-b border-[#E1BEE7] shrink-0">
        <button 
          className={clsx(
            "flex-1 py-1 text-[10px] rounded font-medium transition-colors",
            activeTab === 'function' ? "bg-[#F3E5F5] text-[#6A1B9A]" : "text-gray-500 hover:bg-gray-50"
          )}
          onClick={() => setActiveTab('function')}
        >
          函数组件库
        </button>
        <button 
          className={clsx(
            "flex-1 py-1 text-[10px] rounded font-medium transition-colors",
            activeTab === 'module' ? "bg-[#F3E5F5] text-[#6A1B9A]" : "text-gray-500 hover:bg-gray-50"
          )}
          onClick={() => setActiveTab('module')}
        >
          模块组件库
        </button>
      </div>
      <div className="p-2 border-b border-[#E1BEE7] flex items-center gap-2 bg-white shrink-0">
        <Search className="w-3 h-3 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索函数/模块"
          className="text-xs w-full outline-none text-gray-600 placeholder-gray-400"
        />
        <RotateCw className="w-3 h-3 text-[#6A1B9A] cursor-pointer" onClick={() => void loadLibraryData({ force: true })} />
      </div>
      <div className="flex-1 overflow-auto p-1">
        {loading && <div className="px-2 py-2 text-xs text-gray-500">加载中...</div>}
        {!!error && <div className="px-2 py-2 text-xs text-red-600">{error}</div>}
        {activeTab === 'function' ? (
          <>
            <div className="px-2 py-1 text-[10px] text-gray-500">已索引函数：{functions.length}</div>
            {functions.length === 0 && !loading ? (
              <div className="p-2 text-xs text-gray-500 text-center">暂无已索引函数</div>
            ) : (
              <>
                <TreeItem label={`基础模块库 (${groupFunctions.baseGlue.length + groupFunctions.basePlatform.length})`} defaultOpen={true}>
                  <TreeItem label={`glue工程胶水 (${groupFunctions.baseGlue.length})`} defaultOpen={false}>
                    {(['math', 'stmt', 'sys', 'geo', 'other'] as const).map((k) => (
                      <TreeItem key={k} label={`${glueSubLabel(k)} (${groupFunctions.glueGroups[k].length})`} defaultOpen={false}>
                        {groupFunctions.glueGroups[k].map((fn) => (
                          <button
                            key={fn.function_id}
                            onClick={() => props.onSelectItem({ type: 'function', data: fn })}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'application/x-ai-cbdes-fn',
                                JSON.stringify({
                                  function_id: String(fn.function_id),
                                  display_name: String(fn.display_name || fn.signature || fn.function_id),
                                  module: String(fn.module || ''),
                                  kind: 'node',
                                  file_path: String(fn.file_path || ''),
                                  signature: String(fn.signature || ''),
                                  inputs_json: String(fn.inputs_json || '{}'),
                                  outputs_json: String(fn.outputs_json || '{}')
                                })
                              );
                            }}
                            className={clsx(
                              "w-full text-left text-xs py-1 px-2 rounded flex items-center gap-1 cursor-grab",
                              props.selectedItem?.type === 'function' && props.selectedItem.data.function_id === fn.function_id
                                ? "bg-[#F3E5F5] text-[#6A1B9A]"
                                : "hover:bg-[#F8ECFA] text-gray-700"
                            )}
                          >
                            <LayoutGrid className="w-3 h-3 shrink-0" />
                            <span className="truncate">{fn.display_name || fn.function_id}</span>
                          </button>
                        ))}
                      </TreeItem>
                    ))}
                  </TreeItem>
                  <TreeItem label={`platform基础设施 (${groupFunctions.basePlatform.length})`} defaultOpen={false}>
                    {groupFunctions.basePlatform.map((fn) => (
                      <button
                        key={fn.function_id}
                        onClick={() => props.onSelectItem({ type: 'function', data: fn })}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/x-ai-cbdes-fn',
                            JSON.stringify({
                              function_id: String(fn.function_id),
                              display_name: String(fn.display_name || fn.signature || fn.function_id),
                              module: String(fn.module || ''),
                              kind: 'node',
                              file_path: String(fn.file_path || ''),
                              signature: String(fn.signature || ''),
                              inputs_json: String(fn.inputs_json || '{}'),
                              outputs_json: String(fn.outputs_json || '{}')
                            })
                          );
                        }}
                        className={clsx(
                          "w-full text-left text-xs py-1 px-2 rounded flex items-center gap-1 cursor-grab",
                          props.selectedItem?.type === 'function' && props.selectedItem.data.function_id === fn.function_id
                            ? "bg-[#F3E5F5] text-[#6A1B9A]"
                            : "hover:bg-[#F8ECFA] text-gray-700"
                        )}
                      >
                        <LayoutGrid className="w-3 h-3 shrink-0" />
                        <span className="truncate">{fn.display_name || fn.function_id}</span>
                      </button>
                    ))}
                  </TreeItem>
                </TreeItem>
                <TreeItem
                  label={`功能模块库 (${Object.values(groupFunctions.feature).reduce((s, a) => s + a.length, 0)})`}
                  defaultOpen={true}
                >
                  <TreeItem label={`node关键算法 (${Object.values(groupFunctions.feature).reduce((s, a) => s + a.length, 0)})`} defaultOpen={true}>
                    {(['control', 'decision', 'localization', 'perception', 'planning', 'other'] as const).map((k) => (
                      <TreeItem key={k} label={`${featureLabel(k)} (${groupFunctions.feature[k].length})`} defaultOpen={false}>
                        {groupFunctions.feature[k].map((fn) => (
                          <button
                            key={fn.function_id}
                            onClick={() => props.onSelectItem({ type: 'function', data: fn })}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'application/x-ai-cbdes-fn',
                                JSON.stringify({
                                  function_id: String(fn.function_id),
                                  display_name: String(fn.display_name || fn.signature || fn.function_id),
                                  module: String(fn.module || ''),
                                  kind: 'node',
                                  file_path: String(fn.file_path || ''),
                                  signature: String(fn.signature || ''),
                                  inputs_json: String(fn.inputs_json || '{}'),
                                  outputs_json: String(fn.outputs_json || '{}')
                                })
                              );
                            }}
                            className={clsx(
                              "w-full text-left text-xs py-1 px-2 rounded flex items-center gap-1 cursor-grab",
                              props.selectedItem?.type === 'function' && props.selectedItem.data.function_id === fn.function_id
                                ? "bg-[#F3E5F5] text-[#6A1B9A]"
                                : "hover:bg-[#F8ECFA] text-gray-700"
                            )}
                          >
                            <LayoutGrid className="w-3 h-3 shrink-0" />
                            <span className="truncate">{fn.display_name || fn.function_id}</span>
                          </button>
                        ))}
                      </TreeItem>
                    ))}
                  </TreeItem>
                </TreeItem>
              </>
            )}
          </>
        ) : (
          <>
            <div className="px-2 py-1 text-[10px] text-gray-500">已索引模块：{modules.length}</div>
            {modules.length === 0 && !loading ? (
              <div className="p-2 text-xs text-gray-500 text-center">暂无已索引模块</div>
            ) : (
              <>
                <TreeItem label={`基础模块库 (${groupModules.baseGlue.length + groupModules.basePlatform.length})`} defaultOpen={true}>
                  <TreeItem label={`glue工程胶水 (${groupModules.baseGlue.length})`} defaultOpen={false}>
                    {groupModules.baseGlue.map((m) => (
                      <button
                        key={m.module_key}
                        onClick={() => props.onSelectItem({ type: 'module', data: m })}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/x-ai-cbdes-mod',
                            JSON.stringify({
                              module_key: String(m.module_key),
                              display_name: String(m.display_name || m.module_key),
                              inputs_json: String(m.inputs_json || '{}'),
                              outputs_json: String(m.outputs_json || '{}')
                            })
                          );
                        }}
                        className={clsx(
                          "w-full text-left text-xs py-1 px-2 rounded flex items-center gap-1 cursor-grab",
                          props.selectedItem?.type === 'module' && props.selectedItem.data.module_key === m.module_key
                            ? "bg-[#F3E5F5] text-[#6A1B9A]"
                            : "hover:bg-[#F8ECFA] text-gray-700"
                        )}
                      >
                        <LayoutList className="w-3 h-3 shrink-0" />
                        <span className="truncate">{`${m.display_name || m.module_key} (${m.node_count}/${m.edge_count})`}</span>
                      </button>
                    ))}
                  </TreeItem>
                  <TreeItem label={`platform基础设施 (${groupModules.basePlatform.length})`} defaultOpen={false}>
                    {(['sys', 'config', 'log', 'io', 'time', 'ser', 'other'] as const).map((k) => (
                      <TreeItem
                        key={k}
                        label={`${groupModules.platformSubLabel(k)} (${groupModules.platformGroups[k].length})`}
                        defaultOpen={false}
                      >
                        {groupModules.platformGroups[k].map((m) => (
                          <button
                            key={m.module_key}
                            onClick={() => props.onSelectItem({ type: 'module', data: m })}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'application/x-ai-cbdes-mod',
                                JSON.stringify({
                                  module_key: String(m.module_key),
                                  display_name: String(m.display_name || m.module_key),
                                  inputs_json: String(m.inputs_json || '{}'),
                                  outputs_json: String(m.outputs_json || '{}')
                                })
                              );
                            }}
                            className={clsx(
                              "w-full text-left text-xs py-1 px-2 rounded flex items-center gap-1 cursor-grab",
                              props.selectedItem?.type === 'module' && props.selectedItem.data.module_key === m.module_key
                                ? "bg-[#F3E5F5] text-[#6A1B9A]"
                                : "hover:bg-[#F8ECFA] text-gray-700"
                            )}
                          >
                            <LayoutList className="w-3 h-3 shrink-0" />
                            <span className="truncate">{`${m.display_name || m.module_key} (${m.node_count}/${m.edge_count})`}</span>
                          </button>
                        ))}
                      </TreeItem>
                    ))}
                  </TreeItem>
                </TreeItem>
                <TreeItem
                  label={`功能模块库 (${Object.values(groupModules.feature).reduce((s, a) => s + a.length, 0)})`}
                  defaultOpen={true}
                >
                  <TreeItem label={`node关键算法 (${Object.values(groupModules.feature).reduce((s, a) => s + a.length, 0)})`} defaultOpen={true}>
                    {(['control', 'decision', 'localization', 'perception', 'planning', 'other'] as const).map((k) => (
                      <TreeItem key={k} label={`${featureLabel(k)} (${groupModules.feature[k].length})`} defaultOpen={false}>
                        {groupModules.feature[k].map((m) => (
                          <button
                            key={m.module_key}
                            onClick={() => props.onSelectItem({ type: 'module', data: m })}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'application/x-ai-cbdes-mod',
                                JSON.stringify({
                                  module_key: String(m.module_key),
                                  display_name: String(m.display_name || m.module_key),
                                  inputs_json: String(m.inputs_json || '{}'),
                                  outputs_json: String(m.outputs_json || '{}')
                                })
                              );
                            }}
                            className={clsx(
                              "w-full text-left text-xs py-1 px-2 rounded flex items-center gap-1 cursor-grab",
                              props.selectedItem?.type === 'module' && props.selectedItem.data.module_key === m.module_key
                                ? "bg-[#F3E5F5] text-[#6A1B9A]"
                                : "hover:bg-[#F8ECFA] text-gray-700"
                            )}
                          >
                            <LayoutList className="w-3 h-3 shrink-0" />
                            <span className="truncate">{`${m.display_name || m.module_key} (${m.node_count}/${m.edge_count})`}</span>
                          </button>
                        ))}
                      </TreeItem>
                    ))}
                  </TreeItem>
                </TreeItem>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ProjectView = (props: { rootDir: string; setRootDir: (v: string) => void }) => (
  <div className="h-full flex flex-col bg-white overflow-hidden">
    <div className="p-2 border-b border-[#E1BEE7] bg-white">
      <div className="text-[10px] text-gray-500 mb-1">Root Dir</div>
      <input
        value={props.rootDir}
        onChange={(e) => props.setRootDir(e.target.value)}
        className="w-full h-7 px-2 text-xs border border-[#E1BEE7] rounded outline-none"
      />
    </div>
    <SearchBar />
    <div className="flex-1 overflow-auto p-1">
      <TreeItem label="Project" defaultOpen={true}>
        <TreeItem label="src" defaultOpen={true}>
          <TreeItem label="components" />
          <TreeItem label="utils" />
        </TreeItem>
        <TreeItem label="package.json" />
      </TreeItem>
    </div>
  </div>
);

type AgentStatusItem = {
  name: string;
  status: 'idle' | 'running' | 'success' | 'failure';
  detail: string;
};

const MultiAgentStatusPanel = (props: { logs: string[]; busy: boolean }) => {
  const findStatus = (keywords: string[]): { status: AgentStatusItem['status']; detail: string } => {
    const hit = [...props.logs].reverse().find((line) => keywords.some((k) => line.includes(k)));
    if (!hit) return { status: 'idle', detail: '暂无记录' };
    if (hit.includes('失败') || hit.includes('异常')) return { status: 'failure', detail: hit };
    if (hit.includes('成功') || hit.includes('完成') || hit.includes('结束（完成）')) return { status: 'success', detail: hit };
    if (hit.includes('开始') || hit.includes('启动') || hit.includes('进度') || hit.includes('进行中')) return { status: 'running', detail: hit };
    return { status: 'idle', detail: hit };
  };

  const planner = findStatus(['需求', '提示词', '任务']);
  const rag = findStatus(['扫描', '索引', '模块']);
  const codegen = findStatus(['生成', '编排']);
  const gate = findStatus(['门禁', '检测', '编译']);
  const deploy = findStatus(['部署', '发布']);

  const currentRunning = props.busy
    ? codegen.status === 'running'
      ? 'CodeGen 智能体执行中'
      : rag.status === 'running'
      ? 'RAG 智能体执行中'
      : gate.status === 'running'
      ? 'Gate 智能体执行中'
      : deploy.status === 'running'
      ? 'Deploy 智能体执行中'
      : '任务处理中'
    : '空闲';

  const items: AgentStatusItem[] = [
    { name: 'Planner', status: planner.status, detail: planner.detail },
    { name: 'RAG', status: rag.status, detail: rag.detail },
    { name: 'CodeGen', status: codegen.status, detail: codegen.detail },
    { name: 'Gate', status: gate.status, detail: gate.detail },
    { name: 'Deploy', status: deploy.status, detail: deploy.detail }
  ];

  const dotCls: Record<AgentStatusItem['status'], string> = {
    idle: 'bg-gray-300',
    running: 'bg-amber-400',
    success: 'bg-green-500',
    failure: 'bg-red-500'
  };
  const label: Record<AgentStatusItem['status'], string> = {
    idle: '空闲',
    running: '运行中',
    success: '成功',
    failure: '失败'
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-[#E1BEE7] text-[11px] text-[#6A1B9A]">{currentRunning}</div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {items.map((it) => (
          <div key={it.name} className="rounded border border-[#E1BEE7] p-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="font-semibold text-[#4A148C]">{it.name}</div>
              <div className="flex items-center gap-1 text-gray-600">
                <span className={clsx('w-2 h-2 rounded-full', dotCls[it.status])} />
                <span>{label[it.status]}</span>
              </div>
            </div>
            <div className="mt-1 text-[10px] text-gray-500 truncate" title={it.detail}>
              {it.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CanvasItem {
  id: string;
  name: string;
}

interface CanvasNodeItem {
  id: string;
  canvasId: string;
  kind: 'function' | 'module';
  status?: 'clean' | 'editing' | 'modified';
  changeSummary?: string;
  functionId?: string;
  moduleKey?: string;
  displayName: string;
  module: string;
  signature?: string;
  inputsJson: string;
  outputsJson: string;
  x: number;
  y: number;
}

interface CanvasEdgeItem {
  id: string;
  canvasId: string;
  from: string;
  to: string;
  fromPort?: string;
  toPort?: string;
  hidden?: boolean;
}

function normalizeNodeStatus(v: any): 'clean' | 'editing' | 'modified' {
  if (v === 'editing' || v === 'modified') return v;
  return 'clean';
}

function parseFieldNames(v: string) {
  try {
    const obj = JSON.parse(String(v || '{}'));
    const fs = Array.isArray(obj?.fields) ? obj.fields : [];
    return fs.map((x: any) => String(x?.name || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function ioMatchScoreSimple(outJson: string, inJson: string) {
  const outNames = parseFieldNames(outJson);
  const inNames = parseFieldNames(inJson);
  const sharedNames = outNames.filter((n) => inNames.includes(n));
  return { sharedNames, score: sharedNames.length };
}

const Canvas = (props: {
  projectId: string;
  rootDir: string;
  injectModuleKey: string | null;
  injectModuleSignal: number;
  createModel: { moduleKey: string; displayName: string } | null;
  createModelSignal: number;
  injectFunctionPayload?: { functionId: string; displayName: string; signature?: string; module?: string } | null;
  injectFunctionSignal?: number;
  generatedFunctions?: Record<string, { display_name: string; signature: string; module: string; doc_zh: string; doc_en?: string; code: string }>;
  generatedModules?: Record<string, { module_key: string; display_name: string; doc_zh: string; nodes: any[]; edges: any[] }>;
  aiEditStartSignal: number;
  aiEditApplySignal: number;
  aiEditFailSignal: number;
  aiEditSummary: string;
  onSelectItem: (item: SelectedLibraryItem) => void;
  onGraphChange?: (graph: { canvases: CanvasItem[]; nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[]; activeCanvasId: string }) => void;
  saveCanvasSignal: number;
  importGraphPayload: { canvases: CanvasItem[]; nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[]; activeCanvasId: string } | null;
  importGraphSignal: number;
  onExportModule?: (payload: { canvasId: string; canvasName: string; nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[] }) => void;
  injectReusePayload?: { functions: any[]; modules: any[] } | null;
  injectReuseSignal?: number;
}) => {
  const NODE_W = 180;
  const NODE_H = 52;
  const asFiniteNumber = (v: any, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const [canvases, setCanvases] = useState<CanvasItem[]>([
    { id: '1', name: `map${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '')}_1` }
  ]);
  const [activeCanvasId, setActiveCanvasId] = useState<string>('1');
  const [nodes, setNodes] = useState<CanvasNodeItem[]>([]);
  const [edges, setEdges] = useState<CanvasEdgeItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [excludedEdgeIds, setExcludedEdgeIds] = useState<string[]>([]);
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);
  const [notePopupNodeId, setNotePopupNodeId] = useState<string | null>(null);
  const [contextNodeId, setContextNodeId] = useState<string | null>(null);
  const [moduleExpanded, setModuleExpanded] = useState<Record<string, boolean>>({});
  const [moduleChildrenCache, setModuleChildrenCache] = useState<Record<string, { nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[] }>>({});
  const [connectDrag, setConnectDrag] = useState<{ fromId: string; fromPort?: string; toX: number; toY: number } | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<{ x: number; y: number; edgeId: string } | null>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [domPortCenters, setDomPortCenters] = useState<Map<string, { x: number; y: number }>>(() => new Map());
  const editInputRef = useRef<HTMLInputElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const aiTargetNodeRef = useRef<string | null>(null);
  const dragRef = useRef<{
    mode: 'none' | 'canvas' | 'node' | 'select';
    nodeId: string | null;
    button: number;
    pointerId?: number;
    startClientX: number;
    startClientY: number;
    startWorldX: number;
    startWorldY: number;
    currentWorldX: number;
    currentWorldY: number;
    startNodeX: number;
    startNodeY: number;
    startViewportX: number;
    startViewportY: number;
    moved: boolean;
    additive: boolean;
  }>({
    mode: 'none',
    nodeId: null,
    button: 0,
    startClientX: 0,
    startClientY: 0,
    startWorldX: 0,
    startWorldY: 0,
    currentWorldX: 0,
    currentWorldY: 0,
    startNodeX: 0,
    startNodeY: 0,
    startViewportX: 0,
    startViewportY: 0,
    moved: false,
    additive: false
  });
  const storageKey = `gaasd:canvas:${props.projectId}`;
  const [viewMode, setViewMode] = useState<'graph' | 'code'>('graph');
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number; mode: 'graph' | 'code' } | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeText, setCodeText] = useState('');
  const [edgePopup, setEdgePopup] = useState<{ edgeId: string; x: number; y: number } | null>(null);
  const [selectRect, setSelectRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [fitToCenterSignal, setFitToCenterSignal] = useState(0);
  const spaceDownRef = useRef(false);
  const rightClickRef = useRef<{ active: boolean; startX: number; startY: number; panStarted: boolean }>(
    { active: false, startX: 0, startY: 0, panStarted: false }
  );

  const zoomAt = (lx: number, ly: number, nextScale: number) => {
    setViewport((prev) => {
      const safePrevScale = Math.max(0.0001, Number(prev.scale) || 1);
      const safeNextScale = Math.min(2.5, Math.max(0.35, Number(nextScale) || safePrevScale));
      const wx = (lx - prev.x) / safePrevScale;
      const wy = (ly - prev.y) / safePrevScale;
      return {
        scale: safeNextScale,
        x: lx - wx * safeNextScale,
        y: ly - wy * safeNextScale
      };
    });
  };

  const zoomByFactor = (factor: number) => {
    const root = canvasAreaRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const lx = rect.width / 2;
    const ly = rect.height / 2;
    setViewport((prev) => {
      const safePrevScale = Math.max(0.0001, Number(prev.scale) || 1);
      const safeFactor = Number(factor) || 1;
      const nextScale = Math.min(2.5, Math.max(0.35, safePrevScale * safeFactor));
      const wx = (lx - prev.x) / safePrevScale;
      const wy = (ly - prev.y) / safePrevScale;
      return { scale: nextScale, x: lx - wx * nextScale, y: ly - wy * nextScale };
    });
  };

  const activeNodes = nodes.filter((n) => n.canvasId === activeCanvasId);
  const activeEdges = edges.filter((e) => e.canvasId === activeCanvasId);
  const nodeById = useMemo(() => new Map<string, CanvasNodeItem>(activeNodes.map((n) => [n.id, n] as const)), [activeNodes]);

  const selectedNodeSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const excludedEdgeSet = useMemo(() => new Set(excludedEdgeIds), [excludedEdgeIds]);
  const selectedEdges = useMemo(() => {
    return activeEdges.filter((e) => {
      if (e.hidden) return false;
      if (!selectedNodeSet.has(e.from) || !selectedNodeSet.has(e.to)) return false;
      if (excludedEdgeSet.has(e.id)) return false;
      return true;
    });
  }, [activeEdges, selectedNodeSet, excludedEdgeSet]);
  const selectedEdgeSet = useMemo(() => new Set(selectedEdges.map((e) => e.id)), [selectedEdges]);

  const portCache = useMemo(() => {
    const inExtras = new Map<string, string[]>();
    const outExtras = new Map<string, string[]>();
    for (const e of activeEdges) {
      if (e.hidden) continue;
      if (e.toPort) {
        const arr = inExtras.get(e.to) || [];
        if (!arr.includes(e.toPort)) arr.push(e.toPort);
        inExtras.set(e.to, arr);
      }
      if (e.fromPort) {
        const arr = outExtras.get(e.from) || [];
        if (!arr.includes(e.fromPort)) arr.push(e.fromPort);
        outExtras.set(e.from, arr);
      }
    }
    const cache = new Map<string, { inputs: string[]; outputs: string[]; h: number }>();
    for (const n of activeNodes) {
      const baseInputs = parseFieldNames(n.inputsJson);
      const baseOutputs = parseFieldNames(n.outputsJson);
      const inputs = [...baseInputs, ...(inExtras.get(n.id) || []).filter((x) => !baseInputs.includes(x))];
      const outputs = [...baseOutputs, ...(outExtras.get(n.id) || []).filter((x) => !baseOutputs.includes(x))];
      cache.set(n.id, {
        inputs,
        outputs,
        h: Math.max(NODE_H, 40 + Math.max(inputs.length, outputs.length) * 14)
      });
    }
    return cache;
  }, [activeNodes, activeEdges]);

  const getPorts = (n: CanvasNodeItem) => portCache.get(n.id) || { inputs: [], outputs: [], h: NODE_H };

  const debugAnchors = useMemo(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.has('debugAnchors') || qs.get('debugAnchors') === '1') return true;
      return localStorage.getItem('gaasd:debugAnchors') === '1';
    } catch {
      return false;
    }
  }, []);

  const debugIds = useMemo(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.has('debugIds') || qs.get('debugIds') === '1') return true;
      return localStorage.getItem('gaasd:debugIds') === '1';
    } catch {
      return false;
    }
  }, []);

  const portKey = (nodeId: string, side: 'in' | 'out', portName?: string) => `${nodeId}|${side}|${portName || ''}`;

  const portAnchorWorld = (n: CanvasNodeItem, side: 'in' | 'out', port?: string) => {
    const p = getPorts(n);
    const list = side === 'in' ? p.inputs : p.outputs;
    const idx = port ? list.indexOf(port) : -1;
    const i = idx >= 0 ? idx : Math.floor(Math.max(0, list.length - 1) / 2);
    const border = 1;
    const portRadius = 5;
    const portTop = 26;
    return {
      x: side === 'in' ? n.x + border : n.x + NODE_W - border,
      y: n.y + border + portTop + portRadius + i * 14
    };
  };

  const getAnchorRender = (n: CanvasNodeItem, side: 'in' | 'out', portName?: string) => {
    const dom = domPortCenters.get(portKey(n.id, side, portName));
    if (dom) return dom;
    const a = portAnchorWorld(n, side, portName);
    return { x: a.x + contentBounds.ox, y: a.y + contentBounds.oy };
  };

  const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const ab2 = abx * abx + aby * aby;
    if (ab2 <= 1e-6) return Math.hypot(apx, apy);
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    return Math.hypot(px - cx, py - cy);
  };

  const hitTestEdge = (clientX: number, clientY: number) => {
    const p = toWorldPoint(clientX, clientY);
    const px = p.x;
    const py = p.y;
    const threshold = 6 / Math.max(0.35, viewport.scale);
    let best: { id: string; d: number } | null = null;
    for (const e of activeEdges) {
      if (e.hidden) continue;
      const from = nodeById.get(e.from);
      const to = nodeById.get(e.to);
      if (!from || !to) continue;
      const a1 = getAnchorRender(from, 'out', e.fromPort);
      const a2 = getAnchorRender(to, 'in', e.toPort);
      const x1 = a1.x;
      const y1 = a1.y;
      const x2 = a2.x;
      const y2 = a2.y;
      const minStub = 34;
      const dx = x2 - x1;
      const midX = Math.abs(dx) >= minStub * 2 ? (x1 + x2) / 2 : x1 + Math.sign(dx || 1) * minStub;
      const d1 = distToSeg(px, py, x1, y1, midX, y1);
      const d2 = distToSeg(px, py, midX, y1, midX, y2);
      const d3 = distToSeg(px, py, midX, y2, x2, y2);
      const d = Math.min(d1, d2, d3);
      if (d <= threshold && (!best || d < best.d)) best = { id: e.id, d };
    }
    return best?.id || null;
  };

  const nodeRect = (n: CanvasNodeItem) => {
    const ports = getPorts(n);
    return { x: n.x + contentBounds.ox, y: n.y + contentBounds.oy, w: NODE_W, h: ports.h };
  };

  const edgePolylinePoints = (e: CanvasEdgeItem) => {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    if (!from || !to) return null;
    const a1 = getAnchorRender(from, 'out', e.fromPort);
    const a2 = getAnchorRender(to, 'in', e.toPort);
    const x1 = a1.x;
    const y1 = a1.y;
    const x2 = a2.x;
    const y2 = a2.y;
    const minStub = 34;
    const dx = x2 - x1;
    const midX = Math.abs(dx) >= minStub * 2 ? (x1 + x2) / 2 : x1 + Math.sign(dx || 1) * minStub;
    return [
      { x: x1, y: y1 },
      { x: midX, y: y1 },
      { x: midX, y: y2 },
      { x: x2, y: y2 }
    ];
  };

  const segIntersectsRect = (ax: number, ay: number, bx: number, by: number, rx: number, ry: number, rw: number, rh: number) => {
    const minX = Math.min(ax, bx);
    const maxX = Math.max(ax, bx);
    const minY = Math.min(ay, by);
    const maxY = Math.max(ay, by);
    if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) return false;
    if (ax >= rx && ax <= rx + rw && ay >= ry && ay <= ry + rh) return true;
    if (bx >= rx && bx <= rx + rw && by >= ry && by <= ry + rh) return true;
    const intersects = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
      const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(d) < 1e-6) return false;
      const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d;
      const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d;
      const on1 = px >= Math.min(x1, x2) - 1e-6 && px <= Math.max(x1, x2) + 1e-6 && py >= Math.min(y1, y2) - 1e-6 && py <= Math.max(y1, y2) + 1e-6;
      const on2 = px >= Math.min(x3, x4) - 1e-6 && px <= Math.max(x3, x4) + 1e-6 && py >= Math.min(y3, y4) - 1e-6 && py <= Math.max(y3, y4) + 1e-6;
      return on1 && on2;
    };
    return (
      intersects(ax, ay, bx, by, rx, ry, rx + rw, ry) ||
      intersects(ax, ay, bx, by, rx + rw, ry, rx + rw, ry + rh) ||
      intersects(ax, ay, bx, by, rx + rw, ry + rh, rx, ry + rh) ||
      intersects(ax, ay, bx, by, rx, ry + rh, rx, ry)
    );
  };

  const applyNodeSelection = (nextNodeIds: string[], nextExcludedEdgeIds?: string[]) => {
    setSelectedNodeIds(nextNodeIds);
    setSelectedNodeId(nextNodeIds.length === 1 ? nextNodeIds[0] : nextNodeIds.length ? nextNodeIds[nextNodeIds.length - 1] : null);
    if (nextExcludedEdgeIds) setExcludedEdgeIds(nextExcludedEdgeIds);
    setContextNodeId(null);
    setNotePopupNodeId(null);
    setEdgePopup(null);
  };

  const normalizeJoinPath = (root: string, relOrAbs: string) => {
    const r = String(root || '').trim();
    const p = String(relOrAbs || '').trim();
    if (!r) return p;
    if (/^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('\\\\') || p.startsWith('/')) return p;
    const sep = r.includes('\\') ? '\\' : '/';
    return r.replace(/[\\/]+$/, '') + sep + p.replace(/^[\\/]+/, '');
  };

  const localRootKey = `gaasd:localProjectRoot:${props.projectId}`;

  const getLocalProjectRoot = () => {
    try {
      return String(localStorage.getItem(localRootKey) || '').trim();
    } catch {
      return '';
    }
  };

  const setLocalProjectRoot = (p: string) => {
    try {
      localStorage.setItem(localRootKey, p);
    } catch {
    }
  };

  const ensureLocalProjectRoot = async () => {
    const cur = getLocalProjectRoot();
    if (cur) return cur;
    const input = window.prompt('请输入你本地工程根目录的绝对路径（例如：D:\\work\\THICV-Pilot_master）', '') || '';
    const v = String(input).trim();
    if (!v) return '';
    setLocalProjectRoot(v);
    return v;
  };

  const mapServerAbsToLocalAbs = (serverAbs: string, localRoot: string) => {
    const s = String(serverAbs || '').trim().replace(/\//g, '\\');
    const lr = String(localRoot || '').trim().replace(/\//g, '\\').replace(/[\\]+$/, '');
    if (!s) return s;
    if (!lr) return s;
    const project = lr.split('\\').filter(Boolean).pop();
    if (!project) return s;
    const needle = `\\${project.toLowerCase()}\\`;
    const idx = s.toLowerCase().lastIndexOf(needle);
    if (idx >= 0) {
      const rel = s.slice(idx + needle.length);
      return lr + '\\' + rel;
    }
    return lr;
  };

  const toVscodeFileUri = (absPath: string, line?: number) => {
    const raw = String(absPath || '').replace(/\\/g, '/');
    const withDrive = /^[a-zA-Z]:\//.test(raw) ? `/${raw}` : raw.startsWith('/') ? raw : `/${raw}`;
    const encoded = encodeURI(withDrive).replace(/#/g, '%23').replace(/\?/g, '%3F');
    const ln = Number.isFinite(line as any) && Number(line) > 0 ? `:${Number(line)}` : '';
    return `vscode://file${encoded}${ln}`;
  };

  const openInVSCode = async (absPath: string, line?: number) => {
    const p = String(absPath || '').trim();
    if (!p) return;
    const uri = toVscodeFileUri(p, line);
    const w = window.open(uri, '_blank');
    if (w) return;
    const cmd = line && Number(line) > 0 ? `code -g "${p}:${line}"` : `code "${p}"`;
    try {
      await navigator.clipboard.writeText(cmd);
      alert(`无法直接调起 VSCode，已复制命令到剪贴板：\n${cmd}`);
    } catch {
      alert(`无法直接调起 VSCode，请手动执行：\n${cmd}`);
    }
  };

  const openProjectInVSCode = async () => {
    const localRoot = await ensureLocalProjectRoot();
    if (!localRoot) {
      alert('未设置本地工程根目录，无法打开 VSCode。');
      return;
    }
    await openInVSCode(localRoot);
  };

  const openCodeForNode = async (n: CanvasNodeItem) => {
    if (n.kind !== 'function' || !n.functionId) {
      await openProjectInVSCode();
      return;
    }
    const fnId = String(n.functionId || '').trim();
    if (!fnId) {
      await openProjectInVSCode();
      return;
    }
    let detail: any = null;
    try {
      detail = await ragGetFunction(fnId);
    } catch {
      detail = null;
    }
    const fn = detail?.function || detail;
    const filePath = String(fn?.file_path || '').trim();
    const startLine = Number(fn?.start_line || 1);
    if (!filePath) {
      alert('未找到 file_path，无法定位到源码文件。');
      return;
    }
    const localRoot = await ensureLocalProjectRoot();
    if (!localRoot) {
      alert('未设置本地工程根目录，无法打开源码文件。');
      return;
    }
    const abs = /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith('\\\\') ? mapServerAbsToLocalAbs(filePath, localRoot) : normalizeJoinPath(localRoot, filePath);
    await openInVSCode(abs, startLine);
  };

  const exportModuleForSelection = async (focusNodeId?: string, focusEdgeId?: string) => {
    const nodeIds = new Set<string>(selectedNodeIds);
    if (!nodeIds.size && focusNodeId) nodeIds.add(focusNodeId);
    if (!nodeIds.size && focusEdgeId) {
      const hit = activeEdges.find((e) => e.id === focusEdgeId);
      if (hit) {
        nodeIds.add(hit.from);
        nodeIds.add(hit.to);
      }
    }
    if (!nodeIds.size) {
      alert('请先选择节点/连线，再导出模块。');
      return;
    }
    const excluded = new Set<string>(excludedEdgeIds);
    const nodesSel = activeNodes.filter((n) => nodeIds.has(n.id));
    const edgesSel = activeEdges.filter((e) => !e.hidden && nodeIds.has(e.from) && nodeIds.has(e.to) && !excluded.has(e.id));
    const canvasName = canvases.find((c) => c.id === activeCanvasId)?.name || 'canvas';
    if (!props.onExportModule) {
      alert('导出模块未接入主流程。');
      return;
    }
    props.onExportModule({ canvasId: activeCanvasId, canvasName, nodes: nodesSel, edges: edgesSel });
  };

  const toWorldPoint = (clientX: number, clientY: number) => {
    const rect = canvasAreaRef.current?.getBoundingClientRect();
    const lx = rect ? clientX - rect.left : clientX;
    const ly = rect ? clientY - rect.top : clientY;
    return {
      x: (lx - viewport.x) / viewport.scale,
      y: (ly - viewport.y) / viewport.scale
    };
  };

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const p = toWorldPoint(clientX, clientY);
    return {
      x: p.x - contentBounds.ox,
      y: p.y - contentBounds.oy
    };
  };

  useEffect(() => {
    if (viewMode !== 'graph') return;
    if (!canvasAreaRef.current) return;

    let raf = 0;
    const measure = () => {
      const root = canvasAreaRef.current;
      if (!root) return;
      const els = Array.from(root.querySelectorAll<HTMLElement>('[data-port-node][data-port-side][data-port-name]')) as HTMLElement[];
      const next = new Map<string, { x: number; y: number }>();
      for (const el of els) {
        const nodeId = el.dataset.portNode || '';
        const side = (el.dataset.portSide as 'in' | 'out') || 'in';
        const portName = el.dataset.portName || '';
        if (!nodeId) continue;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const p = toWorldPoint(cx, cy);
        next.set(portKey(nodeId, side, portName), { x: p.x, y: p.y });
      }
      setDomPortCenters(next);
    };

    raf = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [viewMode, activeCanvasId, activeNodes, viewport.x, viewport.y, viewport.scale]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setCanvases([{ id: '1', name: `map${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '')}_1` }]);
        setActiveCanvasId('1');
        setNodes([]);
        setEdges([]);
        setSelectedNodeId(null);
        return;
      }
      const v = JSON.parse(raw);
      const loadedCanvases = Array.isArray(v?.canvases) && v.canvases.length ? v.canvases : [{ id: '1', name: 'map0101_1' }];
      const nextActiveCanvasId = String(v?.activeCanvasId || loadedCanvases[0].id);
      setCanvases(loadedCanvases);
      setActiveCanvasId(nextActiveCanvasId);

      const loadedNodes = Array.isArray(v?.nodes)
        ? v.nodes.map((n: any) => ({
            ...n,
            status: normalizeNodeStatus(n?.status)
          }))
        : [];
      const loadedEdges = Array.isArray(v?.edges) ? v.edges : [];

      const pad = 240;
      const activeNodesLoaded = loadedNodes.filter((n: any) => String(n?.canvasId || '') === nextActiveCanvasId);
      let migratedNodes = loadedNodes;
      if (activeNodesLoaded.length) {
        const minX = Math.min(...activeNodesLoaded.map((n: any) => Number(n?.x ?? 0)));
        const minY = Math.min(...activeNodesLoaded.map((n: any) => Number(n?.y ?? 0)));
        const looksLikeScreenCoords = minX >= pad - 2 && minX <= pad + 60 && minY >= pad - 2 && minY <= pad + 60;
        if (looksLikeScreenCoords) {
          migratedNodes = loadedNodes.map((n: any) => ({
            ...n,
            x: Number(n?.x ?? 0) - pad,
            y: Number(n?.y ?? 0) - pad,
          }));
        }
      }

      const canonicalize = (nodesArr: any[], edgesArr: any[]) => {
        const byCanvas = new Map<string, { keep: any[]; remap: Map<string, string> }>();
        for (const n of nodesArr) {
          const cid = String(n?.canvasId || '');
          if (!byCanvas.has(cid)) byCanvas.set(cid, { keep: [], remap: new Map() });
          const bucket = byCanvas.get(cid)!;
          const kind = String(n?.kind || '');
          const fnId = String(n?.functionId || '');
          const mk = String(n?.moduleKey || '');
          if (kind === 'function' && fnId) {
            const existing = bucket.keep.find((x) => String(x?.kind || '') === 'function' && String(x?.functionId || '') === fnId);
            if (existing) {
              bucket.remap.set(String(n.id), String(existing.id));
              continue;
            }
          }
          if (kind === 'module' && mk) {
            const existing = bucket.keep.find((x) => String(x?.kind || '') === 'module' && String(x?.moduleKey || '') === mk);
            if (existing) {
              bucket.remap.set(String(n.id), String(existing.id));
              continue;
            }
          }
          bucket.keep.push(n);
        }

        const remapId = (id: any, canvasId: any) => {
          const bucket = byCanvas.get(String(canvasId || ''));
          if (!bucket) return String(id || '');
          return bucket.remap.get(String(id || '')) || String(id || '');
        };

        const fixedEdges = edgesArr
          .map((e: any) => {
            const canvasId = String(e?.canvasId || '');
            const from = remapId(e?.from, canvasId);
            const to = remapId(e?.to, canvasId);
            return { ...e, from, to, canvasId };
          })
          .filter((e: any) => e.from && e.to && e.from !== e.to);

        const edgeKey = (e: any) => [e.canvasId, e.from, e.to, e.fromPort || '', e.toPort || ''].join('|');
        const seen = new Set<string>();
        const dedupEdges: any[] = [];
        for (const e of fixedEdges) {
          const k = edgeKey(e);
          if (seen.has(k)) continue;
          seen.add(k);
          dedupEdges.push(e);
        }

        const mergedNodes: any[] = [];
        for (const [, bucket] of byCanvas.entries()) mergedNodes.push(...bucket.keep);
        return { nodes: mergedNodes, edges: dedupEdges };
      };

      const canon = canonicalize(migratedNodes, loadedEdges);
      setNodes(canon.nodes);
      setEdges(canon.edges);
      setModuleExpanded({});
      setModuleChildrenCache({});
      applyNodeSelection([], []);
    } catch {
      setCanvases([{ id: '1', name: 'map0101_1' }]);
      setActiveCanvasId('1');
      setNodes([]);
      setEdges([]);
      setModuleExpanded({});
      setModuleChildrenCache({});
      applyNodeSelection([], []);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          canvases,
          activeCanvasId,
          nodes,
          edges
        })
      );
    } catch {
      return;
    }
  }, [storageKey, canvases, activeCanvasId, nodes, edges]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          canvases,
          activeCanvasId,
          nodes,
          edges
        })
      );
    } catch {
      return;
    }
  }, [props.saveCanvasSignal]);

  useEffect(() => {
    const sig = Number(props.importGraphSignal || 0);
    if (!sig) return;
    const g = props.importGraphPayload;
    if (!g) return;
    setViewMode('graph');
    setCanvasMenu(null);
    setNodeMenu(null);
    setEdgeMenu(null);
    setEdgePopup(null);
    const nextCanvasId = String(g.activeCanvasId || (g.canvases?.[0]?.id ?? '1'));
    setCanvases(Array.isArray(g.canvases) && g.canvases.length ? g.canvases : [{ id: nextCanvasId || '1', name: '导入画布' }]);
    setActiveCanvasId(nextCanvasId);

    const normalizedNodes: CanvasNodeItem[] = Array.isArray(g.nodes)
      ? g.nodes
          .map((n: any) => {
            const kind: 'function' | 'module' = String(n?.kind || '') === 'module' ? 'module' : 'function';
            const id = String(n?.id || '').trim() || Math.random().toString(36).slice(2, 10);
            return {
              id,
              canvasId: nextCanvasId,
              kind,
              status: normalizeNodeStatus(n?.status),
              changeSummary: n?.changeSummary ? String(n.changeSummary) : undefined,
              functionId: n?.functionId ? String(n.functionId) : undefined,
              moduleKey: n?.moduleKey ? String(n.moduleKey) : undefined,
              displayName: String(n?.displayName || n?.functionId || n?.moduleKey || 'node'),
              module: String(n?.module || (kind === 'module' ? 'module' : 'common')),
              signature: n?.signature ? String(n.signature) : undefined,
              inputsJson: String(n?.inputsJson || '{}'),
              outputsJson: String(n?.outputsJson || '{}'),
              x: asFiniteNumber(n?.x, 0),
              y: asFiniteNumber(n?.y, 0)
            };
          })
          .filter(Boolean)
      : [];

    const normalizedEdges: CanvasEdgeItem[] = Array.isArray(g.edges)
      ? g.edges
          .map((e: any) => {
            const from = String(e?.from || '').trim();
            const to = String(e?.to || '').trim();
            if (!from || !to) return null;
            return {
              id: String(e?.id || '').trim() || Math.random().toString(36).slice(2, 10),
              canvasId: nextCanvasId,
              from,
              to,
              fromPort: e?.fromPort ? String(e.fromPort) : undefined,
              toPort: e?.toPort ? String(e.toPort) : undefined,
              hidden: Boolean(e?.hidden)
            };
          })
          .filter(Boolean) as CanvasEdgeItem[]
      : [];

    setNodes(normalizedNodes);
    setEdges(normalizedEdges);
    setModuleExpanded({});
    setModuleChildrenCache({});
    applyNodeSelection([], []);
    setConnectDrag(null);
    setConnectSourceNodeId(null);
    rightClickRef.current = { active: false, startX: 0, startY: 0, panStarted: false };
    dragRef.current = {
      mode: 'none',
      nodeId: null,
      button: 0,
      pointerId: undefined,
      startClientX: 0,
      startClientY: 0,
      startWorldX: 0,
      startWorldY: 0,
      currentWorldX: 0,
      currentWorldY: 0,
      startNodeX: 0,
      startNodeY: 0,
      startViewportX: 0,
      startViewportY: 0,
      moved: false,
      additive: false
    };
    setViewport({ x: 0, y: 0, scale: 1 });
    setFitToCenterSignal((v) => v + 1);
  }, [props.importGraphSignal]);

  useEffect(() => {
    if (!canvasMenu && !nodeMenu && !edgeMenu) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[data-floating-menu="1"]')) return;
      if (e.button === 2) return;
      setCanvasMenu(null);
      setNodeMenu(null);
      setEdgeMenu(null);
    };
    window.addEventListener('pointerdown', onDown, { capture: true });
    return () => window.removeEventListener('pointerdown', onDown as any, { capture: true } as any);
  }, [canvasMenu, nodeMenu, edgeMenu]);

  useEffect(() => {
    props.onGraphChange?.({ canvases, nodes, edges, activeCanvasId });
  }, [canvases, nodes, edges, activeCanvasId]);

  const handleAddCanvas = () => {
    const dateStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '');
    const newId = Math.random().toString(36).substr(2, 9);
    const newName = `map${dateStr}_${canvases.length + 1}`;
    setCanvases([...canvases, { id: newId, name: newName }]);
    setActiveCanvasId(newId);
  };

  const handleDeleteCanvas = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (canvases.length <= 1) return;
    
    const newCanvases = canvases.filter(c => c.id !== id);
    setCanvases(newCanvases);
    setNodes((prev) => prev.filter((n) => n.canvasId !== id));
    setEdges((prev) => prev.filter((e) => e.canvasId !== id));
    if (activeCanvasId === id) {
      setActiveCanvasId(newCanvases[newCanvases.length - 1].id);
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEditing = () => {
    if (editingId) {
      setCanvases(canvases.map(c => c.id === editingId ? { ...c, name: editName } : c));
      setEditingId(null);
    }
  };

  const onDropCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fnRaw = e.dataTransfer.getData('application/x-ai-cbdes-fn');
    const modRaw = e.dataTransfer.getData('application/x-ai-cbdes-mod');
    if (!fnRaw && !modRaw) return;
    const p0 = toCanvasPoint(e.clientX, e.clientY);
    const x = p0.x;
    const y = p0.y;
    const id = Math.random().toString(36).slice(2, 10);
    if (fnRaw) {
      const p = JSON.parse(fnRaw);
      setNodes((prev) => [
        ...prev,
        {
          id,
          canvasId: activeCanvasId,
          kind: 'function',
          status: 'clean',
          functionId: String(p.function_id || ''),
          displayName: String(p.display_name || p.function_id || 'function'),
          module: String(p.module || 'common'),
          signature: String(p.signature || ''),
          inputsJson: String(p.inputs_json || '{}'),
          outputsJson: String(p.outputs_json || '{}'),
          x,
          y
        }
      ]);
      applyNodeSelection([id], []);
      return;
    }
    const p = JSON.parse(modRaw);
    setNodes((prev) => [
      ...prev,
      {
        id,
        canvasId: activeCanvasId,
        kind: 'module',
        status: 'clean',
        moduleKey: String(p.module_key || ''),
        displayName: String(p.display_name || p.module_key || 'module'),
        module: 'module',
        inputsJson: String(p.inputs_json || '{}'),
        outputsJson: String(p.outputs_json || '{}'),
        x,
        y
      }
    ]);
    applyNodeSelection([id], []);
  };

  const contentBounds = useMemo(() => {
    const pad = 240;
    if (!activeNodes.length) return { w: 2400, h: 1600, ox: 0, oy: 0, minX: 0, minY: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of activeNodes) {
      const h = getPorts(n).h;
      const x = asFiniteNumber((n as any).x, 0);
      const y = asFiniteNumber((n as any).y, 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NODE_W);
      maxY = Math.max(maxY, y + h);
    }
    const w = Math.max(2400, Math.ceil(maxX - minX + pad * 2));
    const h = Math.max(1600, Math.ceil(maxY - minY + pad * 2));
    return { w, h, ox: -minX + pad, oy: -minY + pad, minX, minY };
  }, [activeNodes, portCache]);

  const selectionBounds = useMemo(() => {
    if (!selectedNodeIds.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of activeNodes) {
      if (!selectedNodeSet.has(n.id)) continue;
      const h = getPorts(n).h;
      const x = n.x + contentBounds.ox;
      const y = n.y + contentBounds.oy;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NODE_W);
      maxY = Math.max(maxY, y + h);
    }
    if (!Number.isFinite(minX)) return null;
    const pad = 10;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }, [activeNodes, selectedNodeIds, selectedNodeSet, contentBounds.ox, contentBounds.oy, portCache]);

  useEffect(() => {
    if (!fitToCenterSignal) return;
    const root = canvasAreaRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    window.requestAnimationFrame(() => {
      const ns = nodes.filter((n) => n.canvasId === activeCanvasId);
      if (!ns.length) {
        setViewport({ x: 0, y: 0, scale: 1 });
        return;
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of ns) {
        const h = getPorts(n).h;
        const x = asFiniteNumber((n as any).x, 0) + contentBounds.ox;
        const y = asFiniteNumber((n as any).y, 0) + contentBounds.oy;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + NODE_W);
        maxY = Math.max(maxY, y + h);
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        setViewport({ x: 0, y: 0, scale: 1 });
        return;
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const scale = 1;
      setViewport({ scale, x: rect.width / 2 - cx * scale, y: rect.height / 2 - cy * scale });
    });
  }, [fitToCenterSignal, nodes, activeCanvasId, portCache, contentBounds.ox, contentBounds.oy]);

  const autoLayoutNodes = () => {
    const all = activeNodes;
    if (!all.length) return;
    const prevY = new Map<string, number>(all.map((n) => [n.id, n.y]));
    const undirected = new Map<string, Set<string>>();
    for (const n of all) undirected.set(n.id, new Set());
    for (const e of activeEdges) {
      if (!undirected.has(e.from) || !undirected.has(e.to)) continue;
      undirected.get(e.from)!.add(e.to);
      undirected.get(e.to)!.add(e.from);
    }
    const seen = new Set<string>();
    const components: string[][] = [];
    for (const n of all) {
      if (seen.has(n.id)) continue;
      const stack = [n.id];
      const comp: string[] = [];
      seen.add(n.id);
      while (stack.length) {
        const id = stack.pop()!;
        comp.push(id);
        for (const nb of undirected.get(id) || []) {
          if (seen.has(nb)) continue;
          seen.add(nb);
          stack.push(nb);
        }
      }
      components.push(comp);
    }
    components.sort((a, b) => b.length - a.length);

    const X_STEP = 320;
    const V_GAP = 24;
    const centerY = 360;
    const compGap = 80;

    const compLayouts = components.map((ids) => {
      const nodesIn = ids.map((id) => nodeById.get(id)!).filter(Boolean);
      const outgoing = new Map<string, string[]>();
      const incoming = new Map<string, string[]>();
      const indeg = new Map<string, number>();
      for (const n of nodesIn) {
        outgoing.set(n.id, []);
        incoming.set(n.id, []);
        indeg.set(n.id, 0);
      }
      for (const e of activeEdges) {
        if (!outgoing.has(e.from) || !incoming.has(e.to)) continue;
        outgoing.get(e.from)!.push(e.to);
        incoming.get(e.to)!.push(e.from);
        indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
      }

      const q = Array.from(indeg.entries())
        .filter(([, v]) => v === 0)
        .map(([k]) => k);
      const topo: string[] = [];
      const indegWork = new Map(indeg);
      while (q.length) {
        q.sort((a, b) => (prevY.get(a) ?? 0) - (prevY.get(b) ?? 0));
        const id = q.shift()!;
        topo.push(id);
        for (const to of outgoing.get(id) || []) {
          indegWork.set(to, (indegWork.get(to) || 0) - 1);
          if ((indegWork.get(to) || 0) === 0) q.push(to);
        }
      }
      for (const n of nodesIn) if (!topo.includes(n.id)) topo.push(n.id);
      const level = new Map<string, number>();
      for (const id of topo) {
        const ps = incoming.get(id) || [];
        const lv = ps.length ? Math.max(...ps.map((p) => level.get(p) ?? 0)) + 1 : 0;
        level.set(id, lv);
      }
      const maxLevel = Math.max(...Array.from(level.values()), 0);
      const byLevel: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
      for (const id of topo) byLevel[level.get(id) || 0].push(id);

      const orderIndex: Array<Map<string, number>> = Array.from({ length: byLevel.length }, () => new Map());
      byLevel[0].sort((a, b) => (prevY.get(a) ?? 0) - (prevY.get(b) ?? 0));
      orderIndex[0] = new Map(byLevel[0].map((id, idx) => [id, idx]));
      for (let lv = 1; lv < byLevel.length; lv += 1) {
        const prevIdx = orderIndex[lv - 1];
        byLevel[lv].sort((a, b) => {
          const pa = (incoming.get(a) || []).map((p) => prevIdx.get(p) ?? 9999);
          const pb = (incoming.get(b) || []).map((p) => prevIdx.get(p) ?? 9999);
          const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 9999);
          const da = avg(pa);
          const db = avg(pb);
          if (da !== db) return da - db;
          return (prevY.get(a) ?? 0) - (prevY.get(b) ?? 0);
        });
        orderIndex[lv] = new Map(byLevel[lv].map((id, idx) => [id, idx]));
      }

      const yTopById = new Map<string, number>();
      const desiredTopById = new Map<string, number>();
      const nodeHeight = (id: string) => getPorts(nodeById.get(id)!).h;
      const nodeCenter = (id: string) => (yTopById.get(id) ?? 0) + nodeHeight(id) / 2;

      if (byLevel[0].length) {
        let y = 0;
        for (const id of byLevel[0]) {
          yTopById.set(id, y);
          desiredTopById.set(id, y);
          y += nodeHeight(id) + V_GAP;
        }
      }

      for (let lv = 1; lv < byLevel.length; lv += 1) {
        const idsAtLevel = [...byLevel[lv]];
        const desired = new Map<string, number>();
        for (const id of idsAtLevel) {
          const ps = incoming.get(id) || [];
          const targetCenter = ps.length ? ps.map((p) => nodeCenter(p)).reduce((s, x) => s + x, 0) / ps.length : 0;
          desired.set(id, targetCenter);
          desiredTopById.set(id, targetCenter - nodeHeight(id) / 2);
        }
        idsAtLevel.sort((a, b) => {
          const da = desired.get(a) ?? 0;
          const db = desired.get(b) ?? 0;
          if (da !== db) return da - db;
          return (prevY.get(a) ?? 0) - (prevY.get(b) ?? 0);
        });

        for (let i = 0; i < idsAtLevel.length; i += 1) {
          const id = idsAtLevel[i];
          const h = nodeHeight(id);
          const dt = (desiredTopById.get(id) ?? 0);
          if (i === 0) {
            yTopById.set(id, dt);
          } else {
            const prevId = idsAtLevel[i - 1];
            const prevTop = yTopById.get(prevId) ?? 0;
            const prevH = nodeHeight(prevId);
            yTopById.set(id, Math.max(dt, prevTop + prevH + V_GAP));
          }
        }

        for (let i = idsAtLevel.length - 2; i >= 0; i -= 1) {
          const id = idsAtLevel[i];
          const nextId = idsAtLevel[i + 1];
          const nextTop = yTopById.get(nextId) ?? 0;
          const maxTop = nextTop - nodeHeight(id) - V_GAP;
          const dt = desiredTopById.get(id) ?? 0;
          yTopById.set(id, Math.max(dt, Math.min(yTopById.get(id) ?? 0, maxTop)));
        }

        byLevel[lv] = idsAtLevel;
      }

      let compMinY = Infinity;
      let compMaxY = -Infinity;
      for (const id of ids) {
        const y = yTopById.get(id) ?? 0;
        const h = nodeHeight(id);
        compMinY = Math.min(compMinY, y);
        compMaxY = Math.max(compMaxY, y + h);
      }

      const pos = new Map<string, { x: number; y: number }>();
      for (const id of ids) {
        pos.set(id, { x: 100 + (level.get(id) ?? 0) * X_STEP, y: (yTopById.get(id) ?? 0) - compMinY });
      }
      return { pos, height: compMaxY - compMinY, minY: 0 };
    });

    const totalHeight = compLayouts.reduce((s, c) => s + c.height, 0) + Math.max(0, compLayouts.length - 1) * compGap;
    let cursorY = centerY - totalHeight / 2;

    const finalPos = new Map<string, { x: number; y: number }>();
    for (const c of compLayouts) {
      const offsetY = cursorY - c.minY;
      for (const [id, p] of c.pos.entries()) {
        finalPos.set(id, { x: p.x, y: p.y + offsetY });
      }
      cursorY += c.height + compGap;
    }

    setNodes((prev) => prev.map((n) => {
      const p = finalPos.get(n.id);
      return p ? { ...n, x: p.x, y: p.y } : n;
    }));
  };

  const clearActiveCanvas = () => {
    setNodes((prev) => prev.filter((n) => n.canvasId !== activeCanvasId));
    setEdges((prev) => prev.filter((e) => e.canvasId !== activeCanvasId));
    setModuleExpanded({});
    setModuleChildrenCache({});
    setSelectedNodeId(null);
    setConnectSourceNodeId(null);
    setNotePopupNodeId(null);
    setContextNodeId(null);
  };

  const removeNodeById = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
    setConnectSourceNodeId((prev) => (prev === nodeId ? null : prev));
    setNotePopupNodeId((prev) => (prev === nodeId ? null : prev));
    setContextNodeId((prev) => (prev === nodeId ? null : prev));
  };

  const setNodeStatus = (nodeId: string, status: 'clean' | 'editing' | 'modified') => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, status } : n)));
  };

  const selectAttributesByNode = (n: CanvasNodeItem) => {
    if (n.kind === 'module') {
      props.onSelectItem({
        type: 'module',
        data: {
          module_key: String(n.moduleKey || ''),
          root_dir: '',
          display_name: n.displayName,
          doc_zh: '',
          nodes_json: '',
          edges_json: '',
          inputs_json: n.inputsJson,
          outputs_json: n.outputsJson,
          node_count: 0,
          edge_count: 0,
          source: n.module || 'module',
          embedded: 0,
          updated_at: ''
        }
      });
      return;
    }
    props.onSelectItem({
      type: 'function',
      data: {
        function_id: String(n.functionId || ''),
        language: 'cpp',
        file_path: '',
        start_line: 0,
        end_line: 0,
        signature: String(n.signature || ''),
        display_name: n.displayName,
        module: n.module,
        doc_zh: '',
        inputs_json: n.inputsJson,
        outputs_json: n.outputsJson,
        embedded: 0,
        updated_at: ''
      }
    });
  };

  const connectNodes = async (fromId: string, toId: string, fromPort?: string, toPort?: string) => {
    if (fromId === toId) return;
    if (activeEdges.some((e) => e.from === fromId && e.to === toId && (e.fromPort || '') === (fromPort || '') && (e.toPort || '') === (toPort || ''))) return;
    const from = nodeById.get(fromId);
    const to = nodeById.get(toId);
    if (!from || !to) return;
    const m = ioMatchScoreSimple(from.outputsJson, to.inputsJson);
    if (fromPort || toPort) {
      const fp = fromPort || m.sharedNames[0] || undefined;
      const tp = toPort || fp || undefined;
      setEdges((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 10),
          canvasId: activeCanvasId,
          from: fromId,
          to: toId,
          fromPort: fp,
          toPort: tp
        }
      ]);
      setNodeStatus(fromId, 'modified');
      setNodeStatus(toId, 'modified');
      return;
    }
    if (m.sharedNames.length > 0) {
      const chosen = m.sharedNames[0];
      const fp = fromPort || chosen;
      const tp = toPort || fp;
      setEdges((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 10),
          canvasId: activeCanvasId,
          from: fromId,
          to: toId,
          fromPort: fp,
          toPort: tp
        }
      ]);
      setNodeStatus(fromId, 'modified');
      setNodeStatus(toId, 'modified');
      return;
    }
    setEdges((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 10),
        canvasId: activeCanvasId,
        from: fromId,
        to: toId
      }
    ]);
    setNodeStatus(fromId, 'modified');
    setNodeStatus(toId, 'modified');
  };

  const beginPortConnect = (e: React.MouseEvent, fromNodeId: string, fromPort?: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const from = nodeById.get(fromNodeId);
    if (!from) return;
    const p = portAnchorWorld(from, 'out', fromPort);
    setConnectSourceNodeId(fromNodeId);
    setConnectDrag({
      fromId: fromNodeId,
      fromPort,
      toX: p.x,
      toY: p.y
    });
  };

  const finishPortConnect = (e: React.MouseEvent, toNodeId: string, toPort?: string) => {
    if (!connectDrag) return;
    e.preventDefault();
    e.stopPropagation();
    void connectNodes(connectDrag.fromId, toNodeId, connectDrag.fromPort, toPort);
    setConnectDrag(null);
    setConnectSourceNodeId(null);
  };

  const beginCanvasPan = (e: React.MouseEvent) => {
    if (viewMode !== 'graph') return;
    if (connectDrag) return;
    if (e.button === 0) {
      if (!spaceDownRef.current) return;
      const el = e.target as HTMLElement | null;
      const isInteractive = Boolean(el?.closest?.('button,input,textarea,select,option,[role="button"],[data-node-button="1"],[data-port-node]'));
      if (isInteractive) return;
    } else {
      if (e.button !== 1 && e.button !== 2) return;
    }
    e.preventDefault();

    const pointerId = (e as any)?.pointerId;
    if (typeof pointerId === 'number' && canvasAreaRef.current) {
      try {
        canvasAreaRef.current.setPointerCapture(pointerId);
      } catch {
      }
    }
    dragRef.current = {
      mode: 'canvas',
      nodeId: null,
      button: e.button,
      pointerId: typeof pointerId === 'number' ? pointerId : undefined,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWorldX: 0,
      startWorldY: 0,
      currentWorldX: 0,
      currentWorldY: 0,
      startNodeX: 0,
      startNodeY: 0,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      moved: false,
      additive: false
    };
  };

  const beginCanvasSelect = (e: React.MouseEvent) => {
    if (viewMode !== 'graph') return;
    if (e.button !== 0) return;
    if (connectDrag) return;

    const el = e.target as HTMLElement | null;
    const isInteractive = Boolean(el?.closest?.('button,input,textarea,select,option,[role="button"],[data-node-button="1"],[data-port-node]'));
    if (isInteractive) return;

    const additive = Boolean(e.ctrlKey || e.metaKey);
    if (additive) {
      const edgeId = hitTestEdge(e.clientX, e.clientY);
      if (edgeId) {
        const hit = activeEdges.find((x) => x.id === edgeId);
        if (!hit) return;
        const nextNodes = new Set<string>(selectedNodeIds);
        const nextExcluded = new Set<string>(excludedEdgeIds);
        const endpointsSelected = nextNodes.has(hit.from) && nextNodes.has(hit.to) && !nextExcluded.has(hit.id);
        if (endpointsSelected) {
          nextExcluded.add(hit.id);
        } else {
          nextExcluded.delete(hit.id);
          nextNodes.add(hit.from);
          nextNodes.add(hit.to);
        }
        for (const id of Array.from(nextExcluded)) {
          const e2 = activeEdges.find((x) => x.id === id);
          if (!e2) {
            nextExcluded.delete(id);
            continue;
          }
          if (!nextNodes.has(e2.from) || !nextNodes.has(e2.to)) nextExcluded.delete(id);
        }
        applyNodeSelection(Array.from(nextNodes), Array.from(nextExcluded));
        return;
      }
    }

    e.preventDefault();
    const p = toWorldPoint(e.clientX, e.clientY);
    dragRef.current = {
      mode: 'select',
      nodeId: null,
      button: 0,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWorldX: p.x,
      startWorldY: p.y,
      currentWorldX: p.x,
      currentWorldY: p.y,
      startNodeX: 0,
      startNodeY: 0,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      moved: false,
      additive
    };
    setSelectRect(null);
  };

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (viewMode !== 'graph') return;
      if (!canvasAreaRef.current) return;
      e.preventDefault();
      const rect = canvasAreaRef.current.getBoundingClientRect();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const nextScale = viewport.scale * factor;
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      zoomAt(lx, ly, nextScale);
    };
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', onWheel as any);
  }, [viewMode, viewport.x, viewport.y, viewport.scale]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        const target = e.target as HTMLElement | null;
        const tag = String(target?.tagName || '').toLowerCase();
        const inEditable =
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          Boolean(target?.isContentEditable) ||
          Boolean(target?.closest?.('[contenteditable="true"]'));
        if (inEditable) return;
        spaceDownRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceDownRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const beginNodeDrag = (e: React.MouseEvent, n: CanvasNodeItem) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode: 'node',
      nodeId: n.id,
      button: e.button,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWorldX: 0,
      startWorldY: 0,
      currentWorldX: 0,
      currentWorldY: 0,
      startNodeX: n.x,
      startNodeY: n.y,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      moved: false,
      additive: false
    };
  };

  useEffect(() => {
    const endDrag = async () => {
      const d = dragRef.current;
      if (connectDrag) {
        setConnectDrag(null);
        setConnectSourceNodeId(null);
      }
      if (d.mode === 'select') {
        const dx = d.currentWorldX - d.startWorldX;
        const dy = d.currentWorldY - d.startWorldY;
        const show = Math.abs(dx) > 4 / Math.max(0.35, viewport.scale) || Math.abs(dy) > 4 / Math.max(0.35, viewport.scale);
        if (!show) {
          setSelectRect(null);
        } else {
          const rx = Math.min(d.startWorldX, d.currentWorldX);
          const ry = Math.min(d.startWorldY, d.currentWorldY);
          const rw = Math.abs(d.currentWorldX - d.startWorldX);
          const rh = Math.abs(d.currentWorldY - d.startWorldY);
          const nextNodes = d.additive ? new Set<string>(selectedNodeIds) : new Set<string>();
          const nextExcluded = d.additive ? new Set<string>(excludedEdgeIds) : new Set<string>();

          for (const n of activeNodes) {
            const r = nodeRect(n);
            const inside = r.x >= rx && r.y >= ry && r.x + r.w <= rx + rw && r.y + r.h <= ry + rh;
            if (inside) nextNodes.add(n.id);
          }
          for (const e of activeEdges) {
            if (e.hidden) continue;
            const pts = edgePolylinePoints(e);
            if (!pts) continue;
            let hit = false;
            for (let i = 0; i < pts.length - 1; i++) {
              const a = pts[i];
              const b = pts[i + 1];
              if (segIntersectsRect(a.x, a.y, b.x, b.y, rx, ry, rw, rh)) {
                hit = true;
                break;
              }
            }
            if (hit) {
              nextNodes.add(e.from);
              nextNodes.add(e.to);
            }
          }

          for (const id of Array.from(nextExcluded)) {
            const e2 = activeEdges.find((x) => x.id === id);
            if (!e2) {
              nextExcluded.delete(id);
              continue;
            }
            if (!nextNodes.has(e2.from) || !nextNodes.has(e2.to)) nextExcluded.delete(id);
          }
          applyNodeSelection(Array.from(nextNodes), Array.from(nextExcluded));
          setSelectRect(null);
        }
      }
      dragRef.current = {
        mode: 'none',
        nodeId: null,
        button: 0,
        pointerId: undefined,
        startClientX: 0,
        startClientY: 0,
        startWorldX: 0,
        startWorldY: 0,
        currentWorldX: 0,
        currentWorldY: 0,
        startNodeX: 0,
        startNodeY: 0,
        startViewportX: 0,
        startViewportY: 0,
        moved: false,
        additive: false
      };
    };

    const onMoveCore = (clientX: number, clientY: number, buttons: number | undefined) => {
      const d = dragRef.current;
      if (connectDrag) {
        const p = toWorldPoint(clientX, clientY);
        setConnectDrag((prev) => (prev ? { ...prev, toX: p.x - contentBounds.ox, toY: p.y - contentBounds.oy } : prev));
      }
      if (d.mode === 'none') return;
      if (typeof buttons === 'number' && buttons === 0) {
        void endDrag();
        return;
      }
      const dx = clientX - d.startClientX;
      const dy = clientY - d.startClientY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;
      if (d.mode === 'canvas') {
        setViewport((prev) => ({ ...prev, x: d.startViewportX + dx, y: d.startViewportY + dy }));
        return;
      }
      if (d.mode === 'node' && d.nodeId) {
        const scale = Math.max(viewport.scale, 0.1);
        const nx = d.startNodeX + dx / scale;
        const ny = d.startNodeY + dy / scale;
        setNodes((prev) => prev.map((n) => (n.id === d.nodeId ? { ...n, x: nx, y: ny } : n)));
        return;
      }
      if (d.mode === 'select') {
        const p = toWorldPoint(clientX, clientY);
        d.currentWorldX = p.x;
        d.currentWorldY = p.y;
        const show = Math.abs(dx) > 4 || Math.abs(dy) > 4;
        if (!show) {
          setSelectRect(null);
          return;
        }
        const rx = Math.min(d.startWorldX, p.x);
        const ry = Math.min(d.startWorldY, p.y);
        const rw = Math.abs(p.x - d.startWorldX);
        const rh = Math.abs(p.y - d.startWorldY);
        setSelectRect({ x: rx, y: ry, w: rw, h: rh });
      }
    };
    const onMouseMove = (e: MouseEvent) => onMoveCore(e.clientX, e.clientY, e.buttons);
    const onPointerMove = (e: PointerEvent) => onMoveCore(e.clientX, e.clientY, e.buttons);
    const onMouseUp = () => void endDrag();
    const onPointerUp = () => void endDrag();
    const onPointerCancel = () => void endDrag();
    const onBlur = () => void endDrag();
    const onContextMenu = (e: MouseEvent) => {
      if (dragRef.current.mode === 'canvas') {
        e.preventDefault();
        e.stopPropagation();
        void endDrag();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onBlur);
    window.addEventListener('contextmenu', onContextMenu, { capture: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('contextmenu', onContextMenu, { capture: true } as any);
    };
  }, [viewport.x, viewport.y, viewport.scale, connectDrag, contentBounds.ox, contentBounds.oy, activeNodes, activeEdges, selectedNodeIds, excludedEdgeIds]);

  const loadModuleChildren = async (nodeId: string) => {
    const target = nodeById.get(nodeId);
    if (!target || !target.moduleKey) return { nodes: [] as CanvasNodeItem[], edges: [] as CanvasEdgeItem[] };

    const localMod = props.generatedModules ? props.generatedModules[String(target.moduleKey || '')] : null;
    if (localMod && Array.isArray(localMod.nodes) && Array.isArray(localMod.edges)) {
      const rawNodes = localMod.nodes;
      const rawEdges = localMod.edges;
      const nextNodes: CanvasNodeItem[] = rawNodes
        .map((n: any) => {
          const kind: 'module' | 'function' = String(n?.kind || '') === 'module' ? 'module' : 'function';
          const id = String(n?.id || '').trim() || Math.random().toString(36).slice(2, 10);
          return {
            id,
            canvasId: activeCanvasId,
            kind,
            status: normalizeNodeStatus(n?.status),
            changeSummary: n?.changeSummary ? String(n.changeSummary) : undefined,
            functionId: n?.functionId ? String(n.functionId) : undefined,
            moduleKey: n?.moduleKey ? String(n.moduleKey) : undefined,
            displayName: String(n?.displayName || n?.functionId || n?.moduleKey || 'node'),
            module: String(n?.module || (kind === 'module' ? 'module' : 'common')),
            signature: n?.signature ? String(n.signature) : undefined,
            inputsJson: String(n?.inputsJson || '{}'),
            outputsJson: String(n?.outputsJson || '{}'),
            x: asFiniteNumber(n?.x, 0),
            y: asFiniteNumber(n?.y, 0)
          };
        })
        .filter(Boolean);

      const nextEdges: CanvasEdgeItem[] = rawEdges
        .map((e: any) => {
          const from = String(e?.from || '').trim();
          const to = String(e?.to || '').trim();
          if (!from || !to) return null;
          return {
            id: String(e?.id || '').trim() || Math.random().toString(36).slice(2, 10),
            canvasId: activeCanvasId,
            from,
            to,
            fromPort: e?.fromPort ? String(e.fromPort) : undefined,
            toPort: e?.toPort ? String(e.toPort) : undefined,
            hidden: Boolean(e?.hidden)
          };
        })
        .filter(Boolean) as CanvasEdgeItem[];

      return { nodes: nextNodes, edges: nextEdges };
    }
    const prevStatus = normalizeNodeStatus(target.status);
    setNodeStatus(nodeId, 'editing');
    const res = await ragGetModule(target.moduleKey);
    if (!res.ok || !res.module) {
      setNodeStatus(nodeId, prevStatus);
      return { nodes: [] as CanvasNodeItem[], edges: [] as CanvasEdgeItem[] };
    }
    const rawNodes = JSON.parse(String(res.module.nodes_json || '[]'));
    const rawEdges = JSON.parse(String(res.module.edges_json || '[]'));
    if (!Array.isArray(rawNodes) || !rawNodes.length) {
      setNodeStatus(nodeId, prevStatus);
      return { nodes: [] as CanvasNodeItem[], edges: [] as CanvasEdgeItem[] };
    }
    const idMap = new Map<string, string>();
    const rawPosX = new Map<string, number>();
    const existingFnById = new Map<string, string>(
      activeNodes.filter((n) => n.kind === 'function' && n.functionId).map((n) => [String(n.functionId), n.id])
    );
    const existingModuleByKey = new Map<string, string>(
      activeNodes.filter((n) => n.kind === 'module' && n.moduleKey).map((n) => [String(n.moduleKey), n.id])
    );
    const minX = Math.min(...rawNodes.map((n: any) => Number(n.x || 0)));
    const minY = Math.min(...rawNodes.map((n: any) => Number(n.y || 0)));
    const childCanvasIds: string[] = [];
    const appendedNodes: CanvasNodeItem[] = [];
    for (let idx = 0; idx < rawNodes.length; idx += 1) {
      const n: any = rawNodes[idx];
      const rawId = String(n.id ?? '');
      const rawFnId = String(n.function_id || n.functionId || '');
      const rawModuleKey = String(n.module_key || n.moduleKey || '');
      const kind: 'module' | 'function' = String(n.kind || 'node') === 'module' ? 'module' : 'function';

      const reuseId =
        kind === 'function' && rawFnId
          ? existingFnById.get(rawFnId)
          : kind === 'module' && rawModuleKey
            ? existingModuleByKey.get(rawModuleKey)
            : undefined;

      const nid = reuseId || Math.random().toString(36).slice(2, 10);
      if (rawId) idMap.set(rawId, nid);
      if (rawFnId) idMap.set(rawFnId, nid);
      if (Number.isFinite(Number(n.x))) {
        if (rawId) rawPosX.set(rawId, Number(n.x));
        if (rawFnId) rawPosX.set(rawFnId, Number(n.x));
      }

      if (!reuseId) {
        appendedNodes.push({
          id: nid,
          canvasId: activeCanvasId,
          kind,
          status: 'clean',
          functionId: rawFnId,
          moduleKey: rawModuleKey,
          displayName: String(n.display_name || rawFnId || rawId || 'node'),
          module: String(n.module || 'common'),
          signature: String(n.signature || ''),
          inputsJson: String(n.inputsJson || n.inputs_json || '{}'),
          outputsJson: String(n.outputsJson || n.outputs_json || '{}'),
          x: target.x + 240 + (Number(n.x || 0) - minX),
          y: target.y + (Number(n.y || 0) - minY) + (idx % 2 === 0 ? 0 : 8)
        });
      }

      if (nid) childCanvasIds.push(nid);
    }

    const appendedNodeById = new Map(appendedNodes.map((n) => [n.id, n] as const));
    const allNodeById = new Map([...activeNodes, ...appendedNodes].map((n) => [n.id, n] as const));
    const pickPort = (outJson: string, inJson: string, preferredOut?: string, preferredIn?: string) => {
      const m = ioMatchScoreSimple(outJson, inJson);
      if (preferredOut || preferredIn) {
        const fp = preferredOut || m.sharedNames[0];
        const tp = preferredIn || fp;
        return { fromPort: fp || undefined, toPort: tp || undefined, score: m.score };
      }
      if (m.sharedNames.length) {
        const chosen = m.sharedNames[0];
        return { fromPort: chosen, toPort: chosen, score: m.score };
      }
      return { fromPort: undefined, toPort: undefined, score: 0 };
    };

    const appendedEdges: CanvasEdgeItem[] = Array.isArray(rawEdges)
      ? rawEdges
          .map((e: any) => {
            const rawFrom = String(e.from ?? e.source ?? e.src ?? '');
            const rawTo = String(e.to ?? e.target ?? e.dst ?? '');
            const a = idMap.get(rawFrom) || '';
            const b = idMap.get(rawTo) || '';
            if (!a || !b) return null;
            const na = allNodeById.get(a);
            const nb = allNodeById.get(b);
            if (!na || !nb) return null;

            const eFromPort = String(e.fromPort ?? e.from_port ?? '').trim() || undefined;
            const eToPort = String(e.toPort ?? e.to_port ?? '').trim() || undefined;

            const forward = pickPort(na.outputsJson, nb.inputsJson, eFromPort, eToPort);
            const reverse = pickPort(nb.outputsJson, na.inputsJson, eFromPort, eToPort);

            let swapped = reverse.score > forward.score;
            if (!swapped && reverse.score === forward.score) {
              const fx = rawPosX.get(rawFrom);
              const tx = rawPosX.get(rawTo);
              if (Number.isFinite(fx as any) && Number.isFinite(tx as any) && (fx as number) > (tx as number) + 1) swapped = true;
            }
            const from = swapped ? b : a;
            const to = swapped ? a : b;
            const ports = swapped ? reverse : forward;

            return {
              id: Math.random().toString(36).slice(2, 10),
              canvasId: activeCanvasId,
              from,
              to,
              fromPort: ports.fromPort,
              toPort: ports.toPort,
              hidden: Boolean(e.hidden)
            } as CanvasEdgeItem;
          })
          .filter(Boolean) as CanvasEdgeItem[]
      : [];

    const rootChildIds = (() => {
      const ids = Array.from(new Set(childCanvasIds));
      const indeg = new Map<string, number>(ids.map((id) => [id, 0]));
      for (const e of appendedEdges) {
        if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
        indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
      }
      return ids.filter((id) => (indeg.get(id) || 0) === 0);
    })();

    const moduleJoinEdges: CanvasEdgeItem[] = rootChildIds.map((rid) => ({
      id: Math.random().toString(36).slice(2, 10),
      canvasId: activeCanvasId,
      from: nodeId,
      to: rid,
      hidden: true
    }));

    const allEdgesToAppend = [...appendedEdges, ...moduleJoinEdges];
    setNodes((prev) => [...prev, ...appendedNodes]);
    setEdges((prev) => [...prev, ...allEdgesToAppend]);
    setNodeStatus(nodeId, 'modified');
    return { nodes: appendedNodes, edges: allEdgesToAppend };
  };

  const toggleModuleExpand = async (nodeId: string) => {
    const expanded = Boolean(moduleExpanded[nodeId]);
    if (expanded) {
      const cache = moduleChildrenCache[nodeId];
      if (!cache) {
        setModuleExpanded((prev) => ({ ...prev, [nodeId]: false }));
        return;
      }
      const hideNodeIds = new Set(cache.nodes.map((n) => n.id));
      const hideEdgeIds = new Set(cache.edges.map((e) => e.id));
      setNodes((prev) => prev.filter((n) => !hideNodeIds.has(n.id)));
      setEdges((prev) => prev.filter((e) => !hideEdgeIds.has(e.id) && !hideNodeIds.has(e.from) && !hideNodeIds.has(e.to)));
      setModuleExpanded((prev) => ({ ...prev, [nodeId]: false }));
      return;
    }
    const cache = moduleChildrenCache[nodeId];
    if (cache && cache.nodes.length) {
      setNodes((prev) => [...prev, ...cache.nodes.filter((n) => !prev.some((x) => x.id === n.id))]);
      setEdges((prev) => [...prev, ...cache.edges.filter((e) => !prev.some((x) => x.id === e.id))]);
      setModuleExpanded((prev) => ({ ...prev, [nodeId]: true }));
      requestAnimationFrame(() => autoLayoutNodes());
      return;
    }
    const loaded = await loadModuleChildren(nodeId);
    setModuleChildrenCache((prev) => ({ ...prev, [nodeId]: loaded }));
    setModuleExpanded((prev) => ({ ...prev, [nodeId]: true }));
    requestAnimationFrame(() => autoLayoutNodes());
  };

  const activeCanvas = canvases.find(c => c.id === activeCanvasId);
  const statusMeta: Record<'clean' | 'editing' | 'modified', { label: string; cls: string }> = {
    clean: { label: '未修改', cls: 'bg-gray-300' },
    editing: { label: '修改中', cls: 'bg-amber-400' },
    modified: { label: '已修改', cls: 'bg-green-500' }
  };

  useEffect(() => {
    const key = (props.injectModuleKey || '').trim();
    if (!key) return;
    const id = Math.random().toString(36).slice(2, 10);
    setNodes((prev) => [
      ...prev,
      {
        id,
        canvasId: activeCanvasId,
        kind: 'module',
        status: 'clean',
        moduleKey: key,
        displayName: key,
        module: 'module',
        signature: '',
        inputsJson: '{}',
        outputsJson: '{}',
        x: 120,
        y: 120
      }
    ]);
    applyNodeSelection([id], []);
  }, [props.injectModuleSignal]);

  useEffect(() => {
    if (!props.createModel) return;
    const id = Math.random().toString(36).slice(2, 10);
    setNodes((prev) => [
      ...prev,
      {
        id,
        canvasId: activeCanvasId,
        kind: 'module',
        status: 'clean',
        moduleKey: props.createModel!.moduleKey,
        displayName: props.createModel!.displayName,
        module: 'module',
        signature: '',
        inputsJson: '{}',
        outputsJson: '{}',
        x: 160,
        y: 160
      }
    ]);
    applyNodeSelection([id], []);
  }, [props.createModelSignal]);

  useEffect(() => {
    const sig = Number(props.injectFunctionSignal || 0);
    if (!sig) return;
    const p = props.injectFunctionPayload;
    if (!p || !p.functionId) return;
    const id = Math.random().toString(36).slice(2, 10);
    setNodes((prev) => [
      ...prev,
      {
        id,
        canvasId: activeCanvasId,
        kind: 'function',
        status: 'clean',
        functionId: p.functionId,
        displayName: p.displayName || p.functionId,
        module: p.module || 'common',
        signature: p.signature || '',
        inputsJson: '{}',
        outputsJson: '{}',
        x: 200,
        y: 200
      }
    ]);
    applyNodeSelection([id], []);
  }, [props.injectFunctionSignal]);

  useEffect(() => {
    const sig = Number(props.injectReuseSignal || 0);
    if (!sig) return;
    const payload = props.injectReusePayload;
    if (!payload) return;
    const funcs = Array.isArray((payload as any).functions) ? ((payload as any).functions as any[]) : [];
    const mods = Array.isArray((payload as any).modules) ? ((payload as any).modules as any[]) : [];

    const existingFn = new Set(activeNodes.filter((n) => n.kind === 'function' && n.functionId).map((n) => String(n.functionId)));
    const existingMod = new Set(activeNodes.filter((n) => n.kind === 'module' && n.moduleKey).map((n) => String(n.moduleKey)));

    const baseX = activeNodes.length ? Math.max(...activeNodes.map((n) => n.x)) + 260 : 200;
    const baseY = 120;
    const perRow = 2;
    const colGap = 260;
    const rowGap = 160;

    const appended: CanvasNodeItem[] = [];
    const newIds: string[] = [];
    let idx = 0;

    for (const m of mods) {
      const mk = String(m?.moduleKey || '').trim();
      if (!mk || existingMod.has(mk)) continue;
      const id = Math.random().toString(36).slice(2, 10);
      const x = baseX + (idx % perRow) * colGap;
      const y = baseY + Math.floor(idx / perRow) * rowGap;
      idx += 1;
      appended.push({
        id,
        canvasId: activeCanvasId,
        kind: 'module',
        status: 'clean',
        moduleKey: mk,
        displayName: String(m?.displayName || mk),
        module: 'module',
        signature: '',
        inputsJson: String(m?.inputsJson || '{}'),
        outputsJson: String(m?.outputsJson || '{}'),
        x,
        y
      });
      newIds.push(id);
      existingMod.add(mk);
    }

    for (const f of funcs) {
      const fid = String(f?.functionId || '').trim();
      if (!fid || existingFn.has(fid)) continue;
      const id = Math.random().toString(36).slice(2, 10);
      const x = baseX + (idx % perRow) * colGap;
      const y = baseY + Math.floor(idx / perRow) * rowGap;
      idx += 1;
      appended.push({
        id,
        canvasId: activeCanvasId,
        kind: 'function',
        status: 'clean',
        functionId: fid,
        displayName: String(f?.displayName || fid),
        module: String(f?.module || 'common'),
        signature: String(f?.signature || ''),
        inputsJson: String(f?.inputsJson || '{}'),
        outputsJson: String(f?.outputsJson || '{}'),
        x,
        y
      });
      newIds.push(id);
      existingFn.add(fid);
    }

    if (!appended.length) return;
    setNodes((prev) => [...prev, ...appended]);
    applyNodeSelection(newIds, []);
    requestAnimationFrame(() => autoLayoutNodes());
  }, [props.injectReuseSignal]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = String(target?.tagName || '').toLowerCase();
      const inEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable) ||
        Boolean(target?.closest?.('[contenteditable="true"]'));
      if (inEditable) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length) {
        e.preventDefault();
        for (const id of selectedNodeIds) removeNodeById(id);
        applyNodeSelection([], []);
      }

      if (viewMode !== 'graph') return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomByFactor(1.08);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomByFactor(0.92);
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        setViewport({ x: 0, y: 0, scale: 1 });
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setViewport((v) => ({ ...v, x: v.x + 40 }));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setViewport((v) => ({ ...v, x: v.x - 40 }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setViewport((v) => ({ ...v, y: v.y + 40 }));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setViewport((v) => ({ ...v, y: v.y - 40 }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeIds, removeNodeById, viewMode]);

  useEffect(() => {
    aiTargetNodeRef.current = selectedNodeId;
    if (selectedNodeId) setNodeStatus(selectedNodeId, 'editing');
  }, [props.aiEditStartSignal]);

  useEffect(() => {
    const id = aiTargetNodeRef.current;
    if (!id) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              status: 'modified',
              changeSummary: props.aiEditSummary || n.changeSummary || '已完成变更。'
            }
          : n
      )
    );
    setNotePopupNodeId(null);
  }, [props.aiEditApplySignal]);

  useEffect(() => {
    const id = aiTargetNodeRef.current;
    if (!id) return;
    setNodeStatus(id, 'clean');
    setNotePopupNodeId(null);
  }, [props.aiEditFailSignal]);

  return (
    <div className="h-full flex flex-col bg-[#F5F5F5] relative overflow-hidden">
      {/* Canvas Tabs */}
      <div className="h-8 bg-[#6A1B9A] flex items-end px-1 gap-1 shrink-0 overflow-x-auto">
        {canvases.map(canvas => (
          <div 
            key={canvas.id}
            className={clsx(
              "px-3 py-1 text-xs font-medium rounded-t-md flex items-center gap-2 cursor-pointer group min-w-[100px] max-w-[200px]",
              activeCanvasId === canvas.id ? "bg-white text-[#6A1B9A]" : "bg-[#4A148C] text-white/70 hover:bg-[#7B1FA2] hover:text-white"
            )}
            onClick={() => setActiveCanvasId(canvas.id)}
          >
            <div className={clsx("w-2 h-2 rounded-full shrink-0", activeCanvasId === canvas.id ? "bg-[#6A1B9A]" : "bg-white/50")}></div>
            
            {editingId === canvas.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={saveEditing}
                onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                className="bg-transparent outline-none w-full min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex-1" onClick={(e) => {
                if (activeCanvasId === canvas.id) {
                  e.stopPropagation();
                  startEditing(canvas.id, canvas.name);
                }
              }}>
                {canvas.name}
              </span>
            )}

            {canvases.length > 1 && (
              <X 
                className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-red-500 cursor-pointer shrink-0 transition-opacity" 
                onClick={(e) => handleDeleteCanvas(canvas.id, e)}
              />
            )}
          </div>
        ))}
        <button 
          onClick={handleAddCanvas}
          className="h-6 w-6 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#7B1FA2] rounded mb-1"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div
        ref={canvasAreaRef}
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundColor: '#fff',
          backgroundImage:
            viewMode === 'graph'
              ? 'linear-gradient(#6A1B9A22 1px, transparent 1px), linear-gradient(90deg, #6A1B9A22 1px, transparent 1px)'
              : 'none',
          backgroundSize: viewMode === 'graph' ? '20px 20px' : undefined,
          touchAction: 'none',
          overscrollBehavior: 'none'
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropCanvas}
        onPointerDownCapture={(e) => {
          if (e.button === 2) {
            e.preventDefault();
            rightClickRef.current = { active: true, startX: e.clientX, startY: e.clientY, panStarted: false };
            return;
          }
          rightClickRef.current.active = false;
          if (e.button === 1) {
            beginCanvasPan(e as any);
            return;
          }
          if (e.button === 0 && spaceDownRef.current) {
            beginCanvasPan(e as any);
            return;
          }
          beginCanvasSelect(e as any);
        }}
        onPointerMoveCapture={(e) => {
          const st = rightClickRef.current;
          if (!st.active || st.panStarted) return;
          const dx = e.clientX - st.startX;
          const dy = e.clientY - st.startY;
          if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return;
          st.panStarted = true;
          beginCanvasPan({
            button: 2,
            clientX: st.startX,
            clientY: st.startY,
            pointerId: (e as any).pointerId,
            shiftKey: false,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            target: e.target,
            currentTarget: e.currentTarget,
            preventDefault: () => {}
          } as any);
        }}
        onPointerUpCapture={(e) => {
          if (e.button !== 2) return;
          const st = rightClickRef.current;
          rightClickRef.current = { active: false, startX: 0, startY: 0, panStarted: false };
          const dx = e.clientX - st.startX;
          const dy = e.clientY - st.startY;
          const moved = st.panStarted || Math.abs(dx) > 4 || Math.abs(dy) > 4;
          if (moved) return;
          const rect = canvasAreaRef.current?.getBoundingClientRect();
          if (!rect) return;
          const target = e.target as HTMLElement | null;

          if (viewMode === 'code') {
            setCanvasMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, mode: 'code' });
            return;
          }

          const nodeEl = target?.closest?.('[data-node-id]') as HTMLElement | null;
          if (nodeEl) {
            const nodeId = String(nodeEl.dataset.nodeId || '');
            if (!nodeId) return;
            setCanvasMenu(null);
            setEdgeMenu(null);
            if (!selectedNodeSet.has(nodeId) || selectedNodeIds.length <= 1) {
              applyNodeSelection([nodeId], []);
              const n = activeNodes.find((x) => x.id === nodeId);
              if (n) selectAttributesByNode(n);
            }
            setNodeMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, nodeId });
            return;
          }

          const edgeId = hitTestEdge(e.clientX, e.clientY);
          if (edgeId) {
            const hit = activeEdges.find((x) => x.id === edgeId);
            if (hit) {
              const isSelected = selectedEdgeSet.has(edgeId);
              if (!isSelected || selectedNodeIds.length <= 1) {
                applyNodeSelection([hit.from, hit.to], []);
              }
            }
            setEdgeMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, edgeId });
            return;
          }

          setCanvasMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, mode: 'graph' });
        }}
        onClick={(e) => {
          const el = e.target as HTMLElement | null;
          if (el?.closest?.('button,input,textarea,select,option,[role="button"],[data-node-button="1"],[data-port-node]')) return;
          setConnectSourceNodeId(null);
          applyNodeSelection([], []);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      >
        {viewMode === 'graph' && (
          <div className="absolute right-2 top-2 z-50 flex flex-col gap-1 select-none">
            <button
              onClick={() => zoomByFactor(1.08)}
              className="h-8 w-8 rounded border border-[#E1BEE7] bg-white hover:bg-[#F8ECFA] text-[#6A1B9A] font-semibold"
              title="放大（+）"
            >
              +
            </button>
            <button
              onClick={() => zoomByFactor(0.92)}
              className="h-8 w-8 rounded border border-[#E1BEE7] bg-white hover:bg-[#F8ECFA] text-[#6A1B9A] font-semibold"
              title="缩小（-）"
            >
              -
            </button>
            <button
              onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}
              className="h-8 w-8 rounded border border-[#E1BEE7] bg-white hover:bg-[#F8ECFA] text-[#6A1B9A]"
              title="重置视图（0）"
            >
              <Maximize2 className="w-4 h-4 mx-auto" />
            </button>
            <div className="mt-1 h-6 w-8 rounded border border-[#E1BEE7] bg-white text-[10px] text-[#6A1B9A] flex items-center justify-center">
              {Math.round(viewport.scale * 100)}%
            </div>
          </div>
        )}
        {viewMode === 'graph' && (
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
              transformOrigin: '0 0'
            }}
          >
            <div className="absolute left-0 top-0" style={{ width: contentBounds.w, height: contentBounds.h }}>
              <svg
                className="absolute left-0 top-0 pointer-events-none"
                width={contentBounds.w}
                height={contentBounds.h}
                style={{ overflow: 'visible', zIndex: 20 }}
              >
                <defs>
                  <marker id="gaasd-arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#7B1FA2" />
                  </marker>
                  <marker id="gaasd-arrow-preview" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#AB47BC" />
                  </marker>
                </defs>
                {activeEdges.map((e) => {
                  if (e.hidden) return null;
                  const from = nodeById.get(e.from);
                  const to = nodeById.get(e.to);
                  if (!from || !to) return null;
                  const a1 = getAnchorRender(from, 'out', e.fromPort);
                  const a2 = getAnchorRender(to, 'in', e.toPort);
                  const x1 = a1.x;
                  const y1 = a1.y;
                  const x2 = a2.x;
                  const y2 = a2.y;
                  const minStub = 34;
                  const dx = x2 - x1;
                  const midX = Math.abs(dx) >= minStub * 2 ? (x1 + x2) / 2 : x1 + Math.sign(dx || 1) * minStub;
                  const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                  const sel = selectedEdgeSet.has(e.id);
                  return (
                    <path
                      key={e.id}
                      d={d}
                      stroke={sel ? '#4A148C' : '#7B1FA2'}
                      strokeWidth={sel ? 2.6 : 1.6}
                      opacity={sel ? 1 : 0.9}
                      fill="none"
                      markerEnd="url(#gaasd-arrow)"
                    />
                  );
                })}
                {debugAnchors &&
                  activeEdges.map((e) => {
                    if (e.hidden) return null;
                    const from = nodeById.get(e.from);
                    const to = nodeById.get(e.to);
                    if (!from || !to) return null;
                    const a1 = getAnchorRender(from, 'out', e.fromPort);
                    const a2 = getAnchorRender(to, 'in', e.toPort);
                    const x1 = a1.x;
                    const y1 = a1.y;
                    const x2 = a2.x;
                    const y2 = a2.y;
                    return (
                      <g key={`dbg-${e.id}`}>
                        <circle cx={x1} cy={y1} r={3} fill="#00C853" opacity="0.9" />
                        <circle cx={x2} cy={y2} r={3} fill="#D50000" opacity="0.9" />
                        {debugIds && (
                          <text x={x2 + 6} y={y2 - 6} fontSize={10} fill="#111827" opacity="0.8">
                            {String(e.to).slice(-6)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                {connectDrag && nodeById.get(connectDrag.fromId) && (() => {
                  const from = nodeById.get(connectDrag.fromId)!;
                  const a1 = portAnchorWorld(from, 'out', connectDrag.fromPort);
                  const x1 = a1.x + contentBounds.ox;
                  const y1 = a1.y + contentBounds.oy;
                  const x2 = connectDrag.toX + contentBounds.ox;
                  const y2 = connectDrag.toY + contentBounds.oy;
                  const minStub = 34;
                  const midX = x2 >= x1 + minStub * 2 ? (x1 + x2) / 2 : x1 + minStub;
                  const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                  return <path d={d} stroke="#AB47BC" strokeWidth="1.4" fill="none" strokeDasharray="4 3" markerEnd="url(#gaasd-arrow-preview)" />;
                })()}
              </svg>
              {selectionBounds && (
                <div
                  className="absolute pointer-events-none border-2 border-dashed border-[#6A1B9A] rounded-md"
                  style={{ left: selectionBounds.x, top: selectionBounds.y, width: selectionBounds.w, height: selectionBounds.h, zIndex: 21 }}
                />
              )}
              {selectRect && (
                <div
                  className="absolute pointer-events-none border border-[#6A1B9A] bg-[#6A1B9A22] rounded"
                  style={{ left: selectRect.x, top: selectRect.y, width: selectRect.w, height: selectRect.h, zIndex: 22 }}
                />
              )}
              {activeNodes.map((n) => {
                const ports = getPorts(n);
                return (
                  <button
                    key={n.id}
                    data-node-button="1"
                    data-node-id={n.id}
                    onMouseDown={(e) => beginNodeDrag(e, n)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectSourceNodeId && connectSourceNodeId !== n.id) {
                        void connectNodes(connectSourceNodeId, n.id);
                        setConnectSourceNodeId(null);
                      }

                      const additive = Boolean(e.ctrlKey || e.metaKey);
                      if (additive) {
                        const nextNodes = new Set<string>(selectedNodeIds);
                        const nextExcluded = new Set<string>(excludedEdgeIds);
                        if (nextNodes.has(n.id)) nextNodes.delete(n.id);
                        else nextNodes.add(n.id);
                        for (const id of Array.from(nextExcluded)) {
                          const e2 = activeEdges.find((x) => x.id === id);
                          if (!e2) {
                            nextExcluded.delete(id);
                            continue;
                          }
                          if (!nextNodes.has(e2.from) || !nextNodes.has(e2.to)) nextExcluded.delete(id);
                        }
                        applyNodeSelection(Array.from(nextNodes), Array.from(nextExcluded));
                        selectAttributesByNode(n);
                        return;
                      }

                      const alreadySingle = selectedNodeIds.length === 1 && selectedNodeIds[0] === n.id;
                      applyNodeSelection([n.id], []);
                      if (alreadySingle) {
                        setNotePopupNodeId((prev) => (prev === n.id ? null : n.id));
                      } else if (normalizeNodeStatus(n.status) === 'modified' && n.changeSummary) {
                        setNotePopupNodeId(n.id);
                      }
                      selectAttributesByNode(n);
                    }}
                    onDoubleClick={() => {
                      if (n.kind === 'module') void toggleModuleExpand(n.id);
                    }}
                    className={clsx(
                      "absolute w-[180px] rounded-md border px-3 py-2 text-left shadow-sm",
                      n.kind === 'module' ? "bg-[#FFF7ED] border-[#FDBA74]" : "bg-white border-[#D8B4FE]",
                      selectedNodeSet.has(n.id) ? "ring-2 ring-[#6A1B9A]" : ""
                    )}
                    style={{ left: n.x + contentBounds.ox, top: n.y + contentBounds.oy, height: ports.h }}
                  >
                    {ports.inputs.map((name, idx) => (
                      <span
                        key={`in-${name}-${idx}`}
                        className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-white border border-[#AB47BC] shadow-sm"
                        style={{ top: 26 + idx * 14 }}
                        data-port-node={n.id}
                        data-port-side="in"
                        data-port-name={name}
                        onMouseUp={(e) => finishPortConnect(e, n.id, name)}
                        title={`输入：${name}`}
                      />
                    ))}
                    {ports.outputs.map((name, idx) => (
                      <span
                        key={`out-${name}-${idx}`}
                        className="absolute right-[-5px] w-2.5 h-2.5 rounded-full bg-[#AB47BC] border border-white shadow-sm"
                        style={{ top: 26 + idx * 14 }}
                        data-port-node={n.id}
                        data-port-side="out"
                        data-port-name={name}
                        onMouseDown={(e) => beginPortConnect(e, n.id, name)}
                        title={`输出：${name}（拖拽连线）`}
                      />
                    ))}
                    {!ports.inputs.length && (
                      <span
                        className="absolute left-[-5px] top-[26px] w-2.5 h-2.5 rounded-full bg-white border border-[#AB47BC] shadow-sm"
                        data-port-node={n.id}
                        data-port-side="in"
                        data-port-name=""
                        onMouseUp={(e) => finishPortConnect(e, n.id)}
                        title="输入端口"
                      />
                    )}
                    {!ports.outputs.length && (
                      <span
                        className="absolute right-[-5px] top-[26px] w-2.5 h-2.5 rounded-full bg-[#AB47BC] border border-white shadow-sm"
                        data-port-node={n.id}
                        data-port-side="out"
                        data-port-name=""
                        onMouseDown={(e) => beginPortConnect(e, n.id)}
                        title="输出端口（拖拽连线）"
                      />
                    )}
                    <span className={clsx("absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full", statusMeta[normalizeNodeStatus(n.status)].cls)} title={statusMeta[normalizeNodeStatus(n.status)].label} />
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-[#4A148C] truncate pl-3">{n.displayName}</div>
                      <div className="flex items-center gap-1">
                        {n.kind === 'module' && (
                          <span
                            className="text-[10px] text-gray-400 hover:text-[#6A1B9A]"
                            title={moduleExpanded[n.id] ? '折叠模块' : '展开模块'}
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleModuleExpand(n.id);
                            }}
                          >
                            {moduleExpanded[n.id] ? '▾' : '▸'}
                          </span>
                        )}
                        <span
                          className="text-[10px] text-gray-400 hover:text-red-500"
                          title="删除节点"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNodeById(n.id);
                          }}
                        >
                          ×
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500">{n.module}</div>
                    {debugIds && (
                      <div className="mt-1 text-[9px] text-gray-400 truncate">
                        {n.id.slice(-6)} {n.functionId ? `fn:${String(n.functionId).slice(-10)}` : n.moduleKey ? `mk:${String(n.moduleKey).slice(-10)}` : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'code' && (
          <div className="absolute inset-0 overflow-auto bg-white">
            {codeBusy ? (
              <div className="p-3 text-xs text-gray-500">生成代码中...</div>
            ) : (
              <div className="min-w-max font-mono text-[12px] text-gray-800">
                {(codeText || '暂无可展示的代码（请先在画布加入函数节点并连线）')
                  .replace(/\r\n/g, '\n')
                  .split('\n')
                  .map((line, idx) => (
                    <div key={idx} className="flex">
                      <div className="w-14 shrink-0 select-none text-right pr-3 text-gray-400 bg-[#F9FAFB] border-r border-gray-100">
                        {idx + 1}
                      </div>
                      <div className="px-3 whitespace-pre">{line.length ? line : ' '}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        {viewMode === 'graph' && notePopupNodeId && nodeById.get(notePopupNodeId) && (
          <div
            className="absolute z-20 w-[260px] rounded-md border border-[#E1BEE7] bg-white shadow-xl p-3"
            style={{
              left: viewport.x + ((nodeById.get(notePopupNodeId)?.x || 0) + contentBounds.ox + 188) * viewport.scale,
              top: viewport.y + ((nodeById.get(notePopupNodeId)?.y || 0) + contentBounds.oy) * viewport.scale
            }}
          >
            <div className="text-[11px] font-semibold text-[#6A1B9A] mb-1">变更结果</div>
            <div className="text-[11px] text-gray-700 leading-5 whitespace-pre-wrap">
              {nodeById.get(notePopupNodeId)?.changeSummary || '暂无变更说明'}
            </div>
          </div>
        )}
        {viewMode === 'graph' && contextNodeId && nodeById.get(contextNodeId) && (
          <div
            className="absolute z-20 w-[280px] rounded-md border border-[#E1BEE7] bg-white shadow-xl p-3"
            style={{
              left: viewport.x + ((nodeById.get(contextNodeId)?.x || 0) + contentBounds.ox + 188) * viewport.scale,
              top: viewport.y + ((nodeById.get(contextNodeId)?.y || 0) + contentBounds.oy) * viewport.scale
            }}
          >
            <div className="text-[11px] font-semibold text-[#6A1B9A] mb-1">节点属性</div>
            <div className="text-[11px] text-gray-700 space-y-1">
              <div>名称：{nodeById.get(contextNodeId)?.displayName}</div>
              <div>类型：{nodeById.get(contextNodeId)?.kind}</div>
              <div>模块：{nodeById.get(contextNodeId)?.module}</div>
              <div>ID：{nodeById.get(contextNodeId)?.functionId || nodeById.get(contextNodeId)?.moduleKey || '-'}</div>
            </div>
            <button onClick={() => setContextNodeId(null)} className="mt-2 h-6 px-2 text-[10px] rounded border border-[#E1BEE7] hover:bg-[#F8ECFA]">
              关闭
            </button>
          </div>
        )}

        {canvasMenu && (
          <div
            data-floating-menu="1"
            className="absolute z-50 rounded border border-[#E1BEE7] bg-white shadow-xl text-[11px] text-gray-700"
            style={{ left: canvasMenu.x, top: canvasMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {canvasMenu.mode === 'graph' && (
              <>
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                  onClick={() => {
                    setCanvasMenu(null);
                    void openProjectInVSCode();
                  }}
                >
                  打开代码
                </button>
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                  onClick={() => {
                    setCanvasMenu(null);
                    void exportModuleForSelection();
                  }}
                >
                  导出模块
                </button>
                <div className="h-px bg-[#F3E5F5]" />
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                  onClick={async () => {
                    setCanvasMenu(null);
                    setViewMode('code');
                    setCodeBusy(true);
                    try {
                      const ids = activeNodes.map((n) => n.id);
                      const indeg = new Map<string, number>(ids.map((id) => [id, 0] as [string, number]));
                      const out = new Map<string, string[]>(ids.map((id) => [id, []] as [string, string[]]));
                      for (const e of activeEdges) {
                        if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
                        out.get(e.from)!.push(e.to);
                        indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
                      }
                      const q = ids.filter((id) => (indeg.get(id) || 0) === 0);
                      const order: string[] = [];
                      while (q.length) {
                        const id = q.shift()!;
                        order.push(id);
                        for (const to of out.get(id) || []) {
                          indeg.set(to, (indeg.get(to) || 0) - 1);
                          if ((indeg.get(to) || 0) === 0) q.push(to);
                        }
                      }
                      for (const id of ids) if (!order.includes(id)) order.push(id);
                      const nodesOrdered = order.map((id) => nodeById.get(id)).filter(Boolean) as CanvasNodeItem[];
                      const fnNodes = nodesOrdered.filter((n) => n.kind === 'function' && n.functionId && !String(n.functionId).startsWith('glue:'));
                      const uniqueFnIds = Array.from(new Set(fnNodes.map((n) => String(n.functionId))));
                      const details = await Promise.all(
                        uniqueFnIds.map((id) => {
                          const local = props.generatedFunctions ? props.generatedFunctions[id] : null;
                          if (local) return Promise.resolve({ function: local } as any);
                          return ragGetFunction(id).catch(() => null);
                        })
                      );
                      const blocks = details
                        .map((d: any, i) => {
                          const id = uniqueFnIds[i];
                          const fn = d?.function || d;
                          const name = String(fn?.display_name || fn?.name || id);
                          const code = String(fn?.code || '');
                          if (!code.trim()) return `===== ${name} =====\n<no code>`;
                          return `===== ${name} =====\n${code}`;
                        })
                        .join('\n\n');
                      setCodeText(blocks);
                    } finally {
                      setCodeBusy(false);
                    }
                  }}
                >
                  在本页预览代码
                </button>
              </>
            )}
            {canvasMenu.mode === 'code' && (
              <button
                className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                onClick={() => {
                  setCanvasMenu(null);
                  setViewMode('graph');
                }}
              >
                回到画布界面
              </button>
            )}
          </div>
        )}

        {nodeMenu && nodeById.get(nodeMenu.nodeId) && (
          <div
            data-floating-menu="1"
            className="absolute z-50 rounded border border-[#E1BEE7] bg-white shadow-xl text-[11px] text-gray-700"
            style={{ left: nodeMenu.x, top: nodeMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
              onClick={() => {
                setNodeMenu(null);
                setContextNodeId(nodeMenu.nodeId);
              }}
            >
              节点属性
            </button>
            <button
              className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
              onClick={() => {
                const id = nodeMenu.nodeId;
                setNodeMenu(null);
                applyNodeSelection([id], []);
                setNotePopupNodeId(id);
              }}
            >
              变更内容
            </button>
            <button
              className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
              onClick={() => {
                const id = nodeMenu.nodeId;
                const n = nodeById.get(id);
                setNodeMenu(null);
                if (n) void openCodeForNode(n);
              }}
            >
              打开代码
            </button>
            <button
              className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
              onClick={() => {
                const id = nodeMenu.nodeId;
                setNodeMenu(null);
                void exportModuleForSelection(id, undefined);
              }}
            >
              导出模块
            </button>
            <div className="h-px bg-[#F3E5F5]" />
            {nodeById.get(nodeMenu.nodeId)?.kind === 'module' && (
              <button
                className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                onClick={() => {
                  const id = nodeMenu.nodeId;
                  setNodeMenu(null);
                  void toggleModuleExpand(id);
                }}
              >
                {moduleExpanded[nodeMenu.nodeId] ? '折叠模块' : '展开模块'}
              </button>
            )}
            <button
              className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5] text-red-600"
              onClick={() => {
                const id = nodeMenu.nodeId;
                setNodeMenu(null);
                removeNodeById(id);
              }}
            >
              删除节点
            </button>
          </div>
        )}

        {edgePopup && (() => {
          const e = activeEdges.find((x) => x.id === edgePopup.edgeId);
          if (!e) return null;
          const from = nodeById.get(e.from);
          const to = nodeById.get(e.to);
          return (
            <div
              className="absolute z-20 w-[300px] rounded-md border border-[#E1BEE7] bg-white shadow-xl p-3"
              style={{ left: edgePopup.x, top: edgePopup.y }}
            >
              <div className="text-[11px] font-semibold text-[#6A1B9A] mb-1">连线属性</div>
              <div className="text-[11px] text-gray-700 space-y-1">
                <div>起点：{from?.displayName || e.from}</div>
                <div>终点：{to?.displayName || e.to}</div>
                <div>fromPort：{e.fromPort || '-'}</div>
                <div>toPort：{e.toPort || '-'}</div>
              </div>
              <button onClick={() => setEdgePopup(null)} className="mt-2 h-6 px-2 text-[10px] rounded border border-[#E1BEE7] hover:bg-[#F8ECFA]">
                关闭
              </button>
            </div>
          );
        })()}

        {edgeMenu && (() => {
          const e = activeEdges.find((x) => x.id === edgeMenu.edgeId);
          if (!e) return null;
          const to = nodeById.get(e.to);
          return (
            <div
              data-floating-menu="1"
              className="absolute z-50 rounded border border-[#E1BEE7] bg-white shadow-xl text-[11px] text-gray-700"
              style={{ left: edgeMenu.x, top: edgeMenu.y }}
              onMouseDown={(ev) => ev.stopPropagation()}
            >
              <button
                className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                onClick={() => {
                  setEdgeMenu(null);
                  setEdgePopup({ edgeId: e.id, x: edgeMenu.x, y: edgeMenu.y });
                }}
              >
                连线属性
              </button>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                onClick={() => {
                  setEdgeMenu(null);
                  if (to) void openCodeForNode(to);
                }}
              >
                打开代码
              </button>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                onClick={() => {
                  setEdgeMenu(null);
                  void exportModuleForSelection(undefined, e.id);
                }}
              >
                导出模块
              </button>
            </div>
          );
        })()}
  
        {/* Floating Toolbar */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-lg border border-[#E1BEE7] flex flex-col p-1 gap-2">
          <button title="自动布局（树形）" onClick={autoLayoutNodes} className="p-1.5 hover:bg-[#F3E5F5] rounded cursor-pointer text-gray-500 hover:text-[#6A1B9A]">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            title="连线模式：先选源节点，再点目标节点"
            onClick={() => {
              if (!selectedNodeId) return;
              setConnectSourceNodeId(selectedNodeId);
            }}
            className={clsx(
              "p-1.5 hover:bg-[#F3E5F5] rounded cursor-pointer text-gray-500 hover:text-[#6A1B9A]",
              connectSourceNodeId ? "bg-[#F3E5F5] text-[#6A1B9A]" : ""
            )}
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            title="删除选中节点"
            onClick={() => {
              if (!selectedNodeIds.length) return;
              for (const id of selectedNodeIds) removeNodeById(id);
              applyNodeSelection([], []);
            }}
            className="p-1.5 hover:bg-[#F3E5F5] rounded cursor-pointer text-gray-500 hover:text-[#6A1B9A]"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button title="清空当前画布" onClick={clearActiveCanvas} className="p-1.5 hover:bg-[#F3E5F5] rounded cursor-pointer text-gray-500 hover:text-[#6A1B9A]">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            title="展开/折叠选中模块"
            onClick={() => {
              const n = selectedNodeId ? nodeById.get(selectedNodeId) : null;
              if (!n || n.kind !== 'module') return;
              void toggleModuleExpand(n.id);
            }}
            className="p-1.5 hover:bg-[#F3E5F5] rounded cursor-pointer text-gray-500 hover:text-[#6A1B9A]"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            title="重置视图"
            onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}
            className="p-1.5 hover:bg-[#F3E5F5] rounded cursor-pointer text-gray-500 hover:text-[#6A1B9A]"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Pipeline Component ---

export type PipelineStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failure';
};

const OperationLog = (props: {
  logs: string[];
  pipelineSteps: PipelineStep[];
  isRunning: boolean;
  terminalLines: string[];
  terminalBusy: boolean;
  onRunTerminal: (command: string) => void;
  onRunGate: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'terminal' | 'lint'>('log');
  const [terminalInput, setTerminalInput] = useState('');

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="h-8 bg-[#F3E5F5] border-b border-[#E1BEE7] flex items-center justify-between px-2 shrink-0 select-none">
        <div className="flex h-full">
          {[
            { id: 'log', label: '操作日志' },
            { id: 'terminal', label: '终端' },
            { id: 'lint', label: '代码检测' }
          ].map(tab => (
            <span 
              key={tab.id}
              className={clsx(
                "text-xs px-3 h-full flex items-center cursor-pointer transition-colors",
                activeTab === tab.id 
                  ? "font-bold text-[#6A1B9A] border-b-2 border-[#6A1B9A] bg-white" 
                  : "text-gray-500 hover:bg-white/50"
              )}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'lint' && (
            <button 
              onClick={props.onRunGate}
              disabled={props.isRunning}
              className="flex items-center gap-1 text-[10px] bg-[#6A1B9A] text-white px-2 py-0.5 rounded hover:bg-[#4A148C] disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              开始检测
            </button>
          )}
          <Maximize2 className="w-3 h-3 text-gray-400 cursor-pointer" />
          <X className="w-3 h-3 text-gray-400 cursor-pointer hover:text-red-500" />
        </div>
      </div>
      
      {activeTab === 'lint' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Pipeline Visual */}
          <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 overflow-x-auto">
            {props.pipelineSteps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1 relative group">
                {index < props.pipelineSteps.length - 1 && (
                  <div className="absolute top-1/2 left-1/2 w-full h-[2px] -translate-y-1/2 -z-0">
                    <div className={clsx(
                      "h-full transition-all duration-500 ease-in-out",
                      step.status === 'success' ? "bg-green-500" : "bg-gray-200"
                    )} />
                  </div>
                )}
                
                {/* Step Node */}
                <div className="flex flex-col items-center gap-3 relative z-10 w-full">
                  <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
                    step.status === 'pending' && "border-gray-300 text-gray-300 bg-white",
                    step.status === 'running' && "border-[#6A1B9A] text-[#6A1B9A] shadow-[0_0_10px_rgba(106,27,154,0.3)] bg-white",
                    step.status === 'success' && "border-green-500 bg-green-500 text-white",
                    step.status === 'failure' && "border-red-500 bg-red-500 text-white"
                  )}>
                    {step.status === 'pending' && <div className="w-3 h-3 rounded-full bg-gray-200" />}
                    {step.status === 'running' && <Loader2 className="w-5 h-5 animate-spin" />}
                    {step.status === 'success' && <Check className="w-6 h-6" />}
                    {step.status === 'failure' && <X className="w-6 h-6" />}
                  </div>
                  
                  <span className={clsx(
                    "text-xs font-medium tracking-wide transition-colors duration-300",
                    step.status === 'pending' && "text-gray-400",
                    step.status === 'running' && "text-[#6A1B9A] font-bold",
                    step.status === 'success' && "text-green-600",
                    step.status === 'failure' && "text-red-600"
                  )}>
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Logs */}
          <div className="flex-1 p-3 font-mono text-xs text-gray-600 overflow-auto bg-gray-50/50">
            <div className="mb-2 font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-3 bg-[#6A1B9A] rounded-full" />
              检测日志
            </div>
            <div className="space-y-1">
              {props.logs.map((log, i) => (
                <div key={i} className="pl-2 border-l-2 border-gray-200 py-0.5 hover:bg-gray-100/50 transition-colors">
                  {log}
                </div>
              ))}
              {props.logs.length === 0 && <div className="text-gray-400 italic pl-2">点击上方"开始检测"运行流水线...</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-2 font-mono text-xs text-gray-600 overflow-auto">
          {activeTab === 'log' && <div>{props.logs.length ? props.logs[props.logs.length - 1] : 'System initialized...'}</div>}
          {activeTab === 'terminal' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-auto whitespace-pre-wrap">
                {props.terminalLines.length ? props.terminalLines.map((line, i) => <div key={i}>{line}</div>) : <div>$ _</div>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    props.onRunTerminal(terminalInput);
                    setTerminalInput('');
                  }}
                  placeholder="输入命令，例如：cmake --build ."
                  className="flex-1 h-7 px-2 text-xs border border-[#E1BEE7] rounded outline-none"
                />
                <button
                  disabled={props.terminalBusy}
                  onClick={() => {
                    props.onRunTerminal(terminalInput);
                    setTerminalInput('');
                  }}
                  className="h-7 px-3 text-[11px] rounded bg-[#6A1B9A] text-white disabled:opacity-50"
                >
                  执行
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RequirementPanel = (props: {
  prompt: string;
  setPrompt: (v: string) => void;
  generatedCode: string;
  generationMode: 'canvas' | 'analyze' | 'new_function' | 'new_module' | 'reuse';
  setGenerationMode: (v: 'canvas' | 'analyze' | 'new_function' | 'new_module' | 'reuse') => void;
  qaAutoOpenSignal: number;
  qaCanvasCodeContext: string;
  onGenerateFromQa: (finalPrompt: string) => void;
  logs: string[];
  onGenerate: () => void;
  busy: boolean;
  taskAnalysisResult: string;
  qaRisk: string;
  qaAmbiguity: string;
  qaMissing: string;
}) => {
  const [activeTab, setActiveTab] = useState<'requirement' | 'qa' | 'llm-call' | 'llm-prompt'>('requirement');
  const [qaPrompt, setQaPrompt] = useState('');
  const [qaGoal, setQaGoal] = useState('');
  const [qaConstraints, setQaConstraints] = useState('');
  const [qaSubtasks, setQaSubtasks] = useState('');
  const [qaBusy, setQaBusy] = useState(false);
  const [qaMsg, setQaMsg] = useState('');
  const [qaAutoFilledSignal, setQaAutoFilledSignal] = useState(0);
  const [qaAmbItems, setQaAmbItems] = useState<Array<{ text: string; resolved: boolean; question: string; answer: string }>>([]);
  const [qaMissingItems, setQaMissingItems] = useState<Array<{ text: string; resolved: boolean; question: string; answer: string }>>([]);

  const LLM_LOCAL_KEY = 'gaasd:llm_source_config:v1';
  type ApiProviderId = 'glm';
  type LlmApiConfig = {
    provider: ApiProviderId;
    apiKeyEnv: string;
    baseUrl: string;
    model: string;
  };
  type LlmOpenSourceConfig = {
    modelFamily: string;
    checkpoint: string;
    recipe: string;
    datasetPath: string;
  };
  type LlmSourceConfig = { tab: 'api' | 'open_source'; api: LlmApiConfig; open_source: LlmOpenSourceConfig };
  const defaultCfg: LlmSourceConfig = {
    tab: 'api',
    api: {
      provider: 'glm',
      apiKeyEnv: 'ALIYUN_API_KEY',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'glm-4.7'
    },
    open_source: {
      modelFamily: 'Qwen2.5',
      checkpoint: 'Qwen2.5-7B-Instruct',
      recipe: 'LoRA-SFT',
      datasetPath: 'data/sft_samples.jsonl'
    }
  };
  const [llmCfg, setLlmCfg] = useState<LlmSourceConfig>(() => {
    try {
      const raw = localStorage.getItem(LLM_LOCAL_KEY);
      if (!raw) return defaultCfg;
      const v = JSON.parse(raw);
      return {
        tab: v?.tab === 'open_source' ? 'open_source' : 'api',
        api: {
          provider: v?.api?.provider === 'glm' ? 'glm' : 'glm',
          apiKeyEnv: String(v?.api?.apiKeyEnv || defaultCfg.api.apiKeyEnv),
          baseUrl: String(v?.api?.baseUrl || defaultCfg.api.baseUrl),
          model: String(v?.api?.model || defaultCfg.api.model)
        },
        open_source: {
          modelFamily: String(v?.open_source?.modelFamily || defaultCfg.open_source.modelFamily),
          checkpoint: String(v?.open_source?.checkpoint || defaultCfg.open_source.checkpoint),
          recipe: String(v?.open_source?.recipe || defaultCfg.open_source.recipe),
          datasetPath: String(v?.open_source?.datasetPath || defaultCfg.open_source.datasetPath)
        }
      };
    } catch {
      return defaultCfg;
    }
  });
  const [llmMsg, setLlmMsg] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(LLM_LOCAL_KEY, JSON.stringify(llmCfg));
    } catch {
      return;
    }
  }, [llmCfg]);

  const normalizeUrl = (v: string) => String(v || '').trim();

  const validateLlmApi = () => {
    const apiKeyEnv = String(llmCfg.api.apiKeyEnv || '').trim();
    const baseUrl = normalizeUrl(llmCfg.api.baseUrl);
    const model = String(llmCfg.api.model || '').trim();
    if (!apiKeyEnv) return '请填写 API Key 环境变量（仅保存变量名，不保存真实 key）';
    if (!baseUrl) return '请填写 Base URL';
    if (!/^https?:\/\//i.test(baseUrl)) return 'Base URL 需要以 http(s):// 开头';
    if (!model) return '请填写默认模型';
    return '';
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const parseListItems = (text: string) => {
    const lines = String(text || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => x.replace(/^[-*\d.、\s]+/, '').trim())
      .filter(Boolean);
    return Array.from(new Set(lines));
  };

  const CPP_REWRITE_RULES = String.raw`【C++代码改写统一规范（必须严格遵守）】
生成 C++ 代码改写时需按统一表格字段与编码规范填写与实现：完成日期与姓名按“每个函数一行”分别记录以便追溯与工时统计；改写后文件夹名称采用大驼峰命名（如 BezierSpline），改写后源文件与头文件采用小驼峰命名（如 funBezier.cpp、funBezier.h），改写后路径按实际工程路径填写；改写前类型仅能在“类/函数”中二选一；改写后一级函数名必须同时满足三条约束：提供 Doxygen 函数说明、使用小驼峰且不得包含“_”“.”等分隔符、并作为测试用例中可由 main 直接调用的最上层入口（如 generateBezierPath），二级函数名为一级函数调用的下层函数（如 pointOnCubicBezier），三级函数名为二级函数调用的更下层函数（若有则同样小驼峰命名）；同时需给出函数中文名称（如“贝塞尔曲线”）用于组件展示与检索；整体质量与设计要求为：编译器警告/错误等级必须拉到最高并消除全部告警，代码结构必须包含注释说明、设计文档与函数主体三部分，不允许使用全局变量且静态变量不推荐使用（尽量将状态保存在顶层函数变量中），函数职责应单一，函数/类命名统一采用驼峰法，函数名展示长度建议不超过 12 个汉字，源码统一使用 UTF-8 编码，注释统一采用 Doxygen 格式且使用中文标点；控制流与语言特性限制为：禁止使用 goto，以及在 if-else 的 body 内禁止出现 return、break 等逻辑跳出语句，单个函数代码行数上限为 200 行；代码改写遵循“整体按 C 语言规范书写”的原则：复合函数必须采用 C 风格接口与实现形态，原子函数内部可采用少量 C++ 语法但对外接口必须呈现 C 语法格式，不支持类与模板语法，容器类（如 vector）需改为定长数组或 malloc 动态分配，指针使用方式需统一为“数组化”呈现并保持风格一致，表达式需拆解为清晰的逐步计算节点（禁止 ++/--，+=/-= 等复合赋值必须展开为显式赋值，三目运算符必须改为 if-else）；逻辑控制语句需满足“条件为单一变量、执行体为单一函数、禁止逻辑跳出语句”的约束：if-else 的条件变量应来自变量赋值或函数返回的单值比较，执行体封装为单一原子/复合函数且允许只有 if 无 else，但禁止在 if/else 内提前 return；for 循环必须将起始值、步进值、结束值拆为单一变量并以显式赋值/函数赋值方式获得，循环体同样封装为单一函数；注释细则为：函数头注释按给定 Doxygen 字段模板完整填写（含 @brief、@en_name、@cn_name、@type、@param、@param[IN]/[OUT]、@var、@retval、@granularity、@tag_level1/@tag_level2、@formula、@version、@date、@author 等），复合函数体内局部变量声明/定义必须在行尾注释说明变量含义；结构体字段采用大驼峰命名并在行尾注释中标注物理单位，数组字段在 @field 中用 Array<元素类型, 维度> 书写；枚举、宏定义与宏函数分别按对应 Doxygen 规范注释，其中宏定义可按日常习惯行尾注释即可，宏函数需提供 @tag MACRO_Function 与入参/返回值说明。`;

  const pickMdSection = (md: string, titleRe: string) => {
    const s = String(md || '').replace(/\r\n/g, '\n');
    const re = new RegExp(`^\\s*#{1,6}\\s*(?:\\d+[\\.、\)]\\s*)?${titleRe}\\s*$([\\s\\S]*?)(^\\s*#{1,6}\\s|$)`, 'm');
    const m = s.match(re);
    if (!m) return '';
    return String(m[1] || '').trim();
  };

  const pickAnySection = (md: string, titleRes: string[]) => {
    for (const t of titleRes) {
      const hit = pickMdSection(md, t);
      if (hit) return hit;
    }
    return '';
  };

  const listFromMd = (block: string) =>
    String(block || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => /^[-*\d.、]/.test(x))
      .map((x) => x.replace(/^[-*\d.、\s]+/, '').trim())
      .filter(Boolean);

  const buildFinalPrompt = (p: {
    requirement: string;
    analysis: string;
    goal: string;
    constraints: string;
    subtasks: string;
    ambiguityItems: Array<{ text: string; resolved: boolean; question: string; answer: string }>;
    missingItems: Array<{ text: string; resolved: boolean; question: string; answer: string }>;
    canvasCode: string;
  }) => {
    const amb = p.ambiguityItems
      .map((x) => ({ item: x.text, resolved: Boolean(x.resolved), question: String(x.question || '').trim(), answer: String(x.answer || '').trim() }))
      .filter((x) => x.item);
    const missing = p.missingItems
      .map((x) => ({ item: x.text, resolved: Boolean(x.resolved), question: String(x.question || '').trim(), answer: String(x.answer || '').trim() }))
      .filter((x) => x.item);

    return [
      '你是智能驾驶代码生产线的提示词工程师与代码生成器。',
      '',
      '【用户需求】',
      String(p.requirement || '').trim() || '-',
      '',
      '【任务分析】',
      String(p.analysis || '').trim() || '-',
      '',
      '【消歧后的整体描述（goal）】',
      String(p.goal || '').trim() || '-',
      '',
      '【关键约束（constraints）】',
      String(p.constraints || '').trim() || '-',
      '',
      '【建议拆分子任务（subtasks）】',
      String(p.subtasks || '').trim() || '-',
      '',
      '【歧义点（Q/A）】',
      JSON.stringify(amb, null, 2),
      '',
      '【缺失信息（Q/A）】',
      JSON.stringify(missing, null, 2),
      '',
      '【画布现有代码（只读引用）】',
      String(p.canvasCode || '').trim() || '-',
      '',
      CPP_REWRITE_RULES
    ].join('\n');
  };

  useEffect(() => {
    const sig = Number(props.qaAutoOpenSignal || 0);
    if (!sig) return;
    setActiveTab('qa');
  }, [props.qaAutoOpenSignal]);

  useEffect(() => {
    const sig = Number(props.qaAutoOpenSignal || 0);
    if (!sig) return;
    if (qaAutoFilledSignal === sig) return;
    const md = String(props.taskAnalysisResult || '').trim();
    if (!md) return;

    const goal = pickAnySection(md, ['任务目标', '任务目标（问题描述）']);
    const constraints = pickAnySection(md, ['关键约束', '关键约束（输入/输出）']);
    const subtasks = pickAnySection(md, ['建议拆分的子任务']);
    const ambText = pickAnySection(md, ['风险点\\s*/\\s*歧义点', '歧义点', '风险点']);
    const missingText = pickAnySection(md, ['缺失信息清单', '缺失信息']);

    const ambList = listFromMd(ambText);
    const missingList = listFromMd(missingText);
    const ambItems = Array.from(new Set(ambList)).map((t) => ({ text: t, resolved: false, question: '', answer: '' }));
    const missingItems = Array.from(new Set(missingList)).map((t) => ({ text: t, resolved: false, question: '', answer: '' }));

    setQaGoal(goal);
    setQaConstraints(constraints);
    setQaSubtasks(subtasks);
    setQaAmbItems(ambItems);
    setQaMissingItems(missingItems);
    setQaAutoFilledSignal(sig);
    setQaPrompt(
      buildFinalPrompt({
        requirement: props.prompt,
        analysis: props.taskAnalysisResult,
        goal,
        constraints,
        subtasks,
        ambiguityItems: ambItems,
        missingItems,
        canvasCode: props.qaCanvasCodeContext
      })
    );
  }, [props.qaAutoOpenSignal, props.taskAnalysisResult]);

  useEffect(() => {
    setQaPrompt(
      buildFinalPrompt({
        requirement: props.prompt,
        analysis: props.taskAnalysisResult,
        goal: qaGoal,
        constraints: qaConstraints,
        subtasks: qaSubtasks,
        ambiguityItems: qaAmbItems,
        missingItems: qaMissingItems,
        canvasCode: props.qaCanvasCodeContext
      })
    );
  }, [qaGoal, qaConstraints, qaSubtasks, qaAmbItems, qaMissingItems, props.prompt, props.taskAnalysisResult, props.qaCanvasCodeContext]);

  const promptEntrances = [
    {
      key: 'rag-function-enrich',
      label: 'RAG：函数向量化/增强（doc_zh/doc_en/inputs/outputs）',
      text:
        '示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶基础软件的代码分析助手，请为函数生成可检索的结构化档案。","constraints":{"modules":["planning","control","decision"],"kinds":["node","glue","platform"],"output_json_only":true},"input":{"file_path":"Planning/OnVehicle/foo.cpp","signature":"double CalcFoo(const Bar& in)","line_count":42,"code":"..."},"output_schema":{"display_name":"string","module":"one_of_modules","kind":"one_of_kinds","doc_zh":"string","doc_en":"string","inputs_json":"json_object","outputs_json":"json_object"}}\n\n入口：backend/app/services/rag_enricher.py::enrich_function'
    },
    {
      key: 'rag-kind-classify',
      label: 'RAG：函数三类分类（node/glue/platform）',
      text:
        '示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶基础软件的代码分析助手，请给出该函数的类别 kind。","kinds":["node","glue","platform"],"input":{"file_path":"Control/PidController/pid.cpp","signature":"void Update(...)"}}\n\n入口：backend/app/services/rag_enricher.py::classify_function_kind'
    },
    {
      key: 'module-index',
      label: 'RAG：模块索引（模块候选发现/描述/入库）',
      text:
        '说明：模块索引会基于函数索引与调用关系发现候选模块，再对模块生成描述与结构化输入输出。\n\n入口：backend/app/services/module_index_jobs.py + backend/app/services/module_enricher.py'
    },
    {
      key: 'task-analyze',
      label: '结构化输入：问题分析（analysis_markdown + suggested_rag_query）',
      text:
        '示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的任务分析助手。请对输入工单进行问题分析，并输出结构化结果。","constraints":{"language":"zh","output":"markdown","no_secrets":true},"input":{"feature_description":"...","input_spec":"...","output_spec":"..."},"output_schema":{"analysis_markdown":"markdown string","suggested_rag_query":"string"}}\n\n入口：backend/app/services/task_analysis_service.py'
    },
    {
      key: 'visual-glue',
      label: '图形化输入：胶水代码生成（字段映射/类型转换）',
      text:
        '示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶基础软件的胶水代码生成器。请根据上下游节点的输入输出规范，生成一个中间转换节点的胶水代码。","constraints":{"output_json_only":true,"language":"zh"},"input":{"task_context":"...","from_node":{},"to_node":{}},"output_schema":{"glue_name":"string","doc_zh":"string","inputs_json":"json_object","outputs_json":"json_object","glue_code":"string"}}\n\n入口：backend/app/services/glue_codegen_service.py'
    },
    {
      key: 'visual-export',
      label: '图形化输入：导出（模型调用/受控组合/直接复用）提示词',
      text:
        '说明：导出提示词由前端根据画布节点/连线与导出模式拼装，给到下游生成/集成流程。\n\n入口：src/pages/online/VisualBuilderPage.tsx（导出面板）'
    },
    {
      key: 'cot-question',
      label: '路由消歧：风险点/缺失项澄清问题生成',
      text:
        '示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的路由消歧助手。请针对单条风险/歧义或缺失信息，生成一句最关键、最具体的澄清问题。","mode":"risk|missing","item":"...","context":{"goal":"...","constraints":"..."},"output_schema":{"question":"string"}}\n\n入口：backend/app/services/cot_service.py::make_question'
    },
    {
      key: 'cot-refine',
      label: '路由消歧：基于回答更新目标/约束/子任务/列表',
      text:
        '示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的路由消歧助手。根据用户对单条问题的回答，更新任务目标/关键约束/子任务，并更新风险与缺失列表。","current_item":"...","user_answer":"...","state":{"goal":"...","constraints":"..."},"output_schema":{"resolved":"boolean","goal":"string","constraints":"string","subtasks":"string","risk_items":"string[]","missing_items":"string[]"}}\n\n入口：backend/app/services/cot_service.py::refine_with_answer'
    },
    {
      key: 'cot-confirmed',
      label: '路由消歧：生成确认后描述（最终可用提示词）',
      text:
        '示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的提示词工程师。基于消歧后的信息，输出最准确、可直接用于代码生成的中文提示词。","input":{"goal":"...","constraints":"...","subtasks":"...","related_functions":["..."]},"output_schema":{"prompt":"string"}}\n\n入口：backend/app/services/cot_service.py::generate_confirmed_prompt'
    },
    {
      key: 'orchestration-generate',
      label: '函数编排：生成目标 C/C++ 代码（多文件 Markdown）',
      text:
        '示例（结构化 JSON Prompt）\n\n{"task":"你是智能驾驶代码生产线的 C/C++ 代码生成器。请基于输入提示词，直接生成目标 C/C++ 源码（可多文件），保证可落地编译。","input":{"prompt":"..."},"output_schema":{"code":"string","key_points":"string[]","log":"string"}}\n\n入口：backend/app/services/orchestrator_service.py::generate_cpp_code'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex flex-wrap bg-[#F3E5F5] border-b border-[#E1BEE7]">
        {[
          { id: 'requirement', label: '需求' },
          { id: 'qa', label: 'QA' },
          { id: 'llm-call', label: 'LLM调用' },
          { id: 'llm-prompt', label: 'LLM提示词' }
        ].map(tab => (
          <button
            key={tab.id}
            className={clsx(
              "flex-1 min-w-[60px] py-2 text-[10px] font-medium transition-colors border-b-2",
              activeTab === tab.id 
                ? "text-[#6A1B9A] border-[#6A1B9A] bg-white" 
                : "text-gray-500 border-transparent hover:bg-white/50"
            )}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 p-4 text-xs text-gray-500 overflow-auto">
        {activeTab === 'requirement' && (
          <div className="space-y-2">
            <div className="rounded border border-[#E1BEE7] p-2 bg-white">
              <div className="text-[11px] font-semibold text-[#6A1B9A] mb-2">生成模式</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { id: 'canvas', label: '按照画布生成' },
                  { id: 'analyze', label: '代码分析生成' },
                  { id: 'new_function', label: '生成新的函数' },
                  { id: 'reuse', label: '自动复用代码' }
                ].map((it) => (
                  <label key={it.id} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={props.generationMode === (it.id as any)}
                      onChange={() => props.setGenerationMode(it.id as any)}
                    />
                    <span>{it.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <textarea
              value={props.prompt}
              onChange={(e) => props.setPrompt(e.target.value)}
              className="w-full min-h-[140px] p-2 text-xs border border-[#E1BEE7] rounded outline-none"
              placeholder="请输入需求内容"
            />
            {props.generationMode === 'reuse' && <div className="text-[11px] text-gray-500">该模式仅复用索引资产并注入画布，不进行代码生成</div>}
            <button
              onClick={props.onGenerate}
              disabled={props.busy}
              className="h-7 px-3 text-[11px] rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C] disabled:opacity-50"
            >
              执行任务
            </button>
          </div>
        )}
        {activeTab === 'qa' && (
          <div className="space-y-2">
            <div className="rounded border border-[#E1BEE7] bg-white p-2">
              <div className="text-[11px] font-semibold text-[#6A1B9A] mb-2">问题确认（可编辑）</div>
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">整体描述（goal）</div>
                  <textarea value={qaGoal} onChange={(e) => setQaGoal(e.target.value)} className="w-full min-h-[70px] p-2 text-xs border border-gray-200 rounded outline-none" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">关键约束（constraints）</div>
                  <textarea value={qaConstraints} onChange={(e) => setQaConstraints(e.target.value)} className="w-full min-h-[70px] p-2 text-xs border border-gray-200 rounded outline-none" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">子任务（subtasks）</div>
                  <textarea value={qaSubtasks} onChange={(e) => setQaSubtasks(e.target.value)} className="w-full min-h-[70px] p-2 text-xs border border-gray-200 rounded outline-none" />
                </div>
              </div>
            </div>

            <div className="rounded border border-[#E1BEE7] bg-white p-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-[#6A1B9A]">歧义点</div>
                <button
                  disabled={qaBusy}
                  className="h-7 px-2 rounded border border-[#E1BEE7] text-[11px] text-[#6A1B9A] hover:bg-[#F8ECFA] disabled:opacity-50"
                  onClick={async () => {
                    setQaBusy(true);
                    setQaMsg('');
                    try {
                      const r = await cotGeneratePrompt({
                        goal: qaGoal,
                        constraints: qaConstraints,
                        subtasks: qaSubtasks,
                        risk_items: qaAmbItems.filter((x) => !x.resolved).map((x) => x.text),
                        missing_items: qaMissingItems.filter((x) => !x.resolved).map((x) => x.text),
                        related_function_ids: [],
                        root_dir: null
                      });
                      setQaPrompt(String(r?.prompt || '').trim() ? String(r.prompt) + '\n\n' + CPP_REWRITE_RULES : qaPrompt);
                      setQaMsg('已生成确认后描述');
                    } catch (e) {
                      setQaMsg(e instanceof Error ? e.message : '生成确认后描述失败');
                    } finally {
                      setQaBusy(false);
                    }
                  }}
                >
                  生成确认后描述
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {qaAmbItems.length === 0 && <div className="text-[11px] text-gray-500">暂无歧义点</div>}
                {qaAmbItems.map((it, idx) => (
                  <div key={idx} className="rounded border border-gray-100 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2 flex-1">
                        <input type="checkbox" checked={it.resolved} onChange={(e) => setQaAmbItems((prev) => prev.map((x, i) => (i === idx ? { ...x, resolved: Boolean(e.target.checked) } : x)))} />
                        <div className="flex-1">
                          <div className="text-[11px] text-gray-800 whitespace-pre-wrap">{it.text}</div>
                          {!!it.question && <div className="mt-1 text-[11px] text-[#4A148C] whitespace-pre-wrap">Q：{it.question}</div>}
                        </div>
                      </label>
                      <button
                        disabled={qaBusy}
                        className="h-7 px-2 rounded border border-[#E1BEE7] text-[11px] text-[#6A1B9A] hover:bg-[#F8ECFA] disabled:opacity-50"
                        onClick={async () => {
                          setQaBusy(true);
                          setQaMsg('');
                          try {
                            const r = await cotQuestion({
                              mode: 'risk',
                              item: it.text,
                              goal: qaGoal,
                              constraints: qaConstraints,
                              subtasks: qaSubtasks,
                              risk_items: qaAmbItems.filter((x) => !x.resolved).map((x) => x.text),
                              missing_items: qaMissingItems.filter((x) => !x.resolved).map((x) => x.text)
                            });
                            if (!r.ok || !r.question) throw new Error(r.error || 'empty question');
                            setQaAmbItems((prev) => prev.map((x, i) => (i === idx ? { ...x, question: String(r.question) } : x)));
                          } catch (e) {
                            setQaMsg(e instanceof Error ? e.message : '生成问题失败');
                          } finally {
                            setQaBusy(false);
                          }
                        }}
                      >
                        生成问题
                      </button>
                    </div>
                    <textarea
                      value={it.answer}
                      onChange={(e) => setQaAmbItems((prev) => prev.map((x, i) => (i === idx ? { ...x, answer: e.target.value } : x)))}
                      className="mt-2 w-full min-h-[60px] p-2 text-xs border border-gray-200 rounded outline-none"
                      placeholder="输入回答（用于消歧/补齐）"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        disabled={qaBusy || !String(it.answer || '').trim()}
                        className="h-7 px-3 rounded bg-[#6A1B9A] text-white text-[11px] hover:bg-[#4A148C] disabled:opacity-50"
                        onClick={async () => {
                          setQaBusy(true);
                          setQaMsg('');
                          try {
                            const r = await cotRefine({
                              mode: 'risk',
                              item: it.text,
                              answer: it.answer,
                              goal: qaGoal,
                              constraints: qaConstraints,
                              subtasks: qaSubtasks,
                              risk_items: qaAmbItems.filter((x) => !x.resolved).map((x) => x.text),
                              missing_items: qaMissingItems.filter((x) => !x.resolved).map((x) => x.text)
                            });
                            if (!r.ok) throw new Error(r.error || 'refine_failed');
                            setQaGoal(String(r.goal || ''));
                            setQaConstraints(String(r.constraints || ''));
                            setQaSubtasks(String(r.subtasks || ''));
                            const nextAmb = Array.from(new Set((r.risk_items || []).map((x) => String(x).trim()).filter(Boolean))).map((t) => {
                              const old = qaAmbItems.find((x) => x.text === t);
                              return old ? old : { text: t, resolved: false, question: '', answer: '' };
                            });
                            const nextMissing = Array.from(new Set((r.missing_items || []).map((x) => String(x).trim()).filter(Boolean))).map((t) => {
                              const old = qaMissingItems.find((x) => x.text === t);
                              return old ? old : { text: t, resolved: false, question: '', answer: '' };
                            });
                            setQaAmbItems(nextAmb);
                            setQaMissingItems(nextMissing);
                            setQaMsg('已应用回答并更新目标/约束/清单');
                          } catch (e) {
                            setQaMsg(e instanceof Error ? e.message : '应用回答失败');
                          } finally {
                            setQaBusy(false);
                          }
                        }}
                      >
                        应用回答
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#E1BEE7] bg-white p-2">
              <div className="text-[11px] font-semibold text-[#6A1B9A]">缺失信息</div>
              <div className="mt-2 space-y-2">
                {qaMissingItems.length === 0 && <div className="text-[11px] text-gray-500">暂无缺失信息</div>}
                {qaMissingItems.map((it, idx) => (
                  <div key={idx} className="rounded border border-gray-100 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2 flex-1">
                        <input type="checkbox" checked={it.resolved} onChange={(e) => setQaMissingItems((prev) => prev.map((x, i) => (i === idx ? { ...x, resolved: Boolean(e.target.checked) } : x)))} />
                        <div className="flex-1">
                          <div className="text-[11px] text-gray-800 whitespace-pre-wrap">{it.text}</div>
                          {!!it.question && <div className="mt-1 text-[11px] text-[#4A148C] whitespace-pre-wrap">Q：{it.question}</div>}
                        </div>
                      </label>
                      <button
                        disabled={qaBusy}
                        className="h-7 px-2 rounded border border-[#E1BEE7] text-[11px] text-[#6A1B9A] hover:bg-[#F8ECFA] disabled:opacity-50"
                        onClick={async () => {
                          setQaBusy(true);
                          setQaMsg('');
                          try {
                            const r = await cotQuestion({
                              mode: 'missing',
                              item: it.text,
                              goal: qaGoal,
                              constraints: qaConstraints,
                              subtasks: qaSubtasks,
                              risk_items: qaAmbItems.filter((x) => !x.resolved).map((x) => x.text),
                              missing_items: qaMissingItems.filter((x) => !x.resolved).map((x) => x.text)
                            });
                            if (!r.ok || !r.question) throw new Error(r.error || 'empty question');
                            setQaMissingItems((prev) => prev.map((x, i) => (i === idx ? { ...x, question: String(r.question) } : x)));
                          } catch (e) {
                            setQaMsg(e instanceof Error ? e.message : '生成问题失败');
                          } finally {
                            setQaBusy(false);
                          }
                        }}
                      >
                        生成问题
                      </button>
                    </div>
                    <textarea
                      value={it.answer}
                      onChange={(e) => setQaMissingItems((prev) => prev.map((x, i) => (i === idx ? { ...x, answer: e.target.value } : x)))}
                      className="mt-2 w-full min-h-[60px] p-2 text-xs border border-gray-200 rounded outline-none"
                      placeholder="输入补充信息（用于补齐缺口）"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        disabled={qaBusy || !String(it.answer || '').trim()}
                        className="h-7 px-3 rounded bg-[#6A1B9A] text-white text-[11px] hover:bg-[#4A148C] disabled:opacity-50"
                        onClick={async () => {
                          setQaBusy(true);
                          setQaMsg('');
                          try {
                            const r = await cotRefine({
                              mode: 'missing',
                              item: it.text,
                              answer: it.answer,
                              goal: qaGoal,
                              constraints: qaConstraints,
                              subtasks: qaSubtasks,
                              risk_items: qaAmbItems.filter((x) => !x.resolved).map((x) => x.text),
                              missing_items: qaMissingItems.filter((x) => !x.resolved).map((x) => x.text)
                            });
                            if (!r.ok) throw new Error(r.error || 'refine_failed');
                            setQaGoal(String(r.goal || ''));
                            setQaConstraints(String(r.constraints || ''));
                            setQaSubtasks(String(r.subtasks || ''));
                            const nextAmb = Array.from(new Set((r.risk_items || []).map((x) => String(x).trim()).filter(Boolean))).map((t) => {
                              const old = qaAmbItems.find((x) => x.text === t);
                              return old ? old : { text: t, resolved: false, question: '', answer: '' };
                            });
                            const nextMissing = Array.from(new Set((r.missing_items || []).map((x) => String(x).trim()).filter(Boolean))).map((t) => {
                              const old = qaMissingItems.find((x) => x.text === t);
                              return old ? old : { text: t, resolved: false, question: '', answer: '' };
                            });
                            setQaAmbItems(nextAmb);
                            setQaMissingItems(nextMissing);
                            setQaMsg('已应用补充信息并更新目标/约束/清单');
                          } catch (e) {
                            setQaMsg(e instanceof Error ? e.message : '应用回答失败');
                          } finally {
                            setQaBusy(false);
                          }
                        }}
                      >
                        应用回答
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#E1BEE7] bg-white p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-[#6A1B9A]">最终生成提示词</div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={qaBusy}
                    className="h-7 px-2 rounded border border-[#E1BEE7] text-[11px] text-[#6A1B9A] hover:bg-[#F8ECFA] disabled:opacity-50"
                    onClick={() => {
                      setQaPrompt(
                        buildFinalPrompt({
                          requirement: props.prompt,
                          analysis: props.taskAnalysisResult,
                          goal: qaGoal,
                          constraints: qaConstraints,
                          subtasks: qaSubtasks,
                          ambiguityItems: qaAmbItems,
                          missingItems: qaMissingItems,
                          canvasCode: props.qaCanvasCodeContext
                        })
                      );
                      setQaMsg('已用当前确认内容刷新提示词');
                    }}
                  >
                    刷新提示词
                  </button>
                  <button
                    onClick={() => props.onGenerateFromQa(qaPrompt)}
                    disabled={props.busy}
                    className="h-7 px-3 text-[11px] rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C] disabled:opacity-50"
                  >
                    生成代码
                  </button>
                </div>
              </div>
              <textarea
                value={qaPrompt}
                onChange={(e) => setQaPrompt(e.target.value)}
                className="mt-2 w-full min-h-[420px] p-2 text-xs border border-[#E1BEE7] rounded outline-none font-mono"
              />
              {!!qaMsg && <div className="mt-2 text-[11px] text-gray-600 whitespace-pre-wrap">{qaMsg}</div>}
            </div>
          </div>
        )}
        {activeTab === 'llm-call' && (
          <div className="space-y-3 text-[11px]">
            <div className="text-[11px] text-gray-600">
              本页用于配置“训练/评测所用的大模型来源”。后端未接入时，配置仅保存在浏览器本地。
            </div>
            <div className="rounded border border-[#E1BEE7] bg-[#FAF7FC] p-2">
              <div className="flex gap-2">
                <button
                  className={clsx(
                    'h-6 px-2 rounded border text-[10px]',
                    llmCfg.tab === 'api' ? 'bg-white border-[#BA68C8] text-[#6A1B9A]' : 'bg-transparent border-[#E1BEE7] text-gray-500 hover:bg-white/60'
                  )}
                  onClick={() => setLlmCfg((v) => ({ ...v, tab: 'api' }))}
                >
                  API 模型
                </button>
                <button
                  className={clsx(
                    'h-6 px-2 rounded border text-[10px]',
                    llmCfg.tab === 'open_source'
                      ? 'bg-white border-[#BA68C8] text-[#6A1B9A]'
                      : 'bg-transparent border-[#E1BEE7] text-gray-500 hover:bg-white/60'
                  )}
                  onClick={() => setLlmCfg((v) => ({ ...v, tab: 'open_source' }))}
                >
                  开源模型（后续）
                </button>
              </div>

              {llmCfg.tab === 'api' && (
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">API 类型</div>
                    <select
                      value={llmCfg.api.provider}
                      onChange={(e) => setLlmCfg((v) => ({ ...v, api: { ...v.api, provider: (e.target.value as any) || 'glm' } }))}
                      className="w-full h-7 px-2 rounded border border-[#E1BEE7] bg-white outline-none"
                    >
                      <option value="glm">GLM（阿里云百炼）</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">API Key 环境变量</div>
                    <input
                      value={llmCfg.api.apiKeyEnv}
                      onChange={(e) => setLlmCfg((v) => ({ ...v, api: { ...v.api, apiKeyEnv: e.target.value } }))}
                      className="w-full h-7 px-2 rounded border border-[#E1BEE7] bg-white outline-none"
                      placeholder="例如：ALIYUN_API_KEY"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">Base URL</div>
                    <input
                      value={llmCfg.api.baseUrl}
                      onChange={(e) => setLlmCfg((v) => ({ ...v, api: { ...v.api, baseUrl: e.target.value } }))}
                      className="w-full h-7 px-2 rounded border border-[#E1BEE7] bg-white outline-none"
                      placeholder="例如：https://dashscope.aliyuncs.com/compatible-mode/v1"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">默认模型</div>
                    <input
                      value={llmCfg.api.model}
                      onChange={(e) => setLlmCfg((v) => ({ ...v, api: { ...v.api, model: e.target.value } }))}
                      className="w-full h-7 px-2 rounded border border-[#E1BEE7] bg-white outline-none"
                      placeholder="例如：glm-4.7"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="h-7 px-3 rounded border border-[#E1BEE7] bg-white hover:bg-[#F3E5F5]"
                      onClick={() => {
                        const err = validateLlmApi();
                        setLlmMsg(err ? `本地校验失败：${err}` : '本地校验通过');
                      }}
                    >
                      本地校验
                    </button>
                    <button
                      className="h-7 px-3 rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C]"
                      onClick={() => {
                        const err = validateLlmApi();
                        if (err) {
                          setLlmMsg(`保存失败：${err}`);
                          return;
                        }
                        setLlmMsg('已保存（仅本地）');
                      }}
                    >
                      保存
                    </button>
                  </div>
                  {llmMsg && <div className="text-[10px] text-gray-600">{llmMsg}</div>}
                  <div className="text-[10px] text-gray-500">
                    提示：当前仅 UI 交互样例，不会向后端发送 key，也不会实际发起模型调用。
                  </div>
                </div>
              )}

              {llmCfg.tab === 'open_source' && (
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">模型家族</div>
                    <select
                      value={llmCfg.open_source.modelFamily}
                      onChange={(e) => setLlmCfg((v) => ({ ...v, open_source: { ...v.open_source, modelFamily: e.target.value } }))}
                      className="w-full h-7 px-2 rounded border border-[#E1BEE7] bg-white outline-none"
                    >
                      <option value="Qwen2.5">Qwen2.5</option>
                      <option value="Llama">Llama</option>
                      <option value="InternVL">InternVL</option>
                      <option value="DeepSeek">DeepSeek</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">Checkpoint</div>
                    <input
                      value={llmCfg.open_source.checkpoint}
                      onChange={(e) => setLlmCfg((v) => ({ ...v, open_source: { ...v.open_source, checkpoint: e.target.value } }))}
                      className="w-full h-7 px-2 rounded border border-[#E1BEE7] bg-white outline-none"
                      placeholder="例如：Qwen2.5-7B-Instruct"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">训练配方</div>
                    <select
                      value={llmCfg.open_source.recipe}
                      onChange={(e) => setLlmCfg((v) => ({ ...v, open_source: { ...v.open_source, recipe: e.target.value } }))}
                      className="w-full h-7 px-2 rounded border border-[#E1BEE7] bg-white outline-none"
                    >
                      <option value="Full-SFT">Full-SFT（全参）</option>
                      <option value="LoRA-SFT">LoRA-SFT（推荐示例）</option>
                      <option value="DPO">DPO（偏好优化）</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">数据集路径（示例）</div>
                    <input
                      value={llmCfg.open_source.datasetPath}
                      onChange={(e) => setLlmCfg((v) => ({ ...v, open_source: { ...v.open_source, datasetPath: e.target.value } }))}
                      className="w-full h-7 px-2 rounded border border-[#E1BEE7] bg-white outline-none"
                      placeholder="例如：data/sft_samples.jsonl"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="h-7 px-3 rounded border border-[#E1BEE7] bg-white hover:bg-[#F3E5F5]"
                      onClick={() => setLlmMsg('后端未接入：暂不执行训练')}
                    >
                      生成训练作业（示例）
                    </button>
                    <button
                      className="h-7 px-3 rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C]"
                      onClick={() => setLlmMsg('已保存（仅本地）')}
                    >
                      保存
                    </button>
                  </div>
                  {llmMsg && <div className="text-[10px] text-gray-600">{llmMsg}</div>}
                  <div className="text-[10px] text-gray-500">
                    样例：后续可接入本地/集群训练（SFT、DPO、VLM），复用函数索引与评测链路。
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'llm-prompt' && (
          <div className="space-y-2 text-[11px]">
            <div className="text-gray-600">
              这里集中展示当前系统中所有基于 GLM-4.7（或同类 Chat API）调用的提示词入口与示例，方便统一审计与迭代。
            </div>
            <div className="space-y-2">
              {promptEntrances.map((it) => (
                <details key={it.key} className="rounded border border-[#E1BEE7] bg-white">
                  <summary className="cursor-pointer select-none px-3 py-2 text-[11px] text-[#4A148C]">
                    {it.label}
                  </summary>
                  <div className="px-3 pb-3">
                    <div className="flex justify-end">
                      <button
                        className="h-6 px-2 rounded border border-[#E1BEE7] text-[10px] text-gray-600 hover:bg-[#F3E5F5]"
                        onClick={async () => {
                          const ok = await copyText(it.text);
                          setLlmMsg(ok ? '已复制' : '复制失败');
                        }}
                      >
                        复制
                      </button>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap text-[11px] text-gray-700">{it.text}</pre>
                  </div>
                </details>
              ))}
            </div>
            {llmMsg && <div className="text-[10px] text-gray-600">{llmMsg}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

const AttributesPanel = (props: {
  selectedItem: SelectedLibraryItem;
  generatedCode: string;
  generatedFunctions?: Record<string, { display_name: string; signature: string; module: string; doc_zh: string; doc_en?: string; code: string }>;
  generatedModules?: Record<string, { module_key: string; display_name: string; doc_zh: string; nodes: any[]; edges: any[] }>;
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'code'>('properties');
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [fnDetail, setFnDetail] = useState<any | null>(null);
  const [modDetail, setModDetail] = useState<any | null>(null);
  const [copyMsg, setCopyMsg] = useState('');

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setDetailError('');
      setFnDetail(null);
      setModDetail(null);
      if (!props.selectedItem) return;
      if (props.selectedItem.type === 'function') {
        const id = String(props.selectedItem.data.function_id || '').trim();
        if (!id) return;
        const local = props.generatedFunctions ? props.generatedFunctions[id] : null;
        if (local && String(local.code || '').trim()) {
          setFnDetail({
            function_id: id,
            display_name: local.display_name,
            signature: local.signature,
            module: local.module,
            doc_zh: local.doc_zh,
            doc_en: local.doc_en,
            code: local.code
          });
          return;
        }
        setDetailBusy(true);
        try {
          const r = await ragGetFunction(id);
          if (!alive) return;
          const fn = r?.function || r;
          setFnDetail(fn || null);
        } catch (e) {
          if (!alive) return;
          setDetailError(e instanceof Error ? e.message : '加载函数详情失败');
        } finally {
          if (alive) setDetailBusy(false);
        }
      }
      if (props.selectedItem.type === 'module') {
        const mk = String(props.selectedItem.data.module_key || '').trim();
        if (!mk) return;
        const local = props.generatedModules ? props.generatedModules[mk] : null;
        if (local) {
          setModDetail({
            module_key: mk,
            display_name: local.display_name,
            doc_zh: local.doc_zh,
            node_count: Array.isArray(local.nodes) ? local.nodes.length : 0,
            edge_count: Array.isArray(local.edges) ? local.edges.length : 0,
            source: 'generated'
          });
          return;
        }
        setDetailBusy(true);
        try {
          const r = await ragGetModule(mk);
          if (!alive) return;
          setModDetail(r?.module || null);
        } catch (e) {
          if (!alive) return;
          setDetailError(e instanceof Error ? e.message : '加载模块详情失败');
        } finally {
          if (alive) setDetailBusy(false);
        }
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [
    props.selectedItem?.type,
    (props.selectedItem as any)?.data?.function_id,
    (props.selectedItem as any)?.data?.module_key,
    props.generatedFunctions,
    props.generatedModules
  ]);

  const renderCodeViewer = (text: string) => {
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    return (
      <div className="mt-2 rounded border border-[#E1BEE7] overflow-hidden">
        <div className="max-h-[280px] overflow-auto bg-white">
          <div className="min-w-max font-mono text-[12px] text-gray-800">
            {lines.map((line, idx) => (
              <div key={idx} className="flex">
                <div className="w-14 shrink-0 select-none text-right pr-3 text-gray-400 bg-[#F9FAFB] border-r border-gray-100">
                  {idx + 1}
                </div>
                <div className="px-3 whitespace-pre">{line.length ? line : ' '}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <PanelHeader title="属性窗口" onClose={() => {}} />
      <div className="flex p-1 gap-1 bg-white border-b border-[#E1BEE7] shrink-0">
        <button 
          className={clsx(
            "flex-1 py-1 text-[10px] rounded font-medium transition-colors",
            activeTab === 'properties' ? "bg-[#F3E5F5] text-[#6A1B9A]" : "text-gray-500 hover:bg-gray-50"
          )}
          onClick={() => setActiveTab('properties')}
        >
          属性块
        </button>
        <button 
          className={clsx(
            "flex-1 py-1 text-[10px] rounded font-medium transition-colors",
            activeTab === 'code' ? "bg-[#F3E5F5] text-[#6A1B9A]" : "text-gray-500 hover:bg-gray-50"
          )}
          onClick={() => setActiveTab('code')}
        >
          代码块
        </button>
      </div>
      <div className="flex-1 p-4 text-xs text-gray-500 overflow-auto">
        {!!detailError && <div className="mb-2 text-[11px] text-red-600">{detailError}</div>}
        {activeTab === 'properties' && !props.selectedItem && <div>请在左侧组件库选择函数或模块</div>}
        {activeTab === 'properties' && props.selectedItem?.type === 'function' && (
          <div className="space-y-2 text-[11px]">
            <div><span className="text-gray-400">类型：</span>函数</div>
            <div><span className="text-gray-400">名称：</span>{props.selectedItem.data.display_name}</div>
            <div><span className="text-gray-400">模块：</span>{props.selectedItem.data.module}</div>
            <div><span className="text-gray-400">签名：</span>{props.selectedItem.data.signature}</div>
            <div><span className="text-gray-400">文件：</span>{props.selectedItem.data.file_path}:{props.selectedItem.data.start_line}-{props.selectedItem.data.end_line}</div>
            <div><span className="text-gray-400">说明：</span>{props.selectedItem.data.doc_zh || '-'}</div>
            <div><span className="text-gray-400">ID：</span>{props.selectedItem.data.function_id}</div>
            <div className="pt-2 border-t border-gray-100" />
            {detailBusy && <div className="text-[11px] text-gray-500">加载源码中...</div>}
            {!detailBusy && fnDetail && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#6A1B9A]">注释/说明</div>
                <div className="text-[11px] text-gray-700 whitespace-pre-wrap">{String(fnDetail?.doc_zh || props.selectedItem.data.doc_zh || '').trim() || '-'}</div>
                <div className="text-[11px] font-semibold text-[#6A1B9A]">源码</div>
                {renderCodeViewer(String(fnDetail?.code || ''))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'properties' && props.selectedItem?.type === 'module' && (
          <div className="space-y-2 text-[11px]">
            <div><span className="text-gray-400">类型：</span>模块</div>
            <div><span className="text-gray-400">名称：</span>{props.selectedItem.data.display_name || '-'}</div>
            <div><span className="text-gray-400">模块Key：</span>{props.selectedItem.data.module_key}</div>
            <div><span className="text-gray-400">节点/边：</span>{props.selectedItem.data.node_count}/{props.selectedItem.data.edge_count}</div>
            <div><span className="text-gray-400">来源：</span>{props.selectedItem.data.source || '-'}</div>
            <div><span className="text-gray-400">Root Dir：</span>{props.selectedItem.data.root_dir || '-'}</div>
            <div><span className="text-gray-400">说明：</span>{props.selectedItem.data.doc_zh || '-'}</div>
            <div className="pt-2 border-t border-gray-100" />
            {detailBusy && <div className="text-[11px] text-gray-500">加载模块详情中...</div>}
            {!detailBusy && modDetail && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#6A1B9A]">注释/说明</div>
                <div className="text-[11px] text-gray-700 whitespace-pre-wrap">{String(modDetail?.doc_zh || props.selectedItem.data.doc_zh || '').trim() || '-'}</div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'code' && (
          <div className="text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-[#6A1B9A]">生成代码</div>
              <button
                className="h-7 px-2 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50"
                disabled={!String(props.generatedCode || '').trim()}
                onClick={async () => {
                  const text = String(props.generatedCode || '');
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopyMsg('已复制');
                    window.setTimeout(() => setCopyMsg(''), 1200);
                  } catch {
                    try {
                      const el = document.createElement('textarea');
                      el.value = text;
                      el.style.position = 'fixed';
                      el.style.left = '-9999px';
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                      setCopyMsg('已复制');
                      window.setTimeout(() => setCopyMsg(''), 1200);
                    } catch {
                      setCopyMsg('复制失败');
                      window.setTimeout(() => setCopyMsg(''), 1200);
                    }
                  }
                }}
              >
                复制
              </button>
            </div>
            {!!copyMsg && <div className="mt-1 text-[10px] text-gray-500">{copyMsg}</div>}
            {!String(props.generatedCode || '').trim() && <div className="mt-2 text-gray-500">暂无可展示的代码（请先在需求面板执行生成）</div>}
            {!!String(props.generatedCode || '').trim() && renderCodeViewer(props.generatedCode)}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Layout ---

type WorkspaceProps = {
  projectId: string;
  injectModuleKey: string | null;
  injectModuleSignal: number;
  createModel: { moduleKey: string; displayName: string } | null;
  createModelSignal: number;
  injectFunctionPayload?: { functionId: string; displayName: string; signature?: string; module?: string } | null;
  injectFunctionSignal?: number;
  generatedFunctions?: Record<string, { display_name: string; signature: string; module: string; doc_zh: string; doc_en?: string; code: string }>;
  generatedModules?: Record<string, { module_key: string; display_name: string; doc_zh: string; nodes: any[]; edges: any[] }>;
  aiEditStartSignal: number;
  aiEditApplySignal: number;
  aiEditFailSignal: number;
  aiEditSummary: string;
  onGraphChange?: (graph: { canvases: CanvasItem[]; nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[]; activeCanvasId: string }) => void;
  importGraphPayload?: { canvases: CanvasItem[]; nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[]; activeCanvasId: string } | null;
  importGraphSignal?: number;
  onExportModule?: (payload: { canvasId: string; canvasName: string; nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[] }) => void;
  rootDir: string;
  setRootDir: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  generatedCode: string;
  generationMode: 'canvas' | 'analyze' | 'new_function' | 'new_module' | 'reuse';
  setGenerationMode: (v: 'canvas' | 'analyze' | 'new_function' | 'new_module' | 'reuse') => void;
  qaAutoOpenSignal: number;
  qaCanvasCodeContext: string;
  onGenerateFromQa: (finalPrompt: string) => void;
  logs: string[];
  pipelineSteps: PipelineStep[];
  busy: boolean;
  saveCanvasSignal: number;
  taskTargetModule: string;
  setTaskTargetModule: (v: string) => void;
  taskIntent: string;
  setTaskIntent: (v: string) => void;
  taskFeatureDescription: string;
  setTaskFeatureDescription: (v: string) => void;
  taskInputSpec: string;
  setTaskInputSpec: (v: string) => void;
  taskOutputSpec: string;
  setTaskOutputSpec: (v: string) => void;
  taskGenerationQuestion: string;
  setTaskGenerationQuestion: (v: string) => void;
  taskAnalysisResult: string;
  taskAnalyzeBusy: boolean;
  onTaskAnalyze: () => void;
  qaRisk: string;
  qaAmbiguity: string;
  qaMissing: string;
  qaBusy: boolean;
  onQaAnalyze: () => void;
  terminalLines: string[];
  terminalBusy: boolean;
  onRunTerminal: (command: string) => void;
  onRunGate: () => void;
  onGenerate: () => void;
  injectReusePayload?: { functions: any[]; modules: any[] } | null;
  injectReuseSignal?: number;
};

export default function Workspace(props: WorkspaceProps) {
  const [selectedItem, setSelectedItem] = useState<SelectedLibraryItem>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState<{ library: boolean; project: boolean; agents: boolean }>({
    library: true,
    project: false,
    agents: true
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      <Group orientation="horizontal" className="h-full w-full" id="main-group">
        
        {/* Left Sidebar */}
        <Panel defaultSize={25} minSize={15} className="flex flex-col border-r border-[#E1BEE7]" id="left-sidebar">
          <div className="h-full w-full flex flex-col bg-white">
            <button
              className="h-9 px-3 border-b border-[#E1BEE7] bg-[#F3E5F5] flex items-center justify-between text-xs font-semibold text-[#6A1B9A]"
              onClick={() => setLeftPanelOpen((v) => ({ ...v, library: !v.library }))}
            >
              <span>组件库</span>
              {leftPanelOpen.library ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {leftPanelOpen.library && (
              <div className="flex-1 min-h-0">
                <ComponentLibrary rootDir={props.rootDir} selectedItem={selectedItem} onSelectItem={setSelectedItem} />
              </div>
            )}
            <button
              className="h-9 px-3 border-y border-[#E1BEE7] bg-[#F3E5F5] flex items-center justify-between text-xs font-semibold text-[#6A1B9A]"
              onClick={() => setLeftPanelOpen((v) => ({ ...v, project: !v.project }))}
            >
              <span>工程视图</span>
              {leftPanelOpen.project ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {leftPanelOpen.project && (
              <div className="flex-1 min-h-0">
                <ProjectView rootDir={props.rootDir} setRootDir={props.setRootDir} />
              </div>
            )}
            <button
              className="h-9 px-3 border-y border-[#E1BEE7] bg-[#F3E5F5] flex items-center justify-between text-xs font-semibold text-[#6A1B9A]"
              onClick={() => setLeftPanelOpen((v) => ({ ...v, agents: !v.agents }))}
            >
              <span>多智能体状态</span>
              {leftPanelOpen.agents ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {leftPanelOpen.agents && (
              <div className="flex-1 min-h-0">
                <MultiAgentStatusPanel logs={props.logs} busy={props.busy} />
              </div>
            )}
          </div>
        </Panel>

        <Separator className="w-2 bg-[#F3E5F5] hover:bg-[#AB47BC] transition-colors cursor-col-resize flex items-center justify-center z-50 border-x border-[#E1BEE7]">
           <div className="h-8 w-1 bg-[#AB47BC] rounded-full opacity-50 pointer-events-none" />
        </Separator>

        {/* Center Area */}
        <Panel defaultSize={50} minSize={30} id="center-area">
          {/* Center Vertical Group: Canvas | Operation Log */}
          <Group orientation="vertical" className="h-full w-full" id="center-group">
            <Panel defaultSize={70} minSize={30} id="canvas">
              <Canvas
                key={`${props.projectId}:${String(props.importGraphSignal || 0)}`}
                projectId={props.projectId}
                rootDir={props.rootDir}
                injectModuleKey={props.injectModuleKey}
                injectModuleSignal={props.injectModuleSignal}
                createModel={props.createModel}
                createModelSignal={props.createModelSignal}
                injectFunctionPayload={props.injectFunctionPayload || null}
                injectFunctionSignal={props.injectFunctionSignal || 0}
                generatedFunctions={props.generatedFunctions}
                generatedModules={props.generatedModules}
                aiEditStartSignal={props.aiEditStartSignal}
                aiEditApplySignal={props.aiEditApplySignal}
                aiEditFailSignal={props.aiEditFailSignal}
                aiEditSummary={props.aiEditSummary}
                onSelectItem={setSelectedItem}
                onGraphChange={props.onGraphChange}
                saveCanvasSignal={props.saveCanvasSignal}
                importGraphPayload={props.importGraphPayload || null}
                importGraphSignal={props.importGraphSignal || 0}
                onExportModule={props.onExportModule}
                injectReusePayload={props.injectReusePayload || null}
                injectReuseSignal={props.injectReuseSignal || 0}
              />
            </Panel>
            <Separator className="h-2 bg-[#F3E5F5] hover:bg-[#AB47BC] transition-colors cursor-row-resize flex items-center justify-center z-50 border-y border-[#E1BEE7]">
               <div className="w-8 h-1 bg-[#AB47BC] rounded-full opacity-50 pointer-events-none" />
            </Separator>
            <Panel defaultSize={30} minSize={10} id="operation-log">
              <OperationLog
                logs={props.logs}
                pipelineSteps={props.pipelineSteps}
                isRunning={props.busy}
                terminalLines={props.terminalLines}
                terminalBusy={props.terminalBusy}
                onRunTerminal={props.onRunTerminal}
                onRunGate={props.onRunGate}
              />
            </Panel>
          </Group>
        </Panel>

        <Separator className="w-2 bg-[#F3E5F5] hover:bg-[#AB47BC] transition-colors cursor-col-resize flex items-center justify-center z-50 border-x border-[#E1BEE7]">
           <div className="h-8 w-1 bg-[#AB47BC] rounded-full opacity-50 pointer-events-none" />
        </Separator>

        {/* Right Sidebar */}
        <Panel defaultSize={25} minSize={15} className="border-l border-[#E1BEE7]" id="right-sidebar">
          <Group orientation="vertical" className="h-full w-full" id="right-group">
            <Panel defaultSize={50} minSize={20} id="requirement-panel">
              <RequirementPanel
                prompt={props.prompt}
                setPrompt={props.setPrompt}
                generatedCode={props.generatedCode}
                generationMode={props.generationMode}
                setGenerationMode={props.setGenerationMode}
                qaAutoOpenSignal={props.qaAutoOpenSignal}
                qaCanvasCodeContext={props.qaCanvasCodeContext}
                onGenerateFromQa={props.onGenerateFromQa}
                logs={props.logs}
                onGenerate={props.onGenerate}
                busy={props.busy}
                taskAnalysisResult={props.taskAnalysisResult}
                qaRisk={props.qaRisk}
                qaAmbiguity={props.qaAmbiguity}
                qaMissing={props.qaMissing}
              />
            </Panel>
            <Separator className="h-2 bg-[#F3E5F5] hover:bg-[#AB47BC] transition-colors cursor-row-resize flex items-center justify-center z-50 border-y border-[#E1BEE7]">
               <div className="w-8 h-1 bg-[#AB47BC] rounded-full opacity-50 pointer-events-none" />
            </Separator>
            <Panel defaultSize={50} minSize={20} id="attributes-panel">
              <AttributesPanel
                selectedItem={selectedItem}
                generatedCode={props.generatedCode}
                generatedFunctions={props.generatedFunctions}
                generatedModules={props.generatedModules}
              />
            </Panel>
          </Group>
        </Panel>

      </Group>
    </div>
  );
}
