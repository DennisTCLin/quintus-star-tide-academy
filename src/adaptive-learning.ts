import {examEvidenceMatches} from './adaptive-source-evidence';
import type { LearningState, QuestionAllocation } from './learning-engine';
import { questionById, type LearningQuestion, type Grade, type Course } from './learning';
import { topicForQuestion, topicsFor, TOPIC_BY_ID } from './adaptive-catalog';
import { transferSignature } from './adaptive-transfer';

export type SchoolExposure = 'taught' | 'not-yet';
export type AdaptiveEvidence = { day:string; correct:boolean; assisted:boolean; order:number; taughtExample?:boolean };
export type AdaptiveState = {
 version:1; sequence:number; ignoreLegacyEvidence?:true; lastLearningDay?:string; coachedRound?:string;
 scope:Record<string,{state:SchoolExposure;day:string;source:'learner';preview?:true}>;
 evidence:Record<string,AdaptiveEvidence>;
 examples:Record<string,string>;
 reviewKnown?:Record<string,true>;
};
const need=(ok:unknown,msg='學習安排已更新，請回到「跟著我學」，原有獎勵已保留')=>{if(!ok)throw Error(msg);};
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const date=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
export const enableAdaptive=(s:LearningState)=>s.adaptive??={version:1,sequence:0,scope:{},evidence:{},examples:{}};
// School/edition changes invalidate exposure claims without destroying previous evidence.
export const scopeKey=(s:LearningState,topic:string)=>`${s.school??'unconfirmed'}:115-1:${topic}`;
export function schoolExposure(s:LearningState,topic:string){return s.adaptive?.scope[scopeKey(s,topic)]?.state;}
export function reportSchoolExposure(s:LearningState,grade:Grade,topic:string,state:SchoolExposure,day:string) {
 need(TOPIC_BY_ID[topic]?.grade===grade&&['taught','not-yet'].includes(state)&&date(day));
 enableAdaptive(s).scope[scopeKey(s,topic)]={state,day,source:'learner'};return true;
}
export const previewAllowed=(s:LearningState,topic:string)=>s.adaptive?.scope[scopeKey(s,topic)]?.preview===true;
export function validateAdaptive(value:unknown,grade:Grade) {
 if(value===undefined)return;
 need(obj(value));const a=value as AdaptiveState;
 if(a.reviewKnown!==undefined){need(obj(a.reviewKnown)&&Object.keys(a.reviewKnown).length<=100000);for(const [id,v] of Object.entries(a.reviewKnown))need(v===true&&questionById(id)?.grade===grade);}
 need(a.ignoreLegacyEvidence===undefined||a.ignoreLegacyEvidence===true);
 need(a.lastLearningDay===undefined||date(a.lastLearningDay));need(a.coachedRound===undefined||/^\d{4}-\d{2}-\d{2}:\d{1,8}$/.test(a.coachedRound));
 need(a.version===1&&Number.isSafeInteger(a.sequence)&&a.sequence>=0&&obj(a.scope)&&obj(a.evidence)&&obj(a.examples));
 need(Object.keys(a.scope).length<=1000&&Object.keys(a.evidence).length<=100000&&Object.keys(a.examples).length<=10000);
 for(const [key,v] of Object.entries(a.scope))need(/^(yongchun|nantun|dunhua|jianan|dongmen|xingan|unconfirmed):115-1:/.test(key)&&TOPIC_BY_ID[key.split(':').slice(2).join(':')]?.grade===grade&&obj(v)&&['taught','not-yet'].includes(v.state)&&v.source==='learner'&&date(v.day)&&(v.preview===undefined||v.preview===true&&v.state==='not-yet'));
 for(const [id,e] of Object.entries(a.evidence))need(questionById(id)?.grade===grade&&obj(e)&&date(e.day)&&typeof e.correct==='boolean'&&typeof e.assisted==='boolean'&&Number.isSafeInteger(e.order)&&e.order>0&&e.order<=a.sequence&&(e.taughtExample===undefined||typeof e.taughtExample==='boolean'));
 for(const [id,day] of Object.entries(a.examples))need(questionById(id)?.grade===grade&&date(day));
}
export function mappedQuestion(s:LearningState,q:LearningQuestion|undefined,grade:Grade,course?:Course):q is LearningQuestion {
 return !!q&&!q.retired&&q.grade===grade&&(!course||q.course===course)&&!!topicForQuestion(q)&&examEvidenceMatches(s.school,q);
}
export function independentSuccess(s:LearningState,q:LearningQuestion) {
 const session=s.study?.session;if(session?.mode==='learn'&&session.phase==='lesson'&&session.questions[session.index]===q.id)return false;
 const e=s.adaptive?.evidence[q.id];
 if(e)return e.correct&&!e.assisted&&!e.taughtExample&&!(s.adaptive?.examples[q.id]&&s.adaptive.examples[q.id]>=e.day);
 if(s.adaptive?.ignoreLegacyEvidence)return false;
 const old=s.study?.entries[q.id];
 // Historical earned bits/hint successes are deliberately not used as evidence.
 return !!old&&!(s.adaptive?.examples[q.id]&&Date.parse(s.adaptive.examples[q.id]+'T00:00:00Z')/86400000>=old.last)&&old.correct>0&&old.stage>0&&!old.needsPractice&&old.correctDay===old.last;
}
/** Voluntary low-stakes retrieval is separate from challenge certification. */
export function reviewEligible(s:LearningState,q:LearningQuestion|undefined,grade:Grade,course?:Course):q is LearningQuestion {
 if(!q||q.retired||q.grade!==grade||course&&q.course!==course||!examEvidenceMatches(s.school,q))return false;
 const topic=topicForQuestion(q);
 if(topic&&(schoolExposure(s,topic.id)==='taught'||previewAllowed(s,topic.id)))return true;
 const prior=s.study?.entries[q.id];
 const trustedHistory=!s.adaptive?.ignoreLegacyEvidence&&!!prior&&prior.correct>0&&prior.independent>0;
 return independentSuccess(s,q)||trustedHistory||!!s.adaptive?.reviewKnown?.[q.id];
}
function readiness(s:LearningState) {
 const topicFamilies=new Map<string,Set<string>>(), templateFamilies=new Map<string,Set<string>>();
 for(const id of new Set([...Object.keys(s.adaptive?.evidence??{}),...Object.keys(s.study?.entries??{})])) {
  const q=questionById(id),t=q&&topicForQuestion(q);
  if(!q||!t||!mappedQuestion(s,q,q.grade)||!independentSuccess(s,q))continue;
  const family=q.sourceFamily??q.id;
  const add=(map:Map<string,Set<string>>,key:string)=>{const set=map.get(key)??new Set<string>();set.add(family);map.set(key,set);};
  add(topicFamilies,t.id);const sig=transferSignature(q);if(sig)add(templateFamilies,sig);
 }
 return {topics:new Set([...topicFamilies].filter(([,ids])=>ids.size>=2).map(([k])=>k)),templates:new Set([...templateFamilies].filter(([,ids])=>ids.size>=2).map(([k])=>k))};
}
function eligibleWith(s:LearningState,q:LearningQuestion|undefined,grade:Grade,course:Course|undefined,ready:ReturnType<typeof readiness>):q is LearningQuestion {
 if(!mappedQuestion(s,q,grade,course))return false;
 const t=topicForQuestion(q)!;
 if(schoolExposure(s,t.id)!=='taught')return false;
 if(independentSuccess(s,q))return ready.topics.has(t.id);
 // A failed, assisted or exposed item must be relearned independently. A
 // neighbouring template cannot erase its own contrary learning evidence.
 const session=s.study?.session;
 if(session?.mode==='learn'&&session.phase==='lesson'&&session.questions[session.index]===q.id)return false;
 if(s.adaptive?.evidence[q.id]||s.adaptive?.examples[q.id]||s.study?.entries[q.id])return false;
 const sig=transferSignature(q);return !!sig&&ready.templates.has(sig);
}
export function challengeEligible(s:LearningState,q:LearningQuestion|undefined,grade:Grade,course?:Course):q is LearningQuestion {
 if(!s.adaptive)return !!q&&q.grade===grade&&(!course||q.course===course);
 return eligibleWith(s,q,grade,course,readiness(s));
}
export function observeAdaptive(s:LearningState,q:LearningQuestion,correct:boolean,assisted:boolean,day:string) {
 if(!s.adaptive)return;
 const a=s.adaptive, old=a.evidence[q.id];
 // Repeating an exposed answer on the same day never creates independent evidence.
 const taughtExample=a.examples[q.id]===day || old?.day===day&&(old.assisted||!old.correct||!!old.taughtExample);
 a.evidence[q.id]={day,correct,assisted,order:++a.sequence,...(taughtExample?{taughtExample:true}:{})};
 if(correct&&!assisted&&!taughtExample)(a.reviewKnown??={})[q.id]=true;
}
export function showExample(s:LearningState,id:string,day:string){const a=enableAdaptive(s);a.examples[id]=day;}
export function challengeCandidates(s:LearningState,grade:Grade,course:Course,excluded:string[]=[]) {
 const ready=readiness(s);
 const ids=new Set(topicsFor(grade,course).filter(t=>schoolExposure(s,t.id)==='taught').flatMap(t=>t.questions));
 const excludedIds=new Set(excluded),families=new Set(excluded.map(id=>questionById(id)?.sourceFamily).filter(Boolean));
 return [...ids].map(questionById).filter((q):q is LearningQuestion=>eligibleWith(s,q,grade,course,ready)&&!excludedIds.has(q.id)&&(!q.sourceFamily||!families.has(q.sourceFamily)))
 .sort((a,b)=>(s.adaptive?.evidence[a.id]?.order??0)-(s.adaptive?.evidence[b.id]?.order??0)||a.id.localeCompare(b.id));
}
export class LearningPreparationNeeded extends Error {constructor(){super('先到「跟著我學」練熟這個科目，再回來挑戰；原有進度與獎勵都保留。');}}
export function allocateMastered(s:LearningState,grade:Grade,course:Course,count:number,excluded:string[]=[]):QuestionAllocation[] {
 need(Number.isInteger(count)&&count>0&&count<=6);
 const families=new Set<string>(), chosen:LearningQuestion[]=[];
 for(const q of challengeCandidates(s,grade,course,excluded)){
  if(q.sourceFamily&&families.has(q.sourceFamily))continue;
  chosen.push(q);if(q.sourceFamily)families.add(q.sourceFamily);if(chosen.length===count)break;
 }
 if(chosen.length<count)throw new LearningPreparationNeeded();
 return chosen.map(q=>({id:q.id,review:independentSuccess(s,q)}));
}
export function adaptiveSummary(s:LearningState,grade:Grade) {
 const counts:Record<string,{ready:number;practicing:number}>={}, ready=readiness(s);
 for(const id of new Set([...Object.keys(s.adaptive?.evidence??{}),...Object.keys(s.study?.entries??{})])) {
  const t=topicForQuestion(id),q=questionById(id);if(!t||t.grade!==grade||!q)continue;
  const c=counts[t.id]??={ready:0,practicing:0};c.practicing++;if(eligibleWith(s,q,grade,undefined,ready))c.ready++;
 }
 return topicsFor(grade).map(t=>({id:t.id,course:t.course,title:t.title,exposure:schoolExposure(s,t.id)??'unknown',...counts[t.id]??{ready:0,practicing:0}}));
}
export function chooseLearningTopic(s:LearningState,grade:Grade,course?:Course,requested?:string) {
 const all=topicsFor(grade,course);
 const ready=(id:string)=>{const t=TOPIC_BY_ID[id];return t&&t.questions.filter(q=>independentSuccess(s,questionById(q)!)).length>=2;};
 const available=all.filter(t=>(schoolExposure(s,t.id)!=='not-yet'||previewAllowed(s,t.id))&&(!t.prerequisite||ready(t.prerequisite)));
 const selected=requested?available.find(t=>t.id===requested):undefined;
 if(requested)need(selected,'這個概念尚未開放，請先練前面的內容或更新學校進度。');
 // The smallest known gap first. Unknown scope is asked once in-context, never inferred from scores.
 return selected??available.find(t=>schoolExposure(s,t.id)==='taught'&&(!ready(t.id)||t.questions.some(id=>s.adaptive?.evidence[id]?.correct===false)))??available.find(t=>!schoolExposure(s,t.id))??available[0]??null;
}

/** Prefer different voyage items, but a small mastered bank may safely reuse them.
 * The pool is still exclusively independently mastered, school-taught content.
 */
export function allocateCaptureMastered(s:LearningState,grade:Grade,course:Course,previousVoyage:string[]):QuestionAllocation[] {
 const pool=challengeCandidates(s,grade,course).sort((a,b)=>Number(previousVoyage.includes(a.id))-Number(previousVoyage.includes(b.id)));
 const families=new Set<string>(),chosen:QuestionAllocation[]=[];
 for(const q of pool){const family=q.sourceFamily??q.id;if(families.has(family))continue;families.add(family);chosen.push({id:q.id,review:independentSuccess(s,q)});if(chosen.length===3)return chosen;}
 throw new LearningPreparationNeeded();
}
