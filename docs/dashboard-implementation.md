# Dashboard implementation plan

Baseline reviewed against repository revision `3c3ca1f`. The Vite frontend and
Express API share a Supabase project. Browser sessions use local storage and
several legacy workflows query Supabase directly. LiveKit handles classroom
calls. Recharts already covers the sales trend and conversion charts.

| Order | Change                                                                | Acceptance criteria                                                                                                                                                                                                                                                                            |
| ----- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Render role dashboards on the server and hydrate them in the browser. | A hard refresh with a verified session returns role-specific navigation. Anonymous visitors and role mismatches get the access check. Keep private responses out of shared caches and let the browser load dashboard records after authorization.                                              |
| 2     | Harden manual receipts and assessment writes.                         | Receipt issuance checks staff permissions. A retry uses the same receipt, an email failure stays retryable, and public verification shows no student or payment details. Students send answer choices only. The database calculates and records the score before the UI reports success.       |
| 3     | Connect tutor notifications in the dashboard.                         | Tutors can opt in to browser push and admins see the result returned by the push service.                                                                                                                                                                                                      |
| 4     | Render selected dashboard summaries and protect parent sharing.       | Fetch summaries under the caller’s own database permissions. Plan public report and classroom changes separately, including roster checks and expiring invitations.                                                                                                                            |
| 5     | Join the verified payment, enrollment and reminder workflows.         | An authenticated provider webhook records each payment once, issues a receipt, grants the purchased enrollment, sends a welcome message and credits the relevant sale. Move reminders to the authoritative schedule and store delivery state so retries neither lose nor duplicate a reminder. |

Changes 1–3 are implemented in this branch. While a role dashboard is open,
the browser mirrors its short-lived Supabase access token into a secure,
HttpOnly cookie. On a direct
request for a role home, the server confirms the token and reads the actor’s
role using that actor’s permissions. It returns the matching dashboard
navigation and a loading state. The existing browser sign-in, role gate and
data fetches finish loading the dashboard. The renderer matches role home
and dashboard tool paths. Apply the receipt and quiz migrations before
deploying the updated application. The quiz migration switches assessment
submissions to RPCs and requires the updated student client for new attempts.
Legacy scores remain readable.

### Hardening applied in this branch

- Receipt verification accepts the opaque receipt ID and, for QR codes sent
  before it, the receipt number. A number whose new reservation has not been
  emailed yet does not verify.
- `20261119140000_lock_receipt_writes.sql` revokes direct `receipts` writes
  from browser roles. Reads are unchanged.
- Tutor push subscriptions are stored as JSON objects. Rows saved as strings
  still work. Edge (Windows Push Notification Services) endpoints are
  accepted. Tutor settings show the current notification state.
- Notification clicks focus an open tab on the target page before opening a
  new one.
- Signing out from any page clears the dashboard session cookie.
- The SSR test fails if the `vercel.json` dashboard rewrite and the renderer's
  path list differ.

### Open decisions and remaining work

| Item                                                                  | Status                                                                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Preview deployment smoke test of `/student` and `/_dashboard-session` | Required before promotion                                                                                           |
| Receipt issuers                                                       | Tutors, owners and tech admins. Decide whether operations admins can issue receipts and whether tutors still should |
| Dashboard views in the URL (`/:role/:view`)                           | Planned with change 4                                                                                               |
| Changes 4 and 5                                                       | Not started                                                                                                         |

Deploy order: apply the receipt, quiz and receipt-lock migrations, then the
application.

## Running and verification

Use Node 22. Run `npm run dev` for the SSR development server or
`npm run build:vercel` followed by `npm run preview` for the production assets
and renderer. Run `npm run test:dashboard-ssr` after building with the Supabase
environment variables set. The test mocks Supabase requests. Express starts
separately using the existing `server/` configuration. Vercel routes dashboard
pages to the frontend render function, `/api/*` to Express, and `/studio` to
Sanity. The Vercel deployment needs a preview smoke test before promotion.

Configure the existing Resend and Supabase server credentials for manual
receipts, and set `APP_BASE_URL` to the public site origin used for verification.
Tutor push is available when the Express service has both VAPID keys and the
tutor opts in on a supported browser. React ApexCharts is optional for a future
chart with a clear product need. This rollout uses the charting library already
in the project.
