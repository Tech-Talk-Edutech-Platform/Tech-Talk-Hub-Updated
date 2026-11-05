import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase"; // Verified from your tree structure

export default function AdminDashboard() {
  // Form State Layout
  const [formData, setFormData] = useState({
    studentName: "",
    parentEmail: "",
    planName: "1:1 Coding Classes (Premium)",
    billingCycle: "Monthly",
    currency: "KES",
    amountPaid: "",
    gatewayMethod: "M-Pesa",
    transactionId: "",
    receiptNumber: "",
  });

  // Ledger Table & Control States
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  // Load ledger items instantly on component initialization
  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (err) {
      console.error("Database connection failure:", err.message);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Process transaction: Update Supabase Secure Vault -> Blast Resend Dispatch Engine
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      // 1. Log transaction inside Supabase
      const { error: dbError } = await supabase.from("receipts").insert([
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
      ]);

      if (dbError) throw new Error(`Database Error: ${dbError.message}`);

      // 2. Route payload through to express node app
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const apiResult = await response.json();
      if (!apiResult.success) throw new Error(apiResult.error || "Failed to dispatch email matrix.");

      // Complete execution cycle success cleanup
      setStatusMessage({ type: "success", text: `Receipt #${formData.receiptNumber} compiled and locked into ledger!` });
      setFormData({
        ...formData,
        studentName: "",
        parentEmail: "",
        amountPaid: "",
        transactionId: "",
        receiptNumber: "",
      });
      fetchReceipts();

    } catch (err) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = receipts.filter((r) =>
    r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans antialiased text-slate-800">
      
      {/* BILLING DESK HEADER PANEL */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing Control Room</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tech Talk Hub Administrative Portal</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-right">
          <span className="text-xs text-slate-400 font-semibold uppercase block">Total Settled Invoices</span>
          <span className="text-lg font-bold text-slate-900">{receipts.length} Paid</span>
        </div>
      </header>

      {/* DYNAMIC FLASH ALERT POPUP */}
      {statusMessage.text && (
        <div className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
          statusMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* WORKSPACE CONTENT SPLIT SYSTEM */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ACTION SIDEBAR PANEL: INVOICING ENGINE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Issue New Receipt</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Receipt Number</label>
                <input required type="text" name="receiptNumber" value={formData.receiptNumber} onChange={handleInputChange} placeholder="e.g. 1042" className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-indigo-600 font-semibold text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction ID</label>
                <input required type="text" name="transactionId" value={formData.transactionId} onChange={handleInputChange} placeholder="M-Pesa Ref" className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-indigo-600 font-mono text-slate-900" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Student Name</label>
              <input required type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} placeholder="Full Name" className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-indigo-600 font-medium text-slate-900" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Parent Notification Email</label>
              <input required type="email" name="parentEmail" value={formData.parentEmail} onChange={handleInputChange} placeholder="parent@domain.com" className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-indigo-600 font-medium text-slate-900" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Currency</label>
                <select name="currency" value={formData.currency} onChange={handleInputChange} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-indigo-600 font-bold text-slate-900">
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount Paid</label>
                <input required type="number" name="amountPaid" value={formData.amountPaid} onChange={handleInputChange} placeholder="6000" className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-indigo-600 font-bold text-slate-900" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Curriculum Plan</label>
              <input required type="text" name="planName" value={formData.planName} onChange={handleInputChange} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-indigo-600 font-medium text-slate-900" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Billing Cycle</label>
                <select name="billingCycle" value={formData.billingCycle} onChange={handleInputChange} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-indigo-600 font-medium text-slate-900">
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Termly">Termly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gateway Method</label>
                <select name="gatewayMethod" value={formData.gatewayMethod} onChange={handleInputChange} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-indigo-600 font-medium text-slate-900">
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Card (Stripe)">Card (Stripe)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50 tracking-wide uppercase">
              {loading ? "Processing Ledger..." : "Send Receipt via Resend"}
            </button>
          </form>
        </div>

        {/* DATA WORKSPACE GRID: HISTORICAL LEDGER TABLE ARCHIVE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 xl:col-span-2 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h2 className="text-lg font-bold text-slate-900">Paid Receipts Archive</h2>
            <input type="text" placeholder="Search entries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 w-full sm:w-72 focus:bg-white focus:outline-indigo-600 font-medium" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Total Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-slate-400 font-normal">No database entries matched your query.</td>
                  </tr>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">#{receipt.receipt_number}</span>
                        <span className="font-mono text-[11px] text-slate-400 block max-w-[100px] truncate">{receipt.transaction_id}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-semibold">{receipt.student_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 block text-xs">{receipt.plan_name}</span>
                        <span className="text-[11px] font-normal text-slate-400 block">{receipt.billing_cycle}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-md font-medium">{receipt.gateway_method}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {receipt.currency} {Number(receipt.amount_paid).toLocaleString()}
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
  );
}