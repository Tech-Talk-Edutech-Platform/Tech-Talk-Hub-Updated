import React, { lazy, Suspense, useEffect, useSyncExternalStore } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'
import {
  ADMIN_ROLES,
  APP_ROLES,
  isAppRole,
  TUTOR_ADMIN_ROLES,
  type AppRole,
} from './types/roles'
import { useAuthUser } from './hooks/useAuthUser'
import {
  openedFromRecoveryLink,
  RESET_PASSWORD_PATH,
} from './lib/passwordRecovery'

// Structural Layout Framework Components
import Login from './auth/login'
import ResetPasswordPage from './auth/ResetPasswordPage'
import RoleGate from './auth/RoleGate'
import {
  DashboardSessionSync,
  DashboardSignOutSync,
} from './auth/DashboardSessionSync'
import { DashboardFrame } from './dashboards/DashboardFrame'
import { dashboardView } from './dashboards/navigation'

import StudentDashboard from './features/assessments/results/parentResult'
import AdminEntryForm from './features/assessments/results/AdminUpload'
import UserManagement from './features/accounts/UserManagement'

import './index.css'
import AdminDashboard from './dashboards/views/sendReceipt'
import LandingOrDashboard from './LandingOrDashboard'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './Utils/LandingPage'
import { HomePage } from './pages/HomePage'
import { SiteLayout } from './components/layout/SiteLayout'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { AboutPage } from './pages/AboutPage'
import { BlogPage } from './pages/BlogPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { BookingFailedPage } from './pages/BookingFailedPage'
import { BookingSuccessPage } from './pages/BookingSuccessPage'
import { CareersPage } from './pages/CareersPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ChildSafetyPage } from './pages/ChildSafetyPage'
import { ContactPage } from './pages/ContactPage'
import { CoursePage } from './pages/CoursePage'
import { CurriculumPage } from './pages/CurriculumPage'
import { FacultyPage } from './pages/FacultyPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PricingPage } from './pages/PricingPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProductPage } from './pages/ProductPage'
import { ProgramShopPage } from './pages/ProgramShopPage'
import { ShopPage } from './pages/ShopPage'
import { TermsPage } from './pages/TermsPage'
import { PROGRAM_SLUGS } from './data/programs'
import { staticPageMeta } from './data/seo'
import { useScrollToHash } from './hooks/useScrollToHash'
import { useAuthRedirectError } from './hooks/useAuthRedirectError'

const ClassroomRoutes = lazy(() =>
  import('./pages/classroom/ClassroomRoutes').then((module) => ({
    default: module.ClassroomRoutes,
  })),
)

const SalesPreviewPage = lazy(() => import('./features/sales/SalesPreviewPage'))
const FullCalendarView = lazy(() => import('./features/schedule/Calendar'))
const UnifiedDashboard = lazy(() => import('./dashboards/UnifiedDashboard'))
const STUDENT_ROLES = ['student'] as const

/** Scrolls to `/#section` targets on the landing page; must render inside the router. */
function ScrollToHash() {
  useScrollToHash()
  return null
}

/** Sends failed Google / email-link sign-ins to the login page with a message. */
function AuthRedirectErrorHandler() {
  useAuthRedirectError()
  return null
}

/**
 * Password-reset links land on the reset page even when Supabase falls back to
 * the site URL (the reset page isn't in its redirect allow-list yet), so a
 * reset never quietly signs someone in without asking for a new password.
 */
let recoveryRedirectHandled = false
function PasswordRecoveryRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const goToReset = () => {
      recoveryRedirectHandled = true
      if (window.location.pathname !== RESET_PASSWORD_PATH) {
        void navigate(RESET_PASSWORD_PATH, { replace: true })
      }
    }
    if (openedFromRecoveryLink && !recoveryRedirectHandled) goToReset()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') goToReset()
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return null
}

function SessionSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <output
        aria-label="Loading your account"
        className="block h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
      />
    </div>
  )
}

/**
 * The home page for visitors; signed-in people go to their dashboard. Only
 * someone with a saved session waits (briefly) while it's restored.
 */
function HomeRoute({ user, loading }: { user: User | null; loading: boolean }) {
  if (user) {
    const role: unknown = user.user_metadata?.role
    return <Navigate to={`/${isAppRole(role) ? role : 'student'}`} replace />
  }
  if (loading) return <SessionSpinner />
  return <HomePage />
}

/**
 * `/:role` matches every one-segment URL, so without this check a public link
 * like `/blog` would land on the role gate's "access denied" screen.
 */
const subscribeToHydration = () => () => {}

function RoleDashboardRoute({
  dashboardRole,
  userId,
  sessionLoading,
}: {
  dashboardRole?: AppRole
  userId?: string
  sessionLoading: boolean
}) {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
  const [params] = useSearchParams()
  const { role } = useParams()

  if (!isAppRole(role)) {
    return (
      <SiteLayout>
        <NotFoundPage />
      </SiteLayout>
    )
  }

  const loading =
    dashboardRole === role ? (
      <DashboardFrame
        role={role}
        activeView={dashboardView(role, params.get('view'))}
      >
        <SessionSpinner />
      </DashboardFrame>
    ) : undefined

  const accessCheck = loading ?? (
    <output className="flex min-h-screen items-center justify-center">
      Verifying Access…
    </output>
  )

  return (
    <>
      <DashboardSessionSync />
      {mounted ? (
        <Suspense fallback={accessCheck}>
          <UnifiedDashboard
            userId={userId}
            sessionLoading={sessionLoading}
            loadingView={accessCheck}
          />
        </Suspense>
      ) : (
        accessCheck
      )}
    </>
  )
}

/** Old site's booking URL; keeps the query string (e.g. `?ref=`) on shared links. */
function BookClassRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/book${search}`} replace />
}

// Newly Mounted Admin Views
import MyHomework from './features/assessments/assignment/MyHomework'
import StudentAssignments from './features/assessments/assignment/StudentAssignments'

function DashboardApp({ dashboardRole }: { dashboardRole?: AppRole }) {
  // Public pages render immediately; only routes that need the user wait for
  // the saved session, and only when there is one.
  const { user, loading } = useAuthUser()
  const allRoles: readonly AppRole[] = APP_ROLES

  return (
    <>
      <AuthRedirectErrorHandler />
      <DashboardSignOutSync />
      <PasswordRecoveryRedirect />
      <ScrollToHash />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route
            path="/"
            element={<HomeRoute user={user} loading={loading} />}
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/curriculum" element={<CurriculumPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* Vercel answers these with a 308 (vercel.json); this covers dev and other hosts. */}
          <Route
            path="/learning-paths"
            element={<Navigate to="/curriculum" replace />}
          />
          <Route
            path="/contact-us"
            element={<Navigate to="/contact" replace />}
          />
          {/* Old links: the hero's "Explore courses" and the blog sidebar's "View programs". */}
          <Route
            path="/courses"
            element={<Navigate to="/curriculum" replace />}
          />
          <Route
            path="/programs"
            element={<Navigate to="/curriculum" replace />}
          />
          {PROGRAM_SLUGS.map((slug) => (
            <Route
              key={slug}
              path={`/courses/${slug}`}
              element={<CoursePage slug={slug} />}
            />
          ))}
          {PROGRAM_SLUGS.map((slug) => (
            <Route
              key={slug}
              path={`/${slug}`}
              element={<ProgramShopPage slug={slug} />}
            />
          ))}
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/child-safety" element={<ChildSafetyPage />} />
          <Route path="/booking-success" element={<BookingSuccessPage />} />
          <Route path="/booking-failed" element={<BookingFailedPage />} />
          <Route
            path="/donate"
            element={<ComingSoonPage meta={staticPageMeta('/donate')} />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route
          path="/classroom/*"
          element={
            <Suspense fallback={null}>
              <ClassroomRoutes />
            </Suspense>
          }
        />
        <Route path="/book" element={<LandingPage />} />
        <Route path="/book-class" element={<BookClassRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path={RESET_PASSWORD_PATH} element={<ResetPasswordPage />} />
        {/* Public preview of the sales (marketer) dashboard. It only ever
            shows made-up demo data, so it needs no sign-in; it's noindex and
            disallowed in robots.txt. */}
        <Route
          path="/preview/sales"
          element={
            <Suspense fallback={<SessionSpinner />}>
              <SalesPreviewPage />
            </Suspense>
          }
        />
        <Route path="/landing" element={<LandingOrDashboard />} />
        <Route
          path="/assign-homework"
          element={
            <RoleGate allowedRoles={TUTOR_ADMIN_ROLES}>
              <StudentAssignments user={user} />
            </RoleGate>
          }
        />
        {/* Public Routes */}
        <Route path="/results/:slug" element={<StudentDashboard />} />
        <Route
          path="/:role"
          element={
            <RoleDashboardRoute
              dashboardRole={dashboardRole}
              userId={user?.id}
              sessionLoading={loading}
            />
          }
        />
        <Route
          path="/receive-homework"
          element={
            <RoleGate allowedRoles={STUDENT_ROLES}>
              <MyHomework studentId={user?.id} />
            </RoleGate>
          }
        />
        <Route
          path="/users"
          element={
            <RoleGate allowedRoles={ADMIN_ROLES}>
              <UserManagement />
            </RoleGate>
          }
        />
        <Route
          path="/calendar"
          element={
            <RoleGate allowedRoles={allRoles}>
              <Suspense fallback={<SessionSpinner />}>
                <FullCalendarView />
              </Suspense>
            </RoleGate>
          }
        />
        <Route
          path="/receipt"
          element={
            <RoleGate allowedRoles={TUTOR_ADMIN_ROLES}>
              <AdminDashboard />
            </RoleGate>
          }
        />
        <Route
          path="/upload-results"
          element={
            <RoleGate allowedRoles={TUTOR_ADMIN_ROLES}>
              <AdminEntryForm />
            </RoleGate>
          }
        />
      </Routes>
    </>
  )
}

function SupabaseConfigurationError() {
  const isDevelopment = import.meta.env.DEV

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-slate-100">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl sm:p-10">
        <p className="text-xs font-bold tracking-[0.2em] text-amber-300 uppercase">
          Setup required
        </p>
        <h1 className="mt-3 text-2xl font-black">
          Tech Talk Hub is not configured
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {isDevelopment
            ? 'Add the Supabase project settings to the project root .env.local file, then restart the Vite development server.'
            : 'This application is not connected to its data service yet. Please contact the site administrator.'}
        </p>
        {isDevelopment && (
          <pre className="mt-6 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-amber-100">{`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`}</pre>
        )}
      </section>
    </main>
  )
}

export default function App({
  serverRouter = false,
  dashboardRole,
}: {
  serverRouter?: boolean
  dashboardRole?: AppRole
}) {
  const app = isSupabaseConfigured ? (
    <DashboardApp dashboardRole={dashboardRole} />
  ) : (
    <SupabaseConfigurationError />
  )

  return (
    <ErrorBoundary>
      {serverRouter ? app : <BrowserRouter>{app}</BrowserRouter>}
    </ErrorBoundary>
  )
}
