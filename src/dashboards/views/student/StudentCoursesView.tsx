import React, { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Circle,
  Layers,
  AlertCircle,
  FileText,
  Sparkles,
  Lock,
  Clock
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../../../supabase";
import toast from "react-hot-toast";

function LessonRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => {
          const title = String(children);
          const isByteAsks = title === "Byte Asks";

          const styles = {
            "Byte Explains": "bg-rose-500 border-rose-200 bg-rose-50/50 text-rose-500",
            "Byte Shows You": "bg-blue-500 border-blue-200 bg-blue-50/50 text-blue-500",
            "Byte Asks": "bg-amber-500 border-amber-200 bg-amber-50/50 text-amber-500",
            "Remember This": "bg-emerald-500 border-emerald-200 bg-emerald-50/50 text-emerald-500",
          };

          const currentStyle = styles[title] || "bg-purple-500 border-gray-200 bg-gray-50 text-purple-500";
          const [badgeBg, borderColor, boxBg] = currentStyle.split(" ");

          return (
            <div className={`my-6 rounded-2xl border ${borderColor} ${boxBg} dark:bg-white/[0.02] dark:border-white/10 p-5`}>
              <h2 className={`${badgeBg} inline-flex text-white px-4 py-2 rounded-r-full font-black uppercase text-sm mb-3 shadow-sm`}>
                {title}
              </h2>
              {isByteAsks && (
                <textarea
                  placeholder="Type your answer here..."
                  className="mt-2 min-h-[120px] w-full rounded-xl border border-amber-200 bg-white dark:bg-white/[0.04] p-4 outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-white text-sm"
                />
              )}
            </div>
          );
        },
        p: ({ children }) => (
          <p className="text-gray-700 dark:text-gray-300 text-base leading-7 mb-4">
            {children}
          </p>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function StudentCoursesView({ userId, courseId }) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);

  // Structured Phase -> Lessons state
  const [phases, setPhases] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());

  // Track open/collapsed phases by phase ID
  const [openPhases, setOpenPhases] = useState({});

  // Quiz state for active lesson
  const [lessonQuiz, setLessonQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [canRetakeQuiz, setCanRetakeQuiz] = useState(true);
  const [retakeCountdown, setRetakeCountdown] = useState("");

  // Homework state for active lesson
  const [lessonAssignment, setLessonAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submittingHomework, setSubmittingHomework] = useState(false);
  const [homeworkOpen, setHomeworkOpen] = useState(false);

  // Overall student homework stats for sidebar
  const [homeworkStats, setHomeworkStats] = useState({
    pending: 0,
    submitted: 0,
    needs_revision: 0,
    completed: 0,
  });

  useEffect(() => {
    if (userId) {
      initialLoad();
      fetchHomeworkStats();
    }
  }, [userId, courseId]);

  useEffect(() => {
    if (selectedLesson) {
      setLessonQuiz(null);
      setQuizAnswers({});
      setQuizResult(null);
      setCanRetakeQuiz(true);
      setRetakeCountdown("");
      setLessonAssignment(null);
      setSubmissionText("");
      setHomeworkOpen(false);

      fetchLessonData(selectedLesson.id);
      fetchLessonHomework(selectedLesson.id);
    }
  }, [selectedLesson?.id]);

  // Countdown timer checker for Saturday retakes
  useEffect(() => {
    if (!quizResult || quizResult.passed) return;

    const updateCountdown = () => {
      const now = new Date();
      // Calculate next Saturday at 12:00 PM (12:00)
      const target = new Date();
      const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
      
      target.setDate(now.getDate() + daysUntilSaturday);
      target.setHours(12, 0, 0, 0);

      // If today is Saturday and it's past 12 PM, target next Saturday
      if (dayOfWeek === 6 && now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 7);
      }

      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCanRetakeQuiz(true);
        setRetakeCountdown("");
      } else {
        setCanRetakeQuiz(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setRetakeCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [quizResult]);

  const initialLoad = async () => {
    try {
      setLoading(true);

      const { data: enrollments, error: enrollError } = await supabase
        .from("student_enrollments")
        .select("course_id, courses (*)")
        .eq("student_id", userId);

      if (enrollError) throw enrollError;

      let assignedCourses = (enrollments || []).map((e) => e.courses).filter(Boolean);

      if (assignedCourses.length === 0) {
        const { data: userData } = await supabase
          .from("users")
          .select("assigned_course_id, courses:assigned_course_id (*)")
          .eq("id", userId)
          .single();

        if (userData?.courses) {
          assignedCourses = [userData.courses];
        }
      }

      setCourses(assignedCourses);

      const defaultCourse = assignedCourses[0] || null;
      setActiveCourse(defaultCourse);

      if (defaultCourse) {
        const completedIds = await fetchLessonProgress();
        await fetchCourseSyllabus(defaultCourse.id, completedIds);
      }
    } catch (err) {
      console.error("Error fetching student data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHomeworkStats = async () => {
    try {
      const { data, error } = await supabase
        .from("student_assignments")
        .select("status")
        .eq("student_id", userId);

      if (error) throw error;

      const stats = {
        pending: 0,
        submitted: 0,
        needs_revision: 0,
        completed: 0,
      };

      (data || []).forEach((item) => {
        const st = item.status || "pending";
        if (stats[st] !== undefined) {
          stats[st]++;
        } else if (st === "pending") {
          stats.pending++;
        }
      });

      setHomeworkStats(stats);
    } catch (err) {
      console.error("Error fetching homework stats:", err.message);
    }
  };

  const fetchLessonProgress = async () => {
    try {
      const { data: progressData, error } = await supabase
        .from("student_lesson_progress")
        .select("lesson_id, status")
        .eq("student_id", userId)
        .eq("status", "completed");

      if (error) throw error;

      const completedSet = new Set(progressData.map((p) => p.lesson_id));
      setCompletedLessonIds(completedSet);
      return completedSet;
    } catch (err) {
      console.error("Error fetching progress:", err.message);
      return new Set();
    }
  };

  const fetchCourseSyllabus = async (targetCourseId, completedIds = completedLessonIds) => {
    try {
      const { data: phaseData, error } = await supabase
        .from("course_phases")
        .select(`
          id,
          phase_number,
          title,
          focus,
          course_lessons (
            id,
            title,
            position,
            created_at
          )
        `)
        .eq("course_id", targetCourseId)
        .order("phase_number", { ascending: true });

      if (error) throw error;

      const { data: notesData } = await supabase
        .from("notes")
        .select("*")
        .eq("course_id", targetCourseId);

      const structuredPhases = (phaseData || []).map((phase) => ({
        ...phase,
        course_lessons: (phase.course_lessons || [])
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map((lesson) => {
            const matchingNote = (notesData || []).find(
              (n) => n.lesson_id === lesson.id || (n.title && n.title.toLowerCase() === lesson.title.toLowerCase())
            );
            return {
              ...lesson,
              content: matchingNote?.content || "",
              video_url: matchingNote?.video_url || ""
            };
          })
      }));

      setPhases(structuredPhases);

      const activePhase =
        structuredPhases.find((phase) =>
          phase.course_lessons?.some((lesson) => !completedIds.has(lesson.id))
        ) || structuredPhases[0];

      const initialOpenState = {};
      structuredPhases.forEach((p) => {
        initialOpenState[p.id] = p.id === activePhase?.id;
      });

      setOpenPhases(initialOpenState);

      const firstIncompleteLesson =
        activePhase?.course_lessons?.find((l) => !completedIds.has(l.id)) ||
        activePhase?.course_lessons?.[0] ||
        null;

      setSelectedLesson(firstIncompleteLesson);
    } catch (err) {
      console.error("Error fetching syllabus:", err.message);
    }
  };

  const fetchLessonHomework = async (lessonId) => {
    try {
      const { data, error } = await supabase
        .from("student_assignments")
        .select("*")
        .eq("student_id", userId)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (error) throw error;
      setLessonAssignment(data || null);
      setSubmissionText(data?.submission_link || "");
    } catch (err) {
      console.error("Error fetching lesson homework:", err.message);
    }
  };

  const fetchLessonData = async (lessonId) => {
    try {
      const { data: quizData, error: qErr } = await supabase
        .from("quizzes")
        .select("*, quiz_questions(*)")
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (qErr) throw qErr;
      setLessonQuiz(quizData || null);

      if (quizData) {
        const { data: attempts, error: attErr } = await supabase
          .from("student_quiz_attempts")
          .select("*")
          .eq("student_id", userId)
          .eq("quiz_id", quizData.id)
          .order("completed_at", { ascending: false });

        if (!attErr && attempts && attempts.length > 0) {
          const latestAttempt = attempts[0];
          setQuizResult({
            score: latestAttempt.score,
            passed: latestAttempt.passed,
            attemptsCount: attempts.length
          });
        }
      }
    } catch (err) {
      console.error("Error fetching lesson data:", err.message);
      setLessonQuiz(null);
    }
  };

  const markLessonComplete = async (lessonId) => {
    try {
      const { error } = await supabase.from("student_lesson_progress").upsert(
        {
          student_id: userId,
          lesson_id: lessonId,
          status: "completed",
          completed_at: new Date().toISOString()
        },
        { onConflict: "student_id,lesson_id" }
      );

      if (error) throw error;

      setCompletedLessonIds((prev) => {
        const next = new Set(prev);
        next.add(lessonId);
        return next;
      });
      toast.success("Lesson automatically marked complete! 🎉 Please wait for your teacher to unlock the next lesson.");
    } catch (err) {
      console.error("Error marking lesson complete:", err.message);
    }
  };

  const checkAndAutoComplete = (currentQuizPassed, currentHomeworkSubmitted) => {
    if (!selectedLesson) return;
    const hasQuiz = lessonQuiz && lessonQuiz.quiz_questions && lessonQuiz.quiz_questions.length > 0;
    const quizPassed = !hasQuiz || (currentQuizPassed && currentQuizPassed.passed);

    const hasHomework = lessonAssignment !== null;
    const homeworkSubmitted = !hasHomework || (currentHomeworkSubmitted && (currentHomeworkSubmitted.status === "submitted" || currentHomeworkSubmitted.status === "completed"));

    if (quizPassed && homeworkSubmitted && !completedLessonIds.has(selectedLesson.id)) {
      markLessonComplete(selectedLesson.id);
    }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (!lessonQuiz || !lessonQuiz.quiz_questions) return;

    setSubmittingQuiz(true);
    try {
      const questions = lessonQuiz.quiz_questions;
      let correctCount = 0;

      questions.forEach((q, idx) => {
        if (quizAnswers[idx] === q.correct_option_index) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / questions.length) * 100);
      const passingScore = lessonQuiz.passing_score || 70;
      const passed = score >= passingScore;

      await supabase.from("student_quiz_attempts").insert({
        student_id: userId,
        quiz_id: lessonQuiz.id,
        score,
        passed
      });

      const newResult = { score, passed, attemptsCount: (quizResult?.attemptsCount || 0) + 1 };
      setQuizResult(newResult);

      if (passed) {
        toast.success(`Quiz Passed! You got ${score}% 🎉`);
        checkAndAutoComplete(newResult, lessonAssignment);
      } else {
        toast.error(`You got ${score}%. Assessment failed. Grade is recorded until Saturday 6 PM retake.`);
      }
    } catch (err) {
      toast.error("Failed to submit quiz: " + err.message);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    if (!lessonAssignment) return;

    try {
      setSubmittingHomework(true);
      const timestamp = new Date().toISOString();

      const { error } = await supabase
        .from("student_assignments")
        .update({
          submission_link: submissionText,
          status: "submitted",
          updated_at: timestamp,
          submitted_at: timestamp,
        })
        .eq("id", lessonAssignment.id);

      if (error) throw error;

      const updatedAssignment = {
        ...lessonAssignment,
        submission_link: submissionText,
        status: "submitted",
        submitted_at: timestamp,
        updated_at: timestamp,
      };

      setLessonAssignment(updatedAssignment);
      fetchHomeworkStats();
      toast.success("Homework submitted successfully! 🎉");

      checkAndAutoComplete(quizResult, updatedAssignment);
    } catch (err) {
      console.error("Error submitting homework:", err.message);
      toast.error("Failed to submit homework. Please try again.");
    } finally {
      setSubmittingHomework(false);
    }
  };

  const handleSelectCourse = (course) => {
    setOpenPhases({});
    setSelectedLesson(null);
    setActiveCourse(course);
    fetchCourseSyllabus(course.id);
  };

  const togglePhaseAccordion = (phaseId) => {
    setOpenPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  const isPhaseCompleted = (phase) => {
    if (!phase.course_lessons || phase.course_lessons.length === 0) return false;
    return phase.course_lessons.every((lesson) => completedLessonIds.has(lesson.id));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white/10 dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[30px] p-8 text-center shadow-xl">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <h2 className="text-gray-900 dark:text-white text-xl font-bold">
            Loading Learning Workspace...
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Fetching your interactive curriculum 🚀
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 text-gray-900 dark:text-white max-w-7xl mx-auto">
      {courses.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {courses.map((course) => {
              const isSelected = activeCourse?.id === course.id;
              return (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-left shrink-0 transition-all ${
                    isSelected
                      ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20"
                      : "bg-white dark:bg-white/[0.04] border-gray-200 dark:border-white/10 hover:border-purple-500/40 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-purple-500/20 shrink-0 flex items-center justify-center font-bold text-xs">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen size={16} className={isSelected ? "text-white" : "text-purple-500"} />
                    )}
                  </div>
                  <span className="font-bold text-sm max-w-[180px] truncate">
                    {course.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-white dark:bg-white/[0.04] backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-4 shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <FileText size={14} className="text-blue-500" /> Homework:
            </span>
            <div className="flex items-center gap-3 text-center">
              <div>
                <p className="text-[9px] text-gray-400 font-medium">Pending</p>
                <p className="font-black text-xs text-orange-500">{homeworkStats.pending}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-medium">Submitted</p>
                <p className="font-black text-xs text-blue-500">{homeworkStats.submitted}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-medium">Revision</p>
                <p className="font-black text-xs text-amber-500">{homeworkStats.needs_revision}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-medium">Done</p>
                <p className="font-black text-xs text-emerald-500">{homeworkStats.completed}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-[32px] p-12 text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            🎓
          </div>
          <h3 className="text-xl font-bold">No Registered Courses Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto text-sm">
            You are not currently enrolled in any active courses. Please contact your administrator or instructor.
          </p>
        </div>
      ) : (
        activeCourse && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-120px)] lg:flex lg:flex-col">
              <div className="bg-white dark:bg-white/[0.04] backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[28px] overflow-hidden shadow-xl p-5 shrink-0">
                <div className="relative h-28 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
                  {activeCourse.thumbnail_url ? (
                    <img
                      src={activeCourse.thumbnail_url}
                      alt={activeCourse.title}
                      className="w-full h-full object-contain bg-black/20"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <BookOpen size={36} className="text-white/80 mx-auto mb-1" />
                      <span className="text-xs font-bold text-white/70 uppercase tracking-widest">
                        Course Track
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <h2 className="absolute bottom-3 left-4 right-4 font-black text-white text-base line-clamp-1">
                    {activeCourse.title}
                  </h2>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 px-1">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-purple-500" />
                    {phases.length} Phases
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {completedLessonIds.size} Lessons Done
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-white/[0.04] backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[28px] p-4 shadow-xl space-y-3 overflow-y-auto flex-1">
                <h3 className="text-base font-black px-2 text-gray-900 dark:text-white flex items-center gap-2">
                  Course Syllabus
                </h3>

                <div className="space-y-2">
                  {phases.map((phase) => {
                    const isOpen = !!openPhases[phase.id];
                    const phaseDone = isPhaseCompleted(phase);

                    return (
                      <div
                        key={phase.id}
                        className="border border-gray-200/80 dark:border-white/10 rounded-2xl overflow-hidden transition-all bg-gray-50/50 dark:bg-white/[0.02]"
                      >
                        <button
                          onClick={() => togglePhaseAccordion(phase.id)}
                          className="w-full text-left p-3.5 flex items-center justify-between hover:bg-purple-500/5 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 pr-2">
                            {phaseDone ? (
                              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-purple-500/40 shrink-0" />
                            )}
                            <div>
                              <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                                Phase {phase.phase_number}
                              </span>
                              <h4 className="font-bold text-xs md:text-sm text-gray-900 dark:text-white line-clamp-1">
                                {phase.title}
                              </h4>
                            </div>
                          </div>

                          {isOpen ? (
                            <ChevronDown size={16} className="text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400 shrink-0" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="p-2 pt-0 space-y-1.5 border-t border-gray-200/50 dark:border-white/5">
                            {phase.course_lessons?.map((lesson) => {
                              const isSelected = selectedLesson?.id === lesson.id;
                              const isDone = completedLessonIds.has(lesson.id);

                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => setSelectedLesson(lesson)}
                                  className={`w-full text-left rounded-xl p-2.5 transition-all flex items-center justify-between border ${
                                    isSelected
                                      ? "bg-purple-600 text-white border-transparent shadow-md"
                                      : "bg-white dark:bg-white/[0.03] border-gray-200/60 dark:border-white/5 hover:border-purple-500/30"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    {isDone ? (
                                      <CheckCircle2
                                        size={15}
                                        className={isSelected ? "text-white" : "text-emerald-500"}
                                      />
                                    ) : (
                                      <Circle
                                        size={15}
                                        className={isSelected ? "text-white/70" : "text-gray-400"}
                                      />
                                    )}
                                    <span
                                      className={`text-xs font-bold truncate ${
                                        isSelected
                                          ? "text-white"
                                          : "text-gray-800 dark:text-gray-200"
                                      }`}
                                    >
                                      {lesson.title}
                                    </span>
                                  </div>
                                  <ChevronRight
                                    size={13}
                                    className={isSelected ? "text-white/80" : "text-gray-400"}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-white/[0.04] backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[32px] p-6 md:p-8 shadow-xl">
                {selectedLesson ? (
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                      <div>
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                          Active Lesson
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black mt-2 text-gray-900 dark:text-white">
                          {selectedLesson.title}
                        </h2>
                      </div>

                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${
                        completedLessonIds.has(selectedLesson.id)
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {completedLessonIds.has(selectedLesson.id) ? (
                          <>
                            <CheckCircle2 size={16} /> Completed (Wait for teacher to unlock next)
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} /> In Progress
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/[0.08] pt-6 space-y-6">
                      {selectedLesson.video_url && (
                        <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-lg border border-gray-200/20 dark:border-white/10">
                          <iframe
                            src={selectedLesson.video_url}
                            title="Lesson Video"
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        </div>
                      )}

                      {quizResult && (
                        <div className={`p-4 rounded-xl border text-xs md:text-sm font-bold flex items-center gap-2.5 ${
                          quizResult.passed 
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300" 
                            : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300"
                        }`}>
                          {quizResult.passed ? (
                            <span>🎉 You passed! Please wait for your teacher to unlock the next lesson.</span>
                          ) : (
                            <span>⚠️ You did not pass. Grade recorded. Retakes unlock Saturday at 12:00 PM.</span>
                          )}
                        </div>
                      )}

                      {selectedLesson.content && (
                        <div className="bg-gray-50/80 dark:bg-white/[0.02] p-6 md:p-8 rounded-2xl border border-gray-200/60 dark:border-white/5 space-y-6">
                          <div className="prose dark:prose-invert max-w-none text-sm md:text-base leading-relaxed">
                            <LessonRenderer content={selectedLesson.content} />
                          </div>
                        </div>
                      )}

                      {/* Quiz Section */}
                      {lessonQuiz && lessonQuiz.quiz_questions && lessonQuiz.quiz_questions.length > 0 && (
                        <div className="bg-purple-500/5 dark:bg-purple-500/[0.02] border border-purple-500/20 rounded-2xl p-6 md:p-8 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                              <Sparkles size={18} className="text-purple-500" /> Lesson Quiz
                            </h3>
                          </div>

                          <form onSubmit={handleQuizSubmit} className="space-y-6">
                            {lessonQuiz.quiz_questions.map((q, qIdx) => (
                              <div key={q.id || qIdx} className="space-y-3 bg-white dark:bg-white/[0.04] p-5 rounded-xl border border-gray-200/50 dark:border-white/5">
                                <p className="font-bold text-sm text-gray-900 dark:text-white">
                                  {qIdx + 1}. {q.question_text}
                                </p>
                                <div className="space-y-2">
                                  {q.options?.map((opt, oIdx) => (
                                    <label
                                      key={oIdx}
                                      className={`flex items-center gap-3 p-3 rounded-lg border text-xs md:text-sm cursor-pointer transition-all ${
                                        quizAnswers[qIdx] === oIdx
                                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                                          : "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/10 hover:border-purple-500/30 text-gray-800 dark:text-gray-200"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`question-${qIdx}`}
                                        checked={quizAnswers[qIdx] === oIdx}
                                        onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                                        className="hidden"
                                      />
                                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        quizAnswers[qIdx] === oIdx ? "border-white bg-white text-purple-600 font-bold" : "border-gray-400"
                                      }`}>
                                        {quizAnswers[qIdx] === oIdx && <span className="w-2 h-2 rounded-full bg-purple-600" />}
                                      </span>
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}

                            <button
                              type="submit"
                              disabled={submittingQuiz || (!canRetakeQuiz && quizResult && !quizResult.passed)}
                              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all text-sm flex items-center justify-center gap-2"
                            >
                              {submittingQuiz ? (
                                <>Submitting Quiz...</>
                              ) : !canRetakeQuiz && quizResult && !quizResult.passed ? (
                                <>
                                  <Clock size={16} /> Retakes Available in {retakeCountdown}
                                </>
                              ) : (
                                <>Submit Quiz Assessment</>
                              )}
                            </button>
                          </form>
                        </div>
                      )}

                      {/* Homework Section */}
                      {lessonAssignment && (
                        <div className="bg-blue-500/5 dark:bg-blue-500/[0.02] border border-blue-500/20 rounded-2xl p-6 md:p-8 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                              <FileText size={18} className="text-blue-500" /> Lesson Homework
                            </h3>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                              lessonAssignment.status === "completed" || lessonAssignment.status === "submitted"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                            }`}>
                              {lessonAssignment.status}
                            </span>
                          </div>

                          <div className="space-y-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {lessonAssignment.instruction || lessonAssignment.description || "Complete the assigned task and submit your link or code repository below."}
                            </p>

                            <form onSubmit={handleSubmitHomework} className="space-y-4">
                              <input
                                type="text"
                                placeholder="Paste your submission link (GitHub, CodePen, etc.)"
                                value={submissionText}
                                onChange={(e) => setSubmissionText(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                              />

                              <button
                                type="submit"
                                disabled={submittingHomework}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm flex items-center justify-center gap-2"
                              >
                                {submittingHomework ? "Submitting Homework..." : "Submit Homework"}
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-3">
                    <BookOpen size={40} className="mx-auto text-gray-400" />
                    <h3 className="text-lg font-bold">Select a Lesson</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                      Choose any lesson from the course syllabus on the left to start viewing its content, video, quiz, and homework.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
