// // src/pages/BlocklyEditor.js
// import React, { useEffect, useRef, useState } from "react";
// import * as Blockly from "blockly";
// import "blockly/blocks";
// import { javascriptGenerator } from "blockly/javascript";
// import "blockly/msg/en";
// import "blockly/python";
// import { supabase } from "../../supabase";

// // ---------------- BLOCKS ----------------

// // Green flag
// Blockly.Blocks["green_flag"] = {
//   init: function () {
//     this.appendDummyInput().appendField("when 🟢 green flag clicked");
//     this.setNextStatement(true);
//     this.setColour(60);
//   },
// };

// // Key press
// Blockly.Blocks["when_key"] = {
//   init: function () {
//     this.appendDummyInput()
//       .appendField("when key")
//       .appendField(new Blockly.FieldTextInput("space"), "KEY")
//       .appendField("pressed");
//     this.setNextStatement(true);
//     this.setColour(60);
//   },
// };

// // Move
// Blockly.Blocks["move_sprite"] = {
//   init: function () {
//     this.appendDummyInput()
//       .appendField("move")
//       .appendField(new Blockly.FieldNumber(10), "STEPS")
//       .appendField("steps");
//     this.setPreviousStatement(true);
//     this.setNextStatement(true);
//     this.setColour(160);
//   },
// };

// // Turn
// Blockly.Blocks["turn_sprite"] = {
//   init: function () {
//     this.appendDummyInput()
//       .appendField("turn")
//       .appendField(new Blockly.FieldNumber(15), "DEG")
//       .appendField("degrees");
//     this.setPreviousStatement(true);
//     this.setNextStatement(true);
//     this.setColour(160);
//   },
// };

// // GoTo
// Blockly.Blocks["goto_xy"] = {
//   init: function () {
//     this.appendDummyInput()
//       .appendField("go to x:")
//       .appendField(new Blockly.FieldNumber(0), "X")
//       .appendField("y:")
//       .appendField(new Blockly.FieldNumber(0), "Y");
//     this.setPreviousStatement(true);
//     this.setNextStatement(true);
//     this.setColour(160);
//   },
// };

// // ---------------- GENERATORS ----------------

// // Events
// javascriptGenerator.forBlock["green_flag"] = () => {
//   return `__greenFlag(() => {\n`;
// };

// javascriptGenerator.forBlock["when_key"] = (block) => {
//   const key = block.getFieldValue("KEY");
//   return `__whenKey("${key}", () => {\n`;
// };

// // Motion
// javascriptGenerator.forBlock["move_sprite"] = (block) => {
//   return `move(${block.getFieldValue("STEPS")});\n`;
// };

// javascriptGenerator.forBlock["turn_sprite"] = (block) => {
//   return `turn(${block.getFieldValue("DEG")});\n`;
// };

// javascriptGenerator.forBlock["goto_xy"] = (block) => {
//   return `goTo(${block.getFieldValue("X")}, ${block.getFieldValue("Y")});\n`;
// };

// // Close event blocks
// javascriptGenerator.scrub_ = function (block, code) {
//   const next = block.nextConnection && block.nextConnection.targetBlock();
//   const nextCode = javascriptGenerator.blockToCode(next);

//   if (block.type === "green_flag" || block.type === "when_key") {
//     return code + (nextCode || "") + "});\n";
//   }

//   return code + (nextCode || "");
// };

// // ---------------- COMPONENT ----------------

// export default function BlocklyEditor({ initialXml, setGeneratedCode }) {
//   const blocklyDiv = useRef(null);
//   const iframeRef = useRef(null);

//   const [workspace, setWorkspace] = useState(null);
//   const [mode, setMode] = useState("scratch"); // 🎯 tabs state
//   const [output, setOutput] = useState("");

//   // Inject Blockly
//   useEffect(() => {
//     const toolbox = {
//       kind: "categoryToolbox",
//       contents: [
//         {
//           kind: "category",
//           name: "Events ⚡",
//           colour: "#FFD500",
//           contents: [
//             { kind: "block", type: "green_flag" },
//             { kind: "block", type: "when_key" },
//           ],
//         },
//         {
//           kind: "category",
//           name: "Motion 🎮",
//           colour: "#FF6680",
//           contents: [
//             { kind: "block", type: "move_sprite" },
//             { kind: "block", type: "turn_sprite" },
//             { kind: "block", type: "goto_xy" },
//           ],
//         },
//       ],
//     };

//     const ws = Blockly.inject(blocklyDiv.current, {
//       toolbox,
//       trashcan: true,
//       zoom: { controls: true },
//     });

//     if (initialXml) {
//       const xml = Blockly.Xml.textToDom(initialXml);
//       Blockly.Xml.domToWorkspace(xml, ws);
//     }

//     setWorkspace(ws);
//     return () => ws.dispose();
//   }, [initialXml]);

//   // ---------------- RUN ----------------

//   const runCode = () => {
//     if (!workspace) return;

//     if (mode === "scratch") runScratch();
//     if (mode === "js") runJS();
//     if (mode === "python") runPython();
//   };

//   // 🎮 Scratch runtime
//   const runScratch = () => {
//     const code = javascriptGenerator.workspaceToCode(workspace);
//     setGeneratedCode(code);

//     const runtime = `
//       const sprite = { x: 0, y: 0, angle: 0 };

//       function render() {
//         const el = document.getElementById("sprite");
//         el.style.transform =
//           "translate(" + sprite.x + "px," + sprite.y + "px) rotate(" + sprite.angle + "deg)";
//       }

//       function move(s) {
//         sprite.x += s * Math.cos(sprite.angle * Math.PI/180);
//         sprite.y += s * Math.sin(sprite.angle * Math.PI/180);
//         render();
//       }

//       function turn(d) { sprite.angle += d; render(); }
//       function goTo(x,y){ sprite.x=x; sprite.y=y; render(); }

//       function __greenFlag(fn){ window.__gf = fn; }
//       function __whenKey(k, fn){
//         document.addEventListener("keydown", e => {
//           if(e.key===k) fn();
//         });
//       }

//       window.onload = () => { if(window.__gf) window.__gf(); };
//     `;

//     loadIframe(runtime, code);
//   };

//   // 🟡 JS mode
//   const runJS = () => {
//     const code = javascriptGenerator.workspaceToCode(workspace);
//     setGeneratedCode(code);

//     loadIframe("", code);
//   };

//   // 🐍 Python mode
//   const runPython = () => {
//     const code = Blockly.Python.workspaceToCode(workspace);
//     setOutput(code); // preview only
//   };

//   // iframe loader
//   const loadIframe = (runtime, code) => {
//     const html = `
//       <html>
//         <body style="margin:0;background:#111;color:white;">
//           <div id="sprite"
//             style="width:50px;height:50px;background:red;position:absolute;top:50%;left:50%;">
//           </div>
//           <pre id="log"></pre>
//           <script>
//             const log = (msg)=>document.getElementById("log").innerText += msg + "\\n";
//             ${runtime}
//             try { ${code} } catch(e){ log(e.message) }
//           </script>
//         </body>
//       </html>
//     `;

//     const blob = new Blob([html], { type: "text/html" });
//     iframeRef.current.src = URL.createObjectURL(blob);
//   };

//   // ---------------- SAVE ----------------

//   const saveProject = async () => {
//     const xml = Blockly.Xml.domToText(
//       Blockly.Xml.workspaceToDom(workspace)
//     );

//     const code = javascriptGenerator.workspaceToCode(workspace);

//     await supabase.from("projects").insert([{ xml, code }]);

//     alert("✅ Saved!");
//   };

//   // ---------------- UI ----------------

//   return (
//     <div className="w-screen h-screen flex flex-col">

//       {/* 🎯 Tabs */}
//       <div className="flex bg-gray-800 text-white">
//         {["scratch", "js", "python"].map((m) => (
//           <button
//             key={m}
//             onClick={() => setMode(m)}
//             className={`px-4 py-2 ${mode === m ? "bg-blue-500" : "bg-gray-700"
//               }`}
//           >
//             {m === "scratch" && "🎮 Scratch"}
//             {m === "js" && "🟡 JavaScript"}
//             {m === "python" && "🐍 Python"}
//           </button>
//         ))}
//       </div>

//       <div className="flex flex-1">
//         <div ref={blocklyDiv} className="flex-1" />

//         <div className="w-1/3 p-3 flex flex-col gap-2 bg-gray-900 text-white">
//           <button onClick={runCode} className="bg-blue-500 p-2 rounded">
//             ▶ Run
//           </button>

//           <button onClick={saveProject} className="bg-green-500 p-2 rounded">
//             💾 Save
//           </button>

//           {mode === "python" ? (
//             <pre className="flex-1 bg-black p-2 overflow-auto">
//               {output || "🐍 Python code preview"}
//             </pre>
//           ) : (
//             <iframe ref={iframeRef} className="flex-1 border" />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
// src/pages/BlocklyEditor.js
import React, { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import 'blockly/blocks'
import { javascriptGenerator } from 'blockly/javascript'
import 'blockly/msg/en'
import 'blockly/python' // Python generator

Blockly.Blocks['move_sprite'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('move')
      .appendField(new Blockly.FieldNumber(10), 'STEPS')
      .appendField('steps')
    this.setPreviousStatement(true)
    this.setNextStatement(true)
    this.setColour(160)
  },
}
Blockly.Blocks['green_flag'] = {
  init: function () {
    this.appendDummyInput().appendField('when green flag clicked')
    this.setNextStatement(true)
    this.setColour(60)
  },
}

javascriptGenerator.forBlock['green_flag'] = () => {
  return `` // acts as entry point
}
Blockly.Blocks['when_key'] = {
  init: function () {
    this.appendDummyInput().appendField('when key pressed')
    this.setNextStatement(true)
    this.setColour(60)
  },
}

javascriptGenerator.forBlock['when_key'] = () => {
  return `// whenKey\n`
}

javascriptGenerator.forBlock['move_sprite'] = function (block) {
  const steps = block.getFieldValue('STEPS')
  return `move(${steps});\n`
}

// export default function BlocklyEditor({ initialXml, darkMode, runPython }) {
interface BlocklyEditorProps {
  initialXml?: string
  darkMode?: boolean
  runPython?: (code: string) => void
  setGeneratedCode?: (code: string) => void
}

export default function BlocklyEditor({
  initialXml,
  darkMode = false,
  runPython,
  setGeneratedCode,
}: BlocklyEditorProps) {
  const blocklyDiv = useRef(null)
  const iframeRef = useRef(null)
  const [workspace, setWorkspace] = useState(null)
  const [output, setOutput] = useState('')
  // const [generatedCode, setGeneratedCode] = useState("");

  // --- Inject Blockly workspace ---
  useEffect(() => {
    if (!blocklyDiv.current) return

    const toolbox = {
      kind: 'categoryToolbox',
      contents: [
        {
          kind: 'category',
          name: 'Logic',
          colour: '#5C81A6',
          contents: [
            { kind: 'block', type: 'controls_if' },
            { kind: 'block', type: 'logic_compare' },
            { kind: 'block', type: 'logic_operation' },
            { kind: 'block', type: 'logic_negate' },
            { kind: 'block', type: 'logic_boolean' },
          ],
        },
        {
          kind: 'category',
          name: 'Events ⚡',
          colour: '#FFD500',
          contents: [
            { kind: 'block', type: 'green_flag' },
            { kind: 'block', type: 'when_key' },
          ],
        },
        {
          kind: 'category',
          name: 'Sprites 🎮',
          colour: '#FF6680',
          contents: [{ kind: 'block', type: 'move_sprite' }],
        },
        {
          kind: 'category',
          name: 'Loops',
          colour: '#5CA65C',
          contents: [
            { kind: 'block', type: 'controls_repeat_ext' },
            { kind: 'block', type: 'controls_whileUntil' },
            { kind: 'block', type: 'controls_for' },
            { kind: 'block', type: 'controls_forEach' },
          ],
        },
        {
          kind: 'category',
          name: 'Math',
          colour: '#5C68A6',
          contents: [
            { kind: 'block', type: 'math_number' },
            { kind: 'block', type: 'math_arithmetic' },
            { kind: 'block', type: 'math_single' },
          ],
        },
        {
          kind: 'category',
          name: 'Text',
          colour: '#5CA68D',
          contents: [
            { kind: 'block', type: 'text' },
            { kind: 'block', type: 'text_join' },
            { kind: 'block', type: 'text_print' },
          ],
        },
        {
          kind: 'category',
          name: 'Variables',
          custom: 'VARIABLE',
          colour: '#A65C81',
        },
        {
          kind: 'category',
          name: 'Functions',
          custom: 'PROCEDURE',
          colour: '#9A5CA6',
        },
      ],
    }

    // --- Define custom dark theme ---
    const darkTheme = Blockly.Theme.defineTheme('darkTheme', {
      base: Blockly.Themes.Classic,
      componentStyles: {
        workspaceBackgroundColour: darkMode ? '#1E1E1E' : '#fff',
        toolboxBackgroundColour: darkMode ? '#2a2a2a' : '#f5f5f5',
        toolboxForegroundColour: darkMode ? '#eee' : '#111',
        flyoutBackgroundColour: darkMode ? '#2a2a2a' : '#f0f0f0',
        flyoutForegroundColour: darkMode ? '#eee' : '#111',
        scrollbarColour: darkMode ? '#555' : '#ccc',
      },
      blockStyles: {
        logic_blocks: {
          colourPrimary: '#5C81A6',
          colourSecondary: '#4A6D8C',
          colourTertiary: '#3A5270',
        },
        loop_blocks: {
          colourPrimary: '#5CA65C',
          colourSecondary: '#4A8A4A',
          colourTertiary: '#356E35',
        },
        math_blocks: {
          colourPrimary: '#5C68A6',
          colourSecondary: '#4A568C',
          colourTertiary: '#374270',
        },
        text_blocks: {
          colourPrimary: '#5CA68D',
          colourSecondary: '#4A8A74',
          colourTertiary: '#356E5B',
        },
        variable_blocks: {
          colourPrimary: '#A65C81',
          colourSecondary: '#8A4A6D',
          colourTertiary: '#6E3552',
        },
        procedure_blocks: {
          colourPrimary: '#9A5CA6',
          colourSecondary: '#7D4A8C',
          colourTertiary: '#603570',
        },
      },
    })

    const workspaceInstance = Blockly.inject(blocklyDiv.current, {
      toolbox,
      trashcan: true,
      theme: darkTheme,
      zoom: { controls: true, wheel: true },
      renderer: 'zelos',
    })

    if (initialXml) {
      const xml = Blockly.Xml.textToDom(initialXml)
      Blockly.Xml.domToWorkspace(xml, workspaceInstance)
    }

    setWorkspace(workspaceInstance)
    return () => workspaceInstance.dispose()
  }, [darkMode, initialXml])

  // --- Run code ---
  const runCode = (language = 'js') => {
    if (!workspace) return

    let code
    if (language === 'python') {
      code = Blockly.Python.workspaceToCode(workspace)
      if (runPython) {
        runPython(code)
        setOutput('🕹️ Running Python in Playground...')
        return
      }
    } else {
      // code = javascriptGenerator.workspaceToCode(workspace);
      code = javascriptGenerator.workspaceToCode(workspace)
      setGeneratedCode?.(code)
    }

    const iframe = iframeRef.current
    if (!iframe) return

    const wrappedCode = `
      try {
        const console = { log: (...args) => parent.postMessage({ type: 'log', data: args.join(' ') }, '*') };
        ${code}
      } catch (err) {
        parent.postMessage({ type: 'error', data: err.message }, '*');
      }
    `

    const blob = new Blob([wrappedCode], { type: 'text/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    iframe.src = blobUrl
    iframe.onload = () => URL.revokeObjectURL(blobUrl)

    setOutput('')
  }

  // --- Capture iframe console ---
  useEffect(() => {
    const listener = (event) => {
      if (event.data.type === 'log')
        setOutput((prev) => prev + event.data.data + '\n')
      if (event.data.type === 'error')
        setOutput((prev) => prev + '⚠️ Error: ' + event.data.data + '\n')
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [])

  return (
    <div
      className="flex h-screen w-screen flex-col md:flex-row"
      style={{
        background: darkMode ? '#121212' : '#f9f9f9',
        overflow: 'hidden',
      }}
    >
      <div
        ref={blocklyDiv}
        className="flex-1"
        style={{ height: '100%', width: '100%' }}
      />

      <div
        className="flex h-full w-full flex-col border-l border-gray-700 p-4 md:w-1/3"
        style={{ background: darkMode ? '#181818' : '#fafafa' }}
      >
        <button
          onClick={() => runCode('js')}
          className="mb-3 w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          ▶ Run JavaScript
        </button>
        <button
          onClick={() => runCode('python')}
          className="mb-3 w-full rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          🐍 Run Python
        </button>

        <h3 className="mb-2 font-semibold">Console Output</h3>
        <pre
          className="flex-1 overflow-auto rounded p-3"
          style={{
            background: darkMode ? '#222' : '#f3f3f3',
            color: darkMode ? '#eee' : '#111',
          }}
        >
          {output || '🕹️ Waiting for code to run...'}
        </pre>

        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          title="blockly-runner"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}
