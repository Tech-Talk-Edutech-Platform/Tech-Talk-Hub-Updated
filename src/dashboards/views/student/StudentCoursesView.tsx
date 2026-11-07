import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Layers,
  AlertCircle,
  FileText,
  Sparkles,
  Clock,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '../../../supabase'
import { toast } from 'react-hot-toast'
import { quizOptions } from '../../../lib/quiz'

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
  instructions?: string | null
}

interface QuizQuestion {
  id: string
  question_text: string
  correct_option_index: number
  options: string[]
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

const HOMEWORK_STATUSES = [
  'pending',
  'submitted',
  'needs_revision',
  'completed',
] as const

type HomeworkStats = Record<(typeof HOMEWORK_STATUSES)[number], number>

interface Syllabus {
  phases: CoursePhase[]
  openPhases: Record<string, boolean>
  firstLesson: Lesson | null
}

interface StudentWorkspace {
  courses: Course[]
  completedIds: Set<string | null>
  syllabus: Syllabus | null
}

interface LessonQuizState {
  quiz: LessonQuiz | null
  result: QuizResult | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/** The plain text inside a markdown node, e.g. a heading's title. */
function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return ''
}

const LESSON_SECTION_STYLES: Record<string, string> = {
  'Byte Explains': 'bg-rose-500 border-rose-200 bg-rose-50/50 text-rose-500',
  'Byte Shows You': 'bg-blue-500 border-blue-200 bg-blue-50/50 text-blue-500',
  'Byte Asks': 'bg-amber-500 border-amber-200 bg-amber-50/50 text-amber-500',
  'Remember This':
    'bg-emerald-500 border-emerald-200 bg-emerald-50/50 text-emerald-500',
}

function LessonSectionHeading({ children }: { children?: ReactNode }) {
  const title = textOf(children)
  const isByteAsks = title === 'Byte Asks'

  const currentStyle =
    LESSON_SECTION_STYLES[title] ||
    'bg-purple-500 border-gray-200 bg-gray-50 text-purple-500'
  const [badgeBg, borderColor, boxBg] = currentStyle.split(' ')

  return (
    <div
      className={`my-6 rounded-2xl border ${borderColor} ${boxBg} p-5 dark:border-white/10 dark:bg-white/2`}
    >
      <h2
        className={`${badgeBg} mb-3 inline-flex rounded-r-full px-4 py-2 text-sm font-black text-white uppercase shadow-xs`}
      >
        {title}
      </h2>
      {isByteAsks && (
        <textarea
          aria-label={title}
          placeholder="Type your answer here..."
          className="mt-2 min-h-[120px] w-full rounded-xl border border-amber-200 bg-white p-4 text-sm text-gray-900 outline-hidden focus:ring-2 focus:ring-amber-400 dark:bg-white/4 dark:text-white"
        />
      )}
    </div>
  )
}

function LessonParagraph({ children }: { children?: ReactNode }) {
  return (
    <p className="mb-4 text-base leading-7 text-gray-700 dark:text-gray-300">
      {children}
    </p>
  )
}

const LESSON_MARKDOWN_COMPONENTS: Components = {
  h2: LessonSectionHeading,
  p: LessonParagraph,
}

const LESSON_REMARK_PLUGINS = [remarkGfm]

function LessonRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={LESSON_REMARK_PLUGINS}
      components={LESSON_MARKDOWN_COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  )
}

async function loadAssignedCourses(userId: string): Promise<Course[]> {
  const { data: enrollments, error: enrollError } = await supabase
    .from('student_enrollments')
    .select('course_id, courses (*)')
    .eq('student_id', userId)

  if (enrollError) throw enrollError

  const enrolledCourses = enrollments.flatMap((enrollment) =>
    enrollment.courses ? [enrollment.courses] : [],
  )
  if (enrolledCourses.length > 0) return enrolledCourses

  // No enrollments: fall back to the course assigned directly on the user
  const { data: userData } = await supabase
    .from('users')
    .select('assigned_course_id, courses:assigned_course_id (*)')
    .eq('id', userId)
    .single()

  return userData?.courses ? [userData.courses] : []
}

async function loadCompletedLessonIds(
  userId: string,
): Promise<Set<string | null>> {
  try {
    const { data: progressData, error } = await supabase
      .from('student_lesson_progress')
      .select('lesson_id, status')
      .eq('student_id', userId)
      .eq('status', 'completed')

    if (error) throw error
    return new Set(progressData.map((p) => p.lesson_id))
  } catch (err) {
    console.error('Error fetching progress:', getErrorMessage(err))
    return new Set()
  }
}

async function loadSyllabus(
  courseId: string,
  completedIds: Set<string | null>,
): Promise<Syllabus> {
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
    .eq('course_id', courseId)
    .order('phase_number', { ascending: true })

  if (error) throw error

  const { data: notesData } = await supabase
    .from('notes')
    .select('*')
    .eq('course_id', courseId)

  const phases: CoursePhase[] = phaseData.map((phase) => ({
    id: phase.id,
    phase_number: phase.phase_number,
    title: phase.title,
    focus: phase.focus,
    course_lessons: phase.course_lessons
      .toSorted((a, b) => (a.position || 0) - (b.position || 0))
      .map((lesson) => {
        const matchingNote = (notesData || []).find(
          (n) =>
            n.lesson_id === lesson.id ||
            (n.title && n.title.toLowerCase() === lesson.title.toLowerCase()),
        )
        return {
          id: lesson.id,
          title: lesson.title,
          position: lesson.position,
          created_at: lesson.created_at,
          content: matchingNote?.content || '',
          video_url: matchingNote?.video_url || '',
        }
      }),
  }))

  const activePhase =
    phases.find((phase) =>
      phase.course_lessons.some((lesson) => !completedIds.has(lesson.id)),
    ) || phases[0]

  const openPhases: Record<string, boolean> = {}
  for (const phase of phases) {
    openPhases[phase.id] = phase.id === activePhase?.id
  }

  const firstLesson =
    activePhase?.course_lessons.find((l) => !completedIds.has(l.id)) ||
    activePhase?.course_lessons[0] ||
    null

  return { phases, openPhases, firstLesson }
}

async function loadStudentWorkspace(userId: string): Promise<StudentWorkspace> {
  const courses = await loadAssignedCourses(userId)
  const defaultCourse = courses[0]
  if (!defaultCourse) {
    return { courses, completedIds: new Set(), syllabus: null }
  }

  const completedIds = await loadCompletedLessonIds(userId)
  let syllabus: Syllabus | null = null
  try {
    syllabus = await loadSyllabus(defaultCourse.id, completedIds)
  } catch (err) {
    console.error('Error fetching syllabus:', getErrorMessage(err))
  }
  return { courses, completedIds, syllabus }
}

/** Counts the student's homework by status; `null` when it can't be loaded. */
async function loadHomeworkStats(
  userId: string,
): Promise<HomeworkStats | null> {
  try {
    const { data, error } = await supabase
      .from('student_assignments')
      .select('status')
      .eq('student_id', userId)

    if (error) throw error

    const stats: HomeworkStats = {
      pending: 0,
      submitted: 0,
      needs_revision: 0,
      completed: 0,
    }
    for (const item of data) {
      const status = HOMEWORK_STATUSES.find(
        (known) => known === (item.status || 'pending'),
      )
      if (status) stats[status]++
    }
    return stats
  } catch (err) {
    console.error('Error fetching homework stats:', getErrorMessage(err))
    return null
  }
}

async function loadLessonAssignment(
  userId: string,
  lessonId: string,
): Promise<LessonAssignment | null> {
  try {
    const { data, error } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error fetching lesson homework:', getErrorMessage(err))
    return null
  }
}

async function loadLessonQuiz(
  userId: string,
  lessonId: string,
): Promise<LessonQuizState> {
  try {
    const { data: quizData, error: qErr } = await supabase
      .from('quizzes')
      .select('*, quiz_questions(*)')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (qErr) throw qErr
    if (!quizData) return { quiz: null, result: null }

    const quiz: LessonQuiz = {
      id: quizData.id,
      passing_score: quizData.passing_score,
      quiz_questions: quizData.quiz_questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        correct_option_index: q.correct_option_index,
        options: quizOptions(q.options),
      })),
    }

    const { data: attempts, error: attErr } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .eq('student_id', userId)
      .eq('quiz_id', quizData.id)
      .order('completed_at', { ascending: false })

    const latestAttempt = attErr ? undefined : attempts[0]
    return {
      quiz,
      result: latestAttempt
        ? {
            score: latestAttempt.score,
            passed: latestAttempt.passed,
            attemptsCount: attempts?.length ?? 0,
          }
        : null,
    }
  } catch (err) {
    console.error('Error fetching lesson data:', getErrorMessage(err))
    return { quiz: null, result: null }
  }
}

export default function StudentCoursesView({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [activeCourse, setActiveCourse] = useState<Course | null>(null)

  // Structured Phase -> Lessons state
  const [phases, setPhases] = useState<CoursePhase[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [completedLessonIds, setCompletedLessonIds] = useState<
    Set<string | null>
  >(() => new Set())

  // Track open/collapsed phases by phase ID
  const [openPhases, setOpenPhases] = useState<
    Record<string, boolean | undefined>
  >({})

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

  // Overall student homework stats for sidebar
  const [homeworkStats, setHomeworkStats] = useState<HomeworkStats>({
    pending: 0,
    submitted: 0,
    needs_revision: 0,
    completed: 0,
  })

  const selectedLessonId = selectedLesson?.id

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false

    loadStudentWorkspace(userId).then(
      (workspace) => {
        if (cancelled) return
        setCourses(workspace.courses)
        setActiveCourse(workspace.courses[0] ?? null)
        setCompletedLessonIds(workspace.completedIds)
        if (workspace.syllabus) {
          setPhases(workspace.syllabus.phases)
          setOpenPhases(workspace.syllabus.openPhases)
          setSelectedLesson(workspace.syllabus.firstLesson)
        }
        setLoading(false)
      },
      (err: unknown) => {
        console.error('Error fetching student data:', getErrorMessage(err))
        if (!cancelled) setLoading(false)
      },
    )

    void loadHomeworkStats(userId).then((stats) => {
      if (!cancelled && stats) setHomeworkStats(stats)
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  // Load the quiz and homework for the selected lesson
  useEffect(() => {
    if (!selectedLessonId) return undefined
    let cancelled = false

    void loadLessonQuiz(userId, selectedLessonId).then(({ quiz, result }) => {
      if (cancelled) return
      setLessonQuiz(quiz)
      setQuizResult(result)
    })

    void loadLessonAssignment(userId, selectedLessonId).then((assignment) => {
      if (cancelled) return
      setLessonAssignment(assignment)
      setSubmissionText(assignment?.submission_link || '')
    })

    return () => {
      cancelled = true
    }
  }, [userId, selectedLessonId])

  // Countdown timer checker for Saturday retakes
  useEffect(() => {
    if (!quizResult || quizResult.passed) return undefined

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

  /** Switches lessons, clearing the previous lesson's quiz and homework. */
  const selectLesson = (lesson: Lesson | null) => {
    if (lesson?.id !== selectedLessonId) {
      setLessonQuiz(null)
      setQuizAnswers({})
      setQuizResult(null)
      setCanRetakeQuiz(true)
      setRetakeCountdown('')
      setLessonAssignment(null)
      setSubmissionText('')
    }
    setSelectedLesson(lesson)
  }

  const refreshHomeworkStats = async () => {
    const stats = await loadHomeworkStats(userId)
    if (stats) setHomeworkStats(stats)
  }

  const showCourseSyllabus = async (targetCourseId: string) => {
    try {
      const syllabus = await loadSyllabus(targetCourseId, completedLessonIds)
      setPhases(syllabus.phases)
      setOpenPhases(syllabus.openPhases)
      setSelectedLesson(syllabus.firstLesson)
    } catch (err) {
      console.error('Error fetching syllabus:', getErrorMessage(err))
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
    const hasQuiz = lessonQuiz && lessonQuiz.quiz_questions.length > 0
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
      void markLessonComplete(selectedLesson.id)
    }
  }

  const handleQuizSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!lessonQuiz) return

    setSubmittingQuiz(true)
    try {
      const questions = lessonQuiz.quiz_questions
      const correctCount = questions.filter(
        (q, idx) => quizAnswers[idx] === q.correct_option_index,
      ).length

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
      }

      setLessonAssignment(updatedAssignment)
      void refreshHomeworkStats()
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
    selectLesson(null)
    setActiveCourse(course)
    void showCourseSyllabus(course.id)
  }

  const togglePhaseAccordion = (phaseId: string) => {
    setOpenPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }))
  }

  const isPhaseCompleted = (phase: CoursePhase) => {
    if (phase.course_lessons.length === 0) return false
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
    <div className="mx-auto max-w-7xl space-y-6 p-4 text-gray-900 md:p-8 dark:text-white">
      {courses.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex scrollbar-none items-center gap-3 overflow-x-auto pb-2">
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
            <span className="flex items-center gap-1.5 text-xs font-black tracking-wider text-gray-500 uppercase dark:text-gray-400">
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
                      <span className="text-xs font-bold tracking-widest text-white/70 uppercase">
                        Course Track
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                  <h2 className="absolute right-4 bottom-3 left-4 line-clamp-1 text-base font-black text-white">
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
                    const isOpen = openPhases[phase.id] ?? false
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
                              <span className="text-[10px] font-black tracking-wider text-purple-600 uppercase dark:text-purple-400">
                                Phase {phase.phase_number}
                              </span>
                              <h4 className="line-clamp-1 text-xs font-bold text-gray-900 md:text-sm dark:text-white">
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
                                  onClick={() => selectLesson(lesson)}
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
              <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-xl backdrop-blur-2xl md:p-8 dark:border-white/10 dark:bg-white/4">
                {selectedLesson ? (
                  <div>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black tracking-wider text-purple-600 uppercase dark:text-purple-400">
                          Active Lesson
                        </span>
                        <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-3xl dark:text-white">
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
                          {/* oxlint-disable-next-line react/iframe-missing-sandbox -- admin-entered video embeds (YouTube etc.) need scripts and same-origin storage to play, which a sandbox would block */}
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
                        <div className="space-y-6 rounded-2xl border border-gray-200/60 bg-gray-50/80 p-6 md:p-8 dark:border-white/5 dark:bg-white/2">
                          <div className="prose max-w-none text-sm leading-relaxed md:text-base dark:prose-invert">
                            <LessonRenderer content={selectedLesson.content} />
                          </div>
                        </div>
                      )}

                      {/* Quiz Section */}
                      {lessonQuiz &&
                        lessonQuiz.quiz_questions &&
                        lessonQuiz.quiz_questions.length > 0 && (
                          <div className="space-y-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 md:p-8 dark:bg-purple-500/2">
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
                              onSubmit={(e) => void handleQuizSubmit(e)}
                              className="space-y-6"
                            >
                              {lessonQuiz.quiz_questions.map((q, qIdx) => (
                                <div
                                  key={q.id}
                                  className="space-y-3 rounded-xl border border-gray-200/50 bg-white p-5 dark:border-white/5 dark:bg-white/4"
                                >
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {qIdx + 1}. {q.question_text}
                                  </p>
                                  <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                      <label
                                        // oxlint-disable-next-line react/no-array-index-key -- a question's options are a fixed list that is never reordered, so the position is the option's identity
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
                        <div className="space-y-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 md:p-8 dark:bg-blue-500/2">
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
                              {lessonAssignment.instructions ||
                                lessonAssignment.description ||
                                'Complete the assigned task and submit your link or code repository below.'}
                            </p>

                            <form
                              onSubmit={(e) => void handleSubmitHomework(e)}
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
