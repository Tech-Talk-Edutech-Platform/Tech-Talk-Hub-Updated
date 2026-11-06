import { supabase } from '../../lib/supabase'

export type CourseOption = { id: string; title: string }
export type TopicOption = { id: string; title: string }
export type NoteSummary = { id: string; title: string }

export type NewNote = {
  title: string
  content: string
  topic_id: string
  course_id: string
}

export async function fetchCourses(
  signal?: AbortSignal,
): Promise<CourseOption[]> {
  let query = supabase.from('courses').select('id, title').order('title')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchTopicsByCourse(
  courseId: string,
  signal?: AbortSignal,
): Promise<TopicOption[]> {
  let query = supabase
    .from('topics')
    .select('id, title')
    .eq('course_id', courseId)
    .order('title')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchNotesByTopic(
  topicId: string,
  signal?: AbortSignal,
): Promise<NoteSummary[]> {
  let query = supabase
    .from('notes')
    .select('id, title')
    .eq('topic_id', topicId)
    .order('created_at')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createCourse(title: string): Promise<void> {
  const { error } = await supabase.from('courses').insert([{ title }])
  if (error) throw error
}

export async function createTopic(input: {
  title: string
  courseId: string
}): Promise<void> {
  const { error } = await supabase
    .from('topics')
    .insert([{ title: input.title, course_id: input.courseId }])
  if (error) throw error
}

export async function createNote(note: NewNote): Promise<void> {
  const { error } = await supabase.from('notes').insert([note])
  if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}
