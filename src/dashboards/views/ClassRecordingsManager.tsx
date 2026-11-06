import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import {
  Video,
  Plus,
  Trash2,
  Upload,
  User,
  Calendar,
  ExternalLink,
  X,
  Search,
  Sparkles,
} from 'lucide-react'
import type { Tables } from '../../types/database'

type UserName = Pick<Tables<'users'>, 'full_name'>

type Recording = Tables<'class_recordings'> & {
  tutor: UserName | null
  student: UserName | null
}

type UserOption = Pick<Tables<'users'>, 'id' | 'full_name'>

export default function ClassRecordingsManager() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [students, setStudents] = useState<UserOption[]>([])
  const [tutors, setTutors] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [courseName, setCourseName] = useState('')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [studentId, setStudentId] = useState('')
  const [tutorId, setTutorId] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const { data: recs } = await supabase
      .from('class_recordings')
      .select(
        `
        *,
        tutor:users!tutor_id(full_name),
        student:users!student_id(full_name)
      `,
      )
      .order('created_at', { ascending: false })

    const { data: studentList } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'student')

    const { data: tutorList } = await supabase
      .from('users')
      .select('id, full_name')
      .in('role', ['tutor', 'owner', 'operations_admin', 'tech_admin'])

    setRecordings(recs || [])
    setStudents(studentList || [])
    setTutors(tutorList || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title || !recordingUrl) {
      alert('Please provide at least a title and recording URL.')
      return
    }

    const { error } = await supabase.from('class_recordings').insert([
      {
        title,
        course_name: courseName || null,
        recording_url: recordingUrl,
        thumbnail_url: thumbnailUrl || null,
        student_id: studentId || null,
        tutor_id: tutorId || null,
      },
    ])

    if (error) {
      alert('Error uploading recording: ' + error.message)
    } else {
      setIsModalOpen(false)
      setTitle('')
      setCourseName('')
      setRecordingUrl('')
      setThumbnailUrl('')
      setStudentId('')
      setTutorId('')
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this recording?'))
      return
    const { error } = await supabase
      .from('class_recordings')
      .delete()
      .eq('id', id)
    if (!error) {
      setRecordings(recordings.filter((rec) => rec.id !== id))
    } else {
      alert('Error deleting: ' + error.message)
    }
  }

  const filteredRecordings = recordings.filter(
    (rec) =>
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.course_name &&
        rec.course_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rec.student?.full_name &&
        rec.student.full_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  )

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-8 bg-slate-50 p-6 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 md:p-10">
      {/* Header Section */}
      <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-600 dark:border-purple-500/25 dark:bg-purple-500/10 dark:text-purple-400">
            <Sparkles size={13} /> Session Library
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Class Recordings
          </h2>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Upload, browse, and organize video session recordings for individual
            students or global access.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700 dark:hover:bg-purple-500"
        >
          <Plus size={18} /> Upload Recording
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="relative max-w-md flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recordings by title, course, or student..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-purple-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-500"
          />
        </div>
        <div className="px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing{' '}
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            {filteredRecordings.length}
          </span>{' '}
          results
        </div>
      </div>

      {/* Recordings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex h-72 animate-pulse flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/30"
            >
              <div className="aspect-video rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="space-y-2">
                <div className="h-4 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-5 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecordings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecordings.map((rec) => (
            <div
              key={rec.id}
              className="group flex flex-col justify-between space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-purple-500/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700"
            >
              {/* Thumbnail Video Container */}
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                {rec.thumbnail_url ? (
                  <img
                    src={rec.thumbnail_url}
                    alt={rec.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
                    <Video
                      className="text-slate-400 dark:text-slate-600"
                      size={36}
                    />
                  </div>
                )}
                <a
                  href={rec.recording_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <div className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-medium text-white shadow-md transition-colors hover:bg-purple-500">
                    <ExternalLink size={14} /> Watch Session
                  </div>
                </a>
              </div>

              {/* Card Meta Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">
                    {rec.course_name || 'General Session'}
                  </span>
                </div>
                <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 transition-colors group-hover:text-purple-600 dark:text-slate-100 dark:group-hover:text-purple-300">
                  {rec.title}
                </h3>

                <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500">
                      Tutor:
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <User
                        size={12}
                        className="text-slate-400 dark:text-slate-500"
                      />{' '}
                      {rec.tutor?.full_name || 'Auto-assigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500">
                      Student:
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {rec.student?.full_name || 'All Students (Global)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  <Calendar
                    size={13}
                    className="text-slate-400 dark:text-slate-500"
                  />{' '}
                  {new Date(rec.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <button
                  onClick={() => handleDelete(rec.id)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  title="Delete Recording"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-400">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            <Video size={20} />
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-300">
            No recordings found matching your search.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="cursor-pointer text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400"
          >
            Clear search filters
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm dark:bg-slate-950/80">
          <div className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-2.5 text-purple-600 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Upload Recording
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Share session archive with students.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Session Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Intro to Loops & Variables"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-purple-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Course Name
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Python Fundamentals"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-purple-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Recording URL (YouTube/Drive/Loom) *
                </label>
                <input
                  type="url"
                  required
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-purple-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Thumbnail Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://... image link"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-purple-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Assign Tutor
                  </label>
                  <select
                    value={tutorId}
                    onChange={(e) => setTutorId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 transition-colors focus:border-purple-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">Auto-detect / Me</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Target Student
                  </label>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 transition-colors focus:border-purple-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">Global (All Students)</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-purple-700 dark:hover:bg-purple-500"
                >
                  Save & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
