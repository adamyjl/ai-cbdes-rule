import type { ComponentType } from 'react'
import { clsx } from 'clsx'

export type VlmTab = {
  id: string
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>
}

export function VlmTabToolbar(props: {
  tabs: VlmTab[]
  activeId: string
  onChange: (id: string) => void
}) {
  return (
    <div className="h-16 bg-[#F3E5F5] border-b border-[#E1BEE7] flex items-center px-4 shrink-0 select-none">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {props.tabs.map((tab) => {
          const active = tab.id === props.activeId
          return (
            <button
              key={tab.id}
              onClick={() => props.onChange(tab.id)}
              className={clsx(
                'flex flex-col items-center justify-center px-3 py-1 cursor-pointer rounded transition-colors group min-w-[86px]',
                active ? 'bg-purple-100' : 'hover:bg-purple-100'
              )}
            >
              <tab.icon
                className={clsx(
                  'w-5 h-5 mb-1 group-hover:scale-110 transition-transform',
                  active ? 'text-[#4A148C]' : 'text-[#6A1B9A]'
                )}
                strokeWidth={1.5}
              />
              <span className={clsx('text-[10px] font-medium whitespace-nowrap', active ? 'text-[#4A148C]' : 'text-[#4A148C]')}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
