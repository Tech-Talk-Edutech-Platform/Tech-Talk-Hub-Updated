import React, { useRef, useEffect, useState } from 'react'

interface ScratchPlaygroundProps {
  code: string
}

export default function ScratchPlayground({ code }: ScratchPlaygroundProps) {
  const canvasRef = useRef(null)
  const [sprites, setSprites] = useState([
    { id: 1, name: 'Cat', x: 100, y: 100, angle: 0, vx: 0, vy: 0 },
    { id: 2, name: 'Ball', x: 300, y: 200, angle: 0, vx: 0, vy: 0 },
  ])

  const [activeSpriteId, setActiveSpriteId] = useState(1)
  const animationRef = useRef()

  const activeSprite = sprites.find((s) => s.id === activeSpriteId)

  // 🎬 Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      setSprites((prev) =>
        prev.map((s) => ({
          ...s,
          x: s.x + s.vx,
          y: s.y + s.vy,
        })),
      )

      sprites.forEach((sprite) => {
        ctx.save()
        ctx.translate(sprite.x, sprite.y)
        ctx.rotate((sprite.angle * Math.PI) / 180)
        ctx.fillStyle = sprite.id === activeSpriteId ? 'orange' : 'blue'
        ctx.fillRect(-20, -20, 40, 40)
        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(loop)
    }

    loop()
    return () => cancelAnimationFrame(animationRef.current)
  }, [sprites, activeSpriteId])

  // 🎮 API exposed to Blockly
  const getAPI = () => ({
    move: (steps) => {
      setSprites((prev) =>
        prev.map((s) =>
          s.id === activeSpriteId ? { ...s, vx: steps / 10 } : s,
        ),
      )
    },
    turn: (deg) => {
      setSprites((prev) =>
        prev.map((s) =>
          s.id === activeSpriteId ? { ...s, angle: s.angle + deg } : s,
        ),
      )
    },
    goTo: (x, y) => {
      setSprites((prev) =>
        prev.map((s) => (s.id === activeSpriteId ? { ...s, x, y } : s)),
      )
    },
    stop: () => {
      setSprites((prev) =>
        prev.map((s) => (s.id === activeSpriteId ? { ...s, vx: 0, vy: 0 } : s)),
      )
    },
  })

  // 🎮 Run code (Green flag)
  const runCode = () => {
    const API = getAPI()

    try {
      const fn = new Function(...Object.keys(API), code)
      fn(...Object.values(API))
    } catch (err) {
      alert(err.message)
    }
  }

  // 🎹 Key events
  useEffect(() => {
    const handleKey = (e) => {
      if (!code.includes('whenKey')) return

      if (e.key === 'ArrowRight') {
        getAPI().move(20)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [code])

  // 🖱️ Drag sprites
  useEffect(() => {
    const canvas = canvasRef.current
    let dragging = null

    const onDown = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const found = sprites.find(
        (s) => Math.abs(s.x - x) < 20 && Math.abs(s.y - y) < 20,
      )

      if (found) {
        dragging = found.id
        setActiveSpriteId(found.id)
      }
    }

    const onMove = (e) => {
      if (!dragging) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setSprites((prev) =>
        prev.map((s) => (s.id === dragging ? { ...s, x, y } : s)),
      )
    }

    const onUp = () => (dragging = null)

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [sprites])

  return (
    <div className="flex h-full">
      {/* 🎮 Stage */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <canvas ref={canvasRef} width={600} height={400} className="border" />

        <button
          onClick={runCode}
          className="mt-3 rounded bg-green-600 px-4 py-2 text-white"
        >
          🟢 Green Flag
        </button>
      </div>

      {/* 🎭 Sprite Panel */}
      <div className="w-48 bg-gray-100 p-2">
        <h3 className="font-bold">Sprites</h3>
        {sprites.map((s) => (
          <div
            key={s.id}
            onClick={() => setActiveSpriteId(s.id)}
            className={`cursor-pointer p-2 ${
              s.id === activeSpriteId ? 'bg-yellow-300' : ''
            }`}
          >
            {s.name}
          </div>
        ))}
      </div>
    </div>
  )
}
// import React, { useRef, useEffect, useState } from "react";

// export default function ScratchPlayground({ code }) {
//     const canvasRef = useRef(null);
//     const [sprites, setSprites] = useState([
//         {
//             id: 1,
//             x: 100,
//             y: 100,
//             angle: 0,
//             img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/200px-Cat03.jpg"
//         }
//     ]);

//     // 🎬 Draw sprites
//     useEffect(() => {
//         const canvas = canvasRef.current;
//         const ctx = canvas.getContext("2d");

//         function draw() {
//             ctx.clearRect(0, 0, canvas.width, canvas.height);

//             sprites.forEach(sprite => {
//                 const img = new Image();
//                 img.src = sprite.img;

//                 img.onload = () => {
//                     ctx.save();
//                     ctx.translate(sprite.x, sprite.y);
//                     ctx.rotate((sprite.angle * Math.PI) / 180);
//                     ctx.drawImage(img, -25, -25, 50, 50);
//                     ctx.restore();
//                 };
//             });
//         }

//         draw();
//     }, [sprites]);

//     // 🎮 Run Blockly-generated code
//     const runCode = () => {
//         const sprite = sprites[0];

//         const API = {
//             move: (steps) => {
//                 sprite.x += steps;
//                 setSprites([...sprites]);
//             },
//             turn: (deg) => {
//                 sprite.angle += deg;
//                 setSprites([...sprites]);
//             },
//             goTo: (x, y) => {
//                 sprite.x = x;
//                 sprite.y = y;
//                 setSprites([...sprites]);
//             }
//         };

//         try {
//             const fn = new Function("sprite", ...Object.keys(API), code);
//             fn(sprite, ...Object.values(API));
//         } catch (err) {
//             alert(err.message);
//         }
//     };

//     return (
//         <div className="w-full h-full flex flex-col items-center justify-center">
//             <canvas
//                 ref={canvasRef}
//                 width={600}
//                 height={400}
//                 className="border rounded bg-white"
//             />

//             <button
//                 onClick={runCode}
//                 className="mt-4 bg-purple-600 text-white px-4 py-2 rounded"
//             >
//                 ▶ Run Animation
//             </button>
//         </div>
//     );
// }
