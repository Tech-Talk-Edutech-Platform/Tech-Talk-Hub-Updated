import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { X, Search, FileText, CheckCircle2, Clock, User } from "lucide-react";

export default function AuditLogsModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    let active = true;

    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_attendance')
        .select(`
          id,
          status,
          created_at,
          students ( full_name ),
          calendar_events (
            title,
            start_time,
            tutors ( full_name )
          )
        `)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (!active) return;
      if (!error) setLogs(data ?? []);
      setLoading(false);
    };

    void fetchLogs();
    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen]);

  const filteredLogs = logs.filter(log => 
    log.students?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.calendar_events?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* HEADER */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <FileText className="text-blue-600" /> Audit Class Logs
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Historical Attendance & Session Records</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* FILTERS */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by student, class, or tutor..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-transparent focus:border-blue-500 outline-none font-bold transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* LOG LIST */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="p-20 text-center font-black text-slate-300 animate-pulse">FETCHING ARCHIVES...</div>
          ) : filteredLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${log.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {log.status === 'present' ? <CheckCircle2 size={20}/> : <Clock size={20}/>}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{log.students?.full_name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {log.calendar_events?.title} • {log.calendar_events?.tutors?.full_name}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-black text-slate-900">
                  {new Date(log.calendar_events?.start_time).toLocaleDateString()}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                  Logged: {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
