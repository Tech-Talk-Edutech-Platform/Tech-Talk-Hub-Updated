# Classroom data in Supabase

The live classroom at `/classroom/<room code>` used to run on hard-coded sample data. Its classes, students, lesson material, badges and everything that happens in class now live in Supabase, and admins manage them in **Dashboard › Management › Classroom**.

Everything is created by one migration: `supabase/migrations/20261110120000_classroom.sql`.

## 1. Apply the migration

Pick one way. Both are safe to repeat: every statement in the file is idempotent.

**Supabase dashboard (simplest)**

1. Open the project in the Supabase dashboard, then go to **SQL Editor › New query**.
2. Paste the whole migration file and click **Run**.

**Supabase CLI**

```bash
npx supabase link --project-ref iinwzibplknjqmofevpw
npx supabase db push
```

**Then regenerate the types**

```bash
npm run gen:types
```

Until you regenerate them, the app reads the classroom tables through `plannedDb`, with hand-written types in `src/types/classroomTables.ts`. After `gen:types`, `src/types/database.ts` contains the same shapes. You can then delete `classroomTables.ts`, remove its merge in `src/types/plannedTables.ts`, and query through `supabase` directly. That clean-up is optional.

Until the migration is applied:

- `/classroom` shows a built-in sample class, and nothing is saved.
- The dashboard page shows these setup steps.

## 2. Tables, fields and relations

```
courses ─┐
         └─< classroom_materials ─< classroom_activities
                     │
users (tutor) ──< classroom_sessions >── calendar_events (optional)
                     │
                     ├─< classroom_session_students >── users (student, optional)
                     │            │                └── leads (trial lead, optional)
                     │            ├─< classroom_badge_awards >── classroom_badges
                     │            └─< classroom_project_submissions >── classroom_activities
                     ├─< classroom_alerts
                     └─< class_recordings   (new column classroom_session_id)
```

`A ─< B` means one A has many B (B holds the foreign key).

### `classroom_materials`: lesson content

| Field                                         | Type                | Notes                                                                                                        |
| --------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`                                          | uuid                | Primary key                                                                                                  |
| `title`                                       | text                | Required, 1–200 characters                                                                                   |
| `course_id`                                   | uuid → `courses.id` | Optional; set to null if the course is deleted                                                               |
| `outline`                                     | text                | The Outline paragraph                                                                                        |
| `outcomes`                                    | text[]              | The Outcome bullet list                                                                                      |
| `agenda`                                      | jsonb               | `[{ "minutes": 5, "step": "Welcome" }]`. The total is the class's recommended length.                        |
| `agenda_warning_title`, `agenda_warning_body` | text                | The teacher-only warning above the agenda                                                                    |
| `links`                                       | jsonb               | `[{ "label": "Scratch", "isNew": true, "note": "…", "items": [{ "text": "Launch", "href": "https://…" }] }]` |
| `is_active`                                   | boolean             | Hidden materials aren't offered for new classes                                                              |
| `created_by`, `created_at`, `updated_at`      |                     | Filled in automatically                                                                                      |

### `classroom_activities`: a material's numbered activities

| Field         | Type                            | Notes                                                  |
| ------------- | ------------------------------- | ------------------------------------------------------ |
| `material_id` | uuid → `classroom_materials.id` | Deleted along with the material                        |
| `title`       | text                            | Required                                               |
| `outline`     | text                            |                                                        |
| `project_url` | text                            | Optional starter project; must start with `http(s)://` |
| `position`    | integer                         | Display order                                          |

### `classroom_badges`: the Give badge catalogue

| Field       | Type         | Notes                                                                     |
| ----------- | ------------ | ------------------------------------------------------------------------- |
| `slug`      | text, unique | `a-z`, `0-9` and `-` only                                                 |
| `name`      | text         | Shown to the teacher and student                                          |
| `icon`      | text         | One of `code`, `crown`, `bulb`, `pen`, `medal`, `rocket`, `stars`, `star` |
| `ornament`  | text         | `wreath` (gold), `wings` (pink) or `none`                                 |
| `position`  | integer      | Display order                                                             |
| `is_active` | boolean      | Off hides the badge from the classroom; it stays in past awards           |

A badge that has been awarded can't be deleted, because awards keep a reference to it. Turn off **Show in class** instead.

### `classroom_sessions`: one class

| Field                                       | Type                            | Notes                                                                                                                 |
| ------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `room_code`                                 | text, unique                    | The URL and the LiveKit room name: `/classroom/<room_code>`. 4–64 characters: letters, digits, `-` or `_`.            |
| `title`                                     | text                            | Shown in the class bar and on the guest join screen                                                                   |
| `page_title`                                | text                            | Browser tab title while the room is open                                                                              |
| `class_type`                                | `class_type` enum               | `trial`, `regular` or `makeup`                                                                                        |
| `tutor_id`                                  | uuid → `users.id`               | The teacher. Tutors only see sessions where this is them.                                                             |
| `material_id`                               | uuid → `classroom_materials.id` | Optional; set to null if the material is deleted                                                                      |
| `calendar_event_id`                         | uuid → `calendar_events.id`     | Optional link to the schedule                                                                                         |
| `scheduled_at`, `duration_minutes`          |                                 | When the class starts and how long it should run (5–600 minutes)                                                      |
| `status`                                    | text                            | `scheduled` → `live` (teacher opened the room) → `completed` or `not_completed` (End class). Can also be `cancelled`. |
| `started_at`, `ended_at`, `elapsed_seconds` |                                 | Set by the classroom                                                                                                  |
| `end_reason`, `end_details`                 | text                            | From the End class form. The reason ids are `END_COMPLETED_VIA` and `END_NOT_COMPLETED` in `src/data/classroom.ts`.   |

### `classroom_session_students`: who is booked into a class

Each row is a registered student (`student_id`), a trial lead (`lead_id`), or someone typed in by hand. The profile fields are a snapshot, so the teacher panel works the same for all three.

| Field                             | Type                           | Notes                                                                                         |
| --------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `session_id`                      | uuid → `classroom_sessions.id` | Deleted along with the session                                                                |
| `student_id`                      | uuid → `users.id`              | Optional. Links badges and projects to the student's account. Unique per session.             |
| `lead_id`                         | uuid → `leads.id`              | Optional                                                                                      |
| `display_name`                    | text                           | Required. The name the teacher sees.                                                          |
| `grade`, `student_code`           | text                           | `student_code` is the "Student ID" shown in Student info (e.g. `s2048117`)                    |
| `email`, `phone`                  | text                           | Visible to admins and the class's tutor only                                                  |
| `country`, `city`, `time_zone`    | text                           | `time_zone` is an IANA name such as `Africa/Accra`; the teacher sees the student's local time |
| `language`, `source`, `interests` |                                | `source` is where the booking came from; `interests` is a text array                          |
| `special_requirement`             | text                           | Shown with a pink tag in Class details                                                        |
| `attended`                        | boolean                        | Set by End class: true, false, or null if not reported                                        |
| `position`                        | integer                        | Display order                                                                                 |

### What happens in class

| Table                           | Written when                                | Key fields                                                                                                             |
| ------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `classroom_badge_awards`        | The teacher gives a badge (Undo deletes it) | `session_id`, `session_student_id`, `badge_id`, `student_id` (copied from the roster), `awarded_by`                    |
| `classroom_project_submissions` | Submit project                              | `session_student_id`, `activity_id` (optional), `activity_title` (snapshot), `project_url` (`http(s)://` only), `note` |
| `classroom_alerts`              | Send alert                                  | `alert_type` (`ac` = academic counsellor, `support`), `resolved_at` and `resolved_by` (set from the dashboard)         |
| `class_recordings` (existing)   | The teacher stops a recording               | New column `classroom_session_id`. `recording_url` holds the storage path.                                             |

A trigger, `classroom_fill_student`, checks that an award or project's student belongs to the same session, then copies `student_id` across, so the student's dashboard can find it.

## 3. Who can see and change what (row-level security)

|                                      | Admins (owner, operations_admin, tech_admin) | Tutors                                 | Students                                       | Not signed in                                                                         |
| ------------------------------------ | -------------------------------------------- | -------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Materials, activities                | read, write                                  | read                                   | –                                              | –                                                                                     |
| Badges                               | read, write                                  | read                                   | read                                           | read (catalogue only)                                                                 |
| Sessions                             | everything                                   | read and update their own (`tutor_id`) | read the ones they're booked into              | `classroom_public_info(room_code)` returns only title and status, for the join screen |
| Roster                               | everything                                   | read their sessions; update attendance | read their own row                             | –                                                                                     |
| Awards, projects                     | everything                                   | add and delete in their sessions       | read their own                                 | –                                                                                     |
| Alerts                               | read, resolve                                | send in their sessions, read           | –                                              | –                                                                                     |
| Recordings bucket `class-recordings` | upload, read, delete                         | upload, read                           | read recordings filed under their `student_id` | –                                                                                     |

Children's contact details (phone, email, city) are only readable by admins and the session's tutor. The End class attendance list shows each student's grade, not their phone number.

## 4. Running a class

1. **Dashboard › Classroom › Lesson materials**: create the material (outcomes, agenda, links, activities), or edit the seeded one.
2. **Dashboard › Classroom › Classes › New class**: set the title, tutor, material, start time and length. A room code is generated for you.
3. **Students in this class › Add student**: pick a registered student or a trial lead to fill in the details, then add the time zone and any special requirement.
4. Share the links:
   - **Open classroom** or **Teacher link**: `/classroom/<room code>`. Staff who are signed in get the teacher view: badges, projects, alerts, End class and recording.
   - **Student link**: `/classroom/<room code>?join=1`. This always opens the attendee view (chat, reactions, raise hand, Leave). Guests type their name first.
5. Tutors find their assigned classes under **Dashboard › My Classrooms**.
6. After class, the session's **Class activity** card shows the End class report, badges, projects, alerts (with **Mark resolved**) and recordings.

## 5. Recordings

- The teacher's browser records the class: screen and tab audio plus the microphone, as WebM, or MP4 in Safari.
- On stop, the file always downloads first, then uploads to the private bucket `class-recordings` at `<room code>/<timestamp>.webm`.
- A `class_recordings` row is created with the storage path.
- If the upload fails, the downloaded copy is still on the teacher's computer.
- The Recordings manager and the student dashboard open these recordings through one-hour signed URLs. Links pasted by hand (YouTube, Drive) keep working as before.
- **Size limit:** the bucket uses the project's upload limit, which is 50 MB on the free plan. That is roughly 4–5 minutes at the recorder's 1.5 Mbps. For full classes, raise the limit under **Storage › Settings** on a paid plan. Otherwise the upload fails and the teacher keeps the downloaded file.

## 6. Live video (LiveKit)

The room's audio and video go through LiveKit. The API server issues the tokens (`POST /api/classroom/token`). Set these in `server/.env`, or in the server host's environment:

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=…
LIVEKIT_API_SECRET=…
```

During development, run the API server alongside Vite (`npm --prefix server run dev`). The classroom shows "The live video server isn't reachable" when it isn't running.

## 7. Seed data

The migration seeds the 8 badges, the "AI & Coding Trial [Grade 6-8]" material with 6 activities, and a session on room `50813276` with one fictional student, "Amara". This keeps the old `/classroom/50813276` link working. The seeded session has no tutor, so only admins can run it until you assign one. Delete it once you have real classes.
