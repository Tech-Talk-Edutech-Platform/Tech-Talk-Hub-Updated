import { useState, type ReactNode } from 'react'
import { isAdminRole, roleLabel, type AppRole } from '../types/roles'
import { SALES_NAV } from '../features/sales/navigation'
import { SidebarButton, SidebarGroup } from './Sidebar'
import {
  BookOpen,
  Activity,
  Calendar,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GraduationCap,
  Layers,
  Layers3,
  LayoutDashboard,
  MessageSquareQuote,
  Newspaper,
  Presentation,
  Settings,
  ShoppingBag,
  TrendingUp,
  Users,
  Users2,
  Video,
} from 'lucide-react'

export function DashboardFrame({
  role,
  activeView = 'dashboard',
  onNavigate,
  children,
}: {
  role: AppRole
  activeView?: string
  onNavigate?: (view: string) => void
  children: ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isAdmin = isAdminRole(role)
  const pending = !onNavigate
  const setActiveView = onNavigate ?? (() => {})
  return (
    <div className="flex min-h-screen bg-dashboard-canvas text-gray-900 transition-colors duration-300 dark:bg-dashboard-night dark:text-white">
      {/* Sidebar */}
      <aside
        className={`relative flex min-h-screen shrink-0 flex-col border-r border-gray-100 bg-white p-5 transition-all duration-300 dark:border-white/10 dark:bg-white/5 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Collapse button */}
        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          className="absolute top-7 -right-3 z-10 rounded-full bg-purple-600 p-1 text-white shadow-md transition hover:bg-purple-700"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sidebar heading */}
        {!isCollapsed && (
          <div className="mb-6 overflow-hidden px-2">
            <h1 className="bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-xl font-black tracking-tight whitespace-nowrap text-transparent">
              Tech Talk Hub
            </h1>

            <div className="mt-0.5 text-xs font-medium whitespace-nowrap text-gray-400 capitalize">
              {roleLabel(role)} Portal 🚀
            </div>
          </div>
        )}

        {/* Sidebar navigation */}
        <nav
          aria-label="Dashboard"
          aria-busy={pending || undefined}
          className="flex-1 space-y-6 overflow-x-hidden overflow-y-auto"
        >
          {/* Overview */}
          <SidebarGroup title="Overview" isCollapsed={isCollapsed}>
            <SidebarButton
              icon={LayoutDashboard}
              label="Dashboard"
              view="dashboard"
              activeView={activeView}
              setActiveView={setActiveView}
              isCollapsed={isCollapsed}
            />
          </SidebarGroup>

          {/* Student navigation */}
          {role === 'student' && (
            <SidebarGroup title="Learning" isCollapsed={isCollapsed}>
              <SidebarButton
                icon={Presentation}
                label="My Classroom"
                view="classroom"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
              <SidebarButton
                icon={BookOpen}
                label="My Courses"
                view="courses"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
              <SidebarButton
                icon={Calendar}
                label="Schedule"
                view="schedule"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
            </SidebarGroup>
          )}

          {/* Tutor navigation */}
          {role === 'tutor' && (
            <SidebarGroup title="Teaching" isCollapsed={isCollapsed}>
              <SidebarButton
                icon={Presentation}
                label="My Classrooms"
                view="classrooms"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Users}
                label="My Students"
                view="students"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Calendar}
                label="My Schedule"
                view="schedule"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={CalendarHeart}
                label="Trial Bookings"
                view="trials"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Layers}
                label="Course Assignment"
                view="course-assignment"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Video}
                label="Class Recordings"
                view="recordings"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
            </SidebarGroup>
          )}

          {role === 'tutor' && (
            <SidebarGroup title="Growth" isCollapsed={isCollapsed}>
              <SidebarButton
                icon={GraduationCap}
                label="Training"
                view="training"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
            </SidebarGroup>
          )}

          {/* Marketer (sales team) navigation */}
          {role === 'marketer' && (
            <SidebarGroup title="Sales" isCollapsed={isCollapsed}>
              {SALES_NAV.map((item) => (
                <SidebarButton
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  view={item.id}
                  activeView={activeView}
                  setActiveView={setActiveView}
                  isCollapsed={isCollapsed}
                />
              ))}
            </SidebarGroup>
          )}

          {/* Sales oversight */}
          {isAdmin && (
            <SidebarGroup title="Sales" isCollapsed={isCollapsed}>
              <SidebarButton
                icon={TrendingUp}
                label="Sales & Trials"
                view="sales"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
            </SidebarGroup>
          )}

          {/* E-commerce */}
          {isAdmin && (
            <SidebarGroup title="E-Commerce" isCollapsed={isCollapsed}>
              <SidebarButton
                icon={ShoppingBag}
                label="Shop Management"
                view="shop"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
            </SidebarGroup>
          )}

          {/* Website */}
          {isAdmin && (
            <SidebarGroup title="Website" isCollapsed={isCollapsed}>
              <SidebarButton
                icon={Newspaper}
                label="Blog Management"
                view="blog"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
              <SidebarButton
                icon={CreditCard}
                label="Pricing Plans"
                view="pricing"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
              <SidebarButton
                icon={MessageSquareQuote}
                label="Testimonials"
                view="testimonials"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
            </SidebarGroup>
          )}

          {/* Admin management */}
          {isAdmin && (
            <SidebarGroup title="Management" isCollapsed={isCollapsed}>
              <SidebarButton
                icon={Users2}
                label="Users & Staff"
                view="users"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Layers3}
                label="Leads"
                view="Leads"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={BookOpen}
                label="Courses Hub"
                view="courses-hub"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Presentation}
                label="Classroom"
                view="classroom"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Activity}
                label="Live Class Monitor"
                view="Live Class Monitor"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={GraduationCap}
                label="Tutor Training"
                view="training"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Calendar}
                label="Global Schedule"
                view="global-schedule"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Video}
                label="Recordings Manager"
                view="recordings"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />
            </SidebarGroup>
          )}

          {/* System */}
          <SidebarGroup title="System" isCollapsed={isCollapsed}>
            <SidebarButton
              icon={Settings}
              label="Settings"
              view="settings"
              activeView={activeView}
              setActiveView={setActiveView}
              isCollapsed={isCollapsed}
            />
          </SidebarGroup>
        </nav>
      </aside>

      {/* Dynamic content */}
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
