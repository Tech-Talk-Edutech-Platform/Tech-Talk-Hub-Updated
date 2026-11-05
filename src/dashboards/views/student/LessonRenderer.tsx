function LessonRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Keep normal h2 and h3 standard, and selectively handle custom styles
        h2: ({ children }) => renderByteHeading(children, "h2"),
        h3: ({ children }) => renderByteHeading(children, "h3"),
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

function renderByteHeading(children, level) {
  const rawTitle = String(children);
  const normalizedTitle = rawTitle.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

  const styles = {
    "byte explains": "bg-rose-500 border-rose-200 bg-rose-50/50 text-rose-500",
    "byte shows you how": "bg-blue-500 border-blue-200 bg-blue-50/50 text-blue-500",
    "byte shows you": "bg-blue-500 border-blue-200 bg-blue-50/50 text-blue-500",
    "byte asks": "bg-amber-500 border-amber-200 bg-amber-50/50 text-amber-500",
    "remember this": "bg-emerald-500 border-emerald-200 bg-emerald-50/50 text-emerald-500",
    "lesson activities": "bg-purple-500 border-purple-200 bg-purple-50/50 text-purple-500",
    "bytes challenge": "bg-indigo-500 border-indigo-200 bg-indigo-50/50 text-indigo-500",
    "bytes final challenge": "bg-indigo-500 border-indigo-200 bg-indigo-50/50 text-indigo-500",
  };

  // Exact match or strict inclusion check for the known section keys
  const matchedKey = Object.keys(styles).find((key) => normalizedTitle === key);

  // If it's just a normal heading (like "1. Time in Scratch" or "List of Topics"), render as a clean standard heading
  if (!matchedKey) {
    if (level === "h2") {
      return <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-b pb-2">{rawTitle}</h2>;
    }
    return <h3 className="text-xl font-bold mt-6 mb-2 text-gray-900 dark:text-white">{rawTitle}</h3>;
  }

  const [badgeBg, borderColor, boxBg] = styles[matchedKey].split(" ");
  const isByteAsks = matchedKey === "byte asks";

  return (
    <div className={`my-6 rounded-2xl border ${borderColor} ${boxBg} dark:bg-white/[0.02] dark:border-white/10 p-5`}>
      <h3 className={`${badgeBg} inline-flex text-white px-4 py-2 rounded-r-full font-black uppercase text-sm mb-3 shadow-sm`}>
        {rawTitle}
      </h3>
      {isByteAsks && (
        <textarea
          placeholder="Type your answer here..."
          className="mt-2 min-h-[120px] w-full rounded-xl border border-amber-200 bg-white dark:bg-white/[0.04] p-4 outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-white text-sm"
        />
      )}
    </div>
  );
}
// function LessonRenderer({ content }) {
//   return (
//     <ReactMarkdown
//       remarkPlugins={[remarkGfm]}
//       components={{
//         h2: ({ children }) => renderByteHeading(children),
//         h3: ({ children }) => renderByteHeading(children),
//         p: ({ children }) => (
//           <p className="text-gray-700 dark:text-gray-300 text-base leading-7 mb-4">
//             {children}
//           </p>
//         ),
//       }}
//     >
//       {content}
//     </ReactMarkdown>
//   );
// }

// // Helper function to render styled boxes for both h2 and h3
// function renderByteHeading(children) {
//   const rawTitle = String(children);
//   const normalizedTitle = rawTitle.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

//   const styles = {
//     "byte explains": "bg-rose-500 border-rose-200 bg-rose-50/50 text-rose-500",
//     "byte shows you how": "bg-blue-500 border-blue-200 bg-blue-50/50 text-blue-500",
//     "byte shows you": "bg-blue-500 border-blue-200 bg-blue-50/50 text-blue-500",
//     "byte asks": "bg-amber-500 border-amber-200 bg-amber-50/50 text-amber-500",
//     "remember this": "bg-emerald-500 border-emerald-200 bg-emerald-50/50 text-emerald-500",
//     "lesson activities": "bg-purple-500 border-purple-200 bg-purple-50/50 text-purple-500",
//     "bytes challenge": "bg-indigo-500 border-indigo-200 bg-indigo-50/50 text-indigo-500",
//     "bytes final challenge": "bg-indigo-500 border-indigo-200 bg-indigo-50/50 text-indigo-500",
//   };

//   const matchedKey = Object.keys(styles).find((key) => normalizedTitle.includes(key));

//   if (!matchedKey) {
//     return <h3 className="text-xl font-bold mt-6 mb-2 text-gray-900 dark:text-white">{rawTitle}</h3>;
//   }

//   const [badgeBg, borderColor, boxBg] = styles[matchedKey].split(" ");
//   const isByteAsks = matchedKey === "byte asks";

//   return (
//     <div className={`my-6 rounded-2xl border ${borderColor} ${boxBg} dark:bg-white/[0.02] dark:border-white/10 p-5`}>
//       <h3 className={`${badgeBg} inline-flex text-white px-4 py-2 rounded-r-full font-black uppercase text-sm mb-3 shadow-sm`}>
//         {rawTitle}
//       </h3>
//       {isByteAsks && (
//         <textarea
//           placeholder="Type your answer here..."
//           className="mt-2 min-h-[120px] w-full rounded-xl border border-amber-200 bg-white dark:bg-white/[0.04] p-4 outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-white text-sm"
//         />
//       )}
//     </div>
//   );
// }
// // import React from "react";
// // import ReactMarkdown from "react-markdown";
// // import remarkGfm from "remark-gfm";

// // export default function LessonRenderer({ content }) {
// //   return (
// //     <ReactMarkdown
// //       remarkPlugins={[remarkGfm]}
// //       components={{
// //         h2: ({ children }) => {
// //           const title = String(children);
// //           const isByteAsks = title === "Byte Asks";

// //           const styles = {
// //             "Byte Explains": "bg-rose-500 border-rose-200 bg-rose-50/50 text-rose-500",
// //             "Byte Shows You": "bg-blue-500 border-blue-200 bg-blue-50/50 text-blue-500",
// //             "Byte Asks": "bg-amber-500 border-amber-200 bg-amber-50/50 text-amber-500",
// //             "Remember This": "bg-emerald-500 border-emerald-200 bg-emerald-50/50 text-emerald-500",
// //           };

// //           const currentStyle = styles[title] || "bg-purple-500 border-gray-200 bg-gray-50 text-purple-500";
// //           const [badgeBg, borderColor, boxBg] = currentStyle.split(" ");

// //           return (
// //             <div className={`my-6 rounded-2xl border ${borderColor} ${boxBg} dark:bg-white/[0.02] dark:border-white/10 p-5`}>
// //               <h2 className={`${badgeBg} inline-flex text-white px-4 py-2 rounded-r-full font-black uppercase text-sm mb-3 shadow-sm`}>
// //                 {title}
// //               </h2>
// //               {isByteAsks && (
// //                 <textarea
// //                   placeholder="Type your answer here..."
// //                   className="mt-2 min-h-[120px] w-full rounded-xl border border-amber-200 bg-white dark:bg-white/[0.04] p-4 outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-white text-sm"
// //                 />
// //               )}
// //             </div>
// //           );
// //         },
// //         p: ({ children }) => (
// //           <p className="text-gray-700 dark:text-gray-300 text-base leading-7 mb-4">
// //             {children}
// //           </p>
// //         ),
// //       }}
// //     >
// //       {content}
// //     </ReactMarkdown>
// //   );
// // }