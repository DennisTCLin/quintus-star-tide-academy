import {startAfterDecliningCapture} from './helpers/capture';
import { describe, it, expect } from "vitest";
import {
  GENERATED_POOLS,
  generatedId,
  generatedQuestion,
} from "../question-generator";
import {
  allocateQuestions,
  freshLearning,
  recordLearning,
  validateLearning,
  mergeLearning,
  questionSkill,
} from "../learning-engine";
import {
  newFamily,
  validateFamily,
  startRun,
  answerRun,
  nextQuestion,
  claimReward,
  markRunAssisted,
  allocateBattleQuestion,
  recordBattleAnswer,
} from "../adventure";
import { LEARNING_BANK, questionById, type Grade } from "../learning";
import { restoreFamily, exportBackup, parseBackup } from "../family-store";
const day = "2026-10-24";
describe("frozen verified generators", () => {
  it("independently checks every generated answer, unique semantic prompt, bounds and distractors", () => {
    const semantic = new Set<string>();
    let total = 0;
    for (const pool of GENERATED_POOLS)
      for (let i = 0; i < pool.params.length; i++) {
        const id = generatedId(pool, i),
          q = generatedQuestion(id)!;
        expect(id).toMatch(/^[a-z0-9-]{2,40}$/);
        expect(q).toBeDefined();
        const signature = `${q.grade}:${q.prompt}`;
        expect(semantic.has(signature), signature).toBe(false);
        semantic.add(signature);
        expect(new Set(q.options.map((x) => x.text)).size).toBe(
          q.options.length,
        );
        const answer = q.options[q.answer].text;
        if (q.skill === "reading") {
          const route = /先到(.+?)，再到(.+?)，接著到(.+?)，最後到(.+?)。/.exec(
            q.prompt,
          )!;
          const target = q.prompt.includes("第一站是哪裡")
            ? 1
            : q.prompt.includes("最後一站是哪裡")
              ? 4
              : q.prompt.includes("下一站")
                ? 2
                : 3;
          expect(answer).toBe(route[target]);
        } else if (q.skill === "englishread") {
          const n = q.prompt.match(/\d+/g)!.map(Number);
          expect(Number(answer)).toBe(
            q.prompt.includes("in total")
              ? n[0] + n[1]
              : q.prompt.includes("How many red")
                ? n[0]
                : n[1],
          );
        } else if (q.skill === "observation") {
          const n = q.prompt.match(/\d+/g)!.map(Number),
            wanted = q.prompt.includes("最多")
              ? Math.max(...n)
              : Math.min(...n);
          expect(answer).toBe(
            ["紙巾甲", "紙巾乙", "紙巾丙"][n.indexOf(wanted)],
          );
        } else if (q.skill === "mapscale") {
          const n = q.prompt.match(/\d+/g)!.map(Number);
          expect(Number(answer)).toBe(n[1] * n[2]);
        } else if (q.prompt.includes("面積") || q.prompt.includes("周長")) {
          const n = q.prompt.match(/\d+/g)!.map(Number);
          expect(Number(answer)).toBe(
            q.prompt.includes("面積") ? n[0] * n[1] : 2 * n[0] + 2 * n[1],
          );
        } else if (q.prompt.includes("/")) {
          const n = q.prompt.match(/\d+/g)!.map(Number),
            a = answer.split("/").map(Number);
          expect(a[0] * n[1] * n[3]).toBe((n[0] * n[3] + n[2] * n[1]) * a[1]);
        } else {
          const m = /^(\d+) ([+−×÷]) (\d+) = \?$/.exec(q.prompt)!;
          expect(m).toBeTruthy();
          const a = Number(m[1]),
            b = Number(m[3]);
          const expected =
            m[2] === "+"
              ? a + b
              : m[2] === "−"
                ? a - b
                : m[2] === "×"
                  ? Array.from({ length: b }, () => a).reduce(
                      (x, y) => x + y,
                      0,
                    )
                  : a / b;
          expect(Number(answer)).toBe(expected);
          if (q.grade === 1) {
            expect(expected).toBeGreaterThanOrEqual(0);
            expect(expected).toBeLessThanOrEqual(20);
            expect(q.visual).toContain("●");
            expect(a).toBeLessThanOrEqual(20);
            expect(b).toBeLessThanOrEqual(20);
          }
        }
        total++;
      }
    expect(total).toBeGreaterThan(10000);
  });
  it("rejects malformed, noncanonical and future-version IDs", () => {
    for (const id of [
      "n2-g1-add-1-0",
      "n1-g3-add-1-0",
      "n1-g1-add-1-00",
      "n1-g1-add-1--1",
      "n1-g1-add-1-zzzzzzzzzz",
      "n1-g1-div-1-0",
      "n1-__proto__-0",
    ])
      expect(generatedQuestion(id)).toBeUndefined();
  });
});
it("does not count irrelevant English colors or swapped total operands as new facts", () => {
  const seen = new Set<string>();
  for (const p of GENERATED_POOLS.filter((p) => p.skill === "englishread"))
    for (const [a, b, ask] of p.params) {
      const key =
        ask === 0
          ? "red:" + a
          : ask === 1
            ? "blue:" + b
            : "total:" + a + ":" + b;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
});
describe("durable novelty and adaptive learning", () => {
  it("has no repeated new questions across saves, days and both modes", () => {
    let s = newFamily();
    const seen = new Set<string>();
    for (let round = 0; round < 80; round++) {
      startAfterDecliningCapture(
        s,
        "quintus",
        "math",
        "r" + round,
        round,
        false,
        round % 2 ? day : "2026-10-25",
      );
      const r = s.profiles.quintus.run!;
      for (let i = 0; i < 6; i++) {
        const q = questionById(r.questions[i])!;
        if (!r.review[i]) {
          expect(seen.has(q.id)).toBe(false);
          seen.add(q.id);
        }
        answerRun(s, "quintus", r.id, i, q.answer, day);
        if (i < 5) nextQuestion(s, "quintus", r.id, i);
      }
      if (r.reward === "pending") claimReward(s, "quintus", r.id, "save");
      const b = allocateBattleQuestion(s, "quintus", "math", "token" + round);
      expect(seen.has(b.id)).toBe(false);
      seen.add(b.id);
      recordBattleAnswer(s, "quintus", b.token, b.id, true, day);
      s = validateFamily(JSON.parse(JSON.stringify(s)));
    }
    expect(seen.size).toBe(560);
  });
  it("handles exhaustion honestly with six distinct review questions and first-answer rewards", () => {
    const s = newFamily(),
      p = s.profiles.feifei;
    p.learning.seen = LEARNING_BANK.filter((q) => q.grade === 2).map(
      (q) => q.id,
    );
    startAfterDecliningCapture(s, "feifei", "words", "review", 0, false, day);
    expect(p.run!.review.every(Boolean)).toBe(true);
    expect(new Set(p.run!.questions).size).toBe(6);
    for (let i = 0; i < 6; i++) {
      answerRun(
        s,
        "feifei",
        "review",
        i,
        questionById(p.run!.questions[i])!.answer,
        day,
      );
      if (i < 5) nextQuestion(s, "feifei", "review", i);
    }
    expect(p.coins).toBe(60);
    expect(p.tickets).toBe(0);
    const l = freshLearning();
    for (const pool of GENERATED_POOLS.filter((p) => p.grade === 1))
      l.cursors[pool.key] = pool.params.length;
    const qs = allocateQuestions(l, 1, "math", 5);
    expect(qs.every((q) => q.review)).toBe(true);
    expect(new Set(qs.map((q) => q.id)).size).toBe(5);
  });
  it("does not duplicate within a batch spanning last unseen audio and review", () => {
    const l = freshLearning(),
      pool = LEARNING_BANK.filter(
        (q) => q.grade === 1 && q.course === "medials",
      );
    l.seen = pool.slice(1).map((q) => q.id);
    const batch = allocateQuestions(l, 1, "medials", 5);
    expect(new Set(batch.map((q) => q.id)).size).toBe(5);
    expect(batch.filter((q) => !q.review)).toHaveLength(1);
  });
  it("adjusts only within grade, using first answers; hints and retries cannot inflate mastery", () => {
    const s = newFamily();
    startAfterDecliningCapture(s, "doudou", "math", "first", 0, false, day);
    let r = s.profiles.doudou.run!,
      q = questionById(r.questions[0])!;
    markRunAssisted(s, "doudou", r.id, 0);
    const restored = validateFamily(JSON.parse(JSON.stringify(s)));
    r = restored.profiles.doudou.run!;
    answerRun(restored, "doudou", r.id, 0, q.answer, day);
    const stat = restored.profiles.doudou.learning.skills[questionSkill(q)];
    expect(stat.correct).toBe(0);
    expect(stat.recent).toBe("h");
    expect(() =>
      answerRun(restored, "doudou", r.id, 0, q.answer, day),
    ).toThrow();
    const l = freshLearning();
    for (let i = 0; i < 5; i++) recordLearning(l, q, true, false, false, day);
    expect(l.skills[questionSkill(q)].level).toBe(2);
    for (let i = 0; i < 3; i++) recordLearning(l, q, false, false, false, day);
    expect(l.skills[questionSkill(q)].level).toBe(1);
    for (let i = 0; i < 50; i++) recordLearning(l, q, true, false, true, day);
    expect(l.skills[questionSkill(q)].level).toBe(1);
  });
  it("preserves original in-progress v3 questions, collection and rewards on migration", () => {
    const old: any = newFamily();
    old.version = 3;
    const ids = LEARNING_BANK.filter(
      (q) => q.grade === 1 && q.course === "words",
    )
      .slice(0, 5)
      .map((q) => q.id);
    const base = newFamily();
    startAfterDecliningCapture(base, "doudou", "english", "legacy", 0, false, day);
    old.profiles.doudou.run = { ...base.profiles.doudou.run, course: "words", questions: ids };
    delete old.profiles.doudou.run.encounter.route;
    for (const p of Object.values(old.profiles) as any[]) {
      delete p.learning;
      if (p.run) {
        delete p.run.answers;
        delete p.run.learningEnabled;
        delete p.run.review;
        delete p.run.assisted;
      }
    }
    const n = validateFamily(old);
    expect(n.version).toBe(9);
    expect(n.profiles.doudou.run!.questions.slice(0, 5)).toEqual(ids);
    expect(n.profiles.doudou.run!.questions).toHaveLength(6);
    expect(n.profiles.doudou.learning.seen).toEqual(expect.arrayContaining(ids));
    expect(n.profiles.doudou.owned).toEqual(old.profiles.doudou.owned);
    expect(parseBackup(JSON.stringify(exportBackup(n)))).toEqual(n);
  });
  it("cannot rewind same-device learning on backup restore; imported active run becomes practice", () => {
    const current = newFamily();
    startAfterDecliningCapture(current, "quintus", "math", "r", 0, false, day);
    const stale = structuredClone(current);
    const before = current.profiles.quintus.learning.cursors;
    allocateBattleQuestion(current, "quintus", "math", "b");
    const high = structuredClone(current.profiles.quintus.learning.cursors);
    restoreFamily(current, stale);
    expect(current.profiles.quintus.learning.cursors).toEqual(high);
    expect(current.profiles.quintus.run!.practice).toBe(true);
    expect(current.profiles.quintus.learning.pending).toBeNull();
    expect(before).toEqual(high);
  });
  it("does not count an imported already-answered question toward adaptation again", () => {
    const s = newFamily();
    startAfterDecliningCapture(s, "quintus", "chinese", "r", 0, false, day);
    const backup = structuredClone(s),
      q = questionById(s.profiles.quintus.run!.questions[0])!;
    answerRun(s, "quintus", "r", 0, q.answer, day);
    const before = structuredClone(s.profiles.quintus.learning.skills);
    restoreFamily(s, backup);
    answerRun(s, "quintus", "r", 0, q.answer, day);
    expect(s.profiles.quintus.learning.skills).toEqual(before);
  });
  it("rejects corrupt or excessive histories and stale battle responses", () => {
    const s = newFamily();
    const a = allocateBattleQuestion(s, "doudou", "english", "a"),
      b = allocateBattleQuestion(s, "doudou", "english", "b");
    expect(a.id).not.toBe(b.id);
    expect(() =>
      recordBattleAnswer(s, "doudou", "a", a.id, true, day),
    ).toThrow();
    recordBattleAnswer(s, "doudou", "b", b.id, true, day);
    expect(() =>
      recordBattleAnswer(s, "doudou", "b", b.id, true, day),
    ).toThrow();
    for (const mutate of [
      (l: any) => (l.cursors = { "g1-add-1": 1e9 }),
      (l: any) => (l.skills = { add: { level: 4 } }),
      (l: any) => (l.seen = ["math-01"]),
      (l: any) =>
        (l.pending = { token: "x", question: "math-01", review: false }),
    ]) {
      const l = freshLearning();
      mutate(l);
      expect(() => validateLearning(l, 1)).toThrow();
    }
    delete (s.profiles.doudou as any).learning;
    expect(() => validateFamily(s)).toThrow();
  });
  it("keeps storage bounded after many new questions without storing generated-ID history", () => {
    const l = freshLearning();
    for (const pool of GENERATED_POOLS.filter((p) => p.grade === 4))
      l.skills[pool.skill] = {
        level: 3,
        recent: "",
        answered: 0,
        correct: 0,
        reviewDay: "",
      };
    for (let i = 0; i < 2000; i++) allocateQuestions(l, 4, "math", 5);
    expect(l.seen).toHaveLength(0);
    expect(JSON.stringify(l).length).toBeLessThan(3000);
    validateLearning(l, 4);
  });
});
