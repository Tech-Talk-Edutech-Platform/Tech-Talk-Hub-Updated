// import React, { useState, useEffect } from 'react';
// import { supabase } from "../../../supabase";
// import toast from "react-hot-toast";
// import { ChevronDown, ChevronUp, Plus, Loader2, Save } from "lucide-react";
import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabase' // Ensure this is your local file
import { toast } from 'react-hot-toast'
import { ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react'

interface CreateExamProps {
  examId?: string
}

export default function CreateExam({ examId }: CreateExamProps) {
  const [questions, setQuestions] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (examId) {
      fetchQuestions()
    } else {
      setLoading(false)
    }
  }, [examId])

  async function fetchQuestions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Fetch Error:', error)
      toast.error('Could not load questions.')
    } else {
      setQuestions(data || [])
    }
    setLoading(false)
  }

  async function addQuestion() {
    if (!examId) {
      toast.error('No Exam ID found!')
      return
    }

    const newQ = {
      exam_id: examId,
      question_text: 'New Question',
      options: { A: '', B: '', C: '', D: '' },
      correct_answer: '',
    }

    const { data, error } = await supabase
      .from('questions')
      .insert([newQ])
      .select()

    if (error) {
      console.error('Insert Error:', error)
      toast.error('Database error: ' + error.message)
    } else {
      // Add the new question to state
      setQuestions([...questions, ...data])
      setExpandedId(data[0].id) // Auto-expand the new question
      toast.success('Question added!')
    }
  }

  async function updateQuestion(id, updates) {
    const { error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
    if (error) {
      toast.error('Failed to save changes')
    } else {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updates } : q)),
      )
    }
  }

  if (loading)
    return (
      <div className="p-10 text-center">
        <Loader2 className="mx-auto animate-spin text-blue-600" size={32} />
      </div>
    )

  return (
    <div className="mx-auto mt-10 max-w-4xl rounded-3xl bg-white p-10 shadow-xl">
      <div className="mb-8 flex items-center justify-between border-b pb-6">
        <h1 className="text-2xl font-bold">
          Exam Builder (Exam: {examId || 'Not set'})
        </h1>
        <button
          onClick={addQuestion}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          <Plus size={18} /> Add Question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-10 text-center text-gray-400">
          No questions yet. Click "Add Question" to start.
        </div>
      ) : (
        questions.map((q, idx) => (
          <div
            key={q.id}
            className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-6"
          >
            <div
              className="flex cursor-pointer items-center justify-between"
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            >
              <h3 className="text-lg font-bold text-gray-800">
                Question {idx + 1}
              </h3>
              {expandedId === q.id ? (
                <ChevronUp className="text-gray-400" />
              ) : (
                <ChevronDown className="text-gray-400" />
              )}
            </div>

            {expandedId === q.id && (
              <div className="animate-in fade-in mt-4 space-y-4 duration-300">
                <input
                  defaultValue={q.question_text}
                  onBlur={(e) =>
                    updateQuestion(q.id, { question_text: e.target.value })
                  }
                  className="w-full rounded-xl border p-3 shadow-sm outline-none ring-blue-200 focus:ring-2"
                  placeholder="Type your question text here..."
                />
                <div className="grid grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D'].map((key) => (
                    <div key={key} className="flex flex-col">
                      <span className="mb-1 text-[10px] font-bold uppercase text-gray-400">
                        Option {key}
                      </span>
                      <input
                        placeholder={`Value for ${key}`}
                        defaultValue={q.options?.[key] || ''}
                        onBlur={(e) => {
                          const newOpts = {
                            ...q.options,
                            [key]: e.target.value,
                          }
                          updateQuestion(q.id, { options: newOpts })
                        }}
                        className="rounded-xl border p-3 shadow-sm outline-none ring-blue-200 focus:ring-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
