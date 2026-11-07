import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type DashboardNavigationItem = {
  id: string
  label: string
  icon: LucideIcon
}

export type DashboardNavigationGroup = {
  label: string
  items: DashboardNavigationItem[]
}

type DashboardShellProps = {
  portalLabel: string
  groups: DashboardNavigationGroup[]
  activeItem: string
  onNavigate: (itemId: string) => void
  children: ReactNode
}

type NavigationProps = {
  groups: DashboardNavigationGroup[]
  activeItem: string
  collapsed: boolean
  onNavigate: (itemId: string) => void
}

function DashboardNavigation({
  groups,
  activeItem,
  collapsed,
  onNavigate,
}: NavigationProps) {
  return (
    <nav
      aria-label="Dashboard"
      className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden"
    >
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          {!collapsed && (
            <h2 className="mb-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              {group.label}
            </h2>
          )}
          <div className="space-y-1">
            {group.items.map(({ id, label, icon: Icon }) => {
              const active = activeItem === id
              return (
                <button
                  key={id}
                  type="button"
                  title={collapsed ? label : undefined}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onNavigate(id)}
                  className={`focus-visible:ring-dashboard-accent flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 ${
                    active
                      ? 'bg-dashboard-accent text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon size={18} className="shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </nav>
  )
}

export function DashboardShell({
  portalLabel,
  groups,
  activeItem,
  onNavigate,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileMenuButton = useRef<HTMLButtonElement>(null)
  const mobileNavigation = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!mobileOpen) return

      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileOpen(false)
        mobileMenuButton.current?.focus()
        return
      }

      if (event.key === 'Tab') {
        const drawer = mobileNavigation.current
        const focusable = drawer?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable?.length) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    if (mobileOpen) {
      document.addEventListener('keydown', handleKeyDown)
      mobileNavigation.current?.querySelector('button')?.focus()
    }
    return () => {
      if (mobileOpen) document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen])

  function navigate(itemId: string) {
    onNavigate(itemId)
    setMobileOpen(false)
    mobileMenuButton.current?.focus()
  }

  return (
    <div className="flex min-h-dvh bg-dashboard-canvas text-slate-900 dark:bg-dashboard-night dark:text-white">
      <aside
        aria-label={`${portalLabel} navigation`}
        className={`hidden shrink-0 flex-col border-r border-slate-100 bg-white p-4 transition-[width] duration-200 dark:border-white/10 dark:bg-white/5 lg:flex ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="mb-6 flex min-h-12 items-center justify-between gap-2 px-2">
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-lg font-black tracking-tight text-transparent">
                Tech Talk Hub
              </p>
              <p className="truncate text-xs font-medium text-slate-400">
                {portalLabel}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="focus-visible:ring-dashboard-accent grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <DashboardNavigation
          groups={groups}
          activeItem={activeItem}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 items-center gap-3 border-b border-slate-100 bg-white px-4 dark:border-white/10 dark:bg-white/5 lg:hidden">
          <button
            ref={mobileMenuButton}
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={
              mobileOpen
                ? 'Close dashboard navigation'
                : 'Open dashboard navigation'
            }
            aria-expanded={mobileOpen}
            aria-controls="dashboard-mobile-navigation"
            className="focus-visible:ring-dashboard-accent grid size-10 shrink-0 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <p className="min-w-0 truncate text-sm font-bold text-slate-800">
            Tech Talk Hub{' '}
            <span className="font-medium text-slate-500">/ {portalLabel}</span>
          </p>
        </header>

        {mobileOpen && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close dashboard navigation"
            onClick={() => {
              setMobileOpen(false)
              mobileMenuButton.current?.focus()
            }}
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          />
        )}
        <dialog
          ref={mobileNavigation}
          open
          id="dashboard-mobile-navigation"
          aria-label={`${portalLabel} navigation`}
          aria-modal={mobileOpen ? true : undefined}
          aria-hidden={!mobileOpen}
          {...{ inert: !mobileOpen }}
          className={`fixed inset-y-0 left-0 z-40 m-0 flex w-[min(18rem,calc(100vw-3rem))] max-w-none flex-col border-0 border-r border-slate-100 bg-white p-4 shadow-xl transition-transform dark:border-white/10 dark:bg-slate-900 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="mb-6 flex min-h-12 items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <p className="truncate bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-lg font-black tracking-tight text-transparent">
                Tech Talk Hub
              </p>
              <p className="truncate text-xs font-medium text-slate-400">
                {portalLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                mobileMenuButton.current?.focus()
              }}
              aria-label="Close dashboard navigation"
              className="focus-visible:ring-dashboard-accent grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2"
            >
              <X size={18} />
            </button>
          </div>
          <DashboardNavigation
            groups={groups}
            activeItem={activeItem}
            collapsed={false}
            onNavigate={navigate}
          />
        </dialog>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
