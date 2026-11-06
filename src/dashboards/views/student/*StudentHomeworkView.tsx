import React, { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  Sparkles,
  ChevronRight,
  Send,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import type { Tables } from '../../../types/database'

type Assignment = Tables<'student_assignments'>

interface StudentHomeworkViewProps {
  userId: string
  courseId?: string
}

export default function StudentHomeworkView({
  userId,
  courseId,
}: StudentHomeworkViewProps) {
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null)
  const [submissionText, setSubmissionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchHomework()
    }
  }, [userId, courseId])

  useEffect(() => {
    if (selectedAssignment) {
      setSubmissionText(selectedAssignment.submission_link || '')
    } else {
      setSubmissionText('')
    }
  }, [selectedAssignment])

  const fetchHomework = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const fetchedAssignments = data || []
      setAssignments(fetchedAssignments)

      if (fetchedAssignments.length > 0) {
        const assignment =
          fetchedAssignments.find((a) => a.id === selectedAssignment?.id) ||
          fetchedAssignments[0]

        setSelectedAssignment(assignment)
      }
    } catch (err) {
      console.error('Error fetching homework:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
  }

  const handleSubmitHomework = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedAssignment) return

    try {
      setSubmitting(true)
      const timestamp = new Date().toISOString()

      const { error } = await supabase
        .from('student_assignments')
        .update({
          submission_link: submissionText,
          status: 'submitted',
          updated_at: timestamp,
          submitted_at: timestamp,
        })
        .eq('id', selectedAssignment.id)

      if (error) throw error

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === selectedAssignment.id
            ? {
                ...a,
                submission_link: submissionText,
                status: 'submitted',
                submitted_at: timestamp,
                updated_at: timestamp,
              }
            : a,
        ),
      )

      setSelectedAssignment((prev) =>
        prev
          ? {
              ...prev,
              submission_link: submissionText,
              status: 'submitted',
              submitted_at: timestamp,
              updated_at: timestamp,
            }
          : null,
      )

      alert('Homework submitted successfully! 🎉')
    } catch (err) {
      console.error('Error submitting homework:', err.message)
      alert('Failed to submit homework. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-[30px] border border-white/10 bg-white/15 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-5 h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <h2 className="text-xl font-bold text-white">Loading Homework...</h2>
          <p className="mt-2 text-gray-300">Fetching your assignments 🚀</p>
        </div>
      </div>
    )
  }

  const pendingCount = assignments.filter((a) => a.status === 'pending').length

  const submittedCount = assignments.filter(
    (a) => a.status === 'submitted',
  ).length

  const needsRevisionCount = assignments.filter(
    (a) => a.status === 'needs_revision',
  ).length

  const completedCount = assignments.filter(
    (a) => a.status === 'completed',
  ).length

  return (
    <div className="space-y-6 p-4 text-gray-900 dark:text-white md:p-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[35px] border border-gray-200 bg-white p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 bg-blue-500/10 blur-[120px]" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-300">
              <FileText size={16} />
              HOMEWORK & TASKS
            </div>
            <h1 className="text-3xl font-black md:text-4xl">My Assignments</h1>
            <p className="mt-2 max-w-xl text-gray-600 dark:text-gray-300">
              Track your pending projects, review tutor feedback, and submit
              your completed coding work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-center dark:border-white/10 dark:bg-white/10">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Pending
              </p>
              <p className="text-xl font-black text-orange-500">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-center dark:border-white/10 dark:bg-white/10">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Submitted
              </p>
              <p className="text-xl font-black text-blue-500">
                {submittedCount}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-center dark:border-white/10 dark:bg-white/10">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Revision
              </p>
              <p className="text-xl font-black text-amber-500">
                {needsRevisionCount}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-center dark:border-white/10 dark:bg-white/10">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Completed
              </p>
              <p className="text-xl font-black text-green-500">
                {completedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Assignment Details & Submission Form */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-[35px] border border-gray-200 bg-white p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 md:p-8">
            {selectedAssignment ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        selectedAssignment.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : selectedAssignment.status === 'submitted'
                            ? 'bg-blue-500/20 text-blue-400'
                            : selectedAssignment.status === 'needs_revision'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      {selectedAssignment.status === 'completed' ? (
                        <CheckCircle2 size={20} />
                      ) : selectedAssignment.status === 'needs_revision' ? (
                        <AlertCircle size={20} />
                      ) : (
                        <Clock size={20} />
                      )}
                    </div>
                    <span
                      className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider ${
                        selectedAssignment.status === 'completed'
                          ? 'border border-green-500/25 bg-green-500/10 text-green-600'
                          : selectedAssignment.status === 'submitted'
                            ? 'border border-blue-500/25 bg-blue-500/10 text-blue-600'
                            : selectedAssignment.status === 'needs_revision'
                              ? 'border border-amber-500/25 bg-amber-500/10 text-amber-600'
                              : 'border border-orange-500/25 bg-orange-500/10 text-orange-600'
                      }`}
                    >
                      {selectedAssignment.status
                        ? selectedAssignment.status.replace('_', ' ')
                        : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock size={16} />
                    <span>
                      {new Date(
                        selectedAssignment.created_at,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black md:text-3xl">
                    {selectedAssignment.task_name}
                  </h2>
                  <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
                    {selectedAssignment.description ||
                      selectedAssignment.instructions ||
                      'Complete the assigned task and paste your project or file link below for your tutor to review.'}
                  </p>
                </div>

                {selectedAssignment.status === 'needs_revision' && (
                  <div className="space-y-1 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                    <p className="flex items-center gap-1.5 font-bold">
                      <AlertCircle size={16} /> Revision Required
                    </p>
                    <p className="text-xs">
                      Your tutor requested adjustments based on your previous
                      submission. Please review the feedback below and update
                      your link.
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6 dark:border-white/10">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                    <Upload size={18} className="text-purple-500" />
                    Submit Your Work
                  </h3>
                  <form onSubmit={handleSubmitHomework} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-600 dark:text-gray-300">
                        Project Link (Scratch, GitHub, or File URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://scratch.mit.edu/projects/... or https://github.com/..."
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        required
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-400 transition focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 py-4 font-black text-white shadow-lg shadow-purple-500/20 transition hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Send size={18} />
                          <span>
                            {selectedAssignment.status === 'completed'
                              ? 'Resubmit Homework'
                              : selectedAssignment.status === 'submitted'
                                ? 'Update Submission'
                                : selectedAssignment.status === 'needs_revision'
                                  ? 'Resubmit for Review'
                                  : 'Submit Homework'}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {selectedAssignment.tutor_feedback && (
                  <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 dark:bg-purple-500/10">
                    <h4 className="mb-2 flex items-center gap-2 font-bold text-purple-600 dark:text-purple-300">
                      <Sparkles size={16} />
                      Tutor Feedback
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {selectedAssignment.tutor_feedback}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-bold">
                  Select an assignment to view details and submit.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Assignments List Sidebar */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-[35px] border border-gray-200 bg-white p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black">All Assignments</h3>
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-300">
                {assignments.length} Total
              </span>
            </div>

            <div className="max-h-[550px] space-y-3 overflow-y-auto pr-1">
              {assignments.length > 0 ? (
                assignments.map((item) => {
                  const isSelected = selectedAssignment?.id === item.id
                  const isCompleted = item.status === 'completed'
                  const isSubmitted = item.status === 'submitted'
                  const isNeedsRevision = item.status === 'needs_revision'

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectAssignment(item)}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isCompleted
                              ? 'bg-green-500/20 text-green-400'
                              : isSubmitted
                                ? 'bg-blue-500/20 text-blue-400'
                                : isNeedsRevision
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-orange-500/20 text-orange-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={20} />
                          ) : isNeedsRevision ? (
                            <AlertCircle size={20} />
                          ) : (
                            <Clock size={20} />
                          )}
                        </div>
                        <div>
                          <p
                            className={`line-clamp-1 text-sm font-bold ${
                              isSelected
                                ? 'text-white'
                                : 'text-gray-800 dark:text-white'
                            }`}
                          >
                            {item.task_name}
                          </p>
                          <p
                            className={`text-xs capitalize ${isSelected ? 'text-white/80' : 'text-gray-400'}`}
                          >
                            {item.status
                              ? item.status.replace('_', ' ')
                              : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className={isSelected ? 'text-white' : 'text-gray-400'}
                      />
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center text-sm text-gray-400">
                  No assignments assigned yet. Keep up the great work!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
