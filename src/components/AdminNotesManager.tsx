import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Plus, Trash2, BookOpen, Layers, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom'

export default function AdminNotesManager() {
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [notes, setNotes] = useState([]);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  const [newCourse, setNewCourse] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => () => {
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
  }, []);

  const showStatus = (type, msg) => {
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
    setStatus({ type, msg });
    statusTimeout.current = setTimeout(() => {
      setStatus({ type: "", msg: "" });
      statusTimeout.current = null;
    }, 4000);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("title");
    setCourses(data || []);
  };

  const fetchTopics = async (courseId) => {
    if (!courseId) return;
    const { data } = await supabase.from("topics").select("*").eq("course_id", courseId).order("title");
    setTopics(data || []);
  };

  const fetchNotes = async (topicId) => {
    if (!topicId) return;
    const { data } = await supabase.from("notes").select("*").eq("topic_id", topicId).order("created_at");
    setNotes(data || []);
  };

  const handleCreateCourse = async () => {
    if (!newCourse) return;
    const { error } = await supabase.from("courses").insert([{ title: newCourse }]);
    if (error) return showStatus("error", "Failed to create course.");
    setNewCourse("");
    fetchCourses();
    showStatus("success", "Course created!");
  };

  const handleCreateTopic = async () => {
    if (!newTopic || !selectedCourse) return;
    const { error } = await supabase.from("topics").insert([{ title: newTopic, course_id: selectedCourse }]);
    if (error) return showStatus("error", "Failed to create topic.");
    setNewTopic("");
    fetchTopics(selectedCourse);
    showStatus("success", "Topic created!");
  };

  const handleUploadNote = async () => {
    if (!noteTitle || !noteContent || !selectedTopic) {
      return showStatus("error", "Fill all note fields.");
    }

    setLoading(true);
    // Explicitly mapping to your DB columns
    const { error } = await supabase.from("notes").insert([
      {
        title: noteTitle,
        content: noteContent,
        topic_id: selectedTopic,
        course_id: selectedCourse // Ensure you ran the SQL ALTER TABLE command above
      },
    ]);

    if (error) {
      console.error("Supabase Upload Error:", error);
      showStatus("error", `Error: ${error.message}`);
    } else {
      setNoteTitle("");
      setNoteContent("");
      fetchNotes(selectedTopic);
      showStatus("success", "Note published!");
    }
    setLoading(false);
  };

  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (!error) fetchNotes(selectedTopic);
  };

  return (
    <div className="max-w mx-auto p-4 md:p-8 bg-gray-900 min-h-screen text-gray-100">

      <header className="mb-10 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/:role`)}
            className="px-3 py-2 bg--200 hover:bg-indigo-400 rounded-xl font-bold text-sm"
          >
            ← Back
          </button>
          <h6 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Curriculum Builder
          </h6>
        </div>
        <p className="text-gray-400 mt-2 text-lg">Create courses, add topics, and publish markdown notes.</p>
      </header>

      {status.msg && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${status.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/50" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/50"
          }`}>
          {status.type === "error" ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-bold">{status.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Hierarchy Setup */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl backdrop-blur-sm">
            <h2 className="flex items-center gap-2 font-black text-indigo-400 mb-4 uppercase text-xs tracking-widest">
              Step 1: Course Selection
            </h2>
            <div className="flex gap-2 mb-4">
              <input
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                placeholder="New course title..."
                className="flex-1 bg-gray-950 border border-gray-700 p-3 rounded-xl focus:ring-2 ring-indigo-500 outline-none transition-all"
              />
              <button onClick={handleCreateCourse} className="bg-indigo-600 hover:bg-indigo-500 p-3 rounded-xl transition shadow-lg shadow-indigo-900/20">
                <Plus size={20} />
              </button>
            </div>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                fetchTopics(e.target.value);
                setSelectedTopic("");
                setNotes([]);
              }}
              className="w-full bg-gray-950 border border-gray-700 p-3 rounded-xl text-gray-200 outline-none cursor-pointer hover:border-gray-600 transition"
            >
              <option value="">-- Choose Course --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div className={`bg-gray-800/50 border border-gray-700 p-6 rounded-3xl transition-all duration-500 ${!selectedCourse ? 'opacity-30 pointer-events-none scale-95' : 'opacity-100'}`}>
            <h2 className="flex items-center gap-2 font-black text-emerald-400 mb-4 uppercase text-xs tracking-widest">
              Step 2: Topic Selection
            </h2>
            <div className="flex gap-2 mb-4">
              <input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="New topic title..."
                className="flex-1 bg-gray-950 border border-gray-700 p-3 rounded-xl focus:ring-2 ring-emerald-500 outline-none transition-all"
              />
              <button onClick={handleCreateTopic} className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl transition shadow-lg shadow-emerald-900/20">
                <Plus size={20} />
              </button>
            </div>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                fetchNotes(e.target.value);
              }}
              className="w-full bg-gray-950 border border-gray-700 p-3 rounded-xl text-gray-200 outline-none cursor-pointer hover:border-gray-600 transition"
            >
              <option value="">-- Choose Topic --</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        </div>

        {/* Right Column - Note Editor */}
        <div className={`lg:col-span-8 space-y-6 transition-all duration-500 ${!selectedTopic ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl backdrop-blur-sm">
            <h2 className="flex items-center gap-2 font-black text-purple-400 mb-6 uppercase text-xs tracking-widest">
              Step 3: Content Editor (Markdown)
            </h2>
            <div className="space-y-4">
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Lesson Title (e.g. Introduction to Hooks)"
                className="w-full bg-gray-950 border border-gray-700 p-4 rounded-2xl text-xl font-bold focus:ring-2 ring-purple-500 outline-none transition-all"
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="# Use Markdown! &#10;## Headers &#10;```javascript &#10; const code = 'blocks'; &#10;```"
                rows={12}
                className="w-full bg-gray-950 border border-gray-700 p-4 rounded-2xl outline-none focus:ring-2 ring-purple-500 font-mono text-sm leading-relaxed"
              />
              <button
                disabled={loading}
                onClick={handleUploadNote}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-4 rounded-2xl font-black text-lg transition shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <FileText />}
                {loading ? "Publishing..." : "Publish Lesson"}
              </button>
            </div>
          </div>

          {/* Note List Container */}
          {notes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notes.map((note) => (
                <div key={note.id} className="flex justify-between items-center bg-gray-800/80 border border-gray-700 p-4 rounded-2xl group hover:border-indigo-500/50 transition-all">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="font-bold truncate">{note.title}</span>
                  </div>
                  <button onClick={() => deleteNote(note.id)} className="text-gray-500 hover:text-red-400 p-2 transition opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
