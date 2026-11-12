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
| `scheduled_at`, `duration_minutes`          |                                 | When the class starts and how long it runs (5–600 minutes). Together they set the join window (see 4).                |
| `status`                                    | text                            | `scheduled` → `live` (teacher opened the room) → `completed` or `not_completed` (End class). Can also be `cancelled`. |
| `started_at`, `ended_at`, `elapsed_seconds` |                                 | Set by the classroom. `started_at` is the first join; the API server sets it when it issues the first video token.    |
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

|                                      | Admins (owner, operations_admin, tech_admin) | Tutors                                                                                                                                           | Students                                       | Not signed in                                                                                          |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Materials, activities                | read, write                                  | read                                                                                                                                             | –                                              | –                                                                                                      |
| Badges                               | read, write                                  | read                                                                                                                                             | read                                           | read (catalogue only)                                                                                  |
| Sessions                             | everything                                   | read and update their own (`tutor_id`)                                                                                                           | read the ones they're booked into              | `classroom_public_info(room_code)` returns only the title, status and class times, for the join screen |
| Roster                               | everything                                   | read their sessions; update attendance; invite their own students (`assigned_tutor_id`); withdraw an invite while the class is still `scheduled` | read their own row; `classroom_my_invites()`   | –                                                                                                      |
| `users.badges`                       | read, write                                  | read (per the `users` policies)                                                                                                                  | read their own; can't edit                     | –                                                                                                      |
| Awards, projects                     | everything                                   | add and delete in their sessions                                                                                                                 | read their own                                 | –                                                                                                      |
| Alerts                               | read, resolve                                | send in their sessions, read                                                                                                                     | –                                              | –                                                                                                      |
| Recordings bucket `class-recordings` | upload, read, delete                         | upload, read                                                                                                                                     | read recordings filed under their `student_id` | –                                                                                                      |

Children's contact details (phone, email, city) are only readable by admins and the session's tutor. The End class attendance list shows each student's grade, not their phone number.

## 4. Running a class

1. **Dashboard › Classroom › Lesson materials**: create the material (outcomes, agenda, links, activities), or edit the seeded one.
2. **Dashboard › Classroom › Classes › New class**: set the title, tutor, material, start time and length. A room code is generated for you.
3. **Students in this class › Add student**: pick a registered student or a trial lead to fill in the details, then add the time zone and any special requirement.
4. Share the links:
   - **Open classroom** or **Teacher link**: `/classroom/<room code>`. Staff who are signed in get the teacher view: badges, projects, alerts, End class and recording.
   - **Student link**: `/classroom/<room code>?join=1`. This always opens the attendee view (chat, reactions, raise hand, Leave). Guests type their name first.
5. Tutors find their assigned classes under **Dashboard › My Classrooms**. There they can start a call and **Invite students** (when creating it, or on any upcoming class). Tutors only see, and can only invite, the students assigned to them in **Users & Staff**. An invite is a roster row with `student_id` set, so invited students can be given badges and projects in the room. Open rooms pick up new invites within 30 seconds.
6. Invited students see the class under **Dashboard › My Classroom** (and on their home dashboard while it's open) and press **Join class**.
7. After class, the session's **Class activity** card shows the End class report, badges, projects, alerts (with **Mark resolved**) and recordings. Classes that didn't happen show their reason in the class lists.

### Class times: when a class can be joined

Every call has a start time (`scheduled_at`) and a length (`duration_minutes`). Tutors set both when they start a call in **My Classrooms**.

| When                                  | What happens                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| More than 15 minutes before the start | Nobody can join. The room page says when it opens and lets people in by itself at that time. Students see **Opens at …** instead of Join.                                                                                                                           |
| From 15 minutes before until the end  | Anyone with access can join. The first join sets `started_at`.                                                                                                                                                                                                      |
| After the end, and nobody ever joined | **Expired.** The link is revoked for everyone, hosts included, and the class shows **Expired** in the lists. Start a new call, or an admin gives the class a new start time.                                                                                        |
| After the end, and someone joined     | **Overtime.** Nobody is cut off. People can still join while the call is running, and everyone gets a one-time "past its end time" notice. Once everyone has left (LiveKit closes an empty room after 5 minutes), only the host can get back in, to file End class. |

A class with no start time is always open; one with no length never expires.

The API server enforces these rules before it issues a video token (`server/services/classroomAccess.ts`). The browser uses the same rules (`src/lib/classroom/schedule.ts`) for its messages; keep the two in step. Migration `20261112140000_classroom_schedule.sql` adds the times to `classroom_public_info()` and `classroom_my_invites()`.

Admins can reopen an ended class. If its time has passed, the reopened class starts now for the same length. Giving a class a new start time in the class form also clears `started_at`, so the new slot expires again if nobody comes.

### Student badges (`users.badges`)

Migration `20261112120000_classroom_invites_badges.sql` adds `users.badges`, a JSON array of the badges a student was given in class:

```json
[
  {
    "award_id": "…",
    "badge_id": "…",
    "slug": "star-performer",
    "name": "Star performer",
    "icon": "star",
    "ornament": "wreath",
    "session_id": "…",
    "class_title": "Scratch games",
    "awarded_at": "…"
  }
]
```

A trigger on `classroom_badge_awards` appends an entry when a badge is given to a registered student and removes it on Undo. Signed-in users other than admins can't write the column. The student dashboard shows these under **My badges**.

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
