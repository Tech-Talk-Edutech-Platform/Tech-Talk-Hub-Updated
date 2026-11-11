import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, BookOpen, Presentation } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BadgesTab } from './BadgesTab'
import { MaterialsTab } from './MaterialsTab'
import { SessionsTab } from './SessionsTab'
import {
  ClassroomSchemaMissing,
  classroomKeys,
  probeClassroomSchema,
} from './classroomAdminApi'
import { ErrorNote, Loading, SetupNotice } from './ui'

type Tab = 'sessions' | 'materials' | 'badges'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'sessions', label: 'Classes', icon: Presentation },
  { id: 'materials', label: 'Lesson materials', icon: BookOpen },
  { id: 'badges', label: 'Badges', icon: Award },
]

/**
 * Dashboard › Classroom: the classes /classroom/<room code> opens, who is in
 * them, the lesson material they show and the badges teachers give.
 */
export default function ClassroomManager() {
  const [tab, setTab] = useState<Tab>('sessions')
  const probe = useQuery({
    queryKey: classroomKeys.probe,
    queryFn: probeClassroomSchema,
    retry: false,
    staleTime: 5 * 60_000,
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black tracking-wider text-pink-600 uppercase dark:text-pink-400">
            Management
          </p>
          <h2 className="mt-1 flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
            <Presentation className="text-purple-600" aria-hidden="true" />
            Classroom
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Set up live classes, book students in, and manage the lesson
            material and badges teachers use in the room.
          </p>
        </div>
        {probe.isSuccess && (
          <nav
            aria-label="Classroom sections"
            className="flex shrink-0 [scrollbar-width:none] gap-1 overflow-x-auto rounded-2xl border border-slate-200/60 bg-white p-1 dark:border-white/10 dark:bg-white/5"
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                  tab === id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {probe.isPending ? (
        <Loading label="Checking the classroom tables…" />
      ) : probe.isError ? (
        probe.error instanceof ClassroomSchemaMissing ? (
          <SetupNotice />
        ) : (
          <ErrorNote>{probe.error.message}</ErrorNote>
        )
      ) : tab === 'sessions' ? (
        <SessionsTab />
      ) : tab === 'materials' ? (
        <MaterialsTab />
      ) : (
        <BadgesTab />
      )}
    </div>
  )
}
