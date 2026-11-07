'use client'

import React, { useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardIdentity } from '../types/dashboardIdentity'
import type { AppRole } from '../types/roles'
import { isAdminRole } from '../types/roles'

import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HelpCircle,
  Layers,
  Layers3,
  LayoutDashboard,
  MessageSquareQuote,
  Newspaper,
  Settings,
  ShoppingBag,
  Users,
  Users2,
  Video,
} from 'lucide-react'
import AdminPricingPage from './views/admin/AdminPricingPage'
// Shared Views
import GlobalScheduleView from './views/GlobalScheduleView'
import ClassRecordingsManager from './views/ClassRecordingsManager'

// Student Views
import StudentCoursesView from './views/student/StudentCoursesView'
import ExamPage from './views/student/StudentExam'
import StudentGradesView from './views/student/StudentGradesView'
import SharedSupportView from './views/student/SharedSupportView'
import StudentSettingsView from './views/student/StudentSettingsView'
import StudentHomeView from './views/student/StudentHomeView'

// Tutor Views
import TutorHomeView from './views/tutor/TutorHomeView'
import TutorStudentsView from './views/tutor/TutorStudentsView'
import TutorCourseAssignmentView from './views/tutor/TutorCourseAssignmentView'

// Admin Views
import AdminHomeView from './views/admin/AdminHomeView'
import AdminUsersView from './views/admin/AdminUsersView'
import AdminCoursesView from './views/admin/AdminCoursesView'
// import AdminAnalyticsView from "./views/admin/AdminAnalyticsView";
import LiveClassMonitor from './views/admin/LiveClassMonitor'
import AdminSettingsView from './views/admin/AdminSettingsView'
// import AdminProgramsPage from "./views/admin/AdminProgramsPage";
import LeadsPage from './views/admin/LeadsPage'
import AdminShopPage from './views/admin/AdminShopPage'
import AdminBlogPage from './views/admin/AdminBlogPage'
import AdminTestimonialsPage from './views/admin/AdminTestimonialsPage'

interface SidebarButtonProps {
  icon: LucideIcon
  label: string
  view: string
  activeView: string
  setActiveView: (view: string) => void
  isCollapsed: boolean
}

interface SidebarGroupProps {
  title: string
  children: ReactNode
  isCollapsed: boolean
}

function SidebarButton({
  icon: Icon,
  label,
  view,
  activeView,
  setActiveView,
  isCollapsed,
}: SidebarButtonProps) {
  const isActive = activeView === view

  return (
    <button
      type="button"
      onClick={() => setActiveView(view)}
      title={isCollapsed ? label : ''}
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

function SidebarGroup({ title, children, isCollapsed }: SidebarGroupProps) {
  return (
    <div>
      {!isCollapsed && (
        <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-wider text-gray-400">
          {title}
        </p>
      )}

      <div className="space-y-1">{children}</div>
    </div>
  )
}

interface DashboardLayoutProps {
  role: AppRole
  user: DashboardIdentity | null
  children?: ReactNode
}

export default function DashboardLayout({
  role,
  user,
  children,
}: DashboardLayoutProps) {
  const [activeView, setActiveView] = useState('dashboard')

  const [isCollapsed, setIsCollapsed] = useState(false)

  const isAdmin = Boolean(isAdminRole(role))

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 font-sans text-white">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />

        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Signing out...
        </p>
      </div>
    )
  }

  function renderMainContent() {
    // Shared support
    if (activeView === 'support') {
      return <SharedSupportView user={user} />
    }

    // Role-specific settings
    if (activeView === 'settings') {
      if (isAdmin) {
        return <AdminSettingsView userId={user.id} role={role} />
      }

      return <StudentSettingsView user={user} />
    }

    // Shared recordings manager
    if (activeView === 'recordings') {
      return <ClassRecordingsManager />
    }

    // Student views
    if (role === 'student') {
      switch (activeView) {
        case 'courses':
          return (
            <StudentCoursesView
              userId={user.id}
              courseId={user.assigned_course_id}
            />
          )

        case 'exams':
          return <ExamPage user={user} />

        case 'schedule':
          return <GlobalScheduleView />

        case 'grades':
          return <StudentGradesView userId={user.id} />

        case 'dashboard':
        default:
          return <StudentHomeView userId={user.id} />
      }
    }

    // Tutor views
    if (role === 'tutor') {
      switch (activeView) {
        case 'students':
          return <TutorStudentsView userId={user.id} />

        case 'schedule':
          return <GlobalScheduleView />

        case 'course-assignment':
          return <TutorCourseAssignmentView userId={user.id} />

        case 'dashboard':
        default:
          return (
            <TutorHomeView
              userId={user.id}
              courseId={user.assigned_course_id}
              user={user}
            />
          )
      }
    }

    // Admin views
    if (isAdmin) {
      switch (activeView) {
        case 'users':
          return <AdminUsersView userId={user.id} role={role} />

        // case "programs":
        //   return <AdminProgramsPage />;

        case 'Leads':
          return <LeadsPage />

        case 'courses-hub':
          return <AdminCoursesView userId={user.id} role={role} />

        // case "analytics":
        //   return (
        //     <AdminAnalyticsView
        //       userId={user.id}
        //       role={role}
        //     />
        //   );
        case 'Live Class Monitor':
          return <LiveClassMonitor />

        case 'global-schedule':
          return <GlobalScheduleView />

        case 'shop':
          return <AdminShopPage />

        case 'blog':
          return <AdminBlogPage userId={user.id} role={role} />

        case 'testimonials':
          return <AdminTestimonialsPage userId={user.id} role={role} />
        case 'pricing':
          return <AdminPricingPage userId={user.id} role={role} />
        case 'dashboard':
        default:
          return <AdminHomeView userId={user.id} role={role} />
      }
    }

    return <div className="p-6">{children}</div>
  }

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
          className="absolute -right-3 top-7 z-10 rounded-full bg-purple-600 p-1 text-white shadow-md transition hover:bg-purple-700"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sidebar heading */}
        {!isCollapsed && (
          <div className="mb-6 overflow-hidden px-2">
            <h1 className="whitespace-nowrap bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-xl font-black tracking-tight text-transparent">
              Tech Talk Hub
            </h1>

            <div className="mt-0.5 whitespace-nowrap text-xs font-medium capitalize text-gray-400">
              {role?.replaceAll('_', ' ')} Portal 🚀
            </div>
          </div>
        )}

        {/* Sidebar navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden">
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

              <SidebarButton
                icon={BookMarked}
                label="Exams"
                view="exams"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Award}
                label="Grades"
                view="grades"
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
                icon={Users}
                label="My Students"
                view="students"
                activeView={activeView}
                setActiveView={setActiveView}
                isCollapsed={isCollapsed}
              />

              <SidebarButton
                icon={Calendar}
                label="Master Schedule"
                view="schedule"
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
                icon={Activity}
                label="Live Class Monitor"
                view="Live Class Monitor"
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
            {/* <SidebarButton
              icon={HelpCircle}
              label="Help & Support"
              view="support"
              activeView={activeView}
              setActiveView={setActiveView}
              isCollapsed={isCollapsed}
            />  */}

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
      <main className="min-w-0 flex-1 overflow-y-auto">
        {renderMainContent()}
      </main>
    </div>
  )
}
