import { asyncRoute } from '../middleware/asyncRoute'
import express, { type Request, type Response } from 'express'
import { Resend } from 'resend'
import { requireServerEnv } from '../env'
import { rateLimit } from '../middleware/rateLimit'
import { dashboardActor } from '../services/dashboardActor'
import { supabase } from '../supabase'

const router = express.Router()
export const receiptVerificationRoute = express.Router()
const receiptIssuers = new Set(['tutor', 'owner', 'tech_admin'])
const referencePattern = /^[\w.-]{1,80}$/
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const deliveryRetryWindowMs = 23 * 60 * 60_000
const receiptColumns =
  'id, receipt_number, customer_name, transaction_code, payment_method, total_paid, created_at'

function isReceiptInput(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseReceipt(input: unknown) {
  if (!isReceiptInput(input)) return null
  const field = (key: string, max = 120) => {
    const entry = input[key]
    return typeof entry === 'string' && entry.trim().length <= max
      ? entry.trim()
      : ''
  }

  const receiptNumber = field('receiptNumber', 80)
  const parentEmail = field('parentEmail', 254).toLowerCase()
  const currency = field('currency', 3).toUpperCase()
  const amount =
    typeof input.amountPaid === 'number'
      ? String(input.amountPaid)
      : field('amountPaid', 20)
  const amountPaid = /^\d{1,9}(\.\d{1,2})?$/.test(amount) ? Number(amount) : NaN
  const studentName = field('studentName')
  const planName = field('planName')
  const billingCycle = field('billingCycle')
  const gatewayMethod = field('gatewayMethod')
  const transactionId = field('transactionId')

  if (
    !referencePattern.test(receiptNumber) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail) ||
    !/^[A-Z]{3}$/.test(currency) ||
    !Number.isFinite(amountPaid) ||
    amountPaid <= 0 ||
    !studentName ||
    !planName ||
    !billingCycle ||
    !gatewayMethod ||
    !transactionId
  )
    return null
  return {
    receiptNumber,
    parentEmail,
    currency,
    amountPaid,
    studentName,
    planName,
    billingCycle,
    gatewayMethod,
    transactionId,
  }
}

async function issuer(req: Request, res: Response) {
  res.set('Cache-Control', 'private, no-store')
  const actor = await dashboardActor(req)
  if (!actor) res.status(401).json({ error: 'Sign in to access receipts.' })
  else if (!receiptIssuers.has(actor.role))
    res.status(403).json({ error: 'Your role cannot issue receipts.' })
  else return actor
  return null
}

router.get(
  '/api/receipts',
  rateLimit({ limit: 30, windowMs: 60_000 }),
  asyncRoute(async (req, res) => {
    const actor = await issuer(req, res)
    if (!actor) return
    const query =
      actor.role === 'tutor'
        ? supabase
            .from('receipts')
            .select(`${receiptColumns}, dashboard_receipt_deliveries!inner()`)
            .eq('dashboard_receipt_deliveries.issued_by', actor.id)
        : supabase.from('receipts').select(receiptColumns)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    res.json({ receipts: data })
  }),
)

router.post(
  '/api/receipts',
  rateLimit({ limit: 10, windowMs: 60_000 }),
  asyncRoute(async (req, res) => {
    const actor = await issuer(req, res)
    if (!actor) return
    const receipt = parseReceipt(req.body)
    if (!receipt) {
      res.status(400).json({
        error:
          'Enter valid receipt details, including the payment amount and recipient email.',
      })
      return
    }

    const { data: delivery, error } = await supabase
      .rpc('reserve_dashboard_receipt', {
        p_actor: actor.id,
        p_payload: receipt,
      })
      .single<{
        receipt_id: string
        sent_at: string | null
        first_attempt_at: string | null
      }>()
    if (error?.code === '23505') {
      res.status(409).json({
        error:
          'That receipt number is already associated with a different payment.',
      })
      return
    }
    if (error?.code === '42501') {
      res.status(403).json({ error: 'Your role cannot retry this receipt.' })
      return
    }
    if (error || !delivery)
      throw error ?? new Error('Receipt reservation unavailable.')
    if (delivery.sent_at) {
      res.json({ success: true, receiptId: delivery.receipt_id })
      return
    }

    if (
      delivery.first_attempt_at &&
      Date.now() - Date.parse(delivery.first_attempt_at) >=
        deliveryRetryWindowMs
    ) {
      res.status(409).json({
        error:
          'The receipt is saved. Ask an administrator to confirm its email delivery before resending.',
      })
      return
    }

    const resend = new Resend(requireServerEnv('RESEND_API_KEY'))
    const siteUrl = process.env.APP_BASE_URL || 'https://techtalk-hub.com'
    const verification = new URL(`/receipt/${delivery.receipt_id}`, siteUrl)
    const text = [
      `Receipt #${receipt.receiptNumber}`,
      `Student: ${receipt.studentName}`,
      `Plan: ${receipt.planName} (${receipt.billingCycle})`,
      `Amount: ${receipt.currency} ${receipt.amountPaid.toFixed(2)}`,
      `Payment: ${receipt.gatewayMethod} · ${receipt.transactionId}`,
      `Verify this receipt: ${verification.href}`,
    ].join('\n')
    const { error: claimError } = await supabase
      .from('dashboard_receipt_deliveries')
      .update({ first_attempt_at: new Date().toISOString() })
      .eq('receipt_id', delivery.receipt_id)
      .is('first_attempt_at', null)
    if (claimError) throw claimError

    const { error: sendError } = await resend.emails.send(
      {
        from: 'Tech Talk Hub <admin@techtalk-hub.com>',
        to: receipt.parentEmail,
        subject: `Receipt #${receipt.receiptNumber} - Payment Confirmed`,
        text,
      },
      { idempotencyKey: `dashboard-receipt/${delivery.receipt_id}` },
    )

    if (sendError) {
      console.error('Receipt delivery failed:', {
        receiptId: delivery.receipt_id,
        type: sendError.name,
      })
      res.status(502).json({
        error:
          'The receipt is saved. Retry with the same details to send its email.',
      })
      return
    }

    const { error: updateError } = await supabase
      .from('dashboard_receipt_deliveries')
      .update({ sent_at: new Date().toISOString() })
      .eq('receipt_id', delivery.receipt_id)
      .is('sent_at', null)
    if (updateError) throw updateError
    res.status(201).json({ success: true, receiptId: delivery.receipt_id })
  }),
)

receiptVerificationRoute.get(
  '/receipt/:reference',
  rateLimit({ limit: 30, windowMs: 60_000 }),
  asyncRoute<{ reference: string }>(async (req, res) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
    })
    const reference = req.params.reference
    const notFound = () =>
      res.status(404).type('text').send('Receipt could not be verified.')
    if (reference.length > 120 || /\p{Cc}/u.test(reference)) {
      notFound()
      return
    }

    const byId = uuidPattern.test(reference)
      ? await supabase
          .from('dashboard_receipt_deliveries')
          .select('sent_at')
          .eq('receipt_id', reference)
          .maybeSingle()
      : null
    if (byId?.error) throw byId.error
    const { data: delivery, error: deliveryError } = byId?.data
      ? byId
      : await supabase
          .from('dashboard_receipt_deliveries')
          .select('sent_at')
          .eq('receipt_number', reference)
          .maybeSingle()
    if (deliveryError) throw deliveryError
    if (delivery) {
      if (!delivery.sent_at) {
        notFound()
        return
      }
    } else {
      const { data: legacy, error } = await supabase
        .from('receipts')
        .select('id')
        .eq('receipt_number', reference)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!legacy) {
        notFound()
        return
      }
    }
    res.type('text').send('This Tech Talk Hub receipt is verified.')
  }),
)

export default router
