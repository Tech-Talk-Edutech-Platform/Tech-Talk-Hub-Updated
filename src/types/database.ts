export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          booking_status: string
          class_id: string | null
          class_material_url: string | null
          class_type: Database['public']['Enums']['class_type'] | null
          created_at: string | null
          end_time: string
          ended_at: string | null
          id: string
          meet_link: string | null
          merged_class: boolean
          notes: string | null
          recording_url: string | null
          session_status: string
          start_time: string
          started_at: string | null
          title: string
          tutor_id: string | null
        }
        Insert: {
          booking_status?: string
          class_id?: string | null
          class_material_url?: string | null
          class_type?: Database['public']['Enums']['class_type'] | null
          created_at?: string | null
          end_time: string
          ended_at?: string | null
          id?: string
          meet_link?: string | null
          merged_class?: boolean
          notes?: string | null
          recording_url?: string | null
          session_status?: string
          start_time: string
          started_at?: string | null
          title: string
          tutor_id?: string | null
        }
        Update: {
          booking_status?: string
          class_id?: string | null
          class_material_url?: string | null
          class_type?: Database['public']['Enums']['class_type'] | null
          created_at?: string | null
          end_time?: string
          ended_at?: string | null
          id?: string
          meet_link?: string | null
          merged_class?: boolean
          notes?: string | null
          recording_url?: string | null
          session_status?: string
          start_time?: string
          started_at?: string | null
          title?: string
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_events_class_id_fkey'
            columns: ['class_id']
            isOneToOne: false
            referencedRelation: 'classes'
            referencedColumns: ['id']
          },
        ]
      }
      class_booking_requests: {
        Row: {
          calendar_event_id: string | null
          created_at: string
          id: string
          requested_end: string
          requested_start: string
          responded_at: string | null
          status: string
          student_id: string
          tutor_id: string
          tutor_response: string | null
        }
        Insert: {
          calendar_event_id?: string | null
          created_at?: string
          id?: string
          requested_end: string
          requested_start: string
          responded_at?: string | null
          status?: string
          student_id: string
          tutor_id: string
          tutor_response?: string | null
        }
        Update: {
          calendar_event_id?: string | null
          created_at?: string
          id?: string
          requested_end?: string
          requested_start?: string
          responded_at?: string | null
          status?: string
          student_id?: string
          tutor_id?: string
          tutor_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'class_booking_requests_calendar_event_id_fkey'
            columns: ['calendar_event_id']
            isOneToOne: false
            referencedRelation: 'calendar_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_booking_requests_calendar_event_id_fkey'
            columns: ['calendar_event_id']
            isOneToOne: false
            referencedRelation: 'v_upcoming_student_classes'
            referencedColumns: ['event_id']
          },
          {
            foreignKeyName: 'class_booking_requests_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_booking_requests_tutor_id_fkey'
            columns: ['tutor_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      class_recordings: {
        Row: {
          classroom_session_id: string | null
          created_at: string | null
          id: string
          recording_url: string
          student_id: string | null
          thumbnail_url: string | null
          title: string
          tutor_id: string | null
        }
        Insert: {
          classroom_session_id?: string | null
          created_at?: string | null
          id?: string
          recording_url: string
          student_id?: string | null
          thumbnail_url?: string | null
          title: string
          tutor_id?: string | null
        }
        Update: {
          classroom_session_id?: string | null
          created_at?: string | null
          id?: string
          recording_url?: string
          student_id?: string | null
          thumbnail_url?: string | null
          title?: string
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'class_recordings_classroom_session_id_fkey'
            columns: ['classroom_session_id']
            isOneToOne: false
            referencedRelation: 'classroom_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_recordings_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_recordings_tutor_id_fkey'
            columns: ['tutor_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      class_resources: {
        Row: {
          created_at: string
          event_id: string
          file_url: string
          id: string
          resource_type: string
          title: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          event_id: string
          file_url: string
          id?: string
          resource_type: string
          title: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          event_id?: string
          file_url?: string
          id?: string
          resource_type?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: 'class_resources_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'calendar_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_resources_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'v_upcoming_student_classes'
            referencedColumns: ['event_id']
          },
          {
            foreignKeyName: 'class_resources_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      classes: {
        Row: {
          class_material_url: string | null
          class_type: Database['public']['Enums']['class_type'] | null
          completed: boolean | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          recording_url: string | null
          scheduled_at: string
          started_at: string | null
          status: string
          student_id: string | null
          tutor_id: string | null
        }
        Insert: {
          class_material_url?: string | null
          class_type?: Database['public']['Enums']['class_type'] | null
          completed?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          scheduled_at: string
          started_at?: string | null
          status?: string
          student_id?: string | null
          tutor_id?: string | null
        }
        Update: {
          class_material_url?: string | null
          class_type?: Database['public']['Enums']['class_type'] | null
          completed?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          student_id?: string | null
          tutor_id?: string | null
        }
        Relationships: []
      }
      classroom_activities: {
        Row: {
          created_at: string
          id: string
          material_id: string
          outline: string
          position: number
          project_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          outline?: string
          position?: number
          project_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          outline?: string
          position?: number
          project_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classroom_activities_material_id_fkey'
            columns: ['material_id']
            isOneToOne: false
            referencedRelation: 'classroom_materials'
            referencedColumns: ['id']
          },
        ]
      }
      classroom_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          sent_by: string | null
          session_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sent_by?: string | null
          session_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sent_by?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classroom_alerts_resolved_by_fkey'
            columns: ['resolved_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_alerts_sent_by_fkey'
            columns: ['sent_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_alerts_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'classroom_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      classroom_badge_awards: {
        Row: {
          awarded_by: string | null
          badge_id: string
          created_at: string
          id: string
          session_id: string
          session_student_id: string
          student_id: string | null
        }
        Insert: {
          awarded_by?: string | null
          badge_id: string
          created_at?: string
          id?: string
          session_id: string
          session_student_id: string
          student_id?: string | null
        }
        Update: {
          awarded_by?: string | null
          badge_id?: string
          created_at?: string
          id?: string
          session_id?: string
          session_student_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'classroom_badge_awards_awarded_by_fkey'
            columns: ['awarded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_badge_awards_badge_id_fkey'
            columns: ['badge_id']
            isOneToOne: false
            referencedRelation: 'classroom_badges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_badge_awards_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'classroom_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_badge_awards_session_student_id_fkey'
            columns: ['session_student_id']
            isOneToOne: false
            referencedRelation: 'classroom_session_students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_badge_awards_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      classroom_badges: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          ornament: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          ornament?: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          ornament?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      classroom_materials: {
        Row: {
          agenda: Json
          agenda_warning_body: string
          agenda_warning_title: string
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          links: Json
          outcomes: string[]
          outline: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: Json
          agenda_warning_body?: string
          agenda_warning_title?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          links?: Json
          outcomes?: string[]
          outline?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: Json
          agenda_warning_body?: string
          agenda_warning_title?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          links?: Json
          outcomes?: string[]
          outline?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classroom_materials_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_materials_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      classroom_project_submissions: {
        Row: {
          activity_id: string | null
          activity_title: string
          created_at: string
          id: string
          note: string | null
          project_url: string
          session_id: string
          session_student_id: string
          student_id: string | null
          submitted_by: string | null
        }
        Insert: {
          activity_id?: string | null
          activity_title: string
          created_at?: string
          id?: string
          note?: string | null
          project_url: string
          session_id: string
          session_student_id: string
          student_id?: string | null
          submitted_by?: string | null
        }
        Update: {
          activity_id?: string | null
          activity_title?: string
          created_at?: string
          id?: string
          note?: string | null
          project_url?: string
          session_id?: string
          session_student_id?: string
          student_id?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'classroom_project_submissions_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'classroom_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_project_submissions_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'classroom_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_project_submissions_session_student_id_fkey'
            columns: ['session_student_id']
            isOneToOne: false
            referencedRelation: 'classroom_session_students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_project_submissions_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_project_submissions_submitted_by_fkey'
            columns: ['submitted_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      classroom_session_students: {
        Row: {
          attended: boolean | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string
          email: string | null
          grade: string | null
          id: string
          interests: string[]
          language: string | null
          lead_id: string | null
          phone: string | null
          position: number
          session_id: string
          source: string | null
          special_requirement: string | null
          student_code: string | null
          student_id: string | null
          time_zone: string
        }
        Insert: {
          attended?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          grade?: string | null
          id?: string
          interests?: string[]
          language?: string | null
          lead_id?: string | null
          phone?: string | null
          position?: number
          session_id: string
          source?: string | null
          special_requirement?: string | null
          student_code?: string | null
          student_id?: string | null
          time_zone?: string
        }
        Update: {
          attended?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          grade?: string | null
          id?: string
          interests?: string[]
          language?: string | null
          lead_id?: string | null
          phone?: string | null
          position?: number
          session_id?: string
          source?: string | null
          special_requirement?: string | null
          student_code?: string | null
          student_id?: string | null
          time_zone?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classroom_session_students_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_session_students_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'classroom_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_session_students_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      classroom_sessions: {
        Row: {
          calendar_event_id: string | null
          class_type: Database['public']['Enums']['class_type']
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          elapsed_seconds: number | null
          end_details: string | null
          end_reason: string | null
          ended_at: string | null
          id: string
          material_id: string | null
          page_title: string
          room_code: string
          scheduled_at: string | null
          started_at: string | null
          status: string
          title: string
          tutor_id: string | null
          updated_at: string
        }
        Insert: {
          calendar_event_id?: string | null
          class_type?: Database['public']['Enums']['class_type']
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          elapsed_seconds?: number | null
          end_details?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          material_id?: string | null
          page_title?: string
          room_code: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title: string
          tutor_id?: string | null
          updated_at?: string
        }
        Update: {
          calendar_event_id?: string | null
          class_type?: Database['public']['Enums']['class_type']
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          elapsed_seconds?: number | null
          end_details?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          material_id?: string | null
          page_title?: string
          room_code?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title?: string
          tutor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classroom_sessions_calendar_event_id_fkey'
            columns: ['calendar_event_id']
            isOneToOne: false
            referencedRelation: 'calendar_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_sessions_calendar_event_id_fkey'
            columns: ['calendar_event_id']
            isOneToOne: false
            referencedRelation: 'v_upcoming_student_classes'
            referencedColumns: ['event_id']
          },
          {
            foreignKeyName: 'classroom_sessions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_sessions_material_id_fkey'
            columns: ['material_id']
            isOneToOne: false
            referencedRelation: 'classroom_materials'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classroom_sessions_tutor_id_fkey'
            columns: ['tutor_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      course_lessons: {
        Row: {
          created_at: string | null
          id: string
          phase_id: string | null
          position: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          phase_id?: string | null
          position?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          phase_id?: string | null
          position?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'course_lessons_phase_id_fkey'
            columns: ['phase_id']
            isOneToOne: false
            referencedRelation: 'course_phases'
            referencedColumns: ['id']
          },
        ]
      }
      course_phases: {
        Row: {
          course_id: string | null
          created_at: string | null
          focus: string | null
          id: string
          phase_number: number | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          focus?: string | null
          id?: string
          phase_number?: number | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          focus?: string | null
          id?: string
          phase_number?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'course_phases_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          duration_lessons: number | null
          id: string
          is_active: boolean | null
          notes_file_url: string | null
          notes_text: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_lessons?: number | null
          id?: string
          is_active?: boolean | null
          notes_file_url?: string | null
          notes_text?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_lessons?: number | null
          id?: string
          is_active?: boolean | null
          notes_file_url?: string | null
          notes_text?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      event_attendance: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_attendance_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'calendar_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_attendance_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'v_upcoming_student_classes'
            referencedColumns: ['event_id']
          },
        ]
      }
      leads: {
        Row: {
          assigned_tutor_id: string | null
          class_date: string | null
          class_time: string | null
          country: string | null
          created_at: string | null
          email: string | null
          follow_up_missed: boolean | null
          grade: string | null
          id: string
          last_contacted_at: string | null
          lead_source: string | null
          next_follow_up_at: string | null
          parent_name: string | null
          personal_meet_link: string | null
          phone: string | null
          referal_code: string | null
          status: string | null
          student_name: string | null
          student_user_id: string | null
        }
        Insert: {
          assigned_tutor_id?: string | null
          class_date?: string | null
          class_time?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          follow_up_missed?: boolean | null
          grade?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_source?: string | null
          next_follow_up_at?: string | null
          parent_name?: string | null
          personal_meet_link?: string | null
          phone?: string | null
          referal_code?: string | null
          status?: string | null
          student_name?: string | null
          student_user_id?: string | null
        }
        Update: {
          assigned_tutor_id?: string | null
          class_date?: string | null
          class_time?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          follow_up_missed?: boolean | null
          grade?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_source?: string | null
          next_follow_up_at?: string | null
          parent_name?: string | null
          personal_meet_link?: string | null
          phone?: string | null
          referal_code?: string | null
          status?: string | null
          student_name?: string | null
          student_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'leads_student_user_id_fkey'
            columns: ['student_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string | null
          course_id: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          lesson_order: number | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          lesson_order?: number | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          lesson_order?: number | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notes_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_lesson_id_fkey'
            columns: ['lesson_id']
            isOneToOne: false
            referencedRelation: 'course_lessons'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          classes_per_week: number
          created_at: string
          description: string | null
          display_order: number
          features: string[]
          id: string
          is_active: boolean
          is_popular: boolean
          monthly_kes: number
          monthly_usd: number
          name: string
          quarterly_discount: number
          quarterly_kes: number
          quarterly_usd: number
          session_duration_minutes: number
          slug: string
          updated_at: string
          yearly_discount: number
          yearly_kes: number
          yearly_usd: number
        }
        Insert: {
          classes_per_week: number
          created_at?: string
          description?: string | null
          display_order?: number
          features?: string[]
          id?: string
          is_active?: boolean
          is_popular?: boolean
          monthly_kes: number
          monthly_usd: number
          name: string
          quarterly_discount?: number
          quarterly_kes: number
          quarterly_usd: number
          session_duration_minutes?: number
          slug: string
          updated_at?: string
          yearly_discount?: number
          yearly_kes: number
          yearly_usd: number
        }
        Update: {
          classes_per_week?: number
          created_at?: string
          description?: string | null
          display_order?: number
          features?: string[]
          id?: string
          is_active?: boolean
          is_popular?: boolean
          monthly_kes?: number
          monthly_usd?: number
          name?: string
          quarterly_discount?: number
          quarterly_kes?: number
          quarterly_usd?: number
          session_duration_minutes?: number
          slug?: string
          updated_at?: string
          yearly_discount?: number
          yearly_kes?: number
          yearly_usd?: number
        }
        Relationships: []
      }
      program_courses: {
        Row: {
          course_id: string
          created_at: string | null
          display_order: number | null
          id: string
          program_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          program_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'program_courses_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_courses_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
        ]
      }
      programs: {
        Row: {
          age_range: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_option_index: number
          id: string
          options: Json
          position: number | null
          question_text: string
          quiz_id: string | null
        }
        Insert: {
          correct_option_index: number
          id?: string
          options: Json
          position?: number | null
          question_text: string
          quiz_id?: string | null
        }
        Update: {
          correct_option_index?: number
          id?: string
          options?: Json
          position?: number | null
          question_text?: string
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'quiz_questions_quiz_id_fkey'
            columns: ['quiz_id']
            isOneToOne: false
            referencedRelation: 'quizzes'
            referencedColumns: ['id']
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          passing_score: number | null
          title: string
          type: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          passing_score?: number | null
          title: string
          type: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          passing_score?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'quizzes_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quizzes_lesson_id_fkey'
            columns: ['lesson_id']
            isOneToOne: true
            referencedRelation: 'course_lessons'
            referencedColumns: ['id']
          },
        ]
      }
      receipts: {
        Row: {
          amount: number | null
          created_at: string | null
          customer_name: string | null
          discount: number | null
          id: string
          payment_method: string | null
          phone: string | null
          receipt_number: string | null
          total_paid: number | null
          transaction_code: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          payment_method?: string | null
          phone?: string | null
          receipt_number?: string | null
          total_paid?: number | null
          transaction_code?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          payment_method?: string | null
          phone?: string | null
          receipt_number?: string | null
          total_paid?: number | null
          transaction_code?: string | null
        }
        Relationships: []
      }
      shop_order_items: {
        Row: {
          created_at: string | null
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: 'shop_order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'shop_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shop_order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'shop_products'
            referencedColumns: ['id']
          },
        ]
      }
      shop_orders: {
        Row: {
          county: string | null
          created_at: string | null
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_fee: number
          id: string
          notes: string | null
          order_number: string
          order_status: string
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          subtotal: number
          total_amount: number
          town: string | null
          updated_at: string | null
        }
        Insert: {
          county?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_fee?: number
          id?: string
          notes?: string | null
          order_number: string
          order_status?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          subtotal?: number
          total_amount?: number
          town?: string | null
          updated_at?: string | null
        }
        Update: {
          county?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_fee?: number
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          subtotal?: number
          total_amount?: number
          town?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          badge: string | null
          category: string
          compare_at_price: number | null
          created_at: string | null
          currency: string
          description: string | null
          display_order: number | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          price: number
          program: string | null
          short_description: string | null
          slug: string
          stock_quantity: number | null
          track_inventory: boolean | null
          updated_at: string | null
        }
        Insert: {
          badge?: string | null
          category: string
          compare_at_price?: number | null
          created_at?: string | null
          currency?: string
          description?: string | null
          display_order?: number | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          price: number
          program?: string | null
          short_description?: string | null
          slug: string
          stock_quantity?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Update: {
          badge?: string | null
          category?: string
          compare_at_price?: number | null
          created_at?: string | null
          currency?: string
          description?: string | null
          display_order?: number | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          price?: number
          program?: string | null
          short_description?: string | null
          slug?: string
          stock_quantity?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_assignments: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          grade: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          status: string | null
          student_answer: string | null
          student_id: string
          submission_link: string | null
          submitted_at: string | null
          task_name: string
          tutor_feedback: string | null
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          grade?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          status?: string | null
          student_answer?: string | null
          student_id: string
          submission_link?: string | null
          submitted_at?: string | null
          task_name: string
          tutor_feedback?: string | null
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          grade?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          status?: string | null
          student_answer?: string | null
          student_id?: string
          submission_link?: string | null
          submitted_at?: string | null
          task_name?: string
          tutor_feedback?: string | null
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'student_assignments_lesson_id_fkey'
            columns: ['lesson_id']
            isOneToOne: false
            referencedRelation: 'course_lessons'
            referencedColumns: ['id']
          },
        ]
      }
      student_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string | null
          enrolled_at: string | null
          id: string
          status: string
          student_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string
          student_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'student_enrollments_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
        ]
      }
      student_lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id?: string | null
          status?: string
          student_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'student_lesson_progress_lesson_id_fkey'
            columns: ['lesson_id']
            isOneToOne: false
            referencedRelation: 'course_lessons'
            referencedColumns: ['id']
          },
        ]
      }
      student_quiz_attempts: {
        Row: {
          completed_at: string | null
          id: string
          passed: boolean
          quiz_id: string | null
          score: number
          student_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          passed: boolean
          quiz_id?: string | null
          score: number
          student_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          passed?: boolean
          quiz_id?: string | null
          score?: number
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'student_quiz_attempts_quiz_id_fkey'
            columns: ['quiz_id']
            isOneToOne: false
            referencedRelation: 'quizzes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_quiz_attempts_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      student_results: {
        Row: {
          avatar_url: string | null
          course_name: string | null
          created_at: string
          creativity_score: number | null
          exam_date: string | null
          exam_title: string | null
          grade_level: string | null
          id: string
          is_passed: boolean | null
          overall_score: number | null
          performance_label: string | null
          practical_score: number | null
          problem_solving_score: number | null
          project_url: string | null
          slug: string | null
          student_id: string | null
          student_name: string
          theory_score: number | null
          tutor_feedback: string | null
          tutor_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          course_name?: string | null
          created_at?: string
          creativity_score?: number | null
          exam_date?: string | null
          exam_title?: string | null
          grade_level?: string | null
          id?: string
          is_passed?: boolean | null
          overall_score?: number | null
          performance_label?: string | null
          practical_score?: number | null
          problem_solving_score?: number | null
          project_url?: string | null
          slug?: string | null
          student_id?: string | null
          student_name: string
          theory_score?: number | null
          tutor_feedback?: string | null
          tutor_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          course_name?: string | null
          created_at?: string
          creativity_score?: number | null
          exam_date?: string | null
          exam_title?: string | null
          grade_level?: string | null
          id?: string
          is_passed?: boolean | null
          overall_score?: number | null
          performance_label?: string | null
          practical_score?: number | null
          problem_solving_score?: number | null
          project_url?: string | null
          slug?: string | null
          student_id?: string | null
          student_name?: string
          theory_score?: number | null
          tutor_feedback?: string | null
          tutor_name?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string | null
          display_order: number | null
          feedback: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          parent_name: string | null
          screenshot_url: string
          source: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          feedback?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          parent_name?: string | null
          screenshot_url: string
          source?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          feedback?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          parent_name?: string | null
          screenshot_url?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_notes_progress: {
        Row: {
          created_at: string | null
          id: string
          note_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_notes_progress_note_id_fkey'
            columns: ['note_id']
            isOneToOne: false
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          assigned_course_id: string | null
          assigned_tutor_id: string | null
          avatar_url: string | null
          classes_per_week: number | null
          classes_remaining: number | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          meeting_provider: string | null
          parent_id: string | null
          personal_meet_link: string | null
          push_subscription: Json | null
          role: Database['public']['Enums']['user_role'] | null
          skills: string[] | null
          subscription_tier: string | null
          total_classes: number | null
        }
        Insert: {
          assigned_course_id?: string | null
          assigned_tutor_id?: string | null
          avatar_url?: string | null
          classes_per_week?: number | null
          classes_remaining?: number | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          meeting_provider?: string | null
          parent_id?: string | null
          personal_meet_link?: string | null
          push_subscription?: Json | null
          role?: Database['public']['Enums']['user_role'] | null
          skills?: string[] | null
          subscription_tier?: string | null
          total_classes?: number | null
        }
        Update: {
          assigned_course_id?: string | null
          assigned_tutor_id?: string | null
          avatar_url?: string | null
          classes_per_week?: number | null
          classes_remaining?: number | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          meeting_provider?: string | null
          parent_id?: string | null
          personal_meet_link?: string | null
          push_subscription?: Json | null
          role?: Database['public']['Enums']['user_role'] | null
          skills?: string[] | null
          subscription_tier?: string | null
          total_classes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'users_assigned_course_id_fkey'
            columns: ['assigned_course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'users_assigned_tutor_id_fkey'
            columns: ['assigned_tutor_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_upcoming_student_classes: {
        Row: {
          event_id: string | null
          meet_link: string | null
          start_time: string | null
          student_id: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      classroom_can_read_recording: {
        Args: { p_path: string }
        Returns: boolean
      }
      classroom_can_teach: { Args: { p_session_id: string }; Returns: boolean }
      classroom_is_admin: { Args: never; Returns: boolean }
      classroom_is_enrolled: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      classroom_is_staff: { Args: never; Returns: boolean }
      classroom_public_info: {
        Args: { p_room_code: string }
        Returns: {
          status: string
          title: string
        }[]
      }
      create_tutor_availability: {
        Args: { p_start: string }
        Returns: {
          booking_status: string
          class_id: string | null
          class_material_url: string | null
          class_type: Database['public']['Enums']['class_type'] | null
          created_at: string | null
          end_time: string
          ended_at: string | null
          id: string
          meet_link: string | null
          merged_class: boolean
          notes: string | null
          recording_url: string | null
          session_status: string
          start_time: string
          started_at: string | null
          title: string
          tutor_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'calendar_events'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_available_tutors: {
        Args: { desired_time: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      notify_admins_booking_rejected: {
        Args: {
          p_reason?: string
          p_request_id: string
          p_student_id: string
          p_tutor_id: string
        }
        Returns: undefined
      }
      respond_to_class_booking_request: {
        Args: { p_decision: string; p_request_id: string; p_response?: string }
        Returns: {
          calendar_event_id: string | null
          created_at: string
          id: string
          requested_end: string
          requested_start: string
          responded_at: string | null
          status: string
          student_id: string
          tutor_id: string
          tutor_response: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'class_booking_requests'
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      class_type: 'trial' | 'regular' | 'makeup'
      user_role:
        | 'owner'
        | 'operations_admin'
        | 'tech_admin'
        | 'student'
        | 'tutor'
        | 'non_user'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      class_type: ['trial', 'regular', 'makeup'],
      user_role: [
        'owner',
        'operations_admin',
        'tech_admin',
        'student',
        'tutor',
        'non_user',
      ],
    },
  },
} as const
