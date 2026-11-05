// import React, { useState, useEffect } from "react";
// import { Copy, Check, Award, Flame, Wallet, Users, ArrowUpRight, ShieldCheck } from "lucide-react";
// import { supabase } from "../../supabase";
// import StatCard from "../../components/StatCard";
// import toast from "react-hot-toast";

// export default function MarketerDashboard({ currentMarketerId }) {
//   const [profile, setProfile] = useState(null);
//   const [myConversions, setMyConversions] = useState([]);
//   const [leaderboard, setLeaderboard] = useState([]);
//   const [copied, setCopied] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (currentMarketerId) {
//       fetchMarketerData();
//     }
//   }, [currentMarketerId]);

//   const fetchMarketerData = async () => {
//     try {
//       // 1. Fetch Marketer Profile Info
//       const { data: profData, error: profErr } = await supabase
//         .from("marketer_profiles")
//         .select("*")
//         .eq("id", currentMarketerId)
//         .single();
      
//       if (profErr) throw profErr;
//       setProfile(profData);

//       // 2. Fetch specific conversions routed through this marketer's code
//       const { data: convData, error: convErr } = await supabase
//         .from("referral_attributions")
//         .select("*, users:lead_or_student_id(full_name)")
//         .eq("marketer_id", currentMarketerId)
//         .order("created_at", { ascending: false });

//       if (convErr) throw convErr;
//       setMyConversions(convData || []);

//       // 3. Construct Leaderboard based on total count of approved/paid conversions
//       const { data: leaderboardData, error: leaderErr } = await supabase
//         .from("referral_attributions")
//         .select("marketer_id, marketer_profiles(full_name)");

//       if (leaderErr) throw leaderErr;
      
//       // Group and calculate conversions per marketer dynamically
//       const counts = (leaderboardData || []).reduce((acc, curr) => {
//         const mId = curr.marketer_id;
//         const name = curr.marketer_profiles?.full_name || "Anonymous Node";
//         if (!acc[mId]) acc[mId] = { name, count: 0 };
//         acc[mId].count += 1;
//         return acc;
//       }, {});

//       const sortedLeaderboard = Object.values(counts)
//         .sort((a, b) => b.count - a.count)
//         .slice(0, 5); // Grab top 5 performers

//       setLeaderboard(sortedLeaderboard);
//     } catch (err) {
//       toast.error("Pipeline failure fetching personal marketer matrices.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const copyReferralLink = (code) => {
//     // Generates a link targeting your main registration landing page
//     const shareUrl = `${window.location.origin}/register?ref=${code}`;
//     navigator.clipboard.writeText(shareUrl);
//     setCopied(true);
//     toast.success("Referral routing target written to clipboard.");
//     setTimeout(() => setCopied(false), 2000);
//   };

//   if (loading) return <div className="text-center py-20 text-xs font-mono tracking-widest text-slate-500">SYNCHRONIZING PROFILE VECTORS...</div>;
//   if (!profile) return <div className="text-center py-20 text-xs font-mono text-red-400">MARKETER AUTH MATRIX UNRESOLVED.</div>;

//   // Compensation threshold verification logic (4 conversions mandatory before payouts)
//   const totalConversionsCount = myConversions.length;
//   const eligibleForPayouts = totalConversionsCount >= 4;
  
//   const totalEarned = myConversions
//     .filter(c => c.status === "paid")
//     .reduce((acc, curr) => acc + Number(curr.calculated_commission), 0);

//   const pendingApproval = myConversions
//     .filter(c => c.status === "approved" || c.status === "pending_review")
//     .reduce((acc, curr) => acc + Number(curr.calculated_commission), 0);

//   return (
//     <div className="p-6 max-w-[1600px] mx-auto space-y-8 bg-slate-950 text-slate-100 min-h-screen font-sans">
      
//       {/* HEADER ROW PROFILE METRICS */}
//       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-[24px]">
//         <div>
//           <span className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400 block mb-1">PRO-MARKETER PORTAL</span>
//           <h2 className="text-xl font-black text-white">{profile.full_name}</h2>
//         </div>
        
//         {/* LINK SHARE ACTION BOX */}
//         <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3 justify-between sm:justify-start">
//           <div className="pl-2">
//             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">YOUR REFERRAL LINK</p>
//             <p className="text-xs font-mono font-bold text-indigo-400">{profile.referral_code}</p>
//           </div>
//           <button 
//             onClick={() => copyReferralLink(profile.referral_code)}
//             className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-all active:scale-95"
//           >
//             {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
//           </button>
//         </div>
//       </div>

//       {/* REVENUE MATRIX ROW */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
//         <StatCard title="Cleared Disbursed Funds" value={`KES ${totalEarned.toLocaleString()}`} color="green" icon={Wallet} />
//         <StatCard title="Pipeline Processing" value={`KES ${pendingApproval.toLocaleString()}`} color="amber" icon={ArrowUpRight} />
//         <StatCard title="Total Client Conversions" value={`${totalConversionsCount} Signups`} color="blue" icon={Users} />
//       </div>

//       {/* TRACKING AND BONUS STRUCTURE GRID */}
//       <div className="grid grid-cols-12 gap-8">
        
//         {/* LEFT COMPONENT: THRESHOLD MILESTONES & LEADERS */}
//         <div className="col-span-12 lg:col-span-5 space-y-8">
          
//           {/* COMPENSATION TARGET PROGRESS */}
//           <div className="bg-slate-900 border border-slate-800 p-6 rounded-[24px] shadow-xl relative overflow-hidden">
//             <div className="flex justify-between items-start mb-4">
//               <div>
//                 <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
//                   <Flame size={16} className="text-amber-500" /> Compensation Threshold Status
//                 </h3>
//                 <p className="text-[11px] text-slate-400 mt-1">4 secured clients required to activate payouts</p>
//               </div>
//               {eligibleForPayouts ? (
//                 <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-1 rounded-md">
//                   <ShieldCheck size={12} /> ACTIVE
//                 </span>
//               ) : (
//                 <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800 px-2 py-1 rounded-md">
//                   LOCKED
//                 </span>
//               )}
//             </div>

//             {/* PROGRESS BAR TRACKING */}
//             <div className="space-y-2 mt-6">
//               <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800/80">
//                 <div 
//                   className={`h-full rounded-full transition-all duration-500 ${eligibleForPayouts ? 'bg-emerald-500' : 'bg-indigo-500'}`}
//                   style={{ width: `${Math.min((totalConversionsCount / 4) * 100, 100)}%` }}
//                 />
//               </div>
//               <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1">
//                 <span>0 Conversions</span>
//                 <span className="font-bold text-white">{totalConversionsCount} / 4 Achieved</span>
//                 <span>Base Target</span>
//               </div>
//             </div>

//             {!eligibleForPayouts && (
//               <div className="mt-4 p-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-[11px] text-slate-400 leading-relaxed">
//                 Bring in <strong className="text-amber-400 font-bold">{4 - totalConversionsCount} more</strong> verified customer profiles to clear validation hurdles and trigger your accumulated commission ledger.
//               </div>
//             )}
//           </div>

//           {/* INTERNAL SYSTEM LEADERBOARD */}
//           <div className="bg-slate-900 border border-slate-800 p-6 rounded-[24px] shadow-xl">
//             <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
//               <Award size={16} className="text-indigo-400" /> Strategic Top Performers
//             </h3>
//             <div className="space-y-2">
//               {leaderboard.map((item, index) => (
//                 <div key={index} className="p-3 bg-slate-950 border border-slate-800/40 rounded-xl flex justify-between items-center">
//                   <div className="flex items-center gap-3">
//                     <span className={`w-5 h-5 flex items-center justify-center font-mono text-[10px] rounded font-bold ${
//                       index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400'
//                     }`}>
//                       {index + 1}
//                     </span>
//                     <p className="text-xs font-semibold text-slate-200">{item.name}</p>
//                   </div>
//                   <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded">
//                     {item.count} conversions
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* RIGHT COMPONENT: CONVERSION STREAM TRACKER */}
//         <div className="col-span-12 lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-[24px] shadow-xl">
//           <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4 pb-3 border-b border-slate-800/60">
//             Personal Conversion Ledger
//           </h3>
//           <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
//             {myConversions.length === 0 ? (
//               <p className="text-xs italic text-slate-500 text-center py-16">No tracked link resolutions verified yet.</p>
//             ) : (
//               myConversions.map(conv => (
//                 <div key={conv.id} className="p-4 bg-slate-950 border border-slate-800/60 rounded-xl flex justify-between items-center">
//                   <div>
//                     <p className="text-xs font-bold text-white">{conv.users?.full_name || "Enrolled Student"}</p>
//                     <p className="text-[10px] font-mono text-slate-500 mt-1">
//                       Processed: {new Date(conv.created_at).toLocaleDateString("en-KE")}
//                     </p>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-xs font-black text-indigo-400">
//                       +KES {Number(conv.calculated_commission).toLocaleString()}
//                     </p>
//                     <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 mt-1.5 inline-block rounded border ${
//                       conv.status === 'paid' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'
//                     }`}>
//                       {conv.status === 'paid' ? 'Disbursed' : 'In Review'}
//                     </span>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }
export {};
