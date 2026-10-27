import { createCaptureTrial, validateCaptureTrial, capturePending } from "./capture-trial";
import { freshMastered, hasMastered, markMastered } from "./mastered-questions";
import { routeForCourse } from "./subject-islands";
import { newChallenge, openChallenge, readingSeconds, challengeExpired, correctNeeded, validateChallenge, type TieredChallenge, type TimingMode } from "./tiered-challenge";
import { allocateAdventureQuestions, QuestionPoolExhausted, questionDifficulty } from "./learning-engine";
import { validateIsland, isIslandQuestion, type CloudIsland } from "./island/schema";
import { CHALLENGE_QUESTIONS, MAX_MISTAKES, mistakeCount } from "./challenge-rules";
import { encounterStats, sameStats, CAPTURE_RATES, validCaptureRate, type CaptureOutcome } from "./creature-rules";
import { validateHomeDecor, roomCount, type HomeDecor } from "./home-decoration";
import { awardLearningMaterials, validateLearningRewards, type LearningRewards, type RunMaterials } from "./learning-rewards";
import { validateTerritory, type Territory } from "./territory";
import { initialCompanion, needsOnboarding, isStarter, pickStarter, type Onboarding } from "./starter";
import { chooseMonster, monsterById, monsterEligible } from "./monsters";
import { QUESTION_XP, MAX_COMPANION_XP, growthProgress, legacyEncounter, type CompanionGrowth, type QuizEncounter } from "./companion-growth";
import {
  allocateQuestions,
  freshLearning,
  migrateLearning,
  validateLearning,
  recordLearning,
  type LearningState,
  type QuestionAllocation,
} from "./learning-engine";
import { CHARACTERS, DEFAULT_CHARACTER_ID, type Character } from "./characters";
import {
  createInitialState,
  loadMilestones,
  awardQuestion,
  completeVoyage,
  localDayKey,
  isLocalDayKey,
  type MilestoneState,
} from "./core";
import {
  COURSES,
  questionById,
  questionCapacity,
  selectQuestions,
  type Course,
  type Grade,
} from "./learning";
import { validateSave } from "./vendor/garden/engine.js";
import {
  PLAYERS,
  ROSTER,
  chooseCompanionDraw,
  GARDEN_PETS,
  PRICES,
  petById,
  petSkill,
  taipeiDay,
  type PlayerId,
} from "./game-view";
export * from "./game-view";
import { rewardMessage } from "./reward-display";
export { rewardMessage } from "./reward-display";
export type RewardState = "none" | "pending" | "saved" | "exchanged" | "won" | "miss";
export const STARS_PER_TICKET = 2;
/** One-time historical compensation; mastery remains an unspent learning record. */
export type MasteryConversion = { version: 1; points: number; coins: number };
export const masteryConversion = (points: number): MasteryConversion => ({ version: 1, points, coins: Math.floor(points / 20) * 10 });
export type Remediation = { version: 1; coinTarget: number; xpTarget: number; corrected: number[]; receipt: { coins: number; xp: number; skipped: boolean } | null };
export type Run = {
  remediation?: Remediation;
  challenge?: TieredChallenge;
  /** Server-set first-answer ledger. Absent only on completed legacy voyages. */
  answers?: boolean[];
  materials?: RunMaterials;
  capture?: CaptureOutcome;
  captureRule?: "three-correct-v1";
  encounter: QuizEncounter;
  reward: RewardState;
  id: string;
  day: string;
  course: Course;
  questions: string[];
  index: number;
  streak: number;
  wrong: number[];
  settled: boolean;
  status: "active" | "won" | "failed";
  rewarded: number;
  points: number;
  practice: boolean;
  skillUsed: boolean;
  eliminated: number | null;
  companion: string;
  review: boolean[];
  assisted: boolean;
  learningEnabled: boolean;
};
export type Profile = {
  challengeTiming?: TimingMode;
  masteryConversion: MasteryConversion;
  mathIsland?: CloudIsland;
  homeDecor?: HomeDecor;
  captureQuota?: { day: string; attempts: number };
  learningRewards?: LearningRewards;
  territory?: Territory;
  lastDraw?: { ticketKind?: "star"; id: string; pet: string; duplicate: boolean; copies: number };
  lastMonsterVariant?: string;
  onboarding?: Onboarding;
  growth: CompanionGrowth;
  learning: LearningState;
  milestones: MilestoneState;
  coins: number;
  tickets: number;
  starTickets: number;
  rewardStars: number;
  rewardRounds: number;
  owned: Record<string, number>;
  firstAcquired: Record<string, string | null>;
  equipped: string;
  day: string;
  credited: string[];
  attempted: string[];
  draws: number;
  pity: number;
  run: Run | null;
  legacyGarden?: unknown;
  gardenImported: boolean;
};
export type Trade = {
  id: string;
  from: PlayerId;
  to: PlayerId;
  give: string;
  receive: string;
};
export type Family = {
  version: 9;
  revision: number;
  profiles: Record<PlayerId, Profile>;
  pendingTrade: Trade | null;
  log: { id: string; text: string; time: number }[];
};
const freshProfile = (): Profile => ({
  masteryConversion: masteryConversion(0),
  growth: { xp: {}, day: localDayKey(), credited: [] },
  learning: freshLearning(),
  milestones: createInitialState(),
  coins: 0,
  tickets: 0,
  starTickets: 0,
  rewardStars: 0,
  rewardRounds: 0,
  owned: { [DEFAULT_CHARACTER_ID]: 1 },
  firstAcquired: { [DEFAULT_CHARACTER_ID]: null },
  equipped: DEFAULT_CHARACTER_ID,
  day: localDayKey(),
  credited: [],
  attempted: [],
  draws: 0,
  pity: 0,
  run: null,
  gardenImported: false,
});
export function newFamily(
  legacy: string | null = null,
  equipped: string | null = null,
): Family {
  const profiles = Object.fromEntries(
    PLAYERS.map((p) => [p.id, freshProfile()]),
  ) as Record<PlayerId, Profile>;
  if (legacy) {
    const loaded = loadMilestones(legacy);
    if (loaded.recovered)
      throw Error("舊學院存檔無法讀取，原始資料已保留。請先匯出原始備份。");
    profiles.quintus.milestones = loaded.state;
    delete profiles.quintus.learning.mastered;
    reconcileMasteredQuestions(profiles.quintus, 4);
    profiles.quintus.masteryConversion = masteryConversion(loaded.state.masteryPoints);
    profiles.quintus.coins += profiles.quintus.masteryConversion.coins;
    for (const c of CHARACTERS)
      if (c.unlockAt <= loaded.state.masteryPoints)
        profiles.quintus.owned[c.id] = 1;
    if (
      equipped &&
      petById(equipped) &&
      Object.prototype.hasOwnProperty.call(profiles.quintus.owned, equipped) &&
      profiles.quintus.owned[equipped] > 0
    )
      profiles.quintus.equipped = equipped;
  }
  for (const id of Object.keys(profiles.quintus.owned))
    profiles.quintus.firstAcquired[id] = null;
  return { version: 9, revision: 0, profiles, pendingTrade: null, log: [] };
}
// Explicit opt-in: legacy factories/imports must never gain a new draw.
export function newOnboardingFamily(): Family {
  const family = newFamily();
  for (const p of Object.values(family.profiles)) p.onboarding = { pet: null, confirmed: false };
  return family;
}
export function drawStarter(s: Family, id: PlayerId, roll: number, pick: number): string {
  const p = s.profiles[id];
  requireValue(p.onboarding, "這位玩家已經有初始夥伴了");
  if (p.onboarding.pet) return p.onboarding.pet;
  requireValue(!p.run && Object.keys(p.owned).length === 1 && p.owned[DEFAULT_CHARACTER_ID] === 1, "新手航程已更新，請確認同步");
  const pet = pickStarter(roll, pick);
  // Replace only the provisional guide of an explicitly pending new profile.
  p.owned = { [pet.id]: 1 };
  p.firstAcquired = { [pet.id]: null };
  p.equipped = pet.id;
  p.onboarding = { pet: pet.id, confirmed: false };
  return pet.id;
}
export function confirmStarter(s: Family, id: PlayerId) {
  const p = s.profiles[id];
  requireValue(p.onboarding?.pet, "請先轉動新手扭蛋");
  p.onboarding.confirmed = true;
  return true;
}
const integer = (x: unknown, max = 10_000_000): x is number =>
  Number.isSafeInteger(x) && Number(x) >= 0 && Number(x) <= max;
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
function requireValue(
  ok: unknown,
  message = "備份格式不正確，沒有更動現有進度",
): asserts ok {
  if (!ok) throw Error(message);
}
export function validateFamily(value: unknown): Family {
  value = structuredClone(value);
  requireValue(
    record(value) &&
      ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(value.version)) && typeof value.version === "number") &&
      integer(value.revision) &&
      record(value.profiles),
  );
  const legacyCollection = Number(value.version) < 3;
  const sourceVersion = Number(value.version);
  // Only the three-player schema may initialize the newly added child.
  // Missing profiles in v2 indicate damage and must never silently erase progress.
  if (value.version === 1) {
    if (!Object.prototype.hasOwnProperty.call(value.profiles, "doudou"))
      value.profiles.doudou = freshProfile();
    value.version = 2;
  }
  if (sourceVersion < 8 && !Object.prototype.hasOwnProperty.call(value.profiles, "alston")) {
    value.profiles.alston = {...freshProfile(), onboarding: { pet: null, confirmed: false }};
  }
  if (sourceVersion < 9 && !Object.prototype.hasOwnProperty.call(value.profiles, "jay")) {
    value.profiles.jay = {...freshProfile(), onboarding: { pet: null, confirmed: false }};
  }
  value.version = 9;
  for (const player of PLAYERS) {
    const p = value.profiles[player.id];
    requireValue(record(p));
    if (p.challengeTiming !== undefined) requireValue(p.challengeTiming === "standard" || p.challengeTiming === "relaxed");
    if (p.starTickets === undefined) p.starTickets = 0;
    requireValue(integer(p.starTickets, 10000));
    if (sourceVersion < 6) delete p.captureQuota;
    if (p.captureQuota !== undefined) requireValue(record(p.captureQuota) && isLocalDayKey(p.captureQuota.day) && integer(p.captureQuota.attempts));
    if (p.mathIsland !== undefined) { validateIsland(p.mathIsland); if (p.mathIsland.run) { requireValue(petById(p.mathIsland.run.companion)); if(p.mathIsland.run.capture) validateCaptureTrial(p.mathIsland.run.capture, player.grade); } }
    if (p.learningRewards !== undefined) validateLearningRewards(p.learningRewards);
    if (p.territory !== undefined) validateTerritory(p.territory);
    if (p.homeDecor !== undefined) validateHomeDecor(p.homeDecor, roomCount(p.territory));
    if (p.lastMonsterVariant !== undefined) requireValue(monsterById(p.lastMonsterVariant));
    if (sourceVersion < 6) {
      p.growth = { xp: {}, day: p.day, credited: [] };
      if (record(p.run)) {
        p.run.encounter = legacyEncounter(String(p.run.id));
        delete p.run.capture;
      }
    }
    requireValue(record(p.growth) && record(p.growth.xp) && Object.keys(p.growth.xp).length <= ROSTER.length
      && Object.entries(p.growth.xp).every(([id, xp]) => petById(id) && integer(xp, MAX_COMPANION_XP))
      && isLocalDayKey(p.growth.day) && Array.isArray(p.growth.credited)
      && p.growth.credited.length <= questionCapacity(player.grade) + 5000
      && new Set(p.growth.credited).size === p.growth.credited.length
      && p.growth.credited.every(id => typeof id === "string" && (questionById(id)?.grade === player.grade || isIslandQuestion(id))));
    const hasLearning = Object.prototype.hasOwnProperty.call(p, "learning");
    const hasRewardData = "rewardStars" in p || "rewardRounds" in p || (record(p.run) && "reward" in p.run);
    if (sourceVersion === 4) requireValue(hasLearning || hasRewardData);
    const legacyRewards = sourceVersion < 4 || (sourceVersion === 4 && !hasRewardData);
    const legacyLearning = sourceVersion < 4 || (sourceVersion === 4 && !hasLearning);
    if (legacyRewards) {
      p.rewardStars = 0;
      p.rewardRounds = 0;
      if (record(p.run)) p.run.reward = "none";
    }
    requireValue(
      integer(p.coins, Number.MAX_SAFE_INTEGER) &&
        integer(p.tickets) &&
        integer(p.draws) &&
        integer(p.rewardStars, STARS_PER_TICKET - 1) &&
        integer(p.rewardRounds) &&
        integer(p.pity, 9) &&
        isLocalDayKey(p.day) &&
        typeof p.gardenImported === "boolean",
    );
    requireValue(
      record(p.owned) && Object.keys(p.owned).length <= ROSTER.length,
    );
    for (const [id, n] of Object.entries(p.owned))
      requireValue(petById(id) && integer(n, 10000) && n > 0);
    if (legacyCollection)
      p.firstAcquired = Object.fromEntries(
        Object.keys(p.owned).map((id) => [id, null]),
      );
    requireValue(
      record(p.firstAcquired) &&
        Object.keys(p.firstAcquired).length <= ROSTER.length,
    );
    for (const [id, day] of Object.entries(p.firstAcquired))
      requireValue(petById(id) && (day === null || isLocalDayKey(day)));
    requireValue(
      Object.keys(p.owned).every((id) =>
        Object.prototype.hasOwnProperty.call(p.firstAcquired, id),
      ),
    );
    if (p.onboarding !== undefined) {
      requireValue(record(p.onboarding) && typeof p.onboarding.confirmed === "boolean"
        && (p.onboarding.pet === null || (typeof p.onboarding.pet === "string" && isStarter(p.onboarding.pet)))
        && (!p.onboarding.confirmed || p.onboarding.pet !== null));
      if (p.onboarding.pet === null) requireValue(Object.keys(p.owned).length === 1 && p.owned[DEFAULT_CHARACTER_ID] === 1 && p.run === null);
    }
    if (p.lastDraw !== undefined) {
      requireValue(record(p.lastDraw) && typeof p.lastDraw.id === "string" && p.lastDraw.id.length > 0 && p.lastDraw.id.length <= 100
        && (p.lastDraw.ticketKind === undefined || p.lastDraw.ticketKind === "star")
        && typeof p.lastDraw.pet === "string" && petById(p.lastDraw.pet)
        && Object.prototype.hasOwnProperty.call(p.firstAcquired, p.lastDraw.pet)
        && typeof p.lastDraw.duplicate === "boolean" && integer(p.lastDraw.copies, 10000) && p.lastDraw.copies > 0);
    }
    const anchor = initialCompanion(p as unknown as Profile);
    requireValue(p.firstAcquired[anchor] === null);

    requireValue(
      p.owned[anchor] &&
        typeof p.equipped === "string" &&
        petById(p.equipped) &&
        Object.prototype.hasOwnProperty.call(p.owned, p.equipped) &&
        integer(p.owned[p.equipped], 10000) &&
        Number(p.owned[p.equipped]) > 0,
    );
    requireValue(
      Array.isArray(p.credited) &&
        p.credited.length <= questionCapacity(player.grade) + 5000 &&
        new Set(p.credited).size === p.credited.length &&
        p.credited.every(
          (id) =>
            typeof id === "string" && (questionById(id)?.grade === player.grade || isIslandQuestion(id)),
        ),
    );
    if (p.attempted === undefined) p.attempted = [...p.credited];
    requireValue(
      Array.isArray(p.attempted) &&
        p.attempted.length <= questionCapacity(player.grade) + 5000 &&
        new Set(p.attempted).size === p.attempted.length &&
        p.attempted.every(
          (id) =>
            typeof id === "string" && (questionById(id)?.grade === player.grade || isIslandQuestion(id)),
        ),
    );
    const m = loadMilestones(JSON.stringify(p.milestones));
    requireValue(!m.recovered && m.state.version === 3);
    p.milestones = m.state;
    // Pure deterministic migration on reads; the next successful cloud transaction
    // persists this snapshot with its balance. Never derive it from future earnings.
    if (sourceVersion < 7) {
      const conversion = masteryConversion(m.state.masteryPoints);
      p.coins = Number(p.coins) + conversion.coins;
      p.masteryConversion = conversion;
    }
    requireValue(record(p.masteryConversion) && p.masteryConversion.version === 1
      && integer(p.masteryConversion.points, m.state.masteryPoints)
      && p.masteryConversion.coins === masteryConversion(Number(p.masteryConversion.points)).coins
      && integer(p.coins, Number.MAX_SAFE_INTEGER));
    if (legacyLearning)
      p.learning = migrateLearning(
        [
          ...(p.attempted as string[]),
          ...(p.credited as string[]),
          ...Object.values(m.state.awardedByDay).flat(),
          ...(record(p.run) && Array.isArray(p.run.questions)
            ? p.run.questions.filter((x): x is string => typeof x === "string")
            : []),
        ],
        player.grade,
      );
    if (legacyLearning) delete (p.learning as LearningState).mastered;
    validateLearning(p.learning, player.grade);
    if (p.run !== null) {
      const r = p.run;
      requireValue(record(r) && record(r.encounter) && integer(r.encounter.monster, r.encounter.variant === undefined ? 2 : 1000)
        && integer(r.encounter.level, 1000) && Number(r.encounter.level) >= 1
        && integer(r.encounter.earned, CHALLENGE_QUESTIONS * QUESTION_XP));
      if (r.encounter.variant !== undefined) {
        const monster = monsterById(r.encounter.variant);
        requireValue(monster && monster.family === r.encounter.monster && monsterEligible(monster, Number(r.encounter.level)));
      }
      // Missing route means a historical voyage; never re-roll or retrofit it.
      if (r.encounter.route !== undefined) {
        const route = r.encounter.route;
        const expected = routeForCourse(player.grade, r.course as Course);
        const monster = monsterById(r.encounter.variant);
        requireValue(record(route) && Object.keys(route).length === 3 && route.version === 1
          && route.island === expected.island && route.element === expected.element
          && monster?.element === route.element && r.encounter.combat !== undefined);
      }
      if (r.materials !== undefined) {
        requireValue(record(r.materials) && Array.isArray(r.questions)
          && integer(r.materials.credited, r.questions.length)
          && integer(r.materials.packs, Math.ceil(r.questions.length / 5))
          && Number(r.materials.packs) <= Math.ceil(Number(r.materials.credited) / 5)
          && Number(r.materials.credited) <= Number(r.index) + (r.settled ? 1 : 0)
          && (!r.practice || r.materials.credited === 0));
      }
      requireValue(
        record(r) &&
          typeof r.id === "string" &&
          r.id.length < 100 &&
          isLocalDayKey(r.day) &&
          Array.isArray(r.questions) &&
          ((r.questions.length === CHALLENGE_QUESTIONS && Array.isArray(r.answers)) || (r.questions.length === 5 && r.answers === undefined)) &&
          new Set(r.questions).size === r.questions.length &&
          r.questions.every(
            (id) =>
              typeof id === "string" &&
              (questionById(id)?.grade === player.grade || (player.grade === 1 && isIslandQuestion(id))) &&
              questionById(id)?.course === r.course,
          ),
      );
      requireValue(
        integer(r.index, r.questions.length - 1) &&
          integer(r.streak, 3) &&
          integer(r.rewarded, r.questions.length) &&
          integer(r.points, r.questions.length * 20) &&
          typeof r.settled === "boolean" &&
          typeof r.practice === "boolean" &&
          typeof r.skillUsed === "boolean" &&
          ["none", "pending", "saved", "exchanged", "won", "miss"].includes(String(r.reward)) &&
          (r.reward === "none" || (r.status === "won" && !r.practice)) &&
          ["active", "won", "failed"].includes(String(r.status)) &&
          typeof r.companion === "string" &&
          petById(r.companion),
      );
      if (r.encounter.combat !== undefined) {
        const combat = r.encounter.combat, species = monsterById(r.encounter.variant);
        requireValue(record(combat) && (combat.version === 1 || combat.version === 2) && species
          && sameStats(combat.ally, encounterStats(combat.version as 1 | 2, petById(String(r.companion))!.rarity, Number(r.encounter.level)))
          && sameStats(combat.foe, encounterStats(combat.version as 1 | 2, species.rarity, Number(r.encounter.level))));
      }
      requireValue(r.captureRule === undefined || r.captureRule === "three-correct-v1");
      if (r.capture !== undefined) {
        validateCaptureTrial(r.capture as CaptureOutcome, player.grade, r.course as Course);
        requireValue((r.capture as CaptureOutcome).version!==3||r.captureRule==='three-correct-v1');
        const capture = r.capture, species = monsterById(r.encounter.variant);
        requireValue(record(capture) && species && capture.monster === species.id && validCaptureRate(capture, species.rarity)
          && r.status === "won" && r.index === r.questions.length - 1 && r.settled === true
          && ["pending", "joined", "duplicate", "escaped", "unavailable"].includes(String(capture.outcome)));
        if (capture.outcome === "joined" || capture.outcome === "duplicate") {
          requireValue(integer(capture.copies, 10000) && Number(capture.copies) > 0 && capture.reason === undefined
            && Object.prototype.hasOwnProperty.call(p.firstAcquired, species.id));
        } else if (capture.outcome === "unavailable") {
          requireValue(["practice", "old-day", "daily-limit", "legacy", "capacity"].includes(String(capture.reason)) && capture.copies === undefined);
        } else requireValue(capture.reason === undefined && capture.copies === undefined);
      }
      if (legacyLearning) {
        r.review = r.questions.map(() => false);
        r.assisted = !!r.skillUsed;
        r.learningEnabled = true;
      }
      requireValue(
        Array.isArray(r.review) &&
          r.review.length === r.questions.length &&
          r.review.every((x) => typeof x === "boolean") &&
          typeof r.assisted === "boolean" &&
          typeof r.learningEnabled === "boolean",
      );
      const q = questionById(r.questions[r.index as number] as string)!;
      requireValue(
        Array.isArray(r.wrong) &&
          new Set(r.wrong).size === r.wrong.length &&
          r.wrong.every(
            (i) => integer(i, q.options.length - 1) && i !== q.answer,
          ),
      );
      requireValue(
        r.eliminated === null ||
          (integer(r.eliminated, q.options.length - 1) &&
            r.eliminated !== q.answer),
      );
      requireValue(
        (r.status !== "failed" || r.streak === 3 || (!!r.challenge && r.index===r.questions.length-1 && r.settled)) &&
          (r.status !== "won" || (r.index === r.questions.length - 1 && r.settled)),
      );
      if (r.answers !== undefined) {
        requireValue(Array.isArray(r.answers) && r.answers.every(x => typeof x === "boolean")
          && r.answers.length === Number(r.index) + Number(r.settled));
        const errors = r.answers.filter(x => !x).length;
        if (r.materials !== undefined) requireValue(record(r.materials)
          && Number(r.materials.credited) <= r.answers.filter(Boolean).length);
        if(r.challenge !== undefined) {
          requireValue(record(r.encounter.combat) && r.encounter.combat.version===2 && record(r.challenge));
          validateChallenge(r.challenge as unknown as TieredChallenge,Number((r.encounter.combat as any).foe.level),player.grade,Number(r.index),r.answers as boolean[]);
          requireValue((r.challenge as any).difficultyLevels.every((n:number,i:number)=>n===questionDifficulty(questionById((r.questions as string[])[i])!)));
        }
        const required=correctNeeded(r.challenge as TieredChallenge|undefined);
        const accuracyFailure=!!r.challenge && r.answers.length===CHALLENGE_QUESTIONS && r.answers.filter(Boolean).length<required;
        requireValue(errors <= MAX_MISTAKES && r.streak === errors
          && Number(r.rewarded) <= r.answers.filter(Boolean).length
          && (r.status === "failed" ? r.settled && ((errors === MAX_MISTAKES && r.answers.at(-1) === false) || accuracyFailure)
            : errors < MAX_MISTAKES && (r.status === "won" ? r.answers.length === CHALLENGE_QUESTIONS && r.answers.filter(Boolean).length>=required
              : r.answers.length < CHALLENGE_QUESTIONS))
          && (r.settled ? r.wrong.length === (r.answers.at(-1) || (r.challenge as TieredChallenge|undefined)?.timeouts.includes(Number(r.index)) ? 0 : 1) : r.wrong.length === 0));
      } else if (r.status === "active") {
        // Upgrade an unfinished five-question voyage once, keeping already earned
        // progress and the original questions. Past corrected answers stay earned.
        // The deterministic allocator advances only the cloned learning state.
        const run = r as unknown as Run;
        run.answers = Array(run.index).fill(true);
        if (run.settled) run.answers.push(true);
        else if (run.wrong.length) {
          run.answers.push(false);
          run.settled = true;
          run.wrong = run.wrong.slice(0, 1);
        }
        if (run.settled && run.answers.at(-1)) run.wrong = [];
        run.streak = mistakeCount(run);
        let extra: QuestionAllocation | undefined;
        if (!COURSES[player.grade].some(course => course.id === run.course)) {
          // Retired courses remain resumable, but cannot be newly selected.
          const id = selectQuestions(player.grade, run.course, run.questions, 0).find(id => !run.questions.includes(id));
          if (id) extra = { id, review: true };
        }
        for (let attempt = 0; !extra && attempt < questionCapacity(player.grade); attempt++) {
          const candidate = allocateQuestions(p.learning as LearningState, player.grade, run.course, 1)[0];
          if (!run.questions.includes(candidate.id)) { extra = candidate; break; }
        }
        requireValue(extra, "暫時沒有新的挑戰題目，原有進度已保留");
        run.questions.push(extra.id);
        run.review.push(extra.review);
      }
    }
    if (p.run && (p.run as Run).remediation !== undefined) {
      const r = p.run as Run, m = r.remediation!;
      requireValue(record(m) && m.version === 1 && integer(m.coinTarget, 30) && integer(m.xpTarget, 30)
        && Array.isArray(m.corrected) && new Set(m.corrected).size === m.corrected.length
        && m.corrected.every(i => integer(i, 5) && r.answers?.[i] === false)
        && (r.status !== "active" || m.corrected.length === 0)
        && (!r.practice || (m.coinTarget === 0 && m.xpTarget === 0)));
      if (m.receipt !== null) requireValue(record(m.receipt) && r.status === "failed"
        && integer(m.receipt.coins, m.coinTarget) && integer(m.receipt.xp, m.xpTarget)
        && typeof m.receipt.skipped === "boolean"
        && (m.receipt.skipped ? m.receipt.coins === 0 && m.receipt.xp === 0
          : m.corrected.length === r.answers?.filter(a => !a).length));
    }
    if (p.legacyGarden !== undefined) validateSave(p.legacyGarden);
    reconcileMasteredQuestions(p as Profile, player.grade);
  }
  requireValue(
    Array.isArray(value.log) &&
      value.log.length <= 100 &&
      value.log.every(
        (x) =>
          record(x) &&
          typeof x.id === "string" &&
          typeof x.text === "string" &&
          x.text.length < 500 &&
          integer(x.time, Number.MAX_SAFE_INTEGER),
      ),
  );
  if (value.pendingTrade !== null) {
    const t = value.pendingTrade;
    requireValue(
      record(t) &&
        typeof t.id === "string" &&
        PLAYERS.some((p) => p.id === t.from) &&
        PLAYERS.some((p) => p.id === t.to) &&
        t.from !== t.to &&
        typeof t.give === "string" &&
        petById(t.give) &&
        typeof t.receive === "string" &&
        petById(t.receive) &&
        t.give !== initialCompanion(value.profiles[t.from as PlayerId] as Profile) &&
        t.receive !== initialCompanion(value.profiles[t.to as PlayerId] as Profile),
    );
  }
  return structuredClone(value) as Family;
}
/** Backfill only explicit successes, never issuance or reward-reservation counters. */
export function reconcileMasteredQuestions(p: Profile, grade: Grade) {
  if (!p.learning.mastered) {
    p.learning.mastered = freshMastered();
    const run = p.run;
    const successes = [...Object.values(p.milestones.awardedByDay).flat(), ...p.credited,
      ...(run?.answers?.flatMap((correct,i) => correct ? [run.questions[i]] : []) ?? []),
      ...(run?.remediation?.corrected.map(i => run.questions[i]) ?? [])];
    for (const id of successes) if (questionById(id)?.grade === grade) markMastered(p.learning, id);
  }
  if (p.learning.pending && hasMastered(p.learning, p.learning.pending.question)) p.learning.pending = null;
  const run = p.run;
  if (!run || run.status !== 'active') return;
  // Retired grade-one listening courses remain playable only to finish old saves.
  if (!COURSES[grade].some(c => c.id === run.course)) return;
  for (let i = run.index + Number(run.settled); i < run.questions.length; i++) {
    if (!hasMastered(p.learning, run.questions[i])) continue;
    let replacement: QuestionAllocation;
    try {
      replacement = allocateQuestions(p.learning, grade, run.course, 1, run.challenge?.targetDifficulty,
        [...run.questions, ...(p.learning.pending ? [p.learning.pending.question] : [])])[0];
    } catch (error) {
      if (!(error instanceof QuestionPoolExhausted)) throw error;
      // A historical preallocated run can outlive its remaining question pool.
      // End that reservation without touching any already-earned balances/history.
      p.run = null;
      return;
    }
    run.questions[i] = replacement.id;
    run.review[i] = replacement.review;
    if (run.challenge) {
      run.challenge.difficultyLevels[i] = questionDifficulty(questionById(replacement.id)!);
      if (i === run.index) run.challenge.clock = null;
    }
    if (i === run.index) { run.wrong = []; run.eliminated = null; run.assisted = false; }
  }
}
function tick(p: Profile, day: string) {
  if (p.day !== day) {
    p.day = day;
    p.credited = (p.milestones.awardedByDay[day] ?? [])
      .filter((id) => questionById(id) || isIslandQuestion(id));
    p.attempted = [...p.credited];
    p.draws = 0;
    p.rewardRounds = 0;
  }
}
function log(s: Family, id: string, text: string) {
  s.log = [{ id, text, time: Date.now() }, ...s.log].slice(0, 100);
}
export function startRun(
  s: Family,
  id: PlayerId,
  course: Course,
  runId: string,
  seed: number,
  practice = false,
  day = localDayKey(),
  timing?: TimingMode,
) {
  const p = s.profiles[id];
  requireValue(!capturePending(p), "先完成或放棄這次降服挑戰，通關獎勵已保留");
  requireValue(!p.mathIsland?.run || p.mathIsland.run.completed, "先回數學島完成或結束目前這一關");
  requireValue(!p.run || p.run.status !== "active", "先完成或結束目前航程");
  requireValue(!p.run || p.run.status !== "active", "先完成或結束目前航程");
  requireValue(p.run?.reward !== "pending", "先選好這趟的獎勵，再開始下一趟");
  requireValue(!pendingRemediation(p.run), "先完成補練，或選擇略過這次補練");
  const grade = PLAYERS.find((x) => x.id === id)!.grade;
  const route = routeForCourse(grade, course);
  tick(p, day);
  const previousMonster = p.run?.encounter.monster ?? monsterById(p.lastMonsterVariant)?.family;
  const level = growthProgress(p.growth.xp[p.equipped] ?? 0).level;
  const monster = chooseMonster(level, seed, previousMonster, route.element);
  const combat = { version:2 as const, ally:encounterStats(2,petById(p.equipped)!.rarity,level), foe:encounterStats(2,monster.rarity,level) };
  const challenge = timing !== undefined ? newChallenge(combat.foe.level,grade,practice?'relaxed':timing) : undefined;
  const allocated = allocateAdventureQuestions(p.learning,grade,course,CHALLENGE_QUESTIONS,challenge?.targetDifficulty, p.learning.pending ? [p.learning.pending.question] : []);
  if(challenge) challenge.difficultyLevels=allocated.map(q=>questionDifficulty(questionById(q.id)!));
  p.lastMonsterVariant = monster.id;
  p.run = {
    captureRule: "three-correct-v1",
    ...(challenge?{challenge}:{}),
    remediation: { version: 1,
      coinTarget: practice ? 0 : Math.floor(allocated.filter(q => !p.attempted.includes(q.id) && !p.credited.includes(q.id)).length * 10 / 2),
      xpTarget: practice ? 0 : Math.floor(allocated.filter(q => p.growth.day !== day || !p.growth.credited.includes(q.id)).length * QUESTION_XP / 2),
      corrected: [], receipt: null },
    answers: [],
    materials: { credited: 0, packs: 0 },
    encounter: { route, monster: monster.family, variant: monster.id, level, earned: 0,
      combat },
    reward: "none",
    id: runId,
    day,
    course,
    questions: allocated.map((q) => q.id),
    review: allocated.map((q) => q.review),
    assisted: false,
    learningEnabled: true,
    index: 0,
    streak: 0,
    wrong: [],
    settled: false,
    status: "active",
    rewarded: 0,
    points: 0,
    practice,
    skillUsed: false,
    eliminated: null,
    companion: p.equipped,
  };
}
export function setChallengeMode(s:Family,id:PlayerId,runId:string,mode:TimingMode) {
  const r=s.profiles[id].run;
  requireValue(r&&r.id===runId&&r.challenge&&r.index===0&&!r.answers?.length&&!r.challenge.clock,'開始答題後不能變更節奏');
  requireValue(mode==='standard'||mode==='relaxed');
  r.challenge.mode=r.practice?'relaxed':mode;
  if (!r.practice) s.profiles[id].challengeTiming = mode;
  return true;
}
export function readyQuestion(s:Family,id:PlayerId,runId:string,index:number,now=Date.now()) {
  const r=s.profiles[id].run;
  requireValue(r&&r.id===runId&&r.index===index&&r.status==='active'&&!r.settled&&r.challenge,'題目已更新');
  const q=questionById(r.questions[index])!;
  openChallenge(r.challenge,index,now,readingSeconds(q.prompt+' '+q.options.map(o=>o.text).join(' '),q.audio?(q.end??0):0));
  return true;
}
export function answerRun(
  s: Family,
  id: PlayerId,
  runId: string,
  index: number,
  choice: number | null,
  day = localDayKey(),
  captureRoll = 0.999999999,
  now = Date.now(),
) {
  const p = s.profiles[id],
    r = p.run;
  requireValue(
    r &&
      r.id === runId &&
      r.index === index &&
      r.status === "active" &&
      !r.settled,
    "這題已更新，請重新查看",
  );
  const q = questionById(r.questions[r.index])!;
  requireValue(Array.isArray(r.answers), "請重新載入，更新這趟挑戰規則");
  requireValue(!r.challenge || !!r.challenge.clock, "先按開始這題");
  const expired = r.challenge ? challengeExpired(r.challenge,now) : false;
  requireValue(choice===null ? expired : integer(choice, q.options.length-1) && choice!==r.eliminated, "請選一個答案");
  const correct = !expired && choice === q.answer;
  if(expired) r.challenge!.timeouts.push(r.index);
  tick(p, day);
  if (r.learningEnabled && r.wrong.length === 0)
    recordLearning(
      p.learning,
      q,
      correct,
      r.assisted,
      r.review[r.index],
      day,
    );
  if (correct) markMastered(p.learning, q.id);
  const firstToday = !p.attempted.includes(q.id);
  if (!r.practice && firstToday) p.attempted.push(q.id);
  r.answers.push(correct);
  r.settled = true;
  r.streak = mistakeCount(r);
  if (!correct) {
    r.wrong = expired ? [] : [choice!];
    if (r.streak >= MAX_MISTAKES) r.status = "failed";
    else if (r.index === r.questions.length - 1) finishRun(p, r, day, captureRoll, id);
    return false;
  }
  // Correct first submissions earn XP; hints and reviews remain eligible.
  // Learner-wide ledger prevents switching companions to credit a question twice.
  if (p.growth.day !== day) p.growth = { ...p.growth, day, credited: [] };
  if (!r.practice && r.day === day
      && !p.growth.credited.includes(q.id)) {
    p.growth.credited.push(q.id);
    const before = p.growth.xp[r.companion] ?? 0;
    const after = Math.min(MAX_COMPANION_XP, before + QUESTION_XP);
    p.growth.xp[r.companion] = after;
    r.encounter.earned += after - before;
    const packEarned = awardLearningMaterials(p);
    // Legacy runs remain unattributed: earlier answers cannot be reconstructed
    // from capped XP or another device's aggregate balances.
    if (r.materials) {
      r.materials.credited++;
      r.materials.packs += Number(packEarned);
    }
  }
  if (
    !r.practice &&
    firstToday &&
    r.wrong.length === 0 &&
    r.day === day &&
    !p.credited.includes(q.id)
  ) {
    const awarded = awardQuestion(p.milestones, {
      questionId: q.id,
      subject: q.subject,
      dayKey: day,
      attempts: 1,
    });
    p.milestones = awarded.state;
    if (awarded.awarded) {
      p.coins += 10;
      p.credited.push(q.id);
      r.rewarded++;
      r.points += 20;
    }
  }
  if (r.index === r.questions.length - 1) finishRun(p, r, day, captureRoll, id);
  return true;
}
function finishRun(p: Profile, r: Run, day: string, captureRoll: number, id: PlayerId) {
  requireValue(r.answers?.length === r.questions.length && mistakeCount(r) < MAX_MISTAKES);
  if(r.answers.filter(Boolean).length < correctNeeded(r.challenge)) {r.status="failed";return;}
  r.status = "won";
  settleCapture(p, r, day, captureRoll, r.captureRule ? {grade:PLAYERS.find(x=>x.id===id)!.grade,course:r.course,exclude:r.questions} : undefined);
  if (!r.practice) {
    p.milestones = completeVoyage(p.milestones, r.points);
    if (r.rewarded === r.questions.length && petSkill(r.companion) === "spark") p.coins += 5;
    if (r.day === day) {
      p.rewardRounds++;
      r.reward = saveCompletionStar(p);
    }
  }
}
// Called by the final-answer / island-finish transaction. The receipt, attempt
// counter and ownership commit together; completed runs never reroll.
export function settleCapture(p: Profile, run: Pick<Run, "encounter" | "capture" | "day" | "practice">, day: string, roll: number, trialContext?: {grade:Grade;course:Course;exclude:string[]}) {
  const monster = monsterById(run.encounter.variant);
  if (!monster || run.capture) return;
  const result: CaptureOutcome = { version: 2, monster: monster.id, chance: CAPTURE_RATES[monster.rarity], outcome: "unavailable" };
  if (!run.encounter.combat) result.reason = "legacy";
  else if (run.practice) result.reason = "practice";
  else if (run.day !== day) result.reason = "old-day";
  else {
    if (p.captureQuota?.day !== day) p.captureQuota = { day, attempts: 0 };
    requireValue(Number.isFinite(roll) && roll >= 0 && roll < 1);
    p.captureQuota!.attempts++;
    if ((p.owned[monster.id] ?? 0) >= 10000) result.reason = "capacity";
    else if (trialContext) {
      result.version=3;result.chance=100;result.outcome="pending";
      result.trial=createCaptureTrial(p,trialContext.grade,trialContext.course,trialContext.exclude);
    } else if (roll * 100 < result.chance) {
      result.outcome = p.owned[monster.id] ? "duplicate" : "joined";
      grantCard(p, monster.id, day);
      result.copies = p.owned[monster.id];
    } else result.outcome = "escaped";
  }
  run.capture = result;
}
export function saveCompletionStar(p: Profile): "saved" | "exchanged" {
  p.rewardStars++;
  if (p.rewardStars === STARS_PER_TICKET) {
    p.rewardStars = 0;
    p.tickets++;
    return "exchanged";
  }
  return "saved";
}
// Compatibility reader for previously earned pending choices only. New voyages
// automatically save a star; old clients cannot claim a second completion reward.
export function claimReward(
  s: Family, id: PlayerId, runId: string, choice: "save" | "chance", roll = 0,
): RewardState {
  const p = s.profiles[id], r = p.run;
  requireValue(r && r.id === runId && r.status === "won" && !r.practice && r.reward === "pending", "這趟獎勵已領取或已更新");
  requireValue(choice === "save" || choice === "chance");
  requireValue(Number.isFinite(roll) && roll >= 0 && roll < 1);
  if (choice === "save") {
    r.reward = saveCompletionStar(p);
  } else if (roll < 0.5) {
    p.tickets++;
    r.reward = "won";
  } else r.reward = "miss";
  log(s, `reward:${runId}`, `${PLAYERS.find((x) => x.id === id)!.name}：${rewardMessage(r.reward)}`);
  return r.reward;
}
export function abandonRun(s: Family, id: PlayerId, runId: string) {
  const r = s.profiles[id].run;
  requireValue(r && r.id === runId && r.status === "active", "航程已更新，請查看目前進度");
  s.profiles[id].run = null;
}
export function pendingRemediation(r?: Pick<Run, "status" | "remediation"> | null) {
  return r?.status === "failed" && !!r.remediation && r.remediation.receipt === null;
}
export function skipRemediation(s: Family, id: PlayerId, runId: string) {
  const r = s.profiles[id].run;
  requireValue(r && r.id === runId && pendingRemediation(r), "補練已更新");
  r.remediation!.receipt = { coins: 0, xp: 0, skipped: true };
  return true;
}
export function correctRun(s: Family, id: PlayerId, runId: string, index: number, choice: number, day = localDayKey()) {
  const p = s.profiles[id], r = p.run;
  requireValue(r && r.id === runId && r.status !== "active" && r.answers?.[index] === false, "找不到這道錯題");
  const m = r.remediation ?? (r.remediation = { version: 1, coinTarget: 0, xpTarget: 0, corrected: [], receipt: null });
  requireValue(!m.receipt && !m.corrected.includes(index), "這題已訂正，請查看目前進度");
  const q = questionById(r.questions[index])!;
  requireValue(integer(choice, q.options.length - 1), "請選一個答案");
  if (choice !== q.answer) return false;
  markMastered(p.learning, q.id);
  m.corrected.push(index);
  if (r.status === "failed" && m.corrected.length === r.answers.filter(a => !a).length) {
    tick(p, day);
    const eligible = !r.practice && r.day === day;
    const coins = eligible ? Math.max(0, m.coinTarget - r.rewarded * 10) : 0;
    const wantedXp = eligible ? Math.max(0, m.xpTarget - r.encounter.earned) : 0;
    const before = p.growth.xp[r.companion] ?? 0;
    const xp = Math.min(wantedXp, MAX_COMPANION_XP - before);
    // Receipt and balances are persisted in the same row-locked transaction.
    m.receipt = { coins, xp, skipped: false };
    p.coins += coins;
    p.growth.xp[r.companion] = before + xp;
    if (eligible) {
      if (p.growth.day !== day) p.growth = { ...p.growth, day, credited: [] };
      // Reserve all questions behind the half-run guarantee, including unasked
      // questions. Later runs cannot mint another guarantee from the same pool.
      for (const question of r.questions) {
        if (!p.attempted.includes(question)) p.attempted.push(question);
        if (!p.growth.credited.includes(question)) p.growth.credited.push(question);
      }
    }
  }
  return true;
}
export function nextQuestion(
  s: Family,
  id: PlayerId,
  runId: string,
  index: number,
) {
  const r = s.profiles[id].run;
  requireValue(
    r &&
      r.id === runId &&
      r.index === index &&
      r.status === "active" &&
      r.settled &&
      r.index < r.questions.length - 1,
    "題目已更新，請重新查看",
  );
  r.index++;
  if(r.challenge) r.challenge.clock=null;
  r.settled = false;
  r.wrong = [];
  r.eliminated = null;
  r.assisted = false;
}
export function useSkill(
  s: Family,
  id: PlayerId,
  runId: string,
  index: number,
) {
  const r = s.profiles[id].run;
  requireValue(
    r &&
      r.id === runId &&
      r.index === index &&
      r.status === "active" &&
      !r.settled &&
      !r.skillUsed,
    "題目已更新，請重新查看",
  );
  r.skillUsed = true;
  r.assisted = true;
  if (petSkill(r.companion) === "focus") {
    const q = questionById(r.questions[r.index])!;
    r.eliminated = q.options.findIndex(
      (_, i) => i !== q.answer && !r.wrong.includes(i),
    );
    if (r.eliminated < 0) r.eliminated = null;
  }
}
export function buyPet(
  s: Family,
  id: PlayerId,
  pet: string,
  tx: string,
  day = taipeiDay(),
) {
  const p = s.profiles[id],
    c = petById(pet);
  requireValue(c && !monsterById(pet) && pet !== initialCompanion(p), "不能購買這隻夥伴");
  requireValue(!p.owned[pet], "已經擁有這隻夥伴");
  requireValue(p.coins >= PRICES[c.rarity], "星幣還不夠");
  p.coins -= PRICES[c.rarity];
  grantCard(p, pet, day);
  log(s, tx, `${PLAYERS.find((x) => x.id === id)!.name} 邀請了 ${c.name}`);
}
export type DrawResult = {
  ticketKind?: "star";
  kind: "pet" | "coins" | "loss";
  amount: number;
  pet?: string;
  guaranteed: boolean;
  receiptId?: string;
  duplicate?: boolean;
  copies?: number;
};
export function draw(
  s: Family,
  id: PlayerId,
  tx: string,
  roll: number,
  pick: number,
  day = localDayKey(),
  collectionDay = taipeiDay(),
  starTicket = false,
): DrawResult {
  requireValue(roll >= 0 && roll < 1 && pick >= 0 && pick < 1);
  const p = s.profiles[id];
  const balance = starTicket ? "starTickets" : "tickets";
  requireValue(p[balance] > 0, starTicket ? "需要一張星耀特邀券" : "需要一張星願券");
  requireValue(!s.log.some((x) => x.id === tx), "這次領卡已完成");
  const c = chooseCompanionDraw(p, roll, pick, starTicket);
  requireValue((p.owned[c.id] ?? 0) < 10000, "這位夥伴的收藏已達上限");
  tick(p, day);
  const duplicate = !!p.owned[c.id];
  p[balance]--;
  p.draws++;
  grantCard(p, c.id, collectionDay);
  p.pity = 0;
  p.lastDraw = { id: tx, pet: c.id, duplicate, copies: p.owned[c.id] };
  const result: DrawResult = { receiptId: tx, kind: "pet", amount: 0, pet: c.id, guaranteed: true, duplicate, copies: p.owned[c.id] };
  if (starTicket) { p.lastDraw.ticketKind = "star"; result.ticketKind = "star"; }
  log(s, tx, `${PLAYERS.find((x) => x.id === id)!.name}：${c.name}`);
  return result;
}
function assertTrade(s: Family, t: Trade) {
  requireValue(!needsOnboarding(s.profiles[t.from]) && !needsOnboarding(s.profiles[t.to]), "請先迎接兩位玩家的初始夥伴");
  requireValue(
    t.from !== t.to &&
      t.give !== initialCompanion(s.profiles[t.from]) &&
      t.receive !== initialCompanion(s.profiles[t.to]) &&
      t.give !== t.receive,
    "請選擇兩隻不同且可交換的夥伴",
  );
  requireValue(
    s.profiles[t.from].owned[t.give] && s.profiles[t.to].owned[t.receive],
    "夥伴已不在原來的收藏中",
  );
  requireValue(
    ![s.profiles[t.from].run, s.profiles[t.to].run].some(
      (r) => r?.status === "active",
    ),
    "請先結束兩位玩家的航程",
  );
}
export function proposeTrade(s: Family, t: Trade) {
  requireValue(!s.pendingTrade, "已有一筆交換等待確認");
  assertTrade(s, t);
  s.pendingTrade = t;
}
export function acceptTrade(
  s: Family,
  id: PlayerId,
  tradeId: string,
  day = taipeiDay(),
) {
  const t = s.pendingTrade;
  requireValue(t && t.to === id && t.id === tradeId, "交換邀請已改變");
  assertTrade(s, t);
  for (const [owner, give, receive] of [
    [t.from, t.give, t.receive],
    [t.to, t.receive, t.give],
  ] as const) {
    const p = s.profiles[owner];
    p.owned[give]--;
    if (!p.owned[give]) {
      delete p.owned[give];
      if (p.equipped === give) p.equipped = initialCompanion(p);
    }
    grantCard(p, receive, day);
  }
  log(
    s,
    t.id,
    `${petById(t.give)!.name} ↔ ${petById(t.receive)!.name} 交換完成`,
  );
  s.pendingTrade = null;
}
export function importGarden(s: Family, id: PlayerId, value: unknown) {
  requireValue(id !== "quintus", "請選斐斐、晴晴或荳荳");
  const p = s.profiles[id];
  requireValue(
    !p.gardenImported &&
      p.milestones.completedVoyages === 0 &&
      p.milestones.masteryPoints === 0 &&
      p.coins === 0 &&
      Object.keys(p.firstAcquired).length === 1 &&
      !p.run,
    "只可匯入尚未開始遊玩的玩家，避免覆寫新進度",
  );
  requireValue(record(value));
  if (value.format === "star-tide-player-profile") {
    requireValue(
      value.version === 1 &&
        record(value.profile) &&
        ((id === "feifei" && value.profile.id === "player-feifei-a83c") ||
          (id === "qingqing" && value.profile.id === "player-qingqing-b19d")),
      "備份與選擇的玩家不一致",
    );
  }
  const legacy = validateSave(
    value.format === "star-tide-player-profile" ? value.state : value,
  );
  p.legacyGarden = legacy;
  p.coins = legacy.coins;
  p.milestones.completedVoyages = legacy.rounds;
  p.gardenImported = true;
  if (
    GARDEN_PETS.includes(legacy.companionId as (typeof GARDEN_PETS)[number])
  ) {
    p.owned[legacy.companionId] = 1;
    p.firstAcquired[legacy.companionId] = null;
    p.equipped = legacy.companionId;
  }
}
function grantCard(p: Profile, pet: string, day: string) {
  requireValue(isLocalDayKey(day));
  p.owned[pet] = (p.owned[pet] ?? 0) + 1;
  if (!Object.prototype.hasOwnProperty.call(p.firstAcquired, pet))
    p.firstAcquired[pet] = day;
}

import {
  canBattleQuiz,
  BATTLE_BUFFS,
  petElement,
  type Battle,
} from "./game-view";
export function beginBattleQuiz(b: Battle, grade: Grade, seed: number, allocation?: QuestionAllocation & { token: string }): Battle {
  requireValue(canBattleQuiz(b), "這回合無法再答題助戰");
  const course =
    grade === 1
      ? "english"
      : grade === 2
        ? b.quizUsed.length % 2
          ? "math"
          : "words"
        : COURSES[grade][b.quizUsed.length % COURSES[grade].length].id;
  const q = allocation
    ? questionById(allocation.id)
    : selectQuestions(grade, course, b.quizUsed, seed)
        .map((id) => questionById(id)!)
        .find((q) => !b.quizUsed.includes(q.id));
  requireValue(!q || q.grade === grade, "題目年級不符");
  requireValue(q, "暫時沒有新的助戰題目");
  const n = structuredClone(b);
  n.quiz = {
    question: q.id,
    round: b.round,
    choice: null,
    correct: null,
    learningToken: allocation?.token,
    review: allocation?.review,
  };
  n.quizUsed.push(q.id);
  n.lastQuizRound = b.round;
  return n;
}
export function answerBattleQuiz(
  b: Battle,
  question: string,
  choice: number,
): Battle {
  const quiz = b.quiz,
    q = questionById(question);
  requireValue(
    b.mode === "cpu" &&
      b.turn === 0 &&
      b.winner === null &&
      quiz &&
      quiz.round === b.round &&
      quiz.question === question &&
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
export function markRunAssisted(
  s: Family,
  id: PlayerId,
  runId: string,
  index: number,
) {
  const r = s.profiles[id].run;
  requireValue(
    r &&
      r.id === runId &&
      r.index === index &&
      r.status === "active" &&
      !r.settled,
    "題目已更新",
  );
  r.assisted = true;
}
export function allocateBattleQuestion(
  s: Family,
  id: PlayerId,
  course: Course,
  token: string,
  excluded: string[] = [],
) {
  const p = s.profiles[id],
    grade = PLAYERS.find((x) => x.id === id)!.grade;
  const reserved = p.run?.status === 'active' ? p.run.questions.slice(p.run.index + Number(p.run.settled)) : [];
  const q = allocateQuestions(p.learning, grade, course, 1, undefined, [...excluded, ...reserved])[0];
  p.learning.pending = { token, question: q.id, review: q.review };
  return { ...q, token };
}
export function recordBattleAnswer(
  s: Family,
  id: PlayerId,
  token: string,
  question: string,
  correct: boolean,
  day = localDayKey(),
) {
  const p = s.profiles[id],
    pending = p.learning.pending;
  requireValue(
    pending && pending.token === token && pending.question === question,
    "助戰題目已在另一個分頁更新",
  );
  recordLearning(
    p.learning,
    questionById(question)!,
    correct,
    false,
    pending.review,
    day,
  );
  p.learning.pending = null;
}
