import { useState, useEffect } from 'react'
import { X, Search, FileText, CheckCircle2, Clock } from 'lucide-react'
import { loadAttendanceLogs } from '../lib/attendanceLogs'
import type { AttendanceLog } from '../lib/attendanceLogs'

interface AuditLogsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuditLogsModal({
  isOpen,
  onClose,
}: AuditLogsModalProps) {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return undefined

    const controller = new AbortController()
    let active = true

    loadAttendanceLogs({ signal: controller.signal }).then(
      (rows) => {
        if (!active) return
        setLogs(rows)
        setLoading(false)
      },
      () => {
        if (active) setLoading(false)
      },
    )

    return () => {
      active = false
      controller.abort()
    }
  }, [isOpen])

  const filteredLogs = logs.filter(
    (log) =>
      log.students?.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      log.calendar_events?.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-8">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <FileText className="text-blue-600" /> Audit Class Logs
            </h2>
            <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
              Historical Attendance & Session Records
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl p-3 transition-all hover:bg-slate-100"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* FILTERS */}
        <div className="border-b border-slate-100 bg-white p-6">
          <div className="relative">
            <Search
              className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by student, class, or tutor..."
              className="w-full rounded-2xl border border-transparent bg-slate-50 py-4 pr-4 pl-12 font-bold outline-hidden transition-all focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* LOG LIST */}
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {loading ? (
            <div className="animate-pulse p-20 text-center font-black text-slate-300">
              FETCHING ARCHIVES...
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-5 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-2xl p-3 ${log.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
                  >
                    {log.status === 'present' ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Clock size={20} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      {log.students?.full_name}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {log.calendar_events?.title} •{' '}
                      {log.calendar_events?.tutors?.full_name}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-black text-slate-900">
                    {log.calendar_events
                      ? new Date(
                          log.calendar_events.start_time,
                        ).toLocaleDateString()
                      : ''}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                    Logged:{' '}
                    {log.created_at
                      ? new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
