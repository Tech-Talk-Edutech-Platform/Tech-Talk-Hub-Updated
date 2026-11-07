import React, { useCallback, useState } from 'react'
import { supabase } from '../supabase'
import { toast } from 'react-hot-toast'
import { X, Send, FilePlus, ChevronRight, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { plannedDb } from '../lib/plannedDb'
import type { Tables } from '../types/database'

type ModalType = 'assignment' | 'message'

/**
 * `student_assignments` has no submission_text column (submissions are in
 * student_answer), so this is always empty. It stays optional here so
 * behaviour is unchanged.
 */
type StudentTask = Tables<'student_assignments'> & {
  submission_text?: string | null
}

/** A student (or, for a student, their tutor) to message or assign to. */
interface Recipient {
  id: string
  full_name: string
  assigned_course_id?: string | null
}

/** The class this component expects get_next_class to return a list of. */
interface UpcomingClass {
  event_id: string
  meet_link: string | null
}

interface QuickActionsProps {
  tutorId?: string
  role: string
  studentId?: string
}

export default function QuickActions({
  tutorId,
  role,
  studentId,
}: QuickActionsProps) {
  const navigate = useNavigate()
  const [modalType, setModalType] = useState<ModalType | null>(null)
  const [students, setStudents] = useState<Recipient[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Recipient | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>([]) // Added to store tasks

  // Form States
  const [message, setMessage] = useState('')
  const [taskName, setTaskName] = useState('')
  const [category, setCategory] = useState('') // Default empty to handle dynamic course
  const [taskUrl, setTaskUrl] = useState('')

  const fetchStudentTasks = useCallback(async (sId: string) => {
    const { data, error } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', sId)
      .order('created_at', { ascending: false })
    if (!error) setStudentTasks(data || [])
  }, [])

  const handleSelectStudent = (student: Recipient) => {
    setSelectedStudent(student)
    setCategory(student.assigned_course_id || '')
    if (modalType === 'assignment') {
      void fetchStudentTasks(student.id)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedStudent || !message.trim()) return
    setLoading(true)

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: tutorId || studentId,
        receiver_id: selectedStudent.id,
        content: message,
        is_read: false,
      },
    ])

    if (error) {
      toast.error('Message failed: ' + error.message)
    } else {
      toast.success('Message sent!')
      setMessage('')
      setTimeout(() => closeModal(), 600)
    }
    setLoading(false)
  }

  const fetchStudents = async () => {
    setLoading(true)
    if (role === 'student' && studentId) {
      const { data: userData } = await supabase
        .from('users')
        .select('assigned_tutor_id')
        .eq('id', studentId)
        .single()

      if (userData?.assigned_tutor_id) {
        const { data: tutor } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('id', userData.assigned_tutor_id)
          .single()

        if (tutor) {
          setStudents([tutor])
          setSelectedStudent(tutor)
          if (modalType === 'assignment') {
            void fetchStudentTasks(tutor.id)
          }
        }
      }
    } else if (role === 'tutor' && tutorId) {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, assigned_course_id') // Fetch assigned_course_id here
        .eq('assigned_tutor_id', tutorId)
        .order('full_name')

      if (!error) setStudents(data || [])
    }
    setLoading(false)
  }

  const handleStartClass = async () => {
    setLoading(true)
    try {
      // get_next_class doesn't exist yet (see types/plannedTables.ts), and this
      // component expects a list of classes rather than the planned single
      // class, so the result is read as unknown and checked to be a list.
      const { data, error } = await plannedDb.rpc('get_next_class', {
        user_id: (role === 'tutor' ? tutorId : studentId) ?? '',
        role,
      })

      if (error) throw error

      const classes: unknown = data
      // If data is null or an empty array []
      if (!Array.isArray(classes) || classes.length === 0) {
        toast.error('No upcoming class found in the calendar.')
        return
      }

      const classData: UpcomingClass = classes[0]
      if (!classData.meet_link) {
        toast.error('Class found, but no meeting link is set!')
        return
      }

      // Success redirect...
      void navigate(`/learning/${classData.event_id}`, { state: { classData } })
    } catch (err) {
      toast.error('Connection failed. Check your console.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (type: ModalType) => {
    setModalType(type)
    void fetchStudents()
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedStudent(null)
    setMessage('')
    setTaskName('')
    setTaskUrl('')
    setCategory('')
    setStudentTasks([])
  }

  const handleAddAssignment = async () => {
    if (!tutorId || !selectedStudent || !taskName.trim()) {
      toast.error('Select a student and enter a task name.')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('student_assignments').insert([
      {
        tutor_id: tutorId,
        student_id: selectedStudent.id,
        task_name: taskName,
        category: category || null, // Optional, send null if empty
        submission_link: taskUrl || null, // Optional
        status: 'pending',
      },
    ])

    setLoading(false)

    if (error) {
      toast.error('Failed to add assignment: ' + error.message)
      return
    }

    toast.success('Assignment added successfully!')
    // Refresh tasks for this student
    void fetchStudentTasks(selectedStudent.id)
    // Clear inputs
    setTaskName('')
    setTaskUrl('')
    setCategory('')
  }

  const tutorActions = [
    {
      label: hasStarted ? 'Rejoin Class' : 'Start Next Class',
      color: 'bg-blue-600',
      icon: hasStarted ? '🔄' : '🚀',
      onClick: handleStartClass,
    },
    {
      label: 'Add Assignment',
      color: 'bg-indigo-600',
      icon: '📝',
      onClick: () => handleOpenModal('assignment'),
    },
    {
      label: 'Message Student',
      color: 'bg-slate-800',
      icon: '💬',
      onClick: () => handleOpenModal('message'),
    },
  ]

  const studentActions = [
    {
      label: 'Join Next Class',
      color: 'bg-blue-600',
      icon: '🎓',
      onClick: handleStartClass,
    },
    {
      label: 'Message Teacher',
      color: 'bg-slate-800',
      icon: '💬',
      onClick: () => handleOpenModal('message'),
    },
  ]

  const actions = role === 'tutor' ? tutorActions : studentActions

  return (
    <div className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
      <div className="mb-5 flex items-center justify-between">
        {hasStarted && (
          <button
            onClick={() => {
              localStorage.removeItem('class_in_progress')
              setHasStarted(false)
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase hover:text-red-500"
          >
            <RotateCcw size={12} /> Reset Status
          </button>
        )}
      </div>

      <div className="space-y-3">
        {actions.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className={`flex w-full items-center justify-center gap-3 rounded-xl py-4 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-1 active:scale-95 ${btn.color}`}
          >
            <span className="text-xl">{btn.icon}</span>
            {btn.label}
          </button>
        ))}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">
                {modalType === 'message' ? 'Send Message' : 'Create Assignment'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {!selectedStudent ? (
              <div className="space-y-2">
                <p className="mb-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  {role === 'tutor' ? 'Choose a Student' : 'Your Teacher'}
                </p>
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left font-bold transition-all hover:border-blue-500 hover:bg-blue-50"
                  >
                    {s.full_name}{' '}
                    {role === 'tutor' && (
                      <ChevronRight size={16} className="text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="mb-2 text-xs font-bold text-blue-600"
                >
                  ← Back to List
                </button>

                {modalType === 'assignment' && (
                  <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <h3 className="mb-3 text-xs font-black tracking-widest text-indigo-400 uppercase">
                      Student Progress
                    </h3>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {studentTasks.length > 0 ? (
                        studentTasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs"
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-800">
                                {task.task_name}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${task.status === 'submitted' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}
                              >
                                {task.status}
                              </span>
                            </div>
                            {task.status === 'submitted' && (
                              <button
                                onClick={() =>
                                  toast(task.submission_text ?? null, {
                                    icon: '📖',
                                    duration: 6000,
                                  })
                                }
                                className="text-[10px] font-black text-indigo-600 uppercase underline"
                              >
                                View Submission
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">
                          No tasks found.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {modalType === 'message' ? (
                  <>
                    <textarea
                      className="h-32 w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                      placeholder="Type your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button
                      disabled={loading || !message.trim()}
                      onClick={() => {
                        void handleSendMessage()
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-black text-white"
                    >
                      <Send size={18} />{' '}
                      {loading ? 'SENDING...' : 'SEND MESSAGE'}
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Task Name"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 outline-hidden focus:ring-2 focus:ring-indigo-500"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                    />
                    {/* FIXED: Dropdown only includes the student's assigned course */}
                    <select
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 outline-hidden"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Select Course</option>
                      {selectedStudent.assigned_course_id && (
                        <option value={selectedStudent.assigned_course_id}>
                          {selectedStudent.assigned_course_id}
                        </option>
                      )}
                    </select>
                    <input
                      type="url"
                      placeholder="Resource URL (Optional)"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 outline-hidden"
                      value={taskUrl}
                      onChange={(e) => setTaskUrl(e.target.value)}
                    />
                    <button
                      disabled={loading || !taskName.trim()}
                      onClick={() => {
                        void handleAddAssignment()
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 font-black text-white shadow-lg"
                    >
                      <FilePlus size={18} />{' '}
                      {loading ? 'CREATING...' : 'ASSIGN TASK'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
