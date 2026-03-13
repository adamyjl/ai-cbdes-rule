import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { cotQuestion, cotRefine } from '../../services/backend';

type Item = { text: string; resolved: boolean; question: string; answer: string };

export default function ReviewItemsModal(props: {
  open: boolean;
  mode: 'risk' | 'missing';
  title: string;
  items: Item[];
  goal: string;
  constraints: string;
  subtasks: string;
  getRiskItems: () => string[];
  getMissingItems: () => string[];
  onApply: (p: {
    mode: 'risk' | 'missing';
    item: string;
    question: string;
    answer: string;
    resolved: boolean;
    goal: string;
    constraints: string;
    subtasks: string;
    risk_items: string[];
    missing_items: string[];
  }) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const pending = useMemo(() => props.items.filter((x) => !x.resolved && String(x.text || '').trim()), [props.items]);
  const current = pending[idx] || null;

  useEffect(() => {
    if (!props.open) return;
    if (busy) return;
    if (pending.length === 0) props.onClose();
  }, [props.open, pending.length, busy]);

  useEffect(() => {
    if (!props.open) return;
    if (idx <= pending.length - 1) return;
    setIdx(Math.max(0, pending.length - 1));
  }, [props.open, pending.length, idx]);

  useEffect(() => {
    if (!props.open) return;
    setIdx(0);
    setMsg('');
    setQuestion('');
    setAnswer('');
  }, [props.open, props.mode]);

  useEffect(() => {
    if (!props.open) return;
    if (!current) return;
    setMsg('');
    setQuestion(String(current.question || ''));
    setAnswer(String(current.answer || ''));
    if (String(current.question || '').trim()) return;

    let canceled = false;
    const run = async () => {
      setBusy(true);
      try {
        const r = await cotQuestion({
          mode: props.mode,
          item: current.text,
          goal: props.goal,
          constraints: props.constraints,
          subtasks: props.subtasks,
          risk_items: props.getRiskItems(),
          missing_items: props.getMissingItems()
        });
        if (canceled) return;
        const q = String((r as any)?.question || '').trim();
        if (r && (r as any).ok && q) setQuestion(q);
        else setQuestion(`请补充：${current.text}（给出具体参数/范围/示例）？`);
      } catch {
        if (!canceled) setQuestion(`请补充：${current.text}（给出具体参数/范围/示例）？`);
      } finally {
        if (!canceled) setBusy(false);
      }
    };
    void run();
    return () => {
      canceled = true;
    };
  }, [props.open, props.mode, idx, current?.text]);

  const canSubmit = Boolean(current && String(answer || '').trim() && !busy);
  const canPrev = idx > 0 && !busy;
  const canNext = idx < pending.length - 1 && !busy;

  const submit = async () => {
    if (!current) return;
    if (!String(answer || '').trim()) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await cotRefine({
        mode: props.mode,
        item: current.text,
        answer: String(answer || ''),
        goal: props.goal,
        constraints: props.constraints,
        subtasks: props.subtasks,
        risk_items: props.getRiskItems(),
        missing_items: props.getMissingItems()
      });
      if (!r || !(r as any).ok) throw new Error((r as any)?.error || 'refine_failed');

      props.onApply({
        mode: props.mode,
        item: current.text,
        question: String(question || ''),
        answer: String(answer || ''),
        resolved: Boolean((r as any).resolved),
        goal: String((r as any).goal || ''),
        constraints: String((r as any).constraints || ''),
        subtasks: String((r as any).subtasks || ''),
        risk_items: Array.isArray((r as any).risk_items) ? (r as any).risk_items.map((x: any) => String(x).trim()).filter(Boolean) : [],
        missing_items: Array.isArray((r as any).missing_items) ? (r as any).missing_items.map((x: any) => String(x).trim()).filter(Boolean) : []
      });

      setAnswer('');
      setQuestion('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '确认失败');
    } finally {
      setBusy(false);
    }
  };

  if (!props.open) return null;

  const overlay = (
    <div className="fixed inset-0 z-[1000] bg-black/20 flex items-center justify-center p-6">
      <div className="w-[860px] max-w-[98vw] h-[70vh] rounded-lg border border-[#E1BEE7] bg-white shadow-2xl flex flex-col">
        <div className="h-10 px-3 border-b border-[#E1BEE7] bg-[#F3E5F5] flex items-center justify-between">
          <div className="text-sm font-semibold text-[#6A1B9A]">{props.title}</div>
          <button
            onClick={() => {
              if (!busy) props.onClose();
            }}
            className={clsx('text-xs px-2 py-1 rounded hover:bg-white text-[#6A1B9A] flex items-center gap-1', busy ? 'opacity-50 cursor-not-allowed' : '')}
          >
            <X className="w-3 h-3" />
            关闭
          </button>
        </div>

        <div className="p-3 flex-1 min-h-0 flex flex-col gap-3">
          {!!msg && <div className="text-[11px] text-red-600">{msg}</div>}
          <div className="text-[11px] text-gray-600">待确认：{pending.length}，当前：{pending.length ? idx + 1 : 0}</div>

          {!current ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-gray-500">暂无待确认条目</div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <div className="rounded border border-[#E1BEE7] bg-white p-3">
                <div className="text-[12px] font-semibold text-gray-900 whitespace-pre-wrap">{current.text}</div>
                <div className="mt-2 text-[11px] text-[#4A148C] whitespace-pre-wrap">Q：{question || '生成问题中...'}</div>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mt-2 w-full min-h-[110px] p-2 text-xs border border-[#E1BEE7] rounded outline-none"
                  placeholder="请输入你的回答（用于消歧/补齐）"
                  disabled={busy}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    className={clsx('h-8 px-3 rounded border border-[#E1BEE7] text-[11px] text-[#6A1B9A] hover:bg-[#F8ECFA]', !canPrev ? 'opacity-50 cursor-not-allowed' : '')}
                    disabled={!canPrev}
                    onClick={() => {
                      setIdx((v) => Math.max(0, v - 1));
                    }}
                  >
                    <ChevronLeft className="w-3 h-3 inline-block mr-1" />
                    上一条
                  </button>
                  <button
                    className={clsx('h-8 px-3 rounded border border-[#E1BEE7] text-[11px] text-[#6A1B9A] hover:bg-[#F8ECFA]', !canNext ? 'opacity-50 cursor-not-allowed' : '')}
                    disabled={!canNext}
                    onClick={() => {
                      setIdx((v) => Math.min(pending.length - 1, v + 1));
                    }}
                  >
                    下一条
                    <ChevronRight className="w-3 h-3 inline-block ml-1" />
                  </button>
                </div>

                <button
                  className={clsx('h-8 px-4 rounded bg-[#6A1B9A] text-white text-[12px] hover:bg-[#4A148C] flex items-center gap-2', !canSubmit ? 'opacity-50 cursor-not-allowed' : '')}
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  确认并更新
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
