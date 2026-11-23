import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../supabase'
import {
  User,
  Calendar,
  BookOpen,
  Code,
  Monitor,
  Lightbulb,
  Star,
  MessageSquare,
  Rocket,
  ExternalLink,
  Activity,
  Award,
  Share2,
  CheckCircle2,
} from 'lucide-react'

const optionalText = z.string().nullish()
const optionalNumber = z.number().nullish()
const studentResult = z.object({
  id: z.string(),
  student_name: z.string(),
  course_name: optionalText,
  grade_level: z.union([z.string(), z.number()]).nullish(),
  total_classes_allocated: optionalNumber,
  classes_attended: optionalNumber,
  overall_score: optionalNumber,
  theory_score: optionalNumber,
  practical_score: optionalNumber,
  problem_solving_score: optionalNumber,
  creativity_score: optionalNumber,
  performance_label: optionalText,
  project_url: optionalText,
  exam_title: optionalText,
  exam_date: optionalText,
  tutor_feedback: optionalText,
  today_summary: optionalText,
  is_share_link: z.boolean(),
  can_share: z.boolean(),
})

const StudentDashboard = () => {
  const { slug } = useParams()
  const [data, setData] = useState<z.infer<typeof studentResult> | null>(null)

  const [loadedReference, setLoadedReference] = useState<string>()
  const [shareLink, setShareLink] = useState<{
    reference: string
    url: string
  }>()
  const [sharing, setSharing] = useState(false)
  const loading = loadedReference !== slug

  useEffect(() => {
    if (!slug) return undefined
    const controller = new AbortController()

    void supabase
      .rpc('read_dashboard_report', { p_reference: slug })
      .abortSignal(controller.signal)
      .then(({ data: result, error }) => {
        if (controller.signal.aborted) return
        const parsed = studentResult.safeParse(result)
        setData(!error && parsed.success ? parsed.data : null)
        setLoadedReference(slug)
      })

    return () => controller.abort()
  }, [slug])

  const handleShareDashboard = async () => {
    if (!data || !slug) return
    setSharing(true)

    try {
      let url = data.is_share_link
        ? window.location.href
        : shareLink?.reference === slug
          ? shareLink.url
          : undefined
      if (!url) {
        const { data: token, error } = await supabase.rpc(
          'share_dashboard_report',
          { p_report: data.id },
        )
        if (error || !token) throw new Error('Could not create a share link.')
        url = new URL(`/results/${token}`, window.location.origin).href
        setShareLink({ reference: slug, url })
      }
      if (navigator.share) {
        await navigator.share({
          title: `${data.student_name}'s Coding Dashboard`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Report link copied.')
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error('Could not share the report. Try again.')
      }
    } finally {
      setSharing(false)
    }
  }

  if (loading)
    return (
      <div className="animate-pulse p-10 text-center font-sans">
        Fetching Report Card...
      </div>
    )
  if (!data)
    return <div className="p-10 text-center font-sans">Result not found.</div>

  const totalAllocated = data.total_classes_allocated ?? null
  const attended = data.classes_attended ?? null
  const remainingClasses =
    totalAllocated != null && attended != null
      ? Math.max(0, totalAllocated - attended)
      : null

  const milestoneTarget = totalAllocated
  const rawProgressPercent =
    milestoneTarget && attended != null
      ? Math.min(100, Math.round((attended / milestoneTarget) * 100))
      : 0

  const projectUrl = data.project_url

  /* ================= MAIN DASHBOARD VIEW ================= */
  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-gray-50 pb-20 font-sans shadow-2xl print:bg-white print:shadow-none">
      {/* 1. HEADER SECTION */}
      <div className="rounded-b-3xl border-b border-gray-100 bg-white p-6 shadow-xs">
        {(data.is_share_link || data.can_share) && (
          <div className="mb-4 flex items-center justify-between print:hidden">
            <button
              type="button"
              onClick={() => void handleShareDashboard()}
              disabled={sharing}
              className="ml-auto flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
            >
              <Share2 size={14} /> Share Report
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="group relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-indigo-100 shadow-inner">
              <User size={40} className="text-indigo-500" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-gray-800">
              {data.student_name}
            </h1>
            <p className="text-sm font-semibold text-indigo-600">
              Grade {data.grade_level} • {data.course_name}
            </p>
            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600 uppercase">
              Active Student
            </span>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC MILESTONE TRACKER */}
      <div className="p-4 pb-0">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              <CheckCircle2 size={12} className="text-indigo-500" /> Milestone
              Path
            </span>
            <span className="text-xs font-black text-indigo-600">
              {rawProgressPercent}% Finished
            </span>
          </div>
          <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${rawProgressPercent}%` }}
            />
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            {remainingClasses === null
              ? 'Milestone target unavailable.'
              : remainingClasses > 0
                ? `${remainingClasses} more classes until next core certification boundary.`
                : 'Course phase milestone achieved!'}
          </p>
        </div>
      </div>

      {/* 3. SUBSCRIPTION TRACKER PANEL */}
      <div className="p-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-gray-800 uppercase">
              <Activity size={14} className="text-indigo-500" /> Subscription
              Balance
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <span className="block text-xs font-medium text-slate-400">
                Allocated
              </span>
              <span className="text-lg font-black text-slate-800">
                {totalAllocated ?? '—'}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
              <span className="block text-xs font-semibold text-emerald-600">
                Attended
              </span>
              <span className="text-lg font-black text-emerald-700">
                {attended ?? '—'}
              </span>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5">
              <span className="block text-xs font-semibold text-indigo-600">
                Remaining
              </span>
              <span className="text-lg font-black text-indigo-700">
                {remainingClasses ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TODAY'S LESSON SUMMARY */}
      <div className="mb-2 px-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-50 pb-2">
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-500">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-wide text-gray-800 uppercase">
                Today's Class Summary
              </h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed font-medium whitespace-pre-line text-gray-600">
            {data.today_summary ||
              "No specific recap compiled for today's curriculum milestone yet."}
          </p>
        </div>
      </div>

      {/* 5. PROJECT SHOWCASE */}
      {projectUrl && (
        <div className="p-4">
          <div className="rounded-2xl bg-linear-to-br from-orange-500 to-pink-500 p-5 text-white shadow-lg">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
              <Rocket size={18} className="animate-bounce" /> Student Project
            </div>
            <h3 className="mb-3 text-lg font-black">
              See what {data.student_name.split(' ')[0]} built!
            </h3>
            <a
              href={projectUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-black text-orange-600 shadow-md transition-all active:scale-95 print:hidden"
            >
              Launch Project <ExternalLink size={18} />
            </a>
          </div>
        </div>
      )}

      {/* 6. OVERALL PERFORMANCE */}
      <div className="p-4">
        <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-xs">
          <h2 className="mb-4 flex items-center gap-1.5 px-1 text-sm font-bold tracking-wide text-gray-800 uppercase">
            <Award size={15} className="text-green-500" /> Overall Performance
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-10 border-green-500">
              <div className="text-center">
                <span className="text-2xl font-black text-gray-800">
                  {data.overall_score || 0}%
                </span>
                <p className="text-[8px] font-bold text-green-500 uppercase">
                  {data.performance_label || 'Average'}
                </p>
              </div>
            </div>
            <p className="flex-1 text-sm leading-tight text-gray-600">
              <span className="font-bold text-gray-800">
                {data.performance_label || 'Great Job'}!
              </span>{' '}
              {data.student_name.split(' ')[0]} is demonstrating structural
              mastery across standard metrics.
            </p>
          </div>
        </div>
      </div>

      {/* 7. LATEST EXAM CARD */}
      <div className="mb-2 px-4">
        <h2 className="mb-3 px-1 text-sm font-bold tracking-wide text-gray-800 uppercase">
          Latest Exam Result
        </h2>
        <div className="rounded-2xl border-l-[6px] border-indigo-500 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                <Code size={20} />
              </div>
              <div>
                <h3 className="text-sm leading-tight font-bold text-gray-800">
                  {data.exam_title || 'Initial Setup Profile'}
                </h3>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-gray-400">
                  <Calendar size={12} />{' '}
                  {data.exam_date
                    ? new Date(data.exam_date).toDateString()
                    : 'Recent'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-green-500">
                {data.overall_score}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8. SKILL BREAKDOWN */}
      <div className="p-4">
        <h2 className="mb-3 px-1 text-sm font-bold tracking-wide text-gray-800 uppercase">
          Section Breakdown
        </h2>
        <div className="space-y-4 rounded-2xl border border-gray-50 bg-white p-5 shadow-xs">
          <StatRow
            label="Theory"
            score={data.theory_score}
            icon={<Code size={16} />}
            color="bg-red-50 text-red-500"
          />
          <StatRow
            label="Practical"
            score={data.practical_score}
            icon={<Monitor size={16} />}
            color="bg-blue-50 text-blue-500"
          />
          <StatRow
            label="Logic"
            score={data.problem_solving_score}
            icon={<Lightbulb size={16} />}
            color="bg-yellow-50 text-yellow-500"
          />
          <StatRow
            label="Creative"
            score={data.creativity_score}
            icon={<Star size={16} />}
            color="bg-purple-50 text-purple-500"
          />
        </div>
      </div>

      {/* 9. GLOBAL TUTOR FEEDBACK */}
      <div className="px-4">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-linear-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl" />

          <div className="mb-3.5 flex items-center gap-2.5 text-xs font-bold tracking-widest text-indigo-300 uppercase">
            <MessageSquare size={16} className="text-indigo-400" />
            <span>Instructor Feedback Notes</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner backdrop-blur-xs">
            {/* Added whitespace-pre-line to render user paragraph wraps/breaks perfectly */}
            <p className="text-sm leading-relaxed font-medium tracking-tight whitespace-pre-line text-slate-100 italic">
              "
              {data.tutor_feedback ||
                'No structural feedback summary compiled for this phase yet.'}
              "
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3.5 text-[9px] font-bold tracking-wider text-indigo-300/70 uppercase">
            <span>Verified Academic Snaplog</span>
            <span className="rounded-md border border-indigo-400/20 bg-indigo-500/20 px-2 py-0.5 text-indigo-200">
              Tech Talk Hub
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatRow = ({
  label,
  score,
  icon,
  color,
}: {
  label: string
  score: number | null | undefined
  icon: ReactNode
  color: string
}) => (
  <div>
    <div className="mb-1 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`${color} rounded-lg p-1.5`}>{icon}</div>
        <span className="text-xs font-bold tracking-tighter text-gray-600 uppercase">
          {label}
        </span>
      </div>
      <div className="text-xs font-black text-gray-800">{score || 0}%</div>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full bg-green-500"
        style={{ width: `${score || 0}%` }}
      />
    </div>
  </div>
)

export default StudentDashboard
