import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabase'

const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Trial Scheduled',
  'Trial Completed',
  'Converted',
  'Lost',
]

const STATUS_STYLES = {
  New: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Contacted: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  'Trial Scheduled': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  'Trial Completed': 'bg-purple-50 text-purple-700 ring-purple-600/20',
  Converted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Lost: 'bg-red-50 text-red-700 ring-red-600/20',
}

const PAGE_SIZE = 10

const EMPTY_FORM = {
  parent_name: '',
  student_name: '',
  phone: '',
  email: '',
  country: 'Kenya',
  grade: '',
  status: 'New',
  class_date: '',
  class_time: '',
  next_follow_up_at: '',
  lead_source: '',
  assigned_tutor_id: '',
  lost_reason: '',
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'

const labelClass = 'block text-sm font-medium text-slate-700'

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateTimeLocal(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function getInitials(name) {
  if (!name) return 'L'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getLeadName(lead) {
  return lead?.parent_name || lead?.student_name || 'Unnamed lead'
}

function getStatusStyle(status) {
  return (
    STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 ring-slate-600/20'
  )
}

function isFollowUpOverdue(lead) {
  if (!lead?.next_follow_up_at) return false

  if (['Converted', 'Lost'].includes(lead.status)) return false

  return new Date(lead.next_follow_up_at).getTime() < Date.now()
}

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function getWhatsAppLink(phone, message = '') {
  if (!phone) return null

  const cleanedPhone = String(phone).replace(/[^\d]/g, '')

  if (!cleanedPhone) return null

  return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`
}

function StatCard({ label, value, description, icon, iconClass }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(
        status,
      )}`}
    >
      {status || 'New'}
    </span>
  )
}

function Modal({ title, description, onClose, children, footer }) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)

    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="my-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ title, description, action }) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
        👥
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [tutors, setTutors] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)

  const [pageError, setPageError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [followUpFilter, setFollowUpFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedLead, setSelectedLead] = useState(null)
  const [editingLead, setEditingLead] = useState(null)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [detailsFollowUp, setDetailsFollowUp] = useState('')

  // --------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------

  const showSuccess = useCallback((message) => {
    setSuccessMessage(message)

    window.setTimeout(() => {
      setSuccessMessage('')
    }, 3500)
  }, [])

  // --------------------------------------------------
  // LOAD LEADS
  // --------------------------------------------------

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setPageError('')

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setLeads(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading leads:', error)
      setPageError(`Unable to load leads. ${getErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // --------------------------------------------------
  // LOAD TUTORS
  // --------------------------------------------------

  const fetchTutors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, name, email, role')
        .in('role', ['tutor', 'operations_admin', 'admin'])

      if (error) {
        console.warn('Unable to load tutors:', error.message)
        setTutors([])
        return
      }

      setTutors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading tutors:', error)
      setTutors([])
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    fetchTutors()
  }, [fetchLeads, fetchTutors])

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const statistics = useMemo(() => {
    const countByStatus = (status) =>
      leads.filter((lead) => lead.status === status).length

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const followUpsToday = leads.filter((lead) => {
      if (!lead.next_follow_up_at) return false
      if (['Converted', 'Lost'].includes(lead.status)) return false

      const date = new Date(lead.next_follow_up_at)

      return date >= today && date < tomorrow
    }).length

    const total = leads.length
    const converted = countByStatus('Converted')

    return {
      total,
      newLeads: countByStatus('New'),
      contacted: countByStatus('Contacted'),
      trialsScheduled: countByStatus('Trial Scheduled'),
      trialsCompleted: countByStatus('Trial Completed'),
      converted,
      lost: countByStatus('Lost'),
      overdueFollowUps: leads.filter(isFollowUpOverdue).length,
      followUpsToday,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    }
  }, [leads])

  // --------------------------------------------------
  // FILTERS AND SEARCH
  // --------------------------------------------------

  const sourceOptions = useMemo(() => {
    return [
      ...new Set(leads.map((lead) => lead.lead_source).filter(Boolean)),
    ].sort((a, b) => String(a).localeCompare(String(b)))
  }, [leads])

  const filteredLeads = useMemo(() => {
    let result = [...leads]
    const search = searchTerm.trim().toLowerCase()

    if (search) {
      result = result.filter((lead) => {
        const fields = [
          lead.parent_name,
          lead.student_name,
          lead.phone,
          lead.email,
          lead.country,
          lead.grade,
          lead.lead_source,
          lead.status,
        ]

        return fields.some((field) =>
          String(field || '')
            .toLowerCase()
            .includes(search),
        )
      })
    }

    if (statusFilter !== 'All') {
      result = result.filter((lead) => lead.status === statusFilter)
    }

    if (sourceFilter !== 'All') {
      result = result.filter((lead) => lead.lead_source === sourceFilter)
    }

    if (followUpFilter === 'Overdue') {
      result = result.filter(isFollowUpOverdue)
    }

    if (followUpFilter === 'Today') {
      const start = new Date()
      start.setHours(0, 0, 0, 0)

      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      result = result.filter((lead) => {
        if (!lead.next_follow_up_at) return false
        if (['Converted', 'Lost'].includes(lead.status)) return false

        const date = new Date(lead.next_follow_up_at)
        return date >= start && date < end
      })
    }

    if (followUpFilter === 'Upcoming') {
      const now = Date.now()

      result = result.filter((lead) => {
        if (!lead.next_follow_up_at) return false
        if (['Converted', 'Lost'].includes(lead.status)) return false

        return new Date(lead.next_follow_up_at).getTime() >= now
      })
    }

    if (followUpFilter === 'Missed') {
      result = result.filter((lead) => lead.follow_up_missed === true)
    }

    result.sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      }

      if (sortBy === 'name') {
        return getLeadName(a).localeCompare(getLeadName(b))
      }

      if (sortBy === 'follow-up') {
        const dateA = a.next_follow_up_at
          ? new Date(a.next_follow_up_at).getTime()
          : Infinity

        const dateB = b.next_follow_up_at
          ? new Date(b.next_follow_up_at).getTime()
          : Infinity

        return dateA - dateB
      }

      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })

    return result
  }, [leads, searchTerm, statusFilter, sourceFilter, followUpFilter, sortBy])

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE))

  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedLeads = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return filteredLeads.slice(start, start + PAGE_SIZE)
  }, [filteredLeads, safeCurrentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sourceFilter, followUpFilter, sortBy])

  // --------------------------------------------------
  // FORM HANDLING
  // --------------------------------------------------

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const openCreateForm = () => {
    setEditingLead(null)
    setFormData({ ...EMPTY_FORM })
    setShowLeadForm(true)
    setPageError('')
  }

  const openEditForm = (lead) => {
    setEditingLead(lead)

    setFormData({
      ...EMPTY_FORM,
      ...lead,
      next_follow_up_at: toDateTimeLocal(lead.next_follow_up_at),
      class_date: lead.class_date || '',
      class_time: lead.class_time || '',
      assigned_tutor_id: lead.assigned_tutor_id || '',
      lost_reason: lead.lost_reason || '',
    })

    setShowLeadForm(true)
    setPageError('')
  }

  const closeLeadForm = () => {
    if (saving) return

    setShowLeadForm(false)
    setEditingLead(null)
    setFormData({ ...EMPTY_FORM })
  }

  // --------------------------------------------------
  // CREATE OR UPDATE LEAD
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.parent_name.trim() && !formData.student_name.trim()) {
      setPageError("Enter the parent's name or the student's name.")
      return
    }

    if (!formData.phone.trim()) {
      setPageError('Enter a phone number.')
      return
    }

    setSaving(true)
    setPageError('')

    try {
      const payload = {
        parent_name: formData.parent_name.trim() || null,
        student_name: formData.student_name.trim() || null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        country: formData.country.trim() || null,
        grade: formData.grade.trim() || null,
        status: formData.status || 'New',
        class_date: formData.class_date || null,
        class_time: formData.class_time || null,
        next_follow_up_at: formData.next_follow_up_at
          ? new Date(formData.next_follow_up_at).toISOString()
          : null,
        lead_source: formData.lead_source.trim() || null,
        assigned_tutor_id: formData.assigned_tutor_id || null,
      }

      // Only include this field if your database has the column.
      if (formData.status === 'Lost' && formData.lost_reason.trim()) {
        payload.lost_reason = formData.lost_reason.trim()
      }

      if (editingLead) {
        const { data, error } = await supabase
          .from('leads')
          .update(payload)
          .eq('id', editingLead.id)
          .select()
          .single()

        if (error) throw error

        setLeads((previous) =>
          previous.map((lead) => (lead.id === editingLead.id ? data : lead)),
        )

        setSelectedLead(data)
        showSuccess('Lead updated successfully.')
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert([payload])
          .select()
          .single()

        if (error) throw error

        setLeads((previous) => [data, ...previous])
        setSelectedLead(data)
        showSuccess('Lead added successfully.')
      }

      setShowLeadForm(false)
      setEditingLead(null)
      setFormData({ ...EMPTY_FORM })
    } catch (error) {
      console.error('Error saving lead:', error)
      setPageError(`Unable to save lead. ${getErrorMessage(error)}`)
    } finally {
      setSaving(false)
    }
  }

  // --------------------------------------------------
  // CHANGE STATUS
  // --------------------------------------------------

  const handleStatusChange = async (lead, newStatus) => {
    if (!lead || lead.status === newStatus) return

    setStatusUpdatingId(lead.id)
    setPageError('')

    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead.id)
        .select()
        .single()

      if (error) throw error

      setLeads((previous) =>
        previous.map((item) => (item.id === lead.id ? data : item)),
      )

      setSelectedLead((previous) =>
        previous?.id === lead.id ? data : previous,
      )

      showSuccess(`Lead status changed to ${newStatus}.`)
    } catch (error) {
      console.error('Error updating lead status:', error)
      setPageError(`Unable to update status. ${getErrorMessage(error)}`)
    } finally {
      setStatusUpdatingId(null)
    }
  }

  // --------------------------------------------------
  // UPDATE FOLLOW-UP
  // --------------------------------------------------

  const handleFollowUpUpdate = async (lead, dateValue) => {
    if (!lead) return

    setSaving(true)
    setPageError('')

    try {
      const payload = {
        next_follow_up_at: dateValue ? new Date(dateValue).toISOString() : null,
      }

      // Include this only if the column exists in your leads table.
      // Remove it if your schema does not have follow_up_missed.
      payload.follow_up_missed = false

      const { data, error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', lead.id)
        .select()
        .single()

      if (error) throw error

      setLeads((previous) =>
        previous.map((item) => (item.id === lead.id ? data : item)),
      )

      setSelectedLead(data)
      setDetailsFollowUp(toDateTimeLocal(data.next_follow_up_at))
      showSuccess('Follow-up updated successfully.')
    } catch (error) {
      console.error('Error updating follow-up:', error)
      setPageError(`Unable to update follow-up. ${getErrorMessage(error)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkFollowUpMissed = async (lead) => {
    if (!lead) return

    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ follow_up_missed: true })
        .eq('id', lead.id)
        .select()
        .single()

      if (error) throw error

      setLeads((previous) =>
        previous.map((item) => (item.id === lead.id ? data : item)),
      )

      setSelectedLead(data)
      showSuccess('Follow-up marked as missed.')
    } catch (error) {
      console.error('Error marking follow-up missed:', error)
      setPageError(`Unable to update follow-up. ${getErrorMessage(error)}`)
    }
  }

  // --------------------------------------------------
  // CONTACT / WHATSAPP
  // --------------------------------------------------

  const handleRecordContact = async (lead) => {
    if (!lead) return

    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', lead.id)
        .select()
        .single()

      if (error) throw error

      setLeads((previous) =>
        previous.map((item) => (item.id === lead.id ? data : item)),
      )

      setSelectedLead((previous) =>
        previous?.id === lead.id ? data : previous,
      )
    } catch (error) {
      console.error('Error recording contact:', error)
      setPageError(`Unable to record contact. ${getErrorMessage(error)}`)
    }
  }

  const handleWhatsApp = (lead) => {
    const message = `Hello ${
      lead?.parent_name || 'there'
    }, this is Tech Talk Hub. I'm following up about ${
      lead?.student_name ? `${lead.student_name}'s` : "your child's"
    } coding classes. How may we assist you?`

    const link = getWhatsAppLink(lead?.phone, message)

    if (!link) {
      setPageError('This lead does not have a valid phone number.')
      return
    }

    window.open(link, '_blank', 'noopener,noreferrer')
    handleRecordContact(lead)
  }

  // --------------------------------------------------
  // DETAILS
  // --------------------------------------------------

  const openDetails = (lead) => {
    setSelectedLead(lead)
    setDetailsFollowUp(toDateTimeLocal(lead.next_follow_up_at))
    setShowDetails(true)
  }

  const closeDetails = () => {
    setShowDetails(false)
    setSelectedLead(null)
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('All')
    setSourceFilter('All')
    setFollowUpFilter('All')
    setSortBy('newest')
    setCurrentPage(1)
  }

  const assignedTutor = useMemo(() => {
    if (!selectedLead?.assigned_tutor_id) return null

    return tutors.find((tutor) => tutor.id === selectedLead.assigned_tutor_id)
  }, [selectedLead, tutors])

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}

        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
              Tech Talk Hub · Administration
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Leads Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage parent enquiries, schedule trial classes, follow up with
              prospective families, and track enrolments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fetchLeads}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>↻</span>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            >
              <span className="text-lg leading-none">+</span>
              Add Lead
            </button>
          </div>
        </header>

        {/* ALERTS */}

        {pageError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <div className="flex gap-2">
              <span className="font-bold">!</span>
              <span>{pageError}</span>
            </div>

            <button
              type="button"
              onClick={() => setPageError('')}
              className="text-xl leading-none text-red-500 hover:text-red-800"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            <span>✓ {successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="text-xl leading-none text-emerald-600"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        {/* STATISTICS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            label="Total Leads"
            value={statistics.total}
            description="All enquiries"
            icon="👥"
            iconClass="bg-indigo-50 text-indigo-600"
          />

          <StatCard
            label="New Leads"
            value={statistics.newLeads}
            description="Awaiting contact"
            icon="✨"
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            label="Trials Scheduled"
            value={statistics.trialsScheduled}
            description="Upcoming trial classes"
            icon="📅"
            iconClass="bg-amber-50 text-amber-600"
          />

          <StatCard
            label="Converted"
            value={statistics.converted}
            description="Successfully enrolled"
            icon="🎓"
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            label="Overdue Follow-ups"
            value={statistics.overdueFollowUps}
            description="Need your attention"
            icon="⏰"
            iconClass="bg-red-50 text-red-600"
          />

          <StatCard
            label="Conversion Rate"
            value={`${statistics.conversionRate}%`}
            description="Leads converted"
            icon="📈"
            iconClass="bg-purple-50 text-purple-600"
          />
        </section>

        {/* FOLLOW-UP OVERVIEW */}

        <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">Follow-up overview</h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep track of the conversations that need attention.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setFollowUpFilter(followUpFilter === 'Today' ? 'All' : 'Today')
              }
              className={`min-w-36 rounded-xl border px-4 py-3 text-left transition ${
                followUpFilter === 'Today'
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-medium text-slate-500">
                Due today
              </span>
              <span className="mt-1 block text-xl font-bold text-slate-900">
                {statistics.followUpsToday}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFollowUpFilter(
                  followUpFilter === 'Overdue' ? 'All' : 'Overdue',
                )
              }
              className={`min-w-36 rounded-xl border px-4 py-3 text-left transition ${
                followUpFilter === 'Overdue'
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-medium text-slate-500">
                Overdue
              </span>
              <span className="mt-1 block text-xl font-bold text-red-600">
                {statistics.overdueFollowUps}
              </span>
            </button>
          </div>
        </section>

        {/* SEARCH AND FILTERS */}

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-slate-400">
              ⌕
            </span>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by parent, student, phone, email..."
              aria-label="Search leads"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-3 flex items-center px-2 text-xl text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
              className={inputClass}
            >
              <option value="All">All statuses</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              aria-label="Filter by source"
              className={inputClass}
            >
              <option value="All">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>

            <select
              value={followUpFilter}
              onChange={(event) => setFollowUpFilter(event.target.value)}
              aria-label="Filter by follow-up"
              className={inputClass}
            >
              <option value="All">All follow-ups</option>
              <option value="Today">Due today</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
              <option value="Missed">Marked missed</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort leads"
              className={inputClass}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="follow-up">Next follow-up</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Reset filters
            </button>
          </div>
        </section>

        {/* LEADS TABLE */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">All Leads</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredLeads.length}{' '}
                {filteredLeads.length === 1 ? 'lead' : 'leads'} found
              </p>
            </div>

            <span className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Page {safeCurrentPage} of {totalPages}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
              <p className="mt-4 text-sm text-slate-500">Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <EmptyState
              title="No leads found"
              description={
                leads.length === 0
                  ? 'Start by adding your first prospective student.'
                  : 'No leads match your current search and filters.'
              }
              action={
                leads.length === 0 ? (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    + Add your first lead
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                )
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      {[
                        'Parent / Student',
                        'Contact',
                        'Source',
                        'Status',
                        'Next Follow-up',
                        'Date Added',
                        'Actions',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openDetails(lead)}
                            className="flex items-center gap-3 text-left"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">
                              {getInitials(getLeadName(lead))}
                            </span>

                            <span>
                              <span className="block font-semibold text-slate-800">
                                {getLeadName(lead)}
                              </span>

                              {lead.student_name && lead.parent_name && (
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  Student: {lead.student_name}
                                </span>
                              )}

                              {lead.grade && (
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  Grade: {lead.grade}
                                </span>
                              )}
                            </span>
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-slate-700">
                            {lead.phone || 'No phone'}
                          </div>
                          {lead.email && (
                            <div className="mt-1 max-w-52 truncate text-xs text-slate-500">
                              {lead.email}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            {lead.lead_source || 'Not specified'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={lead.status || 'New'}
                            disabled={statusUpdatingId === lead.id}
                            onChange={(event) =>
                              handleStatusChange(lead, event.target.value)
                            }
                            aria-label={`Change status for ${getLeadName(
                              lead,
                            )}`}
                            className={`max-w-44 cursor-pointer rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none ring-1 ring-inset focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${getStatusStyle(
                              lead.status,
                            )}`}
                          >
                            {LEAD_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`block whitespace-nowrap text-sm ${
                              isFollowUpOverdue(lead)
                                ? 'font-semibold text-red-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {formatDate(lead.next_follow_up_at)}
                          </span>

                          {isFollowUpOverdue(lead) && (
                            <span className="mt-1 block text-xs font-medium text-red-500">
                              Overdue
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(lead.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openDetails(lead)}
                              title="View details"
                              aria-label="View details"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                              >
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditForm(lead)}
                              title="Edit lead"
                              aria-label="Edit lead"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                              >
                                <path d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleWhatsApp(lead)}
                              disabled={!lead.phone}
                              title="Contact on WhatsApp"
                              aria-label="Contact on WhatsApp"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                              >
                                <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5Z" />
                                <path d="M9 8.5c.4 2.1 2.4 4.1 4.5 4.5l1.2-1.2 2 1c-.2 1.6-1.4 2.5-2.9 2.2-3.4-.8-5.9-3.3-6.7-6.7C6.8 6.8 7.7 5.6 9.3 5.4l1 2L9 8.5Z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}

              <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-500">
                  Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safeCurrentPage * PAGE_SIZE, filteredLeads.length)}{' '}
                  of {filteredLeads.length}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={safeCurrentPage <= 1}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - safeCurrentPage) <= 1,
                    )
                    .map((page, index, pages) => (
                      <React.Fragment key={page}>
                        {index > 0 && page - pages[index - 1] > 1 && (
                          <span className="px-1 text-slate-400">…</span>
                        )}

                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          aria-current={
                            page === safeCurrentPage ? 'page' : undefined
                          }
                          className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${
                            page === safeCurrentPage
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={safeCurrentPage >= totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ADD / EDIT LEAD MODAL */}

      {showLeadForm && (
        <Modal
          title={editingLead ? 'Edit Lead' : 'Add New Lead'}
          description={
            editingLead
              ? "Update this prospective student's information."
              : 'Enter the details of a prospective student.'
          }
          onClose={closeLeadForm}
          footer={
            <>
              <button
                type="button"
                onClick={closeLeadForm}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="leads-form"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving
                  ? 'Saving...'
                  : editingLead
                    ? 'Save Changes'
                    : 'Create Lead'}
              </button>
            </>
          }
        >
          <form id="leads-form" onSubmit={handleSubmit} className="p-5 sm:p-7">
            <div className="space-y-7">
              <section>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Contact information
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Parent / Guardian Name
                    <input
                      type="text"
                      name="parent_name"
                      value={formData.parent_name}
                      onChange={handleFormChange}
                      placeholder="Parent's full name"
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Student Name
                    <input
                      type="text"
                      name="student_name"
                      value={formData.student_name}
                      onChange={handleFormChange}
                      placeholder="Student's full name"
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Phone Number *
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="+254..."
                      required
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Email Address
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="parent@example.com"
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Country
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleFormChange}
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Grade / Class
                    <input
                      type="text"
                      name="grade"
                      value={formData.grade}
                      onChange={handleFormChange}
                      placeholder="e.g. Grade 4"
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Lead management
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Status
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={labelClass}>
                    Lead Source
                    <input
                      type="text"
                      name="lead_source"
                      value={formData.lead_source || ''}
                      onChange={handleFormChange}
                      placeholder="Instagram, referral, school..."
                      list="leads-source-options"
                      className={inputClass}
                    />
                    <datalist id="leads-source-options">
                      {sourceOptions.map((source) => (
                        <option key={source} value={source} />
                      ))}
                    </datalist>
                  </label>

                  <label className={labelClass}>
                    Assigned Tutor
                    <select
                      name="assigned_tutor_id"
                      value={formData.assigned_tutor_id || ''}
                      onChange={handleFormChange}
                      className={inputClass}
                    >
                      <option value="">Unassigned</option>
                      {tutors.map((tutor) => (
                        <option key={tutor.id} value={tutor.id}>
                          {tutor.full_name ||
                            tutor.name ||
                            tutor.email ||
                            tutor.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={labelClass}>
                    Next Follow-up
                    <input
                      type="datetime-local"
                      name="next_follow_up_at"
                      value={formData.next_follow_up_at || ''}
                      onChange={handleFormChange}
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Trial Class Date
                    <input
                      type="date"
                      name="class_date"
                      value={formData.class_date || ''}
                      onChange={handleFormChange}
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Trial Class Time
                    <input
                      type="time"
                      name="class_time"
                      value={formData.class_time || ''}
                      onChange={handleFormChange}
                      className={inputClass}
                    />
                  </label>

                  {formData.status === 'Lost' && (
                    <label className={`${labelClass} sm:col-span-2`}>
                      Reason for Lost Lead
                      <textarea
                        name="lost_reason"
                        value={formData.lost_reason || ''}
                        onChange={handleFormChange}
                        placeholder="Why did the lead not convert?"
                        rows={3}
                        className={inputClass}
                      />
                    </label>
                  )}
                </div>
              </section>
            </div>
          </form>
        </Modal>
      )}

      {/* LEAD DETAILS DRAWER */}

      {showDetails && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails()
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Lead details"
            className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                  Lead details
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  {getLeadName(selectedLead)}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close details"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
              {/* PROFILE */}

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-700">
                  {getInitials(getLeadName(selectedLead))}
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900">
                    {getLeadName(selectedLead)}
                  </h3>

                  {selectedLead.student_name && selectedLead.parent_name && (
                    <p className="mt-1 text-sm text-slate-500">
                      Student: {selectedLead.student_name}
                    </p>
                  )}

                  <div className="mt-2">
                    <StatusBadge status={selectedLead.status || 'New'} />
                  </div>
                </div>
              </div>

              {/* CONTACT */}

              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Contact information
                </h3>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                  {[
                    ['Phone', selectedLead.phone],
                    ['Email', selectedLead.email],
                    ['Country', selectedLead.country],
                    ['Grade', selectedLead.grade],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="break-all text-sm font-medium text-slate-800 sm:text-right">
                        {value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* LEAD INFORMATION */}

              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Lead information
                </h3>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                  {[
                    ['Source', selectedLead.lead_source],
                    ['Date added', formatDate(selectedLead.created_at)],
                    [
                      'Last contacted',
                      formatDateTime(selectedLead.last_contacted_at),
                    ],
                    [
                      'Assigned tutor',
                      assignedTutor?.full_name ||
                        assignedTutor?.name ||
                        assignedTutor?.email ||
                        'Unassigned',
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="break-words text-sm font-medium text-slate-800 sm:text-right">
                        {value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* TRIAL CLASS */}

              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Trial class
                </h3>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                  {[
                    ['Date', formatDate(selectedLead.class_date)],
                    ['Time', selectedLead.class_time || '—'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-sm font-medium text-slate-800">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* FOLLOW-UP */}

              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Follow-up
                </h3>

                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Current follow-up
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        isFollowUpOverdue(selectedLead)
                          ? 'text-red-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {formatDateTime(selectedLead.next_follow_up_at)}
                    </p>
                  </div>

                  {isFollowUpOverdue(selectedLead) && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      This follow-up is overdue.
                    </div>
                  )}

                  <label className={labelClass}>
                    Schedule / Update Follow-up
                    <input
                      type="datetime-local"
                      value={detailsFollowUp}
                      onChange={(event) =>
                        setDetailsFollowUp(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      handleFollowUpUpdate(selectedLead, detailsFollowUp)
                    }
                    className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Follow-up'}
                  </button>

                  {selectedLead.next_follow_up_at && (
                    <button
                      type="button"
                      onClick={() => handleMarkFollowUpMissed(selectedLead)}
                      className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Mark Follow-up as Missed
                    </button>
                  )}
                </div>
              </section>

              {/* LOST REASON */}

              {selectedLead.status === 'Lost' && selectedLead.lost_reason && (
                <section>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                    Reason for lost lead
                  </h3>

                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedLead.lost_reason}
                  </p>
                </section>
              )}
            </div>

            {/* DRAWER FOOTER */}

            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white p-4 sm:p-5">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const lead = selectedLead
                  closeDetails()
                  openEditForm(lead)
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit Lead
              </button>

              <button
                type="button"
                disabled={!selectedLead.phone}
                onClick={() => handleWhatsApp(selectedLead)}
                className="ml-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Contact on WhatsApp
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
