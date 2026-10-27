import { describe, expect, it } from "vitest";
import { READING_CONTEXTS_V1, READING_CONTEXT_CONCEPTS, READING_CONTEXT_MANIFEST } from "../reading-contexts";
import { LEARNING_BANK, questionById } from "../learning";
import { allocateQuestions, freshLearning, validateLearning, type LearningState } from "../learning-engine";
import { newFamily, startRun, answerRun, validateFamily, allocateBattleQuestion, recordBattleAnswer } from "../adventure";
import { syllables } from "../readability";
import { questionSpeech } from "../speech-text";

const lane = LEARNING_BANK.filter(q => q.grade === 2 && q.course === "words" && !q.examSources);
const passages = new Set(READING_CONTEXTS_V1.map(q => q.id));
function assertMixed(state: LearningState) {
  const batch = allocateQuestions(state, 2, "words", 6);
  expect(new Set(batch.map(q => q.id)).size).toBe(6);
  expect(batch.filter(q => passages.has(q.id))).toHaveLength(2);
  expect(batch.filter(q => !passages.has(q.id))).toHaveLength(4);
  return batch;
}

describe("grade-two short-context reading", () => {
  it("offers four interleaved concepts with brief choices and complete annotations", () => {
    expect(READING_CONTEXTS_V1).toHaveLength(16);
    expect(new Set(LEARNING_BANK.map(q => q.id)).size).toBe(LEARNING_BANK.length);
    const positions = [0, 0, 0, 0];
    for (const q of READING_CONTEXTS_V1) {
      expect(q.id).toMatch(/^c1-g2-words-\d{2}$/);
      expect([q.grade, q.course, q.subject, q.skill, q.format]).toEqual([2, "words", "chinese", "words", "short-passage"]);
      expect(new Set(q.options.map(o => o.text)).size).toBe(4);
      expect(q.options.every(o => o.text.length <= 10)).toBe(true);
      expect(q.prompt.length).toBeLessThanOrEqual(50);
      expect(questionSpeech(q)).toBe(q.prompt);
      positions[q.answer]++;
      for (const text of [q.prompt, ...q.options.map(o => o.text), q.hint, q.explanation]) {
        expect(syllables(text).filter(s => /[\u3400-\u9fff]/.test(s.text) && !s.zy), q.id).toEqual([]);
      }
    }
    expect(positions).toEqual([4, 4, 4, 4]);
    const concepts = Object.keys(READING_CONTEXT_CONCEPTS);
    for (let i = 0; i < 16; i += 4) expect(READING_CONTEXT_MANIFEST.items.slice(i, i + 4).map(x => x.concept)).toEqual(concepts);
  });

  it("mixes two passages and four picture words at every skill level", () => {
    for (const level of [1, 2, 3] as const) {
      const state = freshLearning();
      state.skills.words = { level, recent: "", answered: 0, correct: 0, reviewDay: "" };
      const batch = assertMixed(state);
      expect(batch.every(q => !q.review)).toBe(true);
      expect(batch.filter(q => !passages.has(q.id)).every(q => questionById(q.id)!.options.every(o => o.image))).toBe(true);
    }
  });

  it("uses the contextual readings for ongoing action and returning a book", () => {
    const dog = syllables(READING_CONTEXTS_V1[6].prompt);
    expect(dog.find(s => s.text === "著")?.zy).toBe("˙ㄓㄜ");
    const book = syllables(READING_CONTEXTS_V1[10].prompt);
    expect(book.find(s => s.text === "還")?.zy).toBe("ㄏㄨㄢˊ");
    expect(syllables("還有")[0].zy).toBe("ㄏㄞˊ");
    expect(syllables("音樂課")[1].zy).toBe("ㄩㄝˋ");
    expect(syllables("樂樂").map(s => s.zy)).toEqual(["ㄌㄜˋ", "ㄌㄜˋ"]);
    for (const [text, readings] of [
      ["睡覺", ["ㄕㄨㄟˋ", "ㄐㄧㄠˋ"]],
      ["肚子", ["ㄉㄨˋ", "˙ㄗ"]],
      ["說明了", ["ㄕㄨㄛ", "ㄇㄧㄥˊ", "˙ㄌㄜ"]],
      ["數星星", ["ㄕㄨˇ", "ㄒㄧㄥ", "˙ㄒㄧㄥ"]],
      ["爸爸", ["ㄅㄚˋ", "˙ㄅㄚ"]],
    ] as const) expect(syllables(text).map(s => s.zy), text).toEqual(readings);
  });

  it("shares the mix across single arena requests and save/reload boundaries", () => {
    let singles = freshLearning(), grouped = freshLearning();
    for (let round = 0; round < 8; round++) {
      const six = Array.from({ length: 6 }, () => {
        const item = allocateQuestions(singles, 2, "words", 1)[0];
        singles = validateLearning(JSON.parse(JSON.stringify(singles)), 2);
        return item;
      });
      expect(six).toEqual(assertMixed(grouped));
      expect(six.filter(q => passages.has(q.id))).toHaveLength(2);
      grouped = validateLearning(JSON.parse(JSON.stringify(grouped)), 2);
    }
  });

  it("revisits picture words honestly after their lane is exhausted", () => {
    const state = freshLearning();
    state.seen = lane.filter(q => !passages.has(q.id)).map(q => q.id);
    const batch = assertMixed(state);
    expect(batch.filter(q => q.review)).toHaveLength(4);
    expect(batch.filter(q => !q.review).every(q => passages.has(q.id))).toBe(true);
    expect(state.seen).toHaveLength(101);
  });

  it("retains six distinct reviews after full exhaustion and counter wrap", () => {
    for (const cursor of [0, 9_999_997, 9_999_998, 9_999_999, 10_000_000]) {
      const state = freshLearning(); state.seen = lane.map(q => q.id); state.review.words = cursor;
      expect(assertMixed(state).every(q => q.review)).toBe(true);
      expect(() => validateLearning(state, 2)).not.toThrow();
    }
  });

  it("eventually revisits every item in both lanes without modulo blind spots", () => {
    for (const count of [1, 6]) {
      let state = freshLearning(); state.seen = lane.map(q => q.id);
      const revisited = new Set<string>();
      for (let i = 0; i < 600 / count; i++) {
        const batch = allocateQuestions(state, 2, "words", count);
        expect(batch.every(q => q.review)).toBe(true);
        for (const q of batch) revisited.add(q.id);
        state = validateLearning(JSON.parse(JSON.stringify(state)), 2);
      }
      expect([...revisited].sort()).toEqual(lane.map(q => q.id).sort());
    }
  });

  it("retains new IDs, one-answer protection and pending ownership across restoration", () => {
    const day = "2026-10-25";
    let family = newFamily();
    startRun(family, "feifei", "words", "context-run", 0, false, day);
    const first = family.profiles.feifei.run!.questions[0];
    expect(first).toBe("c1-g2-words-01");
    family = validateFamily(JSON.parse(JSON.stringify(family)));
    answerRun(family, "feifei", "context-run", 0, questionById(first)!.answer, day);
    expect(family.profiles.feifei.learning.skills.words.correct).toBe(1);
    expect(() => answerRun(family, "feifei", "context-run", 0, questionById(first)!.answer, day)).toThrow();
    expect(validateFamily(JSON.parse(JSON.stringify(family))).profiles.feifei.run!.answers).toEqual([true]);
    const pendingState = newFamily();
    const pending = allocateBattleQuestion(pendingState, "feifei", "words", "context-pending");
    const restored = validateFamily(JSON.parse(JSON.stringify(pendingState)));
    expect(restored.profiles.feifei.learning.pending?.question).toBe(first);
    recordBattleAnswer(restored, "feifei", pending.token, pending.id, true, day);
    expect(restored.profiles.feifei.learning.pending).toBeNull();
    expect(() => validateLearning(pendingState.profiles.feifei.learning, 1)).toThrow();
  });
});
