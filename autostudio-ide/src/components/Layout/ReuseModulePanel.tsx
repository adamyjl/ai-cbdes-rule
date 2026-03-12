import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Loader2, RefreshCw, X } from 'lucide-react';
import { ragListFunctions, ragListIndexedModules, type FunctionIndexItem, type RagIndexedModuleItem } from '../../services/backend';

type ReuseCandidate =
  | {
      kind: 'function';
      function: FunctionIndexItem;
      id: string;
      title: string;
      subtitle: string;
      reason: string;
    }
  | {
      kind: 'module';
      module: RagIndexedModuleItem;
      id: string;
      title: string;
      subtitle: string;
      reason: string;
    };

export default function ReuseModulePanel(props: {
  rootDir: string;
  requirementText: string;
  canvasDigestText: string;
  existingFunctionIds: string[];
  existingModuleKeys: string[];
  onClose: () => void;
  onConfirm: (payload: {
    functions: Array<{ functionId: string; displayName: string; module: string; signature: string; inputsJson: string; outputsJson: string }>;
    modules: Array<{ moduleKey: string; displayName: string; inputsJson: string; outputsJson: string }>;
  }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ReuseCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const existingFnSet = useMemo(() => new Set(props.existingFunctionIds.map((x) => String(x || '').trim()).filter(Boolean)), [props.existingFunctionIds]);
  const existingModSet = useMemo(() => new Set(props.existingModuleKeys.map((x) => String(x || '').trim()).filter(Boolean)), [props.existingModuleKeys]);

  const queryText = useMemo(() => {
    const req = String(props.requirementText || '').trim();
    const dig = String(props.canvasDigestText || '').trim();
    const merged = [req, dig ? `\n\n[canvas]\n${dig}` : ''].filter(Boolean).join('\n');
    return merged.length > 1200 ? merged.slice(0, 1200) : merged;
  }, [props.requirementText, props.canvasDigestText]);

  const toReason = (req: string, title: string) => {
    const r = String(req || '').trim();
    const t = String(title || '').trim();
    if (!r || !t) return '命中：文本相似';
    const key = r
      .replace(/[\s，。；、,.]+/g, ' ')
      .split(' ')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);
    const hits = key.filter((k) => t.includes(k));
    if (!hits.length) return '命中：文本相似';
    return `命中：${hits.slice(0, 4).join('、')}`;
  };

  const runSearch = async () => {
    setError('');
    setLoading(true);
    try {
      const rootDir = String(props.rootDir || '').trim();
      const q = queryText;
      const [fRes, mRes] = await Promise.all([
        ragListFunctions({ root_dir: rootDir || undefined, q, limit: 50, offset: 0 }),
        ragListIndexedModules({ root_dir: rootDir || undefined, q, limit: 50, offset: 0 })
      ]);

      const fItems = (Array.isArray((fRes as any).items) ? ((fRes as any).items as FunctionIndexItem[]) : []).map((f) => {
        const title = String(f.display_name || f.function_id);
        const subtitle = [String(f.module || ''), String(f.signature || '')].filter(Boolean).join(' · ');
        return {
          kind: 'function',
          function: f,
          id: `fn:${String(f.function_id)}`,
          title,
          subtitle,
          reason: toReason(props.requirementText, `${title} ${String(f.doc_zh || '')}`)
        } as const;
      });

      const mItems = (Array.isArray((mRes as any).items) ? ((mRes as any).items as RagIndexedModuleItem[]) : []).map((m) => {
        const title = String(m.display_name || m.module_key);
        const subtitle = [String(m.module_key || ''), `${Number(m.node_count || 0)}/${Number(m.edge_count || 0)}`].filter(Boolean).join(' · ');
        return {
          kind: 'module',
          module: m,
          id: `mod:${String(m.module_key)}`,
          title,
          subtitle,
          reason: toReason(props.requirementText, `${title} ${String(m.doc_zh || '')}`)
        } as const;
      });

      const out: ReuseCandidate[] = [];
      const seen = new Set<string>();
      let i = 0;
      let j = 0;
      while (out.length < 10 && (i < mItems.length || j < fItems.length)) {
        const pickMod = i < mItems.length;
        const pickFn = j < fItems.length;
        const next = (() => {
          if (pickMod && pickFn) return out.length % 2 === 0 ? mItems[i++] : fItems[j++];
          if (pickMod) return mItems[i++];
          return fItems[j++];
        })();
        if (seen.has(next.id)) continue;
        seen.add(next.id);
        out.push(next);
      }
      setItems(out);
      setSelectedIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '检索失败');
      setItems([]);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch();
  }, [queryText, props.rootDir]);

  const selectedCount = selectedIds.length;
  const canConfirm = selectedCount > 0;

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
    }
  };

  const onConfirm = () => {
    const picked = new Set(selectedIds);
    const functions: Array<{ functionId: string; displayName: string; module: string; signature: string; inputsJson: string; outputsJson: string }> = [];
    const modules: Array<{ moduleKey: string; displayName: string; inputsJson: string; outputsJson: string }> = [];
    for (const it of items) {
      if (!picked.has(it.id)) continue;
      if (it.kind === 'function') {
        const f = it.function;
        const fid = String(f.function_id || '').trim();
        if (!fid || existingFnSet.has(fid)) continue;
        functions.push({
          functionId: fid,
          displayName: String(f.display_name || fid),
          module: String(f.module || 'common'),
          signature: String(f.signature || ''),
          inputsJson: String((f as any).inputs_json || '{}'),
          outputsJson: String((f as any).outputs_json || '{}')
        });
      } else {
        const m = it.module;
        const mk = String(m.module_key || '').trim();
        if (!mk || existingModSet.has(mk)) continue;
        modules.push({
          moduleKey: mk,
          displayName: String(m.display_name || mk),
          inputsJson: String((m as any).inputs_json || '{}'),
          outputsJson: String((m as any).outputs_json || '{}')
        });
      }
    }
    props.onConfirm({ functions, modules });
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/20 flex items-center justify-center p-6">
      <div className="w-[980px] max-w-[98vw] h-[80vh] rounded-lg border border-[#E1BEE7] bg-white shadow-2xl flex flex-col">
        <div className="h-10 px-3 border-b border-[#E1BEE7] bg-[#F3E5F5] flex items-center justify-between">
          <div className="text-sm font-semibold text-[#6A1B9A]">模块管理</div>
          <button onClick={props.onClose} className="text-xs px-2 py-1 rounded hover:bg-white text-[#6A1B9A] flex items-center gap-1">
            <X className="w-3 h-3" />
            关闭
          </button>
        </div>

        <div className="p-3 space-y-3 text-xs flex-1 min-h-0 flex flex-col">
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div className="rounded border border-[#E1BEE7] bg-white p-2">
              <div className="text-[11px] text-gray-500 mb-1">检索输入（需求 + 画布摘要）</div>
              <div className="text-[11px] text-gray-700 whitespace-pre-wrap line-clamp-3">{queryText || '-'}</div>
            </div>
            <button
              onClick={() => void runSearch()}
              disabled={loading}
              className="h-8 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A] disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              重新检索
            </button>
          </div>

          <div className="flex-1 min-h-0 rounded border border-[#E1BEE7] bg-white overflow-auto">
            <div className="px-3 py-2 border-b border-[#E1BEE7] bg-[#FAF7FC] flex items-center justify-between">
              <div className="text-[11px] font-semibold text-[#6A1B9A]">候选（最多 10 条）</div>
              <div className="text-[11px] text-gray-500">已选 {selectedCount}/10</div>
            </div>

            {error && <div className="p-3 text-[11px] text-red-600">{error}</div>}
            {!error && !loading && items.length === 0 && <div className="p-3 text-[11px] text-gray-500">未检索到可复用的函数/模块</div>}

            <div className="p-3 space-y-2">
              {items.map((it) => {
                const disabled =
                  it.kind === 'function'
                    ? existingFnSet.has(String(it.function.function_id || ''))
                    : existingModSet.has(String(it.module.module_key || ''));
                const checked = selectedIds.includes(it.id);
                const badge = it.kind === 'function' ? '函数' : '模块';
                const badgeCls = it.kind === 'function' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                const sourceText =
                  it.kind === 'function'
                    ? `${String(it.function.file_path || '')}:${Number(it.function.start_line || 0)}-${Number(it.function.end_line || 0)}`
                    : `${String(it.module.root_dir || '')} (${String(it.module.module_key || '')})`;
                return (
                  <label
                    key={it.id}
                    className={clsx(
                      'block rounded border p-2 cursor-pointer select-none',
                      disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-100' : 'border-gray-100 hover:bg-[#F8ECFA]'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        onChange={(e) => {
                          const v = Boolean(e.target.checked);
                          setSelectedIds((prev) => {
                            const set = new Set(prev);
                            if (v) set.add(it.id);
                            else set.delete(it.id);
                            return Array.from(set);
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', badgeCls)}>{badge}</span>
                          <div className="text-[12px] text-gray-900 font-semibold truncate">{it.title}</div>
                          {disabled && <div className="text-[10px] text-gray-500">已存在</div>}
                        </div>
                        <div className="mt-1 text-[11px] text-gray-600 whitespace-pre-wrap">{it.subtitle}</div>
                        <div className="mt-1 text-[11px] text-gray-500">{it.reason}</div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div className="text-[10px] text-gray-500 truncate" title={sourceText}>
                            {sourceText || '-'}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void onCopy(sourceText);
                            }}
                            className="h-6 px-2 rounded border border-[#E1BEE7] hover:bg-white text-[#6A1B9A] flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            复制引用
                          </button>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-500">确认后只注入画布，不进行代码生成</div>
            <div className="flex items-center gap-2">
              <button onClick={props.onClose} className="h-8 px-3 rounded border border-[#E1BEE7] hover:bg-[#F8ECFA] text-[#6A1B9A]">
                取消
              </button>
              <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className="h-8 px-3 rounded bg-[#6A1B9A] text-white hover:bg-[#4A148C] disabled:opacity-50"
              >
                注入到画布
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

