import { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import * as BlocklyBlocks from 'blockly/blocks'
import * as EnglishMessages from 'blockly/msg/en'
import { javascriptGenerator } from 'blockly/javascript'
import { pythonGenerator } from 'blockly/python'

// These modules register Blockly blocks and English messages as side effects.
void BlocklyBlocks
void EnglishMessages

interface BlocklyEditorProps {
  initialXml?: string
  darkMode?: boolean
  runPython?: (code: string) => void
  setGeneratedCode?: (code: string) => void
}

type SupportedLanguage = 'js' | 'python'

interface ConsoleMessage {
  type: 'log' | 'error'
  data: string
}

function isConsoleMessage(data: unknown): data is ConsoleMessage {
  if (typeof data !== 'object' || data === null || !('type' in data)) {
    return false
  }

  if (!('data' in data) || typeof data.data !== 'string') {
    return false
  }

  return data.type === 'log' || data.type === 'error'
}

// -----------------------------------------------------------------------------
// Custom Blockly blocks
// -----------------------------------------------------------------------------

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

Blockly.Blocks['when_key'] = {
  init: function () {
    this.appendDummyInput().appendField('when key pressed')

    this.setNextStatement(true)
    this.setColour(60)
  },
}

// -----------------------------------------------------------------------------
// JavaScript generators
// -----------------------------------------------------------------------------

javascriptGenerator.forBlock['green_flag'] = () => ''

javascriptGenerator.forBlock['when_key'] = () => '// whenKey\n'

javascriptGenerator.forBlock['move_sprite'] = (block) => {
  const steps = block.getFieldValue('STEPS')
  return `move(${steps});\n`
}

// -----------------------------------------------------------------------------
// Python generators
// -----------------------------------------------------------------------------

pythonGenerator.forBlock['green_flag'] = () => ''

pythonGenerator.forBlock['when_key'] = () => '# whenKey\n'

pythonGenerator.forBlock['move_sprite'] = (block) => {
  const steps = block.getFieldValue('STEPS')
  return `move(${steps})\n`
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function BlocklyEditor({
  initialXml,
  darkMode = false,
  runPython,
  setGeneratedCode,
}: BlocklyEditorProps) {
  const blocklyDiv = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null)

  const [output, setOutput] = useState('')

  // ---------------------------------------------------------------------------
  // Initialize Blockly workspace
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const container = blocklyDiv.current

    if (!container) {
      return undefined
    }

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
          name: 'Events',
          colour: '#FFD500',
          contents: [
            { kind: 'block', type: 'green_flag' },
            { kind: 'block', type: 'when_key' },
          ],
        },
        {
          kind: 'category',
          name: 'Sprites',
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

    // Define the Blockly theme.
    const darkTheme = Blockly.Theme.defineTheme('darkTheme', {
      name: 'darkTheme',
      base: Blockly.Themes.Classic,

      componentStyles: {
        workspaceBackgroundColour: darkMode ? '#1E1E1E' : '#ffffff',
        toolboxBackgroundColour: darkMode ? '#2a2a2a' : '#f5f5f5',
        toolboxForegroundColour: darkMode ? '#eeeeee' : '#111111',
        flyoutBackgroundColour: darkMode ? '#2a2a2a' : '#f0f0f0',
        flyoutForegroundColour: darkMode ? '#eeeeee' : '#111111',
        scrollbarColour: darkMode ? '#555555' : '#cccccc',
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

    const workspaceInstance = Blockly.inject(container, {
      toolbox,
      trashcan: true,
      theme: darkTheme,
      zoom: {
        controls: true,
        wheel: true,
      },
      renderer: 'zelos',
    })

    if (initialXml) {
      try {
        const xml = Blockly.utils.xml.textToDom(initialXml)
        Blockly.Xml.domToWorkspace(xml, workspaceInstance)
      } catch (error) {
        console.error('Failed to load Blockly XML:', error)
      }
    }

    setWorkspace(workspaceInstance)

    return function cleanup(): void {
      workspaceInstance.dispose()
      setWorkspace(null)
    }
  }, [darkMode, initialXml])

  // ---------------------------------------------------------------------------
  // Run generated code
  // ---------------------------------------------------------------------------

  const runCode = (language: SupportedLanguage = 'js'): void => {
    if (!workspace) {
      setOutput('Blockly workspace is not ready.')
      return
    }

    let generatedCode: string

    if (language === 'python') {
      generatedCode = pythonGenerator.workspaceToCode(workspace)

      setGeneratedCode?.(generatedCode)

      if (runPython) {
        runPython(generatedCode)
        setOutput('Running Python in Playground...')
      } else {
        setOutput(
          'Python code generated, but no Python execution handler is connected.',
        )
      }

      return
    }

    generatedCode = javascriptGenerator.workspaceToCode(workspace)

    setGeneratedCode?.(generatedCode)

    const iframe = iframeRef.current

    if (!iframe) {
      setOutput('JavaScript execution frame is unavailable.')
      return
    }

    const wrappedCode = `
      try {
        const console = {
          log: (...args) => {
            parent.postMessage({
              type: 'log',
              data: args.map(String).join(' ')
            }, '*')
          }
        };

        ${generatedCode}

      } catch (err) {
        parent.postMessage({
          type: 'error',
          data: err instanceof Error ? err.message : String(err)
        }, '*');
      }
    `

    const blob = new Blob([wrappedCode], {
      type: 'text/javascript',
    })

    const blobUrl = URL.createObjectURL(blob)

    // Revoke the blob URL once the iframe has loaded it.
    iframe.addEventListener(
      'load',
      () => {
        URL.revokeObjectURL(blobUrl)
      },
      { once: true },
    )

    iframe.src = blobUrl

    setOutput('')
  }

  // ---------------------------------------------------------------------------
  // Capture iframe console messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const listener = (event: MessageEvent<unknown>): void => {
      const iframe = iframeRef.current

      // Only accept messages from our execution iframe.
      if (!iframe || event.source !== iframe.contentWindow) {
        return
      }

      // A const keeps the type guard's narrowing inside the setOutput callbacks.
      const message = event.data

      if (!isConsoleMessage(message)) {
        return
      }

      if (message.type === 'log') {
        setOutput((previous) => previous + message.data + '\n')
      }

      if (message.type === 'error') {
        setOutput((previous) => previous + `Error: ${message.data}\n`)
      }
    }

    window.addEventListener('message', listener)

    return function cleanup(): void {
      window.removeEventListener('message', listener)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden md:flex-row"
      style={{
        background: darkMode ? '#121212' : '#f9f9f9',
      }}
    >
      {/* Blockly workspace */}
      <div
        ref={blocklyDiv}
        className="min-h-0 flex-1"
        style={{
          height: '100%',
          width: '100%',
        }}
      />

      {/* Code execution panel */}
      <div
        className="flex h-full w-full flex-col border-l border-gray-700 p-4 md:w-1/3"
        style={{
          background: darkMode ? '#181818' : '#fafafa',
        }}
      >
        <button
          type="button"
          onClick={() => runCode('js')}
          className="mb-3 w-full rounded-sm bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Run JavaScript
        </button>

        <button
          type="button"
          onClick={() => runCode('python')}
          className="mb-3 w-full rounded-sm bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          Run Python
        </button>

        <h3 className="mb-2 font-semibold">Console Output</h3>

        <pre
          aria-live="polite"
          className="flex-1 overflow-auto rounded-sm p-3"
          style={{
            background: darkMode ? '#222222' : '#f3f3f3',
            color: darkMode ? '#eeeeee' : '#111111',
          }}
        >
          {output || 'Waiting for code to run...'}
        </pre>

        {/* Isolated JavaScript execution frame */}
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          title="Blockly JavaScript runner"
          style={{
            display: 'none',
          }}
        />
      </div>
    </div>
  )
}
