import { useState, useEffect } from 'react'
import { plannedDb } from '../../lib/plannedDb'
import { ChevronLeft, Edit3, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'

const issueSchema = z.object({
  title: z.string().trim().min(1, 'Enter a ticket title.'),
  description: z.string(),
  priority: z.enum(['low', 'normal', 'high']),
})
type IssueFormValues = z.infer<typeof issueSchema>

interface RaiseIssueProps {
  user: { id: string } | null
  /** Called after a ticket is raised, e.g. to refresh an admin list. */
  fetchAll?: () => unknown
  isLocked?: boolean
}

async function fetchTicketHistory(userId: string) {
  const { data, error } = await plannedDb
    .from('issues')
    .select('id, title, description, status, created_at, priority')
    .eq('reported_by', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

type Ticket = Awaited<ReturnType<typeof fetchTicketHistory>>[number]

export default function RaiseIssue({
  user,
  fetchAll,
  isLocked,
}: RaiseIssueProps) {
  const userId = user?.id
  const {
    register,
    handleSubmit: submitWithValidation,
    reset,
    formState: { errors },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: { title: '', description: '', priority: 'normal' },
  })
  const [history, setHistory] = useState<Ticket[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!userId) return undefined

    let cancelled = false
    fetchTicketHistory(userId).then(
      (rows) => {
        if (!cancelled) setHistory(rows)
      },
      (error: unknown) => {
        if (!cancelled) console.error('Error fetching tickets:', error)
      },
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  const fetchHistory = async () => {
    if (!userId) return
    try {
      setHistory(await fetchTicketHistory(userId))
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

  const handleUpdate = async () => {
    if (!selectedTicket) return

    // 1. Check if the specific ticket is already resolved or in progress
    if (selectedTicket.status !== 'open') {
      alert('You cannot edit a ticket that is already in progress or resolved.')
      setIsEditing(false) // Close edit mode
      return
    }

    const { error } = await plannedDb
      .from('issues')
      .update({
        title: selectedTicket.title,
        description: selectedTicket.description,
      })
      .eq('id', selectedTicket.id)

    if (error) {
      alert(error.message)
    } else {
      setIsEditing(false)
      await fetchHistory()
    }
  }

  const handleSubmit = async ({
    title,
    description,
    priority,
  }: IssueFormValues) => {
    if (!userId) return

    setIsSubmitting(true)
    const { error } = await plannedDb
      .from('issues')
      .insert([{ title, description, priority, reported_by: userId }])
    if (error) alert(error.message)
    else {
      reset()
      await fetchHistory()
      if (fetchAll) await fetchAll()
    }
    setIsSubmitting(false)
  }

  if (isLocked) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-700">
        Your last ticket is still open. Please wait for a resolution before
        opening a new one.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {selectedTicket ? (
        <div className="animate-in fade-in space-y-4 duration-200">
          <button
            type="button"
            onClick={() => {
              setSelectedTicket(null)
              setIsEditing(false)
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-600"
          >
            <ChevronLeft size={12} /> BACK
          </button>

          {/* Detail/Edit View */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-start justify-between">
              {isEditing ? (
                <input
                  aria-label="Ticket title"
                  className="w-full border-b text-sm font-bold"
                  value={selectedTicket.title}
                  onChange={(e) =>
                    setSelectedTicket({
                      ...selectedTicket,
                      title: e.target.value,
                    })
                  }
                />
              ) : (
                <h3 className="text-left text-sm font-black text-slate-800">
                  {selectedTicket.title}
                </h3>
              )}
              {selectedTicket.status === 'open' && (
                <button
                  type="button"
                  aria-label={isEditing ? 'Save ticket' : 'Edit ticket'}
                  onClick={() => {
                    if (isEditing) void handleUpdate()
                    else setIsEditing(true)
                  }}
                  className="text-blue-600"
                >
                  {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                aria-label="Ticket description"
                className="w-full rounded-sm border p-2 text-xs text-slate-500"
                value={selectedTicket.description ?? ''}
                onChange={(e) =>
                  setSelectedTicket({
                    ...selectedTicket,
                    description: e.target.value,
                  })
                }
              />
            ) : (
              <p className="text-left text-xs text-slate-500">
                {selectedTicket.description}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Form View */
        <form
          onSubmit={(event) => void submitWithValidation(handleSubmit)(event)}
          noValidate
          className="space-y-3"
        >
          <input
            aria-label="Ticket title"
            className="w-full rounded-xl border-none bg-slate-50 p-2.5 text-sm"
            placeholder="Title"
            {...register('title')}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && (
            <p role="alert" className="text-xs text-red-600">
              {errors.title.message}
            </p>
          )}
          <textarea
            aria-label="Ticket description"
            className="min-h-[80px] w-full rounded-xl border-none bg-slate-50 p-2.5 text-sm"
            placeholder="Description..."
            {...register('description')}
          />
          <select
            {...register('priority')}
            className="w-full rounded-xl border-none bg-slate-50 p-2.5 text-sm"
            aria-label="Ticket priority"
          >
            <option value="low">Low priority</option>
            <option value="normal">Normal priority</option>
            <option value="high">High priority</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-red-500 p-2.5 text-sm font-bold text-white"
          >
            Send Ticket
          </button>
        </form>
      )}

      {!selectedTicket && (
        <div className="border-t border-slate-100 pt-4">
          <h4 className="mb-3 text-left text-[10px] font-black text-slate-400 uppercase">
            Recent Tickets
          </h4>
          <div className="space-y-2">
            {(showAll ? history : history.slice(0, 3)).map((h) => (
              <button
                type="button"
                key={h.id}
                onClick={() => setSelectedTicket(h)}
                className="flex w-full items-center justify-between rounded-lg border bg-slate-50 p-2 text-left hover:bg-blue-50"
              >
                <span className="w-3/4 truncate text-xs font-semibold text-slate-700">
                  {h.title}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${h.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                >
                  {h.status}
                </span>
              </button>
            ))}
            {history.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2 text-left text-[10px] font-bold text-blue-600 uppercase"
              >
                {showAll ? 'Show Less' : 'View More'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
