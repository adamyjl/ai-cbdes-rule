import type { MenuProps } from 'antd'
import { Menu } from 'antd'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
}

const offline: NavItem[] = [
  { to: '/offline/rag', label: 'RAG 管理' },
  { to: '/offline/archive', label: '档案管理' },
  { to: '/offline/sft', label: '大模型管理' }
]

const online: NavItem[] = [
  { to: '/online/graph-builder', label: '图形化搭建' },
  { to: '/online/task', label: '任务输入' },
  { to: '/online/routing', label: '路由消歧' },
  { to: '/online/orchestration', label: '函数编排与生成' },
  { to: '/online/testing', label: '检测测试门禁' },
  { to: '/online/release', label: '任务结束发布' }
]

export function SidebarNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const items = useMemo<MenuProps['items']>(() => {
    const sectionToItems = (list: NavItem[]): MenuProps['items'] =>
      list.map((it) => ({
        key: it.to,
        label: it.label
      }))

    return [
      {
        type: 'group',
        label: '离线能力演进线',
        children: sectionToItems(offline)
      },
      {
        type: 'group',
        label: '在线代码生产线',
        children: sectionToItems(online)
      }
    ]
  }, [])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="px-1">
        <div className="text-sm font-semibold text-zinc-50">AI-CBDES-Rule</div>
        <div className="mt-1 text-xs text-zinc-400">智能闭环智驾编码平台</div>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        items={items}
        selectedKeys={[location.pathname]}
        onClick={(e) => navigate(e.key)}
        style={{ background: 'transparent', borderInlineEnd: 'none' }}
      />
    </div>
  )
}
