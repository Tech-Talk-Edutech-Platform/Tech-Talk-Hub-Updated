import { lazy, Suspense } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { DashboardFrame } from './DashboardFrame'
import { DashboardViewBoundary } from './DashboardViewBoundary'
import {
  dashboardView,
  dashboardViewUrl,
  movedDashboardView,
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
const StudentExamsView = lazy(() => import('./views/student/StudentExamsView'))
const StudentExam = lazy(() => import('./views/student/StudentExam'))
const StudentGradesView = lazy(
  () => import('./views/student/StudentGradesView'),
)
const AdminExamsView = lazy(() => import('./views/admin/exams/AdminExamsView'))
const TutorHomeView = lazy(() => import('./views/tutor/TutorHomeView'))
const TutorStudentsView = lazy(() => import('./views/tutor/TutorStudentsView'))
const TutorCourseAssignmentView = lazy(
  () => import('./views/tutor/TutorCourseAssignmentView'),
)
const TutorClassroomsView = lazy(
  () => import('./views/tutor/TutorClassroomsView'),
)
const TutorTrainingHub = lazy(() => import('./views/tutor/TutorTrainingHub'))
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

export default function DashboardLayout({
  user,
  onProfileSaved,
}: {
  user: DashboardIdentity
  onProfileSaved?: () => void
}) {
  const { role } = user
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const activeView = dashboardView(role, params.get('view'))
  const setActiveView: DashboardNavigation = (view, options) => {
    void navigate(dashboardViewUrl(role, dashboardView(role, view), options))
  }
  const isAdmin = isAdminRole(role)
  const openRecordings = () => setActiveView('recordings')
  const moved = movedDashboardView(params.get('view'))
  if (moved) {
    return (
      <Navigate
        to={dashboardViewUrl(role, moved.view, moved.options)}
        replace
      />
    )
  }

  function renderMainContent() {
    // Role-specific settings
    if (activeView === 'settings') {
      if (isAdmin) {
        return <AdminSettingsView user={user} onProfileSaved={onProfileSaved} />
      }

      return <StudentSettingsView user={user} onProfileSaved={onProfileSaved} />
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

        case 'exams': {
          const examId = params.get('exam')
          return examId ? (
            <StudentExam
              key={examId}
              userId={user.id}
              examId={examId}
              onExit={() => setActiveView('exams')}
            />
          ) : (
            <StudentExamsView
              userId={user.id}
              onOpenExam={(id) => setActiveView('exams', { exam: id })}
              onOpenGrades={() => setActiveView('grades')}
            />
          )
        }

        case 'grades':
          return <StudentGradesView userId={user.id} />

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
          return (
            <TutorStudentsView
              userId={user.id}
              onOpenHomework={() => setActiveView('course-assignment')}
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

        case 'course-assignment':
          return <TutorCourseAssignmentView userId={user.id} />

        case 'classrooms':
          return <TutorClassroomsView userId={user.id} />

        case 'training':
          return (
            <TutorTrainingHub
              userId={user.id}
              section={params.get('section') === 'trials' ? 'trials' : 'course'}
              onSectionChange={(section) =>
                setActiveView(
                  'training',
                  section === 'trials' ? { section } : undefined,
                )
              }
            />
          )

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
        case 'exams':
          return (
            <AdminExamsView
              key={params.get('exam') ?? 'list'}
              userId={user.id}
              examId={params.get('exam')}
              onOpenExam={(id) =>
                setActiveView('exams', id ? { exam: id } : undefined)
              }
            />
          )
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
