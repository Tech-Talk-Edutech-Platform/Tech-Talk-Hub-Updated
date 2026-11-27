import type {
  ClassRecordingsClassroomColumns,
  ClassroomFunctions,
  ClassroomTables,
  UsersBadgeColumns,
} from './classroomTables'
import type { Database } from './database'

/*
 * The schema that parked features (support issues, notes topics,
 * tutors' lesson notes, invoices, call costs, sales reporting, marketers and
 * referrals) were written against.
 *
 * None of the tables and functions below exist in the database yet, and the
 * planned columns on real tables don't either, so `database.ts` (generated
 * from the live database) doesn't list them. Queries through `plannedDb` compile against
 * these shapes but fail at runtime until a migration creates them. When one
 * is created, regenerate `database.ts`, delete it from here and switch its
 * queries back to `supabase`.
 */

type RealSchema = Database['public']
type RealTables = RealSchema['Tables']

/** A planned table. Columns named in `RequiredOnInsert` must be given on insert. */
type PlannedTable<
  Row extends Record<string, unknown>,
  RequiredOnInsert extends keyof Row = never,
  Relationships extends unknown[] = [],
> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, RequiredOnInsert>
  Update: Partial<Row>
  Relationships: Relationships
}

/**
 * A real table with planned columns: new ones it doesn't have yet, or existing
 * ones that take values the database doesn't allow yet.
 */
type WithPlannedColumns<
  Name extends keyof RealTables,
  Extra extends Record<string, unknown>,
> = {
  Row: Omit<RealTables[Name]['Row'], keyof Extra> & Extra
  Insert: Omit<RealTables[Name]['Insert'], keyof Extra> & Partial<Extra>
  Update: Omit<RealTables[Name]['Update'], keyof Extra> & Partial<Extra>
  Relationships: RealTables[Name]['Relationships']
}

/** A many-to-one foreign key from `Column` to `Referenced.id`. */
type ForeignKey<
  Name extends string,
  Column extends string,
  Referenced extends string,
> = {
  foreignKeyName: Name
  columns: [Column]
  isOneToOne: false
  referencedRelation: Referenced
  referencedColumns: ['id']
}

type PlannedTables = {
  /**
   * Support tickets. `status` is 'open' or 'pending' when raised, then
   * 'in_progress' and 'resolved'; `target_role` says who should pick it up.
   */
  issues: PlannedTable<
    {
      id: string
      reported_by: string
      title: string
      description: string | null
      category: string | null
      priority: string | null
      status: string
      target_role: string | null
      assigned_to: string | null
      created_at: string
    },
    'reported_by' | 'title'
  >

  /** Users who earn commission on sales made with their referral code. */
  marketer_profiles: PlannedTable<
    {
      /** The marketer's user id. */
      id: string
      full_name: string | null
      referral_code: string
      commission_rate_pct: number
      created_at: string
    },
    'id' | 'referral_code'
  >

  /**
   * A sale credited to a marketer's code. `status` moves from pending to
   * 'approved' to 'paid'.
   */
  referral_attributions: PlannedTable<
    {
      id: string
      marketer_id: string
      lead_or_student_id: string | null
      referral_code_used: string
      sale_amount: number | null
      calculated_commission: number | null
      status: string
      created_at: string
    },
    'marketer_id' | 'referral_code_used',
    [
      ForeignKey<
        'referral_attributions_marketer_id_fkey',
        'marketer_id',
        'marketer_profiles'
      >,
      ForeignKey<
        'referral_attributions_lead_or_student_id_fkey',
        'lead_or_student_id',
        'users'
      >,
    ]
  >

  /** Invoices issued to customers; `total` is in KES. */
  invoices: PlannedTable<
    {
      id: string
      invoice_number: string
      customer_id: string
      date_created: string
      due_date: string | null
      total: number
      paid: boolean
    },
    'invoice_number' | 'customer_id' | 'total',
    [ForeignKey<'invoices_customer_id_fkey', 'customer_id', 'customers'>]
  >

  /** An invoice's line items; `unit_price` is in KES. */
  invoice_items: PlannedTable<
    {
      id: string
      invoice_id: string
      description: string
      quantity: number
      unit_price: number
    },
    'invoice_id' | 'description' | 'quantity' | 'unit_price',
    [ForeignKey<'invoice_items_invoice_id_fkey', 'invoice_id', 'invoices'>]
  >

  /** Billing contacts that invoices are addressed to. */
  customers: PlannedTable<
    {
      id: string
      name: string
      email: string | null
      phone: string | null
    },
    'name'
  >

  /** Calls made from the sales desk, priced per minute. */
  call_logs: PlannedTable<
    {
      id: string
      duration_seconds: number | null
      created_at: string
    },
    'duration_seconds'
  >

  /** Topics group notes within a course. */
  topics: PlannedTable<
    {
      id: string
      course_id: string
      title: string
      created_at: string | null
    },
    'course_id' | 'title'
  >

  /** A tutor's lesson-progress note (the topic reached) for a student. */
  student_notes_progress: PlannedTable<
    {
      id: string
      student_id: string
      tutor_id: string
      topic: string | null
    },
    'student_id' | 'tutor_id'
  >

  /** Trial students, not yet signed up as users. */
  students: PlannedTable<
    {
      id: string
      full_name: string
      parent_name: string | null
      parent_phone: string | null
      assigned_tutor_id: string | null
      created_at: string | null
    },
    'full_name'
  >
}

/** Sales-desk reporting functions; each covers calls between two timestamps. */
type DateRange = { from_date: string; to_date: string }

type PlannedFunctions = {
  calls_count: { Args: DateRange; Returns: number }
  /** Total talk time in seconds. */
  total_talk_time: { Args: DateRange; Returns: number }
  leads_progressed: { Args: DateRange; Returns: number }
  followup_completion_rate: {
    Args: DateRange
    Returns: { due: number; completed: number }[]
  }
  /** Calls and talk time (seconds) per sales agent. */
  agent_call_leaderboard: {
    Args: DateRange
    Returns: { agent_id: string; calls: number; talk_time: number }[]
  }
  /** The user's next scheduled class, or null when none is booked. */
  get_next_class: {
    Args: { user_id: string; role: string | null }
    Returns: { class_title: string; start_time: string } | null
  }
}

type RealTablesWithPlannedColumns = {
  /** Attendance is marked, e.g. 'present'. */
  event_attendance: WithPlannedColumns<
    'event_attendance',
    { status: string | null }
  >

  /** Notes are filed under a topic. */
  notes: WithPlannedColumns<'notes', { topic_id: string | null }>

  /**
   * The tutor's student view reads a student's lesson topic from here (while
   * it saves to `student_notes_progress`).
   */
  user_notes_progress: WithPlannedColumns<
    'user_notes_progress',
    { student_id: string | null; topic: string | null }
  >

  /** Students' class badges (classroom invites/badges migration). */
  users: WithPlannedColumns<'users', UsersBadgeColumns>

  /** Classroom recordings link to their session (classroom migration). */
  class_recordings: WithPlannedColumns<
    'class_recordings',
    ClassRecordingsClassroomColumns
  >
}

/** A row of any table in the planned schema. */
export type PlannedRow<Name extends keyof PlannedDatabase['public']['Tables']> =
  PlannedDatabase['public']['Tables'][Name]['Row']

export type PlannedDatabase = {
  __InternalSupabase: Database['__InternalSupabase']
  public: {
    Tables: Omit<RealTables, keyof RealTablesWithPlannedColumns> &
      RealTablesWithPlannedColumns &
      PlannedTables &
      ClassroomTables
    Views: RealSchema['Views']
    // The hand-written classroom functions win: the generator can't tell
    // which returned columns may be null, and lags behind new migrations.
    Functions: Omit<RealSchema['Functions'], keyof ClassroomFunctions> &
      PlannedFunctions &
      ClassroomFunctions
    Enums: RealSchema['Enums']
    CompositeTypes: RealSchema['CompositeTypes']
  }
}
