import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Sun, Moon, ChevronLeft, CheckCircle, Circle } from "lucide-react";
import { supabase } from "../../supabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import CountdownRing from "../CountdownRing";

// --- Sub-Component: Sidebar (Only shows when a topic is selected) ---
function NotesNavigation({ topic, onSelectNote, darkMode, completedNotes, onBack }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!topic) return;
    const fetchNotes = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("topic_id", topic.id)
        .order("created_at");
      setNotes(data || []);
      setLoading(false);
    };
    fetchNotes();
  }, [topic]);

  if (loading) return <p className="p-4 opacity-50 text-sm">Loading notes...</p>;

  return (
    <div className="flex flex-col h-full">
      <button 
        onClick={onBack} 
        className="flex items-center gap-1 mb-6 text-sm font-bold text-indigo-500 hover:underline"
      >
        <ChevronLeft size={16} /> Back to Topics
      </button>
      
      <h3 className={`text-xs uppercase tracking-widest font-black mb-4 px-2 ${darkMode ? "text-gray-400" : "text-gray-500"} opacity-70`}>
        {topic.title}
      </h3>
      
      <div className="flex flex-col gap-2 overflow-y-auto pr-2">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelectNote(n)}
            className={`flex items-center justify-between w-full text-left p-3 rounded-xl font-bold transition-all border-l-4 ${
              darkMode
                ? "bg-gray-700 text-gray-200 border-indigo-500 hover:bg-gray-600"
                : "bg-white text-gray-800 border-yellow-400 shadow-sm hover:bg-yellow-50"
            }`}
          >
            <span className="truncate text-sm">{n.title}</span>
            {completedNotes.includes(n.id) && <CheckCircle size={16} className="text-green-500 ml-2" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Main Component: LearningPage ---
export default function LearningPage({ user }) {
  const navigate = useNavigate();
  const { id: courseId } = useParams();

  const [darkMode, setDarkMode] = useState(true);
  const [classStarted, setClassStarted] = useState(false);
  const [nextClass, setNextClass] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null); 
  const [selectedNote, setSelectedNote] = useState(null);
  const [completedNotes, setCompletedNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all topics for this course
  useEffect(() => {
    if (!courseId) return;
    const fetchTopics = async () => {
      const { data } = await supabase
        .from("topics")
        .select("*")
        .eq("course_id", courseId)
        .order("title");
      setTopics(data || []);
    };
    fetchTopics();
  }, [courseId]);

  // Fetch progress tracking for the current user
  useEffect(() => {
    if (!user) return;
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from("user_notes_progress")
        .select("note_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setCompletedNotes(data.map(item => item.note_id));
      }
    };
    fetchProgress();
  }, [user]);

  // Fetch upcoming scheduled class live feedback
  useEffect(() => {
    if (!user) return;
    const fetchNextClass = async () => {
      const { data, error } = await supabase.rpc("get_next_class", {
        user_id: user.id,
        role: user.role,
      });
      if (!error && data) setNextClass(data);
    };
    fetchNextClass();
  }, [user]);

  // Handle Mark as Completed logic
  const toggleCompletion = async (noteId) => {
    if (!user || isUpdating) return;
    setIsUpdating(true);

    const isDone = completedNotes.includes(noteId);

    if (isDone) {
      const { error } = await supabase
        .from("user_notes_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("note_id", noteId);

      if (!error) setCompletedNotes(prev => prev.filter(id => id !== noteId));
    } else {
      const { error } = await supabase
        .from("user_notes_progress")
        .insert([{ user_id: user.id, note_id: noteId }]);

      if (!error) setCompletedNotes(prev => [...prev, noteId]);
    }
    setIsUpdating(false);
  };

  return (
    <div className={`min-h-screen font-poppins flex flex-col transition-colors duration-300 ${darkMode ? "bg-gray-900 text-gray-100" : "bg-orange-50 text-gray-800"}`}>
      {/* Header */}
      <div className={`flex justify-between items-center p-3 border-b-4 z-10 transition-colors duration-300 ${
        darkMode ? "border-gray-700 bg-gray-800" : "border-yellow-400 bg-white"
      }`}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black shadow-lg"
        >
          <ArrowLeft size={22} strokeWidth={3} />
          <span className="hidden md:inline">Dashboard</span>
        </button>

        <div className="flex items-center gap-4">
          {classStarted && nextClass && (
            <div className="flex items-center gap-3">
              <CountdownRing startTime={nextClass.start_time} onStart={() => setClassStarted(true)} size={40} />
              <p className="hidden sm:block text-sm font-bold">{nextClass.class_title}</p>
            </div>
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-2xl border-2 transition-colors duration-300 ${
              darkMode ? "border-gray-600 bg-gray-700 text-yellow-400" : "border-yellow-200 bg-yellow-50 text-orange-500"
            }`}
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Only visible if a topic is selected */}
        <div className={`w-1/5 min-w-[250px] border-r-4 p-4 transition-colors duration-300 ${darkMode ? "border-gray-700 bg-gray-800" : "border-yellow-400 bg-white"}`}>
          {selectedTopic ? (
            <NotesNavigation
              topic={selectedTopic}
              darkMode={darkMode}
              completedNotes={completedNotes}
              onSelectNote={setSelectedNote}
              onBack={() => { setSelectedTopic(null); setSelectedNote(null); }}
            />
          ) : (
            <p className={`text-sm p-2 font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Select a module to view lessons.</p>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-10">
          {!selectedTopic ? (
            /* Topic Selection Screen (Fully Adaptable Layout) */
            <div className="max-w-4xl mx-auto">
              <h2 className={`text-3xl font-black mb-8 ${darkMode ? "text-white" : "text-gray-900"}`}>Choose a Topic to Start</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t)}
                    className={`p-8 rounded-3xl border-2 transition-all text-left shadow-xl hover:-translate-y-1 transform duration-200 ${
                      darkMode 
                        ? "bg-gray-800 border-gray-700 text-white hover:border-indigo-400" 
                        : "bg-white border-yellow-100 text-gray-900 hover:border-indigo-500"
                    }`}
                  >
                    <h3 className="text-xl font-bold mb-2">{t.title}</h3>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Click to view all lessons in this module</p>
                  </button>
                ))}
              </div>
            </div>
          ) : selectedNote ? (
            /* Note Content Screen (Enhanced Visual Layout) */
            <div className="max-w-4xl mx-auto">
              <div className={`p-8 rounded-3xl shadow-2xl border-2 mb-6 transition-colors duration-300 ${
                darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-yellow-100"
              }`}>
                <h2 className="text-3xl font-black mb-6 text-indigo-500">{selectedNote.title}</h2>
                
                <div className={`prose ${darkMode ? "prose-invert text-gray-200" : "text-gray-800"} max-w-none mb-10 font-medium leading-relaxed`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={darkMode ? materialDark : vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-xl my-4 shadow-inner border border-opacity-10"
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-indigo-100 dark:bg-gray-700 text-indigo-600 dark:text-green-300 px-2 py-0.5 rounded font-mono font-bold" {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {selectedNote.content}
                  </ReactMarkdown>
                </div>

                {/* --- Mark as Completed Button --- */}
                <hr className={`mb-8 ${darkMode ? "border-gray-700" : "border-gray-200"}`} />
                <button
                  onClick={() => toggleCompletion(selectedNote.id)}
                  disabled={isUpdating}
                  className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-black text-lg transition-all transform active:scale-95 ${
                    completedNotes.includes(selectedNote.id)
                      ? "bg-green-500 text-white shadow-[0_5px_0_rgb(21,128,61)] mb-[5px]"
                      : "bg-indigo-500 text-white shadow-[0_5px_0_rgb(67,56,202)] mb-[5px] hover:bg-indigo-600"
                  } disabled:opacity-50`}
                >
                  {completedNotes.includes(selectedNote.id) ? (
                    <><CheckCircle size={24} strokeWidth={3} /> Lesson Completed!</>
                  ) : (
                    <><Circle size={24} strokeWidth={3} /> Mark as Completed</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Empty State if topic is selected but no note clicked */
            <div className={`h-full flex flex-col justify-center items-center ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              <p className="text-2xl font-black">Choose a lesson from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
