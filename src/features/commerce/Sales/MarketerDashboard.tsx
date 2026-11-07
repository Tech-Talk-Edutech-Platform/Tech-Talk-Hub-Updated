import { useState, useEffect } from 'react'
import {
  Copy,
  Check,
  Award,
  Flame,
  Wallet,
  Users,
  ArrowUpRight,
  LogOut,
} from 'lucide-react'
import { supabase } from '../../../supabase'
import { plannedDb } from '../../../lib/plannedDb'
import { StatCard } from '../../../components/dashboard/ui/StatCard'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

interface LeaderboardEntry {
  id: string
  name: string
  count: number
}

async function loadMarketerData(marketerId: string) {
  const { data: profile, error: profErr } = await plannedDb
    .from('marketer_profiles')
    .select('*')
    .eq('id', marketerId)
    .single()

  if (profErr) throw new Error('Marketer not found')

  const { data: conversions, error: convErr } = await plannedDb
    .from('referral_attributions')
    .select('*, users:lead_or_student_id(full_name)')
    .eq('marketer_id', marketerId)
    .order('created_at', { ascending: false })

  if (convErr) throw convErr

  const { data: leaderboardData } = await plannedDb
    .from('referral_attributions')
    .select('marketer_id, marketer_profiles(full_name)')

  const counts = new Map<string, LeaderboardEntry>()
  for (const row of leaderboardData ?? []) {
    const entry = counts.get(row.marketer_id) ?? {
      id: row.marketer_id,
      name: row.marketer_profiles?.full_name || 'Anonymous',
      count: 0,
    }
    entry.count += 1
    counts.set(row.marketer_id, entry)
  }

  return {
    profile,
    conversions,
    leaderboard: [...counts.values()].slice(0, 5),
  }
}

type MarketerData = Awaited<ReturnType<typeof loadMarketerData>>

export default function MarketerDashboard({
  currentMarketerId,
}: {
  currentMarketerId: string
}) {
  const [profile, setProfile] = useState<MarketerData['profile'] | null>(null)
  const [myConversions, setMyConversions] = useState<
    MarketerData['conversions']
  >([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    loadMarketerData(currentMarketerId).then(
      (data) => {
        if (cancelled) return
        setProfile(data.profile)
        setMyConversions(data.conversions)
        setLeaderboard(data.leaderboard)
        setLoading(false)
      },
      () => {
        if (cancelled) return
        toast.error('Failed to load dashboard')
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [currentMarketerId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    void navigate('/login', { replace: true })
  }

  const copyReferralLink = (code: string) => {
    const link = `https://www.techtalk-hub.com/book-class?ref=${code}`
    void navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Referral link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading)
    return (
      <div className="py-20 text-center text-slate-400">
        Loading dashboard...
      </div>
    )

  if (!profile)
    return (
      <div className="py-20 text-center text-red-400">Marketer not found</div>
    )

  const totalConversions = myConversions.length
  const totalEarned = myConversions
    .filter((c) => c.status === 'paid')
    .reduce((s, c) => s + (c.calculated_commission ?? 0), 0)
  const pending = myConversions
    .filter((c) => c.status !== 'paid')
    .reduce((s, c) => s + (c.calculated_commission ?? 0), 0)
  const eligible = totalConversions >= 4

  return (
    <div className="mx-auto min-h-screen max-w-[1400px] space-y-8 bg-slate-950 p-6 text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div>
          <p className="text-xs font-bold tracking-wider text-indigo-400 uppercase">
            Marketer Portal
          </p>
          <h1 className="text-xl font-bold">{profile.full_name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => copyReferralLink(profile.referral_code)}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm transition-colors hover:bg-slate-700"
          >
            {copied ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Copy size={14} />
            )}
            {profile.referral_code}
          </button>

          <button
            type="button"
            aria-label="Logout"
            onClick={() => void handleLogout()}
            className="rounded-lg bg-slate-800 p-2.5 text-rose-400 transition-all hover:bg-rose-900/30"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Earned" value={`KES ${totalEarned}`} icon={Wallet} />
        <StatCard
          title="Pending"
          value={`KES ${pending}`}
          icon={ArrowUpRight}
        />
        <StatCard title="Conversions" value={totalConversions} icon={Users} />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Flame size={14} /> Threshold
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {totalConversions}/4 required
            </p>
            <div className="mt-3 h-2 rounded-sm bg-slate-800">
              <div
                className={`h-full ${eligible ? 'bg-green-500' : 'bg-indigo-500'}`}
                style={{
                  width: `${Math.min((totalConversions / 4) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {eligible
                ? 'Unlocked payouts'
                : `Need ${4 - totalConversions} more`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="mb-3 flex items-center gap-2 font-bold">
              <Award size={14} /> Top Marketers
            </p>
            {leaderboard.map((m) => (
              <div
                key={m.id}
                className="flex justify-between border-b border-slate-800 py-2 text-xs last:border-0"
              >
                <span>{m.name}</span>
                <span>{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-8">
          <h2 className="mb-4 font-bold">Conversions</h2>
          <div className="space-y-3">
            {myConversions.length === 0 ? (
              <p className="text-sm text-slate-400">No conversions yet</p>
            ) : (
              myConversions.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between rounded-lg border border-slate-800 bg-slate-950 p-4"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {c.users?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-400">
                      +KES {c.calculated_commission}
                    </p>
                    <span
                      className={`rounded-sm px-2 py-1 text-xs ${c.status === 'paid' ? 'bg-green-900 text-green-400' : 'bg-amber-900 text-amber-400'}`}
                    >
                      {c.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
