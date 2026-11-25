import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { StudySession } from './study-review';
import { studyBattleAction, studyBattleSnapshot } from './study-battle-presentation';
import { Sprite, Spell } from './BattleScene';
import BattleCinematic from './BattleCinematic';
import { quizCinematic, cinematicTiming, type Cinematic } from './battle-cinematics';
import { BATTLE_ARENA } from './battle-assets';
import { petById, petElement } from './game-view';
import { MONSTER_CATALOG, monsterById } from './monsters';
import { useStageVisibility } from './useStageVisibility';
import './study-battle.css';

type Motion = { key: string; kind: 'attack' | 'guard'; phase: string; startedAt: number; clip?: Cinematic };

export function useStudyBattle(session: StudySession | null | undefined, companion: string, reduced: boolean) {
  const snapshot = studyBattleSnapshot(session);
  const previous = useRef(snapshot);
  const [motion, setMotion] = useState<Motion | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = snapshot;
    const kind = studyBattleAction(before, snapshot);
    if (kind && session) {
      setMotion({ key: `${session.id}:${session.index}`, kind, phase: 'windup', startedAt: performance.now(),
        clip: kind === 'attack' ? quizCinematic(companion, session.index, session.questions.length) : undefined });
    } else if (before?.id !== snapshot?.id || before?.index !== snapshot?.index || snapshot?.status === 'paused') {
      setMotion(null);
    }
  }, [snapshot?.id, snapshot?.index, snapshot?.settled, snapshot?.status, snapshot?.phase, snapshot?.count, snapshot?.answer, companion]);
  useEffect(() => {
    if (!motion) return;
    const timing = motion.clip ? cinematicTiming(motion.clip) : { flight: 180, impact: 440, settle: 740, end: 1100 };
    const elapsed = performance.now() - motion.startedAt;
    const times = reduced ? [0, 20, 60, 160] : [timing.flight, timing.impact, timing.settle, timing.end];
    const timers = ['flight', 'impact', 'settle', null].map((phase, i) => setTimeout(() => {
      setMotion(current => current?.key === motion.key ? phase ? { ...current, phase } : null : current);
    }, Math.max(0, times[i] - elapsed)));
    return () => timers.forEach(clearTimeout);
  }, [motion?.key, reduced]);
  return { motion, skip: () => setMotion(null) };
}

/** Training shares the real stage and characters, but has no HP, damage,
 * rewards or combat commands. Formal battles keep their existing rules. */
export default function StudyBattle({ session, companion, opponent, reduced, motion, onSkip }: {
  session?: StudySession | null; companion: string; opponent?: string; reduced: boolean;
  motion: Motion | null; onSkip: () => void;
}) {
  const pet = petById(companion)!;
  const sparring = monsterById(opponent) ?? MONSTER_CATALOG[0];
  const { stageRef, visible } = useStageVisibility();
  const quiet = reduced || !visible;
  const landing = !!motion && ['impact', 'settle'].includes(motion.phase);
  const guarding = motion?.kind === 'guard';
  const lesson = session?.phase === 'lesson';
  const complete = session?.status === 'complete';
  const correct = session?.settled ? session.answers[session.index] : undefined;
  const message = lesson ? '一起看，換你試試' : motion ? guarding ? '護盾接住了，一起練習' : landing ? '命中！' : '夥伴出招！'
    : complete ? '暖身完成' : correct === false ? '沒關係，一起看解法' : correct === true ? '好招式！繼續前進' : '選好答案，夥伴就出招';
  return <section className="study-battle" aria-label="夥伴練招戰場">
    <div ref={stageRef} className={`study-battle-stage duel-stage theme-${petElement(companion)} phase-${motion?.phase ?? 'idle'} action-${guarding ? 'guard' : 'attack'} ${quiet ? 'duel-reduced' : ''}`}
      data-phase={motion?.phase ?? 'idle'} data-action={motion?.kind ?? 'idle'} data-event={motion?.key ?? ''}
      style={{ '--arena-image': `url("${BATTLE_ARENA}")` } as CSSProperties}>
      <div className="duel-sky" aria-hidden="true" />
      <div className="study-battle-names"><strong>{pet.name}</strong><span>暖身 · 不扣血</span><strong>{sparring.name}</strong></div>
      {motion?.clip && !quiet && <BattleCinematic key={motion.key} clip={motion.clip} startedAt={motion.startedAt} phase={motion.phase} />}
      <div className={`duel-combatant side-0 ${motion && !guarding ? 'duel-casting' : ''}`}>
        <div className="duel-summon-circle" aria-hidden="true" />
        <div className="duel-body"><div className="duel-facing"><Sprite pet={companion} attacking={!!motion && !guarding} reduced={quiet} nonce={session?.index ?? 0} /></div></div>
        {guarding && <span className="duel-shield" aria-label="護盾保護，不扣血"><svg viewBox="0 0 100 120" aria-hidden="true"><path d="M50 5L91 25V61Q91 91 50 115Q9 91 9 61V25Z" /><path d="M50 23L75 35V61Q75 80 50 96Q25 80 25 61V35Z" /></svg></span>}
      </div>
      <div className={`duel-combatant side-1 ${guarding ? 'duel-casting' : ''} ${landing && !guarding ? 'duel-hit' : ''}`}>
        <div className="duel-summon-circle" aria-hidden="true" />
        <div className="duel-body"><div className="duel-facing"><Sprite pet={sparring.id} attacking={!!guarding} hit={landing && !guarding} reduced={quiet} nonce={session?.index ?? 0} /></div></div>
        {landing && !guarding && !quiet && <div className="duel-reaction"><span className="duel-impact-ring" /></div>}
      </div>
      {motion && !quiet && <div className={`duel-effect-layer ${guarding ? 'reverse' : ''}`}><Spell element={petElement(guarding ? sparring.id : companion)} /></div>}
    </div>
    <div className="study-battle-caption"><span role="status" aria-live="polite">{message}</span>{motion && !reduced && <button type="button" onClick={onSkip} aria-label="略過演出">略過 ⏭</button>}</div>
  </section>;
}
