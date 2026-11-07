// src/components/NotesPanel.js
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  materialDark,
  vscDarkPlus,
} from 'react-syntax-highlighter/dist/esm/styles/prism'
import { plannedDb } from '../../lib/plannedDb'
import type { PlannedRow } from '../../types/plannedTables'
import { HighlightedCode } from '../ui/HighlightedCode'

type Topic = PlannedRow<'topics'>
type Note = PlannedRow<'notes'>

interface NotesPanelProps {
  darkMode?: boolean
  courseId?: string
}

async function fetchTopics(courseId: string): Promise<Topic[]> {
  const { data, error } = await plannedDb
    .from('topics')
    .select('*')
    .eq('course_id', courseId)
    .order('title')
  if (error) throw error
  return data
}

async function fetchNotes(topicId: string): Promise<Note[]> {
  const { data, error } = await plannedDb
    .from('notes')
    .select('*')
    .eq('topic_id', topicId)
    .order('title')
  if (error) throw error
  return data
}

async function fetchNote(noteId: string): Promise<Note> {
  const { data, error } = await plannedDb
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .single()
  if (error) throw error
  return data
}

function noteComponents(theme: Record<string, CSSProperties>): Components {
  return {
    h1: ({ children }) => (
      <h1 className="mb-4 text-3xl font-bold text-primary">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 text-xl font-bold text-secondary">{children}</h2>
    ),
    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
    code: ({ className, children }) => (
      <HighlightedCode
        className={className}
        theme={theme}
        inlineClassName="rounded-sm bg-gray-200 px-2 py-1 text-pink-500 dark:bg-gray-800"
      >
        {children}
      </HighlightedCode>
    ),
  }
}

const NOTE_COMPONENTS = {
  dark: noteComponents(materialDark),
  light: noteComponents(vscDarkPlus),
}

export default function NotesPanel({ darkMode, courseId }: NotesPanelProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch topics
  useEffect(() => {
    if (!courseId) return undefined

    let cancelled = false
    fetchTopics(courseId).then(
      (rows) => {
        if (cancelled) return
        setTopics(rows)
        setLoading(false)
      },
      () => {
        if (!cancelled) setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [courseId])

  // Fetch notes
  useEffect(() => {
    if (!selectedTopic) return undefined

    let cancelled = false
    fetchNotes(selectedTopic.id).then(
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
  }, [selectedTopic])

  const selectTopic = (topic: Topic) => {
    setLoading(true)
    setSelectedTopic(topic)
    setSelectedNote(null)
  }

  const openNote = (noteId: string) => {
    setLoading(true)
    fetchNote(noteId).then(
      (note) => {
        setSelectedNote(note)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }

  if (loading && !selectedNote) {
    return <p className="p-6 text-gray-400">Loading...</p>
  }

  return (
    <div
      className={`flex h-screen ${darkMode ? 'dark bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}
    >
      {/* ================= SIDEBAR ================= */}
      <div className="w-72 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-800">
        <h2 className="mb-4 text-xl font-black text-primary">📘 Notes</h2>

        {/* TOPICS */}
        {!selectedTopic && (
          <div className="space-y-2">
            {topics.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => selectTopic(t)}
                className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition-all ${
                  darkMode
                    ? 'bg-gray-800 hover:bg-primary hover:text-white'
                    : 'bg-white shadow-sm hover:bg-primary hover:text-white'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        {/* NOTES */}
        {selectedTopic && !selectedNote && (
          <div>
            <button
              type="button"
              onClick={() => setSelectedTopic(null)}
              className="mb-3 text-sm text-secondary hover:underline"
            >
              ← Topics
            </button>

            <div className="space-y-2">
              {notes.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => openNote(n.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-accent hover:text-black'
                      : 'bg-white shadow-sm hover:bg-accent hover:text-black'
                  }`}
                >
                  {n.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= CONTENT ================= */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedNote && (
          <div className="flex h-full items-center justify-center text-lg text-gray-400">
            Select a note to start learning 🚀
          </div>
        )}

        {selectedNote && (
          <div className="mx-auto max-w-4xl">
            <button
              type="button"
              onClick={() => setSelectedNote(null)}
              className="mb-4 text-sm text-secondary hover:underline"
            >
              ← Back
            </button>

            <h1 className="mb-6 text-3xl font-black text-primary">
              {selectedNote.title}
            </h1>

            <div
              className={`rounded-2xl p-6 shadow-xl transition ${darkMode ? 'border border-gray-800 bg-gray-900' : 'border bg-white'} `}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={
                  darkMode ? NOTE_COMPONENTS.dark : NOTE_COMPONENTS.light
                }
              >
                {selectedNote.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
