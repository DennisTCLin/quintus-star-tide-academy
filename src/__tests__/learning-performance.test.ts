import { it, expect } from "vitest";
import { newFamily, validateFamily, PLAYERS } from "../adventure";
import { GENERATED_POOLS } from "../question-generator";
import { LEARNING_BANK } from "../learning";
import { allocateQuestions } from "../learning-engine";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync } from "node:fs";
it("measures bounded generation and complete static non-math seen history", () => {
  const family = newFamily();
  for (const player of PLAYERS) {
    const l = family.profiles[player.id].learning;
    l.seen = LEARNING_BANK.filter(
      (q) => q.grade === player.grade && q.course !== "math",
    ).map((q) => q.id);
    for (const pool of GENERATED_POOLS.filter(
      (p) => p.grade === player.grade,
    )) {
      l.cursors[pool.key] = pool.params.length;
      l.skills[pool.skill] = {
        level: 3,
        recent: "101h1011",
        answered: 100000,
        correct: 80000,
        reviewDay: "2026-10-24",
      };
    }
  }
  const bytes = Buffer.byteLength(JSON.stringify(family));
  // Append-only source expansions retain every historical ID. Jay adds 407 IDs.
  // Complete-history fixture is ~87 KiB; guard it below 96 KiB without deleting history.
  expect(bytes).toBeLessThan(96 * 1024);
  const samples: number[] = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    const s = validateFamily(family);
    allocateQuestions(s.profiles.quintus.learning, 4, "math", 5);
    JSON.stringify(s);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const result = {
    environment: "local Node; not phone hardware",
    iterations: 100,
    p50ms: samples[50],
    p95ms: samples[95],
    maxMs: samples.at(-1),
    saveBytes: bytes,
    generatedByGrade: Object.fromEntries(
      [1, 2, 4].map((g) => [
        g,
        GENERATED_POOLS.filter((p) => p.grade === g).reduce(
          (n, p) => n + p.params.length,
          0,
        ),
      ]),
    ),
  };
  mkdirSync("outputs", { recursive: true });
  writeFileSync(
    "outputs/learning-benchmark.json",
    JSON.stringify(result, null, 2),
  );
  writeFileSync(
    "outputs/learning-exhausted-qa.json",
    JSON.stringify({ format: "star-tide-family", version: 1, family }),
  );
  console.log(JSON.stringify(result));
});
