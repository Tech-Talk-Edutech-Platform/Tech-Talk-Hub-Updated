// src/components/NotesPanel.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  materialDark,
  vscDarkPlus,
} from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function NotesPanel({ darkMode, courseId }) {
  const [topics, setTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch topics
  useEffect(() => {
    if (!courseId) return

    const fetchTopics = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('course_id', courseId)
        .order('title')

      if (!error) setTopics(data || [])
      setLoading(false)
    }

    fetchTopics()
  }, [courseId])

  // Fetch notes
  useEffect(() => {
    if (!selectedTopic) return

    const fetchNotes = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('topic_id', selectedTopic.id)
        .order('title')

      if (!error) setNotes(data || [])
      setLoading(false)
    }

    fetchNotes()
  }, [selectedTopic])

  const openNote = async (noteId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single()

    if (!error) setSelectedNote(data)
    setLoading(false)
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
                key={t.id}
                onClick={() => {
                  setSelectedTopic(t)
                  setSelectedNote(null)
                }}
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
              onClick={() => setSelectedTopic(null)}
              className="mb-3 text-sm text-secondary hover:underline"
            >
              ← Topics
            </button>

            <div className="space-y-2">
              {notes.map((n) => (
                <button
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
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-4 text-3xl font-bold text-primary">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 text-xl font-bold text-secondary">
                      {children}
                    </h2>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed">{children}</p>
                  ),
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={darkMode ? materialDark : vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="rounded-sm bg-gray-200 px-2 py-1 text-pink-500 dark:bg-gray-800">
                        {children}
                      </code>
                    )
                  },
                }}
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
