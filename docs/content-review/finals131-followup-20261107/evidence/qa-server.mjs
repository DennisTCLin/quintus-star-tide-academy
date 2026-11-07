// Local synthetic UI fixture only; no database, credentials, real accounts or production endpoints.
import fs from 'node:fs';
import * as g from '../../build/game.mjs';
import {createAppServer} from '../../server.mjs';
const bank=JSON.parse(fs.readFileSync('src/data/finals-followup-20261107.json'));
const configs=[["qingqing", 1, "xingan", "tones", "phase2-g1-20002160-i1-men"], ["feifei", 2, "nantun", "pairs", "phase2-g2-20002167-i1-2"], ["jay", 5, "dongmen", "chinese", "phase2-g5c-20002211-iii2"], ["alston", 6, "jianan", "science", "phase2-g6s-20002242-i1"]];
const servers=[];
for(const [player,grade,school,course,first] of configs){
 const f=g.newFamily(),p=f.profiles[player],day=g.taipeiDay();p.learning.school=school;p.coins=1234;
 g.startRun(f,player,course,'synthetic-followup131-'+grade,7,false,day);
 const candidates=bank.filter(q=>q.grade===grade&&q.course===course);p.run.questions=[first,...candidates.filter(q=>q.id!==first).slice(0,5).map(q=>q.id)];
 delete p.run.challenge;let commands=[];
 const snapshot=(result)=>{
  const copy=structuredClone(f),r=copy.profiles[player].run,q=structuredClone(g.questionById(p.run.questions[p.run.index]));
  if(!r.settled){delete q.answer;delete q.explanation;delete q.target;}
  r.questions=r.questions.map((id,i)=>i===r.index?id:'');
  return {family:copy,questions:{[player]:q},reviews:{},username:'synthetic-followup131-g'+grade,displayName:'本機題庫驗證',playerId:player,csrf:'synthetic-only',day,verified:Object.fromEntries(Object.keys(f.profiles).map(id=>[id,0])),legacy:false,canMigrate:false,result};
 };
 const server=createAppServer({api:async(req,res)=>{
  const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(req.url==='/api/state')return send(snapshot());
  if(req.url==='/api/qa-evidence')return send({synthetic:true,grade,school,question:p.run.questions[p.run.index],index:p.run.index,coins:p.coins,commands});
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
 const port=43910+grade;server.listen(port,'127.0.0.1');servers.push(server);
}
console.log('Local synthetic finals fixtures: http://127.0.0.1:43911 /43912 /43915 /43916');
process.on('SIGTERM',()=>{servers.forEach(s=>s.close());process.exit(0);});
