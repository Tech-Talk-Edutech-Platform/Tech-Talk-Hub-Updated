import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";
import { Award, CheckCircle, Clock, Loader2, BarChart2 } from "lucide-react";

export default function StudentGradesView({ userId }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    supabase
      .from("attempts")
      .select("*, exams(title, duration_minutes)")
      .eq("student_id", userId)
      .not("end_time", "is", null)
      .order("end_time", { ascending: false })
      .then(({ data, error }) => {
        if (!error) setAttempts(data || []);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return (
    <div className="flex justify-center items-center h-96">
      <Loader2 className="animate-spin text-purple-600" size={32} />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Grades & Performance</h1>
        <p className="text-sm text-slate-500 mt-1">Review your completed assessment records, scores, and historical outcomes.</p>
      </div>

      {attempts.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl p-12 text-center">
          <BarChart2 className="text-slate-300 dark:text-slate-600 mx-auto mb-3" size={40} />
          <p className="font-bold text-slate-800 dark:text-white">No Graded Exams Yet</p>
          <p className="text-sm text-slate-400 mt-1">Complete an assessment to view your calculated performance results here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {attempts.map(att => (
            <div key={att.id} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-6 rounded-3xl flex justify-between items-center shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{att.exams?.title || "Assessment"}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Clock size={12} /> Finished: {new Date(att.end_time).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-2xl font-black text-sm flex items-center gap-1.5">
                  <Award size={16} /> Score: {att.score}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}