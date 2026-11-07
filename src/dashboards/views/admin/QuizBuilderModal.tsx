import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import {
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import { toast } from 'react-hot-toast'
import type { Json } from '../../../types/database'
import { quizOptions } from '../../../lib/quiz'

interface QuizBuilderLesson {
  id: string
  title: string
}

interface QuizBuilderCourse {
  id: string
}

interface QuizQuestionDraft {
  /** Stable React key; the saved row id when there is one. */
  key: string
  question_text: string
  options: string[]
  correct_option_index: number
}

interface QuizBuilderModalProps {
  selectedLesson: QuizBuilderLesson
  selectedCourse: QuizBuilderCourse
  onClose: () => void
}

interface LessonData {
  noteTitle: string
  noteContent: string
  videoUrl: string
  quizId: string
  quizTitle: string
  passingScore: string
  questions: QuizQuestionDraft[]
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function blankQuestion(): QuizQuestionDraft {
  return {
    key: crypto.randomUUID(),
    question_text: '',
    options: ['', '', '', ''],
    correct_option_index: 0,
  }
}

/** A saved question's options, or four blanks to fill in when it has none. */
function editableOptions(question: { options: Json }): string[] {
  const options = quizOptions(question.options)
  return options.length > 0 ? options : ['', '', '', '']
}

async function loadLessonData(
  courseId: string,
  lesson: QuizBuilderLesson,
): Promise<LessonData> {
  // 1. Notes linked to the lesson, falling back to title matching for older records
  const { data: noteData } = await supabase
    .from('notes')
    .select('*')
    .eq('course_id', courseId)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  let note = noteData
  if (!note) {
    const { data: fallbackNote } = await supabase
      .from('notes')
      .select('*')
      .eq('course_id', courseId)
      .ilike('title', `%${lesson.title}%`)
      .maybeSingle()
    note = fallbackNote
  }

  // 2. The quiz for this lesson
  const { data: quizData } = await supabase
    .from('quizzes')
    .select('*, quiz_questions(*)')
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  // Sort questions by position so the order stays stable
  const savedQuestions = (quizData?.quiz_questions ?? []).toSorted(
    (a, b) => (a.position || 0) - (b.position || 0),
  )

  return {
    noteTitle: note?.title || lesson.title,
    noteContent: note?.content || '',
    videoUrl: note?.video_url || '',
    quizId: quizData?.id ?? '',
    quizTitle: quizData?.title ?? `${lesson.title} Assessment`,
    passingScore: String(quizData?.passing_score || 70),
    questions:
      savedQuestions.length > 0
        ? savedQuestions.map((q) => ({
            key: q.id,
            question_text: q.question_text,
            options: editableOptions(q),
            correct_option_index: q.correct_option_index,
          }))
        : [blankQuestion()],
  }
}

export default function QuizBuilderModal({
  selectedLesson,
  selectedCourse,
  onClose,
}: QuizBuilderModalProps) {
  const [lessonContentType, setLessonContentType] = useState('notes')

  // Notes State
  const [lessonNoteTitle, setLessonNoteTitle] = useState('')
  const [lessonNoteContent, setLessonNoteContent] = useState('')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Quiz State (Per-Lesson)
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [passingScore, setPassingScore] = useState('70')
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(() => [
    blankQuestion(),
  ])
  const [savingQuiz, setSavingQuiz] = useState(false)

  // Accordion state - Default to null (collapsed)
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  const savedQuizzesCount = selectedQuizId ? 1 : 0

  const applyLessonData = (data: LessonData) => {
    setLessonNoteTitle(data.noteTitle)
    setLessonNoteContent(data.noteContent)
    setLessonVideoUrl(data.videoUrl)
    setSelectedQuizId(data.quizId)
    setQuizTitle(data.quizTitle)
    setPassingScore(data.passingScore)
    setQuestions(data.questions)
    setExpandedQuestion(null)
  }

  useEffect(() => {
    let cancelled = false
    loadLessonData(selectedCourse.id, selectedLesson).then(
      (data) => {
        if (cancelled) return
        setLessonNoteTitle(data.noteTitle)
        setLessonNoteContent(data.noteContent)
        setLessonVideoUrl(data.videoUrl)
        setSelectedQuizId(data.quizId)
        setQuizTitle(data.quizTitle)
        setPassingScore(data.passingScore)
        setQuestions(data.questions)
        setExpandedQuestion(null)
      },
      (err: unknown) => {
        console.error('Error fetching lesson content:', err)
      },
    )
    return () => {
      cancelled = true
    }
  }, [selectedCourse.id, selectedLesson])

  const reloadLessonData = async () => {
    try {
      applyLessonData(await loadLessonData(selectedCourse.id, selectedLesson))
    } catch (err) {
      console.error('Error fetching lesson content:', err)
    }
  }

  const handleSaveNotes = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCourse.id || !selectedLesson.id) {
      toast.error('Missing course or lesson ID.')
      return
    }

    setSavingNotes(true)
    try {
      const notePayload = {
        course_id: selectedCourse.id,
        lesson_id: selectedLesson.id,
        title: lessonNoteTitle.trim() || selectedLesson.title,
        content: lessonNoteContent,
        video_url: lessonVideoUrl.trim() || null,
      }

      const { error } = await supabase
        .from('notes')
        .upsert(notePayload, { onConflict: 'lesson_id' })

      if (error) throw error
      toast.success('Lesson notes saved successfully!')
      await reloadLessonData()
    } catch (err) {
      console.error('Save notes error details:', err)
      toast.error('Failed to save notes: ' + getErrorMessage(err))
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSaveQuiz = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSavingQuiz(true)

    try {
      let quizId = selectedQuizId

      if (quizId) {
        const { error: updateErr } = await supabase
          .from('quizzes')
          .update({
            title: quizTitle.trim() || `${selectedLesson.title} Assessment`,
            passing_score: parseInt(passingScore, 10) || 70,
          })
          .eq('id', quizId)
        if (updateErr) throw updateErr
      } else {
        const { data: newQuiz, error: insertErr } = await supabase
          .from('quizzes')
          .insert([
            {
              course_id: selectedCourse.id,
              lesson_id: selectedLesson.id,
              title: quizTitle.trim() || `${selectedLesson.title} Assessment`,
              type: 'lesson_quiz',
              passing_score: parseInt(passingScore, 10) || 70,
            },
          ])
          .select()
          .single()
        if (insertErr) throw insertErr
        quizId = newQuiz.id
        setSelectedQuizId(quizId)
      }

      // Clean wipe old questions and replace with the current state array (actual DB replacement)
      const { error: deleteErr } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId)
      if (deleteErr) throw deleteErr

      const formattedQuestions = questions.map((q, idx) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        position: idx + 1,
      }))

      const { error: qError } = await supabase
        .from('quiz_questions')
        .insert(formattedQuestions)
      if (qError) throw qError

      toast.success('Quiz assessment published and replaced successfully!')
      await reloadLessonData()
    } catch (err) {
      toast.error('Failed to save quiz: ' + getErrorMessage(err))
    } finally {
      setSavingQuiz(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-white/10">
          <div>
            <span className="mb-1.5 inline-block rounded-lg border border-purple-100 bg-purple-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-purple-600 uppercase dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">
              Lesson Studio
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {selectedLesson.title}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close lesson studio"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-6 dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setLessonContentType('notes')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black tracking-wider uppercase transition-all ${lessonContentType === 'notes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <FileText size={15} /> Lesson Notes & Media
          </button>
          <button
            type="button"
            onClick={() => setLessonContentType('quiz')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black tracking-wider uppercase transition-all ${lessonContentType === 'quiz' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <HelpCircle size={15} /> Quiz Assessment ({savedQuizzesCount} Saved)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {lessonContentType === 'notes' ? (
            <form
              onSubmit={(e) => void handleSaveNotes(e)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="lesson-note-title"
                  className="mb-1 block text-xs font-black tracking-wider text-slate-500 uppercase"
                >
                  Note Title
                </label>
                <input
                  id="lesson-note-title"
                  type="text"
                  value={lessonNoteTitle}
                  onChange={(e) => setLessonNoteTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold focus:outline-purple-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lesson-video-url"
                  className="mb-1 block text-xs font-black tracking-wider text-slate-500 uppercase"
                >
                  Video Walkthrough URL
                </label>
                <input
                  id="lesson-video-url"
                  type="url"
                  placeholder="https://..."
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold focus:outline-purple-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="lesson-note-content"
                  className="mb-1 block text-xs font-black tracking-wider text-slate-500 uppercase"
                >
                  Content / Markdown Notes
                </label>
                <textarea
                  id="lesson-note-content"
                  rows={6}
                  value={lessonNoteContent}
                  onChange={(e) => setLessonNoteContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold focus:outline-purple-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="rounded-xl bg-purple-600 px-6 py-3 text-xs font-black tracking-wider text-white uppercase shadow-md hover:bg-purple-700"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => void handleSaveQuiz(e)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="quiz-title"
                    className="mb-1 block text-xs font-black tracking-wider text-slate-500 uppercase"
                  >
                    Quiz Title
                  </label>
                  <input
                    id="quiz-title"
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="quiz-passing-score"
                    className="mb-1 block text-xs font-black tracking-wider text-slate-500 uppercase"
                  >
                    Passing Score (%)
                  </label>
                  <input
                    id="quiz-passing-score"
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    min="1"
                    max="100"
                    required
                  />
                </div>
              </div>

              {/* Questions Accordion Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black tracking-wider text-slate-800 uppercase dark:text-white">
                    Questions ({questions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestions([...questions, blankQuestion()])
                      setExpandedQuestion(questions.length) // Expand newly added question
                    }}
                    className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-black text-purple-700 uppercase"
                  >
                    + Add Question
                  </button>
                </div>

                {questions.map((q, qIndex) => {
                  const isOpen = expandedQuestion === qIndex
                  return (
                    <div
                      key={q.key}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-all dark:border-white/10 dark:bg-white/5"
                    >
                      {/* Accordion Header (Collapsed by default) */}
                      <div className="relative flex cursor-pointer items-center justify-between bg-slate-100/50 p-4 dark:bg-white/5">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={`Question ${qIndex + 1}`}
                          onClick={() =>
                            setExpandedQuestion(isOpen ? null : qIndex)
                          }
                          className="absolute inset-0 cursor-pointer"
                        />
                        <span className="text-xs font-black text-purple-600">
                          Q{qIndex + 1}:{' '}
                          {q.question_text
                            ? q.question_text.substring(0, 35) + '...'
                            : 'Untitled Question'}
                        </span>
                        <div className="pointer-events-none relative flex items-center gap-2">
                          {questions.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Delete question ${qIndex + 1}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setQuestions(
                                  questions.filter((_, idx) => idx !== qIndex),
                                )
                              }}
                              className="pointer-events-auto p-1 text-rose-500 hover:text-rose-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          {isOpen ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </div>
                      </div>

                      {/* Accordion Editable Content */}
                      {isOpen && (
                        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-white/10">
                          <input
                            type="text"
                            placeholder="Type question prompt..."
                            value={q.question_text}
                            onChange={(e) => {
                              const updated = [...questions]
                              updated[qIndex].question_text = e.target.value
                              setQuestions(updated)
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold dark:border-white/10 dark:bg-slate-900 dark:text-white"
                            required
                          />

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {q.options.map((opt, optIndex) => (
                              <div
                                // oxlint-disable-next-line react/no-array-index-key -- each question has a fixed set of options that is never reordered, so the position is the option's identity
                                key={optIndex}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="radio"
                                  aria-label={`Mark option ${optIndex + 1} as correct`}
                                  name={`correct-${qIndex}`}
                                  checked={q.correct_option_index === optIndex}
                                  onChange={() => {
                                    const updated = [...questions]
                                    updated[qIndex].correct_option_index =
                                      optIndex
                                    setQuestions(updated)
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder={`Option ${optIndex + 1}`}
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...questions]
                                    updated[qIndex].options[optIndex] =
                                      e.target.value
                                    setQuestions(updated)
                                  }}
                                  className="flex-1 rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium dark:border-white/10 dark:bg-slate-900 dark:text-white"
                                  required
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingQuiz}
                  className="rounded-xl bg-purple-600 px-6 py-3 text-xs font-black tracking-wider text-white uppercase shadow-md hover:bg-purple-700"
                >
                  {savingQuiz ? 'Publishing...' : 'Publish Quiz Assessment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
