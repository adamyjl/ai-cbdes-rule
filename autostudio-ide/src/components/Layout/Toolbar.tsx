import { 
  PlusSquare, FolderOpen, ScanLine, Save, FilePlus, 
  Code2, FileCode, Hammer, Monitor, LayoutTemplate, 
  Rocket, Play, ChevronDown 
} from 'lucide-react';

type ToolbarProps = {
  busy: boolean;
  backendOk: boolean;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onNewModel: () => void;
  onRuntimeDesign: () => void;
  onDeploy: () => void;
  onHealth: () => void;
  onScanManager: () => void;
  onScan: () => void;
  onGenerate: () => void;
  onGate: () => void;
};

export default function Toolbar(props: ToolbarProps) {
  const tools = [
    { name: '新建工程', icon: PlusSquare, action: props.onNewProject },
    { name: '打开工程', icon: FolderOpen, action: props.onOpenProject },
    { name: '扫描管理', icon: ScanLine, action: props.onScanManager },
    { name: '保存', icon: Save, action: props.onSaveProject },
    { name: '新建模型', icon: FilePlus, action: props.onNewModel },
    { name: '代码扫描', icon: Code2, action: props.onScan },
    { name: '生成代码', icon: FileCode, action: props.onGenerate },
    { name: '编译', icon: Hammer, action: props.onGate },
    { name: '目标平台', icon: Monitor, action: props.onHealth },
    { name: '运行时设计', icon: LayoutTemplate, action: props.onRuntimeDesign },
    { name: '部署', icon: Rocket, action: props.onDeploy },
    { name: '运行', icon: Play, action: props.onGate },
  ];

  return (
    <div className="h-16 bg-[#F3E5F5] border-b border-[#E1BEE7] flex items-center justify-between px-4 shrink-0 select-none">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {tools.map((tool) => (
          <button
            key={tool.name}
            onClick={tool.action}
            disabled={props.busy || !tool.action}
            className="flex flex-col items-center justify-center px-3 py-1 cursor-pointer hover:bg-purple-100 rounded transition-colors group min-w-[70px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <tool.icon className="w-5 h-5 text-[#6A1B9A] mb-1 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <span className="text-[10px] text-[#4A148C] font-medium whitespace-nowrap">{tool.name}</span>
          </button>
        ))}
      </div>
      
      <button
        onClick={props.onHealth}
        disabled={props.busy}
        className="flex items-center gap-2 bg-white border border-[#E1BEE7] rounded px-3 py-1.5 cursor-pointer hover:border-[#BA68C8] disabled:opacity-50"
      >
        <div className={`w-2 h-2 rounded-full ${props.backendOk ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-xs text-[#4A148C] font-medium">{props.backendOk ? '本机: (X86) 已连接' : '本机: (X86) 未连接'}</span>
        <ChevronDown className="w-3 h-3 text-[#6A1B9A]" />
      </button>
    </div>
  );
}
