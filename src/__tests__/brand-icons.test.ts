import { createElement, Fragment } from "react";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { annotateTree, AutoRuby, textOf } from "../readability";
import BrandIcon, { BrandIconSprite, BRAND_SYMBOLS, BrandText, renderBrandText } from "../BrandIcon";
describe("brand UI icons preserve learning and reading semantics", () => {
  it.each([1, 2, 4])("replaces card skill and price symbols for grade %i", (grade) => {
    const markup = renderToStaticMarkup(createElement(Fragment, null, annotateTree(createElement("div", null, "\u{1F525} \u2728 \u661F\u706B ", createElement("small", null, "\u{1F7E1} 300")), grade)));
    for (const name of ["fire", "spark", "coin"]) expect(markup).toContain(`data-brand-icon="${name}"`);
    expect(markup).not.toContain("<ruby");
    expect(markup).toContain("300");
  });
  it("leaves teaching visuals and native form fields unchanged", () => {
    const markup = renderToStaticMarkup(createElement(Fragment, null, annotateTree(createElement("div", null, createElement("p", { "data-learning-content": true }, "\u2B50 \u2B50 \u{1F34E} \u2192 \u2197 \u2198\u2197"), createElement("select", null, createElement("option", null, "\u{1F7E1} 300")), createElement("input", { defaultValue: "\u2B50" })), 2)));
    expect(markup).not.toContain("data-brand-icon");
    expect(markup).toContain("\u2B50 \u2B50 \u{1F34E} \u2192 \u2197 \u2198\u2197");
  });
  it("keeps icon sequences intact alongside Chinese annotations and narration", () => {
    const markup = renderToStaticMarkup(createElement(AutoRuby, { text: "\u{1F6E1}\uFE0F \u8B77\u76FE" }));
    expect(markup.match(/data-brand-icon="shield"/g)).toHaveLength(1);
    expect(markup.replace(/<[^>]*>/g, "")).toContain("\u310F\u3128\u02CB");
    expect(textOf(createElement(BrandText, { text: "\u{1F50A} \u807D\u8AAA\u660E" }))).toBe("\u{1F50A} \u807D\u8AAA\u660E");
    expect(textOf(renderBrandText("\u{1F7E1} 300"))).toContain("\u{1F7E1}");
    expect(textOf(createElement(BrandIcon, { name: "coin", symbol: "\u{1F7E1}" }))).toBe("\u{1F7E1}");
  });
  it("maps every UI symbol to an existing reusable vector with no external assets", () => {
    const sprite = readFileSync(new URL("../../public/assets/brand-icons.svg", import.meta.url), "utf8");
    for (const name of Object.values(BRAND_SYMBOLS)) expect(sprite).toContain(`<symbol id="${name}"`);
    expect(sprite).not.toContain("<image");
    expect(sprite).not.toContain("<script");
  });
});

it('keeps SVG paint servers in-document for WebKit without changing icon geometry',()=>{
 const markup=renderToStaticMarkup(createElement(BrandIconSprite));
 expect(markup).toContain('id="brand-ui-teal"');expect(markup).toContain('id="brand-ui-cloud"');
 expect(markup).toContain('url(#brand-ui-teal)');expect(markup).not.toContain('<script');
 const icon=renderToStaticMarkup(createElement(BrandIcon,{name:'speaker'}));
 expect(icon).toContain('href="#brand-ui-speaker"');expect(icon).not.toContain('/assets/brand-icons.svg');
});
