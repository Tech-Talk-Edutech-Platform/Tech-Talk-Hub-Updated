import React, { useEffect, useState } from 'react'
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
  ChevronDown,
  ChevronUp,
  History,
  X,
  HelpCircle,
  ArrowLeft,
  Share2,
  CheckCircle2,
  Printer,
  Trophy,
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
  tutor_feedback?: string | null
  today_summary?: string | null
}

interface StudentExam {
  id: string
  exam_title: string
  exam_date: string
  overall_score: number
  theory_score?: number | null
  practical_score?: number | null
  problem_solving_score?: number | null
  creativity_score?: number | null
  tutor_feedback?: string | null
  questions_and_answers?: Array<{
    question: string
    student_answer?: string | null
    correct_answer?: string | null
  }> | null
}

interface StudentProject {
  id: string
  project_title: string
  project_url: string
}

interface StudentBadge {
  id: string
  badge_icon?: string | null
  badge_title: string
  badge_criteria?: string | null
}

const StudentDashboard = () => {
  const { slug } = useParams()
  const [data, setData] = useState<StudentResult | null>(null)
  const [exams, setExams] = useState<StudentExam[]>([])
  const [projects, setProjects] = useState<StudentProject[]>([])
  const [badges, setBadges] = useState<StudentBadge[]>([])

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showAllProjects, setShowAllProjects] = useState(false)

  const [selectedExamForPrompt, setSelectedExamForPrompt] =
    useState<StudentExam | null>(null)
  const [activeDetailedExam, setActiveDetailedExam] =
    useState<StudentExam | null>(null)

  useEffect(() => {
    fetchCompleteStudentMatrix()
  }, [slug])

  async function fetchCompleteStudentMatrix() {
    if (!slug) return
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('student_results')
        .select('*')
        .eq('slug', slug)
        .single()

      if (profileErr) throw profileErr
      setData(profileData)

      if (profileData) {
        // Fetch exams
        const { data: examData } = await supabase
          .from('student_exams')
          .select('*')
          .eq('student_id', profileData.id)
          .order('exam_date', { ascending: false })
        setExams(examData || [])

        // Fetch projects
        const { data: projectData } = await supabase
          .from('student_projects')
          .select('*')
          .eq('student_id', profileData.id)
          .order('created_at', { ascending: false })
        setProjects(projectData || [])

        // Fetch unlocked milestones/badges
        const { data: badgeData } = await supabase
          .from('student_badges')
          .select('*')
          .eq('student_id', profileData.id)
          .order('unlocked_at', { ascending: false })
        setBadges(badgeData || [])
      }
    } catch (err) {
      console.error(
        'Data Matrix load failure:',
        err instanceof Error ? err.message : String(err),
      )
    } finally {
      setLoading(false)
    }
  }

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
      console.log('Sharing canceled or failed', err)
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

  const latestProject =
    projects[0] ||
    (data.project_url
      ? { project_title: 'Active Core Project', project_url: data.project_url }
      : null)
  const archivedProjects = projects.slice(1)

  const latestExam = exams[0]
  const historicalExams = exams.slice(1)

  const cumulativeAverage =
    exams.length > 0
      ? Math.round(
          exams.reduce((sum, ex) => sum + ex.overall_score, 0) / exams.length,
        )
      : data.overall_score || 0

  const triggerExamPrompt = (exam: StudentExam) => {
    setSelectedExamForPrompt(exam)
  }

  const handleConfirmViewQuestions = () => {
    setActiveDetailedExam(selectedExamForPrompt)
    setSelectedExamForPrompt(null)
  }

  /* ================= DETAILED QUESTIONS & ANSWERS VIEW ================= */
  if (activeDetailedExam) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-20 font-sans shadow-2xl print:bg-white print:shadow-none">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveDetailedExam(null)}
              className="rounded-full p-1 text-gray-600 transition hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="max-w-[200px] truncate text-sm font-extrabold text-gray-800">
                {activeDetailedExam.exam_title}
              </h1>
              <p className="text-[10px] font-medium text-gray-400">
                Questions & Answers Ledger
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            <Printer size={14} /> Print
          </button>
        </div>

        {/* PINNED EXAM SPECIFIC TUTOR FEEDBACK */}
        <div className="p-4">
          <div className="rounded-2xl bg-indigo-600 p-5 text-white shadow-md">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <MessageSquare size={16} /> Exam Specific Tutor Feedback
            </div>
            {/* whitespace-pre-line honors enter key lines precisely */}
            <p className="whitespace-pre-line text-sm font-medium italic leading-relaxed text-indigo-50">
              "
              {activeDetailedExam.tutor_feedback ||
                'No specific feedback logged for this specific exam cycle yet.'}
              "
            </p>
          </div>
        </div>

        <div className="mb-4 px-4">
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Overall Metric
              </span>
              <p className="text-xs font-medium text-gray-500">
                {new Date(activeDetailedExam.exam_date).toDateString()}
              </p>
            </div>
            <div className="text-2xl font-black text-green-500">
              {activeDetailedExam.overall_score}%
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4">
          <h2 className="flex items-center gap-1 px-1 text-xs font-bold uppercase tracking-wide text-gray-800">
            <HelpCircle size={14} className="text-indigo-500" /> Reviewed
            Curriculum Items
          </h2>

          {activeDetailedExam.questions_and_answers &&
          activeDetailedExam.questions_and_answers.length > 0 ? (
            activeDetailedExam.questions_and_answers.map((item, idx) => (
              <div
                key={idx}
                className="break-inside-avoid space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">
                    Q{idx + 1}
                  </span>
                  <p className="text-sm font-bold leading-snug text-gray-800">
                    {item.question}
                  </p>
                </div>
                <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Student Submission
                  </span>
                  <p className="text-xs font-semibold text-gray-700">
                    {item.student_answer || 'No response provided.'}
                  </p>
                </div>
                <div className="space-y-1 rounded-xl border border-emerald-100/70 bg-emerald-50/60 p-3">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                    Correct Reference Matrix
                  </span>
                  <p className="text-xs font-bold text-emerald-800">
                    {item.correct_answer}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-xs font-medium text-gray-400 shadow-sm">
              No digital structural breakdown arrays logged for this sheet.
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ================= MAIN DASHBOARD VIEW ================= */
  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-gray-50 pb-20 font-sans shadow-2xl print:bg-white print:shadow-none">
      {/* 1. HEADER SECTION */}
      <div className="rounded-b-3xl border-b border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <button
            onClick={handleShareDashboard}
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
                  src={`${data.avatar_url}?t=${new Date().getTime()}`}
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
            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-indigo-600 p-1.5 text-white shadow-lg transition-transform hover:scale-110 print:hidden">
              <Camera size={14} />
              <input
                type="file"
                className="hidden"
                onChange={handleAvatarChange}
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
            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-600">
              Active Student
            </span>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC MILESTONE TRACKER */}
      <div className="p-4 pb-0">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <CheckCircle2 size={12} className="text-indigo-500" /> Milestone
              Path
            </span>
            <span className="text-xs font-black text-indigo-600">
              {rawProgressPercent}% Finished
            </span>
          </div>
          <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
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
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-800">
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

      {/* 4. UNLOCKED ACHIEVEMENTS & BADGES RACK */}
      {badges.length > 0 && (
        <div className="mb-2 px-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-800">
              <Trophy size={14} className="text-amber-500" /> Earned Skill
              Badges
            </h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5"
                >
                  <span className="text-base">{badge.badge_icon || '🏆'}</span>
                  <div>
                    <p className="text-xs font-bold leading-none text-gray-800">
                      {badge.badge_title}
                    </p>
                    <p className="mt-0.5 text-[8px] uppercase tracking-tighter text-gray-400">
                      {badge.badge_criteria}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. TODAY'S LESSON SUMMARY */}
      <div className="mb-2 px-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-50 pb-2">
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-500">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-800">
                Today's Class Summary
              </h2>
            </div>
          </div>
          <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-gray-600">
            {data.today_summary ||
              "No specific recap compiled for today's curriculum milestone yet."}
          </p>
        </div>
      </div>

      {/* 6. PROJECT SHOWCASE */}
      {latestProject && (
        <div className="p-4">
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 p-5 text-white shadow-lg">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <Rocket size={18} className="animate-bounce" /> Student Project
            </div>
            <h3 className="mb-3 text-lg font-black">
              See what {data.student_name.split(' ')[0]} built!
            </h3>
            <a
              href={latestProject.project_url}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-black text-orange-600 shadow-md transition-all active:scale-95 print:hidden"
            >
              Launch Project <ExternalLink size={18} />
            </a>

            {archivedProjects.length > 0 && (
              <div className="mt-4 border-t border-white/20 pt-3 print:hidden">
                <button
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-orange-100 transition hover:text-white"
                >
                  <span>View All Projects ({projects.length})</span>
                  {showAllProjects ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
                {showAllProjects && (
                  <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                    {archivedProjects.map((proj) => (
                      <a
                        key={proj.id}
                        href={proj.project_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg bg-white/10 p-2.5 text-xs font-semibold transition hover:bg-white/20"
                      >
                        <span className="max-w-[200px] truncate">
                          {proj.project_title}
                        </span>
                        <ExternalLink
                          size={12}
                          className="flex-shrink-0 opacity-80"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. OVERALL PERFORMANCE */}
      <div className="p-4">
        <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-1.5 px-1 text-sm font-bold uppercase tracking-wide text-gray-800">
            <Award size={15} className="text-green-500" /> Overall Performance
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-[10px] border-green-500">
              <div className="text-center">
                <span className="text-2xl font-black text-gray-800">
                  {cumulativeAverage}%
                </span>
                <p className="text-[8px] font-bold uppercase text-green-500">
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

      {/* 8. LATEST EXAM CARD */}
      <div className="mb-2 px-4">
        <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-gray-800">
          Latest Exam Result
        </h2>
        <div
          onClick={() => triggerExamPrompt(latestExam || data)}
          className="cursor-pointer rounded-2xl border-l-[6px] border-indigo-500 bg-white p-4 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                <Code size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight text-gray-800">
                  {latestExam
                    ? latestExam.exam_title
                    : data.exam_title || 'Initial Setup Profile'}
                </h3>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-gray-400">
                  <Calendar size={12} />{' '}
                  {latestExam?.exam_date
                    ? new Date(latestExam.exam_date).toDateString()
                    : 'Recent'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-green-500">
                {latestExam ? latestExam.overall_score : data.overall_score}%
              </div>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-tighter text-indigo-600 print:hidden">
                View Q&A →
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 9. SKILL BREAKDOWN */}
      <div className="p-4">
        <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-gray-800">
          Section Breakdown
        </h2>
        <div className="space-y-4 rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
          <StatRow
            label="Theory"
            score={latestExam ? latestExam.theory_score : data.theory_score}
            icon={<Code size={16} />}
            color="bg-red-50 text-red-500"
          />
          <StatRow
            label="Practical"
            score={
              latestExam ? latestExam.practical_score : data.practical_score
            }
            icon={<Monitor size={16} />}
            color="bg-blue-50 text-blue-500"
          />
          <StatRow
            label="Logic"
            score={
              latestExam
                ? latestExam.problem_solving_score
                : data.problem_solving_score
            }
            icon={<Lightbulb size={16} />}
            color="bg-yellow-50 text-yellow-500"
          />
          <StatRow
            label="Creative"
            score={
              latestExam ? latestExam.creativity_score : data.creativity_score
            }
            icon={<Star size={16} />}
            color="bg-purple-50 text-purple-500"
          />
        </div>
      </div>

      {/* 10. HISTORICAL EXAMS LEDGER */}
      {historicalExams.length > 0 && (
        <div className="mb-4 space-y-2 px-4">
          <p className="flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <History size={10} /> Previous Grading Records
          </p>
          {historicalExams.map((ex) => (
            <div
              key={ex.id}
              onClick={() => triggerExamPrompt(ex)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 opacity-85 shadow-sm transition hover:opacity-100"
            >
              <div>
                <h4 className="text-xs font-bold text-gray-700">
                  {ex.exam_title}
                </h4>
                <span className="block text-[9px] font-medium text-gray-400">
                  {new Date(ex.exam_date).toLocaleDateString()}
                </span>
              </div>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-black text-slate-500">
                {ex.overall_score}%
              </span>
            </div>
          ))}
        </div>
      )}
      {/* 10. BEAUTIFIED EXAMS LEDGER */}
      <div className="mb-4 px-4">
        <h2 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-bold uppercase tracking-wide text-gray-800">
          <History size={15} className="text-indigo-500" /> All Exam Results
        </h2>
        <div className="space-y-3">
          {exams.map((ex) => (
            <div
              key={ex.id}
              onClick={() => triggerExamPrompt(ex)}
              className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-indigo-200"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800">
                    {ex.exam_title}
                  </h4>
                  <p className="text-[10px] font-medium text-gray-400">
                    {new Date(ex.exam_date).toDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-sm font-black text-emerald-600">
                  {ex.overall_score}%
                </span>
                <span className="text-[9px] font-bold uppercase text-gray-400">
                  Score
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 11. GLOBAL TUTOR FEEDBACK */}
      <div className="px-4">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl" />

          <div className="mb-3.5 flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-indigo-300">
            <MessageSquare size={16} className="text-indigo-400" />
            <span>Instructor Feedback Notes</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner backdrop-blur-sm">
            {/* Added whitespace-pre-line to render user paragraph wraps/breaks perfectly */}
            <p className="whitespace-pre-line text-sm font-medium italic leading-relaxed tracking-tight text-slate-100">
              "
              {data.tutor_feedback ||
                'No structural feedback summary compiled for this phase yet.'}
              "
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300/70">
            <span>Verified Academic Snaplog</span>
            <span className="rounded-md border border-indigo-400/20 bg-indigo-500/20 px-2 py-0.5 text-indigo-200">
              Tech Talk Hub
            </span>
          </div>
        </div>
      </div>

      {/* ================= CONFIRMATION MODAL ================= */}
      {selectedExamForPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <HelpCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-800">
                Review Exam Sheet?
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Are you sure you want to view the questions and reference
                answers for{' '}
                <span className="font-bold text-gray-700">
                  "{selectedExamForPrompt.exam_title}"
                </span>
                ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setSelectedExamForPrompt(null)}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmViewQuestions}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md"
              >
                OK, Show Me
              </button>
            </div>
          </div>
        </div>
      )}
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
        <span className="text-xs font-bold uppercase tracking-tighter text-gray-600">
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
