import { useEffect, useRef, useState } from "react";
import { petById } from "../game-view";
import { MAX_MISTAKES } from "../challenge-rules";
import { CAPTURE_SKIP_TEXT, type CaptureOutcome } from "../creature-rules";
import { monsterById } from "../monsters";
import { MonsterArt } from "../MonsterBestiary";
import { GAMES, ISLAND_KING, ISLAND_UNITS, LOCKED_UNITS, UNIT_BY_ID, isExam, type DemoStep, type Item, type Mode, type View } from "./games";
import { PASS_MARK, bossBeaten, dueOnIsland, heartsFor, kingOpen, stageOpen, weakConcepts, type Stage, type StarEvent } from "./engine";
import type { CloudIsland, IslandRun, IslandAnswer } from "./schema";
import { cn, cnq } from "./rng";
import { cancelSpeech, sayThen, speakOnDemand } from "./speech";
import { Zy } from "./zhuyin";
import "./island.css";
import './semester.css';
import { semesterUnits, type Semester } from './catalog';
import { answerLimit, appendDigit } from './question-contract';
import { IslandIcon, IslandJourney, IslandSwitchDialog } from './IslandNavigation';
import { islandLocation, islandStageName, semesterName, islandQuestionPosition, mustSwitchIsland, openIslandDestination, type IslandDestination } from './navigation';
import './navigation.css';
import { IslandAbility } from './IslandAbility';
import { IslandLesson } from './IslandLesson';
import { IslandCurriculum } from './IslandCurriculum';
import { IslandGrades } from './IslandGrades';
import { gradeUnits, unitGrade, GRADE_ONE_UNITS } from './catalog';
import { gradeName, MATH_BOOKS } from './curriculum';

export type IslandCompanion = { name: string; image: string; skill: "focus" | "shield" | "spark"; skillName: string; skillIcon: string };
/** 嵌在家庭版遊戲內時由 App 提供：語音開關、發獎勵與回港口。 */
export type IslandEmbed = {
  voice: boolean; reduced: boolean; online: boolean; day: string; progress: CloudIsland;
  onStart: (mode: Mode, unit?: string, grade?: number) => Promise<IslandRun | undefined>;
  onAnswer: (runId: string, index: number, choice: string) => Promise<IslandAnswer | undefined>;
  onHelp: (runId: string, index: number) => Promise<{eliminated: string | null} | undefined>;
  onRound: (runId: string) => Promise<IslandRun | undefined>;
  onQuit: (runId: string) => Promise<boolean | undefined>;
  onExit: (to?: "home" | "lottery") => void;
};

import { islandSegments, resumePosition, islandOutcome, islandWrongFeedback, islandGuardian, type Seg } from "./presentation";
type Round = {
  mode: Mode;
  title: string;
  unit?: string;
  stage?: Stage;
  segs: Seg[];
  i: number;
  size: number;
  right: number;
  rewarded: number;
  points: number;
  coins: number;
  wrong: number;
  found: number;
  // 目前這一段
  view: View;
  demo?: { item: Item; steps: DemoStep[] };
  step: number;
  demoDone: boolean;
  tries: string[];
  first: boolean | null;
  done: boolean;
  gain: number;
  skillUsed: boolean;
  eliminated: string | null;
  hint: boolean;
  hp: number;
  /** 考卷模式：鍵盤上選了、還沒按「寫好了」的數字。 */
  pending: string | null;
};
/** prevBest：這次之前最好答對幾題（神獸、島主用來顯示進步），沒挑戰過是 null。 */
type Result = { round: Round; guardianId?: string; tickets: number; bonus: number; prevBest: number | null; savedStar: boolean; xp: number; packs: number; capture?: CaptureOutcome; legacyCapture?: boolean };
type Screen = { s: "map" } | { s: "unit"; id: string } | { s: "round" } | { s: "result" } | { s: "parent" } | { s:"curriculum" };
type Mood = "idle" | "happy" | "think" | "cheer";

const PRAISE = ["答對了！", "好棒！", "你好厲害！", "太棒了！"];
const STAGE_INFO: Record<Stage, { icon: string; name: string; kid: string }> = {
  learn: { icon: "📖", name: "學一學", kid: "夥伴先教你，再一起玩。" },
  play: { icon: "🎮", name: "玩一玩", kid: "完成六題就過關；錯三題先休息。" },
  boss: { icon: "⚔️", name: "挑戰神獸", kid: "自己讀題、自己寫答案。完成六題，錯不到三題就贏！" },
};
const KEYS = Array.from({ length: 11 }, (_, i) => String(i));
const say0 = (n: string) => cn(Number(n));
const STAR_LINE: Record<Exclude<StarEvent, null | "lost">, string> = {
  found: "你找到一顆迷路的星星！",
  home: "迷路的星星回到天上了！",
};

// Decoration stays separate from question data and cloud progress.
const ISLAND_ART: Record<string, string> = {
  "1A-01": "/assets/math-island/counting-bay.webp",
  "1A-04": "/assets/math-island/candy-island.webp",
  "1A-06": "/assets/math-island/duck-dock.webp",
};
function IslandLandscape({ unit, eager = false }: { unit: string; eager?: boolean }) {
  return <span className="isl-landscape" aria-hidden="true"><img src={ISLAND_ART[unit] ?? Object.values(ISLAND_ART)[((UNIT_BY_ID[unit]?.n ?? 1)-1)%3]} alt="" width="640" height="671" loading={eager ? "eager" : "lazy"} decoding="async" onError={e => { e.currentTarget.style.visibility = "hidden"; }} /></span>;
}

/** Rebuild only the result presentation; never call a reward command on replay. */
export function resultFromIslandRun(saved: IslandRun): Result {
  const correct = saved.answers.filter((a,i) => a === saved.items[i].answer).length;
  return { guardianId:islandGuardian(saved)?.id, tickets:saved.tickets, bonus:saved.bonus, prevBest:saved.prevBest, savedStar:saved.savedStar,
    xp:saved.xp, packs:saved.packs, capture:saved.capture, legacyCapture:saved.mode !== 'learn' && !saved.encounter,
    round:{ mode:saved.mode, title:'上次的結果', unit:saved.unit, segs:islandSegments(saved), i:0,
      size:saved.items.length, right:correct, wrong:saved.answers.length-correct,
      rewarded:saved.rewarded, points:saved.points, coins:saved.coins, found:saved.found,
      view:{}, step:0, demoDone:false, tries:[], first:null, done:true, gain:0,
      skillUsed:saved.skillUsed, eliminated:null, hint:false, hp:Math.max(0,heartsFor(saved.items.length)-correct), pending:null } };
}

export default function IslandApp({ player, companion, embed }: { player: { id: string; name: string; icon: string; grade?:number }; companion: IslandCompanion; embed: IslandEmbed }) {
  const pal = companion;
  const [screen, setScreen] = useState<Screen>({ s: "map" });
  const [semester, setSemester] = useState<Semester>(()=>(embed.progress.run?.unit?.slice(0,2)??String(embed.progress.run?.grade??player.grade??1)+'A') as Semester);
  const grade=unitGrade(semester);
  const [pendingDestination,setPendingDestination]=useState<{target:IslandDestination;current:IslandRun}|null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [bubble, setBubble] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const activeRun = useRef<IslandRun | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const voiceOn = embed.voice;
  const today = embed.day;
  const me = embed.progress;
  async function request<T>(action: () => Promise<T | undefined>) {
    if(inFlight.current || !embed.online) return;
    inFlight.current = true; setBusy(true); setNotice("");
    try {
      const value = await action();
      if(value === undefined) setNotice("還沒確認儲存。請先確認同步，再按「繼續玩」。");
      return value;
    } catch {
      setNotice("還沒確認儲存。請確認連線後，再試一次。已完成的題目都存好了。");
      return undefined;
    } finally {inFlight.current = false; setBusy(false);}
  }
  const say = (t: string, done?: () => void) => sayThen(t, done, voiceOn, setNotice);
  useEffect(() => () => cancelSpeech(), []);

  /* ---------- 進入畫面時的導覽語音 ---------- */
  // 嵌在遊戲裡時，遊戲換頁已經唸過「這是數學島」，第一次進地圖不重複。
  const quietFirstMap = useRef(!!embed);
  useEffect(() => {
    if (screen.s === "map" && quietFirstMap.current) {
      quietFirstMap.current = false;
      return;
    }
    if (screen.s === "map") say("這是數學島！選一座小島出發吧。");
    if (screen.s === "unit") {
      const u = UNIT_BY_ID[screen.id];
      const stars = dueOnIsland(me, u.id, today);
      say(`歡迎來到${u.place}！${stars ? `這裡有${cnq(Math.min(10, stars))}顆迷路的星星，去玩一玩把它找回來。` : stageOpen(me, u.id, "play") ? "繼續闖關吧。" : "先點學一學。"}`);
    }
  }, [screen.s, screen.s === "unit" ? screen.id : ""]);

  // 換畫面時把數學島捲到眼前（手機上題目和答案要在同一個畫面），焦點留在島上。
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (screen.s === "round" || el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start", behavior: (embed.reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches) ? "instant" : "smooth" });
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });
  }, [screen.s, round?.i]);

  /* ---------- 回合 ---------- */
  const seg = round ? round.segs[round.i] : null;

  function enter(r: Round): Round {
    const s = r.segs[r.i];
    const itemIndex=r.segs.slice(0,r.i).filter(s=>s.t === "item").length;
    const savedHelp=activeRun.current?.help;
    const help=savedHelp?.index===itemIndex && s.t === "item" ? savedHelp : undefined;
    const base = { ...r, tries: [], first: null, done: false, gain: 0, eliminated: help?.eliminated ?? null, hint: !!help && help.eliminated===null, demoDone: false, step: 0, pending: null };
    if (s.t === "demo") {
      const demo = GAMES[s.k].demo();
      return { ...base, demo, view: demo.steps[0].view };
    }
    return { ...base, demo: undefined, view: GAMES[s.item.k].init(s.item, r.mode) };
  }
  function startRound(mode: Mode, segs: Seg[], title: string, extra: { unit?: string; stage?: Stage } = {}) {
    const size = segs.filter((s) => s.t === "item").length;
    const r = enter({ mode, title, segs, i: 0, size, right: 0, rewarded: 0, points: 0, coins: 0, wrong: 0, found: 0, view: {}, step: 0, demoDone: false, tries: [], first: null, done: false, gain: 0, skillUsed: false, eliminated: null, hint: false, hp: heartsFor(size), pending: null, ...extra });
    setRound(r);
    setResult(null);
    setMood("idle");
    setBubble(isExam(mode) ? "自己讀題目，不會唸的字按耳朵。加油！" : segs[0]?.t === "demo" ? "看我示範喔！" : "我們一起玩！");
    setScreen({ s: "round" });
  }
  async function startCloud(mode: Mode, unit?: string, confirmed = false, targetGrade:number=unit?unitGrade(unit):grade) {
    if(inFlight.current || !embed.online) return;
    const target={mode,...(unit?{unit}:{}),...(mode==="mock"&&targetGrade>1?{grade:targetGrade}:{})};
    if(!confirmed && mustSwitchIsland(me.run,target)) {
      cancelSpeech();setPendingDestination({target,current:structuredClone(me.run!)});return;
    }
    const saved = await request(() => openIslandDestination(me.run,target,{quit:embed.onQuit,finish:embed.onRound,start:embed.onStart}));
    setPendingDestination(null);
    if(!saved) return;
    setSemester((saved.unit?.slice(0,2)??String(saved.grade??1)+'A') as Semester);
    activeRun.current = saved;
    const segs = islandSegments(saved);
    const title = mode === "mock" ? "島主大挑戰" : `${UNIT_BY_ID[unit!].place}・${STAGE_INFO[mode].name}`;
    startRound(mode,segs,title,unit?{unit,stage:mode as Stage}:{});
    setRound(r=>r?{...r,skillUsed:saved.skillUsed}:r);
    const count = saved.answers.length;
    if(count > 0) setBubble(segs[resumePosition(saved,segs)]?.t === "demo" ? "看我示範喔！" : "我們一起玩！");
    if(count > 0) setRound(previous => {
      if(!previous) return previous;
      const failed=saved.mode !== "learn" && saved.answers.filter((a,i)=>a!==saved.items[i].answer).length >= MAX_MISTAKES;
      const at = resumePosition(saved,segs);
      const correct = saved.answers.filter((a,i)=>a === saved.items[i].answer).length;
      let r = enter({...previous,i:at,right:correct,wrong:count-correct,coins:saved.coins,points:saved.points,
        rewarded:saved.rewarded,found:saved.found,hp:Math.max(0,heartsFor(saved.items.length)-correct)});
      if((count === saved.items.length || failed) && segs[at].t === "item") r={...r,done:true,first:saved.answers[count-1]===saved.items[count-1].answer,tries:[saved.answers[count-1]]};
      return r;
    });
  }
  const startStage = (unit: string, stage: Stage) => void startCloud(stage,unit);
  const startKing = () => void startCloud("mock",undefined,false,grade);

  // 題目：學一學、玩一玩進來先唸題目；考卷模式要自己讀，按耳朵才唸。
  useEffect(() => {
    if (round && seg?.t === "item") {
      if (isExam(round.mode)) cancelSpeech();
      else say(seg.item.say);
    }
  }, [round?.i, seg?.t === "item" ? seg.item.id : ""]);

  function act(a: unknown) {
    if (!round || !seg || seg.t !== "item" || round.done || busy || inFlight.current) return;
    const g = GAMES[seg.item.k];
    if (!g.act) return;
    const view = g.act(seg.item, round.view, a);
    setRound({ ...round, view });
    const line = isExam(round.mode) ? undefined : g.actSay?.(seg.item, view);
    if (line) say(line);
  }

  async function choose(v: string) {
    if (!round || !seg || seg.t !== "item" || round.done || busy || inFlight.current || !embed.online || round.tries.includes(v)) return;
    const item = seg.item;
    const g = GAMES[item.k];
    if (!g.ready(item, round.view, round.mode)) return;
    let ok = v === item.answer;
    let r: Round = { ...round, pending: null };
    let star: StarEvent = null;
    if (r.first === null) {
      const runId = activeRun.current?.id;
      if(!runId) return;
      const index = round.segs.slice(0,round.i).filter(s=>s.t === "item").length;
      const got = await request(() => embed.onAnswer(runId,index,v));
      if(!got) return;
      ok = got.correct; star = got.star; r.first = ok;
      item.answer=got.answer;
      if(ok) r.right++; else r.wrong++;
      if(star === "found" || star === "home") r.found++;
      if(got.coins) {r.rewarded++;r.coins+=got.coins;r.points+=got.points;r.gain=got.coins;}
    }

    if (ok) {
      r = { ...r, done: true, tries: [...r.tries, v], hp: isExam(r.mode) && r.first ? Math.max(0, r.hp - 1) : r.hp };
      setRound(r);
      setMood("happy");
      const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      const extra = star === "found" || star === "home" ? STAR_LINE[star] : "";
      setBubble(extra ? `${praise}${extra}` : praise);
      say(`${praise}${isExam(r.mode) ? "攻擊成功！" : ""}${extra}`);
      return;
    }
    // 答錯
    if (r.mode === "learn") {
      r = { ...r, tries: [...r.tries, v] };
      setRound(r);
      setMood("think");
      setBubble(g.tip);
      say(`再想一想。${g.tip}`);
      return;
    }
    const feedback = islandWrongFeedback(r.mode,r.wrong,g.answerText?.(item)??say0(item.answer));
    const segs = [...r.segs];
    if (feedback.reteach) segs.splice(r.i + 1, 0, { t: "demo", k: item.k, again: true });
    r = { ...r, segs, done: true, tries: [...r.tries, v] };
    setRound(r);
    setMood("think");
    setBubble(feedback.bubble);
    say(feedback.speech);
  }

  async function castSkill() {
    if(!round || !seg || seg.t !== "item" || round.skillUsed || round.done || !activeRun.current) return;
    const index=round.segs.slice(0,round.i).filter(s=>s.t === "item").length;
    const got=await request(()=>embed.onHelp(activeRun.current!.id,index));
    if(!got) return;
    activeRun.current!.help={index,eliminated:got.eliminated};
    setRound({...round,skillUsed:true,eliminated:got.eliminated,hint:!got.eliminated});
    const line=got.eliminated?"我幫你拿掉一個錯的！":GAMES[seg.item.k].tip;
    setBubble(line);say(line);setMood("cheer");
  }

  async function next() {
    if (!round || busy) return;
    setMood("idle");
    if (round.i + 1 < round.segs.length && !(round.mode !== "learn" && round.wrong >= MAX_MISTAKES)) {
      const r = enter({ ...round, i: round.i + 1 });
      setRound(r);
      setBubble(isExam(r.mode) ? "下一題，加油！" : r.segs[r.i].t === "demo" ? "看我示範喔！" : "我們一起玩！");
      return;
    }
    // 回合結束
    const runId=activeRun.current?.id;
    if(!runId) return;
    const got=await request(()=>embed.onRound(runId));
    if(!got) return;
    const {tickets}=got;
    setResult(resultFromIslandRun(got));
    setScreen({ s: "result" });
    const guardianName=islandGuardian(got)?.name ?? '神獸';
    const outcome=islandOutcome(round,guardianName);
    setMood(outcome.mood);
    setBubble(outcome.head);
    say(tickets ? `${outcome.head}還拿到一張星願券！` : outcome.head);
  }

  function leave() {
    cancelSpeech();
    const unit=round?.unit??me.run?.unit;
    if(unit) setSemester(unit.slice(0,2) as Semester);
    setRound(null);
    setScreen({s:'map'});
  }

  /* ---------- 畫面 ---------- */
  const palCard = (compact = false) => (
    <aside className={`isl-pal ${compact ? "compact" : ""}`}>
      <img className={`mood-${mood}`} src={pal.image} alt={pal.name} decoding="async" />
      {bubble && <p className="isl-say" aria-live="polite">{bubble}</p>}
    </aside>
  );

  let body: JSX.Element;
  if (screen.s === "round" && round && seg) {
    const exam = isExam(round.mode);
    const guardian = activeRun.current ? islandGuardian(activeRun.current) : null;
    const itemsBefore = round.segs.slice(0, round.i).filter((s) => s.t === "item").length;
    const contextUnit=round.unit??(seg.t==='item'?seg.item.unit:undefined);
    const position=islandQuestionPosition(round.size,itemsBefore,round.right+round.wrong,seg.t==='demo',seg.t==='demo'&&seg.again);
    const top = <IslandJourney unit={contextUnit} grade={activeRun.current?.grade??grade} mode={round.mode} progress={me.units[contextUnit??'']??{}} abilityProgress={me} position={position} coins={round.coins} busy={busy} onMap={leave}/>;
    if (seg.t === "demo" && round.demo) {
      const g = GAMES[seg.k];
      body = (
        <section className="isl-stage teaching">
          {top}
          <div className="isl-row">
            {palCard()}
            <div className="isl-main">
              <p className="isl-kicker">{seg.again ? "🔁 再看一次" : "👀 看我示範"}・<Zy text={g.name.split('（')[0]} /></p>
              <IslandLesson key={`${round.i}-${round.demo.item.id}`} game={g} demo={round.demo} voice={voiceOn} reduced={embed.reduced}
                onNotice={setNotice} onContinue={()=>void next()}/>
            </div>
          </div>
        </section>
      );
    } else if (seg.t === "item") {
      const item = seg.item;
      const g = GAMES[item.k];
      const ready = g.ready(item, round.view, round.mode);
      const inScene = g.sceneChoice?.(item, round.mode) ?? false;
      const S = exam && g.Exam ? g.Exam : g.Scene;
      const skillOk = !exam && pal.skill !== "spark";
      const sceneProps = { item, view: round.view, mode: round.mode, demo: false, done: round.done, act, choose: (v: string) => void choose(v), eliminated: round.eliminated, pending: round.pending, tried:round.tries, busy };
      const hearts = heartsFor(round.size);
      body = (
        <section className={`isl-stage ${exam ? "boss" : ""}`}>
          {top}
          {exam && guardian && (
            <div className={`isl-guardian ${round.hp === 0 ? "down" : round.done && round.first ? "hit" : round.done ? "laugh" : ""}`}>
              <img src={guardian.image} alt={guardian.name} decoding="async" />
              <div>
                <b>{guardian.name}</b>
                <span className="isl-hp" aria-label={`神獸還有 ${round.hp} 顆愛心`}>{Array.from({ length: hearts }, (_, i) => (i < round.hp ? "❤️" : "🤍")).join("")}</span>
              </div>
            </div>
          )}
          <div className={`isl-row ${exam ? "exam" : ""}`}>
            {palCard()}
            <div className="isl-main">
              <div className="isl-ask">
                <button className="isl-ear" onClick={() => speakOnDemand(item.say, setNotice)} aria-label="唸題目給我聽">🔊</button>
                <p className="isl-q" data-q={item.text}><Zy text={item.text} /></p>
              </div>
              <S {...sceneProps} />
              {round.hint && !round.done && <p className="isl-hint">🛡️ <Zy text={g.tip} /></p>}
              {!inScene && ready && !exam && (
                <div className={`isl-choices ${g.rocket ? "rockets" : ""}`}>
                  {item.choices.map((c) => {
                    const tried = round.tries.includes(c);
                    const right = round.done && c === item.answer;
                    return (
                      <button
                        key={c}
                        className={`isl-choice ${right ? "right" : ""} ${tried && c !== item.answer ? "wrong" : ""} ${round.eliminated === c ? "gone" : ""}`}
                        disabled={round.done || tried || round.eliminated === c || busy}
                        onClick={() => void choose(c)}
                      >
                        {g.rocket && <span className="fire">🚀</span>}
                        {c}
                      </button>
                    );
                  })}
                </div>
              )}
              {!inScene && ready && exam && (
                <div className="isl-keypad">
                  {!g.Exam && (
                    <p className="isl-paperline">
                      答：<span className={`isl-box ${round.done ? "shown" : round.pending != null ? "pending" : ""}`}>{round.done ? item.answer : (round.pending ?? "")}</span>
                    </p>
                  )}
                  <div className="isl-keys" role="group" aria-label="數字鍵盤">
                    {(answerLimit(item.unit)>10 ? KEYS.slice(0,10) : KEYS).map((k) => (
                      <button
                        key={k}
                        className={`isl-key ${round.pending === k ? "on" : ""} ${round.done && k === item.answer ? "right" : ""} ${round.done && round.tries.includes(k) && k !== item.answer ? "wrong" : ""}`}
                        disabled={round.done || busy}
                        onClick={() => setRound({ ...round, pending: answerLimit(item.unit)>10 ? appendDigit(round.pending,k) : k })}
                      >
                        {k}
                      </button>
                    ))}
                    {answerLimit(item.unit)>10 && <button className="isl-key" disabled={round.done||busy||round.pending==null} aria-label="刪除最後一位" onClick={()=>setRound({...round,pending:round.pending?.slice(0,-1)||null})}>⌫</button>}
                    <button className="isl-key isl-confirm" disabled={round.done || round.pending == null || busy} aria-label="寫好了" onClick={() => round.pending != null && void choose(round.pending)}>
                      ✓
                    </button>
                  </div>
                </div>
              )}
              {!inScene && !ready && <p className="isl-wait">先動手做做看 👆</p>}
              {round.done && (
                <div className="isl-actions">
                  {round.gain > 0 && <span className="isl-gain">+{round.gain} 🟡</span>}
                  <button className="isl-btn isl-next" autoFocus onClick={() => void next()} disabled={busy}>
                    {round.i + 1 < round.segs.length && !(round.mode !== "learn" && round.wrong >= MAX_MISTAKES) ? (round.segs[round.i + 1].t === "demo" ? "看夥伴教 ▶" : "下一題 ▶") : "看結果 ▶"}
                  </button>
                </div>
              )}
              {!round.done && skillOk && (
                <div className="isl-actions">
                  <button className="isl-btn ghost small" disabled={round.skillUsed || busy || !embed.online} onClick={castSkill}>
                    {pal.skillIcon} {pal.skillName}{round.skillUsed ? " ✓" : ""}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    } else body = <></>;
  } else if (screen.s === "result" && result) {
    const r = result.round;
    const exam = isExam(r.mode);
    const ratio = r.size ? r.right / r.size : 0;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
    const {pass,failed}=islandOutcome(r);
    const guardian = result.guardianId ? petById(result.guardianId) : null;
    const hearts = heartsFor(r.size);
    const hits = Math.min(r.right, hearts);
    const prevHits = result.prevBest === null ? null : Math.min(result.prevBest, hearts);
    const capture=embed.progress.run?.capture??result.capture, recruit=monsterById(capture?.monster);
    const joined=capture?.outcome==='joined'||capture?.outcome==='duplicate';
    body = (
      <section className="isl-panel isl-result">
        {exam && guardian ? <img className={`isl-boss-end ${pass ? "beaten" : ""}`} src={guardian.image} alt={guardian.name} /> : palCard(true)}
        <h2>{failed ? "先休息一下，再來挑戰！" : exam ? (pass ? `🎉 打敗了${guardian?.name ?? "神獸"}！` : `${guardian?.name ?? "神獸"}還很有精神`) : "🎉 完成了！"}</h2>
        {exam && !pass ? (
          <div className="isl-progress" aria-label={`這次打掉 ${hits} 顆愛心`}>
            <span className="hearts">{"💔".repeat(hits)}{"❤️".repeat(hearts - hits)}</span>
            <b>這次打掉 {hits} 顆心</b>
            {prevHits !== null && <span className={hits > prevHits ? "up" : ""}>{hits > prevHits ? `比上次最好多 ${hits - prevHits} 顆，你進步了！` : `上次最好是 ${prevHits} 顆，再練習一下！`}</span>}
          </div>
        ) : (
          <div className="isl-stars" aria-label={`${stars} 顆星`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</div>
        )}
        <p className="isl-score">答對 {r.right} / {r.size}</p>
        {r.unit&&<IslandAbility progress={me} unit={r.unit} details/>}
        {(r.coins + result.bonus > 0 || result.tickets > 0) && (
          <p className="isl-loot">
            {r.coins + result.bonus > 0 && <span>🟡 +{r.coins + result.bonus} 星幣</span>}
            {result.tickets > 0 && <span>🎟️ +{result.tickets} 星願券</span>}
          </p>
        )}
        {(result.xp > 0 || result.packs > 0) && <p className="isl-loot">夥伴 +{result.xp} XP{result.packs > 0 ? `・領地建材包 +${result.packs}` : ""}</p>}
        {result.savedStar && <p className="isl-muted">{result.tickets ? "存滿兩顆星，已換成一張星願券！" : "存好一顆星！再存一顆，就有一張星願券。"}</p>}
        {result.legacyCapture && <p className="isl-muted">{CAPTURE_SKIP_TEXT.legacy}</p>}
        {capture && capture.outcome!=="pending" && recruit && <section className="isl-capture" aria-label="野外夥伴降服結果">
          <MonsterArt monster={recruit} eager action="capture"/>
          <div><h3><Zy text={joined ? `${recruit.name}加入了！` : `${recruit.name}的邀請結果`} /></h3>
            <p>{joined ? `${capture.outcome==='duplicate'?'又多了一張！':'新的夥伴卡！'}現在共有 ${capture.copies} 張，可以到夥伴卡冊查看。` : capture.outcome==='escaped' ? '這次沒有加入，下次再見。通關獎勵已經存好了。' : CAPTURE_SKIP_TEXT[capture.reason!]}</p>
            <p className="isl-muted">{capture.version===3?"三題全對必定降服 · 答錯一題本次失敗":`舊版結果 · 本次機率 ${capture.chance}%`}</p>
            <button className="isl-btn ghost small" onClick={()=>say(joined ? `${recruit.name}加入了！現在共有${capture.copies}張夥伴卡。` : '這次沒有加入。通關獎勵已經存好了，下次再來交朋友。')}>🔊 聽結果</button>
          </div>
        </section>}
        <p className="isl-muted">每兩場六題挑戰成功換一張券，星星可跨日保留，沒有每日次數上限。</p>
        {r.found > 0 && <p className="isl-muted">⭐ 這趟找回了 {r.found} 顆迷路的星星！</p>}
        {embed && r.right > r.rewarded && <p className="isl-muted">今天已作答的同一道題，或跨日的舊航程不再發星幣；學習進度一樣會保存。</p>}
        {r.wrong > 0 && <p className="isl-muted">答錯的題目會變成迷路的星星，明天回到牠的小島等你。</p>}
        {r.mode === "learn" && <p className="isl-muted">學一學不計戰鬥完成獎勵。接著去「玩一玩」，挑戰六題存星星！</p>}
        {r.mode === "play" && !failed && r.unit && !bossBeaten(me, r.unit) && <p className="isl-muted">下一關：挑戰守關神獸！</p>}
        {r.mode === "boss" && !pass && <p className="isl-muted">要完成六題，錯不到三題才能打敗牠。去「玩一玩」練習一下再來！</p>}
        <div className="isl-actions center">
          {r.unit&&pass&&(r.mode==='learn'||r.mode==='play')&&<button className="isl-btn" disabled={busy||!embed.online} onClick={()=>startStage(r.unit!,r.mode==='learn'?'play':'boss')}><Zy text={`下一關：${r.mode==='learn'?'玩一玩':'挑戰神獸'}`}/> →</button>}
          {r.unit && <button className="isl-btn ghost" onClick={() => setScreen({ s: "unit", id: r.unit! })}>🏝️ 回小島</button>}
          <button className="isl-btn ghost" onClick={leave}>🗺️ 回地圖</button>
          <button className="isl-btn" onClick={() => embed.onExit("lottery")}>🎟️ 去扭蛋</button>
        </div>
      </section>
    );
  } else if (screen.s === "unit") {
    const u = UNIT_BY_ID[screen.id];
    const g = petById(u.guardian);
    const prog = me.units[u.id] ?? {};
    const stars = dueOnIsland(me, u.id, today);
    body = (
      <>
        <button className="isl-link" onClick={leave}><IslandIcon name="map"/><Zy text="換小島"/></button>
        <section className="isl-panel isl-island">
          <IslandLandscape unit={u.id} eager />
          <div className="isl-island-head">
            <div>
              <span className="isl-kicker"><Zy text={`${semesterName(u.id)}・第 ${u.n} 單元`}/></span>
              <h2><Zy text={u.title}/></h2><p className="isl-unit-place"><Zy text={u.place}/></p>
              {stars > 0 && <span className="isl-starnote">⭐ 這裡有 {stars} 顆迷路的星星，去「玩一玩」找回來！</span>}
            </div>
            {g && <img src={g.image} alt={`守關神獸 ${g.name}`} className={bossBeaten(me, u.id) ? "tamed" : ""} />}
          </div>
          <div className="isl-unit-ability"><IslandAbility progress={me} unit={u.id} details/></div>
          <div className="isl-stagelist">
            {(["learn", "play", "boss"] as Stage[]).map((st, i) => {
              const open = stageOpen(me, u.id, st);
              const doneMark = st === "boss" ? bossBeaten(me, u.id) : !!prog[st];
              const current=me.run&&!me.run.completed&&me.run.unit===u.id&&me.run.mode===st;
              return (
                <button key={st} className={`isl-stagebtn ${doneMark ? "cleared" : ""} ${st === "play" && stars > 0 && open ? "glow" : ""}`} disabled={!open || busy || !embed.online} onClick={() => startStage(u.id, st)}>
                  <span className="ic">
                    {open ? STAGE_INFO[st].icon : "🔒"}
                    <span className="n">{i + 1}</span>
                  </span>
                  <span className="tx">
                    <b><Zy text={`${current?"繼續":""}${STAGE_INFO[st].name}`}/></b>
                    <small><Zy text={current?`已完成 ${me.run!.answers.length} / ${me.run!.items.length} 題，接著玩。`:open ? STAGE_INFO[st].kid : st === "play" ? "先完成「學一學」" : "先完成「玩一玩」"}/></small>
                  </span>
                  <span className="ok">{doneMark ? "✅" : ""}</span>
                </button>
              );
            })}
          </div>
        </section>
      </>
    );
  } else if (screen.s === "curriculum") {
    body=<><button className="isl-link" onClick={()=>setScreen({s:"map"})}>← 回數學島</button>
      <IslandCurriculum hasActiveRun={!!me.run&&!me.run.completed} progress={me}
        onResume={()=>void startCloud(me.run!.mode,me.run!.unit,false,me.run!.grade??1)}
        onEnterUnit={id=>{setSemester(id.slice(0,2) as Semester);setScreen({s:"unit",id});}}>
        <div className="isl-curriculum-grid">{GRADE_ONE_UNITS.map(u=><button className="isl-curriculum-unit" key={u.id} onClick={()=>setScreen({s:"unit",id:u.id})}><b>{u.id}・{u.title}</b><span>進入單元 →</span></button>)}</div>
      </IslandCurriculum></>;
  } else if (screen.s === "parent") {
    const rows = weakConcepts(me).filter((r) => GAMES[r.k]);
    const pool = [...me.pool].filter((s) => GAMES[s.k]).sort((a, b) => a.due.localeCompare(b.due));
    body = (
      <>
        <button className="isl-link" onClick={leave}><IslandIcon name="map"/><Zy text="換小島"/></button>
        <section className="isl-panel isl-parent">
          <h2>家長看這裡</h2>
          <p className="isl-muted">
            三遍提取法做成三關：「學一學」先唸再測（夥伴示範、動手做、可以重試）；「玩一玩」先測再補（先做，前兩次答錯夥伴會再教），第 2、4 題會混進到期的迷路星星或已打敗小島的抽查題；「挑戰神獸」只測（像考卷：沒有道具和提示、題目自己讀、用數字鍵盤或答案卡作答，完成 6 題、錯不到 3 題就過關）。「玩一玩」和挑戰中答錯三題會先休息，學一學可以重試。所選年級全部單元的神獸都打敗後才開「島主大挑戰」（每次隨機抽六個不同單元，重玩會換題）。
          </p>
          <p className="isl-muted">任何一關第一次答錯，那種小遊戲就變成一顆迷路的星星，隔天回到牠的小島；之後在不同天連續答對兩次那種遊戲（每次換新數字），星星才回到天上。</p>
          <h3>弱點筆記</h3>
          {rows.length ? (
            <div className="isl-list">
              {rows.map((r) => (
                <div key={r.k} className="isl-item">
                  <div className="isl-spread"><b>{GAMES[r.k].name}</b><span className="isl-muted">錯 {r.w} / {r.a}</span></div>
                  <span className="isl-meter"><i style={{ width: `${Math.round(r.rate * 100)}%` }} /></span>
                  <span className="isl-muted">{UNIT_BY_ID[GAMES[r.k].unit].title}・提醒孩子：{GAMES[r.k].tip}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="isl-muted">還沒有錯題紀錄。</p>
          )}
          <h3>迷路的星星（{pool.length}）</h3>
          {pool.length ? (
            <div className="isl-list">
              {pool.map((s) => (
                <div key={s.k} className="isl-item isl-spread">
                  <span>{GAMES[s.k].name}<span className="isl-muted">・{UNIT_BY_ID[GAMES[s.k].unit].place}</span></span>
                  <span className={`isl-pill ${s.due <= today ? "due" : ""}`}>{s.due <= today ? "今天" : s.due.slice(5).replace("-", "/")}・連對 {s.streak}/2</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="isl-muted">沒有迷路的星星。</p>
          )}

        </section>
      </>
    );
  } else {
    const yearUnits=gradeUnits(grade);
    const beaten = yearUnits.filter((u) => bossBeaten(me, u.id)).length;
    const king = kingOpen(me,grade);
    const units = semesterUnits(semester);
    const recommended = units.find(u => !bossBeaten(me,u.id));
    const completed = units.filter(u => bossBeaten(me,u.id)).length;
    body = (
      <>
        <IslandGrades grade={grade} onChange={g=>setSemester((String(g)+"A") as Semester)}/>
        <div className="isl-maptitle">
          <div><h2>數學島</h2><p><Zy text="選一座小島出發吧。" /></p></div>
          <span className="isl-muted">{gradeName(grade)}全學年・{yearUnits.length} 個單元</span>
        </div>
        {me.run && !me.run.completed && <section className="isl-panel isl-resume isl-current-island" aria-label="正在玩的單元">
          <span className="isl-you-are-here"><IslandIcon name="flag"/><Zy text="你在這裡"/></span>
          <h3><Zy text={islandLocation(me.run.unit)}/></h3>
          <p><Zy text={`${islandStageName(me.run.mode)}・已完成 ${me.run.answers.length} / ${me.run.items.length} 題`}/></p>
          <div className="isl-actions"><button className="isl-btn" disabled={busy || !embed.online} onClick={()=>void startCloud(me.run!.mode,me.run!.unit,false,me.run!.grade??1)}><Zy text="繼續玩"/> →</button>
          <button className="isl-btn ghost" disabled={busy} onClick={()=>rootRef.current?.querySelector<HTMLButtonElement>('#isl-unit-map button')?.focus()}><IslandIcon name="map"/><Zy text="選小島"/></button></div>
          <p className="isl-resume-note"><Zy text="這一關會等你。選好別的小島，再決定要不要換。"/></p>
        </section>}
        {me.run?.completed && <div className="isl-panel isl-resume">
          <button className="isl-btn ghost" onClick={()=>{setResult(resultFromIslandRun(me.run!));setScreen({s:'result'});}}>🎁 查看上次結果</button>
        </div>}
        <div className="isl-semester-tabs" role="group" aria-label="選擇學期">
          {([String(grade)+'A',String(grade)+'B'] as Semester[]).map(term => <button key={term} className="isl-btn ghost" aria-pressed={semester===term} onClick={()=>setSemester(term)}>{term.endsWith('A')?'上學期':'下學期'} <small>{semesterUnits(term).filter(u=>bossBeaten(me,u.id)).length}/{semesterUnits(term).length}</small></button>)}
        </div>
        <section className="isl-route" aria-label="單元進度">
          <div><b>{semester.endsWith('A')?'上學期':'下學期'}・已完成 {completed} / {units.length} 單元</b><progress max={units.length} value={completed} aria-label="本學期單元進度" /></div>
          {recommended ? <button className={`isl-btn ${me.run&&!me.run.completed?"ghost":""}`} disabled={busy || !embed.online} onClick={()=>setScreen({s:'unit',id:recommended.id})}>建議下一站：第 {recommended.n} 單元・{recommended.title} →</button> : <p>這學期的單元都完成了！可以重玩，也可以切換學期。</p>}
          <p>每座島有三關：先學，再玩，最後挑戰神獸。</p>
        </section>
        <div className="isl-map isl-unit-map" id="isl-unit-map" aria-label={`${semester.endsWith('A')?'上學期':'下學期'}${units.length} 座小島`}>
          {units.map((u, idx) => {
            const stars = dueOnIsland(me, u.id, today);
            const cleared = bossBeaten(me, u.id);
            const current=me.run&&!me.run.completed&&me.run.unit===u.id;
            const progress = me.units[u.id];
            const nextStage = !progress?.learn ? "學一學" : !progress?.play ? "玩一玩" : !cleared ? "挑戰神獸" : "再玩一次";
            return (
              <button key={u.id} disabled={busy || !embed.online} className={`isl-isle ${cleared ? "beaten" : ""} ${current?"is-current":""}`} aria-current={current?"location":undefined} onClick={() => current?void startCloud(me.run!.mode,me.run!.unit,false,me.run!.grade??1):me.run&&!me.run.completed?void startCloud(!progress?.learn?"learn":!progress?.play?"play":!cleared?"boss":"learn",u.id):setScreen({ s: "unit", id: u.id })}>
                <span className="isl-destination-art">
                  <IslandLandscape unit={u.id} eager={idx === 0} />
                  <img className="isl-map-guardian" src={petById(u.guardian)?.image} alt="" aria-hidden="true" width="88" height="88" decoding="async" />
                </span>
                <span className="isl-destination-copy">
                  <span className="tx"><small><Zy text={`第 ${u.n} 單元`}/>{current&&<span className="isl-current-badge"><Zy text="你在這裡"/></span>}</small><b><Zy text={u.title}/></b><span><Zy text={u.place}/></span></span>
                  <span className="marks" aria-label="三關進度">
                    {(["learn", "play", "boss"] as Stage[]).map(st => {
                      const done = st === "boss" ? cleared : !!progress?.[st];
                      return <span key={st} className={done ? "on" : ""}><span aria-hidden="true">{done ? "✓" : "○"}</span> {STAGE_INFO[st].name}<span className="isl-sr-only">{done ? "，已完成" : "，未完成"}</span></span>;
                    })}
                  </span>
                  {stars > 0 && <span className="isl-review-note">⭐ 待找回 {stars} 顆星星</span>}
                  <IslandAbility progress={me} unit={u.id} compact/>
                  <span className="isl-next-stage">{!current&&recommended?.id === u.id && "建議下一站・"}{cleared ? "已完成三關，可以再練習" : `下一關：${nextStage}`}</span>
                  <span className="isl-destination-action"><span><Zy text={current?"繼續玩":me.run&&!me.run.completed?"去這座島":"進入小島"} /></span><span aria-hidden="true">➜</span></span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="isl-bottom">
          <button className="isl-btn big king" disabled={!king || busy || !embed.online} onClick={startKing}>
            <img className="ic" src={petById(ISLAND_KING)?.image} alt="" aria-hidden="true" />
            <span className="tx">
              <b>{king ? "島主大挑戰" : "🔒 島主大挑戰"}</b>
              <small>{!king ? `完成${gradeName(grade)}全學年單元就會出現（${beaten}/${yearUnits.length}）` : (grade===1?me.mock??0:me.mocks?.[grade]??0) >= PASS_MARK ? "再挑戰一次？" : "全學年隨機抽六個單元各一題，錯不到 3 題就過關！"}</small>
            </span>
          </button>
          {LOCKED_UNITS.length > 0 && <details className="isl-unreleased">
            <summary>其他單元・還沒開放</summary>
            <ul>{LOCKED_UNITS.map(u => <li key={u.n}><span>第 {u.n} 單元</span><b>{u.title}</b></li>)}</ul>
          </details>}
          <button className="isl-link" onClick={() => setScreen({s:"curriculum"})}>查看全年級課程總覽 →</button>
          <button className="isl-link" onClick={() => setScreen({ s: "parent" })}>家長看這裡 →</button>
        </div>

      </>
    );
  }

  const wild=screen.s==='round' ? monsterById(activeRun.current?.encounter?.variant) : undefined;
  return (
    <div id="math-island" data-screen={screen.s} data-grade={screen.s==="round"&&round?.unit?unitGrade(round.unit):grade} ref={rootRef} tabIndex={-1} className={`isl embedded ${embed.reduced ? "reduced" : ""}`}>
      <div className="isl-head" hidden={screen.s === "round"}>
        {embed ? (
          <button className="isl-btn ghost small" onClick={() => { cancelSpeech(); embed.onExit("home"); }}>⛵ 回港口</button>
        ) : (
          <span className="isl-brand">星潮學院</span>
        )}
        <span className="isl-who">{player.icon} {player.name}</span>

      </div>
      {!embed.online && <p className="isl-notice" role="status">連線後就能繼續，已完成的題目都存好了。</p>}
      {notice && <p className="isl-notice" role="status">{notice} <button className="isl-link inline" onClick={() => setNotice("")}>知道了</button></p>}
      {body}
      {pendingDestination&&<IslandSwitchDialog current={pendingDestination.current} target={pendingDestination.target} busy={busy} onCancel={()=>setPendingDestination(null)} onConfirm={()=>void startCloud(pendingDestination.target.mode,pendingDestination.target.unit,true,pendingDestination.target.grade??1)} onSpeak={text=>speakOnDemand(text,setNotice)}/>}
      {wild && <aside className="isl-wild-preview"><MonsterArt monster={wild} /><div><b><Zy text={`通關後邀請${wild.name}`} /></b><p>本場成功後，再連續答對三題就必定成為夥伴。答錯一題，這次降服就結束。</p><button className="isl-btn ghost small" onClick={()=>say(`這場挑戰成功後，再連續答對三題就能邀請${wild.name}成為夥伴。答錯一題，這次降服就結束。`)}>🔊 聽說明</button></div></aside>}
    </div>
  );
}
