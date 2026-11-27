import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, EyeOff, Lock, Send, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { Tabs } from '../../../../components/ui/Tabs'
import { getErrorMessage } from '../../../../lib/getErrorMessage'
import {
  deleteExam,
  examKeys,
  updateExam,
  type AdminExam,
  type CourseOption,
  type ExamPerson,
  type ExamStatus,
} from '../../../../features/exams/examsApi'
import { ExamDetailsForm } from './ExamDetailsForm'
import { ExamQuestionsPanel } from './ExamQuestionsPanel'
import { ExamStudentsPanel } from './ExamStudentsPanel'
import { ExamSubmissionsPanel } from './ExamSubmissionsPanel'
import { examCounts } from './examCounts'

type ExamEditorProps = {
  exam: AdminExam
  students: ExamPerson[]
  courses: CourseOption[]
  onBack: () => void
}

type Section = 'questions' | 'students' | 'submissions' | 'details'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft (students can’t see it)',
  published: 'Published',
  closed: 'Closed',
}

/** One exam: questions, who sits it, submissions and marking, settings. */
export function ExamEditor({
  exam,
  students,
  courses,
  onBack,
}: ExamEditorProps) {
  const client = useQueryClient()
  const counts = examCounts(exam)
  const [section, setSection] = useState<Section>(
    counts.toMark > 0 ? 'submissions' : 'questions',
  )

  const refresh = () =>
    void client.invalidateQueries({ queryKey: examKeys.adminList() })

  const update = useMutation({
    mutationFn: (changes: Parameters<typeof updateExam>[1]) =>
      updateExam(exam.id, changes),
    onSuccess: () => {
      toast.success('Exam updated.')
      refresh()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t update the exam.')),
  })
  const remove = useMutation({
    mutationFn: () => deleteExam(exam.id),
    onSuccess: () => {
      toast.success('Exam deleted.')
      refresh()
      onBack()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t delete the exam.')),
  })

  const setStatus = (status: ExamStatus) => {
    if (status === 'published') {
      if (counts.questions === 0) {
        toast.error('Add at least one question before publishing.')
        return
      }
      if (!exam.course_id && counts.named === 0) {
        toast.error('Pick a course or some students before publishing.')
        return
      }
    }
    update.mutate({ status })
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={14} aria-hidden="true" /> All exams
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {exam.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {STATUS_LABEL[exam.status] ?? exam.status}
            {exam.course ? ` · ${exam.course.title}` : ''} ·{' '}
            {exam.results_published
              ? 'Results visible to students'
              : 'Results hidden from students'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exam.status !== 'published' && (
            <button
              type="button"
              disabled={update.isPending}
              onClick={() => setStatus('published')}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send size={14} aria-hidden="true" />
              {exam.status === 'closed' ? 'Reopen' : 'Publish to students'}
            </button>
          )}
          {exam.status === 'published' && (
            <button
              type="button"
              disabled={update.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    'Close the exam? Nobody new can start it; anyone sitting it now has until their time runs out.',
                  )
                ) {
                  setStatus('closed')
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white/10"
            >
              <Lock size={14} aria-hidden="true" /> Close exam
            </button>
          )}
          <button
            type="button"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ resultsPublished: !exam.results_published })
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            {exam.results_published ? (
              <>
                <EyeOff size={14} aria-hidden="true" /> Hide results
              </>
            ) : (
              <>
                <Eye size={14} aria-hidden="true" /> Publish results
              </>
            )}
          </button>
        </div>
      </div>

      {exam.results_published && counts.toMark > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Results are visible, but {counts.toMark}{' '}
          {counts.toMark === 1 ? 'attempt still needs' : 'attempts still need'}{' '}
          marking. Students see “Being marked” until you mark theirs.
        </p>
      )}

      <Tabs
        id="exam-editor"
        label="Exam sections"
        value={section}
        onChange={setSection}
        tabs={[
          { value: 'questions', label: 'Questions', count: counts.questions },
          { value: 'students', label: 'Students', count: counts.named },
          {
            value: 'submissions',
            label: 'Submissions',
            count: counts.attempts,
          },
          { value: 'details', label: 'Settings' },
        ]}
      >
        {section === 'questions' && (
          <ExamQuestionsPanel examId={exam.id} locked={counts.attempts > 0} />
        )}
        {section === 'students' && (
          <ExamStudentsPanel
            examId={exam.id}
            courseId={exam.course_id}
            courseTitle={exam.course?.title ?? null}
            students={students}
          />
        )}
        {section === 'submissions' && (
          <ExamSubmissionsPanel
            examId={exam.id}
            durationMinutes={exam.duration_minutes}
            closesAt={exam.closes_at}
          />
        )}
        {section === 'details' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <ExamDetailsForm
                key={exam.updated_at}
                initial={{
                  title: exam.title,
                  description: exam.description,
                  durationMinutes: exam.duration_minutes,
                  courseId: exam.course_id,
                  opensAt: exam.opens_at,
                  closesAt: exam.closes_at,
                }}
                courses={courses}
                submitLabel="Save settings"
                pending={update.isPending}
                onSubmit={(details) => update.mutate(details)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-red-100 bg-red-50/50 p-5 dark:border-red-500/20 dark:bg-red-500/5">
              <p className="text-sm text-red-800 dark:text-red-300">
                Deleting removes the exam, its questions and every student’s
                answers and marks.
              </p>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete “${exam.title}” and all its answers and marks? This can’t be undone.`,
                    )
                  ) {
                    remove.mutate()
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={14} aria-hidden="true" /> Delete exam
              </button>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  )
}
