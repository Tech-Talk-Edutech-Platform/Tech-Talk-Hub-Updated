import React, { useState, useEffect } from 'react'
import {
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Send,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import { isAdminRole } from '../../../types/roles'

export default function SharedSupportView({ user }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('technical')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchIssues = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIssues(data || [])
    } catch (err) {
      console.error('Error fetching support tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssues()
  }, [user])

  const handleSubmitTicket = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please fill in all required fields.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    const role = user?.role || user?.user_metadata?.role
    const isTutorOrAdmin = role === 'tutor' || isAdminRole(role)

    try {
      const { error } = await supabase.from('issues').insert([
        {
          reported_by: user.id,
          title,
          description,
          category,
          status: 'pending',
          target_role: isTutorOrAdmin ? 'admin' : 'tutor',
          assigned_to: isTutorOrAdmin ? null : user?.assigned_tutor_id || null,
        },
      ])

      if (error) throw error

      setSuccessMsg(
        'Support ticket submitted successfully! Our team will review it soon.',
      )
      setTitle('')
      setDescription('')
      fetchIssues()
    } catch (err) {
      console.error('Error creating ticket:', err)
      setErrorMsg('Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
            <CheckCircle2 size={14} /> Resolved
          </span>
        )
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">
            <Clock size={14} /> In Progress
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-600">
            <AlertCircle size={14} /> Pending Review
          </span>
        )
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          Help & Support Center
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Need technical help, schedule adjustments, or course support? Submit a
          ticket below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Ticket Submission Form */}
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 lg:col-span-5">
          <div className="mb-6 flex items-center gap-2 text-purple-600">
            <ShieldAlert size={22} />
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              Create New Ticket
            </h2>
          </div>

          {successMsg && (
            <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-xs font-medium text-emerald-700">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
              >
                <option value="technical">Technical Issue / Bug</option>
                <option value="scheduling">Class / Schedule Conflict</option>
                <option value="student_issue">Student Matter</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                Subject Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Cannot load student homework files"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                Description
              </label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium focus:border-purple-500 focus:outline-none dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-700 disabled:opacity-50"
            >
              <Send size={16} />
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>

        {/* Existing Ticket History List */}
        <div className="space-y-4 lg:col-span-7">
          <h2 className="text-base font-black text-gray-900 dark:text-white">
            Your Support History
          </h2>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Loading tickets...
            </div>
          ) : issues.length === 0 ? (
            <div className="rounded-[32px] border border-gray-100 bg-white p-12 text-center dark:border-white/10 dark:bg-white/5">
              <HelpCircle size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-bold text-gray-500">
                No support tickets found.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Submit a ticket using the form if you need assistance.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-purple-600">
                        {issue.category}
                      </span>
                      <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                        {issue.title}
                      </h3>
                    </div>
                    {getStatusBadge(issue.status)}
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {issue.description}
                  </p>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-[10px] text-gray-400 dark:border-white/5">
                    <span>Ticket ID: #{issue.id.slice(0, 8)}</span>
                    <span>
                      {new Date(issue.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
