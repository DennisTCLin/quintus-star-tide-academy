import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createAppServer } from '../../server.mjs';
import { createCloudApi } from '../../server/cloud.mjs';
import { newFamily, MONSTER_CATALOG } from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('server-authoritative elemental voyages (PostgreSQL)',()=>{
 let api,server,url;
 const password='isolated-island-tests-2026';
 async function call(path,body,c){
  const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 async function client(){
  const username='island_'+randomUUID().replaceAll('-','').slice(0,16),r=await call('register',{username,password});expect(r.status).toBe(200);
  const c={username,cookie:r.cookie,csrf:r.data.csrf,state:r.data};
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[username,newFamily()]);
  c.state=(await call('state',undefined,c)).data;return c;
 }
 function command(c,body){return {id:randomUUID(),revision:c.state.family.revision,command:{player:'quintus',...body}};}
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await api.pool.query('DELETE FROM request_limits');server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;},30000);
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('persists one same-element encounter across racing start replay and another device',async()=>{
  const c=await client(),body=command(c,{type:'start',course:'science',practice:false});
  const pair=await Promise.all([call('command',body,c),call('command',body,c)]);expect(pair.map(r=>r.status)).toEqual([200,200]);
  const r=pair[0].data.family.profiles.quintus.run;
  expect(r.encounter.route).toEqual({version:1,island:'fire',element:'火'});expect(MONSTER_CATALOG.find(m=>m.id===r.encounter.variant).element).toBe('火');
  expect(pair[1].data.family.profiles.quintus.run).toEqual(r);expect(r.challenge.version).toBe(1);expect(r.encounter.combat.version).toBe(2);
  const login=await call('login',{username:c.username,password});expect(login.status).toBe(200);
  const other={cookie:login.cookie,csrf:login.data.csrf};expect((await call('state',undefined,other)).data.family.profiles.quintus.run).toEqual(r);
  c.state=pair[0].data;expect((await call('command',command(c,{type:'start',course:'math',practice:false}),c)).status).toBe(400);
  expect((await call('state',undefined,c)).data.family.profiles.quintus.run).toEqual(r);
 });
 it('rejects forged elements, routes and species without changing the saved state',async()=>{
  const c=await client();
  for(const extra of [{element:'水'},{route:{version:1,island:'water',element:'水'}},{variant:'cloud-warden-water'},{grade:1}]) {
   const denied=await call('command',command(c,{type:'start',course:'math',practice:false,...extra}),c);expect(denied.status).toBe(400);
  }
  const saved=(await call('state',undefined,c)).data.family;expect(saved.profiles.quintus.run).toBeNull();expect(saved.revision).toBe(c.state.family.revision);
  const valid=await call('command',command(c,{type:'start',player:'feifei',course:'words',practice:false}),c);expect(valid.status).toBe(200);
  expect(valid.data.family.profiles.feifei.run.encounter.route).toEqual({version:1,island:'water',element:'水'});
 });
});
