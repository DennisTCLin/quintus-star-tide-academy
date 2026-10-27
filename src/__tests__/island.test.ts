import { afterEach, describe, expect, it } from "vitest";
import { answerLimit } from "../island/question-contract";
import { GAMES, ISLAND_UNITS, UNIT_BY_ID, allScriptLines, isExam, itemSet, makeItem, type Mode } from "../island/games";
import {
  PASS_MARK,
  bossBeaten,
  dayKey,
  dueOnIsland,
  dueStars,
  emptyPlayer,
  finishStage,
  heartsFor,
  kingOpen,
  parseSave,
  playMixKeys,
  recordAnswer,
  stageOpen,
  takeFirstAttempt,
  weakConcepts,
} from "../island/engine";
import { missingZhuyin, zhuyin } from "../island/zhuyin";
import { setRandom } from "../island/rng";
import { phrases as reviewedPhrases } from "../data/taiwan-zhuyin-overrides.json";
import { petById } from "../adventure";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
afterEach(() => setRandom(Math.random));

describe("數學島小遊戲", () => {
  it("全學年單元的守關神獸與小遊戲都存在", () => {
    for (const u of ISLAND_UNITS) {
      expect(petById(u.guardian), u.guardian).toBeTruthy();
      for (const k of u.games) expect(GAMES[k].unit).toBe(u.id);
    }
    expect(ISLAND_UNITS).toHaveLength(110);
    expect(new Set(ISLAND_UNITS.flatMap(u=>u.games))).toEqual(new Set(Object.keys(GAMES)));
    for (const u of ISLAND_UNITS) expect(u.learn).toHaveLength(u.games.length);
  });

  it("每個小遊戲出題：答案在選項內、選項不重複、題號可記進精熟點", () => {
    for (const seed of [1, 7, 42, 2026]) {
      setRandom(seeded(seed));
      for (const k of Object.keys(GAMES)) {
        for (let i = 0; i < 100; i++) {
          const q = makeItem(k, undefined, i % 2 === 1);
          expect(q.choices, `${k} ${q.say}`).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices.length);
          expect(q.choices.length).toBeGreaterThanOrEqual(3);
          expect(q.id).toMatch(/^[a-z0-9-]{2,40}$/i);
          expect(q.say.length).toBeGreaterThan(4);
          expect(q.say, "量詞前要說「兩」").not.toMatch(/二[顆隻個片條格]/);
          expect(q.text.length).toBeGreaterThan(4);
          for (const c of q.choices) expect(Number(c)).toBeGreaterThanOrEqual(0);
          for (const c of q.choices) expect(Number(c)).toBeLessThanOrEqual(answerLimit(q.unit));
        }
      }
    }
  }, 20000);

  it("題目的數量在一年級上學期範圍（10 以內）", () => {
    setRandom(seeded(3));
    for (let i = 0; i < 500; i++) {
      const add = makeItem("add");
      expect(add.p.a + add.p.b).toBeLessThanOrEqual(10);
      const boat = makeItem("boat");
      expect(boat.p.a + boat.p.b).toBeLessThanOrEqual(10);
      const merge = makeItem("merge");
      expect(merge.p.a + merge.p.b).toBeLessThanOrEqual(10);
      const split = makeItem("split");
      expect(split.p.a).toBeLessThan(split.p.n);
      expect(makeItem("count").p.n).toBeLessThanOrEqual(10);
    }
  });

  it("考卷模式（神獸、島主）不用先動手，題目一出現就能作答", () => {
    setRandom(seeded(5));
    for (const mode of ["boss", "mock"] as Mode[])
      for (const k of Object.keys(GAMES))
        for (let i = 0; i < 30; i++) {
          const q = makeItem(k, undefined, true);
          expect(GAMES[k].ready(q, GAMES[k].init(q, mode), mode), `${k} ${mode}`).toBe(true);
        }
  });

  it("學一學要動手做完才能作答，而且照著做一定做得完", () => {
    setRandom(seeded(9));
    for (const k of Object.keys(GAMES))
      for (let i = 0; i < 30; i++) {
        const q = makeItem(k);
        const g = GAMES[k];
        let v = g.init(q, "learn");
        for (let step = 0; step < 40 && !g.ready(q, v, "learn"); step++) {
          expect(g.act, `${k} 需要動手卻沒有 act`).toBeTruthy();
          v = g.act!(q, v, { i: step });
        }
        expect(g.ready(q, v, "learn"), k).toBe(true);
      }
  });

  it("考卷模式不出考卷上沒有的題型：跳格子、聽數字戳泡泡、閃一下", () => {
    setRandom(seeded(21));
    expect(isExam("boss") && isExam("mock") && !isExam("play")).toBe(true);
    for (let i = 0; i < 50; i++) {
      const set = itemSet(ISLAND_UNITS.map((u) => u.id), 10, [], true);
      expect(set.map((q) => q.k)).not.toContain("hop");
      for (const q of set.filter((q) => q.k === "find")) expect(q.p.how).toBe("dots");
    }
    const kinds = new Set(Array.from({ length: 200 }, () => makeItem("find").p.how));
    expect(kinds).toEqual(new Set(["sound", "dots", "flash"]));
  });

  it("題目、示範、提醒的每個國字都有注音；多音字照上下文標", () => {
    setRandom(seeded(31));
    const texts = new Set(allScriptLines());
    for (const k of Object.keys(GAMES)) {
      texts.add(GAMES[k].name);
      for (let i = 0; i < 100; i++) for (const exam of [false, true]) texts.add(makeItem(k, undefined, exam).text);
    }
    for (const t of texts) expect(missingZhuyin(t), t).toEqual([]);
    const zy = (t: string) => zhuyin(t).map((x) => x.zy).join(" ").trim();
    expect(zy("數一數")).toBe("ㄕㄨˇ ㄧ ㄕㄨˇ");
    expect(zy("找出數字")).toBe("ㄓㄠˇ ㄔㄨ ㄕㄨˋ ㄗˋ");
    expect(zy("還要")).toBe("ㄏㄞˊ ㄧㄠˋ");
    expect(zy("倒在一起")).toBe("ㄉㄠˋ ㄗㄞˋ ㄧ ㄑㄧˇ");
    expect(zy("空幾格")).toBe("ㄎㄨㄥˋ ㄐㄧˇ ㄍㄜˊ");
    expect(zy("餅乾")).toBe("ㄅㄧㄥˇ ㄍㄢ");
    expect(zy("都吃光光了")).toBe("ㄉㄡ ㄔ ㄍㄨㄤ ㄍㄨㄤ ˙ㄌㄜ");
  });

  it("數學情境保留教育部朋友讀音與現站已校對詞語", () => {
    const zy=(text:string)=>zhuyin(text).map(x=>x.zy);
    // MOE concise dictionary ID 2895: friend is peng2 you3, not neutral you.
    expect(zy("十的好朋友").slice(-2)).toEqual(["ㄆㄥˊ","ㄧㄡˇ"]);
    expect(zy("數的分解")[0]).toBe("ㄕㄨˋ");
    expect(zy("數一數")).toEqual(["ㄕㄨˇ","ㄧ","ㄕㄨˇ"]);
    for(const [word,readings] of Object.entries(reviewedPhrases)) expect(zy(word),word).toEqual(readings);
  });

  it("每個示範都有步驟和語音", () => {
    for (const k of Object.keys(GAMES)) {
      const d = GAMES[k].demo();
      expect(d.steps.length).toBeGreaterThanOrEqual(3);
      for (const s of d.steps) expect(s.say.length).toBeGreaterThan(0);
      expect(d.item.k).toBe(k);
    }
  });

  it("一趟題目平均出現各種小遊戲", () => {
    setRandom(seeded(11));
    const set = itemSet(["1A-04"], 6);
    const counts = set.reduce<Record<string, number>>((m, q) => ((m[q.k] = (m[q.k] ?? 0) + 1), m), {});
    expect(counts).toEqual({ split: 2, merge: 2, zero: 2 });
    expect(itemSet(ISLAND_UNITS.map((u) => u.id), 10)).toHaveLength(10);
    const unique = itemSet(["1A-06"], 5, ["isl-ten-3"]);
    expect(new Set(unique.map((q) => q.id)).size).toBe(5);
    expect(unique.map((q) => q.id)).not.toContain("isl-ten-3");
    expect(UNIT_BY_ID["1A-06"].games).toContain("ten");
  });
});

describe("數學島進度", () => {
  const now = new Date(2026, 9, 25, 10);
  const item = { k: "add" };

  it("三關依序打開，守關神獸要 8 成才算打敗", () => {
    const p = emptyPlayer();
    expect(stageOpen(p, "1A-01", "learn")).toBe(true);
    expect(stageOpen(p, "1A-01", "play")).toBe(false);
    finishStage(p, "1A-01", "learn", 0.4);
    expect(stageOpen(p, "1A-01", "play")).toBe(true);
    expect(stageOpen(p, "1A-01", "boss")).toBe(false);
    finishStage(p, "1A-01", "play", 0.2);
    expect(stageOpen(p, "1A-01", "boss")).toBe(true);
    finishStage(p, "1A-01", "boss", 0.6);
    expect(bossBeaten(p, "1A-01")).toBe(false);
    finishStage(p, "1A-01", "boss", PASS_MARK);
    finishStage(p, "1A-01", "boss", 0.2);
    expect(bossBeaten(p, "1A-01")).toBe(true);
  });

  it("迷路的星星一種遊戲一顆；隔天回來，不同天連對兩次才回到天上", () => {
    const p = emptyPlayer();
    expect(recordAnswer(p, item, false, now)).toBe("lost");
    expect(recordAnswer(p, item, false, now)).toBe("lost");
    expect(recordAnswer(p, { k: "ten" }, false, now)).toBe("lost");
    expect(p.pool.map((s) => s.k)).toEqual(["add", "ten"]);
    expect(dueStars(p, dayKey(now))).toHaveLength(0);
    expect(recordAnswer(p, item, true, now), "還沒到期，答對不算").toBeNull();
    const d1 = new Date(2026, 9, 26, 10);
    expect(dueStars(p, dayKey(d1))).toHaveLength(2);
    expect(dueOnIsland(p, "1A-06", dayKey(d1))).toBe(2);
    expect(dueOnIsland(p, "1A-01", dayKey(d1))).toBe(0);
    expect(recordAnswer(p, item, true, d1)).toBe("found");
    expect(recordAnswer(p, item, true, d1), "同一天第二次不算").toBeNull();
    expect(p.pool.find((s) => s.k === "add")?.streak).toBe(1);
    const d2 = new Date(2026, 9, 27, 10);
    expect(recordAnswer(p, item, false, d2)).toBe("lost");
    expect(p.pool.find((s) => s.k === "add")?.streak).toBe(0);
    recordAnswer(p, item, true, new Date(2026, 9, 28));
    expect(recordAnswer(p, item, true, new Date(2026, 9, 29))).toBe("home");
    expect(p.pool.map((s) => s.k)).toEqual(["ten"]);
    expect(weakConcepts(p)[0]).toMatchObject({ k: "ten", w: 1 });
  });

  it("玩一玩第 2、4 題：先放到期星星，不夠放已打敗小島的抽查，再不夠放本單元", () => {
    const p = emptyPlayer();
    const today = "2026-10-26";
    expect(playMixKeys(p, "1A-04", today).every((x) => x.why === "own" && UNIT_BY_ID["1A-04"].games.includes(x.k))).toBe(true);
    finishStage(p, "1A-01", "boss", 1);
    const checks = playMixKeys(p, "1A-04", today);
    expect(checks.map((x) => x.why)).toEqual(["check", "check"]);
    for (const x of checks) expect(UNIT_BY_ID["1A-01"].games).toContain(x.k);
    p.pool.push({ k: "hop", due: "2026-10-25", streak: 0, added: "2026-10-24" });
    const mixed = playMixKeys(p, "1A-04", today);
    expect(mixed[0]).toEqual({ k: "hop", why: "star" });
    expect(mixed[1].why).toBe("check");
    p.pool.push({ k: "zero", due: "2026-10-26", streak: 1, added: "2026-10-24" });
    expect(playMixKeys(p, "1A-04", today).map((x) => x.k)).toEqual(["hop", "zero"]);
    p.pool.push({ k: "add", due: "2026-10-27", streak: 0, added: "2026-10-26" });
    expect(playMixKeys(p, "1A-04", today).map((x) => x.k), "明天才到期的不放").toEqual(["hop", "zero"]);
  });

  it("島主大挑戰要三隻神獸都打敗才開；愛心數等於過關題數", () => {
    const p = emptyPlayer();
    const units=ISLAND_UNITS.filter(u=>u.id[0]==='1');
    for (const u of units.slice(0, -1)) finishStage(p, u.id, "boss", 1);
    expect(kingOpen(p)).toBe(false);
    finishStage(p, units.at(-1)!.id, "boss", 0.8);
    expect(kingOpen(p)).toBe(true);
    expect(heartsFor(6)).toBe(4);
  });

  it("同一題當天只有第一次作答算數，隔天重新計算", () => {
    const p = emptyPlayer();
    expect(takeFirstAttempt(p, "isl-add-2-3", "2026-10-25")).toBe(true);
    expect(takeFirstAttempt(p, "isl-add-2-3", "2026-10-25")).toBe(false);
    expect(takeFirstAttempt(p, "isl-add-2-3", "2026-10-26")).toBe(true);
  });

  it("存檔格式不符時拒絕讀取，不會覆寫", () => {
    expect(parseSave(null).players).toEqual({});
    expect(() => parseSave(JSON.stringify({ format: "other" }))).toThrow();
    expect(() => parseSave(JSON.stringify({ format: "star-tide-island", version: 1, players: { a: { units: {} } } }))).toThrow();
    const ok = parseSave(JSON.stringify({ format: "star-tide-island", version: 1, voice: false, players: { a: emptyPlayer() } }));
    expect(ok.voice).toBe(false);
    const old = parseSave(JSON.stringify({ format: "star-tide-island", version: 1, voice: true, players: { a: { ...emptyPlayer(), pool: [
      { id: "1", item: { k: "count" }, due: "2026-10-26", streak: 1, added: "2026-10-25" },
      { id: "2", item: { k: "count" }, due: "2026-10-25", streak: 0, added: "2026-10-24" },
      { id: "3", item: { k: "find" }, due: "2026-10-27", streak: 0, added: "2026-10-26" },
    ] } } }));
    expect(old.players.a.pool, "舊版一題一顆轉成一種遊戲一顆").toEqual([
      { k: "count", due: "2026-10-25", streak: 0, added: "2026-10-25" },
      { k: "find", due: "2026-10-27", streak: 0, added: "2026-10-26" },
    ]);
  });
});

