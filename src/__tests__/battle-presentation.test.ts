import { describe, it, expect } from "vitest";
import { newBattle, battleMove, beginBattleQuiz, answerBattleQuiz, closeBattleQuiz, ROSTER } from "../game-view";
import { advanceBattlePhase, hasLanded, visibleBattle, visibleFighter, moveTitle, BATTLE_TIMING, FAST_BATTLE_TIMING, type BattlePlayback } from "../battle-presentation";
function play(before: ReturnType<typeof newBattle>, move: Parameters<typeof battleMove>[1]): BattlePlayback {
  const after = battleMove(before, move);
  return { before, after, event: after.event!, nonce: 1, phase: "windup" };
}
describe("production battle presentation", () => {
  it("cannot rewind HP when a reduced-motion preference changes mid-impact", () => {
    const p = play(newBattle(["tideglow"], ["pebblefin"], "cpu"), "attack");
    const impact = advanceBattlePhase(p, "impact");
    const retriggeredFlight = advanceBattlePhase(impact, "flight");
    expect(retriggeredFlight).toBe(impact);
    expect(visibleFighter(p.after, retriggeredFlight, 1).hp).toBeLessThan(100);
    expect(advanceBattlePhase(impact, "settle").phase).toBe("settle");
  });
  it("keeps damage, energy and turn unchanged visually until impact, without mutating either state", () => {
    const p = play(newBattle(["tideglow"], ["pebblefin"], "cpu"), "attack");
    const before = JSON.stringify(p.before), after = JSON.stringify(p.after);
    for (const phase of ["windup", "flight"] as const) {
      p.phase = phase;
      expect(hasLanded(p)).toBe(false);
      expect(visibleBattle(p.after, p)).toBe(p.before);
      expect(visibleFighter(p.after, p, 1).hp).toBe(100);
      expect(visibleFighter(p.after, p, 0).energy).toBe(0);
    }
    p.phase = "impact";
    expect(visibleFighter(p.after, p, 1).hp).toBe(100 - p.event.amount);
    expect(visibleBattle(p.after, p).turn).toBe(1);
    expect(JSON.stringify(p.before)).toBe(before);
    expect(JSON.stringify(p.after)).toBe(after);
  });
  it("holds a knocked-out target until settle, then shows the correct reserve", () => {
    const b = newBattle(["foamferret", "tideglow"], ["pebblefin", "seasprout"], "cpu");
    b.teams[1][0].hp = 1;
    const p = play(b, "attack");
    expect(p.after.active[1]).toBe(1);
    for (const phase of ["impact", "settle"] as const) {
      p.phase = phase;
      expect(visibleFighter(p.after, p, 1)).toMatchObject({pet:"pebblefin",hp:0});
    }
    expect(visibleFighter(p.after, null, 1).pet).toBe("seasprout");
  });
  it("self-target actions affect the actor and swaps reveal the incoming pet only at impact", () => {
    const b = newBattle(["tideglow", "foamferret"], ["pebblefin", "seasprout"], "duo");
    b.teams[0][0].energy = 2; b.teams[0][0].hp = 40;
    for (const move of ["guard", "heal", "swap:1"] as const) {
      const p = play(b, move); p.phase = "impact";
      expect(p.event.targetSide).toBe(0);
      expect(visibleFighter(p.after, p, 1).hp).toBe(100);
      if (move === "heal") expect(visibleFighter(p.after, p, 0).hp).toBe(65);
      if (move === "swap:1") {
        expect(visibleFighter(p.after, p, 0).pet).toBe("foamferret");
        p.phase = "windup";
        expect(visibleFighter(p.after, p, 0).pet).toBe("tideglow");
      }
    }
  });
  it("supports all roster companions and five elemental burst titles without changing damage rules", () => {
    const titles = new Set();
    for (const pet of ROSTER) {
      const b = newBattle([pet.id], ["tideglow"], "cpu"); b.teams[0][0].energy = 3;
      const p = play(b, "burst"); if (!pet.signatureMove || pet.supportType !== "focus") titles.add(moveTitle(p.event));
      expect(p.event.amount).toBeGreaterThan(0);
      expect(p.after.teams[0][0].energy).toBe(1);
      expect(visibleFighter(p.after, p, 0).pet).toBe(pet.id);
    }
    expect(titles.size).toBe(5);
  });
  it("correct quiz buffs keep the turn; wrong answers have no new event to animate", () => {
    const b = newBattle(["tideglow"], ["pebblefin"], "cpu");
    const q = {id:"test",options:[{text:"a"},{text:"b"}],answer:0};
    const opened = beginBattleQuiz(b,q);
    const correct = closeBattleQuiz(answerBattleQuiz(opened,q,0));
    expect(correct.turn).toBe(b.turn); expect(correct.event?.kind).toBe("buff");
    const wrong = closeBattleQuiz(answerBattleQuiz(opened,q,1));
    expect(wrong.event).toBeNull(); expect(wrong.turn).toBe(b.turn);
  });
  it("victory and round-limit results remain hidden during windup", () => {
    const b = newBattle(["tideglow"], ["pebblefin"], "cpu"); b.teams[1][0].hp=1;
    const p=play(b,"attack");expect(p.after.winner).toBe(0);expect(visibleBattle(p.after,p).winner).toBeNull();
    b.round=60; b.teams[1][0].hp=100;
    const draw=play(b,"guard");expect(draw.after.winner).toBe("draw");
    expect(visibleBattle(draw.after,draw).winner).toBeNull();
  });
  it("both timelines settle deterministically without depending on asset load or animationend", () => {
    for(const t of [BATTLE_TIMING,FAST_BATTLE_TIMING])expect(t.flight<t.impact&&t.impact<t.settle&&t.settle<t.end).toBe(true);
    expect(FAST_BATTLE_TIMING.end).toBeLessThan(250);
  });
});
