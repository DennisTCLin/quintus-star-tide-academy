import {newFamily,taipeiDay,enableAdaptive,reportSchoolExposure,observeAdaptive,questionById} from '../../../build/game.mjs';
import {topicsFor} from '../../adaptive-catalog';
import {PLAYERS} from '../../game-view';
export const emptyAdaptive=()=>({version:1,sequence:0,scope:{},evidence:{},examples:{}});
/** Synthetic prior independent learning, only for transaction tests whose subject
 * is receipts/timing/ledgers. Policy/onboarding tests must start unprepared.
 * Does not mark earned IDs, award points or change any original reward ledger.
 */
export function prepareProfile(p,grade,{day=taipeiDay(),courses,school=p.learning.school}={}) {
 if(school)p.learning.school=school;
 const a=enableAdaptive(p.learning);a.lastLearningDay=day;a.coachedRound=`${day}:${p.rewardRounds}`;
 for(const t of topicsFor(grade).filter(t=>!courses||courses.includes(t.course))){
  reportSchoolExposure(p.learning,grade,t.id,'taught',day);
  for(const id of t.questions.filter(id=>!questionById(id).examSources?.length).slice(0,24))observeAdaptive(p.learning,questionById(id),true,false,day);
 }
 return p;
}
export function preparedFamily(){const f=newFamily();for(const p of PLAYERS)prepareProfile(f.profiles[p.id],p.grade);return f;}
/** Explicit additive response contract. Original fields must still deep-equal. */
export function withAdaptiveOverlay(f){const result=structuredClone(f);for(const p of Object.values(result.profiles))p.learning.adaptive??=emptyAdaptive();return result;}
export async function completeLearning(send,readState,player){
 for(let step=0;step<24;step++){
  const st=readState(),r=st.family.profiles[player].learning.study?.session;
  if(!r||r.status==='complete')return;
  if(r.phase==='scope')await send({type:'learning-scope',sessionId:r.id,state:'taught'});
  else if(r.phase==='lesson')await send({type:'learning-lesson',sessionId:r.id,index:r.index,done:true});
  else if(r.settled)await send({type:'review-next',sessionId:r.id,index:r.index});
  else await send({type:'review-answer',sessionId:r.id,index:r.index,choice:questionById(st.studyQuestions[player].id).answer});
 }
 throw Error('Learning fixture failed to complete through public commands');
}
