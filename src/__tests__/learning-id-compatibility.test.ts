import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import baseline from "./fixtures/n1-semantics-944af9a.json";
import publishedConcepts from "./fixtures/c1-semantics-f012644.json";
import publishedFullQuestions from "./fixtures/c1-published-2221c23.json";
import publishedAllConcepts from "./fixtures/c1-published-3946bd3.json";
import { GENERATED_POOLS, generatedId, generatedQuestion } from "../question-generator";
import { questionById, type LearningQuestion } from "../learning";

// Saves and pending answers refer to IDs, so a valid-but-different equation is
// still a breaking change. The independent arithmetic oracle lives separately.
const semantics = (q: LearningQuestion) =>
  [q.id, q.grade, q.course, q.skill, q.level, q.prompt, q.options, q.answer];

it("retains the historical meaning and answer order of every n1 question", () => {
  expect(GENERATED_POOLS.map(pool => pool.key)).toEqual(baseline.pools.map(pool => pool.key));
  for (const frozen of baseline.pools) {
    const pool = GENERATED_POOLS.find(pool => pool.key === frozen.key)!;
    expect(pool.params.length, frozen.key).toBe(frozen.count);
    const entries = pool.params.map((_, i) => semantics(generatedQuestion(generatedId(pool, i))!));
    const digest = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
    expect(digest, `${frozen.key}: add a new ID version rather than reassigning existing IDs`).toBe(frozen.sha256);
    for (const example of frozen.examples) {
      expect(semantics(generatedQuestion(example[0] as string)!)).toEqual(example);
    }
  }
});

it("retains previously published c1 meanings when new concept families are appended", () => {
  for (const frozen of publishedConcepts.items) {
    const question = questionById(frozen[0] as string);
    expect(question, String(frozen[0])).toBeDefined();
    expect(semantics(question!)).toEqual(frozen);
  }
});

it("preserves published c1 reading formats, hints and explanations as well as answers", () => {
  for (const frozen of publishedFullQuestions.items)
    expect(questionById(frozen.id), frozen.id).toEqual(frozen);
});

it("preserves all 48 c1 questions published before English contexts", () => {
  expect(publishedAllConcepts.items).toHaveLength(48);
  for (const frozen of publishedAllConcepts.items)
    expect(questionById(frozen.id), frozen.id).toEqual(frozen);
});
