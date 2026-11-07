import{LESSONS,exerciseById,lessonById,type Track}from'./catalog';
import{isCorrect}from'./answers';
export type LearningPlan={version:1;purposes:Track[];minutes:5|10|15;weeklyDays:3|5|7;confidence:'new'|'some'|'confident';focus:'balanced'|'understanding'|'expression';startedDay:string};
export type PlacementSkill='basics'|'listening'|'expression'|'situations';
type Item={id:string;skill:PlacementSkill};
const item=(lesson:string,n:number,skill:PlacementSkill):Item=>({id:`adult-en-v1-${lesson}-${n}`,skill});
export const BASELINE:Item[]=[item('hello',1,'situations'),item('be-verbs',2,'listening'),item('everyday-things',3,'expression'),item('numbers-time',4,'basics'),item('likes-needs',5,'basics'),item('simple-questions',4,'expression')];
export const FOLLOWUPS:Record<'foundation'|'daily'|'applied',Item[]>={
 foundation:[item('hello',4,'basics'),item('be-verbs',1,'basics'),item('everyday-things',2,'listening'),item('numbers-time',1,'basics'),item('likes-needs',3,'expression'),item('simple-questions',1,'basics')],
 daily:[item('keep-talking',1,'situations'),item('coffee-order',2,'listening'),item('keep-talking',3,'expression'),item('coffee-order',4,'expression'),item('coffee-order',5,'situations'),item('keep-talking',5,'situations')],
 applied:[item('make-plans',1,'situations'),item('find-way',2,'listening'),item('meeting-time',3,'expression'),item('ask-update',4,'expression'),item('meeting-time',5,'situations'),item('find-way',3,'expression')],
};
export type Placement={version:1;id:string;ids:string[];index:number;results:{answer:string;correct:boolean;skipped:boolean}[];branch:keyof typeof FOLLOWUPS|null;status:'active'|'complete';startedDay:string;completedDay?:string;acknowledged:boolean};
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const day=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export function validPlan(v:unknown):v is LearningPlan{return obj(v)&&v.version===1&&Array.isArray(v.purposes)&&v.purposes.length>0&&v.purposes.length<=3&&new Set(v.purposes).size===v.purposes.length&&v.purposes.every(x=>typeof x==='string'&&['everyday','travel','work'].includes(x))&&typeof v.minutes==='number'&&[5,10,15].includes(v.minutes)&&typeof v.weeklyDays==='number'&&[3,5,7].includes(v.weeklyDays)&&typeof v.confidence==='string'&&['new','some','confident'].includes(v.confidence)&&typeof v.focus==='string'&&['balanced','understanding','expression'].includes(v.focus)&&day(v.startedDay);}
export function validPlacement(v:unknown):v is Placement{
 if(!obj(v)||v.version!==1||typeof v.id!=='string'||!/^[a-f0-9-]{36}$/i.test(v.id)||!Array.isArray(v.ids)||!Array.isArray(v.results)||!Number.isSafeInteger(v.index)||(typeof v.status!=='string'||!['active','complete'].includes(v.status))||!day(v.startedDay)||typeof v.acknowledged!=='boolean')return false;
 if(v.branch!==null&&(typeof v.branch!=='string'||!Object.prototype.hasOwnProperty.call(FOLLOWUPS,v.branch)))return false;
 const expected=[...BASELINE,...(v.branch?FOLLOWUPS[v.branch as keyof typeof FOLLOWUPS]:[])].map(q=>q.id);
 if(JSON.stringify(v.ids)!==JSON.stringify(expected)||Number(v.index)<0||Number(v.index)>=expected.length||v.results.length>12)return false;
 if(v.branch===null&&v.results.length>=6||v.branch!==null&&v.results.length<6)return false;
 if(v.status==='complete'?(v.results.length!==12||v.index!==11||!day(v.completedDay)||String(v.completedDay)<String(v.startedDay)):(v.results.length!==v.index||v.acknowledged||v.completedDay!==undefined))return false;
 if(!v.results.every((r,i)=>obj(r)&&typeof r.answer==='string'&&r.answer.length<=300&&typeof r.correct==='boolean'&&typeof r.skipped==='boolean'&&r.correct===(!r.skipped&&isCorrect(expected[i],r.answer))&&(!r.skipped||r.answer===''&&exerciseById(expected[i])?.kind==='listen')))return false;
 if(v.branch!==null){const n=v.results.slice(0,6).filter(r=>r.correct).length;if(v.branch!==(n>=5?'applied':n>=3?'daily':'foundation'))return false;}
 return true;
}
export function startPlacement(date:string):Placement{return{version:1,id:crypto.randomUUID(),ids:BASELINE.map(q=>q.id),index:0,results:[],branch:null,status:'active',startedDay:date,acknowledged:false};}
export function answerPlacement(source:Placement,answer:string,skipped:boolean,date:string):Placement{
 if(!validPlacement(source)||source.status!=='active'||!day(date)||date<source.startedDay||typeof answer!=='string'||answer.length>300||!skipped&&!answer.trim()||skipped&&exerciseById(source.ids[source.index])?.kind!=='listen')throw Error('請先選擇或輸入測驗答案。');
 const p=structuredClone(source);p.results.push({answer:skipped?'':answer,correct:!skipped&&isCorrect(p.ids[p.index],answer),skipped});
 if(p.results.length===6){const n=p.results.filter(r=>r.correct).length;p.branch=n>=5?'applied':n>=3?'daily':'foundation';p.ids.push(...FOLLOWUPS[p.branch].map(q=>q.id));}
 if(p.results.length===12){p.status='complete';p.completedDay=date;}else p.index++;
 return p;
}
export function placementReport(p:Placement,plan:LearningPlan){
 if(!validPlacement(p)||p.status!=='complete'||!validPlan(plan))throw Error('請先完成能力盤點。');
 const list=[...BASELINE,...FOLLOWUPS[p.branch!]],skills=Object.fromEntries((['basics','listening','expression','situations']as const).map(skill=>{const rs=list.flatMap((q,i)=>q.skill===skill?[p.results[i]]:[]);return[skill,{correct:rs.filter(r=>r.correct).length,assessed:rs.filter(r=>!r.skipped).length,skipped:rs.filter(r=>r.skipped).length}];}))as Record<PlacementSkill,{correct:number;assessed:number;skipped:number}>;
 const base=p.results.slice(0,6),baseCorrect=base.filter(r=>r.correct).length,later=p.results.slice(6).filter(r=>r.correct).length;
 const weakBase=BASELINE.find((_,i)=>!base[i].correct&&!base[i].skipped),foundation=LESSONS.filter(l=>l.category==='foundation');
 const start=baseCorrect<5?(weakBase?lessonById(weakBase.id.replace(/^adult-en-v1-/,'').replace(/-\d+$/,'')):foundation[0])!:p.branch==='applied'&&later>=4?lessonById(plan.purposes.includes('work')?'meeting-time':plan.purposes.includes('travel')?'find-way':'make-plans')!:lessonById(plan.purposes.includes('travel')?'coffee-order':'keep-talking')!;
 const level=baseCorrect<5?'foundation':p.branch==='applied'&&later>=4?'applied':'bridge';
 const preferred=LESSONS.filter(l=>plan.purposes.includes(l.track)&&l.category!=='foundation').sort((a,b)=>Number(a.level==='A2')-Number(b.level==='A2')||(plan.focus==='understanding'?Number(a.category==='conversation')-Number(b.category==='conversation'):plan.focus==='expression'?Number(b.category==='conversation')-Number(a.category==='conversation'):0));
 const at=foundation.findIndex(l=>l.id===start.id),path=[start,...(level==='foundation'?[...foundation.slice(Math.max(0,at)),...foundation.slice(0,Math.max(0,at))]:[]),...preferred,...foundation];
 return{level,correct:p.results.filter(r=>r.correct).length,assessed:p.results.filter(r=>!r.skipped).length,skipped:p.results.filter(r=>r.skipped).length,baseCorrect,skills,startLessonId:start.id,path:[...new Set(path.map(l=>l.id))],reason:level==='foundation'?'先補穩基礎句型，再銜接你選的情境。':level==='applied'?'基礎與這組情境已有把握，先從應用課程練起。':'先練常用情境，再把不熟的句型補齊。'};
}
