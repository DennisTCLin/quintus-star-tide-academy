// Local synthetic fixtures; no production connections.
import {writeFileSync} from 'node:fs';
import {newFamily,startRun,readyQuestion,answerRun,nextQuestion,questionById,validateFamily,taipeiDay,startIsland} from '../../build/game.mjs';
const day=taipeiDay();
for(const mode of ['active','pending','completed','math-active']) {
  const family=newFamily(), p=family.profiles.alston;
  p.learning.school='jianan';
  startRun(family,'alston','science',crypto.randomUUID(),42,false,day,'relaxed');
  if(mode!=='active') {
    for(let i=0;i<6;i++) {
      const r=p.run;readyQuestion(family,'alston',r.id,i,Date.now());
      answerRun(family,'alston',r.id,i,questionById(r.questions[i]).answer,day);
      if(i<5)nextQuestion(family,'alston',r.id,i);
    }
    if(mode==='pending') {p.run.reward='pending';p.rewardStars--;}
  }
  if(mode==='math-active') startIsland(family,'doudou','learn','1A-01',crypto.randomUUID(),day);
  validateFamily(family);
  writeFileSync('/tmp/alston-subject-'+mode+'.json',JSON.stringify(family));
}
