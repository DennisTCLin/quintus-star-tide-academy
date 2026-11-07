// Local synthetic UI fixture only; no database, credentials, real accounts or production endpoints.
import fs from 'node:fs';
import * as g from '../../build/game.mjs';
import {createAppServer} from '../../server.mjs';
const bank=JSON.parse(fs.readFileSync('src/data/finals-round6-20261107.json'));
const configs=[["qingqing",1,"xingan","math","r6-g1m-20000588-iii4",45411],["qingqing",1,"yongchun","math","r6-g1m-20000588-iv2",45412],["jay",5,"dongmen","chinese","r6-g5c-20000878-fix4",45413],["alston",6,"jianan","chinese","r6-g6c-20003716-huai",45414],["alston",6,"jianan","chinese","r6-g6c-20003716-hua",45415],["alston",6,"jianan","chinese","r6-g6c-20003716-idiom4",45416]];
const servers=[];
for(const [player,grade,school,course,first,port] of configs){
 const f=g.newFamily(),p=f.profiles[player],day=g.taipeiDay();p.learning.school=school;p.coins=1234;
 g.startRun(f,player,course,'synthetic-round6-131-'+grade,7,false,day);
 const candidates=bank.filter(q=>q.grade===grade&&q.course===course);p.run.questions=[first,...candidates.filter(q=>q.id!==first).slice(0,5).map(q=>q.id)];
 delete p.run.challenge;let commands=[];
 const snapshot=(result)=>{
  const copy=structuredClone(f),r=copy.profiles[player].run,q=structuredClone(g.questionById(p.run.questions[p.run.index]));
  if(!r.settled){delete q.answer;delete q.explanation;delete q.target;}
  r.questions=r.questions.map((id,i)=>i===r.index?id:'');
  return {family:copy,questions:{[player]:q},reviews:{},username:'synthetic-round6-131-g'+grade,displayName:'本機題庫驗證',playerId:player,csrf:'synthetic-only',day,verified:Object.fromEntries(Object.keys(f.profiles).map(id=>[id,0])),legacy:false,canMigrate:false,result};
 };
 const server=createAppServer({api:async(req,res)=>{
  const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(req.url==='/api/state')return send(snapshot());
  if(req.url==='/api/qa-evidence')return send({synthetic:true,grade,school,course,question:p.run.questions[p.run.index],index:p.run.index,coins:p.coins,commands});
  if(req.url==='/api/command'){
   try{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw),c=body.command;let result;
    if(c.type==='answer')result=g.answerRun(f,player,c.runId,c.index,c.choice,day);
    else if(c.type==='advance-question')g.nextQuestion(f,player,c.runId,c.index);
    else if(c.type==='start')g.startRun(f,player,c.course,'synthetic-restart',7,false,day);
    commands.push({type:c.type,index:c.index,result});f.revision++;return send(snapshot(result));
   }catch(e){return send({error:e.message},409);}
  }
  return send({error:'Synthetic fixture does not implement this unrelated endpoint'},404);
 }});
 server.listen(port,'127.0.0.1');servers.push(server);
}
console.log('Synthetic round6 UI ports 45411–45416');
process.on('SIGTERM',()=>{servers.forEach(s=>s.close());process.exit(0);});
