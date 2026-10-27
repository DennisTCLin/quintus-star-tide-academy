import BattleCinematic from './BattleCinematic';
import { battleCinematic, quizCinematic, quizMoveSlot, cinematicTiming, type Cinematic } from './battle-cinematics';
import { correctNeeded } from "./tiered-challenge";
import type { CharacterRarity } from "./characters";
import { MAX_MISTAKES, mistakeCount } from "./challenge-rules";
import { CreatureBadge, CreatureSheet, StatLine } from "./CreatureInfo";
import { allyVitals, quizVitals } from "./quiz-combat";
import { NATIVE_LEVELS, CAPTURE_RATES, CAPTURE_SKIP_TEXT } from "./creature-rules";
import { ReadingContext, annotateTree } from "./readability";
import { useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Run, Profile } from "./adventure";
import { petById, petElement, petSkillName, petSkillDescription } from "./game-view";
import { Sprite, Spell } from "./BattleScene";
import { BATTLE_ARENA } from "./battle-assets";
import { MonsterArt } from "./MonsterBestiary";
import { monsterById, MONSTER_FAMILIES, monsterForm } from "./monsters";
import { MONSTERS, completedHits, creatureProgress, growthProgress, growthStyle, nextGrowthStyle } from "./companion-growth";
import "./quiz-encounter.css";
import { MaterialProgress } from "./LearningJourney";
import { useStageVisibility } from "./useStageVisibility";

export function GrowthMeter({ xp = 0, compact = false, rarity = "E" }: { xp?: number; compact?: boolean; rarity?: CharacterRarity }) {
  const { grade } = useContext(ReadingContext);
  const g = creatureProgress(rarity, xp);
  return annotateTree(<div className={`growth-meter ${compact ? "growth-compact" : ""}`}>
    <div><strong>Lv.{g.level}</strong><span>{g.current} / {g.needed} XP</span></div>
    <div className="growth-track" role="progressbar" aria-label="夥伴升級進度" aria-valuenow={g.current} aria-valuemin={0} aria-valuemax={g.needed}><i style={{ width: `${g.percent}%` }} /></div>
    {!compact && <small>{nextGrowthStyle(g.trainingLevel)} · 再 {g.remaining} XP 升級</small>}
  </div>, grade);
}
type Motion = { clip?: Cinematic; startedAt: number; phase: string; kind: "attack" | "burst" | "hurt"; before: number; beforeMistakes: number; nonce: number; gain: number; levelUp: boolean };
export default function QuizEncounter({ run, xp, reduced, oldDay = false, musicControl, onBestiary, profile, busy, online, onRecruit, summaryOnly = false, onResultReady }: { profile: Profile; day: string; busy: boolean; online: boolean; onRecruit: (pet: string) => Promise<unknown>; summaryOnly?: boolean; onResultReady?: (runId: string, live: boolean) => void; run: Run; xp: number; reduced: boolean; oldDay?: boolean; musicControl?: ReactNode; onBestiary?: () => void }) {
  const { grade } = useContext(ReadingContext);
  const mistakes = mistakeCount(run);
  const hits = completedHits(run), pet = petById(run.companion)!;
  const previous = useRef({ hits, mistakes, index: run.index, xp });
  const resultCallback = useRef(onResultReady); resultCallback.current = onResultReady;
  const [motion, setMotion] = useState<Motion | null>(null);
  const { stageRef, visible } = useStageVisibility();
  const cosmeticReduced = reduced || !visible;
  const [broken, setBroken] = useState(false);
  const [fitsSticky, setFitsSticky] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => setFitsSticky((root.current?.offsetHeight ?? Infinity) <= window.innerHeight * .48);
    const observer = new ResizeObserver(update);
    if (root.current) observer.observe(root.current);
    window.addEventListener("resize", update);
    update();
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  useEffect(() => {
    const old = previous.current;
    previous.current = { hits, mistakes, index: run.index, xp };
    const attack = hits === old.hits + 1;
    const hurt = mistakes > old.mistakes;
    setMotion(null);
    if (!attack && !hurt) { if (run.status !== "active") resultCallback.current?.(run.id, false); return; }
    const source = hurt ? run.encounter.variant : run.companion;
    const clip = hurt ? source ? battleCinematic(source, "attack") : undefined : quizCinematic(run.companion, run.index, run.questions.length);
    const action: Motion = { clip, startedAt: performance.now(), phase: "windup", kind: hurt ? "hurt" : quizMoveSlot(run.index, run.questions.length) === 2 ? "burst" : "attack",
      before: old.hits, beforeMistakes: old.mistakes, nonce: hits * 10 + mistakes, gain: Math.max(0, xp - old.xp), levelUp: growthProgress(xp).level > growthProgress(old.xp).level };
    setMotion(action);
    const timing = clip ? cinematicTiming(clip) : { flight:180, impact:440, settle:740, end:1100 };
    const times = reduced ? [0, 20, 60, 180] : [timing.flight, timing.impact, timing.settle, timing.end];
    const timers = ["flight", "impact", "settle", null].map((phase, i) => setTimeout(() => {
      setMotion(current => current?.nonce === action.nonce ? phase ? { ...current, phase } : null : current);
      if (!phase && run.status !== "active") resultCallback.current?.(run.id, true);
    }, times[i]));
    return () => timers.forEach(clearTimeout);
  }, [hits, mistakes, run.index, run.status, reduced]);
  const species = monsterById(run.encounter.variant);
  const monster = species ? { ...MONSTER_FAMILIES[species.family], name: species.name } : MONSTERS[run.encounter.monster];
  const monsterName = species?.name ?? monster.name;
  const { max, damage } = quizVitals(run);
  const landing = !motion || ["impact", "settle"].includes(motion.phase);
  const shownHits = motion && !landing ? motion.before : hits;
  const hp = quizVitals(run, shownHits, landing).hp;
  const won = run.status === "won" && landing;
  const failed = run.status === "failed" && landing;
  const ally = allyVitals(run, motion && !landing ? motion.beforeMistakes : mistakes);
  const allyDamage = allyVitals(run).damage;
  const currentLevel = creatureProgress(pet.rarity, xp).level;
  const allyLevel = run.encounter.combat?.ally.level ?? run.encounter.level;
  const foeLevel = run.encounter.combat?.foe.level ?? run.encounter.level;
  const capture = run.capture, recruit = capture ? petById(capture.monster) : undefined;
  const joined = capture?.outcome === "joined" || capture?.outcome === "duplicate";
  return annotateTree(<section ref={root} className={`quiz-encounter ${fitsSticky ? "quiz-sticky-fit" : ""}`} aria-label="答題怪物戰鬥">
    {!summaryOnly && <>
    <div className="quiz-battle-intro"><span>⚔️ 答對就出招</span>{musicControl}<strong>{failed ? (mistakes>=3?"三次錯誤，這場挑戰失敗":"未達答對目標，星幣已保留") : won ? "六題完成，挑戰成功！" : `答題 ${run.index + Number(run.settled)} / ${run.questions.length} · 答錯 ${mistakes} / ${MAX_MISTAKES}`}</strong></div>
    <div ref={stageRef} className={`quiz-stage duel-stage ${motion?.clip ? "has-cinematic" : ""} theme-${petElement(run.companion)} phase-${motion?.phase ?? "idle"} action-${motion?.kind ?? "idle"} ${cosmeticReduced ? "duel-reduced" : ""} ${run.encounter.level >= 5 ? "quiz-starburst" : ""}`}
      data-phase={motion?.phase ?? "idle"} data-hits={hits} data-victory={won} data-defeat={failed} style={{ "--arena-image": `url("${BATTLE_ARENA}")` } as CSSProperties}>
      <div className="duel-sky" aria-hidden="true" />
      {motion?.clip && !cosmeticReduced && <BattleCinematic key={`cinematic:${motion.nonce}`} clip={motion.clip} startedAt={motion.startedAt} reverse={motion.kind === "hurt"} phase={motion.phase} />}
      <div className="quiz-hud">
        <div><strong>{pet.name}</strong><CreatureBadge rarity={pet.rarity} level={allyLevel} /><span className="quiz-growth-style">{growthStyle(run.encounter.level)}</span><div className="quiz-hp" role="meter" aria-label="夥伴生命" aria-valuemin={0} aria-valuemax={ally.max} aria-valuenow={ally.hp}><i style={{width:`${ally.hp / ally.max * 100}%`}} /></div><span>{ally.hp} / {ally.max}</span><small className="quiz-mistake-count">失誤 {mistakes}／{MAX_MISTAKES}</small>{run.encounter.combat && <span className="quiz-stats-inline">ATK {run.encounter.combat.ally.attack} · DEF {run.encounter.combat.ally.defense}</span>}</div>
        <div><strong>{monsterName}</strong>{species && <><CreatureBadge rarity={species.rarity} level={foeLevel} /><span className="quiz-monster-affinity">{species.element}屬性 · {monsterForm(species).name}</span></>}<div className="quiz-hp" role="meter" aria-label="怪物體力" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={max}><i style={{ width: `${hp / max * 100}%` }} /></div><span>{hp} / {max}</span>{run.encounter.combat && <span className="quiz-stats-inline">ATK {run.encounter.combat.foe.attack} · DEF {run.encounter.combat.foe.defense}</span>}</div>
      </div>
      <div className={`duel-combatant side-0 ${motion?.kind === "hurt" && landing ? "duel-hit" : motion && motion.kind !== "hurt" ? "duel-casting" : ""} ${won ? "duel-victor" : ""} ${failed ? "quiz-monster-rest" : ""}`}>
        <div className="duel-summon-circle" aria-hidden="true" />
        <div className="duel-body"><div className="duel-facing"><Sprite pet={run.companion} attacking={!!motion && motion.kind !== "hurt"} reduced={cosmeticReduced} nonce={motion?.nonce ?? 0} /></div></div>
        {motion?.kind === "hurt" && landing && <div className="duel-reaction"><b className="duel-damage">−{allyDamage}</b>{!cosmeticReduced && <span className="duel-impact-ring" />}</div>}
      </div>
      <div className={`duel-combatant side-1 ${motion?.kind === "hurt" ? "duel-casting" : ""} ${species?.form === "warden" ? "quiz-warden" : ""} ${motion && motion.kind !== "hurt" && landing ? "duel-hit" : ""} ${hp === 0 ? "quiz-monster-rest" : ""}`}>
        <div className="duel-summon-circle" aria-hidden="true" />
        <div className="duel-body">{species ? <MonsterArt monster={species} eager action={motion?(motion.kind==="hurt"?"attack":"hit"):"idle"} nonce={motion?.nonce??0} reduced={cosmeticReduced} /> : <div className="quiz-monster" role="img" aria-label={monsterName}>
          {broken ? <span>{monster.icon}</span> : <img src="/assets/battle/quiz-monsters.png" alt="" onError={() => setBroken(true)} style={{ transform: `translateX(-${run.encounter.monster * 100 / 3}%)` }} />}
        </div>}</div>
        {motion && motion.kind !== "hurt" && landing && damage > 0 && <div className="duel-reaction"><b className="duel-damage">−{damage}</b>{!cosmeticReduced && <span className="duel-impact-ring" />}</div>}
      </div>
      {motion && !motion.clip && !cosmeticReduced && <div className={`duel-effect-layer ${motion.kind === "hurt" ? "quiz-counterattack" : ""}`}><Spell element={motion.kind === "hurt" && species ? petElement(species.id) : petElement(run.companion)} /></div>}
      {motion?.levelUp && landing && <strong className="quiz-level-up" role="status">✦ 升級！Lv.{currentLevel}</strong>}
      {!motion && (won || failed) && <strong className={`quiz-win ${failed ? "quiz-defeat" : ""}`} role="status">{failed ? "挑戰失敗 · 一起補練，再出發" : "✦ 挑戰成功"}</strong>}
    </div>
    <div className="quiz-message" role="status" aria-live="polite">
      {run.status === "failed" ? (mistakes>=3?"累計答錯或超時三題，夥伴生命歸零。答對的星幣與進度保留。":`需要答對 ${correctNeeded(run.challenge)} 題，這次答對 ${hits} 題。怪物仍有體力，答對的星幣與進度都保留。`) : motion?.kind === "hurt" ? `怪物反擊，生命 −${allyDamage}。${run.status === "won" ? "六題已完成，記得聽這題的正確答案。" : "這題記下來，戰後一起補練。"}` : won ? `完成挑戰！這趟夥伴獲得 ${run.encounter.earned} XP。` : motion && landing ? `攻擊命中！${motion.gain ? `夥伴 +${motion.gain} XP` : "努力已記錄"}` : "每題只作答一次；答對攻擊，答錯或超時扣血。累計三錯就結束這場。"}
    </div>
    </>}
    {won && capture && capture.outcome!=="pending" && recruit && <section className={`capture-result ${joined ? "" : "is-quiet"}`} aria-label="降服結果">
      {joined && <img src={recruit.image} alt={recruit.name} />}
      <div><h3>{capture.outcome === "joined" ? `${recruit.name}加入了！` : capture.outcome === "duplicate" ? `${recruit.name}又來作伴了！` : capture.outcome === "escaped" ? "航程完成，牠還想繼續冒險" : "挑戰完成，努力已記錄"}</h3>
        {joined ? <><CreatureBadge rarity={recruit.rarity} level={creatureProgress(recruit.rarity, profile.growth.xp[recruit.id] ?? 0).level} /><p>{capture.outcome === "duplicate" ? `同種夥伴卡片 +1，本次結算共 ${capture.copies} 張；既有等級與經驗值保留。` : (profile.growth.xp[recruit.id] ?? 0) > 0 ? "老朋友回來了，原有等級與經驗值都保留。" : `新夥伴已加入卡冊，天生 Lv.${NATIVE_LEVELS[recruit.rarity]}，繼續練習還能成長。`}</p>
          {!!profile.owned[recruit.id] && <button type="button" className="f-primary" disabled={busy || !online || profile.equipped === recruit.id} onClick={() => void onRecruit(recruit.id)}>{profile.equipped === recruit.id ? "✓ 已選擇陪練" : "選牠陪練"}</button>}
        </> : <p>{capture.outcome === "escaped" ? "這次沒有加入，下次再見。你的通關、經驗值與獎勵都已保留。" : CAPTURE_SKIP_TEXT[capture.reason!]}</p>}
        <p className="capture-rules">{capture.version===3?"三題全對必定降服 · 答錯一題本次失敗":`舊版結果 · 本次機率 ${capture.chance}%`} · 結果已存到雲端</p>
      </div>
    </section>}
    {motion && motion.kind !== "hurt" && landing && pet.encouragement && <p className="companion-encouragement" role="status">{pet.encouragement}</p>}


    <details className="quiz-encounter-info" key={run.status} open={!summaryOnly && run.status !== "active"}>
      <summary><span className="quiz-info-label-full">夥伴成長與戰鬥說明</span><span className="quiz-info-label-compact">戰鬥說明</span></summary>
    <GrowthMeter rarity={pet.rarity} xp={xp} />
    <p className="quiz-detail-growth-style">{growthStyle(run.encounter.level)}</p>
    {!won && <MaterialProgress profile={profile} run={run} oldDay={oldDay} />}
    <details className="quiz-stat-details"><summary>查看雙方能力與技能</summary>
      <div className="quiz-stat-grid"><div><h3>{pet.name} · 本趟能力</h3>{run.encounter.combat ? <CreatureSheet pet={pet} level={allyLevel} stats={run.encounter.combat.ally} /> : <CreatureBadge rarity={pet.rarity} level={allyLevel} />}</div>
      {species && <div><h3>{species.name} · 野外能力</h3><CreatureBadge rarity={species.rarity} level={foeLevel} /><p>{species.element}屬性 · {monsterForm(species).name}</p>{run.encounter.combat && <StatLine stats={run.encounter.combat.foe} />}<p><b>{petSkillName(species.id)}</b> · 降服後：{petSkillDescription(species.id)}</p></div>}</div>
      {run.encounter.combat && <p>答對依攻擊、防禦與五行發動攻擊；答錯扣除約三分之一生命，第三次歸零。每題只能作答一次。完成六題並達到本場答對目標才通關；怪物會保留最後一點體力直到通關。本趟能力在出發時固定，升級效果會在下趟生效。</p>}
    </details>
    {!species && <p className="capture-rules">{CAPTURE_SKIP_TEXT.legacy}</p>}
    {run.status === "active" && species && <p className="capture-rules">{!run.encounter.combat ? CAPTURE_SKIP_TEXT.legacy : run.practice ? CAPTURE_SKIP_TEXT.practice : oldDay ? CAPTURE_SKIP_TEXT["old-day"] : run.captureRule ? <>六題挑戰成功後，再連續答對三題就能降服；答錯一題本次失敗。</> : <>舊版航程：降服機率 <strong>{CAPTURE_RATES[species.rarity]}%</strong>。</>}</p>}
    {onBestiary && <div className="quiz-bestiary-link"><button type="button" onClick={onBestiary}>📖 怪物圖鑑</button>{species && <span>招式特色 · {species.move}</span>}</div>}
    <details className="quiz-growth-rule"><summary>成長規則 · 經驗持續累積</summary><p>{run.practice ? "練習對戰：不發經驗與建材，放心練習。" : oldDay ? "這是先前日期的航程；完成後開新航程才能獲得經驗與建材。" : "每道合資格題目 +10 XP，每五道再獲得建材；超過三次挑戰也能繼續成長。"}<small>使用提示與複習題答對仍有效；答錯不發經驗，同題一天一次。等級與經驗值跟著你的帳號保存。</small></p></details>
    </details>
  </section>, grade);
}
