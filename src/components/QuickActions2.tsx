import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  BookOpen,
  MessageSquare,
  FileText,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import { supabase } from "../supabase";
import toast from "react-hot-toast";

// Component Imports
import UserManagement from "../features/accounts/UserManagement";
import StudentAssignmentManager from "../features/accounts/StudentAssignmentManager";
import StudentAssignments from "../features/assessments/assignment/StudentAssignments";
import AdminNotesManager from "./AdminNotesManager";
import Sales from "./Sales";

// ===== MAIN COMPONENT =====
export default function QuickActions2({ userId, role, courseId }) {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showStudentTutorAssignment, setShowStudentTutorAssignment] = useState(false);
  const [showTrialMaterial, setShowTrialMaterial] = useState(false);
  const [showCourseMaterial, setShowCourseMaterial] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);

  const [showTutorNotesModal, setShowTutorNotesModal] = useState(false);
  const [studentsWithCourses, setStudentsWithCourses] = useState([]);
  const [showExamForm, setShowExamForm] = useState(false);

  // Data States
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentTasks, setStudentTasks] = useState([]);

  const GOOGLE_DOC_URL = "https://docs.google.com/document/d/1DNIqIxd52u_8Qe8vcWZ0ANMNh35AR4FCWzoLfK_Dq5M/preview";
  const TUTOR_FEEDBACK_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSeCEoH7LmNeU89c-WXKS4-Kc9H0uU4nYO4t2S8hAjb7btM__Q/viewform?embedded=true";

  const actionConfigs = {
    student: [
      { label: "My Homework", icon: Star, color: "bg-amber-400" },
      { label: "Class Notes", icon: BookOpen, color: "bg-indigo-500" },
      { label: "Take Exam", icon: CheckCircle, color: "bg-green-600" }
    ],
    owner: [
      { label: "User Management", icon: ShieldAlert, color: "bg-indigo-600" },
      { label: "Trial Student/Tutor Assignments", icon: FileText, color: "bg-emerald-600" },
      { label: "Add Notes", icon: BookOpen, color: "bg-indigo-500" },
      { label: "Invoices & Receipts", icon: FileText, color: "bg-green-500" },
      { label: "Create Exam", icon: FileText, color: "bg-purple-600" }
    ],
    tutor: [
      { label: "Trial Class Material", icon: Star, color: "bg-amber-400" },
      { label: "Notes", icon: BookOpen, color: "bg-indigo-500" },
      { label: "Course Assignment", icon: CheckCircle, color: "bg-indigo-500" },
      { label: "Feedback Form", icon: FileText, color: "bg-orange-600" },
    ],
  };

  const currentActions = actionConfigs[role] || [];

  const fetchTutorStudents = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("assigned_tutor_id", userId)
      .order("full_name");
    if (data) setStudents(data);
  };

  const fetchTutorStudentsWithCourses = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, assigned_course_id")
      .eq("assigned_tutor_id", userId)
      .not("assigned_course_id", "is", null)
      .order("full_name");
    if (data) setStudentsWithCourses(data);
  };

  const handleActionClick = async (label) => {
    if (label === "User Management") {
      return navigate("/users");
    }
    if (label === "Trial Student/Tutor Assignments") {
      return navigate("/student-assignment");
    }
    if (label === "Trial Class Material") return setShowTrialMaterial(true);

    if (label === "Take Exam") {
      // return setShowExamForm(true);
      return navigate("/exam");
    }
    if (label === "My Homework") {
      return navigate("/receive-homework");
    }
    if (label === "Invoices & Receipts") return setShowInvoicesModal(true);
    if (label === "Add Notes") {
      return navigate("/upload-notes");
    }
    if (label === "Create Exam") {
      return navigate("/create-exam");
    }

    if (label === "Course Assignment") {
      await fetchTutorStudents();
      return setShowCourseMaterial(true);
    }

    if (label === "Feedback Form") {
      await fetchTutorStudents();
      return setShowFeedbackModal(true);
    }

    if (label === "Class Notes" || label === "Notes") {
      if (role === 'student') {
        if (courseId) return navigate(`/learning/${courseId}`);
        return toast.error("No course assigned.");
      }

      if (role === 'tutor') {
        await fetchTutorStudentsWithCourses();
        setShowTutorNotesModal(true);
        return;
      }
    } else {
      toast.error("No course assigned to this account.");
      return;
    }
  };

  const handleSelectStudent = async (studentId) => {
    setSelectedStudent(studentId);
    const { data: assignmentData } = await supabase
      .from("student_assignments")
      .select("id, task_name, status")
      .eq("student_id", studentId);

    setStudentTasks(
      assignmentData?.map((a) => ({ id: a.id, name: a.task_name, status: a.status })) || []
    );
  };

  return (
    <>
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900">Actions</h3>
          <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-bold uppercase">
            {role}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {currentActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action.label)}
              className="group flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-50 hover:shadow-lg transition active:scale-95"
            >
              <div className={`p-3 rounded-xl ${action.color} text-white mb-3`}>
                <action.icon size={20} />
              </div>
              <span className="text-[11px] font-black text-slate-600 text-center">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {showTutorNotesModal && (
        <Modal title="Select Student Notes" onClose={() => setShowTutorNotesModal(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {studentsWithCourses.length > 0 ? studentsWithCourses.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/learning/${s.assigned_course_id}`)}
                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-2xl transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-slate-900">{s.full_name}</p>
                  <p className="text-xs text-slate-500 uppercase font-black">View Curriculum</p>
                </div>
                <BookOpen className="text-slate-300 group-hover:text-indigo-500" size={20} />
              </button>
            )) : (
              <p className="text-slate-500 col-span-2 py-10 text-center">No students with assigned courses found.</p>
            )}
          </div>
        </Modal>
      )}

      {showExamForm && (
        <Modal title="Exam" onClose={() => setShowExamForm(false)}>
          <iframe
            src="https://form.typeform.com/to/Tz2QEJqO"
            className="w-full h-[1000px] border-0 rounded-xl"
            allow="camera; microphone; autoplay; encrypted-media;"
            title="Exam Form"
          />
        </Modal>
      )}

      {showTrialMaterial && (
        <Modal title="Trial Class Material" onClose={() => setShowTrialMaterial(false)}>
          <iframe src={GOOGLE_DOC_URL} className="w-full h-[600px] border rounded-lg" title="Trial Material" />
        </Modal>
      )}

      {showCourseMaterial && (
        <Modal title="Course Assignment" onClose={() => setShowCourseMaterial(false)}>
          <div className="flex gap-6">
            <div className="w-1/3 border-r pr-4">
              <h3 className="font-bold mb-4">Select Student</h3>
              {students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStudent(s.id)}
                  className={`w-full text-left p-3 rounded-xl mb-2 transition ${selectedStudent === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {s.full_name}
                </button>
              ))}
            </div>
            <div className="w-2/3">
              <h3 className="font-bold mb-4">Recent Progress</h3>
              {studentTasks.length > 0 ? studentTasks.map((task) => (
                <div key={task.id} className="p-3 bg-slate-50 rounded-lg border mb-2 flex justify-between">
                  <span>{task.name}</span>
                  <span className="text-xs font-bold uppercase">{task.status}</span>
                </div>
              )) : <p className="text-slate-400">Select a student to see tasks.</p>}
            </div>
          </div>
        </Modal>
      )}

      {showInvoicesModal && (
        <Modal title="Invoices & Receipts" onClose={() => setShowInvoicesModal(false)}>
          <Sales />
        </Modal>
      )}

      {showExamModal && (
        <Modal title="Select Exam" onClose={() => setShowExamModal(false)}>
          <div className="grid gap-3">
            {exams.length > 0 ? exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => navigate(`/exam/${exam.id}`)}
                className="p-4 bg-slate-50 hover:bg-indigo-50 rounded-xl text-left"
              >
                <p className="font-bold">{exam.title}</p>
                <p className="text-xs text-slate-500">Start Exam</p>
              </button>
            )) : (
              <p className="text-slate-400">No exams available</p>
            )}
          </div>
        </Modal>
      )}

      {showFeedbackModal && (
        <Modal title="Student Feedback" onClose={() => setShowFeedbackModal(false)}>
          <iframe src={TUTOR_FEEDBACK_FORM} className="w-full h-[600px] border rounded-lg" title="Feedback Form" />
        </Modal>
      )}
    </>
  );
}

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
    <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-8 relative">
      <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700">
        <X size={22} />
      </button>
      <h2 className="text-2xl font-black mb-6">{title}</h2>
      {children}
    </div>
  </div>
);
