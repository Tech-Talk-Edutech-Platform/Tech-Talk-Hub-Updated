// SalesDashboard.js
import { useState, useEffect } from 'react'
import { plannedDb } from '../../lib/plannedDb'
// import Loading from "../../dashboards/views/Loading";

interface FollowupRate {
  due: number
  completed: number
}

interface LeaderboardRow {
  agent_id: string
  calls: number
  talk_time: number
}

interface SalesKpis {
  callsToday: number
  callsWeek: number
  talkTimeToday: number
  talkTimeWeek: number
  leadsProgressedToday: number
  leadsProgressedWeek: number
  followupRateToday: FollowupRate
  followupRateWeek: FollowupRate
  leaderboardToday: LeaderboardRow[]
  leaderboardWeek: LeaderboardRow[]
}

async function loadSalesKpis(): Promise<SalesKpis> {
  const now = new Date()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const startOfWeek = new Date()
  startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday start
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date()
  endOfWeek.setHours(23, 59, 59, 999)

  const today = {
    from_date: startOfToday.toISOString(),
    to_date: endOfToday.toISOString(),
  }
  const week = {
    from_date: startOfWeek.toISOString(),
    to_date: endOfWeek.toISOString(),
  }

  const [
    callsToday,
    callsWeek,
    talkTimeToday,
    talkTimeWeek,
    leadsToday,
    leadsWeek,
    followupToday,
    followupWeek,
    leaderboardToday,
    leaderboardWeek,
  ] = await Promise.all([
    // Calls
    plannedDb.rpc('calls_count', today),
    plannedDb.rpc('calls_count', week),
    // Talk Time
    plannedDb.rpc('total_talk_time', today),
    plannedDb.rpc('total_talk_time', week),
    // Leads progressed
    plannedDb.rpc('leads_progressed', today),
    plannedDb.rpc('leads_progressed', week),
    // Follow-up completion
    plannedDb.rpc('followup_completion_rate', today),
    plannedDb.rpc('followup_completion_rate', week),
    // Leaderboard
    plannedDb.rpc('agent_call_leaderboard', today),
    plannedDb.rpc('agent_call_leaderboard', week),
  ])

  return {
    callsToday: callsToday.data || 3,
    callsWeek: callsWeek.data || 4,
    talkTimeToday: talkTimeToday.data || 15,
    talkTimeWeek: talkTimeWeek.data || 36,
    leadsProgressedToday: leadsToday.data || 6,
    leadsProgressedWeek: leadsWeek.data || 17,
    followupRateToday: followupToday.data?.at(0) || { due: 3, completed: 8 },
    followupRateWeek: followupWeek.data?.at(0) || { due: 6, completed: 9 },
    leaderboardToday: leaderboardToday.data || [],
    leaderboardWeek: leaderboardWeek.data || [],
  }
}

export default function SalesDashboard() {
  // const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<SalesKpis>({
    callsToday: 3,
    callsWeek: 4,
    talkTimeToday: 15,
    talkTimeWeek: 36,
    leadsProgressedToday: 6,
    leadsProgressedWeek: 17,
    followupRateToday: { due: 3, completed: 8 },
    followupRateWeek: { due: 6, completed: 9 },
    leaderboardToday: [],
    leaderboardWeek: [],
  })

  useEffect(() => {
    let cancelled = false
    loadSalesKpis().then(
      (next) => {
        if (!cancelled) setKpis(next)
      },
      (error: unknown) => {
        if (!cancelled) console.error('Failed to load sales KPIs', error)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // if (loading) return <Loading label="Loading Dashboard..." />;

  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
      {/* KPI Cards */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-bold text-gray-700">Calls Today</h3>
        <p className="text-2xl font-black">{kpis.callsToday}</p>
        <small>Talk Time: {Math.floor(kpis.talkTimeToday / 60)} min</small>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-bold text-gray-700">Calls This Week</h3>
        <p className="text-2xl font-black">{kpis.callsWeek}</p>
        <small>Talk Time: {Math.floor(kpis.talkTimeWeek / 60)} min</small>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-bold text-gray-700">Leads Progressed Today</h3>
        <p className="text-2xl font-black">{kpis.leadsProgressedToday}</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-bold text-gray-700">
          Leads Progressed This Week
        </h3>
        <p className="text-2xl font-black">{kpis.leadsProgressedWeek}</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-bold text-gray-700">Follow-ups Today</h3>
        <p className="text-xl font-black">
          {kpis.followupRateToday.completed} / {kpis.followupRateToday.due}
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-bold text-gray-700">Follow-ups This Week</h3>
        <p className="text-xl font-black">
          {kpis.followupRateWeek.completed} / {kpis.followupRateWeek.due}
        </p>
      </div>

      {/* Leaderboard Today */}
      <div className="col-span-1 rounded-xl bg-white p-4 shadow-sm md:col-span-2">
        <h3 className="mb-2 font-bold text-gray-700">Leaderboard Today</h3>
        <ul>
          {kpis.leaderboardToday.map((a, idx) => (
            <li key={a.agent_id} className="mb-1 flex justify-between">
              <span>
                {idx + 1}. Agent {a.agent_id}
              </span>
              <span>
                {a.calls} calls / {Math.floor(a.talk_time / 60)} min
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Leaderboard Week */}
      <div className="col-span-1 rounded-xl bg-white p-4 shadow-sm md:col-span-2">
        <h3 className="mb-2 font-bold text-gray-700">Leaderboard This Week</h3>
        <ul>
          {kpis.leaderboardWeek.map((a, idx) => (
            <li key={a.agent_id} className="mb-1 flex justify-between">
              <span>
                {idx + 1}. Agent {a.agent_id}
              </span>
              <span>
                {a.calls} calls / {Math.floor(a.talk_time / 60)} min
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
