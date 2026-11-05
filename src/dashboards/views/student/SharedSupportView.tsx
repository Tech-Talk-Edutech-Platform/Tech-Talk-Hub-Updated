import React, { useState, useEffect } from "react";
import { HelpCircle, AlertCircle, CheckCircle2, Clock, ShieldAlert, Send } from "lucide-react";
import { supabase } from "../../../supabase";
import { isAdminRole } from "../../../types/roles";

export default function SharedSupportView({ user }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("technical");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchIssues = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("reported_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (err) {
      console.error("Error fetching support tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [user]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const role = user?.role || user?.user_metadata?.role;
    const isTutorOrAdmin = role === "tutor" || isAdminRole(role);

    try {
      const { error } = await supabase.from("issues").insert([
        {
          reported_by: user.id,
          title,
          description,
          category,
          status: "pending",
          target_role: isTutorOrAdmin ? "admin" : "tutor",
          assigned_to: isTutorOrAdmin ? null : user?.assigned_tutor_id || null,
        },
      ]);

      if (error) throw error;

      setSuccessMsg("Support ticket submitted successfully! Our team will review it soon.");
      setTitle("");
      setDescription("");
      fetchIssues();
    } catch (err) {
      console.error("Error creating ticket:", err);
      setErrorMsg("Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "resolved":
        return (
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 size={14} /> Resolved
          </span>
        );
      case "in_progress":
        return (
          <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold">
            <Clock size={14} /> In Progress
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-bold">
            <AlertCircle size={14} /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Help & Support Center</h1>
        <p className="text-sm text-gray-500 mt-1">
          Need technical help, schedule adjustments, or course support? Submit a ticket below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ticket Submission Form */}
        <div className="lg:col-span-5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[32px] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-purple-600">
            <ShieldAlert size={22} />
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Create New Ticket</h2>
          </div>

          {successMsg && (
            <div className="mb-4 p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-medium">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-purple-500"
              >
                <option value="technical">Technical Issue / Bug</option>
                <option value="scheduling">Class / Schedule Conflict</option>
                <option value="student_issue">Student Matter</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Subject Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Cannot load student homework files"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Description
              </label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl py-3.5 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
            >
              <Send size={16} />
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </div>

        {/* Existing Ticket History List */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-black text-gray-900 dark:text-white">Your Support History</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading tickets...</div>
          ) : issues.length === 0 ? (
            <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[32px] p-12 text-center">
              <HelpCircle size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-bold text-sm">No support tickets found.</p>
              <p className="text-xs text-gray-400 mt-1">Submit a ticket using the form if you need assistance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                        {issue.category}
                      </span>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base mt-2">{issue.title}</h3>
                    </div>
                    {getStatusBadge(issue.status)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{issue.description}</p>
                  <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5 flex justify-between">
                    <span>Ticket ID: #{issue.id.slice(0, 8)}</span>
                    <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
