import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import BattleAdvance from '/src/BattleAdvance';
import '/src/styles.css';
import '/src/learning-controls.css';
import '/src/battle-review.css';
const config = new URLSearchParams(location.search);
let calls = 0;
function Harness() {
  const [question, setQuestion] = useState(1), [online, setOnline] = useState(true), [busy, setBusy] = useState(false), [shown, setShown] = useState(true);
  Object.assign(window, { qa: { calls: () => calls, setOnline, setBusy, setShown } });
  return <main><h1>已完成第 {question} 題</h1><p>隔離元件驗證，不連線真實玩家。</p>{shown && <BattleAdvance key={question} grade={Number(config.get('grade') || 1)} reduced={false} busy={busy} online={online} correct={true} onAdvance={async () => {
    calls++;
    await new Promise(r => setTimeout(r, Number(config.get('delay') || 100)));
    if (config.get('fail') === 'always' || calls <= Number(config.get('fail') || 0)) return undefined;
    setQuestion(q => q + 1); setShown(false); return true;
  }} />}</main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Harness /></React.StrictMode>);
