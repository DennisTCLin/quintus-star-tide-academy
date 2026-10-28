import { resetFamilyScroll } from './family-scroll';
import CaptureChallenge from "./CaptureChallenge";
import type { CaptureSource } from "./capture-trial";
import {harborDeparture} from "./harbor-departure";
import QuestionFigure,{useQuestionFigure} from './QuestionFigure';
import { quizAnimationMs } from './battle-cinematics';
import StudyReview, { StudyEntry, StudySummary } from "./StudyReview";
import type { StudySession } from "./study-review";
import ReadAloud, { allowsReadAloud } from './ReadAloud';
import QuestionPrompt from './QuestionPrompt';
import { examSourceLabel } from "./exam-sources";
import { SAFE_MODE } from './recovery-mode';
import { toneName } from './PhoneticText';
import { StartupStatus } from './AppRecovery';
import ChoiceView, { Ruby } from './ChoiceView';
import BattleReview from "./BattleReview";
import BattleAdvance from "./BattleAdvance";
import TideglowCompanion from './TideglowCompanion';
import { companionQuiet, companionMascot, companionName, companionPortrait } from './tideglow-companion';
import { guideFacts } from './dragon-dialogue';
import { ChallengePreparation, ChallengeTimer } from "./ChallengePanel";
import { correctNeeded } from "./tiered-challenge";
import { MAX_MISTAKES, mistakeCount } from "./challenge-rules";
import "./companion-motion.css";
import { CreatureBadge, CreatureSheet } from "./CreatureInfo";
import { monsterById } from "./monsters";
import { creatureProgress } from "./companion-growth";
import { fighterMaxHp, petSkillName, petSkillDescription } from "./game-view";
import { englishAnswerSpeech, questionSpeech } from "./speech-text";
import GachaMachine from "./GachaMachine";
import StarterOnboarding from "./StarterOnboarding";
import { initialCompanion, needsOnboarding } from "./starter";
import ElementGuide from "./ElementGuide";
import { GENERATION_HEAL, hasElementGeneration } from "./elements";
import { BrandText } from "./BrandIcon";
import NavIcon, { type NavIconName } from "./NavIcon";
import OutcomeAnimation from "./OutcomeAnimation";
import QuizVictory, { VictoryDetails } from "./QuizVictory";
import QuizEncounter, { GrowthMeter } from "./QuizEncounter";
import CountOnExplanation from "./CountOnExplanation";
import AnswerOption from "./AnswerOption";
import "./learning-controls.css";
import "./quiz-console.css";
import { canListenToEnglishChoices } from "./english-choice-listening";
import MonsterBestiary from "./MonsterBestiary";
import TrainingPanel from "./TrainingPanel";
import HomeScene from "./HomeScene";
import CollectionBoard, { CollectionViewer } from "./CollectionBoard";
import FriendsPresence from "./FriendsPresence";
import OnlineBattle from "./OnlineBattle";
import { useOnlineBattle } from "./online-battle";
import { usePresence } from "./presence";
import LearningBuildPanel from "./LearningBuildPanel";
import LearningJourney, { ResourceRibbon } from "./LearningJourney";
import type { GoalRequest } from "./learning-journey";
import PlayerAvatar, { AccountAvatarProvider, playerPhotos } from "./PlayerAvatar";
import BrandLogo from "./BrandLogo";
import BattleScene from "./BattleScene";
import BattlePetPicker from "./BattlePetPicker";
import { battlePresentationTiming, visibleBattle, advanceBattlePhase, type BattlePlayback } from "./battle-presentation";
import useHomeMusic, { HOME_MUSIC, COMPANION_MUSIC, BATTLE_MUSIC } from "./useHomeMusic";
import { learningSummary } from "./learning-summary";
import { SKILL_NAMES } from "./learning-catalog";
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { recoverablePage } from "./RecoverablePage";
import AccountGate, { LegacyTransfer, RecoverySettings } from "./AccountGate";
import { useCloud, type PublicQuestion } from "./cloud";
import RewardChoice from "./RewardChoice";
import { rewardMessage, type RewardState } from "./reward-display";
import HeroVideoCarousel from "./HeroVideoCarousel";
import AbilityRadar from "./AbilityRadar";
import { selectAbilitySnapshot } from "./growth";
import { type Subject } from "./core";
import {
  RARITY_ORDER,
  DEFAULT_CHARACTER_ID,
  type Character,
} from "./characters";
import { COURSES } from "./course-catalog";
import CourseSelection, { unfinishedJourney } from "./CourseSelection";
import { islandEntry, type IslandDestination } from "./island-entry";
import type { Course } from "./learning";
import {
  taipeiDay,
  collectionStats,
  tradeSuggestions,
  PLAYERS,
  ROSTER,
  PRICES,
  SKILLS,
  ELEMENTS,
  petById,
  petSkill,
  petElement,
  newBattle,
  chooseCpuTeam,
  battleMove,
  BATTLE_BUFFS,
  canBattleQuiz,
  beginBattleQuiz,
  answerBattleQuiz,
  closeBattleQuiz,
  cpuMove,
  type PlayerId,
  type Battle,
  type BattleMove,
  type DrawResult,
} from "./game-view";
import { playRecording, speak, stopVoice } from "./voice";
import { ReadingContext, AutoRuby, annotateTree, textOf } from "./readability";
import "./family.css";
import "./friends.css";
import "./quiz-ready.css";
const IslandApp = recoverablePage(() => import("./island/IslandApp"), "數學島");
const TerritoryPage = recoverablePage(() => import("./TerritoryPage"), "領地");
const RoomEditor = recoverablePage(() => import("./RoomEditor"), "房間");
type Page =
  | "review"
  | "island"
  | "room"
  | "territory"
  | "home"
  | "learn"
  | "collection"
  | "bestiary"
  | "leaderboard"
  | "lottery"
  | "trade"
  | "battle"
  | "parent";
const navs: { page: NavIconName; name: string; zy: string }[] = [
  { page: "home", name: "港口", zy: "ㄍㄤˇ ㄎㄡˇ" },
  { page: "collection", name: "夥伴", zy: "ㄏㄨㄛˇ ㄅㄢˋ" },
  { page: "leaderboard", name: "排行", zy: "ㄆㄞˊ ㄏㄤˊ" },
  { page: "lottery", name: "扭蛋", zy: "ㄋㄧㄡˇ ㄉㄢˋ" },
  { page: "trade", name: "交換", zy: "ㄐㄧㄠ ㄏㄨㄢˋ" },
  { page: "battle", name: "對戰", zy: "ㄉㄨㄟˋ ㄓㄢˋ" },
  { page: "territory", name: "領地", zy: "ㄌㄧㄥˇ ㄉㄧˋ" },
  { page: "parent", name: "家長", zy: "ㄐㄧㄚ ㄓㄤˇ" },
];
const guides: Record<Page, string> = {
  review: "一起把學過的記牢。先看題目，答完看解法，想休息隨時可以回港口。",
  island: "這是數學島！選一座小島，先看夥伴示範，再一起闖關。",
  room: "點家具，再點想放的位置。可以轉向、收回與撤銷，完成後按儲存佈置。",
  territory: "歡迎回到自己的領地。選建築、點空地，再確認建造。主城一直供應資源，不需要戰鬥也能讓家園成長。",
  home: "歡迎回到星潮學院！點下面的大圖案選一條航線。耳朵可以幫你聽說明。",
  learn: "先按大耳朵，聽完聲音，再點選答案。答對就出招，接著會自動換題。",
  leaderboard:
    "獎盃是收藏排行榜。太陽看今天，月曆看這週，星星看現在的全部收藏。每位航海員旁的數字就是不同卡片的種類。點耳朵聽成績。",
  collection: "點夥伴的圖片，可以聽名字和技能。打勾的夥伴可以一起出發。",
  bestiary: "這是怪物圖鑑。可以看三十種怪物，選屬性、族群或等級，點圖片聽介紹。",
  lottery:
    "六題挑戰成功，會自動存一顆星。每兩場成功換一張券，沒有每日次數上限。一張券一定得到一張夥伴卡，可能和已有的卡相同。",
  trade: "請和另一位航海員一起操作。選出想送出和收到的夥伴，再輪流確認。",
  battle:
    "先選夥伴和對手。劍是攻擊，盾牌是防守，愛心是回復，星星是絕招。和電腦對戰時，點書本答題，答對就能幫夥伴加上技能效果。",
  parent: "這裡可以查看帳號、雲端進度，及調整閱讀設定。",
};
function Art({
  pet,
  large = false,
  mood = "idle",
}: {
  pet: Character;
  large?: boolean;
  mood?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`pet-art ${large ? "large" : ""} mood-${mood}`}
      data-motion={pet.motion} data-rarity={pet.rarity} data-series={pet.series}
      key={pet.id}
    >
      {broken ? (
        <span role="img" aria-label={pet.name}>
          <BrandText text="🐾" />
        </span>
      ) : (
        <img
          src={large ? pet.image : (pet.thumbnail ?? pet.image)}
          alt={pet.name}
          loading={large ? "eager" : "lazy"}
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
}
function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [audioError, setAudioError] = useState("");
  const accessibility = useContext(ReadingContext);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    if (accessibility.grade === 1 && accessibility.voice)
      speak(`${title}。${textOf(children)}`, setAudioError);
    return () => {
      el?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="family-dialog"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-label={title}
    >
      <div className="dialog-heading">
        <h2>{accessibility.grade === 2 ? <AutoRuby text={title} /> : title}</h2>
        <ReadAloud grade={accessibility.grade}><button data-read-aloud
          onClick={() => { setAudioError(""); speak(`${title}。${textOf(children)}`, setAudioError); }}
          aria-label="聽視窗說明"
        >
          <BrandText text="🔊" />
        </button></ReadAloud>
        <button onClick={close} aria-label="關閉">
          <BrandText text="✕" />
        </button>
      </div>
      {audioError && <p role="alert">{accessibility.grade === 2 ? <AutoRuby text={audioError} /> : audioError}</p>}
      {children}
    </dialog>
  );
}
const tradeCardSpeech = (pet: string, count: number) =>
  `送出${petById(pet)!.name}一張，留下${Math.max(0, count - 1)}張。${count === 1 ? "這是最後一張，交換後會離開你的卡冊。" : ""}`;
export default function App() {
  const cloud = useCloud();
  if (cloud.loading) return <main className="family-app welcome"><div className="welcome-brand"><BrandLogo variant="welcome" /></div><StartupStatus>正在連接你的航海誌…</StartupStatus></main>;
  if (!cloud.state)
    return (
      <AccountGate
        loading={cloud.loading}
        error={cloud.error}
        onLogin={cloud.receive}
      />
    );
  return (
    <AccountAvatarProvider value={{ username: cloud.state.username, playerId: cloud.state.playerId }}>
      <Game key={`${cloud.state.username}:${cloud.state.csrf}`} cloud={cloud} />
    </AccountAvatarProvider>
  );
}
function Game({ cloud }: { cloud: ReturnType<typeof useCloud> }) {
  const family = cloud.state?.family ?? null;
  const [id, setId] = useState<PlayerId | null>(cloud.state?.playerId ?? null),
    [page, setPage] = useState<Page>("home"),
    [homeDirty, setHomeDirty] = useState(false),
    [notice, setNotice] = useState(""),
    [reviewOffer, setReviewOffer] = useState<Course | null>(null),
    [busy, setBusy] = useState(false),
    [chooser, setChooser] = useState(false),
    [coursePicker, setCoursePicker] = useState(false);
  const [companionOpenRequest, setCompanionOpenRequest] = useState(0);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [islandMapActive, setIslandMapActive] = useState(false);
  const [islandChoice, setIslandChoice] = useState<{ target: IslandDestination; runId?: string; mathId?: string } | null>(null);
  const switchingIsland = useRef(false);
  const social = useOnlineBattle(id, cloud.state?.csrf);
  const [territoryGoalRequest, setTerritoryGoalRequest] = useState<GoalRequest | null>(null);
  const territoryGoalSequence = useRef(0);
  const [voice, setVoice] = useState(false),
    [motionPaused, setReduceMotion] = useState(false),
    [contrast, setContrast] = useState(false);
  const [heard, setHeard] = useState(""),
    [hint, setHint] = useState(false),
    [feedback, setFeedback] = useState(""),
    [mood, setMood] = useState("idle");
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const questionReading = useRef<HTMLDivElement>(null);
  const [petDetail, setPetDetail] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [rarity, setRarity] = useState("all"),
    [elementFilter, setElementFilter] = useState("all"),
    [ownedOnly, setOwnedOnly] = useState(false),
    [newSeriesOnly, setNewSeriesOnly] = useState(false),
    [duplicatesOnly, setDuplicatesOnly] = useState(false),
    [limit, setLimit] = useState(12);
  const [viewCollection, setViewCollection] = useState<string|null>(null);
  const [tradeTo, setTradeTo] = useState<PlayerId>(cloud.state?.playerId === "feifei" ? "qingqing" : "feifei"),
    [give, setGive] = useState(""),
    [receive, setReceive] = useState("");
  const [battle, setBattle] = useState<Battle | null>(null),
    [battleMode, setBattleMode] = useState<"cpu" | "duo">("cpu"),
    [opponent, setOpponent] = useState<PlayerId>(cloud.state?.playerId === "feifei" ? "qingqing" : "feifei"),
    [team, setTeam] = useState<string[]>([]),
    [otherTeam, setOtherTeam] = useState<string[]>([]),
    [handoff, setHandoff] = useState(false);
  const [battlePlayback, setBattlePlayback] = useState<BattlePlayback | null>(null);
  const battleEffect = battlePlayback?.event ?? null;
  const presentationNonce = useRef(0);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const reduceMotion = SAFE_MODE || motionPaused;
  const battleReducedMotion = reduceMotion || systemReducedMotion;
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const battleStage = useRef<HTMLDivElement>(null);
  const battleLock = useRef(false);
  const battleQuizLock = useRef(false);
  const [battleHeard, setBattleHeard] = useState("");
  const [battleAudioError, setBattleAudioError] = useState("");
  const [battleQuestion, setBattleQuestion] = useState<PublicQuestion | null>(
    null,
  );
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const pending = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  const harborStart = useRef<HTMLButtonElement>(null);
  const liveBattle = useRef(battle);
  liveBattle.current = battle;
  const livePlayer = useRef(id);
  livePlayer.current = id;
  const basePlayer = PLAYERS.find((p) => p.id === id);
  const player = basePlayer && cloud.state?.playerId && cloud.state.displayName
    ? { ...basePlayer, name: cloud.state.displayName } : basePlayer,
    p = id ? family?.profiles[id] : null,
    grade = player?.grade ?? 4;
  // Grade slots are not child identities: account reports must use the signed-in child.
  const mascot = companionMascot(cloud.state?.username, cloud.state?.playerId, id);
  const accountEnglishName = ({ jay: "Jay", alan: "Alan", quintus: "Quintus", jimmy: "Jimmy", brownie: "Brownie", alston: "Alston", olivia: "Olivia", sunny: "Sunny", feifei: "Feifei" } as Record<string,string>)[cloud.state?.username.toLowerCase() ?? ""] ?? cloud.state?.username ?? "";
  const reportPlayers = cloud.state?.playerId
    ? PLAYERS.filter(child=>child.id===cloud.state?.playerId).map(child=>({...child,name:`${cloud.state?.displayName || child.name}（${accountEnglishName}）`}))
    : PLAYERS.map(child=>child.id==="quintus"?{...child,name:"林沐澤（Quintus）"}:child);
  const readingGrade =
    page === "battle" && battle?.mode === "duo" && (battlePlayback?.before.turn ?? battle.turn) === 1
      ? PLAYERS.find((p) => p.id === opponent)!.grade
      : grade;
  const run = p?.run,
    q = id ? cloud.state?.questions[id] : null,
    pet = petById(p?.equipped ?? DEFAULT_CHARACTER_ID)!;
  const figure = useQuestionFigure(q), battleFigure = useQuestionFigure(battleQuestion);
  const [resultPresentation, setResultPresentation] = useState<{ id: string; live: boolean } | null>(null);
  const resultReady = !!run && run.status !== "active" && resultPresentation?.id === run.id;
  const victoryReady = run?.status === "won" && resultReady;
  const [captureFocus,setCaptureFocus]=useState<{source:CaptureSource;runId:string}|null>(null);
  const [captureDismissed,setCaptureDismissed]=useState("");
  const departure=p?harborDeparture(p):null;
  const pendingCapture=departure?.kind==="capture"?{source:departure.source,runId:departure.runId}:null;
  useEffect(()=>{
    if(pendingCapture&&captureDismissed!==pendingCapture.runId&&(page!=="learn"||resultReady))setCaptureFocus(pendingCapture);
  },[pendingCapture?.runId,captureDismissed,page,resultReady]);
  const focusedCaptureRun=captureFocus?.source==="voyage"?p?.run:p?.mathIsland?.run;
  const focusedCapture=captureFocus&&focusedCaptureRun?.id===captureFocus.runId?focusedCaptureRun.capture:undefined;

  const consumeOutcomeAnimation = () => setResultPresentation(old => old?.live ? { ...old, live: false } : old);
  const restartCourseAvailable = !!run && COURSES[grade].some(c => c.id === run.course);
  const arenaCombatActive = page === "battle" && !!battle && (battle.winner === null || !!battlePlayback);
  const quizCombatActive = page === "learn" && run?.status === "active" && !!q;
  const quizPreparing = page === "learn" && run?.status === "active" && !!run.challenge && !run.challenge.clock && !run.settled;
  const quizFocused = quizCombatActive && (!run?.challenge || !!run.challenge.clock || !!run.settled);
  useEffect(() => {
    setQuestionExpanded(false);
    questionReading.current?.scrollTo({ top: 0 });
  }, [run?.id, run?.index]);
  useEffect(() => {
    const pane = questionReading.current;
    const feedback = pane?.querySelector<HTMLElement>(run?.settled ? ".answer-explanation" : ".hint-box");
    if (pane && feedback) pane.scrollTo({ top: pane.scrollTop + feedback.getBoundingClientRect().top - pane.getBoundingClientRect().top });
  }, [run?.settled, hint]);
  useEffect(() => {
    if (!quizFocused) return;
    const root = document.documentElement;
    const main = questionReading.current?.closest<HTMLElement>(".family-main");
    const controls = main ? Array.from(main.querySelectorAll<HTMLElement>(".challenge-top, .challenge-timer, .quiz-question-toolbar, .quiz-answer-bank, .quiz-turn-actions")) : [];
    const update = () => {
      root.style.setProperty("--quiz-viewport-height", `${window.innerHeight}px`);
      if (!main) return;
      // Leave readable space for a long prompt even when answer labels wrap.
      // Short screens may scroll the question bank; next stays outside that pane.
      const reserved = controls.reduce((height, element) => height + (getComputedStyle(element).position === "absolute" ? 0 : element.getBoundingClientRect().height), 0) + 32;
      const available = main.clientHeight;
      const compact = available < 560;
      const preferred = available * (compact ? .38 : window.innerWidth > 600 && available > 900 ? .4 : .32);
      const readingSpace = compact ? 80 : 100;
      const minimumStage = compact ? 78 : 116;
      const height = questionExpanded ? minimumStage : Math.max(minimumStage, Math.min(preferred, available - reserved - readingSpace));
      main.style.setProperty("--quiz-stage-height", `${Math.round(height)}px`);
    };
    // Batch measurements outside ResizeObserver delivery: changing the arena also
    // resizes the observed reading controls, especially during iPad rotation.
    let frame: number | undefined;
    const scheduleUpdate = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => { frame = undefined; update(); });
    };
    const observer = new ResizeObserver(scheduleUpdate);
    // A friend-battle banner can appear or expire while the question stays the same.
    if (main) observer.observe(main);
    controls.forEach(element => observer.observe(element));
    update();
    window.addEventListener("resize", scheduleUpdate);
    return () => { observer.disconnect(); window.removeEventListener("resize", scheduleUpdate); if (frame !== undefined) cancelAnimationFrame(frame); root.style.removeProperty("--quiz-viewport-height"); main?.style.removeProperty("--quiz-stage-height"); };
  }, [quizFocused, questionExpanded, run?.id, run?.index]);
  const friendsPresence = usePresence(id, cloud.state?.csrf,
    social.state?.room?.status === "active" || arenaCombatActive ? "battle"
      : page === "battle" ? "preparing"
      : page === "learn" || page === "island" || page === "review" ? "learning"
      : page === "collection" || page === "bestiary" ? "collection"
      : page === "territory" || page === "room" ? "territory"
      : page === "lottery" ? "lottery" : page === "trade" ? "trade" : page === "leaderboard" ? "leaderboard" : "home");
  const fighting = !!id && (arenaCombatActive || quizCombatActive || social.state?.room?.status === "active");
  useEffect(() => {
    if (!islandChoice) return;
    const decision = islandEntry(islandChoice.target, run, p?.mathIsland?.run);
    if (islandChoice.runId !== run?.id || islandChoice.mathId !== p?.mathIsland?.run?.id || !["confirm", "reward", "math-result"].includes(decision)) setIslandChoice(null);
  }, [islandChoice, run?.id, run?.status, run?.reward, p?.mathIsland?.run?.id, p?.mathIsland?.run?.completed, p?.mathIsland?.run?.answers.length]);
  const choosingCompanions = !!id && (page === "collection" || (page === "battle" && !battle));
  const musicSource = page === "learn" || (page === "battle" && battle)
    ? BATTLE_MUSIC
    : page === "collection" || page === "battle" ? COMPANION_MUSIC : HOME_MUSIC;
  const music = useHomeMusic(!id || page === "home" || page === "territory" || choosingCompanions || fighting, musicSource);
  const musicControl = <button type="button" className="home-music-toggle" data-music-control
    aria-label={music.playing ? "暫停背景音樂" : "播放背景音樂"}
    aria-pressed={music.playing} onClick={music.toggle}>
    {music.playing ? "Ⅱ 暫停音樂" : music.failed ? "♫ 重試音樂" : "♫ 播放音樂"}
  </button>;
  const label = (text: string, _zy?: string) =>
    readingGrade === 2 ? <AutoRuby text={text} /> : text;
  const say = (text: string) => {
    if (voice && allowsReadAloud(readingGrade)) speak(text);
  };
  async function change<T = boolean>(
    command: Record<string, unknown>,
  ): Promise<T | undefined> {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const result = await cloud.mutate(command);
      setNotice("");
      return result as T;
    } catch (e) {
      const message = (e as Error).message;
      if (command.type === 'start' && /^這個科目(?:的題目已全部答對|還有)/.test(message)) {
        setReviewOffer(command.course as Course);
        setCoursePicker(false);
        setNotice('這個範圍的新題已不足一組，可以接著複習學過的題目。');
      } else setNotice(message);
      return undefined;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    setHeard("");
    setHint(false);
    setFeedback("");
    setMood("idle");
    stopVoice();
  }, [id, run?.id, run?.index]);
  useEffect(() => {
    stopVoice();
    heading.current?.focus({ preventScroll: true });
    resetFamilyScroll();
    if (id && voice && allowsReadAloud(readingGrade)) speak(guides[page]);
    return () => stopVoice();
  }, [page, id, readingGrade, voice]);
  useEffect(() => {
    if (page === "learn" && run) {
      if (run.status !== "active") return;
      heading.current?.focus({ preventScroll: true });
      resetFamilyScroll();
    }
  }, [page, run?.id, run?.index, run?.status, battleReducedMotion]);

  useEffect(() => {
    if (page !== "learn" || !resultReady) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.closest(".result-panel")?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [page, resultReady, run?.id]);

  useEffect(() => {
    if (
      voice &&
      grade === 1 &&
      page === "trade" &&
      family?.pendingTrade?.to === id
    ) {
      const t = family.pendingTrade;
      speak(
        `${tradeCardSpeech(t.receive, family.profiles[t.to].owned[t.receive] ?? 0)}收到${petById(t.give)!.name}一張。按打勾確認，按叉叉取消。`,
        setNotice,
      );
    }
  }, [page, id, family?.pendingTrade?.id]);
  useEffect(() => {
    if (!battle) {
      presentationNonce.current++;
      setBattlePlayback(null);
      battleLock.current = false;
      setHandoff(false);
    }
  }, [battle]);
  useEffect(() => {
    if (!battlePlayback) return;
    const { nonce, after } = battlePlayback;
    const finish = () => {
      if (presentationNonce.current !== nonce || liveBattle.current !== after) return;
      setBattlePlayback(null);
      battleLock.current = false;
      if (after.mode === "duo" && after.winner === null) setHandoff(true);
    };
    // Leaving the stage completes only the visual timeline. The move has already
    // been committed; an off-page timer must never move the next player again.
    if (page !== "battle" || !id) { finish(); return; }
    const timing = battlePresentationTiming(battlePlayback.event, battleReducedMotion);
    const timers = (["flight", "impact", "settle"] as const).map(phase => setTimeout(() => {
      if (presentationNonce.current === nonce && liveBattle.current === after)
        setBattlePlayback(current => current?.nonce === nonce ? advanceBattlePhase(current, phase) : current);
    }, Math.max(0, timing[phase] - (performance.now() - (battlePlayback.startedAt ?? performance.now())))));
    timers.push(setTimeout(finish, Math.max(0, timing.end - (performance.now() - (battlePlayback.startedAt ?? performance.now())))));
    return () => timers.forEach(clearTimeout);
  }, [battlePlayback?.nonce, battleReducedMotion, page, id, battle]);
  useEffect(() => {
    if (
      !battle ||
      page !== "battle" ||
      battle.winner !== null ||
      battle.mode !== "cpu" ||
      battle.turn !== 1 ||
      battleEffect ||
      battle.quiz ||
      handoff
    )
      return;
    const timer = setTimeout(
      () => {
        if (battleLock.current || liveBattle.current !== battle) return;
        presentBattle(battleMove(battle, cpuMove(battle)));
      },
      battleReducedMotion ? 200 : 650,
    );
    return () => clearTimeout(timer);
  }, [battle, battleEffect, page, handoff, battleReducedMotion]);
  useEffect(() => {
    setBattleHeard("");
    setBattleAudioError("");
    if (battle?.quiz?.question) stopVoice();
    battleQuizLock.current = false;
  }, [battle?.quiz?.question]);
  function presentBattle(next: Battle) {
    const before = liveBattle.current;
    if (!before || !next.event) { setBattle(next); return; }
    battleLock.current = true;
    const nonce = ++presentationNonce.current;
    liveBattle.current = next;
    setBattle(next);
    setBattlePlayback({ before, after: next, event: next.event, phase: "windup", nonce, startedAt: performance.now() });
    battleStage.current?.scrollIntoView({
      block: "center",
      behavior: "instant",
    });
    say(next.event?.message ?? next.log[0]);
  }
  async function openBattleQuestion() {
    if (
      !battle ||
      !id ||
      battleLock.current ||
      battleQuizLock.current ||
      handoff ||
      !canBattleQuiz(battle)
    )
      return;
    battleQuizLock.current = true;
    const source = battle,
      owner = id;
    const course =
      grade === 1
        ? "english"
        : grade === 2
          ? battle.quizUsed.length % 2
            ? "math"
            : "words"
          : COURSES[grade][battle.quizUsed.length % COURSES[grade].length].id;
    const allocation = await change<{question: PublicQuestion; token: string; review: boolean}>({type: "battle-start", player: owner, course, used: source.quizUsed});
    if (liveBattle.current !== source || livePlayer.current !== owner) {
      battleQuizLock.current = false;
      return;
    }
    if (!allocation) {
      battleQuizLock.current = false;
      return;
    }
    try {
      const question = allocation.question;
      setBattleQuestion(question);
      const next = beginBattleQuiz(source, question);
      next.quiz!.learningToken = allocation.token;
      next.quiz!.review = allocation.review;
      setBattle(next);
    } catch (e) {
      battleQuizLock.current = false;
      setNotice(String(e));
    }
  }
  async function answerBattleQuestion(choice: number) {
    if (
      !battle ||
      !id ||
      !battleQuestion || !battleFigure.ready ||
      battleQuizLock.current ||
      (battleQuestion.audio && battleHeard !== battleQuestion.id)
    )
      return;
    battleQuizLock.current = true;
    const source = battle,
      owner = id;
    try {
      const token = source.quiz?.learningToken;
      if (!token) throw Error("助戰題目已更新，請重新出發");
      const question = await change<PublicQuestion>({ type: "battle-answer", player: owner, token, question: battleQuestion.id, choice });
      if (!question) { battleQuizLock.current = false; return; }
      if (liveBattle.current !== source || livePlayer.current !== owner) { battleQuizLock.current = false; return; }
      setBattleQuestion(question);
      const next = answerBattleQuiz(source, question, choice);
      setBattle(next);
      say(
        next.quiz!.correct
          ? `答對了！${BATTLE_BUFFS[petSkill(next.teams[0][next.active[0]].pet)].description}按箭頭回到對戰。`
          : `這次沒有加成，不扣體力。${question.explanation}按箭頭繼續戰鬥。`,
      );
    } catch (e) {
      battleQuizLock.current = false;
      setNotice(String(e));
    }
  }
  function dismissBattleQuestion() {
    stopVoice();
    if (!battle) return;
    const next = closeBattleQuiz(battle);
    if (battle.quiz?.correct) presentBattle(next);
    else setBattle(next);
  }
  function navigate(next: Page) {
    if (page === "room" && next !== "room" && homeDirty && !window.confirm("房間還有未儲存的佈置，要放棄這次變更並離開嗎？")) return;
    setTerritoryGoalRequest(null);
    setCoursePicker(false);
    setIslandChoice(null);
    setPage(next);
    setNotice("");
  }
  function openBuildingGoal() {
    navigate("territory");
    setTerritoryGoalRequest({ goal: p?.learningRewards?.goal ?? null, nonce: ++territoryGoalSequence.current });
  }
  function choose(next: PlayerId) {
    if (switchingIsland.current) return;
    if (page === "room" && homeDirty && !window.confirm("房間還有未儲存的佈置，要放棄這次變更並切換玩家嗎？")) return;
    if (cloud.state?.playerId && next !== cloud.state.playerId) return;
    stopVoice();
    setId(next);
    setChooser(false);
    setIslandChoice(null);
    setCoursePicker(false);
    setPage("home");
    setTerritoryGoalRequest(null);
    setGive("");
    setReceive("");
    setTeam([]);
    setOtherTeam([]);
    setBattle(null);
    setTradeTo(next === "feifei" ? "qingqing" : "feifei");
    setOpponent(next === "feifei" ? "qingqing" : "feifei");

  }
  async function begin(course: Course, practice = false) {
    if (!id || busy || pending.current || !cloud.online || unfinishedJourney(run)) return;
    if (!COURSES[grade].some(c => c.id === course)) { navigate("home"); return; }
    if (page === "room" && homeDirty && !window.confirm("房間還有未儲存的佈置，要放棄這次變更並去學習嗎？")) return;
    const ok = await change({ type: "start", player: id, course, practice });
    if (ok) {
      setCoursePicker(false);
      setReviewOffer(null);
      setHomeDirty(false);
      setTerritoryGoalRequest(null);
      setPage("learn");
    }
  }
  async function beginReview(mode: StudySession['mode'], course?: Course) {
    if (!id || busy || pending.current || !cloud.online) return;
    if (await change({ type: "review-start", player: id, mode, ...(course ? { course } : {}) })) { setReviewOffer(null); setCoursePicker(false); navigate("review"); }
  }
  function selectIsland(target: IslandDestination) {
    if (!id || busy || pending.current || !cloud.online) return;
    const entry = islandEntry(target, run, p?.mathIsland?.run);
    if (entry === "resume") { navigate("learn"); return; }
    if (entry === "math-resume" || entry === "math-open") { navigate("island"); return; }
    if (entry === "start") { void begin(target as Course); return; }
    // Replace the picker with one guarded dialog; keep it open on start errors.
    setCoursePicker(false);
    setIslandChoice({ target, runId: run?.id, mathId: p?.mathIsland?.run?.id });
  }
  async function switchIsland() {
    if (!islandChoice || !id || busy || pending.current || switchingIsland.current || !cloud.online) return;
    if (islandChoice.runId !== run?.id || islandChoice.mathId !== p?.mathIsland?.run?.id) {
      setIslandChoice(null); setNotice("挑戰已更新，請重新選擇島嶼。"); return;
    }
    if (islandEntry(islandChoice.target, run, p?.mathIsland?.run) !== "confirm") {
      setIslandChoice(null); setNotice("挑戰已更新，請重新選擇島嶼。"); return;
    }
    const target = islandChoice.target;
    switchingIsland.current = true;
    pending.current = true;
    setBusy(true);
    try {
      // Each mutation uses the latest cloud revision. A rejected quit never starts a new run.
      await cloud.mutate(run?.status === "active" || (run?.status === "failed" && run.remediation?.receipt === null)
        ? { type: run.status === "failed" ? "skip-remediation" : "quit", player: id, runId: run.id }
        : { type: "island-quit", player: id, runId: p!.mathIsland!.run!.id });
      if (target !== "island") await cloud.mutate({ type: "start", player: id, course: target, practice: false });
      navigate(target === "island" ? "island" : "learn");
    } catch (e) {
      setIslandChoice(null);
      setNotice((e as Error).message);
    } finally {
      pending.current = false;
      switchingIsland.current = false;
      setBusy(false);
    }
  }
  function dismissCapture() {
    stopVoice();setCaptureDismissed(captureFocus?.runId ?? "");setCaptureFocus(null);
    requestAnimationFrame(()=>{
      // A non-home resume button is replaced while the modal is open.
      if(document.activeElement instanceof HTMLElement && document.activeElement!==document.body)return;
      const target=page === "home" ? harborStart.current : document.querySelector<HTMLButtonElement>(".capture-resume");
      if(target&&!target.disabled)target.focus({preventScroll:true});
      else heading.current?.focus({preventScroll:true});
    });
  }
  function requestLearning() {
    if (!id || busy || pending.current || !cloud.online || !departure) return;
    if (departure.kind === "capture") {
      // WebKit pointer clicks do not reliably focus buttons before the dialog mounts.
      const active=document.activeElement;
      const fallback=page === "home" ? harborStart.current : document.querySelector<HTMLButtonElement>(".capture-resume");
      (active instanceof HTMLElement && active !== document.body ? active : fallback)?.focus({preventScroll:true});
      setCaptureFocus({source:departure.source,runId:departure.runId});
    } else if (departure.kind === "island") navigate("island");
    else if (departure.kind === "journey") navigate("learn");
    else { setNotice(""); setCoursePicker(true); }
  }
  function listen() {
    if (!q || !run) return;
    const key = `${run.id}:${run.index}`;
    if (q.audio) {
      playRecording(q.audio, q.end, () => setHeard(key), setNotice);
    } else {
      speak(
        questionSpeech({ ...q, grade }),
        setNotice,
        q.course === "english" ? "en-US" : "zh-TW",
      );
    }
  }
  async function answer(choice: number) {
    if (!id || !run || !q || !figure.ready || run.settled || run.status !== "active") return;
    const correct = await change({
      type: "answer",
      player: id,
      runId: run.id,
      index: run.index,
      choice,
    });
    if (correct === undefined) return;
    setMood(correct ? "happy" : "encourage");
    const errors = mistakeCount(run) + Number(!correct);
    const message = errors >= MAX_MISTAKES
      ? "這場先休息，錯題一起補練。"
      : run.index === run.questions.length - 1
        ? ((run.answers?.filter(Boolean).length??0)+Number(correct)>=correctNeeded(run.challenge)?"六題完成，挑戰成功！查看這次的獎勵。":"六題完成，還沒達到這隻怪物的答對要求。答對的星幣保留了。")
        : correct
          ? (petById(run.companion)?.encouragement ?? "答對了！一起往下一站。")
          : `這題先記下來，戰後一起補練。`;
    setFeedback(message);
    say(message);
  }
  async function doSkill() {
    if (!id) return;
    const saved = await change({
      type: "skill",
      player: id,
      runId: run!.id,
      index: run!.index,
    });
    if (!saved) return;
    setHint(true);
    setMood("skill");
    say(q?.hint ?? "夥伴正在陪你思考");
  }
  function battleAction(move: BattleMove) {
    if (
      !battle ||
      battleLock.current ||
      battle.quiz ||
      handoff ||
      (battle.mode === "cpu" && battle.turn === 1)
    )
      return;
    try {
      const next = battleMove(battle, move);
      presentBattle(next);
    } catch (e) {
      setNotice(String(e));
    }
  }
  function switchPlayer() {
    if (cloud.state?.playerId || switchingIsland.current) return;
    if (battle && battle.winner === null) {
      setLeave(() => () => {
        setBattle(null);
        setChooser(true);
      });
      return;
    }
    setChooser(true);
    say("選擇今天的航海員，正在進行的學習會保留。");
  }
  if (!family || !cloud.state)
    return (
      <AccountGate
        loading={cloud.loading}
        error={cloud.error}
        onLogin={(next) => {
          setId(null);
          cloud.receive(next);
        }}
      />
    );
  const cloudStatus = (
    <div
      className={`cloud-status ${cloud.online ? "" : "offline"}`}
      role="status"
    >
      <span>
        {cloud.state.username} · {cloud.status}
      </span>
      {!cloud.online && (
        <button onClick={() => void cloud.refresh()}>確認同步</button>
      )}
      <button
        aria-label="登出"
        disabled={!cloud.online || busy}
        onClick={async () => {
          if (page === "room" && homeDirty && !window.confirm("房間還有未儲存的佈置，要放棄這次變更並登出嗎？")) return;
          try {
            await cloud.logout();
            setId(null);
            setBattle(null);
            stopVoice();
          } catch (e) {
            setNotice((e as Error).message);
          }
        }}
      >
        登出
      </button>
    </div>
  );
  const legacyTransfer = !cloud.state.playerId && (
    <LegacyTransfer
      canMigrate={cloud.state.canMigrate}
      legacy={cloud.state.legacy}
      busy={busy}
      onTransfer={(snapshot) => cloud.mutate({}, snapshot)}
    />
  );
  const profileChoices = (
    <div className="profile-grid">
      {PLAYERS.map((w) => (
        <button
          className={`profile-card player-${w.id}`}
          key={w.id}
          onClick={() => choose(w.id)}
          aria-label={`選擇${w.name}，${w.grade}年級`}
        >
          <span
            className={`profile-face ${playerPhotos[w.id] ? "has-photo" : ""}`}
          >
            {playerPhotos[w.id] ? (
              <>
                <img
                  className="player-photo"
                  src={playerPhotos[w.id]}
                  alt={`${w.name}的照片`}
                  width="176"
                  height="220"
                  decoding="async"
                />
                <span className="portrait-sparkles" aria-hidden="true">
                  ✦
                </span>
                <span className="portrait-badge" aria-hidden="true">
                  {w.icon}
                </span>
              </>
            ) : (
              <span className="profile-symbol">{w.icon}</span>
            )}
          </span>
          <strong>{w.name}</strong>
          <span>{w.grade} 年級</span>
          <small>
            {w.grade === 1
              ? "👂 ＋ 🖼️"
              : w.grade === 2
                ? "中文閱讀與語音"
                : w.grade === 5 ? "五年級五科暖身" : w.grade === 6 ? "六年級五科挑戰" : "五科航海挑戰"}
          </small>
          <span className="profile-go">➜</span>
        </button>
      ))}
    </div>
  );
  if (!id || !p || !player)
    return annotateTree(
      <div
        className={`family-app welcome ${reduceMotion ? "reduce-motion" : ""}`}
      >
        <div className="welcome-brand"><BrandLogo variant="welcome" /></div>
        <main className="welcome-shell">
          <h1>今天，誰要出發？</h1>
          <p>一片星海，歡迎每位航海員。每個人都有自己的航線。</p>
          <div className="welcome-controls">
            {musicControl}
            <ReadAloud grade={grade}><button data-read-aloud
              className="voice-button"
              onClick={() =>
                speak(
                  "歡迎來到星潮學院。指南針是 Quintus，海豚是斐斐，貝殼是晴晴，花朵是荳荳。點自己的圖案，我們一起出發！",
                  setNotice,
                )
              }
              aria-label="聽選擇玩家的說明"
            >
              🔊
            </button></ReadAloud>
            <button
              className="portrait-motion-toggle"
              aria-pressed={reduceMotion}
              disabled={SAFE_MODE}
              onClick={() => setReduceMotion(!reduceMotion)}
            >
              {SAFE_MODE ? "輕量模式已暫停動態" : reduceMotion ? "▶ 播放動態" : "Ⅱ 暫停動態"}
            </button>
          </div>
          {cloudStatus}
          {legacyTransfer}
          {profileChoices}
          <p className="fine-print">
            分數與收藏即時儲存至雲端，換裝置登入同一帳號就能繼續。
          </p>
          {notice && <p role="alert">{notice}</p>}
        </main>
        <HeroVideoCarousel reduceMotion={reduceMotion} entrance />
      </div>, 4
    );
  if (needsOnboarding(p)) return (
    <ReadingContext.Provider value={{ grade, voice: voice && allowsReadAloud(grade) }}>
      <div className={`family-app grade-${grade}`}>
        {cloudStatus}
        <StarterOnboarding key={`${cloud.state.csrf}:${id}`} player={id} csrf={cloud.state.csrf} name={player.name} onboarding={p.onboarding!} grade={grade}
          online={cloud.online} busy={busy} reduced={battleReducedMotion} notice={notice}
          onDraw={() => change<string>({ type: "starter-draw", player: id })}
          onConfirm={() => change<boolean>({ type: "starter-confirm", player: id })}
          onListen={text => speak(text, setNotice)}
          onBack={cloud.state.playerId ? undefined : () => setId(null)}
          transfer={legacyTransfer} musicControl={musicControl}
          motionControl={<button className="portrait-motion-toggle" aria-pressed={battleReducedMotion} disabled={SAFE_MODE || systemReducedMotion} onClick={() => setReduceMotion(!reduceMotion)}>{SAFE_MODE ? '輕量模式已暫停動態' : systemReducedMotion ? '裝置已減少動態' : reduceMotion ? '▶ 播放動態' : 'Ⅱ 暫停動態'}</button>} />
      </div>
    </ReadingContext.Provider>
  );
  const currentSkill = { ...SKILLS[petSkill(run?.companion ?? p.equipped)], name: petSkillName(run?.companion ?? p.equipped) },
    today = cloud.state.day;
  const filtered = ROSTER.filter(
    (c) =>
      (!ownedOnly || p.owned[c.id]) &&
      (!newSeriesOnly || c.series === "星海新朋友") &&
      (!duplicatesOnly || p.owned[c.id] > 1) &&
      (rarity === "all" || c.rarity === rarity) &&
      (elementFilter === "all" || c.element === elementFilter) &&
      (!query ||
        `${c.name} ${c.nameEn} ${c.element}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const tradable = (who: PlayerId) =>
    ROSTER.filter(
      (c) => c.id !== initialCompanion(family.profiles[who]) && !needsOnboarding(family.profiles[who]) && family.profiles[who].owned[c.id],
    );
  const owned = (who: PlayerId) =>
    ROSTER.filter((c) => family.profiles[who].owned[c.id]);
  const stats = collectionStats(p);
  const islandPet = petById(p.mathIsland?.run && !p.mathIsland.run.completed ? p.mathIsland.run.companion : p.equipped) ?? pet;
  const suggestions = tradeSuggestions(family, id);
  const pickedPet = petDetail ? petById(petDetail) : undefined;
  const harborAction = departure!.action;
  const harborHint = departure!.hint;
  const companionPageQuiet = !!quizPreparing || page === "leaderboard" || page === "battle" || companionQuiet(page, !!quizCombatActive, arenaCombatActive, false);
  const companionOverlay = !!(viewCollection || chooser || coursePicker || pickedPet || leave || handoff || islandChoice);

  return (
    <ReadingContext.Provider value={{ grade: readingGrade, voice: voice && allowsReadAloud(readingGrade) }}>
      {annotateTree(
        <div
          className={`family-app ${quizFocused ? "quiz-focused" : ""} ${quizPreparing ? "quiz-preparing" : ""} ${questionExpanded ? "question-expanded" : ""} grade-${readingGrade} ${page === "learn" && run ? `quiz-active ${run.status !== "active" ? "quiz-complete" : ""} ${resultReady ? `quiz-result-ready ${run.status === "failed" ? "quiz-result-failed" : ""}` : ""}` : ""} ${reduceMotion ? "reduce-motion" : ""} ${contrast ? "high-contrast" : ""}`}
        >
          <a className="skip-link" href={page === "home" ? "#harbor-departure" : "#family-main"}>
            跳到主要內容
          </a>
          {cloudStatus}
          {focusedCapture?.version===3&&captureFocus&&<CaptureChallenge capture={focusedCapture}
            question={cloud.state.captureQuestions?.[captureFocus.runId]} busy={busy} online={cloud.online} reduced={reduceMotion}
            onClose={dismissCapture}
            onAnswer={(index,choice)=>change({type:"capture-answer",player:id,source:captureFocus.source,runId:captureFocus.runId,index,choice})}
            onSkip={()=>change({type:"capture-skip",player:id,source:captureFocus.source,runId:captureFocus.runId})}
            onListen={(question,done)=>{if(question.audio)playRecording(question.audio,question.end,done,setNotice);else speak(questionSpeech({...question,grade}),setNotice,question.course==="english"?"en-US":"zh-TW");}} />}
          <header className="family-header">
            <button
              className="family-brand"
              onClick={() => navigate("home")}
              aria-label="回到星潮學院港口"
            >
              <BrandLogo />
            </button>
            <button
              className="player-chip"
              onClick={switchPlayer}
              aria-label={cloud.state.playerId ? "目前登入的航海員" : "切換玩家"}
              disabled={Boolean(cloud.state.playerId)}
            >
              <PlayerAvatar id={player.id} />
              <b>
                {player.name}
                <small>{grade} 年級</small>
              </b>
              {!cloud.state.playerId && <span>⌄</span>}
            </button>
            <FriendsPresence key={player.id} player={player.id} snapshot={friendsPresence} profile={p} social={social} onCollection={setViewCollection} />
            <div className="wallet">
              <span title="可用星幣">
                🟡 <b>{p.coins}</b>
              </span>
              <span title="星願券">
                🎟️ <b>{p.tickets}</b>
              </span>
            </div>
            <ReadAloud grade={readingGrade}><button data-read-aloud
              className="voice-button"
              aria-label="聽這頁說明"
              onClick={() => speak(guides[page], setNotice)}
            >
              🔊
            </button></ReadAloud>
          </header>
          {page === "home" && <section id="harbor-departure" className="harbor-departure" aria-labelledby="harbor-departure-title" tabIndex={-1}>
            <div className="harbor-departure-copy">
              <h1 id="harbor-departure-title" tabIndex={-1} ref={heading}>一起去冒險</h1>
              <p>{!cloud.online ? "目前離線，連線後就能開始學習。" : harborHint}</p>
            </div>
            <div className="harbor-departure-actions">
              <button type="button" className="f-primary harbor-departure-start" ref={harborStart} aria-label={harborAction} disabled={!cloud.online || busy} onClick={e=>{e.currentTarget.focus({preventScroll:true});requestLearning();}}>
                <span aria-hidden="true">{departure!.symbol}</span>
                <span data-learning-content>{readingGrade === 2 ? <Ruby text={departure!.grade2Text} zy={departure!.grade2Reading} /> : harborAction}</span>
              </button>
              <ReadAloud grade={readingGrade}><button type="button" className="harbor-departure-listen" aria-label="聽出發說明" data-read-aloud onClick={() => speak(!cloud.online ? "目前離線，連線後就能開始學習。" : `${harborHint}按${harborAction}。`, setNotice)}>🔊</button></ReadAloud>
            </div>
          </section>}
          <OnlineBattle key={player.id} controller={social} profile={p} reduced={battleReducedMotion} />
          <ResourceRibbon profile={p} online={cloud.online} onVisit={() => navigate("territory")} />
          <nav className="family-nav" aria-label="主要導覽">
            {navs.map((n) => (
              <button
                key={n.page}
                className={page === n.page || (page === "bestiary" && n.page === "collection") ? "selected" : ""}
                aria-current={page === n.page || (page === "bestiary" && n.page === "collection") ? "page" : undefined}
                onClick={() => navigate(n.page)}
              >
                <NavIcon name={n.page} />
                {label(n.name, n.zy)}
              </button>
            ))}
          </nav>
          <TideglowCompanion mascot={mascot} key={`${cloud.state.csrf}:${id}`} player={id} csrf={cloud.state.csrf} name={player.name} grade={grade} facts={guideFacts(p)} petName={petById(p.equipped)?.name}
            reduced={battleReducedMotion} online={cloud.online} onReady={requestLearning} page={page} completed={page === 'learn' && !!run && run.status !== 'active'}
            courseName={run ? COURSES[grade].find(c => c.id === run.course)?.name : undefined}
            suppressed={companionPageQuiet || companionOverlay}
            openRequest={companionOpenRequest} onOpenChange={setCompanionOpen} />
          <main id="family-main" className="family-main">
            {page!=="home"&&pendingCapture&&!focusedCapture&&<button className="capture-resume" disabled={busy||!cloud.online} onClick={e=>{e.currentTarget.focus({preventScroll:true});requestLearning();}}>繼續降服挑戰 · 三題全對就能加入</button>}
            {notice && (
              <div className="notice" role="alert">
                <span className="notice-message">{notice}</span>
                <button onClick={() => setNotice("")} aria-label="關閉通知">
                  ✕
                </button>
              </div>
            )}
            {reviewOffer && !(page === "learn" && victoryReady && reviewOffer === run?.course) && <section className="f-panel"><h2>學過的題目，接著練</h2><p>原有精熟與獎勵都保留；複習不重複發獎勵。</p><button disabled={busy || !cloud.online} onClick={() => void beginReview('all', reviewOffer)}>開始複習</button><button onClick={() => { setReviewOffer(null); navigate('home'); }}>換個科目</button></section>}
            {page === "territory" && <details className="home-building-details"><summary>建築目標與材料明細</summary><LearningBuildPanel key={id} profile={p} busy={busy} online={cloud.online} onGoal={goal=>change({type:"learning-goal",player:id,goal})} onVisit={openBuildingGoal} /></details>}
            {page === "territory" && <TerritoryPage key={id} onLoadBack={()=>navigate("home")} goalRequest={territoryGoalRequest} profile={p} reduced={battleReducedMotion} busy={busy} online={cloud.online} serverNow={cloud.state.serverNow} musicControl={musicControl} onRoom={()=>navigate("room")} onTrain={requestLearning} onAction={command => change({ ...command, player: id })} />}
            {page === "room" && <RoomEditor key={id} onLoadBack={()=>navigate("home")} profile={p} reduced={battleReducedMotion} busy={busy} online={cloud.online} onDirtyChange={setHomeDirty} onBack={()=>navigate("territory")} onTrain={requestLearning} onAction={command=>change({...command,player:id})}/>}
            {page === "home" && (
              <>
                <section className="family-hero">
                  <HeroVideoCarousel reduceMotion={reduceMotion} suspended={islandMapActive || companionOpen} />
                  <div className="family-hero-copy">
                    {musicControl}
                    <span className="voyager-badge">
                      <PlayerAvatar id={player.id} /> {player.name} 的航海誌
                    </span>
                    <h2>
                      {grade === 1 ? (
                        <>
                          👂 🧩 ✨<br />
                          一起去冒險
                        </>
                      ) : (
                        <>
                          知識，讓我們
                          <br />
                          航向更遠的星海。
                        </>
                      )}
                    </h2>
                    <p>
                      {grade === 1 ? (
                        "點下方的島嶼，選喜歡的科目出發。"
                      ) : grade === 2 ? (
                        <AutoRuby text="和夥伴一起學習" />
                      ) : (
                        "完成六題挑戰，收集星願，和你的夥伴一起成長。"
                      )}
                    </p>
                    {run && run.status!=='active' && run.reward!=='pending' && <button onClick={()=>navigate('learn')}>🎁 {label('查看上次挑戰')}</button>}
                  </div>
                </section>
                <CourseSelection profile={p} onIsland={() => selectIsland("island")} islandRun={p.mathIsland?.run} grade={grade} run={run} online={cloud.online} busy={busy}
                  reduced={battleReducedMotion} motionGranted={islandMapActive} motionSuspended={companionOpen} onMotionActivity={setIslandMapActive}
                  onStart={selectIsland} onResume={() => navigate("learn")}
                  onSpeak={text => speak(text, () => setNotice("暫時無法朗讀航線說明，請依照圖案和文字操作。"))} />
                <button className="tide-harbor-entry" onClick={e => { e.currentTarget.focus({ preventScroll: true }); setCompanionOpenRequest(n => n + 1); }}><img src={companionPortrait(mascot)} alt="" width="72" height="72" /><span><strong>{companionName(mascot)}陪你一起學</strong>摸摸、餵點心，或聊聊今天的冒險</span><b aria-hidden="true">✦</b></button>
                <StudyEntry summary={cloud.state.studySummaries?.[id]} session={p.learning.study?.session} disabled={busy || !cloud.online || run?.status === 'active' || !!(p.mathIsland?.run && !p.mathIsland.run.completed)} onStart={mode => void beginReview(mode)} onFinish={() => { void change({ type: "review-finish", player: id, sessionId: p.learning.study?.session?.id }); }} />
                <TrainingPanel key={id} profile={p} day={cloud.state.day} online={cloud.online} busy={busy}
                  onSelect={pet => change<boolean>({ type: "equip", player: id, pet })}
                  onTrain={requestLearning}><HomeScene profile={p} onTerritory={()=>navigate("territory")} onRoom={()=>navigate("room")} reduced={battleReducedMotion}/></TrainingPanel>
                {run?.reward === "pending" && <div className="pending-reward-banner">
                  <button className="f-primary" onClick={() => navigate("learn")}>🎁 {label("領取完成獎勵")}</button>
                  <p>{label("上次完成六題的獎勵還在，先選好再出發。")}</p>
                </div>}
                <button className="territory-harbor-link" onClick={() => navigate("territory")}><span aria-hidden="true">⛰️</span><span><b>{label("建造自己的領地")}</b><small>{label("種樹、蓋城堡，和夥伴一起住下來。")}</small></span><span aria-hidden="true">➜</span></button>
                <div className="harbor-strip">
                  <div>
                    <b>{p.coins}</b>
                    <span>{label("星幣", "ㄒㄧㄥ ㄅㄧˋ")}</span>
                  </div>
                  <div>
                    <b>
                      {Object.keys(p.owned).length} / {ROSTER.length}
                    </b>
                    <span>{label("夥伴", "ㄏㄨㄛˇ ㄅㄢˋ")}</span>
                  </div>
                  <div>
                    <b>{p.tickets}</b>
                    <span>
                      {label(
                        "星願券",
                        "ㄒㄧㄥ ㄩㄢˋ ㄑㄩㄢˋ",
                      )}
                    </span>
                  </div>
                </div>

                <section className="harbor-bottom">
                  <div className="companion-dock f-panel">
                    <Art pet={pet} large />
                    <div>
                      <span className="f-muted">
                        {label("同行夥伴", "ㄊㄨㄥˊ ㄒㄧㄥˊ ㄏㄨㄛˇ ㄅㄢˋ")}
                      </span>
                      <h2>{pet.name}</h2>
                      <p>
                        {SKILLS[petSkill(pet.id)].icon}{" "}
                        {label(
                          petSkillName(pet.id),
                          SKILLS[petSkill(pet.id)].zy,
                        )}
                      </p>
                      <button
                        onClick={() => {
                          setPetDetail(pet.id);
                          say(
                            `${pet.name}。${petSkillDescription(pet.id)}`,
                          );
                        }}
                      >
                        🐾 {label("認識夥伴", "ㄖㄣˋ ㄕˋ ㄏㄨㄛˇ ㄅㄢˋ")}
                      </button>
                    </div>
                  </div>
                  {grade === 4 ? (
                    <div className="f-panel radar-panel">
                      <h2>五科航海羅盤</h2>
                      <AbilityRadar
                        snapshot={selectAbilitySnapshot(p.milestones)}
                        selected="math"
                        compact
                        onSelect={!unfinishedJourney(run) && cloud.online && !busy ? (subject: Subject) => begin(subject) : undefined}
                      />
                    </div>
                  ) : (
                    <div className="f-panel route-note">
                      <span>🌟</span>
                      <h2>
                        {label(
                          "每天一點點",
                          "ㄇㄟˇ ㄊㄧㄢ ㄧˋ ㄉㄧㄢˇ ㄉㄧㄢˇ",
                        )}
                      </h2>
                      <p>
                        {grade === 1 ? (
                          "👂 → 🖼️ → 🐾"
                        ) : (
                          grade === 5 ? "五年級五科通用暖身已開放，先讀懂題目再出發。學校教材版本待確認。" : grade === 6 ? "先讀題、列式，再選答案。六年級五科已開放歷屆補充練習，先讀懂題目再出發。" : <AutoRuby text="慢慢聽仔細看" />
                        )}
                      </p>
                      <ReadAloud grade={readingGrade}><button data-read-aloud
                        onClick={() =>
                          speak(
                            "慢慢聽，仔細看。每場六題，每題只能選一次。答錯會扣血，累計錯三題就挑戰失敗。完成六題而且錯誤少於三次，就會自動存星星。想休息，隨時回港口。",
                            setNotice,
                          )
                        }
                      >
                        🔊
                      </button></ReadAloud>
                    </div>
                  )}
                </section>
              </>
            )}
            {page === "island" && <IslandApp key={id} onLoadBack={()=>navigate("home")}
              player={{id,name:player.name,icon:player.icon,grade}}
              companion={{name:islandPet.name,image:islandPet.image,skill:petSkill(islandPet.id),skillName:SKILLS[petSkill(islandPet.id)].name,skillIcon:SKILLS[petSkill(islandPet.id)].icon}}
              embed={{voice,reduced:battleReducedMotion,online:cloud.online,day:today,progress:p.mathIsland ?? {units:{},pool:[],stats:{},day:"",attempted:[]},
                onStart:(mode,unit,mathGrade)=>change({type:"island-start",player:id,mode,...(unit?{unit}:{}),...(mathGrade?{grade:mathGrade}:{})}),
                onAnswer:(runId,index,choice)=>change({type:"island-answer",player:id,runId,index,choice}),
                onHelp:(runId,index)=>change({type:"island-help",player:id,runId,index}),
                onRound:runId=>change({type:"island-finish",player:id,runId}),
                onQuit:runId=>change({type:"island-quit",player:id,runId}),onExit:(to="home")=>navigate(to)}} />}
            {page === "learn" && run && quizFocused && (
                  <div className="challenge-top quiz-progress-header">
                    <button
                      onClick={() => navigate("home")}
                      aria-label="回到港口"
                    >
                      ⛵
                    </button>
                    <strong className="quiz-question-count">第 {run.index + 1}／{run.questions.length} 題</strong>
                    <span className="quiz-goal-count">答對 <b>{run.answers?.filter(Boolean).length ?? 0}</b>／目標 {correctNeeded(run.challenge)}</span>
                  <button
                    className="quiet-button quiz-quit" aria-label="結束航程" title="結束航程"
                    onClick={() =>
                      setLeave(() => async () => {
                        await change({
                          type: "quit",
                          player: id,
                          runId: run.id,
                        });
                        navigate("home");
                      })
                    }
                  >
                    ✕
                  </button>
                  </div>
            )}
            {page === "learn" && run && <QuizEncounter profile={p} day={cloud.state.day} busy={busy} online={cloud.online} onRecruit={pet => change({ type: "equip", player: id, pet })} key={run.id} run={run}
              onBestiary={() => navigate("bestiary")}
              musicControl={!quizFocused && quizCombatActive ? musicControl : undefined}
              xp={p.growth.xp[run.companion] ?? 0}
              reduced={battleReducedMotion} oldDay={run.day !== today} summaryOnly={resultReady} onResultReady={(id, live) => setResultPresentation({ id, live })} />}
            {page === "learn" &&
              (run?.challenge && !run.challenge.clock && run.status==='active' && !run.settled ? (
                <ChallengePreparation key={`${run.id}:${run.index}`} assets={cloud.state.questionAssets?.[id]} runId={run.id} blocked={!!leave} challenge={run.challenge} index={run.index} busy={busy} online={cloud.online}
                  correct={run.answers?.filter(Boolean).length??0} answered={run.answers?.length??0}
                  onQuit={()=>setLeave(()=>async()=>{const saved=await change({type:'quit',player:id,runId:run.id});if(saved!==undefined)navigate('home');})}
                  onReady={()=>{stopVoice();return change({type:'ready-question',player:id,runId:run.id,index:run.index});}}
                  onMode={mode=>change({type:'challenge-mode',player:id,runId:run.id,mode})}
                  onSpeak={text=>speak(text,setNotice)} onBack={()=>navigate('home')} />
              ) : !run || !q ? (
                <section className="f-panel">
                  <h1>選一條航線出發</h1>
                  <button onClick={() => navigate("home")}>⛵ 返回港口</button>
                </section>
              ) : run.status !== "active" ? (
                <section hidden={!resultReady} className={`result-panel f-panel ${run.reward !== "none" ? "reward-pending" : ""}`}>
                  {resultReady && <>
                  {run.status === "won" ? <QuizVictory autoPlay={!!resultPresentation?.live} reduced={battleReducedMotion} onConsumed={consumeOutcomeAnimation} run={run} heading={heading} busy={busy} online={cloud.online} oldDay={run.day !== today} review={reviewOffer === run.course} courseAvailable={restartCourseAvailable}
                    onContinue={() => { if (reviewOffer === run.course) void beginReview('all', run.course); else if (restartCourseAvailable) void begin(run.course, run.practice); else { navigate('home'); setCoursePicker(true); } }}
                    onChooseCourse={() => { navigate('home'); setCoursePicker(true); }} onHome={() => navigate('home')}
                    pendingReward={run.reward === 'pending' ? <RewardChoice reward={run.reward} stars={p.rewardStars} busy={busy || !cloud.online} onSpeak={text => speak(text, setNotice)} onChoose={async choice => { const result = await change<RewardState>({type:'claim-reward',player:id,runId:run.id,choice}); if (result) say(rewardMessage(result)); }} /> : undefined}
                  /> : <>
                  <OutcomeAnimation outcome="failed" companion={run.companion} autoPlay={!!resultPresentation?.live} reduced={battleReducedMotion} onConsumed={consumeOutcomeAnimation} />
                  <h1 ref={heading} tabIndex={-1}>🛟 {label("挑戰失敗", "ㄊㄧㄠˇ ㄓㄢˋ ㄕ ㄅㄞˋ")}</h1>
                  <p>
                    {run.status === "failed"
                      ? (mistakeCount(run)>=3?"答錯或超時三題，夥伴要休息了。答對的星幣與進度都保留。":"這場需要答對 "+correctNeeded(run.challenge)+" 題；你答對了 "+(run.answers?.filter(Boolean).length??0)+" 題。答對的星幣與進度都保留，下次再挑戰！")
                      : run.practice
                        ? "練習完成，不發放星幣或抽獎券。"
                        : "六題完成！答對的學習進度，都記錄好了。"}
                  </p>
                  </>}
                  <VictoryDetails victory={run.status === "won"}>
                  <ReadAloud grade={readingGrade}><button data-read-aloud
                    className="voice-button"
                    onClick={() =>
                      speak(
                        run.status === "failed"
                          ? "夥伴要休息了。答對的進度都還在。一起把這場錯題訂正好吧。"
                          : rewardMessage(run.reward),
                        setNotice,
                      )
                    }
                  >
                    🔊
                  </button></ReadAloud>
                  <BattleReview key={run.id} run={run} items={cloud.state.reviews?.[id] ?? []} grade={grade} busy={busy} online={cloud.online} oldDay={run.day !== today}
                    onListen={question => question.audio ? playRecording(question.audio,question.end,()=>{},setNotice) : speak(questionSpeech({...question,grade}),setNotice,question.course === "english" ? "en-US" : "zh-TW")}
                    renderChoice={(choice, question) => <ChoiceView choice={choice} grade={grade} hideReadingHints={question.hideReadingHints} pictureOnly={grade === 1 && question.course === "words"} />}
                    onCorrect={(index, choice) => change<boolean>({type:"correct-run",player:id,runId:run.id,index,choice})}
                    onSpeak={(text, english) => speak(text,setNotice,english ? "en-US" : "zh-TW")}
                    onSkip={() => setLeave(() => async () => { const ok = await change({type:"skip-remediation",player:id,runId:run.id}); if(ok)navigate("home"); })} />
                  {run.status === "failed" && <div className="f-actions result-recovery">
                    <button onClick={() => navigate("home")}>⛵ {label("先休息，進度已存好")}</button>
                    {run.remediation?.receipt && <button disabled={busy || !cloud.online} onClick={() => begin(run.course)}>再挑戰一次</button>}
                  </div>}
                  <div className="f-actions"><button disabled={busy || !cloud.online} onClick={() => void beginReview('mistakes', run.course)}>複習錯題</button><button disabled={busy || !cloud.online} onClick={() => void beginReview('all', run.course)}>複習已學題目</button><button onClick={() => { navigate('home'); setCoursePicker(true); }}>換個科目</button></div>
                  {run.status === "won" && !run.practice && run.reward !== "none" && run.reward !== "pending" && <RewardChoice
                    reward={run.reward} stars={p.rewardStars} busy={busy || !cloud.online}
                    onSpeak={(text) => speak(text, setNotice)}
                    onChoose={async (choice) => {
                      const result = await change<RewardState>({ type: "claim-reward", player: id, runId: run.id, choice });
                      if (result) say(rewardMessage(result));
                    }}
                  />}
                  {run.status === "won" && !run.practice && run.reward === "none" && <p>{label("這趟已結束。開始新挑戰，成功就會自動存星星。")}</p>}
                  {run.status === "won" && run.reward !== "pending" && p.tickets > 0 && <button onClick={() => navigate("lottery")}>🎟️ {label("用券領夥伴卡")}</button>}
                  <LearningJourney profile={p} run={run} onVisit={openBuildingGoal} />
                  </VictoryDetails>
                  </>}
                </section>
              ) : (
                <div className="quiz-answer-deck">
                  <section className="learning-stage quiz-learning">
                    <ChallengeTimer correct={run.answers?.filter(Boolean).length??0} challenge={run.challenge} serverNow={cloud.state.serverNow??Date.now()} settled={run.settled} busy={busy} online={cloud.online}
                      onTimeout={()=>change({type:'question-timeout',player:id,runId:run.id,index:run.index})}>
                    <div className={`question-panel f-panel ${!q.image && q.prompt.length < 120 ? "compact-question" : ""}`}>
                      <div id="quiz-reading" className="quiz-question-reading" ref={questionReading} tabIndex={0} role="region" aria-label="題目與解說">

                      <div className="quiz-prompt-line">
                      <h1 ref={heading} tabIndex={-1}>
                        {grade === 1 && q.audio
                          ? "👂 → 👆"
                          : <QuestionPrompt question={q} grade={grade} />}
                      </h1>
                      <ReadAloud grade={readingGrade}><button data-read-aloud
                        className="listen-orb"
                        onClick={listen}
                        aria-label="播放題目聲音"
                      >
                        <span>👂</span>
                        <b>{label("聽題目", "ㄊㄧㄥ ㄊㄧˊ ㄇㄨˋ")}</b>
                        <small>
                          ▶ {heard === `${run.id}:${run.index}` ? "✓" : ""}
                        </small>
                      </button></ReadAloud>
                      </div>
                      {q.rephraseOf && <p className="eyebrow">換個問法，再挑戰一次</p>}
                      {q.visual && <p className="math-visual" data-learning-content>{q.visual}</p>}
                      <QuestionFigure question={q} onReady={figure.onReady} />
                      {hint && (
                        <div className="hint-box">
                          💡 {grade === 1 && q.course !== "english" ? "👂 🔎 🐾" : q.hint}
                        </div>
                      )}
                      {run.settled && (run.practice || run.answers?.[run.index] === false) && (
                        <div className="answer-explanation" role="status">
                          {run.answers?.[run.index] === false ? "💡 正確答案：" : "✓ "}
                          {q.target ? (
                            <ChoiceView choice={q.target} grade={grade} />
                          ) : (
                            q.explanation
                          )}
                          {q.answer !== undefined && <ReadAloud grade={readingGrade}><button data-read-aloud aria-label="聽正確答案" onClick={() => speak(q.course === "english" ? englishAnswerSpeech(q.options[q.answer!].text) : questionSpeech({prompt:q.explanation ?? q.options[q.answer!].text, course:q.course, grade}), setNotice, q.course === "english" ? "en-US" : "zh-TW")}>🔊 聽正確答案</button></ReadAloud>}
                        </div>
                      )}
                      {run.practice && <CountOnExplanation grade={grade} run={run} question={q} sessionKey={`${id}:${run.id}:${run.index}`}
                        companion={petById(run.companion)!} reduced={battleReducedMotion} onSpeak={text => speak(text, () => setNotice("這台裝置暫時不能朗讀。你還是可以按加一，看星星變多。"), "zh-TW")} onStop={stopVoice} />}
                      <details className="quiz-source-details"><summary>題目來源與規則</summary>
                      {q.examSources?.length ? <p className="curriculum-notice">試卷題・{examSourceLabel(q.examSources[0])}</p> : (q.subject === "chinese" || q.subject === "english" || q.subject === "science" || q.subject === "social" || (q.subject === "math" && (q.grade === 1 || q.grade === 4 || q.grade === 5))) ? <p className="curriculum-notice">通用練習（非指定版本試卷）</p> : null}

                      <p className="learning-origin" role="status">
                        <span className="learning-origin-copy">{grade === 1
                          ? run.review[run.index]
                            ? "🔁 👂 💙"
                            : "✨ 🧩"
                          : label(
                              run.review[run.index]
                                ? "熟悉的能力，再練一次 · 今日首次答對可拿星幣"
                                : "新題探索 · 依本場挑戰安排",
                            )}</span>
                        <ReadAloud grade={readingGrade}><button data-read-aloud
                          aria-label="聽出題說明"
                          onClick={() =>
                            say(
                              run.review[run.index]
                                ? "這是系統安排的複習題。這題今天第一次作答而且答對，也能拿到星幣。"
                                : "這是新題，依這場的年級與難度安排。",
                            )
                          }
                        >
                          🔊
                        </button></ReadAloud>
                      </p>
                      <p className="fine-print">
                        {run.practice
                          ? "練習模式：每場六題，累計三錯就結束，不發獎勵。"
                          : `每題只能選一次。答錯或超時三次即失敗；六題答對 ${correctNeeded(run.challenge)} 題才通關。每兩場成功換一張券。`}
                      </p>
                      </details>
                      </div>
                      <div className="quiz-answer-bank">
                      {!run.settled && <p className="answer-submit-cue">{label("點選答案，立即送出")}</p>}
                      <div
                        style={{ "--answer-count": q.options.length } as React.CSSProperties}
                        className={`answer-grid ${q.options.every(x => toneName(x.text)) ? "tone-answers" : ""} ${q.options.length > 4 && q.options.every(x => !x.icon && x.text.length <= 6) ? "word-bank-answers" : ""} ${q.options.every(x => !x.icon && x.text.length <= 5 && /^[0-9A-Za-z.+−=%]+$/.test(x.text)) && !canListenToEnglishChoices(grade,q) ? "short-answers" : ""} ${q.options.some((x) => x.icon) ? "picture-options" : ""} ${canListenToEnglishChoices(grade,q) ? "with-choice-audio" : ""}`}
                      >
                        {q.options.map((option, i) => (
                          <AnswerOption
                            key={i}
                            disabled={
                              !cloud.online || busy || !figure.ready ||
                              run.settled ||
                              run.eliminated === i ||
                              (!!q.audio && heard !== `${run.id}:${run.index}`)
                            }
                            className={`${run.settled && run.answers?.[run.index] === true && i === q.answer ? "correct" : ""} ${run.wrong.includes(i) ? "was-wrong" : ""}`}
                            onAnswer={() => answer(i)}
                            listening={canListenToEnglishChoices(grade,q) ? { text:option.text, disabled:busy || run.settled || run.eliminated===i,
                              play:()=>{ if (!pending.current && !run.settled && run.eliminated!==i) speak(option.text,()=>setNotice("英文發音暫時不能播放。請找大人幫忙，或先回港口休息。"),"en-US"); }, stop:stopVoice } : undefined}
                            label={
                              grade === 1 && q.course === "words"
                                ? `選擇圖片 ${i + 1}`
                                : `選擇 ${toneName(option.text) ?? option.text}`
                            }
                          >
                            <ChoiceView
                              choice={option}
                              hideReadingHints={q.hideReadingHints}
                              grade={grade}
                              pictureOnly={grade === 1 && q.course === "words"}
                            />
                            {run.eliminated === i && <span>🔎</span>}
                          </AnswerOption>
                        ))}
                      </div>
                      {!!q.audio && heard !== `${run.id}:${run.index}` && (
                        <p className="f-muted">
                          👂 {label("先聽再選", "ㄒㄧㄢ ㄊㄧㄥ ㄗㄞˋ ㄒㄩㄢˇ")}
                        </p>
                      )}
                      </div>
                      <div className="quiz-question-toolbar">
                      <div className="question-tools">

                      <div className="quiz-skill-action"><button disabled={!cloud.online || busy || run.skillUsed || run.settled} onClick={doSkill}>
                        {currentSkill.icon} {label(currentSkill.name, currentSkill.zy)} {run.skillUsed ? "✓" : ""}
                      </button></div>
                      <div className="quiz-hint-action">
                        <button
                          disabled={busy || run.settled}
                          onClick={async () => {
                            const saved = await change({type: "hint", player: id, runId: run.id, index: run.index});
                            if (saved) {
                              setHint(true);
                              say(q.hint);
                            }
                          }}
                        >
                          💡 {label("提示", "ㄊㄧˊ ㄕˋ")}
                        </button>

                      </div>
                      <button className="quiz-reading-toggle" aria-expanded={questionExpanded} aria-controls="quiz-reading" onClick={() => setQuestionExpanded(v => !v)}>{questionExpanded ? "收合題目" : "展開題目"}</button>
                      {musicControl}
                      </div>
                      </div>
                    </div>
                    </ChallengeTimer>
                  </section>
                  <div className="quiz-turn-actions">
                  {run.settled && run.answers?.[run.index] === false && run.index < run.questions.length - 1 && <button className="f-primary" disabled={busy || !cloud.online} onClick={() => change({ type: "advance-question", prepare: true, player: id, runId: run.id, index: run.index })}>看懂了，下一題</button>}
                  {run.settled && run.answers?.[run.index] !== false && run.index < run.questions.length - 1 && <BattleAdvance key={`${id}:${run.id}:${run.index}`} grade={grade} reduced={battleReducedMotion} busy={busy} online={cloud.online} correct={run.answers?.[run.index] === true} animationMs={quizAnimationMs(run.companion, run.index, run.questions.length)}
                    onAdvance={async () => { stopVoice(); return change({ type: "advance-question", prepare: true, player: id, runId: run.id, index: run.index }); }} />}
                  </div>

                </div>
              ))}
            {page === "leaderboard" && <CollectionBoard heading={heading} key={cloud.state.username} player={player.id} revision={family.revision} onCollection={setViewCollection} onMine={()=>navigate("collection")}/>}
            {viewCollection && <CollectionViewer key={`${cloud.state.username}:${viewCollection}`} player={player.id} target={viewCollection} onClose={()=>setViewCollection(null)}/>}
            {page === "bestiary" && <MonsterBestiary profile={p} heading={heading} current={run?.encounter.variant ?? p.lastMonsterVariant}
              onBack={() => navigate("collection")} onResume={run ? () => navigate("learn") : undefined} />}
            {page === "collection" && (
              <>
                <div className="page-title collection-heading">
                  <div>
                    <h1 ref={heading} tabIndex={-1}>
                      {label("夥伴卡冊")}
                    </h1>
                    <p>{ROSTER.length} 種夥伴，抽卡與降服一起收集，練等後更有力量。</p>
                  </div>
                  <span className="count-badge">
                    🐾 {Object.keys(p.owned).length} / {ROSTER.length}
                  </span>
                </div>
                <div className="collection-summary">
                  <span>
                    📚 <b>{stats.unique}</b> 種
                  </span>
                  <span>
                    🃏 <b>{stats.total}</b> 張
                  </span>
                  <span>
                    ♊ <b>{stats.duplicates}</b> 張重複
                  </span>
                  <button onClick={() => navigate("leaderboard")}>
                    🏆 {label("看排行榜")}
                  </button>
                  <button onClick={() => navigate("bestiary")}>
                    📖 {label("怪物圖鑑")}
                  </button>
                  {musicControl}
                </div>
                <div className="catalog-tools">
                  <label>
                    🔎{" "}
                    <input
                      aria-label="搜尋夥伴"
                      placeholder="搜尋夥伴或五行屬性"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setLimit(12);
                      }}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={ownedOnly}
                      onChange={(e) => {
                        setOwnedOnly(e.target.checked);
                        setLimit(12);
                      }}
                    />
                    {label("我的夥伴", "ㄨㄛˇ ˙ㄉㄜ ㄏㄨㄛˇ ㄅㄢˋ")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={duplicatesOnly}
                      onChange={(e) => {
                        setDuplicatesOnly(e.target.checked);
                        setLimit(12);
                      }}
                    />
                    ♊ {label("重複卡")}
                  </label>
                  <label><input type="checkbox" checked={newSeriesOnly} onChange={e => { setNewSeriesOnly(e.target.checked); setLimit(12); }} /><span className="catalog-filter-copy">{label("星海新朋友・新增五十位")}</span></label>
                  <select
                    aria-label="五行屬性"
                    value={elementFilter}
                    onChange={(e) => {
                      setElementFilter(e.target.value);
                      setLimit(12);
                    }}
                  >
                    <option value="all">全部五行</option>
                    {ELEMENTS.map((element) => (
                      <option key={element.name} value={element.name}>{element.name}</option>
                    ))}
                  </select>
                  <select
                    aria-label="稀有度"
                    value={rarity}
                    onChange={(e) => {
                      setRarity(e.target.value);
                      setLimit(12);
                    }}
                  >
                    <option value="all">全部階級</option>
                    {RARITY_ORDER.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="pet-grid">
                  {filtered.slice(0, limit).map((c) => (
                    <button
                      key={c.id}
                      className={`pet-card collectible-card rarity-${c.rarity} ${p.owned[c.id] ? "owned" : ""}`}
                      onClick={() => {
                        setPetDetail(c.id);
                        say(`${c.name}。${petSkillDescription(c.id)}`);
                      }}
                    >
                      <CardFace
                        pet={c}
                        copies={p.owned[c.id] ?? 0}
                        equipped={p.equipped === c.id}
                        level={creatureProgress(c.rarity, p.growth.xp[c.id] ?? 0).level}
                      />
                      {!!p.owned[c.id] && <GrowthMeter rarity={c.rarity} compact xp={p.growth.xp[c.id] ?? 0} />}
                    </button>
                  ))}
                </div>
                {!filtered.length && <p>沒有找到符合的夥伴，試試其他條件。</p>}
                {filtered.length > limit && (
                  <button
                    className="load-more"
                    onClick={() => setLimit((l) => l + 12)}
                  >
                    ＋ {label("看更多", "ㄎㄢˋ ㄍㄥˋ ㄉㄨㄛ")}
                  </button>
                )}
              </>
            )}
            {page === "lottery" && <GachaMachine key={id} profile={p} day={cloud.state.day} online={cloud.online} busy={busy} reduced={battleReducedMotion}
              musicControl={musicControl} onSpeak={text => speak(text, setNotice)}
              onDraw={(starTicket) => change<DrawResult>({ type: starTicket ? "draw-star" : "draw", player: id })}
              onEquip={async pet => { if (await change<boolean>({ type: "equip", player: id, pet })) navigate("home"); }}
              onLearn={() => (run?.status === "active" || run?.reward === "pending") ? navigate("learn") : navigate("home")}
              onCollection={() => navigate("collection")} onTrade={() => navigate("trade")} />}
            {page === "trade" && (
              <>
                <div className="page-title">
                  <div>
                    <h1 ref={heading} tabIndex={-1}>
                      {label(
                        "夥伴交換所",
                        "ㄏㄨㄛˇ ㄅㄢˋ ㄐㄧㄠ ㄏㄨㄢˋ ㄙㄨㄛˇ",
                      )}
                    </h1>
                    <p>
                      同一台裝置，兩位航海員輪流確認。每位玩家的初始夥伴會一直陪著你。
                    </p>
                  </div>
                  <span className="count-badge">🤝</span>
                </div>
                {!family.pendingTrade && (
                  <section className="f-panel swap-suggestions">
                    <h2>♊ {label("重複卡交換推薦")}</h2>
                    <p>
                      各拿一張重複卡，換到彼此還沒有的夥伴。每次交換一張，原本的夥伴仍可留下。
                    </p>
                    {suggestions.length ? (
                      <div className="swap-options">
                        {suggestions.map((offer) => (
                          <button
                            key={`${offer.to}-${offer.give}-${offer.receive}`}
                            onClick={() => {
                              setTradeTo(offer.to);
                              setGive(offer.give);
                              setReceive(offer.receive);
                              say(
                                `和${PLAYERS.find((x) => x.id === offer.to)!.name}交換。送出${petById(offer.give)!.name}一張，收到${petById(offer.receive)!.name}一張。請按我同意送出，再請對方確認。`,
                              );
                            }}
                          >
                            <span>
                              <PlayerAvatar id={offer.to} />{" "}
                              {PLAYERS.find((x) => x.id === offer.to)!.name}
                            </span>
                            <span className="swap-pictures">
                              <img
                                src={petById(offer.give)!.image}
                                alt={petById(offer.give)!.name}
                              />{" "}
                              ↔{" "}
                              <img
                                src={petById(offer.receive)!.image}
                                alt={petById(offer.receive)!.name}
                              />
                            </span>
                            <small>
                              {petById(offer.give)!.name} ↔{" "}
                              {petById(offer.receive)!.name}
                            </small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p>🌱 還沒有互補的重複卡。也可以在下面自行選卡交換。</p>
                    )}
                  </section>
                )}
                {family.pendingTrade ? (
                  <section className="f-panel trade-review">
                    <h2>
                      {
                        PLAYERS.find((x) => x.id === family.pendingTrade!.from)!
                          .name
                      }{" "}
                      →{" "}
                      {
                        PLAYERS.find((x) => x.id === family.pendingTrade!.to)!
                          .name
                      }
                    </h2>
                    <div className="trade-pair">
                      <div>
                        <Art pet={petById(family.pendingTrade.give)!} />
                        <b>{petById(family.pendingTrade.give)!.name}</b>
                      </div>
                      <span>↔</span>
                      <div>
                        <Art pet={petById(family.pendingTrade.receive)!} />
                        <b>{petById(family.pendingTrade.receive)!.name}</b>
                      </div>
                    </div>
                    {family.pendingTrade.to === id ? (
                      <>
                        <p>
                          你會送出 {petById(family.pendingTrade.receive)!.name}
                          一張，收到 {
                            petById(family.pendingTrade.give)!.name
                          }{" "}
                          一張。送出後留下{" "}
                          {Math.max(
                            0,
                            (p.owned[family.pendingTrade.receive] ?? 0) - 1,
                          )}{" "}
                          張。
                        </p>
                        <ReadAloud grade={readingGrade}><button data-read-aloud
                          aria-label="聽交換內容"
                          onClick={() =>
                            speak(
                              `${tradeCardSpeech(family.pendingTrade!.receive, p.owned[family.pendingTrade!.receive] ?? 0)}收到${petById(family.pendingTrade!.give)!.name}一張。按打勾確認，按叉叉取消。`,
                              setNotice,
                            )
                          }
                        >
                          🔊
                        </button></ReadAloud>
                        <button
                          className="f-primary"
                          disabled={!cloud.online || busy}
                          onClick={async () => {
                            const t = family.pendingTrade!;
                            const ok = await change({
                              type: "trade-accept",
                              player: id,
                              tradeId: t.id,
                            });
                            if (ok) say("交換完成！好好照顧新夥伴。");
                          }}
                        >
                          ✓ {label("確認交換", "ㄑㄩㄝˋ ㄖㄣˋ ㄐㄧㄠ ㄏㄨㄢˋ")}
                        </button>
                      </>
                    ) : cloud.state.playerId ? (
                      <p>請對方登入自己的帳號，在交換頁確認這筆邀請。</p>
                    ) : (
                      <button
                        onClick={() => {
                          choose(family.pendingTrade!.to);
                          setPage("trade");
                          if (allowsReadAloud(PLAYERS.find(x => x.id === family.pendingTrade!.to)!.grade)) speak(
                            `請${PLAYERS.find((x) => x.id === family.pendingTrade!.to)!.name}確認。你會送出${petById(family.pendingTrade!.receive)!.name}，收到${petById(family.pendingTrade!.give)!.name}。點喇叭可以再聽一次。`,
                            setNotice,
                          );
                        }}
                      >
                        👤 {label("換人確認", "ㄏㄨㄢˋ ㄖㄣˊ ㄑㄩㄝˋ ㄖㄣˋ")}
                      </button>
                    )}
                    <button
                      disabled={!cloud.online || busy || Boolean(cloud.state.playerId && ![family.pendingTrade.from, family.pendingTrade.to].includes(cloud.state.playerId))}
                      onClick={() =>
                        change({
                          type: "trade-cancel",
                          player: id,
                          tradeId: family.pendingTrade!.id,
                        })
                      }
                    >
                      ✕ {label("取消", "ㄑㄩˇ ㄒㄧㄠ")}
                    </button>
                  </section>
                ) : (
                  <section className="f-panel">
                    <label className="form-label">
                      {label("交換對象", "ㄐㄧㄠ ㄏㄨㄢˋ ㄉㄨㄟˋ ㄒㄧㄤˋ")}
                      <PlayerAvatar id={tradeTo} />
                      <select
                        value={tradeTo}
                        onChange={(e) => {
                          setTradeTo(e.target.value as PlayerId);
                          setReceive("");
                        }}
                      >
                        {PLAYERS.filter((x) => x.id !== id).map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="trade-columns">
                      <div>
                        <h2>📤 {label("送出", "ㄙㄨㄥˋ ㄔㄨ")}</h2>
                        <PetPicker
                          pets={tradable(id)} growth={p.growth.xp}
                          counts={p.owned}
                          selected={[give]}
                          onSelect={(c) => {
                            setGive(c);
                            say(tradeCardSpeech(c, p.owned[c] ?? 0));
                          }}
                        />
                      </div>
                      <div>
                        <h2>📥 {label("收到", "ㄕㄡ ㄉㄠˋ")}</h2>
                        <PetPicker
                          pets={tradable(tradeTo)} growth={family.profiles[tradeTo].growth.xp}
                          counts={family.profiles[tradeTo].owned}
                          selected={[receive]}
                          onSelect={(c) => {
                            setReceive(c);
                            say(`收到 ${petById(c)!.name}`);
                          }}
                        />
                      </div>
                    </div>
                    {(!tradable(id).length || !tradable(tradeTo).length) && (
                      <p>
                        雙方都需要至少一隻可交換夥伴。用星幣邀請，或用星願券遇見新朋友。
                      </p>
                    )}
                    {give && (
                      <p>
                        📤 送出 1 張，留下{" "}
                        {Math.max(0, (p.owned[give] ?? 0) - 1)} 張。
                        {p.owned[give] === 1 &&
                          "這是最後一張，交換後會離開你的卡冊。"}
                        <ReadAloud grade={readingGrade}><button data-read-aloud
                          aria-label="聽送出後的剩餘張數"
                          onClick={() =>
                            speak(
                              tradeCardSpeech(give, p.owned[give] ?? 0),
                              setNotice,
                            )
                          }
                        >
                          🔊
                        </button></ReadAloud>
                      </p>
                    )}
                    <button
                      className="f-primary"
                      disabled={
                        !cloud.online ||
                        busy ||
                        !give ||
                        !receive ||
                        give === receive
                      }
                      onClick={() =>
                        change({
                          type: "trade-propose",
                          player: id,
                          to: tradeTo,
                          give,
                          receive,
                        })
                      }
                    >
                      🤝 {label("我同意送出", "ㄨㄛˇ ㄊㄨㄥˊ ㄧˋ ㄙㄨㄥˋ ㄔㄨ")}
                    </button>
                  </section>
                )}
              </>
            )}
            {page === "battle" && (
              <>
                <div className="page-title battle-heading" data-learning-content>
                  <div>
                    <h1 ref={heading} tabIndex={-1}>
                      星潮競技場
                    </h1>
                    <p>
                      1～3
                      隻隊伍・能力成長・回合策略。對戰不扣星幣，也不拿走夥伴。
                    </p>
                  </div>
                  {!battle && musicControl}
                  <span className="count-badge">⚔️</span>
                </div>
                {!battle ? (
                  <section className="f-panel battle-setup" data-learning-content>
                    <div className="mode-switch">
                      <button
                        aria-pressed={battleMode === "cpu"}
                        onClick={() => setBattleMode("cpu")}
                      >
                        <BrandText text="🤖 電腦陪練" />
                      </button>
                      <button
                        aria-pressed={battleMode === "duo"}
                        onClick={() => setBattleMode("duo")}
                      >
                        <BrandText text="👥 雙人輪流" />
                      </button>
                    </div>
                    <div className="battle-setup-actions">
                      <h2>
                        <PlayerAvatar id={player.id} />{" "}
                        我的隊伍{" "}
                        {team.length}/3
                      </h2>
                      <button
                        className="f-primary"
                        disabled={
                          !team.length ||
                          (battleMode === "duo" &&
                            otherTeam.length !== team.length)
                        }
                        onClick={() => {
                          battleLock.current = false;
                          setBattlePlayback(null);
                          presentationNonce.current++;
                          const cpu = chooseCpuTeam(team, p.growth.xp);
                          setBattle(
                            newBattle(
                              team,
                              battleMode === "cpu"
                                ? cpu.team
                                : otherTeam,
                              battleMode,
                              [p.growth.xp, battleMode === "duo" ? family.profiles[opponent].growth.xp : cpu.growth],
                            ),
                          );
                          setHandoff(false);
                          say("對戰開始。先點劍攻擊，也可以用盾牌防守。");
                        }}
                      >
                        <BrandText text="⚔️ 開始對戰" />
                      </button>
                    </div>
                    <p className="battle-pick-hint">點圖片選 1～3 位夥伴，再點一次可取消。</p>
                    <BattlePetPicker
                      pets={owned(id)} growth={p.growth.xp}
                      selected={team}
                      onSelect={(c) =>
                        setTeam((t) =>
                          t.includes(c)
                            ? t.filter((x) => x !== c)
                            : t.length < 3
                              ? [...t, c]
                              : t,
                        )
                      }
                    />
                    {battleMode === "duo" && (
                      <>
                        <label className="form-label">
                          對手 <PlayerAvatar id={opponent} />
                          <select
                            value={opponent}
                            onChange={(e) => {
                              setOpponent(e.target.value as PlayerId);
                              setOtherTeam([]);
                            }}
                          >
                            {PLAYERS.filter((x) => x.id !== id).map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <BattlePetPicker
                          pets={owned(opponent)} growth={family.profiles[opponent].growth.xp}
                          selected={otherTeam}
                          onSelect={(c) =>
                            setOtherTeam((t) =>
                              t.includes(c)
                                ? t.filter((x) => x !== c)
                                : t.length < 3
                                  ? [...t, c]
                                  : t,
                            )
                          }
                        />
                      </>
                    )}
                    <details className="battle-setup-guide">
                      <summary>五行相生相剋</summary>
                      <ElementGuide reduced={battleReducedMotion} />
                    <p className="f-muted">
                      普通攻擊累積能量，2
                      能量可用絕招或回復；防守減傷並蓄能，換人消耗一回合。60
                      回合後比較剩餘體力。
                    </p>
                    </details>
                  </section>
                ) : (
                  <section className="arena duel-arena f-panel">
                    <div ref={battleStage}>
                      <BattleScene battle={battle} playback={battlePlayback} reduced={battleReducedMotion}
                        names={[player.name, battle.mode === "cpu" ? "陪練夥伴" : PLAYERS.find(x => x.id === opponent)!.name]} />
                      {arenaCombatActive && <div className="battle-audio-controls">{musicControl}</div>}
                    </div>
                    <div className="battle-controls">
                      {(
                        [
                          {
                            move: "attack",
                            name: "攻擊",
                            zy: "ㄍㄨㄥ ㄐㄧˊ",
                            icon: "⚔️",
                          },
                          {
                            move: "guard",
                            name: "防守",
                            zy: "ㄈㄤˊ ㄕㄡˇ",
                            icon: "🛡️",
                          },
                          {
                            move: "burst",
                            name: "絕招",
                            zy: "ㄐㄩㄝˊ ㄓㄠ",
                            icon: "✨",
                          },
                          {
                            move: "heal",
                            name: "回復",
                            zy: "ㄏㄨㄟˊ ㄈㄨˋ",
                            icon: "💚",
                          },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.move}
                          disabled={
                            battle.winner !== null ||
                            busy ||
                            !!battleEffect ||
                            !!battle.quiz ||
                            handoff ||
                            (battle.mode === "cpu" && battle.turn === 1) ||
                            (["burst", "heal"].includes(m.move) &&
                              battle.teams[battle.turn][
                                battle.active[battle.turn]
                              ].energy < 2)
                          }
                          onClick={() => battleAction(m.move)}
                        >
                          <span>{m.icon}</span>
                          {label(m.name, m.zy)}
                          {["burst", "heal"].includes(m.move) && (
                            <small>✦✦</small>
                          )}
                        </button>
                      ))}
                    </div>
                    {battle.winner === null && (
                      <div className="f-actions">
                        {battle.teams[battle.turn].map(
                          (f, i) =>
                            i !== battle.active[battle.turn] &&
                            f.hp > 0 && (
                              <button
                                key={f.pet}
                                disabled={
                                  handoff ||
                                  busy ||
                                  !!battleEffect ||
                                  !!battle.quiz ||
                                  (battle.mode === "cpu" && battle.turn === 1)
                                }
                                onClick={() => battleAction(`swap:${i}`)}
                              >
                                🔄 {petById(f.pet)!.name}
                                {hasElementGeneration(petElement(battle.teams[battle.turn][battle.active[battle.turn]].pet), petElement(f.pet)) && (
                                  <small className="swap-generation">{f.hp < fighterMaxHp(f) ? `相生接力 · 回復 ${Math.min(GENERATION_HEAL, fighterMaxHp(f) - f.hp)} 體力` : "相生接力 · 體力已滿"}</small>
                                )}
                              </button>
                            ),
                        )}
                      </div>
                    )}
                    {battle.mode === "cpu" && battle.winner === null && (
                      <div className="battle-study">
                        <button
                          className="f-primary"
                          disabled={
                            busy ||
                            !!battleEffect ||
                            handoff ||
                            !canBattleQuiz(battle)
                          }
                          onClick={openBattleQuestion}
                        >
                          📚 ✨ {label("答題助戰")}{" "}
                          <small>{3 - battle.quizUsed.length} / 3</small>
                        </button>
                        <p>
                          {
                            BATTLE_BUFFS[
                              petSkill(battle.teams[0][battle.active[0]].pet)
                            ].icon
                          }{" "}
                          {
                            BATTLE_BUFFS[
                              petSkill(battle.teams[0][battle.active[0]].pet)
                            ].description
                          }
                          <br />
                          每回合一次、每場三次。效果最多保留三次我方行動；不能疊加。答錯不扣血，不發點數。
                        </p>
                      </div>
                    )}
                    <details className="duel-history"><summary>五行相生相剋</summary><ElementGuide reduced={battleReducedMotion} /></details>
                    <details className="duel-history"><summary>戰鬥紀錄</summary>
                    <ol className="battle-log">
                      {visibleBattle(battle, battlePlayback).log.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ol>
                    </details>
                    <button
                      disabled={!!battleEffect}
                      onClick={() =>
                        battle.winner === null
                          ? setLeave(() => () => setBattle(null))
                          : setBattle(null)
                      }
                    >
                      {!battlePlayback && battle.winner !== null ? "↻ 再來一場" : "⏹ 結束對戰"}
                    </button>
                  </section>
                )}
              </>
            )}
            {page === "review" && <StudyReview session={p.learning.study?.session} question={cloud.state.studyQuestions?.[id]} grade={grade} busy={busy} online={cloud.online}
              onCommand={(type, extra) => change({ type, player: id, ...extra })} onStart={beginReview} onHome={() => navigate('home')} onCourse={() => { navigate('home'); setCoursePicker(true); }} onError={setNotice} />}
            {page === "parent" && (
              <>
                <h1 ref={heading} tabIndex={-1}>
                  家長艙
                </h1>
                <div className="parent-grid">
                  {reportPlayers.map(x => <StudySummary key={x.id} name={x.name} grade={x.grade} summary={cloud.state?.studySummaries?.[x.id]} />)}
                  <section className="f-panel">
                    <h2>航海員的進度</h2>
                    {reportPlayers.map((x) => (
                      <div className="parent-player" key={x.id}>
                        <b>
                          <PlayerAvatar id={x.id} /> {x.name}・{x.grade} 年級
                        </b>
                        <span>
                          精熟 {family.profiles[x.id].milestones.masteryPoints}{" "}
                          · 星幣 {family.profiles[x.id].coins} · 航程{" "}
                          {family.profiles[x.id].milestones.completedVoyages}
                        </span>
                        {family.profiles[x.id].gardenImported && (
                          <small>已保留注音航海團完整原始學習紀錄。</small>
                        )}
                      </div>
                    ))}
                    <p>
                      一年級以圖像、注音與聲音作答；二年級詞語逐字注音；四年級
                      提供五科題庫。家長可陪同檢查學習情況。
                    </p>
                  </section>
                  <section className="f-panel adaptive-summary">
                    <h2>自適應題庫</h2>
                    <p>
                      新題優先，已安排的題目會跨日保存，闖關與答題助戰共用紀錄。數學與四年級閱讀、英文、觀察紀錄、地圖情境使用可驗證生成題，並穿插已審核題目。注音錄音用完會標示複習。
                    </p>
                    <p>
                      每項能力從第 1
                      階開始：最近五次獨立作答有四次答對，下一次安排可升一階；最近三次有兩次錯答或用提示則降一階。只在原年級內調整，這是練習安排，不是能力診斷。
                    </p>
                    {reportPlayers.map((child) => {
                      const state = family.profiles[child.id].learning,
                        summary = learningSummary(state);
                      return (
                        <div className="adaptive-child" key={child.id}>
                          <h3>
                            <PlayerAvatar id={child.id} /> {child.name} · 已安排{" "}
                            {summary.allocated} 道新題 · 納入調整{" "}
                            {summary.answered} 次
                          </h3>
                          {Object.entries(state.skills).length ? (
                            <ul>
                              {Object.entries(state.skills).map(
                                ([skill, stat]) => (
                                  <li key={skill}>
                                    {SKILL_NAMES[skill] ?? skill} · 第{" "}
                                    {stat.level} 階 · 獨立答對 {stat.correct} /{" "}
                                    {stat.answered}
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <p>完成練習後，夥伴會慢慢認識你的步調。</p>
                          )}
                        </div>
                      );
                    })}
                    <p className="fine-print">
                      生成器與錄音素材各有年級範圍，並非無限個不同知識點。新題與系統安排的複習題，當天首次作答答對可得星幣；六題挑戰成功自動存星星，沒有每日題數或完成次數上限。同能力每日最多一題複習納入調整。舊版沒有記錄的歷史無法補回。學習紀錄跟著家庭帳號儲存至雲端，換裝置登入即可接續。
                    </p>
                  </section>
                  <section className="f-panel">
                    <h2>閱讀與聲音</h2>
                    <ReadAloud grade={readingGrade}><label className="setting">
                      <input
                        type="checkbox"
                        checked={voice}
                        onChange={(e) => {
                          setVoice(e.target.checked);
                          if (!e.target.checked) stopVoice();
                        }}
                      />
                      語音導覽（題目錄音仍可手動播放）
                    </label></ReadAloud>
                    <label className="setting">
                      <input
                        type="checkbox"
                        checked={reduceMotion}
                        disabled={SAFE_MODE}
                        onChange={(e) => setReduceMotion(e.target.checked)}
                      />
                      減少動畫
                    </label>
                    <label className="setting">
                      <input
                        type="checkbox"
                        checked={contrast}
                        onChange={(e) => setContrast(e.target.checked)}
                      />
                      高對比
                    </label>
                    <p>
                      {allowsReadAloud(readingGrade) ? "設定在本次使用期間生效。注音題使用既有錄音；其他導覽由裝置中文語音朗讀。" : "設定在本次使用期間生效。"}
                    </p>
                  </section>
                  <section className="f-panel">
                    <h2>帳號與雲端進度</h2>
                    <p>
                      帳號：{cloud.state.username}
                      。登入後會接續對應航海員的分數與收藏，同一帳號可以在其他裝置繼續。
                    </p>
                    <p>
                      每次計分、抽卡與交換成功後，進度立即儲存。其他裝置開啟時約三秒內更新；離線時暫停計分，重新連線後讀取雲端紀錄。
                    </p>
                    <p>
                      雲端驗證的學習成就（歷史記錄）：{cloud.state.verified[id]}。
                      {cloud.state.legacy
                        ? "舊進度與收藏已保留為歷史紀錄，不計入雲端驗證分數。"
                        : "分數由伺服器依答題結果計算。"}
                    </p>
                    {legacyTransfer}
                    {!cloud.state.playerId && <RecoverySettings csrf={cloud.state.csrf} />}
                  </section>
                  <section className="f-panel">
                    <h2>獎勵與資料規則</h2>
                    <p>
                      新題與系統安排的複習題，當天首次作答答對可得 10 星幣，沒有每日 15 題上限。同題當天答錯後重開、重送或換裝置不會重領。答錯會扣血，每題只能提交一次，整場累計三錯即失敗。
                      一般航線和數學島每次六題挑戰成功，自動存一顆星；每兩顆換一張券，沒有每日次數上限，進度可跨日保留。「學一學」不發完成星星；練習模式與跨日舊航程不發完成獎勵。
                      每次當日挑戰成功後可再答三題；三題全對必定降服，答錯一題則本次降服失敗，已取得的戰鬥獎勵仍保留。戰鬥失敗不發完成星星、券或降服獎勵；已答對的星幣保留。
                      一張券必得一張隨機夥伴卡，從自己的初始夥伴以外等機率抽取，可能重複；沒有扣星幣、保底次數或每日領卡上限。舊券、星幣、收藏與學習經驗保留；舊版本已結束的航程不補發新獎勵。
                    </p>
                    <p>
                      舊精熟點每滿 20 點補 10 星幣，僅轉換一次；不足 20 點的餘數保留在歷史成就，不另發幣。學習紀錄與解鎖保留，花星幣不扣成就或夥伴經驗。夥伴價格：
                      {Object.entries(PRICES)
                        .map(([r, n]) => `${r} ${n}`)
                        .join("、")}{" "}
                      星幣。原學院已解鎖的夥伴保留。
                    </p>
                    <p>
                      交換限同一家庭帳號的航海員，可跨裝置確認。雙人對戰仍是同機輪流的練習，不發放雲端獎勵。收藏排行是家庭內的收藏比較，包含標示為歷史的舊收藏。
                    </p>
                    <p>
                      帳號、加密處理的密碼與遊戲進度儲存在雲端。沒有付款或聊天；同一家庭帳號的使用者可以切換航海員。請由家長保管密碼與復原碼。
                    </p>
                    <a
                      href="/garden/credits/tones.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      語音來源
                    </a>
                  </section>
                  <section className="f-panel">
                    <h2>最近的交換與星願</h2>
                    {family.log.length ? (
                      <ul className="ledger">
                        {family.log.slice(0, 12).map((x) => (
                          <li key={x.id}>{x.text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>還沒有紀錄。</p>
                    )}
                  </section>
                </div>
              </>
            )}
          </main>
          <footer className="family-footer">
            <div className="family-footer-brand"><BrandLogo variant="footer" /><span>{player.name}</span></div>
            <span>學習點數不扣除，休息後再一起出發。</span>
          </footer>
          {islandChoice && <Dialog title="前往另一座島" close={() => { if (!busy) setIslandChoice(null); }}>
            <p>{label(`目的地：${islandChoice.target === "island" ? "動手玩數學" : COURSES[grade].find(c => c.id === islandChoice.target)?.name ?? "學習島"}`)}</p>
            {islandEntry(islandChoice.target, run, p.mathIsland?.run) === "reward" ? <>
              <p>{label("這一趟已完成，先領好獎勵，再選島出發。")}</p>
              <button className="f-primary" disabled={busy || !cloud.online} onClick={() => navigate("learn")}>{label("先領取獎勵")}</button>
            </> : islandEntry(islandChoice.target, run, p.mathIsland?.run) === "math-result" ? <>
              <p>{label("數學島這一關已結束，先查看結果，完成結算後再出發。")}</p>
              <button className="f-primary" disabled={busy || !cloud.online} onClick={() => navigate("island")}>{label("查看數學島結果")}</button>
            </> : <>
              <p>{label(run?.status === "failed" && run.remediation?.receipt === null ? "還有錯題待補練。換島會略過這次補練，已獲得的獎勵保留，尚未領取的補練獎勵不會發放。" : "目前還有挑戰在進行。換島會結束這一趟，已獲得的點數與經驗保留；本趟題目不能繼續，也不會獲得通關獎勵。")}</p>
              <div className="island-switch-actions">
                <button className="f-primary" disabled={busy || !cloud.online} onClick={() => navigate(unfinishedJourney(run) ? "learn" : "island")}>{label("繼續原來的挑戰")}</button>
                <button disabled={busy || !cloud.online} onClick={() => void switchIsland()}>{label("結束本趟並換島")}</button>
              </div>
            </>}
          </Dialog>}
          {coursePicker && <Dialog title="選擇學習科目" close={() => { setCoursePicker(false); requestAnimationFrame(() => harborStart.current?.focus({ preventScroll: true })); }}>
            {notice && <p role="alert">{notice}</p>}
            {unfinishedJourney(run) && <button className="f-primary" disabled={!cloud.online || busy} onClick={() => navigate("learn")}>{label(run?.reward === "pending" ? "領取完成獎勵" : run?.status === "failed" ? "錯題待補練" : "繼續原來的挑戰")}</button>}
              <p>{label("今天想學什麼？選一科，和夥伴一起出發。")}</p>
              <div className="course-picker-grid">
                <button className="course-picker-card" aria-label="去數學島" disabled={!cloud.online || busy} onClick={()=>selectIsland("island")}><span aria-hidden="true">🏝️</span><strong>數學島</strong><small>看示範、動手玩、挑戰神獸</small></button>
                {COURSES[grade].map(course => <button key={course.id} className="course-picker-card" aria-label={`開始${course.name}`} disabled={!cloud.online || busy} onClick={() => selectIsland(course.id)}>
                  <span aria-hidden="true">{course.icon}</span><strong>{label(course.name, course.zy)}</strong><small>{label(course.description)}</small>
                </button>)}
              </div>
              {!cloud.online && <p role="status">{label("目前離線，連線後就能開始學習。")}</p>}
          </Dialog>}
          {chooser && (
            <Dialog title="切換航海員" close={() => setChooser(false)}>
              {profileChoices}
            </Dialog>
          )}
          {pickedPet && (
            <Dialog title={pickedPet.name} close={() => setPetDetail(null)}>
              <div className="pet-detail">
                <div className="collectible-card detail-card">
                  <CardFace
                    pet={pickedPet}
                    copies={p.owned[pickedPet.id] ?? 0}
                    level={creatureProgress(pickedPet.rarity, p.growth.xp[pickedPet.id] ?? 0).level}
                  />
                </div>
                <div className="pet-detail-copy">
                  <CreatureSheet pet={pickedPet} level={creatureProgress(pickedPet.rarity, p.growth.xp[pickedPet.id] ?? 0).level} />
                  <p>{pickedPet.story}</p>
                  {pickedPet.series && <p>{pickedPet.series} · {pickedPet.role} · {pickedPet.personality}</p>}
                  <ElementGuide element={petElement(pickedPet.id)} reduced={battleReducedMotion} />
                  <GrowthMeter rarity={pickedPet.rarity} xp={p.growth.xp[pickedPet.id] ?? 0} />
                  <p>成長跟著你與這種夥伴保存；重複卡共用等級，交換不會轉移經驗值。</p>
                  <p>
                    🃏 {p.owned[pickedPet.id] ?? 0} 張 · ♊{" "}
                    {Math.max(0, (p.owned[pickedPet.id] ?? 0) - 1)} 張重複
                  </p>
                  <div className="pet-detail-actions">
                    {p.owned[pickedPet.id] > 1 && (
                      <button
                        onClick={() => {
                          setGive(pickedPet.id);
                          setReceive("");
                          setPetDetail(null);
                          navigate("trade");
                        }}
                      >
                        🤝 {label("拿重複卡去交換")}
                      </button>
                    )}
                    <ReadAloud grade={readingGrade}><button data-read-aloud
                      aria-label={`聽${pickedPet.name}的技能說明`}
                      onClick={() =>
                        speak(
                          `${pickedPet.name}。${petSkillName(pickedPet.id)}。${petSkillDescription(pickedPet.id)}`,
                          setNotice,
                        )
                      }
                    >
                      🔊
                    </button></ReadAloud>
                    {p.owned[pickedPet.id] ? (
                      <button
                        className="f-primary"
                        disabled={
                          !cloud.online || busy || p.equipped === pickedPet.id
                        }
                        onClick={async () => {
                          await change({
                            type: "equip",
                            player: id,
                            pet: pickedPet.id,
                          });
                          setPetDetail(null);
                        }}
                      >
                        ✓ {label("一起出發", "ㄧˋ ㄑㄧˇ ㄔㄨ ㄈㄚ")}
                      </button>
                    ) : monsterById(pickedPet.id) ? <p>完成航程後有機會降服這位夥伴。</p> : (
                      <button
                        className="f-primary"
                        disabled={
                          !cloud.online ||
                          busy ||
                          p.coins < PRICES[pickedPet.rarity]
                        }
                        onClick={() =>
                          change({ type: "buy", player: id, pet: pickedPet.id })
                        }
                      >
                        🟡 {PRICES[pickedPet.rarity]} ·{" "}
                        {label("邀請", "ㄧㄠ ㄑㄧㄥˇ")}
                      </button>
                    )}
                  </div>
                  <p className="fine-print">
                    稀有度與等級會影響生命、攻擊及防禦；每次升級都能變強。
                  </p>
                </div>
              </div>
            </Dialog>
          )}
          {page === "battle" && battle?.quiz && battleQuestion && (
            <Dialog title="答題助戰" close={dismissBattleQuestion}>
              <div className="battle-question">
                <p className="learning-origin">
                  <span className="learning-origin-copy">{grade === 1
                    ? battle.quiz.review
                      ? "🔁 👂 💙"
                      : "✨ 🧩"
                    : label(
                        battle.quiz.review
                          ? "複習助戰 · 鞏固熟悉的能力"
                          : "新題助戰 · 與闖關共用學習紀錄",
                      )}</span>
                </p>
                <p>
                  📚 {battle.quizUsed.length} / 3 · {grade} 年級 ·{" "}
                  {SKILLS[petSkill(battle.teams[0][battle.active[0]].pet)].icon}
                </p>
                <h3>
                  {grade === 1 && battleQuestion.course === "words"
                    ? "👂 → 🖼️ → ✨"
                    : <QuestionPrompt question={battleQuestion} grade={grade} />}
                </h3>
                <p>
                  ✨{" "}
                  {
                    BATTLE_BUFFS[
                      petSkill(battle.teams[0][battle.active[0]].pet)
                    ].description
                  }
                </p>
                {battleAudioError && <p role="alert">{battleAudioError}</p>}
                <QuestionFigure question={battleQuestion} onReady={battleFigure.onReady} />
                {battleQuestion.visual && (
                  <p className="math-visual">{battleQuestion.visual}</p>
                )}
                <ReadAloud grade={readingGrade}><button data-read-aloud
                  className="listen-orb"
                  aria-label="播放助戰題目"
                  onClick={() => {
                    setBattleAudioError("");
                    if (battleQuestion.audio)
                      playRecording(
                        battleQuestion.audio,
                        battleQuestion.end,
                        () => setBattleHeard(battleQuestion.id),
                        setBattleAudioError,
                      );
                    else
                      speak(
                        questionSpeech({ ...battleQuestion, grade }),
                        setBattleAudioError,
                        battleQuestion.course === "english" ? "en-US" : "zh-TW",
                      );
                  }}
                >
                  👂 {label("聽題目")}
                  {battleHeard === battleQuestion.id && " ✓"}
                </button></ReadAloud>
                {!!battleQuestion.audio &&
                  battleHeard !== battleQuestion.id && (
                    <p>👂 {label("聽完再選")}</p>
                  )}
                <div className={`answer-grid picture-options ${canListenToEnglishChoices(grade,battleQuestion) ? "with-choice-audio" : ""}`}>
                  {battleQuestion.options.map((option, i) => (
                    <AnswerOption
                      key={i}
                      label={
                        grade === 1 && battleQuestion.course === "words"
                          ? `助戰圖片 ${i + 1}`
                          : `助戰選擇 ${option.text}`
                      }
                      disabled={
                        !battleFigure.ready || battle.quiz!.correct !== null ||
                        (!!battleQuestion.audio &&
                          battleHeard !== battleQuestion.id)
                      }
                      className={
                        battle.quiz!.correct !== null &&
                        i === battleQuestion.answer
                          ? "correct"
                          : battle.quiz!.choice === i
                            ? "was-wrong"
                            : ""
                      }
                      onAnswer={() => answerBattleQuestion(i)}
                      listening={canListenToEnglishChoices(grade,battleQuestion) ? { text:option.text, disabled:busy || battle.quiz!.correct!==null,
                        play:()=>{ if (!pending.current && !battleQuizLock.current && battle.quiz!.correct===null) { setBattleAudioError(""); speak(option.text,()=>setBattleAudioError("英文發音暫時不能播放。請找大人幫忙，或先關閉助戰。"),"en-US"); } }, stop:stopVoice } : undefined}
                    >
                      <ChoiceView
                        choice={option}
                        hideReadingHints={battleQuestion.hideReadingHints}
                        grade={grade}
                        pictureOnly={
                          grade === 1 && battleQuestion.course === "words"
                        }
                      />
                    </AnswerOption>
                  ))}
                </div>
                {battle.quiz.correct !== null && (
                  <div className="battle-quiz-result" role="status">
                    <h3>
                      {battle.quiz.correct ? "✨ ✓" : "💙 👂"}{" "}
                      {label(
                        battle.quiz.correct
                          ? "獲得技能加成"
                          : "這次沒有加成，不扣體力",
                      )}
                    </h3>
                    {(grade !== 1 || battleQuestion.course === "english") && <p>{battleQuestion.explanation}</p>}
                    {battleQuestion.course === "english" && battleQuestion.answer !== undefined && <ReadAloud grade={readingGrade}><button data-read-aloud aria-label="聽助戰英文發音" onClick={() => speak(englishAnswerSpeech(battleQuestion.options[battleQuestion.answer!].text), setNotice, "en-US")}>🔊 聽正確發音</button></ReadAloud>}
                    <ReadAloud grade={readingGrade}><button data-read-aloud
                      aria-label="聽助戰結果"
                      onClick={() =>
                        speak(
                          `${battle.quiz!.correct ? BATTLE_BUFFS[petSkill(battle.teams[0][battle.active[0]].pet)].description : "這次沒有加成，不扣體力。"}${battleQuestion.explanation}`,
                          setNotice,
                        )
                      }
                    >
                      🔊
                    </button></ReadAloud>
                  </div>
                )}
                <p className="fine-print">
                  關閉題目也會使用本次機會，不消耗戰鬥回合。
                </p>
                <button className="f-primary" onClick={dismissBattleQuestion}>
                  ➜ {label("回到戰鬥")}
                </button>
              </div>
            </Dialog>
          )}
          {page === "battle" && handoff && battle && battle.winner === null && (
            <Dialog
              title={`換 ${battle.turn === 0 ? player.name : PLAYERS.find((x) => x.id === opponent)!.name} 操作`}
              close={() => setHandoff(false)}
            >
              <p>👥 把裝置交給對方，再選擇招式。</p>
              <button
                className="f-primary"
                onClick={() => {
                  setHandoff(false);
                  say("輪到你了！選擇一個招式。");
                }}
              >
                ✓ {label("準備好了", "ㄓㄨㄣˇ ㄅㄟˋ ㄏㄠˇ ˙ㄌㄜ")}
              </button>
            </Dialog>
          )}
          {leave && (
            <Dialog title="要結束這次冒險嗎？" close={() => setLeave(null)}>
              <p>已獲得的學習成果會保留，未完成的對戰或航程將結束。</p>
              <button onClick={() => setLeave(null)}>▶ 繼續</button>
              <button
                onClick={() => {
                  leave();
                  setLeave(null);
                }}
              >
                ⏹ 結束
              </button>
            </Dialog>
          )}
        </div>,
        readingGrade,
      )}
    </ReadingContext.Provider>
  );
}
function PetPicker({
  pets,
  selected,
  onSelect,
  counts,
  growth = {},
}: {
  growth?: Record<string, number>;
  pets: Character[];
  counts?: Record<string, number>;
  selected: string[];
  onSelect: (id: string) => void;
}) {
  const { grade } = useContext(ReadingContext);
  return annotateTree(
    <div className="pet-picker">
      {pets.map((c) => (
        <button
          aria-pressed={selected.includes(c.id)}
          key={c.id}
          onClick={() => onSelect(c.id)}
        >
          <img src={c.image} alt="" loading="lazy" />
          <CreatureBadge rarity={c.rarity} level={creatureProgress(c.rarity, growth[c.id] ?? 0).level} />
          <span>{grade === 2 ? <AutoRuby text={c.name} /> : c.name}</span>
          <small>
            {ELEMENTS[petElement(c.id)].icon} {ELEMENTS[petElement(c.id)].name} {SKILLS[petSkill(c.id)].icon}
          </small>
          {counts && <strong>× {counts[c.id] ?? 0}</strong>}
          {selected.includes(c.id) && <b className="pet-picker-selected">✓</b>}
        </button>
      ))}
    </div>, grade
  );
}

function CardFace({
  pet,
  copies,
  equipped = false,
  level = 1,
}: {
  pet: Character;
  copies: number;
  equipped?: boolean;
  level?: number;
}) {
  const { grade } = useContext(ReadingContext);
  return annotateTree(
    <div className={`card-face ${copies ? "" : "uncollected"}`}>
      <div className="card-head">
        <small>夥伴</small>
        <span>#{String(pet.catalogNumber).padStart(3, "0")}</span>
        <strong>{copies ? `× ${copies}` : "🔒"}</strong>
      </div>
      <CreatureBadge rarity={pet.rarity} level={level} />
      <Art pet={pet} />
      <div className="card-caption">
        <h2>{pet.name}</h2>
        <span>
          {ELEMENTS[petElement(pet.id)].icon} {ELEMENTS[petElement(pet.id)].name} {SKILLS[petSkill(pet.id)].icon}{" "}
          {petSkillName(pet.id)}
        </span>
        <small>
          {equipped
            ? "✓ 同行中"
            : copies > 1
              ? `♊ ${copies - 1} 張可留作交換`
              : copies
                ? "✓ 已收藏"
                : monsterById(pet.id) ? "航程降服獲得" : `🟡 ${PRICES[pet.rarity]}`}
        </small>
      </div>
    </div>,
    grade,
  );
}
