import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { Video, Plus, Trash2, Upload, User, Calendar, ExternalLink, X, Search, Sparkles } from "lucide-react";

export default function ClassRecordingsManager() {
  const [recordings, setRecordings] = useState([]);
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [courseName, setCourseName] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [studentId, setStudentId] = useState("");
  const [tutorId, setTutorId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: recs } = await supabase
      .from("class_recordings")
      .select(`
        *,
        tutor:users!tutor_id(full_name),
        student:users!student_id(full_name)
      `)
      .order("created_at", { ascending: false });

    const { data: studentList } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "student");

    const { data: tutorList } = await supabase
      .from("users")
      .select("id, full_name")
      .in("role", ["tutor", "owner", "operations_admin", "tech_admin"]);

    setRecordings(recs || []);
    setStudents(studentList || []);
    setTutors(tutorList || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !recordingUrl) {
      alert("Please provide at least a title and recording URL.");
      return;
    }

    const { error } = await supabase.from("class_recordings").insert([
      {
        title,
        course_name: courseName || null,
        recording_url: recordingUrl,
        thumbnail_url: thumbnailUrl || null,
        student_id: studentId || null,
        tutor_id: tutorId || null,
      },
    ]);

    if (error) {
      alert("Error uploading recording: " + error.message);
    } else {
      setIsModalOpen(false);
      setTitle("");
      setCourseName("");
      setRecordingUrl("");
      setThumbnailUrl("");
      setStudentId("");
      setTutorId("");
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this recording?")) return;
    const { error } = await supabase.from("class_recordings").delete().eq("id", id);
    if (!error) {
      setRecordings(recordings.filter((rec) => rec.id !== id));
    } else {
      alert("Error deleting: " + error.message);
    }
  };

  const filteredRecordings = recordings.filter((rec) =>
    rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rec.course_name && rec.course_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (rec.student?.full_name && rec.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900/60 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/25 text-purple-600 dark:text-purple-400 text-xs font-medium">
            <Sparkles size={13} /> Session Library
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Class Recordings
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
            Upload, browse, and organize video session recordings for individual students or global access.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-500 text-white rounded-xl font-medium text-sm shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus size={18} /> Upload Recording
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recordings by title, course, or student..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
          Showing <span className="text-purple-600 dark:text-purple-400 font-semibold">{filteredRecordings.length}</span> results
        </div>
      </div>

      {/* Recordings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 h-72 animate-pulse flex flex-col justify-between">
              <div className="bg-slate-100 dark:bg-slate-800 aspect-video rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecordings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecordings.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-slate-900/50 hover:border-purple-500/50 dark:hover:border-slate-700 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-sm transition-all duration-200 group"
            >
              {/* Thumbnail Video Container */}
              <div className="aspect-video bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-200 dark:border-slate-800">
                {rec.thumbnail_url ? (
                  <img src={rec.thumbnail_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    <Video className="text-slate-400 dark:text-slate-600" size={36} />
                  </div>
                )}
                <a
                  href={rec.recording_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 bg-slate-950/60 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <div className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-md transition-colors">
                    <ExternalLink size={14} /> Watch Session
                  </div>
                </a>
              </div>

              {/* Card Meta Content */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-semibold bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 px-2.5 py-0.5 rounded-md">
                    {rec.course_name || "General Session"}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                  {rec.title}
                </h3>

                <div className="text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Tutor:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <User size={12} className="text-slate-400 dark:text-slate-500" /> {rec.tutor?.full_name || "Auto-assigned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Student:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {rec.student?.full_name || "All Students (Global)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-medium">
                  <Calendar size={13} className="text-slate-400 dark:text-slate-500" /> {new Date(rec.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button
                  onClick={() => handleDelete(rec.id)}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Delete Recording"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm space-y-3 shadow-sm">
          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800">
            <Video size={20} />
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-300">No recordings found matching your search.</p>
          <button onClick={() => setSearchQuery("")} className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer">
            Clear search filters
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-200 dark:border-purple-500/20">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Upload Recording</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Share session archive with students.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Session Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Intro to Loops & Variables"
                  className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Course Name</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Python Fundamentals"
                  className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Recording URL (YouTube/Drive/Loom) *</label>
                <input
                  type="url"
                  required
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Thumbnail Image URL (Optional)</label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://... image link"
                  className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Assign Tutor</label>
                  <select
                    value={tutorId}
                    onChange={(e) => setTutorId(e.target.value)}
                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-slate-900 dark:text-slate-200 transition-colors"
                  >
                    <option value="">Auto-detect / Me</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Target Student</label>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-slate-900 dark:text-slate-200 transition-colors"
                  >
                    <option value="">Global (All Students)</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  Save & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
