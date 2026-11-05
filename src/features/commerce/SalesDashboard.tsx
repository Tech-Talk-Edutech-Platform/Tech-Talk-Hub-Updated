// SalesDashboard.js
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
// import Loading from "../../dashboards/views/Loading";

export default function SalesDashboard() {
  // const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
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
  });

  useEffect(() => {
    const fetchKpis = async () => {
      // setLoading(true);
      const now = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date();
      endOfWeek.setHours(23, 59, 59, 999);

      // Calls
      const callsToday = await supabase.rpc("calls_count", {
        from_date: startOfToday.toISOString(),
        to_date: endOfToday.toISOString(),
      });

      const callsWeek = await supabase.rpc("calls_count", {
        from_date: startOfWeek.toISOString(),
        to_date: endOfWeek.toISOString(),
      });

      // Talk Time
      const talkTimeToday = await supabase.rpc("total_talk_time", {
        from_date: startOfToday.toISOString(),
        to_date: endOfToday.toISOString(),
      });

      const talkTimeWeek = await supabase.rpc("total_talk_time", {
        from_date: startOfWeek.toISOString(),
        to_date: endOfWeek.toISOString(),
      });

      // Leads progressed
      const leadsToday = await supabase.rpc("leads_progressed", {
        from_date: startOfToday.toISOString(),
        to_date: endOfToday.toISOString(),
      });
      const leadsWeek = await supabase.rpc("leads_progressed", {
        from_date: startOfWeek.toISOString(),
        to_date: endOfWeek.toISOString(),
      });

      // Follow-up completion
      const followupToday = await supabase.rpc("followup_completion_rate", {
        from_date: startOfToday.toISOString(),
        to_date: endOfToday.toISOString(),
      });
      const followupWeek = await supabase.rpc("followup_completion_rate", {
        from_date: startOfWeek.toISOString(),
        to_date: endOfWeek.toISOString(),
      });

      // Leaderboard
      const leaderboardToday = await supabase.rpc("agent_call_leaderboard", {
        from_date: startOfToday.toISOString(),
        to_date: endOfToday.toISOString(),
      });
      const leaderboardWeek = await supabase.rpc("agent_call_leaderboard", {
        from_date: startOfWeek.toISOString(),
        to_date: endOfWeek.toISOString(),
      });

      setKpis({
        callsToday: callsToday.data || 3,
        callsWeek: callsWeek.data || 4,
        talkTimeToday: talkTimeToday.data || 15,
        talkTimeWeek: talkTimeWeek.data || 36,
        leadsProgressedToday: leadsToday.data || 6,
        leadsProgressedWeek: leadsWeek.data || 17,
        followupRateToday: followupToday.data?.[0] || { due: 3, completed: 8 },
        followupRateWeek: followupWeek.data?.[0] || { due: 6, completed: 9 },
        leaderboardToday: leaderboardToday.data || [],
        leaderboardWeek: leaderboardWeek.data || [],
      });

      // setLoading(false);
    };

    fetchKpis();
  }, []);

  // if (loading) return <Loading label="Loading Dashboard..." />;

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* KPI Cards */}
      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="font-bold text-gray-700 mb-2">Calls Today</h3>
        <p className="text-2xl font-black">{kpis.callsToday}</p>
        <small>
          Talk Time: {Math.floor(kpis.talkTimeToday / 60)} min
        </small>
      </div>

      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="font-bold text-gray-700 mb-2">Calls This Week</h3>
        <p className="text-2xl font-black">{kpis.callsWeek}</p>
        <small>
          Talk Time: {Math.floor(kpis.talkTimeWeek / 60)} min
        </small>
      </div>

      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="font-bold text-gray-700 mb-2">Leads Progressed Today</h3>
        <p className="text-2xl font-black">{kpis.leadsProgressedToday}</p>
      </div>

      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="font-bold text-gray-700 mb-2">Leads Progressed This Week</h3>
        <p className="text-2xl font-black">{kpis.leadsProgressedWeek}</p>
      </div>

      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="font-bold text-gray-700 mb-2">Follow-ups Today</h3>
        <p className="text-xl font-black">
          {kpis.followupRateToday.completed} / {kpis.followupRateToday.due}
        </p>
      </div>

      <div className="p-4 bg-white rounded-xl shadow">
        <h3 className="font-bold text-gray-700 mb-2">Follow-ups This Week</h3>
        <p className="text-xl font-black">
          {kpis.followupRateWeek.completed} / {kpis.followupRateWeek.due}
        </p>
      </div>

      {/* Leaderboard Today */}
      <div className="p-4 bg-white rounded-xl shadow col-span-1 md:col-span-2">
        <h3 className="font-bold text-gray-700 mb-2">Leaderboard Today</h3>
        <ul>
          {kpis.leaderboardToday.map((a, idx) => (
            <li key={a.agent_id} className="flex justify-between mb-1">
              <span>{idx + 1}. Agent {a.agent_id}</span>
              <span>{a.calls} calls / {Math.floor(a.talk_time / 60)} min</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Leaderboard Week */}
      <div className="p-4 bg-white rounded-xl shadow col-span-1 md:col-span-2">
        <h3 className="font-bold text-gray-700 mb-2">Leaderboard This Week</h3>
        <ul>
          {kpis.leaderboardWeek.map((a, idx) => (
            <li key={a.agent_id} className="flex justify-between mb-1">
              <span>{idx + 1}. Agent {a.agent_id}</span>
              <span>{a.calls} calls / {Math.floor(a.talk_time / 60)} min</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
