import type { Database, Json } from './database'

/*
 * The schema that parked features (exams, support issues, notes topics,
 * invoices, call costs, sales reporting, marketers and referrals) were
 * written against.
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
  /** Timed exams students sit from their dashboard. */
  exams: PlannedTable<
    {
      id: string
      title: string
      duration_minutes: number
      created_at: string | null
    },
    'title' | 'duration_minutes'
  >

  /**
   * An exam's questions. `type` is 'mcq', 'short' or 'debug'; `options` holds
   * the choices as lettered options ({ A, B, C, D }) or a list.
   */
  questions: PlannedTable<
    {
      id: string
      exam_id: string
      question_text: string
      type: string | null
      options: Json | null
      correct_answer: string | null
      marks: number | null
      created_at: string | null
    },
    'exam_id' | 'question_text',
    [ForeignKey<'questions_exam_id_fkey', 'exam_id', 'exams'>]
  >

  /** A student's sitting of an exam; `end_time` is null while it is open. */
  attempts: PlannedTable<
    {
      id: string
      exam_id: string
      student_id: string
      start_time: string
      end_time: string | null
      score: number | null
    },
    'exam_id' | 'student_id',
    [ForeignKey<'attempts_exam_id_fkey', 'exam_id', 'exams'>]
  >

  /** One answer per question per attempt (unique on attempt_id, question_id). */
  answers: PlannedTable<
    {
      id: string
      attempt_id: string
      question_id: string
      answer: string
    },
    'attempt_id' | 'question_id' | 'answer',
    [
      ForeignKey<'answers_attempt_id_fkey', 'attempt_id', 'attempts'>,
      ForeignKey<'answers_question_id_fkey', 'question_id', 'questions'>,
    ]
  >

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

  /** Marketers sign in with a 'marketer' role. */
  users: WithPlannedColumns<
    'users',
    { role: RealSchema['Enums']['user_role'] | 'marketer' | null }
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
      PlannedTables
    Views: RealSchema['Views']
    Functions: RealSchema['Functions'] & PlannedFunctions
    Enums: RealSchema['Enums']
    CompositeTypes: RealSchema['CompositeTypes']
  }
}
