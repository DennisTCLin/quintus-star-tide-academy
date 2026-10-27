import { expect, it } from "vitest";
import { SCIENCE_INQUIRY_V1, SCIENCE_INQUIRY_MANIFEST, INQUIRY_CONCEPTS } from "../science-inquiry";
import { LEARNING_BANK, questionById } from "../learning";
import { GENERATED_POOLS } from "../question-generator";
import { allocateQuestions, freshLearning, validateLearning } from "../learning-engine";
import { newFamily, startRun, answerRun, nextQuestion, validateFamily, allocateBattleQuestion, recordBattleAnswer } from "../adventure";

it("publishes four distinct contexts per concept with balanced, unambiguous answer positions", () => {
  expect(SCIENCE_INQUIRY_V1).toHaveLength(16);
  expect(new Set(LEARNING_BANK.map(q => q.id)).size).toBe(LEARNING_BANK.length);
  const positions = [0, 0, 0, 0];
  for (const q of SCIENCE_INQUIRY_V1) {
    expect(q.id).toMatch(/^c1-g4-science-\d{2}$/);
    expect(q.grade).toBe(4);
    expect(q.course).toBe("science");
    expect(q.skill).toBe("observation");
    expect(new Set(q.options.map(x => x.text)).size).toBe(4);
    expect(q.hint.length).toBeGreaterThan(15);
    expect(q.explanation.length).toBeGreaterThan(30);
    positions[q.answer]++;
  }
  expect(positions).toEqual([4, 4, 4, 4]);
  for (const concept of Object.keys(INQUIRY_CONCEPTS)) {
    const items = SCIENCE_INQUIRY_MANIFEST.items.filter(item => item.concept === concept);
    expect(items).toHaveLength(4);
    expect(new Set(items.map(item => item.context)).size).toBe(4);
  }
});

it("introduces different concepts within a fresh six-question science voyage", () => {
  const batch = allocateQuestions(freshLearning(), 4, "science", 6);
  expect(batch[0].id).toBe("c1-g4-science-01");
  expect(batch[4].id).toBe("c1-g4-science-02");
  expect(new Set(batch.map(q => q.id)).size).toBe(6);
  expect(batch.every(q => !q.review)).toBe(true);
});

it("retains concept IDs and earned progress across active-save and pending battle restoration", () => {
  const day = "2026-10-25";
  let family = newFamily();
  startRun(family, "quintus", "science", "inquiry-restore", 0, false, day);
  const first = family.profiles.quintus.run!.questions[0];
  expect(first).toBe("c1-g4-science-01");
  family = validateFamily(JSON.parse(JSON.stringify(family)));
  answerRun(family, "quintus", "inquiry-restore", 0, questionById(first)!.answer, day);
  expect(family.profiles.quintus.learning.skills.observation.correct).toBe(1);
  expect(() => answerRun(family, "quintus", "inquiry-restore", 0, questionById(first)!.answer, day)).toThrow();
  nextQuestion(family, "quintus", "inquiry-restore", 0);
  family = validateFamily(JSON.parse(JSON.stringify(family)));
  expect(family.profiles.quintus.run!.answers).toEqual([true]);
  expect(family.profiles.quintus.run!.questions).toContain(first);

  // Arena and voyage share novelty; force the next curated slot without
  // manufacturing unknown IDs or bypassing the real pending-answer reader.
  const state = newFamily();
  const b = allocateBattleQuestion(state, "quintus", "science", "inquiry-pending");
  expect(b.id).toBe(first);
  const restored = validateFamily(JSON.parse(JSON.stringify(state)));
  expect(restored.profiles.quintus.learning.pending?.question).toBe(first);
  recordBattleAnswer(restored, "quintus", b.token, b.id, true, day);
  expect(restored.profiles.quintus.learning.pending).toBeNull();
});

it("does not reissue new IDs across saves and falls back honestly after exhaustion", () => {
  let learning = freshLearning();
  const seen = new Set<string>();
  for (let round = 0; round < 15; round++) {
    for (const item of allocateQuestions(learning, 4, "science", 6)) {
      expect(item.review).toBe(false);
      expect(seen.has(item.id), item.id).toBe(false);
      seen.add(item.id);
    }
    learning = validateLearning(JSON.parse(JSON.stringify(learning)), 4);
  }
  for (const item of SCIENCE_INQUIRY_V1) expect(seen.has(item.id), item.id).toBe(true);
  learning.seen = LEARNING_BANK.filter(q => q.grade === 4 && q.course === "science").map(q => q.id);
  for (const pool of GENERATED_POOLS.filter(p => p.grade === 4 && p.course === "science")) learning.cursors[pool.key] = pool.params.length;
  const exhausted = allocateQuestions(learning, 4, "science", 6);
  expect(exhausted.every(item => item.review)).toBe(true);
  expect(new Set(exhausted.map(item => item.id)).size).toBe(6);
  expect(() => validateLearning(learning, 4)).not.toThrow();
});
