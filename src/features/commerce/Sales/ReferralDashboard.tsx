import React, { useState, useEffect } from "react";
import { Users2, Ticket, DollarSign, ArrowUpRight, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "../../../supabase";
import { StatCard } from "../../../components/dashboard/ui/StatCard";
import { toast } from "react-hot-toast";

export default function ReferralDashboard() {
  const [marketers, setMarketers] = useState([]);
  const [attributions, setAttributions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMarketer, setSelectedMarketer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSales: 0, pendingPayouts: 0, activeMarketers: 0 });
const [editingMarketer, setEditingMarketer] = useState(null);
  // Form State
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newRate, setNewRate] = useState(10);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      // Fetch only necessary data
      const [mRes, aRes, uRes] = await Promise.all([
        supabase.from("marketer_profiles").select("*").order("full_name"),
        supabase.from("referral_attributions").select("*, users(full_name)"),
        supabase.from("users").select("id, full_name") .eq("role", "marketer").order("full_name")
      ]);

      setMarketers(mRes.data || []);
      setAttributions(aRes.data || []);
      // setAllUsers(uRes.data || []);
      const marketerIds = (mRes.data || []).map(m => m.id);

setAllUsers(
  (uRes.data || []).filter(
    user => !marketerIds.includes(user.id)
  )
);

      const totalRevenue = (aRes.data || []).reduce((acc, curr) => acc + Number(curr.sale_amount), 0);
      const pendingComm = (aRes.data || []).filter(a => a.status === "approved").reduce((acc, curr) => acc + Number(curr.calculated_commission), 0);

      setStats({
        totalSales: totalRevenue,
        pendingPayouts: pendingComm,
        activeMarketers: (mRes.data || []).length
      });
    } catch (err) {
      toast.error("Data pipeline error.");
    } finally {
      setLoading(false);
    }
  };

  // const generateMarketerCode = async (e) => {
  //   e.preventDefault();
  //   if (!selectedUserId || !newCode) return toast.error("Select user and code.");

  //   const { error } = await supabase.from("marketer_profiles").insert([{
  //     id: selectedUserId,
  //     full_name: allUsers.find(u => u.id === selectedUserId)?.full_name,
  //     referral_code: newCode.toUpperCase().replace(/\s+/g, ""),
  //     commission_rate_pct: newRate
  //   }]);

  //   if (error) return toast.error("Error: User may already be a marketer.");
  //   toast.success("Marketer node activated.");
  //   fetchReferralData();
  // };
  const generateMarketerCode = async (e) => {
  e.preventDefault();

  if (!selectedUserId || !newCode)
    return toast.error("Select user and code.");

  if (editingMarketer) {
    const { error } = await supabase
      .from("marketer_profiles")
      .update({
        referral_code: newCode.toUpperCase().replace(/\s+/g, ""),
        commission_rate_pct: newRate
      })
      .eq("id", editingMarketer);

    if (error) return toast.error(error.message);

    toast.success("Marketer updated.");
  } else {
    const { error } = await supabase
      .from("marketer_profiles")
      .insert([{
        id: selectedUserId,
        full_name: allUsers.find(u => u.id === selectedUserId)?.full_name,
        referral_code: newCode.toUpperCase().replace(/\s+/g, ""),
        commission_rate_pct: newRate
      }]);

    if (error) return toast.error(error.message);

    toast.success("Marketer created.");
  }

  setEditingMarketer(null);
  setSelectedUserId("");
  setNewCode("");
  setNewRate(10);

  fetchReferralData();
};

  const deleteMarketer = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this marketer?")) return;
    await supabase.from("marketer_profiles").delete().eq("id", id);
    if(selectedMarketer?.id === id) setSelectedMarketer(null);
    fetchReferralData();
  };

  const filteredAttributions = selectedMarketer 
    ? attributions.filter(a => a.referral_code_used === selectedMarketer.referral_code)
    : attributions;
const marketerStats = selectedMarketer
  ? {
      totalCustomers: filteredAttributions.length,
      totalSales: filteredAttributions.reduce(
        (sum, a) => sum + Number(a.sale_amount || 0),
        0
      ),
      totalCommission: filteredAttributions.reduce(
        (sum, a) => sum + Number(a.calculated_commission || 0),
        0
      ),
      approvedCommission: filteredAttributions
        .filter(a => a.status === "approved")
        .reduce((sum, a) => sum + Number(a.calculated_commission || 0), 0),
      paidCommission: filteredAttributions
        .filter(a => a.status === "paid")
        .reduce((sum, a) => sum + Number(a.calculated_commission || 0), 0),
    }
  : null;
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 bg-slate-950 text-slate-100 min-h-screen">

<button
  onClick={() => window.history.back()}
  className="mb-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800"
>
  <ArrowLeft size={14} />
  Back
</button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard title="Total Code Revenue" value={`KES ${stats.totalSales.toLocaleString()}`} accent="green" icon={DollarSign} />
        <StatCard title="Approved Payout Pool" value={`KES ${stats.pendingPayouts.toLocaleString()}`} accent="amber" icon={ArrowUpRight} />
        <StatCard title="Active Marketer Nodes" value={stats.activeMarketers} accent="blue" icon={Users2} />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5 space-y-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[24px]">
            <h3 className="text-sm font-black uppercase text-white mb-4 flex items-center gap-2">
              <Ticket size={16} className="text-indigo-400" /> Provision Referral Code
            </h3>
            <form onSubmit={generateMarketerCode} className="space-y-4">

              <select
  value={selectedUserId}
  onChange={(e) => setSelectedUserId(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white">
              
              {editingMarketer && (
  <option value={selectedUserId}>
    {selectedMarketer?.full_name}
  </option>
)}  
                <option value="">-- Select a User --</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
               <input
  value={newCode}
  onChange={e => setNewCode(e.target.value)}
                placeholder="CODE20" className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm uppercase" />
                <input
  value={newRate}
  onChange={e => setNewRate(Number(e.target.value))}
                type="number" placeholder="10" className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
              </div>

              {editingMarketer && (

  <button
    type="button"
    onClick={() => {
      setEditingMarketer(null);
      setSelectedMarketer(null);
      setSelectedUserId("");
      setNewCode("");
      setNewRate(10);
    }}
    className="w-full py-3 bg-slate-800 rounded-xl font-bold text-xs uppercase text-white mb-3"
  >
    ← Back To Create Mode
  </button>
)}
              <button className="w-full py-3 bg-indigo-600 rounded-xl font-bold text-xs uppercase text-white">{editingMarketer ? "Update Marketer" : "Commit Node"}</button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[24px]">
            <h3 className="text-sm font-black uppercase text-white mb-4">Active Marketers (Click to Filter)</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {marketers.map(m => (
                <div key={m.id} onClick={() => {
  setSelectedMarketer(m);

  setEditingMarketer(m.id);
  setSelectedUserId(m.id);
  setNewCode(m.referral_code);
  setNewRate(m.commission_rate_pct);
}}
className={`p-3 border rounded-xl flex justify-between items-center cursor-pointer ${selectedMarketer?.id === m.id ? 'bg-indigo-900 border-indigo-500' : 'bg-slate-950 border-slate-800'}`}>
                  <div><p className="text-xs font-bold">{m.full_name}</p><p className="text-[10px] text-indigo-400">{m.referral_code}</p></div>
                  <button onClick={(e) => deleteMarketer(m.id, e)} className="text-red-400"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
            {selectedMarketer && <button onClick={() => setSelectedMarketer(null)} className="mt-4 text-[10px] text-slate-400 underline">Clear Filter</button>}
          </div>
        </div>
         <div className="col-span-12 lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-[24px]">
{selectedMarketer && (
  <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
    <div className="bg-slate-950 p-3 rounded-xl">
      <p className="text-[10px] text-slate-400">Referral Code</p>
      <p className="font-bold">{selectedMarketer.referral_code}</p>
    </div>

    <div className="bg-slate-950 p-3 rounded-xl">
      <p className="text-[10px] text-slate-400">Commission Rate</p>
      <p className="font-bold">{selectedMarketer.commission_rate_pct}%</p>
    </div>

    <div className="bg-slate-950 p-3 rounded-xl">
      <p className="text-[10px] text-slate-400">Joined</p>
      <p className="font-bold">
        {new Date(selectedMarketer.created_at).toLocaleDateString()}
      </p>
    </div>

    <div className="bg-slate-950 p-3 rounded-xl">
      <p className="text-[10px] text-slate-400">Customers</p>
      <p className="font-bold">{marketerStats.totalCustomers}</p>
    </div>

    <div className="bg-slate-950 p-3 rounded-xl">
      <p className="text-[10px] text-slate-400">Sales Generated</p>
      <p className="font-bold">
        KES {marketerStats.totalSales.toLocaleString()}
      </p>
    </div>

    <div className="bg-slate-950 p-3 rounded-xl">
      <p className="text-[10px] text-slate-400">Commission Earned</p>
      <p className="font-bold text-emerald-400">
        KES {marketerStats.totalCommission.toLocaleString()}
      </p>
    </div>
  </div>
)}
       
          <h3 className="text-sm font-black uppercase text-white mb-4 border-b border-slate-800 pb-3">
            {selectedMarketer ? `Attribution Log: ${selectedMarketer.full_name}` : "All Referral Activity"}
          </h3>
          <div className="space-y-3">
            {filteredAttributions.map(attr => (
              <div key={attr.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                <div><p className="text-xs font-bold">{attr.users?.full_name || "Direct Conversion"}</p><p className="text-[10px] text-slate-500">Ref Code: {attr.referral_code_used}</p></div>
                <p className="text-xs font-black text-emerald-400">+KES {Number(attr.calculated_commission).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
