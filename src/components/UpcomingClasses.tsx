import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Calendar,
  List,
  ChevronRight,
  User,
  ExternalLink,
  Award,
  BookOpen,
} from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { ComponentProps } from 'react'

interface UpcomingClass {
  id: string
  start_time: string
  title?: string | null
  student_name?: string | null
  grade?: string | null
  meet_link?: string | null
}

interface UpcomingClassesProps {
  classes?: UpcomingClass[]
  loading: boolean
  allEvents?: ComponentProps<typeof FullCalendar>['events']
}

export default function UpcomingClasses({
  classes = [],
  loading,
  allEvents = [],
}: UpcomingClassesProps) {
  const [view, setView] = useState('list')
  const [selectedClass, setSelectedClass] = useState<UpcomingClass | null>(null)

  if (loading)
    return <div className="h-48 animate-pulse rounded-2xl bg-white p-5" />

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all duration-300">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
          {selectedClass
            ? 'Class Details'
            : view === 'list'
              ? 'Next Up'
              : 'Schedule'}
        </h3>
        {!selectedClass && (
          <button
            onClick={() => setView(view === 'list' ? 'calendar' : 'list')}
            className="text-slate-400 hover:text-blue-600"
          >
            {view === 'list' ? <Calendar size={16} /> : <List size={16} />}
          </button>
        )}
      </div>

      {selectedClass ? (
        <div className="animate-in fade-in zoom-in space-y-4 duration-200">
          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Class
              </p>
              <h4 className="text-sm font-bold text-slate-800">
                {selectedClass.title}
              </h4>
            </div>

            {/* Student Details Section */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Student
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <User size={14} className="text-blue-500" />
                  {selectedClass.student_name || 'N/A'}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Grade
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Award size={14} className="text-amber-500" />
                  {selectedClass.grade || 'N/A'}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Time
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(selectedClass.start_time).toLocaleString()}
              </p>
            </div>

            {selectedClass.meet_link && (
              <a
                href={selectedClass.meet_link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 pt-2 text-sm font-bold text-blue-600 underline"
              >
                Join Meeting <ExternalLink size={14} />
              </a>
            )}
          </div>
          <button
            onClick={() => setSelectedClass(null)}
            className="w-full rounded-lg border border-slate-200 py-2 text-[10px] font-bold uppercase text-slate-400 hover:bg-slate-50"
          >
            Back to List
          </button>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-3">
          {classes.length > 0 ? (
            classes.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedClass(item)}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-50 bg-slate-50/50 p-3 transition-all hover:border-blue-100 hover:bg-white"
              >
                <div>
                  <p className="text-sm font-bold leading-none text-slate-800">
                    {item.title}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock size={10} />
                    {new Date(item.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-[10px] font-bold uppercase text-slate-400">
              No upcoming classes
            </p>
          )}
          <Link
            to="/calendar"
            className="flex items-center justify-center pt-2 text-[10px] font-black uppercase text-blue-600 hover:underline"
          >
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
  )
}
