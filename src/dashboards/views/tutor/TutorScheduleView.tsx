import React, { useEffect, useState, useCallback } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { supabase } from "../../../supabase";
import UpcomingClasses from "../../../components/UpcomingClasses";

interface TutorScheduleViewProps {
  userId?: string | null;
}

interface TutorScheduleItem {
  id: string;
  start_time: string;
  end_time: string;
  student_name: string;
  grade: string;
}

export default function TutorScheduleView({ userId }: TutorScheduleViewProps) {
  const [classes, setClasses] = useState<TutorScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select(`
          *,
          classes (
            student_name,
            students (full_name, grade)
          )
        `)
        .eq("tutor_id", userId)
        .order("start_time", { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((e: {
        id: string;
        start_time: string;
        end_time: string;
        student_name?: string | null;
        grade?: string | null;
        classes?: { student_name?: string | null; students?: { full_name?: string | null; grade?: string | null } | null } | null;
      }) => ({
        ...e,
        student_name: e.classes?.students?.full_name || e.classes?.student_name || "N/A",
        grade: e.classes?.students?.grade || "N/A"
      }));

      setClasses(formatted);
    } catch (err) {
      console.error("Error fetching schedule:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 text-gray-900 dark:text-white">
      <div className="bg-white dark:bg-[#131b31]/60 backdrop-blur-xl border border-gray-100 dark:border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-lg">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-600 dark:text-purple-300 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider mb-3">
          <CalendarIcon size={14} />
          CALENDAR & SESSIONS
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Class Schedule</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1.5 text-sm md:text-base">
          Review all scheduled upcoming virtual tutorial sessions and student time slots.
        </p>
      </div>

      <div className="bg-white dark:bg-[#131b31]/60 backdrop-blur-xl border border-gray-100 dark:border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-lg">
        <UpcomingClasses classes={classes} loading={loading} />
      </div>
    </div>
  );
}
