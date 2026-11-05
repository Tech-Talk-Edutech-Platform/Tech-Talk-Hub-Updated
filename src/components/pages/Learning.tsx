import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Sun,
  Moon,
  ChevronLeft,
  CheckCircle,
  Circle,
} from 'lucide-react'
import { supabase } from '../../supabase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  materialDark,
  vscDarkPlus,
} from 'react-syntax-highlighter/dist/esm/styles/prism'
import CountdownRing from '../CountdownRing'

// --- Sub-Component: Sidebar (Only shows when a topic is selected) ---
function NotesNavigation({
  topic,
  onSelectNote,
  darkMode,
  completedNotes,
  onBack,
}) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!topic) return
    const fetchNotes = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('topic_id', topic.id)
        .order('created_at')
      setNotes(data || [])
      setLoading(false)
    }
    fetchNotes()
  }, [topic])

  if (loading) return <p className="p-4 text-sm opacity-50">Loading notes...</p>

  return (
    <div className="flex h-full flex-col">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1 text-sm font-bold text-indigo-500 hover:underline"
      >
        <ChevronLeft size={16} /> Back to Topics
      </button>

      <h3
        className={`mb-4 px-2 text-xs font-black uppercase tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'} opacity-70`}
      >
        {topic.title}
      </h3>

      <div className="flex flex-col gap-2 overflow-y-auto pr-2">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelectNote(n)}
            className={`flex w-full items-center justify-between rounded-xl border-l-4 p-3 text-left font-bold transition-all ${
              darkMode
                ? 'border-indigo-500 bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'border-yellow-400 bg-white text-gray-800 shadow-sm hover:bg-yellow-50'
            }`}
          >
            <span className="truncate text-sm">{n.title}</span>
            {completedNotes.includes(n.id) && (
              <CheckCircle size={16} className="ml-2 text-green-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// --- Main Component: LearningPage ---
export default function LearningPage({ user }) {
  const navigate = useNavigate()
  const { id: courseId } = useParams()

  const [darkMode, setDarkMode] = useState(true)
  const [classStarted, setClassStarted] = useState(false)
  const [nextClass, setNextClass] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [completedNotes, setCompletedNotes] = useState([])
  const [topics, setTopics] = useState([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch all topics for this course
  useEffect(() => {
    if (!courseId) return
    const fetchTopics = async () => {
      const { data } = await supabase
        .from('topics')
        .select('*')
        .eq('course_id', courseId)
        .order('title')
      setTopics(data || [])
    }
    fetchTopics()
  }, [courseId])

  // Fetch progress tracking for the current user
  useEffect(() => {
    if (!user) return
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('user_notes_progress')
        .select('note_id')
        .eq('user_id', user.id)

      if (!error && data) {
        setCompletedNotes(data.map((item) => item.note_id))
      }
    }
    fetchProgress()
  }, [user])

  // Fetch upcoming scheduled class live feedback
  useEffect(() => {
    if (!user) return
    const fetchNextClass = async () => {
      const { data, error } = await supabase.rpc('get_next_class', {
        user_id: user.id,
        role: user.role,
      })
      if (!error && data) setNextClass(data)
    }
    fetchNextClass()
  }, [user])

  // Handle Mark as Completed logic
  const toggleCompletion = async (noteId) => {
    if (!user || isUpdating) return
    setIsUpdating(true)

    const isDone = completedNotes.includes(noteId)

    if (isDone) {
      const { error } = await supabase
        .from('user_notes_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('note_id', noteId)

      if (!error)
        setCompletedNotes((prev) => prev.filter((id) => id !== noteId))
    } else {
      const { error } = await supabase
        .from('user_notes_progress')
        .insert([{ user_id: user.id, note_id: noteId }])

      if (!error) setCompletedNotes((prev) => [...prev, noteId])
    }
    setIsUpdating(false)
  }

  return (
    <div
      className={`flex min-h-screen flex-col font-poppins transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-orange-50 text-gray-800'}`}
    >
      {/* Header */}
      <div
        className={`z-10 flex items-center justify-between border-b-4 p-3 transition-colors duration-300 ${
          darkMode
            ? 'border-gray-700 bg-gray-800'
            : 'border-yellow-400 bg-white'
        }`}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-2 font-black text-white shadow-lg hover:bg-indigo-600"
        >
          <ArrowLeft size={22} strokeWidth={3} />
          <span className="hidden md:inline">Dashboard</span>
        </button>

        <div className="flex items-center gap-4">
          {classStarted && nextClass && (
            <div className="flex items-center gap-3">
              <CountdownRing
                startTime={nextClass.start_time}
                onStart={() => setClassStarted(true)}
                size={40}
              />
              <p className="hidden text-sm font-bold sm:block">
                {nextClass.class_title}
              </p>
            </div>
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`rounded-2xl border-2 p-2 transition-colors duration-300 ${
              darkMode
                ? 'border-gray-600 bg-gray-700 text-yellow-400'
                : 'border-yellow-200 bg-yellow-50 text-orange-500'
            }`}
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Only visible if a topic is selected */}
        <div
          className={`w-1/5 min-w-[250px] border-r-4 p-4 transition-colors duration-300 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-yellow-400 bg-white'}`}
        >
          {selectedTopic ? (
            <NotesNavigation
              topic={selectedTopic}
              darkMode={darkMode}
              completedNotes={completedNotes}
              onSelectNote={setSelectedNote}
              onBack={() => {
                setSelectedTopic(null)
                setSelectedNote(null)
              }}
            />
          ) : (
            <p
              className={`p-2 text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              Select a module to view lessons.
            </p>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-10">
          {!selectedTopic ? (
            /* Topic Selection Screen (Fully Adaptable Layout) */
            <div className="mx-auto max-w-4xl">
              <h2
                className={`mb-8 text-3xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}
              >
                Choose a Topic to Start
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t)}
                    className={`transform rounded-3xl border-2 p-8 text-left shadow-xl transition-all duration-200 hover:-translate-y-1 ${
                      darkMode
                        ? 'border-gray-700 bg-gray-800 text-white hover:border-indigo-400'
                        : 'border-yellow-100 bg-white text-gray-900 hover:border-indigo-500'
                    }`}
                  >
                    <h3 className="mb-2 text-xl font-bold">{t.title}</h3>
                    <p
                      className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      Click to view all lessons in this module
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : selectedNote ? (
            /* Note Content Screen (Enhanced Visual Layout) */
            <div className="mx-auto max-w-4xl">
              <div
                className={`mb-6 rounded-3xl border-2 p-8 shadow-2xl transition-colors duration-300 ${
                  darkMode
                    ? 'border-gray-700 bg-gray-800'
                    : 'border-yellow-100 bg-white'
                }`}
              >
                <h2 className="mb-6 text-3xl font-black text-indigo-500">
                  {selectedNote.title}
                </h2>

                <div
                  className={`prose ${darkMode ? 'prose-invert text-gray-200' : 'text-gray-800'} mb-10 max-w-none font-medium leading-relaxed`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={darkMode ? materialDark : vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="my-4 rounded-xl border border-opacity-10 shadow-inner"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code
                            className="rounded bg-indigo-100 px-2 py-0.5 font-mono font-bold text-indigo-600 dark:bg-gray-700 dark:text-green-300"
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {selectedNote.content}
                  </ReactMarkdown>
                </div>

                {/* --- Mark as Completed Button --- */}
                <hr
                  className={`mb-8 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                />
                <button
                  onClick={() => toggleCompletion(selectedNote.id)}
                  disabled={isUpdating}
                  className={`flex w-full transform items-center justify-center gap-3 rounded-2xl py-4 text-lg font-black transition-all active:scale-95 ${
                    completedNotes.includes(selectedNote.id)
                      ? 'mb-[5px] bg-green-500 text-white shadow-[0_5px_0_rgb(21,128,61)]'
                      : 'mb-[5px] bg-indigo-500 text-white shadow-[0_5px_0_rgb(67,56,202)] hover:bg-indigo-600'
                  } disabled:opacity-50`}
                >
                  {completedNotes.includes(selectedNote.id) ? (
                    <>
                      <CheckCircle size={24} strokeWidth={3} /> Lesson
                      Completed!
                    </>
                  ) : (
                    <>
                      <Circle size={24} strokeWidth={3} /> Mark as Completed
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Empty State if topic is selected but no note clicked */
            <div
              className={`flex h-full flex-col items-center justify-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
            >
              <p className="text-2xl font-black">
                Choose a lesson from the sidebar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
