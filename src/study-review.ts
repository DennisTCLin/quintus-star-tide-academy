import { pilotQuestions, pilotExample } from './adaptive-pilot';
import {teachingExample} from './adaptive-teaching';
import { scopeKey, enableAdaptive, hasChallengeCapacity, chooseLearningTopic, independentSuccess, reviewEligible, mappedQuestion, nanyiExamReady, challengeEligible, observeAdaptive, reportSchoolExposure, schoolExposure, showExample } from './adaptive-learning';
import { TOPIC_BY_ID, topicForQuestion } from './adaptive-catalog';
import type { LearningState } from './learning-engine';
import { questionById, questionCapacity, type LearningQuestion, type Grade, type Course } from './learning';
import { COURSES } from './course-catalog';
import { generatorPool, generatedId } from './question-generator';
import { eligibleExam } from './school-curriculum';
import { markMastered } from './mastered-questions';

export type StudyEntry = {
  last: number; order: number; due: number; stage: number; correctDay: number | null;
  retryAfter: number; needsPractice: boolean;
  attempts: number; independent: number; correct: number; crossDay: number;
};
export type StudySession = {
  id: string; mode: 'due' | 'mistakes' | 'all' | 'learn';
  pilot?:1; advance?:true; topic?:string; phase?:'scope'|'lesson'|'answer'; example?:string; preview?:boolean; course?: Course;
  questions: string[]; index: number; answers: boolean[]; retries: number[];
  settled: boolean; assisted: boolean; status: 'active' | 'paused' | 'complete';
};
export type StudyState = { version: 1; sequence: number; entries: Record<string, StudyEntry>; session: StudySession | null };
export const REVIEW_INTERVALS = [1, 3, 7] as const;
const fresh = (): StudyState => ({ version: 1, sequence: 0, entries: {}, session: null });
const need = (ok: unknown, message = '複習紀錄格式不正確，原有進度未更動') => { if (!ok) throw Error(message); };
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const nat = (x: unknown, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(x) && Number(x) >= 0 && Number(x) <= max;
export function studyDay(day: string): number {
  const n = Date.parse(day + 'T00:00:00Z');
  need(/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === day);
  return Math.floor(n / 86400000);
}
export function validateStudy(value: unknown, grade: Grade) {
  if (value === undefined) return;
  need(obj(value));
  const s = value as StudyState;
  need(s.version === 1 && nat(s.sequence) && obj(s.entries) && Object.keys(s.entries).length <= questionCapacity(grade));
  for (const [id, e] of Object.entries(s.entries)) {
    need(questionById(id)?.grade === grade && obj(e));
    need(nat(e.last, 100000) && nat(e.order, s.sequence) && nat(e.due, 100007) && e.due >= e.last && nat(e.stage, 3)
      && (e.correctDay === null || (nat(e.correctDay, e.last))) && nat(e.retryAfter, s.sequence + 3)
      && typeof e.needsPractice === 'boolean' && nat(e.attempts, s.sequence) && e.attempts > 0
      && nat(e.independent, e.attempts) && nat(e.correct, e.independent) && nat(e.crossDay, e.correct));
  }
  if (s.session === null) return;
  const r = s.session;
  need(obj(r));
  need(obj(r) && typeof r.id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(r.id)
    && ['due', 'mistakes', 'all', 'learn'].includes(r.mode)
    && (r.course === undefined || COURSES[grade].some(c => c.id === r.course))
    && Array.isArray(r.questions) && r.questions.length > 0 && r.questions.length <= 6
    && r.questions.every(id => typeof id === 'string' && questionById(id)?.grade === grade)
    && nat(r.index, r.questions.length - 1) && Array.isArray(r.answers)
    && r.answers.length === r.index + (r.settled ? 1 : 0) && r.answers.every(x => typeof x === 'boolean')
    && Array.isArray(r.retries) && r.retries.length <= 6 && new Set(r.retries).size === r.retries.length && r.retries.every(i => nat(i, r.questions.length - 1))
    && typeof r.assisted === 'boolean' && typeof r.settled === 'boolean' && ['active', 'paused', 'complete'].includes(r.status)
    && (r.status !== 'complete' || (r.settled && r.index === r.questions.length - 1)));
  need(r.pilot === undefined || r.pilot === 1 && r.mode === 'learn');
  need(r.advance===undefined||r.advance===true&&r.pilot===1);
  if(r.mode==='learn') {
    const t=TOPIC_BY_ID[r.topic??''];
    need(t?.grade===grade&&['scope','lesson','answer'].includes(r.phase??'')&&(t.questions.includes(r.example??'')||!!r.example&&t.nanyiPilot?.example===r.example)
      && (r.preview===undefined||typeof r.preview==='boolean'));
    need(r.pilot===1
      ? r.course===t.course && r.phase!=='scope' && topicForQuestion(r.questions[r.index])?.id===t.id
        && r.questions.every(id=>{const q=questionById(id);return !!q&&q.course===r.course&&!!topicForQuestion(q);})
      : r.questions.every(id=>t.questions.includes(id)));
  }
}
/** One dated assessment per question/day. Same-day retries do not inflate accuracy or advance intervals. */
export function observeStudy(s: LearningState, q: LearningQuestion, correct: boolean, assisted: boolean, day: string) {
  const d = studyDay(day), study = s.study ??= fresh();
  study.sequence++;
  let e = study.entries[q.id];
  if (!e) e = study.entries[q.id] = { last: d - 1, order: 0, due: d, stage: 0, correctDay: null, retryAfter: 0, needsPractice: false, attempts: 0, independent: 0, correct: 0, crossDay: 0 };
  const firstToday = e.last < d;
  if (firstToday) {
    e.attempts++;
    if (!assisted) {
      e.independent++;
      if (correct) {
        e.correct++;
        if (e.correctDay !== null && e.correctDay < d) e.crossDay++;
      }
    }
  }
  if (!correct || assisted) {
    e.stage = 0; e.due = d + 1; e.needsPractice = true; e.retryAfter = study.sequence + 3;
  } else {
    if (firstToday) {
      e.due = d + REVIEW_INTERVALS[Math.min(e.stage, 2)];
      e.stage = Math.min(3, e.stage + 1);
    }
    e.correctDay = d; e.needsPractice = false; e.retryAfter = 0;
  }
  e.last = d; e.order = study.sequence;
}
function compatible(s: LearningState, grade: Grade, q: LearningQuestion | undefined, course?: Course, allowRetired=false): q is LearningQuestion {
  return !!q && (allowRetired || !q.retired) && q.grade === grade && (!course || q.course === course)
    && COURSES[grade].some(c => c.id === q.course)
    && (!q.examSources?.length || eligibleExam(s.school, grade, q.course, q))
    && (!s.adaptive || reviewEligible(s,q,grade,course));
}
/** Enumerate only earned bits, never render the entire generated bank for summaries. */
function knownIds(s: LearningState): string[] {
  const ids = new Set([...Object.keys(s.study?.entries ?? {}), ...(s.mastered?.ids ?? [])]);
  for (const [key, bits] of Object.entries(s.mastered?.generated ?? {})) {
    const pool = generatorPool(key); if (!pool) continue;
    for (let i = 0; i < bits.length; i++) {
      const n = parseInt(bits[i], 16);
      for (let j = 0; j < 4; j++) if (n & (1 << j)) ids.add(generatedId(pool, i * 4 + j));
    }
  }
  return [...ids];
}
export function studySummary(s: LearningState, grade: Grade, day: string) {
  const d = studyDay(day);
  // Historical assessment totals remain visible even when an item is held from play.
  const entries = Object.entries(s.study?.entries ?? {}).filter(([id]) => {const q=questionById(id);return q?.grade===grade;});
  const held=entries.filter(([id])=>!compatible(s,grade,questionById(id))).length;
  const skills: Record<string, { skill: string; course: Course; attempts: number; correct: number; assisted: number }> = {};
  let attempts = 0, independent = 0, correct = 0, crossDay = 0, due = 0, mistakes = 0;
  for (const [id, e] of entries) {
    const q = questionById(id)!;
    attempts += e.attempts; independent += e.independent; correct += e.correct; crossDay += e.crossDay;
    if (e.due <= d) due++; if (e.needsPractice) mistakes++;
    const key = q.skill ?? q.course;
    const k = skills[key] ??= { skill: key, course: q.course, attempts: 0, correct: 0, assisted: 0 };
    k.attempts += e.independent; k.correct += e.correct; k.assisted += e.attempts - e.independent;
  }
  return { held, attempts, independent, assisted: attempts - independent, correct, crossDay, due, mistakes,
    accuracy: independent ? Math.round(correct / independent * 100) : null,
    weak: Object.values(skills).filter(x => x.attempts + x.assisted >= 3 && x.correct / (x.attempts + x.assisted) < .8)
      .sort((a, b) => a.correct / (a.attempts + a.assisted) - b.correct / (b.attempts + b.assisted)).slice(0, 3) };
}
export function startStudy(s: LearningState, grade: Grade, day: string, id: string, mode: StudySession['mode'], course?: Course) {
  need(['due', 'mistakes', 'all', 'learn'].includes(mode), '請選擇複習方式');
  need(course === undefined || COURSES[grade].some(c => c.id === course), '找不到這個科目');
  const study = s.study ??= fresh(), d = studyDay(day);
  if(mode==='learn')return startLearning(s,grade,day,id,course);
  if (study.session && study.session.status !== 'complete') {
    need(study.session.questions.slice(study.session.index + Number(study.session.settled)).every(id => compatible(s, grade, questionById(id), study.session!.course, true)), '學校版本已更新，請結束這組複習後重新選擇');
    study.session.status = 'active'; return true;
  }
  const candidates = knownIds(s).filter(id => compatible(s, grade, questionById(id), course));
  const rank = (id: string) => { const e = study.entries[id]; return !e ? 2 : e.needsPractice ? 0 : e.due <= d ? 1 : 3; };
  candidates.sort((a, b) => rank(a) - rank(b) || (study.entries[a]?.order ?? -1) - (study.entries[b]?.order ?? -1) || a.localeCompare(b));
  const priority = candidates.filter(id => mode === 'all' || (mode === 'mistakes' ? study.entries[id]?.needsPractice : study.entries[id]?.due <= d || !study.entries[id]));
  need(priority.length, mode === 'mistakes' ? '目前沒有待修復的錯題，可以改選自由複習。' : mode === 'due' ? '今天沒有到期題，可以選自由複習。' : '先完成幾道挑戰，再來複習學過的題目。');
  // Other known questions provide honest spacing before a pending original retry.
  const preferred = new Set(priority);
  const pool = [...priority, ...candidates.filter(id => !preferred.has(id))], questions: string[] = [];
  const families = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const id = pool.find(id => { const e = study.entries[id], family = questionById(id)?.sourceFamily; return !questions.includes(id) && (!family || !families.has(family)) && (!e || e.last < d || e.retryAfter <= study.sequence + i + 1); });
    if (!id) break; questions.push(id);
    const family = questionById(id)?.sourceFamily;
    if (family) families.add(family);
  }
  need(questions.length, '這題需要先間隔兩題再試；可以先挑戰其他題目，或明天再複習。');
  if(s.adaptive)for(const id of questions)if(independentSuccess(s,questionById(id)!))(s.adaptive.reviewKnown??={})[id]=true;
  study.session = { id, mode, ...(course ? { course } : {}), questions, index: 0, answers: [], retries: questions.flatMap((id, i) => study.entries[id]?.needsPractice ? [i] : []), settled: false, assisted: false, status: 'active' };
  return true;
}
function active(s: LearningState, id: string, index: number) {
  const r = s.study?.session;
  need(r && r.id === id && r.index === index && r.status === 'active', '複習已更新，請確認同步');
  return r!;
}
export function answerStudy(s: LearningState, grade: Grade, id: string, index: number, choice: number, day: string) {
  const r = active(s, id, index), q = questionById(r.questions[index])!;
  need(!r.settled && (r.mode==='learn' ? r.phase==='answer'&&mappedQuestion(s,q,grade,r.course)&&nanyiExamReady(s,q) : compatible(s, grade, q, r.course, true)) && nat(choice, q.options.length - 1), '這題已作答或題目已更新');
  const entry = s.study!.entries[q.id];
  need(!entry || entry.last < studyDay(day) || entry.retryAfter <= s.study!.sequence + 1, "這題剛練過，請先完成另外兩題或明天再試；也可以結束這組重新選擇。");
  const correct = choice === q.answer;
  observeStudy(s, q, correct, r.assisted, day);
  observeAdaptive(s,q,correct,r.assisted,day);
  if (correct) markMastered(s, q.id);
  r.answers.push(correct); r.settled = true;
  if (r.mode!=='learn' && (!correct || r.assisted) && index + 3 < r.questions.length && !r.questions.slice(index + 1).includes(q.id)) {
    r.questions[index + 3] = q.id; if (!r.retries.includes(index + 3)) r.retries.push(index + 3);
  }
  if(r.mode!=='learn')pruneReview(s,r,id=>!nanyiExamReady(s,questionById(id)!));
  // Three probes are enough when six safe battle items are already available.
  // Only the unasked suffix is removed; the actual battle still has six items.
  if(r.pilot===1 && !topicForQuestion(q)?.nanyiPilot && index>=2 && correct && !r.assisted && hasChallengeCapacity(s,grade,r.course!))r.questions.length=index+1;
  if (index === r.questions.length - 1) r.status = 'complete';
  return true;
}
export function nextStudy(s: LearningState, id: string, index: number, day?:string) {
  const r = active(s, id, index);
  need(r.settled && index + 1 < r.questions.length, '先完成這一題');
  const teach=r.mode==='learn'&&(r.pilot===1 ? !r.answers[r.index] : r.preview||!r.answers[r.index]||r.assisted);
  const today=day??s.adaptive?.lastLearningDay!;
  if(r.pilot===1){
    const q=questionById(r.questions[r.index])!,prefix=r.questions.slice(0,r.index+1);
    const independent=r.answers[r.index]&&!r.assisted&&independentSuccess(s,q);
    const focus=!r.answers[r.index]?(TOPIC_BY_ID[r.topic!].prerequisite??r.topic):r.topic;
    const remaining=pilotQuestions(s,q.grade,r.course!,today,r.questions.length-prefix.length,prefix,focus,!independent,r.advance===true&&independent);
    r.questions=[...prefix,...remaining];
    if(!remaining.length){r.status='complete';return true;}
  }
  r.index++; r.settled=false; r.assisted=false;
  if(r.pilot===1){r.topic=topicForQuestion(r.questions[r.index])!.id;r.example=r.questions[r.index];r.phase='answer';}
  const current=questionById(r.questions[r.index])!;
  if(teach||needsNanyiExample(s,current)){r.phase='lesson';prepareExample(s,r,today);}
  return true;
}
export function hintStudy(s: LearningState, id: string, index: number) {
  const r = active(s, id, index); need(!r.settled, '這題已作答'); r.assisted = true; return true;
}
export function pauseStudy(s: LearningState, id: string, finish = false, day?:string) {
  const r = s.study?.session; need(r && r.id === id, '複習已更新，請確認同步');
  if(r!.mode==='learn'&&r!.phase==='lesson')showExample(s,r!.pilot===1?r!.example!:r!.questions[r!.index],day??s.adaptive!.lastLearningDay!);
  if (finish) s.study!.session = null;
  else if (r!.status === 'active') r!.status = 'paused';
  return true;
}

function prepareExample(s:LearningState,r:StudySession,day:string) {
 const q=questionById(r.questions[r.index])!;
 r.example=r.pilot===1?pilotExample(s,q,r.questions):q.id;
 showExample(s,r.example,day);
}
function needsNanyiExample(s: LearningState, question: LearningQuestion) {
 const topic=topicForQuestion(question);
 return !!topic?.nanyiPilot&&!s.adaptive?.examples[topic.nanyiPilot.example]&&
   !topic.questions.some(id=>{const q=questionById(id);return !!q&&independentSuccess(s,q);});
}
/** Low-stakes probes reuse dated independent history, never earned reward bits. */
export function startLearning(s:LearningState,grade:Grade,day:string,id:string,course?:Course,requested?:string,advance=false) {
 enableAdaptive(s);
 const study=s.study??=fresh();
 if(study.session&&study.session.status!=='complete'&&!requested){
  const r=study.session;
  need(r.questions.slice(r.index).every(id=>r.mode==='learn'?mappedQuestion(s,questionById(id),grade,r.course):compatible(s,grade,questionById(id),r.course,true)), '學校版本已更新，請結束這組後重新選擇。');
  r.status='active';
  // Resume legacy sessions without replacing their ID, questions or answers.
  if(r.mode==='learn'&&r.phase==='scope')r.phase='answer';
  return true;
 }
 const topic=chooseLearningTopic(s,grade,course,requested);
 need(topic,'這個科目的內容準備中，先選其他島嶼。');
 const questions=pilotQuestions(s,grade,topic!.course,day,6,[],requested,false,advance);
 if(advance&&!questions.length)return false;
 need(questions.length,'這些題目剛練過，先換個概念，讓記憶休息一下。');
 const first=questionById(questions[0])!,t=topicForQuestion(first)!,previous=s.adaptive?.evidence[first.id];
 const teach=needsNanyiExample(s,first)||!!(previous&&(!previous.correct||previous.assisted)||study.entries[first.id]?.needsPractice);
 if(s.adaptive)s.adaptive.lastLearningDay=day;
 const r:StudySession={id,mode:'learn',pilot:1,...(advance?{advance:true as const}:{}),course:t.course,topic:t.id,phase:teach?'lesson':'answer',example:first.id,questions,index:0,answers:[],retries:[],settled:false,assisted:false,status:'active'};
 study.session=r;if(teach)prepareExample(s,r,day);
 return true;
}
function pruneReview(s: LearningState, r: StudySession, exclude: (id: string) => boolean) {
 const answered=r.index+Number(r.settled);
 const kept=r.questions.map((id,index)=>({id,index})).filter(({id,index})=>index<answered||!exclude(id));
 if(kept.length===r.questions.length)return;
 if(!kept.length){s.study!.session=null;return;}
 const retries=new Set(r.retries);
 r.questions=kept.map(({id})=>id);
 r.retries=kept.flatMap(({index},newIndex)=>retries.has(index)?[newIndex]:[]);
 if(!r.settled&&r.index>=r.questions.length){r.index--;r.settled=true;}
 if(!r.settled&&kept[r.index].index!==r.index)r.assisted=false;
 if(r.settled&&r.index===r.questions.length-1)r.status='complete';
}

/** Apply school progress without discarding earlier answers or changing the ledger. */
export function updateLearningProgress(s:LearningState,grade:Grade,topic:string,state:'taught'|'not-yet',day:string) {
 reportSchoolExposure(s,grade,topic,state,day);
 const r=s.study?.session;
 if(state!=='not-yet'||!TOPIC_BY_ID[topic]?.nanyiPilot||!r||r.status==='complete')return true;
 if(r.mode!=='learn'){ pruneReview(s,r,id=>topicForQuestion(id)?.id===topic);return true; }
 if(r.pilot!==1||r.topic!==topic||r.settled)return true;
 const prefix=r.questions.slice(0,r.index), course=r.course!;
 const replacement=pilotQuestions(s,grade,course,day,r.questions.length-prefix.length,prefix);
 if(!replacement.length){
   if(!prefix.length)s.study!.session=null;
   else {
     r.questions=prefix;r.index--;r.settled=true;r.status='complete';r.phase='answer';r.assisted=false;
     r.topic=topicForQuestion(r.questions[r.index])!.id;r.example=r.questions[r.index];
   }
   return true;
 }
 r.questions=[...prefix,...replacement];r.assisted=false;r.example=replacement[0];
 const current=questionById(replacement[0])!;
 r.topic=topicForQuestion(current)!.id;r.phase=needsNanyiExample(s,current)?'lesson':'answer';
 if(r.phase==='lesson')prepareExample(s,r,day);
 return true;
}
export function learningScope(s:LearningState,grade:Grade,id:string,state:'taught'|'not-yet'|'preview',day:string) {
 const r=active(s,id,0);need(r.mode==='learn'&&r.phase==='scope'&&['taught','not-yet','preview'].includes(state));
 reportSchoolExposure(s,grade,r.topic!,state==='taught'?'taught':'not-yet',day);
 if(state==='not-yet') {s.study!.session=null;return true;}
 if(state==='preview')s.adaptive!.scope[scopeKey(s,r.topic!)].preview=true;
 r.preview=state==='preview';r.phase=state==='taught'?'answer':'lesson';if(r.phase==='lesson')showExample(s,r.questions[r.index],day);return true;
}
export function learningLesson(s:LearningState,id:string,index:number,day:string,done=false) {
 const r=active(s,id,index);need(r.mode==='learn'&&!r.settled&&r.phase!=='scope');
 if(done){need(r.phase==='lesson');showExample(s,r.pilot===1?r.example!:r.questions[r.index],day);r.phase='answer';if(!TOPIC_BY_ID[r.topic!].nanyiPilot||r.pilot!==1)r.assisted=true;}
 else {r.phase='lesson';if(TOPIC_BY_ID[r.topic!].nanyiPilot)r.assisted=true;prepareExample(s,r,day);}
 return true;
}
export function publicLearningLesson(s:LearningState) {
 const r=s.study?.session;if(r?.mode!=='learn')return;
 const t=TOPIC_BY_ID[r.topic!],example=questionById(r.pilot===1?r.example!:r.questions[r.index])!;
 return {topic:t.id,title:t.title,lesson:t.lesson,challengeReady:r.status==='complete'&&hasChallengeCapacity(s,t.grade,t.course),exposure:schoolExposure(s,t.id)??'unknown',...(t.nanyiPilot?{stage:r.questions[r.index]===t.nanyiPilot.exam?'exam' as const:'practice' as const}:{}),
  ...(r.phase==='lesson'?{example:teachingExample(example)}: {})};
}
