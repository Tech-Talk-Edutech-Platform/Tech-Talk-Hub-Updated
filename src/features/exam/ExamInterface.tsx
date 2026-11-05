import React, { useState } from 'react';
import { Clock, Flag, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const examData = {
  questions: Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    text: `This is the text for question number ${i + 1}.`,
    options: ["Option A", "Option B", "Option C", "Option D"]
  }))
};

export default function EnhancedExamInterface() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { 1: "Option A" }
  const [flags, setFlags] = useState({}); // { 1: true }

  const toggleFlag = (id) => setFlags(prev => ({ ...prev, [id]: !prev[id] }));
  const handleSelect = (qId, option) => setAnswers(prev => ({ ...prev, [qId]: option }));

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 1. Sidebar Navigation */}
      <aside className="w-64 bg-white border-r p-6 overflow-y-auto">
        <h3 className="font-bold mb-4">Question Overview</h3>
        <div className="grid grid-cols-4 gap-2">
          {examData.questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`h-10 w-10 rounded border text-sm font-medium ${
                flags[q.id] ? 'bg-yellow-100 border-yellow-400' :
                answers[q.id] ? 'bg-green-100 border-green-500' : 'bg-gray-50'
              }`}
            >
              {q.id}
            </button>
          ))}
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white p-4 border-b flex justify-between items-center">
          <h1 className="font-bold text-lg">Mathematics Assessment</h1>
          <div className="flex items-center gap-2 text-red-600 font-mono font-bold">
            <Clock size={20} /> 45:00
          </div>
        </header>

        <section className="flex-1 p-8">
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <h2 className="text-xl mb-6">{examData.questions[currentIdx].text}</h2>
            <div className="space-y-4">
              {examData.questions[currentIdx].options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelect(examData.questions[currentIdx].id, opt)}
                  className={`block w-full p-4 border rounded ${answers[examData.questions[currentIdx].id] === opt ? 'bg-blue-50 border-blue-600' : 'hover:bg-gray-50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Bottom Controls */}
        <footer className="p-6 bg-white border-t flex justify-between">
          <button onClick={() => toggleFlag(examData.questions[currentIdx].id)} className="flex items-center gap-2 text-yellow-600">
            <Flag size={20} /> Flag for Review
          </button>
          <div className="flex gap-4">
            <button onClick={() => setCurrentIdx(p => Math.max(0, p - 1))} className="px-6 py-2 border rounded">Previous</button>
            <button onClick={() => setCurrentIdx(p => Math.min(examData.questions.length - 1, p + 1))} className="px-6 py-2 bg-blue-600 text-white rounded">Next</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
// // components/ExamInterface.jsx
// import React, { useState } from 'react';
// import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

// const examData = {
//   title: "Advanced Mathematics Final",
//   questions: [
//     { id: 1, text: "Solve for x: 2x + 5 = 15", options: ["3", "5", "7", "10"], answer: "5" },
//     { id: 2, text: "What is the derivative of x²?", options: ["x", "2x", "x²", "1"], answer: "2x" },
//     { id: 3, text: "Calculate the area of a circle with radius 3.", options: ["3π", "6π", "9π", "12π"], answer: "9π" },
//   ]
// };

// export default function ExamInterface() {
//   const [currentIdx, setCurrentIdx] = useState(0);
//   const [answers, setAnswers] = useState({});

//   const handleSelect = (option) => {
//     setAnswers({ ...answers, [examData.questions[currentIdx].id]: option });
//   };

//   const currentQ = examData.questions[currentIdx];

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-8">
//       <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
//         {/* Header */}
//         <header className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
//           <h1 className="text-xl font-bold">{examData.title}</h1>
//           <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full">
//             <Clock size={18} />
//             <span className="font-mono">45:00</span>
//           </div>
//         </header>

//         {/* Question Area */}
//         <div className="p-8">
//           <div className="mb-8">
//             <span className="text-sm text-gray-500 uppercase font-semibold">Question {currentIdx + 1} of {examData.questions.length}</span>
//             <h2 className="text-2xl mt-2">{currentQ.text}</h2>
//           </div>

//           <div className="space-y-3">
//             {currentQ.options.map((option) => (
//               <button
//                 key={option}
//                 onClick={() => handleSelect(option)}
//                 className={`w-full text-left p-4 rounded-lg border-2 transition ${
//                   answers[currentQ.id] === option 
//                   ? 'border-blue-600 bg-blue-50' 
//                   : 'border-gray-200 hover:border-gray-300'
//                 }`}
//               >
//                 {option}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Footer Navigation */}
//         <footer className="p-6 border-t flex justify-between items-center bg-gray-50">
//           <button 
//             disabled={currentIdx === 0}
//             onClick={() => setCurrentIdx(prev => prev - 1)}
//             className="flex items-center gap-2 text-gray-600 disabled:opacity-50"
//           >
//             <ChevronLeft size={20} /> Previous
//           </button>
          
//           <button 
//             onClick={() => currentIdx < examData.questions.length - 1 ? setCurrentIdx(prev => prev + 1) : alert('Submitted!')}
//             className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
//           >
//             {currentIdx === examData.questions.length - 1 ? 'Finish Exam' : 'Next'}
//             {currentIdx === examData.questions.length - 1 ? <CheckCircle2 size={20} /> : <ChevronRight size={20} />}
//           </button>
//         </footer>
//       </div>
//     </div>
//   );
// }