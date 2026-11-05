import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabase";
import toast from "react-hot-toast";
import { BookOpen, CheckCircle2, User, Layers, Send, AlertCircle, Award, FileCode2, ExternalLink } from "lucide-react";

export default function TutorCourseAssignmentView({ userId }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courseLessons, setCourseLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Track currently active expanded task for bottom review panel
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    fetchTutorStudents();
  }, [userId]);

  const fetchTutorStudents = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, assigned_course_id")
      .eq("assigned_tutor_id", userId)
      .eq("role", "student");

    if (error) {
      toast.error("Failed to load students.");
    } else {
      setStudents(data || []);
    }
  };

  const fetchStudentCourses = async (studentId) => {
    try {
      const { data: enrollments, error } = await supabase
        .from("student_enrollments")
        .select("course_id, courses(id, title)")
        .eq("student_id", studentId);

      if (error) throw error;

      let enrolledCourses = (enrollments || []).map((e) => e.courses).filter(Boolean);

      if (enrolledCourses.length === 0) {
        const student = students.find((s) => s.id === studentId);
        if (student?.assigned_course_id) {
          const { data: courseData } = await supabase
            .from("courses")
            .select("id, title")
            .eq("id", student.assigned_course_id)
            .maybeSingle();

          if (courseData) {
            enrolledCourses = [courseData];
          }
        }
      }

      setStudentCourses(enrolledCourses);
      if (enrolledCourses.length > 0) {
        const firstCourseId = enrolledCourses[0].id;
        setSelectedCourse(firstCourseId);
        fetchCourseLessons(firstCourseId, studentId);
      } else {
        setSelectedCourse("");
        setCourseLessons([]);
      }
    } catch (err) {
      console.error("Error loading student courses:", err.message);
      setStudentCourses([]);
    }
  };

  const fetchCourseLessons = async (courseId, studentId) => {
    try {
      const { data: phaseData, error: phaseError } = await supabase
        .from("course_phases")
        .select(`
          id,
          phase_number,
          title,
          course_lessons (
            id,
            title,
            position
          )
        `)
        .eq("course_id", courseId)
        .order("phase_number", { ascending: true });

      if (phaseError) throw phaseError;

      const { data: progressData, error: progressError } = await supabase
        .from("student_lesson_progress")
        .select("lesson_id")
        .eq("student_id", studentId)
        .eq("status", "completed");

      if (progressError) throw progressError;

      const completedIds = new Set((progressData || []).map((p) => p.lesson_id));

      let allLessons = [];
      (phaseData || []).forEach((phase) => {
        const sortedLessons = (phase.course_lessons || []).sort((a, b) => (a.position || 0) - (b.position || 0));
        sortedLessons.forEach((lesson) => {
          allLessons.push({
            ...lesson,
            phase_number: phase.phase_number
          });
        });
      });

      const eligibleLessons = allLessons.filter((lesson, index) => {
        const isCompleted = completedIds.has(lesson.id);
        if (isCompleted) return false;

        const prevLesson = index > 0 ? allLessons[index - 1] : null;
        const isUnlocked = index === 0 || (prevLesson && completedIds.has(prevLesson.id));

        return isUnlocked;
      });

      setCourseLessons(eligibleLessons);
    } catch (err) {
      console.error("Error loading eligible lessons:", err.message);
      setCourseLessons([]);
    }
  };

  const handleStudentChange = async (studentId) => {
    setSelectedStudent(studentId);
    setSelectedLessonId("");
    setSelectedTaskId(null);

    if (studentId) {
      await fetchStudentCourses(studentId);
      await fetchStudentAssignments(studentId);
    } else {
      setStudentCourses([]);
      setSelectedCourse("");
      setCourseLessons([]);
      setStudentAssignments([]);
    }
  };

  const handleCourseChange = async (courseId) => {
    setSelectedCourse(courseId);
    setSelectedLessonId("");
    if (selectedStudent && courseId) {
      await fetchCourseLessons(courseId, selectedStudent);
    } else {
      setCourseLessons([]);
    }
  };

  const fetchStudentAssignments = async (studentId) => {
    const { data, error } = await supabase
      .from("student_assignments")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (!error) {
      const tasks = data || [];
      setStudentAssignments(tasks);
      if (tasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(tasks[0].id);
      }
    }
  };

  const handleReviewTask = async (taskId, newStatus = "completed") => {
    const task = studentAssignments.find((a) => a.id === taskId);
    if (!task) return;

    setLoading(true);

    const { error } = await supabase
      .from("student_assignments")
      .update({
        tutor_feedback: task.tutor_feedback,
        grade: task.grade,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    setLoading(false);

    if (error) {
      toast.error("Failed to save review.");
      return;
    }

    toast.success(newStatus === "completed" ? "Assignment marked as completed! 🎉" : "Requested revisions from student.");
    fetchStudentAssignments(selectedStudent);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !taskName.trim() || !taskDescription.trim() || !selectedLessonId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("student_assignments")
      .insert([
        {
          tutor_id: userId,
          student_id: selectedStudent,
          lesson_id: selectedLessonId,
          task_name: taskName,
          description: taskDescription,
          status: "pending",
        },
      ]);

    setLoading(false);

    if (error) {
      toast.error("Failed to create assignment task.");
    } else {
      toast.success("Assignment task dispatched successfully! 🚀");
      setTaskName("");
      setTaskDescription("");
      setSelectedLessonId("");
      fetchStudentAssignments(selectedStudent);
    }
  };

  const activeTask = studentAssignments.find((a) => a.id === selectedTaskId);
  const isFormValid = Boolean(selectedStudent && selectedCourse && selectedLessonId && taskName.trim() && taskDescription.trim());

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-gray-900 dark:text-white">
      {/* Premium Header Banner */}
      <div className="bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-slate-900/50 dark:from-purple-950/60 dark:via-indigo-950/40 dark:to-slate-950/80 backdrop-blur-2xl border border-purple-500/20 rounded-[35px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[120px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-3 border border-purple-500/20">
              <FileCode2 size={15} className="text-purple-500" />
              TUTOR DISPATCH WORKSPACE
            </div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-gray-900 via-purple-900 to-indigo-900 dark:from-white dark:via-purple-200 dark:to-indigo-300 bg-clip-text text-transparent">
              Student Homework & Task Control
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-xl text-sm leading-relaxed">
              Dispatch precision coding tasks to multi-course modules and review live student submissions seamlessly.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dispatch Form */}
        <div className="bg-[#fcfbf9]/90 dark:bg-white/[0.04] backdrop-blur-2xl p-6 md:p-8 rounded-[32px] border border-stone-200/80 dark:border-white/10 shadow-xl space-y-6 lg:col-span-5">
          <div className="flex items-center gap-3 border-b border-stone-200/60 dark:border-white/5 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 font-black">
              <Send size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Assign Task</h3>
              <p className="text-xs text-stone-500 dark:text-gray-400">Target uncompleted curriculum nodes</p>
            </div>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 mb-2">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[#f7f6f2] dark:bg-white/5 border border-stone-200 dark:border-white/10 focus:outline-none focus:border-purple-500 text-sm font-medium transition-all shadow-inner"
              >
                <option value="" className="dark:bg-slate-900">-- Choose Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.full_name}</option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 mb-2">Select Student Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-[#f7f6f2] dark:bg-white/5 border border-stone-200 dark:border-white/10 focus:outline-none focus:border-purple-500 text-sm font-medium transition-all shadow-inner"
                >
                  <option value="" className="dark:bg-slate-900">-- Choose Course --</option>
                  {studentCourses.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 mb-2">Target Unlocked Lesson</label>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                disabled={!selectedCourse}
                className="w-full p-3.5 rounded-2xl bg-[#f7f6f2] dark:bg-white/5 border border-stone-200 dark:border-white/10 focus:outline-none focus:border-purple-500 text-sm font-medium transition-all shadow-inner disabled:opacity-40"
              >
                <option value="" className="dark:bg-slate-900">-- Choose Eligible Lesson --</option>
                {courseLessons.map((l) => (
                  <option key={l.id} value={l.id} className="dark:bg-slate-900">
                    Phase {l.phase_number}: {l.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 mb-2">Task Title</label>
              <input
                type="text"
                placeholder="e.g., Build a Python Function"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[#f7f6f2] dark:bg-white/5 border border-stone-200 dark:border-white/10 focus:outline-none focus:border-purple-500 text-sm font-medium transition-all shadow-inner placeholder-stone-400 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 mb-2">Task Instructions</label>
              <textarea
                placeholder="Provide precise execution requirements..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={4}
                className="w-full p-3.5 rounded-2xl bg-[#f7f6f2] dark:bg-white/5 border border-stone-200 dark:border-white/10 focus:outline-none focus:border-purple-500 text-sm font-medium transition-all shadow-inner resize-none placeholder-stone-400 dark:placeholder-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                isFormValid && !loading
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 shadow-purple-500/25 cursor-pointer scale-[1.01] active:scale-[0.99]"
                  : "bg-stone-300 dark:bg-white/10 text-stone-500 dark:text-gray-400 cursor-not-allowed shadow-none"
              }`}
            >
              <Send size={16} />
              Dispatch Task
            </button>
          </form>
        </div>

        {/* Right Column: Sidebar Task List */}
        <div className="bg-[#fcfbf9]/90 dark:bg-white/[0.04] backdrop-blur-2xl p-6 md:p-8 rounded-[32px] border border-stone-200/80 dark:border-white/10 shadow-xl space-y-5 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-white/5 pb-4">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-purple-500" /> Assigned Task Logs
            </h3>
            {selectedStudent && (
              <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold px-3 py-1 rounded-full border border-purple-500/20">
                {studentAssignments.length} Total
              </span>
            )}
          </div>
          
          {selectedStudent ? (
            studentAssignments.length > 0 ? (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 scrollbar-none">
                {studentAssignments.map((task) => {
                  const isSelected = selectedTaskId === task.id;
                  const needsAttention = task.status === "submitted" || task.status === "pending";

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`cursor-pointer rounded-2xl p-4 transition-all border flex items-center justify-between group ${
                        isSelected
                          ? "bg-transparent border-2 border-purple-500 shadow-md"
                          : "bg-[#f7f6f2]/60 dark:bg-white/[0.02] border-stone-200/60 dark:border-white/5 hover:border-purple-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <span className={`w-3 h-3 rounded-full shrink-0 shadow-sm ${
                          needsAttention ? "bg-red-500 animate-pulse shadow-red-500/50" : "bg-emerald-500 shadow-emerald-500/50"
                        }`} />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate tracking-tight text-stone-900 dark:text-white">
                            {task.task_name}
                          </h4>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            task.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : task.status === "submitted"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : task.status === "needs_revision"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                          }`}>
                            {task.status ? task.status.replace("_", " ") : "pending"}
                          </span>
                        </div>
                      </div>

                      {needsAttention && (
                        <span className="text-[10px] font-black tracking-wider uppercase text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl shrink-0">
                          Review Needed
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-stone-400 dark:text-gray-400 space-y-2">
                <FileCode2 size={36} className="mx-auto opacity-40 text-purple-500" />
                <p className="text-sm font-bold">No tasks assigned to this student yet.</p>
              </div>
            )
          ) : (
            <div className="text-center py-16 text-stone-400 dark:text-gray-400 space-y-2">
              <User size={36} className="mx-auto opacity-40 text-purple-500" />
              <p className="text-sm font-bold">Select a student above to inspect their task timeline.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Expanded Review Panel */}
      {activeTask && (
        <div className="bg-[#fcfbf9]/90 dark:bg-white/[0.04] backdrop-blur-2xl p-6 md:p-8 rounded-[32px] border border-stone-200/80 dark:border-white/10 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200/60 dark:border-white/5 pb-5">
            <div>
              <span className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                Active Review Stream
              </span>
              <h3 className="text-2xl font-black mt-2 text-stone-900 dark:text-white tracking-tight">{activeTask.task_name}</h3>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
              activeTask.status === "completed"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                : activeTask.status === "submitted"
                ? "bg-blue-500/10 text-blue-600 border-blue-500/25"
                : activeTask.status === "needs_revision"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/25"
                : "bg-orange-500/10 text-orange-600 border-orange-500/25"
            }`}>
              {activeTask.status ? activeTask.status.replace("_", " ") : "pending"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 block mb-2">Instructions / Brief</label>
                <div className="text-sm text-stone-700 dark:text-gray-300 leading-relaxed bg-[#f7f6f2]/80 dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 p-5 rounded-2xl shadow-inner">
                  {activeTask.description}
                </div>
              </div>

              {activeTask.submission_link && (
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 block mb-2">Student Deployment / Link</label>
                  <a
                    href={activeTask.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 text-purple-600 dark:text-purple-400 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 p-4 rounded-2xl transition-all group font-bold text-sm"
                  >
                    <span className="truncate">{activeTask.submission_link}</span>
                    <ExternalLink size={16} className="shrink-0 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              )}

              {activeTask.submitted_at && (
                <p className="text-xs font-medium text-stone-400 dark:text-gray-400">
                  Timestamp: {new Date(activeTask.submitted_at).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-5 bg-[#f7f6f2]/60 dark:bg-white/[0.02] p-6 rounded-3xl border border-stone-200/60 dark:border-white/5 shadow-inner">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 mb-2">Assign Grade</label>
                <input
                  type="text"
                  placeholder="e.g., A+, 95%, Mastered..."
                  value={activeTask.grade || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStudentAssignments((prev) =>
                      prev.map((a) => (a.id === activeTask.id ? { ...a, grade: val } : a))
                    );
                  }}
                  className="w-full rounded-2xl border border-stone-200 dark:border-white/10 p-3.5 bg-white dark:bg-white/5 text-sm font-medium focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 dark:text-gray-400 mb-2">Tutor Feedback</label>
                <textarea
                  rows={3}
                  placeholder="Write constructive guidance..."
                  value={activeTask.tutor_feedback || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStudentAssignments((prev) =>
                      prev.map((a) => (a.id === activeTask.id ? { ...a, tutor_feedback: val } : a))
                    );
                  }}
                  className="w-full rounded-2xl border border-stone-200 dark:border-white/10 p-3.5 bg-white dark:bg-white/5 resize-none text-sm font-medium focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleReviewTask(activeTask.id, "needs_revision")}
                  disabled={loading || activeTask.status !== "submitted"}
                  className="py-3.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed font-black rounded-2xl transition-all text-xs uppercase tracking-wider shadow-sm"
                >
                  Request Revision
                </button>
                <button
                  onClick={() => handleReviewTask(activeTask.id, "completed")}
                  disabled={loading || activeTask.status !== "submitted"}
                  className="py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                >
                  Approve & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}