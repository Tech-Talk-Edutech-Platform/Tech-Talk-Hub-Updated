import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import { Save, UserPlus, ClipboardList, Rocket, Award } from 'lucide-react'

interface StudentOption {
  id: string
  full_name: string
  grade_level: string | null
}

interface LabeledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

// Dynamic slug generator based on immutable values
const slugify = (name: string, examTitle: string) => {
  const base = `${name}-${examTitle}`.toLowerCase().trim()
  return base.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const AdminEntryForm = () => {
  const [loading, setLoading] = useState(false)
  const [studentsList, setStudentsList] = useState<StudentOption[]>([])
  const [fetchingStudents, setFetchingStudents] = useState(true)

  const initialState = {
    student_id: '', // 🔥 Store the relational UUID
    student_name: '',
    slug: '',
    grade_level: '',
    course_name: 'Scratch Programming',
    exam_title: '',
    exam_date: new Date().toISOString().split('T')[0],
    theory_score: 0,
    practical_score: 0,
    problem_solving_score: 0,
    creativity_score: 0,
    performance_label: 'Excellent',
    tutor_feedback: '',
    project_url: '',
  }

  const [formData, setFormData] = useState(initialState)

  // 1. Fetch real students from users table
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, grade_level:assigned_course_id') // adjust if grade lives elsewhere
          .eq('role', 'student')
          .eq('is_active', true)
          .order('full_name', { ascending: true })

        if (error) throw error
        setStudentsList(data || [])
      } catch (err) {
        console.error('Error fetching student directory:', err.message)
      } finally {
        setFetchingStudents(false)
      }
    }
    fetchStudents()
  }, [])

  // 2. Handle selection changes cleanly
  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    if (!selectedId) {
      setFormData((prev) => ({
        ...prev,
        student_id: '',
        student_name: '',
        slug: '',
      }))
      return
    }

    const selectedStudent = studentsList.find((s) => s.id === selectedId)
    setFormData((prev) => ({
      ...prev,
      student_id: selectedId,
      student_name: selectedStudent.full_name,
      slug: slugify(selectedStudent.full_name, prev.exam_title || 'assessment'),
    }))
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target
    const finalValue = type === 'number' ? parseInt(value) || 0 : value

    setFormData((prev) => {
      const updated = { ...prev, [name]: finalValue }
      // Keep slug fresh if they type an exam title out
      if (name === 'exam_title' && prev.student_name) {
        updated.slug = slugify(prev.student_name, value)
      }
      return updated
    })
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formData.student_id) {
      alert('Please select a student from the directory.')
      return
    }
    setLoading(true)

    try {
      if (formData.project_url && !formData.project_url.startsWith('http')) {
        throw new Error('Project URL must start with http/https')
      }

      const overall =
        (formData.theory_score +
          formData.practical_score +
          formData.problem_solving_score +
          formData.creativity_score) /
        4

      const payload = {
        ...formData,
        overall_score: Math.round(overall),
      }

      const { data, error } = await supabase
        .from('student_results')
        .insert([payload])
        .select()
        .single()

      if (error) throw error

      const link = `${window.location.origin}/results/${data.slug}`
      alert(
        `✅ Saved Assessment Record!\n\nShareable Report Card Link:\n${link}`,
      )
      setFormData(initialState)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto my-10 max-w-2xl rounded-xl bg-white p-6 font-sans shadow">
      <div className="mb-6 flex items-center gap-3">
        <UserPlus className="text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-800">
          Enter Student Results
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* DROPDOWN SELECTOR */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Select Registered Student
            </label>
            <select
              name="student_id"
              value={formData.student_id}
              onChange={handleStudentSelect}
              disabled={fetchingStudents}
              required
              className="h-[38px] w-full rounded border bg-white p-2 text-sm outline-indigo-500"
            >
              <option value="">
                {fetchingStudents
                  ? 'Loading directory...'
                  : '-- Choose Student --'}
              </option>
              {studentsList.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Grade Level"
            name="grade_level"
            value={formData.grade_level}
            onChange={handleChange}
            placeholder="e.g. Grade 6"
          />
        </div>

        {/* PERFORMANCE LABEL & COURSE */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 flex items-center gap-1 text-sm font-semibold">
              <Award size={14} className="text-indigo-500" /> Performance Label
            </label>
            <select
              name="performance_label"
              value={formData.performance_label}
              onChange={handleChange}
              className="h-[38px] w-full rounded border bg-white p-2 text-sm"
            >
              <option value="Excellent">Excellent</option>
              <option value="Outstanding">Outstanding</option>
              <option value="Above Average">Above Average</option>
              <option value="Average">Average</option>
              <option value="Improving">Improving</option>
            </select>
          </div>
          <Input
            label="Course Name"
            name="course_name"
            value={formData.course_name}
            onChange={handleChange}
          />
        </div>

        {/* EXAM & PROJECT */}
        <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <ClipboardList size={16} /> Exam & Project
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="exam_title"
              placeholder="Exam title (e.g., Capstone Project)"
              required
              value={formData.exam_title}
              onChange={handleChange}
              className="w-full rounded border p-2 text-sm"
            />
            <input
              type="date"
              name="exam_date"
              value={formData.exam_date}
              onChange={handleChange}
              className="w-full rounded border p-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-2 rounded border bg-white p-2">
              <Rocket size={16} className="text-orange-500" />
              <input
                name="project_url"
                value={formData.project_url}
                onChange={handleChange}
                placeholder="Project URL Link"
                className="w-full text-sm outline-none"
              />
            </div>
          </div>
        </div>

        {/* SCORES */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <label className="mb-3 block text-sm font-bold uppercase tracking-tight text-indigo-800">
            Skill Scores (0-100)
          </label>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Score
              label="Theory"
              name="theory_score"
              value={formData.theory_score}
              onChange={handleChange}
            />
            <Score
              label="Practical"
              name="practical_score"
              value={formData.practical_score}
              onChange={handleChange}
            />
            <Score
              label="Logic"
              name="problem_solving_score"
              value={formData.problem_solving_score}
              onChange={handleChange}
            />
            <Score
              label="Creative"
              name="creativity_score"
              value={formData.creativity_score}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* FEEDBACK */}
        <div>
          <label className="mb-1 block text-sm font-semibold">
            Tutor Feedback
          </label>
          <textarea
            name="tutor_feedback"
            value={formData.tutor_feedback}
            onChange={handleChange}
            placeholder="Write a personalized note for the student..."
            className="h-24 w-full rounded border p-3 text-sm"
          />
        </div>

        <button
          disabled={loading}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold text-white transition-all ${loading ? 'bg-gray-400' : 'bg-indigo-600 shadow-lg hover:bg-indigo-700 active:scale-95'}`}
        >
          {loading ? (
            'Saving...'
          ) : (
            <>
              <Save size={18} /> Save Result
            </>
          )}
        </button>
      </form>
    </div>
  )
}

const Input = ({ label, ...props }: LabeledInputProps) => (
  <div>
    <label className="mb-1 block text-sm font-semibold text-gray-700">
      {label}
    </label>
    <input
      {...props}
      className="w-full rounded border p-2 text-sm outline-indigo-500"
    />
  </div>
)

const Score = ({ label, ...props }: LabeledInputProps) => (
  <div className="rounded border border-indigo-200 bg-white p-2">
    <label className="mb-1 block text-[10px] font-black uppercase text-indigo-400">
      {label}
    </label>
    <input
      type="number"
      min="0"
      max="100"
      {...props}
      className="w-full p-1 text-center font-bold text-indigo-900 outline-none"
    />
  </div>
)

export default AdminEntryForm
