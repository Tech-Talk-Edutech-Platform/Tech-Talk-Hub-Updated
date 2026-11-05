import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { useNavigate } from 'react-router-dom'

export default function StudentAssignmentManager() {
  const [courseStudents, setCourseStudents] = useState([]);
  const [trialStudents, setTrialStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [studentDetails, setStudentDetails] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const { data: tutorsData, error: tutorError } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "tutor")
      .eq("is_active", true);

    if (tutorError) console.error(tutorError);
    setTutors(tutorsData || []);

    const { data: courseData } = await supabase
      .from("users")
      .select("*")
      .eq("role", "student");

    setCourseStudents(courseData || []);

    const { data: trialData } = await supabase
      .from("students")
      .select("*")
      .order("full_name", { ascending: true });

    setTrialStudents(trialData || []);

    setLoading(false);
  }

  // ✅ STRONG ASSIGNMENT LOGIC
  async function handleAssign(student, tutorId) {
    let error;

    if (student.type === "course") {
      const res = await supabase
        .from("users")
        .update({ assigned_tutor_id: tutorId || null })
        .eq("id", student.id);
      error = res.error;
    } else {
      const res = await supabase
        .from("students")
        .update({ assigned_tutor_id: tutorId || null })
        .eq("id", student.id);
      error = res.error;
    }

    if (error) {
      console.error("Assignment failed:", error.message);
      alert("Failed to assign tutor");
      return;
    }

    // ✅ Optimistic update (no lag feel)
    if (student.type === "course") {
      setCourseStudents((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, assigned_tutor_id: tutorId } : s
        )
      );
    } else {
      setTrialStudents((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, assigned_tutor_id: tutorId } : s
        )
      );
    }
  }

  async function handleStudentClick(student) {
    if (expandedStudentId === student.id) {
      setExpandedStudentId(null);
      return;
    }

    let res;

    if (student.type === "course") {
      res = await supabase
        .from("users")
        .select("*")
        .eq("id", student.id)
        .single();
    } else {
      res = await supabase
        .from("students")
        .select("*")
        .eq("id", student.id)
        .single();
    }

    if (res.error) {
      console.error(res.error);
      return;
    }

    setStudentDetails(res.data);
    setExpandedStudentId(student.id);
  }

  if (loading) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white font-mono">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600 tracking-widest uppercase text-xs mt-4 font-bold">
        Fetching...
      </span>
    </div>
  );
  const allStudents = [
    ...courseStudents.map((s) => ({ ...s, type: "course" })),
    ...trialStudents.map((s) => ({ ...s, type: "trial" })),
  ];

  // ✅ FILTER
  const filteredStudents =
    activeFilter === "all"
      ? allStudents
      : allStudents.filter((s) => s.type === activeFilter);

  // ✅ STATS
  const total = allStudents.length;
  const courseCount = courseStudents.length;
  const trialCount = trialStudents.length;
  // const unassigned = allStudents.filter(
  //   (s) => !s.assigned_tutor_id
  // ).length;
  const unassigned = allStudents.filter(
    (s) => !s.assigned_tutor_id || s.assigned_tutor_id === ""
  ).length;

  return (
    <div className="p-7">
      {/* <h2 className="text-xl font-semibold mb-6">
        Student Tutor Assignments
      </h2> */}
      <button
        onClick={() => navigate(`/:role`)}
        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-sm mb-3"
      >
        ← Back
      </button>
      {/* ✅ STATS CARDS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white shadow rounded-xl">
          <p className="text-gray-500 text-sm">Total Students</p>
          <h2 className="text-2xl font-bold">{total}</h2>
        </div>

        <div className="p-4 bg-white shadow rounded-xl">
          <p className="text-gray-500 text-sm">Course Students</p>
          <h2 className="text-2xl font-bold">{courseCount}</h2>
        </div>

        <div className="p-4 bg-white shadow rounded-xl">
          <p className="text-gray-500 text-sm">Trial Students</p>
          <h2 className="text-2xl font-bold">{trialCount}</h2>
        </div>

        <div className="p-4 bg-white shadow rounded-xl">
          <p className="text-gray-500 text-sm">Unassigned</p>
          <h2 className="text-2xl font-bold">{unassigned}</h2>
        </div>
      </div>

      {/* ✅ FILTER TABS */}
      <div className="flex gap-3 mb-6">
        {["all", "course", "trial"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-2 rounded-lg border ${activeFilter === tab
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600"
              }`}
          >
            {tab === "all"
              ? "All"
              : tab === "course"
                ? "Course"
                : "Trial"}
          </button>
        ))}
      </div>

      {/* ✅ LIST */}
      <div className="space-y-4">
        {filteredStudents.map((student) => {
          const assignedTutor = tutors.find(
            (t) => t.id === student.assigned_tutor_id
          );

          return (
            <div key={student.id} className="border rounded-xl">
              <div className="flex items-center justify-between p-4">
                <span className="text-xs text-gray-500 w-24">
                  {student.type === "course" ? "Course" : "Trial"}
                </span>

                <span
                  className="flex-1 cursor-pointer text-blue-600"
                  onClick={() => handleStudentClick(student)}
                >
                  {student.full_name}
                </span>

                <select
                  className="border rounded-lg px-3 py-2"
                  value={student.assigned_tutor_id || ""}
                  onChange={(e) =>
                    handleAssign(student, e.target.value)
                  }
                >
                  <option value="">Unassigned</option>
                  {tutors.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {tutor.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {expandedStudentId === student.id && studentDetails && (
                <div className="p-4 bg-slate-50 border-t">
                  <p><strong>Name:</strong> {studentDetails.full_name}</p>

                  {student.type === "trial" && (
                    <>
                      <p><strong>Parent:</strong> {studentDetails.parent_name}</p>
                      <p><strong>Phone:</strong> {studentDetails.parent_phone}</p>
                    </>
                  )}

                  <p>
                    <strong>Tutor:</strong>{" "}
                    {assignedTutor
                      ? assignedTutor.full_name
                      : "Unassigned"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
