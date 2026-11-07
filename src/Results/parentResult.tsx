import React, { startTransition, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import {
  User,
  BookOpen,
  Code,
  Monitor,
  Lightbulb,
  Star,
  MessageSquare,
  Rocket,
  ExternalLink,
} from 'lucide-react'

interface StudentResult {
  id: string
  overall_score: number | null
  theory_score: number | null
  practical_score: number | null
  problem_solving_score: number | null
  creativity_score: number | null
  performance_label: string | null
  avatar_url: string | null
  student_name: string
  grade_level: string | number | null
  course_name: string | null
  project_url: string | null
  created_at: string | null
  exam_title: string | null
  tutor_feedback: string | null
}

const StudentDashboard = () => {
  const { slug } = useParams()
  const [data, setData] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!slug) return

    const { data: resultData, error } = await supabase
      .from('student_results')
      .select('*')
      .eq('slug', slug)
      .order('exam_date', { ascending: false })

    if (error) console.error('Fetch Error:', error.message)

    const results = resultData ?? []
    startTransition(() => {
      setData(results)
      setSelectedId(results[0]?.id ?? null)
      setLoading(false)
    })
  }, [slug])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const latest = data.find((d) => d.id === selectedId) || data[0]
  const isLoading = loading && Boolean(slug)

  // AVERAGES
  const avg = data.length
    ? {
        overall:
          data.reduce((s, i) => s + (i.overall_score || 0), 0) / data.length,
        theory:
          data.reduce((s, i) => s + (i.theory_score || 0), 0) / data.length,
        practical:
          data.reduce((s, i) => s + (i.practical_score || 0), 0) / data.length,
        logic:
          data.reduce((s, i) => s + (i.problem_solving_score || 0), 0) /
          data.length,
        creative:
          data.reduce((s, i) => s + (i.creativity_score || 0), 0) / data.length,
      }
    : null

  if (isLoading)
    return (
      <div className="animate-pulse p-10 text-center font-sans">
        Fetching Report Card...
      </div>
    )

  if (!data.length)
    return <div className="p-10 text-center font-sans">Result not found.</div>

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-20 font-sans shadow-2xl">
      {/* HEADER */}
      <div className="rounded-b-3xl border-b border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-indigo-100 shadow-inner">
            {latest.avatar_url ? (
              <img
                src={latest.avatar_url}
                alt={`${latest.student_name}'s profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={40} className="text-indigo-500" />
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-gray-800">
              {latest.student_name}
            </h1>
            <p className="text-sm font-semibold text-indigo-600">
              Grade {latest.grade_level} • {latest.course_name}
            </p>
          </div>
        </div>
      </div>

      {/* PROJECT */}
      {latest.project_url && (
        <div className="p-4">
          <div className="rounded-2xl bg-linear-to-br from-orange-500 to-pink-500 p-5 text-white shadow-lg">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <Rocket size={18} /> Student Project
            </div>

            <h3 className="mb-3 text-lg font-black">
              Latest submission by {latest.student_name.split(' ')[0]}
            </h3>

            <a
              href={latest.project_url}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-black text-orange-600"
            >
              Launch Project <ExternalLink size={18} />
            </a>
          </div>
        </div>
      )}

      {/* OVERALL */}
      <div className="p-4">
        <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-xs">
          <h2 className="mb-4 px-1 text-sm font-bold uppercase tracking-wide text-gray-800">
            Overall Performance
          </h2>

          <div className="flex items-center gap-6">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-10 border-green-500">
              <div className="text-center">
                <span className="text-2xl font-black text-gray-800">
                  {latest.overall_score}%
                </span>
                <p className="text-[8px] font-bold uppercase text-green-500">
                  {latest.performance_label || 'Score'}
                </p>
              </div>
            </div>

            <p className="flex-1 text-sm leading-tight text-gray-600">
              <span className="font-bold text-gray-800">
                {latest.performance_label || 'Great Job'}!
              </span>{' '}
              Latest exam performance snapshot
            </p>
          </div>
        </div>
      </div>

      {/* EXAMS LIST */}
      <div className="mb-2 px-4">
        {data.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={selectedId === item.id}
            aria-label={`View results for ${item.exam_title}`}
            onClick={() => setSelectedId(item.id)}
            className={`mb-3 block w-full cursor-pointer rounded-2xl border-l-[6px] border-indigo-500 bg-white p-4 text-left shadow-xs ${
              selectedId === item.id ? 'ring-2 ring-indigo-400' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                  <BookOpen size={20} />
                </div>

                <div>
                  <h3 className="text-sm font-bold leading-tight text-gray-800">
                    {item.exam_title}
                  </h3>

                  <p className="mt-1 text-[10px] text-gray-400">
                    {item.created_at
                      ? new Date(item.created_at).toDateString()
                      : ''}{' '}
                    • {item.overall_score}%
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-green-500">
                  {item.overall_score}%
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 🔥 IMPROVED AVERAGE SUMMARY (ONLY CHANGE) */}
      <div className="p-4">
        <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-gray-800">
          Average Summary
        </h2>

        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-50 bg-white p-5 text-center shadow-xs">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Overall</p>
            <p className="text-lg font-black text-gray-800">
              {avg?.overall.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Theory</p>
            <p className="text-lg font-black text-red-500">
              {avg?.theory.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Practical</p>
            <p className="text-lg font-black text-blue-500">
              {avg?.practical.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Logic</p>
            <p className="text-lg font-black text-yellow-500">
              {avg?.logic.toFixed(1)}%
            </p>
          </div>

          <div className="col-span-2 rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Creative</p>
            <p className="text-lg font-black text-purple-500">
              {avg?.creative.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* BREAKDOWN */}
      <div className="p-4">
        <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-gray-800">
          Section Breakdown
        </h2>

        <div className="space-y-4 rounded-2xl border border-gray-50 bg-white p-5 shadow-xs">
          <StatRow
            label="Theory"
            score={latest.theory_score}
            icon={<Code size={16} />}
            color="bg-red-50 text-red-500"
          />
          <StatRow
            label="Practical"
            score={latest.practical_score}
            icon={<Monitor size={16} />}
            color="bg-blue-50 text-blue-500"
          />
          <StatRow
            label="Logic"
            score={latest.problem_solving_score}
            icon={<Lightbulb size={16} />}
            color="bg-yellow-50 text-yellow-500"
          />
          <StatRow
            label="Creative"
            score={latest.creativity_score}
            icon={<Star size={16} />}
            color="bg-purple-50 text-purple-500"
          />
        </div>
      </div>

      {/* FEEDBACK */}
      <div className="px-4">
        <div className="rounded-2xl bg-indigo-600 p-5 shadow-lg">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase text-white">
            <MessageSquare size={18} /> Tutor Feedback
          </div>

          <p className="whitespace-pre-line text-sm font-medium italic leading-relaxed text-indigo-50">
            "{latest.tutor_feedback}"
          </p>
        </div>
      </div>
    </div>
  )
}

const StatRow = ({
  label,
  score,
  icon,
  color,
}: {
  label: string
  score: number | null
  icon: ReactNode
  color: string
}) => (
  <div>
    <div className="mb-1 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`${color} rounded-lg p-1.5`}>{icon}</div>
        <span className="text-xs font-bold uppercase tracking-tighter text-gray-600">
          {label}
        </span>
      </div>
      <div className="text-xs font-black text-gray-800">{score}%</div>
    </div>

    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full bg-green-500"
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
)

export default StudentDashboard
