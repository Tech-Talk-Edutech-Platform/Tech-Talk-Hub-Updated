import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { Loader2, CheckCircle, Star } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '../../../types/database'
import { getErrorMessage } from '../../../lib/getErrorMessage'

interface StudentAssignmentsProps {
  user?: User | null
}

type TutorStudent = Pick<Tables<'users'>, 'id' | 'full_name'>

interface StudentAssignmentView {
  id: string
  task: string
  status: string | null
  student: string
  student_answer: string | null
  tutor_feedback: string | null
  grade: string | null
}

interface AssignmentBoard {
  assignments: StudentAssignmentView[]
  students: TutorStudent[]
}

interface NewAssignment {
  student_id: string
  task_name: string
  category: string
  submission_link: string
  description: string
}

const EMPTY_ASSIGNMENT: NewAssignment = {
  student_id: '',
  task_name: '',
  category: '',
  submission_link: '',
  description: '',
}

const STATUS_STYLES: Record<string, string | undefined> = {
  submitted: 'bg-amber-500 text-white border-amber-600 shadow-xs animate-pulse',
  pending: 'bg-slate-100 text-slate-500 border-slate-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function getStatusStyles(status: string | null) {
  return (
    STATUS_STYLES[status?.toLowerCase() ?? ''] ??
    'bg-slate-50 text-slate-400 border-slate-100'
  )
}

/**
 * The tutor's assignments with each student's name, plus the students the
 * tutor can set new work for. `student_assignments` has no foreign key to
 * `users`, so names are looked up separately.
 */
async function loadAssignmentBoard(tutorId: string): Promise<AssignmentBoard> {
  const [assignmentsResult, studentsResult] = await Promise.all([
    supabase
      .from('student_assignments')
      .select(
        'id, task_name, status, student_id, student_answer, tutor_feedback, grade',
      )
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('assigned_tutor_id', tutorId)
      .eq('role', 'student'),
  ])

  if (assignmentsResult.error) throw assignmentsResult.error
  if (studentsResult.error) throw studentsResult.error

  const rows = assignmentsResult.data
  const studentIds = [...new Set(rows.map((row) => row.student_id))]
  const names = new Map<string, string>()

  if (studentIds.length > 0) {
    const { data: people, error } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', studentIds)

    if (error) throw error
    for (const person of people) names.set(person.id, person.full_name)
  }

  return {
    assignments: rows.map((row) => ({
      id: row.id,
      task: row.task_name,
      status: row.status,
      student: names.get(row.student_id) || 'Unknown',
      student_answer: row.student_answer,
      tutor_feedback: row.tutor_feedback,
      grade: row.grade,
    })),
    students: studentsResult.data,
  }
}

export default function StudentAssignments({ user }: StudentAssignmentsProps) {
  const tutorId = user?.id
  const [assignments, setAssignments] = useState<StudentAssignmentView[]>([])
  const [students, setStudents] = useState<TutorStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Track both text feedback and star rating
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>(
    {},
  )
  const [ratingInputs, setRatingInputs] = useState<Record<string, number>>({})
  const [newAssignment, setNewAssignment] =
    useState<NewAssignment>(EMPTY_ASSIGNMENT)

  useEffect(() => {
    if (!tutorId) return undefined

    let cancelled = false
    loadAssignmentBoard(tutorId).then(
      (board) => {
        if (cancelled) return
        setAssignments(board.assignments)
        setStudents(board.students)
        setLoading(false)
      },
      (error: unknown) => {
        if (cancelled) return
        toast.error(getErrorMessage(error, 'Could not load assignments.'))
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [tutorId])

  const fetchAssignments = async () => {
    if (!tutorId) return
    setLoading(true)
    try {
      const board = await loadAssignmentBoard(tutorId)
      setAssignments(board.assignments)
      setStudents(board.students)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load assignments.'))
    } finally {
      setLoading(false)
    }
  }

  const markCompleted = async (id: string) => {
    const feedback = feedbackInputs[id] || 'Great job!'
    const rating = ratingInputs[id] || 5

    const { error } = await supabase
      .from('student_assignments')
      .update({
        status: 'completed',
        grade: `${rating} Stars`, // Store rating in the grade column
        tutor_feedback: feedback,
      })
      .eq('id', id)

    if (error) {
      toast.error('Update failed')
    } else {
      toast.success('Review sent to student!')
      await fetchAssignments()
    }
  }

  const handleCreateAssignment = async () => {
    if (
      !tutorId ||
      !newAssignment.student_id ||
      !newAssignment.task_name.trim()
    ) {
      toast.error('Select a student, then enter a task name.')
      return
    }

    const { error } = await supabase.from('student_assignments').insert({
      ...newAssignment,
      tutor_id: tutorId,
      status: 'pending',
    })

    if (error) {
      toast.error('Assignment could not be created.')
      return
    }

    toast.success('Assignment created.')
    setNewAssignment(EMPTY_ASSIGNMENT)
    setShowModal(false)
    await fetchAssignments()
  }

  return (
    <div className="mb-6 rounded-[32px] border border-slate-100 bg-white p-6 shadow-xs">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-2xl font-black tracking-tight text-slate-900">
          Active Assignments
        </h3>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95"
        >
          + New Task
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-200" size={40} />
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((item) => (
            <div
              key={item.id}
              className={`rounded-[28px] border-2 bg-white p-6 transition-all ${item.status === 'submitted' ? 'border-amber-200 bg-amber-50/10' : 'border-slate-50'}`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-lg font-black text-slate-900">
                    {item.student}
                  </p>
                  <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                    {item.task}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-4 py-1.5 text-[10px] font-black tracking-widest uppercase ${getStatusStyles(item.status)}`}
                >
                  {item.status}
                </span>
              </div>

              {item.student_answer && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
                  <div className="bg-slate-50/50 p-4">
                    <p className="mb-1 text-[10px] font-black text-slate-400 uppercase">
                      Submission
                    </p>
                    <p className="text-sm font-medium text-slate-700 italic">
                      "{item.student_answer}"
                    </p>
                  </div>

                  {item.status === 'submitted' ? (
                    <div className="space-y-4 border-t border-slate-100 p-4">
                      {/* Rating Selector */}
                      <div>
                        <p className="mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                          Rate Performance
                        </p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                              onClick={() =>
                                setRatingInputs({
                                  ...ratingInputs,
                                  [item.id]: star,
                                })
                              }
                              className="transition-transform active:scale-125"
                            >
                              <Star
                                size={24}
                                className={
                                  (ratingInputs[item.id] || 5) >= star
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200'
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        aria-label={`Feedback for ${item.student}`}
                        placeholder="Feedback note..."
                        className="w-full rounded-xl border-none bg-slate-50 p-3 text-sm outline-hidden transition focus:ring-2 focus:ring-amber-200"
                        rows={2}
                        value={feedbackInputs[item.id] || ''}
                        onChange={(e) =>
                          setFeedbackInputs({
                            ...feedbackInputs,
                            [item.id]: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => void markCompleted(item.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-black text-white shadow-md hover:bg-emerald-700"
                      >
                        <CheckCircle size={14} /> Send Review
                      </button>
                    </div>
                  ) : (
                    item.tutor_feedback && (
                      <div className="flex items-center justify-between border-t border-slate-100 bg-emerald-50/30 p-4">
                        <div>
                          <p className="mb-1 text-[10px] font-black text-emerald-600 uppercase">
                            Your Feedback
                          </p>
                          <p className="text-sm font-bold text-emerald-800">
                            {item.tutor_feedback}
                          </p>
                        </div>
                        <div className="flex gap-0.5">
                          {/* Display result stars */}
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={
                                item.grade?.includes(String(s)) ||
                                Number.parseInt(item.grade ?? '', 10) >= s
                                  ? 'fill-emerald-500 text-emerald-500'
                                  : 'text-emerald-200'
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[320px] rounded-2xl bg-white p-6">
            <h3 className="mb-4 font-bold">New Assignment</h3>

            <select
              aria-label="Student"
              className="mb-2 w-full rounded-sm border p-2"
              value={newAssignment.student_id}
              onChange={(e) =>
                setNewAssignment({
                  ...newAssignment,
                  student_id: e.target.value,
                })
              }
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>

            <input
              type="text"
              aria-label="Task name"
              placeholder="Task Name"
              className="mb-2 w-full rounded-sm border p-2"
              value={newAssignment.task_name}
              onChange={(e) =>
                setNewAssignment({
                  ...newAssignment,
                  task_name: e.target.value,
                })
              }
            />

            <input
              type="text"
              aria-label="Category"
              placeholder="Category"
              className="mb-2 w-full rounded-sm border p-2"
              value={newAssignment.category}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, category: e.target.value })
              }
            />

            <input
              type="text"
              aria-label="Submission link"
              placeholder="Submission Link"
              className="mb-2 w-full rounded-sm border p-2"
              value={newAssignment.submission_link}
              onChange={(e) =>
                setNewAssignment({
                  ...newAssignment,
                  submission_link: e.target.value,
                })
              }
            />

            <textarea
              aria-label="Description"
              placeholder="Description"
              className="mb-4 w-full rounded-sm border p-2"
              value={newAssignment.description}
              onChange={(e) =>
                setNewAssignment({
                  ...newAssignment,
                  description: e.target.value,
                })
              }
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-sm bg-slate-200 px-3 py-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateAssignment()}
                className="rounded-sm bg-blue-600 px-3 py-1 text-xs text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
