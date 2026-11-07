import React, { lazy, Suspense, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'
import {
  APP_ROLES,
  isAppRole,
  TUTOR_ADMIN_ROLES,
  type AppRole,
} from './types/roles'

// Structural Layout Framework Components
import Login from './auth/login'
import RoleGate from './auth/RoleGate'

import ExamInterface from './features/exam/ExamInterface'
import FullCalendarView from './features/schedule/Calendar'
import CreateExam from './features/assessments/exams/CreateExam'
import ExamPage from './features/assessments/exams/ExamPage'
import StudentDashboard from './features/assessments/results/parentResult'
import AdminEntryForm from './features/assessments/results/AdminUpload'
import StudentAssignmentManager from './features/accounts/StudentAssignmentManager'
import UserManagement from './features/accounts/UserManagement'
import ReferralDashboard from './features/commerce/Sales/ReferralDashboard'
import MarketerDashboard from './features/commerce/Sales/MarketerDashboard'
import LearningPage from './components/pages/Learning'

import UnifiedDashboard from './dashboards/UnifiedDashboard'
import AdminNotesManager from './components/AdminNotesManager'
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
import { CoursePage } from './pages/CoursePage'
import { CurriculumPage } from './pages/CurriculumPage'
import { FacultyPage } from './pages/FacultyPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProductPage } from './pages/ProductPage'
import { ProgramShopPage } from './pages/ProgramShopPage'
import { ShopPage } from './pages/ShopPage'
import { TermsPage } from './pages/TermsPage'
import { PROGRAM_SLUGS } from './data/programs'
import { staticPageMeta } from './data/seo'
import { useScrollToHash } from './hooks/useScrollToHash'

const ClassroomRoutes = lazy(() =>
  import('./pages/classroom/ClassroomRoutes').then((module) => ({
    default: module.ClassroomRoutes,
  })),
)

/** Scrolls to `/#section` targets on the landing page; must render inside the router. */
function ScrollToHash() {
  useScrollToHash()
  return null
}

/**
 * `/:role` matches every one-segment URL, so without this check a public link
 * like `/blog` would land on the role gate's "access denied" screen.
 */
function RoleDashboardRoute() {
  const { role } = useParams()

  if (!isAppRole(role)) {
    return (
      <SiteLayout>
        <NotFoundPage />
      </SiteLayout>
    )
  }

  return (
    <RoleGate allowedRoles={APP_ROLES}>
      <UnifiedDashboard />
    </RoleGate>
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

// --- HOISTED COMPONENTS ---
const UserManagementPage = () => {
  const { role } = useParams()
  return <UserManagement viewerRole={role} />
}

const MarketerView = () => {
  const { marketerId } = useParams()
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setId(marketerId || data.user?.id || null)
    }
    getUser()
  }, [marketerId])

  return <MarketerDashboard currentMarketerId={id} />
}

function DashboardApp() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const allRoles: readonly AppRole[] = APP_ROLES

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Session identity authentication link failed:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 font-sans text-white">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
          Initializing Session
        </p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ScrollToHash />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={`/${isAppRole(user.user_metadata?.role) ? user.user_metadata.role : 'student'}`}
                  replace
                />
              ) : (
                <HomePage />
              )
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/curriculum" element={<CurriculumPage />} />
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
        <Route path="/landing" element={<LandingOrDashboard />} />
        <Route
          path="/assign-homework"
          element={<StudentAssignments user={user} />}
        />
        {/* Public Routes */}
        <Route path="/results/:slug" element={<StudentDashboard />} />
        <Route path="/admin/referrals" element={<ReferralDashboard />} />
        <Route path="/marketer" element={<MarketerView />} />
        // <Route path="/exam1" element={<ExamInterface />} />
        <Route path="/:role" element={<RoleDashboardRoute />} />
        <Route
          path="/receive-homework"
          element={<MyHomework studentId={user?.id} />}
        />
        <Route path="/upload-notes" element={<AdminNotesManager />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route
          path="/student-assignment"
          element={<StudentAssignmentManager />}
        />
        <Route path="/learning/:id" element={<LearningPage user={user} />} />
        <Route path="/create-exam" element={<CreateExam />} />
        <Route path="/exam" element={<ExamPage user={user} />} />
        <Route
          path="/calendar"
          element={
            <RoleGate allowedRoles={allRoles}>
              <FullCalendarView />
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
    </BrowserRouter>
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

export default function App() {
  return (
    <ErrorBoundary>
      {isSupabaseConfigured ? <DashboardApp /> : <SupabaseConfigurationError />}
    </ErrorBoundary>
  )
}
