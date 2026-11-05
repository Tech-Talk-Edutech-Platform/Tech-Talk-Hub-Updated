// CREATE OR REPLACE FUNCTION get_next_class(user_id uuid, role user_role)
// RETURNS TABLE(event_id uuid, class_title text, meet_link text, start_time timestamptz, end_time timestamptz) AS $$
// BEGIN
//   IF role = 'tutor' THEN
//     RETURN QUERY
//     SELECT e.id, e.title, e.meet_link, e.start_time, e.end_time
//     FROM calendar_events e
//     WHERE e.tutor_id = user_id AND e.end_time > now()
//     ORDER BY e.start_time ASC LIMIT 1;
//   ELSIF role = 'student' THEN
//     RETURN QUERY
//     SELECT e.id, e.title, e.meet_link, e.start_time, e.end_time
//     FROM calendar_events e
//     JOIN classes c ON e.class_id = c.id
//     JOIN students s ON c.student_id = s.id
// --FIX: Link the student record to the User ID from Auth
// WHERE(s.id = user_id OR s.assigned_tutor_id = user_id) 
//       AND e.end_time > now()
//     ORDER BY e.start_time ASC LIMIT 1;
//   END IF;
// END;
// $$ LANGUAGE plpgsql STABLE;
import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { toast } from "react-hot-toast";
import { X, Send, FilePlus, ChevronRight, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuickActions({ tutorId, role, studentId }) {
  const navigate = useNavigate();
  const [modalType, setModalType] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [studentTasks, setStudentTasks] = useState([]); // Added to store tasks

  // Form States
  const [message, setMessage] = useState("");
  const [taskName, setTaskName] = useState("");
  const [category, setCategory] = useState(""); // Default empty to handle dynamic course
  const [taskUrl, setTaskUrl] = useState("");

  // Effect to fetch tasks when a student is selected
  useEffect(() => {
    if (selectedStudent && modalType === "assignment") {
      fetchStudentTasks(selectedStudent.id);
      // Auto-set category to the student's assigned course if available
      if (selectedStudent.assigned_course_id) {
        setCategory(selectedStudent.assigned_course_id);
      }
    }
  }, [selectedStudent, modalType]);

  const fetchStudentTasks = async (sId) => {
    const { data, error } = await supabase
      .from("student_assignments")
      .select("*")
      .eq("student_id", sId)
      .order("created_at", { ascending: false });
    if (!error) setStudentTasks(data || []);
  };

  const handleSendMessage = async () => {
    if (!selectedStudent || !message.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: tutorId || studentId,
          receiver_id: selectedStudent.id,
          content: message,
          is_read: false,
        },
      ]);

    if (error) {
      toast.error("Message failed: " + error.message);
    } else {
      toast.success("Message sent!");
      setMessage("");
      setTimeout(() => closeModal(), 600);
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    setLoading(true);
    if (role === "student") {
      const { data: userData } = await supabase
        .from("users")
        .select("assigned_tutor_id")
        .eq("id", studentId)
        .single();

      if (userData?.assigned_tutor_id) {
        const { data: tutor } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("id", userData.assigned_tutor_id)
          .single();

        if (tutor) {
          setStudents([tutor]);
          setSelectedStudent(tutor);
        }
      }
    } else if (role === "tutor") {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, assigned_course_id") // Fetch assigned_course_id here
        .eq("assigned_tutor_id", tutorId)
        .order("full_name");

      if (!error) setStudents(data || []);

    }
    setLoading(false);
  };

  // const handleStartClass = async () => {
  //   if (!tutorId && role === "tutor") return;
  //   if (!studentId && role === "student") return;

  //   setLoading(true);
  //   const { data, error } = await supabase.rpc("get_next_class", {
  //     user_id: role === "tutor" ? tutorId : studentId,
  //     role,
  //   });

  //   const classData = Array.isArray(data) ? data[0] : data;
  //   if (error || !classData) {
  //     toast.error("No upcoming class found.");
  //     setLoading(false);
  //     return;
  //   }

  //   const meetingLink = classData.meet_link;
  //   if (meetingLink) {
  //     localStorage.setItem("class_in_progress", "true");
  //     setHasStarted(true);
  //     toast.success(hasStarted ? "Rejoining..." : `Starting: ${classData.class_title || classData.title}`);
  //     const courseIdForNav = classData.course_id || classData.id;
  //     navigate(`/learning/${courseIdForNav}`, { state: { openVideo: true, classData } });
  //   } else {
  //     toast.error("No meeting link available.");
  //   }
  //   setLoading(false);
  // };
  const handleStartClass = async () => {

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_next_class", {
        user_id: role === "tutor" ? tutorId : studentId,
        role,
      });

      if (error) throw error;

      // If data is null or an empty array []
      if (!data || data.length === 0) {
        toast.error("No upcoming class found in the calendar.");
        return;
      }

      const classData = data[0];
      if (!classData.meet_link) {
        toast.error("Class found, but no meeting link is set!");
        return;
      }

      // Success redirect...
      navigate(`/learning/${classData.event_id}`, { state: { classData } });

    } catch (err) {
      toast.error("Connection failed. Check your console.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type) => {
    setModalType(type);
    fetchStudents();
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedStudent(null);
    setMessage("");
    setTaskName("");
    setTaskUrl("");
    setCategory("");
    setStudentTasks([]);
  };

  // const handleAddAssignment = async () => {
  //   console.log("Submitting:", { tutorId, studentId: selectedStudent.id, category });
  //   if (!selectedStudent || !taskName.trim()) return;
  //   setLoading(true);
  //   const { error } = await supabase.from("student_assignments").insert([
  //     {
  //       tutor_id: tutorId,
  //       student_id: selectedStudent.id,
  //       task_name: taskName,
  //       category: category,
  //       task_url: taskUrl,
  //       status: "pending",
  //     },
  //   ]);

  //   if (error) {
  //     toast.error("Failed to add assignment");
  //   } else {
  //     toast.success("Task assigned!");
  //     // FIXED: Clear inputs after success
  //     setTaskName("");
  //     setTaskUrl("");
  //     fetchStudentTasks(selectedStudent.id); // Refresh list
  //   }
  //   setLoading(false);
  // };
  const handleAddAssignment = async () => {
    if (!tutorId || !selectedStudent || !taskName.trim()) {
      console.log("Missing required fields");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("student_assignments")
      .insert([
        {
          tutor_id: tutorId,
          student_id: selectedStudent.id,
          task_name: taskName,
          category: category || null,           // Optional, send null if empty
          submission_link: taskUrl || null,     // Optional
          status: "pending",
        },
      ]);

    setLoading(false);

    if (error) {
      console.log("INSERT ERROR:", error.message);
      toast.error("Failed to add assignment: " + error.message);
      return;
    }

    toast.success("Assignment added successfully!");
    // Refresh tasks for this student
    fetchStudentTasks(selectedStudent.id);
    // Clear inputs
    setTaskName("");
    setTaskUrl("");
    setCategory("");
  };
  // const handleAddAssignment = async () => {
  //   if (!selectedStudent || !taskName.trim()) return;
  //   setLoading(true);

  //   const { error } = await supabase.from("student_assignments").insert([
  //     {
  //       tutor_id: tutorId,
  //       student_id: selectedStudent.id,
  //       task_name: taskName,
  //       // FIX: If category is empty string, send null so Postgres UUID doesn't crash
  //       category: category || null,
  //       task_url: taskUrl || null,
  //       status: "pending",
  //     },
  //   ]);

  //   if (error) {
  //     console.error("Insert Error:", error);
  //     toast.error("Error: " + error.message);
  //   } else {
  //     toast.success("Task assigned!");
  //     setTaskName("");
  //     setTaskUrl("");
  //     fetchStudentTasks(selectedStudent.id);
  //   }
  //   setLoading(false);
  // };

  const tutorActions = [
    { label: hasStarted ? "Rejoin Class" : "Start Next Class", color: "bg-blue-600", icon: hasStarted ? "🔄" : "🚀", onClick: handleStartClass },
    { label: "Add Assignment", color: "bg-indigo-600", icon: "📝", onClick: () => handleOpenModal("assignment") },
    { label: "Message Student", color: "bg-slate-800", icon: "💬", onClick: () => handleOpenModal("message") },
  ];

  const studentActions = [
    { label: "Join Next Class", color: "bg-blue-600", icon: "🎓", onClick: handleStartClass },
    { label: "Message Teacher", color: "bg-slate-800", icon: "💬", onClick: () => handleOpenModal("message") },
  ];

  const actions = role === "tutor" ? tutorActions : studentActions;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
      <div className="flex justify-between items-center mb-5">
        {hasStarted && (
          <button
            onClick={() => { localStorage.removeItem("class_in_progress"); setHasStarted(false); }}
            className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 uppercase"
          >
            <RotateCcw size={12} /> Reset Status
          </button>
        )}
      </div>

      <div className="space-y-3">
        {actions.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className={`w-full py-4 rounded-xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 ${btn.color}`}
          >
            <span className="text-xl">{btn.icon}</span>
            {btn.label}
          </button>
        ))}
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900">
                {modalType === "message" ? "Send Message" : "Create Assignment"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {!selectedStudent ? (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                  {role === "tutor" ? "Choose a Student" : "Your Teacher"}
                </p>
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all font-bold flex justify-between items-center"
                  >
                    {s.full_name} {role === "tutor" && <ChevronRight size={16} className="text-blue-500" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setSelectedStudent(null)} className="text-blue-600 text-xs font-bold mb-2">
                  ← Back to List
                </button>

                {modalType === "assignment" && (
                  <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <h3 className="text-xs font-black uppercase text-indigo-400 mb-3 tracking-widest">Student Progress</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {studentTasks.length > 0 ? studentTasks.map((task) => (
                        <div key={task.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-800 text-sm">{task.task_name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.status === 'submitted' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                              {task.status}
                            </span>
                          </div>
                          {task.status === 'submitted' && (
                            <button
                              onClick={() => toast(task.submission_text, { icon: '📖', duration: 6000 })}
                              className="text-[10px] font-black text-indigo-600 underline uppercase"
                            >
                              View Submission
                            </button>
                          )}
                        </div>
                      )) : <p className="text-xs text-slate-400">No tasks found.</p>}
                    </div>
                  </div>
                )}

                {modalType === "message" ? (
                  <>
                    <textarea
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm h-32 resize-none"
                      placeholder="Type your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button
                      disabled={loading || !message.trim()}
                      onClick={handleSendMessage}
                      className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                    >
                      <Send size={18} /> {loading ? "SENDING..." : "SEND MESSAGE"}
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Task Name"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                    />
                    {/* FIXED: Dropdown only includes the student's assigned course */}
                    <select
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Select Course</option>
                      {selectedStudent.assigned_course_id && (
                        <option value={selectedStudent.assigned_course_id}>
                          {selectedStudent.assigned_course_id}
                        </option>
                      )}

                    </select>
                    <input
                      type="url"
                      placeholder="Resource URL (Optional)"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                      value={taskUrl}
                      onChange={(e) => setTaskUrl(e.target.value)}
                    />
                    <button
                      disabled={loading || !taskName.trim()}
                      onClick={handleAddAssignment}
                      className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
                    >
                      <FilePlus size={18} /> {loading ? "CREATING..." : "ASSIGN TASK"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
