// src/components/NotesPanel.js
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function NotesPanel({ darkMode, courseId }) {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch topics
  useEffect(() => {
    if (!courseId) return;

    const fetchTopics = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("course_id", courseId)
        .order("title");

      if (!error) setTopics(data || []);
      setLoading(false);
    };

    fetchTopics();
  }, [courseId]);

  // Fetch notes
  useEffect(() => {
    if (!selectedTopic) return;

    const fetchNotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("topic_id", selectedTopic.id)
        .order("title");

      if (!error) setNotes(data || []);
      setLoading(false);
    };

    fetchNotes();
  }, [selectedTopic]);

  const openNote = async (noteId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single();

    if (!error) setSelectedNote(data);
    setLoading(false);
  };

  if (loading && !selectedNote) {
    return <p className="p-6 text-gray-400">Loading...</p>;
  }

  return (
    <div className={`h-screen flex ${darkMode ? "dark bg-gray-950 text-white" : "bg-gray-100 text-gray-900"}`}>

      {/* ================= SIDEBAR ================= */}
      <div className="w-72 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">

        <h2 className="text-xl font-black mb-4 text-primary">
          📘 Notes
        </h2>

        {/* TOPICS */}
        {!selectedTopic && (
          <div className="space-y-2">
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTopic(t);
                  setSelectedNote(null);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all
                ${darkMode
                    ? "bg-gray-800 hover:bg-primary hover:text-white"
                    : "bg-white hover:bg-primary hover:text-white shadow"
                  }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        {/* NOTES */}
        {selectedTopic && !selectedNote && (
          <div>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-sm mb-3 text-secondary hover:underline"
            >
              ← Topics
            </button>

            <div className="space-y-2">
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNote(n.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all
                  ${darkMode
                      ? "bg-gray-800 hover:bg-accent hover:text-black"
                      : "bg-white hover:bg-accent hover:text-black shadow"
                    }`}
                >
                  {n.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= CONTENT ================= */}
      <div className="flex-1 p-6 overflow-y-auto">

        {!selectedNote && (
          <div className="h-full flex items-center justify-center text-gray-400 text-lg">
            Select a note to start learning 🚀
          </div>
        )}

        {selectedNote && (
          <div className="max-w-4xl mx-auto">

            <button
              onClick={() => setSelectedNote(null)}
              className="mb-4 text-sm text-secondary hover:underline"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-black mb-6 text-primary">
              {selectedNote.title}
            </h1>

            <div className={`p-6 rounded-2xl shadow-xl transition
              ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-white border"}
            `}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mb-4 text-primary">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mb-3 text-secondary">{children}</h2>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed">{children}</p>
                  ),
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={darkMode ? materialDark : vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-pink-500">
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {selectedNote.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
