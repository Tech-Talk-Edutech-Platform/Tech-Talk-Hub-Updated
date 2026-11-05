
import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../supabase";
import { Loader2, MessageSquare, CheckCircle, ExternalLink, Star } from "lucide-react";
import toast from "react-hot-toast";
import type { User } from "@supabase/supabase-js";

interface StudentAssignmentsProps {
  tutorId?: string;
  students?: Array<{ id: string; full_name: string }>;
  courses?: Array<{ id: string; title: string }>;
  user?: User | null;
}

interface StudentAssignmentView {
  id: string;
  task: string;
  status: string;
  student: string;
  course: string;
  submission_text: string | null;
  tutor_feedback: string | null;
  grade: string | null;
}

interface NewAssignment {
  student_id: string;
  course_id: string;
  task_name: string;
  category: string;
  submission_link: string;
  description: string;
}

const EMPTY_ASSIGNMENT: NewAssignment = {
  student_id: "",
  course_id: "",
  task_name: "",
  category: "",
  submission_link: "",
  description: "",
};

export default function StudentAssignments({ tutorId, students = [], courses = [], user }: StudentAssignmentsProps) {
  const effectiveTutorId = tutorId ?? user?.id;
  const [assignments, setAssignments] = useState<StudentAssignmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Track both text feedback and star rating
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [ratingInputs, setRatingInputs] = useState<Record<string, number>>({});
  const [newAssignment, setNewAssignment] = useState<NewAssignment>(EMPTY_ASSIGNMENT);

  const getStatusStyles = (status: string | null | undefined) => {
    switch (status?.toLowerCase()) {
      case "submitted":
        return "bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse";
      case "pending":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-400 border-slate-100";
    }
  };

  const fetchAssignments = useCallback(async () => {
    if (!effectiveTutorId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("student_assignments")
      .select(`
        id, task_name, status, category, description, 
        submission_text, submission_link, tutor_feedback, grade,
        student:student_id ( full_name ),
        course:course_id ( title )
      `)
      .eq("tutor_id", effectiveTutorId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAssignments(data.map((item: {
        id: string;
        task_name: string;
        status: string;
        submission_text: string | null;
        tutor_feedback: string | null;
        grade: string | null;
        student?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
        course?: { title?: string | null } | Array<{ title?: string | null }> | null;
      }) => ({
        ...item,
        task: item.task_name,
        student: (Array.isArray(item.student) ? item.student[0]?.full_name : item.student?.full_name) || "Unknown",
        course: (Array.isArray(item.course) ? item.course[0]?.title : item.course?.title) || "",
      })));
    }
    setLoading(false);
  }, [effectiveTutorId]);

  useEffect(() => { void fetchAssignments(); }, [fetchAssignments]);

  const markCompleted = async (id: string) => {
    const feedback = feedbackInputs[id] || "Great job!";
    const rating = ratingInputs[id] || 5;

    const { error } = await supabase
      .from("student_assignments")
      .update({
        status: "completed",
        grade: `${rating} Stars`, // Store rating in the grade column
        tutor_feedback: feedback
      })
      .eq("id", id);

    if (error) {
      toast.error("Update failed");
    } else {
      toast.success("Review sent to student!");
      fetchAssignments();
    }
  };

  const handleCreateAssignment = async () => {
    if (!effectiveTutorId || !newAssignment.student_id || !newAssignment.course_id || !newAssignment.task_name.trim()) {
      toast.error("Select a student and course, then enter a task name.");
      return;
    }

    const { error } = await supabase.from("student_assignments").insert({
      ...newAssignment,
      tutor_id: effectiveTutorId,
      status: "pending",
    });

    if (error) {
      toast.error("Assignment could not be created.");
      return;
    }

    toast.success("Assignment created.");
    setNewAssignment(EMPTY_ASSIGNMENT);
    setShowModal(false);
    void fetchAssignments();
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-6">
      <div className="flex justify-between mb-8 items-center">
        <h3 className="font-black text-2xl text-slate-900 tracking-tight">Active Assignments</h3>
        <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black hover:bg-blue-700 shadow-lg active:scale-95 transition-all">+ New Task</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-200" size={40} /></div>
      ) : (
        <div className="space-y-4">
          {assignments.map((item) => (
            <div key={item.id} className={`p-6 border-2 rounded-[28px] bg-white transition-all ${item.status === 'submitted' ? 'border-amber-200 bg-amber-50/10' : 'border-slate-50'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-black text-slate-900 text-lg">{item.student}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{item.task} • {item.course}</p>
                </div>
                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest ${getStatusStyles(item.status)}`}>{item.status}</span>
              </div>

              {item.submission_text && (
                <div className="mt-2 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Submission</p>
                    <p className="text-sm font-medium text-slate-700 italic">"{item.submission_text}"</p>
                  </div>

                  {item.status === "submitted" ? (
                    <div className="p-4 border-t border-slate-100 space-y-4">
                      {/* Rating Selector */}
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Rate Performance</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRatingInputs({ ...ratingInputs, [item.id]: star })}
                              className="transition-transform active:scale-125"
                            >
                              <Star
                                size={24}
                                className={`${(ratingInputs[item.id] || 5) >= star ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        placeholder="Feedback note..."
                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-200 transition"
                        rows={2}
                        value={feedbackInputs[item.id] || ""}
                        onChange={(e) => setFeedbackInputs({ ...feedbackInputs, [item.id]: e.target.value })}
                      />
                      <button
                        onClick={() => markCompleted(item.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} /> Send Review
                      </button>
                    </div>
                  ) : (
                    item.tutor_feedback && (
                      <div className="p-4 border-t border-slate-100 bg-emerald-50/30 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-emerald-600 font-black uppercase mb-1">Your Feedback</p>
                          <p className="text-sm font-bold text-emerald-800">{item.tutor_feedback}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {/* Display result stars */}
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={12} className={item.grade?.includes(String(s)) || (Number.parseInt(item.grade ?? "", 10) >= s) ? "fill-emerald-500 text-emerald-500" : "text-emerald-200"} />
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[320px]">
            <h3 className="font-bold mb-4">New Assignment</h3>

            <select
              className="w-full mb-2 p-2 border rounded"
              value={newAssignment.student_id}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, student_id: e.target.value })
              }
            >
              <option value="">Select Student</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>

            <select
              className="w-full mb-2 p-2 border rounded"
              value={newAssignment.course_id}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, course_id: e.target.value })
              }
            >
              <option value="">Select Course</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {/* ✅ fixed: show title */}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Task Name"
              className="w-full mb-2 p-2 border rounded"
              value={newAssignment.task_name}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, task_name: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Category"
              className="w-full mb-2 p-2 border rounded"
              value={newAssignment.category}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, category: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Submission Link"
              className="w-full mb-2 p-2 border rounded"
              value={newAssignment.submission_link}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, submission_link: e.target.value })
              }
            />

            <textarea
              placeholder="Description"
              className="w-full mb-4 p-2 border rounded"
              value={newAssignment.description}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, description: e.target.value })
              }
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 bg-slate-200 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
}
