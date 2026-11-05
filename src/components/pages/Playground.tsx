// src/pages/Playground.js
import React, { useState, useEffect, useRef, Suspense } from "react";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { autocompletion } from "@codemirror/autocomplete";

const CodeMirror = React.lazy(() => import("@uiw/react-codemirror"));

let skInputQueue = [];
let skInputResolve = null;

const loadSkulpt = (setShowInput, setInputPrompt) =>
  new Promise((resolve, reject) => {
    if (window.Sk) return resolve();
    const core = document.createElement("script");
    core.src = "/skulpt/skulpt.min.js";
    core.async = true;
    core.onload = () => {
      const stdlib = document.createElement("script");
      stdlib.src = "/skulpt/skulpt-stdlib.js";
      stdlib.async = true;
      stdlib.onload = () => {
        window.Sk.pre = "output";
        window.Sk.configure({
          output: (text) => {
            const output = document.getElementById("output");
            if (output) output.innerHTML += text.replace(/\n/g, "<br/>");
          },
          read: (x) => {
            if (!window.Sk.builtinFiles?.files[x])
              throw new Error("File not found: " + x);
            return window.Sk.builtinFiles.files[x];
          },
          inputfun: async (promptText) => {
            setShowInput(true);
            setInputPrompt(promptText);

            if (skInputQueue.length === 0) {
              await new Promise((res) => (skInputResolve = res));
            }
            const val = skInputQueue.shift();

            const output = document.getElementById("output");
            if (output) {
              output.innerHTML += `<span style="color:yellow;">${promptText}</span>`;
              output.innerHTML += `<span style="color:lightblue;">${val}</span><br/>`;
            }

            setShowInput(false);
            return val;
          },
        });
        resolve();
      };
      stdlib.onerror = () => reject(new Error("Failed to load Skulpt stdlib"));
      document.body.appendChild(stdlib);
    };
    core.onerror = () => reject(new Error("Failed to load Skulpt core"));
    document.body.appendChild(core);
  });

export default function Playground({ darkMode }) {
  const [mode, setMode] = useState("web");
  const [pythonCode, setPythonCode] = useState(
    "print('Hello, Python!')\nchoice = input('Enter 1, 2 or 3: ')\nprint('You chose', choice)"
  );
  const [htmlCode, setHtmlCode] = useState("<h1>Hello World</h1>");
  const [cssCode, setCssCode] = useState("h1 { color: purple; }");
  const [jsCode, setJsCode] = useState("console.log('JS loaded!');");
  const [jsOutput, setJsOutput] = useState("");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [pythonInput, setPythonInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");

  const iframeRef = useRef(null);

  const runPython = async () => {
    try {
      await loadSkulpt(setShowInput, setInputPrompt);
      document.getElementById("output").innerHTML = "";
      skInputQueue = [];
      await window.Sk.misceval.asyncToPromise(() =>
        window.Sk.importMainWithBody("<stdin>", false, pythonCode, true)
      );
    } catch (err) {
      document.getElementById("output").innerHTML =
        `<span style="color:red;">${err.toString()}</span>`;
    }
  };

  const submitInput = () => {
    if (pythonInput.trim() === "") return;
    skInputQueue.push(pythonInput);
    if (skInputResolve) skInputResolve();
    setPythonInput("");
  };

  // Auto-refresh JS/HTML/CSS preview
  useEffect(() => {
    if (mode !== "web") return;
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head><style>${cssCode}</style></head>
          <body>
            ${htmlCode}
            <script>
              console.log = (...args) =>
                parent.postMessage({ type: 'js-log', message: args.join(' '), isError: false }, '*');
              window.onerror = (msg, url, line) =>
                parent.postMessage({ type: 'js-log', message: 'Error: ' + msg + ' at line ' + line, isError: true }, '*');
              try { ${jsCode} } catch(e) { console.log('Error:', e); }
            </script>
          </body>
        </html>
      `);
      doc.close();
    }, 400);
    return () => clearTimeout(timer);
  }, [htmlCode, cssCode, jsCode, mode]);

  // Capture JS console logs
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "js-log") {
        const log = event.data.isError
          ? `<span style="color:red;">${event.data.message}</span>`
          : `<span style="color:lightgreen;">${event.data.message}</span>`;
        setJsOutput((prev) => prev + log + "<br/>");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div
      className={`flex-[2] shadow rounded-lg p-3 overflow-y-auto ${darkMode ? "bg-gray-800" : "bg-white"
        }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Code Playground</h2>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className={`p-2 border rounded-md ${darkMode
            ? "border-gray-600 bg-gray-700 text-gray-200"
            : "border-gray-300 bg-white text-gray-700"
            }`}
        >
          <option value="web">🌐 HTML/CSS/JS</option>
          <option value="python">🐍 Python</option>
        </select>
      </div>

      <Suspense fallback={<div>Loading editor...</div>}>
        {mode === "python" ? (
          <>
            <CodeMirror
              value={pythonCode}
              height="250px"
              // extensions={[python()]}
              extensions={[
                python(),
                autocompletion({ override: [] }) // disables all autocomplete
              ]}
              onChange={(v) => setPythonCode(v)}
              theme={darkMode ? "dark" : "light"}
            />
            <button
              onClick={runPython}
              className="mt-3 px-4 py-2 bg-primary text-white rounded"
            >
              ▶️ Run Python
            </button>

            {/* Show input only when input() is called */}
            {showInput && (
              <div className="mt-2 flex gap-2">
                <input
                  value={pythonInput}
                  onChange={(e) => setPythonInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitInput(); }}
                  className="flex-1 p-2 border rounded"
                  placeholder={inputPrompt || "Type input and press Enter..."}
                  autoFocus
                />
                <button
                  onClick={submitInput}
                  className="px-3 bg-primary text-white rounded"
                >
                  Submit
                </button>
              </div>
            )}

            <pre
              id="output"
              className={`w-full h-32 mt-3 p-2 rounded overflow-y-auto text-sm ${darkMode ? "bg-gray-900 text-green-400" : "bg-gray-800 text-green-400"
                }`}
              style={{ whiteSpace: "pre-wrap" }}
            />
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <CodeMirror
                value={htmlCode}
                height="100px"
                // extensions={[html(),]}
                extensions={[
                  html(),
                  autocompletion({ override: [] }) // disables all autocomplete
                ]}
                onChange={(v) => setHtmlCode(v)}
                theme={darkMode ? "dark" : "light"}
              />
              <CodeMirror
                value={cssCode}
                height="100px"
                // extensions={[css()]}
                extensions={[
                  css(),
                  autocompletion({ override: [] }) // disables all autocomplete
                ]}
                onChange={(v) => setCssCode(v)}
                theme={darkMode ? "dark" : "light"}
              />
              <CodeMirror
                value={jsCode}
                height="100px"
                // extensions={[javascript()]}
                extensions={[
                  javascript(),
                  autocompletion({ override: [] }) // disables all autocomplete
                ]}
                onChange={(v) => setJsCode(v)}
                theme={darkMode ? "dark" : "light"}
              />
            </div>
            <iframe
              ref={iframeRef}
              title="preview"
              className="w-full h-64 mt-3 rounded border"
            />
            <button
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="mt-2 px-4 py-1 bg-primary text-white rounded"
            >
              {consoleOpen ? "Hide JS Console" : "Show JS Console"}
            </button>
            {consoleOpen && (
              <pre
                className={`mt-2 p-2 rounded overflow-y-auto text-sm h-32 ${darkMode ? "bg-gray-900 text-green-400" : "bg-gray-900 text-black"
                  }`}
                dangerouslySetInnerHTML={{ __html: jsOutput }}
              />
            )}
          </>
        )}
      </Suspense>
    </div>
  );
}
