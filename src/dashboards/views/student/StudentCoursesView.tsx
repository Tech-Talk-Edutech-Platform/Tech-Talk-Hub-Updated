import React, { useEffect, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Circle,
  Layers,
  AlertCircle,
  FileText,
  Sparkles,
  Lock,
  Clock,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { FormEvent } from 'react'
import { supabase } from '../../../supabase'
import { toast } from 'react-hot-toast'

interface Course {
  id: string
  title: string
  thumbnail_url?: string | null
}

interface Lesson {
  id: string
  title: string
  position?: number | null
  created_at?: string | null
  content?: string | null
  video_url?: string | null
}

interface CoursePhase {
  id: string
  phase_number: number | null
  title: string
  focus?: string | null
  course_lessons: Lesson[]
}

interface LessonAssignment {
  id: string
  status: string | null
  submission_link?: string | null
  description?: string | null
  instruction?: string | null
}

interface QuizQuestion {
  id: string
  question_text: string
  correct_option_index: number
  options?: string[]
}

interface LessonQuiz {
  id: string
  passing_score?: number | null
  quiz_questions: QuizQuestion[]
}

interface QuizResult {
  score: number
  passed: boolean
  attemptsCount: number
}

interface HomeworkStats {
  pending: number
  submitted: number
  needs_revision: number
  completed: number
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function LessonRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => {
          const title = String(children)
          const isByteAsks = title === 'Byte Asks'

          const styles: Record<string, string> = {
            'Byte Explains':
              'bg-rose-500 border-rose-200 bg-rose-50/50 text-rose-500',
            'Byte Shows You':
              'bg-blue-500 border-blue-200 bg-blue-50/50 text-blue-500',
            'Byte Asks':
              'bg-amber-500 border-amber-200 bg-amber-50/50 text-amber-500',
            'Remember This':
              'bg-emerald-500 border-emerald-200 bg-emerald-50/50 text-emerald-500',
          }

          const currentStyle =
            styles[title] ||
            'bg-purple-500 border-gray-200 bg-gray-50 text-purple-500'
          const [badgeBg, borderColor, boxBg] = currentStyle.split(' ')

          return (
            <div
              className={`my-6 rounded-2xl border ${borderColor} ${boxBg} p-5 dark:border-white/10 dark:bg-white/2`}
            >
              <h2
                className={`${badgeBg} mb-3 inline-flex rounded-r-full px-4 py-2 text-sm font-black uppercase text-white shadow-xs`}
              >
                {title}
              </h2>
              {isByteAsks && (
                <textarea
                  placeholder="Type your answer here..."
                  className="mt-2 min-h-[120px] w-full rounded-xl border border-amber-200 bg-white p-4 text-sm text-gray-900 outline-hidden focus:ring-2 focus:ring-amber-400 dark:bg-white/4 dark:text-white"
                />
              )}
            </div>
          )
        },
        p: ({ children }) => (
          <p className="mb-4 text-base leading-7 text-gray-700 dark:text-gray-300">
            {children}
          </p>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default function StudentCoursesView({
  userId,
  courseId,
}: {
  userId: string
  courseId?: string | null
}) {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [activeCourse, setActiveCourse] = useState<Course | null>(null)

  // Structured Phase -> Lessons state
  const [phases, setPhases] = useState<CoursePhase[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [completedLessonIds, setCompletedLessonIds] = useState<
    Set<string | null>
  >(new Set())

  // Track open/collapsed phases by phase ID
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({})

  // Quiz state for active lesson
  const [lessonQuiz, setLessonQuiz] = useState<LessonQuiz | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [submittingQuiz, setSubmittingQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [canRetakeQuiz, setCanRetakeQuiz] = useState(true)
  const [retakeCountdown, setRetakeCountdown] = useState('')

  // Homework state for active lesson
  const [lessonAssignment, setLessonAssignment] =
    useState<LessonAssignment | null>(null)
  const [submissionText, setSubmissionText] = useState('')
  const [submittingHomework, setSubmittingHomework] = useState(false)
  const [homeworkOpen, setHomeworkOpen] = useState(false)

  // Overall student homework stats for sidebar
  const [homeworkStats, setHomeworkStats] = useState<HomeworkStats>({
    pending: 0,
    submitted: 0,
    needs_revision: 0,
    completed: 0,
  })

  useEffect(() => {
    if (userId) {
      initialLoad()
      fetchHomeworkStats()
    }
  }, [userId, courseId])

  useEffect(() => {
    if (selectedLesson) {
      setLessonQuiz(null)
      setQuizAnswers({})
      setQuizResult(null)
      setCanRetakeQuiz(true)
      setRetakeCountdown('')
      setLessonAssignment(null)
      setSubmissionText('')
      setHomeworkOpen(false)

      fetchLessonData(selectedLesson.id)
      fetchLessonHomework(selectedLesson.id)
    }
  }, [selectedLesson?.id])

  // Countdown timer checker for Saturday retakes
  useEffect(() => {
    if (!quizResult || quizResult.passed) return

    const updateCountdown = () => {
      const now = new Date()
      // Calculate next Saturday at 12:00 PM (12:00)
      const target = new Date()
      const dayOfWeek = now.getDay() // 0 is Sunday, 6 is Saturday
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7

      target.setDate(now.getDate() + daysUntilSaturday)
      target.setHours(12, 0, 0, 0)

      // If today is Saturday and it's past 12 PM, target next Saturday
      if (dayOfWeek === 6 && now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 7)
      }

      const diff = target.getTime() - now.getTime()
      if (diff <= 0) {
        setCanRetakeQuiz(true)
        setRetakeCountdown('')
      } else {
        setCanRetakeQuiz(false)
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((diff / 1000 / 60) % 60)
        const seconds = Math.floor((diff / 1000) % 60)
        setRetakeCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [quizResult])

  const initialLoad = async () => {
    try {
      setLoading(true)

      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('course_id, courses (*)')
        .eq('student_id', userId)

      if (enrollError) throw enrollError

      const enrollmentRows = (enrollments || []) as Array<{
        courses: Course | Course[] | null
      }>
      let assignedCourses: Course[] = enrollmentRows.flatMap((enrollment) => {
        if (!enrollment.courses) return []
        return Array.isArray(enrollment.courses)
          ? enrollment.courses
          : [enrollment.courses]
      })

      if (assignedCourses.length === 0) {
        const { data: userData } = await supabase
          .from('users')
          .select('assigned_course_id, courses:assigned_course_id (*)')
          .eq('id', userId)
          .single()

        if (userData?.courses) {
          const assignedCourse = userData.courses as Course | Course[]
          assignedCourses = Array.isArray(assignedCourse)
            ? assignedCourse
            : [assignedCourse]
        }
      }

      setCourses(assignedCourses)

      const defaultCourse = assignedCourses[0] || null
      setActiveCourse(defaultCourse)

      if (defaultCourse) {
        const completedIds = await fetchLessonProgress()
        await fetchCourseSyllabus(defaultCourse.id, completedIds)
      }
    } catch (err) {
      console.error('Error fetching student data:', getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const fetchHomeworkStats = async () => {
    try {
      const { data, error } = await supabase
        .from('student_assignments')
        .select('status')
        .eq('student_id', userId)

      if (error) throw error

      const stats = {
        pending: 0,
        submitted: 0,
        needs_revision: 0,
        completed: 0,
      }

      ;(data || []).forEach((item) => {
        const status = item.status || 'pending'
        if (status in stats) {
          stats[status as keyof HomeworkStats]++
        } else if (status === 'pending') {
          stats.pending++
        }
      })

      setHomeworkStats(stats)
    } catch (err) {
      console.error('Error fetching homework stats:', getErrorMessage(err))
    }
  }

  const fetchLessonProgress = async (): Promise<Set<string | null>> => {
    try {
      const { data: progressData, error } = await supabase
        .from('student_lesson_progress')
        .select('lesson_id, status')
        .eq('student_id', userId)
        .eq('status', 'completed')

      if (error) throw error

      const completedSet = new Set(progressData.map((p) => p.lesson_id))
      setCompletedLessonIds(completedSet)
      return completedSet
    } catch (err) {
      console.error('Error fetching progress:', getErrorMessage(err))
      return new Set()
    }
  }

  const fetchCourseSyllabus = async (
    targetCourseId: string,
    completedIds: Set<string | null> = completedLessonIds,
  ) => {
    try {
      const { data: phaseData, error } = await supabase
        .from('course_phases')
        .select(
          `
          id,
          phase_number,
          title,
          focus,
          course_lessons (
            id,
            title,
            position,
            created_at
          )
        `,
        )
        .eq('course_id', targetCourseId)
        .order('phase_number', { ascending: true })

      if (error) throw error

      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('course_id', targetCourseId)

      const structuredPhases = (phaseData || []).map((phase) => ({
        ...phase,
        course_lessons: (phase.course_lessons || [])
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map((lesson) => {
            const matchingNote = (notesData || []).find(
              (n) =>
                n.lesson_id === lesson.id ||
                (n.title &&
                  n.title.toLowerCase() === lesson.title.toLowerCase()),
            )
            return {
              ...lesson,
              content: matchingNote?.content || '',
              video_url: matchingNote?.video_url || '',
            }
          }),
      }))

      setPhases(structuredPhases)

      const activePhase =
        structuredPhases.find((phase) =>
          phase.course_lessons?.some((lesson) => !completedIds.has(lesson.id)),
        ) || structuredPhases[0]

      const initialOpenState: Record<string, boolean> = {}
      structuredPhases.forEach((p) => {
        initialOpenState[p.id] = p.id === activePhase?.id
      })

      setOpenPhases(initialOpenState)

      const firstIncompleteLesson =
        activePhase?.course_lessons?.find((l) => !completedIds.has(l.id)) ||
        activePhase?.course_lessons?.[0] ||
        null

      setSelectedLesson(firstIncompleteLesson)
    } catch (err) {
      console.error('Error fetching syllabus:', getErrorMessage(err))
    }
  }

  const fetchLessonHomework = async (lessonId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('student_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (error) throw error
      setLessonAssignment(data || null)
      setSubmissionText(data?.submission_link || '')
    } catch (err) {
      console.error('Error fetching lesson homework:', getErrorMessage(err))
    }
  }

  const fetchLessonData = async (lessonId: string) => {
    try {
      const { data: quizData, error: qErr } = await supabase
        .from('quizzes')
        .select('*, quiz_questions(*)')
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (qErr) throw qErr
      setLessonQuiz(quizData || null)

      if (quizData) {
        const { data: attempts, error: attErr } = await supabase
          .from('student_quiz_attempts')
          .select('*')
          .eq('student_id', userId)
          .eq('quiz_id', quizData.id)
          .order('completed_at', { ascending: false })

        if (!attErr && attempts && attempts.length > 0) {
          const latestAttempt = attempts[0]
          setQuizResult({
            score: latestAttempt.score,
            passed: latestAttempt.passed,
            attemptsCount: attempts.length,
          })
        }
      }
    } catch (err) {
      console.error('Error fetching lesson data:', getErrorMessage(err))
      setLessonQuiz(null)
    }
  }

  const markLessonComplete = async (lessonId: string) => {
    try {
      const { error } = await supabase.from('student_lesson_progress').upsert(
        {
          student_id: userId,
          lesson_id: lessonId,
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,lesson_id' },
      )

      if (error) throw error

      setCompletedLessonIds((prev) => {
        const next = new Set(prev)
        next.add(lessonId)
        return next
      })
      toast.success(
        'Lesson automatically marked complete! 🎉 Please wait for your teacher to unlock the next lesson.',
      )
    } catch (err) {
      console.error('Error marking lesson complete:', getErrorMessage(err))
    }
  }

  const checkAndAutoComplete = (
    currentQuizPassed: QuizResult | null,
    currentHomeworkSubmitted: LessonAssignment | null,
  ) => {
    if (!selectedLesson) return
    const hasQuiz =
      lessonQuiz &&
      lessonQuiz.quiz_questions &&
      lessonQuiz.quiz_questions.length > 0
    const quizPassed =
      !hasQuiz || (currentQuizPassed && currentQuizPassed.passed)

    const hasHomework = lessonAssignment !== null
    const homeworkSubmitted =
      !hasHomework ||
      (currentHomeworkSubmitted &&
        (currentHomeworkSubmitted.status === 'submitted' ||
          currentHomeworkSubmitted.status === 'completed'))

    if (
      quizPassed &&
      homeworkSubmitted &&
      !completedLessonIds.has(selectedLesson.id)
    ) {
      markLessonComplete(selectedLesson.id)
    }
  }

  const handleQuizSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!lessonQuiz || !lessonQuiz.quiz_questions) return

    setSubmittingQuiz(true)
    try {
      const questions = lessonQuiz.quiz_questions
      let correctCount = 0

      questions.forEach((q, idx) => {
        if (quizAnswers[idx] === q.correct_option_index) {
          correctCount++
        }
      })

      const score = Math.round((correctCount / questions.length) * 100)
      const passingScore = lessonQuiz.passing_score || 70
      const passed = score >= passingScore

      await supabase.from('student_quiz_attempts').insert({
        student_id: userId,
        quiz_id: lessonQuiz.id,
        score,
        passed,
      })

      const newResult = {
        score,
        passed,
        attemptsCount: (quizResult?.attemptsCount || 0) + 1,
      }
      setQuizResult(newResult)

      if (passed) {
        toast.success(`Quiz Passed! You got ${score}% 🎉`)
        checkAndAutoComplete(newResult, lessonAssignment)
      } else {
        toast.error(
          `You got ${score}%. Assessment failed. Grade is recorded until Saturday 6 PM retake.`,
        )
      }
    } catch (err) {
      toast.error('Failed to submit quiz: ' + getErrorMessage(err))
    } finally {
      setSubmittingQuiz(false)
    }
  }

  const handleSubmitHomework = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!lessonAssignment) return

    try {
      setSubmittingHomework(true)
      const timestamp = new Date().toISOString()

      const { error } = await supabase
        .from('student_assignments')
        .update({
          submission_link: submissionText,
          status: 'submitted',
          updated_at: timestamp,
          submitted_at: timestamp,
        })
        .eq('id', lessonAssignment.id)

      if (error) throw error

      const updatedAssignment = {
        ...lessonAssignment,
        submission_link: submissionText,
        status: 'submitted',
        submitted_at: timestamp,
        updated_at: timestamp,
      }

      setLessonAssignment(updatedAssignment)
      fetchHomeworkStats()
      toast.success('Homework submitted successfully! 🎉')

      checkAndAutoComplete(quizResult, updatedAssignment)
    } catch (err) {
      console.error('Error submitting homework:', getErrorMessage(err))
      toast.error('Failed to submit homework. Please try again.')
    } finally {
      setSubmittingHomework(false)
    }
  }

  const handleSelectCourse = (course: Course) => {
    setOpenPhases({})
    setSelectedLesson(null)
    setActiveCourse(course)
    fetchCourseSyllabus(course.id)
  }

  const togglePhaseAccordion = (phaseId: string) => {
    setOpenPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }))
  }

  const isPhaseCompleted = (phase: CoursePhase) => {
    if (!phase.course_lessons || phase.course_lessons.length === 0) return false
    return phase.course_lessons.every((lesson) =>
      completedLessonIds.has(lesson.id),
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-[30px] border border-gray-200 bg-white/10 p-8 text-center shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/4">
          <div className="mx-auto mb-5 h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Loading Learning Workspace...
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Fetching your interactive curriculum 🚀
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 text-gray-900 dark:text-white md:p-8">
      {courses.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="scrollbar-none flex items-center gap-3 overflow-x-auto pb-2">
            {courses.map((course) => {
              const isSelected = activeCourse?.id === course.id
              return (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className={`flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-500/40 dark:border-white/10 dark:bg-white/4 dark:text-gray-200'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-purple-500/20 text-xs font-bold">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BookOpen
                        size={16}
                        className={
                          isSelected ? 'text-white' : 'text-purple-500'
                        }
                      />
                    )}
                  </div>
                  <span className="max-w-[180px] truncate text-sm font-bold">
                    {course.title}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-white/4">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <FileText size={14} className="text-blue-500" /> Homework:
            </span>
            <div className="flex items-center gap-3 text-center">
              <div>
                <p className="text-[9px] font-medium text-gray-400">Pending</p>
                <p className="text-xs font-black text-orange-500">
                  {homeworkStats.pending}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium text-gray-400">
                  Submitted
                </p>
                <p className="text-xs font-black text-blue-500">
                  {homeworkStats.submitted}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium text-gray-400">Revision</p>
                <p className="text-xs font-black text-amber-500">
                  {homeworkStats.needs_revision}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium text-gray-400">Done</p>
                <p className="text-xs font-black text-emerald-500">
                  {homeworkStats.completed}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="rounded-[32px] border border-gray-200 bg-white p-12 text-center shadow-lg dark:border-white/10 dark:bg-white/4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-2xl font-bold text-purple-500">
            🎓
          </div>
          <h3 className="text-xl font-bold">No Registered Courses Found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            You are not currently enrolled in any active courses. Please contact
            your administrator or instructor.
          </p>
        </div>
      ) : (
        activeCourse && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-4 lg:flex lg:max-h-[calc(100vh-120px)] lg:flex-col">
              <div className="shrink-0 overflow-hidden rounded-[28px] border border-gray-200 bg-white p-5 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/4">
                <div className="relative mb-4 flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-purple-600 to-indigo-700">
                  {activeCourse.thumbnail_url ? (
                    <img
                      src={activeCourse.thumbnail_url}
                      alt={activeCourse.title}
                      className="h-full w-full bg-black/20 object-contain"
                    />
                  ) : (
                    <div className="p-4 text-center">
                      <BookOpen
                        size={36}
                        className="mx-auto mb-1 text-white/80"
                      />
                      <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                        Course Track
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                  <h2 className="absolute bottom-3 left-4 right-4 line-clamp-1 text-base font-black text-white">
                    {activeCourse.title}
                  </h2>
                </div>

                <div className="flex items-center justify-between px-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-purple-500" />
                    {phases.length} Phases
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {completedLessonIds.size} Lessons Done
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto rounded-[28px] border border-gray-200 bg-white p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/4">
                <h3 className="flex items-center gap-2 px-2 text-base font-black text-gray-900 dark:text-white">
                  Course Syllabus
                </h3>

                <div className="space-y-2">
                  {phases.map((phase) => {
                    const isOpen = !!openPhases[phase.id]
                    const phaseDone = isPhaseCompleted(phase)

                    return (
                      <div
                        key={phase.id}
                        className="overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-50/50 transition-all dark:border-white/10 dark:bg-white/2"
                      >
                        <button
                          onClick={() => togglePhaseAccordion(phase.id)}
                          className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-purple-500/5"
                        >
                          <div className="flex items-center gap-2.5 pr-2">
                            {phaseDone ? (
                              <CheckCircle2
                                size={18}
                                className="shrink-0 text-emerald-500"
                              />
                            ) : (
                              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-purple-500/40" />
                            )}
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                Phase {phase.phase_number}
                              </span>
                              <h4 className="line-clamp-1 text-xs font-bold text-gray-900 dark:text-white md:text-sm">
                                {phase.title}
                              </h4>
                            </div>
                          </div>

                          {isOpen ? (
                            <ChevronDown
                              size={16}
                              className="shrink-0 text-gray-400"
                            />
                          ) : (
                            <ChevronRight
                              size={16}
                              className="shrink-0 text-gray-400"
                            />
                          )}
                        </button>

                        {isOpen && (
                          <div className="space-y-1.5 border-t border-gray-200/50 p-2 pt-0 dark:border-white/5">
                            {phase.course_lessons?.map((lesson) => {
                              const isSelected =
                                selectedLesson?.id === lesson.id
                              const isDone = completedLessonIds.has(lesson.id)

                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => setSelectedLesson(lesson)}
                                  className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                                    isSelected
                                      ? 'border-transparent bg-purple-600 text-white shadow-md'
                                      : 'border-gray-200/60 bg-white hover:border-purple-500/30 dark:border-white/5 dark:bg-white/3'
                                  }`}
                                >
                                  <div className="flex min-w-0 items-center gap-2 pr-2">
                                    {isDone ? (
                                      <CheckCircle2
                                        size={15}
                                        className={
                                          isSelected
                                            ? 'text-white'
                                            : 'text-emerald-500'
                                        }
                                      />
                                    ) : (
                                      <Circle
                                        size={15}
                                        className={
                                          isSelected
                                            ? 'text-white/70'
                                            : 'text-gray-400'
                                        }
                                      />
                                    )}
                                    <span
                                      className={`truncate text-xs font-bold ${
                                        isSelected
                                          ? 'text-white'
                                          : 'text-gray-800 dark:text-gray-200'
                                      }`}
                                    >
                                      {lesson.title}
                                    </span>
                                  </div>
                                  <ChevronRight
                                    size={13}
                                    className={
                                      isSelected
                                        ? 'text-white/80'
                                        : 'text-gray-400'
                                    }
                                  />
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/4 md:p-8">
                {selectedLesson ? (
                  <div>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Active Lesson
                        </span>
                        <h2 className="mt-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
                          {selectedLesson.title}
                        </h2>
                      </div>

                      <div
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${
                          completedLessonIds.has(selectedLesson.id)
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {completedLessonIds.has(selectedLesson.id) ? (
                          <>
                            <CheckCircle2 size={16} /> Completed (Wait for
                            teacher to unlock next)
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} /> In Progress
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-gray-100 pt-6 dark:border-white/8">
                      {selectedLesson.video_url && (
                        <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-200/20 bg-black shadow-lg dark:border-white/10">
                          <iframe
                            src={selectedLesson.video_url}
                            title="Lesson Video"
                            className="h-full w-full border-0"
                            allowFullScreen
                          />
                        </div>
                      )}

                      {quizResult && (
                        <div
                          className={`flex items-center gap-2.5 rounded-xl border p-4 text-xs font-bold md:text-sm ${
                            quizResult.passed
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {quizResult.passed ? (
                            <span>
                              🎉 You passed! Please wait for your teacher to
                              unlock the next lesson.
                            </span>
                          ) : (
                            <span>
                              ⚠️ You did not pass. Grade recorded. Retakes
                              unlock Saturday at 12:00 PM.
                            </span>
                          )}
                        </div>
                      )}

                      {selectedLesson.content && (
                        <div className="space-y-6 rounded-2xl border border-gray-200/60 bg-gray-50/80 p-6 dark:border-white/5 dark:bg-white/2 md:p-8">
                          <div className="prose max-w-none text-sm leading-relaxed dark:prose-invert md:text-base">
                            <LessonRenderer content={selectedLesson.content} />
                          </div>
                        </div>
                      )}

                      {/* Quiz Section */}
                      {lessonQuiz &&
                        lessonQuiz.quiz_questions &&
                        lessonQuiz.quiz_questions.length > 0 && (
                          <div className="space-y-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 dark:bg-purple-500/2 md:p-8">
                            <div className="flex items-center justify-between">
                              <h3 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
                                <Sparkles
                                  size={18}
                                  className="text-purple-500"
                                />{' '}
                                Lesson Quiz
                              </h3>
                            </div>

                            <form
                              onSubmit={handleQuizSubmit}
                              className="space-y-6"
                            >
                              {lessonQuiz.quiz_questions.map((q, qIdx) => (
                                <div
                                  key={q.id || qIdx}
                                  className="space-y-3 rounded-xl border border-gray-200/50 bg-white p-5 dark:border-white/5 dark:bg-white/4"
                                >
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {qIdx + 1}. {q.question_text}
                                  </p>
                                  <div className="space-y-2">
                                    {q.options?.map((opt, oIdx) => (
                                      <label
                                        key={oIdx}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-xs transition-all md:text-sm ${
                                          quizAnswers[qIdx] === oIdx
                                            ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                                            : 'border-gray-200 bg-gray-50 text-gray-800 hover:border-purple-500/30 dark:border-white/10 dark:bg-white/2 dark:text-gray-200'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`question-${qIdx}`}
                                          checked={quizAnswers[qIdx] === oIdx}
                                          onChange={() =>
                                            setQuizAnswers({
                                              ...quizAnswers,
                                              [qIdx]: oIdx,
                                            })
                                          }
                                          className="hidden"
                                        />
                                        <span
                                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                            quizAnswers[qIdx] === oIdx
                                              ? 'border-white bg-white font-bold text-purple-600'
                                              : 'border-gray-400'
                                          }`}
                                        >
                                          {quizAnswers[qIdx] === oIdx && (
                                            <span className="h-2 w-2 rounded-full bg-purple-600" />
                                          )}
                                        </span>
                                        <span>{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}

                              <button
                                type="submit"
                                disabled={
                                  submittingQuiz ||
                                  (!canRetakeQuiz &&
                                    quizResult !== null &&
                                    !quizResult.passed)
                                }
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-700 disabled:opacity-50"
                              >
                                {submittingQuiz ? (
                                  <>Submitting Quiz...</>
                                ) : !canRetakeQuiz &&
                                  quizResult &&
                                  !quizResult.passed ? (
                                  <>
                                    <Clock size={16} /> Retakes Available in{' '}
                                    {retakeCountdown}
                                  </>
                                ) : (
                                  <>Submit Quiz Assessment</>
                                )}
                              </button>
                            </form>
                          </div>
                        )}

                      {/* Homework Section */}
                      {lessonAssignment && (
                        <div className="space-y-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 dark:bg-blue-500/2 md:p-8">
                          <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
                              <FileText size={18} className="text-blue-500" />{' '}
                              Lesson Homework
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                                lessonAssignment.status === 'completed' ||
                                lessonAssignment.status === 'submitted'
                                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                                  : 'border border-orange-500/20 bg-orange-500/10 text-orange-500'
                              }`}
                            >
                              {lessonAssignment.status}
                            </span>
                          </div>

                          <div className="space-y-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {lessonAssignment.instruction ||
                                lessonAssignment.description ||
                                'Complete the assigned task and submit your link or code repository below.'}
                            </p>

                            <form
                              onSubmit={handleSubmitHomework}
                              className="space-y-4"
                            >
                              <input
                                type="text"
                                placeholder="Paste your submission link (GitHub, CodePen, etc.)"
                                value={submissionText}
                                onChange={(e) =>
                                  setSubmissionText(e.target.value)
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/4 dark:text-white"
                              />

                              <button
                                type="submit"
                                disabled={submittingHomework}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
                              >
                                {submittingHomework
                                  ? 'Submitting Homework...'
                                  : 'Submit Homework'}
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-16 text-center">
                    <BookOpen size={40} className="mx-auto text-gray-400" />
                    <h3 className="text-lg font-bold">Select a Lesson</h3>
                    <p className="mx-auto max-w-sm text-sm text-gray-500 dark:text-gray-400">
                      Choose any lesson from the course syllabus on the left to
                      start viewing its content, video, quiz, and homework.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
