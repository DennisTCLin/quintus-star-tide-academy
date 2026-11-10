import {describe,it,expect} from 'vitest';
import {transferSignature} from '../adaptive-transfer';
import {TOPIC_BY_ID} from '../adaptive-catalog';
import {questionById,type LearningQuestion} from '../learning';
import {freshLearning} from '../learning-engine';
import {enableAdaptive,reportSchoolExposure,observeAdaptive,challengeEligible,allocateMastered,showExample} from '../adaptive-learning';
import {newFamily} from '../adventure';
import {startIsland,answerIsland,finishIsland} from '../island/server';
const day='2026-11-10';
function cluster(topic:string){const groups=new Map<string,LearningQuestion[]>();for(const id of TOPIC_BY_ID[topic].questions){const q=questionById(id)!,key=transferSignature(q);if(key)groups.set(key,[...groups.get(key)??[],q]);}return [...groups.values()].find(q=>q.length>=10)!;}
function prepared(topic='2:math:add-1') {const s=freshLearning();enableAdaptive(s);reportSchoolExposure(s,2,topic,'taught',day);const qs=cluster(topic);qs.slice(0,2).forEach(q=>observeAdaptive(s,q,true,false,day));return {s,qs};}
describe('reviewed procedural transfer boundaries',()=>{
 it('offers new same-template questions after two independent examples',()=>{const {s,qs}=prepared();expect(challengeEligible(s,qs[2],2)).toBe(true);const got=allocateMastered(s,2,'math',6);expect(new Set(got.map(x=>x.id)).size).toBe(6);expect(got.every(x=>!s.adaptive!.evidence[x.id]&&!x.review)).toBe(true);});
 it('never transfers to another operation, numeric band, carry pattern, fact or exam',()=>{const {s,qs}=prepared();for(const t of ['2:math:add-2','2:math:sub-1','2:math:mul-1']){reportSchoolExposure(s,2,t,'taught',day);expect(TOPIC_BY_ID[t].questions.every(id=>!challengeEligible(s,questionById(id),2))).toBe(true);}const different=TOPIC_BY_ID['2:math:add-1'].questions.map(id=>questionById(id)!).filter(q=>transferSignature(q)!==transferSignature(qs[0]));expect(different.length).toBeGreaterThan(0);expect(different.every(q=>!challengeEligible(s,q,2))).toBe(true);expect(transferSignature(questionById('r6-g1m-20000588-iv3')!)).toBeUndefined();expect(transferSignature(questionById('c1-g4-english-02')!)).toBeUndefined();});
 it('rejects guessed/hinted/exposed evidence and a known wrong transfer target',()=>{const {s,qs}=prepared();observeAdaptive(s,qs[1],true,true,day);expect(challengeEligible(s,qs[2],2)).toBe(false);observeAdaptive(s,qs[1],true,false,'2026-11-11');expect(challengeEligible(s,qs[2],2)).toBe(true);observeAdaptive(s,qs[2],false,false,day);expect(challengeEligible(s,qs[2],2)).toBe(false);showExample(s,qs[3].id,day);expect(challengeEligible(s,qs[3],2)).toBe(false);reportSchoolExposure(s,2,'2:math:add-1','not-yet',day);expect(challengeEligible(s,qs[4],2)).toBe(false);});
 it('cannot unlock unseen vocabulary through two known words',()=>{const s=freshLearning();enableAdaptive(s);reportSchoolExposure(s,6,'6:english:vocabulary','taught',day);const qs=TOPIC_BY_ID['6:english:vocabulary'].questions.map(id=>questionById(id)!);qs.slice(0,2).forEach(q=>observeAdaptive(s,q,true,false,day));expect(challengeEligible(s,qs[0],6)).toBe(true);expect(challengeEligible(s,qs[2],6)).toBe(false);});
});
describe('gentle island play retains the existing reward contract',()=>{
 for(const correct of [4,6])it(`retains ${correct}/6 reward, command replay and a genuine new round`,()=>{const f=newFamily(),p=f.profiles.qingqing;enableAdaptive(p.learning);p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day,attempted:[]};for(let n=0;n<2;n++){const r=startIsland(f,'qingqing','play','1A-01','round'+n,day);for(let i=0;i<6;i++)answerIsland(f,'qingqing',r.id,i,i<correct?r.items[i].answer:r.items[i].choices.find(c=>c!==r.items[i].answer)!,day);const before=p.rewardRounds;finishIsland(f,'qingqing',r.id,day);expect(r.savedStar).toBe(true);expect(p.rewardRounds).toBe(before+1);const earned=JSON.stringify(p);finishIsland(f,'qingqing',r.id,day);expect(JSON.stringify(p)).toBe(earned);}});
 it('teaches through six errors without awarding a free completion',()=>{const f=newFamily(),p=f.profiles.qingqing;enableAdaptive(p.learning);p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day,attempted:[]};const r=startIsland(f,'qingqing','play','1A-01','gentle',day);for(let i=0;i<6;i++)answerIsland(f,'qingqing',r.id,i,r.items[i].choices.find(c=>c!==r.items[i].answer)!,day);finishIsland(f,'qingqing',r.id,day);expect(r.completed).toBe(true);expect(r.savedStar).toBe(false);expect(p.rewardRounds).toBe(0);});
});
it('fraction transfer cannot introduce numerator carry',()=>{
 const s=freshLearning();enableAdaptive(s);reportSchoolExposure(s,4,'4:math:fraction-3','taught',day);
 const qs=TOPIC_BY_ID['4:math:fraction-3'].questions.map(id=>questionById(id)!);
 for(const prompt of ['1/11 + 1/11 = ?','1/11 + 2/11 = ?'])observeAdaptive(s,qs.find(q=>q.prompt===prompt)!,true,false,day);
 expect(challengeEligible(s,qs.find(q=>q.prompt==='5/11 + 5/11 = ?'),4)).toBe(false);
 expect(challengeEligible(s,qs.find(q=>q.prompt==='2/11 + 3/11 = ?'),4)).toBe(true);
});
