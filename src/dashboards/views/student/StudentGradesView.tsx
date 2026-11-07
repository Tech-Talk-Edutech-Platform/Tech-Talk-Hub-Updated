import { useEffect, useState } from 'react'
import { plannedDb } from '../../../lib/plannedDb'
import { Award, Clock, Loader2, BarChart2 } from 'lucide-react'

async function loadGradedAttempts(userId: string) {
  const { data, error } = await plannedDb
    .from('attempts')
    .select('*, exams(title, duration_minutes)')
    .eq('student_id', userId)
    .not('end_time', 'is', null)
    .order('end_time', { ascending: false })

  if (error) throw error
  return data
}

type GradedAttempt = Awaited<ReturnType<typeof loadGradedAttempts>>[number]

export default function StudentGradesView({ userId }: { userId: string }) {
  const [attempts, setAttempts] = useState<GradedAttempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadGradedAttempts(userId).then(
      (rows) => {
        if (cancelled) return
        setAttempts(rows)
        setLoading(false)
      },
      () => {
        if (!cancelled) setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Grades & Performance
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review your completed assessment records, scores, and historical
          outcomes.
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center dark:border-white/10 dark:bg-white/5">
          <BarChart2
            className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
            size={40}
          />
          <p className="font-bold text-slate-800 dark:text-white">
            No Graded Exams Yet
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Complete an assessment to view your calculated performance results
            here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {attempts.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-white/5"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {att.exams?.title || 'Assessment'}
                </h3>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <Clock size={12} /> Finished:{' '}
                  {att.end_time
                    ? new Date(att.end_time).toLocaleDateString()
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-2xl bg-purple-50 px-4 py-2 text-sm font-black text-purple-600 dark:bg-purple-500/10">
                  <Award size={16} /> Score: {att.score}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
