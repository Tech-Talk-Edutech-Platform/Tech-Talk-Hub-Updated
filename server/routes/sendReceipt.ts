import express, { type Request, type Response } from 'express'
import { Resend } from 'resend'
import { requireServerEnv } from '../env'
import { supabase } from '../supabase'
// Import your configured supabase client here
// const supabase = require("../config/supabaseClient");

const router = express.Router()
const resend = new Resend(requireServerEnv('RESEND_API_KEY'))

const BASE_URL = process.env.APP_BASE_URL || 'https://techtalk-hub.com'

interface ReceiptVerificationData {
  receiptNumber: string
  studentName: string
  planName: string
  billingCycle: string
  currency: string
  amountPaid: number | string
  gatewayMethod: string
  transactionId: string
  verifiedAt: string
}

// =========================================================================
// 1. API ENDPOINT: SENDS EMAIL WITH INTEGRATED QR CODE
// =========================================================================
interface ReceiptRequestBody {
  studentName: string
  parentEmail: string
  planName: string
  billingCycle: string
  currency: string
  amountPaid: number | string
  gatewayMethod: string
  transactionId: string
  receiptNumber: string
}

async function sendReceiptEmail(
  req: Request<Record<string, string>, unknown, ReceiptRequestBody>,
  res: Response,
) {
  try {
    const {
      studentName,
      parentEmail,
      planName,
      billingCycle,
      currency,
      amountPaid,
      gatewayMethod,
      transactionId,
      receiptNumber,
    } = req.body

    const verificationUrl = `${BASE_URL}/receipt/${encodeURIComponent(receiptNumber)}`

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">

      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <tr>
          <td style="vertical-align:middle;">
            <h1 style="margin:0;color:#111827;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Tech Talk Hub</h1>
            <p style="margin:4px 0 0 0;color:#6b7280;font-size:13px;">Payment Receipt Confirmation</p>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;display:block;margin-bottom:2px;">Receipt Number</span>
            <span style="font-size:15px;color:#111827;font-weight:700;">#${receiptNumber}</span>
          </td>
        </tr>
      </table>

      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Student</td>
          <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${studentName}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Plan</td>
          <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${planName}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Billing Cycle</td>
          <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${billingCycle}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Payment Method</td>
          <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${gatewayMethod}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Transaction ID</td>
          <td style="text-align:right;font-family:monospace;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${transactionId}</td>
        </tr>
      </table>

      <div style="padding:16px;background:#f8fafc;border-radius:10px;text-align:right;border:1px solid #e2e8f0;margin-bottom:28px;">
        <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Total Paid</p>
        <h2 style="margin:4px 0 0 0;color:#111827;font-size:26px;font-weight:800;">
          ${currency} ${Number(amountPaid).toLocaleString()}
        </h2>
      </div>

      <div style="text-align:center;margin-top:24px;margin-bottom:16px;">
        <img 
          src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verificationUrl)}"
          width="100"
          height="100"
          alt="Verification QR Code"
          style="display:inline-block;border:1px solid #e5e7eb;padding:4px;border-radius:6px;background:#ffffff;"
        />
        <p style="font-size:11px;color:#9ca3af;margin:6px 0 0 0;">
          Scan to verify official receipt status
        </p>
      </div>

      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          Thank you for learning with Tech Talk Hub 🚀
        </p>
      </div>

    </div>
    `

    const data = await resend.emails.send({
      from: 'Tech Talk Hub <admin@techtalk-hub.com>',
      to: [parentEmail],
      subject: `Receipt #${receiptNumber} - Payment Confirmed`,
      html,
    })

    return res.json({ success: true, data })
  } catch (err) {
    console.error('Email API Processing Error:', err)
    return res
      .status(500)
      .json({ success: false, error: 'Internal Server Error' })
  }
}

router.post('/api/receipts', (req, res) => {
  void sendReceiptEmail(req, res)
})

// =========================================================================
// 2. WEB ROUTE: THE LIVE PAGE ACCESSED BY SCANNING THE QR CODE (SUPABASE)
// =========================================================================
async function showReceipt(
  req: Request<{ receiptNumber: string }>,
  res: Response,
) {
  try {
    const { receiptNumber } = req.params

    // Fetch live record from Supabase matching the receipt number
    const { data, error } = await supabase
      .from('receipts') // Rename to match your table name (e.g., 'payments' or 'receipts')
      .select('*')
      .eq('receipt_number', receiptNumber) // Ensure this column name matches your schema
      .single()

    // If receipt doesn't exist or a database error occurs, block the UI cleanly
    const payment: {
      receipt_number: string
      student_name: string
      plan_name: string
      billing_cycle: string
      currency: string | null
      amount_paid: number | string
      gateway_method: string
      transaction_id: string
    } | null = data

    if (error || !payment) {
      return res.status(404).send(`
        <div style="font-family:sans-serif; text-align:center; padding:50px; color:#374151;">
          <h2>Invalid Receipt Reference</h2>
          <p>This receipt record could not be verified or found in our secure ledger database.</p>
        </div>
      `)
    }

    // Format verification timestamp dynamically using East Africa Time (Nairobi)
    const verifiedAtStr = new Date().toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Nairobi',
    })

    // Remap Supabase database columns down into the UI template generator
    const templateData = {
      receiptNumber: payment.receipt_number,
      studentName: payment.student_name,
      planName: payment.plan_name,
      billingCycle: payment.billing_cycle,
      currency: payment.currency || 'KES',
      amountPaid: payment.amount_paid,
      gatewayMethod: payment.gateway_method,
      transactionId: payment.transaction_id,
      verifiedAt: verifiedAtStr,
    }

    return res.send(generateVerificationPage(templateData))
  } catch (err) {
    console.error('QR Verification System Failure:', err)
    return res
      .status(500)
      .send('Verification system offline. Please try again later.')
  }
}

router.get('/receipt/:receiptNumber', (req, res) => {
  void showReceipt(req, res)
})

// =========================================================================
// 3. UI GENERATOR: COMPILES SMARTPHONE OPTIMIZED HTML VIEW
// =========================================================================
function generateVerificationPage(data: ReceiptVerificationData): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Receipt #${data.receiptNumber}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-50 font-sans min-h-screen flex flex-col justify-between antialiased">

    <main class="max-w-md w-full mx-auto px-4 py-8">
      
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Tech Talk Hub</h1>
        <p class="text-xs text-slate-500 uppercase tracking-widest mt-1">Official Secure Registry</p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative">
        
        <div class="flex items-center justify-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-full py-2 px-4 mx-auto w-fit mb-6">
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
          <span class="text-sm font-bold text-emerald-800 tracking-wide uppercase">Verified Authentic</span>
        </div>

        <div class="text-center border-b border-slate-100 pb-5 mb-5">
          <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Amount Documented</p>
          <h2 class="text-3xl font-extrabold text-slate-900 mt-1">
            ${data.currency} ${Number(data.amountPaid).toLocaleString()}
          </h2>
          <p class="text-sm text-slate-500 mt-2">
            Receipt <span class="font-mono font-bold text-slate-800">#${data.receiptNumber}</span>
          </p>
        </div>

        <div class="space-y-4 text-sm">
          <div class="flex justify-between items-start">
            <span class="text-slate-400 font-medium">Student</span>
            <span class="text-slate-900 font-semibold text-right">${data.studentName}</span>
          </div>
          
          <div class="flex justify-between items-start">
            <span class="text-slate-400 font-medium">Plan Description</span>
            <span class="text-slate-900 font-semibold text-right">${data.planName}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-400 font-medium">Billing Cycle</span>
            <span class="text-slate-900 font-semibold">${data.billingCycle}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-400 font-medium">Payment Channel</span>
            <span class="text-slate-900 font-semibold">${data.gatewayMethod}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-400 font-medium">Transaction Reference</span>
            <span class="text-slate-800 font-mono text-xs bg-slate-50 border border-slate-100 px-2 py-1 rounded">${data.transactionId}</span>
          </div>

          <div class="flex justify-between items-start border-t border-dashed border-slate-200 pt-4 mt-2">
            <span class="text-slate-400 font-medium">Database Verification Time</span>
            <span class="text-slate-500 text-xs text-right font-medium">${data.verifiedAt}</span>
          </div>
        </div>

      </div>

      <div class="mt-6 text-center">
        <p class="text-xs text-slate-400">
          This digital ledger entry was locked upon system capture. If verification discrepancies occur, flag them to system administrators immediately.
        </p>
      </div>

    </main>

    <footer class="py-6 text-center text-xs text-slate-400 border-t border-slate-100 bg-white">
      &copy; ${new Date().getFullYear()} Tech Talk Hub. Secured Data Vault.
    </footer>

  </body>
  </html>
  `
}

export default router
// const express = require("express");
// const { Resend } = require("resend");

// const router = express.Router();
// const resend = new Resend(process.env.RESEND_API_KEY);

// router.post("/", async (req, res) => {
//   try {
//     const {
//       studentName,
//       parentEmail,
//       planName,
//       billingCycle,
//       currency,
//       amountPaid,
//       gatewayMethod,
//       transactionId,
//       receiptNumber,
//     } = req.body;

//     const verificationUrl = `https://yourdomain.com/receipt/${receiptNumber}`;

//     const html = `
//     <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">

//       <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
//         <tr>
//           <td style="vertical-align:middle;">
//             <h1 style="margin:0;color:#111827;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Tech Talk Hub</h1>
//             <p style="margin:4px 0 0 0;color:#6b7280;font-size:13px;">Payment Receipt Confirmation</p>
//           </td>
//           <td style="text-align:right;vertical-align:middle;">
//             <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;display:block;margin-bottom:2px;">Receipt Number</span>
//             <span style="font-size:15px;color:#111827;font-weight:700;">#${receiptNumber}</span>
//           </td>
//         </tr>
//       </table>

//       <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:24px;">
//         <tr>
//           <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Student</td>
//           <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${studentName}</td>
//         </tr>
//         <tr>
//           <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Plan</td>
//           <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${planName}</td>
//         </tr>
//         <tr>
//           <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Billing Cycle</td>
//           <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${billingCycle}</td>
//         </tr>
//         <tr>
//           <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Payment Method</td>
//           <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${gatewayMethod}</td>
//         </tr>
//         <tr>
//           <td style="padding:12px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Transaction ID</td>
//           <td style="text-align:right;font-family:monospace;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${transactionId}</td>
//         </tr>
//       </table>

//       <div style="padding:16px;background:#f8fafc;border-radius:10px;text-align:right;border:1px solid #e2e8f0;margin-bottom:28px;">
//         <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Total Paid</p>
//         <h2 style="margin:4px 0 0 0;color:#111827;font-size:26px;font-weight:800;">
//           ${currency} ${Number(amountPaid).toLocaleString()}
//         </h2>
//       </div>

//       <div style="text-align:center;margin-top:24px;margin-bottom:16px;">
//         <img
//           src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verificationUrl)}"
//           width="100"
//           height="100"
//           alt="Verification QR Code"
//           style="display:inline-block;border:1px solid #e5e7eb;padding:4px;border-radius:6px;background:#ffffff;"
//         />
//         <p style="font-size:11px;color:#9ca3af;margin:8px 0 0 0;">
//           Scan to verify official receipt status
//         </p>
//       </div>

//       <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
//         <p style="color:#9ca3af;font-size:12px;margin:0;">
//           Thank you for learning with Tech Talk Hub 🚀
//         </p>
//       </div>

//     </div>
//     `;

//     // Send email using Resend
//     const data = await resend.emails.send({
//       from: "Tech Talk Hub <admin@techtalk-hub.com>",
//       to: [parentEmail],
//       subject: `Receipt #${receiptNumber} - Payment Confirmed`,
//       html,
//     });

//     return res.json({ success: true, data });

//   } catch (err) {
//     console.error("Email sending error:", err);
//     return res.status(500).json({ success: false, error: err.message });
//   }
// });

// module.exports = router;
// // const express = require("express");
// // const { Resend } = require("resend");

// // const router = express.Router();
// // const resend = new Resend(process.env.RESEND_API_KEY);

// // router.post("/", async (req, res) => {
// //   try {
// //     const {
// //       studentName,
// //       parentEmail,
// //       planName,
// //       billingCycle,
// //       currency,
// //       amountPaid,
// //       gatewayMethod,
// //       transactionId,
// //       receiptNumber,
// //     } = req.body;

// //     const verificationUrl = `https://yourdomain.com/receipt/${receiptNumber}`;

// //     const html = `
// //     <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;position:relative;overflow:hidden;">

// //       <div style="position:absolute;top:45%;left:50%;transform:translate(-50%, -50%) rotate(-25deg);font-size:120px;font-weight:900;color:#16a34a;opacity:0.04;letter-spacing:6px;z-index:0;user-select:none;pointer-events:none;white-space:nowrap;">
// //         PAID
// //       </div>

// //       <div style="position:relative;z-index:1;">

// //         <div style="text-align:center;margin-bottom:20px;">
// //           <h1 style="margin:0;color:#111827;font-size:26px;font-weight:700;">Tech Talk Hub</h1>
// //           <p style="margin:4px 0;color:#6b7280;font-size:13px;">Payment Receipt Confirmation</p>
// //         </div>

// //         <div style="background:#f9fafb;padding:12px 16px;border-radius:10px;margin-bottom:16px;border:1px solid #f3f4f6;">
// //           <p style="margin:0;font-size:14px;color:#374151;">
// //             Receipt #: <b style="color:#111827;">${receiptNumber}</b>
// //           </p>
// //         </div>

// //         <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:16px;background:transparent;">
// //           <tr>
// //             <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Student</td>
// //             <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${studentName}</td>
// //           </tr>
// //           <tr>
// //             <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Plan</td>
// //             <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${planName}</td>
// //           </tr>
// //           <tr>
// //             <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Billing Cycle</td>
// //             <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${billingCycle}</td>
// //           </tr>
// //           <tr>
// //             <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Payment Method</td>
// //             <td style="text-align:right;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${gatewayMethod}</td>
// //           </tr>
// //           <tr>
// //             <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Transaction ID</td>
// //             <td style="text-align:right;font-family:monospace;color:#374151;border-bottom:1px solid #f3f4f6;">${transactionId}</td>
// //           </tr>
// //         </table>

// //         <div style="padding:12px;background:#f8fafc;border-radius:10px;text-align:right;border:1px solid #e2e8f0;margin-bottom:20px;">
// //           <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Total Paid</p>
// //           <h2 style="margin:2px 0 0 0;color:#111827;font-size:26px;font-weight:800;">
// //             ${currency} ${Number(amountPaid).toLocaleString()}
// //           </h2>
// //         </div>

// //         <div style="text-align:center;margin-top:20px;margin-bottom:10px;">
// //           <img
// //             src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verificationUrl)}"
// //             width="100"
// //             height="100"
// //             alt="Verification QR Code"
// //             style="display:inline-block;border:1px solid #e5e7eb;padding:4px;border-radius:6px;background:#ffffff;"
// //           />
// //           <p style="font-size:11px;color:#9ca3af;margin:6px 0 0 0;">
// //             Scan to verify official receipt status
// //           </p>
// //         </div>

// //         <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center;">
// //           <p style="color:#9ca3af;font-size:12px;margin:0;">
// //             Thank you for learning with Tech Talk Hub 🚀
// //           </p>
// //         </div>

// //       </div>
// //     </div>
// //     `;

// //     // Send email using Resend
// //     const data = await resend.emails.send({
// //       from: "Tech Talk Hub <admin@techtalk-hub.com>",
// //       to: [parentEmail],
// //       subject: `Receipt #${receiptNumber} - Payment Confirmed`,
// //       html,
// //     });

// //     return res.json({ success: true, data });

// //   } catch (err) {
// //     console.error("Email sending error:", err);
// //     return res.status(500).json({ success: false, error: err.message });
// //   }
// // });

// // module.exports = router;
