import 'dotenv/config'
import express from 'express'
import type { ErrorRequestHandler } from 'express'
import dashboardPush from './routes/dashboardPush'
import { startReminderScheduler } from './reminderScheduler'
import sendReceiptRoute, {
  receiptVerificationRoute,
} from './routes/sendReceipt'
import sendCurriculumRoute from './routes/sendCurriculum'
import classroomTokenRoute from './routes/classroomToken'
import classroomEndRoute from './routes/classroomEnd'
import cronRemindersRoute from './routes/cronReminders'
import adminUsersRoute from './routes/adminUsers'
import trialInvitesRoute from './routes/trialInvites'
import homeRoute from './routes/home'
import apiDocsRoute from './routes/apiDocs'
import { allowOrigins, DEFAULT_CORS_ORIGINS } from './middleware/cors'
import { supabase } from './supabase'

const app = express()
// When the API sits behind proxies (nginx, a platform router), set TRUST_PROXY
// to their count so rate limits see the client's IP, not the proxy's. Vercel
// puts one proxy in front and sets X-Forwarded-For to the client's IP.
const trustedProxyHops = Number(
  process.env.TRUST_PROXY ?? (process.env.VERCEL ? 1 : 0),
)
if (trustedProxyHops > 0) {
  app.set('trust proxy', trustedProxyHops)
}

// The site's own origins are always allowed; CORS_ORIGINS adds extras.
const extraCorsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)

app.use(allowOrigins([...DEFAULT_CORS_ORIGINS, ...extraCorsOrigins]))

app.use(express.json({ limit: '100kb' }))

// optional attach
app.use((req, res, next) => {
  req.supabase = supabase
  next()
})

// =========================
// ROUTES
// =========================
app.use('/', homeRoute)
app.use(['/docs', '/api/docs'], apiDocsRoute)
app.use('/api/send-receipt', sendReceiptRoute)
app.use('/api/send-receipt', receiptVerificationRoute)
app.use(receiptVerificationRoute)
app.use('/api/send-curriculum', sendCurriculumRoute)
app.use('/api/classroom/token', classroomTokenRoute)
app.use('/api/classroom/end', classroomEndRoute)
app.use('/api/cron/reminders', cronRemindersRoute)
app.use('/api/admin/users', adminUsersRoute)
app.use('/api/trials', trialInvitesRoute)

app.use('/api/push', dashboardPush)

const handleApiError: ErrorRequestHandler = (
  error: unknown,
  req,
  res,
  next,
) => {
  if (res.headersSent) return next(error)
  const status =
    error && typeof error === 'object' && 'status' in error
      ? error.status
      : undefined
  if (status === 400 || status === 413) {
    res.status(status).json({
      error: status === 400 ? 'Invalid request body.' : 'Request is too large.',
    })
    return
  }
  console.error('API request failed:', {
    method: req.method,
    route: req.route?.path,
    code:
      error && typeof error === 'object' && 'code' in error
        ? error.code
        : undefined,
  })
  res
    .status(500)
    .json({ error: 'The request could not be completed. Try again.' })
}
app.use(handleApiError)

// =========================
// START SERVER
// =========================
// On Vercel the app runs as a function: Vercel calls the default export, and
// SMS reminders come from a scheduler hitting /api/cron/reminders. Anywhere
// else (local dev, a VPS) it's a normal long-running server.
if (!process.env.VERCEL) {
  startReminderScheduler()

  const PORT = Number(process.env.PORT ?? 5000)
  app.listen(PORT, () => {
    process.stdout.write(`Server running on port ${PORT}
`)
  })
}

export default app
// const express = require("express");
// const WebPush = require("web-push");
// const { createClient } = require("@supabase/supabase-js");
// require("dotenv").config();

// const sendReceiptRoute = require("./routes/sendReceipt");

// const app = express();

// app.use(express.json());

// // =========================
// // SUPABASE (FIXED - disables realtime crash)
// // =========================
// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY,
//   {
//     realtime: {
//       enabled: false,
//     },
//   }
// );

// // attach supabase to requests (optional but clean)
// app.use((req, res, next) => {
//   req.supabase = supabase;
//   next();
// });

// // =========================
// // ROUTES
// // =========================
// app.use("/api/send-receipt", sendReceiptRoute);

// // =========================
// // PUSH SETUP
// // =========================
// WebPush.setVapidDetails(
//   "mailto:admin@techtalk-hub.com",
//   process.env.VAPID_PUBLIC_KEY,
//   process.env.VAPID_PRIVATE_KEY
// );

// // =========================
// // PUSH ENDPOINT
// // =========================
// app.post("/api/push", async (req, res) => {
//   try {
//     const { tutor_id, title, body } = req.body;

//     const { data: user, error } = await supabase
//       .from("users")
//       .select("push_subscription")
//       .eq("id", tutor_id)
//       .single();

//     if (error || !user?.push_subscription) {
//       return res.status(404).json({ error: "No subscription found" });
//     }

//     await WebPush.sendNotification(
//       JSON.parse(user.push_subscription),
//       JSON.stringify({
//         title,
//         body,
//         url: "/calendar",
//       })
//     );

//     return res.json({ success: true });
//   } catch (err) {
//     console.error("Push error:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// // =========================
// // START SERVER
// // =========================
// const PORT = 5000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
// // const express = require("express");
// // const WebPush = require("web-push");
// // const { createClient } = require("@supabase/supabase-js");
// // require("dotenv").config();

// // const sendReceiptRoute = require("./routes/sendReceipt");

// // const app = express();

// // app.use(express.json());

// // // =========================
// // // SUPABASE (FIXED - no realtime crash)
// // // =========================
// // const supabase = createClient(
// //   process.env.SUPABASE_URL,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY
// // );

// // // attach to request so routes can use it
// // app.use((req, res, next) => {
// //   req.supabase = supabase;
// //   next();
// // });

// // // =========================
// // // ROUTES
// // // =========================
// // app.use("/api/send-receipt", sendReceiptRoute);

// // // =========================
// // // PUSH SETUP
// // // =========================
// // WebPush.setVapidDetails(
// //   "mailto:admin@techtalk-hub.com",
// //   process.env.VAPID_PUBLIC_KEY,
// //   process.env.VAPID_PRIVATE_KEY
// // );

// // app.post("/api/push", async (req, res) => {
// //   try {
// //     const { tutor_id, title, body } = req.body;

// //     const { data: user, error } = await supabase
// //       .from("users")
// //       .select("push_subscription")
// //       .eq("id", tutor_id)
// //       .single();

// //     if (error || !user?.push_subscription) {
// //       return res.status(404).json({ error: "No subscription found" });
// //     }

// //     await WebPush.sendNotification(
// //       JSON.parse(user.push_subscription),
// //       JSON.stringify({
// //         title,
// //         body,
// //         url: "/calendar",
// //       })
// //     );

// //     res.json({ success: true });
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ error: err.message });
// //   }
// // });

// // // =========================
// // // START SERVER
// // // =========================
// // app.listen(5000, () => {
// //   console.log("Server running on port 5000");
// // });
