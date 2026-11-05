import React, { useState, useEffect } from 'react';
import { Shield, Clock, Search, Filter, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    fetchLiveAuditLogs();
  }, []);

  const fetchLiveAuditLogs = async () => {
    setLoading(true);
    try {
      // Direct pipeline fetch into your relational system attendance logs
      const { data, error } = await supabase
        .from("event_attendance")
        .select(`
          id, 
          status, 
          created_at,
          students(full_name),
          calendar_events(title, start_time, tutors:tutor_id(full_name))
        `)
        .order("created_at", { ascending: false })
        .limit(200); // Performance cap

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      toast.error("Failed to interface with Supabase audit systems.");
    } finally {
      setLoading(false);
    }
  };

  // Processing client side sorting pipelines
  const filteredLogs = logs.filter(log => {
    const studentName = log.students?.full_name?.toLowerCase() || "";
    const eventTitle = log.calendar_events?.title?.toLowerCase() || "";
    const tutorName = log.calendar_events?.tutors?.full_name?.toLowerCase() || "";
    const searchNormalized = searchTerm.toLowerCase();

    const matchesSearch = studentName.includes(searchNormalized) || 
                          eventTitle.includes(searchNormalized) || 
                          tutorName.includes(searchNormalized);

    const matchesFilter = activeFilter === "all" || log.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      <Toaster position="top-right" />
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link to="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition mb-2 w-fit">
            <ArrowLeft className="w-4 h-4" /> Return to Main Operations Hub
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" /> Administrative Class Audit Logs
          </h1>
          <p className="text-sm text-slate-500">
            Real-time infrastructure ledger processing verified structural check-ins and session vectors.
          </p>
        </div>
        
        <div>
          <button 
            onClick={fetchLiveAuditLogs}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition shadow-xs text-slate-600 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Pipeline
          </button>
        </div>
      </div>

      {/* SEARCH AND INTERACTION ROUTERS */}
      <div className="max-w-7xl mx-auto mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Filter by student, class name, or tutor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden md:block mr-1" />
          {[
            { id: 'all', label: 'All Records' },
            { id: 'present', label: 'Present' },
            { id: 'absent', label: 'Absent / Pending' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setActiveFilter(btn.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                activeFilter === btn.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* CORE MATRIX RENDER ENGINE */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-black tracking-widest text-slate-400 uppercase">Polling Supabase Clusters...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Log Token ID</th>
                  <th className="p-4">Enrolled Student</th>
                  <th className="p-4">Target Session Context</th>
                  <th className="p-4">Assigned Tutor</th>
                  <th className="p-4 text-right">Status Flag</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 font-medium">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 text-slate-500 whitespace-nowrap font-mono text-xs">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(log.created_at).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-slate-400">#{String(log.id).slice(0, 8)}</td>
                      <td className="p-4 text-slate-900 font-bold">{log.students?.full_name || "Corrupted Record Name"}</td>
                      <td className="p-4">
                        <span className="text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs font-bold">
                          {log.calendar_events?.title || "Undefined Instance"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{log.calendar_events?.tutors?.full_name || "System Base Node"}</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          log.status === 'present' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}>
                          {log.status === 'present' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {log.status || "untracked"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-slate-400 font-bold italic">
                      No matching historical tracking instances recorded in this scope pipeline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}




// import React, { useState } from 'react';
// import { Shield, Clock, Search, Filter, Download, ArrowLeft, RefreshCw } from 'lucide-react';

// // Sample operational audit logs
// const INITIAL_LOGS = [
//   { id: "LOG-9821", timestamp: "2026-06-08 11:14:02", user: "Tutor Sarah", action: "Class Completed", details: "Class #402 marked done. Duration: 60 mins.", type: "class", status: "success" },
//   { id: "LOG-9820", timestamp: "2026-06-08 10:45:22", user: "System", action: "Payroll Generated", details: "Bi-weekly tutor payout draft compiled.", type: "payroll", status: "success" },
//   { id: "LOG-9819", timestamp: "2026-06-08 09:12:00", user: "Supabase Webhook", action: "Sync Failure", details: "Foreign key constraint violation on table 'profiles'.", type: "system", status: "error" },
//   { id: "LOG-9818", timestamp: "2026-06-07 16:30:15", user: "Admin", action: "Schedule Override", details: "Moved Class #405 from 3 PM to 5 PM.", type: "class", status: "warning" },
//   { id: "LOG-9817", timestamp: "2026-06-07 14:00:10", user: "System", action: "Database Backup", details: "Automated daily snapshot completed successfully.", type: "system", status: "success" }
// ];

// export default function AdminLogsPage() {
//   const [logs, setLogs] = useState(INITIAL_LOGS);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [activeFilter, setActiveFilter] = useState("all");

//   // Filtering Logic
//   const filteredLogs = logs.filter(log => {
//     const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
//                           log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                           log.user.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesFilter = activeFilter === "all" || log.type === activeFilter;
//     return matchesSearch && matchesFilter;
//   });

//   return (
//     <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
//       {/* Header */}
//       <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//         <div>
//           <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition mb-2">
//             <ArrowLeft className="w-4 h-4" /> Back to Dashboard
//           </button>
//           <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
//             <Shield className="w-6 h-6 text-indigo-600" /> System & Audit Logs
//           </h1>
//           <p className="text-sm text-slate-500">
//             Immutable trail for dispute resolution, payroll verification, and system health.
//           </p>
//         </div>
        
//         <div className="flex items-center gap-3">
//           <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm text-slate-600">
//             <Download className="w-4 h-4" /> Export CSV
//           </button>
//         </div>
//       </div>

//       {/* Control Bar */}
//       <div className="max-w-7xl mx-auto mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
//         {/* Search */}
//         <div className="relative w-full md:w-80">
//           <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
//           <input 
//             type="text" 
//             placeholder="Search action, user, or details..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
//           />
//         </div>

//         {/* Filters */}
//         <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
//           <Filter className="w-4 h-4 text-slate-400 hidden md:block mr-1" />
//           {['all', 'class', 'payroll', 'system'].map((type) => (
//             <button
//               key={type}
//               onClick={() => setActiveFilter(type)}
//               className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
//                 activeFilter === type 
//                   ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
//                   : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
//               }`}
//             >
//               {type}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Logs Table */}
//       <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
//                 <th className="p-4 w-40">Timestamp</th>
//                 <th className="p-4 w-32">Log ID</th>
//                 <th className="p-4 w-44">Actor</th>
//                 <th className="p-4 w-48">Action</th>
//                 <th className="p-4">Details</th>
//               </tr>
//             </thead>
//             <tbody className="text-sm divide-y divide-slate-100">
//               {filteredLogs.length > 0 ? (
//                 filteredLogs.map((log) => (
//                   <tr key={log.id} className="hover:bg-slate-50/50 transition">
//                     <td className="p-4 text-slate-500 whitespace-nowrap font-mono text-xs">
//                       <span className="flex items-center gap-1.5">
//                         <Clock className="w-3.5 h-3.5 text-slate-400" /> {log.timestamp}
//                       </span>
//                     </td>
//                     <td className="p-4 font-mono text-xs font-semibold text-slate-600">{log.id}</td>
//                     <td className="p-4 font-medium text-slate-700">{log.user}</td>
//                     <td className="p-4">
//                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                         log.status === 'error' ? 'bg-red-50 text-red-700' :
//                         log.status === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
//                       }`}>
//                         {log.action}
//                       </span>
//                     </td>
//                     <td className="p-4 text-slate-600 font-mono text-xs max-w-md truncate md:max-w-none md:whitespace-normal">
//                       {log.details}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="5" className="p-8 text-center text-slate-400">
//                     No logs found matching the selected criteria.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }