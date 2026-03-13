import { X, GitCompare, Copy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { computeSideBySideLineDiff, type DiffRow } from '../utils/lineDiff';

export type DiffSnapshot = {
  ts: number;
  source: string;
  old_code: string;
  new_code: string;
};

const DIFF_KEY = 'gaasd:diff_snapshot:v1';

export function loadDiffSnapshot(): DiffSnapshot | null {
  try {
    const raw = localStorage.getItem(DIFF_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    const ts = typeof v.ts === 'number' ? v.ts : 0;
    const source = String(v.source || '');
    const old_code = String(v.old_code || '');
    const new_code = String(v.new_code || '');
    if (!ts) return null;
    return { ts, source, old_code, new_code };
  } catch {
    return null;
  }
}

export function saveDiffSnapshot(s: DiffSnapshot) {
  try {
    localStorage.setItem(DIFF_KEY, JSON.stringify(s));
  } catch {
    return;
  }
}

export function DiffOverlay(props: {
  open: boolean;
  snapshot: DiffSnapshot | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState('');

  const rows: DiffRow[] = useMemo(() => {
    if (!props.snapshot) return [];
    return computeSideBySideLineDiff(props.snapshot.old_code, props.snapshot.new_code);
  }, [props.snapshot]);

  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onClose]);

  const title = props.snapshot
    ? `Diff 回显 · ${new Date(props.snapshot.ts).toLocaleString()}${props.snapshot.source ? ` · ${props.snapshot.source}` : ''}`
    : 'Diff 回显';

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 900);
    } catch {
      setCopied('');
    }
  };

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex">
      <div className="m-6 flex-1 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col border border-[#E1BEE7]">
        <div className="h-10 shrink-0 flex items-center justify-between px-3 bg-[#F3E5F5] border-b border-[#E1BEE7]">
          <div className="flex items-center gap-2 min-w-0">
            <GitCompare className="w-4 h-4 text-[#6A1B9A]" />
            <div className="text-[12px] font-semibold text-[#4A148C] truncate">{title}</div>
          </div>
          <div className="flex items-center gap-2">
            {props.snapshot ? (
              <button
                className="h-7 px-2 text-[11px] rounded border border-[#E1BEE7] bg-white hover:bg-[#FAF5FF] text-[#4A148C] flex items-center gap-1"
                onClick={() => void copyText(props.snapshot.new_code, 'new')}
              >
                <Copy className="w-3.5 h-3.5" />
                {copied === 'new' ? '已复制新代码' : '复制新代码'}
              </button>
            ) : null}
            <button
              className="h-7 w-7 rounded bg-white border border-[#E1BEE7] hover:bg-[#FAF5FF] flex items-center justify-center"
              onClick={props.onClose}
              aria-label="关闭"
            >
              <X className="w-4 h-4 text-[#4A148C]" />
            </button>
          </div>
        </div>

        {!props.snapshot ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            当前没有可回显的 Diff，请先完成一次代码生成。
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col overflow-hidden">
              <div className="h-8 shrink-0 grid grid-cols-2 border-b border-[#E1BEE7]">
                <div className="px-3 flex items-center text-[11px] font-semibold text-gray-600 bg-white border-r border-[#E1BEE7]">旧代码（画布）</div>
                <div className="px-3 flex items-center text-[11px] font-semibold text-gray-600 bg-white">新代码（生成）</div>
              </div>
              <div className="flex-1 overflow-auto">
                {rows.map((r, idx) => {
                  const leftBg = r.kind === 'equal' ? 'bg-[#F0FDF4]' : r.kind === 'insert' ? 'bg-white' : 'bg-[#FEF2F2]';
                  const rightBg = r.kind === 'equal' ? 'bg-[#F0FDF4]' : r.kind === 'delete' ? 'bg-white' : 'bg-[#FEF2F2]';
                  return (
                    <div key={idx} className="grid grid-cols-[64px_1fr_64px_1fr] font-mono text-[11px] leading-5">
                      <div className={clsx('px-2 text-right text-gray-500 border-r border-[#F3E5F5] select-none', leftBg)}>{r.leftNo ?? ''}</div>
                      <pre className={clsx('px-2 whitespace-pre overflow-hidden text-gray-900 border-r border-[#E1BEE7]', leftBg)}>{r.leftText}</pre>
                      <div className={clsx('px-2 text-right text-gray-500 border-r border-[#F3E5F5] select-none', rightBg)}>{r.rightNo ?? ''}</div>
                      <pre className={clsx('px-2 whitespace-pre overflow-hidden text-gray-900', rightBg)}>{r.rightText}</pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
