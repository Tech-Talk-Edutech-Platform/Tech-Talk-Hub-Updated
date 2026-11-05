// import React, { useEffect, useState, useCallback, useRef } from "react";
// import FullCalendar from "@fullcalendar/react";
// import dayGridPlugin from "@fullcalendar/daygrid";
// import timeGridPlugin from "@fullcalendar/timegrid";
// import interactionPlugin from "@fullcalendar/interaction";
// import { supabase } from "../supabase";
// import { useNavigate } from "react-router-dom";
// import { ArrowLeft, X, ChevronDown } from "lucide-react";
// import toast, { Toaster } from "react-hot-toast";
// import "../../src/fullcalendar.css";

// // Utility to check if two time ranges overlap
// const timesOverlap = (start1, end1, start2, end2) => {
//   return new Date(start1) < new Date(end2) && new Date(end1) > new Date(start2);
// };

// export default function FullCalendarView() {
//   const navigate = useNavigate();
//   const calendarRef = useRef(null);

//   const [reassignEvent, setReassignEvent] = useState(null);
//   const [selectedNewTutor, setSelectedNewTutor] = useState("");
//   const [events, setEvents] = useState([]);
//   const [students, setStudents] = useState([]);
//   const [trialLeads, setTrialLeads] = useState([]);
//   const [tutors, setTutors] = useState([]);
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [showTrial, setShowTrial] = useState(true);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [userRole, setUserRole] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const isAdminRole = (role) => ["owner", "tech_admin", "operations_admin"].includes(role);

//   const getTutorColor = (id) => {
//     const colors = ["#eab308", "#3b82f6", "#10b981", "#8b5cf6", "#ee692c", "#f472b6"];
//     return id ? colors[id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length] : colors[0];
//   };

//   const fetchUser = useCallback(async () => {
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return;
//     setCurrentUser(user);
//     const { data: profile } = await supabase
//       .from("users")
//       .select("id, role, full_name")
//       .eq("id", user.id)
//       .single();
//     setUserRole(profile?.role);
//   }, []);

//   const fetchData = useCallback(async () => {
//     const { data: tutorsData } = await supabase.from("users").select("id, full_name, personal_meet_link").in("role", ["tutor"]);
//     setTutors(tutorsData || []);

//     const { data: studentsData } = await supabase.from("students").select("id, full_name, assigned_tutor_id, preferred_time, preferred_date");
//     setStudents(studentsData || []);

//     const { data: leadsData } = await supabase.from("leads").select("id, student_name, assigned_tutor_id, class_date, class_time");
//     setTrialLeads(leadsData || []);

//     const { data: calendarData } = await supabase.from("calendar_events").select(`
//       id, start_time, end_time, tutor_id, meet_link, event_type, title, event_attendance(student_id, students(full_name))
//     `);

//     const mappedEvents = (calendarData || []).map((e) => {
//       const studentNames = e.event_attendance?.map(a => a.students?.full_name) || [];
//       const isFree = studentNames.length === 0 && e.event_type !== 'trial';
//       const tutorName = tutorsData?.find(t => t.id === e.tutor_id)?.full_name;
//       const tutorColor = getTutorColor(e.tutor_id);

//       if (userRole === "tutor" && e.tutor_id !== currentUser?.id) return null;

//       const breakEvents = [];
//       const endTime = new Date(e.end_time);
//       const breakStart = new Date(endTime);
//       const breakEnd = new Date(breakStart.getTime() + 15 * 60 * 1000);
//       breakEvents.push({
//         id: "break-" + e.id,
//         start: breakStart,
//         end: breakEnd,
//         display: "background",
//         backgroundColor: "#f3f4f6",
//         extendedProps: { isTempBreak: true },
//       });

//       return [
//         {
//           id: e.id,
//           title: isFree ? `Free - ${tutorName}` : (e.title || studentNames.join(", ")),
//           start: e.start_time,
//           end: e.end_time,
//           backgroundColor: isFree ? "#f1f5f9" : tutorColor,
//           borderColor: tutorColor,
//           textColor: isFree ? "#334155" : "#fff",
//           extendedProps: {
//             tutorId: e.tutor_id,
//             tutorName,
//             assigned: !isFree,
//             type: e.event_type || "course",
//             meet_link: e.meet_link
//           },
//         },
//         ...breakEvents
//       ];
//     }).flat().filter(Boolean);

//     setEvents(mappedEvents);
//   }, [currentUser, userRole]);

//   useEffect(() => { fetchUser(); }, [fetchUser]);
//   useEffect(() => { if (currentUser) fetchData(); }, [fetchData, currentUser]);

//   const handleAssign = async (studentId, tutorId, type) => {
//     if (!tutorId) return;
//     setLoading(true);

//     try {
//       const { data: tutor } = await supabase.from("users").select("personal_meet_link, full_name").eq("id", tutorId).single();

//       if (!tutor?.personal_meet_link) {
//         toast.error("Tutor has no company meeting link set!");
//         setLoading(false);
//         return;
//       }

//       if (type === "trial") {
//         const lead = trialLeads.find(l => l.id === studentId);
//         const start = new Date(`${lead.class_date}T${lead.class_time}`);

//         await supabase.from("calendar_events").insert({
//           tutor_id: tutorId,
//           start_time: start.toISOString(),
//           end_time: new Date(start.getTime() + 3600000).toISOString(),
//           meet_link: tutor.personal_meet_link,
//           event_type: 'trial',
//           title: `Trial: ${lead.student_name}`
//         });
//         await supabase.from("leads").update({ assigned_tutor_id: tutorId }).eq("id", studentId);
//       } else {
//         const slot = events.find(e => e.extendedProps.tutorId === tutorId && !e.extendedProps.assigned && !e.extendedProps.isTempBreak);
//         if (!slot) { toast.error("No free slot available."); return; }

//         await supabase.from("calendar_events").update({
//           meet_link: tutor.personal_meet_link,
//           event_type: 'regular'
//         }).eq("id", slot.id);
//         await supabase.from("event_attendance").insert({ student_id: studentId, event_id: slot.id });
//         await supabase.from("students").update({ assigned_tutor_id: tutorId }).eq("id", studentId);
//       }

//       toast.success("Booking Confirmed!");
//       fetchData();
//     } catch (err) {
//       toast.error("Booking failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getFreeTutorsForStudent = (student) => {
//     const sDate = student.class_date || student.preferred_date;
//     const sTime = student.class_time || student.preferred_time;
//     if (!sDate || !sTime) return tutors;

//     const desiredStart = new Date(`${sDate}T${sTime}`);
//     const desiredEnd = new Date(desiredStart.getTime() + 3600000);

//     return tutors.filter(t => {
//       const hasConflict = events.some(e =>
//         e.extendedProps.tutorId === t.id &&
//         e.extendedProps.assigned &&
//         timesOverlap(desiredStart, desiredEnd, e.start, e.end)
//       );
//       return !hasConflict;
//     });
//   };

//   const tutorSummary = tutors.map(t => {
//     const booked = events.filter(e => e.extendedProps.tutorId === t.id && e.extendedProps.assigned).length;
//     const free = events.filter(e => e.extendedProps.tutorId === t.id && !e.extendedProps.assigned && !e.extendedProps.isTempBreak).length;
//     return { ...t, booked, free, color: getTutorColor(t.id) };
//   });

//   const handleSelect = async (info) => {
//     if (userRole !== "tutor") return;
//     const start = info.start;
//     const end = new Date(start.getTime() + 3600000);

//     const hasConflict = events.some(e =>
//       e.extendedProps?.tutorId === currentUser.id &&
//       !e.extendedProps?.isTempBreak &&
//       timesOverlap(start, end, e.start, e.end)
//     );

//     if (hasConflict) {
//       toast.error("Time conflict detected");
//       return;
//     }

//     const { error } = await supabase.from("calendar_events").insert({
//       title: "Free Slot",
//       start_time: start.toISOString(),
//       end_time: end.toISOString(),
//       tutor_id: currentUser.id,
//       event_type: 'regular'
//     });

//     if (error) toast.error("Failed to create slot");
//     else { toast.success("Slot Created"); fetchData(); }
//   };

//   const availableStudents = showTrial ? trialLeads.filter(l => !l.assigned_tutor_id) : students.filter(s => !s.assigned_tutor_id);

//   return (
//     <div className="flex min-h-screen bg-slate-50 relative">
//       <Toaster />

//       {sidebarOpen && isAdminRole(userRole) && (
//         <div className="absolute left-0 top-0 bottom-0 w-80 bg-white p-4 border-r shadow-lg z-50 overflow-y-auto">
//           <div className="flex justify-between mb-4">
//             <h2 className="font-bold">Students</h2>
//             <button onClick={() => setSidebarOpen(false)}><X size={18} /></button>
//           </div>
//           <div className="flex gap-2 mb-4">
//             <button className={`flex-1 py-2 rounded font-bold ${showTrial ? "bg-blue-600 text-white" : "bg-slate-100"}`} onClick={() => setShowTrial(true)}>Trials</button>
//             <button className={`flex-1 py-2 rounded font-bold ${!showTrial ? "bg-blue-600 text-white" : "bg-slate-100"}`} onClick={() => setShowTrial(false)}>Courses</button>
//           </div>

//           {availableStudents.map((s) => {
//             const freeTutors = getFreeTutorsForStudent(s);
//             return (
//               <div key={s.id} className="p-4 mb-3 rounded-2xl border bg-white shadow-sm">
//                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.preferred_date || s.class_date} @ {s.preferred_time || s.class_time}</div>
//                 <div className="font-bold text-slate-900 mb-3">{showTrial ? s.student_name : s.full_name}</div>
//                 <select className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" onChange={e => handleAssign(s.id, e.target.value, showTrial ? "trial" : "course")} defaultValue="">
//                   <option value="" disabled>{freeTutors.length ? "Assign Tutor" : "No Tutors Free"}</option>
//                   {freeTutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
//                 </select>
//               </div>
//             )
//           })}
//         </div>
//       )}

//       {!sidebarOpen && isAdminRole(userRole) && <button onClick={() => setSidebarOpen(true)} className="absolute left-0 top-20 z-40 bg-slate-900 text-white px-4 py-3 rounded-r-2xl font-bold shadow-lg">Students</button>}

//       <div className={`flex-1 p-6 transition-all ${sidebarOpen ? "ml-80" : ""}`}>
//         <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
//           {tutorSummary.map((t, i) => (
//             <div key={i} className="p-4 rounded-2xl shadow-sm text-white" style={{ backgroundColor: t.color }}>
//               <div className="font-black text-lg">{t.full_name}</div>
//               <div className="text-xs opacity-80 font-bold uppercase tracking-tighter">Free: {t.free} | Booked: {t.booked}</div>
//             </div>
//           ))}
//         </div>

//         <div className="flex items-center justify-between mb-6">
//           <div className="flex items-center gap-4">
//             <button onClick={() => navigate(-1)} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-colors"><ArrowLeft size={20} /></button>
//             <h1 className="text-2xl font-black text-slate-900 tracking-tight">Global Schedule</h1>
//           </div>
//         </div>

//         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
//           <FullCalendar
//             ref={calendarRef}
//             plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
//             initialView="timeGridWeek"
//             events={events}
//             editable={userRole === "tutor"}
//             selectable={userRole === "tutor"}
//             select={handleSelect}
//             headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
//             allDaySlot={false}
//             nowIndicator
//             eventClick={async (info) => {
//               const isBooked = info.event.extendedProps.assigned;
//               const { meet_link, type } = info.event.extendedProps;

//               if (isBooked && meet_link) {
//                 if (window.confirm(`Join ${type} class now?`)) {
//                   window.open(meet_link, "_blank");
//                   return;
//                 }
//               }

//               if (userRole === "tutor" && !isBooked) {
//                 if (window.confirm("Delete this free slot?")) {
//                   await supabase.from("calendar_events").delete().eq("id", info.event.id);
//                   toast.success("Slot deleted");
//                   fetchData();
//                 }
//               }

//               if (isAdminRole(userRole) && isBooked) {
//                 setReassignEvent(info.event);
//                 setSelectedNewTutor(info.event.extendedProps.tutorId);
//               }
//             }}
//           />
//         </div>
//       </div>

//       {reassignEvent && (
//         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
//           <div className="bg-white p-8 rounded-[32px] w-full max-w-md shadow-2xl">
//             <h2 className="text-xl font-black mb-6">Reassign Class</h2>
//             <select value={selectedNewTutor} onChange={(e) => setSelectedNewTutor(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mb-6 outline-none">
//               {tutors.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
//             </select>
//             <div className="flex gap-3">
//               <button onClick={() => setReassignEvent(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Cancel</button>
//               <button onClick={async () => {
//                 await supabase.from("calendar_events").update({ tutor_id: selectedNewTutor }).eq("id", reassignEvent.id);
//                 toast.success("Reassigned");
//                 setReassignEvent(null);
//                 fetchData();
//               }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black">Save Change</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// // }
import React, { useEffect, useState, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../../supabase";
import { isAdminRole } from "../../types/roles";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import "../../../src/fullcalendar.css";

export default function FullCalendarView() {
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const [reassignEvent, setReassignEvent] = useState(null);
  const [selectedNewTutor, setSelectedNewTutor] = useState("");

  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [trialLeads, setTrialLeads] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTrial, setShowTrial] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);


  const getTutorColor = (id) => {
    const colors = ["#eab308", "#3b82f6", "#10b981", "#8b5cf6", "#ee692c", "#f472b6"];
    return id ? colors[id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length] : colors[0];
  };

  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCurrentUser(null);
      setUserRole(null);
      return;
    }
    const { data: profile } = await supabase
      .from("users")
      .select("id, role, full_name")
      .eq("id", user.id)
      .single();
    setCurrentUser(user);
    setUserRole(profile?.role);
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    const { data: tutorsData } = await supabase.from("users").select("id, full_name").in("role", ["tutor"]);
    setTutors(tutorsData || []);

    const { data: subscribedData } = await supabase.from("users").select("id, full_name, subscription_tier").eq("role", "student");
    setStudents(subscribedData || []);

    const { data: leadsData } = await supabase.from("leads").select("id, student_name, assigned_tutor_id, class_date, class_time");
    setTrialLeads(leadsData || []);

    const { data: calendarData } = await supabase.from("calendar_events").select(`
      id, start_time, end_time, tutor_id, meet_link, event_type, title, event_attendance(student_id)
    `);

    const mappedEvents = (calendarData || []).map((e) => {
      // Logic: Admins see everything. Tutors only see their own slots.
      if (userRole === "tutor" && e.tutor_id !== currentUser.id) return null;

      const isBooked = e.event_attendance && e.event_attendance.length > 0;
      const tutorName = tutorsData?.find(t => t.id === e.tutor_id)?.full_name || "Tutor";
      const tutorColor = getTutorColor(e.tutor_id);

      const mainEvent = {
        id: e.id,
        title: isBooked ? (e.title || "Booked Class") : `Free - ${tutorName}`,
        start: e.start_time, // FullCalendar reads ISO strings directly
        end: e.end_time,
        backgroundColor: isBooked ? tutorColor : "#f1f5f9",
        borderColor: tutorColor,
        textColor: isBooked ? "#fff" : "#334155",
        extendedProps: {
          tutorId: e.tutor_id,
          assigned: isBooked,
          type: e.event_type,
          meet_link: e.meet_link
        },
      };

      // Add the 15-minute break visual
      const breakEvent = {
        id: `break-${e.id}`,
        start: e.end_time,
        end: new Date(new Date(e.end_time).getTime() + 15 * 60 * 1000).toISOString(),
        display: "background",
        backgroundColor: "#f3f4f6",
        extendedProps: { isTempBreak: true },
      };

      return [mainEvent, breakEvent];
    }).flat().filter(Boolean);

    setEvents(mappedEvents);
  }, [currentUser, userRole]);

  useEffect(() => { void fetchUser(); }, [fetchUser]);
  useEffect(() => { if (currentUser) fetchData(); }, [fetchData, currentUser]);

  const handleSelect = async (info) => {
    if (userRole !== "tutor") return;

    const start = info.startStr;
    const end = new Date(new Date(info.startStr).getTime() + 3600000).toISOString();

    const { error } = await supabase.from("calendar_events").insert({
      title: "Free Slot",
      start_time: start,
      end_time: end,
      tutor_id: currentUser.id
    });

    if (error) {
      toast.error("Failed to create slot");
    } else {
      toast.success("Slot created");
      fetchData();
    }
  };

  const handleAssign = async (studentId, tutorId, type) => {
    if (!tutorId) return;
    try {
      const { data: tutor } = await supabase.from("users").select("personal_meet_link, full_name").eq("id", tutorId).single();
      if (!tutor?.personal_meet_link) { toast.error("Tutor has no meet link!"); return; }

      if (type === "trial") {
        const lead = trialLeads.find(l => l.id === studentId);
        const start = `${lead.class_date}T${lead.class_time}`;
        const { data: newEv } = await supabase.from("calendar_events").insert({
          tutor_id: tutorId, start_time: start, end_time: new Date(new Date(start).getTime() + 3600000).toISOString(),
          meet_link: tutor.personal_meet_link, event_type: 'trial', title: `Trial: ${lead.student_name}`
        }).select().single();
        await supabase.from("leads").update({ assigned_tutor_id: tutorId }).eq("id", studentId);
        await supabase.from("event_attendance").insert({ student_id: studentId, event_id: newEv.id });
      } else {
        const slot = events.find(e => e.extendedProps.tutorId === tutorId && !e.extendedProps.assigned && !e.extendedProps.isTempBreak);
        if (!slot) { toast.error("No free slot available."); return; }
        const sName = students.find(s => s.id === studentId)?.full_name;
        await supabase.from("calendar_events").update({ meet_link: tutor.personal_meet_link, event_type: 'regular', title: `Class: ${sName}` }).eq("id", slot.id);
        await supabase.from("event_attendance").insert({ student_id: studentId, event_id: slot.id });
      }
      toast.success("Assigned!");
      fetchData();
    } catch (err) { toast.error("Error"); }
  };

  const tutorSummary = tutors.map(t => ({
    ...t,
    booked: events.filter(e => e.extendedProps?.tutorId === t.id && e.extendedProps?.assigned).length,
    free: events.filter(e => e.extendedProps?.tutorId === t.id && !e.extendedProps?.assigned && !e.extendedProps?.isTempBreak).length,
    color: getTutorColor(t.id)
  }));

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <Toaster />

      {sidebarOpen && isAdminRole(userRole) && (
        <div className="absolute left-0 top-0 bottom-0 w-80 bg-white p-4 border-r shadow-lg z-50 overflow-y-auto">
          <div className="flex justify-between mb-4"><h2 className="font-bold">Students</h2><button onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
          <div className="flex gap-2 mb-4">
            <button className={`flex-1 px-3 py-1 rounded ${showTrial ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setShowTrial(true)}>Trials</button>
            <button className={`flex-1 px-3 py-1 rounded ${!showTrial ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setShowTrial(false)}>Subscribers</button>
          </div>
          {(showTrial ? trialLeads.filter(l => !l.assigned_tutor_id) : students).map((s) => (
            <div key={s.id} className="p-3 mb-3 border rounded bg-gray-50 shadow-sm">
              <div className="flex justify-between items-start mb-1"><span className="font-bold text-sm">{showTrial ? s.student_name : s.full_name}</span><span className="text-[10px] bg-blue-100 px-2 rounded">{showTrial ? "Trial" : s.subscription_tier}</span></div>
              <select className="mt-2 w-full border rounded p-1 text-xs" onChange={e => handleAssign(s.id, e.target.value, showTrial ? "trial" : "regular")} defaultValue=""><option value="" disabled>Select Tutor</option>{tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
            </div>
          ))}
        </div>
      )}

      <div className={`flex-1 p-4 ${sidebarOpen ? "ml-80" : ""}`}>
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tutorSummary.map((t) => (
            <div key={t.id} className="p-3 rounded-xl text-white shadow" style={{ backgroundColor: t.color }}>
              <span className="font-bold">{t.full_name}</span>
              <div className="text-xs">Free: {t.free} | Booked: {t.booked}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          {!sidebarOpen && isAdminRole(userRole) && <button onClick={() => setSidebarOpen(true)} className="bg-purple-600 text-white px-3 py-2 rounded shadow">Students</button>}
          <button onClick={() => navigate(-1)} className="p-2 bg-white border rounded"><ArrowLeft size={18} /></button>
          <h1 className="text-xl font-bold">Global Schedule</h1>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <FullCalendar
            key={`${userRole}-${events.length}`} // Forces re-render when data or role changes
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            events={events}
            nowIndicator={true}
            allDaySlot={false}
            height="auto"
            slotMinTime="07:00:00"
            editable={userRole === "tutor"}
            selectable={userRole === "tutor"}
            select={handleSelect}
            eventClick={async (info) => {
              if (info.event.extendedProps.isTempBreak) return;
              const isBooked = info.event.extendedProps.assigned;
              if (isBooked && info.event.extendedProps.meet_link) {
                if (window.confirm("Join class?")) window.open(info.event.extendedProps.meet_link, "_blank");
              } else if (userRole === "tutor" && window.confirm("Delete slot?")) {
                await supabase.from("calendar_events").delete().eq("id", info.event.id);
                fetchData();
              } else if (isAdminRole(userRole) && isBooked) {
                setReassignEvent(info.event);
                setSelectedNewTutor(info.event.extendedProps.tutorId);
              }
            }}
          />
        </div>
      </div>

      {reassignEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-xl">
            <h2 className="font-bold mb-4">Reassign Tutor</h2>
            <select value={selectedNewTutor} onChange={(e) => setSelectedNewTutor(e.target.value)} className="w-full border rounded p-2 mb-4">{tutors.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
            <div className="flex justify-end gap-3"><button onClick={() => setReassignEvent(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button><button onClick={async () => { await supabase.from("calendar_events").update({ tutor_id: selectedNewTutor }).eq("id", reassignEvent.id); setReassignEvent(null); fetchData(); }} className="px-4 py-2 bg-purple-600 text-white rounded">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
