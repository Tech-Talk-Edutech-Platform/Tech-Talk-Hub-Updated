import React, { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, Layers, BookMarked, Users, GraduationCap, X, LayoutList, Activity, CheckCircle2, Image as ImageIcon, Edit3, FileText, HelpCircle } from "lucide-react";
import { supabase } from "../../../supabase";
import toast from "react-hot-toast";
import QuizBuilderModal from "./QuizBuilderModal";

export default function AdminCoursesView() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // New Course Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDuration, setNewDuration] = useState(0);
  const [newThumbnailUrl, setNewThumbnailUrl] = useState("");

  // Edit Course Cover Modal State
  const [editingCourseCover, setEditingCourseCover] = useState(null);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");
  const [updatingCover, setUpdatingCover] = useState(false);

  // Deep Dive Course Details State
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("curriculum"); // 'curriculum' or 'students'
  
  // Creation States inside Modal
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [newLessonTitles, setNewLessonTitles] = useState({}); // { phaseId: 'title' }
  const [creatingPhase, setCreatingPhase] = useState(false);

  // Lesson Detail / Content Modal State (Notes & Quiz Builder)
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonContentType, setLessonContentType] = useState("notes"); // 'notes' or 'quiz'
  
  // Lesson Notes Form State
  const [lessonNoteTitle, setLessonNoteTitle] = useState("");
  const [lessonNoteContent, setLessonNoteContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Lesson Quiz Form State
  const [quizTitle, setQuizTitle] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState([
    { question_text: "", options: ["", "", "", ""], correct_option_index: 0 }
  ]);
  const [savingQuiz, setSavingQuiz] = useState(false);

const [currentView, setCurrentView] = useState("list"); // 'list', 'course_details', 'lesson_editor'

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          course_phases (
            id,
            course_lessons ( id )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const { data: usersData } = await supabase.from("users").select("id, role, assigned_course_id");

      const enrichedCourses = (data || []).map(course => {
        const assignedUsers = (usersData || []).filter(u => u.assigned_course_id === course.id);
        return {
          ...course,
          student_count: assignedUsers.filter(u => u.role === 'student').length,
          tutor_count: assignedUsers.filter(u => u.role === 'tutor').length,
        };
      });

      setCourses(enrichedCourses);
    } catch (err) {
      toast.error("Failed to load courses: " + err.message);
    } finally {
      setLoading(false);
    }
  };


const fetchCourseDetails = async (courseId) => {
    try {
      setDetailsLoading(true);
      
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(`
          *,
          course_phases (
            *,
            course_lessons (*)
          )
        `)
        .eq("id", courseId)
        .order("phase_number", { referencedTable: "course_phases", ascending: true })
        .single();

      if (courseError) throw courseError;

      // Fetch students via enrollments AND direct assignment fallback
      const { data: enrollmentsData } = await supabase
        .from("student_enrollments")
        .select(`
          student_id,
          users:student_id (
            id, full_name, email, role,
            student_lesson_progress (lesson_id, status)
          )
        `)
        .eq("course_id", courseId);

      const { data: directUsersData } = await supabase
        .from("users")
        .select(`
          id, full_name, email, role, assigned_course_id,
          student_lesson_progress (lesson_id, status)
        `)
        .eq("assigned_course_id", courseId)
        .eq("role", "student");

      // Merge and deduplicate students from both tables
      const enrolledStudentsMap = new Map();
      
      (enrollmentsData || []).forEach(e => {
        if (e.users) enrolledStudentsMap.set(e.users.id, e.users);
      });
      
      (directUsersData || []).forEach(u => {
        if (u) enrolledStudentsMap.set(u.id, u);
      });

      setSelectedCourse({
        ...courseData,
        enrolled_users: Array.from(enrolledStudentsMap.values())
      });
    } catch (err) {
      toast.error("Failed to load course details: " + err.message);
    } finally {
      setDetailsLoading(false);
    }
  };
  const fetchLessonExtras = async (lesson) => {
    setSelectedLesson(lesson);
    setLessonContentType("notes");
    
    // Fetch existing note for this lesson/course if any
    try {
      const { data: noteData } = await supabase
        .from("notes")
        .select("*")
        .eq("course_id", selectedCourse.id)
        .ilike("title", `%${lesson.title}%`)
        .maybeSingle();

      if (noteData) {
        setLessonNoteTitle(noteData.title || lesson.title);
        setLessonNoteContent(noteData.content || "");
        setLessonVideoUrl(noteData.video_url || "");
      } else {
        setLessonNoteTitle(lesson.title);
        setLessonNoteContent("");
        setLessonVideoUrl("");
      }

      // Fetch existing quiz for this phase/course if any
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*, quiz_questions(*)")
        .eq("phase_id", lesson.phase_id)
        .maybeSingle();

      if (quizData) {
        setQuizTitle(quizData.title);
        setPassingScore(quizData.passing_score || 70);
        if (quizData.quiz_questions && quizData.quiz_questions.length > 0) {
          setQuestions(quizData.quiz_questions.map(q => ({
            question_text: q.question_text,
            options: q.options,
            correct_option_index: q.correct_option_index
          })));
        } else {
          setQuestions([{ question_text: "", options: ["", "", "", ""], correct_option_index: 0 }]);
        }
      } else {
        setQuizTitle(`${lesson.title} Assessment`);
        setPassingScore(70);
        setQuestions([{ question_text: "", options: ["", "", "", ""], correct_option_index: 0 }]);
      }
    } catch (err) {
      console.error("Error fetching lesson content:", err);
    }
  };

const handleDeletePhase = async (phaseId) => {
    if (!window.confirm("Are you sure? This action will remove this phase and all its dependent lessons, notes, and quizzes.")) return;
    try {
      const { error } = await supabase.from("course_phases").delete().eq("id", phaseId);
      if (error) throw error;
      toast.success("Phase and dependent data deleted!");
      await fetchCourseDetails(selectedCourse.id);
      fetchCourses();
    } catch (err) {
      toast.error("Failed to delete phase: " + err.message);
    }
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!selectedLesson || !selectedCourse) return;
    setSavingNotes(true);

    try {
      // Check if note already exists for this course and title
      const { data: existing } = await supabase
        .from("notes")
        .select("id")
        .eq("course_id", selectedCourse.id)
        .eq("title", lessonNoteTitle.trim() || selectedLesson.title)
        .maybeSingle();

      let error;
      if (existing) {
        // Update
        const res = await supabase
          .from("notes")
          .update({
            content: lessonNoteContent,
            video_url: lessonVideoUrl.trim() || null
          })
          .eq("id", existing.id);
        error = res.error;
      } else {
        // Insert new
        const res = await supabase
          .from("notes")
          .insert([{
            course_id: selectedCourse.id,
            title: lessonNoteTitle.trim() || selectedLesson.title,
            content: lessonNoteContent,
            video_url: lessonVideoUrl.trim() || null
          }]);
        error = res.error;
      }

      if (error) throw error;
      toast.success("Lesson notes & materials saved!");
    } catch (err) {
      console.error("Notes save error:", err);
      toast.error("Failed to save notes: " + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (!selectedLesson || !selectedCourse) return;
    setSavingQuiz(true);

    try {
      // 1. Check if quiz already exists for this phase
      const { data: existingQuiz } = await supabase
        .from("quizzes")
        .select("id")
        .eq("phase_id", selectedLesson.phase_id)
        .maybeSingle();

      let quizId;
      if (existingQuiz) {
        quizId = existingQuiz.id;
        const { error: updateErr } = await supabase
          .from("quizzes")
          .update({
            title: quizTitle.trim() || `${selectedLesson.title} Quiz`,
            passing_score: parseInt(passingScore, 10) || 70
          })
          .eq("id", quizId);
        if (updateErr) throw updateErr;
      } else {
        const { data: newQuiz, error: insertErr } = await supabase
          .from("quizzes")
          .insert([{
            course_id: selectedCourse.id,
            phase_id: selectedLesson.phase_id,
            title: quizTitle.trim() || `${selectedLesson.title} Quiz`,
            type: 'phase_quiz',
            passing_score: parseInt(passingScore, 10) || 70
          }])
          .select()
          .single();
        if (insertErr) throw insertErr;
        quizId = newQuiz.id;
      }

      // 2. Clear old questions for this quiz
      await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);

      // 3. Insert fresh questions
      const formattedQuestions = questions.map((q, idx) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        position: idx + 1
      }));

      const { error: qError } = await supabase.from("quiz_questions").insert(formattedQuestions);
      if (qError) throw qError;

      toast.success("Quiz assessment published successfully!");
    } catch (err) {
      console.error("Quiz save error:", err);
      toast.error("Failed to save quiz: " + err.message);
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return toast.error("Course title is required");

    try {
      const { data, error } = await supabase
        .from("courses")
        .insert([{ 
          title: newTitle, 
          description: newDescription, 
          duration_lessons: parseInt(newDuration, 10) || 0,
          thumbnail_url: newThumbnailUrl.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Course created successfully!");
      fetchCourses();
      setNewTitle("");
      setNewDescription("");
      setNewDuration(0);
      setNewThumbnailUrl("");
      setIsCreating(false);
    } catch (err) {
      toast.error("Error creating course: " + err.message);
    }
  };

  const handleUpdateCourseCover = async (e) => {
    e.preventDefault();
    if (!editingCourseCover) return;
    setUpdatingCover(true);

    try {
      const { error } = await supabase
        .from("courses")
        .update({ thumbnail_url: editThumbnailUrl.trim() || null })
        .eq("id", editingCourseCover.id);

      if (error) throw error;

      toast.success("Course cover updated!");
      setEditingCourseCover(null);
      fetchCourses();
      if (selectedCourse?.id === editingCourseCover.id) {
        setSelectedCourse({ ...selectedCourse, thumbnail_url: editThumbnailUrl.trim() || null });
      }
    } catch (err) {
      toast.error("Failed to update cover image: " + err.message);
    } finally {
      setUpdatingCover(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure? This action will remove all linked phases, lessons, and assignments.")) return;
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      setCourses(courses.filter((c) => c.id !== id));
      if (selectedCourse?.id === id) setSelectedCourse(null);
      toast.success("Course deleted!");
    } catch (err) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const handleCreatePhase = async (e) => {
    e.preventDefault();
    if (!newPhaseTitle.trim() || !selectedCourse) return;
    setCreatingPhase(true);

    try {
      const nextPhaseNumber = (selectedCourse.course_phases?.length || 0) + 1;
      const { error } = await supabase
        .from("course_phases")
        .insert([{ 
          course_id: selectedCourse.id, 
          title: newPhaseTitle.trim(), 
          phase_number: nextPhaseNumber 
        }]);
      
      if (error) throw error;

      toast.success("Phase added successfully!");
      setNewPhaseTitle("");
      
      await fetchCourseDetails(selectedCourse.id);
      fetchCourses();
    } catch (err) {
      toast.error("Failed to add phase: " + err.message);
    } finally {
      setCreatingPhase(false);
    }
  };

  const handleCreateLesson = async (e, phaseId) => {
    e.preventDefault();
    const title = newLessonTitles[phaseId];
    if (!title?.trim()) return;
    
    try {
      const phase = selectedCourse.course_phases.find(p => p.id === phaseId);
      const position = (phase?.course_lessons?.length || 0) + 1;

      const { error } = await supabase
        .from("course_lessons")
        .insert([{ phase_id: phaseId, title: title.trim(), position }]);
      
      if (error) throw error;
      toast.success("Lesson added!");
      setNewLessonTitles({ ...newLessonTitles, [phaseId]: "" });
      fetchCourseDetails(selectedCourse.id);
      fetchCourses();
    } catch (err) {
      toast.error("Failed to add lesson: " + err.message);
    }
  };

  const calculateStudentProgress = (student) => {
    if (!selectedCourse?.course_phases) return 0;
    const totalLessons = selectedCourse.course_phases.reduce((acc, phase) => acc + (phase.course_lessons?.length || 0), 0);
    if (totalLessons === 0) return 0;
    
    const completedLessons = student.student_lesson_progress?.filter(p => p.status === 'completed').length || 0;
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const sortedStudents = [...(selectedCourse?.enrolled_users || [])].sort((a, b) => {
    return calculateStudentProgress(b) - calculateStudentProgress(a);
  });

  return (
    <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 md:p-8 border border-slate-100 dark:border-white/10 shadow-xs space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <BookOpen className="text-blue-600" /> Curriculum & Course Manager
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Manage course tracks, cover images, phases, structured lessons, and monitor enrollments.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all uppercase tracking-wider"
        >
          <Plus size={16} /> {isCreating ? "Cancel" : "Add Course"}
        </button>
      </div>

      {/* Creation Modal / Inline Drawer */}
      {isCreating && (
        <form onSubmit={handleCreateCourse} className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">Create New Course Track</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Course Title (e.g., Scratch Masterclass)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold focus:outline-blue-500 dark:text-white transition-all"
              required
            />
            <input
              type="number"
              placeholder="Total Lessons Estimate"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold focus:outline-blue-500 dark:text-white transition-all"
            />
            <input
              type="url"
              placeholder="Thumbnail Image URL (https://...)"
              value={newThumbnailUrl}
              onChange={(e) => setNewThumbnailUrl(e.target.value)}
              className="p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold focus:outline-blue-500 dark:text-white transition-all"
            />
          </div>
          <textarea
            placeholder="Course Description..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold focus:outline-blue-500 dark:text-white transition-all"
            rows={2}
          />
          <button
            type="submit"
            className="bg-emerald-600 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20"
          >
            Save Course
          </button>
        </form>
      )}

      {/* List of Courses */}
      {loading ? (
        <div className="p-12 text-center font-bold text-slate-400">Loading curriculum data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const phaseCount = course.course_phases?.length || 0;
            const totalLessons = course.course_phases?.reduce((acc, p) => acc + (p.course_lessons?.length || 0), 0);

            return (
              <div
                key={course.id}
                onClick={() => {
                  fetchCourseDetails(course.id);
                  setActiveTab('curriculum');
                }}
                className="rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group cursor-pointer"
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="h-36 w-full bg-slate-200 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <ImageIcon size={28} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">No Cover Image</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCourseCover(course);
                          setEditThumbnailUrl(course.thumbnail_url || "");
                        }}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-md transition-colors shadow-xs"
                        title="Change Cover Image"
                      >
                        <Edit3 size={14} />
                      </button>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-md border shadow-xs ${course.is_active ? "bg-emerald-500/90 text-white border-emerald-400/30" : "bg-slate-900/80 text-slate-300 border-white/10"}`}>
                        {course.is_active ? "Active" : "Draft"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 pb-3">
                    <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight truncate">{course.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 line-clamp-2">
                      {course.description || "No description specified."}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <div className="flex flex-col gap-0.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/10">
                      <span className="text-slate-400 flex items-center gap-1 text-[10px]"><GraduationCap size={13}/> Students</span>
                      <span className="text-slate-700 dark:text-slate-200 text-xs">{course.student_count || 0} Enrolled</span>
                    </div>
                    <div className="flex flex-col gap-0.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/10">
                      <span className="text-slate-400 flex items-center gap-1 text-[10px]"><Users size={13}/> Tutors</span>
                      <span className="text-slate-700 dark:text-slate-200 text-xs">{course.tutor_count || 0} Assigned</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-bold">
                      <span className="flex items-center gap-1"><Layers size={13} className="text-blue-500" /> {phaseCount}</span>
                      <span className="flex items-center gap-1"><BookMarked size={13} className="text-purple-500" /> {totalLessons}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchCourseDetails(course.id);
                          setActiveTab('curriculum');
                        }}
                        className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        Manage
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(course.id);
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Delete Course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT COURSE COVER MODAL */}
      {editingCourseCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 md:p-8 max-w-md w-full border border-slate-100 dark:border-white/10 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Change Cover Image</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Update thumbnail preview for {editingCourseCover.title}.</p>
              </div>
              <button onClick={() => setEditingCourseCover(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCourseCover} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Thumbnail Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={editThumbnailUrl}
                  onChange={e => setEditThumbnailUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              {editThumbnailUrl.trim() && (
                <div className="h-32 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800">
                  <img src={editThumbnailUrl} alt="Preview" className="w-full h-full object-cover" onError={(e)=>{e.target.style.display='none'}} />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourseCover(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCover}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {updatingCover ? "Updating..." : "Save Cover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE COURSE MODAL (Deep Dive) */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-4xl border border-slate-100 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/10 flex justify-between items-start gap-4">
              <div className="flex gap-4 items-start">
                {selectedCourse.thumbnail_url && (
                  <img src={selectedCourse.thumbnail_url} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-white/10" />
                )}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-500/20 mb-2 inline-block">
                    Course Management
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{selectedCourse.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{selectedCourse.description}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 transition-colors shrink-0">
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-6 md:px-8 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
              <button 
                onClick={() => setActiveTab('curriculum')}
                className={`py-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === 'curriculum' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <LayoutList size={16} /> Curriculum Builder
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                className={`py-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <Activity size={16} /> Student Progress ({selectedCourse.enrolled_users?.length || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-transparent">
              {detailsLoading ? (
                <div className="py-12 text-center text-slate-400 font-bold text-sm flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                  Loading course ecosystem...
                </div>
              ) : (
                <>
                  {/* CURRICULUM TAB */}
                  {activeTab === 'curriculum' && (
                    <div className="space-y-8">
                      {/* Persistent Add Phase Form (Always Visible) */}
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await handleCreatePhase(e);
                        }} 
                        className="p-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shadow-sm"
                      >
                        <div className="flex-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Add New Phase</label>
                          <input
                            type="text"
                            placeholder="Phase Title (e.g., Introduction to Syntax)"
                            value={newPhaseTitle}
                            onChange={(e) => setNewPhaseTitle(e.target.value)}
                            disabled={creatingPhase}
                            className="w-full p-3 text-sm rounded-xl border border-white dark:border-white/10 shadow-sm font-bold focus:outline-blue-500 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={creatingPhase || !newPhaseTitle.trim()} 
                          className="sm:mt-5 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shrink-0"
                        >
                          {creatingPhase ? "Creating..." : "Create Phase"}
                        </button>
                      </form>

                      {/* Existing Phases */}
                      <div className="space-y-4">
                        {selectedCourse.course_phases?.sort((a,b) => a.phase_number - b.phase_number).map((phase) => (
                          <div key={phase.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                          
                            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
  <h5 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{phase.phase_number}</span>
    {phase.title}
  </h5>
  <div className="flex items-center gap-3">
    <span className="text-xs font-bold text-slate-400">{phase.course_lessons?.length || 0} Lessons</span>
    <button
      onClick={() => handleDeletePhase(phase.id)}
      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
      title="Delete Phase"
    >
      <Trash2 size={16} />
    </button>
  </div>
</div>
                            
                            <div className="p-4 space-y-2">
                              {phase.course_lessons?.sort((a,b) => a.position - b.position).map((lesson, idx) => (
                                <div 
                                  key={lesson.id} 
                                  onClick={() => fetchLessonExtras(lesson)}
                                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-blue-50/50 dark:bg-white/5 dark:hover:bg-blue-500/10 border border-slate-100 dark:border-white/10 cursor-pointer group transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="text-slate-300 dark:text-slate-600 font-black text-sm w-6">{(idx + 1).toString().padStart(2, '0')}</div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{lesson.title}</div>
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-150 transition-opacity bg-blue-100 dark:bg-blue-500/20 px-2 py-1 rounded-lg">
                                    Edit Notes / Quiz &rarr;
                                  </span>
                                </div>
                              ))}
                              
                              {/* Add Lesson inline form */}
                              <form onSubmit={(e) => handleCreateLesson(e, phase.id)} className="flex items-center gap-2 mt-2 pt-2">
                                <input
                                  type="text"
                                  placeholder="Add new lesson title..."
                                  value={newLessonTitles[phase.id] || ""}
                                  onChange={(e) => setNewLessonTitles({...newLessonTitles, [phase.id]: e.target.value})}
                                  className="flex-1 p-2.5 text-xs rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-transparent focus:bg-slate-50 dark:focus:bg-white/5 font-bold focus:outline-blue-500 dark:text-white transition-colors"
                                />
                                <button type="submit" disabled={!newLessonTitles[phase.id]?.trim()} className="p-2.5 bg-slate-100 dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-colors disabled:opacity-50">
                                  <Plus size={16} />
                                </button>
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STUDENTS TAB */}
                  {activeTab === 'students' && (
                    <div className="space-y-4">
                      {sortedStudents.length === 0 ? (
                        <div className="text-center p-12 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                          <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                          <p className="text-slate-500 dark:text-slate-400 font-bold">No students currently assigned or enrolled in this course track.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sortedStudents.map((student) => {
                            const progress = calculateStudentProgress(student);
                            return (
                              <div key={student.id} className="p-5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-black text-slate-900 dark:text-white">{student.full_name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{student.email}</p>
                                  </div>
                                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-lg">
                                    <Activity size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{progress}%</span>
                                  </div>
                                </div>

                                {/* Progress Bar UI */}
                                <div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    <span>Course Progress</span>
                                    {progress === 100 && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12}/> Completed</span>}
                                  </div>
                                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}


{selectedLesson && (
        <QuizBuilderModal
          selectedLesson={selectedLesson}
          selectedCourse={selectedCourse}
          onClose={() => setSelectedLesson(null)}
        />
      )}

    </div>
  );
}