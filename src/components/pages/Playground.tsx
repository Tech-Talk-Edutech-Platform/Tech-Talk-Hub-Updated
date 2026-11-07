// src/pages/Playground.js
import React, { useState, useEffect, useRef, Suspense } from 'react'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion } from '@codemirror/autocomplete'

const CodeMirror = React.lazy(() => import('@uiw/react-codemirror'))

interface SkulptConfig {
  output: (text: string) => void
  read: (x: string) => string
  inputfun: (promptText: string) => Promise<string | undefined>
}

interface Skulpt {
  pre: string
  configure: (config: SkulptConfig) => void
  builtinFiles?: { files: Record<string, string> }
  misceval: {
    asyncToPromise: (fn: () => unknown) => Promise<unknown>
  }
  importMainWithBody: (
    name: string,
    dumpJS: boolean,
    body: string,
    canSuspend: boolean,
  ) => unknown
}

declare global {
  interface Window {
    Sk: Skulpt
  }
}

interface PlaygroundProps {
  darkMode?: boolean
}

interface JsLogMessage {
  type: string
  message: string
  isError: boolean
}

let skInputQueue: string[] = []
let skInputResolve: ((value: void) => void) | null = null

const loadSkulpt = (
  setShowInput: (show: boolean) => void,
  setInputPrompt: (prompt: string) => void,
) =>
  new Promise<void>((resolve, reject) => {
    if (window.Sk) return resolve()
    const core = document.createElement('script')
    core.src = '/skulpt/skulpt.min.js'
    core.async = true
    core.onload = () => {
      const stdlib = document.createElement('script')
      stdlib.src = '/skulpt/skulpt-stdlib.js'
      stdlib.async = true
      stdlib.onload = () => {
        window.Sk.pre = 'output'
        window.Sk.configure({
          output: (text: string) => {
            const output = document.getElementById('output')
            if (output) output.innerHTML += text.replace(/\n/g, '<br/>')
          },
          read: (x: string) => {
            if (!window.Sk.builtinFiles?.files[x])
              throw new Error('File not found: ' + x)
            return window.Sk.builtinFiles.files[x]
          },
          inputfun: async (promptText: string) => {
            setShowInput(true)
            setInputPrompt(promptText)

            if (skInputQueue.length === 0) {
              await new Promise((res) => (skInputResolve = res))
            }
            const val = skInputQueue.shift()

            const output = document.getElementById('output')
            if (output) {
              output.innerHTML += `<span style="color:yellow;">${promptText}</span>`
              output.innerHTML += `<span style="color:lightblue;">${val}</span><br/>`
            }

            setShowInput(false)
            return val
          },
        })
        resolve()
      }
      stdlib.onerror = () => reject(new Error('Failed to load Skulpt stdlib'))
      document.body.appendChild(stdlib)
    }
    core.onerror = () => reject(new Error('Failed to load Skulpt core'))
    document.body.appendChild(core)
  })

export default function Playground({ darkMode }: PlaygroundProps) {
  const [mode, setMode] = useState('web')
  const [pythonCode, setPythonCode] = useState(
    "print('Hello, Python!')\nchoice = input('Enter 1, 2 or 3: ')\nprint('You chose', choice)",
  )
  const [htmlCode, setHtmlCode] = useState('<h1>Hello World</h1>')
  const [cssCode, setCssCode] = useState('h1 { color: purple; }')
  const [jsCode, setJsCode] = useState("console.log('JS loaded!');")
  const [jsOutput, setJsOutput] = useState('')
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [pythonInput, setPythonInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [inputPrompt, setInputPrompt] = useState('')

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const runPython = async () => {
    try {
      await loadSkulpt(setShowInput, setInputPrompt)
      document.getElementById('output')!.innerHTML = ''
      skInputQueue = []
      await window.Sk.misceval.asyncToPromise(() =>
        window.Sk.importMainWithBody('<stdin>', false, pythonCode, true),
      )
    } catch (err) {
      document.getElementById('output')!.innerHTML =
        `<span style="color:red;">${err.toString()}</span>`
    }
  }

  const submitInput = () => {
    if (pythonInput.trim() === '') return
    skInputQueue.push(pythonInput)
    if (skInputResolve) skInputResolve()
    setPythonInput('')
  }

  // Auto-refresh JS/HTML/CSS preview
  useEffect(() => {
    if (mode !== 'web') return
    const timer = setTimeout(() => {
      const iframe = iframeRef.current
      if (!iframe) return
      const doc = iframe.contentDocument || iframe.contentWindow!.document
      doc.open()
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
      `)
      doc.close()
    }, 400)
    return () => clearTimeout(timer)
  }, [htmlCode, cssCode, jsCode, mode])

  // Capture JS console logs
  useEffect(() => {
    const handleMessage = (event: MessageEvent<JsLogMessage>) => {
      if (event.data.type === 'js-log') {
        const log = event.data.isError
          ? `<span style="color:red;">${event.data.message}</span>`
          : `<span style="color:lightgreen;">${event.data.message}</span>`
        setJsOutput((prev) => prev + log + '<br/>')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div
      className={`flex-2 overflow-y-auto rounded-lg p-3 shadow ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Code Playground</h2>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className={`rounded-md border p-2 ${
            darkMode
              ? 'border-gray-600 bg-gray-700 text-gray-200'
              : 'border-gray-300 bg-white text-gray-700'
          }`}
        >
          <option value="web">🌐 HTML/CSS/JS</option>
          <option value="python">🐍 Python</option>
        </select>
      </div>

      <Suspense fallback={<div>Loading editor...</div>}>
        {mode === 'python' ? (
          <>
            <CodeMirror
              value={pythonCode}
              height="250px"
              // extensions={[python()]}
              extensions={[
                python(),
                autocompletion({ override: [] }), // disables all autocomplete
              ]}
              onChange={(v) => setPythonCode(v)}
              theme={darkMode ? 'dark' : 'light'}
            />
            <button
              onClick={runPython}
              className="mt-3 rounded-sm bg-primary px-4 py-2 text-white"
            >
              ▶️ Run Python
            </button>

            {/* Show input only when input() is called */}
            {showInput && (
              <div className="mt-2 flex gap-2">
                <input
                  value={pythonInput}
                  onChange={(e) => setPythonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitInput()
                  }}
                  className="flex-1 rounded-sm border p-2"
                  placeholder={inputPrompt || 'Type input and press Enter...'}
                  autoFocus
                />
                <button
                  onClick={submitInput}
                  className="rounded-sm bg-primary px-3 text-white"
                >
                  Submit
                </button>
              </div>
            )}

            <pre
              id="output"
              className={`mt-3 h-32 w-full overflow-y-auto rounded p-2 text-sm ${
                darkMode
                  ? 'bg-gray-900 text-green-400'
                  : 'bg-gray-800 text-green-400'
              }`}
              style={{ whiteSpace: 'pre-wrap' }}
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
                  autocompletion({ override: [] }), // disables all autocomplete
                ]}
                onChange={(v) => setHtmlCode(v)}
                theme={darkMode ? 'dark' : 'light'}
              />
              <CodeMirror
                value={cssCode}
                height="100px"
                // extensions={[css()]}
                extensions={[
                  css(),
                  autocompletion({ override: [] }), // disables all autocomplete
                ]}
                onChange={(v) => setCssCode(v)}
                theme={darkMode ? 'dark' : 'light'}
              />
              <CodeMirror
                value={jsCode}
                height="100px"
                // extensions={[javascript()]}
                extensions={[
                  javascript(),
                  autocompletion({ override: [] }), // disables all autocomplete
                ]}
                onChange={(v) => setJsCode(v)}
                theme={darkMode ? 'dark' : 'light'}
              />
            </div>
            <iframe
              ref={iframeRef}
              title="preview"
              className="mt-3 h-64 w-full rounded-sm border"
            />
            <button
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="mt-2 rounded-sm bg-primary px-4 py-1 text-white"
            >
              {consoleOpen ? 'Hide JS Console' : 'Show JS Console'}
            </button>
            {consoleOpen && (
              <pre
                className={`mt-2 h-32 overflow-y-auto rounded p-2 text-sm ${
                  darkMode
                    ? 'bg-gray-900 text-green-400'
                    : 'bg-gray-900 text-black'
                }`}
                dangerouslySetInnerHTML={{ __html: jsOutput }}
              />
            )}
          </>
        )}
      </Suspense>
    </div>
  )
}
