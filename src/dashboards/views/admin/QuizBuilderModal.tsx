import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronUp, FileText, HelpCircle } from "lucide-react";
import { supabase } from "../../../supabase";
import toast from "react-hot-toast";

export default function QuizBuilderModal({ selectedLesson, selectedCourse, onClose }) {
  const [lessonContentType, setLessonContentType] = useState("notes");
  
  // Notes State
  const [lessonNoteTitle, setLessonNoteTitle] = useState("");
  const [lessonNoteContent, setLessonNoteContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Quiz State (Per-Lesson)
  const [savedQuizzesCount, setSavedQuizzesCount] = useState(0);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState([
    { question_text: "", options: ["", "", "", ""], correct_option_index: 0 }
  ]);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Accordion state - Default to null (collapsed)
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    if (selectedLesson && selectedCourse) {
      fetchLessonData();
    }
  }, [selectedLesson]);

  const fetchLessonData = async () => {
    try {
      // 1. Fetch Notes specifically linked to lesson_id, with fallback to title matching if legacy
      const { data: noteData } = await supabase
        .from("notes")
        .select("*")
        .eq("course_id", selectedCourse.id)
        .eq("lesson_id", selectedLesson.id)
        .maybeSingle();

      if (noteData) {
        setLessonNoteTitle(noteData.title || selectedLesson.title);
        setLessonNoteContent(noteData.content || "");
        setLessonVideoUrl(noteData.video_url || "");
      } else {
        // Fallback check for older records matched by title
        const { data: fallbackNote } = await supabase
          .from("notes")
          .select("*")
          .eq("course_id", selectedCourse.id)
          .ilike("title", `%${selectedLesson.title}%`)
          .maybeSingle();

        if (fallbackNote) {
          setLessonNoteTitle(fallbackNote.title || selectedLesson.title);
          setLessonNoteContent(fallbackNote.content || "");
          setLessonVideoUrl(fallbackNote.video_url || "");
        } else {
          setLessonNoteTitle(selectedLesson.title);
          setLessonNoteContent("");
          setLessonVideoUrl("");
        }
      }

      // 2. Fetch Quiz for this specific lesson
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*, quiz_questions(*)")
        .eq("lesson_id", selectedLesson.id)
        .maybeSingle();

      if (quizData) {
        setSavedQuizzesCount(1);
        setSelectedQuizId(quizData.id);
        setQuizTitle(quizData.title);
        setPassingScore(quizData.passing_score || 70);
        if (quizData.quiz_questions && quizData.quiz_questions.length > 0) {
          // Sort questions by position ascending to keep order stable
          const sortedQuestions = [...quizData.quiz_questions].sort((a, b) => (a.position || 0) - (b.position || 0));
          setQuestions(sortedQuestions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            options: q.options,
            correct_option_index: q.correct_option_index
          })));
        } else {
          setQuestions([{ question_text: "", options: ["", "", "", ""], correct_option_index: 0 }]);
        }
      } else {
        setSavedQuizzesCount(0);
        setSelectedQuizId("");
        setQuizTitle(`${selectedLesson.title} Assessment`);
        setPassingScore(70);
        setQuestions([{ question_text: "", options: ["", "", "", ""], correct_option_index: 0 }]);
      }
      setExpandedQuestion(null);
    } catch (err) {
      console.error("Error fetching lesson content:", err);
    }
  };
{/*
  // const handleSaveNotes = async (e) => {
  //   e.preventDefault();
  //   setSavingNotes(true);
  //   try {
  //     // Check existing note by lesson_id first
  //     const { data: existing } = await supabase
  //       .from("notes")
  //       .select("id")
  //       .eq("course_id", selectedCourse.id)
  //       .eq("lesson_id", selectedLesson.id)
  //       .maybeSingle();

  //     let error;
  //     const notePayload = {
  //       course_id: selectedCourse.id,
  //       lesson_id: selectedLesson.id,
  //       title: lessonNoteTitle.trim() || selectedLesson.title,
  //       content: lessonNoteContent,
  //       video_url: lessonVideoUrl.trim() || null
  //     };

  //     if (existing) {
  //       const res = await supabase
  //         .from("notes")
  //         .update(notePayload)
  //         .eq("id", existing.id);
  //       error = res.error;
  //     } else {
  //       const res = await supabase
  //         .from("notes")
  //         .insert([notePayload]);
  //       error = res.error;
  //     }

  //     if (error) throw error;
  //     toast.success("Lesson notes saved successfully!");
  //     fetchLessonData();
  //   } catch (err) {
  //     toast.error("Failed to save notes: " + err.message);
  //   } finally {
  //     setSavingNotes(false);
  //   }
  // };*/}
const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!selectedCourse?.id || !selectedLesson?.id) {
      toast.error("Missing course or lesson ID.");
      return;
    }

    setSavingNotes(true);
    try {
      const notePayload = {
        course_id: selectedCourse.id,
        lesson_id: selectedLesson.id,
        title: lessonNoteTitle.trim() || selectedLesson.title,
        content: lessonNoteContent,
        video_url: lessonVideoUrl.trim() || null
      };

      const { error } = await supabase
        .from("notes")
        .upsert(notePayload, { onConflict: 'lesson_id' });

      if (error) throw error;
      toast.success("Lesson notes saved successfully!");
      fetchLessonData();
    } catch (err) {
      console.error("Save notes error details:", err);
      toast.error("Failed to save notes: " + err.message);
    } finally {
      setSavingNotes(false);
    }
  };
 // const handleSaveNotes = async (e) => {
 //    e.preventDefault();
 //    if (!selectedCourse?.id || !selectedLesson?.id) {
 //      toast.error("Missing course or lesson ID.");
 //      return;
 //    }

 //    setSavingNotes(true);
 //    try {
 //      // Safely check for existing note using limit(1) to avoid multi-row crashes
 //      const { data: existingRows, error: fetchErr } = await supabase
 //        .from("notes")
 //        .select("id")
 //        .eq("course_id", selectedCourse.id)
 //        .eq("lesson_id", selectedLesson.id)
 //        .limit(1);

 //      if (fetchErr) throw fetchErr;

 //      const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

 //      let error;
 //      const notePayload = {
 //        course_id: selectedCourse.id,
 //        lesson_id: selectedLesson.id,
 //        title: lessonNoteTitle.trim() || selectedLesson.title,
 //        content: lessonNoteContent,
 //        video_url: lessonVideoUrl.trim() || null
 //      };

 //      if (existing) {
 //        const res = await supabase
 //          .from("notes")
 //          .update(notePayload)
 //          .eq("id", existing.id);
 //        error = res.error;
 //      } else {
 //        const res = await supabase
 //          .from("notes")
 //          .insert([notePayload]);
 //        error = res.error;
 //      }

 //      if (error) throw error;
 //      toast.success("Lesson notes saved successfully!");
 //      fetchLessonData();
 //    } catch (err) {
 //      console.error("Save notes error details:", err);
 //      toast.error("Failed to save notes: " + err.message);
 //    } finally {
 //      setSavingNotes(false);
 //    }
 //  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    setSavingQuiz(true);

    try {
      let quizId = selectedQuizId;

      if (quizId) {
        const { error: updateErr } = await supabase
          .from("quizzes")
          .update({
            title: quizTitle.trim() || `${selectedLesson.title} Assessment`,
            passing_score: parseInt(passingScore, 10) || 70
          })
          .eq("id", quizId);
        if (updateErr) throw updateErr;
      } else {
        const { data: newQuiz, error: insertErr } = await supabase
          .from("quizzes")
          .insert([{
            course_id: selectedCourse.id,
            lesson_id: selectedLesson.id,
            title: quizTitle.trim() || `${selectedLesson.title} Assessment`,
            type: 'lesson_quiz',
            passing_score: parseInt(passingScore, 10) || 70
          }])
          .select()
          .single();
        if (insertErr) throw insertErr;
        quizId = newQuiz.id;
        setSelectedQuizId(quizId);
      }

      // Clean wipe old questions and replace with the current state array (actual DB replacement)
      const { error: deleteErr } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_id", quizId);
      if (deleteErr) throw deleteErr;

      const formattedQuestions = questions.map((q, idx) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        position: idx + 1
      }));

      const { error: qError } = await supabase
        .from("quiz_questions")
        .insert(formattedQuestions);
      if (qError) throw qError;

      toast.success("Quiz assessment published and replaced successfully!");
      fetchLessonData();
    } catch (err) {
      toast.error("Failed to save quiz: " + err.message);
    } finally {
      setSavingQuiz(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-3xl border border-slate-100 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 rounded-lg border border-purple-100 dark:border-purple-500/20 mb-1.5 inline-block">
              Lesson Studio
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedLesson.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
          <button
            onClick={() => setLessonContentType("notes")}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${lessonContentType === 'notes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <FileText size={15} /> Lesson Notes & Media
          </button>
          <button
            onClick={() => setLessonContentType("quiz")}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${lessonContentType === 'quiz' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <HelpCircle size={15} /> Quiz Assessment ({savedQuizzesCount} Saved)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {lessonContentType === 'notes' ? (
            <form onSubmit={handleSaveNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Note Title</label>
                <input
                  type="text"
                  value={lessonNoteTitle}
                  onChange={(e) => setLessonNoteTitle(e.target.value)}
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-purple-500 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Video Walkthrough URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-purple-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Content / Markdown Notes</label>
                <textarea
                  rows={6}
                  value={lessonNoteContent}
                  onChange={(e) => setLessonNoteContent(e.target.value)}
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-purple-500 dark:text-white"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingNotes} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md">
                  {savingNotes ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveQuiz} className="space-y-6">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Quiz Title</label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-bold dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Passing Score (%)</label>
                  <input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 font-bold dark:text-white"
                    min="1" max="100"
                    required
                  />
                </div>
              </div>

              {/* Questions Accordion Builder */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">Questions ({questions.length})</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestions([...questions, { question_text: "", options: ["", "", "", ""], correct_option_index: 0 }]);
                      setExpandedQuestion(questions.length); // Expand newly added question
                    }}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-black uppercase"
                  >
                    + Add Question
                  </button>
                </div>

                {questions.map((q, qIndex) => {
                  const isOpen = expandedQuestion === qIndex;
                  return (
                    <div key={qIndex} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-all">
                      
                      {/* Accordion Header (Collapsed by default) */}
                      <div 
                        onClick={() => setExpandedQuestion(isOpen ? null : qIndex)}
                        className="p-4 flex items-center justify-between cursor-pointer bg-slate-100/50 dark:bg-white/5"
                      >
                        <span className="text-xs font-black text-purple-600">
                          Q{qIndex + 1}: {q.question_text ? q.question_text.substring(0, 35) + "..." : "Untitled Question"}
                        </span>
                        <div className="flex items-center gap-2">
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuestions(questions.filter((_, idx) => idx !== qIndex));
                              }}
                              className="text-rose-500 hover:text-rose-600 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Accordion Editable Content */}
                      {isOpen && (
                        <div className="p-4 space-y-3 border-t border-slate-200 dark:border-white/10">
                          <input
                            type="text"
                            placeholder="Type question prompt..."
                            value={q.question_text}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[qIndex].question_text = e.target.value;
                              setQuestions(updated);
                            }}
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold dark:text-white"
                            required
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${qIndex}`}
                                  checked={q.correct_option_index === optIndex}
                                  onChange={() => {
                                    const updated = [...questions];
                                    updated[qIndex].correct_option_index = optIndex;
                                    setQuestions(updated);
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder={`Option ${optIndex + 1}`}
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...questions];
                                    updated[qIndex].options[optIndex] = e.target.value;
                                    setQuestions(updated);
                                  }}
                                  className="flex-1 p-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-medium dark:text-white"
                                  required
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingQuiz} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md">
                  {savingQuiz ? "Publishing..." : "Publish Quiz Assessment"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

}
