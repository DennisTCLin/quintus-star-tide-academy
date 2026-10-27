import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {newFamily,startRun,questionById,taipeiDay,monsterById} from '../../build/game.mjs';
const connectionString='postgresql://127.0.0.1:55432/eight_refinement_batch13_test';
const api=await createCloudApi({connectionString,production:false});
const server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
const checks=[];
async function call(path,body,c){const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
try{
 for(const version of [1,2]) for(const success of [false,true]){
  const username='rareqa_'+randomUUID().replaceAll('-','').slice(0,15),password=randomUUID()+randomUUID();
  const login=await call('register',{username,password});assert.equal(login.status,200);const c={cookie:login.cookie,csrf:login.data.csrf};
  const f=newFamily(),p=f.profiles.quintus,day=taipeiDay();p.owned.astraltide=1;p.equipped='astraltide';p.growth.xp.astraltide=125;p.firstAcquired.astraltide=null;
  startRun(f,'quintus','math',randomUUID(),9,false,day);const r=p.run;assert.equal(r.encounter.combat.version,2);
  if(version===1){const oldStats=(rarity)=>{const rank=['E','D','C','B','A','S','SS','SSS'].indexOf(rarity),lv=r.encounter.level;return {level:lv,hp:100+rank*6+(lv-1)*8,attack:22+rank*2+(lv-1)*2,defense:8+rank+lv-1};};r.encounter.combat={version:1,ally:oldStats('SSS'),foe:oldStats(monsterById(r.encounter.variant).rarity)};}
  const frozen=structuredClone(r.encounter.combat),untouched=structuredClone([f.profiles.doudou,f.profiles.feifei,f.profiles.qingqing]);
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[username,f]);
  let s=(await call('state',undefined,c)).data;let submitted=0;
  while(s.family.profiles.quintus.run.status==='active'){
   const current=s.family.profiles.quintus.run,q=questionById(current.questions[current.index]);
   const request={id:randomUUID(),revision:s.family.revision,command:{type:'answer',player:'quintus',runId:current.id,index:current.index,choice:success?q.answer:(q.answer+1)%q.options.length}};
   const pair=await Promise.all([call('command',request,c),call('command',request,c)]);assert.deepEqual(pair.map(x=>x.status),[200,200]);assert.deepEqual(pair[0].data.family,pair[1].data.family);s=pair[0].data;submitted++;
   assert.deepEqual(s.family.profiles.quintus.run.encounter.combat,frozen);
   if(s.family.profiles.quintus.run.status==='active'){
    const n=await call('command',{id:randomUUID(),revision:s.family.revision,command:{type:'next',player:'quintus',runId:current.id,index:current.index}},c);assert.equal(n.status,200);s=n.data;
   }
  }
  const other=await call('login',{username,password});assert.equal(other.status,200);const restored=await call('state',undefined,{cookie:other.cookie,csrf:other.data.csrf});assert.equal(restored.status,200);assert.deepEqual(restored.data.family,s.family);
  const end=s.family.profiles.quintus;assert.equal(end.run.status,success?'won':'failed');assert.equal(submitted,success?6:3);assert.equal(end.growth.xp.astraltide,success?185:125);assert.deepEqual(end.run.encounter.combat,frozen);assert.deepEqual([s.family.profiles.doudou,s.family.profiles.feifei,s.family.profiles.qingqing],untouched);
  if(!success){assert.equal(end.run.reward,'none');assert.equal(end.run.capture,undefined);}
  checks.push({version,success,status:end.run.status,submitted,xpBefore:125,xpAfter:end.growth.xp.astraltide,duplicateReceiptIdentical:true,secondLoginRoundTrip:true,frozenStats:true,otherProfilesUntouched:true});
 }
 await writeFile(new URL('./rarity-http-result.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),environment:'isolated local test PostgreSQL; four synthetic families',checks},null,2)+'\n');console.log(JSON.stringify(checks,null,2));
}finally{await new Promise(r=>server.close(r));await api.close();}
