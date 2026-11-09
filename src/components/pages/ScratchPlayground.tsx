import { useCallback, useEffect, useRef, useState } from 'react'

interface Sprite {
  id: string
  name: string
  emoji: string
  x: number
  y: number
  rotation: number
  size: number
  vx: number
  vy: number
}

interface ScratchPlaygroundProps {
  initialCode?: string
  code?: string
}

type ScratchMessage =
  | { type: 'move'; amount: number }
  | { type: 'turn'; degrees: number }
  | { type: 'goTo'; x: number; y: number }
  | { type: 'stop' }
  | { type: 'scratch-finished' }
  | { type: 'scratch-error'; error: string }

const INITIAL_SPRITES: Sprite[] = [
  {
    id: 'cat',
    name: 'Cat',
    emoji: '🐱',
    x: 150,
    y: 170,
    rotation: 0,
    size: 55,
    vx: 0,
    vy: 0,
  },
  {
    id: 'ball',
    name: 'Ball',
    emoji: '⚽',
    x: 350,
    y: 170,
    rotation: 0,
    size: 45,
    vx: 0,
    vy: 0,
  },
]

const DEFAULT_CODE = `// Try moving the cat!
move(50)
turn(45)
move(30)`

function isScratchMessage(data: unknown): data is ScratchMessage {
  if (typeof data !== 'object' || data === null || !('type' in data)) {
    return false
  }

  switch (data.type) {
    case 'move':
      return 'amount' in data && typeof data.amount === 'number'

    case 'turn':
      return 'degrees' in data && typeof data.degrees === 'number'

    case 'goTo':
      return (
        'x' in data &&
        typeof data.x === 'number' &&
        'y' in data &&
        typeof data.y === 'number'
      )

    case 'stop':
    case 'scratch-finished':
      return true

    case 'scratch-error':
      return 'error' in data && typeof data.error === 'string'

    default:
      return false
  }
}

export default function ScratchPlayground({
  initialCode = DEFAULT_CODE,
}: ScratchPlaygroundProps) {
  const [sprites, setSprites] = useState<Sprite[]>(() =>
    structuredClone(INITIAL_SPRITES),
  )
  const [activeSpriteId, setActiveSpriteId] = useState('cat')
  const [code, setCode] = useState(initialCode)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  const spritesRef = useRef<Sprite[]>(structuredClone(INITIAL_SPRITES))
  const activeSpriteIdRef = useRef('cat')

  const draggingRef = useRef<string | null>(null)

  const executionFrameRef = useRef<HTMLIFrameElement | null>(null)
  const executionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep refs synchronized with the latest React state.
  useEffect(() => {
    spritesRef.current = sprites
  }, [sprites])

  useEffect(() => {
    activeSpriteIdRef.current = activeSpriteId
  }, [activeSpriteId])

  // Update the currently selected sprite.
  const updateActiveSprite = useCallback(
    (updater: (sprite: Sprite) => Sprite) => {
      setSprites((currentSprites) =>
        currentSprites.map((sprite) =>
          sprite.id === activeSpriteIdRef.current ? updater(sprite) : sprite,
        ),
      )
    },
    [],
  )

  // API available to student code.
  const getAPI = useCallback(() => {
    return {
      move: (amount: number) => {
        updateActiveSprite((sprite) => {
          const radians = (sprite.rotation * Math.PI) / 180

          return {
            ...sprite,
            x: sprite.x + Math.cos(radians) * amount,
            y: sprite.y + Math.sin(radians) * amount,
          }
        })
      },

      turn: (degrees: number) => {
        updateActiveSprite((sprite) => ({
          ...sprite,
          rotation: sprite.rotation + degrees,
        }))
      },

      goTo: (x: number, y: number) => {
        updateActiveSprite((sprite) => ({
          ...sprite,
          x,
          y,
        }))
      },

      stop: () => {
        updateActiveSprite((sprite) => ({
          ...sprite,
          vx: 0,
          vy: 0,
        }))
      },
    }
  }, [updateActiveSprite])

  // Animation loop.
  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return undefined
    }

    const animate = () => {
      const width = canvas.width
      const height = canvas.height

      context.clearRect(0, 0, width, height)

      // Draw stage background.
      context.fillStyle = '#f8fafc'
      context.fillRect(0, 0, width, height)

      // Draw stage border.
      context.strokeStyle = '#e2e8f0'
      context.lineWidth = 2
      context.strokeRect(0, 0, width, height)

      // Draw center guides.
      context.setLineDash([5, 5])
      context.strokeStyle = '#e2e8f0'
      context.beginPath()
      context.moveTo(width / 2, 0)
      context.lineTo(width / 2, height)
      context.moveTo(0, height / 2)
      context.lineTo(width, height / 2)
      context.stroke()
      context.setLineDash([])

      let hasMovement = false

      const nextSprites = spritesRef.current.map((sprite) => {
        let nextSprite = sprite

        if (sprite.vx !== 0 || sprite.vy !== 0) {
          hasMovement = true

          nextSprite = {
            ...sprite,
            x: sprite.x + sprite.vx,
            y: sprite.y + sprite.vy,
          }

          // Keep sprites within the stage.
          const radius = sprite.size / 2

          if (nextSprite.x < radius) {
            nextSprite = {
              ...nextSprite,
              x: radius,
              vx: 0,
            }
          }

          if (nextSprite.x > width - radius) {
            nextSprite = {
              ...nextSprite,
              x: width - radius,
              vx: 0,
            }
          }

          if (nextSprite.y < radius) {
            nextSprite = {
              ...nextSprite,
              y: radius,
              vy: 0,
            }
          }

          if (nextSprite.y > height - radius) {
            nextSprite = {
              ...nextSprite,
              y: height - radius,
              vy: 0,
            }
          }
        }

        return nextSprite
      })

      if (hasMovement) {
        spritesRef.current = nextSprites
        setSprites(nextSprites)
      }

      // Draw sprites.
      nextSprites.forEach((sprite) => {
        context.save()

        context.translate(sprite.x, sprite.y)
        context.rotate((sprite.rotation * Math.PI) / 180)

        context.font = `${sprite.size}px serif`
        context.textAlign = 'center'
        context.textBaseline = 'middle'

        context.fillText(sprite.emoji, 0, 0)

        context.restore()

        // Highlight selected sprite.
        if (sprite.id === activeSpriteIdRef.current) {
          context.beginPath()
          context.arc(sprite.x, sprite.y, sprite.size / 2 + 8, 0, Math.PI * 2)

          context.strokeStyle = '#6366f1'
          context.lineWidth = 2
          context.setLineDash([4, 4])
          context.stroke()
          context.setLineDash([])
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return function cleanup(): void {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [])

  // Clean up execution iframe and timeout.
  const cleanupExecution = useCallback(() => {
    if (executionTimeoutRef.current !== null) {
      clearTimeout(executionTimeoutRef.current)
      executionTimeoutRef.current = null
    }

    if (executionFrameRef.current !== null) {
      executionFrameRef.current.remove()
      executionFrameRef.current = null
    }

    setIsRunning(false)
  }, [])

  // Listen for messages from student-code iframe.
  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      const frame = executionFrameRef.current

      if (!frame || event.source !== frame.contentWindow) {
        return
      }

      if (!isScratchMessage(event.data)) {
        return
      }

      const data = event.data
      const api = getAPI()

      switch (data.type) {
        case 'move':
          api.move(data.amount)
          break

        case 'turn':
          api.turn(data.degrees)
          break

        case 'goTo':
          api.goTo(data.x, data.y)
          break

        case 'stop':
          api.stop()
          break

        case 'scratch-error':
          setOutput(`Error: ${data.error}`)
          cleanupExecution()
          break

        case 'scratch-finished':
          setOutput('Your code finished running!')
          cleanupExecution()
          break

        default:
          break
      }
    }

    window.addEventListener('message', handleMessage)

    return function cleanup(): void {
      window.removeEventListener('message', handleMessage)
    }
  }, [getAPI, cleanupExecution])

  // Execute student code in a sandboxed iframe.
  const runCode = useCallback(() => {
    cleanupExecution()

    setOutput('Running your code...')
    setIsRunning(true)

    const iframe = document.createElement('iframe')

    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('title', 'Student code execution')
    iframe.style.display = 'none'

    executionFrameRef.current = iframe

    // Prevent student code from closing the script element.
    const safeCode = code.replace(/<\/script/gi, '<\\/script')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <script>
            const sendMessage = (message) => {
              window.parent.postMessage(message, '*')
            }

            const move = (amount) => {
              sendMessage({ type: 'move', amount })
            }

            const turn = (degrees) => {
              sendMessage({ type: 'turn', degrees })
            }

            const goTo = (x, y) => {
              sendMessage({ type: 'goTo', x, y })
            }

            const stop = () => {
              sendMessage({ type: 'stop' })
            }

            try {
              ${safeCode}
            } catch (error) {
              sendMessage({
                type: 'scratch-error',
                error: error instanceof Error
                  ? error.message
                  : String(error)
              })
            } finally {
              sendMessage({ type: 'scratch-finished' })
            }
          </script>
        </body>
      </html>
    `

    iframe.srcdoc = html

    document.body.appendChild(iframe)

    // Stop execution after five seconds.
    executionTimeoutRef.current = setTimeout(() => {
      setOutput('Execution timed out. Please check your code.')
      cleanupExecution()
    }, 5000)
  }, [code, cleanupExecution])

  // Keyboard controls.
  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const api = getAPI()

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          api.move(10)
          break

        case 'ArrowLeft':
          event.preventDefault()
          api.move(-10)
          break

        case 'ArrowUp':
          event.preventDefault()
          api.turn(-15)
          break

        case 'ArrowDown':
          event.preventDefault()
          api.turn(15)
          break

        default:
          break
      }
    }

    canvas.addEventListener('keydown', handleKeyDown)

    return function cleanup(): void {
      canvas.removeEventListener('keydown', handleKeyDown)
    }
  }, [getAPI])

  // Drag and drop sprites on stage.
  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const getCanvasPosition = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()

      return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      }
    }

    const onDown = (event: MouseEvent) => {
      const position = getCanvasPosition(event)

      const selectedSprite = spritesRef.current.toReversed().find((sprite) => {
        const dx = position.x - sprite.x
        const dy = position.y - sprite.y

        return Math.sqrt(dx * dx + dy * dy) < sprite.size / 2 + 10
      })

      if (!selectedSprite) {
        return
      }

      draggingRef.current = selectedSprite.id
      activeSpriteIdRef.current = selectedSprite.id
      setActiveSpriteId(selectedSprite.id)

      canvas.style.cursor = 'grabbing'
    }

    const onMove = (event: MouseEvent) => {
      const draggingId = draggingRef.current

      if (!draggingId) {
        return
      }

      const position = getCanvasPosition(event)

      const nextSprites = spritesRef.current.map((sprite) =>
        sprite.id === draggingId
          ? {
              ...sprite,
              x: position.x,
              y: position.y,
              vx: 0,
              vy: 0,
            }
          : sprite,
      )

      spritesRef.current = nextSprites
      setSprites(nextSprites)
    }

    const onUp = () => {
      draggingRef.current = null
      canvas.style.cursor = 'grab'
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return function cleanup(): void {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // Reset the stage.
  const resetStage = useCallback(() => {
    const resetSprites = structuredClone(INITIAL_SPRITES)

    spritesRef.current = resetSprites
    setSprites(resetSprites)

    setActiveSpriteId('cat')
    activeSpriteIdRef.current = 'cat'

    setOutput('')
    cleanupExecution()
  }, [cleanupExecution])

  // Stop currently running code.
  const stopCode = useCallback(() => {
    cleanupExecution()
    setOutput('Execution stopped.')
  }, [cleanupExecution])

  // Clean up when component unmounts.
  useEffect(() => {
    return function cleanup(): void {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }

      if (executionTimeoutRef.current !== null) {
        clearTimeout(executionTimeoutRef.current)
      }

      executionFrameRef.current?.remove()
      executionFrameRef.current = null
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stage */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Stage</h2>

            <button
              type="button"
              onClick={resetStage}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset stage
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={600}
            height={360}
            tabIndex={0}
            aria-label="Sprite stage. Use the arrow keys to move the selected sprite."
            className="w-full rounded-lg border border-slate-200"
            style={{
              aspectRatio: '5 / 3',
              cursor: 'grab',
            }}
          />

          <p className="mt-3 text-sm text-slate-500">
            Drag sprites to move them. Select the stage and use the arrow keys
            to control the active sprite.
          </p>
        </section>

        {/* Sprite panel */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Sprites</h2>

          <div className="grid grid-cols-2 gap-3">
            {sprites.map((sprite) => (
              <button
                key={sprite.id}
                type="button"
                aria-pressed={activeSpriteId === sprite.id}
                onClick={() => setActiveSpriteId(sprite.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition ${
                  activeSpriteId === sprite.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-4xl" aria-hidden="true">
                  {sprite.emoji}
                </span>

                <span className="text-sm font-medium text-slate-800">
                  {sprite.name}
                </span>

                {activeSpriteId === sprite.id && (
                  <span className="text-xs font-medium text-indigo-600">
                    Selected
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Selected sprite
            </h3>

            {sprites
              .filter((sprite) => sprite.id === activeSpriteId)
              .map((sprite) => (
                <div
                  key={sprite.id}
                  className="grid grid-cols-2 gap-3 text-sm text-slate-600"
                >
                  <p>X position: {Math.round(sprite.x)}</p>
                  <p>Y position: {Math.round(sprite.y)}</p>
                  <p>Rotation: {Math.round(sprite.rotation)}°</p>
                  <p>Size: {sprite.size}px</p>
                </div>
              ))}
          </div>
        </section>
      </div>

      {/* Code editor */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Code editor
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Write JavaScript commands to control your sprites.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={runCode}
              disabled={isRunning}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? 'Running...' : 'Run code'}
            </button>

            <button
              type="button"
              onClick={stopCode}
              disabled={!isRunning}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop
            </button>
          </div>
        </div>

        <textarea
          value={code}
          onChange={(event) => setCode(event.target.value)}
          rows={10}
          spellCheck={false}
          aria-label="JavaScript code editor"
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-green-300 outline-none focus:border-indigo-500"
          placeholder="Write your code here..."
        />

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Available commands
          </h3>

          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <code className="rounded bg-slate-100 p-2">move(50)</code>

            <code className="rounded bg-slate-100 p-2">turn(45)</code>

            <code className="rounded bg-slate-100 p-2">goTo(150, 170)</code>

            <code className="rounded bg-slate-100 p-2">stop()</code>
          </div>
        </div>

        {/* Output */}
        {output && (
          <output
            aria-live="polite"
            className="mt-4 block rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
          >
            {output}
          </output>
        )}
      </section>
    </div>
  )
}
