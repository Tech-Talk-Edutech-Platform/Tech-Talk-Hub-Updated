import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Sidebar pieces shared by the dashboards and the sales preview. */

export function SidebarButton({
  icon: Icon,
  label,
  view,
  activeView,
  setActiveView,
  isCollapsed,
}: {
  icon: LucideIcon
  label: string
  view: string
  activeView: string
  setActiveView: (view: string) => void
  isCollapsed: boolean
}) {
  const isActive = activeView === view

  return (
    <button
      type="button"
      onClick={() => setActiveView(view)}
      title={isCollapsed ? label : ''}
      aria-current={isActive ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
      }`}
    >
      <Icon size={18} className="shrink-0" />

      {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
    </button>
  )
}

export function SidebarGroup({
  title,
  children,
  isCollapsed,
}: {
  title: string
  children: ReactNode
  isCollapsed: boolean
}) {
  return (
    <div>
      {!isCollapsed && (
        <p className="mb-2 px-4 text-[10px] font-black tracking-wider text-gray-400 uppercase">
          {title}
        </p>
      )}

      <div className="space-y-1">{children}</div>
    </div>
  )
}
