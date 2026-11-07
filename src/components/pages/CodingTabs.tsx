import BlocklyEditor from './Blockly'
import ScratchPlayground from './ScratchPlayground'
import { useState } from 'react'

export default function CodingTabs() {
  const [tab, setTab] = useState('blocks')
  // ScratchPlayground doesn't take the generated code yet: its prop is
  // `initialCode`, and passing it would replace the default program.
  const [, setCode] = useState('')

  return (
    <div className="h-screen">
      <div className="flex gap-2 bg-gray-200 p-2">
        <button onClick={() => setTab('blocks')}>🧩 Blocks</button>
        <button onClick={() => setTab('play')}>🎮 Play</button>
      </div>

      {tab === 'blocks' && <BlocklyEditor setGeneratedCode={setCode} />}

      {tab === 'play' && <ScratchPlayground />}
    </div>
  )
}
