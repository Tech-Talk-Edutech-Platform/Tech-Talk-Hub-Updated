import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, GraduationCap, ShieldCheck } from 'lucide-react'

import logo from '../../assets/images/logo.png'
import { SidebarButton, SidebarGroup } from '../../dashboards/Sidebar'
import { usePageMeta } from '../../hooks/usePageMeta'
import { DEMO_MENTORS, DEMO_SALES_REPS } from './demoData'
import { DemoSalesDataProvider } from './DemoSalesDataProvider'
import {
  isSalesView,
  SALES_DASHBOARD,
  SALES_NAV,
  type SalesView,
} from './navigation'
import { MentorCalendars, SalesAdminOverview } from './SalesAdminOverview'
import { SalesRepDashboard } from './SalesRepDashboard'
import { inlineSelectClass } from './styles'
import { DemoBanner, TabBar } from './ui'

type Perspective = 'sales' | 'mentor' | 'admin'

const PERSPECTIVES = [
  { id: 'sales', label: 'Sales rep', icon: Briefcase },
  { id: 'mentor', label: 'Mentor', icon: GraduationCap },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
] as const satisfies readonly {
  id: Perspective
  label: string
  icon: typeof Briefcase
}[]

const SALES_PAGES = [SALES_DASHBOARD, ...SALES_NAV]

/**
 * `/preview/sales` (public, no sign-in): the sales dashboard on demo data,
 * seen as a sales rep (the `marketer` role, with the same sidebar as their
 * dashboard), a mentor or an admin. All three share one set of demo data, so
 * a trial booked as a rep shows up on the mentor's calendar and in the admin
 * totals.
 */
export default function SalesPreviewPage() {
  usePageMeta({
    title: 'Sales dashboard preview',
    description:
      'A preview of the Tech Talk Hub sales dashboard on made-up demo data.',
    path: '/preview/sales',
    noindex: true,
  })
  const [perspective, setPerspective] = useState<Perspective>('sales')
  const [salesView, setSalesView] = useState<SalesView>('dashboard')
  const [repId, setRepId] = useState(DEMO_SALES_REPS[0]?.id ?? '')
  const [mentorId, setMentorId] = useState(DEMO_MENTORS[0]?.id ?? '')
  const rep = DEMO_SALES_REPS.find((candidate) => candidate.id === repId)
  const mentor = DEMO_MENTORS.find((candidate) => candidate.id === mentorId)

  const navigate = (view: string) => {
    if (isSalesView(view)) setSalesView(view)
  }

  const repPicker = (
    <label className="flex items-center gap-2 text-xs font-bold whitespace-nowrap text-slate-500">
      Preview as
      <select
        value={repId}
        onChange={(event) => setRepId(event.target.value)}
        className={inlineSelectClass}
      >
        {DEMO_SALES_REPS.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <DemoSalesDataProvider>
      <div className="flex h-dvh flex-col bg-dashboard-canvas text-slate-900 dark:bg-dashboard-night dark:text-white">
        <header className="shrink-0 border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Tech Talk Hub home"
              >
                <ArrowLeft size={18} />
              </Link>
              <img
                src={logo}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <div>
                <p className="text-sm font-black">Sales dashboard</p>
                <p className="text-xs text-slate-500">Preview</p>
              </div>
            </div>
            <fieldset className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
              <legend className="sr-only">See the dashboard as</legend>
              {PERSPECTIVES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={perspective === id}
                  onClick={() => setPerspective(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold sm:text-sm ${
                    perspective === id
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={15} aria-hidden /> {label}
                </button>
              ))}
            </fieldset>
          </div>
        </header>

        {perspective === 'sales' && rep && (
          <div className="flex min-h-0 flex-1">
            {/* The marketer's dashboard sidebar, as in DashboardLayout. */}
            <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white p-5 md:flex dark:border-white/10 dark:bg-white/5">
              <div className="mb-6 px-2">
                <p className="bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-xl font-black tracking-tight whitespace-nowrap text-transparent">
                  Tech Talk Hub
                </p>
                <p className="mt-0.5 text-xs font-medium whitespace-nowrap text-gray-400">
                  Marketer Portal 🚀
                </p>
              </div>
              <nav
                aria-label="Sales dashboard"
                className="flex-1 space-y-6 overflow-y-auto"
              >
                <SidebarGroup title="Overview" isCollapsed={false}>
                  <SidebarButton
                    icon={SALES_DASHBOARD.icon}
                    label={SALES_DASHBOARD.label}
                    view={SALES_DASHBOARD.id}
                    activeView={salesView}
                    setActiveView={navigate}
                    isCollapsed={false}
                  />
                </SidebarGroup>
                <SidebarGroup title="Sales" isCollapsed={false}>
                  {SALES_NAV.map((item) => (
                    <SidebarButton
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      view={item.id}
                      activeView={salesView}
                      setActiveView={navigate}
                      isCollapsed={false}
                    />
                  ))}
                </SidebarGroup>
              </nav>
              <div className="border-t border-gray-100 pt-4 dark:border-white/10">
                {repPicker}
              </div>
            </aside>

            <main className="min-w-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
                {/* Phones get the sidebar's pages as a scrolling bar. */}
                <div className="space-y-3 md:hidden">
                  <TabBar
                    tabs={SALES_PAGES}
                    active={salesView}
                    onChange={setSalesView}
                    label="Sales dashboard"
                  />
                  {repPicker}
                </div>
                <SalesRepDashboard
                  key={rep.id}
                  rep={rep}
                  view={salesView}
                  onNavigate={setSalesView}
                  banner={<DemoBanner />}
                />
              </div>
            </main>
          </div>
        )}

        {perspective !== 'sales' && (
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
              <DemoBanner />

              {perspective === 'mentor' && mentor && (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-black tracking-tight">
                        {mentor.name}’s trials
                      </h1>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        What a mentor sees in their dashboard under “Trial
                        bookings”: every trial assigned to them, with its
                        meeting link.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold whitespace-nowrap text-slate-500">
                      Preview as
                      <select
                        value={mentorId}
                        onChange={(event) => setMentorId(event.target.value)}
                        className={inlineSelectClass}
                      >
                        {DEMO_MENTORS.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <MentorCalendars
                    key={mentor.id}
                    initialMentorId={mentor.id}
                  />
                </>
              )}

              {perspective === 'admin' && (
                <>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight">
                      Sales & trials
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Every rep, parent, mentor, booking and message in one
                      place.
                    </p>
                  </div>
                  <SalesAdminOverview />
                </>
              )}
            </div>
          </main>
        )}
      </div>
    </DemoSalesDataProvider>
  )
}
