import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { elementDemo } from "../element-demo";
import ElementGuide from "../ElementGuide";
import { ReadingContext } from "../readability";

describe("child-facing element demonstration", () => {
  it.each([
    [0, "金", "水", "木"], [1, "木", "火", "土"], [2, "水", "木", "火"],
    [3, "火", "土", "金"], [4, "土", "金", "水"],
  ] as const)("shows correct outgoing/incoming pairs for %s", (index, source, incoming, foe) => {
    const generation = elementDemo("generation", index);
    expect(generation.source.element).toBe(source);
    expect(generation.target.element).toBe(incoming);
    expect(generation.amount).toBe(8);
    expect(generation.afterHp).toBe(generation.beforeHp + 8);
    expect(generation.nextTurn).toBe(1);
    const advantage = elementDemo("advantage", index);
    expect(advantage.source.element).toBe(source);
    expect(advantage.target.element).toBe(foe);
    expect(advantage.afterHp).toBe(advantage.beforeHp - advantage.amount);
  });
  it.each([0, 1, 2, 3, 4])("clips healing to the actual recipient maximum for element %s", index => {
    const near = elementDemo("generation", index, "near");
    expect(near.amount).toBe(4);
    expect(near.beforeHp).toBe(near.maxHp - 4);
    expect(near.afterHp).toBe(near.maxHp);
    const full = elementDemo("generation", index, "full");
    expect(full.amount).toBe(0);
    expect(full.afterHp).toBe(full.beforeHp);
  });
  it("uses live rarity stats and the unguarded battle result rather than a fixed 100 HP diagram", () => {
    expect(elementDemo("generation", 1, "near")).toMatchObject({ maxHp:124, beforeHp:120, afterHp:124, amount:4 });
    expect(elementDemo("advantage", 2)).toMatchObject({ maxHp:124, beforeHp:124, afterHp:100, amount:24 });
    expect(elementDemo("advantage", 3)).toMatchObject({ maxHp:100, beforeHp:100, afterHp:68, amount:32 });
  });
  it("handles invalid detail indexes and initializes a paused, accessible example", () => {
    expect(elementDemo("generation", 999).source.element).toBe("水");
    const html = renderToStaticMarkup(createElement(ReadingContext.Provider, {value:{grade:2, voice:false}},
      createElement(ElementGuide, {element:999, reduced:true})));
    expect(html).toContain('data-playing="false"');
    expect(html).toContain('aria-label="看下一步"');
    expect(html).toContain('role="meter"');
    expect(html).toContain('aria-valuenow="60"');
    expect(html).not.toContain('<ruby');
  });
});
