import { describe, expect, it } from "vitest";
import {
  newBattle,
  battleMove,
  beginBattleQuiz,
  answerBattleQuiz,
  closeBattleQuiz,
  canBattleQuiz,
  petSkill,
  newFamily,
  type Battle,
} from "../adventure";
import { questionById } from "../learning";
function correct(b: Battle, grade: 1 | 2 | 4 = 4) {
  const opened = beginBattleQuiz(b, grade, 0),
    q = questionById(opened.quiz!.question)!;
  return closeBattleQuiz(answerBattleQuiz(opened, q.id, q.answer));
}
function nextTurn(b: Battle) {
  return battleMove(battleMove(b, "guard"), "guard");
}
describe("battle support and effect events", () => {
  it("grants the active companion's skill, once, without advancing turn", () => {
    for (const pet of ["tideglow", "pebblefin", "foamferret"]) {
      const before = newBattle([pet], ["maltese"], "cpu");
      const b = correct(before);
      expect(b.teams[0][0].buff).toEqual({ skill: petSkill(pet), turns: 3 });
      expect(b.round).toBe(1);
      expect(b.turn).toBe(0);
      expect(b.event).toMatchObject({
        kind: "buff",
        target: pet,
        skill: petSkill(pet),
      });
      expect(before.teams[0][0].buff).toBeNull();
      expect(canBattleQuiz(b)).toBe(false);
    }
  });
  it("focus adds exactly 12 to an attack and is consumed once", () => {
    const base = newBattle(["foamferret"], ["foamferret"], "cpu");
    const normal = battleMove(base, "attack"),
      buffed = battleMove(correct(base), "attack");
    expect(buffed.event!.amount - normal.event!.amount).toBe(12);
    expect(buffed.teams[0][0].buff).toBeNull();
    expect(buffed.event).toMatchObject({
      actor: 0,
      source: "foamferret",
      target: "foamferret",
      kind: "attack",
    });
  });
  it("shield reduces only the next incoming hit and records shielding", () => {
    const b = correct(newBattle(["tideglow"], ["foamferret"], "cpu"));
    b.turn = 1;
    b.teams[0][0].shieldUsed = true;
    const normal = structuredClone(b);
    normal.teams[0][0].buff = null;
    const n = battleMove(b, "attack");
    expect(n.event!.amount).toBe(
      battleMove(normal, "attack").event!.amount - 12,
    );
    expect(n.teams[0][0].buff).toBeNull();
    expect(n.event!.shielded).toBe(true);
  });
  it("spark improves one heal, clips actual healed amount to max HP", () => {
    const b = correct(newBattle(["pebblefin"], ["tideglow"], "cpu"));
    b.teams[0][0].hp = 30;
    b.teams[0][0].energy = 2;
    const n = battleMove(b, "heal");
    expect(n.event!.amount).toBe(50);
    expect(n.teams[0][0].hp).toBe(80);
    expect(n.teams[0][0].buff).toBeNull();
    b.teams[0][0].hp = 90;
    expect(battleMove(b, "heal").event!.amount).toBe(10);
  });
  it("spends a chance on opening and forbids retries, repeats, wrong-turn or duo grants", () => {
    let b = beginBattleQuiz(newBattle(["tideglow"], ["maltese"], "cpu"), 1, 0);
    const q = questionById(b.quiz!.question)!;
    expect(q.grade).toBe(1);
    expect(q.course).toBe("english");
    expect(q.speechText).toBeTruthy();
    expect(q.options.every((o) => /^[A-Za-z]/.test(o.text))).toBe(true);
    expect(() => battleMove(b, "attack")).toThrow();
    b = answerBattleQuiz(b, q.id, (q.answer + 1) % q.options.length);
    expect(b.teams[0][0].buff).toBeNull();
    expect(b.teams[0][0].hp).toBe(100);
    expect(() => answerBattleQuiz(b, q.id, q.answer)).toThrow();
    expect(() => beginBattleQuiz(closeBattleQuiz(b), 1, 2)).toThrow();
    const enemy = structuredClone(b);
    enemy.turn = 1;
    expect(() => answerBattleQuiz(enemy, q.id, q.answer)).toThrow();
    const done = structuredClone(b);
    done.winner = 0;
    expect(() => answerBattleQuiz(done, q.id, q.answer)).toThrow();
    expect(() =>
      beginBattleQuiz(newBattle(["tideglow"], ["maltese"], "duo"), 4, 0),
    ).toThrow();
  });
  it("caps at three unique questions, cancellation uses chance, no family rewards", () => {
    const family = newFamily(),
      snapshot = structuredClone(family);
    let b = newBattle([family.profiles.doudou.equipped], ["maltese"], "cpu");
    for (let i = 0; i < 3; i++) {
      b = beginBattleQuiz(b, 1, 0);
      b = closeBattleQuiz(b);
      expect(canBattleQuiz(b)).toBe(false);
      b = nextTurn(b);
    }
    expect(new Set(b.quizUsed).size).toBe(3);
    expect(canBattleQuiz(b)).toBe(false);
    expect(() => beginBattleQuiz(b, 1, 0)).toThrow();
    expect(family).toEqual(snapshot);
  });
  it("expires parked buffs after three own actions, including swaps", () => {
    let b = correct(
      newBattle(["pebblefin", "tideglow"], ["maltese", "pig"], "cpu"),
    );
    b = battleMove(b, "swap:1");
    b = battleMove(b, "guard");
    expect(b.teams[0][0].buff?.turns).toBe(2);
    b = nextTurn(b);
    expect(b.teams[0][0].buff?.turns).toBe(1);
    b = nextTurn(b);
    expect(b.teams[0][0].buff).toBeNull();
  });
  it("retains the defeated target snapshot when a replacement auto-enters", () => {
    const b = newBattle(["foamferret", "maltese"], ["pebblefin", "pig"], "cpu");
    b.teams[1][0].hp = 4;
    const n = battleMove(b, "attack");
    expect(n.active[1]).toBe(1);
    expect(n.event).toMatchObject({
      target: "pebblefin",
      targetHp: 0,
      amount: 4,
      knockout: true,
      targetFighter: { pet: "pebblefin", hp: 0 },
    });
    expect(n.teams[1][1].hp).toBe(100);
  });
  it("rejects stale question ids and invalid choices and preserves grade", () => {
    for (const grade of [1, 2, 4] as const) {
      const b = beginBattleQuiz(
        newBattle(["tideglow"], ["maltese"], "cpu"),
        grade,
        12,
      );
      const q = questionById(b.quiz!.question)!;
      expect(q.grade).toBe(grade);
      expect(() => answerBattleQuiz(b, "old", 0)).toThrow();
      expect(() => answerBattleQuiz(b, q.id, 99)).toThrow();
      b.round++;
      expect(() => answerBattleQuiz(b, q.id, q.answer)).toThrow();
    }
  });
  it("emits distinct events for guard, burst, heal, and swap with bounded HP", () => {
    const b = newBattle(
      ["tideglow", "pebblefin"],
      ["foamferret", "maltese"],
      "duo",
    );
    b.teams[0][0].energy = 3;
    for (const move of ["guard", "burst", "heal", "swap:1"] as const) {
      const n = battleMove(b, move);
      expect(n.event!.kind).toBe(move.startsWith("swap") ? "swap" : move);
      expect(n.event!.targetHp).toBeGreaterThanOrEqual(0);
      expect(n.event!.targetHp).toBeLessThanOrEqual(100);
    }
  });
});
