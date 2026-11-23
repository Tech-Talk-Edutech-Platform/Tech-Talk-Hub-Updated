import {
  Activity,
  BookOpen,
  Calendar,
  CalendarHeart,
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
  type LucideIcon,
} from 'lucide-react'
import { SALES_NAV } from '../features/sales/navigation'
import { isAdminRole, type AppRole } from '../types/roles'

type NavigationGroup = {
  label: string
  items: readonly { id: string; label: string; icon: LucideIcon }[]
}

const overview = {
  label: 'Overview',
  items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
}
const settings = {
  label: 'System',
  items: [{ id: 'settings', label: 'Settings', icon: Settings }],
}

const studentGroups: NavigationGroup[] = [
  {
    label: 'Learning',
    items: [
      { id: 'classroom', label: 'My Classroom', icon: Presentation },
      { id: 'courses', label: 'My Courses', icon: BookOpen },
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'recordings', label: 'My Recordings', icon: Video },
    ],
  },
]
const tutorGroups: NavigationGroup[] = [
  {
    label: 'Teaching',
    items: [
      { id: 'classrooms', label: 'My Classrooms', icon: Presentation },
      { id: 'students', label: 'My Students', icon: Users },
      { id: 'schedule', label: 'My Schedule', icon: Calendar },
      { id: 'trials', label: 'Trial Bookings', icon: CalendarHeart },
      { id: 'course-assignment', label: 'Course Assignment', icon: Layers },
      { id: 'recordings', label: 'Class Recordings', icon: Video },
    ],
  },
  {
    label: 'Growth',
    items: [{ id: 'training', label: 'Training', icon: GraduationCap }],
  },
]
const adminGroups: NavigationGroup[] = [
  {
    label: 'Sales',
    items: [{ id: 'sales', label: 'Sales & Trials', icon: TrendingUp }],
  },
  {
    label: 'E-Commerce',
    items: [{ id: 'shop', label: 'Shop Management', icon: ShoppingBag }],
  },
  {
    label: 'Website',
    items: [
      { id: 'blog', label: 'Blog Management', icon: Newspaper },
      { id: 'pricing', label: 'Pricing Plans', icon: CreditCard },
      { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'users', label: 'Users & Staff', icon: Users },
      { id: 'Leads', label: 'Leads', icon: Users2 },
      { id: 'courses-hub', label: 'Courses Hub', icon: Layers3 },
      { id: 'classroom', label: 'Classroom', icon: Presentation },
      { id: 'Live Class Monitor', label: 'Live Class Monitor', icon: Activity },
      { id: 'training', label: 'Tutor Training', icon: GraduationCap },
      { id: 'global-schedule', label: 'Global Schedule', icon: Calendar },
      { id: 'recordings', label: 'Recordings Manager', icon: Video },
    ],
  },
]

export type DashboardNavigation = (
  view: string,
  options?: Record<string, string>,
) => void

export function dashboardNavigation(role: AppRole) {
  const groups = isAdminRole(role)
    ? adminGroups
    : role === 'student'
      ? studentGroups
      : role === 'tutor'
        ? tutorGroups
        : [{ label: 'Sales', items: SALES_NAV }]
  return [overview, ...groups, settings]
}

export function dashboardView(role: AppRole, value: string | null) {
  return dashboardNavigation(role).some((group) =>
    group.items.some((item) => item.id === value),
  )
    ? (value ?? 'dashboard')
    : 'dashboard'
}

export function dashboardViewUrl(
  role: AppRole,
  view: string,
  options?: Record<string, string>,
) {
  const params = new URLSearchParams(options)
  if (view !== 'dashboard') params.set('view', view)
  const search = params.toString()
  return `/${role}${search ? `?${search}` : ''}`
}
