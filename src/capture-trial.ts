import type { Family, Profile, Run } from './adventure';
import type { IslandRun } from './island/schema';
import { PLAYERS, type PlayerId } from './game-view';
import { LEARNING_BANK, questionById, type Course, type Grade } from './learning';
import { allocateQuestions } from './learning-engine';
import { eligibleExam } from './school-curriculum';
import { monsterById } from './monsters';
import type { CaptureOutcome } from './creature-rules';

export type CaptureTrial = {
  version: 1; grade: Grade; course: Course; questions: string[];
  answers: { choice: number; correct: boolean }[]; skipped?: true;
};
const need = (ok: unknown, message='降服挑戰已更新，請重新確認畫面') => { if (!ok) throw Error(message); };
export function createCaptureTrial(p: Profile, grade: Grade, course: Course, exclude: string[]): CaptureTrial {
  // A separate three-question assessment must never change the adventure cursor,
  // replenish ordinary rewards, or escape the child's grade/school boundary.
  const draft=structuredClone(p.learning);
  let questions: string[];
  try { questions=allocateQuestions(draft,grade,course,3,undefined,exclude).map(q=>q.id); }
  catch {
    const pool=LEARNING_BANK.filter(q=>q.grade===grade&&q.course===course&&!q.retired&&!q.rephraseOf
      &&(!q.examSources||eligibleExam(p.learning.school,grade,course,q))&&!exclude.includes(q.id));
    need(pool.length>=3,'這個科目的降服題正在準備中，通關獎勵已保留');
    questions=pool.slice(0,3).map(q=>q.id);
  }
  return {version:1,grade,course,questions,answers:[]};
}
export function validateCaptureTrial(c: CaptureOutcome, grade?: Grade, course?: Course) {
  need(c&&typeof c==='object');
  if(c.version!==3){need(c.trial===undefined&&c.outcome!=='pending');return;}
  const t=c.trial;
  need(c.chance===100&&t?.version===1&&PLAYERS.some(p=>p.grade===t.grade)&&(grade===undefined||t.grade===grade)&&(course===undefined||t.course===course));
  need(Array.isArray(t!.questions)&&t!.questions.length===3&&new Set(t!.questions).size===3
    &&t!.questions.every(id=>{const q=questionById(id);return q?.grade===t!.grade&&q.course===t!.course;}));
  need(Array.isArray(t!.answers)&&t!.answers.length<=3&&t!.answers.every((a,i)=>{
    const q=questionById(t!.questions[i])!;
    return Number.isInteger(a.choice)&&a.choice>=0&&a.choice<q.options.length&&a.correct===(a.choice===q.answer)
      &&(i===t!.answers.length-1||a.correct);
  }));
  need(t!.skipped===undefined||t!.skipped===true);
  const all=t!.answers.length===3&&t!.answers.every(a=>a.correct);
  if(c.outcome==='pending')need(!t!.skipped&&t!.answers.length<3&&t!.answers.every(a=>a.correct));
  else if(c.outcome==='joined'||c.outcome==='duplicate'||c.outcome==='unavailable')need(all&&!t!.skipped);
  else need(c.outcome==='escaped'&&(t!.skipped||t!.answers.at(-1)?.correct===false));
}
export const captureIndex = (c:CaptureOutcome) => Math.min(Math.max(0,(c.trial?.answers.length??0)-(c.outcome==="pending"?0:1)),2);
export const capturePending = (p:Profile) => p.run?.capture?.outcome==='pending'||p.mathIsland?.run?.capture?.outcome==='pending';
export type CaptureSource='voyage'|'island';
function active(s:Family,id:PlayerId,source:CaptureSource,runId:string) {
  need(source==='voyage'||source==='island');const p=s.profiles[id];need(p);
  const run=source==='voyage'?p.run:p.mathIsland?.run;
  need(run?.id===runId&&(source==='voyage'?(run as Run).status==='won':(run as IslandRun).completed));
  const c=run!.capture;need(c?.version===3&&c.outcome==='pending'&&c.trial);
  need(c!.trial!.grade===PLAYERS.find(x=>x.id===id)!.grade);
  return {p,c:c!,t:c!.trial!};
}
export function answerCapture(s:Family,id:PlayerId,source:CaptureSource,runId:string,index:number,choice:number,day:string) {
  const {p,c,t}=active(s,id,source,runId);need(index===t.answers.length);
  const q=questionById(t.questions[index]);need(q&&Number.isInteger(choice)&&choice>=0&&choice<q.options.length,'請選一個答案');
  const correct=choice===q!.answer;t.answers.push({choice,correct});
  if(!correct)c.outcome='escaped';
  else if(t.answers.length===3){
    const monster=monsterById(c.monster);need(monster);
    if((p.owned[c.monster]??0)>=10000){c.outcome='unavailable';c.reason='capacity';}
    else {c.outcome=p.owned[c.monster]?'duplicate':'joined';p.owned[c.monster]=(p.owned[c.monster]??0)+1;
      if(!Object.prototype.hasOwnProperty.call(p.firstAcquired,c.monster))p.firstAcquired[c.monster]=day;
      c.copies=p.owned[c.monster];}
  }
  return {correct,done:c.outcome!=='pending'};
}
export function skipCapture(s:Family,id:PlayerId,source:CaptureSource,runId:string) {
  const {c,t}=active(s,id,source,runId);t.skipped=true;c.outcome='escaped';return true;
}
