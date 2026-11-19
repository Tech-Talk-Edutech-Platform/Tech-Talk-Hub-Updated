'use client'

import React, { useState } from 'react'
import type { ReactNode } from 'react'
import type { DashboardIdentity } from '../types/dashboardIdentity'
import type { AppRole } from '../types/roles'
import { isAdminRole } from '../types/roles'

import { DashboardFrame } from './DashboardFrame'
import AdminPricingPage from './views/admin/AdminPricingPage'
// Shared Views
import GlobalScheduleView from './views/GlobalScheduleView'
import ClassRecordingsManager from './views/ClassRecordingsManager'

// Student Views
import StudentCoursesView from './views/student/StudentCoursesView'
import StudentSettingsView from './views/student/StudentSettingsView'
import StudentHomeView from './views/student/StudentHomeView'
import StudentClassroomView from './views/student/StudentClassroomView'

// Tutor Views
import TutorHomeView from './views/tutor/TutorHomeView'
import TutorStudentsView from './views/tutor/TutorStudentsView'
import TutorCourseAssignmentView from './views/tutor/TutorCourseAssignmentView'
import TutorClassroomsView from './views/tutor/TutorClassroomsView'
import TutorTrialBookingsView from './views/tutor/TutorTrialBookingsView'
import TutorTrainingView from './views/tutor/TutorTrainingView'

// Sales & trials (src/features/sales)
import {
  AdminSalesView,
  SalesPortalView,
} from '../features/sales/SalesDashboardViews'
import { isSalesView } from '../features/sales/navigation'

// Admin Views
import AdminHomeView from './views/admin/AdminHomeView'
import AdminUsersView from './views/admin/AdminUsersView'
import AdminCoursesView from './views/admin/AdminCoursesView'
import LiveClassMonitor from './views/admin/LiveClassMonitor'
import { notifyTutor } from '../Utils/adminActions'
import ClassroomManager from './views/admin/classroom/ClassroomManager'
import AdminSettingsView from './views/admin/AdminSettingsView'
// import AdminProgramsPage from "./views/admin/AdminProgramsPage";
import LeadsPage from './views/admin/LeadsPage'
import AdminShopPage from './views/admin/AdminShopPage'
import AdminBlogPage from './views/admin/AdminBlogPage'
import AdminTestimonialsPage from './views/admin/AdminTestimonialsPage'
import AdminTrainingView from './views/admin/AdminTrainingView'

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

  const isAdmin = isAdminRole(role)

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 font-sans text-white">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />

        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
          Signing out...
        </p>
      </div>
    )
  }

  // `renderMainContent` is hoisted, so it can't see the null check above.
  const currentUser = user

  function renderMainContent() {
    // Role-specific settings
    if (activeView === 'settings') {
      if (isAdmin) {
        return <AdminSettingsView user={currentUser} />
      }

      return <StudentSettingsView user={currentUser} />
    }

    // Shared recordings manager
    if (activeView === 'recordings') {
      return <ClassRecordingsManager userId={currentUser.id} role={role} />
    }

    // Student views
    if (role === 'student') {
      switch (activeView) {
        case 'courses':
          return <StudentCoursesView userId={currentUser.id} />

        case 'schedule':
          return <GlobalScheduleView />

        case 'classroom':
          return <StudentClassroomView userId={currentUser.id} />

        case 'dashboard':
        default:
          return (
            <StudentHomeView
              userId={currentUser.id}
              onNavigate={setActiveView}
            />
          )
      }
    }

    // Tutor views
    if (role === 'tutor') {
      switch (activeView) {
        case 'students':
          return <TutorStudentsView userId={currentUser.id} />

        case 'schedule':
          return <GlobalScheduleView />

        case 'course-assignment':
          return <TutorCourseAssignmentView userId={currentUser.id} />

        case 'classrooms':
          return <TutorClassroomsView userId={currentUser.id} />

        case 'trials':
          return <TutorTrialBookingsView userId={currentUser.id} />

        case 'training':
          return <TutorTrainingView userId={currentUser.id} />

        case 'dashboard':
        default:
          return (
            <TutorHomeView
              userId={currentUser.id}
              user={currentUser}
              onNavigate={setActiveView}
            />
          )
      }
    }

    // Marketer (sales team) views
    if (role === 'marketer') {
      return (
        <SalesPortalView
          userId={currentUser.id}
          name={currentUser.full_name || ''}
          view={isSalesView(activeView) ? activeView : 'dashboard'}
          onNavigate={setActiveView}
        />
      )
    }

    // Admin views
    if (isAdmin) {
      switch (activeView) {
        case 'users':
          return <AdminUsersView />

        // case "programs":
        //   return <AdminProgramsPage />;

        case 'Leads':
          return <LeadsPage />

        case 'courses-hub':
          return <AdminCoursesView />

        // case "analytics":
        //   return (
        //     <AdminAnalyticsView
        //       userId={user.id}
        //       role={role}
        //     />
        //   );
        case 'Live Class Monitor':
          return <LiveClassMonitor notifyTutor={notifyTutor} />

        case 'classroom':
          return <ClassroomManager />

        case 'global-schedule':
          return <GlobalScheduleView />

        case 'shop':
          return <AdminShopPage />

        case 'blog':
          return <AdminBlogPage userId={currentUser.id} role={role} />

        case 'sales':
          return <AdminSalesView />

        case 'testimonials':
          return <AdminTestimonialsPage />
        case 'training':
          return <AdminTrainingView />
        case 'pricing':
          return <AdminPricingPage />
        case 'dashboard':
        default:
          return (
            <AdminHomeView userId={currentUser.id} onNavigate={setActiveView} />
          )
      }
    }

    return <div className="p-6">{children}</div>
  }

  return (
    <DashboardFrame
      role={role}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderMainContent()}
    </DashboardFrame>
  )
}
