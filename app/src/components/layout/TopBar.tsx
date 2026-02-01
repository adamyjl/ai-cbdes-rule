import { useEffect, useState } from 'react'
import { Tag } from 'antd'

export function TopBar() {
  const [apiOk, setApiOk] = useState<'unknown' | 'ok' | 'fail'>('unknown')

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
    <div className="flex items-center justify-between px-6 py-4">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-zinc-50">AI Core 控制台</div>
        <div className="mt-1 text-xs text-zinc-400">离线能力演进线 + 在线生产闭环</div>
      </div>

      <div className="flex items-center gap-3">
        <Tag color={apiOk === 'ok' ? 'green' : apiOk === 'fail' ? 'red' : 'default'}>
          API: {apiOk}
        </Tag>
      </div>
    </div>
  )
}
