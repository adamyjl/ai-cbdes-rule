import { useEffect, useMemo, useState } from 'react'
import { Tag } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'

type NavItem = { to: string; label: string }

const offline: NavItem[] = [
  { to: '/offline/rag', label: '代码管理' },
  { to: '/offline/archive', label: '档案管理' },
  { to: '/offline/sft', label: '大模型管理' }
]

const online: NavItem[] = [
  { to: '/online/task', label: '结构化输入' },
  { to: '/visual-builder', label: '图形化输入' },
  { to: '/online/routing', label: '路由消歧' },
  { to: '/online/orchestration', label: '函数编排与生成' },
  { to: '/online/testing', label: '检测测试门禁' },
  { to: '/online/release', label: '任务结束发布' }
]

export function TopBar() {
  const [apiOk, setApiOk] = useState<'unknown' | 'ok' | 'fail'>('unknown')
  const location = useLocation()
  const navigate = useNavigate()

  const allTabs = useMemo(() => [...offline, ...online], [])

  const activeTo = useMemo(() => {
    const p = location.pathname
    const exact = allTabs.find((t) => t.to === p)
    if (exact) return exact.to
    const byPrefix = allTabs
      .filter((t) => t.to !== '/' && p.startsWith(t.to))
      .sort((a, b) => b.to.length - a.to.length)[0]
    return byPrefix?.to || allTabs[0]?.to
  }, [allTabs, location.pathname])

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then((r) => r.json())
      .then(() => {
        if (!cancelled) setApiOk('ok')
      })
      .catch(() => {
        if (!cancelled) setApiOk('fail')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">AI-CBDES-Rule</div>
          <div className="mt-1 text-xs text-white/80">智能闭环智驾编码平台</div>
        </div>

        <div className="flex items-center gap-3">
          <Tag color={apiOk === 'ok' ? 'green' : apiOk === 'fail' ? 'red' : 'default'}>
            API: {apiOk}
          </Tag>
        </div>
      </div>

      <div className="border-b border-black/10 bg-white">
        <div className="px-6 py-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {offline.map((t) => {
              const active = t.to === activeTo
              return (
                <button
                  key={t.to}
                  onClick={() => navigate(t.to)}
                  className={
                    'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ' +
                    (active
                      ? 'bg-[rgba(95,2,107,0.08)] text-[rgb(95,2,107)]'
                      : 'bg-white text-zinc-700 hover:bg-[rgba(95,2,107,0.06)]')
                  }
                  style={{ borderColor: 'rgb(95, 2, 107)' }}
                >
                  {t.label}
                </button>
              )
            })}

            <div className="h-6 w-px bg-black/10" />

            {online.map((t) => {
              const active = t.to === activeTo
              return (
                <button
                  key={t.to}
                  onClick={() => navigate(t.to)}
                  className={
                    'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ' +
                    (active
                      ? 'bg-[rgba(95,2,107,0.08)] text-[rgb(95,2,107)]'
                      : 'bg-white text-zinc-700 hover:bg-[rgba(95,2,107,0.06)]')
                  }
                  style={{ borderColor: 'rgb(95, 2, 107)' }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
