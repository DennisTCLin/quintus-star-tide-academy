import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createAppServer } from '../../server.mjs';
import { createCloudApi } from '../../server/cloud.mjs';
import { newFamily, monsterById, questionById } from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('Math Island PostgreSQL transactions',()=>{
 let api,server,url;const password='island-isolated-test-2026';
 async function call(path,body,c){const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 async function client(){const username='islandqa_'+randomUUID().replaceAll('-','').slice(0,14);const r=await call('register',{username,password});expect(r.status).toBe(200);const c={username,cookie:r.cookie,csrf:r.data.csrf,state:r.data};await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[username,newFamily()]);c.state=(await call('state',undefined,c)).data;return c;}
 const body=(c,cmd)=>({id:randomUUID(),revision:c.state.family.revision,command:{player:'doudou',...cmd}});
 async function cmd(c,command){const r=await call('command',body(c,command),c);if(r.status===200)c.state=r.data;return r;}
 async function raw(c){return (await api.pool.query('SELECT family FROM game_states WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username])).rows[0].family;}
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;},30000);
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('persists lower-semester quantities, money and calendar rounds through the actual API',async()=>{
  const c=await client();
  for(const unit of ['1B-04','1B-06','1B-07']) {
   for(const mode of ['learn','play','boss']) {
    expect((await cmd(c,{type:'island-start',mode,unit})).status).toBe(200);
    const run=(await raw(c)).profiles.doudou.mathIsland.run;
    expect(run.items.every(q=>Number(q.answer)>=0&&Number(q.answer)<=100)).toBe(true);
    for(let index=0;index<run.items.length;index++)expect((await cmd(c,{type:'island-answer',runId:run.id,index,choice:run.items[index].answer})).status).toBe(200);
    expect((await cmd(c,{type:'island-finish',runId:run.id})).status).toBe(200);
    if(c.state.family.profiles.doudou.mathIsland.run.capture?.outcome==='pending')expect((await cmd(c,{type:'capture-skip',source:'island',runId:run.id})).status).toBe(200);
    const again=await call('state',undefined,c);expect(again.status).toBe(200);c.state=again.data;
    expect(c.state.family.profiles.doudou.mathIsland.units[unit][mode==='boss'?'boss':mode]).toBeTruthy();
   }
  }
 },20000);
 it('deduplicates concurrent submissions, rejects stale and forged commands, resumes from a second session',async()=>{
  const c=await client(),before=structuredClone(c.state.family);
  const start=await cmd(c,{type:'island-start',mode:'learn',unit:'1A-01'});expect(start.status).toBe(200);
  const run=(await raw(c)).profiles.doudou.mathIsland.run;
  expect(start.data.result.items.every(q=>q.answer==='')).toBe(true);
  const payload=body(c,{type:'island-answer',runId:run.id,index:0,choice:run.items[0].answer});
  const replies=await Promise.all([call('command',payload,c),call('command',payload,c)]);
  expect(replies.map(r=>r.status)).toEqual([200,200]);
  c.state=(await call('state',undefined,c)).data;
  const p=c.state.family.profiles.doudou;
  expect(p.coins).toBe(10);expect(p.mathIsland.run.answers).toHaveLength(1);
  expect(p.mathIsland.run.items[0].answer).toBe(run.items[0].answer);
  expect(p.mathIsland.run.items.slice(1).every(q=>q.answer==='')).toBe(true);
  expect((await call('command',{...payload,id:randomUUID()},c)).status).toBe(409);
  for(const command of [
   {type:'island-answer',runId:run.id,index:0,choice:run.items[0].answer},
   {type:'island-answer',runId:run.id,index:1,choice:run.items[1].answer,points:999},
   {type:'island-finish',runId:run.id},
   {type:'island-start',mode:'mock'},
   {type:'island-start',player:'quintus',mode:'learn',unit:'1A-01',grade:6},
  ])expect((await cmd(c,command)).status).toBe(400);
  const login=await call('login',{username:c.username,password});expect(login.status).toBe(200);
  expect(login.data.family.profiles.doudou.mathIsland).toEqual(p.mathIsland);
  for(const id of ['quintus','feifei','qingqing'])expect(login.data.family.profiles[id]).toEqual(before.profiles[id]);
  const other=await client();expect(other.state.family.profiles.doudou.mathIsland).toBeUndefined();
 });
 it('saves upper-grade card answers for existing players and keeps future solutions private',async()=>{
  const c=await client(),untouched=structuredClone(c.state.family.profiles.qingqing);
  for(const [player,grade,unit] of [['feifei',2,'2A-07'],['quintus',4,'4A-04'],['doudou',6,'6B-02']]) {
   const started=await cmd(c,{type:'island-start',player,grade,mode:'learn',unit});
   expect(started.status).toBe(200);
   expect(started.data.result.items.every(q=>q.answer==='')).toBe(true);
   const run=(await raw(c)).profiles[player].mathIsland.run;
   expect(run.grade).toBe(grade);
   expect(run.items[0].p.options.length).toBeGreaterThanOrEqual(3);
   expect((await cmd(c,{type:'island-answer',player,runId:run.id,index:0,choice:run.items[0].answer})).status).toBe(200);
   const saved=c.state.family.profiles[player].mathIsland;
   expect(saved.run.answers).toHaveLength(1);
   expect(saved.run.items.slice(1).every(q=>q.answer==='')).toBe(true);
   expect(saved.stats[run.items[0].k].a).toBe(1);
   const reloaded=await call('state',undefined,c);c.state=reloaded.data;
   expect(c.state.family.profiles[player].mathIsland).toEqual(saved);
   expect((await cmd(c,{type:'island-quit',player,runId:run.id})).status).toBe(200);
  }
  expect(c.state.family.profiles.qingqing).toEqual(untouched);
 });
 it('finishes exactly once and preserves progress/first attempts after leaving the round',async()=>{
  const c=await client();await cmd(c,{type:'island-start',mode:'learn',unit:'1A-04'});
  const run=(await raw(c)).profiles.doudou.mathIsland.run;
  for(let i=0;i<run.items.length;i++)expect((await cmd(c,{type:'island-answer',runId:run.id,index:i,choice:run.items[i].answer})).status).toBe(200);
  const done=await cmd(c,{type:'island-finish',runId:run.id});expect(done.status).toBe(200);
  expect(done.data.family.profiles.doudou.mathIsland.units['1A-04'].learn).toBe(true);
  expect(done.data.result.savedStar).toBe(false);expect(done.data.family.profiles.doudou.rewardRounds).toBe(0);
  const snapshot=structuredClone(done.data.family.profiles.doudou);
  expect((await cmd(c,{type:'island-finish',runId:run.id})).status).toBe(200);
  expect(c.state.family.profiles.doudou).toEqual(snapshot);
  for(const extra of [{element:'水'},{variant:'cloud-scout-water'},{route:{element:'水'}}]) {
   expect((await cmd(c,{type:'island-start',mode:'play',unit:'1A-04',...extra})).status).toBe(400);
  }
  await cmd(c,{type:'island-start',mode:'play',unit:'1A-04'});
  const next=(await raw(c)).profiles.doudou.mathIsland.run;
  expect(next.items).toHaveLength(6);
  expect(monsterById(next.encounter.variant).element).toBe('金');
  const login=await call('login',{username:c.username,password});expect(login.status).toBe(200);
  expect(login.data.family.profiles.doudou.mathIsland.run.encounter).toEqual(next.encounter);
  await cmd(c,{type:'island-answer',runId:next.id,index:0,choice:next.items[0].answer});
  const attempted=c.state.family.profiles.doudou.mathIsland.attempted;
  await cmd(c,{type:'island-quit',runId:next.id});
  expect(c.state.family.profiles.doudou.mathIsland.run).toBeUndefined();
  expect(c.state.family.profiles.doudou.mathIsland.attempted).toEqual(attempted);
 });
 it('settles island capture and a ticket once after three previous successes, with stable replay after a new round',async()=>{
  const c=await client(),f=newFamily(),p=f.profiles.doudou;
  p.rewardRounds=3;p.rewardStars=1;p.captureQuota={day:c.state.day,attempts:3};
  p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day:'',attempted:[]};
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username,f]);
  c.state=(await call('state',undefined,c)).data;
  await cmd(c,{type:'island-start',mode:'play',unit:'1A-01'});
  const run=(await raw(c)).profiles.doudou.mathIsland.run;
  for(let i=0;i<6;i++)await cmd(c,{type:'island-answer',runId:run.id,index:i,choice:run.items[i].answer});
  const payload=body(c,{type:'island-finish',runId:run.id});
  expect((await call('command',{...payload,command:{...payload.command,captureRoll:0}},c)).status).toBe(400);
  const pair=await Promise.all([call('command',payload,c),call('command',payload,c)]);
  expect(pair.map(r=>r.status)).toEqual([200,200]);expect(pair[0].data.result).toEqual(pair[1].data.result);
  c.state=pair[0].data;
  expect(c.state.family.profiles.doudou).toMatchObject({tickets:1,rewardStars:0,rewardRounds:4,captureQuota:{attempts:4}});
  expect(pair[0].data.result.capture.outcome).toBe('pending');
  expect(pair[0].data.result.capture.trial.questions.filter(Boolean)).toHaveLength(1);
  for(let i=0;i<3;i++){const q=c.state.captureQuestions[run.id];expect(q.answer).toBeUndefined();expect((await cmd(c,{type:'capture-answer',source:'island',runId:run.id,index:i,choice:questionById(q.id).answer})).status).toBe(200);}
  expect(c.state.family.profiles.doudou.owned[run.encounter.variant]).toBe(1);
  expect(monsterById(pair[0].data.result.capture.monster).element).toBe('金');
  expect(pair[0].data.result.capture.monster).toBe(run.encounter.variant);
  await cmd(c,{type:'island-start',mode:'play',unit:'1A-01'});
  const replay=await call('command',payload,c);expect(replay.status).toBe(200);
  expect(replay.data.result.capture).toEqual(pair[0].data.result.capture);
  expect(replay.data.family.profiles.doudou.tickets).toBe(1);
  expect(replay.data.family.profiles.doudou.mathIsland.run.id).not.toBe(run.id);
 });
 it('redacts unsubmitted answers even from early-finish receipts',async()=>{
  const c=await client();await cmd(c,{type:'island-start',mode:'learn',unit:'1A-01'});
  let run=(await raw(c)).profiles.doudou.mathIsland.run;
  for(let i=0;i<run.items.length;i++)await cmd(c,{type:'island-answer',runId:run.id,index:i,choice:run.items[i].answer});
  await cmd(c,{type:'island-finish',runId:run.id});await cmd(c,{type:'island-start',mode:'play',unit:'1A-01'});
  run=(await raw(c)).profiles.doudou.mathIsland.run;
  for(let i=0;i<3;i++)await cmd(c,{type:'island-answer',runId:run.id,index:i,choice:run.items[i].choices.find(a=>a!==run.items[i].answer)});
  const payload=body(c,{type:'island-finish',runId:run.id});
  for(let i=0;i<2;i++){
   const r=await call('command',payload,c);expect(r.status).toBe(200);
   expect(r.data.result.items.slice(3).every(q=>q.answer==='')).toBe(true);
   expect(r.data.family.profiles.doudou.mathIsland.units['1A-01'].play).toBeUndefined();
  }
 });

});
