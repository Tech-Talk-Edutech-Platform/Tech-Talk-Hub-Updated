import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase";
import { Send, Clock, CheckCircle, ChevronLeft, Edit3, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";

const issueSchema = z.object({
  title: z.string().trim().min(1, "Enter a ticket title."),
  description: z.string(),
  priority: z.enum(["low", "normal", "high"]),
});
type IssueFormValues = z.infer<typeof issueSchema>;

export default function RaiseIssue({ user, fetchAll, isLocked }) {
  if (isLocked) {
    return (
      <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-200">
        Ticket is {status}. Please wait for a resolution before opening a new one.
      </div>
    );
  }
  const { register, handleSubmit: submitWithValidation, reset, formState: { errors } } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: { title: "", description: "", priority: "normal" },
  });
  const [history, setHistory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("issues")
      .select("id, title, description, status, created_at, priority")
      .eq("reported_by", user.id)
      .order("created_at", { ascending: false });
    if (data) setHistory(data);
  }, [user?.id]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // const handleUpdate = async () => {
  //   const { error } = await supabase
  //     .from("issues")
  //     .update({ title: selectedTicket.title, description: selectedTicket.description })
  //     .eq("id", selectedTicket.id);
  //   if (error) alert(error.message);
  //   else { setIsEditing(false); fetchHistory(); }
  // };
  const handleUpdate = async () => {
    // 1. Check if the specific ticket is already resolved or in progress
    if (selectedTicket.status !== 'open') {
      alert("You cannot edit a ticket that is already in progress or resolved.");
      setIsEditing(false); // Close edit mode
      return;
    }

    const { error } = await supabase
      .from("issues")
      .update({ title: selectedTicket.title, description: selectedTicket.description })
      .eq("id", selectedTicket.id);

    if (error) {
      alert(error.message);
    } else {
      setIsEditing(false);
      fetchHistory();
    }
  };

  const handleSubmit = async ({ title, description, priority }: IssueFormValues) => {
    setIsSubmitting(true);
    const { error } = await supabase.from("issues").insert([{ title, description, priority, reported_by: user.id }]);
    if (error) alert(error.message);
    else { reset(); fetchHistory(); if (fetchAll) fetchAll(); }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {selectedTicket ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <button onClick={() => { setSelectedTicket(null); setIsEditing(false); }} className="text-[10px] flex items-center gap-1 font-bold text-slate-400 hover:text-blue-600">
            <ChevronLeft size={12} /> BACK
          </button>
          
          {/* Detail/Edit View */}
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              {isEditing ? (
                <input className="font-bold text-sm border-b w-full" value={selectedTicket.title} onChange={(e) => setSelectedTicket({...selectedTicket, title: e.target.value})} />
              ) : (
                <h3 className="font-black text-slate-800 text-sm text-left">{selectedTicket.title}</h3>
              )}
          {selectedTicket.status === 'open' && (
  <button 
    onClick={() => isEditing ? handleUpdate() : setIsEditing(true)} 
    className="text-blue-600"
  >
    {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
  </button>
)}
            </div>
            
            {isEditing ? (
              <textarea className="w-full text-xs text-slate-500 border rounded p-2" value={selectedTicket.description} onChange={(e) => setSelectedTicket({...selectedTicket, description: e.target.value})} />
            ) : (
              <p className="text-xs text-slate-500 text-left">{selectedTicket.description}</p>
            )}
          </div>
        </div>
      ) : (
        /* Form View */
        <form onSubmit={submitWithValidation(handleSubmit)} noValidate className="space-y-3">
          <input className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm" placeholder="Title" {...register("title")} aria-invalid={Boolean(errors.title)} />
          {errors.title && <p role="alert" className="text-xs text-red-600">{errors.title.message}</p>}
          <textarea className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm min-h-[80px]" placeholder="Description..." {...register("description")} />
          <select {...register("priority")} className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm" aria-label="Ticket priority">
            <option value="low">Low priority</option><option value="normal">Normal priority</option><option value="high">High priority</option>
          </select>
          <button disabled={isLocked} className="w-full bg-red-500 text-white p-2.5 rounded-xl font-bold text-sm">Send Ticket</button>
        </form>
      )}

      {!selectedTicket && (
        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 text-left">Recent Tickets</h4>
          <div className="space-y-2">
            {(showAll ? history : history.slice(0, 3)).map((h) => (
              <button key={h.id} onClick={() => setSelectedTicket(h)} className="w-full flex justify-between items-center p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border text-left">
                <span className="font-semibold text-xs text-slate-700 truncate w-3/4">{h.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${h.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{h.status}</span>
              </button>
            ))}
            {history.length > 3 && (
              <button onClick={() => setShowAll(!showAll)} className="w-full text-[10px] font-bold text-blue-600 py-2 text-left uppercase">{showAll ? "Show Less" : "View More"}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
