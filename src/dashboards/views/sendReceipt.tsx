import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase' // Verified from your tree structure
import type { Tables } from '../../types/database'

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
  const [receipts, setReceipts] = useState<Tables<'receipts'>[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' })

  // Load ledger items instantly on component initialization
  useEffect(() => {
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setReceipts(data || [])
    } catch (err) {
      console.error('Database connection failure:', err.message)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Process transaction: Update Supabase Secure Vault -> Blast Resend Dispatch Engine
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage({ type: '', text: '' })

    try {
      // 1. Log transaction inside Supabase
      const { error: dbError } = await supabase.from('receipts').insert([
        {
          student_name: formData.studentName,
          parent_email: formData.parentEmail,
          plan_name: formData.planName,
          billing_cycle: formData.billingCycle,
          currency: formData.currency,
          amount_paid: Number(formData.amountPaid),
          gateway_method: formData.gatewayMethod,
          transaction_id: formData.transactionId,
          receipt_number: formData.receiptNumber,
        },
      ])

      if (dbError) throw new Error(`Database Error: ${dbError.message}`)

      // 2. Route payload through to express node app
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const apiResult = await response.json()
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
      fetchReceipts()
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const filteredReceipts = receipts.filter(
    (r) =>
      r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()),
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
          <span className="block text-xs font-semibold uppercase text-slate-400">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Receipt Number
                </label>
                <input
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
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Transaction ID
                </label>
                <input
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
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Student Name
              </label>
              <input
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
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Parent Notification Email
              </label>
              <input
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
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Currency
                </label>
                <select
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
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Amount Paid
                </label>
                <input
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
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Curriculum Plan
              </label>
              <input
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
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Billing Cycle
                </label>
                <select
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
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Gateway Method
                </label>
                <select
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
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
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
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Total Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
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
                          {receipt.transaction_id}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {receipt.student_name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block text-xs text-slate-700">
                          {receipt.plan_name}
                        </span>
                        <span className="block text-[11px] font-normal text-slate-400">
                          {receipt.billing_cycle}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {receipt.gateway_method}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {receipt.currency}{' '}
                        {Number(receipt.amount_paid).toLocaleString()}
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
