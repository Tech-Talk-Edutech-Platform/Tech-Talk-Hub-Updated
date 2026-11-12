import type { Database, Json } from './database'

/*
 * The classroom's tables, created by
 * supabase/migrations/20261110120000_classroom.sql. They are merged into
 * `PlannedDatabase` (plannedTables.ts) so `plannedDb` queries compile before
 * the migration has been applied and `database.ts` regenerated. After
 * `npm run gen:types`, these shapes match the generated ones and this file can
 * be deleted along with the merge in plannedTables.ts.
 */

type Table<Row extends Record<string, unknown>, Required extends keyof Row> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, Required>
  Update: Partial<Row>
  Relationships: []
}

export type ClassroomSessionStatus =
  'scheduled' | 'live' | 'completed' | 'not_completed' | 'cancelled'

export type ClassroomTables = {
  classroom_materials: Table<
    {
      id: string
      title: string
      course_id: string | null
      outline: string
      outcomes: string[]
      /** [{ minutes, step }] */
      agenda: Json
      agenda_warning_title: string
      agenda_warning_body: string
      /** [{ label, isNew?, note?, items: [{ text, href, underline? }] }] */
      links: Json
      is_active: boolean
      created_by: string | null
      created_at: string
      updated_at: string
    },
    'title'
  >
  classroom_activities: Table<
    {
      id: string
      material_id: string
      title: string
      outline: string
      project_url: string | null
      position: number
      created_at: string
    },
    'material_id' | 'title'
  >
  classroom_badges: Table<
    {
      id: string
      slug: string
      name: string
      icon: string
      ornament: string
      position: number
      is_active: boolean
      created_at: string
    },
    'slug' | 'name' | 'icon'
  >
  classroom_sessions: Table<
    {
      id: string
      room_code: string
      title: string
      page_title: string
      class_type: Database['public']['Enums']['class_type']
      tutor_id: string | null
      material_id: string | null
      calendar_event_id: string | null
      scheduled_at: string | null
      duration_minutes: number | null
      status: ClassroomSessionStatus
      started_at: string | null
      ended_at: string | null
      end_reason: string | null
      end_details: string | null
      elapsed_seconds: number | null
      created_by: string | null
      created_at: string
      updated_at: string
    },
    'room_code' | 'title'
  >
  classroom_session_students: Table<
    {
      id: string
      session_id: string
      student_id: string | null
      lead_id: string | null
      display_name: string
      grade: string | null
      student_code: string | null
      phone: string | null
      email: string | null
      country: string | null
      city: string | null
      time_zone: string
      language: string | null
      source: string | null
      interests: string[]
      special_requirement: string | null
      attended: boolean | null
      position: number
      created_at: string
    },
    'session_id' | 'display_name'
  >
  classroom_badge_awards: Table<
    {
      id: string
      session_id: string
      session_student_id: string
      student_id: string | null
      badge_id: string
      awarded_by: string | null
      created_at: string
    },
    'session_id' | 'session_student_id' | 'badge_id'
  >
  classroom_project_submissions: Table<
    {
      id: string
      session_id: string
      session_student_id: string
      student_id: string | null
      activity_id: string | null
      activity_title: string
      project_url: string
      note: string | null
      submitted_by: string | null
      created_at: string
    },
    'session_id' | 'session_student_id' | 'activity_title' | 'project_url'
  >
  classroom_alerts: Table<
    {
      id: string
      session_id: string
      alert_type: 'ac' | 'support'
      sent_by: string | null
      created_at: string
      resolved_at: string | null
      resolved_by: string | null
    },
    'session_id' | 'alert_type'
  >
}

/** The column the migration adds to `class_recordings`. */
export type ClassRecordingsClassroomColumns = {
  classroom_session_id: string | null
}

/**
 * The class times added to both functions by migration 20261112140000.
 * Optional: before it's applied, the functions return without them.
 */
type ScheduleColumns = {
  scheduled_at?: string | null
  duration_minutes?: number | null
  started_at?: string | null
}

export type ClassroomFunctions = {
  /**
   * The join screen's class title, status and times, for guests who aren't
   * signed in.
   */
  classroom_public_info: {
    Args: { p_room_code: string }
    Returns: ({ title: string; status: string } & ScheduleColumns)[]
  }
  /**
   * The signed-in student's invites: the classes they're booked into
   * (migration 20261112120000).
   */
  classroom_my_invites: {
    Args: never
    Returns: ({
      session_id: string
      room_code: string
      title: string
      status: string
      tutor_name: string | null
      invited_at: string
      attended: boolean | null
    } & ScheduleColumns)[]
  }
}

/**
 * The column migration 20261112120000 adds to `users`: the badges a student
 * was given in class, kept in step with classroom_badge_awards by a trigger.
 * Each entry is parsed into a `ProfileBadge` (src/types/classroom.ts).
 */
export type UsersBadgeColumns = {
  badges: Json | null
}

export type ClassroomRow<Name extends keyof ClassroomTables> =
  ClassroomTables[Name]['Row']
