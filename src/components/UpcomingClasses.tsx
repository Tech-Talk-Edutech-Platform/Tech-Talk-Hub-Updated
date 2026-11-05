import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Calendar, List, ChevronRight, User, ExternalLink, Award, BookOpen } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

export default function UpcomingClasses({ classes = [], loading, allEvents = [] }) {
  const [view, setView] = useState("list");
  const [selectedClass, setSelectedClass] = useState(null);

  if (loading) return <div className="p-5 bg-white rounded-2xl animate-pulse h-48"></div>;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          {selectedClass ? "Class Details" : (view === 'list' ? "Next Up" : "Schedule")}
        </h3>
        {!selectedClass && (
          <button onClick={() => setView(view === 'list' ? 'calendar' : 'list')} className="text-slate-400 hover:text-blue-600">
            {view === 'list' ? <Calendar size={16} /> : <List size={16} />}
          </button>
        )}
      </div>

      {selectedClass ? (
        <div className="space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Class</p>
              <h4 className="font-bold text-sm text-slate-800">{selectedClass.title}</h4>
            </div>
            
            {/* Student Details Section */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Student</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <User size={14} className="text-blue-500"/>
                  {selectedClass.student_name || "N/A"}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Grade</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Award size={14} className="text-amber-500"/>
                  {selectedClass.grade || "N/A"}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Time</p>
              <p className="text-sm font-semibold text-slate-700">{new Date(selectedClass.start_time).toLocaleString()}</p>
            </div>
            
            {selectedClass.meet_link && (
              <a href={selectedClass.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 font-bold text-sm underline pt-2">
                Join Meeting <ExternalLink size={14}/>
              </a>
            )}
          </div>
          <button onClick={() => setSelectedClass(null)} className="w-full text-[10px] font-bold uppercase text-slate-400 border border-slate-200 py-2 rounded-lg hover:bg-slate-50">
            Back to List
          </button>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-3">
          {classes.length > 0 ? (
            classes.map((item) => (
              <div key={item.id} onClick={() => setSelectedClass(item)} className="cursor-pointer group flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-blue-100 transition-all">
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-none">{item.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-center text-slate-400 py-6 uppercase font-bold">No upcoming classes</p>
          )}
          <Link to="/calendar" className="flex items-center justify-center text-[10px] font-black uppercase text-blue-600 pt-2 hover:underline">
            Full Schedule <ChevronRight size={12} />
          </Link>
        </div>
      ) : (
        <div className="h-48 overflow-hidden rounded-xl border border-slate-100">
         
           

          <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
          events={allEvents}
          height="100%"
          dayHeaderFormat={{ weekday: 'narrow' }}
          
        />

        </div>
      )}
    </div>
  );
}
