import {startAfterDecliningCapture} from './helpers/capture';
import { describe, it, expect, vi, afterEach } from "vitest";
import { newFamily, validateFamily, startRun, answerRun, nextQuestion, claimReward, abandonRun, draw, FAMILY_KEY, type Family } from "../adventure";
import { questionById } from "../learning";
import { transact, restoreFamily } from "../family-store";
const day = "2026-10-24";
function complete(s: Family, runId = "r", date = day, correct = true, practice = false) {
  startAfterDecliningCapture(s, "qingqing", "math", runId, 0, practice, date);
  for (let i = 0; i < 6; i++) {
    const r = s.profiles.qingqing.run!, q = questionById(r.questions[i])!;
    answerRun(s, "qingqing", runId, i, !correct && i < 2 ? (q.answer + 1) % q.options.length : q.answer, date);
    if (i < 5) nextQuestion(s, "qingqing", runId, i);
  }
}
// A completed pre-v7 voyage reserved a choice rather than automatically saving a star.
function legacyPending(s: Family, runId = "r") {
  const p=s.profiles.qingqing, stars=p.rewardStars, tickets=p.tickets;
  complete(s, runId);
  p.rewardStars=stars;p.tickets=tickets;p.run!.reward="pending";
}
describe("automatic completion stars and legacy choices", () => {
  it("rewards six-question completion with at most two wrong answers, saves two stars into one ticket, and never spends learning", () => {
    let s = newFamily();
    complete(s, "one", day, false);
    expect(s.profiles.qingqing.run!.reward).toBe("saved");
    expect(s.profiles.qingqing.rewardRounds).toBe(1);
    expect(() => claimReward(s, "qingqing", "one", "save")).toThrow();
    s = validateFamily(JSON.parse(JSON.stringify(s)));
    expect(s.profiles.qingqing.rewardStars).toBe(1);
    complete(s, "two");
    const before = structuredClone(s.profiles.qingqing.milestones);
    expect(s.profiles.qingqing.run!.reward).toBe("exchanged");
    expect(s.profiles.qingqing).toMatchObject({ rewardStars: 0, tickets: 1 });
    expect(s.profiles.qingqing.milestones).toEqual(before);
  });
  it.each([[0, "won", 1], [0.499999, "won", 1], [0.5, "miss", 0], [0.999999, "miss", 0]] as const)("chance boundary %s persists %s without consuming saved stars", (roll, outcome, tickets) => {
    const s = newFamily(); s.profiles.qingqing.rewardStars = 1;
    legacyPending(s); const before = structuredClone(s.profiles.qingqing.milestones);
    expect(claimReward(s, "qingqing", "r", "chance", roll)).toBe(outcome);
    const loaded = validateFamily(JSON.parse(JSON.stringify(s)));
    expect(loaded.profiles.qingqing).toMatchObject({ tickets, rewardStars: 1 });
    expect(loaded.profiles.qingqing.milestones).toEqual(before);
    expect(() => claimReward(loaded, "qingqing", "r", "save")).toThrow();
  });
  it("automatically grants two tickets for four wins; practice gets none", () => {
    const s = newFamily();
    for (let i = 0; i < 4; i++) complete(s, `r${i}`);
    expect(s.profiles.qingqing).toMatchObject({ rewardRounds: 4, tickets: 2 });
    expect(s.profiles.qingqing.run!.reward).toBe("exchanged");
    complete(s, "practice", "2026-10-25", true, true);
    expect(s.profiles.qingqing).toMatchObject({ rewardRounds: 0, rewardStars: 0, tickets:2 });
    expect(() => claimReward(s, "qingqing", "practice", "save")).toThrow();
  });
  it("pending choice survives reload and midnight; neither start nor stale cancel can erase it", () => {
    const s = newFamily(); legacyPending(s);
    const loaded = validateFamily(JSON.parse(JSON.stringify(s)));
    expect(() => startAfterDecliningCapture(loaded, "qingqing", "math", "next", 0, false, "2026-10-25")).toThrow();
    expect(() => abandonRun(loaded, "qingqing", "r")).toThrow();
    expect(() => claimReward(loaded, "qingqing", "other", "save")).toThrow();
    claimReward(loaded, "qingqing", "r", "save");
    complete(loaded, "next", "2026-10-25");
    expect(loaded.profiles.qingqing).toMatchObject({ rewardRounds: 1, rewardStars: 0, tickets:1 });
    expect(loaded.profiles.qingqing.run!.reward).toBe("exchanged");
  });
  it("a run crossing midnight cannot reserve a reward", () => {
    const s = newFamily(); startAfterDecliningCapture(s, "qingqing", "math", "old", 0, false, day);
    for (let i = 0; i < 6; i++) {
      const r = s.profiles.qingqing.run!;
      answerRun(s, "qingqing", "old", i, questionById(r.questions[i])!.answer, "2026-10-25");
      if (i < 5) nextQuestion(s, "qingqing", "old", i);
    }
    expect(s.profiles.qingqing.run!.reward).toBe("none");
    expect(s.profiles.qingqing.rewardRounds).toBe(0);
  });
  it.each([1, 2, 3])("migrates v%s without retroactive rewards or lost history", (version) => {
    const s = newFamily(); complete(s); const legacy = JSON.parse(JSON.stringify(s));
    legacy.version = version;
    for (const p of Object.values(legacy.profiles) as any[]) {
      delete p.rewardStars; delete p.rewardRounds;
      if (p.run) delete p.run.reward;
      if (version < 3) delete p.firstAcquired;
    }
    if (version === 1) delete legacy.profiles.doudou;
    legacy.profiles.qingqing.tickets = 7; legacy.profiles.qingqing.coins = 123;
    const loaded = validateFamily(legacy);
    expect(loaded.version).toBe(9);
    expect(loaded.profiles.qingqing).toMatchObject({ tickets: 7, coins: 183, rewardStars: 0, rewardRounds: 0 });
    expect(loaded.profiles.qingqing.run!.reward).toBe("none");
    expect(loaded.profiles.qingqing.milestones).toEqual(s.profiles.qingqing.milestones);
    expect(() => claimReward(loaded, "qingqing", "r", "chance", 0)).toThrow();
    draw(loaded, "qingqing", "draw", .99, 0, day, day);
    expect(validateFamily(loaded).profiles.qingqing.firstAcquired).toEqual(loaded.profiles.qingqing.firstAcquired);
  });
  it("rejects damaged new reward fields rather than resetting balances", () => {
    for (const field of ["rewardStars", "rewardRounds"]) {
      const s = newFamily(); delete (s.profiles.qingqing as any)[field];
      expect(() => validateFamily(s)).toThrow();
    }
    const s = newFamily(); complete(s); (s.profiles.qingqing.run as any).reward = "fake";
    expect(() => validateFamily(s)).toThrow();
  });
});
describe("reward storage transactions", () => {
  afterEach(() => vi.unstubAllGlobals());
  function storage(s: Family) {
    let bytes = JSON.stringify(s), writes = 0, fail = false;
    let queue = Promise.resolve();
    vi.stubGlobal("localStorage", { getItem: (key: string) => key === FAMILY_KEY ? bytes : null, setItem: (_key: string, next: string) => { if (fail) throw Error("quota"); bytes = next; writes++; } });
    vi.stubGlobal("navigator", { locks: { request: (_name: string, work: () => unknown) => { const next = queue.then(work); queue = next.then(() => undefined, () => undefined); return next; } } });
    return { load: () => validateFamily(JSON.parse(bytes)), writes: () => writes, fail: (v: boolean) => { fail = v; }, bytes: () => bytes };
  }
  it("serializes two simultaneous claims, while merging an unrelated profile update", async () => {
    const s = newFamily(); legacyPending(s); const disk = storage(s);
    const results = await Promise.allSettled([
      transact((f) => claimReward(f, "qingqing", "r", "chance", 0)),
      transact((f) => claimReward(f, "qingqing", "r", "save")),
      transact((f) => { f.profiles.doudou.coins += 5; }),
    ]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
    expect(disk.writes()).toBe(2);
    expect(disk.load().profiles.qingqing).toMatchObject({ tickets: 1, rewardStars: 0 });
    expect(disk.load().profiles.doudou.coins).toBe(5);
  });
  it("failed persistence leaves pending bytes untouched and retry grants once", async () => {
    const s = newFamily(); legacyPending(s); const disk = storage(s); const before = disk.bytes();
    disk.fail(true);
    await expect(transact((f) => claimReward(f, "qingqing", "r", "save"))).rejects.toThrow("quota");
    expect(disk.bytes()).toBe(before);
    disk.fail(false);
    await transact((f) => claimReward(f, "qingqing", "r", "save"));
    expect(disk.writes()).toBe(1);
    expect(disk.load().profiles.qingqing.rewardStars).toBe(1);
  });
});

describe("combined schema5 migration", () => {
  it.each(["rewards", "learning", "both"])("preserves complete %s schema4 variants", (variant) => {
    const state = newFamily(); legacyPending(state);
    state.profiles.qingqing.rewardStars = 1;
    const history = structuredClone(state.profiles.qingqing.learning);
    const old = JSON.parse(JSON.stringify(state)); old.version = 4;
    for (const p of Object.values(old.profiles) as any[]) {
      if (variant === "rewards") {
        delete p.learning;
        if (p.run) { delete p.run.review; delete p.run.assisted; delete p.run.learningEnabled; }
      }
      if (variant === "learning") {
        delete p.rewardStars; delete p.rewardRounds;
        if (p.run) delete p.run.reward;
      }
    }
    const loaded = validateFamily(old), p = loaded.profiles.qingqing;
    expect(loaded.version).toBe(9);
    expect(p.milestones).toEqual(state.profiles.qingqing.milestones);
    expect(p.tickets).toBe(state.profiles.qingqing.tickets);
    if (variant !== "rewards") expect(p.learning).toEqual(history);
    if (variant !== "learning") {
      expect(p.rewardStars).toBe(1);
      expect(claimReward(loaded, "qingqing", "r", "save")).toBe("exchanged");
    } else {
      expect(p.rewardStars).toBe(0); expect(p.run!.reward).toBe("none");
    }
  });
  it("rejects partial v4 features and missing v5 data without erasing progress", () => {
    for (const version of [4, 5]) {
      const s:any = newFamily(); s.version = version;
      delete s.profiles.qingqing.rewardRounds;
      expect(() => validateFamily(s)).toThrow();
      const n:any = newFamily(); n.version = version;
      n.profiles.qingqing.learning = {version: 1};
      expect(() => validateFamily(n)).toThrow();
    }
  });
});

it("legacy backup restoration preserves a valid completed pending reward", () => {
 const incoming = newFamily(); legacyPending(incoming);
 const current = newFamily(); restoreFamily(current, incoming);
 expect(validateFamily(current).profiles.qingqing.run!.reward).toBe("pending");
 expect(claimReward(current, "qingqing", "r", "save")).toBe("saved");
});

it("continuing a completed voyage starts one fresh run without granting its reward twice", () => {
  const s = newFamily(); complete(s, "finished");
  const loaded = validateFamily(JSON.parse(JSON.stringify(s))), p = loaded.profiles.qingqing;
  const balance = { coins: p.coins, tickets: p.tickets, rewardStars: p.rewardStars, rewardRounds: p.rewardRounds };
  const questions = [...p.run!.questions];
  startAfterDecliningCapture(loaded, "qingqing", "math", "continue", 3, false, day);
  expect(p).toMatchObject(balance);
  expect(p.run).toMatchObject({ id: "continue", course: "math", practice: false, status: "active", reward: "none", index: 0 });
  expect(p.run!.questions).not.toEqual(questions);
  expect(() => startAfterDecliningCapture(loaded, "qingqing", "math", "duplicate", 4, false, day)).toThrow();
  expect(() => claimReward(loaded, "qingqing", "finished", "save")).toThrow();
  expect(p).toMatchObject(balance);
  expect(p.run!.id).toBe("continue");
});
