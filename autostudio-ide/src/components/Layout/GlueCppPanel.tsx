import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { clsx } from 'clsx';

type FieldDefLite = { name: string; type: string; required?: boolean };

export default function GlueCppPanel(props: {
  fromLabel: string;
  toLabel: string;
  fromFields: FieldDefLite[];
  toFields: FieldDefLite[];
  defaultTask: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onDirectConnect?: () => void;
  onGenerate: (taskText: string) => void;
}) {
  const [taskText, setTaskText] = useState(props.defaultTask);

  const fromRequired = useMemo(() => props.fromFields.filter((f) => f.required), [props.fromFields]);
  const toRequired = useMemo(() => props.toFields.filter((f) => f.required), [props.toFields]);

  const canSubmit = Boolean(String(taskText || '').trim());

  const overlay = (
    <div className="fixed inset-0 z-[1000] bg-black/20 flex items-center justify-center p-6">
      <div className="w-[980px] max-w-[98vw] h-[82vh] rounded-lg border border-[#E1BEE7] bg-white shadow-2xl flex flex-col">
        <div className="h-10 px-3 border-b border-[#E1BEE7] bg-[#F3E5F5] flex items-center justify-between">
          <div className="text-sm font-semibold text-[#6A1B9A]">字段不匹配：生成胶水函数</div>
          <button onClick={props.onClose} className="text-xs px-2 py-1 rounded hover:bg-white text-[#6A1B9A] flex items-center gap-1">
            <X className="w-3 h-3" />
            关闭
          </button>
        </div>

        <div className="p-3 flex-1 min-h-0 flex flex-col gap-3">
          {!!props.error && <div className="text-[11px] text-red-600">{props.error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-[#E1BEE7] bg-white overflow-hidden flex flex-col min-h-0">
              <div className="px-3 py-2 border-b border-[#E1BEE7] bg-[#FAF7FC] text-[11px] font-semibold text-[#6A1B9A]">源输出：{props.fromLabel}</div>
              <div className="p-3 overflow-auto text-[11px] text-gray-700 space-y-1">
                {props.fromFields.length === 0 && <div className="text-gray-500">暂无字段定义</div>}
                {props.fromFields.map((f) => (
                  <div key={f.name} className="flex items-center justify-between gap-2">
                    <div className="truncate">{f.name}</div>
                    <div className="shrink-0 text-gray-500">{f.type || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded border border-[#E1BEE7] bg-white overflow-hidden flex flex-col min-h-0">
              <div className="px-3 py-2 border-b border-[#E1BEE7] bg-[#FAF7FC] text-[11px] font-semibold text-[#6A1B9A]">目标输入：{props.toLabel}</div>
              <div className="p-3 overflow-auto text-[11px] text-gray-700 space-y-1">
                {props.toFields.length === 0 && <div className="text-gray-500">暂无字段定义</div>}
                {props.toFields.map((f) => (
                  <div key={f.name} className="flex items-center justify-between gap-2">
                    <div className={clsx('truncate', f.required ? 'font-semibold text-gray-900' : '')}>{f.name}{f.required ? ' *' : ''}</div>
                    <div className="shrink-0 text-gray-500">{f.type || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded border border-[#E1BEE7] bg-white p-3">
            <div className="text-[11px] font-semibold text-[#6A1B9A]">胶水需求（用于生成一个 C++ 转换函数）</div>
            <div className="mt-1 text-[11px] text-gray-500">请描述如何把源输出转换成目标输入，可包含字段映射、默认值、类型转换规则等</div>
            <textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              className="mt-2 w-full min-h-[110px] p-2 text-xs border border-[#E1BEE7] rounded outline-none"
              placeholder="例如：将 source.speed_mps 映射到 target.v，缺失字段填 0，string 转 number 时用 atof"
            />
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
              <div>源 required 字段：{fromRequired.length || 0}</div>
              <div>目标 required 字段：{toRequired.length || 0}</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-500">生成后会将胶水函数节点插入源与目标之间，并自动重连</div>
            <div className="flex items-center gap-2">
              <button
                onClick={props.onDirectConnect}
                disabled={!props.onDirectConnect || props.busy}
                data-testid="gaasd-glue-direct-connect"
                className="h-8 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50"
              >
                直连
              </button>
              <button onClick={props.onClose} className="h-8 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A]">
                取消
              </button>
              <button
                onClick={() => props.onGenerate(taskText)}
                disabled={!canSubmit || props.busy}
                className="h-8 px-3 rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C] disabled:opacity-50 flex items-center gap-2"
              >
                {props.busy && <Loader2 className="w-3 h-3 animate-spin" />}
                生成并注入画布
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(overlay, document.body);
  }

  return overlay;
}
