import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import canonical from "../data/interface-zhuyin.json";
import packed from "../data/interface-zhuyin-packed.json";
import { syllables } from "../readability";

describe("lossless pronunciation packing", () => {
  it("retains every phrase and character in the reviewed dictionary", () => {
    expect({
      phrases: Object.fromEntries(Object.entries(packed.phrases).map(([word, values]) =>
        [word, values.map(index => packed.syllables[index])])),
      chars: Object.fromEntries(Object.entries(packed.chars).map(([char, index]) =>
        [char, packed.syllables[index]])),
    }).toEqual(canonical);
  });

  it("renders every complete phrase and character with identical readings", () => {
    for (const [word, expected] of Object.entries(canonical.phrases))
      expect(syllables(word).map(x => x.zy), word).toEqual(expected);
    for (const [char, expected] of Object.entries(canonical.chars))
      expect(syllables(char).map(x => x.zy), char).toEqual([expected]);
  });

  it("keeps unknown text, emoji and punctuation without invented ruby", () => {
    expect(syllables("A🦊 42，𠮷")).toEqual(Array.from("A🦊 42，𠮷", text => ({ text, zy: "" })));
  });

  it("matches the deterministic build artifact exactly", () => {
    expect(() => execFileSync(process.execPath, ["scripts/pack-zhuyin.mjs", "--check"])).not.toThrow();
  });

  it("rejects stale runtime data and regenerates deterministically", () => {
    const root = mkdtempSync(join(tmpdir(), "zhuyin-pack-"));
    try {
      mkdirSync(join(root, "scripts"));
      mkdirSync(join(root, "src/data"), { recursive: true });
      const script = join(root, "scripts/pack-zhuyin.mjs");
      const source = join(root, "src/data/interface-zhuyin.json");
      const target = join(root, "src/data/interface-zhuyin-packed.json");
      writeFileSync(script, readFileSync("scripts/pack-zhuyin.mjs"));
      writeFileSync(source, JSON.stringify(canonical));
      execFileSync(process.execPath, [script]);
      const first = readFileSync(target, "utf8");
      execFileSync(process.execPath, [script]);
      expect(readFileSync(target, "utf8")).toBe(first);
      writeFileSync(source, JSON.stringify({ ...canonical, chars: { ...canonical.chars, "測": "ㄘㄜˋ" }, phrases: {} }));
      expect(() => execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" })).toThrow();
      execFileSync(process.execPath, [script]);
      expect(() => execFileSync(process.execPath, [script, "--check"])).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
