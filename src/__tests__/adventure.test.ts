import {startAfterDecliningCapture} from './helpers/capture';
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import {
  newFamily,
  validateFamily,
  startRun,
  answerRun,
  claimReward,
  nextQuestion,
  useSkill,
  draw,
  buyPet,
  proposeTrade,
  acceptTrade,
  importGarden,
  newBattle,
  battleMove,
  cpuMove,
  ROSTER,
  PRICES,
  petSkill,
  type Family,
  type PlayerId,
} from "../adventure";
import {
  COURSES,
  LEARNING_BANK,
  questionById,
  type Grade,
  type Course,
} from "../learning";
import { createInitialState } from "../core";
import { syllables } from "../readability";
const day = "2026-10-24";
const finish = (s: Family, id: PlayerId, course: Course = "math", seed = 0) => {
  startAfterDecliningCapture(s, id, course, "run" + seed, seed, false, day);
  for (let i = 0; i < 6; i++) {
    const r = s.profiles[id].run!;
    answerRun(s, id, r.id, i, questionById(r.questions[i])!.answer, day);
    if (i < 5) nextQuestion(s, id, r.id, i);
  }
  if (s.profiles[id].run!.reward === "pending") claimReward(s, id, s.profiles[id].run!.id, "chance", 0);
};
describe("integrated learning content", () => {
  it("has valid, unique, age-specific questions with all local media", () => {
    expect(new Set(LEARNING_BANK.map((q) => q.id)).size).toBe(
      LEARNING_BANK.length,
    );
    for (const q of LEARNING_BANK) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(new Set(q.options.map((x) => x.text)).size).toBe(q.options.length);
      expect(q.id.length).toBeLessThanOrEqual(40);
      if (q.audio) expect(existsSync("public" + q.audio), q.audio).toBe(true);
      for (const opt of q.options)
        if (opt.image) expect(existsSync("public" + opt.image)).toBe(true);
    }
  });
  it("has enough content for every enabled course", () => {
    for (const grade of [1, 2, 4] as Grade[])
      for (const course of COURSES[grade])
        expect(
          LEARNING_BANK.filter(
            (q) => q.grade === grade && q.course === course.id,
          ).length,
        ).toBeGreaterThanOrEqual(5);
  });
  it("provides first-grade pictures and second-grade aligned ruby syllables", () => {
    for (const q of LEARNING_BANK.filter((q) => q.course === "words" && !q.examSources)) {
      if (q.format === "short-passage") {
        expect(q.grade).toBe(2);
        for (const text of [q.prompt, ...q.options.map(opt => opt.text)])
          expect(syllables(text).filter(s => /[\u3400-\u9fff]/.test(s.text) && !s.zy)).toEqual([]);
        continue;
      }
      for (const opt of q.options) {
        expect(opt.image).toBeTruthy();
        expect(opt.zy!.split(" ").length).toBe(Array.from(opt.text).length);
      }
    }
  });
});
describe("profiles, migration, challenge and economy", () => {
  it("preserves old mastery and unlocked pets only for Quintus", () => {
    const old = { ...createInitialState(), masteryPoints: 220 };
    const s = newFamily(JSON.stringify(old));
    expect(s.profiles.quintus.milestones.masteryPoints).toBe(220);
    expect(s.profiles.quintus.owned.coralflare).toBe(1);
    expect(s.profiles.feifei.milestones.masteryPoints).toBe(0);
    expect(s.profiles.feifei.owned.coralflare).toBeUndefined();
    expect(() => newFamily("{bad")).toThrow();
    validateFamily(s);
  });
  it("persists cumulative mistakes across reload and stops on the third", () => {
    let s = newFamily(); startAfterDecliningCapture(s, "qingqing", "math", "r", 1, false, day);
    for (let i = 0; i < 3; i++) {
      const r = s.profiles.qingqing.run!, q = questionById(r.questions[i])!;
      answerRun(s, "qingqing", "r", i, (q.answer + 1) % q.options.length, day);
      s = validateFamily(JSON.parse(JSON.stringify(s)));
      if (i < 2) nextQuestion(s, "qingqing", "r", i);
    }
    expect(s.profiles.qingqing.run!.status).toBe("failed");
    expect(() => answerRun(s, "qingqing", "r", 2, questionById(s.profiles.qingqing.run!.questions[2])!.answer, day)).toThrow();
    expect(s.profiles.qingqing.coins).toBe(0);
  });
  it("correct answers preserve mistakes; repeated submission cannot award", () => {
    const s = newFamily(); startAfterDecliningCapture(s, "feifei", "math", "r", 0, false, day);
    const q = questionById(s.profiles.feifei.run!.questions[0])!;
    answerRun(s, "feifei", "r", 0, (q.answer + 1) % q.options.length, day);
    expect(() => answerRun(s, "feifei", "r", 0, q.answer, day)).toThrow();
    nextQuestion(s, "feifei", "r", 0);
    const next = questionById(s.profiles.feifei.run!.questions[1])!;
    answerRun(s, "feifei", "r", 1, next.answer, day);
    expect(s.profiles.feifei.run!.streak).toBe(1);
    expect(() => answerRun(s, "feifei", "r", 1, next.answer, day)).toThrow();
    expect(s.profiles.feifei.coins).toBe(10);
  });
  it("keeps earning beyond fifteen questions and three rounds", () => {
    const s = newFamily();
    for (let i = 0; i < 4; i++)
      finish(s, "quintus", i % 2 ? "chinese" : "math", i * 5);
    expect(s.profiles.quintus.credited.length).toBe(24);
    expect(s.profiles.quintus.tickets).toBe(2);
    expect(s.profiles.quintus.milestones.masteryPoints).toBe(480);
    const coins = s.profiles.quintus.coins;
    finish(s, "quintus", "math", 0);
    expect(s.profiles.quintus.coins).toBe(coins + 60);
    expect(s.profiles.quintus.tickets).toBe(2);
    validateFamily(s);
  });
  it("practice locks the first answer without awarding coins, mastery or tickets", () => {
    const s = newFamily(); startAfterDecliningCapture(s, "qingqing", "math", "practice", 0, true, day);
    const q = questionById(s.profiles.qingqing.run!.questions[0])!;
    answerRun(s, "qingqing", "practice", 0, (q.answer + 1) % q.options.length, day);
    expect(() => answerRun(s, "qingqing", "practice", 0, q.answer, day)).toThrow();
    expect(s.profiles.qingqing.coins).toBe(0); expect(s.profiles.qingqing.milestones.masteryPoints).toBe(0);
    validateFamily(s);
  });
  it("does not award yesterday’s active voyage after midnight", () => {
    const s = newFamily();
    startAfterDecliningCapture(s, "quintus", "math", "old", 0, false, day);
    const q = questionById(s.profiles.quintus.run!.questions[0])!;
    answerRun(s, "quintus", "old", 0, q.answer, "2026-10-25");
    expect(s.profiles.quintus.coins).toBe(0);
  });
  it("focus skill excludes only a wrong answer and is once per run", () => {
    const s = newFamily();
    const c = ROSTER.find((c) => petSkill(c.id) === "focus")!;
    s.profiles.quintus.owned[c.id] = 1;
    s.profiles.quintus.equipped = c.id;
    startAfterDecliningCapture(s, "quintus", "math", "r", 0, false, day);
    useSkill(s, "quintus", "r", 0);
    expect(s.profiles.quintus.run!.eliminated).not.toBe(
      questionById(s.profiles.quintus.run!.questions[0])!.answer,
    );
    expect(() => useSkill(s, "quintus", "r", 0)).toThrow();
  });
  it("ticket always grants a card, leaves coins and mastery intact, without daily redemption cap", () => {
    const s = newFamily();
    s.profiles.feifei.tickets = 5;
    s.profiles.feifei.coins = 3;
    const r = draw(s, "feifei", "a", 0.99, 0.5, day);
    expect(r.kind).toBe("pet");
    expect(s.profiles.feifei.coins).toBe(3);
    expect(s.profiles.feifei.tickets).toBe(4);
    expect(s.profiles.feifei.milestones.masteryPoints).toBe(0);
    expect(() => draw(s, "feifei", "a", 0.1, 0.2, day)).toThrow();
    draw(s, "feifei", "b", 0.4, 0.2, day);
    draw(s, "feifei", "c", 0.8, 0.2, day);
    expect(draw(s, "feifei", "d", 0.1, 0.2, day).kind).toBe("pet");
    validateFamily(s);
  });
  it("legacy pity can redeem for a guaranteed card under the new rule", () => {
    const s = newFamily();
    s.profiles.feifei.tickets = 2;
    s.profiles.feifei.pity = 9;
    const r = draw(s, "feifei", "x", 0.99, 0, day);
    expect(r.kind).toBe("pet");
    expect(r.guaranteed).toBe(true);
    expect(s.profiles.feifei.pity).toBe(0);
    expect(s.profiles.feifei.owned[r.pet!]).toBe(1);
  });
  it("purchases require enough coins and never reduce mastery", () => {
    const s = newFamily(),
      pet = ROSTER[1];
    expect(() => buyPet(s, "quintus", pet.id, "tx")).toThrow();
    s.profiles.quintus.coins = PRICES[pet.rarity];
    buyPet(s, "quintus", pet.id, "tx");
    expect(s.profiles.quintus.coins).toBe(0);
    expect(s.profiles.quintus.owned[pet.id]).toBe(1);
    expect(() => buyPet(s, "quintus", pet.id, "tx2")).toThrow();
  });
  it("two-stage trades require the recipient and remain atomic on stale ownership", () => {
    const s = newFamily(),
      a = ROSTER[1].id,
      b = ROSTER[2].id;
    s.profiles.quintus.owned[a] = 1;
    s.profiles.feifei.owned[b] = 1;
    s.profiles.quintus.equipped = a;
    proposeTrade(s, {
      id: "trade",
      from: "quintus",
      to: "feifei",
      give: a,
      receive: b,
    });
    expect(() => acceptTrade(s, "quintus", "trade")).toThrow();
    acceptTrade(s, "feifei", "trade");
    expect(s.profiles.quintus.owned[a]).toBeUndefined();
    expect(s.profiles.feifei.owned[a]).toBe(1);
    expect(s.profiles.quintus.equipped).toBe("tideglow");
    expect(s.pendingTrade).toBeNull();
    expect(() => acceptTrade(s, "feifei", "trade")).toThrow();
    validateFamily(s);
  });
  it("rejects corrupt saves and wrong-grade active questions", () => {
    const s = newFamily();
    startAfterDecliningCapture(s, "qingqing", "math", "r", 0, false, day);
    s.profiles.qingqing.run!.questions[0] = "math-01";
    expect(() => validateFamily(s)).toThrow();
    const bad = newFamily();
    bad.profiles.feifei.coins = -1;
    expect(() => validateFamily(bad)).toThrow();
  });
  it("imports validated garden profile once and rejects a different owner", () => {
    const s = newFamily();
    const state = {
      version: 1,
      name: "棉花糖",
      coins: 30,
      rounds: 2,
      owned: [],
      stats: {},
      ledger: [],
      active: null,
      companionId: "maltese",
    };
    const envelope = {
      format: "star-tide-player-profile",
      version: 1,
      profile: { id: "player-feifei-a83c" },
      state,
    };
    expect(() => importGarden(s, "qingqing", envelope)).toThrow();
    importGarden(s, "feifei", envelope);
    expect(s.profiles.feifei.coins).toBe(30);
    expect(s.profiles.feifei.owned.maltese).toBe(1);
    expect(s.profiles.feifei.legacyGarden).toBeTruthy();
    expect(() => importGarden(s, "feifei", envelope)).toThrow();
    validateFamily(s);
  });
});
describe("turn battles", () => {
  it("uses rarity stats and energy costs without negative or over-cap HP", () => {
    let b = newBattle(["tideglow"], ["drake-warden-earth"], "cpu");
    expect(b.teams.flat().map((x) => x.hp)).toEqual([100, 136]);
    expect(() => battleMove(b, "burst")).toThrow();
    for (let i = 0; i < 70 && b.winner === null; i++)
      b = battleMove(b, cpuMove(b));
    expect(b.winner).not.toBeNull();
    expect(b.teams.flat().every((x) => x.hp >= 0 && x.hp <= x.stats!.hp)).toBe(true);
    expect(() => battleMove(b, "attack")).toThrow();
  });
  it("switching consumes a turn and rejects invalid or dead teammate", () => {
    let b = newBattle(
      ["tideglow", ROSTER[1].id],
      [ROSTER[2].id, ROSTER[3].id],
      "duo",
    );
    b = battleMove(b, "swap:1");
    expect(b.active[0]).toBe(1);
    expect(b.turn).toBe(1);
    expect(() => battleMove(b, "swap:7")).toThrow();
  });
});
describe("falsification regressions", () => {
  it("blind guessing cannot obtain rewards for questions that had an incorrect first attempt", () => {
    const s = newFamily();
    startAfterDecliningCapture(s, "qingqing", "math", "blind", 0, false, day);
    const r = s.profiles.qingqing.run!;
    const question = questionById(r.questions[0])!;
    answerRun(
      s,
      "qingqing",
      r.id,
      0,
      (question.answer + 1) % question.options.length,
      day,
    );
    expect(() => answerRun(s, "qingqing", r.id, 0, question.answer, day)).toThrow();
    expect(s.profiles.qingqing.coins).toBe(0);
    expect(s.profiles.qingqing.tickets).toBe(0);
    expect(s.profiles.qingqing.attempted).toContain(question.id);
    expect(s.profiles.qingqing.credited).not.toContain(question.id);
  });
  it("a known answer from a failed first attempt remains unrewarded after a new run", () => {
    const s = newFamily();
    startAfterDecliningCapture(s, "qingqing", "math", "first", 0, false, day);
    const qid = s.profiles.qingqing.run!.questions[0];
    const q = questionById(qid)!;
    answerRun(
      s,
      "qingqing",
      "first",
      0,
      (q.answer + 1) % q.options.length,
      day,
    );
    s.profiles.qingqing.run = null;
    startAfterDecliningCapture(s, "qingqing", "math", "second", 0, false, day);
    s.profiles.qingqing.run!.questions[0] = qid;
    answerRun(s, "qingqing", "second", 0, q.answer, day);
    expect(s.profiles.qingqing.coins).toBe(0);
  });
  it("rejects stale next and skill commands across tabs", () => {
    const s = newFamily();
    startAfterDecliningCapture(s, "quintus", "math", "r", 0, false, day);
    const q = questionById(s.profiles.quintus.run!.questions[0])!;
    answerRun(s, "quintus", "r", 0, q.answer, day);
    nextQuestion(s, "quintus", "r", 0);
    const next = questionById(s.profiles.quintus.run!.questions[1])!;
    answerRun(s, "quintus", "r", 1, next.answer, day);
    expect(() => nextQuestion(s, "quintus", "r", 0)).toThrow();
    expect(() => useSkill(s, "quintus", "r", 0)).toThrow();
    expect(s.profiles.quintus.run!.index).toBe(1);
  });
});

it("rejects inherited names as equipped IDs", () => {
  for (const id of ["constructor", "toString"]) {
    const s = newFamily();
    s.profiles.feifei.equipped = id;
    expect(() => validateFamily(s)).toThrow();
  }
});

describe("Doudou and four-player migration", () => {
  it("upgrades a three-player save without changing existing progress or trade", () => {
    const legacy = JSON.parse(JSON.stringify(newFamily()));
    legacy.version = 1;
    delete legacy.profiles.doudou;
    legacy.profiles.feifei.coins = 175;
    legacy.profiles.feifei.owned.pebblefin = 1;
    legacy.profiles.qingqing.owned.foamferret = 1;
    legacy.pendingTrade = {
      id: "pending",
      from: "feifei",
      to: "qingqing",
      give: "pebblefin",
      receive: "foamferret",
    };
    const original = structuredClone(legacy);
    const upgraded = validateFamily(legacy);
    expect(upgraded.version).toBe(9);
    for (const id of ["quintus", "feifei", "qingqing"] as const)
      expect(upgraded.profiles[id]).toEqual({
        ...original.profiles[id],
        firstAcquired: Object.fromEntries(
          Object.keys(original.profiles[id].owned).map((pet) => [pet, null]),
        ),
      });
    expect(upgraded.pendingTrade).toEqual(original.pendingTrade);
    expect(upgraded.profiles.doudou.coins).toBe(0);
    expect(upgraded.profiles.doudou.owned.tideglow).toBe(1);
    expect(legacy).toEqual(original);
  });
  it("rejects missing Doudou data in v2 instead of silently resetting her", () => {
    const damaged = JSON.parse(JSON.stringify(newFamily()));
    delete damaged.profiles.doudou;
    expect(() => validateFamily(damaged)).toThrow();
  });
  it("keeps Doudou's first-grade learning and rewards separate from Qingqing", () => {
    const s = newFamily();
    const before = structuredClone(s.profiles.qingqing);
    finish(s, "doudou", "math");
    expect(
      s.profiles.doudou.run!.questions.every(
        (id) => questionById(id)!.grade === 1,
      ),
    ).toBe(true);
    expect(s.profiles.doudou.coins).toBe(60);
    expect(s.profiles.doudou.rewardStars).toBe(1);
    expect(s.profiles.qingqing).toEqual(before);
    expect(validateFamily(s).profiles.doudou).toEqual(s.profiles.doudou);
  });
  it("imports Doudou's raw legacy save but never another child's named backup", () => {
    const s = newFamily();
    const state = {
      version: 1,
      name: "棉花糖",
      coins: 30,
      rounds: 2,
      owned: [],
      stats: {},
      ledger: [],
      active: null,
      companionId: "maltese",
    };
    for (const id of ["player-feifei-a83c", "player-qingqing-b19d"])
      expect(() =>
        importGarden(s, "doudou", {
          format: "star-tide-player-profile",
          version: 1,
          profile: { id },
          state,
        }),
      ).toThrow();
    importGarden(s, "doudou", state);
    expect(s.profiles.doudou.coins).toBe(30);
    expect(s.profiles.doudou.owned.maltese).toBe(1);
    expect(s.profiles.qingqing.coins).toBe(0);
    expect(() => importGarden(s, "doudou", state)).toThrow();
    validateFamily(s);
  });
});
