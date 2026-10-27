import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ELEMENTS, ELEMENT_RULES, GENERATION_RULES, hasElementGeneration } from "../elements";
import { ROSTER, newBattle, battleMove, petElement } from "../game-view";
import { visibleFighter, moveTitle, type BattlePlayback } from "../battle-presentation";
import ElementGuide from "../ElementGuide";
import { ReadingContext, syllables } from "../readability";

const generates = new Set(["金水", "水木", "木火", "火土", "土金"]);
const names = ["金", "木", "水", "火", "土"];
function pair(source: string, target: string) {
  const a = ROSTER.find(c => c.element === source)!;
  const b = ROSTER.find(c => c.element === target && c.id !== a.id)!;
  return [a.id, b.id];
}
function prepare(hp = 80, side: 0 | 1 = 0) {
  const pets = pair("水", "木");
  const b = newBattle(side ? ["maltese", "pig"] : pets, side ? pets : ["maltese", "pig"], "duo");
  b.turn = side; b.teams[side][1].hp = hp;
  return b;
}
describe("five element generation and overcoming", () => {
  it.each(names.flatMap(a => names.map(b => [a, b])))
    ("allows only directed generation %s → %s", (source, target) => {
      const [a, d] = pair(source, target);
      const b = newBattle([a, d], ["maltese", "pig"], "duo");
      b.teams[0][1].hp = 80;
      const snapshot = structuredClone(b);
      const n = battleMove(b, "swap:1");
      const heal = generates.has(source + target) ? 8 : 0;
      expect(hasElementGeneration(petElement(a), petElement(d))).toBe(!!heal);
      expect(n.teams[0][1].hp).toBe(80 + heal);
      expect(n.event).toMatchObject({ kind:"swap", amount:heal, target:d, targetSide:0, targetHp:80+heal, targetFighter:{pet:d,hp:80+heal} });
      expect(n.teams[0][0].hp).toBe(snapshot.teams[0][0].hp);
      expect(n.teams[1]).toEqual(b.teams[1]);
      expect(n.round).toBe(2); expect(n.turn).toBe(1);
      expect(b).toEqual(snapshot);
    });
  it.each([0, 1] as const)("clips HP and reports actual healing for side %i", side => {
    for (const [hp, amount] of [[80,8],[96,4],[100,0]]) {
      const n = battleMove(prepare(hp, side), "swap:1");
      expect(n.event!.amount).toBe(amount);
      expect(n.teams[side][1].hp).toBe(hp+amount);
      expect(n.turn).toBe(side ? 0 : 1);
      expect(n.event!.message).toContain(amount ? `回復 ${amount} 體力` : "體力已滿");
      expect(moveTitle(n.event!)).toBe(amount ? "相生接力" : "夥伴接力");
    }
  });
  it("does not spend energy, stack spark healing or revive an exhausted ally", () => {
    const b = prepare(); b.teams[0][1].energy=2;
    b.teams[0][1].buff={skill:"spark",turns:3};
    const n=battleMove(b,"swap:1");
    expect(n.event!.amount).toBe(8);
    expect(n.teams[0][1].energy).toBe(2);
    expect(n.teams[0][1].buff).toEqual({skill:"spark",turns:2});
    for (const move of ["swap:0","swap:9"] as const) expect(()=>battleMove(b,move)).toThrow();
    b.teams[0][1].hp=0; expect(()=>battleMove(b,"swap:1")).toThrow();
    expect(b.teams[0][1].hp).toBe(0);
  });
  it("does not heal an automatic knockout replacement", () => {
    const b=prepare(71,1);b.turn=0;b.teams[1][0].hp=1;
    const n=battleMove(b,"attack");
    expect(n.active[1]).toBe(1);expect(n.teams[1][1].hp).toBe(71);
    expect(n.event!.kind).toBe("attack");
  });
  it("shows the outgoing companion until impact, then the incoming healed snapshot", () => {
    const before=prepare(96),after=battleMove(before,"swap:1");
    const playback:BattlePlayback={before,after,event:after.event!,nonce:1,phase:"windup"};
    expect(visibleFighter(after,playback,0).pet).toBe(before.teams[0][0].pet);
    playback.phase="impact";
    expect(visibleFighter(after,playback,0)).toMatchObject({pet:before.teams[0][1].pet,hp:100});
  });
  it("uses capped recovery in final-round scoring and rejects invalid element indexes", () => {
    const b=prepare(96);b.round=60;
    const n=battleMove(b,"swap:1");expect(n.winner).toBe("draw");
    expect(hasElementGeneration(-1,2)).toBe(false);expect(hasElementGeneration(0,99)).toBe(false);
  });
  it("shows both cycles and correct incoming/outgoing relations with grade2 readings", () => {
    const full=renderToStaticMarkup(createElement(ElementGuide));
    expect(full).toContain(GENERATION_RULES);expect(full).toContain(ELEMENT_RULES);
    expect(full).toContain("主動換上");expect(full).toContain("自動替補不觸發");
    for(const [index,e] of ELEMENTS.entries()){
      const text=renderToStaticMarkup(createElement(ElementGuide,{element:index}));
      expect(text).toContain(`${e.name}生${e.generates}`);
      expect(text).toContain(`${ELEMENTS.find(x=>x.generates===e.name)!.name}生${e.name}`);
      expect(text).toContain(`${e.name}剋${e.overcomes}`);
    }
    const annotated=renderToStaticMarkup(createElement(ReadingContext.Provider,{value:{grade:2,voice:false}},createElement(ElementGuide)));
    expect(annotated).not.toContain("<ruby");
    expect(syllables("相生接力").map(x=>x.zy)).toEqual(["ㄒㄧㄤ","ㄕㄥ","ㄐㄧㄝ","ㄌㄧˋ"]);
  });
});
