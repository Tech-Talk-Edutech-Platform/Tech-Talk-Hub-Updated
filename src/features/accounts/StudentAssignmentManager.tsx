import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { plannedDb } from '../../lib/plannedDb'

type StudentType = 'course' | 'trial'
type StudentFilter = 'all' | StudentType

const FILTER_LABELS: Record<StudentFilter, string> = {
  all: 'All',
  course: 'Course',
  trial: 'Trial',
}
const FILTERS: StudentFilter[] = ['all', 'course', 'trial']

interface Tutor {
  id: string
  full_name: string
}

interface AssignableStudent {
  id: string
  full_name: string
  assigned_tutor_id: string | null
  type: StudentType
}

interface StudentDetails {
  full_name: string
  parent_name: string | null
  parent_phone: string | null
}

interface AssignmentData {
  tutors: Tutor[]
  students: AssignableStudent[]
}

async function fetchAssignmentData(): Promise<AssignmentData> {
  const [tutorsRes, courseRes, trialRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'tutor')
      .eq('is_active', true),
    supabase
      .from('users')
      .select('id, full_name, assigned_tutor_id')
      .eq('role', 'student'),
    plannedDb
      .from('students')
      .select('id, full_name, assigned_tutor_id')
      .order('full_name', { ascending: true }),
  ])

  if (tutorsRes.error) console.error(tutorsRes.error)

  return {
    tutors: tutorsRes.data ?? [],
    students: [
      ...(courseRes.data ?? []).map((s) =>
        Object.assign({}, s, { type: 'course' as const }),
      ),
      ...(trialRes.data ?? []).map((s) =>
        Object.assign({}, s, { type: 'trial' as const }),
      ),
    ],
  }
}

async function saveAssignedTutor(
  student: AssignableStudent,
  tutorId: string | null,
): Promise<void> {
  const { error } =
    student.type === 'course'
      ? await supabase
          .from('users')
          .update({ assigned_tutor_id: tutorId })
          .eq('id', student.id)
      : await plannedDb
          .from('students')
          .update({ assigned_tutor_id: tutorId })
          .eq('id', student.id)
  if (error) throw error
}

async function fetchStudentDetails(
  student: AssignableStudent,
): Promise<StudentDetails> {
  if (student.type === 'course') {
    const { data, error } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', student.id)
      .single()
    if (error) throw error
    return { full_name: data.full_name, parent_name: null, parent_phone: null }
  }

  const { data, error } = await plannedDb
    .from('students')
    .select('full_name, parent_name, parent_phone')
    .eq('id', student.id)
    .single()
  if (error) throw error
  return data
}

export default function StudentAssignmentManager() {
  const [students, setStudents] = useState<AssignableStudent[]>([])
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null,
  )
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(
    null,
  )
  const [activeFilter, setActiveFilter] = useState<StudentFilter>('all')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    fetchAssignmentData().then(
      (data) => {
        if (cancelled) return
        setTutors(data.tutors)
        setStudents(data.students)
        setLoading(false)
      },
      (error: unknown) => {
        console.error(error)
        if (!cancelled) setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // ✅ STRONG ASSIGNMENT LOGIC
  async function handleAssign(student: AssignableStudent, tutorId: string) {
    const assigned = tutorId === '' ? null : tutorId
    try {
      await saveAssignedTutor(student, assigned)
    } catch (error) {
      console.error('Assignment failed:', error)
      alert('Failed to assign tutor')
      return
    }

    // ✅ Optimistic update (no lag feel)
    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id && s.type === student.type
          ? Object.assign({}, s, { assigned_tutor_id: assigned })
          : s,
      ),
    )
  }

  async function handleStudentClick(student: AssignableStudent) {
    if (expandedStudentId === student.id) {
      setExpandedStudentId(null)
      return
    }

    try {
      setStudentDetails(await fetchStudentDetails(student))
      setExpandedStudentId(student.id)
    } catch (error) {
      console.error(error)
    }
  }

  if (loading)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white font-mono">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <span className="mt-4 text-xs font-bold tracking-widest text-gray-600 uppercase">
          Fetching...
        </span>
      </div>
    )

  // ✅ FILTER
  const filteredStudents =
    activeFilter === 'all'
      ? students
      : students.filter((s) => s.type === activeFilter)

  // ✅ STATS
  const total = students.length
  const courseCount = students.filter((s) => s.type === 'course').length
  const trialCount = total - courseCount
  const unassigned = students.filter((s) => !s.assigned_tutor_id).length

  return (
    <div className="p-7">
      <button
        type="button"
        onClick={() => void navigate(-1)}
        className="mb-3 rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-300"
      >
        ← Back
      </button>
      {/* ✅ STATS CARDS */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Students</p>
          <h2 className="text-2xl font-bold">{total}</h2>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Course Students</p>
          <h2 className="text-2xl font-bold">{courseCount}</h2>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Trial Students</p>
          <h2 className="text-2xl font-bold">{trialCount}</h2>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unassigned</p>
          <h2 className="text-2xl font-bold">{unassigned}</h2>
        </div>
      </div>

      {/* ✅ FILTER TABS */}
      <div className="mb-6 flex gap-3">
        {FILTERS.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`rounded-lg border px-4 py-2 ${
              activeFilter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600'
            }`}
          >
            {FILTER_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ✅ LIST */}
      <div className="space-y-4">
        {filteredStudents.map((student) => {
          const assignedTutor = tutors.find(
            (t) => t.id === student.assigned_tutor_id,
          )

          return (
            <div key={student.id} className="rounded-xl border">
              <div className="flex items-center justify-between p-4">
                <span className="w-24 text-xs text-gray-500">
                  {student.type === 'course' ? 'Course' : 'Trial'}
                </span>

                <button
                  type="button"
                  className="flex-1 cursor-pointer text-left text-blue-600"
                  onClick={() => void handleStudentClick(student)}
                >
                  {student.full_name}
                </button>

                <select
                  aria-label={`Tutor for ${student.full_name}`}
                  className="rounded-lg border px-3 py-2"
                  value={student.assigned_tutor_id ?? ''}
                  onChange={(e) => void handleAssign(student, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {tutors.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {tutor.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {expandedStudentId === student.id && studentDetails && (
                <div className="border-t bg-slate-50 p-4">
                  <p>
                    <strong>Name:</strong> {studentDetails.full_name}
                  </p>

                  {student.type === 'trial' && (
                    <>
                      <p>
                        <strong>Parent:</strong> {studentDetails.parent_name}
                      </p>
                      <p>
                        <strong>Phone:</strong> {studentDetails.parent_phone}
                      </p>
                    </>
                  )}

                  <p>
                    <strong>Tutor:</strong>{' '}
                    {assignedTutor ? assignedTutor.full_name : 'Unassigned'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
