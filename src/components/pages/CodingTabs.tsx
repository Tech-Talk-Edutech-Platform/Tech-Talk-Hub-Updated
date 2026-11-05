import BlocklyEditor from "./Blockly";
import ScratchPlayground from "./ScratchPlayground";
import { useState } from "react";

export default function CodingTabs() {
    const [tab, setTab] = useState("blocks");
    const [code, setCode] = useState("");

    return (
        <div className="h-screen">
            <div className="flex gap-2 p-2 bg-gray-200">
                <button onClick={() => setTab("blocks")}>🧩 Blocks</button>
                <button onClick={() => setTab("play")}>🎮 Play</button>
            </div>

            {tab === "blocks" && (
                <BlocklyEditor setGeneratedCode={setCode} />
            )}

            {tab === "play" && (
                <ScratchPlayground code={code} />
            )}
        </div>
    );
}