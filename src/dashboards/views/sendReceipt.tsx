import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '../../supabase' // Verified from your tree structure
import type { Tables } from '../../types/database'
import { apiUrl } from '../../lib/apiUrl'
import { getErrorMessage } from '../../lib/getErrorMessage'

type Receipt = Tables<'receipts'>

interface ReceiptApiResult {
  success?: boolean
  error?: string
}

async function loadReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export default function AdminDashboard() {
  // Form State Layout
  const [formData, setFormData] = useState({
    studentName: '',
    parentEmail: '',
    planName: '1:1 Coding Classes (Premium)',
    billingCycle: 'Monthly',
    currency: 'KES',
    amountPaid: '',
    gatewayMethod: 'M-Pesa',
    transactionId: '',
    receiptNumber: '',
  })

  // Ledger Table & Control States
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' })

  // Load ledger items instantly on component initialization
  useEffect(() => {
    let cancelled = false
    loadReceipts().then(
      (rows) => {
        if (!cancelled) setReceipts(rows)
      },
      (err: unknown) => {
        console.error(
          'Database connection failure:',
          getErrorMessage(err, 'Unknown error'),
        )
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const fetchReceipts = async () => {
    try {
      setReceipts(await loadReceipts())
    } catch (err) {
      console.error(
        'Database connection failure:',
        getErrorMessage(err, 'Unknown error'),
      )
    }
  }

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Process transaction: Update Supabase Secure Vault -> Blast Resend Dispatch Engine
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage({ type: '', text: '' })

    try {
      const amountPaid = Number(formData.amountPaid)

      // 1. Log transaction inside Supabase. The ledger stores the payment
      // itself; plan, billing cycle, currency and parent email only go in the email.
      const { error: dbError } = await supabase.from('receipts').insert([
        {
          receipt_number: formData.receiptNumber,
          customer_name: formData.studentName,
          amount: amountPaid,
          total_paid: amountPaid,
          payment_method: formData.gatewayMethod,
          transaction_code: formData.transactionId,
        },
      ])

      if (dbError) throw new Error(`Database Error: ${dbError.message}`)

      // 2. Route payload through to express node app
      const response = await fetch(apiUrl('/api/send-receipt/api/receipts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const apiResult: ReceiptApiResult = await response.json()
      if (!apiResult.success)
        throw new Error(apiResult.error || 'Failed to dispatch email matrix.')

      // Complete execution cycle success cleanup
      setStatusMessage({
        type: 'success',
        text: `Receipt #${formData.receiptNumber} compiled and locked into ledger!`,
      })
      setFormData({
        ...formData,
        studentName: '',
        parentEmail: '',
        amountPaid: '',
        transactionId: '',
        receiptNumber: '',
      })
      await fetchReceipts()
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: getErrorMessage(err, 'Unable to issue the receipt.'),
      })
    } finally {
      setLoading(false)
    }
  }

  const search = searchTerm.toLowerCase()
  const filteredReceipts = receipts.filter(
    (r) =>
      r.customer_name?.toLowerCase().includes(search) ||
      r.receipt_number?.toLowerCase().includes(search) ||
      r.transaction_code?.toLowerCase().includes(search),
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800 antialiased">
      {/* BILLING DESK HEADER PANEL */}
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Billing Control Room
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Tech Talk Hub Administrative Portal
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-xs">
          <span className="block text-xs font-semibold text-slate-400 uppercase">
            Total Settled Invoices
          </span>
          <span className="text-lg font-bold text-slate-900">
            {receipts.length} Paid
          </span>
        </div>
      </header>

      {/* DYNAMIC FLASH ALERT POPUP */}
      {statusMessage.text && (
        <div
          className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* WORKSPACE CONTENT SPLIT SYSTEM */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* ACTION SIDEBAR PANEL: INVOICING ENGINE */}
        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Issue New Receipt
          </h2>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="receipt-number"
                  className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
                >
                  Receipt Number
                </label>
                <input
                  id="receipt-number"
                  required
                  type="text"
                  name="receiptNumber"
                  value={formData.receiptNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 1042"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-indigo-600"
                />
              </div>
              <div>
                <label
                  htmlFor="receipt-transaction-id"
                  className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
                >
                  Transaction ID
                </label>
                <input
                  id="receipt-transaction-id"
                  required
                  type="text"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleInputChange}
                  placeholder="M-Pesa Ref"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-sm text-slate-900 focus:bg-white focus:outline-indigo-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="receipt-student-name"
                className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
              >
                Student Name
              </label>
              <input
                id="receipt-student-name"
                required
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={handleInputChange}
                placeholder="Full Name"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor="receipt-parent-email"
                className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
              >
                Parent Notification Email
              </label>
              <input
                id="receipt-parent-email"
                required
                type="email"
                name="parentEmail"
                value={formData.parentEmail}
                onChange={handleInputChange}
                placeholder="parent@domain.com"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="receipt-currency"
                  className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
                >
                  Currency
                </label>
                <select
                  id="receipt-currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold text-slate-900 focus:outline-indigo-600"
                >
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="col-span-2">
                <label
                  htmlFor="receipt-amount"
                  className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
                >
                  Amount Paid
                </label>
                <input
                  id="receipt-amount"
                  required
                  type="number"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleInputChange}
                  placeholder="6000"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-indigo-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="receipt-plan"
                className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
              >
                Curriculum Plan
              </label>
              <input
                id="receipt-plan"
                required
                type="text"
                name="planName"
                value={formData.planName}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="receipt-billing-cycle"
                  className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
                >
                  Billing Cycle
                </label>
                <select
                  id="receipt-billing-cycle"
                  name="billingCycle"
                  value={formData.billingCycle}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-900 focus:outline-indigo-600"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Termly">Termly</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="receipt-gateway"
                  className="mb-1 block text-xs font-semibold text-slate-500 uppercase"
                >
                  Gateway Method
                </label>
                <select
                  id="receipt-gateway"
                  name="gatewayMethod"
                  value={formData.gatewayMethod}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-900 focus:outline-indigo-600"
                >
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Card (Stripe)">Card (Stripe)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold tracking-wide text-white uppercase shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Processing Ledger...' : 'Send Receipt via Resend'}
            </button>
          </form>
        </div>

        {/* DATA WORKSPACE GRID: HISTORICAL LEDGER TABLE ARCHIVE */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xs xl:col-span-2">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-bold text-slate-900">
              Paid Receipts Archive
            </h2>
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:bg-white focus:outline-indigo-600 sm:w-72"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Total Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center font-normal text-slate-400"
                    >
                      No database entries matched your query.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="transition hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3.5">
                        <span className="block font-bold text-slate-900">
                          #{receipt.receipt_number}
                        </span>
                        <span className="block max-w-[100px] truncate font-mono text-[11px] text-slate-400">
                          {receipt.transaction_code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {receipt.customer_name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {receipt.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {(receipt.total_paid ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
