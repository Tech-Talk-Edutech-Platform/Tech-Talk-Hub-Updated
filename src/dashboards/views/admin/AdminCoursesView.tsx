import React, { useEffect, useState } from 'react'
import {
  BookOpen,
  Plus,
  Trash2,
  Layers,
  BookMarked,
  Users,
  GraduationCap,
  X,
  LayoutList,
  Activity,
  CheckCircle2,
  Image as ImageIcon,
  Edit3,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import { toast } from 'react-hot-toast'
import QuizBuilderModal from './QuizBuilderModal'

export default function AdminCoursesView() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // New Course Form State
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDuration, setNewDuration] = useState(0)
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('')

  // Edit Course Cover Modal State
  const [editingCourseCover, setEditingCourseCover] = useState(null)
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('')
  const [updatingCover, setUpdatingCover] = useState(false)

  // Deep Dive Course Details State
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('curriculum') // 'curriculum' or 'students'

  // Creation States inside Modal
  const [newPhaseTitle, setNewPhaseTitle] = useState('')
  const [newLessonTitles, setNewLessonTitles] = useState({}) // { phaseId: 'title' }
  const [creatingPhase, setCreatingPhase] = useState(false)

  // Lesson Detail / Content Modal State (Notes & Quiz Builder)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [lessonContentType, setLessonContentType] = useState('notes') // 'notes' or 'quiz'

  // Lesson Notes Form State
  const [lessonNoteTitle, setLessonNoteTitle] = useState('')
  const [lessonNoteContent, setLessonNoteContent] = useState('')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Lesson Quiz Form State
  const [quizTitle, setQuizTitle] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [questions, setQuestions] = useState([
    { question_text: '', options: ['', '', '', ''], correct_option_index: 0 },
  ])
  const [savingQuiz, setSavingQuiz] = useState(false)

  const [currentView, setCurrentView] = useState('list') // 'list', 'course_details', 'lesson_editor'

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('courses')
        .select(
          `
          *,
          course_phases (
            id,
            course_lessons ( id )
          )
        `,
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: usersData } = await supabase
        .from('users')
        .select('id, role, assigned_course_id')

      const enrichedCourses = (data || []).map((course) => {
        const assignedUsers = (usersData || []).filter(
          (u) => u.assigned_course_id === course.id,
        )
        return {
          ...course,
          student_count: assignedUsers.filter((u) => u.role === 'student')
            .length,
          tutor_count: assignedUsers.filter((u) => u.role === 'tutor').length,
        }
      })

      setCourses(enrichedCourses)
    } catch (err) {
      toast.error('Failed to load courses: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCourseDetails = async (courseId) => {
    try {
      setDetailsLoading(true)

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(
          `
          *,
          course_phases (
            *,
            course_lessons (*)
          )
        `,
        )
        .eq('id', courseId)
        .order('phase_number', {
          referencedTable: 'course_phases',
          ascending: true,
        })
        .single()

      if (courseError) throw courseError

      // Fetch students via enrollments AND direct assignment fallback
      const { data: enrollmentsData } = await supabase
        .from('student_enrollments')
        .select(
          `
          student_id,
          users:student_id (
            id, full_name, email, role,
            student_lesson_progress (lesson_id, status)
          )
        `,
        )
        .eq('course_id', courseId)

      const { data: directUsersData } = await supabase
        .from('users')
        .select(
          `
          id, full_name, email, role, assigned_course_id,
          student_lesson_progress (lesson_id, status)
        `,
        )
        .eq('assigned_course_id', courseId)
        .eq('role', 'student')

      // Merge and deduplicate students from both tables
      const enrolledStudentsMap = new Map()

      ;(enrollmentsData || []).forEach((e) => {
        if (e.users) enrolledStudentsMap.set(e.users.id, e.users)
      })

      ;(directUsersData || []).forEach((u) => {
        if (u) enrolledStudentsMap.set(u.id, u)
      })

      setSelectedCourse({
        ...courseData,
        enrolled_users: Array.from(enrolledStudentsMap.values()),
      })
    } catch (err) {
      toast.error('Failed to load course details: ' + err.message)
    } finally {
      setDetailsLoading(false)
    }
  }
  const fetchLessonExtras = async (lesson) => {
    setSelectedLesson(lesson)
    setLessonContentType('notes')

    // Fetch existing note for this lesson/course if any
    try {
      const { data: noteData } = await supabase
        .from('notes')
        .select('*')
        .eq('course_id', selectedCourse.id)
        .ilike('title', `%${lesson.title}%`)
        .maybeSingle()

      if (noteData) {
        setLessonNoteTitle(noteData.title || lesson.title)
        setLessonNoteContent(noteData.content || '')
        setLessonVideoUrl(noteData.video_url || '')
      } else {
        setLessonNoteTitle(lesson.title)
        setLessonNoteContent('')
        setLessonVideoUrl('')
      }

      // Fetch existing quiz for this phase/course if any
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*, quiz_questions(*)')
        .eq('phase_id', lesson.phase_id)
        .maybeSingle()

      if (quizData) {
        setQuizTitle(quizData.title)
        setPassingScore(quizData.passing_score || 70)
        if (quizData.quiz_questions && quizData.quiz_questions.length > 0) {
          setQuestions(
            quizData.quiz_questions.map((q) => ({
              question_text: q.question_text,
              options: q.options,
              correct_option_index: q.correct_option_index,
            })),
          )
        } else {
          setQuestions([
            {
              question_text: '',
              options: ['', '', '', ''],
              correct_option_index: 0,
            },
          ])
        }
      } else {
        setQuizTitle(`${lesson.title} Assessment`)
        setPassingScore(70)
        setQuestions([
          {
            question_text: '',
            options: ['', '', '', ''],
            correct_option_index: 0,
          },
        ])
      }
    } catch (err) {
      console.error('Error fetching lesson content:', err)
    }
  }

  const handleDeletePhase = async (phaseId) => {
    if (
      !window.confirm(
        'Are you sure? This action will remove this phase and all its dependent lessons, notes, and quizzes.',
      )
    )
      return
    try {
      const { error } = await supabase
        .from('course_phases')
        .delete()
        .eq('id', phaseId)
      if (error) throw error
      toast.success('Phase and dependent data deleted!')
      await fetchCourseDetails(selectedCourse.id)
      fetchCourses()
    } catch (err) {
      toast.error('Failed to delete phase: ' + err.message)
    }
  }

  const handleSaveNotes = async (e) => {
    e.preventDefault()
    if (!selectedLesson || !selectedCourse) return
    setSavingNotes(true)

    try {
      // Check if note already exists for this course and title
      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('course_id', selectedCourse.id)
        .eq('title', lessonNoteTitle.trim() || selectedLesson.title)
        .maybeSingle()

      let error
      if (existing) {
        // Update
        const res = await supabase
          .from('notes')
          .update({
            content: lessonNoteContent,
            video_url: lessonVideoUrl.trim() || null,
          })
          .eq('id', existing.id)
        error = res.error
      } else {
        // Insert new
        const res = await supabase.from('notes').insert([
          {
            course_id: selectedCourse.id,
            title: lessonNoteTitle.trim() || selectedLesson.title,
            content: lessonNoteContent,
            video_url: lessonVideoUrl.trim() || null,
          },
        ])
        error = res.error
      }

      if (error) throw error
      toast.success('Lesson notes & materials saved!')
    } catch (err) {
      console.error('Notes save error:', err)
      toast.error('Failed to save notes: ' + err.message)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSaveQuiz = async (e) => {
    e.preventDefault()
    if (!selectedLesson || !selectedCourse) return
    setSavingQuiz(true)

    try {
      // 1. Check if quiz already exists for this phase
      const { data: existingQuiz } = await supabase
        .from('quizzes')
        .select('id')
        .eq('phase_id', selectedLesson.phase_id)
        .maybeSingle()

      let quizId
      if (existingQuiz) {
        quizId = existingQuiz.id
        const { error: updateErr } = await supabase
          .from('quizzes')
          .update({
            title: quizTitle.trim() || `${selectedLesson.title} Quiz`,
            passing_score: parseInt(passingScore, 10) || 70,
          })
          .eq('id', quizId)
        if (updateErr) throw updateErr
      } else {
        const { data: newQuiz, error: insertErr } = await supabase
          .from('quizzes')
          .insert([
            {
              course_id: selectedCourse.id,
              phase_id: selectedLesson.phase_id,
              title: quizTitle.trim() || `${selectedLesson.title} Quiz`,
              type: 'phase_quiz',
              passing_score: parseInt(passingScore, 10) || 70,
            },
          ])
          .select()
          .single()
        if (insertErr) throw insertErr
        quizId = newQuiz.id
      }

      // 2. Clear old questions for this quiz
      await supabase.from('quiz_questions').delete().eq('quiz_id', quizId)

      // 3. Insert fresh questions
      const formattedQuestions = questions.map((q, idx) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        position: idx + 1,
      }))

      const { error: qError } = await supabase
        .from('quiz_questions')
        .insert(formattedQuestions)
      if (qError) throw qError

      toast.success('Quiz assessment published successfully!')
    } catch (err) {
      console.error('Quiz save error:', err)
      toast.error('Failed to save quiz: ' + err.message)
    } finally {
      setSavingQuiz(false)
    }
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return toast.error('Course title is required')

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            title: newTitle,
            description: newDescription,
            duration_lessons: parseInt(newDuration, 10) || 0,
            thumbnail_url: newThumbnailUrl.trim() || null,
          },
        ])
        .select()
        .single()

      if (error) throw error

      toast.success('Course created successfully!')
      fetchCourses()
      setNewTitle('')
      setNewDescription('')
      setNewDuration(0)
      setNewThumbnailUrl('')
      setIsCreating(false)
    } catch (err) {
      toast.error('Error creating course: ' + err.message)
    }
  }

  const handleUpdateCourseCover = async (e) => {
    e.preventDefault()
    if (!editingCourseCover) return
    setUpdatingCover(true)

    try {
      const { error } = await supabase
        .from('courses')
        .update({ thumbnail_url: editThumbnailUrl.trim() || null })
        .eq('id', editingCourseCover.id)

      if (error) throw error

      toast.success('Course cover updated!')
      setEditingCourseCover(null)
      fetchCourses()
      if (selectedCourse?.id === editingCourseCover.id) {
        setSelectedCourse({
          ...selectedCourse,
          thumbnail_url: editThumbnailUrl.trim() || null,
        })
      }
    } catch (err) {
      toast.error('Failed to update cover image: ' + err.message)
    } finally {
      setUpdatingCover(false)
    }
  }

  const handleDeleteCourse = async (id) => {
    if (
      !window.confirm(
        'Are you sure? This action will remove all linked phases, lessons, and assignments.',
      )
    )
      return
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error
      setCourses(courses.filter((c) => c.id !== id))
      if (selectedCourse?.id === id) setSelectedCourse(null)
      toast.success('Course deleted!')
    } catch (err) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  const handleCreatePhase = async (e) => {
    e.preventDefault()
    if (!newPhaseTitle.trim() || !selectedCourse) return
    setCreatingPhase(true)

    try {
      const nextPhaseNumber = (selectedCourse.course_phases?.length || 0) + 1
      const { error } = await supabase.from('course_phases').insert([
        {
          course_id: selectedCourse.id,
          title: newPhaseTitle.trim(),
          phase_number: nextPhaseNumber,
        },
      ])

      if (error) throw error

      toast.success('Phase added successfully!')
      setNewPhaseTitle('')

      await fetchCourseDetails(selectedCourse.id)
      fetchCourses()
    } catch (err) {
      toast.error('Failed to add phase: ' + err.message)
    } finally {
      setCreatingPhase(false)
    }
  }

  const handleCreateLesson = async (e, phaseId) => {
    e.preventDefault()
    const title = newLessonTitles[phaseId]
    if (!title?.trim()) return

    try {
      const phase = selectedCourse.course_phases.find((p) => p.id === phaseId)
      const position = (phase?.course_lessons?.length || 0) + 1

      const { error } = await supabase
        .from('course_lessons')
        .insert([{ phase_id: phaseId, title: title.trim(), position }])

      if (error) throw error
      toast.success('Lesson added!')
      setNewLessonTitles({ ...newLessonTitles, [phaseId]: '' })
      fetchCourseDetails(selectedCourse.id)
      fetchCourses()
    } catch (err) {
      toast.error('Failed to add lesson: ' + err.message)
    }
  }

  const calculateStudentProgress = (student) => {
    if (!selectedCourse?.course_phases) return 0
    const totalLessons = selectedCourse.course_phases.reduce(
      (acc, phase) => acc + (phase.course_lessons?.length || 0),
      0,
    )
    if (totalLessons === 0) return 0

    const completedLessons =
      student.student_lesson_progress?.filter((p) => p.status === 'completed')
        .length || 0
    return Math.round((completedLessons / totalLessons) * 100)
  }

  const sortedStudents = [...(selectedCourse?.enrolled_users || [])].sort(
    (a, b) => {
      return calculateStudentProgress(b) - calculateStudentProgress(a)
    },
  )

  return (
    <div className="shadow-xs space-y-6 rounded-[32px] border border-slate-100 bg-white p-6 dark:border-white/10 dark:bg-white/5 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <BookOpen className="text-blue-600" /> Curriculum & Course Manager
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-400">
            Manage course tracks, cover images, phases, structured lessons, and
            monitor enrollments.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-blue-700"
        >
          <Plus size={16} /> {isCreating ? 'Cancel' : 'Add Course'}
        </button>
      </div>

      {/* Creation Modal / Inline Drawer */}
      {isCreating && (
        <form
          onSubmit={handleCreateCourse}
          className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5"
        >
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Create New Course Track
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Course Title (e.g., Scratch Masterclass)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold transition-all focus:outline-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              required
            />
            <input
              type="number"
              placeholder="Total Lessons Estimate"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold transition-all focus:outline-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />
            <input
              type="url"
              placeholder="Thumbnail Image URL (https://...)"
              value={newThumbnailUrl}
              onChange={(e) => setNewThumbnailUrl(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold transition-all focus:outline-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <textarea
            placeholder="Course Description..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold transition-all focus:outline-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            rows={2}
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700"
          >
            Save Course
          </button>
        </form>
      )}

      {/* List of Courses */}
      {loading ? (
        <div className="p-12 text-center font-bold text-slate-400">
          Loading curriculum data...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const phaseCount = course.course_phases?.length || 0
            const totalLessons = course.course_phases?.reduce(
              (acc, p) => acc + (p.course_lessons?.length || 0),
              0,
            )

            return (
              <div
                key={course.id}
                onClick={() => {
                  fetchCourseDetails(course.id)
                  setActiveTab('curriculum')
                }}
                className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 transition-all hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="relative flex h-36 w-full items-center justify-center overflow-hidden bg-slate-200 dark:bg-slate-800">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <ImageIcon size={28} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          No Cover Image
                        </span>
                      </div>
                    )}
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCourseCover(course)
                          setEditThumbnailUrl(course.thumbnail_url || '')
                        }}
                        className="shadow-xs rounded-lg bg-slate-900/80 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-slate-900"
                        title="Change Cover Image"
                      >
                        <Edit3 size={14} />
                      </button>
                      <span
                        className={`shadow-xs rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${course.is_active ? 'border-emerald-400/30 bg-emerald-500/90 text-white' : 'border-white/10 bg-slate-900/80 text-slate-300'}`}
                      >
                        {course.is_active ? 'Active' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 pb-3">
                    <h4 className="truncate text-base font-black leading-tight text-slate-900 dark:text-white">
                      {course.title}
                    </h4>
                    <p className="mt-1.5 line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {course.description || 'No description specified.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-5 pt-0">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <div className="flex flex-col gap-0.5 rounded-xl border border-slate-100 bg-white p-2.5 dark:border-white/10 dark:bg-slate-900">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <GraduationCap size={13} /> Students
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-200">
                        {course.student_count || 0} Enrolled
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-xl border border-slate-100 bg-white p-2.5 dark:border-white/10 dark:bg-slate-900">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Users size={13} /> Tutors
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-200">
                        {course.tutor_count || 0} Assigned
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/10">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers size={13} className="text-blue-500" />{' '}
                        {phaseCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookMarked size={13} className="text-purple-500" />{' '}
                        {totalLessons}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          fetchCourseDetails(course.id)
                          setActiveTab('curriculum')
                        }}
                        className="rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                      >
                        Manage
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCourse(course.id)
                        }}
                        className="rounded-xl p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        title="Delete Course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* EDIT COURSE COVER MODAL */}
      {editingCourseCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-6 rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Change Cover Image
                </h3>
                <p className="mt-0.5 text-xs font-bold text-slate-400">
                  Update thumbnail preview for {editingCourseCover.title}.
                </p>
              </div>
              <button
                onClick={() => setEditingCourseCover(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCourseCover} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Thumbnail Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={editThumbnailUrl}
                  onChange={(e) => setEditThumbnailUrl(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              {editThumbnailUrl.trim() && (
                <div className="h-32 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800">
                  <img
                    src={editThumbnailUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourseCover(null)}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCover}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700"
                >
                  {updatingCover ? 'Updating...' : 'Save Cover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE COURSE MODAL (Deep Dive) */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-white/10 md:p-8">
              <div className="flex items-start gap-4">
                {selectedCourse.thumbnail_url && (
                  <img
                    src={selectedCourse.thumbnail_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover dark:border-white/10"
                  />
                )}
                <div>
                  <span className="mb-2 inline-block rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                    Course Management
                  </span>
                  <h3 className="text-2xl font-black leading-tight text-slate-900 dark:text-white">
                    {selectedCourse.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {selectedCourse.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/50 px-6 dark:border-white/10 dark:bg-white/5 md:px-8">
              <button
                onClick={() => setActiveTab('curriculum')}
                className={`flex items-center gap-2 border-b-2 px-4 py-4 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'curriculum' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <LayoutList size={16} /> Curriculum Builder
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`flex items-center gap-2 border-b-2 px-4 py-4 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <Activity size={16} /> Student Progress (
                {selectedCourse.enrolled_users?.length || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6 dark:bg-transparent md:p-8">
              {detailsLoading ? (
                <div className="flex items-center justify-center gap-3 py-12 text-center text-sm font-bold text-slate-400">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></span>
                  Loading course ecosystem...
                </div>
              ) : (
                <>
                  {/* CURRICULUM TAB */}
                  {activeTab === 'curriculum' && (
                    <div className="space-y-8">
                      {/* Persistent Add Phase Form (Always Visible) */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          await handleCreatePhase(e)
                        }}
                        className="flex flex-col items-stretch gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/5 sm:flex-row sm:items-center"
                      >
                        <div className="flex-1">
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Add New Phase
                          </label>
                          <input
                            type="text"
                            placeholder="Phase Title (e.g., Introduction to Syntax)"
                            value={newPhaseTitle}
                            onChange={(e) => setNewPhaseTitle(e.target.value)}
                            disabled={creatingPhase}
                            className="w-full rounded-xl border border-white p-3 text-sm font-bold shadow-sm focus:outline-blue-500 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={creatingPhase || !newPhaseTitle.trim()}
                          className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:opacity-50 sm:mt-5"
                        >
                          {creatingPhase ? 'Creating...' : 'Create Phase'}
                        </button>
                      </form>

                      {/* Existing Phases */}
                      <div className="space-y-4">
                        {selectedCourse.course_phases
                          ?.sort((a, b) => a.phase_number - b.phase_number)
                          .map((phase) => (
                            <div
                              key={phase.id}
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
                            >
                              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-slate-800/50">
                                <h5 className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                                    {phase.phase_number}
                                  </span>
                                  {phase.title}
                                </h5>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-400">
                                    {phase.course_lessons?.length || 0} Lessons
                                  </span>
                                  <button
                                    onClick={() => handleDeletePhase(phase.id)}
                                    className="rounded-xl p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                    title="Delete Phase"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 p-4">
                                {phase.course_lessons
                                  ?.sort((a, b) => a.position - b.position)
                                  .map((lesson, idx) => (
                                    <div
                                      key={lesson.id}
                                      onClick={() => fetchLessonExtras(lesson)}
                                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-blue-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-blue-500/10"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-6 text-sm font-black text-slate-300 dark:text-slate-600">
                                          {(idx + 1)
                                            .toString()
                                            .padStart(2, '0')}
                                        </div>
                                        <div className="text-sm font-bold text-slate-700 transition-colors group-hover:text-blue-600 dark:text-slate-300">
                                          {lesson.title}
                                        </div>
                                      </div>
                                      <span className="group-hover:opacity-150 rounded-lg bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 opacity-0 transition-opacity dark:bg-blue-500/20 dark:text-blue-400">
                                        Edit Notes / Quiz &rarr;
                                      </span>
                                    </div>
                                  ))}

                                {/* Add Lesson inline form */}
                                <form
                                  onSubmit={(e) =>
                                    handleCreateLesson(e, phase.id)
                                  }
                                  className="mt-2 flex items-center gap-2 pt-2"
                                >
                                  <input
                                    type="text"
                                    placeholder="Add new lesson title..."
                                    value={newLessonTitles[phase.id] || ''}
                                    onChange={(e) =>
                                      setNewLessonTitles({
                                        ...newLessonTitles,
                                        [phase.id]: e.target.value,
                                      })
                                    }
                                    className="flex-1 rounded-xl border border-dashed border-slate-300 bg-transparent p-2.5 text-xs font-bold transition-colors focus:bg-slate-50 focus:outline-blue-500 dark:border-white/20 dark:text-white dark:focus:bg-white/5"
                                  />
                                  <button
                                    type="submit"
                                    disabled={
                                      !newLessonTitles[phase.id]?.trim()
                                    }
                                    className="rounded-xl bg-slate-100 p-2.5 text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:bg-white/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </form>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* STUDENTS TAB */}
                  {activeTab === 'students' && (
                    <div className="space-y-4">
                      {sortedStudents.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-white/10">
                          <Users
                            size={48}
                            className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                          />
                          <p className="font-bold text-slate-500 dark:text-slate-400">
                            No students currently assigned or enrolled in this
                            course track.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {sortedStudents.map((student) => {
                            const progress = calculateStudentProgress(student)
                            return (
                              <div
                                key={student.id}
                                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-white/5"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-black text-slate-900 dark:text-white">
                                      {student.full_name}
                                    </h4>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                      {student.email}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-white/10">
                                    <Activity
                                      size={12}
                                      className="text-slate-400"
                                    />
                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                                      {progress}%
                                    </span>
                                  </div>
                                </div>

                                {/* Progress Bar UI */}
                                <div>
                                  <div className="mb-1.5 flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <span>Course Progress</span>
                                    {progress === 100 && (
                                      <span className="flex items-center gap-1 text-emerald-500">
                                        <CheckCircle2 size={12} /> Completed
                                      </span>
                                    )}
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div
                                      className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedLesson && (
        <QuizBuilderModal
          selectedLesson={selectedLesson}
          selectedCourse={selectedCourse}
          onClose={() => setSelectedLesson(null)}
        />
      )}
    </div>
  )
}
