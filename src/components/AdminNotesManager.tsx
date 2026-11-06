import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import {
  useCourses,
  useCreateCourse,
  useCreateNote,
  useCreateTopic,
  useDeleteNote,
  useNotes,
  useTopics,
} from '../features/notes/hooks'
import { noteFormSchema, type NoteFormValues } from '../features/notes/schema'
import { getErrorMessage } from '../lib/getErrorMessage'

type StatusType = 'success' | 'error' | ''

export default function AdminNotesManager() {
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')

  const [newCourse, setNewCourse] = useState('')
  const [newTopic, setNewTopic] = useState('')

  const [status, setStatus] = useState<{ type: StatusType; msg: string }>({
    type: '',
    msg: '',
  })
  const navigate = useNavigate()
  const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const coursesQuery = useCourses()
  const topicsQuery = useTopics(selectedCourse)
  const notesQuery = useNotes(selectedTopic)
  const courses = coursesQuery.data ?? []
  const topics = selectedCourse ? (topicsQuery.data ?? []) : []
  const notes = selectedTopic ? (notesQuery.data ?? []) : []
  const loadError = coursesQuery.error ?? topicsQuery.error ?? notesQuery.error

  const createCourseMutation = useCreateCourse()
  const createTopicMutation = useCreateTopic()
  const createNoteMutation = useCreateNote()
  const deleteNoteMutation = useDeleteNote(selectedTopic)

  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { title: '', content: '' },
  })

  useEffect(
    () => () => {
      if (statusTimeout.current) clearTimeout(statusTimeout.current)
    },
    [],
  )

  const showStatus = (type: StatusType, msg: string) => {
    if (statusTimeout.current) clearTimeout(statusTimeout.current)
    setStatus({ type, msg })
    statusTimeout.current = setTimeout(() => {
      setStatus({ type: '', msg: '' })
      statusTimeout.current = null
    }, 4000)
  }

  const handleCreateCourse = () => {
    if (!newCourse || createCourseMutation.isPending) return
    createCourseMutation.mutate(newCourse, {
      onSuccess: () => {
        setNewCourse('')
        showStatus('success', 'Course created!')
      },
      onError: () => showStatus('error', 'Failed to create course.'),
    })
  }

  const handleCreateTopic = () => {
    if (!newTopic || !selectedCourse || createTopicMutation.isPending) return
    createTopicMutation.mutate(
      { title: newTopic, courseId: selectedCourse },
      {
        onSuccess: () => {
          setNewTopic('')
          showStatus('success', 'Topic created!')
        },
        onError: () => showStatus('error', 'Failed to create topic.'),
      },
    )
  }

  const handleUploadNote = () => {
    void noteForm.handleSubmit(
      (values) => {
        if (!selectedTopic) return showStatus('error', 'Fill all note fields.')
        createNoteMutation.mutate(
          { ...values, topic_id: selectedTopic, course_id: selectedCourse },
          {
            onSuccess: () => {
              noteForm.reset()
              showStatus('success', 'Note published!')
            },
            onError: (error) => {
              console.error('Supabase Upload Error:', error)
              showStatus(
                'error',
                `Error: ${getErrorMessage(error, 'Upload failed')}`,
              )
            },
          },
        )
      },
      () => showStatus('error', 'Fill all note fields.'),
    )()
  }

  const deleteNote = (id: string) => {
    if (!window.confirm('Delete this note?')) return
    deleteNoteMutation.mutate(id, {
      onError: () => showStatus('error', 'Failed to delete note.'),
    })
  }

  const publishing = createNoteMutation.isPending

  return (
    <div className="max-w mx-auto min-h-screen bg-gray-900 p-4 text-gray-100 md:p-8">
      <header className="mb-10 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => void navigate(`/:role`)}
            className="bg--200 rounded-xl px-3 py-2 text-sm font-bold hover:bg-indigo-400"
          >
            ← Back
          </button>
          <h6 className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-2xl font-black text-transparent">
            Curriculum Builder
          </h6>
        </div>
        <p className="mt-2 text-lg text-gray-400">
          Create courses, add topics, and publish markdown notes.
        </p>
      </header>

      {loadError && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
          <AlertCircle size={20} />
          <span className="font-bold">
            Failed to load data: {getErrorMessage(loadError, 'Unknown error')}
          </span>
        </div>
      )}

      {status.msg && (
        <div
          className={`animate-in fade-in slide-in-from-top-4 mb-8 flex items-center gap-3 rounded-2xl p-4 duration-300 ${
            status.type === 'error'
              ? 'border border-red-500/50 bg-red-500/10 text-red-400'
              : 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {status.type === 'error' ? (
            <AlertCircle size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          <span className="font-bold">{status.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column - Hierarchy Setup */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-3xl border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400">
              Step 1: Course Selection
            </h2>
            <div className="mb-4 flex gap-2">
              <input
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                placeholder="New course title..."
                className="flex-1 rounded-xl border border-gray-700 bg-gray-950 p-3 outline-none ring-indigo-500 transition-all focus:ring-2"
              />
              <button
                onClick={handleCreateCourse}
                disabled={createCourseMutation.isPending}
                className="rounded-xl bg-indigo-600 p-3 shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500"
              >
                <Plus size={20} />
              </button>
            </div>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value)
                setSelectedTopic('')
              }}
              className="w-full cursor-pointer rounded-xl border border-gray-700 bg-gray-950 p-3 text-gray-200 outline-none transition hover:border-gray-600"
            >
              <option value="">-- Choose Course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`rounded-3xl border border-gray-700 bg-gray-800/50 p-6 transition-all duration-500 ${!selectedCourse ? 'pointer-events-none scale-95 opacity-30' : 'opacity-100'}`}
          >
            <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400">
              Step 2: Topic Selection
            </h2>
            <div className="mb-4 flex gap-2">
              <input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="New topic title..."
                className="flex-1 rounded-xl border border-gray-700 bg-gray-950 p-3 outline-none ring-emerald-500 transition-all focus:ring-2"
              />
              <button
                onClick={handleCreateTopic}
                disabled={createTopicMutation.isPending}
                className="rounded-xl bg-emerald-600 p-3 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-500"
              >
                <Plus size={20} />
              </button>
            </div>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-700 bg-gray-950 p-3 text-gray-200 outline-none transition hover:border-gray-600"
            >
              <option value="">-- Choose Topic --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column - Note Editor */}
        <div
          className={`space-y-6 transition-all duration-500 lg:col-span-8 ${!selectedTopic ? 'pointer-events-none opacity-30' : 'opacity-100'}`}
        >
          <div className="rounded-3xl border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-400">
              Step 3: Content Editor (Markdown)
            </h2>
            <div className="space-y-4">
              <input
                {...noteForm.register('title')}
                placeholder="Lesson Title (e.g. Introduction to Hooks)"
                className="w-full rounded-2xl border border-gray-700 bg-gray-950 p-4 text-xl font-bold outline-none ring-purple-500 transition-all focus:ring-2"
              />
              <textarea
                {...noteForm.register('content')}
                placeholder="# Use Markdown! &#10;## Headers &#10;```javascript &#10; const code = 'blocks'; &#10;```"
                rows={12}
                className="w-full rounded-2xl border border-gray-700 bg-gray-950 p-4 font-mono text-sm leading-relaxed outline-none ring-purple-500 focus:ring-2"
              />
              <button
                type="button"
                disabled={publishing}
                onClick={handleUploadNote}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 text-lg font-black shadow-xl shadow-indigo-900/20 transition hover:from-purple-500 hover:to-indigo-500"
              >
                {publishing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <FileText />
                )}
                {publishing ? 'Publishing...' : 'Publish Lesson'}
              </button>
            </div>
          </div>

          {/* Note List Container */}
          {notes.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-center justify-between rounded-2xl border border-gray-700 bg-gray-800/80 p-4 transition-all hover:border-indigo-500/50"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="truncate font-bold">{note.title}</span>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    disabled={deleteNoteMutation.isPending}
                    className="p-2 text-gray-500 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
