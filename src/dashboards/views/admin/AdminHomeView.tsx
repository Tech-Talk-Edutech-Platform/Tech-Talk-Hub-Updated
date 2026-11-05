import React, { useEffect, useState, useCallback } from "react";
import { 
  ShieldAlert, BarChart3, Globe, TrendingUp, Users2, FileText, 
  Plus, CheckCircle2, Activity, Settings, ChevronRight 
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabase";
import { notifyTutor } from "../../../Utils/adminActions";
import { StatCard } from "../../../components/dashboard/ui/StatCard";
import Messages from "../../../Utils/fetchMessage";
import toast from "react-hot-toast";

export default function AdminHomeView({ userId, role }) {
  const [stats, setStats] = useState({ revenue: 0, tutors: 0, students: 0, conversion: 0, issues: 0 });
  const [upcoming, setUpcoming] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Optional modals handler placeholders if needed
  const [showAudit, setShowAudit] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const fetchIssues = async () => {
    const { data } = await supabase
      .from("issues")
      .select(`id, title, status, priority, created_at, users:reported_by(full_name)`)
      .order("created_at", { ascending: false });
    setIssues(data || []);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const [
        { data: payments },
        { count: tutors },
        { count: students },
        { count: leads },
        { count: converted },
        { count: issuesCount },
        { data: classes }
      ] = await Promise.all([
        supabase.from("payments").select("amount").eq("status", "paid"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "tutor"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "converted"),
        supabase.from("issues").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("calendar_events")
          .select(`*, tutors:tutor_id(full_name), event_attendance(id, students(full_name))`)
          .or(`and(start_time.gte.${startOfToday.toISOString()},start_time.lte.${endOfToday.toISOString()}),and(end_time.gte.${startOfToday.toISOString()},end_time.lte.${endOfToday.toISOString()})`)
          .order("start_time")
      ]);

      setStats({
        revenue: payments?.reduce((s, p) => s + p.amount, 0) || 0,
        tutors: tutors || 0,
        students: students || 0,
        conversion: leads && leads > 0 ? ((converted / leads) * 100).toFixed(1) : 0,
        issues: issuesCount || 0
      });

      setUpcoming(classes || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch fresh dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchIssues();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-28 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-xs font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase animate-pulse">Initializing Operations Center...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8 animate-fade-in">

      {/* STATS GRID BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/*   {role === "owner" && (
          <StatCard title="Total Revenue" value={`KES ${stats.revenue.toLocaleString()}`} icon={BarChart3} />
        )}*/}
        <StatCard title="Active Tutors" value={stats.tutors} accent="blue" icon={Users2} />
        <StatCard title="Active Students" value={stats.students} accent="blue" icon={Globe} />
         {/*  {(role === "owner" || role === "tech_admin") && (
          <StatCard title="Lead Conv %" value={`${stats.conversion}%`} accent="amber" icon={TrendingUp} />
        )}*/}
        {(role === "owner" || role === "tech_admin") && (
          <StatCard title="Open Issues" value={stats.issues} icon={ShieldAlert} />
        )}
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        
        {/* MAIN COLUMN */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">

          {/* REPORTED TECHNICAL & SUPPORT ISSUES */}
          {(role === "owner" || role === "tech_admin") && (
            <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 md:p-8 border border-gray-100 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">Support & Technical Tickets</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Review active issues reported across tutors and students.</p>
                  </div>
                </div>
                {issues.length > 0 && (
                  <span className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-full text-xs font-black">
                    {issues.length} Pending
                  </span>
                )}
              </div>

              {issues.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs font-bold bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                  🎉 No open support tickets or infrastructure issues right now!
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.slice(0, 5).map(issue => (
                    <div key={issue.id} className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/30 dark:bg-white/5 transition-all hover:bg-gray-50/80">
                      <div className="space-y-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{issue.title}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Reported by: <span className="text-purple-600 dark:text-purple-400">{issue.users?.full_name || "Unknown Staff"}</span> • <span className="text-rose-600 capitalize">{issue.priority || 'Normal'} priority</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                        {issue.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INTERNAL CHAT / MESSAGING WIDGET */}
          <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 md:p-8 border border-gray-100 dark:border-white/10 shadow-sm">
            <Messages userId={userId} isAdmin={true} />
          </div>

        </div>

        {/* SIDEBAR COMMAND CENTER */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
          
          {/* QUICK LINKS PANEL */}
          <div className="bg-gray-900 dark:bg-white/5 p-6 md:p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden border border-gray-800 dark:border-white/10">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-2 mb-6 text-purple-400 font-black uppercase text-[10px] tracking-widest">
              <Settings size={16} className="text-purple-500" /> Administrative Links
            </div>
            
            <div className="space-y-3 relative z-10">
              <Link to="/calendar" className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.99] rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-950/40 border border-purple-500/30">
                <span>📅 Open Global Calendar</span>
                <Plus size={14} />
              </Link>
              
              {(role === "owner" || role === "tech_admin" || role === "marketer") && (
                <Link to="/admin/referrals" className="w-full flex items-center justify-between p-4 bg-gray-800/80 border border-gray-700/50 hover:bg-gray-800 active:scale-[0.99] rounded-2xl text-xs font-bold text-gray-200 transition-all group">
                  <span>🎟️ Sales Referral Pipeline</span>
                  <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
              
              <button onClick={() => setShowAudit(true)} className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 active:scale-[0.99] flex justify-between items-center text-xs font-bold transition-all text-gray-200 hover:text-white">
                <span>🕵️ Audit Daily Class Logs</span>
                <FileText size={14} className="text-gray-400" />
              </button>
              
              {(role === "owner" || role === "tech_admin") && (
                <button onClick={() => setShowSales(true)} className="w-full p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-[0.99] flex justify-between items-center text-xs font-bold transition-all">
                  <span>📈 Sales & Leads Pipeline</span>
                  <TrendingUp size={14} />
                </button>
              )}
              
              {role === "owner" && (
                <button onClick={() => setShowAnalytics(true)} className="w-full p-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 active:scale-[0.99] flex justify-between items-center text-xs font-bold transition-all">
                  <span>📊 Core Metrics & Analytics</span>
                  <BarChart3 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* LIVE CLASS MONITOR */}
          <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Activity size={16} className="text-purple-600 dark:text-purple-400 animate-pulse" /> Live Class Monitor
            </h3>
            
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {upcoming.length === 0 ? (
                <div className="text-center py-8 px-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                  <p className="text-xs text-gray-400 font-bold">No classes scheduled for today.</p>
                </div>
              ) : (
                upcoming.map(c => (
                  <div key={c.id} className="p-4 border border-gray-100 dark:border-white/10 rounded-2xl bg-gray-50/30 dark:bg-white/5 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 dark:text-white text-xs truncate">{c.title}</p>
                      <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">{c.tutors?.full_name || "Assigned Tutor"}</p>
                    </div>
                    <button 
                      onClick={() => { notifyTutor(c.tutor_id, `Confirmed: ${c.title}`); toast.success("Pinged tutor successfully!"); }} 
                      className="p-2.5 bg-white dark:bg-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-gray-100 dark:border-white/10 shadow-xs transition-all shrink-0"
                      title="Ping Tutor"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
