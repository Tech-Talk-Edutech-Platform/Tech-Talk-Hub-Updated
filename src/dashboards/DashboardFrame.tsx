import { useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
import { roleLabel, type AppRole } from '../types/roles'
import { dashboardNavigation, dashboardViewUrl } from './navigation'

function RoleNavigation({
  role,
  activeView,
  pending,
  compact = false,
  onNavigate,
}: {
  role: AppRole
  activeView: string
  pending: boolean
  compact?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav
      aria-label="Dashboard"
      aria-busy={pending || undefined}
      className="space-y-5"
    >
      {dashboardNavigation(role).map((group) => (
        <section key={group.label} aria-label={group.label}>
          {!compact && (
            <p className="mb-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {group.label}
            </p>
          )}
          {group.items.map(({ id, label: name, icon: Icon }) => {
            const active = activeView === id
            const className = `flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-purple-500 ${compact ? 'justify-center' : ''} ${active ? 'bg-purple-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/10'}`
            const content = (
              <>
                <Icon size={18} aria-hidden="true" className="shrink-0" />
                {!compact && name}
              </>
            )
            return pending ? (
              <span
                key={id}
                aria-current={active ? 'page' : undefined}
                className={className}
                title={compact ? name : undefined}
              >
                {content}
              </span>
            ) : (
              <Link
                key={id}
                to={dashboardViewUrl(role, id)}
                aria-current={active ? 'page' : undefined}
                aria-label={compact ? name : undefined}
                title={compact ? name : undefined}
                onClick={onNavigate}
                className={className}
              >
                {content}
              </Link>
            )
          })}
        </section>
      ))}
    </nav>
  )
}

export function DashboardFrame({
  role,
  activeView = 'dashboard',
  pending = true,
  children,
}: {
  role: AppRole
  activeView?: string
  pending?: boolean
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const closeMenu = () => {
    setMobileOpen(false)
    menuTrigger.current?.focus()
  }
  const label = `${roleLabel(role)} Portal`

  return (
    <div className="min-h-dvh bg-dashboard-canvas text-gray-900 lg:flex dark:bg-dashboard-night dark:text-white">
      <aside
        className={`hidden shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start dark:border-white/10 dark:bg-white/5 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="mb-5 flex min-h-11 items-center justify-between gap-2">
          {!collapsed && <p className="text-sm font-bold">{label}</p>}
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((value) => !value)}
            className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-purple-500 dark:hover:bg-white/10"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <RoleNavigation
          role={role}
          activeView={activeView}
          pending={pending}
          compact={collapsed}
        />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex min-h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 lg:hidden dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            ref={menuTrigger}
            aria-label="Open dashboard navigation"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
            disabled={pending}
            onClick={() => setMobileOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-xl focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <p className="truncate text-sm font-bold">{label}</p>
        </header>
        {mobileOpen && (
          <Modal
            title={label}
            size="compact"
            closeLabel="Close dashboard navigation"
            onClose={closeMenu}
          >
            <RoleNavigation
              role={role}
              activeView={activeView}
              pending={pending}
              onNavigate={closeMenu}
            />
          </Modal>
        )}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
