import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import {
  Plus,
  Trash2,
  BookOpen,
  Layers,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminNotesManager() {
  const [courses, setCourses] = useState([])
  const [topics, setTopics] = useState([])
  const [notes, setNotes] = useState([])

  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')

  const [newCourse, setNewCourse] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  const [status, setStatus] = useState({ type: '', msg: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(
    () => () => {
      if (statusTimeout.current) clearTimeout(statusTimeout.current)
    },
    [],
  )

  const showStatus = (type, msg) => {
    if (statusTimeout.current) clearTimeout(statusTimeout.current)
    setStatus({ type, msg })
    statusTimeout.current = setTimeout(() => {
      setStatus({ type: '', msg: '' })
      statusTimeout.current = null
    }, 4000)
  }

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('title')
    setCourses(data || [])
  }

  const fetchTopics = async (courseId) => {
    if (!courseId) return
    const { data } = await supabase
      .from('topics')
      .select('*')
      .eq('course_id', courseId)
      .order('title')
    setTopics(data || [])
  }

  const fetchNotes = async (topicId) => {
    if (!topicId) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at')
    setNotes(data || [])
  }

  const handleCreateCourse = async () => {
    if (!newCourse) return
    const { error } = await supabase
      .from('courses')
      .insert([{ title: newCourse }])
    if (error) return showStatus('error', 'Failed to create course.')
    setNewCourse('')
    fetchCourses()
    showStatus('success', 'Course created!')
  }

  const handleCreateTopic = async () => {
    if (!newTopic || !selectedCourse) return
    const { error } = await supabase
      .from('topics')
      .insert([{ title: newTopic, course_id: selectedCourse }])
    if (error) return showStatus('error', 'Failed to create topic.')
    setNewTopic('')
    fetchTopics(selectedCourse)
    showStatus('success', 'Topic created!')
  }

  const handleUploadNote = async () => {
    if (!noteTitle || !noteContent || !selectedTopic) {
      return showStatus('error', 'Fill all note fields.')
    }

    setLoading(true)
    // Explicitly mapping to your DB columns
    const { error } = await supabase.from('notes').insert([
      {
        title: noteTitle,
        content: noteContent,
        topic_id: selectedTopic,
        course_id: selectedCourse, // Ensure you ran the SQL ALTER TABLE command above
      },
    ])

    if (error) {
      console.error('Supabase Upload Error:', error)
      showStatus('error', `Error: ${error.message}`)
    } else {
      setNoteTitle('')
      setNoteContent('')
      fetchNotes(selectedTopic)
      showStatus('success', 'Note published!')
    }
    setLoading(false)
  }

  const deleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) fetchNotes(selectedTopic)
  }

  return (
    <div className="max-w mx-auto min-h-screen bg-gray-900 p-4 text-gray-100 md:p-8">
      <header className="mb-10 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/:role`)}
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
                className="rounded-xl bg-indigo-600 p-3 shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500"
              >
                <Plus size={20} />
              </button>
            </div>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value)
                fetchTopics(e.target.value)
                setSelectedTopic('')
                setNotes([])
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
                className="rounded-xl bg-emerald-600 p-3 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-500"
              >
                <Plus size={20} />
              </button>
            </div>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value)
                fetchNotes(e.target.value)
              }}
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
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Lesson Title (e.g. Introduction to Hooks)"
                className="w-full rounded-2xl border border-gray-700 bg-gray-950 p-4 text-xl font-bold outline-none ring-purple-500 transition-all focus:ring-2"
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="# Use Markdown! &#10;## Headers &#10;```javascript &#10; const code = 'blocks'; &#10;```"
                rows={12}
                className="w-full rounded-2xl border border-gray-700 bg-gray-950 p-4 font-mono text-sm leading-relaxed outline-none ring-purple-500 focus:ring-2"
              />
              <button
                disabled={loading}
                onClick={handleUploadNote}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 text-lg font-black shadow-xl shadow-indigo-900/20 transition hover:from-purple-500 hover:to-indigo-500"
              >
                {loading ? <Loader2 className="animate-spin" /> : <FileText />}
                {loading ? 'Publishing...' : 'Publish Lesson'}
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
                    <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                    <span className="truncate font-bold">{note.title}</span>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
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
