// import { useEffect, useState } from "react";
// import { supabase } from "../supabase";
// import { X } from "lucide-react";
// import toast from "react-hot-toast";
// import QuickActions from "./QuickActions"; // adjust path if needed

// export default function StudentList({ tutorId }) {
//   const [students, setStudents] = useState([]);
//   const [showAllModal, setShowAllModal] = useState(false);
//   const [selectedStudent, setSelectedStudent] = useState(null);

//   const [assignments, setAssignments] = useState([]);
//   const [notes, setNotes] = useState("");

//   const [taskName, setTaskName] = useState("");
//   const [message, setMessage] = useState("");

//   const [showAssignment, setShowAssignment] = useState(false);
//   const [showMessage, setShowMessage] = useState(false);

//   useEffect(() => {
//     const fetchStudents = async () => {
//       const { data } = await supabase
//         .from("students")
//         .select("*")
//         .eq("assigned_tutor_id", tutorId)
//         .order("created_at", { ascending: false });
//       if (data) setStudents(data);
//     };
//     if (tutorId) fetchStudents();
//   }, [tutorId]);

//   useEffect(() => {
//     const fetchStudentData = async () => {
//       if (!selectedStudent) return;

//       const { data: assignmentsData } = await supabase
//         .from("student_assignments")
//         .select("*")
//         .eq("student_id", selectedStudent.id)
//         .order("created_at", { ascending: false });

//       const { data: notesData } = await supabase
//         .from("student_notes_progress")
//         .select("*")
//         .eq("student_id", selectedStudent.id)
//         .single();

//       if (assignmentsData) setAssignments(assignmentsData);
//       if (notesData) setNotes(notesData.topic || "");
//     };

//     fetchStudentData();
//   }, [selectedStudent]);

//   const markComplete = async (id) => {
//     const { error } = await supabase
//       .from("student_assignments")
//       .update({ status: "completed" })
//       .eq("id", id);

//     if (!error) {
//       setAssignments((prev) =>
//         prev.map((a) => (a.id === id ? { ...a, status: "completed" } : a))
//       );
//       toast.success("Assignment completed");
//     }
//   };

//   const addAssignment = async () => {
//     if (!taskName) return;

//     const { error } = await supabase
//       .from("student_assignments")
//       .insert({
//         student_id: selectedStudent.id,
//         tutor_id: tutorId,
//         task_name: taskName,
//         status: "pending",
//       });

//     if (!error) {
//       toast.success("Assignment added");
//       setTaskName("");
//       setShowAssignment(false);
//       setAssignments([{ task_name: taskName, status: "pending", id: Date.now() }, ...assignments]);
//     }
//   };

//   const sendMessage = async () => {
//     if (!message) return;

//     const { error } = await supabase
//       .from("messages")
//       .insert({
//         sender_id: tutorId,
//         receiver_id: selectedStudent.id,
//         content: message,
//       });

//     if (!error) {
//       toast.success("Message sent");
//       setMessage("");
//       setShowMessage(false);
//     }
//   };

//   const saveNotes = async () => {
//     const { error } = await supabase
//       .from("student_notes_progress")
//       .upsert({
//         student_id: selectedStudent.id,
//         tutor_id: tutorId,
//         topic: notes,
//       });

//     if (!error) toast.success("Lesson progress saved");
//   };

//   const renderStudent = (s) => (
//     <div
//       key={s.id}
//       onClick={() => setSelectedStudent(s)}
//       className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition"
//     >
//       <img
//         src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
//           s.full_name
//         )}`}
//         className="w-10 h-10 rounded-full"
//       />

//       <div className="flex-1">
//         <p className="text-sm font-bold">{s.full_name}</p>
//         <p className="text-xs text-slate-400">{s.course_name}</p>
//       </div>

//       <span className="text-xs font-bold">{s.progress || 0}%</span>
//     </div>
//   );

//   return (
//     <>
//       {/* MAIN CARD */}
//       <div className="bg-white p-6 rounded-2xl shadow-sm">
//         <h3 className="font-bold mb-6">Students</h3>
//         <div className="space-y-3">
//           {students.slice(0, 3).map(renderStudent)}
//         </div>
//         {students.length > 3 && (
//           <button
//             onClick={() => setShowAllModal(true)}
//             className="text-blue-600 text-xs font-bold mt-3 hover:underline"
//           >
//             View All &gt;
//           </button>
//         )}
//       </div>

//       {/* VIEW ALL MODAL */}
//       {showAllModal && (
//         <Modal title="All Students" onClose={() => setShowAllModal(false)}>
//           <div className="space-y-3">
//             {students.map(renderStudent)}
//           </div>
//         </Modal>
//       )}

//       {/* STUDENT DASHBOARD */}
//       {selectedStudent && (
//         <Modal
//           // title={`Dashboard: ${selectedStudent.full_name}`}
//           onClose={() => setSelectedStudent(null)}
//         >
//           <div className="flex flex-col md:flex-row gap-8">
//             {/* LEFT COLUMN: PROFILE */}
//             <div className="md:w-1/3 flex flex-col items-center gap-4">
//               <img
//                 src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
//                   selectedStudent.full_name
//                 )}`}
//                 className="w-32 h-32 rounded-full"
//               />
//               <h3 className="font-bold text-lg text-center">{selectedStudent.full_name}</h3>
//               <p className="text-sm text-slate-500 text-center">{selectedStudent.course_name}</p>
//               <QuickActions tutorId={tutorId} role="tutor" />
//             </div>

//             {/* RIGHT COLUMN: ASSIGNMENTS + NOTES */}
//             <div className="md:w-2/3 space-y-6">
//               {/* ASSIGNMENTS */}
//               <div>
//                 <h4 className="font-bold mb-2">Assignments</h4>
//                 {assignments.map((a) => (
//                   <div
//                     key={a.id}
//                     className="flex justify-between bg-slate-50 p-3 rounded-xl text-sm mb-2"
//                   >
//                     <span>{a.task_name}</span>
//                     {a.status === "completed" ? (
//                       <span className="text-green-600 text-xs font-bold">
//                         Completed
//                       </span>
//                     ) : (
//                       <button
//                         onClick={() => markComplete(a.id)}
//                         className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg"
//                       >
//                         Complete
//                       </button>
//                     )}
//                   </div>
//                 ))}

//                 {/* ADD ASSIGNMENT */}
//                 {showAssignment && (
//                   <div className="mt-3">
//                     <input
//                       value={taskName}
//                       onChange={(e) => setTaskName(e.target.value)}
//                       placeholder="Assignment name"
//                       className="w-full border p-2 rounded-xl"
//                     />
//                     <button
//                       onClick={addAssignment}
//                       className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
//                     >
//                       Save Assignment
//                     </button>
//                   </div>
//                 )}
//               </div>

//               {/* MESSAGE */}
//               {showMessage && (
//                 <div>
//                   <h4 className="font-bold mb-2">Message Student</h4>
//                   <textarea
//                     value={message}
//                     onChange={(e) => setMessage(e.target.value)}
//                     className="w-full border p-3 rounded-xl"
//                   />
//                   <button
//                     onClick={sendMessage}
//                     className="mt-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm"
//                   >
//                     Send Message
//                   </button>
//                 </div>
//               )}

//               {/* LESSON NOTES */}
//               <div>
//                 <h4 className="font-bold mb-2">Lesson Notes</h4>
//                 <textarea
//                   value={notes}
//                   onChange={(e) => setNotes(e.target.value)}
//                   className="w-full h-40 border rounded-xl p-3 text-sm"
//                 />
//                 <button
//                   onClick={saveNotes}
//                   className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
//                 >
//                   Save Progress
//                 </button>
//               </div>
//             </div>
//           </div>
//         </Modal>
//       )}
//     </>
//   );
// }

// /* MODAL COMPONENT */
// const Modal = ({ title, children, onClose }) => (
//   <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
//     <div className="bg-white w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl p-8 relative">
//       <button
//         onClick={onClose}
//         className="absolute top-6 right-6 text-slate-400"
//       >
//         <X size={22} />
//       </button>

//       <h2 className="text-xl font-black mb-6">{title}</h2>
//       {children}
//     </div>
//   </div>
// );
import { useEffect, useState } from "react";
import { supabase } from "../../../supabase";
import { X } from "lucide-react";
import toast from "react-hot-toast";

export default function StudentList({ tutorId }) {
  const [students, setStudents] = useState([]);
  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState("");

  const [taskName, setTaskName] = useState("");
  const [message, setMessage] = useState("");

  const [showAssignment, setShowAssignment] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // FETCH STUDENTS
  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("assigned_tutor_id", tutorId)
        .order("created_at", { ascending: false });

      if (data) setStudents(data);
    };

    if (tutorId) fetchStudents();
  }, [tutorId]);

  // FETCH STUDENT DETAILS
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!selectedStudent) return;

      const { data: assignmentsData } = await supabase
        .from("student_assignments")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .order("created_at", { ascending: false });

      const { data: notesData } = await supabase
        .from("user_notes_progress")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .single();

      if (assignmentsData) setAssignments(assignmentsData);
      if (notesData) setNotes(notesData?.topic || "");
    };

    fetchStudentData();
  }, [selectedStudent]);

  const markComplete = async (id) => {
    const { error } = await supabase
      .from("student_assignments")
      .update({ status: "completed" })
      .eq("id", id);

    if (!error) {
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "completed" } : a))
      );
      toast.success("Assignment completed");
    }
  };

  const addAssignment = async () => {
    if (!taskName) return;

    const { error } = await supabase
      .from("student_assignments")
      .insert({
        student_id: selectedStudent.id,
        tutor_id: tutorId,
        task_name: taskName,
        status: "pending",
      });

    if (!error) {
      toast.success("Assignment added");
      setTaskName("");
      setShowAssignment(false);
    }
  };

  const sendMessage = async () => {
    if (!message) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: tutorId,
      receiver_id: selectedStudent.id,
      content: message,
    });

    if (!error) {
      toast.success("Message sent");
      setMessage("");
      setShowMessage(false);
    }
  };

  const saveNotes = async () => {
    const { error } = await supabase
      .from("student_notes_progress")
      .upsert({
        student_id: selectedStudent.id,
        tutor_id: tutorId,
        topic: notes,
      });

    if (!error) toast.success("Lesson progress saved");
  };

  const renderStudent = (s) => (
    <div
      key={s.id}
      onClick={() => setSelectedStudent(s)}
      className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-xl"
    >
      <img
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
          s.full_name
        )}`}
        className="w-10 h-10 rounded-full"
      />

      <div className="flex-1">
        <p className="text-sm font-bold">{s.full_name}</p>
        <p className="text-xs text-slate-400">{s.course_name}</p>
      </div>

{/*<span className="text-xs font-bold">{s.progress || 0}%</span>*/}
       
          
    </div>
  );

  return (
    <>
      {/* MAIN CARD */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold mb-6">Students</h3>

        <div className="space-y-3">
          {students.slice(0, 3).map(renderStudent)}
        </div>

        {/* ✅ VIEW MORE BUTTON */}
        {students.length > 3 && (
          // <button
          //   onClick={() => setShowAllModal(true)}
          //   className="mt-4 text-sm text-blue-600 font-bold"
          // >
          //   View More
          // </button>
          <button
            onClick={() => setShowAllModal(true)}
            className="text-blue-600 text-xs font-bold hover:underline"
          >
            View All &gt;
          </button>
        )}

      </div>

      {/* ✅ ALL STUDENTS MODAL */}
      {showAllModal && (
        <Modal title="All Students" onClose={() => setShowAllModal(false)}>
          <div className="space-y-3">
            {students.map(renderStudent)}
          </div>
        </Modal>
      )}

      {/* STUDENT DASHBOARD */}
      {selectedStudent && (
        <Modal
          title="Student Dashboard"
          onClose={() => setSelectedStudent(null)}
        >
          <div className="space-y-6">
            {/* PROFILE */}
            <div className="flex items-center gap-4">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  selectedStudent.full_name
                )}`}
                className="w-16 h-16 rounded-full"
              />

              <div>
                <h3 className="font-bold text-lg">
                  {selectedStudent.full_name}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedStudent.course_name}
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-3 gap-3">
              <button className="bg-blue-600 text-white py-2 rounded-xl text-sm">
                🚀 Start Class
              </button>

              <button
                onClick={() => setShowAssignment(!showAssignment)}
                className="bg-indigo-600 text-white py-2 rounded-xl text-sm"
              >
                📝 Add Assignment
              </button>

              <button
                onClick={() => setShowMessage(!showMessage)}
                className="bg-slate-900 text-white py-2 rounded-xl text-sm"
              >
                💬 Message Student
              </button>
            </div>

            {/* ASSIGNMENT */}
            {showAssignment && (
              <div>
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Assignment name"
                  className="w-full border p-2 rounded-xl"
                />
                <button
                  onClick={addAssignment}
                  className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
                >
                  Save Assignment
                </button>
              </div>
            )}

            {/* MESSAGE */}
            {showMessage && (
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border p-3 rounded-xl"
                />
                <button
                  onClick={sendMessage}
                  className="mt-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm"
                >
                  Send Message
                </button>
              </div>
            )}

            {/* ASSIGNMENTS */}
            <div>
              <h4 className="font-bold mb-2">Assignments</h4>

              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between bg-slate-50 p-3 rounded-xl text-sm mb-2"
                >
                  <span>{a.task_name}</span>

                  {a.status === "completed" ? (
                    <span className="text-green-600 text-xs font-bold">
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => markComplete(a.id)}
                      className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg"
                    >
                      Complete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* NOTES */}
            <div>
              <h4 className="font-bold mb-2">Lesson Notes</h4>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-28 border rounded-xl p-3 text-sm"
              />

              <button
                onClick={saveNotes}
                className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
              >
                Save Progress
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
    <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl p-8 relative">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-slate-400"
      >
        <X size={22} />
      </button>

      <h2 className="text-xl font-black mb-6">{title}</h2>
      {children}
    </div>
  </div>
);
