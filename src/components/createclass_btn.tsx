// -- Allow admins to insert classes
// CREATE POLICY "Admins and Tutors can create classes" ON classes
// FOR INSERT
// TO authenticated
// WITH CHECK (
//   EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('owner', 'operations_admin', 'tech_admin', 'tutor'))
// );

// -- Allow admins to insert attendance
// CREATE POLICY "Admins and Tutors can register attendance" ON event_attendance
// FOR INSERT
// TO authenticated
// WITH CHECK (true);
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { supabase } from '../supabase'

const createClassSchema = z.object({
  student_id: z.string().min(1, 'Select a student.'),
  tutor_id: z.string().min(1, 'Select a tutor.'),
  start_time: z.string().min(1, 'Choose a class date and time.'),
  duration: z.number().int().positive(),
  title: z.string().trim().min(1, 'Enter a class title.'),
})
type CreateClassValues = z.infer<typeof createClassSchema>

export default function CreateClassForm() {
  const [students, setStudents] = useState([])
  const [tutors, setTutors] = useState([])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClassValues>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      student_id: '',
      tutor_id: '',
      start_time: '',
      duration: 60,
      title: 'New Class Session',
    },
  })

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      const { data: s } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'student')
      const { data: t } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'tutor')
      setStudents(s || [])
      setTutors(t || [])
    }
    fetchData()
  }, [])

  const handleCreateClass = async (formData: CreateClassValues) => {
    // 1. Create the Class record
    const { data: classRecord, error: classErr } = await supabase
      .from('classes')
      .insert([
        {
          tutor_id: formData.tutor_id,
          student_id: formData.student_id,
          scheduled_at: formData.start_time,
        },
      ])
      .select()
      .single()

    if (classErr) return alert(classErr.message)

    // 2. Create the Calendar Event
    const end = new Date(
      new Date(formData.start_time).getTime() + formData.duration * 60000,
    )

    await supabase.from('calendar_events').insert([
      {
        title: formData.title,
        tutor_id: formData.tutor_id,
        class_id: classRecord.id,
        start_time: formData.start_time,
        end_time: end.toISOString(),
      },
    ])

    // 3. Register Attendance so the student can see it
    await supabase.from('event_attendance').insert([
      {
        event_id: classRecord.id, // Or map to the new event ID
        student_id: formData.student_id,
      },
    ])

    alert('Class Scheduled Successfully!')
  }

  return (
    <form
      onSubmit={handleSubmit(handleCreateClass)}
      noValidate
      className="max-w-md rounded bg-white p-6 shadow-md"
    >
      <h2 className="mb-4 text-xl font-bold">Schedule New Class</h2>

      <select
        {...register('student_id')}
        className="mb-3 w-full border p-2"
        aria-invalid={Boolean(errors.student_id)}
      >
        <option value="">Select Student</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </select>

      <select
        {...register('tutor_id')}
        className="mb-3 w-full border p-2"
        aria-invalid={Boolean(errors.tutor_id)}
      >
        <option value="">Select Tutor</option>
        {tutors.map((t) => (
          <option key={t.id} value={t.id}>
            {t.full_name}
          </option>
        ))}
      </select>

      <input
        type="datetime-local"
        {...register('start_time')}
        className="mb-3 w-full border p-2"
        aria-invalid={Boolean(errors.start_time)}
      />
      {(errors.student_id || errors.tutor_id || errors.start_time) && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {errors.student_id?.message ||
            errors.tutor_id?.message ||
            errors.start_time?.message}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded bg-blue-600 p-2 text-white"
      >
        Create Class
      </button>
    </form>
  )
}
