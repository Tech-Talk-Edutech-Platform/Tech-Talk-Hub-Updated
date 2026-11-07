import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  BookOpen,
  FileText,
  ShieldAlert,
  CheckCircle,
  X,
} from 'lucide-react'
import { supabase } from '../supabase'
import { toast } from 'react-hot-toast'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Tables } from '../types/database'

// Component Imports
import Sales from './Sales'

type UserRow = Tables<'users'>

interface QuickActions2Props {
  userId: string
  role: string
  courseId?: string | null
}

interface QuickAction {
  label: string
  icon: LucideIcon
  color: string
}

interface StudentTask {
  id: string
  name: string
  status: string | null
}

interface ModalProps {
  title: string
  children?: ReactNode
  onClose: () => void
}

// ===== MAIN COMPONENT =====
export default function QuickActions2({
  userId,
  role,
  courseId,
}: QuickActions2Props) {
  const navigate = useNavigate()

  const [showTrialMaterial, setShowTrialMaterial] = useState(false)
  const [showCourseMaterial, setShowCourseMaterial] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showInvoicesModal, setShowInvoicesModal] = useState(false)
  const [showTutorNotesModal, setShowTutorNotesModal] = useState(false)
  const [studentsWithCourses, setStudentsWithCourses] = useState<
    Pick<UserRow, 'id' | 'full_name' | 'assigned_course_id'>[]
  >([])
  const [showExamForm, setShowExamForm] = useState(false)

  // Data States
  const [students, setStudents] = useState<Pick<UserRow, 'id' | 'full_name'>[]>(
    [],
  )
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>([])

  const GOOGLE_DOC_URL =
    'https://docs.google.com/document/d/1DNIqIxd52u_8Qe8vcWZ0ANMNh35AR4FCWzoLfK_Dq5M/preview'
  const TUTOR_FEEDBACK_FORM =
    'https://docs.google.com/forms/d/e/1FAIpQLSeCEoH7LmNeU89c-WXKS4-Kc9H0uU4nYO4t2S8hAjb7btM__Q/viewform?embedded=true'

  const actionConfigs: Record<string, QuickAction[]> = {
    student: [
      { label: 'My Homework', icon: Star, color: 'bg-amber-400' },
      { label: 'Class Notes', icon: BookOpen, color: 'bg-indigo-500' },
      { label: 'Take Exam', icon: CheckCircle, color: 'bg-green-600' },
    ],
    owner: [
      { label: 'User Management', icon: ShieldAlert, color: 'bg-indigo-600' },
      {
        label: 'Trial Student/Tutor Assignments',
        icon: FileText,
        color: 'bg-emerald-600',
      },
      { label: 'Add Notes', icon: BookOpen, color: 'bg-indigo-500' },
      { label: 'Invoices & Receipts', icon: FileText, color: 'bg-green-500' },
      { label: 'Create Exam', icon: FileText, color: 'bg-purple-600' },
    ],
    tutor: [
      { label: 'Trial Class Material', icon: Star, color: 'bg-amber-400' },
      { label: 'Notes', icon: BookOpen, color: 'bg-indigo-500' },
      { label: 'Course Assignment', icon: CheckCircle, color: 'bg-indigo-500' },
      { label: 'Feedback Form', icon: FileText, color: 'bg-orange-600' },
    ],
  }

  const currentActions = actionConfigs[role] || []

  const fetchTutorStudents = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('assigned_tutor_id', userId)
      .order('full_name')
    if (data) setStudents(data)
  }

  const fetchTutorStudentsWithCourses = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, assigned_course_id')
      .eq('assigned_tutor_id', userId)
      .not('assigned_course_id', 'is', null)
      .order('full_name')
    if (data) setStudentsWithCourses(data)
  }

  const handleActionClick = async (label: string) => {
    if (label === 'User Management') {
      return navigate('/users')
    }
    if (label === 'Trial Student/Tutor Assignments') {
      return navigate('/student-assignment')
    }
    if (label === 'Trial Class Material') return setShowTrialMaterial(true)

    if (label === 'Take Exam') {
      // return setShowExamForm(true);
      return navigate('/exam')
    }
    if (label === 'My Homework') {
      return navigate('/receive-homework')
    }
    if (label === 'Invoices & Receipts') return setShowInvoicesModal(true)
    if (label === 'Add Notes') {
      return navigate('/upload-notes')
    }
    if (label === 'Create Exam') {
      return navigate('/create-exam')
    }

    if (label === 'Course Assignment') {
      await fetchTutorStudents()
      return setShowCourseMaterial(true)
    }

    if (label === 'Feedback Form') {
      await fetchTutorStudents()
      return setShowFeedbackModal(true)
    }

    if (label === 'Class Notes' || label === 'Notes') {
      if (role === 'student') {
        if (courseId) return navigate(`/learning/${courseId}`)
        return toast.error('No course assigned.')
      }

      if (role === 'tutor') {
        await fetchTutorStudentsWithCourses()
        setShowTutorNotesModal(true)
        return
      }
    } else {
      toast.error('No course assigned to this account.')
      return
    }
  }

  const handleSelectStudent = async (studentId: string) => {
    setSelectedStudent(studentId)
    const { data: assignmentData } = await supabase
      .from('student_assignments')
      .select('id, task_name, status')
      .eq('student_id', studentId)

    setStudentTasks(
      assignmentData?.map((a) => ({
        id: a.id,
        name: a.task_name,
        status: a.status,
      })) || [],
    )
  }

  return (
    <>
      <div className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-xs">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Actions</h3>
          <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
            {role}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {currentActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                void handleActionClick(action.label)
              }}
              className="group flex flex-col items-center justify-center rounded-2xl border border-slate-50 p-4 transition hover:shadow-lg active:scale-95"
            >
              <div className={`rounded-xl p-3 ${action.color} mb-3 text-white`}>
                <action.icon size={20} />
              </div>
              <span className="text-center text-[11px] font-black text-slate-600">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {showTutorNotesModal && (
        <Modal
          title="Select Student Notes"
          onClose={() => setShowTutorNotesModal(false)}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {studentsWithCourses.length > 0 ? (
              studentsWithCourses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    void navigate(`/learning/${s.assigned_course_id}`)
                  }}
                  className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:bg-indigo-50"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900">{s.full_name}</p>
                    <p className="text-xs font-black uppercase text-slate-500">
                      View Curriculum
                    </p>
                  </div>
                  <BookOpen
                    className="text-slate-300 group-hover:text-indigo-500"
                    size={20}
                  />
                </button>
              ))
            ) : (
              <p className="col-span-2 py-10 text-center text-slate-500">
                No students with assigned courses found.
              </p>
            )}
          </div>
        </Modal>
      )}

      {showExamForm && (
        <Modal title="Exam" onClose={() => setShowExamForm(false)}>
          <iframe
            src="https://form.typeform.com/to/Tz2QEJqO"
            className="h-[1000px] w-full rounded-xl border-0"
            allow="camera; microphone; autoplay; encrypted-media;"
            sandbox="allow-forms allow-popups allow-scripts"
            title="Exam Form"
          />
        </Modal>
      )}

      {showTrialMaterial && (
        <Modal
          title="Trial Class Material"
          onClose={() => setShowTrialMaterial(false)}
        >
          <iframe
            src={GOOGLE_DOC_URL}
            className="h-[600px] w-full rounded-lg border"
            sandbox="allow-forms allow-popups allow-scripts"
            title="Trial Material"
          />
        </Modal>
      )}

      {showCourseMaterial && (
        <Modal
          title="Course Assignment"
          onClose={() => setShowCourseMaterial(false)}
        >
          <div className="flex gap-6">
            <div className="w-1/3 border-r pr-4">
              <h3 className="mb-4 font-bold">Select Student</h3>
              {students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    void handleSelectStudent(s.id)
                  }}
                  className={`mb-2 w-full rounded-xl p-3 text-left transition ${selectedStudent === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {s.full_name}
                </button>
              ))}
            </div>
            <div className="w-2/3">
              <h3 className="mb-4 font-bold">Recent Progress</h3>
              {studentTasks.length > 0 ? (
                studentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="mb-2 flex justify-between rounded-lg border bg-slate-50 p-3"
                  >
                    <span>{task.name}</span>
                    <span className="text-xs font-bold uppercase">
                      {task.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">Select a student to see tasks.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showInvoicesModal && (
        <Modal
          title="Invoices & Receipts"
          onClose={() => setShowInvoicesModal(false)}
        >
          <Sales />
        </Modal>
      )}

      {showFeedbackModal && (
        <Modal
          title="Student Feedback"
          onClose={() => setShowFeedbackModal(false)}
        >
          <iframe
            src={TUTOR_FEEDBACK_FORM}
            className="h-[600px] w-full rounded-lg border"
            sandbox="allow-forms allow-popups allow-scripts"
            title="Feedback Form"
          />
        </Modal>
      )}
    </>
  )
}

const Modal = ({ title, children, onClose }: ModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-xs">
    <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
      <button
        onClick={onClose}
        className="absolute right-6 top-6 text-slate-400 hover:text-slate-700"
      >
        <X size={22} />
      </button>
      <h2 className="mb-6 text-2xl font-black">{title}</h2>
      {children}
    </div>
  </div>
)
