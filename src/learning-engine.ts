import { observeStudy, validateStudy, type StudyState } from "./study-review";
import { eligibleExam, examPracticePriority, type SchoolId } from "./school-curriculum";
import { freshMastered, remainingGenerated, hasMastered, markMastered, mergeMastered, validateMastered, type MasteredQuestions } from "./mastered-questions";
import { storedCourses } from "./course-catalog";
import {
  LEARNING_BANK,
  ENGLISH_REPHRASES,
  COURSES,
  questionById,
  type LearningQuestion,
  type Grade,
  type Course,
} from "./learning";
import {
  GENERATED_POOLS,
  generatedId,
  generatorPool,
} from "./question-generator";

export type SkillProgress = {
  level: 1 | 2 | 3;
  recent: string;
  answered: number;
  correct: number;
  reviewDay: string;
};
export type LearningState = {
  version: 1;
  school?: SchoolId;
  study?: StudyState;
  mastered?: MasteredQuestions;
  cursors: Record<string, number>;
  seen: string[];
  review: Record<string, number>;
  skills: Record<string, SkillProgress>;
  pending: { token: string; question: string; review: boolean } | null;
};
export type QuestionAllocation = { id: string; review: boolean };
export const freshLearning = (): LearningState => ({
  version: 1,
  mastered: freshMastered(),
  cursors: {},
  seen: [],
  review: {},
  skills: {},
  pending: null,
});
const MAX_COUNT = 10_000_000;
const WORD_MIX_CYCLE = MAX_COUNT - MAX_COUNT % 3;
const integer = (x: unknown, max = MAX_COUNT): x is number =>
  Number.isSafeInteger(x) && Number(x) >= 0 && Number(x) <= max;
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const requireValue = (ok: unknown): void => {
  if (!ok) throw Error("學習紀錄格式不正確，未更動進度");
};
export const questionSkill = (q: LearningQuestion) => q.skill ?? q.course;
const allSkills = new Set([
  ...GENERATED_POOLS.map((p) => p.skill),
  ...LEARNING_BANK.map(questionSkill),
]);
export function validateLearning(value: unknown, grade: Grade): LearningState {
  if (!record(value)) throw Error("缺少學習紀錄");
  requireValue(
    value.version === 1 &&
      record(value.cursors) &&
      record(value.review) &&
      record(value.skills) &&
      Array.isArray(value.seen),
  );
  const s = value as unknown as LearningState;
  requireValue(s.school === undefined || s.school === "yongchun" || s.school === "nantun" || s.school === "dunhua" || s.school === "jianan" || s.school === "dongmen" || s.school === "xingan");
  validateMastered(s.mastered, grade);
  validateStudy(s.study, grade);
  requireValue(
    Object.keys(s.cursors).length <= GENERATED_POOLS.length &&
      Object.keys(s.skills).length <= allSkills.size &&
      Object.keys(s.review).length <= storedCourses(grade).length,
  );
  for (const [key, n] of Object.entries(s.cursors)) {
    const p = generatorPool(key);
    requireValue(p?.grade === grade && integer(n, p?.params.length ?? 0));
  }
  requireValue(
    s.seen.length <= LEARNING_BANK.length &&
      new Set(s.seen).size === s.seen.length,
  );
  for (const id of s.seen)
    requireValue(
      typeof id === "string" &&
        !id.startsWith("n1-") &&
        questionById(id)?.grade === grade,
    );
  for (const [key, n] of Object.entries(s.review))
    requireValue(storedCourses(grade).includes(key as Course) && integer(n));
  for (const [key, p] of Object.entries(s.skills)) {
    requireValue(
      (GENERATED_POOLS.some((x) => x.grade === grade && x.skill === key) ||
        storedCourses(grade).includes(key as Course)) &&
        record(p),
    );
    requireValue(
      [1, 2, 3].includes(p.level) &&
        typeof p.recent === "string" &&
        /^[01h]{0,8}$/.test(p.recent) &&
        integer(p.answered) &&
        integer(p.correct, p.answered) &&
        typeof p.reviewDay === "string" &&
        (p.reviewDay === "" || /^\d{4}-\d{2}-\d{2}$/.test(p.reviewDay)),
    );
  }
  if (s.pending !== null)
    requireValue(
      record(s.pending) &&
        typeof s.pending.token === "string" &&
        s.pending.token.length > 0 &&
        s.pending.token.length < 100 &&
        typeof s.pending.question === "string" &&
        questionById(s.pending.question)?.grade === grade &&
        typeof s.pending.review === "boolean",
    );
  return s;
}
export function migrateLearning(ids: string[], grade: Grade): LearningState {
  const s = freshLearning();
  s.seen = [
    ...new Set(
      ids.filter(
        (id) => !id.startsWith("n1-") && questionById(id)?.grade === grade,
      ),
    ),
  ];
  return s;
}
const progress = (s: LearningState, skill: string): SkillProgress =>
  s.skills[skill] ?? {
    level: 1,
    recent: "",
    answered: 0,
    correct: 0,
    reviewDay: "",
  };
export const questionDifficulty = (q: LearningQuestion): number =>
  q.level ??
  ("difficulty" in q
    ? Number(q.difficulty)
    : q.course === "words"
      ? (q.target?.text.length ?? 2) > 2
        ? 2
        : 1
      : 1);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
function permutation(n: number, size: number) {
  let step = 37;
  while (gcd(step, size) !== 1) step++;
  return (n * step + Math.floor(size * 0.43)) % size;
}
export class QuestionPoolExhausted extends Error {}
function allocateEligibleQuestions(
  s: LearningState,
  grade: Grade,
  course: Course,
  count: number,
  targetDifficulty?: 1 | 2 | 3,
  excluded: string[] = [],
): QuestionAllocation[] {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 6 ||
    !COURSES[grade].some((c) => c.id === course)
  )
    throw Error("不支援這條航線");
  const result: QuestionAllocation[] = [];
  const seen = new Set(s.seen);
  const blocked = (id: string) => excluded.includes(id) || hasMastered(s, id);
  let staticPool = LEARNING_BANK.filter(
    (q) => !q.retired && !q.rephraseOf && (course !== "math" || grade === 5 || grade === 6 || !!q.examSources) && q.grade === grade && q.course === course && !blocked(q.id),
  );
  let generated = GENERATED_POOLS.filter(
    (p) =>
      p.grade === grade &&
      (p.course ?? "math") === course &&
      p.params.length > 0,
  );
  // Uploaded exams are available only to the matching school, grade and publisher.
  // Keep them ahead of generated/general questions, independent of difficulty sorting.
  const supplied = staticPool.filter(q => eligibleExam(s.school, grade, course, q));
  const general = staticPool.filter(q => !q.examSources);
  if (supplied.length) {
    supplied.sort((a,b) => Number(seen.has(a.id))-Number(seen.has(b.id)) || examPracticePriority(a)-examPracticePriority(b) || a.id.localeCompare(b.id));
    const chosen=supplied.slice(0,count);
    for(const q of chosen){
      result.push({id:q.id,review:seen.has(q.id)});
      if(!seen.has(q.id)){s.seen.push(q.id);seen.add(q.id);}
    }
    if(result.length===count)return result;
    // Once the supplied eligible items are used, fill only with general practice.
    const rest=allocateEligibleQuestions(s,grade,course,count-result.length,targetDifficulty,
      [...excluded,...chosen.map(q=>q.id)]);
    return [...result,...rest];
  }
  staticPool=general;
  const remaining = new Map(generated.map(p => [p.key,
    remainingGenerated(s, p, excluded)]));
  const total = staticPool.length + [...remaining.values()].reduce((a,b) => a+b, 0);
  if (total < count) throw new QuestionPoolExhausted(total === 0
    ? '這個科目的題目已全部答對！請選其他科目，等待新題目加入。'
    : `這個科目還有 ${total} 題尚未答對，暫時不足 ${count} 題挑戰；請先選其他科目。`);
  if (targetDifficulty) {
    // Use real within-grade metadata, never invent a harder grade. Select the
    // nearest remaining lanes. Mastered questions never replenish capacity.
    const levels=[...new Set([...generated.map(p=>p.level), ...(course==='math' && grade!==5?[]:staticPool.map(questionDifficulty))])];
    levels.sort((a,b)=>Math.abs(a-targetDifficulty)-Math.abs(b-targetDifficulty)||a-b);
    const chosen:number[]=[];
    for(const level of levels) {
      chosen.push(level);
      const capacity=generated.filter(p=>chosen.includes(p.level)).reduce((n,p)=>n+(remaining.get(p.key)??0),0)+(course==='math' && grade!==5?0:staticPool.filter(q=>chosen.includes(questionDifficulty(q))).length);
      if(capacity>=count)break;
    }
    generated=generated.filter(p=>chosen.includes(p.level));
    staticPool=staticPool.filter(q=>chosen.includes(questionDifficulty(q)));
  }
  const availableAtSkill = generated.reduce((n,p) => n + (p.level <= progress(s,p.skill).level ? remaining.get(p.key) ?? 0 : 0), 0) + staticPool.length;
  const allowHigher = availableAtSkill < count;
  const passages = grade === 2 && course === "words" ? staticPool.filter(q => q.format === "short-passage") : [];
  const pictures = passages.length ? staticPool.filter(q => q.format !== "short-passage") : [];
  const byLevelThenId = (a: LearningQuestion, b: LearningQuestion) =>
    Math.abs(questionDifficulty(a) - progress(s, questionSkill(a)).level) -
    Math.abs(questionDifficulty(b) - progress(s, questionSkill(b)).level) || a.id.localeCompare(b.id);
  for (let i = 0; i < count; i++) {
    if (passages.length && pictures.length) {
      // One passage followed by two picture questions. Count issued questions,
      // not calls, so the arena's single-question requests share the same rhythm.
      // Existing seen IDs + review counter persist this without a save migration.
      const reviewCursor = (s.review[course] ?? 0) % WORD_MIX_CYCLE;
      const issued = staticPool.filter(q => seen.has(q.id)).length + reviewCursor;
      const preferred = issued % 3 === 0 ? passages : pictures;
      const lane = preferred.some(q => !result.some(r => r.id === q.id)) ? preferred : preferred === passages ? pictures : passages;
      const fresh = lane.filter(q => !seen.has(q.id)).sort(byLevelThenId)[0];
      if (fresh) {
        s.seen.push(fresh.id); seen.add(fresh.id);
        result.push({ id: fresh.id, review: false });
      } else {
        // Keep the mix after either lane is exhausted; label revisits honestly.
        // Advance within each lane independently. Using the global modulo here
        // would permanently skip 1/3 of a picture pool whose size is divisible by 3.
        const laneOrdinal = issued % 3 === 0 ? Math.floor(issued / 3) : issued - Math.ceil(issued / 3);
        const offset = laneOrdinal % lane.length;
        const rotated = [...lane.slice(offset), ...lane.slice(0, offset)];
        const revisit = rotated.find(q => !result.some(item => item.id === q.id));
        if (!revisit) throw Error("這條航線暫時沒有合適的題目");
        s.review[course] = (reviewCursor + 1) % WORD_MIX_CYCLE;
        result.push({ id: revisit.id, review: true });
      }
      continue;
    }
    // Mathematical domains are finite, canonical and disjoint. No rejection sampling.
    for (const p of generated) {
      let cursor = s.cursors[p.key] ?? 0;
      while (cursor < p.params.length && blocked(generatedId(p, permutation(cursor, p.params.length)))) cursor++;
      if (cursor !== (s.cursors[p.key] ?? 0)) s.cursors[p.key] = cursor;
    }
    const available = generated.filter(
      (p) =>
        (s.cursors[p.key] ?? 0) < p.params.length &&
        (!!targetDifficulty || allowHigher || p.level <= progress(s, p.skill).level),
    );
    available.sort((a, b) => {
      const score = (p: typeof a) => {
        const stat = progress(s, p.skill),
          attempted = generated
            .filter((x) => x.skill === p.skill)
            .reduce((n, x) => n + (s.cursors[x.key] ?? 0), 0);
        const wrong = stat.recent.split("").filter((x) => x !== "1").length;
        return (
          attempted / (1 + wrong * 0.25) + Math.abs(p.level - stat.level) * 4
        );
      };
      return score(a) - score(b) || a.key.localeCompare(b.key);
    });
    const laneCount =
      generated.reduce((n, p) => n + (s.cursors[p.key] ?? 0), 0) +
      staticPool.filter((q) => seen.has(q.id)).length;
    const curated = staticPool
      .filter((q) => !seen.has(q.id))
      .sort(
        (a, b) =>
          Math.abs(questionDifficulty(a) - progress(s, questionSkill(a)).level) -
            Math.abs(questionDifficulty(b) - progress(s, questionSkill(b)).level) ||
          a.id.localeCompare(b.id),
      );
    if (
      course !== "math" &&
      generated.length &&
      available.length &&
      laneCount % 4 === 0 &&
      curated.length
    ) {
      const q = curated[0];
      s.seen.push(q.id);
      seen.add(q.id);
      result.push({ id: q.id, review: false });
      continue;
    }
    if (available.length) {
      const pool = available[0],
        cursor = s.cursors[pool.key] ?? 0;
      const id = generatedId(pool, permutation(cursor, pool.params.length));
      s.cursors[pool.key] = cursor + 1;
      result.push({ id, review: false });
      continue;
    }
    // Math legacy bank is deliberately excluded from normal generation to prevent equivalent equations.
    const candidates =
      course === "math" && grade !== 5 ? [] : staticPool.filter((q) => !seen.has(q.id));
    candidates.sort(
      (a, b) =>
        Math.abs(questionDifficulty(a) - progress(s, questionSkill(a)).level) -
          Math.abs(questionDifficulty(b) - progress(s, questionSkill(b)).level) ||
        a.id.localeCompare(b.id),
    );
    if (candidates.length) {
      const q = candidates[0];
      s.seen.push(q.id);
      seen.add(q.id);
      result.push({ id: q.id, review: false });
      continue;
    }
    const eligible = generated.filter(
      (p) => (remaining.get(p.key) ?? 0) > 0 && (!!targetDifficulty || allowHigher || p.level <= progress(s, p.skill).level),
    );
    const size = eligible.reduce((n, p) => n + p.params.length, 0);
    const reviewedContexts = grade === 4 && course !== "math"
      ? staticPool.filter(q => seen.has(q.id)) : [];
    if (size && reviewedContexts.length && reviewedContexts.some(q => !result.some(r => r.id === q.id)) && eligible.some(p => p.params.some((_,i) => { const id = generatedId(p,i); return !blocked(id) && !result.some(r => r.id === id); }))) {
      // Keep previously read contexts in the review rotation: one context,
      // then three generated questions. Each lane needs its own ordinal;
      // using the global cursor modulo its size can permanently omit IDs.
      const cursor = (s.review[course] ?? 0) % MAX_COUNT;
      const contextTurn = cursor % 4 === 0;
      const ordinal = contextTurn ? Math.floor(cursor / 4) : cursor - Math.ceil(cursor / 4);
      const laneSize = contextTurn ? reviewedContexts.length : size;
      let id = "";
      for (let attempt = 0; attempt < laneSize; attempt++) {
        let offset = (ordinal + attempt) % laneSize;
        if (contextTurn) id = reviewedContexts[offset].id;
        else for (const pool of eligible) {
          if (offset < pool.params.length) {
            id = generatedId(pool, permutation(offset, pool.params.length));
            break;
          }
          offset -= pool.params.length;
        }
        if (!blocked(id) && !result.some(q => q.id === id)) break;
      }
      if (!id || blocked(id) || result.some(q => q.id === id))
        throw Error("這條航線暫時沒有合適的題目");
      // A same-batch collision scans within the lane, not forward in the
      // global rhythm. No seen/cursor reset and no new-question rewards.
      s.review[course] = (cursor + 1) % MAX_COUNT;
      result.push({ id, review: true });
      continue;
    }
    let reviewIndex = s.review[course] ?? 0;
    let id = "";
    for (let attempt = 0; attempt < (size || staticPool.length); attempt++, reviewIndex++) {
      if (size) {
        let offset = reviewIndex % size;
        for (const pool of eligible) {
          if (offset < pool.params.length) {
            id = generatedId(pool, permutation(offset, pool.params.length));
            break;
          }
          offset -= pool.params.length;
        }
      } else id = staticPool[reviewIndex % staticPool.length]?.id ?? "";
      if (!blocked(id) && !result.some((q) => q.id === id)) break;
    }
    if (!id || blocked(id) || result.some((q) => q.id === id))
      id = staticPool.find(q => !result.some(r => r.id === q.id))?.id ?? "";
    if (!id || blocked(id) || result.some((q) => q.id === id))
      throw Error("這條航線暫時沒有合適的題目");
    s.review[course] = (reviewIndex + 1) % MAX_COUNT;
    result.push({ id, review: true });
  }
  return result;
}
export function allocateQuestions(s: LearningState, grade: Grade, course: Course, count: number,
  targetDifficulty?: 1 | 2 | 3, excluded: string[] = []): QuestionAllocation[] {
  const draft = structuredClone(s);
  const result = allocateEligibleQuestions(draft, grade, course, count, targetDifficulty, excluded);
  Object.assign(s.cursors, draft.cursors);
  Object.assign(s, draft, { cursors: s.cursors });
  return result;
}
export function recordLearning(
  s: LearningState,
  q: LearningQuestion,
  correct: boolean,
  assisted: boolean,
  review: boolean,
  day: string,
) {
  observeStudy(s, q, correct, assisted, day);
  if (correct) markMastered(s, q.id);
  const skill = questionSkill(q),
    p = { ...progress(s, skill) };
  // Review is useful, but repeated same-day review cannot pump the level.
  if (review && p.reviewDay === day) return;
  if (review) p.reviewDay = day;
  p.answered = Math.min(MAX_COUNT, p.answered + 1);
  if (correct && !assisted) p.correct = Math.min(p.answered, p.correct + 1);
  p.recent = (p.recent + (assisted ? "h" : correct ? "1" : "0")).slice(-8);
  if (
    p.recent.length >= 5 &&
    p.recent
      .slice(-5)
      .split("")
      .filter((x) => x === "1").length >= 4 &&
    p.level < 3
  ) {
    p.level = (p.level + 1) as 2 | 3;
    p.recent = "";
  } else if (
    p.recent.length >= 3 &&
    p.recent
      .slice(-3)
      .split("")
      .filter((x) => x !== "1").length >= 2 &&
    p.level > 1
  ) {
    p.level = (p.level - 1) as 1 | 2;
    p.recent = "";
  }
  s.skills[skill] = p;
}
export function mergeLearning(
  current: LearningState,
  incoming: LearningState,
): LearningState {
  const out = structuredClone(incoming);
  out.mastered = mergeMastered(current.mastered, incoming.mastered);
  for (const [k, n] of Object.entries(current.cursors))
    out.cursors[k] = Math.max(out.cursors[k] ?? 0, n);
  out.seen = [...new Set([...incoming.seen, ...current.seen])];
  for (const [k, n] of Object.entries(current.review))
    out.review[k] = Math.max(out.review[k] ?? 0, n);
  for (const [k, p] of Object.entries(current.skills))
    if (!out.skills[k] || p.answered >= out.skills[k].answered)
      out.skills[k] = structuredClone(p);
  if (current.study) out.study = structuredClone(current.study);
  out.pending = null;
  return out;
}
export function learningSummary(s: LearningState) {
  return {
    allocated:
      s.seen.length + Object.values(s.cursors).reduce((a, b) => a + b, 0),
    answered: Object.values(s.skills).reduce((a, b) => a + b.answered, 0),
  };
}

/** One occasional paraphrase per full fresh round; finite variants may fill exhausted pools. */
export function allocateAdventureQuestions(s:LearningState, grade:Grade, course:Course, count:number,
  targetDifficulty?:1|2|3, excluded:string[]=[], random:()=>number=Math.random):QuestionAllocation[] {
  if(grade!==4 || course!=='english')return allocateQuestions(s,grade,course,count,targetDifficulty,excluded);
  const draft=structuredClone(s);
  const variants=ENGLISH_REPHRASES.filter(q=>hasMastered(s,q.rephraseOf!)&&!hasMastered(s,q.id)&&!excluded.includes(q.id));
  for(let i=variants.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[variants[i],variants[j]]=[variants[j],variants[i]];}
  let fresh:QuestionAllocation[]=[]; let needed=0;
  try { fresh=allocateQuestions(draft,grade,course,count,targetDifficulty,excluded); }
  catch(error) {
    if(!(error instanceof QuestionPoolExhausted))throw error;
    for(needed=1;needed<=Math.min(count,variants.length);needed++) {
      try {fresh=count===needed?[]:allocateQuestions(draft,grade,course,count-needed,targetDifficulty,excluded);break;}
      catch(next){if(!(next instanceof QuestionPoolExhausted))throw next;}
    }
    if(needed>Math.min(count,variants.length))throw error;
  }
  if(!needed && variants.length && random()<0.2){fresh.pop();needed=1;}
  const chosen=variants.slice(0,needed).map(q=>({id:q.id,review:true}));
  const result=[...fresh,...chosen];
  if(chosen.length){const at=Math.min(result.length-1,Math.floor(random()*result.length));[result[at],result[result.length-1]]=[result[result.length-1],result[at]];}
  Object.assign(s.cursors,draft.cursors);Object.assign(s,draft,{cursors:s.cursors});
  return result;
}
