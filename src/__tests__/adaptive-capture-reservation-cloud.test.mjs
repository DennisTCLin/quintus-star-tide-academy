import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createAppServer} from '../../server.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,validateFamily,taipeiDay,startIsland,answerIsland,finishIsland,questionById} from '../../build/game.mjs';
import {prepareProfile} from './helpers/adaptive-fixture.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('earned capture reservations survive adaptive preparation',()=>{
 let api,server,url,c,other,child,player,runId,expected,finishRequest;
 const day=taipeiDay(),password='2947';
 const ledger=p=>({coins:p.coins,tickets:p.tickets,rewardStars:p.rewardStars,rewardRounds:p.rewardRounds,growth:p.growth,milestones:p.milestones,owned:p.owned});
 async function call(path,body,client=c){const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.state.csrf}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const request=(command,client=c)=>({id:randomUUID(),revision:client.state.family.revision,command:{player,...command}});
 async function send(command){const r=await call('command',request(command));expect(r.status,JSON.stringify(r.data)).toBe(200);c.state=r.data;return r.data;}
 async function raw(){return (await api.pool.query('SELECT family FROM game_states WHERE account_id=$1',[child.accountId])).rows[0].family;}
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  const username='capture_hold_'+randomUUID().slice(0,8);child=await provisionChildAccount(api.pool,{username,password,displayName:'Synthetic capture QA',grade:1});player=child.playerId;
  const f=newFamily(),p=f.profiles[player];delete p.onboarding;p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day,attempted:[]};
  const r=startIsland(f,player,'play','1A-01',randomUUID(),day);runId=r.id;
  for(let i=0;i<6;i++)answerIsland(f,player,r.id,i,r.items[i].answer,day);
  const old=structuredClone(f);finishIsland(old,player,r.id,day);expected={ledger:ledger(old.profiles[player]),quota:old.profiles[player].captureQuota,monster:r.encounter.variant};
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[child.accountId,f]);
  const login=await call('login',{username,password},null);expect(login.status).toBe(200);c={cookie:login.cookie,state:login.data};const b=await call('login',{username,password},null);other={cookie:b.cookie,state:b.data};
 });
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('settles the old earned rewards and reserves the same monster once with zero unlearned question payloads',async()=>{
  finishRequest=request({type:'island-finish',runId});const a=await call('command',finishRequest);expect(a.status,JSON.stringify(a.data)).toBe(200);c.state=a.data;
  const p=c.state.family.profiles[player],capture=p.mathIsland.run.capture;
  expect(ledger(p)).toEqual(expected.ledger);expect(p.captureQuota).toEqual(expected.quota);expect(capture.monster).toBe(expected.monster);expect(capture.outcome).toBe('pending');expect(capture.trial).toMatchObject({deferred:true,questions:[],answers:[]});
  expect(c.state.captureBlocks[runId]).toBe(true);expect(c.state.captureQuestions[runId]).toBeUndefined();
  const before=await raw();const replay=await call('command',finishRequest);expect(replay.status).toBe(200);expect(await raw()).toEqual(before);
  const b=await call('state',undefined,other);expect(b.data.family.profiles[player].mathIsland.run.capture).toEqual(capture);other.state=b.data;
 });
 it('rejects old-client direct answers and replacement runs atomically without consuming rewards or reservation',async()=>{
  const before=await raw();
  for(const command of [{type:'capture-answer',source:'island',runId,index:0,choice:0},{type:'island-start',mode:'play',unit:'1A-01'}]){
   const r=await call('command',request(command,other),other);expect(r.status).toBe(400);expect(await raw()).toEqual(before);
  }
  await send({type:'capture-adapt',source:'island',runId});expect(c.state.result).toBe('learn');expect(c.state.family.profiles[player].mathIsland.run.capture.trial.deferred).toBe(true);expect(c.state.captureQuestions[runId]).toBeUndefined();
  expect(ledger(c.state.family.profiles[player])).toEqual(expected.ledger);
 });
 it('resumes the same entitlement after trusted preparation; two-device replay cannot reroll or award twice',async()=>{
  // Isolated fixture adds only independent learning evidence; earned ledgers stay exact.
  const f=validateFamily(await raw()),before=ledger(f.profiles[player]);prepareProfile(f.profiles[player],1,{day,courses:['math']});expect(ledger(f.profiles[player])).toEqual(before);
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[child.accountId,f]);c.state=(await call('state')).data;
  await send({type:'capture-adapt',source:'island',runId});const p=c.state.family.profiles[player];expect(p.mathIsland.run.capture.monster).toBe(expected.monster);expect(p.mathIsland.run.capture.trial.deferred).toBeUndefined();expect(p.captureQuota).toEqual(expected.quota);expect(c.state.captureQuestions[runId].answer).toBeUndefined();
  const reserved=await raw();await send({type:'capture-adapt',source:'island',runId});expect((await raw()).profiles[player].mathIsland.run.capture).toEqual(reserved.profiles[player].mathIsland.run.capture);
  for(let i=0;i<3;i++){
   const q=c.state.captureQuestions[runId],req=request({type:'capture-answer',source:'island',runId,index:i,choice:questionById(q.id).answer});
   const pair=await Promise.all([call('command',req),call('command',req,other)]);expect(pair.map(x=>x.status)).toEqual([200,200]);c.state=pair[0].data;
  }
  const final=c.state.family.profiles[player],capture=final.mathIsland.run.capture;expect(['joined','duplicate']).toContain(capture.outcome);expect(final.owned[capture.monster]).toBe((expected.ledger.owned[capture.monster]??0)+1);expect(final.captureQuota).toEqual(expected.quota);
  const saved=await raw();expect((await call('command',finishRequest)).status).toBe(200);expect(await raw()).toEqual(saved);
  const {owned,...actualRewards}=ledger(final),{owned:oldOwned,...originalRewards}=expected.ledger;expect(actualRewards).toEqual(originalRewards);
 });
});
