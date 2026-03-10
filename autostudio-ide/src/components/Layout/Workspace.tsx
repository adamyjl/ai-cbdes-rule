import { Panel, Group, Separator } from 'react-resizable-panels';
import { Search, RotateCw, ChevronDown, ChevronRight, X, Maximize2, LayoutGrid, LayoutList, Plus, Play, Check, Loader2 } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { codegenGlue, ragGetFunction, ragGetModule, ragListFunctions, ragListIndexedModules, type FunctionIndexItem, type RagIndexedModuleItem } from '../../services/backend';

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


const TreeItem = ({ label, icon: Icon, children, defaultOpen = false }: { label: string, icon?: any, children?: React.ReactNode, defaultOpen?: boolean }) => {
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

  const loadLibraryData = async () => {
    setLoading(true);
    setError('');
    try {
      const [fns, mods] = await Promise.all([
        ragListFunctions({
          root_dir: props.rootDir || undefined,
          q: query || undefined,
          limit: 200,
          offset: 0
        }),
        ragListIndexedModules({
          root_dir: props.rootDir || undefined,
          q: query || undefined,
          limit: 200,
          offset: 0
        })
      ]);
      setFunctions(fns.items ?? []);
      setModules(mods.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLibraryData();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [props.rootDir, query]);

  const functionsByModule = functions.reduce<Record<string, FunctionIndexItem[]>>((acc, item) => {
    const key = item.module || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

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
        <RotateCw className="w-3 h-3 text-[#6A1B9A] cursor-pointer" onClick={() => void loadLibraryData()} />
      </div>
      <div className="flex-1 overflow-auto p-1">
        <div className="px-2 py-1 text-[10px] text-gray-500">
          Root Dir: {props.rootDir || '-'}
        </div>
        {loading && <div className="px-2 py-2 text-xs text-gray-500">加载中...</div>}
        {!!error && <div className="px-2 py-2 text-xs text-red-600">{error}</div>}
        {activeTab === 'function' ? (
          <>
            <div className="px-2 py-1 text-[10px] text-gray-500">已索引函数：{functions.length}</div>
            {Object.keys(functionsByModule).length === 0 && !loading ? (
              <div className="p-2 text-xs text-gray-500 text-center">暂无已索引函数</div>
            ) : (
              Object.entries(functionsByModule).map(([moduleName, items]) => (
                <TreeItem key={moduleName} label={`${moduleName} (${items.length})`} defaultOpen={true}>
                  {items.map((fn) => (
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
              ))
            )}
          </>
        ) : (
          <>
            <div className="px-2 py-1 text-[10px] text-gray-500">已索引模块：{modules.length}</div>
            {modules.length === 0 && !loading ? (
              <div className="p-2 text-xs text-gray-500 text-center">暂无已索引模块</div>
            ) : (
              modules.map((m) => (
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
              ))
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
  injectModuleKey: string | null;
  injectModuleSignal: number;
  createModel: { moduleKey: string; displayName: string } | null;
  createModelSignal: number;
  aiEditStartSignal: number;
  aiEditApplySignal: number;
  aiEditFailSignal: number;
  aiEditSummary: string;
  onSelectItem: (item: SelectedLibraryItem) => void;
  onGraphChange?: (graph: { nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[]; activeCanvasId: string }) => void;
  saveCanvasSignal: number;
}) => {
  const NODE_W = 180;
  const NODE_H = 52;
  const [canvases, setCanvases] = useState<CanvasItem[]>([
    { id: '1', name: `map${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '')}_1` }
  ]);
  const [activeCanvasId, setActiveCanvasId] = useState<string>('1');
  const [nodes, setNodes] = useState<CanvasNodeItem[]>([]);
  const [edges, setEdges] = useState<CanvasEdgeItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);
  const [notePopupNodeId, setNotePopupNodeId] = useState<string | null>(null);
  const [contextNodeId, setContextNodeId] = useState<string | null>(null);
  const [moduleExpanded, setModuleExpanded] = useState<Record<string, boolean>>({});
  const [moduleChildrenCache, setModuleChildrenCache] = useState<Record<string, { nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[] }>>({});
  const [connectDrag, setConnectDrag] = useState<{ fromId: string; fromPort?: string; toX: number; toY: number } | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const aiTargetNodeRef = useRef<string | null>(null);
  const dragRef = useRef<{
    mode: 'none' | 'canvas' | 'node';
    nodeId: string | null;
    button: number;
    startClientX: number;
    startClientY: number;
    startNodeX: number;
    startNodeY: number;
    startViewportX: number;
    startViewportY: number;
    moved: boolean;
  }>({
    mode: 'none',
    nodeId: null,
    button: 0,
    startClientX: 0,
    startClientY: 0,
    startNodeX: 0,
    startNodeY: 0,
    startViewportX: 0,
    startViewportY: 0,
    moved: false
  });
  const storageKey = `gaasd:canvas:${props.projectId}`;
  const [viewMode, setViewMode] = useState<'graph' | 'code'>('graph');
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number; mode: 'graph' | 'code' } | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeText, setCodeText] = useState('');

  const activeNodes = nodes.filter((n) => n.canvasId === activeCanvasId);
  const activeEdges = edges.filter((e) => e.canvasId === activeCanvasId);
  const nodeById = new Map(activeNodes.map((n) => [n.id, n]));

  const portCache = useMemo(() => {
    const inExtras = new Map<string, string[]>();
    const outExtras = new Map<string, string[]>();
    for (const e of activeEdges) {
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

  const portAnchorWorld = (n: CanvasNodeItem, side: 'in' | 'out', port?: string) => {
    const p = getPorts(n);
    const list = side === 'in' ? p.inputs : p.outputs;
    const idx = port ? list.indexOf(port) : -1;
    const i = idx >= 0 ? idx : Math.floor(Math.max(0, list.length - 1) / 2);
    return {
      x: side === 'in' ? n.x : n.x + NODE_W,
      y: n.y + 31 + i * 14
    };
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
      setCanvases(loadedCanvases);
      setActiveCanvasId(String(v?.activeCanvasId || loadedCanvases[0].id));
      setNodes(
        Array.isArray(v?.nodes)
          ? v.nodes.map((n: any) => ({
              ...n,
              status: normalizeNodeStatus(n?.status)
            }))
          : []
      );
      setEdges(Array.isArray(v?.edges) ? v.edges : []);
      setModuleExpanded({});
      setModuleChildrenCache({});
      setSelectedNodeId(null);
    } catch {
      setCanvases([{ id: '1', name: 'map0101_1' }]);
      setActiveCanvasId('1');
      setNodes([]);
      setEdges([]);
      setModuleExpanded({});
      setModuleChildrenCache({});
      setSelectedNodeId(null);
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
    if (!canvasMenu) return;
    const onDown = () => setCanvasMenu(null);
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [canvasMenu]);

  useEffect(() => {
    if (!nodeMenu) return;
    const onDown = () => setNodeMenu(null);
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [nodeMenu]);

  useEffect(() => {
    props.onGraphChange?.({ nodes, edges, activeCanvasId });
  }, [nodes, edges, activeCanvasId]);

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
    const p0 = toWorldPoint(e.clientX, e.clientY);
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
      setSelectedNodeId(id);
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
    setSelectedNodeId(id);
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
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NODE_W);
      maxY = Math.max(maxY, n.y + h);
    }
    const w = Math.max(2400, Math.ceil(maxX - minX + pad * 2));
    const h = Math.max(1600, Math.ceil(maxY - minY + pad * 2));
    return { w, h, ox: -minX + pad, oy: -minY + pad, minX, minY };
  }, [activeNodes, portCache]);

  const autoLayoutNodes = () => {
    const all = activeNodes;
    if (!all.length) return;
    const prevY = new Map(all.map((n) => [n.id, n.y]));
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

      const pos = new Map<string, { x: number; y: number }>();
      let compMinY = Infinity;
      let compMaxY = -Infinity;
      byLevel.forEach((idsAtLevel, lv) => {
        const heights = idsAtLevel.map((id) => getPorts(nodeById.get(id)!).h);
        const total = heights.reduce((s, h) => s + h, 0) + Math.max(0, heights.length - 1) * V_GAP;
        let y = -total / 2;
        idsAtLevel.forEach((id, idx) => {
          const h = heights[idx];
          pos.set(id, { x: 100 + lv * X_STEP, y });
          compMinY = Math.min(compMinY, y);
          compMaxY = Math.max(compMaxY, y + h);
          y += h + V_GAP;
        });
      });
      return { pos, height: compMaxY - compMinY, minY: compMinY };
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
    const glue = await codegenGlue({
      task: 'auto-connect',
      from_node: {
        name: from.displayName,
        outputs_json: from.outputsJson
      },
      to_node: {
        name: to.displayName,
        inputs_json: to.inputsJson
      }
    });
    if (!glue.ok) return;
    const gid = Math.random().toString(36).slice(2, 10);
    const glueNode: CanvasNodeItem = {
      id: gid,
      canvasId: activeCanvasId,
      kind: 'function',
      status: 'modified',
      functionId: `glue:${gid}`,
      displayName: String(glue.glue_name || 'glue'),
      module: 'glue',
      signature: '',
      inputsJson: JSON.stringify(glue.inputs_json || {}),
      outputsJson: JSON.stringify(glue.outputs_json || {}),
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2
    };
    setNodes((prev) => [...prev, glueNode]);
    setEdges((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 10), canvasId: activeCanvasId, from: fromId, to: gid },
      { id: Math.random().toString(36).slice(2, 10), canvasId: activeCanvasId, from: gid, to: toId }
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
    if (e.button !== 1 && e.button !== 2) return;
    e.preventDefault();
    dragRef.current = {
      mode: 'canvas',
      nodeId: null,
      button: e.button,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startNodeX: 0,
      startNodeY: 0,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      moved: false
    };
  };

  const beginNodeDrag = (e: React.MouseEvent, n: CanvasNodeItem) => {
    if (e.button !== 1 && e.button !== 2) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode: 'node',
      nodeId: n.id,
      button: e.button,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startNodeX: n.x,
      startNodeY: n.y,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      moved: false
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (connectDrag) {
        const p = toWorldPoint(e.clientX, e.clientY);
        setConnectDrag((prev) => (prev ? { ...prev, toX: p.x - contentBounds.ox, toY: p.y - contentBounds.oy } : prev));
      }
      if (d.mode === 'none') return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
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
      }
    };
    const onUp = async () => {
      const d = dragRef.current;
      if (connectDrag) {
        setConnectDrag(null);
        setConnectSourceNodeId(null);
      }
      if (d.mode === 'node' && d.button === 2 && d.nodeId && !d.moved) {
        setContextNodeId(d.nodeId);
      }
      dragRef.current = {
        mode: 'none',
        nodeId: null,
        button: 0,
        startClientX: 0,
        startClientY: 0,
        startNodeX: 0,
        startNodeY: 0,
        startViewportX: 0,
        startViewportY: 0,
        moved: false
      };
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [viewport.scale, connectDrag, contentBounds.ox, contentBounds.oy]);

  const loadModuleChildren = async (nodeId: string) => {
    const target = nodeById.get(nodeId);
    if (!target || !target.moduleKey) return { nodes: [] as CanvasNodeItem[], edges: [] as CanvasEdgeItem[] };
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
    const minX = Math.min(...rawNodes.map((n: any) => Number(n.x || 0)));
    const minY = Math.min(...rawNodes.map((n: any) => Number(n.y || 0)));
    const appendedNodes: CanvasNodeItem[] = rawNodes.map((n: any, idx: number) => {
      const nid = Math.random().toString(36).slice(2, 10);
      idMap.set(String(n.id), nid);
      return {
        id: nid,
        canvasId: activeCanvasId,
        kind: String(n.kind || 'node') === 'module' ? 'module' : 'function',
        status: 'clean',
        functionId: String(n.function_id || ''),
        moduleKey: String(n.module_key || ''),
        displayName: String(n.display_name || n.function_id || 'node'),
        module: String(n.module || 'common'),
        signature: String(n.signature || ''),
        inputsJson: String(n.inputsJson || n.inputs_json || '{}'),
        outputsJson: String(n.outputsJson || n.outputs_json || '{}'),
        x: target.x + 240 + (Number(n.x || 0) - minX),
        y: target.y + (Number(n.y || 0) - minY) + (idx % 2 === 0 ? 0 : 8)
      };
    });
    const appendedEdges: CanvasEdgeItem[] = Array.isArray(rawEdges)
      ? rawEdges
          .map((e: any) => ({
            id: Math.random().toString(36).slice(2, 10),
            canvasId: activeCanvasId,
            from: idMap.get(String(e.from || '')) || '',
            to: idMap.get(String(e.to || '')) || ''
          }))
          .filter((e: CanvasEdgeItem) => e.from && e.to)
      : [];
    setNodes((prev) => [...prev, ...appendedNodes]);
    setEdges((prev) => [...prev, ...appendedEdges]);
    setNodeStatus(nodeId, 'modified');
    return { nodes: appendedNodes, edges: appendedEdges };
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
    setSelectedNodeId(id);
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
    setSelectedNodeId(id);
  }, [props.createModelSignal]);

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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        removeNodeById(selectedNodeId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeId]);

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
          backgroundImage: 'linear-gradient(#6A1B9A22 1px, transparent 1px), linear-gradient(90deg, #6A1B9A22 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropCanvas}
        onMouseDown={beginCanvasPan}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          setConnectSourceNodeId(null);
          setContextNodeId(null);
          setNotePopupNodeId(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const rect = canvasAreaRef.current?.getBoundingClientRect();
          if (!rect) return;
          if (viewMode === 'code') {
            setCanvasMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, mode: 'code' });
            return;
          }
          if (e.target !== e.currentTarget) return;
          setCanvasMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, mode: 'graph' });
        }}
        onWheel={(e) => {
          e.preventDefault();
          const rect = canvasAreaRef.current?.getBoundingClientRect();
          if (!rect) return;
          const factor = e.deltaY > 0 ? 0.92 : 1.08;
          const nextScale = Math.min(2.5, Math.max(0.35, viewport.scale * factor));
          const lx = e.clientX - rect.left;
          const ly = e.clientY - rect.top;
          const wx = (lx - viewport.x) / viewport.scale;
          const wy = (ly - viewport.y) / viewport.scale;
          setViewport({
            scale: nextScale,
            x: lx - wx * nextScale,
            y: ly - wy * nextScale
          });
        }}
      >
        <div className="absolute left-4 top-3 text-[11px] text-gray-400">
          {activeCanvas?.name}：左键选中；右/中键拖动节点或画布；滚轮缩放；右键单击节点看属性
        </div>
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
                style={{ overflow: 'visible' }}
              >
                {activeEdges.map((e) => {
                  const from = nodeById.get(e.from);
                  const to = nodeById.get(e.to);
                  if (!from || !to) return null;
                  const a1 = portAnchorWorld(from, 'out', e.fromPort);
                  const a2 = portAnchorWorld(to, 'in', e.toPort);
                  const x1 = a1.x + contentBounds.ox;
                  const y1 = a1.y + contentBounds.oy;
                  const x2 = a2.x + contentBounds.ox;
                  const y2 = a2.y + contentBounds.oy;
                  const dx = Math.max(40, Math.abs(x2 - x1) * 0.35);
                  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  return <path key={e.id} d={d} stroke="#7B1FA2" strokeWidth="1.6" opacity="0.9" fill="none" />;
                })}
                {connectDrag && nodeById.get(connectDrag.fromId) && (() => {
                  const from = nodeById.get(connectDrag.fromId)!;
                  const a1 = portAnchorWorld(from, 'out', connectDrag.fromPort);
                  const x1 = a1.x + contentBounds.ox;
                  const y1 = a1.y + contentBounds.oy;
                  const x2 = connectDrag.toX + contentBounds.ox;
                  const y2 = connectDrag.toY + contentBounds.oy;
                  const dx = Math.max(40, Math.abs(x2 - x1) * 0.35);
                  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  return <path d={d} stroke="#AB47BC" strokeWidth="1.4" fill="none" strokeDasharray="4 3" />;
                })()}
              </svg>
              {activeNodes.map((n) => {
                const ports = getPorts(n);
                return (
                  <button
                    key={n.id}
                    onMouseDown={(e) => beginNodeDrag(e, n)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = canvasAreaRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setNodeMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, nodeId: n.id });
                    }}
                    onClick={() => {
                      if (connectSourceNodeId && connectSourceNodeId !== n.id) {
                        void connectNodes(connectSourceNodeId, n.id);
                        setConnectSourceNodeId(null);
                      }
                      if (selectedNodeId === n.id) {
                        setNotePopupNodeId((prev) => (prev === n.id ? null : n.id));
                      } else {
                        setSelectedNodeId(n.id);
                        if (normalizeNodeStatus(n.status) === 'modified' && n.changeSummary) setNotePopupNodeId(n.id);
                        else setNotePopupNodeId(null);
                      }
                      selectAttributesByNode(n);
                    }}
                    onDoubleClick={() => {
                      if (n.kind === 'module') void toggleModuleExpand(n.id);
                    }}
                    className={clsx(
                      "absolute relative w-[180px] rounded-md border px-3 py-2 text-left shadow-sm",
                      n.kind === 'module' ? "bg-[#FFF7ED] border-[#FDBA74]" : "bg-white border-[#D8B4FE]",
                      selectedNodeId === n.id ? "ring-2 ring-[#6A1B9A]" : ""
                    )}
                    style={{ left: n.x + contentBounds.ox, top: n.y + contentBounds.oy, height: ports.h }}
                  >
                    {ports.inputs.map((name, idx) => (
                      <span
                        key={`in-${name}-${idx}`}
                        className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-white border border-[#AB47BC] shadow-sm"
                        style={{ top: 26 + idx * 14 }}
                        onMouseUp={(e) => finishPortConnect(e, n.id, name)}
                        title={`输入：${name}`}
                      />
                    ))}
                    {ports.outputs.map((name, idx) => (
                      <span
                        key={`out-${name}-${idx}`}
                        className="absolute right-[-5px] w-2.5 h-2.5 rounded-full bg-[#AB47BC] border border-white shadow-sm"
                        style={{ top: 26 + idx * 14 }}
                        onMouseDown={(e) => beginPortConnect(e, n.id, name)}
                        title={`输出：${name}（拖拽连线）`}
                      />
                    ))}
                    {!ports.inputs.length && (
                      <span
                        className="absolute left-[-5px] top-[26px] w-2.5 h-2.5 rounded-full bg-white border border-[#AB47BC] shadow-sm"
                        onMouseUp={(e) => finishPortConnect(e, n.id)}
                        title="输入端口"
                      />
                    )}
                    {!ports.outputs.length && (
                      <span
                        className="absolute right-[-5px] top-[26px] w-2.5 h-2.5 rounded-full bg-[#AB47BC] border border-white shadow-sm"
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
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'code' && (
          <div className="absolute inset-0 p-3 overflow-auto">
            {codeBusy && <div className="text-xs text-gray-500">生成代码中...</div>}
            {!codeBusy && <pre className="text-[11px] text-gray-800 whitespace-pre-wrap">{codeText || '暂无可展示的代码（请先在画布加入函数节点并连线）'}</pre>}
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
            className="absolute z-50 rounded border border-[#E1BEE7] bg-white shadow-xl text-[11px] text-gray-700"
            style={{ left: canvasMenu.x, top: canvasMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {canvasMenu.mode === 'graph' && (
              <button
                className="block w-full text-left px-3 py-2 hover:bg-[#F3E5F5]"
                onClick={async () => {
                  setCanvasMenu(null);
                  setViewMode('code');
                  setCodeBusy(true);
                  try {
                    const ids = activeNodes.map((n) => n.id);
                    const indeg = new Map(ids.map((id) => [id, 0]));
                    const out = new Map(ids.map((id) => [id, [] as string[]]));
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
                    const details = await Promise.all(uniqueFnIds.map((id) => ragGetFunction(id).catch(() => null)));
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
                切换到代码界面（只读）
              </button>
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
              查看属性
            </button>
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
              if (!selectedNodeId) return;
              removeNodeById(selectedNodeId);
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
  logs: string[];
  onGenerate: () => void;
  busy: boolean;
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
}) => {
  const [activeTab, setActiveTab] = useState<'requirement' | 'qa' | 'llm-call' | 'llm-prompt'>('requirement');

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
            <textarea
              value={props.prompt}
              onChange={(e) => props.setPrompt(e.target.value)}
              className="w-full min-h-[140px] p-2 text-xs border border-[#E1BEE7] rounded outline-none"
              placeholder="请输入需求内容"
            />
            <button
              onClick={props.onGenerate}
              disabled={props.busy}
              className="h-7 px-3 text-[11px] rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C] disabled:opacity-50"
            >
              生成代码
            </button>
            <div className="mt-2 pt-2 border-t border-[#F1E4F6] space-y-2">
              <input value={props.taskTargetModule} onChange={(e) => props.setTaskTargetModule(e.target.value)} placeholder="目标模块" className="w-full h-7 px-2 text-xs border border-[#E1BEE7] rounded outline-none" />
              <input value={props.taskIntent} onChange={(e) => props.setTaskIntent(e.target.value)} placeholder="任务意图" className="w-full h-7 px-2 text-xs border border-[#E1BEE7] rounded outline-none" />
              <textarea value={props.taskFeatureDescription} onChange={(e) => props.setTaskFeatureDescription(e.target.value)} className="w-full min-h-[70px] p-2 text-xs border border-[#E1BEE7] rounded outline-none" placeholder="功能描述" />
              <textarea value={props.taskInputSpec} onChange={(e) => props.setTaskInputSpec(e.target.value)} className="w-full min-h-[60px] p-2 text-xs border border-[#E1BEE7] rounded outline-none" placeholder="输入规格" />
              <textarea value={props.taskOutputSpec} onChange={(e) => props.setTaskOutputSpec(e.target.value)} className="w-full min-h-[60px] p-2 text-xs border border-[#E1BEE7] rounded outline-none" placeholder="输出规格" />
              <textarea value={props.taskGenerationQuestion} onChange={(e) => props.setTaskGenerationQuestion(e.target.value)} className="w-full min-h-[60px] p-2 text-xs border border-[#E1BEE7] rounded outline-none" placeholder="任务分析问题" />
              <button
                onClick={props.onTaskAnalyze}
                disabled={props.taskAnalyzeBusy}
                className="h-7 px-3 text-[11px] rounded bg-[#7B1FA2] text-white hover:bg-[#6A1B9A] disabled:opacity-50"
              >
                {props.taskAnalyzeBusy ? '分析中...' : '任务分析'}
              </button>
              <div className="text-[11px] text-gray-700 whitespace-pre-wrap rounded border border-[#E1BEE7] bg-[#FAF7FC] p-2">
                {props.taskAnalysisResult || '暂无任务分析结果'}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'qa' && (
          <div className="space-y-2">
            <button
              onClick={props.onQaAnalyze}
              disabled={props.qaBusy}
              className="h-7 px-3 text-[11px] rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C] disabled:opacity-50"
            >
              {props.qaBusy ? '分析中...' : '生成QA清单'}
            </button>
            <div className="rounded border border-[#E1BEE7] p-2 bg-[#FAF7FC]">
              <div className="text-[11px] font-semibold text-[#6A1B9A] mb-1">风险点</div>
              <div className="text-[11px] text-gray-700 whitespace-pre-wrap">{props.qaRisk || '暂无'}</div>
            </div>
            <div className="rounded border border-[#E1BEE7] p-2 bg-[#FAF7FC]">
              <div className="text-[11px] font-semibold text-[#6A1B9A] mb-1">歧义点</div>
              <div className="text-[11px] text-gray-700 whitespace-pre-wrap">{props.qaAmbiguity || '暂无'}</div>
            </div>
            <div className="rounded border border-[#E1BEE7] p-2 bg-[#FAF7FC]">
              <div className="text-[11px] font-semibold text-[#6A1B9A] mb-1">缺失信息清单</div>
              <div className="text-[11px] text-gray-700 whitespace-pre-wrap">{props.qaMissing || '暂无'}</div>
            </div>
          </div>
        )}
        {activeTab === 'llm-call' && <div className="space-y-1">{props.logs.slice(-20).map((l, i) => <div key={i}>{l}</div>)}</div>}
        {activeTab === 'llm-prompt' && <pre className="whitespace-pre-wrap text-[11px] text-gray-700">{props.generatedCode || '尚未生成代码'}</pre>}
      </div>
    </div>
  );
};

const AttributesPanel = (props: { selectedItem: SelectedLibraryItem }) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'interactions'>('properties');

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
            activeTab === 'interactions' ? "bg-[#F3E5F5] text-[#6A1B9A]" : "text-gray-500 hover:bg-gray-50"
          )}
          onClick={() => setActiveTab('interactions')}
        >
          交互块
        </button>
      </div>
      <div className="flex-1 p-4 text-xs text-gray-500 overflow-auto">
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
          </div>
        )}
        {activeTab === 'interactions' && !props.selectedItem && <div>请选择组件后查看可用交互</div>}
        {activeTab === 'interactions' && props.selectedItem?.type === 'function' && (
          <div className="space-y-1 text-[11px]">
            <div>可执行：加入画布、生成胶水代码、查看源码定位</div>
            <div>建议：在需求面板补充输入输出约束后再执行生成</div>
          </div>
        )}
        {activeTab === 'interactions' && props.selectedItem?.type === 'module' && (
          <div className="space-y-1 text-[11px]">
            <div>可执行：模块展开、模块发布、替换同名模块</div>
            <div>建议：先确认节点/边规模与来源再发布</div>
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
  aiEditStartSignal: number;
  aiEditApplySignal: number;
  aiEditFailSignal: number;
  aiEditSummary: string;
  onGraphChange?: (graph: { nodes: CanvasNodeItem[]; edges: CanvasEdgeItem[]; activeCanvasId: string }) => void;
  rootDir: string;
  setRootDir: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  generatedCode: string;
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
                projectId={props.projectId}
                injectModuleKey={props.injectModuleKey}
                injectModuleSignal={props.injectModuleSignal}
                createModel={props.createModel}
                createModelSignal={props.createModelSignal}
                aiEditStartSignal={props.aiEditStartSignal}
                aiEditApplySignal={props.aiEditApplySignal}
                aiEditFailSignal={props.aiEditFailSignal}
                aiEditSummary={props.aiEditSummary}
                onSelectItem={setSelectedItem}
                onGraphChange={props.onGraphChange}
                saveCanvasSignal={props.saveCanvasSignal}
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
                logs={props.logs}
                onGenerate={props.onGenerate}
                busy={props.busy}
                taskTargetModule={props.taskTargetModule}
                setTaskTargetModule={props.setTaskTargetModule}
                taskIntent={props.taskIntent}
                setTaskIntent={props.setTaskIntent}
                taskFeatureDescription={props.taskFeatureDescription}
                setTaskFeatureDescription={props.setTaskFeatureDescription}
                taskInputSpec={props.taskInputSpec}
                setTaskInputSpec={props.setTaskInputSpec}
                taskOutputSpec={props.taskOutputSpec}
                setTaskOutputSpec={props.setTaskOutputSpec}
                taskGenerationQuestion={props.taskGenerationQuestion}
                setTaskGenerationQuestion={props.setTaskGenerationQuestion}
                taskAnalysisResult={props.taskAnalysisResult}
                taskAnalyzeBusy={props.taskAnalyzeBusy}
                onTaskAnalyze={props.onTaskAnalyze}
                qaRisk={props.qaRisk}
                qaAmbiguity={props.qaAmbiguity}
                qaMissing={props.qaMissing}
                qaBusy={props.qaBusy}
                onQaAnalyze={props.onQaAnalyze}
              />
            </Panel>
            <Separator className="h-2 bg-[#F3E5F5] hover:bg-[#AB47BC] transition-colors cursor-row-resize flex items-center justify-center z-50 border-y border-[#E1BEE7]">
               <div className="w-8 h-1 bg-[#AB47BC] rounded-full opacity-50 pointer-events-none" />
            </Separator>
            <Panel defaultSize={50} minSize={20} id="attributes-panel">
              <AttributesPanel selectedItem={selectedItem} />
            </Panel>
          </Group>
        </Panel>

      </Group>
    </div>
  );
}
