import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { exerciseById,lessonById,taipeiDay } from '../../build/adult.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('adult accounts and cloud learning (real PostgreSQL)',()=>{
 let api,server,url,a,b,other,child,baseline,recoveryCode;
 const username='adultqa_'+randomUUID().slice(0,8),password='Synthetic-adult-only-2026',otherName=username+'_b';
 async function call(path,body,session,headers={}){
  const response=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(session?{Cookie:session.cookie,'X-CSRF-Token':session.data.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],setCookie:response.headers.get('set-cookie')};
 }
 const envelope=(session,command)=>({username:session.data.username,id:randomUUID(),revision:session.data.state.revision,command});
 async function command(session,c){const response=await call('adult/command',envelope(session,c),session);if(response.status===200)session.data=response.data;return response;}
 const pointer=session=>({sessionId:session.data.state.session.id,index:session.data.state.session.index});
 async function childSnapshot(){return (await api.pool.query(`SELECT a.id,to_jsonb(a) AS account,to_jsonb(g) AS state,
 (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM player_logins m WHERE m.account_id=a.id) AS members,
 (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.token_hash) FROM sessions s WHERE s.account_id=a.id) AS sessions
 FROM accounts a LEFT JOIN game_states g ON g.account_id=a.id ORDER BY a.id`)).rows;}
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,npcRaidsEnabled:false});
  server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  await api.pool.query('DELETE FROM request_limits');
  child=await call('register',{username:username+'_child',password:'Synthetic-child-only-long'});expect(child.status).toBe(200);
  baseline=await childSnapshot();
 },30000);
 afterAll(async()=>{if(server)await new Promise(r=>server.close(r));if(api)await api.close();});
 it('creates isolated adult identity, strong password, private cookie and one-time recovery code',async()=>{
  expect((await call('adult/register',{username,password:'0109'})).status).toBe(400);
  a=await call('adult/register',{username:username.toUpperCase(),password});expect(a.status).toBe(200);recoveryCode=a.data.recoveryCode;
  expect(recoveryCode).toMatch(/^[a-f0-9]{64}$/);expect(a.setCookie).toContain('HttpOnly');expect(a.setCookie).toContain('SameSite=Strict');expect(a.cookie).toMatch(/^star-tide-adult=/);
  expect(a.data.username).toBe(username);expect(a.data.state.xp).toBe(0);
  expect((await call('adult/register',{username,password})).status).toBe(409);
  b=await call('adult/login',{username,password});expect(b.status).toBe(200);expect(b.cookie).not.toBe(a.cookie);expect(b.data.recoveryCode).toBeUndefined();
  other=await call('adult/register',{username:otherName,password});expect(other.status).toBe(200);
 },30000);
 it('denies cross-family authentication and never changes child account, progress, rewards or sessions',async()=>{
  expect((await call('state',undefined,a)).status).toBe(401);
  expect((await call('command',{id:randomUUID(),revision:0,command:{type:'onboard'}},a)).status).toBe(401);
  expect((await call('adult/state',undefined,child)).status).toBe(401);
  expect((await call('admin/me',undefined,a)).status).toBe(401);
  expect(await childSnapshot()).toEqual(baseline);
 });
 it('uses Origin and adult CSRF validation, denies forged state/date/ownership and invalid actions',async()=>{
  const c={type:'profile',name:'Synthetic adult',track:'everyday',dailyGoal:6};
  expect((await call('adult/command',envelope(a,c),a,{Origin:'https://other.invalid'})).status).toBe(403);
  expect((await call('adult/command',envelope(a,c),a,{'X-CSRF-Token':'wrong'})).status).toBe(403);
  for(const extra of [{xp:999},{day:'2000-01-01'},{userId:other.data.username}])expect((await call('adult/command',{...envelope(a,c),...extra},a)).status).toBe(400);
  expect((await call('adult/command',envelope(a,c),other)).status).toBe(409);
  expect((await call('adult/state',undefined,other)).data.state.profile).toBeNull();
  expect((await command(a,c)).status).toBe(200);
  expect((await command(a,{type:'lesson-start',lessonId:'nonexistent'})).status).toBe(400);
  expect((await command(a,{type:'review-start',mode:'all'})).status).toBe(400);
  expect(a.data.day).toBe(taipeiDay());
 });
 it('resumes the same active foundation and submitted feedback on another independent login',async()=>{
  expect((await command(a,{type:'lesson-start',lessonId:'hello'})).status).toBe(200);
  expect((await command(a,{type:'next',...pointer(a)})).status).toBe(400);
  expect((await command(a,{type:'lesson-start',lessonId:'be-verbs'})).status).toBe(400);
  let read=await call('adult/state',undefined,b);b.data=read.data;expect(read.data.state).toEqual(a.data.state);
  expect((await command(b,{type:'answer',...pointer(b),answer:lessonById('hello').questions[0].answer})).status).toBe(200);
  expect(b.data.state.xp).toBe(10);read=await call('adult/state',undefined,a);a.data=read.data;expect(a.data.state.session.results).toHaveLength(1);
  expect((await call('adult/state',undefined,other)).data.state.xp).toBe(0);
 });
 it('returns the latest state when a committed command is replayed after a lost response, without duplicate XP',async()=>{
  expect((await command(a,{type:'next',...pointer(a)})).status).toBe(200);
  const op=envelope(a,{type:'answer',...pointer(a),answer:lessonById('hello').questions[1].answer});
  const first=await call('adult/command',op,a);expect(first.status).toBe(200);a.data=first.data;
  expect((await command(a,{type:'next',...pointer(a)})).status).toBe(200);
  const replay=await call('adult/command',op,b);expect(replay.status).toBe(200);expect(replay.data.replayed).toBe(true);expect(replay.data.state).toEqual(a.data.state);expect(replay.data.state.xp).toBe(20);
  expect((await call('adult/command',{...op,command:{...op.command,answer:'changed'}},a)).status).toBe(409);
 });
 it('serializes competing fresh commands from two devices and rejects stale revision',async()=>{
  const one=envelope(a,{type:'answer',...pointer(a),answer:lessonById('hello').questions[2].answer});
  const two={...one,id:randomUUID(),command:{...one.command,answer:'wrong'}};
  const responses=await Promise.all([call('adult/command',one,a),call('adult/command',two,b)]);
  expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
  a.data=(await call('adult/state',undefined,a)).data;
  expect(a.data.state.session.results).toHaveLength(3);expect(a.data.state.xp).toBeGreaterThanOrEqual(20);expect(a.data.state.xp).toBeLessThanOrEqual(30);
  expect((await call('adult/command',{...one,id:randomUUID()},b)).status).toBe(409);
 });
 it('persists listening assistance before grading, even across reload/device changes',async()=>{
  expect((await command(a,{type:'end',sessionId:a.data.state.session.id})).status).toBe(200);
  expect((await command(a,{type:'lesson-start',lessonId:'be-verbs'})).status).toBe(200);
  expect((await command(a,{type:'hint',...pointer(a)})).status).toBe(400);
  expect((await command(a,{type:'answer',...pointer(a),answer:'am'})).status).toBe(200);
  expect((await command(a,{type:'next',...pointer(a)})).status).toBe(200);
  const xp=a.data.state.xp;
  expect((await command(a,{type:'hint',...pointer(a)})).status).toBe(200);
  b.data=(await call('adult/state',undefined,b)).data;
  expect((await command(b,{type:'answer',...pointer(b),answer:'不客氣。',assisted:false})).status).toBe(400);
  expect((await command(b,{type:'answer',...pointer(b),answer:'不客氣。'})).status).toBe(200);
  expect(b.data.state.session.results[1].assisted).toBe(true);expect(b.data.state.xp).toBe(xp);a.data=(await call('adult/state',undefined,a)).data;
 });
 it('grades authored guided dialogue, completes a lesson, and preserves existing entries',async()=>{
  const entries={...a.data.state.entries};
  expect((await command(a,{type:'end',sessionId:a.data.state.session.id})).status).toBe(200);
  expect((await command(a,{type:'lesson-start',lessonId:'dialogue-cafe'})).status).toBe(200);
  for(let i=0;i<6;i++){
   const q=exerciseById(a.data.state.session.ids[i]);expect(q.kind).toBe('respond');
   expect((await command(a,{type:'answer',...pointer(a),answer:q.accepted[0]??q.answer})).status).toBe(200);
   expect(a.data.state.session.results[i].correct).toBe(true);
   expect((await command(a,{type:'next',...pointer(a)})).status).toBe(200);
  }
  expect(a.data.state.session.complete).toBe(true);expect(a.data.state.practiced).toContain('dialogue-cafe');
  for(const [id,e]of Object.entries(entries))expect(a.data.state.entries[id]).toEqual(e);
  expect((await call('adult/state',undefined,b)).data.state).toEqual(a.data.state);
 });
 it('same-day repeats cannot farm XP or daily counts',async()=>{
  const xp=a.data.state.xp,daily=a.data.state.daily[a.data.day].length;
  expect((await command(a,{type:'lesson-start',lessonId:'dialogue-cafe'})).status).toBe(200);
  const q=exerciseById(a.data.state.session.ids[0]);
  expect((await command(a,{type:'answer',...pointer(a),answer:q.answer})).status).toBe(200);
  expect(a.data.state.xp).toBe(xp);expect(a.data.state.daily[a.data.day]).toHaveLength(daily);
 });
 it('lets a signed-in adult replace a lost recovery code after password confirmation without touching learning',async()=>{
  const before=a.data.state;
  expect((await call('adult/recovery-code',{password:'wrong-password-2026'},a)).status).toBe(401);
  const rotated=await call('adult/recovery-code',{password},a);expect(rotated.status).toBe(200);expect(rotated.data.state).toEqual(before);expect(rotated.data.recoveryCode).not.toBe(recoveryCode);
  expect((await call('adult/recover',{username,password,recoveryCode})).status).toBe(401);recoveryCode=rotated.data.recoveryCode;
 });
 it('recovery rotates only adult credentials/sessions without clearing learning or child data',async()=>{
  const before=a.data.state;
  expect((await call('adult/recover',{username,password:password+'new',recoveryCode:'0'.repeat(64)})).status).toBe(401);
  const recovered=await call('adult/recover',{username,password:password+'new',recoveryCode});expect(recovered.status).toBe(200);expect(recovered.data.state).toEqual(before);expect(recovered.data.recoveryCode).not.toBe(recoveryCode);
  expect((await call('adult/state',undefined,a)).status).toBe(401);expect((await call('adult/state',undefined,b)).status).toBe(401);
  expect((await call('adult/state',undefined,other)).status).toBe(200);
  expect((await call('adult/recover',{username,password,recoveryCode})).status).toBe(401);
  expect((await call('adult/login',{username,password})).status).toBe(401);
  expect((await call('adult/login',{username,password:password+'new'})).status).toBe(200);
  a=recovered;expect(await childSnapshot()).toEqual(baseline);
 },30000);
 it('persists adult progress and sessions through API shutdown and restart without child writes',async()=>{
  const before=(await call('adult/state',undefined,a)).data.state;
  await new Promise(r=>server.close(r));await api.close();
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,npcRaidsEnabled:false});
  server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  const read=await call('adult/state',undefined,a);expect(read.status).toBe(200);expect(read.data.state).toEqual(before);expect(await childSnapshot()).toEqual(baseline);
 });
 it('logout expires the current adult session and leaves another account and children intact',async()=>{
  expect((await call('adult/logout',{},a)).status).toBe(200);
  expect((await call('adult/state',undefined,a)).status).toBe(401);
  expect((await call('adult/state',undefined,other)).status).toBe(200);
  expect(await childSnapshot()).toEqual(baseline);
 });
});
