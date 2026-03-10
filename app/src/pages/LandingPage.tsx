import { BrainCircuit, Network, Workflow } from 'lucide-react'

function EntryCard(props: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <a
      href={props.href}
      className="group block rounded-2xl border bg-white/60 p-6 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{ borderColor: 'rgba(95, 2, 107, 0.28)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-900">{props.title}</div>
          <div className="mt-2 text-sm leading-relaxed text-zinc-600">{props.description}</div>
        </div>
        <div
          className="shrink-0 rounded-xl p-3"
          style={{ background: props.accent, color: 'rgb(95, 2, 107)' }}
        >
          {props.icon}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-medium" style={{ color: 'rgb(95, 2, 107)' }}>
        进入
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </div>
    </a>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-white">
      <div
        className="relative overflow-hidden"
        style={{
          background:
            'radial-gradient(1200px 600px at 10% 10%, rgba(95,2,107,0.14), transparent 55%), radial-gradient(900px 500px at 90% 20%, rgba(96,0,107,0.16), transparent 60%), linear-gradient(180deg, #ffffff 0%, rgb(252, 248, 242) 100%)'
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(circle at 50% 30%, black 0%, transparent 70%)'
          }}
        />

        <header className="relative border-b bg-white/50 backdrop-blur" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-zinc-900">AI-CBDES-Rule</div>
              <div className="mt-1 text-xs text-zinc-600">智能闭环智驾编码平台</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/offline/rag"
                className="rounded-full border bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-[rgba(95,2,107,0.06)]"
                style={{ borderColor: 'rgb(95, 2, 107)' }}
              >
                Rule
              </a>
              <a
                href="/mllm"
                className="rounded-full border bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-[rgba(95,2,107,0.06)]"
                style={{ borderColor: 'rgb(95, 2, 107)' }}
              >
                MLLM
              </a>
              <a
                href="/gaasd/"
                className="rounded-full border bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-[rgba(95,2,107,0.06)]"
                style={{ borderColor: 'rgb(95, 2, 107)' }}
              >
                GAASD
              </a>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl px-6 pb-14 pt-14">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs text-zinc-700 backdrop-blur"
                style={{ borderColor: 'rgba(95, 2, 107, 0.28)' }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: 'rgb(95, 2, 107)' }} />
                Evidence-driven • Closed-loop • Autonomous Coding
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
                面向智能驾驶研发的
                <span className="block" style={{ color: 'rgb(95, 2, 107)' }}>
                  规则/多模态/工程化 一体化平台
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-600">
                AI-CBDES-Rule 将“代码管理与检索（Rule）”与“多模态工作台（MLLM）”以及“工程化 IDE（GAASD）”打通，构建从需求到代码到验证与发布的闭环流程。
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/offline/rag"
                  className="rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg"
                  style={{ background: 'rgb(95, 2, 107)', boxShadow: '0 14px 40px rgba(95, 2, 107, 0.22)' }}
                >
                  进入 Rule
                </a>
                <a
                  href="/mllm"
                  className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-[rgba(95,2,107,0.06)]"
                  style={{ borderColor: 'rgba(95, 2, 107, 0.55)' }}
                >
                  打开 MLLM
                </a>
                <a
                  href="/gaasd/"
                  className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-[rgba(95,2,107,0.06)]"
                  style={{ borderColor: 'rgba(95, 2, 107, 0.55)' }}
                >
                  启动 GAASD
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="grid gap-4">
                <EntryCard
                  title="Rule"
                  description="代码管理与索引：扫描 cpp/h/python，按函数切分、命名、归档，并写入向量索引，支持相似度检索与模块浏览。"
                  href="/offline/rag"
                  icon={<Network className="h-6 w-6" />}
                  accent="rgba(95,2,107,0.08)"
                />
                <EntryCard
                  title="MLLM"
                  description="多模态工作台：项目中心、工作流、提示词、模型、评测与部署一站式协作，面向投屏与演示优化。"
                  href="/mllm"
                  icon={<BrainCircuit className="h-6 w-6" />}
                  accent="rgba(95,2,107,0.08)"
                />
                <EntryCard
                  title="GAASD"
                  description="工程化 IDE：画布式工作区、可调整面板与操作日志，为后续代码生成/编译/调测流水线提供统一承载。"
                  href="/gaasd/"
                  icon={<Workflow className="h-6 w-6" />}
                  accent="rgba(95,2,107,0.08)"
                />
              </div>
            </div>
          </div>

          <div className="mt-14 border-t pt-6 text-xs text-zinc-500" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>© {new Date().getFullYear()} AI-CBDES-Rule</div>
              <div className="flex items-center gap-3">
                <a className="hover:text-zinc-700" href="/api/health">
                  API Health
                </a>
                <a className="hover:text-zinc-700" href="/py/health">
                  PY Health
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

