// import express from "express";
// import bodyParser from "body-parser";
// import WebPush from "web-push";

// const app = express();
// app.use(bodyParser.json());

// WebPush.setVapidDetails(
//   "mailto:admin@techtalk-hub.com",
//   process.env.VAPID_PUBLIC_KEY!,
//   process.env.VAPID_PRIVATE_KEY!
// );

// app.post("/push", async (req, res) => {
//   const { tutor_id, title, body } = req.body;
//   // fetch subscription from Supabase
//   // send notification
// });

// app.listen(3000, () => console.log("Server running on port 3000"));
// // // server.ts
// // import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
// // import WebPush from "https://esm.sh/web-push@3.4.5";
// // import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// // // --- Supabase setup ---
// // const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// // const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service role key for backend
// // const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// // // --- VAPID setup ---
// // const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
// // const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

// // WebPush.setVapidDetails(
// //   "mailto:admin@techtalk-hub.com",
// //   VAPID_PUBLIC_KEY,
// //   VAPID_PRIVATE_KEY
// // );

// // console.log("Push server running...");

// // serve(async (req) => {
// //   try {
// //     const { tutor_id, title, body } = await req.json();

// //     // 1. Fetch the subscription from 'users'
// //     const { data: user, error } = await supabase
// //       .from("users")
// //       .select("push_subscription")
// //       .eq("id", tutor_id)
// //       .single();

// //     if (error || !user?.push_subscription) {
// //       return new Response(
// //         JSON.stringify({ error: "No subscription found" }),
// //         { status: 404 }
// //       );
// //     }

// //     // 2. Send push notification
// //     await WebPush.sendNotification(
// //       JSON.parse(user.push_subscription),
// //       JSON.stringify({ title, body, url: "/calendar" })
// //     );

// //     return new Response(JSON.stringify({ success: true }), { status: 200 });
// //   } catch (err) {
// //     console.error("Push error:", err);
// //     return new Response(JSON.stringify({ error: err.message }), { status: 500 });
// //   }
// // });
// // // import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
// // // import WebPush from "https://esm.sh/web-push"

// // // const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
// // // const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

// // // WebPush.setVapidDetails(
// // //   'mailto:admin@techtalk-hub.com',
// // //   VAPID_PUBLIC_KEY,
// // //   VAPID_PRIVATE_KEY
// // // );

// // // serve(async (req) => {
// // //   const { tutor_id, title, body } = await req.json();

// // //   // 1. Fetch the subscription from your 'users' table
// // //   // (Using a service role client here to bypass RLS for the backend)
// // //   const { data: user } = await supabase
// // //     .from('users')
// // //     .select('push_subscription')
// // //     .eq('id', tutor_id)
// // //     .single();

// // //   if (!user?.push_subscription) {
// // //     return new Response("No subscription found", { status: 404 });
// // //   }

// // //   // 2. Send the Push
// // //   try {
// // //     await WebPush.sendNotification(
// // //       JSON.parse(user.push_subscription),
// // //       JSON.stringify({ title, body, url: '/calendar' })
// // //     );
// // //     return new Response(JSON.stringify({ success: true }), { status: 200 });
// // //   } catch (error) {
// // //     return new Response(JSON.stringify({ error: error.message }), { status: 500 });
// // //   }
// // // })