import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
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
import { plannedDb } from '../../lib/plannedDb'
import type { PlannedDatabase, PlannedRow } from '../../types/plannedTables'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  materialDark,
  vscDarkPlus,
} from 'react-syntax-highlighter/dist/esm/styles/prism'
import CountdownRing from '../CountdownRing'
import { HighlightedCode } from '../ui/HighlightedCode'

type Topic = PlannedRow<'topics'>
type Note = PlannedRow<'notes'>
type NextClass =
  PlannedDatabase['public']['Functions']['get_next_class']['Returns']

interface LearningUser {
  id: string
  role: string | null
}

async function fetchTopicNotes(topicId: string): Promise<Note[]> {
  const { data, error } = await plannedDb
    .from('notes')
    .select('*')
    .eq('topic_id', topicId)
    .order('created_at')
  if (error) throw error
  return data
}

async function fetchCourseTopics(courseId: string): Promise<Topic[]> {
  const { data, error } = await plannedDb
    .from('topics')
    .select('*')
    .eq('course_id', courseId)
    .order('title')
  if (error) throw error
  return data
}

async function fetchCompletedNoteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_notes_progress')
    .select('note_id')
    .eq('user_id', userId)
  if (error) throw error
  return data.flatMap((item) => (item.note_id ? [item.note_id] : []))
}

async function fetchNextClass(user: LearningUser): Promise<NextClass> {
  const { data, error } = await plannedDb.rpc('get_next_class', {
    user_id: user.id,
    role: user.role,
  })
  if (error) throw error
  return data
}

function lessonComponents(theme: Record<string, CSSProperties>): Components {
  return {
    code: ({ className, children }) => (
      <HighlightedCode
        className={className}
        theme={theme}
        inlineClassName="rounded-sm bg-indigo-100 px-2 py-0.5 font-mono font-bold text-indigo-600 dark:bg-gray-700 dark:text-green-300"
        blockClassName="border-opacity-10 my-4 rounded-xl border shadow-inner"
      >
        {children}
      </HighlightedCode>
    ),
  }
}

const LESSON_COMPONENTS = {
  dark: lessonComponents(materialDark),
  light: lessonComponents(vscDarkPlus),
}

interface NotesNavigationProps {
  topic: Topic
  onSelectNote: (note: Note) => void
  darkMode: boolean
  completedNotes: string[]
  onBack: () => void
}

// --- Sub-Component: Sidebar (Only shows when a topic is selected) ---
function NotesNavigation({
  topic,
  onSelectNote,
  darkMode,
  completedNotes,
  onBack,
}: NotesNavigationProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchTopicNotes(topic.id).then(
      (rows) => {
        if (cancelled) return
        setNotes(rows)
        setLoading(false)
      },
      () => {
        if (!cancelled) setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [topic.id])

  if (loading) return <p className="p-4 text-sm opacity-50">Loading notes...</p>

  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1 text-sm font-bold text-indigo-500 hover:underline"
      >
        <ChevronLeft size={16} /> Back to Topics
      </button>

      <h3
        className={`mb-4 px-2 text-xs font-black tracking-widest uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'} opacity-70`}
      >
        {topic.title}
      </h3>

      <div className="flex flex-col gap-2 overflow-y-auto pr-2">
        {notes.map((n) => (
          <button
            type="button"
            key={n.id}
            onClick={() => onSelectNote(n)}
            className={`flex w-full items-center justify-between rounded-xl border-l-4 p-3 text-left font-bold transition-all ${
              darkMode
                ? 'border-indigo-500 bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'border-yellow-400 bg-white text-gray-800 shadow-xs hover:bg-yellow-50'
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
export default function LearningPage({ user }: { user: LearningUser | null }) {
  const navigate = useNavigate()
  const { id: courseId } = useParams()

  const [darkMode, setDarkMode] = useState(true)
  const [classStarted, setClassStarted] = useState(false)
  const [nextClass, setNextClass] = useState<NextClass>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [completedNotes, setCompletedNotes] = useState<string[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch all topics for this course
  useEffect(() => {
    if (!courseId) return undefined

    let cancelled = false
    fetchCourseTopics(courseId).then(
      (rows) => {
        if (!cancelled) setTopics(rows)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [courseId])

  // Fetch progress tracking for the current user
  useEffect(() => {
    if (!user) return undefined

    let cancelled = false
    fetchCompletedNoteIds(user.id).then(
      (ids) => {
        if (!cancelled) setCompletedNotes(ids)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [user])

  // Fetch upcoming scheduled class live feedback
  useEffect(() => {
    if (!user) return undefined

    let cancelled = false
    fetchNextClass(user).then(
      (next) => {
        if (!cancelled && next) setNextClass(next)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [user])

  // Handle Mark as Completed logic
  const toggleCompletion = async (noteId: string) => {
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
          type="button"
          onClick={() => void navigate(-1)}
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
            type="button"
            aria-label={
              darkMode ? 'Switch to light mode' : 'Switch to dark mode'
            }
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
              key={selectedTopic.id}
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
                    type="button"
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
                  className={`prose ${darkMode ? 'text-gray-200 prose-invert' : 'text-gray-800'} mb-10 max-w-none leading-relaxed font-medium`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={
                      darkMode
                        ? LESSON_COMPONENTS.dark
                        : LESSON_COMPONENTS.light
                    }
                  >
                    {selectedNote.content}
                  </ReactMarkdown>
                </div>

                {/* --- Mark as Completed Button --- */}
                <hr
                  className={`mb-8 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                />
                <button
                  type="button"
                  onClick={() => void toggleCompletion(selectedNote.id)}
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
