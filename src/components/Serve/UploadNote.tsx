// src/components/UploadNote.js
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../supabase'
import { plannedDb } from '../../lib/plannedDb'

type Option = { id: string; title: string }

async function fetchCourses(): Promise<Option[]> {
  const { data, error } = await supabase.from('courses').select('id, title')
  if (error) throw error
  return data
}

async function fetchTopics(courseId: string): Promise<Option[]> {
  const { data, error } = await plannedDb
    .from('topics')
    .select('id, title')
    .eq('course_id', courseId)
  if (error) throw error
  return data
}

export default function UploadNote() {
  const [courses, setCourses] = useState<Option[]>([])
  const [topics, setTopics] = useState<Option[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('')

  // Fetch all courses
  useEffect(() => {
    let cancelled = false
    fetchCourses().then(
      (rows) => {
        if (!cancelled) setCourses(rows)
      },
      (error: unknown) => console.error('Error fetching courses:', error),
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch topics for selected course
  useEffect(() => {
    if (!selectedCourse) return undefined

    let cancelled = false
    fetchTopics(selectedCourse).then(
      (rows) => {
        if (!cancelled) setTopics(rows)
      },
      (error: unknown) => console.error('Error fetching topics:', error),
    )
    return () => {
      cancelled = true
    }
  }, [selectedCourse])

  const selectCourse = (courseId: string) => {
    setSelectedCourse(courseId)
    if (!courseId) {
      setTopics([])
      setSelectedTopic('')
    }
  }

  // Upload note
  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCourse || !selectedTopic || !noteTitle || !content) {
      setStatus('⚠️ Fill all fields.')
      return
    }

    const noteId = noteTitle.toLowerCase().replace(/\s+/g, '_')

    const { error } = await plannedDb.from('notes').insert([
      {
        id: noteId,
        course_id: selectedCourse,
        topic_id: selectedTopic,
        title: noteTitle,
        content,
        created_at: new Date().toISOString(),
      },
    ])

    if (!error) {
      setStatus('✅ Note uploaded successfully!')
      setNoteTitle('')
      setContent('')
    } else {
      console.error('Error uploading note:', error)
      setStatus('❌ Failed to upload note.')
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-lg bg-background p-6 shadow-card transition-colors dark:bg-gray-900">
      <h2 className="mb-4 text-xl font-bold text-text dark:text-gray-100">
        Upload a New Note
      </h2>
      <form
        onSubmit={(e) => void handleUpload(e)}
        className="flex flex-col gap-3"
      >
        <select
          aria-label="Course"
          value={selectedCourse}
          onChange={(e) => selectCourse(e.target.value)}
          className="rounded-sm border p-2 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <select
          aria-label="Topic"
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="rounded-sm border p-2 dark:bg-gray-800 dark:text-white"
          disabled={!selectedCourse}
        >
          <option value="">Select Topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <input
          type="text"
          aria-label="Note title"
          placeholder="Note Title"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          className="rounded-sm border p-2 dark:bg-gray-800 dark:text-white"
        />

        <textarea
          aria-label="Content"
          placeholder="Content"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="rounded-sm border p-2 dark:bg-gray-800 dark:text-white"
        />

        <button type="submit" className="rounded-sm bg-primary py-2 text-white">
          Upload Note
        </button>
      </form>

      {status && <p className="mt-3 text-sm dark:text-gray-300">{status}</p>}
    </div>
  )
}
