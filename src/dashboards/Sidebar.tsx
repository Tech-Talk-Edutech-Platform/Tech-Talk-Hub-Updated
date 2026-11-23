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
  badge = 0,
}: {
  icon: LucideIcon
  label: string
  view: string
  activeView: string
  setActiveView: (view: string) => void
  isCollapsed: boolean
  /** A count that needs attention, e.g. open class alerts. */
  badge?: number
}) {
  const isActive = activeView === view
  const badgeText = badge > 99 ? '99+' : String(badge)

  return (
    <button
      type="button"
      onClick={() => setActiveView(view)}
      title={isCollapsed ? (badge > 0 ? `${label} (${badgeText})` : label) : ''}
      aria-current={isActive ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
      }`}
    >
      <span className="relative shrink-0">
        <Icon size={18} />
        {isCollapsed && badge > 0 && (
          <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-pink-600 ring-2 ring-white dark:ring-slate-900" />
        )}
      </span>

      {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
      {!isCollapsed && badge > 0 && (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] leading-4 font-black tabular-nums ${
            isActive ? 'bg-white text-purple-700' : 'bg-pink-600 text-white'
          }`}
        >
          {badgeText}
          <span className="sr-only"> open</span>
        </span>
      )}
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
