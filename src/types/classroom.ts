import type { LucideIcon } from 'lucide-react'

export type Classroom = {
  /** The room code: the id in the URL and the LiveKit room name. */
  id: string
  title: string
  /** The browser tab title while the room is open. */
  pageTitle: string
  teacher: { name: string; initial: string }
  /** classroom_sessions.id, or null for sample data and unlinked rooms. */
  sessionId: string | null
  /** The class length the teacher should aim for, in minutes. */
  recommendedMinutes: number
}

export type Student = {
  /** The roster row (classroom_session_students.id). */
  id: string
  /** The registered student (users.id), when the booking has one. */
  userId: string | null
  name: string
  grade: string
  studentId: string
  phone: string
  email: string
  country: string
  city: string
  timeZone: string
  language: string
  source: string
  interests: string[]
  specialRequirement: string
}

export type Activity = {
  id: string
  title: string
  outline: string
  /** Where the student builds it. */
  project: string
}

export type MaterialLinkItem = {
  text: string
  href: string
  underline?: boolean
}

export type MaterialLinkRow = {
  label: string
  isNew?: boolean
  items: MaterialLinkItem[]
  note?: string
}

export type AgendaStep = { minutes: number; step: string }

export type ClassMaterial = {
  outcome: string[]
  outline: string
  agendaWarning: { title: string; body: string }
  agenda: AgendaStep[]
  links: MaterialLinkRow[]
}

export type BadgeIcon =
  'code' | 'crown' | 'bulb' | 'pen' | 'medal' | 'rocket' | 'stars' | 'star'

/** The ornament drawn around the medal. */
export type BadgeOrnament = 'wreath' | 'wings' | 'none'

export type Badge = {
  id: string
  name: string
  icon: BadgeIcon
  ornament: BadgeOrnament
}

/**
 * A badge awarded in this class. `key` is per award (the award row id once
 * saved): one badge can be given twice.
 */
export type GivenBadge = Badge & {
  key: string
  at: number
  /** Roster id and name of the student who received it. */
  studentId: string
  studentName: string
  /** False while the award is still being saved. */
  saved: boolean
}

export type VideoPlatform = {
  id: string
  name: string
  label: string
  /** This app's own room. */
  builtIn?: boolean
  joinUrl?: string
}

export type ClassAlert = { id: string; label: string; sent: string }

export type HelpTopicId =
  | 'ask-ai'
  | 'trial'
  | 'paid'
  | 'teacher-request'
  | 'onboarding'
  | 'general'
  | 'ptm'
  | 'leave'
  | 'payout'
  | 'strike'
  | 'mapping'

export type HelpTopic = { id: HelpTopicId; label: string; ai?: boolean }

export type HelpMessage = {
  id: string
  from: 'bot' | 'me'
  text: string
  at: number
}

export type TourItem = { term: string; description: string }

export type TourSection = { title: string; items: TourItem[] }

export type AiToolId = 'icebreaker' | 'explain' | 'encourage' | 'hint'

export type AiToolIcon = 'smile' | 'book' | 'heart' | 'compass'

export type AiTool = {
  id: AiToolId
  title: string
  description: string
  icon: AiToolIcon
}

export type AiToolResult = { title: string; body: string[] }

/** Someone in the room: this tab (`isSelf`) or another tab of the same room. */
export type Participant = {
  id: string
  name: string
  initial: string
  cam: boolean
  mic: boolean
  screen: boolean
  hand: boolean
  isSelf: boolean
  speaking?: boolean
  /** When a remote tab was last heard from (heartbeat). */
  lastSeen?: number
}

export type ChatMessage = {
  id: string
  text: string
  at: number
  from: Pick<Participant, 'id' | 'name' | 'initial'>
}

export type Reaction = {
  id: string
  emoji: string
  fromId: string
  /** Sideways drift of the floating emoji, in px. */
  drift: number
}

/** What tabs of one room send each other (docs/breakdown/12-realtime-sync.md). */
export type RoomMessage =
  | { type: 'hello' | 'here' | 'state' | 'bye' | 'end'; from: Participant }
  | { type: 'chat'; from: Participant; message: ChatMessage }
  | { type: 'reaction'; from: Participant; reaction: Reaction }
  | { type: 'badge'; from: Participant; award: BadgeAnnouncement }

/** Sent to the room when the teacher gives a badge, so everyone sees it. */
export type BadgeAnnouncement = {
  id: string
  name: string
  icon: BadgeIcon
  ornament: BadgeOrnament
  studentName: string
}

export type SubmittedProject = {
  id: string
  at: number
  activity: string
  link: string
  note: string
  /** Roster id and name of the student it was submitted for. */
  studentId: string
  studentName: string
}

/** Where the classroom's content came from. */
export type ClassroomSource =
  /** A classroom_sessions row: content and actions are saved to Supabase. */
  | 'live'
  /** The migration isn't applied (or Supabase isn't set up): built-in sample. */
  | 'sample'
  /** No session has this room code (or you can't see it): an empty room. */
  | 'unlinked'

/** Who is looking at the room. Staff run the class; everyone else attends. */
export type ClassroomViewer = {
  userId: string | null
  name: string | null
  isStaff: boolean
  isAdmin: boolean
}

/** Everything the room shows, loaded once per room code. */
export type ClassroomData = {
  source: ClassroomSource
  classroom: Classroom
  students: Student[]
  material: ClassMaterial | null
  activities: Activity[]
  badges: Badge[]
  awards: GivenBadge[]
  projects: SubmittedProject[]
  viewer: ClassroomViewer
}

export type PanelName = 'details' | 'chat' | 'people'

export type ClassModal =
  'submit' | 'ai' | 'platform' | 'settings' | 'share' | 'end'

export type ToolbarMenu = 'badge' | 'alert'

/** An option in the End class reason lists. */
export type EndReason = {
  id: string
  label: string
  /** Shown under the option once it's picked. */
  note?: string
  /** "Other reason" can't be sent without a description. */
  detailsRequired?: boolean
}

export type ClassOutcome = 'completed' | 'not-completed'

/** What the teacher reports when ending the class. */
export type ClassEndReport = {
  outcome: ClassOutcome
  /** Completed: where it finished (null = in this room). Not completed: why. */
  reasonId: string | null
  details: string
  /** Roster ids ticked as attended (completed classes only). */
  attended: string[]
}

export type ClassEndInfo = {
  reason: 'ended' | 'left'
  /** Who ended it, when another tab did. */
  by?: string | null
  elapsedMs: number
  /** Filled in when this tab ended the class through the End class modal. */
  report?: ClassEndReport
}

export type MenuAction = {
  id: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  danger?: boolean
  divider?: boolean
}

export type SelectOption = { value: string; label: string }
