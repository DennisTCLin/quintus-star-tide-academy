import { chooseRarity, DRAW_WEIGHTS, STAR_TICKET_WEIGHTS } from "./rarity-odds";
import { NEW_COMPANIONS } from "./companions-wave-two";
import { MONSTER_COMPANIONS, monsterById } from "./monsters";
import { combatStats, nativeCombatStats, baseDamage, type CombatStats } from "./creature-rules";
import { creatureProgress } from "./companion-growth";
import { initialCompanion, needsOnboarding } from "./starter";
import { ELEMENTS, ELEMENT_RULES, GENERATION_RULES, GENERATION_HEAL, elementIndex, hasElementAdvantage, hasElementGeneration, type ElementName } from "./elements";
export { ELEMENTS, ELEMENT_RULES } from "./elements";
import type { LearningQuestion } from "./learning";
import { CHARACTERS, type Character } from "./characters";
import type { Family, Profile } from "./adventure";
export type { Family, Profile, Run, Trade, DrawResult } from "./adventure";
const integer = (x: unknown, max = 10_000_000): x is number =>
  Number.isSafeInteger(x) && Number(x) >= 0 && Number(x) <= max;
function requireValue(ok: unknown, message = "操作無效"): asserts ok {
  if (!ok) throw Error(message);
}
export const FAMILY_KEY = "star-tide.family.v1";
export const PLAYERS = [
  { id: "quintus", name: "Quintus", grade: 4, icon: "🧭" },
  { id: "feifei", name: "斐斐", grade: 2, icon: "🐬" },
  { id: "qingqing", name: "晴晴", grade: 1, icon: "🐚" },
  { id: "doudou", name: "荳荳", grade: 1, icon: "🌸" },
  { id: "jay", name: "Jay", grade: 5, icon: "🦅" },
  { id: "alston", name: "Alston", grade: 6, icon: "🦉" },
] as const;
export type PlayerId = (typeof PLAYERS)[number]["id"];
export const GARDEN_PETS = [
  "maltese",
  "pig",
  "otter",
  "fox",
  "rabbit",
] as const;
const gardenElements: Record<(typeof GARDEN_PETS)[number], ElementName> = {
  maltese: "金", pig: "土", otter: "水", fox: "火", rabbit: "木",
};
const petNames = ["棉花糖", "奶茶", "浪花", "芒果", "月亮"];
export const BASE_ROSTER: Character[] = [
  ...CHARACTERS,
  ...GARDEN_PETS.map((id, i) => ({
    id,
    name: petNames[i],
    nameEn: id,
    rarity: "E" as const,
    catalogNumber: 51 + i,
    unlockAt: 0,
    image: `/garden/companions/${id}.webp`,
    alt: petNames[i],
    title: "聲音海圖的老朋友",
    element: gardenElements[id],
    personality: "溫柔",
    story: "從注音航海團一起來到星潮學院，繼續陪你探索。",
    artBrief: "原注音航海團夥伴",
    palette: "",
    tags: ["注音航海團"],
  })),
  ...NEW_COMPANIONS,
];
export const ROSTER: Character[] = [...BASE_ROSTER, ...MONSTER_COMPANIONS];
const companionsById = new Map(ROSTER.map(pet => [pet.id, pet]));
export const companionDrawPool = (profile: Pick<Profile, "onboarding">) => BASE_ROSTER.filter(pet => pet.id !== initialCompanion(profile));
export function chooseCompanionDraw(profile: Pick<Profile, "onboarding">, roll: number, pick: number, starTicket = false): Character {
  if (!Number.isFinite(pick) || pick < 0 || pick >= 1) throw Error("抽選亂數無效");
  const pool = companionDrawPool(profile);
  const rarity = chooseRarity(pool, starTicket ? STAR_TICKET_WEIGHTS : DRAW_WEIGHTS, roll);
  const tier = pool.filter(pet => pet.rarity === rarity);
  return tier[Math.floor(pick * tier.length)];
}
export const petById = (id: string) => companionsById.get(id);
export const PRICES = {
  E: 300,
  D: 600,
  C: 1000,
  B: 1600,
  A: 2400,
  S: 3600,
  SS: 5000,
  SSS: 8000,
};
export type Skill = "focus" | "shield" | "spark";
export function petSkill(id: string): Skill {
  const assigned = petById(id)?.supportType;
  if (assigned) return assigned;
  const monster = monsterById(id);
  if (monster) return (["focus", "shield", "spark"] as const)[monster.family % 3];
  return (["focus", "shield", "spark"] as const)[
    (petById(id)?.catalogNumber ?? 1) % 3
  ];
}
export function petElement(id: string) {
  return elementIndex(petById(id)?.element ?? "水");
}
export const SKILLS = {
  focus: {
    name: "聚光",
    zy: "ㄐㄩˋ ㄍㄨㄤ",
    icon: "🔎",
    description: "每航程排除一個錯誤選項；對戰攻擊 +3。",
  },
  shield: {
    name: "護盾",
    zy: "ㄏㄨˋ ㄉㄨㄣˋ",
    icon: "🛡️",
    description: "每航程展開分步提示；對戰首次受擊減少 8。",
  },
  spark: {
    name: "星火",
    zy: "ㄒㄧㄥ ㄏㄨㄛˇ",
    icon: "✨",
    description: "有效通關多 5 星幣；對戰回復技能多回 5。",
  },
};
export const petSkillName = (id: string) => petById(id)?.signatureMove ?? monsterById(id)?.move ?? SKILLS[petSkill(id)].name;
export const petSkillDescription = (id: string) => SKILLS[petSkill(id)].description;
export type Fighter = {
  stats?: CombatStats;
  pet: string;
  hp: number;
  energy: number;
  guard: boolean;
  shieldUsed: boolean;
  buff: { skill: Skill; turns: number } | null;
};
export const fighterMaxHp = (fighter: Fighter) => fighter.stats?.hp ?? 100;
export const BATTLE_BUFFS = {
  focus: {
    name: "聚光強攻",
    description: "下一次攻擊或絕招增加 12 傷害。",
    icon: "🎯",
  },
  shield: {
    name: "知識護盾",
    description: "下一次受到攻擊減少 12 傷害。",
    icon: "🛡️",
  },
  spark: {
    name: "星火復甦",
    description: "下一次回復額外增加 20 體力。",
    icon: "💚",
  },
};
export type BattleEvent = {
  id: string;
  actor: 0 | 1;
  source: string;
  target: string;
  targetSide: 0 | 1;
  kind: "attack" | "burst" | "guard" | "heal" | "swap" | "buff";
  skill: Skill;
  element: number;
  amount: number;
  shielded: boolean;
  targetHp: number;
  targetFighter: Fighter;
  knockout: boolean;
  message: string;
};
export type BattleQuiz = {
  learningToken?: string;
  review?: boolean;
  question: string;
  round: number;
  choice: number | null;
  correct: boolean | null;
};
export type Battle = {
  teams: [Fighter[], Fighter[]];
  active: [number, number];
  turn: 0 | 1;
  round: number;
  mode: "cpu" | "duo";
  winner: 0 | 1 | "draw" | null;
  log: string[];
  event: BattleEvent | null;
  quiz: BattleQuiz | null;
  quizUsed: string[];
  lastQuizRound: number;
};
export type BattleMove =
  | "attack"
  | "burst"
  | "guard"
  | "heal"
  | `swap:${number}`;
/** CPU uses a nearby native power tier and the selected partner's earned practice.
 * This is visible in its actual stats; player-v-player strengths are never normalized. */
export function chooseCpuTeam(left: string[], growth: Record<string, number>) {
  const selected = new Set(left), team: string[] = [], cpuGrowth: Record<string, number> = {};
  const power = (pet: Character, xp: number) => {
    const s = nativeCombatStats(pet.rarity, creatureProgress(pet.rarity, xp).level);
    return s.hp + s.attack * 4 + s.defense * 2;
  };
  for (const id of left) {
    const pet = petById(id);
    if (!pet) throw Error("操作無效");
    const xp = growth[id] ?? 0, target = power(pet, xp);
    const match = ROSTER.filter(c => !selected.has(c.id)).sort((a, b) => Math.abs(power(a, xp) - target) - Math.abs(power(b, xp) - target) || a.catalogNumber - b.catalogNumber)[0];
    if (!match) throw Error("操作無效");
    selected.add(match.id); team.push(match.id); cpuGrowth[match.id] = xp;
  }
  return { team, growth: cpuGrowth };
}
export function newBattle(
  left: string[],
  right: string[],
  mode: "cpu" | "duo",
  growth: [Record<string, number>, Record<string, number>] = [{}, {}],
): Battle {
  requireValue(
    left.length > 0 &&
      left.length <= 3 &&
      right.length === left.length &&
      [left, right].every(
        (t) => new Set(t).size === t.length && t.every((id) => petById(id)),
      ),
    "雙方隊伍人數必須相同",
  );
  return {
    teams: [
      left.map((pet) => ({
        pet,
        stats: nativeCombatStats(petById(pet)!.rarity, creatureProgress(petById(pet)!.rarity, growth[0][pet] ?? 0).level),
        hp: nativeCombatStats(petById(pet)!.rarity, creatureProgress(petById(pet)!.rarity, growth[0][pet] ?? 0).level).hp,
        energy: 0,
        guard: false,
        shieldUsed: false,
        buff: null,
      })),
      right.map((pet) => ({
        pet,
        stats: nativeCombatStats(petById(pet)!.rarity, creatureProgress(petById(pet)!.rarity, growth[1][pet] ?? 0).level),
        hp: nativeCombatStats(petById(pet)!.rarity, creatureProgress(petById(pet)!.rarity, growth[1][pet] ?? 0).level).hp,
        energy: 0,
        guard: false,
        shieldUsed: false,
        buff: null,
      })),
    ],
    active: [0, 0],
    turn: 0,
    round: 1,
    mode,
    event: null,
    quiz: null,
    quizUsed: [],
    lastQuizRound: 0,
    winner: null,
    log: [
      `雙方依夥伴等級與能力出戰，五行相生：${GENERATION_RULES}。相生接力回復最多 ${GENERATION_HEAL} 體力。`,
      `五行相剋：${ELEMENT_RULES}。屬性有利時，傷害 +8。`,
    ],
  };
}
export function battleMove(b: Battle, move: BattleMove): Battle {
  requireValue(b.winner === null, "對戰已結束");
  requireValue(!b.quiz, "請先完成或關閉助戰題目");
  const n = structuredClone(b),
    side = n.turn,
    other = side === 0 ? 1 : 0;
  let a = n.teams[side][n.active[side]];
  const d = n.teams[other][n.active[other]];
  const event: BattleEvent = {
    id: `move-${b.round}`,
    actor: side,
    source: a.pet,
    target: d.pet,
    targetSide: other,
    kind: move.startsWith("swap:") ? "swap" : (move as BattleEvent["kind"]),
    skill: petSkill(a.pet),
    element: petElement(a.pet),
    amount: 0,
    shielded: false,
    targetHp: d.hp,
    targetFighter: structuredClone(d),
    knockout: false,
    message: "",
  };
  a.guard = false;
  let message = "";
  if (move.startsWith("swap:")) {
    const index = Number(move.split(":")[1]);
    requireValue(
      integer(index, n.teams[side].length - 1) &&
        index !== n.active[side] &&
        n.teams[side][index].hp > 0,
      "不能換到這隻夥伴",
    );
    n.active[side] = index;
    const incoming = n.teams[side][index];
    const generating = hasElementGeneration(petElement(a.pet), petElement(incoming.pet));
    const beforeHp = incoming.hp;
    if (generating) incoming.hp = Math.min(fighterMaxHp(incoming), incoming.hp + GENERATION_HEAL);
    event.amount = incoming.hp - beforeHp;
    event.targetSide = side;
    event.target = incoming.pet;
    event.targetHp = incoming.hp;
    message = `換上 ${petById(incoming.pet)!.name}${generating ? `，相生接力，${event.amount ? `回復 ${event.amount} 體力` : "體力已滿"}` : ""}`;
  } else if (move === "guard") {
    a.guard = true;
    a.energy = Math.min(3, a.energy + 1);
    event.targetSide = side;
    event.target = a.pet;
    event.targetHp = a.hp;
    message = "護盾展開，下次傷害減半";
  } else if (move === "heal") {
    requireValue(a.energy >= 2, "需要 2 能量");
    a.energy -= 2;
    const before = a.hp;
    const bonus = a.buff?.skill === "spark" ? 20 : 0;
    if (bonus) a.buff = null;
    a.hp = Math.min(
      fighterMaxHp(a),
      a.hp + 25 + (petSkill(a.pet) === "spark" ? 5 : 0) + bonus,
    );
    event.targetSide = side;
    event.target = a.pet;
    event.targetHp = a.hp;
    event.amount = a.hp - before;
    message = `回復 ${a.hp - before} 體力`;
  } else {
    requireValue(move === "attack" || move === "burst");
    if (move === "burst") requireValue(a.energy >= 2, "需要 2 能量");
    const ae = petElement(a.pet),
      de = petElement(d.pet),
      adv = hasElementAdvantage(ae, de);
    let damage =
      (a.stats ? baseDamage(a.stats, d.stats ?? combatStats("E", 1)) + (move === "burst" ? 12 : 0) : (move === "burst" ? 30 : 18)) +
      (adv ? 8 : 0) +
      (petSkill(a.pet) === "focus" ? 3 : 0);
    if (a.buff?.skill === "focus") {
      damage += 12;
      a.buff = null;
    }
    if (move === "burst") a.energy -= 2;
    else a.energy = Math.min(3, a.energy + 1);
    if (d.guard) {
      event.shielded = true;
      damage = Math.ceil(damage / 2);
      d.guard = false;
    }
    if (petSkill(d.pet) === "shield" && !d.shieldUsed) {
      damage = Math.max(1, damage - 8);
      d.shieldUsed = true;
      event.shielded = true;
    }
    if (d.buff?.skill === "shield") {
      damage = Math.max(0, damage - 12);
      d.buff = null;
      event.shielded = true;
    }
    const before = d.hp;
    d.hp = Math.max(0, d.hp - damage);
    event.amount = before - d.hp;
    event.targetHp = d.hp;
    event.knockout = d.hp === 0;
    message = `${move === "burst" ? `${petById(a.pet)?.signatureMove && petSkill(a.pet) === "focus" ? petSkillName(a.pet) : ELEMENTS[petElement(a.pet)].burst}` : "攻擊"}造成 ${event.amount} 傷害${adv ? "，屬性有利！" : ""}`;
  }
  for (const fighter of n.teams[side])
    if (fighter.buff && --fighter.buff.turns <= 0) fighter.buff = null;
  event.targetFighter = structuredClone(
    n.teams[event.targetSide].find((f) => f.pet === event.target)!,
  );
  event.message = `${petById(event.source)!.name} · ${message}`;
  n.event = event;
  n.log = [`${side === 0 ? "左方" : "右方"}：${message}`, ...n.log].slice(0, 8);
  if (!n.teams[other].some((x) => x.hp > 0)) n.winner = side;
  else if (d.hp === 0)
    n.active[other] = n.teams[other].findIndex((x) => x.hp > 0);
  if (n.round >= 60 && n.winner === null) {
    const sums = n.teams.map((t) => t.reduce((sum, f) => sum + f.hp, 0));
    n.winner = sums[0] === sums[1] ? "draw" : sums[0] > sums[1] ? 0 : 1;
  }
  n.round++;
  n.turn = other;
  return n;
}
export function cpuMove(b: Battle): BattleMove {
  const f = b.teams[b.turn][b.active[b.turn]];
  return f.energy >= 2
    ? f.hp <= fighterMaxHp(f) * .45
      ? "heal"
      : "burst"
    : b.round % 5 === 0
      ? "guard"
      : "attack";
}

// Unknown legacy dates stay null: an import must not invent today's progress.
export function taipeiDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join("-");
}
export function collectionWeekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
export function collectionStats(p: Profile) {
  const unique = Object.keys(p.owned).length;
  const total = Object.values(p.owned).reduce((a, b) => a + b, 0);
  return { unique, total, duplicates: total - unique };
}
export type RankingPeriod = "day" | "week" | "all";
export function collectionRanking(
  s: Family,
  period: RankingPeriod,
  today = taipeiDay(),
) {
  const start = period === "week" ? collectionWeekStart(today) : today;
  const rows = PLAYERS.map((player) => {
    const profile = s.profiles[player.id],
      stats = collectionStats(profile);
    const score =
      period === "all"
        ? stats.unique
        : Object.values(profile.firstAcquired).filter(
            (day) => day !== null && day >= start && day <= today,
          ).length;
    return { ...player, ...stats, score, rank: null as number | null };
  }).sort((a, b) => b.score - a.score);
  rows.forEach((row, i) => {
    row.rank = !row.score
      ? null
      : i > 0 && row.score === rows[i - 1].score
        ? rows[i - 1].rank
        : i + 1;
  });
  return rows;
}
export function tradeSuggestions(s: Family, from: PlayerId) {
  const offers: { to: PlayerId; give: string; receive: string }[] = [];
  for (const to of PLAYERS) {
    if (to.id === from || needsOnboarding(s.profiles[from]) || needsOnboarding(s.profiles[to.id])) continue;
    for (const give of Object.keys(s.profiles[from].owned)) {
      if (
        give === initialCompanion(s.profiles[from]) ||
        s.profiles[from].owned[give] < 2 ||
        s.profiles[to.id].owned[give]
      )
        continue;
      for (const receive of Object.keys(s.profiles[to.id].owned)) {
        if (
          receive === initialCompanion(s.profiles[to.id]) ||
          s.profiles[to.id].owned[receive] < 2 ||
          s.profiles[from].owned[receive]
        )
          continue;
        offers.push({ to: to.id, give, receive });
        if (offers.length === 6) return offers;
      }
    }
  }
  return offers;
}
export function canBattleQuiz(b: Battle): boolean {
  return (
    b.mode === "cpu" &&
    b.turn === 0 &&
    b.winner === null &&
    !b.quiz &&
    b.quizUsed.length < 3 &&
    b.lastQuizRound !== b.round &&
    !b.teams[0][b.active[0]].buff
  );
}
export function beginBattleQuiz(
  b: Battle,
  q: Pick<LearningQuestion, "id">,
): Battle {
  requireValue(canBattleQuiz(b), "這回合無法再答題助戰");
  const n = structuredClone(b);
  n.quiz = { question: q.id, round: b.round, choice: null, correct: null };
  n.quizUsed.push(q.id);
  n.lastQuizRound = b.round;
  return n;
}
export function answerBattleQuiz(
  b: Battle,
  q: Pick<LearningQuestion, "id" | "options"> &
    Partial<Pick<LearningQuestion, "answer">>,
  choice: number,
): Battle {
  const quiz = b.quiz;
  requireValue(
    b.mode === "cpu" &&
      b.turn === 0 &&
      b.winner === null &&
      quiz &&
      quiz.round === b.round &&
      quiz.question === q.id &&
      quiz.correct === null &&
      q &&
      integer(choice, q.options.length - 1),
    "助戰題目已改變或已作答",
  );
  const n = structuredClone(b),
    f = n.teams[0][n.active[0]];
  n.quiz!.choice = choice;
  n.quiz!.correct = choice === q.answer;
  if (n.quiz!.correct) {
    requireValue(!f.buff, "夥伴已經有助戰效果");
    f.buff = { skill: petSkill(f.pet), turns: 3 };
    const message = `${petById(f.pet)!.name}獲得${BATTLE_BUFFS[f.buff.skill].name}！`;
    n.event = {
      id: `buff-${b.round}`,
      actor: 0,
      source: f.pet,
      target: f.pet,
      targetSide: 0,
      kind: "buff",
      skill: f.buff.skill,
      element: petElement(f.pet),
      amount: 0,
      shielded: false,
      targetHp: f.hp,
      targetFighter: structuredClone(f),
      knockout: false,
      message,
    };
    n.log = [message, ...n.log].slice(0, 8);
  }
  return n;
}
export function closeBattleQuiz(b: Battle): Battle {
  const n = structuredClone(b);
  n.quiz = null;
  return n;
}
