
import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Award,
  Flame,
  Wallet,
  Users,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import { supabase } from "../../../supabase";
import { StatCard } from "../../../components/dashboard/ui/StatCard";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function MarketerDashboard({ currentMarketerId }) {
  const [profile, setProfile] = useState(null);
  const [myConversions, setMyConversions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentMarketerId) fetchMarketerData();
  }, [currentMarketerId]);

  const fetchMarketerData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profData, error: profErr } = await supabase
        .from("marketer_profiles")
        .select("*")
        .eq("id", currentMarketerId)
        .single();

      if (profErr || !profData) throw new Error("Marketer not found");
      setProfile(profData);

      const { data: convData, error: convErr } = await supabase
        .from("referral_attributions")
        .select("*, users:lead_or_student_id(full_name)")
        .eq("marketer_id", currentMarketerId)
        .order("created_at", { ascending: false });

      if (convErr) throw convErr;
      setMyConversions(convData || []);

      const { data: leaderboardData } = await supabase
        .from("referral_attributions")
        .select("marketer_id, marketer_profiles(full_name)");

      const counts = (leaderboardData || []).reduce((acc, curr) => {
        const id = curr.marketer_id;
        const name = curr.marketer_profiles?.full_name || "Anonymous";
        if (!acc[id]) acc[id] = { name, count: 0 };
        acc[id].count++;
        return acc;
      }, {});

      setLeaderboard(Object.values(counts).slice(0, 5));
    } catch (err) {
      setError(err.message);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const copyReferralLink = (code) => {
    const link = `https://www.techtalk-hub.com/book-class?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading)
    return <div className="text-center py-20 text-slate-400">Loading dashboard...</div>;

  if (!profile)
    return <div className="text-center py-20 text-red-400">Marketer not found</div>;

  const totalConversions = myConversions.length;
  const totalEarned = myConversions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.calculated_commission || 0), 0);
  const pending = myConversions
    .filter((c) => c.status !== "paid")
    .reduce((s, c) => s + Number(c.calculated_commission || 0), 0);
  const eligible = totalConversions >= 4;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8 bg-slate-950 text-white min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-slate-900 p-5 rounded-xl border border-slate-800">
        <div>
          <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Marketer Portal</p>
          <h1 className="text-xl font-bold">{profile.full_name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => copyReferralLink(profile.referral_code)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {profile.referral_code}
          </button>

          <button
            onClick={handleLogout}
            className="p-2.5 bg-slate-800 text-rose-400 rounded-lg hover:bg-rose-900/30 transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Earned" value={`KES ${totalEarned}`} icon={Wallet} />
        <StatCard title="Pending" value={`KES ${pending}`} icon={ArrowUpRight} />
        <StatCard title="Conversions" value={totalConversions} icon={Users} />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-sm font-bold flex items-center gap-2">
              <Flame size={14} /> Threshold
            </p>
            <p className="text-xs text-slate-400 mt-1">{totalConversions}/4 required</p>
            <div className="h-2 bg-slate-800 rounded mt-3">
              <div
                className={`h-full ${eligible ? "bg-green-500" : "bg-indigo-500"}`}
                style={{ width: `${Math.min((totalConversions / 4) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs mt-3 text-slate-400">
              {eligible ? "Unlocked payouts" : `Need ${4 - totalConversions} more`}
            </p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="font-bold mb-3 flex items-center gap-2">
              <Award size={14} /> Top Marketers
            </p>
            {leaderboard.map((m, i) => (
              <div key={i} className="flex justify-between text-xs py-2 border-b border-slate-800 last:border-0">
                <span>{m.name}</span>
                <span>{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-bold mb-4">Conversions</h2>
          <div className="space-y-3">
            {myConversions.length === 0 ? (
              <p className="text-slate-400 text-sm">No conversions yet</p>
            ) : (
              myConversions.map((c) => (
                <div key={c.id} className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex justify-between">
                  <div>
                    <p className="text-sm font-bold">{c.users?.full_name || "User"}</p>
                    <p className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-400 font-bold text-sm">+KES {c.calculated_commission}</p>
                    <span className={`text-xs px-2 py-1 rounded ${c.status === "paid" ? "bg-green-900 text-green-400" : "bg-amber-900 text-amber-400"}`}>
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
  );
}
