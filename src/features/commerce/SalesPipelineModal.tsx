import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import {
  PhoneCall,
  TrendingUp,
  Plus,
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
  children: React.ReactNode
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
  const [leads, setLeads] = useState<Tables<'leads'>[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TAB_TYPES.ALL)
  const [viewMode, setViewMode] = useState('grid') // "grid" | "list"

  const [showAddLead, setShowAddLead] = useState(false)
  const [errors, setErrors] = useState({})
  const [newLead, setNewLead] = useState({
    parent_name: '',
    phone: '',
    email: '',
    country: '',
    grade: '',
    class_date: '',
    class_time: '',
    next_follow_up_at: '',
  })

  useEffect(() => {
    if (!isOpen) return
    const fetchLeads = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('next_follow_up_at', { ascending: true })
      setLeads(data || [])
      setLoading(false)
    }
    fetchLeads()
  }, [isOpen])

  const getFollowUpBadge = (next_follow_up_at: string | null) => {
    if (!next_follow_up_at) return null
    const now = new Date()
    const date = new Date(next_follow_up_at)
    if (date < now) return { label: 'Overdue', color: 'bg-red-500', icon: '⚠️' }
    if (date.toDateString() === now.toDateString())
      return { label: 'Today', color: 'bg-blue-500', icon: '📅' }
    return { label: 'Upcoming', color: 'bg-green-500', icon: '⏳' }
  }

  const filteredLeads = useMemo(() => {
    const now = new Date()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const filtered = leads.filter((l) => {
      if (activeTab === TAB_TYPES.ALL) return true
      if (!l.next_follow_up_at) return false
      const d = new Date(l.next_follow_up_at)
      if (activeTab === TAB_TYPES.OVERDUE) return d < now
      if (activeTab === TAB_TYPES.TODAY) return d >= start && d <= end
      if (activeTab === TAB_TYPES.UPCOMING) return d > end
      return true
    })
    return filtered
  }, [leads, activeTab])

  const whatsappLink = (phone: string) =>
    `https://wa.me/${phone.replace(/\D/g, '')}`
  const updateStatus = async (id: string, status: string) => {
    const { data } = await supabase
      .from('leads')
      .update({
        status,
        last_contacted_at: status === 'contacted' ? new Date() : null,
      })
      .eq('id', id)
      .select()
      .single()
    if (data)
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)))
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
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            {viewMode === 'grid' ? (
              <List size={20} />
            ) : (
              <LayoutGrid size={20} />
            )}
          </button>
          <button
            onClick={() => setShowAddLead(true)}
            className="flex items-center gap-2 rounded-full bg-black px-4 py-2 font-bold text-white"
          >
            <Plus size={16} /> Add Lead
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
                {getFollowUpBadge(l.next_follow_up_at) && (
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] text-white ${getFollowUpBadge(l.next_follow_up_at).color}`}
                  >
                    {getFollowUpBadge(l.next_follow_up_at).label}
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
              <CallCost phone={l.phone} />
              <div className="mt-2 flex gap-2">
                <a
                  href={whatsappLink(l.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-green-100 p-2 text-green-600"
                >
                  <MessageCircle size={16} />
                </a>
                <a
                  href={`tel:${l.phone}`}
                  className="rounded-xl bg-yellow-100 p-2 text-yellow-800"
                >
                  <PhoneCall size={16} />
                </a>
                <button
                  onClick={() => updateStatus(l.id, 'contacted')}
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
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
                      onClick={() => updateStatus(l.id, 'contacted')}
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
