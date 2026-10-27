import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ELEMENTS, hasElementAdvantage } from "../elements";
import { BASE_ROSTER, ROSTER, petElement, petSkill, newBattle, battleMove } from "../game-view";
import { validateFamily } from "../adventure";
import { Spell } from "../BattleScene";
import { syllables, AutoRuby } from "../readability";
import { moveTitle } from "../battle-presentation";
import savedFamily from "./fixtures/pre-five-elements-family.json";

describe("five elements across companions, combat and reading", () => {
  const names = ["金", "木", "水", "火", "土"];
  const overcomes = new Set(["金木", "木土", "土水", "水火", "火金"]);

  it("gives every existing companion one named element without changing skills or identity", () => {
    expect(ELEMENTS.map(e => e.name)).toEqual(names);
    expect(BASE_ROSTER).toHaveLength(105)
    expect(ROSTER).toHaveLength(215);
    const savedIds = Object.keys(savedFamily.profiles.quintus.owned);
    expect(BASE_ROSTER.filter(c => c.catalogNumber <= 55).map(c => c.id).sort()).toEqual(savedIds.sort());
    for (const c of BASE_ROSTER.filter(c => c.catalogNumber <= 55)) {
      expect(names).toContain(c.element);
      expect(ELEMENTS[petElement(c.id)].name).toBe(c.element);
      expect(petSkill(c.id)).toBe(["focus", "shield", "spark"][c.catalogNumber % 3]);
    }
    const oldIndex = ROSTER[0].catalogNumber;
    try {
      ROSTER[0].catalogNumber = 99;
      expect(ELEMENTS[petElement(ROSTER[0].id)].name).toBe(ROSTER[0].element);
    } finally { ROSTER[0].catalogNumber = oldIndex; }
  });

  it.each(names.flatMap(a => names.map(d => [a, d])))
    ("applies the five-element rule for %s attacking %s", (attacker, defender) => {
      const a = ROSTER.find(c => c.element === attacker)!;
      const d = ROSTER.find(c => c.element === defender)!;
      const advantaged = overcomes.has(attacker + defender);
      expect(hasElementAdvantage(petElement(a.id), petElement(d.id))).toBe(advantaged);
      for (const move of ["attack", "burst"] as const) {
        const before = newBattle([a.id], [d.id], "cpu");
        // Isolate element advantages from rarity/level stat growth.
        for (const fighter of before.teams.flat()) {
          fighter.stats = { hp: 100, attack: 22, defense: 8, level: 1 };
          fighter.hp = 100;
        }
        before.teams[0][0].energy = 2;
        before.teams[1][0].shieldUsed = true;
        const after = battleMove(before, move);
        const expected = (move === "attack" ? 18 : 30) + (petSkill(a.id) === "focus" ? 3 : 0) + (advantaged ? 8 : 0);
        expect(after.event!.amount).toBe(expected);
        expect(after.event!.message.includes("屬性有利")).toBe(advantaged);
        expect(before.teams[1][0].hp).toBe(100);
        if (move === "burst") expect(moveTitle(after.event!)).toBe(ELEMENTS[petElement(a.id)].burst);
      }
    });

  it("renders five distinct spell shapes and branded readable attribute labels", () => {
    const spells = ELEMENTS.map((e, i) => {
      const markup = renderToStaticMarkup(createElement(AutoRuby, { text: `${e.icon} ${e.name}` }));
      expect(markup).toContain(`data-brand-icon="${["metal", "leaf", "water", "fire", "earth"][i]}"`);
      expect(markup.replace(/<[^>]*>/g, "")).toContain(e.zy);
      const spell = renderToStaticMarkup(createElement(Spell, { element: i }));
      return spell.replace(/spell-[0-4]/, "spell");
    });
    expect(new Set(spells).size).toBe(5);
    expect(syllables("五行").map(s => s.zy)).toEqual(["ㄨˇ", "ㄒㄧㄥˊ"]);
    for (const e of ELEMENTS) expect(syllables(e.burst).every(s => s.zy)).toBe(true);
  });

  it("loads the previous production save without changing scores, companions, XP, equipment or active runs", () => {
    const loaded = validateFamily(savedFamily);
    for (const id of Object.keys(savedFamily.profiles) as (keyof typeof savedFamily.profiles)[]) {
      const before = savedFamily.profiles[id], after = loaded.profiles[id];
      for (const key of ['milestones', 'owned', 'growth', 'equipped'] as const) expect(after[key]).toEqual(before[key]);
      if (before.run) expect(after.run!.questions.slice(0, before.run.questions.length)).toEqual(before.run.questions);
    }
    expect(validateFamily(loaded)).toEqual(loaded);
  });
});
