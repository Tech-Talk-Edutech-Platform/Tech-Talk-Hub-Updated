// import UploadNote from "./UploadNote";
// export default function AdminPage() {
//   return <UploadNote />;
// }
// // src/pages/Scratch.js
export default function Scratch() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* <iframe
        src="/packager/index.html"
        title="Scratch Packager"
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
        }}
      /> */}
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- the TurboWarp editor needs scripts and same-origin storage to load and keep projects, which a sandbox would block */}
      <iframe
        src="https://turbowarp.org/embed"
        title="TurboWarp Scratch editor"
      />
      {/* <button onClick={saveProject}>
        SAVE PROJECT
      </button> */}
    </div>
  )
}
// *******************************
// import React from "react";
// //Do self hosting later
// export default function ScratchEditor() {
//   return (
//     <div className="flex justify-center items-center h-full bg-background">
//       <button
//         onClick={() => window.open("https://turbowarp.org/editor")}
//         className="px-8 py-4 bg-secondary text-white font-semibold rounded-xl shadow-btn hover:opacity-90 transition-opacity duration-200 animate-smoothPulse"
//       >
//         Open TurboWarp Editor
//       </button>
//     </div>
//   );
// }

// export default function ScratchEditor() {
//   return (
//     <div className="w-full h-full">
//       {/* <iframe
//         src="/packager/"
//         title="Scratch Packager"
//         className="w-full h-[80vh] border-none rounded-xl"
//         allow="camera; microphone"
//       /> */}
//       <iframe
//   src="/packager/"
//   className="w-full h-screen border-none"
// />

//     </div>
//   );
// }
