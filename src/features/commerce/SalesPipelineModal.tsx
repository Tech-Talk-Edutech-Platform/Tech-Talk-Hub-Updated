import { useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../supabase'
import {
  PhoneCall,
  TrendingUp,
  MessageCircle,
  X,
  LayoutGrid,
  List,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import CallCost from './CallCost'
import type { Tables } from '../../types/database'

interface LoadingProps {
  label: string
}

interface ModalShellProps {
  title: string
  icon?: LucideIcon
  children: ReactNode
  onClose: () => void
}

interface SalesPipelineModalProps {
  isOpen: boolean
  onClose: () => void
}

const TAB_TYPES = {
  ALL: 'all',
  OVERDUE: 'overdue',
  TODAY: 'today',
  UPCOMING: 'upcoming',
}

/** Where a lead's next follow-up falls, worked out when the leads load. */
interface FollowUp {
  overdue: boolean
  today: boolean
  upcoming: boolean
  badge: { label: string; color: string }
}

type PipelineLead = Tables<'leads'> & { followUp: FollowUp | null }

function classifyFollowUp(
  nextFollowUpAt: string | null,
  now: Date,
): FollowUp | null {
  if (!nextFollowUpAt) return null

  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const date = new Date(nextFollowUpAt)

  const overdue = date < now
  const today = date >= start && date <= end
  const badge = overdue
    ? { label: 'Overdue', color: 'bg-red-500' }
    : today
      ? { label: 'Today', color: 'bg-blue-500' }
      : { label: 'Upcoming', color: 'bg-green-500' }

  return { overdue, today, upcoming: date > end, badge }
}

async function loadLeads(): Promise<PipelineLead[]> {
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('next_follow_up_at', { ascending: true })

  const now = new Date()
  return (data || []).map((lead) =>
    Object.assign({}, lead, {
      followUp: classifyFollowUp(lead.next_follow_up_at, now),
    }),
  )
}

const whatsappLink = (phone: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}`

const Loading = ({ label }: LoadingProps) => (
  <div className="animate-pulse p-20 text-center font-black text-slate-400">
    {label}
  </div>
)

const ModalShell = ({
  title,
  icon: Icon,
  children,
  onClose,
}: ModalShellProps) => (
  <div className="fixed inset-0 z-1000 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
    <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-8">
        <h2 className="flex items-center gap-2 text-2xl font-black">
          {Icon && <Icon className="text-blue-600" />}
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-2xl p-3 hover:bg-slate-100"
        >
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8">{children}</div>
    </div>
  </div>
)

export default function SalesPipelineModal({
  isOpen,
  onClose,
}: SalesPipelineModalProps) {
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TAB_TYPES.ALL)
  const [viewMode, setViewMode] = useState('grid') // "grid" | "list"

  useEffect(() => {
    if (!isOpen) return undefined

    let cancelled = false
    loadLeads().then(
      (rows) => {
        if (cancelled) return
        setLeads(rows)
        setLoading(false)
      },
      () => {
        if (!cancelled) setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const filteredLeads = useMemo(
    () =>
      leads.filter((l) => {
        if (activeTab === TAB_TYPES.ALL) return true
        if (!l.followUp) return false
        if (activeTab === TAB_TYPES.OVERDUE) return l.followUp.overdue
        if (activeTab === TAB_TYPES.TODAY) return l.followUp.today
        if (activeTab === TAB_TYPES.UPCOMING) return l.followUp.upcoming
        return true
      }),
    [leads, activeTab],
  )

  const updateStatus = async (id: string, status: string) => {
    const { data } = await supabase
      .from('leads')
      .update({
        status,
        last_contacted_at:
          status === 'contacted' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single()
    if (data)
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? Object.assign({}, l, data) : l)),
      )
  }

  if (!isOpen) return null

  return (
    <ModalShell
      title="Sales & Leads Pipeline"
      icon={TrendingUp}
      onClose={onClose}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {Object.values(TAB_TYPES).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 font-bold ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={viewMode === 'grid' ? 'Show as list' : 'Show as grid'}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            {viewMode === 'grid' ? (
              <List size={20} />
            ) : (
              <LayoutGrid size={20} />
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <Loading label="SYNCING PIPELINE..." />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((l) => (
            <div
              key={l.id}
              className="flex flex-col gap-2 rounded-[32px] border bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-sm bg-slate-100 px-2 py-1 text-[10px] font-black uppercase">
                  {l.status || 'NEW'}
                </span>
                {l.followUp && (
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] text-white ${l.followUp.badge.color}`}
                  >
                    {l.followUp.badge.label}
                  </span>
                )}
              </div>
              <h4 className="text-lg font-black">{l.parent_name}</h4>
              <div className="space-y-0.5 text-xs text-slate-500">
                <p>Email: {l.email || '-'}</p>
                <p>Grade: {l.grade || '-'}</p>
                <p>
                  Follow-up:{' '}
                  {l.next_follow_up_at
                    ? new Date(l.next_follow_up_at).toLocaleString()
                    : 'None'}
                </p>
              </div>
              <CallCost />
              <div className="mt-2 flex gap-2">
                <a
                  aria-label={`WhatsApp ${l.parent_name}`}
                  href={whatsappLink(l.phone ?? '')}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-green-100 p-2 text-green-600"
                >
                  <MessageCircle size={16} />
                </a>
                <a
                  aria-label={`Call ${l.parent_name}`}
                  href={`tel:${l.phone ?? ''}`}
                  className="rounded-xl bg-yellow-100 p-2 text-yellow-800"
                >
                  <PhoneCall size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => void updateStatus(l.id, 'contacted')}
                  className="flex-1 rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-600"
                >
                  Contacted
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Follow Up</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLeads.map((l) => (
                <tr key={l.id}>
                  <td className="p-4 font-bold">{l.parent_name}</td>
                  <td className="p-4 text-sm">{l.phone}</td>
                  <td className="p-4 text-sm">
                    {l.next_follow_up_at
                      ? new Date(l.next_follow_up_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">
                      {l.status || 'NEW'}
                    </span>
                  </td>
                  <td className="flex gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => void updateStatus(l.id, 'contacted')}
                      className="rounded-full bg-blue-100 px-3 py-1 text-xs"
                    >
                      Contacted
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalShell>
  )
}
