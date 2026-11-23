import type { ReactNode } from 'react'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'

import { BookTrialWizard } from './BookTrialWizard'
import { SALES_NAV, type SalesView } from './navigation'
import { ParentsList } from './ParentsList'
import { RepOverview } from './RepOverview'
import { SalesBookingsList } from './SalesBookingsList'
import type { SalesRep } from './types'
import { WhatsAppFeed } from './WhatsAppFeed'

const PAGE_INTRO: Record<SalesView, string> = {
  dashboard: 'Your trials, sales and follow-ups this month.',
  parents:
    'Everyone to reach out to. Message or call them, then book a trial once you know about their child.',
  book: 'Pick a day and shift, choose a tutor’s open session, then add the student and their parent.',
  bookings: 'Your trials and what happened next.',
  whatsapp: 'Messages to your parents and their replies.',
}

/**
 * A sales rep's pages: their numbers, the parents to reach out to, trial
 * booking, bookings and WhatsApp. The sidebar (dashboard or preview) picks
 * `view`.
 */
export function SalesRepDashboard({
  rep,
  view,
  onNavigate,
  banner,
}: {
  rep: SalesRep
  view: SalesView
  onNavigate: (view: SalesView) => void
  /** Shown under the page heading, e.g. the demo-data notice. */
  banner?: ReactNode
}) {
  // The parent picked in "Parents" when the rep chose "Book trial".
  const [bookingFor, setBookingFor] = useState<string | null>(null)
  const [shownView, setShownView] = useState(view)
  if (shownView !== view) {
    // Opening "Book a Trial" from the sidebar starts with a new parent.
    setShownView(view)
    if (view !== 'book') setBookingFor(null)
  }

  const title =
    view === 'dashboard'
      ? `Hi ${rep.name.split(' ')[0] || 'there'} 👋`
      : (SALES_NAV.find((item) => item.id === view)?.label ?? '')

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />
      {view !== 'dashboard' && (
        <header>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            {PAGE_INTRO[view]}
          </p>
        </header>
      )}
      {view === 'dashboard' && (
        <RepOverview
          rep={rep}
          title={title}
          intro={PAGE_INTRO.dashboard}
          banner={banner}
          onNavigate={onNavigate}
        />
      )}
      {view !== 'dashboard' && banner}
      {view === 'parents' && (
        <ParentsList
          repId={rep.id}
          onBook={(leadId) => {
            setBookingFor(leadId)
            onNavigate('book')
          }}
        />
      )}
      {view === 'book' && (
        <BookTrialWizard
          key={bookingFor ?? 'new'}
          salesRepId={rep.id}
          initialLeadId={bookingFor}
        />
      )}
      {view === 'bookings' && (
        <SalesBookingsList repId={rep.id} creditRepId={rep.id} />
      )}
      {view === 'whatsapp' && <WhatsAppFeed repId={rep.id} />}
    </div>
  )
}
