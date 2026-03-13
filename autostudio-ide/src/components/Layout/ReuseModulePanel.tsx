import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Loader2, RefreshCw, X } from 'lucide-react';
import {
  ragGetFunction,
  ragGetModule,
  ragListFunctions,
  ragListIndexedModules,
  ragQuery,
  ragQueryModules,
  type FunctionIndexItem,
  type RagIndexedModuleItem,
  type RagModuleHit
} from '../../services/backend';

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
  const searchSeqRef = useRef(0);

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

  const mapLimit = async <T, R>(
    xs: T[],
    limit: number,
    fn: (x: T, idx: number) => Promise<R>
  ): Promise<R[]> => {
    const out: R[] = new Array(xs.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(limit, xs.length)) }).map(async () => {
      while (cursor < xs.length) {
        const idx = cursor++;
        out[idx] = await fn(xs[idx], idx);
      }
    });
    await Promise.all(workers);
    return out;
  };

  const runSearch = async (seq: number) => {
    setError('');
    setLoading(true);
    try {
      const semanticQuery = (() => {
        const a = String(props.requirementText || '').trim();
        const b = String(props.canvasDigestText || '').trim();
        const s = a || b;
        return s.length > 400 ? s.slice(0, 400) : s;
      })();
      if (!semanticQuery) {
        setItems([]);
        setSelectedIds([]);
        setError('请先填写需求或在画布中加入节点后再尝试自动复用');
        return;
      }

      const tokenize = (s: string) => {
        const raw = String(s || '')
          .toLowerCase()
          .replace(/[\u0000-\u001f]/g, ' ')
          .replace(/[，。；、,.!?:;()\[\]{}<>"'`~@#$%^&*_+=|\\/\-]+/g, ' ');
        const parts = raw
          .split(/\s+/)
          .map((x) => x.trim())
          .filter(Boolean)
          .filter((x) => x.length >= 2)
          .slice(0, 24);
        return Array.from(new Set(parts));
      };
      const qTokens = tokenize(semanticQuery);
      const scoreByTokens = (hay: string) => {
        const h = String(hay || '').toLowerCase();
        let s = 0;
        for (const t of qTokens) if (t && h.includes(t)) s += 1;
        return s;
      };

      const [qRes, modQ] = await Promise.all([ragQuery(semanticQuery, 20, null), ragQueryModules(semanticQuery, 30)]);
      const hits = Array.isArray((qRes as any)?.hits) ? ((qRes as any).hits as any[]) : [];
      const modHits = Array.isArray((modQ as any)?.hits) ? (((modQ as any).hits as any[]) as RagModuleHit[]) : [];

      const fDetails = await Promise.all(
        hits
          .map((h) => String(h?.function_id || '').trim())
          .filter(Boolean)
          .slice(0, 12)
          .map(async (fid) => {
            try {
              const out = await ragGetFunction(fid);
              const fn = (out as any)?.function || (out as any);
              return fn && typeof fn === 'object' ? fn : null;
            } catch {
              return null;
            }
          })
      );

      let fList = fDetails.filter(Boolean) as FunctionIndexItem[];
      if (!fList.length) {
        try {
          const fallback = await ragListFunctions({ q: semanticQuery, limit: 30, offset: 0 });
          fList = Array.isArray((fallback as any)?.items) ? ((fallback as any).items as FunctionIndexItem[]) : [];
        } catch {
          fList = [];
        }
      }

      const fItems = fList.map((f: any) => {
        const fid = String(f.function_id || '').trim();
        const title = String(f.display_name || f.name || fid);
        const subtitle = [String(f.module || ''), String(f.signature || '')].filter(Boolean).join(' · ');
        return {
          kind: 'function',
          function: {
            ...f,
            function_id: fid,
            display_name: title
          } as any,
          id: `fn:${fid}`,
          title,
          subtitle,
          reason: toReason(props.requirementText, `${title} ${String((f as any).doc_zh || '')}`)
        } as const;
      });

      const modKeyScore = new Map<string, number>();
      const modKeyName = new Map<string, string>();
      for (const h of modHits) {
        const mk = String((h as any)?.module_key || '').trim();
        const sc = Number((h as any)?.score || 0);
        if (!mk) continue;
        if (!modKeyScore.has(mk) || (Number.isFinite(sc) && sc > (modKeyScore.get(mk) || 0))) modKeyScore.set(mk, sc);
        const dn = String((h as any)?.display_name || '').trim();
        if (dn && !modKeyName.has(mk)) modKeyName.set(mk, dn);
      }

      const candidateModuleKeys = Array.from(modKeyScore.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k)
        .filter((k) => !existingModSet.has(k))
        .slice(0, 18);

      let modDetails: RagIndexedModuleItem[] = [];
      if (candidateModuleKeys.length) {
        const mods = await mapLimit(candidateModuleKeys, 6, async (mk) => {
          try {
            const r = await ragGetModule(mk);
            const m = (r as any)?.module;
            if (r && (r as any).ok && m && typeof m === 'object') return m as RagIndexedModuleItem;
            return null;
          } catch {
            return null;
          }
        });
        modDetails = mods.filter(Boolean) as RagIndexedModuleItem[];
      }

      if (!modDetails.length) {
        try {
          const fallbackQ = qTokens[0] || semanticQuery.slice(0, 12);
          const r = await ragListIndexedModules({ q: fallbackQ || undefined, limit: 80, offset: 0 });
          modDetails = Array.isArray((r as any)?.items) ? (((r as any).items as any[]) as RagIndexedModuleItem[]) : [];
        } catch {
          modDetails = [];
        }
      }

      const mItems = modDetails
        .map((m) => {
          const mk = String(m.module_key || '').trim();
          const title = String(m.display_name || modKeyName.get(mk) || mk);
          const subtitle = [mk, `${Number(m.node_count || 0)}/${Number(m.edge_count || 0)}`].filter(Boolean).join(' · ');
          const lexical = scoreByTokens(`${title} ${String(m.doc_zh || '')} ${mk}`);
          const vec = modKeyScore.get(mk) || 0;
          const score = lexical + (vec > 0 ? vec * 12 : 0);
          return {
            kind: 'module',
            module: {
              ...m,
              module_key: mk,
              display_name: title
            } as any,
            id: `mod:${mk}`,
            title,
            subtitle,
            reason: toReason(props.requirementText, `${title} ${String(m.doc_zh || '')}`),
            _score: score,
            _vec: vec
          } as const;
        })
        .sort((a, b) => {
          if ((b._score || 0) !== (a._score || 0)) return (b._score || 0) - (a._score || 0);
          return (b._vec || 0) - (a._vec || 0);
        })
        .slice(0, 24)
        .map((x) => {
          const { _score, _vec, ...rest } = x as any;
          return rest as any;
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
      if (searchSeqRef.current !== seq) return;
      setItems(out);
      setSelectedIds([]);
    } catch (e) {
      if (searchSeqRef.current !== seq) return;
      setError(e instanceof Error ? e.message : '检索失败');
      setItems([]);
      setSelectedIds([]);
    } finally {
      if (searchSeqRef.current === seq) setLoading(false);
    }
  };

  useEffect(() => {
    const seq = (searchSeqRef.current += 1);
    const t = window.setTimeout(() => {
      void runSearch(seq);
    }, 450);
    return () => {
      window.clearTimeout(t);
    };
  }, [queryText]);

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
              onClick={() => {
                const seq = (searchSeqRef.current += 1);
                void runSearch(seq);
              }}
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
