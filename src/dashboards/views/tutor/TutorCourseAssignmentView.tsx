import React, { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../../supabase'
import { toast } from 'react-hot-toast'
import {
  BookOpen,
  CheckCircle2,
  User,
  Layers,
  Send,
  AlertCircle,
  Award,
  FileCode2,
  ExternalLink,
} from 'lucide-react'

interface Student {
  id: string
  full_name: string | null
  assigned_course_id?: string | null
}

interface Course {
  id: string
  title: string
}

interface Lesson {
  id: string
  title: string
  position?: number | null
  phase_number: number | null
}

interface StudentAssignment {
  id: string
  task_name: string
  status: string | null
  description?: string | null
  submission_link?: string | null
  submitted_at?: string | null
  tutor_feedback?: string | null
  grade?: string | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default function TutorCourseAssignmentView({
  userId,
}: {
  userId: string
}) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [studentCourses, setStudentCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([])
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [taskName, setTaskName] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [studentAssignments, setStudentAssignments] = useState<
    StudentAssignment[]
  >([])
  const [loading, setLoading] = useState(false)

  // Track currently active expanded task for bottom review panel
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  useEffect(() => {
    fetchTutorStudents()
  }, [userId])

  const fetchTutorStudents = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, assigned_course_id')
      .eq('assigned_tutor_id', userId)
      .eq('role', 'student')

    if (error) {
      toast.error('Failed to load students.')
    } else {
      setStudents(data || [])
    }
  }

  const fetchStudentCourses = async (studentId: string) => {
    try {
      const { data: enrollments, error } = await supabase
        .from('student_enrollments')
        .select('course_id, courses(id, title)')
        .eq('student_id', studentId)

      if (error) throw error

      let enrolledCourses = (enrollments || []).flatMap((enrollment) => {
        const relation = enrollment.courses as Course | Course[] | null
        if (!relation) return []
        return Array.isArray(relation) ? relation : [relation]
      })

      if (enrolledCourses.length === 0) {
        const student = students.find((s) => s.id === studentId)
        if (student?.assigned_course_id) {
          const { data: courseData } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', student.assigned_course_id)
            .maybeSingle()

          if (courseData) {
            enrolledCourses = [courseData]
          }
        }
      }

      setStudentCourses(enrolledCourses)
      if (enrolledCourses.length > 0) {
        const firstCourseId = enrolledCourses[0].id
        setSelectedCourse(firstCourseId)
        fetchCourseLessons(firstCourseId, studentId)
      } else {
        setSelectedCourse('')
        setCourseLessons([])
      }
    } catch (err) {
      console.error('Error loading student courses:', getErrorMessage(err))
      setStudentCourses([])
    }
  }

  const fetchCourseLessons = async (courseId: string, studentId: string) => {
    try {
      const { data: phaseData, error: phaseError } = await supabase
        .from('course_phases')
        .select(
          `
          id,
          phase_number,
          title,
          course_lessons (
            id,
            title,
            position
          )
        `,
        )
        .eq('course_id', courseId)
        .order('phase_number', { ascending: true })

      if (phaseError) throw phaseError

      const { data: progressData, error: progressError } = await supabase
        .from('student_lesson_progress')
        .select('lesson_id')
        .eq('student_id', studentId)
        .eq('status', 'completed')

      if (progressError) throw progressError

      const completedIds = new Set((progressData || []).map((p) => p.lesson_id))

      const allLessons: Lesson[] = []
      ;(phaseData || []).forEach((phase) => {
        const sortedLessons = (phase.course_lessons || []).sort(
          (a, b) => (a.position || 0) - (b.position || 0),
        )
        sortedLessons.forEach((lesson) => {
          allLessons.push({
            ...lesson,
            phase_number: phase.phase_number,
          })
        })
      })

      const eligibleLessons = allLessons.filter((lesson, index) => {
        const isCompleted = completedIds.has(lesson.id)
        if (isCompleted) return false

        const prevLesson = index > 0 ? allLessons[index - 1] : null
        const isUnlocked =
          index === 0 || (prevLesson && completedIds.has(prevLesson.id))

        return isUnlocked
      })

      setCourseLessons(eligibleLessons)
    } catch (err) {
      console.error('Error loading eligible lessons:', getErrorMessage(err))
      setCourseLessons([])
    }
  }

  const handleStudentChange = async (studentId: string) => {
    setSelectedStudent(studentId)
    setSelectedLessonId('')
    setSelectedTaskId(null)

    if (studentId) {
      await fetchStudentCourses(studentId)
      await fetchStudentAssignments(studentId)
    } else {
      setStudentCourses([])
      setSelectedCourse('')
      setCourseLessons([])
      setStudentAssignments([])
    }
  }

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId)
    setSelectedLessonId('')
    if (selectedStudent && courseId) {
      await fetchCourseLessons(courseId, selectedStudent)
    } else {
      setCourseLessons([])
    }
  }

  const fetchStudentAssignments = async (studentId: string) => {
    const { data, error } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (!error) {
      const tasks = data || []
      setStudentAssignments(tasks)
      if (tasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(tasks[0].id)
      }
    }
  }

  const handleReviewTask = async (taskId: string, newStatus = 'completed') => {
    const task = studentAssignments.find((a) => a.id === taskId)
    if (!task) return

    setLoading(true)

    const { error } = await supabase
      .from('student_assignments')
      .update({
        tutor_feedback: task.tutor_feedback,
        grade: task.grade,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    setLoading(false)

    if (error) {
      toast.error('Failed to save review.')
      return
    }

    toast.success(
      newStatus === 'completed'
        ? 'Assignment marked as completed! 🎉'
        : 'Requested revisions from student.',
    )
    fetchStudentAssignments(selectedStudent)
  }

  const handleCreateTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (
      !selectedStudent ||
      !taskName.trim() ||
      !taskDescription.trim() ||
      !selectedLessonId
    ) {
      toast.error('Please fill in all required fields.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('student_assignments').insert([
      {
        tutor_id: userId,
        student_id: selectedStudent,
        lesson_id: selectedLessonId,
        task_name: taskName,
        description: taskDescription,
        status: 'pending',
      },
    ])

    setLoading(false)

    if (error) {
      toast.error('Failed to create assignment task.')
    } else {
      toast.success('Assignment task dispatched successfully! 🚀')
      setTaskName('')
      setTaskDescription('')
      setSelectedLessonId('')
      fetchStudentAssignments(selectedStudent)
    }
  }

  const activeTask = studentAssignments.find((a) => a.id === selectedTaskId)
  const isFormValid = Boolean(
    selectedStudent &&
    selectedCourse &&
    selectedLessonId &&
    taskName.trim() &&
    taskDescription.trim(),
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 text-gray-900 dark:text-white md:p-6">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden rounded-[35px] border border-purple-500/20 bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-slate-900/50 p-6 shadow-2xl backdrop-blur-2xl dark:from-purple-950/60 dark:via-indigo-950/40 dark:to-slate-950/80 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 bg-purple-500/10 blur-[120px]" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-300">
              <FileCode2 size={15} className="text-purple-500" />
              TUTOR DISPATCH WORKSPACE
            </div>
            <h1 className="bg-gradient-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-3xl font-black text-transparent dark:from-white dark:via-purple-200 dark:to-indigo-300 md:text-4xl">
              Student Homework & Task Control
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Dispatch precision coding tasks to multi-course modules and review
              live student submissions seamlessly.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Dispatch Form */}
        <div className="space-y-6 rounded-[32px] border border-stone-200/80 bg-[#fcfbf9]/90 p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] md:p-8 lg:col-span-5">
          <div className="flex items-center gap-3 border-b border-stone-200/60 pb-4 dark:border-white/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 font-black text-white shadow-md shadow-purple-500/20">
              <Send size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Assign Task</h3>
              <p className="text-xs text-stone-500 dark:text-gray-400">
                Target uncompleted curriculum nodes
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                Select Student
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-[#f7f6f2] p-3.5 text-sm font-medium shadow-inner transition-all focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
              >
                <option value="" className="dark:bg-slate-900">
                  -- Choose Student --
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-900">
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                  Select Student Course
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-[#f7f6f2] p-3.5 text-sm font-medium shadow-inner transition-all focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
                >
                  <option value="" className="dark:bg-slate-900">
                    -- Choose Course --
                  </option>
                  {studentCourses.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="dark:bg-slate-900"
                    >
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                Target Unlocked Lesson
              </label>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                disabled={!selectedCourse}
                className="w-full rounded-2xl border border-stone-200 bg-[#f7f6f2] p-3.5 text-sm font-medium shadow-inner transition-all focus:border-purple-500 focus:outline-none disabled:opacity-40 dark:border-white/10 dark:bg-white/5"
              >
                <option value="" className="dark:bg-slate-900">
                  -- Choose Eligible Lesson --
                </option>
                {courseLessons.map((l) => (
                  <option key={l.id} value={l.id} className="dark:bg-slate-900">
                    Phase {l.phase_number}: {l.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                Task Title
              </label>
              <input
                type="text"
                placeholder="e.g., Build a Python Function"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-[#f7f6f2] p-3.5 text-sm font-medium placeholder-stone-400 shadow-inner transition-all focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                Task Instructions
              </label>
              <textarea
                placeholder="Provide precise execution requirements..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-2xl border border-stone-200 bg-[#f7f6f2] p-3.5 text-sm font-medium placeholder-stone-400 shadow-inner transition-all focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:placeholder-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl transition-all ${
                isFormValid && !loading
                  ? 'scale-[1.01] cursor-pointer bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 shadow-purple-500/25 hover:opacity-95 active:scale-[0.99]'
                  : 'cursor-not-allowed bg-stone-300 text-stone-500 shadow-none dark:bg-white/10 dark:text-gray-400'
              }`}
            >
              <Send size={16} />
              Dispatch Task
            </button>
          </form>
        </div>

        {/* Right Column: Sidebar Task List */}
        <div className="space-y-5 rounded-[32px] border border-stone-200/80 bg-[#fcfbf9]/90 p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] md:p-8 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-stone-200/60 pb-4 dark:border-white/5">
            <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
              <Layers size={18} className="text-purple-500" /> Assigned Task
              Logs
            </h3>
            {selectedStudent && (
              <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-300">
                {studentAssignments.length} Total
              </span>
            )}
          </div>

          {selectedStudent ? (
            studentAssignments.length > 0 ? (
              <div className="scrollbar-none max-h-[480px] space-y-3 overflow-y-auto pr-2">
                {studentAssignments.map((task) => {
                  const isSelected = selectedTaskId === task.id
                  const needsAttention =
                    task.status === 'submitted' || task.status === 'pending'

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`group flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? 'border-2 border-purple-500 bg-transparent shadow-md'
                          : 'border-stone-200/60 bg-[#f7f6f2]/60 hover:border-purple-500/40 dark:border-white/5 dark:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3.5 pr-3">
                        <span
                          className={`h-3 w-3 shrink-0 rounded-full shadow-sm ${
                            needsAttention
                              ? 'animate-pulse bg-red-500 shadow-red-500/50'
                              : 'bg-emerald-500 shadow-emerald-500/50'
                          }`}
                        />
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-bold tracking-tight text-stone-900 dark:text-white">
                            {task.task_name}
                          </h4>
                          <span
                            className={`mt-1 inline-block rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              task.status === 'completed'
                                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                                : task.status === 'submitted'
                                  ? 'border border-blue-500/20 bg-blue-500/10 text-blue-600'
                                  : task.status === 'needs_revision'
                                    ? 'border border-amber-500/20 bg-amber-500/10 text-amber-600'
                                    : 'border border-orange-500/20 bg-orange-500/10 text-orange-600'
                            }`}
                          >
                            {task.status
                              ? task.status.replace('_', ' ')
                              : 'pending'}
                          </span>
                        </div>
                      </div>

                      {needsAttention && (
                        <span className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-500">
                          Review Needed
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2 py-16 text-center text-stone-400 dark:text-gray-400">
                <FileCode2
                  size={36}
                  className="mx-auto text-purple-500 opacity-40"
                />
                <p className="text-sm font-bold">
                  No tasks assigned to this student yet.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-2 py-16 text-center text-stone-400 dark:text-gray-400">
              <User size={36} className="mx-auto text-purple-500 opacity-40" />
              <p className="text-sm font-bold">
                Select a student above to inspect their task timeline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Expanded Review Panel */}
      {activeTask && (
        <div className="animate-fade-in space-y-6 rounded-[32px] border border-stone-200/80 bg-[#fcfbf9]/90 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] md:p-8">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-stone-200/60 pb-5 dark:border-white/5 sm:flex-row sm:items-center">
            <div>
              <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Active Review Stream
              </span>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-stone-900 dark:text-white">
                {activeTask.task_name}
              </h3>
            </div>
            <span
              className={`rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-wider ${
                activeTask.status === 'completed'
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600'
                  : activeTask.status === 'submitted'
                    ? 'border-blue-500/25 bg-blue-500/10 text-blue-600'
                    : activeTask.status === 'needs_revision'
                      ? 'border-amber-500/25 bg-amber-500/10 text-amber-600'
                      : 'border-orange-500/25 bg-orange-500/10 text-orange-600'
              }`}
            >
              {activeTask.status
                ? activeTask.status.replace('_', ' ')
                : 'pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                  Instructions / Brief
                </label>
                <div className="rounded-2xl border border-stone-200/60 bg-[#f7f6f2]/80 p-5 text-sm leading-relaxed text-stone-700 shadow-inner dark:border-white/5 dark:bg-white/[0.02] dark:text-gray-300">
                  {activeTask.description}
                </div>
              </div>

              {activeTask.submission_link && (
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                    Student Deployment / Link
                  </label>
                  <a
                    href={activeTask.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-2 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 text-sm font-bold text-purple-600 transition-all hover:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-400"
                  >
                    <span className="truncate">
                      {activeTask.submission_link}
                    </span>
                    <ExternalLink
                      size={16}
                      className="shrink-0 transition-transform group-hover:scale-110"
                    />
                  </a>
                </div>
              )}

              {activeTask.submitted_at && (
                <p className="text-xs font-medium text-stone-400 dark:text-gray-400">
                  Timestamp:{' '}
                  {new Date(activeTask.submitted_at).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-5 rounded-3xl border border-stone-200/60 bg-[#f7f6f2]/60 p-6 shadow-inner dark:border-white/5 dark:bg-white/[0.02]">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                  Assign Grade
                </label>
                <input
                  type="text"
                  placeholder="e.g., A+, 95%, Mastered..."
                  value={activeTask.grade || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setStudentAssignments((prev) =>
                      prev.map((a) =>
                        a.id === activeTask.id ? { ...a, grade: val } : a,
                      ),
                    )
                  }}
                  className="w-full rounded-2xl border border-stone-200 bg-white p-3.5 text-sm font-medium shadow-inner focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                  Tutor Feedback
                </label>
                <textarea
                  rows={3}
                  placeholder="Write constructive guidance..."
                  value={activeTask.tutor_feedback || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setStudentAssignments((prev) =>
                      prev.map((a) =>
                        a.id === activeTask.id
                          ? { ...a, tutor_feedback: val }
                          : a,
                      ),
                    )
                  }}
                  className="w-full resize-none rounded-2xl border border-stone-200 bg-white p-3.5 text-sm font-medium shadow-inner focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() =>
                    handleReviewTask(activeTask.id, 'needs_revision')
                  }
                  disabled={loading || activeTask.status !== 'submitted'}
                  className="rounded-2xl border border-amber-500/20 bg-amber-500/10 py-3.5 text-xs font-black uppercase tracking-wider text-amber-600 shadow-sm transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-400"
                >
                  Request Revision
                </button>
                <button
                  onClick={() => handleReviewTask(activeTask.id, 'completed')}
                  disabled={loading || activeTask.status !== 'submitted'}
                  className="rounded-2xl bg-emerald-600 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-white/10"
                >
                  Approve & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
