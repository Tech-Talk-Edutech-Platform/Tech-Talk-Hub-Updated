import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import {
  Users2,
  Ticket,
  DollarSign,
  ArrowUpRight,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import { plannedDb } from '../../../lib/plannedDb'
import { StatCard } from '../../../components/dashboard/ui/StatCard'
import { toast } from 'react-hot-toast'

async function loadReferralData() {
  // Fetch only necessary data
  const [mRes, aRes, uRes] = await Promise.all([
    plannedDb.from('marketer_profiles').select('*').order('full_name'),
    plannedDb.from('referral_attributions').select('*, users(full_name)'),
    plannedDb
      .from('users')
      .select('id, full_name')
      .eq('role', 'marketer')
      .order('full_name'),
  ])

  const marketers = mRes.data || []
  const attributions = aRes.data || []
  const marketerIds = new Set(marketers.map((m) => m.id))

  const totalRevenue = attributions.reduce(
    (acc, curr) => acc + Number(curr.sale_amount),
    0,
  )
  const pendingComm = attributions
    .filter((a) => a.status === 'approved')
    .reduce((acc, curr) => acc + Number(curr.calculated_commission), 0)

  return {
    marketers,
    attributions,
    allUsers: (uRes.data || []).filter((user) => !marketerIds.has(user.id)),
    stats: {
      totalSales: totalRevenue,
      pendingPayouts: pendingComm,
      activeMarketers: marketers.length,
    },
  }
}

type ReferralData = Awaited<ReturnType<typeof loadReferralData>>
type Marketer = ReferralData['marketers'][number]

export default function ReferralDashboard() {
  const [marketers, setMarketers] = useState<Marketer[]>([])
  const [attributions, setAttributions] = useState<
    ReferralData['attributions']
  >([])
  const [allUsers, setAllUsers] = useState<ReferralData['allUsers']>([])
  const [selectedMarketer, setSelectedMarketer] = useState<Marketer | null>(
    null,
  )
  const [stats, setStats] = useState<ReferralData['stats']>({
    totalSales: 0,
    pendingPayouts: 0,
    activeMarketers: 0,
  })
  const [editingMarketer, setEditingMarketer] = useState<string | null>(null)
  // Form State
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newRate, setNewRate] = useState(10)

  useEffect(() => {
    let cancelled = false
    loadReferralData().then(
      (data) => {
        if (cancelled) return
        setMarketers(data.marketers)
        setAttributions(data.attributions)
        setAllUsers(data.allUsers)
        setStats(data.stats)
      },
      () => {
        if (!cancelled) toast.error('Data pipeline error.')
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const fetchReferralData = async () => {
    try {
      const data = await loadReferralData()
      setMarketers(data.marketers)
      setAttributions(data.attributions)
      setAllUsers(data.allUsers)
      setStats(data.stats)
    } catch {
      toast.error('Data pipeline error.')
    }
  }

  const generateMarketerCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedUserId || !newCode) {
      toast.error('Select user and code.')
      return
    }

    if (editingMarketer) {
      const { error } = await plannedDb
        .from('marketer_profiles')
        .update({
          referral_code: newCode.toUpperCase().replace(/\s+/g, ''),
          commission_rate_pct: newRate,
        })
        .eq('id', editingMarketer)

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Marketer updated.')
    } else {
      const { error } = await plannedDb.from('marketer_profiles').insert([
        {
          id: selectedUserId,
          full_name:
            allUsers.find((u) => u.id === selectedUserId)?.full_name ?? null,
          referral_code: newCode.toUpperCase().replace(/\s+/g, ''),
          commission_rate_pct: newRate,
        },
      ])

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Marketer created.')
    }

    setEditingMarketer(null)
    setSelectedUserId('')
    setNewCode('')
    setNewRate(10)

    await fetchReferralData()
  }

  const deleteMarketer = async (id: string) => {
    if (!window.confirm('Delete this marketer?')) return
    await plannedDb.from('marketer_profiles').delete().eq('id', id)
    if (selectedMarketer?.id === id) setSelectedMarketer(null)
    await fetchReferralData()
  }

  const selectMarketer = (m: Marketer) => {
    setSelectedMarketer(m)

    setEditingMarketer(m.id)
    setSelectedUserId(m.id)
    setNewCode(m.referral_code)
    setNewRate(m.commission_rate_pct)
  }

  const filteredAttributions = selectedMarketer
    ? attributions.filter(
        (a) => a.referral_code_used === selectedMarketer.referral_code,
      )
    : attributions
  const marketerStats = selectedMarketer
    ? {
        totalCustomers: filteredAttributions.length,
        totalSales: filteredAttributions.reduce(
          (sum, a) => sum + (a.sale_amount ?? 0),
          0,
        ),
        totalCommission: filteredAttributions.reduce(
          (sum, a) => sum + (a.calculated_commission ?? 0),
          0,
        ),
        approvedCommission: filteredAttributions
          .filter((a) => a.status === 'approved')
          .reduce((sum, a) => sum + (a.calculated_commission ?? 0), 0),
        paidCommission: filteredAttributions
          .filter((a) => a.status === 'paid')
          .reduce((sum, a) => sum + (a.calculated_commission ?? 0), 0),
      }
    : null
  return (
    <div className="mx-auto min-h-screen max-w-[1600px] space-y-8 bg-slate-950 p-6 text-slate-100">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mb-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs hover:bg-slate-800"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          title="Total Code Revenue"
          value={`KES ${stats.totalSales.toLocaleString()}`}
          accent="green"
          icon={DollarSign}
        />
        <StatCard
          title="Approved Payout Pool"
          value={`KES ${stats.pendingPayouts.toLocaleString()}`}
          accent="amber"
          icon={ArrowUpRight}
        />
        <StatCard
          title="Active Marketer Nodes"
          value={stats.activeMarketers}
          accent="blue"
          icon={Users2}
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 space-y-8 lg:col-span-5">
          <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-white uppercase">
              <Ticket size={16} className="text-indigo-400" /> Provision
              Referral Code
            </h3>
            <form
              onSubmit={(e) => void generateMarketerCode(e)}
              className="space-y-4"
            >
              <select
                aria-label="User"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white"
              >
                {editingMarketer && (
                  <option value={selectedUserId}>
                    {selectedMarketer?.full_name}
                  </option>
                )}
                <option value="">-- Select a User --</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input
                  aria-label="Referral code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="CODE20"
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm uppercase"
                />
                <input
                  aria-label="Commission rate (%)"
                  value={newRate}
                  onChange={(e) => setNewRate(Number(e.target.value))}
                  type="number"
                  placeholder="10"
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"
                />
              </div>

              {editingMarketer && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMarketer(null)
                    setSelectedMarketer(null)
                    setSelectedUserId('')
                    setNewCode('')
                    setNewRate(10)
                  }}
                  className="mb-3 w-full rounded-xl bg-slate-800 py-3 text-xs font-bold text-white uppercase"
                >
                  ← Back To Create Mode
                </button>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white uppercase"
              >
                {editingMarketer ? 'Update Marketer' : 'Commit Node'}
              </button>
            </form>
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-sm font-black text-white uppercase">
              Active Marketers (Click to Filter)
            </h3>
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {marketers.map((m) => (
                <div
                  key={m.id}
                  className={`relative flex items-center justify-between rounded-xl border p-3 ${selectedMarketer?.id === m.id ? 'border-indigo-500 bg-indigo-900' : 'border-slate-800 bg-slate-950'}`}
                >
                  <button
                    type="button"
                    aria-label={`Filter by ${m.full_name ?? m.referral_code}`}
                    onClick={() => selectMarketer(m)}
                    className="absolute inset-0 z-0 cursor-pointer rounded-xl"
                  />
                  <div className="pointer-events-none relative z-10">
                    <p className="text-xs font-bold">{m.full_name}</p>
                    <p className="text-[10px] text-indigo-400">
                      {m.referral_code}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${m.full_name ?? m.referral_code}`}
                    onClick={() => void deleteMarketer(m.id)}
                    className="relative z-10 text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            {selectedMarketer && (
              <button
                type="button"
                onClick={() => setSelectedMarketer(null)}
                className="mt-4 text-[10px] text-slate-400 underline"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
        <div className="col-span-12 rounded-[24px] border border-slate-800 bg-slate-900 p-6 lg:col-span-7">
          {selectedMarketer && marketerStats && (
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-[10px] text-slate-400">Referral Code</p>
                <p className="font-bold">{selectedMarketer.referral_code}</p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-[10px] text-slate-400">Commission Rate</p>
                <p className="font-bold">
                  {selectedMarketer.commission_rate_pct}%
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-[10px] text-slate-400">Joined</p>
                <p className="font-bold">
                  {new Date(selectedMarketer.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-[10px] text-slate-400">Customers</p>
                <p className="font-bold">{marketerStats.totalCustomers}</p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-[10px] text-slate-400">Sales Generated</p>
                <p className="font-bold">
                  KES {marketerStats.totalSales.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-[10px] text-slate-400">Commission Earned</p>
                <p className="font-bold text-emerald-400">
                  KES {marketerStats.totalCommission.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <h3 className="mb-4 border-b border-slate-800 pb-3 text-sm font-black text-white uppercase">
            {selectedMarketer
              ? `Attribution Log: ${selectedMarketer.full_name}`
              : 'All Referral Activity'}
          </h3>
          <div className="space-y-3">
            {filteredAttributions.map((attr) => (
              <div
                key={attr.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div>
                  <p className="text-xs font-bold">
                    {attr.users?.full_name || 'Direct Conversion'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Ref Code: {attr.referral_code_used}
                  </p>
                </div>
                <p className="text-xs font-black text-emerald-400">
                  +KES {Number(attr.calculated_commission).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
