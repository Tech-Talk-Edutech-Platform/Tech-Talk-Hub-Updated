import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { InsightsError } from '../../../insights/InsightsError'
import { getErrorMessage } from '../../../../lib/getErrorMessage'
import {
  deleteQuestion,
  examKeys,
  examOptions,
  isQuestionType,
  listQuestions,
  QUESTION_TYPE_LABEL,
  saveQuestion,
} from '../../../../features/exams/examsApi'
import { QuestionForm } from './QuestionForm'

type ExamQuestionsPanelProps = {
  examId: string
  /** Students have started: changing questions now would be unfair. */
  locked: boolean
}

/** The exam's questions, in order, with add, edit and delete. */
export function ExamQuestionsPanel({
  examId,
  locked,
}: ExamQuestionsPanelProps) {
  const client = useQueryClient()
  const questions = useQuery({
    queryKey: examKeys.questions(examId),
    queryFn: () => listQuestions(examId),
  })
  const [editing, setEditing] = useState<string | null>(null)

  const refresh = () => {
    void client.invalidateQueries({ queryKey: examKeys.questions(examId) })
    void client.invalidateQueries({ queryKey: examKeys.adminList() })
  }

  const save = useMutation({
    mutationFn: saveQuestion,
    onSuccess: () => {
      setEditing(null)
      toast.success('Question saved.')
      refresh()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t save the question.')),
  })
  const remove = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      toast.success('Question deleted.')
      refresh()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Couldn’t delete the question.')),
  })

  if (questions.isError) {
    return (
      <InsightsError
        title="Questions couldn’t be loaded"
        error={questions.error}
        onRetry={() => void questions.refetch()}
      />
    )
  }
  if (questions.isPending) {
    return <p className="text-sm text-slate-400">Loading questions…</p>
  }

  const list = questions.data
  const total = list.reduce((sum, q) => sum + (q.marks ?? 1), 0)
  const nextPosition =
    list.reduce((max, q) => Math.max(max, q.position), -1) + 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {list.length} {list.length === 1 ? 'question' : 'questions'} · {total}{' '}
          marks in total
        </p>
        {!locked && editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
          >
            <Plus size={14} aria-hidden="true" /> Add question
          </button>
        )}
      </div>

      {locked && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Students have started this exam, so its questions can’t change.
        </p>
      )}

      {editing === 'new' && (
        <QuestionForm
          examId={examId}
          position={nextPosition}
          pending={save.isPending}
          onSave={(draft) => save.mutate(draft)}
          onCancel={() => setEditing(null)}
        />
      )}

      {list.length === 0 && editing !== 'new' ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/10">
          No questions yet. Add the first one.
        </p>
      ) : (
        <ol className="space-y-3">
          {list.map((question, index) =>
            editing === question.id ? (
              <li key={question.id}>
                <QuestionForm
                  examId={examId}
                  question={question}
                  position={question.position}
                  pending={save.isPending}
                  onSave={(draft) => save.mutate(draft)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                key={question.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                      Q{index + 1} ·{' '}
                      {isQuestionType(question.type)
                        ? QUESTION_TYPE_LABEL[question.type]
                        : 'Question'}{' '}
                      · {question.marks ?? 1}{' '}
                      {(question.marks ?? 1) === 1 ? 'mark' : 'marks'}
                    </p>
                    <p className="mt-1 text-sm font-semibold whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                      {question.question_text}
                    </p>
                    {question.type === 'mcq' && (
                      <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {examOptions(question.options).map((option) => (
                          <li
                            key={option}
                            className={`flex items-center gap-1.5 ${option === question.correct_answer ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}`}
                          >
                            {option === question.correct_answer && (
                              <CheckCircle2 size={12} aria-label="Correct" />
                            )}
                            {option}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {!locked && editing === null && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={`Edit question ${index + 1}`}
                        onClick={() => setEditing(question.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-white/10"
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete question ${index + 1}`}
                        disabled={remove.isPending}
                        onClick={() => {
                          if (window.confirm('Delete this question?')) {
                            remove.mutate(question.id)
                          }
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  )
}
