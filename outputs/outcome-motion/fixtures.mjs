import fs from 'node:fs';
import * as g from '../../build/game.mjs';
const day=g.taipeiDay();
let player="qingqing";
function snapshot(family,result=true){
 const copy=structuredClone(family),r=copy.profiles[player].run,q=g.questionById(r.questions[r.index]);
 const questions={[player]:{...q}};if(!r.settled){delete questions[player].answer;delete questions[player].explanation;delete questions[player].target;}
 const reviews={[player]:r.answers.flatMap((correct,index)=>correct?[]:[{index,question:g.questionById(r.questions[index])}])};
 r.questions=r.questions.map((x,i)=>i===r.index?x:'');
 return {family:copy,questions,reviews,username:'qa-victory',playerId:player,displayName:'測試航海員',csrf:'synthetic-only',day,verified:Object.fromEntries(g.PLAYERS.map(p=>[p.id,0])),legacy:false,canMigrate:false,result};
}
let data={};
for(const mode of ['normal','wrong-last','practice','old','pending','ruby']){
 player=mode==='ruby'?'feifei':'qingqing';
 const f=g.newFamily();g.startRun(f,player,'math','qa-'+mode,1,mode==='practice',day);
 for(let i=0;i<5;i++){g.answerRun(f,player,f.profiles[player].run.id,i,g.questionById(f.profiles[player].run.questions[i]).answer,day);g.nextQuestion(f,player,f.profiles[player].run.id,i);}
 const active=snapshot(f),q=g.questionById(f.profiles[player].run.questions[5]),choice=mode==='wrong-last'?(q.answer+1)%q.options.length:q.answer;
 g.answerRun(f,player,f.profiles[player].run.id,5,choice,day);f.revision++;
 if(mode==='old')f.profiles[player].run.day='2026-10-20';
 if(mode==='pending'){f.profiles[player].rewardStars=0;f.profiles[player].run.reward='pending';}
 const won=snapshot(f,mode!=='wrong-last');let saved;
 if(mode==='pending'){g.claimReward(f,player,f.profiles[player].run.id,'save');f.revision++;saved=snapshot(f,'saved');}
 const balances=({rewardStars,tickets,coins,rewardRounds})=>({rewardStars,tickets,coins,rewardRounds});
 const before=balances(f.profiles[player]);
 g.startRun(f,player,'math','qa-next-'+mode,2,mode==='practice',day,'standard');f.revision++;
 if(JSON.stringify(before)!==JSON.stringify(balances(f.profiles[player])))throw Error('start awarded twice');
 data[mode]={active,won,saved,next:snapshot(f),choice};
}

player='qingqing';
const f=g.newFamily();g.startRun(f,player,'math','qa-defeat',1,false,day);
for(let i=0;i<2;i++){const q=g.questionById(f.profiles[player].run.questions[i]);g.answerRun(f,player,'qa-defeat',i,(q.answer+1)%q.options.length,day);g.nextQuestion(f,player,'qa-defeat',i);}
const active=snapshot(f),q=g.questionById(f.profiles[player].run.questions[2]),choice=(q.answer+1)%q.options.length;
g.answerRun(f,player,'qa-defeat',2,choice,day);f.revision++;
data.defeat={active,won:snapshot(f,false),choice,corrections:[]};
for(let i=0;i<3;i++){
 const question=g.questionById(f.profiles[player].run.questions[i]);
 g.correctRun(f,player,'qa-defeat',i,question.answer,day);f.revision++;
 data.defeat.corrections.push(snapshot(f,true));
}
g.startRun(f,player,'math','qa-defeat-next',2,false,day,'standard');f.revision++;
data.defeat.next=snapshot(f);
fs.writeFileSync(new URL('./fixtures.json',import.meta.url),JSON.stringify(data));
