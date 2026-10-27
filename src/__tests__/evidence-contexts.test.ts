import { describe, expect, it } from "vitest";
import { EVIDENCE_CONTEXTS_V1, EVIDENCE_CONCEPTS, EVIDENCE_CONTEXT_MANIFEST } from "../evidence-contexts";
import { LEARNING_BANK, questionById } from "../learning";
import { GENERATED_POOLS } from "../question-generator";
import { allocateQuestions, freshLearning, validateLearning } from "../learning-engine";
import { newFamily, startRun, answerRun, validateFamily, allocateBattleQuestion, recordBattleAnswer } from "../adventure";
import { syllables } from "../readability";
import { questionSpeech } from "../speech-text";

describe("grade-four evidence contexts", () => {
  it("registers four contexts per concept, balanced answers and complete readings", () => {
    expect(EVIDENCE_CONTEXTS_V1).toHaveLength(16);
    expect(new Set(LEARNING_BANK.map(q => q.id)).size).toBe(LEARNING_BANK.length);
    for (const concept of Object.keys(EVIDENCE_CONCEPTS)) {
      const items = EVIDENCE_CONTEXT_MANIFEST.items.filter(x => x.concept === concept);
      expect(items).toHaveLength(4);
      expect(new Set(items.map(x => x.context)).size).toBe(4);
    }
    for (const course of ["chinese", "social"] as const) {
      const questions = EVIDENCE_CONTEXTS_V1.filter(q => q.course === course);
      expect(questions).toHaveLength(8);
      const positions = [0, 0, 0, 0];
      for (const q of questions) {
        expect([q.grade, q.subject, q.skill]).toEqual([4, course, course]);
        expect(new Set(q.options.map(x => x.text)).size).toBe(4);
        expect(q.prompt.length).toBeLessThanOrEqual(90);
        expect(q.options.every(o => o.text.length <= 24)).toBe(true);
        expect(questionSpeech(q)).toBe(q.speechText ?? q.prompt);
        positions[q.answer]++;
        for (const text of [q.prompt, q.speechText ?? "", ...q.options.map(o => o.text), q.hint, q.explanation])
          expect(syllables(text).filter(x => /[\u3400-\u9fff]/.test(x.text) && !x.zy), q.id).toEqual([]);
      }
      expect(positions).toEqual([2, 2, 2, 2]);
    }
  });

  it("agrees with an independent coordinate, legend and road graph oracle", () => {
    const answer = (id: string) => {
      const q = questionById(`c1-g4-social-${id}`)!;
      return q.options[q.answer].text;
    };
    const library = [0, 0], field = [1, 0], garden = [1, 1];
    const direction = (a: number[], b: number[]) => b[0] > a[0] ? "東" : b[0] < a[0] ? "西" : b[1] > a[1] ? "北" : "南";
    expect(answer("01")).toBe(`先向${direction(library, field)}，再向${direction(field, garden)}`);
    const legend = { "●": "圖書館", "▲": "公園", "■": "車站" };
    expect(answer("03")).toBe(legend["●"]);
    const openEdges = new Set(["甲乙", "甲丙", "丙丁"]);
    const valid = ["甲→乙→丁", "甲→丙→丁", "甲→丁"].filter(route => {
      const stops = route.split("→");
      return stops.slice(1).every((stop, i) => openEdges.has(stops[i] + stop));
    });
    expect(valid.map(route => route.replace("→", "到").replace("→", "，再到"))).toEqual([answer("05")]);
    const routes = { "甲": ["步道", "步道"], "乙": ["步道", "車道"] };
    expect(Object.entries(routes).filter(([, segments]) => segments.every(s => s === "步道")).map(([id]) => id)).toEqual([answer("07").slice(0, 1)]);
  });

  it("reads map symbols as names and keeps reviewed contextual readings", () => {
    const speech = questionSpeech(questionById("c1-g4-social-03")!);
    expect(speech).not.toMatch(/[●▲■→]/);
    for (const clue of ["圓形是圖書館", "三角形是公園", "正方形是車站", "三角形的北邊是圓形"])
      expect(speech).toContain(clue);
    for (const [word, expected] of [
      ["借還", "ㄐㄧㄝˋ ㄏㄨㄢˊ"], ["寫著", "ㄒㄧㄝˇ ˙ㄓㄜ"],
      ["上方為北", "ㄕㄤˋ ㄈㄤ ㄨㄟˊ ㄅㄟˇ"], ["長椅", "ㄔㄤˊ ㄧˇ"],
      ["重蓋", "ㄔㄨㄥˊ ㄍㄞˋ"], ["種稻", "ㄓㄨㄥˋ ㄉㄠˋ"],
      ["的東西", "˙ㄉㄜ ㄉㄨㄥ ˙ㄒㄧ"], ["東西南北", "ㄉㄨㄥ ㄒㄧ ㄋㄢˊ ㄅㄟˇ"],
      ["行李", "ㄒㄧㄥˊ ㄌㄧˇ"], ["便宜", "ㄆㄧㄢˊ ㄧˊ"],
    ]) expect(syllables(word).map(x => x.zy).join(" "), word).toBe(expected);
  });

  it("issues every new ID through real allocation and retains honest exhausted reviews", () => {
    for (const course of ["chinese", "social"] as const) for (const level of [1, 2, 3] as const) {
      let state = freshLearning();
      state.skills[course] = { level, recent: "", answered: 0, correct: 0, reviewDay: "" };
      const fresh = new Set<string>();
      for (let round = 0; round < 60; round++) {
        const batch = allocateQuestions(state, 4, course, 6);
        expect(new Set(batch.map(q => q.id)).size).toBe(6);
        for (const item of batch) {
          expect(questionById(item.id)?.course).toBe(course);
          if (!item.review) { expect(fresh.has(item.id), item.id).toBe(false); fresh.add(item.id); }
        }
        state = validateLearning(JSON.parse(JSON.stringify(state)), 4);
      }
      for (const q of EVIDENCE_CONTEXTS_V1.filter(q => q.course === course)) expect(fresh.has(q.id), q.id).toBe(true);
      state.seen = LEARNING_BANK.filter(q => q.grade === 4 && q.course === course).map(q => q.id);
      for (const pool of GENERATED_POOLS.filter(p => p.grade === 4 && p.course === course)) state.cursors[pool.key] = pool.params.length;
      const reviews = allocateQuestions(state, 4, course, 6);
      expect(reviews.every(q => q.review)).toBe(true);
      expect(new Set(reviews.map(q => q.id)).size).toBe(6);
    }
  });

  it.each(["chinese", "social"] as const)("restores %s voyage and pending battle ownership without a second answer", course => {
    const day = "2026-10-25", runId = `evidence-${course}`;
    let family = newFamily();
    startRun(family, "quintus", course, runId, 0, false, day);
    const first = family.profiles.quintus.run!.questions[0];
    expect(first).toBe(`c1-g4-${course}-01`);
    family = validateFamily(JSON.parse(JSON.stringify(family)));
    answerRun(family, "quintus", runId, 0, questionById(first)!.answer, day);
    expect(family.profiles.quintus.learning.skills[course].correct).toBe(1);
    expect(() => answerRun(family, "quintus", runId, 0, questionById(first)!.answer, day)).toThrow();
    expect(validateFamily(JSON.parse(JSON.stringify(family))).profiles.quintus.run!.answers).toEqual([true]);
    const pendingState = newFamily();
    const pending = allocateBattleQuestion(pendingState, "quintus", course, runId);
    const restored = validateFamily(JSON.parse(JSON.stringify(pendingState)));
    expect(restored.profiles.quintus.learning.pending?.question).toBe(first);
    recordBattleAnswer(restored, "quintus", pending.token, pending.id, true, day);
    expect(restored.profiles.quintus.learning.pending).toBeNull();
    expect(() => validateLearning(pendingState.profiles.quintus.learning, 2)).toThrow();
  });
});
