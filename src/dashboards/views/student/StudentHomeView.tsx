import React, { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import {
  Rocket,
  Flame,
  Crown,
  Sparkles,
  Star,
  Calendar,
  User as UserIcon,
  Video,
  PlayCircle,
  GraduationCap,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { RecordingLink } from '../../../lib/classroom/recordingLink'
import type { Tables } from '../../../types/database'

type RecordingWithTutor = Tables<'class_recordings'> & {
  tutor: Pick<Tables<'users'>, 'full_name'> | null
}

export default function StudentHomeView({ userId }: { userId: string }) {
  const [student, setStudent] = useState<Tables<'users'> | null>(null)
  const [latestResult, setLatestResult] =
    useState<Tables<'student_results'> | null>(null)
  const [latestRecordings, setLatestRecordings] = useState<
    RecordingWithTutor[]
  >([])

  useEffect(() => {
    if (!userId) return

    const loadData = async () => {
      // 1. Fetch Student Info
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      setStudent(user)

      // 2. Fetch Latest Result
      const { data: resultData } = await supabase
        .from('student_results')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      setLatestResult(resultData?.[0] ?? null)

      // 3. Fetch Class Recordings with the Joined Tutor Name
      const { data: recordingData, error } = await supabase
        .from('class_recordings')
        .select(
          `
          *,
          tutor:users!class_recordings_tutor_id_fkey (
            full_name
          )
        `,
        )
        .or(`student_id.eq.${userId},student_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(3)

      if (!error && recordingData) {
        setLatestRecordings(recordingData)
      }
    }

    void loadData()
  }, [userId])

  const studentAvatar = latestResult?.avatar_url || student?.avatar_url
  const studentName = student?.full_name || 'Active Student'
  const overallScore = latestResult?.overall_score ?? 0

  const streak = 0
  const level = 1
  const firstName = studentName.split(' ')[0]
  const clampedScore = Math.min(Math.max(overallScore, 0), 100)

  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f7ff] text-gray-900 transition-colors duration-300 dark:bg-dashboard-night dark:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 h-[500px] w-[500px] bg-purple-600/20 blur-[120px] dark:bg-purple-600/15" />
        <div className="absolute right-0 bottom-0 h-[500px] w-[500px] bg-indigo-600/15 blur-[140px] dark:bg-indigo-600/10" />
      </div>

      <div className="animate-fade-in relative z-10 mx-auto max-w-7xl space-y-8 p-4 md:p-6 lg:p-8">
        {/* WELCOME BANNER HEADER */}
        <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[25px] border border-purple-700/30 bg-linear-to-r from-purple-900 via-purple-800 to-indigo-900 p-6 text-white shadow-2xl sm:rounded-[30px] sm:p-8 md:rounded-[35px] lg:flex-row lg:items-center">
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-[10px] font-black tracking-widest text-purple-200 uppercase backdrop-blur-md">
              <Sparkles size={12} className="animate-spin text-pink-400" />{' '}
              Student Dashboard ⭐
            </div>

            <div className="flex items-center gap-4">
              {studentAvatar ? (
                <img
                  src={studentAvatar}
                  alt={studentName}
                  className="h-12 w-12 shrink-0 rounded-full border-2 border-pink-400/60 object-cover shadow-md"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-white shadow-md">
                  <UserIcon size={20} />
                </div>
              )}
              <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                Welcome back, <span className="text-pink-300">{firstName}</span>{' '}
                💜
              </h1>
            </div>

            <p className="max-w-xl text-xs font-medium text-purple-200 sm:text-sm">
              Continue your courses, track your learning progress, and unlock
              new achievements today.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 shadow-2xs backdrop-blur-md">
                <Flame className="text-orange-400" size={16} />
                <span className="text-xs font-bold text-white">
                  {streak} Day Streak
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 shadow-2xs backdrop-blur-md">
                <Crown className="text-yellow-400" size={16} />
                <span className="text-xs font-bold text-white">
                  Level {level}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 shadow-2xs backdrop-blur-md">
                <Sparkles className="text-pink-400" size={16} />
                <span className="text-xs font-bold text-white">
                  {clampedScore}% Score
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full shrink-0 lg:w-auto">
            <div className="min-w-[260px] rounded-3xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-r from-purple-500 to-pink-500 text-lg text-white shadow-md">
                  🎯
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-purple-200 uppercase">
                    Next Goal
                  </p>
                  <h3 className="text-sm font-black text-white">
                    Reach Level {level + 1}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-purple-200">
                Complete your next lesson to unlock new achievements.
              </p>

              <div className="mt-3">
                <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-purple-200">
                  <span>Progress</span>
                  <span>{clampedScore}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-purple-400 to-pink-400 transition-all duration-500"
                    style={{ width: `${clampedScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT CLASS RECORDINGS SECTION */}
        <div className="rounded-[32px] border border-purple-200/60 bg-white/90 p-6 shadow-xl backdrop-blur-2xl md:p-8 dark:border-purple-500/25 dark:bg-white/5">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
                <Video size={20} />
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Class Recordings
              </h3>
            </div>
          </div>

          {latestRecordings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestRecordings.map((recording) => {
                const resolvedTutorName =
                  recording.tutor?.full_name || 'Assigned Tutor'

                return (
                  <div
                    key={recording.id}
                    className="flex flex-col justify-between space-y-4 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 transition-all hover:border-purple-400/40 dark:border-purple-500/20 dark:bg-purple-950/20"
                  >
                    {recording.recording_url ? (
                      <RecordingLink
                        recording={recording.recording_url}
                        className="group relative block flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-black/80 shadow-md"
                      >
                        {recording.thumbnail_url ? (
                          <img
                            src={recording.thumbnail_url}
                            alt={recording.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : null}

                        <div
                          className={`absolute inset-0 ${recording.thumbnail_url ? 'bg-black/40 group-hover:bg-black/20' : 'bg-purple-900/20 group-hover:bg-purple-900/0'} flex items-center justify-center transition-colors`}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600/90 text-white shadow-lg transition-transform group-hover:scale-110">
                            <PlayCircle size={28} />
                          </div>
                        </div>

                        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-sm bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                          Watch Session <ExternalLink size={10} />
                        </span>
                      </RecordingLink>
                    ) : (
                      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black/80 shadow-md">
                        <div className="flex flex-col items-center gap-2 text-xs text-gray-400">
                          <PlayCircle size={32} />
                          <span>Video link unavailable</span>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-block rounded-full bg-purple-600/15 px-3 py-1 text-[10px] font-black tracking-wider text-purple-700 uppercase dark:text-purple-300">
                          Live Session
                        </span>
                        {recording.created_at && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-pink-500">
                            <Calendar size={10} />
                            {new Date(recording.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              },
                            )}
                          </span>
                        )}
                      </div>

                      <h4 className="line-clamp-1 text-base font-extrabold">
                        {recording.title || 'Catch up on what you missed!'}
                      </h4>

                      <div className="mt-2 flex flex-col gap-1 border-t border-purple-100 pt-1 text-[11px] text-gray-600 dark:border-purple-500/15 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap
                            size={14}
                            className="shrink-0 text-purple-500"
                          />
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            Tutor:
                          </span>
                          <span className="font-semibold">
                            {resolvedTutorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="pl-5 font-bold text-purple-600 dark:text-purple-400">
                            Student:
                          </span>
                          <span>{studentName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/30 py-8 text-center dark:border-purple-500/20 dark:bg-purple-950/20">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                No class recordings available yet. Check back soon after your
                next live session!
              </p>
            </div>
          )}
        </div>

        {/* MAIN FEATURED HERO CARD */}
        <div className="relative overflow-hidden rounded-[32px] border border-purple-200/60 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl md:p-10 dark:border-purple-500/25 dark:bg-white/5">
          <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="flex flex-col items-center justify-center rounded-3xl border border-purple-200/60 bg-purple-50/60 p-6 shadow-inner lg:col-span-3 dark:border-purple-500/30 dark:bg-purple-950/30">
              <h3 className="mb-6 flex items-center gap-2 text-xs font-black tracking-wider text-purple-700 uppercase dark:text-purple-300">
                <Sparkles size={14} className="text-yellow-500" /> Magic Skill
                Jar
              </h3>
              <div className="relative h-40 w-32">
                <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-3xl" />
                <div className="absolute top-0 left-1/2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-linear-to-b from-purple-600 to-indigo-600 shadow-md" />
                <div className="absolute top-3 h-36 w-full overflow-hidden rounded-[2.2rem] border-[6px] border-white bg-linear-to-b from-purple-100/90 to-indigo-200/90 shadow-xl backdrop-blur-md dark:border-purple-500/30 dark:from-purple-900/40 dark:to-indigo-950/50">
                  <div className="absolute top-3 left-3 h-20 w-3 rounded-full bg-white/50" />
                  <div className="absolute top-6 left-5 animate-bounce text-xl">
                    ⚙️
                  </div>
                  <div className="absolute top-9 right-4 animate-pulse text-lg">
                    💡
                  </div>
                  <div className="absolute bottom-8 left-6 animate-bounce text-xl">
                    🎮
                  </div>
                  <div className="absolute right-5 bottom-6 animate-pulse text-lg">
                    🚀
                  </div>
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 animate-spin text-base">
                    💜
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-600/15 px-3.5 py-1.5 text-xs font-black tracking-wider text-purple-700 uppercase dark:text-purple-300">
                <Star size={14} className="text-purple-500" /> Current Enrolled
                Course
              </div>
              <h2 className="text-3xl leading-tight font-black tracking-tight sm:text-4xl">
                {latestResult?.course_name || 'Scratch Programming & Logic'}
              </h2>
              <p className="text-sm leading-relaxed font-medium text-gray-600 dark:text-purple-200">
                You're making fantastic progress! Keep completing exercises and
                building your coding projects to rank higher.
              </p>

              <div className="flex w-fit items-center gap-2 rounded-xl border border-purple-200 bg-purple-100/60 px-3 py-2 text-xs font-bold text-purple-700 dark:border-purple-500/20 dark:bg-purple-900/30 dark:text-purple-300">
                <Calendar size={14} className="text-pink-500" />
                <span>Next Live Class: Tomorrow at 4:00 PM</span>
              </div>

              <div className="pt-3">
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-3 rounded-2xl border border-purple-400/30 bg-linear-to-r from-purple-600 to-indigo-600 px-8 py-4 text-sm font-black tracking-wider text-white uppercase shadow-xl shadow-purple-950/30 transition-all hover:scale-105 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98]"
                >
                  <span>Continue Learning</span>
                  <Rocket size={18} />
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-3xl border border-purple-200/60 bg-purple-50/60 p-6 shadow-inner lg:col-span-3 dark:border-purple-500/30 dark:bg-purple-950/30">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    className="fill-transparent text-purple-200/60 dark:text-purple-950"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="fill-transparent transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient
                      id="progressGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                  <h3 className="text-3xl font-black tracking-tight">
                    {clampedScore}%
                  </h3>
                  <p className="mt-1 text-[10px] font-black tracking-widest text-purple-700 uppercase dark:text-purple-300">
                    {latestResult?.performance_label || 'Mastery'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
