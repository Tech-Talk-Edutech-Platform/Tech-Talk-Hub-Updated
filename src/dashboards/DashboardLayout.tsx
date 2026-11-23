import { lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DashboardFrame } from './DashboardFrame'
import { DashboardViewBoundary } from './DashboardViewBoundary'
import {
  dashboardView,
  dashboardViewUrl,
  type DashboardNavigation,
} from './navigation'
import { Toaster } from 'react-hot-toast'
import type { DashboardIdentity } from '../types/dashboardIdentity'
import { isAdminRole } from '../types/roles'
import { isSalesView } from '../features/sales/navigation'
import { notifyDashboardTutor } from './notifyDashboardTutor'

const AdminPricingPage = lazy(() => import('./views/admin/AdminPricingPage'))
const GlobalScheduleView = lazy(() => import('./views/GlobalScheduleView'))
const ClassRecordingsManager = lazy(
  () => import('./views/ClassRecordingsManager'),
)
const StudentCoursesView = lazy(
  () => import('./views/student/StudentCoursesView'),
)
const StudentSettingsView = lazy(
  () => import('./views/student/StudentSettingsView'),
)
const StudentHomeView = lazy(() => import('./views/student/StudentHomeView'))
const StudentClassroomView = lazy(
  () => import('./views/student/StudentClassroomView'),
)
const TutorHomeView = lazy(() => import('./views/tutor/TutorHomeView'))
const TutorStudentsView = lazy(() => import('./views/tutor/TutorStudentsView'))
const TutorCourseAssignmentView = lazy(
  () => import('./views/tutor/TutorCourseAssignmentView'),
)
const TutorClassroomsView = lazy(
  () => import('./views/tutor/TutorClassroomsView'),
)
const TutorTrialBookingsView = lazy(
  () => import('./views/tutor/TutorTrialBookingsView'),
)
const TutorTrainingView = lazy(() => import('./views/tutor/TutorTrainingView'))
const AdminHomeView = lazy(() => import('./views/admin/AdminHomeView'))
const AdminUsersView = lazy(() => import('./views/admin/AdminUsersView'))
const AdminCoursesView = lazy(() => import('./views/admin/AdminCoursesView'))
const LiveClassMonitor = lazy(() => import('./views/admin/LiveClassMonitor'))
const ClassroomManager = lazy(
  () => import('./views/admin/classroom/ClassroomManager'),
)
const AdminSettingsView = lazy(() => import('./views/admin/AdminSettingsView'))
const LeadsPage = lazy(() => import('./views/admin/LeadsPage'))
const AdminShopPage = lazy(() => import('./views/admin/AdminShopPage'))
const AdminBlogPage = lazy(() => import('./views/admin/AdminBlogPage'))
const AdminTestimonialsPage = lazy(
  () => import('./views/admin/AdminTestimonialsPage'),
)
const AdminTrainingView = lazy(() => import('./views/admin/AdminTrainingView'))

const AdminSalesView = lazy(() =>
  import('../features/sales/SalesDashboardViews').then((module) => ({
    default: module.AdminSalesView,
  })),
)
const SalesPortalView = lazy(() =>
  import('../features/sales/SalesDashboardViews').then((module) => ({
    default: module.SalesPortalView,
  })),
)

export default function DashboardLayout({ user }: { user: DashboardIdentity }) {
  const { role } = user
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const activeView = dashboardView(role, params.get('view'))
  const setActiveView: DashboardNavigation = (view, options) => {
    void navigate(dashboardViewUrl(role, dashboardView(role, view), options))
  }
  const isAdmin = isAdminRole(role)
  const openRecordings = () => setActiveView('recordings')

  function renderMainContent() {
    // Role-specific settings
    if (activeView === 'settings') {
      if (isAdmin) {
        return <AdminSettingsView user={user} />
      }

      return <StudentSettingsView user={user} />
    }

    // Shared recordings manager
    if (activeView === 'recordings') {
      return <ClassRecordingsManager userId={user.id} role={role} />
    }

    // Student views
    if (role === 'student') {
      switch (activeView) {
        case 'courses':
          return (
            <StudentCoursesView
              key={`${params.get('course')}/${params.get('lesson')}`}
              userId={user.id}
              requestedCourseId={params.get('course')}
              requestedLessonId={params.get('lesson')}
            />
          )

        case 'schedule':
          return (
            <GlobalScheduleView
              onBack={() => setActiveView('dashboard')}
              leadId={params.get('lead')}
              onClearLead={() => setActiveView(activeView)}
            />
          )

        case 'classroom':
          return <StudentClassroomView userId={user.id} />

        case 'dashboard':
        default:
          return (
            <StudentHomeView
              userId={user.id}
              onNavigate={setActiveView}
              onOpenRecordings={openRecordings}
            />
          )
      }
    }

    // Tutor views
    if (role === 'tutor') {
      switch (activeView) {
        case 'students':
          return <TutorStudentsView userId={user.id} />

        case 'schedule':
          return (
            <GlobalScheduleView
              onBack={() => setActiveView('dashboard')}
              leadId={params.get('lead')}
              onClearLead={() => setActiveView(activeView)}
            />
          )

        case 'course-assignment':
          return <TutorCourseAssignmentView userId={user.id} />

        case 'classrooms':
          return <TutorClassroomsView userId={user.id} />

        case 'trials':
          return <TutorTrialBookingsView userId={user.id} />

        case 'training':
          return <TutorTrainingView userId={user.id} />

        case 'dashboard':
        default:
          return (
            <TutorHomeView
              userId={user.id}
              user={user}
              onNavigate={setActiveView}
              onOpenRecordings={openRecordings}
            />
          )
      }
    }

    // Marketer (sales team) views
    if (role === 'marketer') {
      return (
        <SalesPortalView
          userId={user.id}
          name={user.full_name || ''}
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

        case 'Leads':
          return <LeadsPage />

        case 'courses-hub':
          return <AdminCoursesView />

        case 'Live Class Monitor':
          return <LiveClassMonitor notifyTutor={notifyDashboardTutor} />

        case 'classroom':
          return <ClassroomManager />

        case 'global-schedule':
          return (
            <GlobalScheduleView
              onBack={() => setActiveView('dashboard')}
              leadId={params.get('lead')}
              onClearLead={() => setActiveView(activeView)}
            />
          )

        case 'shop':
          return <AdminShopPage />

        case 'blog':
          return <AdminBlogPage userId={user.id} role={role} />

        case 'sales':
          return (
            <AdminSalesView
              key={params.get('booking') ?? params.get('section') ?? 'all'}
              bookingId={params.get('booking')}
              showBookings={params.get('section') === 'bookings'}
              onClearBooking={() =>
                setActiveView('sales', { section: 'bookings' })
              }
            />
          )

        case 'testimonials':
          return <AdminTestimonialsPage />
        case 'training':
          return <AdminTrainingView />
        case 'pricing':
          return <AdminPricingPage />
        case 'dashboard':
        default:
          return (
            <AdminHomeView
              userId={user.id}
              onNavigate={setActiveView}
              onOpenRecordings={openRecordings}
            />
          )
      }
    }

    return null
  }

  return (
    <DashboardFrame role={role} activeView={activeView} pending={false}>
      {activeView !== 'sales' &&
        activeView !== 'global-schedule' &&
        activeView !== 'schedule' &&
        role !== 'marketer' && <Toaster position="top-right" />}
      {role === 'marketer' && activeView === 'settings' && (
        <Toaster position="top-right" />
      )}
      <DashboardViewBoundary key={activeView}>
        <Suspense
          fallback={
            <output className="block p-6">Loading dashboard view…</output>
          }
        >
          {renderMainContent()}
        </Suspense>
      </DashboardViewBoundary>
    </DashboardFrame>
  )
}
