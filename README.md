# Tech Talk Hub Dashboards

The internal operations platform for **Tech Talk Hub**, providing role-based dashboards for administrators, tutors, students, and marketers.

---

## Overview

| Dashboard       | Purpose                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **Admin**       | User management, courses, scheduling, analytics, leads, shop/blog/testimonials, live class monitoring |
| **Tutor**       | Class schedule, student management, course assignments, recordings                                    |
| **Student**     | Course access, homework, exams, grades, support                                                       |
| **Marketer**    | Referral tracking, commission management                                                              |
| **Playgrounds** | Blockly & Scratch coding environments                                                                 |

---

## Tech Stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| **Framework**    | React 18 + Vite                             |
| **Routing**      | React Router v7                             |
| **Styling**      | Tailwind CSS v3                             |
| **Backend**      | Supabase (auth + PostgreSQL)                |
| **Server**       | Express (push notifications, receipts, SMS) |
| **UI Libraries** | FullCalendar, Recharts, Lucide Icons        |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start frontend (Vite)
npm run dev

# Start backend server (localhost:5000)
cd server && npm install && npm run dev

# Build for production
npm run build
```

**Browser environment variables** (create `.env.local`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Run `npm run typecheck` to check TypeScript. The application currently has unresolved strict TypeScript errors; see the Phase Eight section in `docs/typescript-migration-audit.md` before treating the migration as complete. The Express service uses `server/.env` as described by `server/.env.example`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + React Router + Tailwind                         │
├─────────────────────────────────────────────────────────────┤
│  Auth Layer         │  Dashboard Layer    │  Features       │
│  ─────────────────  │  ────────────────── │  ───────────    │
│  • Login            │  • DashboardLayout  │  • Scheduling   │
│  • RoleGate         │  • UnifiedDashboard │  • Assessments  │
│  • Session          │  • Role-based views │  • Commerce     │
└──────────┬──────────┴──────────┬──────────┴────────┬────────┘
           │                     │                   │
           ▼                     ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│  Auth (JWT) │ Database (PostgreSQL) │ Storage │ Realtime    │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER (:5000)                     │
│  Push Notifications │ Receipt Emails │ SMS Service          │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
Dashboards/
├── public/                    # Static assets, Skulpt runtime
├── server/                    # Express backend
│   ├── index.ts               # Server entry (compiled to dist/index.js)
│   ├── routes/                # API handlers
│   └── services/              # Business logic (SMS, etc.)
├── src/
│   ├── App.tsx                # Root + routing
│   ├── supabase.ts            # Supabase client
│   ├── auth/                  # Login, RoleGate
│   ├── dashboards/
│   │   ├── DashboardLayout.tsx # Sidebar navigation
│   │   ├── UnifiedDashboard.tsx
│   │   └── views/             # Role-specific views
│   │       ├── admin/
│   │       ├── student/
│   │       └── tutor/
│   ├── features/              # Feature modules
│   │   ├── accounts/
│   │   ├── assessments/
│   │   ├── commerce/
│   │   ├── exam/
│   │   └── schedule/
│   ├── components/            # Reusable UI
│   └── Utils/                 # Helper functions
├── supabase/                  # Edge Functions
└── tailwind.config.ts
```

| Folder              | Purpose                             |
| ------------------- | ----------------------------------- |
| `auth/`             | Authentication & route guards       |
| `dashboards/views/` | Role-specific dashboard views       |
| `features/`         | Feature modules with business logic |
| `components/`       | Reusable UI primitives              |
| `Utils/`            | Pure helper functions               |

---

## RBAC (Role-Based Access Control)

### Roles

| Role               | Access Level                   |
| ------------------ | ------------------------------ |
| `owner`            | Full platform access           |
| `operations_admin` | Full platform access           |
| `tech_admin`       | Full platform access           |
| `tutor`            | Teaching, scheduling, students |
| `student`          | Courses, exams, grades         |
| `marketer`         | Referrals, commissions         |

### Current Implementation

Route protection via `RoleGate` component:

```jsx
<Route
  path="/admin/*"
  element={
    <RoleGate allowedRoles={['owner', 'operations_admin', 'tech_admin']}>
      <AdminDashboard />
    </RoleGate>
  }
/>
```

**Key files:**

- [`src/auth/RoleGate.tsx`](./src/auth/RoleGate.tsx) — Route-level access control
- [`src/dashboards/DashboardLayout.tsx`](./src/dashboards/DashboardLayout.tsx) — Role-based UI rendering

---

## Design System

Tokens defined in [`tailwind.config.ts`](./tailwind.config.ts):

| Token       | Value                  | Usage                 |
| ----------- | ---------------------- | --------------------- |
| `primary`   | `#3F51B5` (Royal Blue) | Actions, links, brand |
| `secondary` | `#FF4081` (Hot Pink)   | Secondary CTAs        |
| `accent`    | `#00BFA5` (Teal)       | Success, badges       |
| `funPop`    | `#FFEB3B` (Yellow)     | Playful highlights    |

**Font:** Poppins

---

## Key Features

| Feature           | Description                                  |
| ----------------- | -------------------------------------------- |
| **Scheduling**    | FullCalendar integration, real-time updates  |
| **Assessments**   | Exam builder, grading, assignments           |
| **Commerce**      | Sales analytics, leads, referral system      |
| **Playgrounds**   | Blockly & Scratch with Skulpt Python runtime |
| **Notifications** | Web Push via Express server                  |

---

## Database (Supabase)

| Table         | Purpose                |
| ------------- | ---------------------- |
| `users`       | Profiles with roles    |
| `courses`     | Course definitions     |
| `classes`     | Scheduled sessions     |
| `enrollments` | Student-course mapping |
| `exams`       | Exam definitions       |
| `payments`    | Payment records        |
| `leads`       | Sales leads            |

---

## Deployment

| Component | Deploy to                        |
| --------- | -------------------------------- |
| Frontend  | Static hosting (Vercel, Netlify) |
| Server    | Node.js host (port 5000)         |
| Database  | Supabase (managed)               |

---

## Related Projects

| Project                             | Description                     |
| ----------------------------------- | ------------------------------- |
| [`website/`](../website/)           | Public marketing site (Next.js) |
| [`techtalk-app/`](../techtalk-app/) | Mobile app (Flutter)            |
| [`techtalkhub/`](../techtalkhub/)   | Sanity CMS                      |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for code style, performance guidelines, anti-patterns, and the security roadmap.
