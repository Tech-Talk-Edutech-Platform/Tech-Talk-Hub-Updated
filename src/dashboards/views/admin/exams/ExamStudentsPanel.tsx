import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { InsightsError } from '../../../insights/InsightsError'
import { getErrorMessage } from '../../../../lib/getErrorMessage'
import {
  examKeys,
  listExamStudentIds,
  setExamStudents,
  type ExamPerson,
} from '../../../../features/exams/examsApi'

type ExamStudentsPanelProps = {
  examId: string
  courseId: string | null
  courseTitle: string | null
  students: ExamPerson[]
}

/**
 * Who sits the exam: everyone on its course (automatic), plus anyone picked
 * here by name.
 */
export function ExamStudentsPanel({
  examId,
  courseId,
  courseTitle,
  students,
}: ExamStudentsPanelProps) {
  const client = useQueryClient()
  const saved = useQuery({
    queryKey: examKeys.students(examId),
    queryFn: () => listExamStudentIds(examId),
  })
  const [picked, setPicked] = useState<string[] | null>(null)
  const [search, setSearch] = useState('')

  const savedIds = saved.data ?? []
  const chosen = picked ?? savedIds
  const changed =
    picked !== null &&
    (picked.length !== savedIds.length ||
      picked.some((id) => !savedIds.includes(id)))

  const save = useMutation({
    mutationFn: () => setExamStudents(examId, savedIds, chosen),
    onSuccess: () => {
      setPicked(null)
      toast.success('Students saved.')
      void client.invalidateQueries({ queryKey: examKeys.students(examId) })
      void client.invalidateQueries({ queryKey: examKeys.adminList() })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t save the students.')),
  })

  if (saved.isError) {
    return (
      <InsightsError
        title="Students couldn’t be loaded"
        onRetry={() => void saved.refetch()}
      />
    )
  }

  const onCourse = (student: ExamPerson) =>
    courseId !== null && student.assigned_course_id === courseId
  const query = search.trim().toLowerCase()
  const shown = students.filter(
    (student) =>
      !query ||
      student.full_name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query),
  )
  const toggle = (id: string) =>
    setPicked(
      chosen.includes(id)
        ? chosen.filter((value) => value !== id)
        : [...chosen, id],
    )

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
        {courseId
          ? `Everyone taking ${courseTitle ?? 'the course'} can sit this exam automatically (their assigned course or an enrolment). Pick extra students below if needed.`
          : 'This exam has no course, so only the students you pick here can sit it.'}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="exam-student-search" className="sr-only">
            Search students
          </label>
          <input
            id="exam-student-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search students…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <p className="text-xs font-bold text-slate-500 tabular-nums">
          {chosen.length} picked
        </p>
        <button
          type="button"
          disabled={!changed || save.isPending}
          onClick={() => save.mutate()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {save.isPending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={14} aria-hidden="true" />
          )}
          Save students
        </button>
      </div>

      {saved.isPending ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-100 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-white/5">
          {shown.map((student) => (
            <li key={student.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={chosen.includes(student.id)}
                  onChange={() => toggle(student.id)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {student.full_name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {student.email}
                  </span>
                </span>
                {onCourse(student) && (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    On the course
                  </span>
                )}
              </label>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-400">
              No students match.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
