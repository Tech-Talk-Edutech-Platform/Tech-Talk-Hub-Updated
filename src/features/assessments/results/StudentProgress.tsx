import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { X } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function StudentList({ tutorId }) {
  const [students, setStudents] = useState([])
  const [showAllModal, setShowAllModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const [assignments, setAssignments] = useState([])
  const [notes, setNotes] = useState('')

  const [taskName, setTaskName] = useState('')
  const [message, setMessage] = useState('')

  const [showAssignment, setShowAssignment] = useState(false)
  const [showMessage, setShowMessage] = useState(false)

  // FETCH STUDENTS
  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('assigned_tutor_id', tutorId)
        .order('created_at', { ascending: false })

      if (data) setStudents(data)
    }

    if (tutorId) {
      void fetchStudents()
    }
  }, [tutorId])

  // FETCH STUDENT DETAILS
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!selectedStudent) return

      const { data: assignmentsData } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: false })

      const { data: notesData } = await supabase
        .from('user_notes_progress')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .single()

      if (assignmentsData) setAssignments(assignmentsData)
      if (notesData) setNotes(notesData?.topic || '')
    }

    void fetchStudentData()
  }, [selectedStudent])

  const markComplete = async (id) => {
    const { error } = await supabase
      .from('student_assignments')
      .update({ status: 'completed' })
      .eq('id', id)

    if (!error) {
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a)),
      )
      toast.success('Assignment completed')
    }
  }

  const addAssignment = async () => {
    if (!taskName) return

    const { error } = await supabase.from('student_assignments').insert({
      student_id: selectedStudent.id,
      tutor_id: tutorId,
      task_name: taskName,
      status: 'pending',
    })

    if (!error) {
      toast.success('Assignment added')
      setTaskName('')
      setShowAssignment(false)
    }
  }

  const sendMessage = async () => {
    if (!message) return

    const { error } = await supabase.from('messages').insert({
      sender_id: tutorId,
      receiver_id: selectedStudent.id,
      content: message,
    })

    if (!error) {
      toast.success('Message sent')
      setMessage('')
      setShowMessage(false)
    }
  }

  const saveNotes = async () => {
    const { error } = await supabase.from('student_notes_progress').upsert({
      student_id: selectedStudent.id,
      tutor_id: tutorId,
      topic: notes,
    })

    if (!error) toast.success('Lesson progress saved')
  }

  const renderStudent = (s) => (
    <button
      key={s.id}
      type="button"
      onClick={() => setSelectedStudent(s)}
      className="flex w-full cursor-pointer items-center gap-4 rounded-xl p-2 text-left transition-colors hover:bg-slate-50"
    >
      <img
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
          s.full_name,
        )}`}
        alt={`${s.full_name}'s avatar`}
        className="h-10 w-10 rounded-full"
      />

      <div className="flex-1">
        <p className="text-sm font-bold">{s.full_name}</p>
        <p className="text-xs text-slate-400">{s.course_name}</p>
      </div>
    </button>
  )

  return (
    <>
      {/* MAIN CARD */}
      <div className="rounded-2xl bg-white p-6 shadow-xs">
        <h3 className="mb-6 font-bold">Students</h3>

        <div className="space-y-3">
          {students.slice(0, 3).map(renderStudent)}
        </div>

        {/* ✅ VIEW MORE BUTTON */}
        {students.length > 3 && (
          // <button
          //   onClick={() => setShowAllModal(true)}
          //   className="mt-4 text-sm text-blue-600 font-bold"
          // >
          //   View More
          // </button>
          <button
            onClick={() => setShowAllModal(true)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            View All &gt;
          </button>
        )}
      </div>

      {/* ✅ ALL STUDENTS MODAL */}
      {showAllModal && (
        <Modal title="All Students" onClose={() => setShowAllModal(false)}>
          <div className="space-y-3">{students.map(renderStudent)}</div>
        </Modal>
      )}

      {/* STUDENT DASHBOARD */}
      {selectedStudent && (
        <Modal
          title="Student Dashboard"
          onClose={() => setSelectedStudent(null)}
        >
          <div className="space-y-6">
            {/* PROFILE */}
            <div className="flex items-center gap-4">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  selectedStudent.full_name,
                )}`}
                alt={`${selectedStudent.full_name}'s avatar`}
                className="h-16 w-16 rounded-full"
              />

              <div>
                <h3 className="text-lg font-bold">
                  {selectedStudent.full_name}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedStudent.course_name}
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-3 gap-3">
              <button className="rounded-xl bg-blue-600 py-2 text-sm text-white">
                🚀 Start Class
              </button>

              <button
                onClick={() => setShowAssignment(!showAssignment)}
                className="rounded-xl bg-indigo-600 py-2 text-sm text-white"
              >
                📝 Add Assignment
              </button>

              <button
                onClick={() => setShowMessage(!showMessage)}
                className="rounded-xl bg-slate-900 py-2 text-sm text-white"
              >
                💬 Message Student
              </button>
            </div>

            {/* ASSIGNMENT */}
            {showAssignment && (
              <div>
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Assignment name"
                  className="w-full rounded-xl border p-2"
                />
                <button
                  onClick={() => void addAssignment()}
                  className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white"
                >
                  Save Assignment
                </button>
              </div>
            )}

            {/* MESSAGE */}
            {showMessage && (
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border p-3"
                />
                <button
                  onClick={() => void sendMessage()}
                  className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
                >
                  Send Message
                </button>
              </div>
            )}

            {/* ASSIGNMENTS */}
            <div>
              <h4 className="mb-2 font-bold">Assignments</h4>

              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="mb-2 flex justify-between rounded-xl bg-slate-50 p-3 text-sm"
                >
                  <span>{a.task_name}</span>

                  {a.status === 'completed' ? (
                    <span className="text-xs font-bold text-green-600">
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => void markComplete(a.id)}
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white"
                    >
                      Complete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* NOTES */}
            <div>
              <h4 className="mb-2 font-bold">Lesson Notes</h4>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-28 w-full rounded-xl border p-3 text-sm"
              />

              <button
                onClick={() => void saveNotes()}
                className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white"
              >
                Save Progress
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
    <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-slate-400"
      >
        <X size={22} />
      </button>

      <h2 className="mb-6 text-xl font-black">{title}</h2>
      {children}
    </div>
  </div>
)
