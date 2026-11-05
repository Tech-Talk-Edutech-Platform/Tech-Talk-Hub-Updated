
import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  Sparkles,
  ChevronRight,
  Send,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../../supabase";

export default function StudentHomeworkView({ userId, courseId }) {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchHomework();
    }
  }, [userId, courseId]);

  useEffect(() => {
    if (selectedAssignment) {
      setSubmissionText(selectedAssignment.submission_link || "");
    } else {
      setSubmissionText("");
    }
  }, [selectedAssignment]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("student_assignments")
        .select("*")
        .eq("student_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const fetchedAssignments = data || [];
      setAssignments(fetchedAssignments);

      if (fetchedAssignments.length > 0) {
        const assignment =
          fetchedAssignments.find((a) => a.id === selectedAssignment?.id) ||
          fetchedAssignments[0];

        setSelectedAssignment(assignment);
      }
    } catch (err) {
      console.error("Error fetching homework:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssignment = (assignment) => {
    setSelectedAssignment(assignment);
  };

  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    try {
      setSubmitting(true);
      const timestamp = new Date().toISOString();
      
      const { error } = await supabase
        .from("student_assignments")
        .update({
          submission_link: submissionText,
          status: "submitted",
          updated_at: timestamp,
          submitted_at: timestamp,
        })
        .eq("id", selectedAssignment.id);

      if (error) throw error;

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === selectedAssignment.id
            ? {
                ...a,
                submission_link: submissionText,
                status: "submitted",
                submitted_at: timestamp,
                updated_at: timestamp,
              }
            : a
        )
      );

      setSelectedAssignment((prev) =>
        prev
          ? {
              ...prev,
              submission_link: submissionText,
              status: "submitted",
              submitted_at: timestamp,
              updated_at: timestamp,
            }
          : null
      );

      alert("Homework submitted successfully! 🎉");
    } catch (err) {
      console.error("Error submitting homework:", err.message);
      alert("Failed to submit homework. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white/15 backdrop-blur-xl border border-white/10 rounded-[30px] p-8 text-center shadow-2xl">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <h2 className="text-white text-xl font-bold">Loading Homework...</h2>
          <p className="text-gray-300 mt-2">Fetching your assignments 🚀</p>
        </div>
      </div>
    );
  }

  const pendingCount = assignments.filter(
    (a) => a.status === "pending"
  ).length;

  const submittedCount = assignments.filter(
    (a) => a.status === "submitted"
  ).length;

  const needsRevisionCount = assignments.filter(
    (a) => a.status === "needs_revision"
  ).length;

  const completedCount = assignments.filter(
    (a) => a.status === "completed"
  ).length;

  return (
    <div className="space-y-6 p-4 md:p-6 text-gray-900 dark:text-white">
      {/* Header Banner */}
      <div className="bg-white dark:bg-white/5 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[35px] p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-bold mb-3">
              <FileText size={16} />
              HOMEWORK & TASKS
            </div>
            <h1 className="text-3xl md:text-4xl font-black">My Assignments</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-xl">
              Track your pending projects, review tutor feedback, and submit your completed coding work.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 px-4 py-3 rounded-2xl text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pending</p>
              <p className="font-black text-xl text-orange-500">{pendingCount}</p>
            </div>
            <div className="bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 px-4 py-3 rounded-2xl text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Submitted</p>
              <p className="font-black text-xl text-blue-500">{submittedCount}</p>
            </div>
            <div className="bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 px-4 py-3 rounded-2xl text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Revision</p>
              <p className="font-black text-xl text-amber-500">{needsRevisionCount}</p>
            </div>
            <div className="bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 px-4 py-3 rounded-2xl text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Completed</p>
              <p className="font-black text-xl text-green-500">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Assignment Details & Submission Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[35px] p-6 md:p-8 shadow-xl">
            {selectedAssignment ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedAssignment.status === "completed"
                          ? "bg-green-500/20 text-green-400"
                          : selectedAssignment.status === "submitted"
                          ? "bg-blue-500/20 text-blue-400"
                          : selectedAssignment.status === "needs_revision"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-orange-500/20 text-orange-400"
                      }`}
                    >
                      {selectedAssignment.status === "completed" ? (
                        <CheckCircle2 size={20} />
                      ) : selectedAssignment.status === "needs_revision" ? (
                        <AlertCircle size={20} />
                      ) : (
                        <Clock size={20} />
                      )}
                    </div>
                    <span
                      className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        selectedAssignment.status === "completed"
                          ? "bg-green-500/10 text-green-600 border border-green-500/25"
                          : selectedAssignment.status === "submitted"
                          ? "bg-blue-500/10 text-blue-600 border border-blue-500/25"
                          : selectedAssignment.status === "needs_revision"
                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/25"
                          : "bg-orange-500/10 text-orange-600 border border-orange-500/25"
                      }`}
                    >
                      {selectedAssignment.status ? selectedAssignment.status.replace("_", " ") : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Clock size={16} />
                    <span>
                      {new Date(selectedAssignment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-black">
                    {selectedAssignment.task_name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                    {selectedAssignment.description ||
                      selectedAssignment.instructions ||
                      "Complete the assigned task and paste your project or file link below for your tutor to review."}
                  </p>
                </div>

                {selectedAssignment.status === "needs_revision" && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-700 dark:text-amber-300 text-sm space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle size={16} /> Revision Required
                    </p>
                    <p className="text-xs">Your tutor requested adjustments based on your previous submission. Please review the feedback below and update your link.</p>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Upload size={18} className="text-purple-500" />
                    Submit Your Work
                  </h3>
                  <form onSubmit={handleSubmitHomework} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
                        Project Link (Scratch, GitHub, or File URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://scratch.mit.edu/projects/... or https://github.com/..."
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        required
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition disabled:opacity-50"
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={18} />
                          <span>
                            {selectedAssignment.status === "completed"
                              ? "Resubmit Homework"
                              : selectedAssignment.status === "submitted"
                              ? "Update Submission"
                              : selectedAssignment.status === "needs_revision"
                              ? "Resubmit for Review"
                              : "Submit Homework"}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {selectedAssignment.tutor_feedback && (
                  <div className="bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 mt-6">
                    <h4 className="font-bold text-purple-600 dark:text-purple-300 flex items-center gap-2 mb-2">
                      <Sparkles size={16} />
                      Tutor Feedback
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {selectedAssignment.tutor_feedback}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-bold">Select an assignment to view details and submit.</p>
              </div>
            )}
          </div>
        </div>

        {/* Assignments List Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[35px] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black">All Assignments</h3>
              <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold px-3 py-1 rounded-full">
                {assignments.length} Total
              </span>
            </div>

            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {assignments.length > 0 ? (
                assignments.map((item) => {
                  const isSelected = selectedAssignment?.id === item.id;
                  const isCompleted = item.status === "completed";
                  const isSubmitted = item.status === "submitted";
                  const isNeedsRevision = item.status === "needs_revision";

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectAssignment(item)}
                      className={`cursor-pointer rounded-2xl p-4 transition-all border flex items-center justify-between ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20"
                          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? "bg-green-500/20 text-green-400"
                              : isSubmitted
                              ? "bg-blue-500/20 text-blue-400"
                              : isNeedsRevision
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-orange-500/20 text-orange-400"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={20} />
                          ) : isNeedsRevision ? (
                            <AlertCircle size={20} />
                          ) : (
                            <Clock size={20} />
                          )}
                        </div>
                        <div>
                          <p
                            className={`font-bold text-sm line-clamp-1 ${
                              isSelected ? "text-white" : "text-gray-800 dark:text-white"
                            }`}
                          >
                            {item.task_name}
                          </p>
                          <p className={`text-xs capitalize ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                            {item.status
                              ? item.status.replace("_", " ")
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className={isSelected ? "text-white" : "text-gray-400"} />
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No assignments assigned yet. Keep up the great work!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
