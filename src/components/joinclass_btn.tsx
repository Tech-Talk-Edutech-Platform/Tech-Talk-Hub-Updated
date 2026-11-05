import { useEffect, useState } from 'react';
import { supabase } from '../supabase'; // Adjust your import

export default function JoinClassButton({ studentId }) {
  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUpcomingClass() {
      const { data, error } = await supabase
        .from('v_upcoming_student_classes')
        .select('*')
        .eq('student_id', studentId)
        .order('start_time', { ascending: true })
        .single();

      if (!error) setClassInfo(data);
      setLoading(false);
    }
    fetchUpcomingClass();
  }, [studentId]);

  if (loading || !classInfo) return null;

  const handleJoin = () => {
    // You could also log the attendance here if you wanted to track 
    // exactly when they clicked 'Join'
    window.open(classInfo.meet_link, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleJoin}
      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg animate-pulse transition-all"
    >
      Join {classInfo.title} Now
    </button>
  );
}
// 'use client';
// import { useEffect, useState } from 'react';
// import { supabase } from '../supabase';

// // 1. Define the child component FIRST
// export function JoinClassButton({ studentId }) {
//   const [classInfo, setClassInfo] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function fetchUpcomingClass() {
//       const { data, error } = await supabase
//         .from('v_upcoming_student_classes')
//         .select('*')
//         .eq('student_id', studentId)
//         .order('start_time', { ascending: true })
//         .single();

//       if (!error && data) setClassInfo(data);
//       setLoading(false);
//     }
//     if (studentId) fetchUpcomingClass();
//   }, [studentId]);

//   if (loading || !classInfo) return null;

//   return (
//     <button
//       onClick={() => window.open(classInfo.meet_link, '_blank', 'noopener,noreferrer')}
//       className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg animate-pulse transition-all"
//     >
//       Join {classInfo.title} Now
//     </button>
//   );
// }

// // 2. Then define the Page component
// export default function JoinPage() {
//   const [studentId, setStudentId] = useState(null);

//   useEffect(() => {
//     async function getUser() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user) setStudentId(user.id);
//     }
//     getUser();
//   }, []);

//   if (!studentId) return <p className="p-10">Loading or please log in...</p>;

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen">
//       <h1 className="text-2xl font-bold mb-6">Class Portal</h1>
//       <JoinClassButton studentId={studentId} />
//     </div>
//   );
// }
// // // app/join/page.jsx
// // 'use client';
// // import { useEffect, useState } from 'react';
// // import { supabase } from '@/lib/supabaseClient';

// // export default function JoinPage() {
// //   const [studentId, setStudentId] = useState(null);

// //   useEffect(() => {
// //     // Get the currently logged-in user
// //     async function getUser() {
// //       const { data: { user } } = await supabase.auth.getUser();
// //       if (user) setStudentId(user.id);
// //     }
// //     getUser();
// //   }, []);

// //   if (!studentId) return <p>Loading or please log in...</p>;

// //   return (
// //     <div className="flex flex-col items-center justify-center min-h-screen">
// //       <h1 className="text-2xl font-bold mb-6">Class Portal</h1>
// //       <JoinClassButton studentId={studentId} />
// //     </div>
// //   );
// // }

// // // Include your JoinClassButton component logic here 
// // // or import it if you placed it in a separate file
// // import { useEffect, useState } from 'react';
// // import { supabase } from '../supabase'; // Adjust your import

// // export default function JoinClassButton({ studentId }) {
// //   const [classInfo, setClassInfo] = useState(null);
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     async function fetchUpcomingClass() {
// //       const { data, error } = await supabase
// //         .from('v_upcoming_student_classes')
// //         .select('*')
// //         .eq('student_id', studentId)
// //         .order('start_time', { ascending: true })
// //         .single();

// //       if (!error) setClassInfo(data);
// //       setLoading(false);
// //     }
// //     fetchUpcomingClass();
// //   }, [studentId]);

// //   if (loading || !classInfo) return null;

// //   const handleJoin = () => {
// //     // You could also log the attendance here if you wanted to track 
// //     // exactly when they clicked 'Join'
// //     window.open(classInfo.meet_link, '_blank', 'noopener,noreferrer');
// //   };

// //   return (
// //     <button
// //       onClick={handleJoin}
// //       className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg animate-pulse transition-all"
// //     >
// //       Join {classInfo.title} Now
// //     </button>
// //   );
// // }