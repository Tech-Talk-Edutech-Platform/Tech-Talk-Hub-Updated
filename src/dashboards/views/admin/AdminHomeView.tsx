import React, { useEffect, useState, useCallback } from 'react'
import {
  ShieldAlert,
  BarChart3,
  Globe,
  TrendingUp,
  Users2,
  FileText,
  Plus,
  CheckCircle2,
  Activity,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../supabase'
import { notifyTutor } from '../../../Utils/adminActions'
import { StatCard } from '../../../components/dashboard/ui/StatCard'
import Messages from '../../../Utils/fetchMessage'
import { toast } from 'react-hot-toast'

export default function AdminHomeView({ userId, role }) {
  const [stats, setStats] = useState({
    revenue: 0,
    tutors: 0,
    students: 0,
    conversion: 0,
    issues: 0,
  })
  const [upcoming, setUpcoming] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)

  // Optional modals handler placeholders if needed
  const [showAudit, setShowAudit] = useState(false)
  const [showSales, setShowSales] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const fetchIssues = async () => {
    const { data } = await supabase
      .from('issues')
      .select(
        `id, title, status, priority, created_at, users:reported_by(full_name)`,
      )
      .order('created_at', { ascending: false })
    setIssues(data || [])
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)

      const [
        { data: payments },
        { count: tutors },
        { count: students },
        { count: leads },
        { count: converted },
        { count: issuesCount },
        { data: classes },
      ] = await Promise.all([
        supabase.from('payments').select('amount').eq('status', 'paid'),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'tutor'),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student'),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'converted'),
        supabase
          .from('issues')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('calendar_events')
          .select(
            `*, tutors:tutor_id(full_name), event_attendance(id, students(full_name))`,
          )
          .or(
            `and(start_time.gte.${startOfToday.toISOString()},start_time.lte.${endOfToday.toISOString()}),and(end_time.gte.${startOfToday.toISOString()},end_time.lte.${endOfToday.toISOString()})`,
          )
          .order('start_time'),
      ])

      setStats({
        revenue: payments?.reduce((s, p) => s + p.amount, 0) || 0,
        tutors: tutors || 0,
        students: students || 0,
        conversion:
          leads && leads > 0 ? ((converted / leads) * 100).toFixed(1) : 0,
        issues: issuesCount || 0,
      })

      setUpcoming(classes || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to fetch fresh dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    fetchIssues()
  }, [fetchAll])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-28 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-600" />
        <p className="animate-pulse text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Initializing Operations Center...
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* STATS GRID BAR */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/*   {role === "owner" && (
          <StatCard title="Total Revenue" value={`KES ${stats.revenue.toLocaleString()}`} icon={BarChart3} />
        )}*/}
        <StatCard
          title="Active Tutors"
          value={stats.tutors}
          accent="blue"
          icon={Users2}
        />
        <StatCard
          title="Active Students"
          value={stats.students}
          accent="blue"
          icon={Globe}
        />
        {/*  {(role === "owner" || role === "tech_admin") && (
          <StatCard title="Lead Conv %" value={`${stats.conversion}%`} accent="amber" icon={TrendingUp} />
        )}*/}
        {(role === 'owner' || role === 'tech_admin') && (
          <StatCard
            title="Open Issues"
            value={stats.issues}
            icon={ShieldAlert}
          />
        )}
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        {/* MAIN COLUMN */}
        <div className="col-span-12 flex flex-col gap-6 xl:col-span-8">
          {/* REPORTED TECHNICAL & SUPPORT ISSUES */}
          {(role === 'owner' || role === 'tech_admin') && (
            <div className="space-y-6 rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-rose-500 dark:border-rose-500/20 dark:bg-rose-500/10">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                      Support & Technical Tickets
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Review active issues reported across tutors and students.
                    </p>
                  </div>
                </div>
                {issues.length > 0 && (
                  <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                    {issues.length} Pending
                  </span>
                )}
              </div>

              {issues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center text-xs font-bold text-gray-400 dark:border-white/10 dark:bg-white/5">
                  🎉 No open support tickets or infrastructure issues right now!
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.slice(0, 5).map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/30 p-4 transition-all hover:bg-gray-50/80 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {issue.title}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Reported by:{' '}
                          <span className="text-purple-600 dark:text-purple-400">
                            {issue.users?.full_name || 'Unknown Staff'}
                          </span>{' '}
                          •{' '}
                          <span className="capitalize text-rose-600">
                            {issue.priority || 'Normal'} priority
                          </span>
                        </p>
                      </div>
                      <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                        {issue.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INTERNAL CHAT / MESSAGING WIDGET */}
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
            <Messages userId={userId} isAdmin={true} />
          </div>
        </div>

        {/* SIDEBAR COMMAND CENTER */}
        <div className="col-span-12 flex flex-col gap-6 xl:col-span-4">
          {/* QUICK LINKS PANEL */}
          <div className="relative overflow-hidden rounded-[32px] border border-gray-800 bg-gray-900 p-6 text-white shadow-xl dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl" />

            <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400">
              <Settings size={16} className="text-purple-500" /> Administrative
              Links
            </div>

            <div className="relative z-10 space-y-3">
              <Link
                to="/calendar"
                className="flex w-full items-center justify-between rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-xs font-black uppercase tracking-wider shadow-md shadow-purple-950/40 transition-all hover:from-purple-700 hover:to-indigo-700 active:scale-[0.99]"
              >
                <span>📅 Open Global Calendar</span>
                <Plus size={14} />
              </Link>

              {(role === 'owner' ||
                role === 'tech_admin' ||
                role === 'marketer') && (
                <Link
                  to="/admin/referrals"
                  className="group flex w-full items-center justify-between rounded-2xl border border-gray-700/50 bg-gray-800/80 p-4 text-xs font-bold text-gray-200 transition-all hover:bg-gray-800 active:scale-[0.99]"
                >
                  <span>🎟️ Sales Referral Pipeline</span>
                  <ChevronRight
                    size={14}
                    className="text-gray-400 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              )}

              <button
                onClick={() => setShowAudit(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 text-xs font-bold text-gray-200 transition-all hover:bg-white/10 hover:text-white active:scale-[0.99]"
              >
                <span>🕵️ Audit Daily Class Logs</span>
                <FileText size={14} className="text-gray-400" />
              </button>

              {(role === 'owner' || role === 'tech_admin') && (
                <button
                  onClick={() => setShowSales(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-bold text-amber-400 transition-all hover:bg-amber-500/20 active:scale-[0.99]"
                >
                  <span>📈 Sales & Leads Pipeline</span>
                  <TrendingUp size={14} />
                </button>
              )}

              {role === 'owner' && (
                <button
                  onClick={() => setShowAnalytics(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-xs font-bold text-purple-400 transition-all hover:bg-purple-500/20 active:scale-[0.99]"
                >
                  <span>📊 Core Metrics & Analytics</span>
                  <BarChart3 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* LIVE CLASS MONITOR */}
          <div className="space-y-4 rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h3 className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
              <Activity
                size={16}
                className="animate-pulse text-purple-600 dark:text-purple-400"
              />{' '}
              Live Class Monitor
            </h3>

            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-bold text-gray-400">
                    No classes scheduled for today.
                  </p>
                </div>
              ) : (
                upcoming.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/30 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-gray-900 dark:text-white">
                        {c.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        {c.tutors?.full_name || 'Assigned Tutor'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        notifyTutor(c.tutor_id, `Confirmed: ${c.title}`)
                        toast.success('Pinged tutor successfully!')
                      }}
                      className="shadow-xs shrink-0 rounded-xl border border-gray-100 bg-white p-2.5 text-emerald-600 transition-all hover:bg-emerald-50 dark:border-white/10 dark:bg-white/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                      title="Ping Tutor"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
