import type { LearningState } from './learning-engine';
import { questionById, type Course, type Grade, type LearningQuestion } from './learning';
import { topicForQuestion } from './adaptive-catalog';
import { availableLearningTopics, independentSuccess, learningReadiness, mappedQuestion, nanyiExamReady, needsAssessment, schoolExposure } from './adaptive-learning';
import { transferSignature } from './adaptive-transfer';

/** Plan only reviewed, source-compatible items. The server replans the unanswered
 * suffix after each response; answered items and existing rewards never move.
 * A probe is not a claim about what a school has taught. */
export function pilotQuestions(s: LearningState, grade: Grade, course: Course, day: string,
  count: number, excluded: string[] = [], preferred?: string, stay = false, seekGap = false) {
  const topics = availableLearningTopics(s, grade, course), ready = learningReadiness(s).topics;
  const gap=seekGap?needsAssessment(s,grade,course):undefined;
  const d = Date.parse(day + 'T00:00:00Z') / 86400000;
  const recent = new Map<string, number>();
  for (const [id, e] of Object.entries(s.adaptive?.evidence ?? {})) {
    const t = topicForQuestion(id);
    if (t && (!e.correct || e.assisted) && e.day < day)
      recent.set(t.id, Math.max(recent.get(t.id) ?? 0, e.order));
  }
  // Continue an unfinished concept; after two distinct independent examples try
  // its reviewed next step, then another unassessed concept. Due gaps come first
  // when starting a fresh group, not on every turn (which would oscillate).
  const rankTopic = (id: string, prerequisite?: string) =>
    id === preferred && (stay || !ready.has(id)) ? 0 : preferred !== undefined && prerequisite === preferred ? 1 :
      !preferred && recent.has(id) ? 0 : !ready.has(id) ? 2 : id === preferred ? 3 : 4;
  const prioritizedExam = (id: string) => {
    const examId=topics.find(t=>t.id===id)?.nanyiPilot?.exam, q=examId&&questionById(examId);
    return !!q&&!excluded.includes(q.id)&&!s.study?.entries[q.id]&&nanyiExamReady(s,q);
  };
  const pilotRank = (id:string) => {
    const topic=topics.find(t=>t.id===id);
    if(id===preferred)return prioritizedExam(id)||stay||!ready.has(id)?0:3;
    if(!topic?.nanyiPilot)return 4;
    return schoolExposure(s,id)==='taught'?1:2;
  };
  if(topics.some(t=>t.nanyiPilot))topics.sort((a,b)=>pilotRank(a.id)-pilotRank(b.id)||rankTopic(a.id,a.prerequisite)-rankTopic(b.id,b.prerequisite));
  else topics.sort((a, b) => rankTopic(a.id, a.prerequisite) - rankTopic(b.id, b.prerequisite));
  const used = new Set(excluded), families = new Set(excluded.map(id => questionById(id)?.sourceFamily ?? id));
  const chosen: string[] = [];
  for (const t of topics) {
    const rank = (q: LearningQuestion) => {
      const e = s.study?.entries[q.id], a = s.adaptive?.evidence[q.id];
      if (s.adaptive?.examples[q.id] === day || a?.day === day && (!a.correct || a.assisted || a.taughtExample)) return 5;
      if (e && e.due <= d) return 0;
      if (q.id===t.nanyiPilot?.exam&&!e) return 0;
      if (e?.needsPractice || a && !a.correct) return 1;
      return independentSuccess(s, q) ? 3 : 2;
    };
    const candidates = t.questions.map(questionById).filter((q): q is LearningQuestion => {
      if (!mappedQuestion(s, q, grade, course) || !nanyiExamReady(s,q) || gap&&!gap(q) || used.has(q.id) || families.has(q.sourceFamily ?? q.id)) return false;
      const e = s.study?.entries[q.id];
      return !e || e.last < d || e.retryAfter <= (s.study?.sequence ?? 0) + 1;
    }).sort((a, b) => rank(a) - rank(b) ||
      (s.adaptive?.evidence[a.id]?.order ?? s.study?.entries[a.id]?.order ?? 0) -
      (s.adaptive?.evidence[b.id]?.order ?? s.study?.entries[b.id]?.order ?? 0) || a.id.localeCompare(b.id));
    for (const q of candidates) {
      const family = q.sourceFamily ?? q.id;
      if (families.has(family)) continue;
      chosen.push(q.id); families.add(family);
      if (chosen.length === count) return chosen;
    }
  }
  return chosen;
}

/** A worked numeric analogue can precede a different practice item. For facts,
 * vocabulary and reading, teach the actual item rather than an unrelated fact.
 * Both remain assisted; later independent retrieval is assessed separately. */
export function pilotExample(s: LearningState, q: LearningQuestion, used: string[]) {
  const signature = transferSignature(q), topic = topicForQuestion(q);
  if (topic?.nanyiPilot) return topic.nanyiPilot.example;
  if (signature && topic) {
    const other = topic.questions.map(questionById).find(x => mappedQuestion(s, x, q.grade, q.course)
      && x.id !== q.id && !used.includes(x.id) && transferSignature(x) === signature);
    if (other) return other.id;
  }
  return q.id;
}
