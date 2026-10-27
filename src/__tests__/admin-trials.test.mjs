import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionAdmin} from '../../server/admin.mjs';
import {PLAYERS,COURSES,startRun,questionById} from '../../build/game.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('super-admin trial account creation (isolated PostgreSQL)',()=>{
 let api,server,url,owner,staff,parent,ownerId,first;
 const suffix=randomUUID().slice(0,8),adminName='trial_owner_'+suffix,adminPassword='local-admin-trial-test-only';
 const client=r=>({cookie:r.cookie?.split(';')[0],csrf:r.data.csrf});
 async function call(path,body,c,headers={}){const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
 const input=(overrides={})=>({requestId:randomUUID(),username:'trial_'+randomUUID().slice(0,8),displayName:'Synthetic trial',password:'0047',grade:6,coins:5000,tickets:20,starTickets:5,ready:true,...overrides});
 const counts=async()=>{const r=await api.pool.query('SELECT (SELECT count(*) FROM accounts) accounts,(SELECT count(*) FROM player_logins) members,(SELECT count(*) FROM admin_trial_accounts) trials');return r.rows[0];};
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  await provisionAdmin(api.pool,{username:adminName,password:adminPassword});const login=await call('admin/login',{username:adminName,password:adminPassword});owner=client(login);ownerId=login.data.id;
  const child=await call('admin/users/create',{username:'trial_staff_'+suffix,displayName:'QA staff',password:adminPassword,enabled:true,canGrant:true,scope:'all',memberIds:[],grantLimit:100},owner);expect(child.status).toBe(200);
  let s=client(await call('admin/login',{username:'trial_staff_'+suffix,password:adminPassword}));expect((await call('admin/password',{currentPassword:adminPassword,newPassword:adminPassword+'x'},s)).status).toBe(200);staff=client(await call('admin/login',{username:'trial_staff_'+suffix,password:adminPassword+'x'}));
  parent=client(await call('register',{username:'trial_parent_'+suffix,password:adminPassword}));
 },30000);
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('rejects staff, player, missing authentication and forged CSRF without creating an account',async()=>{
  const before=await counts();for(const c of [undefined,staff,parent])expect((await call('admin/trials/create',input(),c)).status).toBe(c===staff?403:401);
  expect((await call('admin/trials/create',input(),owner,{'X-CSRF-Token':'wrong'})).status).toBe(403);expect(await counts()).toEqual(before);
  expect((await call('admin/trials',undefined,staff)).status).toBe(403);
 });
 it('atomically creates a ready grade-six identity and exposes correct grade questions after normal login',async()=>{
  first=input();const r=await call('admin/trials/create',first,owner);expect(r.status,r.data.error).toBe(200);expect(r.data.trial).toMatchObject({username:first.username,grade:6,ready:true,coins:5000,tickets:20,starTickets:5,replayed:false});
  const auth=await call('login',{username:first.username.toUpperCase(),password:first.password});expect(auth.status).toBe(200);const c=client(auth),p=auth.data.family.profiles.alston;
  expect(auth.data.displayName).toBe(first.displayName);expect(p.learning.school).toBe('jianan');expect(p).toMatchObject({coins:5000,tickets:20,starTickets:5,onboarding:{confirmed:true}});expect(p.growth.xp[p.equipped]).toBe(350);expect(p.run.index).toBe(0);expect(p.run.encounter.variant).toMatch(/^wave4-/);expect(p.run.answers).toEqual([]);expect(Object.values(auth.data.verified).every(n=>n===0)).toBe(true);
  const ready=await call('command',{id:randomUUID(),revision:auth.data.family.revision,command:{type:'ready-question',player:'alston',runId:p.run.id,index:0}},c);expect(ready.status,ready.data.error).toBe(200);expect(ready.data.questions.alston).toMatchObject({grade:6,course:'math'});expect(ready.data.questions.alston.answer).toBeUndefined();expect(ready.data.family.profiles.alston.run.questions.slice(1)).toEqual(['','','','','']);
  const forbidden=await call('command',{id:randomUUID(),revision:ready.data.family.revision,command:{type:'starter-draw',player:'jay'}},c);expect(forbidden.status).toBe(403);
 });
 it('replays a request safely and rejects changed credentials without altering progress or balances',async()=>{
  const before=await counts();const row=(await api.pool.query('SELECT g.* FROM game_states g JOIN player_logins m ON m.account_id=g.account_id WHERE m.username=$1',[first.username])).rows[0];
  const r=await call('admin/trials/create',first,owner);expect(r.status).toBe(200);expect(r.data.trial.replayed).toBe(true);
  expect((await call('admin/trials/create',{...first,password:'0048'},owner)).status).toBe(409);expect(await counts()).toEqual(before);
  expect((await api.pool.query('SELECT * FROM game_states WHERE account_id=$1',[row.account_id])).rows[0]).toEqual(row);
  const status=await call('admin/trials/status',{requestId:first.requestId},owner);expect(status.data).toMatchObject({status:'created',trial:{username:first.username}});expect(JSON.stringify(status.data)).not.toContain(JSON.stringify(first.password));
 });
 it('concurrent retries create exactly one isolated account',async()=>{
  const b=input({ready:false});const result=await Promise.all([call('admin/trials/create',b,owner),call('admin/trials/create',b,owner)]);expect(result.map(r=>r.status)).toEqual([200,200]);expect(result.filter(r=>r.data.trial.replayed)).toHaveLength(1);expect((await api.pool.query('SELECT * FROM player_logins WHERE username=$1',[b.username])).rowCount).toBe(1);
 });
 it('provides working five-subject curricula for every supported grade, preserving fresh onboarding when requested',async()=>{
  for(const grade of [1,2,4,5,6])for(const ready of [false,true]){const b=input({grade,ready,coins:0,tickets:0,starTickets:0});const r=await call('admin/trials/create',b,owner);expect(r.status,r.data.error).toBe(200);
   const a=await call('login',{username:b.username,password:b.password});expect(a.status).toBe(200);const player=PLAYERS.find(p=>p.grade===grade).id,p=a.data.family.profiles[player];if(ready){expect(p.onboarding.confirmed).toBe(true);expect(p.run.encounter.variant).toMatch(/^wave4-/);expect(p.run.answers).toEqual([]);}else{expect(p.onboarding).toEqual({pet:null,confirmed:false});expect(p.run).toBeNull();}
   for(const course of COURSES[grade]){const clone=structuredClone(a.data.family);clone.profiles[player].run=null;startRun(clone,player,course.id,randomUUID(),0,false,a.data.day,'relaxed');expect(clone.profiles[player].run.questions.every(id=>questionById(id).grade===grade&&questionById(id).course===course.id)).toBe(true);}
  }
 },20000);
 it('preserves both player and household usernames on collisions',async()=>{
  const before=await counts();expect((await call('admin/trials/create',input({username:first.username.toUpperCase()}),owner)).status).toBe(409);expect((await call('admin/trials/create',input({username:'trial_parent_'+suffix}),owner)).status).toBe(409);expect(await counts()).toEqual(before);
 });
 it('rejects unsupported grades, malformed passwords, extra identity fields and unbounded resources',async()=>{
  const before=await counts();for(const patch of [{grade:3},{password:'12345'},{coins:-1},{coins:100001},{tickets:101},{starTickets:101},{ready:'yes'},{trial_curriculum:'g6-jianan'}])expect((await call('admin/trials/create',input(patch),owner)).status).toBe(400);expect(await counts()).toEqual(before);
 });
 it('rolls back identity, balances, metadata and audit together, then allows retry with the same request ID',async()=>{
  const before=await counts(),b=input({ready:false});await api.pool.query("CREATE FUNCTION fail_trial_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='trial_account_created' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END $$;CREATE TRIGGER fail_trial_audit BEFORE INSERT ON admin_access_audit FOR EACH ROW EXECUTE FUNCTION fail_trial_audit()");
  try{expect((await call('admin/trials/create',b,owner)).status).toBe(503);expect(await counts()).toEqual(before);}finally{await api.pool.query('DROP TRIGGER fail_trial_audit ON admin_access_audit;DROP FUNCTION fail_trial_audit()');}
  expect((await call('admin/trials/create',b,owner)).status).toBe(200);
 });
 it('rechecks the currently locked owner role during creation',async()=>{
  const original=api.pool.query.bind(api.pool);let intercepted=false;
  api.pool.query=async(...args)=>{const r=await original(...args);if(!intercepted&&String(args[0]).includes('SELECT a.*,s.csrf')){intercepted=true;await original("UPDATE admin_users SET role='staff' WHERE id=$1",[ownerId]);}return r;};
  try{const before=await counts();expect((await call('admin/trials/create',input(),owner)).status).toBe(403);expect(await counts()).toEqual(before);}finally{api.pool.query=original;await original("UPDATE admin_users SET role='super_admin' WHERE id=$1",[ownerId]);}
 });
 it('lists usable balances and creator history without credentials or children\'s question answers',async()=>{
  const r=await call('admin/trials',undefined,owner);expect(r.status).toBe(200);expect(r.data.grades.map(g=>g.grade)).toEqual([1,2,4,5,6]);expect(r.data.trials.find(t=>t.username===first.username)).toMatchObject({coins:5000,tickets:20,starTickets:5,grade:6});
  const audit=await call('admin/audit',undefined,owner);expect(audit.data.events.some(e=>e.action==='trial_account_created')).toBe(true);
  for(const data of [r.data,audit.data]){expect(JSON.stringify(data)).not.toMatch(/"password"|password_hash|token_hash|csrf|questionIds|"answer"/);expect(JSON.stringify(data)).not.toContain(JSON.stringify(first.password));}
 });
});
