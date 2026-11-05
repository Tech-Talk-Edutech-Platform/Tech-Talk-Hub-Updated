import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // IMPORT THIS
import toast from "react-hot-toast";
import { supabase } from "../../../supabase";
import { Loader2, CheckCircle, Clock, Send, MessageSquare, Star, ArrowLeft } from "lucide-react"; // ADDED ArrowLeft

interface MyHomeworkProps {
  studentId?: string;
}

interface StudentAssignment {
  id: string;
  status: string;
  task_name: string;
  description: string | null;
  submission_text: string | null;
  tutor_feedback: string | null;
  grade: string | null;
  submitted_at?: string | null;
}

export default function MyHomework({ studentId }: MyHomeworkProps) {
  const navigate = useNavigate(); // INITIALIZE NAVIGATE
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from("student_assignments")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) console.error("Fetch error:", error);
    setAssignments(data || []);
  }, [studentId]);

  useEffect(() => {
    if (studentId) void fetchAssignments();
  }, [studentId, fetchAssignments]);

  async function submitAssignment(id: string) {
    const text = submissions[id];
    if (!text) return toast.error("Please write your response first");

    setSubmittingId(id);

    try {
      const { error } = await supabase
        .from("student_assignments")
        .update({
          submission_text: text,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Homework sent!");

      setAssignments(prev => prev.map(a =>
        a.id === id
          ? { ...a, status: 'submitted', submission_text: text, submitted_at: new Date().toISOString() }
          : a
      ));

      setSubmissions(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      fetchAssignments();
    } catch (err) {
      toast.error(`Submit failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      {/* ===== ADDED BACK BUTTON HEADER ===== */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <button 
          onClick={() => navigate(-1)} // Navigates back to previous dashboard route
          className="flex items-center gap-2 px-4 py-2 text-sm font-black text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition active:scale-95"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 className="text-xl font-black text-slate-900">My Homework Dashboard</h2>
        <div className="w-16"></div> {/* Spacer for symmetry */}
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
          <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle className="text-slate-200" size={32} />
          </div>
          <p className="text-slate-400 font-bold">All caught up! No pending homework.</p>
        </div>
      ) : (
        assignments.map((a) => {
          const isSubmitting = submittingId === a.id;
          const isCompleted = a.status === 'completed';

          return (
            <div
              key={a.id}
              className={`group bg-white border-2 rounded-[32px] p-6 transition-all duration-300 ${a.status === 'pending'
                ? 'border-slate-100 hover:border-indigo-100'
                : isCompleted ? 'border-emerald-100 bg-emerald-50/10' : 'border-transparent bg-slate-50/50'
                }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">{a.task_name}</h3>
                    {a.status !== 'pending' && (
                      <CheckCircle size={18} className={isCompleted ? "text-emerald-500" : "text-blue-500"} />
                    )}
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{a.description}</p>
                </div>

                <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm ${a.status === 'pending' ? 'bg-white text-amber-600 border border-amber-100' :
                  a.status === 'submitted' ? 'bg-blue-600 text-white' :
                    'bg-emerald-600 text-white'
                  }`}>
                  {a.status === 'pending' ? <Clock size={12} className="animate-pulse" /> : <CheckCircle size={12} />}
                  {a.status}
                </span>
              </div>

              {/* Interaction Area */}
              {a.status === "pending" ? (
                <div className="space-y-3 mt-4">
                  <textarea
                    disabled={isSubmitting}
                    className="w-full border-none bg-slate-50 p-5 rounded-[24px] focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium text-slate-700 text-sm placeholder:text-slate-300 disabled:opacity-50"
                    placeholder="Write your answer or link your work here..."
                    rows={4}
                    value={submissions[a.id] || ""}
                    onChange={(e) => setSubmissions({ ...submissions, [a.id]: e.target.value })}
                  />

                  <button
                    disabled={isSubmitting || !submissions[a.id]}
                    onClick={() => submitAssignment(a.id)}
                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${isSubmitting ? 'bg-blue-600 text-white cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-100 disabled:text-slate-300'
                      }`}
                  >
                    {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Syncing...</> : <><Send size={16} /> Submit Homework</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Student's Submission */}
                  <div className="mt-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Work</p>
                    <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap italic border-l-2 border-slate-100 pl-4">
                      "{a.submission_text}"
                    </p>
                  </div>

                  {/* Tutor's Feedback */}
                  {isCompleted && (a.tutor_feedback || a.grade) && (
                    <div className="p-5 bg-emerald-600 text-white rounded-2xl shadow-lg animate-in zoom-in duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={16} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Tutor Feedback</p>
                      </div>
                      <p className="text-sm font-bold leading-relaxed mb-3">
                        {a.tutor_feedback || "Great job! Your work has been reviewed."}
                      </p>

                      {/* Star Rating Display */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              className={Number.parseInt(a.grade ?? "", 10) >= s ? "fill-white text-white" : "text-emerald-400"}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">Grade: {a.grade}</span>
                      </div>
                    </div>
                  )}

                  {!isCompleted && (
                    <div className="mt-2 pt-3 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">Status: Waiting for Review</span>
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
