// // // src/components/NotesPanel.js
// // import React, { useEffect, useState } from "react";
// // import { supabase } from "../../supabase";
// // import ReactMarkdown from "react-markdown";
// // import remarkGfm from "remark-gfm";
// // import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// // import {
// //   materialDark,
// //   vscDarkPlus,
// // } from "react-syntax-highlighter/dist/esm/styles/prism";

// // export default function NotesPanel({ darkMode, courseId }) {
// //   const [topics, setTopics] = useState([]);
// //   const [selectedTopic, setSelectedTopic] = useState(null);
// //   const [notes, setNotes] = useState([]);
// //   const [selectedNote, setSelectedNote] = useState(null);
// //   const [loading, setLoading] = useState(true);

// //   // =========================
// //   // FETCH TOPICS
// //   // =========================
// //   useEffect(() => {
// //     if (!courseId) return;

// //     setLoading(true);

// //     const fetchTopics = async () => {
// //       const { data, error } = await supabase
// //         .from("topics")
// //         .select("*")
// //         .eq("course_id", courseId);

// //       if (!error) {
// //         setTopics(data || []);
// //       }

// //       setLoading(false);
// //     };

// //     fetchTopics();
// //   }, [courseId]);

// //   // =========================
// //   // FETCH NOTES
// //   // =========================
// //   useEffect(() => {
// //     if (!selectedTopic) return;

// //     setLoading(true);

// //     const fetchNotes = async () => {
// //       const { data, error } = await supabase
// //         .from("notes")
// //         .select("*")
// //         .eq("topic_id", selectedTopic.id)
// //         .order("lesson_order", { ascending: true });

// //       if (!error) {
// //         setNotes(data || []);
// //       }

// //       setLoading(false);
// //     };

// //     fetchNotes();
// //   }, [selectedTopic]);

// //   // =========================
// //   // OPEN NOTE
// //   // =========================
// //   const openNote = async (noteId) => {
// //     setLoading(true);

// //     const { data, error } = await supabase
// //       .from("notes")
// //       .select("*")
// //       .eq("id", noteId)
// //       .single();

// //     if (!error) {
// //       setSelectedNote(data);
// //     }

// //     setLoading(false);
// //   };

// //   // =========================
// //   // LOADING
// //   // =========================
// //   if (loading && !selectedNote) {
// //     return <p className="p-4 text-gray-500">Loading...</p>;
// //   }

// //   return (
// //     <div className="p-4 h-full flex flex-col bg-background dark:bg-gray-900 rounded-lg overflow-y-auto transition-colors">
// //       <h2 className="text-lg font-bold mb-4 text-text dark:text-gray-100">
// //         Notes
// //       </h2>

// //       {/* =========================
// //           TOPICS LIST
// //       ========================= */}
// //       {!selectedTopic && !selectedNote && (
// //         <div className="flex flex-col gap-2">
// //           {topics.map((t) => (
// //             <button
// //               key={t.id}
// //               onClick={() => setSelectedTopic(t)}
// //               className="p-3 rounded-lg bg-primary dark:bg-accent shadow-card hover:bg-primary hover:text-white transition"
// //             >
// //               {t.title || t.id}
// //             </button>
// //           ))}
// //         </div>
// //       )}

// //       {/* =========================
// //           NOTES LIST
// //       ========================= */}
// //       {selectedTopic && !selectedNote && (
// //         <div className="flex flex-col gap-2">
// //           <button
// //             onClick={() => setSelectedTopic(null)}
// //             className="mb-2 text-sm text-primary hover:underline self-start"
// //           >
// //             ← Back to topics
// //           </button>

// //           {notes.map((n) => (
// //             <button
// //               key={n.id}
// //               onClick={() => openNote(n.id)}
// //               className="p-3 rounded-lg bg-primary dark:bg-accent shadow-card hover:bg-primary hover:text-white transition text-left"
// //             >
// //               <div className="font-semibold">
// //                 {n.lesson_order ? `${n.lesson_order}. ` : ""}
// //                 {n.title || n.id}
// //               </div>
// //             </button>
// //           ))}
// //         </div>
// //       )}

// //       {/* =========================
// //           SINGLE NOTE VIEW
// //       ========================= */}
// //       {selectedNote && (
// //         <div className="flex flex-col h-full">
// //           <button
// //             onClick={() => setSelectedNote(null)}
// //             className="mb-2 text-sm text-primary hover:underline self-start"
// //           >
// //             ← Back to notes
// //           </button>

// //           {/* TITLE */}
// //           <h3 className="text-2xl font-bold mb-4 text-text dark:text-gray-100">
// //             {selectedNote.title}
// //           </h3>

// //           {/* THUMBNAIL */}
// //           {selectedNote.thumbnail_url && (
// //             <img
// //               src={selectedNote.thumbnail_url}
// //               alt={selectedNote.title}
// //               className="w-full max-h-[300px] object-cover rounded-xl mb-4"
// //             />
// //           )}

// //           {/* VIDEO */}
// //           {selectedNote.video_url && (
// //             <video
// //               controls
// //               className="w-full rounded-xl mb-5 bg-black"
// //             >
// //               <source
// //                 src={selectedNote.video_url}
// //                 type="video/mp4"
// //               />
// //               Your browser does not support videos.
// //             </video>
// //           )}

// //           {/* NOTE CONTENT */}
// //           <div className="prose dark:prose-invert max-w-full overflow-x-auto p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
// //             <ReactMarkdown
// //               remarkPlugins={[remarkGfm]}
// //               components={{
// //                 code({
// //                   node,
// //                   inline,
// //                   className,
// //                   children,
// //                   ...props
// //                 }) {
// //                   const match = /language-(\w+)/.exec(className || "");

// //                   return !inline && match ? (
// //                     <SyntaxHighlighter
// //                       style={darkMode ? materialDark : vscDarkPlus}
// //                       language={match[1]}
// //                       PreTag="div"
// //                       {...props}
// //                     >
// //                       {String(children).replace(/\n$/, "")}
// //                     </SyntaxHighlighter>
// //                   ) : (
// //                     <code
// //                       className="bg-gray-700 text-green-300 px-1 rounded-sm font-mono"
// //                       {...props}
// //                     >
// //                       {children}
// //                     </code>
// //                   );
// //                 },
// //               }}
// //             >
// //               {selectedNote.content || ""}
// //             </ReactMarkdown>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }
// // src/components/NotesPanel.js
// // import React, { useEffect, useState } from "react";
// // import { supabase } from "../../supabase";
// // import ReactMarkdown from "react-markdown";
// // import remarkGfm from "remark-gfm";
// // import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// // import {
// //   materialDark,
// //   vscDarkPlus,
// // } from "react-syntax-highlighter/dist/esm/styles/prism";

// // export default function NotesPanel({ darkMode, courseId }) {
// //   const [topics, setTopics] = useState([]);
// //   const [selectedTopic, setSelectedTopic] = useState(null);
// //   const [notes, setNotes] = useState([]);
// //   const [selectedNote, setSelectedNote] = useState(null);
// //   const [loading, setLoading] = useState(true);

// //   // =========================
// //   // FETCH TOPICS
// //   // =========================
// //   useEffect(() => {
// //     if (!courseId) return;

// //     setLoading(true);

// //     const fetchTopics = async () => {
// //       const { data, error } = await supabase
// //         .from("topics")
// //         .select("*")
// //         .eq("course_id", courseId);

// //       if (!error) {
// //         setTopics(data || []);
// //       }

// //       setLoading(false);
// //     };

// //     fetchTopics();
// //   }, [courseId]);

// //   // =========================
// //   // FETCH NOTES
// //   // =========================
// //   useEffect(() => {
// //     if (!selectedTopic) return;

// //     setLoading(true);

// //     const fetchNotes = async () => {
// //       const { data, error } = await supabase
// //         .from("notes")
// //         .select("*")
// //         .eq("topic_id", selectedTopic.id)
// //         .order("lesson_order", { ascending: true });

// //       if (!error) {
// //         setNotes(data || []);
// //       }

// //       setLoading(false);
// //     };

// //     fetchNotes();
// //   }, [selectedTopic]);

// //   // =========================
// //   // OPEN NOTE
// //   // =========================
// //   const openNote = async (noteId) => {
// //     setLoading(true);

// //     const { data, error } = await supabase
// //       .from("notes")
// //       .select("*")
// //       .eq("id", noteId)
// //       .single();

// //     if (!error) {
// //       setSelectedNote(data);
// //     }

// //     setLoading(false);
// //   };

// //   // =========================
// //   // LOADING
// //   // =========================
// //   if (loading && !selectedNote) {
// //     return <p className="p-4 text-gray-500">Loading...</p>;
// //   }

// //   return (
// //     <div className="p-4 h-full flex flex-col bg-background dark:bg-gray-900 rounded-lg overflow-y-auto transition-colors">
// //       <h2 className="text-lg font-bold mb-4 text-text dark:text-gray-100">
// //         Notes
// //       </h2>

// //       {/* =========================
// //           TOPICS LIST
// //       ========================= */}
// //       {!selectedTopic && !selectedNote && (
// //         <div className="flex flex-col gap-2">
// //           {topics.map((t) => (
// //             <button
// //               key={t.id}
// //               onClick={() => setSelectedTopic(t)}
// //               className="p-3 rounded-lg bg-primary dark:bg-accent shadow-card hover:bg-primary hover:text-white transition"
// //             >
// //               {t.title || t.id}
// //             </button>
// //           ))}
// //         </div>
// //       )}

// //       {/* =========================
// //           NOTES LIST
// //       ========================= */}
// //       {selectedTopic && !selectedNote && (
// //         <div className="flex flex-col gap-2">
// //           <button
// //             onClick={() => setSelectedTopic(null)}
// //             className="mb-2 text-sm text-primary hover:underline self-start"
// //           >
// //             ← Back to topics
// //           </button>

// //           {notes.map((n) => (
// //             <button
// //               key={n.id}
// //               onClick={() => openNote(n.id)}
// //               className="p-3 rounded-lg bg-primary dark:bg-accent shadow-card hover:bg-primary hover:text-white transition text-left"
// //             >
// //               <div className="font-semibold">
// //                 {n.lesson_order ? `${n.lesson_order}. ` : ""}
// //                 {n.title || n.id}
// //               </div>
// //             </button>
// //           ))}
// //         </div>
// //       )}

// //       {/* =========================
// //           SINGLE NOTE VIEW
// //       ========================= */}
// //       {selectedNote && (
// //         <div className="flex flex-col h-full">
// //           <button
// //             onClick={() => setSelectedNote(null)}
// //             className="mb-2 text-sm text-primary hover:underline self-start"
// //           >
// //             ← Back to notes
// //           </button>

// //           {/* TITLE */}
// //           <h3 className="text-2xl font-bold mb-4 text-text dark:text-gray-100">
// //             {selectedNote.title}
// //           </h3>

// //           {/* THUMBNAIL */}
// //           {selectedNote.thumbnail_url && (
// //             <img
// //               src={selectedNote.thumbnail_url}
// //               alt={selectedNote.title}
// //               className="w-full max-h-[300px] object-cover rounded-xl mb-4"
// //             />
// //           )}

// //           {/* VIDEO */}
// //           {selectedNote.video_url && (
// //             <video
// //               controls
// //               className="w-full rounded-xl mb-5 bg-black"
// //             >
// //               <source
// //                 src={selectedNote.video_url}
// //                 type="video/mp4"
// //               />
// //               Your browser does not support videos.
// //             </video>
// //           )}

// //           {/* NOTE CONTENT */}
// //           <div
// //             className={`prose max-w-full overflow-x-auto p-4 rounded-xl border
// //             ${
// //               darkMode
// //                 ? "bg-gray-900 text-white border-gray-700 prose-headings:text-white prose-p:text-gray-200 prose-strong:text-white prose-li:text-gray-200"
// //                 : "bg-white text-gray-900 border-gray-300 prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-black prose-li:text-gray-800"
// //             }`}
// //           >
// //             <ReactMarkdown
// //               remarkPlugins={[remarkGfm]}
// //               components={{
// //                 code({
// //                   node,
// //                   inline,
// //                   className,
// //                   children,
// //                   ...props
// //                 }) {
// //                   const match = /language-(\w+)/.exec(className || "");

// //                   return !inline && match ? (
// //                     <SyntaxHighlighter
// //                       style={darkMode ? materialDark : vscDarkPlus}
// //                       language={match[1]}
// //                       PreTag="div"
// //                       {...props}
// //                     >
// //                       {String(children).replace(/\n$/, "")}
// //                     </SyntaxHighlighter>
// //                   ) : (
// //                     <code
// //                       className="bg-gray-700 text-green-300 px-1 rounded-sm font-mono"
// //                       {...props}
// //                     >
// //                       {children}
// //                     </code>
// //                   );
// //                 },
// //               }}
// //             >
// //               {String(selectedNote?.content || "")}
// //             </ReactMarkdown>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }
// // src/components/NotesPanel.js
// import React, { useEffect, useState } from "react";
// // import { supabase } from "../supabaseClient"; // initialize Supabase client
// import { supabase } from "../../supabase";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { materialDark, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// export default function NotesPanel({ darkMode, courseId }) {
//   const [topics, setTopics] = useState([]);
//   const [selectedTopic, setSelectedTopic] = useState(null);
//   const [notes, setNotes] = useState([]);
//   const [selectedNote, setSelectedNote] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Fetch topics
//   useEffect(() => {
//     if (!courseId) return;
//     setLoading(true);

//     const fetchTopics = async () => {
//       const { data, error } = await supabase
//         .from("topics")
//         .select("*")
//         .eq("course_id", courseId);
//       if (!error) setTopics(data || []);
//       setLoading(false);
//     };

//     fetchTopics();
//   }, [courseId]);

//   // Fetch notes for selected topic
//   useEffect(() => {
//     if (!selectedTopic) return;
//     setLoading(true);

//     const fetchNotes = async () => {
//       const { data, error } = await supabase
//         .from("notes")
//         .select("*")
//         .eq("topic_id", selectedTopic.id);
//       if (!error) setNotes(data || []);
//       setLoading(false);
//     };

//     fetchNotes();
//   }, [selectedTopic]);

//   const openNote = async (noteId) => {
//     setLoading(true);
//     const { data, error } = await supabase
//       .from("notes")
//       .select("*")
//       .eq("id", noteId)
//       .single();
//     if (!error) setSelectedNote(data);
//     setLoading(false);
//   };

//   if (loading && !selectedNote)
//     return <p className="p-4 text-gray-500">Loading...</p>;

//   return (
//     <div className="p-4 h-full flex flex-col bg-background dark:bg-gray-900 rounded-lg overflow-y-auto transition-colors">
//       <h2 className="text-lg font-bold mb-4 text-text dark:text-gray-100">Notes</h2>

//       {!selectedTopic && !selectedNote && (
//         <div className="flex flex-col gap-2">
//           {topics.map((t) => (
//             <button
//               key={t.id}
//               onClick={() => setSelectedTopic(t)}
//               className="p-3 rounded-lg bg-primary dark:bg-accent shadow-card hover:bg-primary hover:text-white transition"
//             >
//               {t.title || t.id}
//             </button>
//           ))}
//         </div>
//       )}

//       {selectedTopic && !selectedNote && (
//         <div className="flex flex-col gap-2">
//           <button
//             onClick={() => setSelectedTopic(null)}
//             className="mb-2 text-sm text-primary hover:underline self-start"
//           >
//             ← Back to topics
//           </button>
//           {notes.map((n) => (
//             <button
//               key={n.id}
//               onClick={() => openNote(n.id)}
//               className="p-3 rounded-lg bg-primary dark:bg-accent shadow-card hover:bg-primary hover:text-white transition"
//             >
//               {n.title || n.id}
//             </button>
//           ))}
//         </div>
//       )}

//       {selectedNote && (
//         <div className="flex flex-col h-full">
//           <button
//             onClick={() => setSelectedNote(null)}
//             className="mb-2 text-sm text-primary hover:underline self-start"
//           >
//             ← Back to notes
//           </button>

//           <h3 className="text-xl font-semibold mb-2 text-text dark:text-gray-100">
//             {selectedNote.title}
//           </h3>

//           <div className="prose dark:prose-invert max-w-full overflow-x-auto p-3 rounded-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
//             <ReactMarkdown
//               remarkPlugins={[remarkGfm]}
//               components={{
//                 code({ node, inline, className, children, ...props }) {
//                   const match = /language-(\w+)/.exec(className || "");
//                   return !inline && match ? (
//                     <SyntaxHighlighter
//                       style={darkMode ? materialDark : vscDarkPlus}
//                       language={match[1]}
//                       PreTag="div"
//                       {...props}
//                     >
//                       {String(children).replace(/\n$/, "")}
//                     </SyntaxHighlighter>
//                   ) : (
//                     <code
//                       className="bg-gray-700 text-green-300 px-1 rounded-sm font-mono"
//                       {...props}
//                     >
//                       {children}
//                     </code>
//                   );
//                 },
//               }}
//             >
//               {selectedNote.content}
//             </ReactMarkdown>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  materialDark,
  vscDarkPlus,
} from 'react-syntax-highlighter/dist/esm/styles/prism'

// Set darkMode fallback to true right inside the component contract
export default function NotesPanel({ darkMode = true, courseId }) {
  const [topics, setTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [loading, setLoading] = useState(false)

  // CRITICAL: Forces dark mode as the app default immediately upon layout mount
  useEffect(() => {
    const rootWindow = window.document.documentElement

    // Check if user has explicitly saved a preference, otherwise default to dark (true)
    const savedTheme = localStorage.getItem('theme')
    const shoulderThemeDark = savedTheme ? savedTheme === 'dark' : true

    if (shoulderThemeDark) {
      rootWindow.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      rootWindow.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [])

  // Fetch topics
  useEffect(() => {
    if (!courseId) return
    setLoading(true)
    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('course_id', courseId)
      if (!error) setTopics(data || [])
      setLoading(false)
    }
    fetchTopics()
  }, [courseId])

  // Fetch notes
  useEffect(() => {
    if (!selectedTopic) return
    setLoading(true)
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('topic_id', selectedTopic.id)
      if (!error) setNotes(data || [])
      setLoading(false)
    }
    fetchNotes()
  }, [selectedTopic])

  const openNote = async (noteId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single()
    if (!error) setSelectedNote(data)
    setLoading(false)
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 p-6 font-sans text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Header Block */}
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Course Notebook
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {selectedNote
              ? 'Viewing Note'
              : selectedTopic
                ? 'Select a Note'
                : 'Select a Topic'}
          </p>
        </div>

        {loading && (
          <div className="flex animate-pulse items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            Syncing...
          </div>
        )}
      </div>

      {/* Screen 1: Topic Grid */}
      {!loading && !selectedTopic && !selectedNote && (
        <div className="grid grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t)}
              className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Topic
              </div>
              <div className="font-semibold text-slate-800 group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400">
                {t.title || `Topic ID: ${t.id}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Screen 2: Notes List */}
      {!loading && selectedTopic && !selectedNote && (
        <div className="flex h-full flex-col overflow-y-auto">
          <button
            onClick={() => setSelectedTopic(null)}
            className="mb-4 self-start text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            ← Back to all topics
          </button>
          <div className="flex flex-col gap-2">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => openNote(n.id)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
              >
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {n.title || `Document ${n.id}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Screen 3: Custom Markdown Document Viewer (No Prose Dependency) */}
      {!loading && selectedNote && (
        <div className="flex h-full flex-col overflow-y-auto">
          <button
            onClick={() => setSelectedNote(null)}
            className="mb-4 self-start text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            ← Back to notes list
          </button>

          <h3 className="mb-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {selectedNote.title}
          </h3>

          {/* Clean base document card container using direct explicit tracking text styles */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed text-slate-800 dark:text-slate-200">
                    {children}
                  </p>
                ),
                h1: ({ children }) => (
                  <h1 className="mb-3 mt-6 border-b border-slate-100 pb-1 text-2xl font-bold text-slate-900 dark:border-slate-800 dark:text-white">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-2 mt-5 text-xl font-bold text-slate-900 dark:text-white">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-lg font-bold text-slate-900 dark:text-white">
                    {children}
                  </h3>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 list-disc space-y-1 pl-6 text-slate-800 dark:text-slate-200">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 list-decimal space-y-1 pl-6 text-slate-800 dark:text-slate-200">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-4 border-l-4 border-slate-300 pl-4 italic text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {children}
                  </blockquote>
                ),

                // Code block renderer with corrected array string mapping index fix
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={darkMode ? materialDark : vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="my-4 rounded-xl border border-slate-200 text-sm shadow-inner dark:border-slate-800"
                      customStyle={{ padding: '1rem', margin: '1rem 0' }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="rounded-sm border border-slate-200/60 bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-pink-600 dark:border-slate-700/50 dark:bg-slate-800 dark:text-emerald-400">
                      {children}
                    </code>
                  )
                },
              }}
            >
              {selectedNote.content || '*Empty document.*'}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
