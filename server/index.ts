import "dotenv/config";
import express, { type Request, type Response } from "express";
import WebPush from "web-push";
import "./SMSServer";
import sendReceiptRoute from "./routes/sendReceipt";
import { requireServerEnv } from "./env";
import { supabase } from "./supabase";

interface PushNotificationBody {
  tutor_id: string;
  title: string;
  body: string;
}

const app = express();
app.use(express.json());

// optional attach
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// =========================
// ROUTES
// =========================
app.use("/api/send-receipt", sendReceiptRoute);

// =========================
// PUSH SETUP
// =========================
WebPush.setVapidDetails(
  "mailto:admin@techtalk-hub.com",
  requireServerEnv("VAPID_PUBLIC_KEY"),
  requireServerEnv("VAPID_PRIVATE_KEY")
);

// =========================
// PUSH ROUTE
// =========================
app.post("/api/push", async (req: Request<Record<string, string>, unknown, PushNotificationBody>, res: Response) => {
  try {
    const { tutor_id, title, body } = req.body;

    const { data, error } = await supabase
      .from("users")
      .select("push_subscription")
      .eq("id", tutor_id)
      .single();

    const user: { push_subscription: string | null } | null = data;

    if (error || !user?.push_subscription) {
      return res.status(404).json({ error: "No subscription found" });
    }

    await WebPush.sendNotification(
      JSON.parse(user.push_subscription),
      JSON.stringify({
        title,
        body,
        url: "/calendar",
      })
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error" });
  }
});

// =========================
// START SERVER
// =========================
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
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
