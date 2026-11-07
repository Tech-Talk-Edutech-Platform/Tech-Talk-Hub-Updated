import { useEffect, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useParams } from 'react-router-dom'
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
  Camera,
  Activity,
  Award,
  Share2,
  CheckCircle2,
} from 'lucide-react'

interface StudentResult {
  id: string
  student_name: string
  avatar_url?: string | null
  course_name?: string | null
  grade_level?: string | number | null
  total_classes_allocated?: number | null
  classes_attended?: number | null
  overall_score?: number | null
  theory_score?: number | null
  practical_score?: number | null
  problem_solving_score?: number | null
  creativity_score?: number | null
  performance_label?: string | null
  project_url?: string | null
  exam_title?: string | null
  exam_date?: string | null
  tutor_feedback?: string | null
  today_summary?: string | null
}

const StudentDashboard = () => {
  const { slug } = useParams()
  const [data, setData] = useState<StudentResult | null>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!slug) return

    const fetchStudentResult = async () => {
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from('student_results')
          .select('*')
          .eq('slug', slug)
          .single()

        if (profileErr) throw profileErr
        setData(profileData)
      } catch (err) {
        console.error(
          'Data Matrix load failure:',
          err instanceof Error ? err.message : String(err),
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchStudentResult()
  }, [slug])

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.currentTarget.files?.[0]
      if (!file || !data?.id) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${data.id}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('student-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('student-assets').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('student_results')
        .update({ avatar_url: publicUrl })
        .eq('id', data.id)

      if (updateError) throw updateError

      setData({ ...data, avatar_url: publicUrl })
      alert('Profile picture updated!')
    } catch (err) {
      alert(
        'Upload error: ' + (err instanceof Error ? err.message : String(err)),
      )
    } finally {
      setUploading(false)
    }
  }

  const handleShareDashboard = async () => {
    if (!data) return

    const shareData = {
      title: `${data.student_name}'s Coding Dashboard`,
      text: `Check out ${data.student_name}'s latest projects and coding milestones at Tech Talk Hub!`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        alert('Dashboard link copied to clipboard for easy sharing!')
      }
    } catch (err) {
      console.warn('Sharing canceled or failed', err)
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

  const totalAllocated = data.total_classes_allocated || 12
  const attended = data.classes_attended || 0
  const remainingClasses = totalAllocated - attended

  const milestoneTarget = totalAllocated
  const rawProgressPercent = Math.min(
    100,
    Math.round((attended / milestoneTarget) * 100),
  )

  const projectUrl = data.project_url

  /* ================= MAIN DASHBOARD VIEW ================= */
  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-gray-50 pb-20 font-sans shadow-2xl print:bg-white print:shadow-none">
      {/* 1. HEADER SECTION */}
      <div className="rounded-b-3xl border-b border-gray-100 bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={() => void handleShareDashboard()}
            className="ml-auto flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
          >
            <Share2 size={14} /> Share Report
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="group relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-indigo-100 shadow-inner">
              {data.avatar_url && data.avatar_url.trim() !== '' ? (
                <img
                  key={data.avatar_url}
                  src={data.avatar_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = ''
                  }}
                />
              ) : (
                <User size={40} className="text-indigo-500" />
              )}
            </div>
            <label className="absolute right-0 bottom-0 cursor-pointer rounded-full bg-indigo-600 p-1.5 text-white shadow-lg transition-transform hover:scale-110 print:hidden">
              <Camera size={14} />
              <input
                type="file"
                className="hidden"
                onChange={(e) => void handleAvatarChange(e)}
                disabled={uploading}
                accept="image/*"
              />
            </label>
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
            {remainingClasses > 0
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
                {totalAllocated}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
              <span className="block text-xs font-semibold text-emerald-600">
                Attended
              </span>
              <span className="text-lg font-black text-emerald-700">
                {attended}
              </span>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5">
              <span className="block text-xs font-semibold text-indigo-600">
                Remaining
              </span>
              <span className="text-lg font-black text-indigo-700">
                {remainingClasses}
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
