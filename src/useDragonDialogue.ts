import { clientId as createClientId } from "./client-id";
import { allowsReadAloud } from './ReadAloud';
import { useContext, useEffect, useRef, useState } from 'react';
import { CloudError, request } from './cloud';
import { ReadingContext } from './readability';
import { narrationCheckpoint, playRecording, speak, subscribeVoiceActivity, type VoicePlayback } from './voice';
import { companionFixedRecording } from './companion-fixed-voice';
import { currentGuide, guideCopy, type GuideChoice, type GuideState } from './dragon-dialogue';
import type { DragonGuideProps } from './DragonGuide';

export function useDragonDialogue(props: DragonGuideProps & { autoNarrate?: boolean }) {
  const { voice: voicePreference } = useContext(ReadingContext);
  const autoVoice = voicePreference && allowsReadAloud(props.grade);
  const [state, setState] = useState<GuideState>(() => currentGuide(null, props.facts));
  const [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false), [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false), [listening, setListening] = useState(false);
  const alive = useRef(false), sequence = useRef(0), locked = useRef(false), voice = useRef<VoicePlayback>();
  const autoNarrate = useRef(props.autoNarrate !== false);
  autoNarrate.current = props.autoNarrate !== false;
  const pending = useRef<{ id: string; revision: number; player: string; choice: GuideChoice }>();
  const heading = useRef<HTMLParagraphElement>(null);
  const current = currentGuide(state, props.facts), originalCopy = guideCopy(current, props.name, props.petName);
  const copy = { ...originalCopy, text: props.characterName ? originalCopy.text.replace(/小龍/g, props.characterName) : originalCopy.text };
  useEffect(() => { alive.current = true; const unsubscribe = subscribeVoiceActivity(active => queueMicrotask(() => { if (alive.current) setSpeaking(active && Boolean(voice.current?.isCurrent())); })); return () => { alive.current = false; sequence.current++; voice.current?.(); unsubscribe(); }; }, []);
  useEffect(() => { void read(); return () => { sequence.current++; voice.current?.(); }; }, [props.player, props.csrf, props.facts.phase, props.facts.pet]);
  async function read() {
    const seq = ++sequence.current;
    locked.current = false; pending.current = undefined; setBusy(false); setLoaded(false); setError('');
    try {
      const result = await request<GuideState>(`guide?player=${encodeURIComponent(props.player)}`);
      if (!alive.current || seq !== sequence.current) return;
      setState(result); setLoaded(true);
    } catch {
      if (alive.current && seq === sequence.current) setError('小龍還沒連上雲端。可以再試一次，也可以直接繼續冒險。');
    }
  }
  useEffect(() => {
    if (!speaking) return;
    const timer = setInterval(() => { if (!voice.current?.isCurrent()) setSpeaking(false); }, 100);
    return () => clearInterval(timer);
  }, [speaking]);
  useEffect(() => { if (!allowsReadAloud(props.grade)) { voice.current?.(); setSpeaking(false); } }, [props.grade]);
  function listen(text: string) {
    if (!allowsReadAloud(props.grade)) return;
    const recording = ['潮光獸', '派對狗狗', '蝴蝶結寶寶'].includes(props.characterName ?? '') ? companionFixedRecording(text) : undefined;
    if (recording) {
      setError('');
      voice.current = playRecording(recording, undefined,
        () => { if (alive.current) setSpeaking(false); },
        message => { if (alive.current) { setSpeaking(false); setError(message); } });
      setSpeaking(true);
      return;
    }
    let failed = false;
    voice.current = speak(props.characterName ? text.replace(/小龍/g, props.characterName) : text, () => {
      failed = true;
      if (alive.current) { setSpeaking(false); setError('這台裝置的語音暫時無法播放，請家長協助開啟臺灣中文語音。圖卡仍可以使用。'); }
    }, 'zh-TW', () => { if (alive.current) setSpeaking(false); });
    if (!failed) setSpeaking(true);
  }
  async function choose(choice: GuideChoice) {
    if (locked.current || !loaded || !props.online) return;
    if (choice === 'ready' && props.facts.phase === 'welcome' && props.onReady) { voice.current?.(); props.onReady(); return; }
    voice.current?.(); locked.current = true; setBusy(true); setListening(false); setError('');
    const mayNarrate = narrationCheckpoint();
    const seq = ++sequence.current;
    const body = pending.current ?? { id: createClientId(), player: props.player, revision: current.revision, choice };
    pending.current = body;
    try {
      const result = await request<GuideState>('guide', body, props.csrf);
      if (!alive.current || seq !== sequence.current) return;
      pending.current = undefined; setState(result); heading.current?.focus({ preventScroll: true });
      if (autoVoice && autoNarrate.current && mayNarrate()) listen(guideCopy(result, props.name, props.petName).text);
    } catch (e) {
      if (!alive.current || seq !== sequence.current) return;
      if (e instanceof CloudError && e.status === 409) { await read(); return; }
      setError('這句還沒送到。按再試一次，就能接著聊；也可以直接繼續。');
    } finally { if (alive.current && seq === sequence.current) { locked.current = false; setBusy(false); } }
  }
  return { current, copy, busy, loaded, error, speaking, listening, setListening, heading, pending, choose, listen, read, stop: () => voice.current?.() };
}
