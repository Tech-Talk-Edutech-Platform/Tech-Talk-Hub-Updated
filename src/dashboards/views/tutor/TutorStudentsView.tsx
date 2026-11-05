import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Search,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  Unlock,
  Lock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import { toast } from 'react-hot-toast'

export default function TutorStudentsView({ userId }) {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Multi-course support state
  const [studentCourses, setStudentCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')

  const [studentPhases, setStudentPhases] = useState([])
  const [studentAttempts, setStudentAttempts] = useState([])
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set())
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [unlockingLessonId, setUnlockingLessonId] = useState(null)

  // Sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Track collapsed state per phase (auto-collapsed if complete)
  const [collapsedPhases, setCollapsedPhases] = useState({})

  // Track expanded lesson details inline view for notes & quizzes
  const [expandedLessonId, setExpandedLessonId] = useState(null)
  const [lessonContentMap, setLessonContentMap] = useState({})

  useEffect(() => {
    const fetchAssignedStudents = async () => {
      if (!userId) return
      setLoadingStudents(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('assigned_tutor_id', userId)
          .eq('role', 'student')

        if (error) throw error
        setStudents(data || [])
        if (data && data.length > 0) {
          setSelectedStudent(data[0])
        }
      } catch (err) {
        console.error('Error fetching assigned students:', err)
      } finally {
        setLoadingStudents(false)
      }
    }

    fetchAssignedStudents()
  }, [userId])

  // Fetch student's enrolled courses when selectedStudent changes
  useEffect(() => {
    const fetchStudentCourses = async () => {
      if (!selectedStudent?.id) {
        setStudentCourses([])
        setSelectedCourseId('')
        return
      }

      try {
        // 1. Fetch from student_enrollments
        const { data: enrollments, error } = await supabase
          .from('student_enrollments')
          .select('course_id, courses(id, title, thumbnail_url)')
          .eq('student_id', selectedStudent.id)

        if (error) throw error

        let enrolledCourses = (enrollments || [])
          .map((e) => e.courses)
          .filter(Boolean)

        // 2. Fallback to assigned_course_id if enrollments are empty
        if (
          enrolledCourses.length === 0 &&
          selectedStudent.assigned_course_id
        ) {
          const { data: courseData } = await supabase
            .from('courses')
            .select('id, title, thumbnail_url')
            .eq('id', selectedStudent.assigned_course_id)
            .maybeSingle()

          if (courseData) {
            enrolledCourses = [courseData]
          }
        }

        setStudentCourses(enrolledCourses)
        if (enrolledCourses.length > 0) {
          setSelectedCourseId(enrolledCourses[0].id)
        } else {
          setSelectedCourseId('')
          setStudentPhases([])
        }
      } catch (err) {
        console.error('Error loading student courses:', err)
        setStudentCourses([])
        setSelectedCourseId('')
      }
    }

    fetchStudentCourses()
  }, [selectedStudent])

  // Fetch academic data (progress, syllabus, quiz attempts) when selectedStudent or selectedCourseId changes
  useEffect(() => {
    const fetchStudentAcademicData = async () => {
      if (!selectedStudent?.id || !selectedCourseId) {
        setStudentPhases([])
        return
      }

      setLoadingData(true)
      setExpandedLessonId(null)
      try {
        const { data: progressData } = await supabase
          .from('student_lesson_progress')
          .select('lesson_id, status')
          .eq('student_id', selectedStudent.id)
          .eq('status', 'completed')

        const completedSet = new Set(
          (progressData || []).map((p) => p.lesson_id),
        )
        setCompletedLessonIds(completedSet)

        const { data: phaseData } = await supabase
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
              position
            )
          `,
          )
          .eq('course_id', selectedCourseId)
          .order('phase_number', { ascending: true })

        const { data: quizzesData } = await supabase
          .from('quizzes')
          .select('id, title, passing_score, lesson_id')
          .eq('course_id', selectedCourseId)

        const enrichedPhases = (phaseData || []).map((phase) => ({
          ...phase,
          course_lessons: (phase.course_lessons || []).map((lesson) => ({
            ...lesson,
            quiz:
              (quizzesData || []).find((q) => q.lesson_id === lesson.id) ||
              null,
          })),
        }))

        setStudentPhases(enrichedPhases)

        const initialCollapseState = {}
        enrichedPhases.forEach((phase) => {
          const lessons = phase.course_lessons || []
          const allComplete =
            lessons.length > 0 && lessons.every((l) => completedSet.has(l.id))
          initialCollapseState[phase.id] = allComplete
        })
        setCollapsedPhases(initialCollapseState)

        const { data: attemptsData } = await supabase
          .from('student_quiz_attempts')
          .select('*')
          .eq('student_id', selectedStudent.id)
          .order('completed_at', { ascending: false })

        setStudentAttempts(attemptsData || [])
      } catch (err) {
        console.error('Error fetching student academic data:', err)
      } finally {
        setLoadingData(false)
      }
    }

    fetchStudentAcademicData()
  }, [selectedStudent, selectedCourseId])

  const handleLessonClick = async (lessonId, isUnlocked) => {
    if (!isUnlocked) {
      toast.error('Lesson is locked. Unlock it first to inspect content.')
      return
    }

    if (expandedLessonId === lessonId) {
      setExpandedLessonId(null)
      return
    }

    setExpandedLessonId(lessonId)

    if (lessonContentMap[lessonId]) return

    try {
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('lesson_id', lessonId)
        .maybeSingle()

      const { data: quizData } = await supabase
        .from('quizzes')
        .select('id, title, passing_score')
        .eq('lesson_id', lessonId)
        .maybeSingle()

      let questions = []
      if (quizData?.id) {
        const { data: qData } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizData.id)
          .order('position', { ascending: true })
        questions = qData || []
      }

      setLessonContentMap((prev) => ({
        ...prev,
        [lessonId]: {
          notes: notesData || null,
          quiz: quizData || null,
          questions: questions,
        },
      }))
    } catch (err) {
      console.error('Error loading lesson details:', err)
      toast.error('Failed to load lesson notes/quiz.')
    }
  }

  const handleToggleLock = async (
    lessonId,
    isCurrentlyCompleted,
    phaseId,
    lessonsInPhase,
  ) => {
    setUnlockingLessonId(lessonId)
    try {
      const newStatus = isCurrentlyCompleted ? 'in_progress' : 'completed'

      const { error } = await supabase.from('student_lesson_progress').upsert(
        {
          student_id: selectedStudent.id,
          lesson_id: lessonId,
          status: newStatus,
          completed_at: isCurrentlyCompleted ? null : new Date().toISOString(),
        },
        { onConflict: 'student_id,lesson_id' },
      )

      if (error) throw error

      const nextCompletedSet = new Set(completedLessonIds)
      if (isCurrentlyCompleted) {
        nextCompletedSet.delete(lessonId)
      } else {
        nextCompletedSet.add(lessonId)
      }
      setCompletedLessonIds(nextCompletedSet)

      const allNowComplete =
        lessonsInPhase.length > 0 &&
        lessonsInPhase.every((l) => nextCompletedSet.has(l.id))
      if (allNowComplete) {
        setCollapsedPhases((prev) => ({ ...prev, [phaseId]: true }))
      }

      toast.success(
        isCurrentlyCompleted
          ? 'Lesson locked successfully!'
          : 'Lesson manually unlocked & marked complete!',
      )
    } catch (err) {
      console.error('Toggle lock error:', err)
      toast.error('Failed to update lesson status: ' + err.message)
    } finally {
      setUnlockingLessonId(null)
    }
  }

  const togglePhaseCollapse = (phaseId) => {
    setCollapsedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }))
  }

  const filteredStudents = students.filter(
    (student) =>
      (student.full_name || student.name)
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          My Students & Curriculum Breakdown
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review student progress, inspect notes and quizzes on unlocked
          lessons, and manage access locks.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Sidebar Container */}
        <div
          className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-20 px-3 lg:col-span-1' : 'lg:col-span-4'} relative space-y-4 rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5`}
        >
          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-6 z-10 flex hidden h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-white shadow-md transition-colors hover:bg-purple-700 lg:flex"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>

          {!isSidebarCollapsed && (
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-3.5 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-xs font-medium focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
              />
            </div>
          )}

          {loadingStudents ? (
            <div className="py-12 text-center text-xs text-gray-400">
              {!isSidebarCollapsed && 'Loading students...'}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              {!isSidebarCollapsed && 'No assigned students found.'}
            </div>
          ) : (
            <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudent?.id === student.id
                const studentName =
                  student.full_name || student.name || 'Student'
                const avatarImg =
                  student.avatar_url ||
                  student.user_metadata?.avatar_url ||
                  student.picture

                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    title={studentName}
                    className={`flex w-full items-center rounded-2xl p-2.5 transition-all ${
                      isSidebarCollapsed ? 'justify-center' : 'gap-3 text-left'
                    } ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5'
                    }`}
                  >
                    {avatarImg ? (
                      <img
                        src={avatarImg}
                        alt={studentName}
                        className={`h-9 w-9 shrink-0 rounded-xl border object-cover ${isSelected ? 'border-white/40' : 'border-purple-500/20'}`}
                      />
                    ) : (
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-50 text-purple-600'
                        }`}
                      >
                        {studentName[0] || <User size={16} />}
                      </div>
                    )}

                    {!isSidebarCollapsed && (
                      <div className="overflow-hidden">
                        <h4 className="truncate text-sm font-bold">
                          {studentName}
                        </h4>
                        <p
                          className={`truncate text-[10px] ${isSelected ? 'text-purple-100' : 'text-gray-400'}`}
                        >
                          {student.email}
                        </p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Main Curriculum Content Area */}
        <div
          className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:col-span-11' : 'lg:col-span-8'} space-y-6`}
        >
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Course Selection Tabs for Student */}
              {studentCourses.length > 0 && (
                <div className="scrollbar-none flex items-center gap-3 overflow-x-auto pb-2">
                  {studentCourses.map((course) => {
                    const isSelected = selectedCourseId === course.id
                    return (
                      <button
                        key={course.id}
                        onClick={() => setSelectedCourseId(course.id)}
                        className={`flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-600 text-white shadow-md shadow-purple-500/20'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-purple-500/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200'
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
              )}

              {loadingData ? (
                <div className="rounded-[32px] border border-gray-100 bg-white p-12 text-center text-xs text-gray-400 dark:border-white/10 dark:bg-white/5">
                  Loading student curriculum data...
                </div>
              ) : studentPhases.length === 0 ? (
                <div className="rounded-[32px] border border-gray-100 bg-white p-12 text-center dark:border-white/10 dark:bg-white/5">
                  <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-bold text-gray-500">
                    No course assigned or syllabus found for this track.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentPhases.map((phase) => {
                    const lessons = phase.course_lessons || []
                    const isPhaseComplete =
                      lessons.length > 0 &&
                      lessons.every((l) => completedLessonIds.has(l.id))
                    const isCollapsed = !!collapsedPhases[phase.id]

                    return (
                      <div
                        key={phase.id}
                        className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/5">
                          <div className="flex items-center gap-2.5">
                            {isPhaseComplete && (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                                <CheckCircle2 size={14} />
                              </div>
                            )}
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                                Phase {phase.phase_number}
                              </span>
                              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                                {phase.title}
                              </h4>
                            </div>
                          </div>

                          <button
                            onClick={() => togglePhaseCollapse(phase.id)}
                            className="flex items-center gap-1 rounded-xl bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-400 transition-all hover:text-purple-600 dark:bg-white/5"
                          >
                            {isCollapsed ? (
                              <>
                                <span>Expand</span> <ChevronDown size={14} />
                              </>
                            ) : (
                              <>
                                <span>Collapse</span> <ChevronUp size={14} />
                              </>
                            )}
                          </button>
                        </div>

                        {!isCollapsed && (
                          <div className="space-y-3 pt-1">
                            {lessons.map((lesson, lessonIdx, lessonsArray) => {
                              const isCompleted = completedLessonIds.has(
                                lesson.id,
                              )
                              const prevLesson =
                                lessonIdx > 0
                                  ? lessonsArray[lessonIdx - 1]
                                  : null
                              const isUnlocked =
                                lessonIdx === 0 ||
                                (prevLesson &&
                                  completedLessonIds.has(prevLesson.id))

                              const quiz = lesson.quiz
                              const attempt = quiz
                                ? studentAttempts.find(
                                    (a) => a.quiz_id === quiz.id,
                                  )
                                : null

                              const isExpanded = expandedLessonId === lesson.id
                              const lessonDetails = lessonContentMap[lesson.id]

                              return (
                                <div
                                  key={lesson.id}
                                  className={`rounded-xl border bg-gray-50/60 p-3.5 transition-all dark:bg-white/[0.02] ${
                                    !isUnlocked
                                      ? 'border-dashed border-gray-300 opacity-60 dark:border-white/10'
                                      : 'border-gray-200/60 dark:border-white/5'
                                  }`}
                                >
                                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <div
                                      onClick={() =>
                                        handleLessonClick(lesson.id, isUnlocked)
                                      }
                                      className={`flex-1 space-y-1 ${isUnlocked ? 'group cursor-pointer' : 'cursor-not-allowed'}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isCompleted ? (
                                          <CheckCircle2
                                            size={16}
                                            className="shrink-0 text-emerald-500"
                                          />
                                        ) : isUnlocked ? (
                                          <AlertCircle
                                            size={16}
                                            className="shrink-0 text-amber-500 transition-colors group-hover:text-purple-600"
                                          />
                                        ) : (
                                          <Lock
                                            size={16}
                                            className="shrink-0 text-gray-400"
                                          />
                                        )}
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900 transition-colors group-hover:text-purple-600 dark:text-white">
                                          {lesson.title}{' '}
                                          {!isUnlocked && '(Locked)'}
                                          {isUnlocked && (
                                            <span className="text-[10px] font-normal text-purple-500 underline">
                                              (
                                              {isExpanded
                                                ? 'Hide Content'
                                                : 'View Notes & Quiz'}
                                              )
                                            </span>
                                          )}
                                        </span>
                                      </div>

                                      {quiz ? (
                                        <p className="pl-6 text-[11px] text-gray-500 dark:text-gray-400">
                                          Quiz:{' '}
                                          <span className="font-semibold">
                                            {quiz.title}
                                          </span>{' '}
                                          —{' '}
                                          {attempt ? (
                                            <span
                                              className={
                                                attempt.passed
                                                  ? 'font-bold text-emerald-600'
                                                  : 'font-bold text-rose-600'
                                              }
                                            >
                                              Score: {attempt.score}% (
                                              {attempt.passed
                                                ? 'Passed'
                                                : 'Failed'}
                                              )
                                            </span>
                                          ) : (
                                            <span className="italic text-gray-400">
                                              Not attempted yet
                                            </span>
                                          )}
                                        </p>
                                      ) : (
                                        <p className="pl-6 text-[11px] italic text-gray-400">
                                          No quiz attached
                                        </p>
                                      )}
                                    </div>

                                    <button
                                      onClick={() =>
                                        handleToggleLock(
                                          lesson.id,
                                          isCompleted,
                                          phase.id,
                                          lessons,
                                        )
                                      }
                                      disabled={unlockingLessonId === lesson.id}
                                      className={`flex shrink-0 items-center gap-1.5 self-end rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-all disabled:opacity-50 sm:self-center ${
                                        isCompleted
                                          ? 'border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                                          : 'bg-purple-600 text-white hover:bg-purple-700'
                                      }`}
                                    >
                                      {isCompleted ? (
                                        <Lock size={13} />
                                      ) : (
                                        <Unlock size={13} />
                                      )}
                                      {unlockingLessonId === lesson.id
                                        ? 'Updating...'
                                        : isCompleted
                                          ? 'Lock Lesson'
                                          : 'Unlock Lesson'}
                                    </button>
                                  </div>

                                  {isUnlocked && isExpanded && (
                                    <div className="animate-fade-in mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-white/10">
                                      {!lessonDetails ? (
                                        <div className="py-6 text-center text-xs text-gray-400">
                                          Loading lesson content...
                                        </div>
                                      ) : (
                                        <>
                                          <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
                                            <h5 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-purple-600">
                                              <FileText size={14} /> Lesson
                                              Notes Content
                                            </h5>
                                            {lessonDetails.notes ? (
                                              <div className="space-y-2">
                                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                  {lessonDetails.notes.title}
                                                </p>
                                                <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 dark:bg-white/5 dark:text-gray-300">
                                                  {lessonDetails.notes
                                                    .content ||
                                                    'No detailed text content provided.'}
                                                </p>
                                                {lessonDetails.notes
                                                  .video_url && (
                                                  <a
                                                    href={
                                                      lessonDetails.notes
                                                        .video_url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-purple-600 hover:underline"
                                                  >
                                                    <ExternalLink size={12} />{' '}
                                                    Watch Video Material
                                                  </a>
                                                )}
                                              </div>
                                            ) : (
                                              <p className="text-xs italic text-gray-400">
                                                No notes uploaded for this
                                                lesson.
                                              </p>
                                            )}
                                          </div>

                                          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-white/5">
                                            <h5 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-pink-600">
                                              <HelpCircle size={14} /> Attached
                                              Quiz & Questions (
                                              {lessonDetails.questions.length})
                                            </h5>
                                            {lessonDetails.quiz ? (
                                              <div className="space-y-3">
                                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                  {lessonDetails.quiz.title}{' '}
                                                  (Passing Score:{' '}
                                                  {
                                                    lessonDetails.quiz
                                                      .passing_score
                                                  }
                                                  %)
                                                </p>
                                                {lessonDetails.questions
                                                  .length > 0 ? (
                                                  <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
                                                    {lessonDetails.questions.map(
                                                      (q, idx) => (
                                                        <div
                                                          key={q.id}
                                                          className="space-y-1.5 rounded-xl bg-gray-50 p-3 text-xs dark:bg-white/5"
                                                        >
                                                          <p className="font-bold text-gray-900 dark:text-white">
                                                            Q{idx + 1}.{' '}
                                                            {q.question_text}
                                                          </p>
                                                          <div className="grid grid-cols-1 gap-1.5 pl-3 sm:grid-cols-2">
                                                            {Array.isArray(
                                                              q.options,
                                                            ) &&
                                                              q.options.map(
                                                                (
                                                                  opt,
                                                                  optIdx,
                                                                ) => (
                                                                  <span
                                                                    key={optIdx}
                                                                    className={`rounded-lg border p-1.5 text-[11px] ${
                                                                      optIdx ===
                                                                      q.correct_option_index
                                                                        ? 'border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-600'
                                                                        : 'border-gray-200 text-gray-600 dark:border-white/10 dark:text-gray-400'
                                                                    }`}
                                                                  >
                                                                    {optIdx + 1}
                                                                    . {opt}{' '}
                                                                    {optIdx ===
                                                                      q.correct_option_index &&
                                                                      '✓'}
                                                                  </span>
                                                                ),
                                                              )}
                                                          </div>
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                ) : (
                                                  <p className="text-xs italic text-gray-400">
                                                    No questions added to this
                                                    quiz yet.
                                                  </p>
                                                )}
                                              </div>
                                            ) : (
                                              <p className="text-xs italic text-gray-400">
                                                No quiz attached to this lesson.
                                              </p>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[32px] border border-gray-100 bg-white p-16 text-center dark:border-white/10 dark:bg-white/5">
              <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-bold text-gray-500">
                Select a student
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
