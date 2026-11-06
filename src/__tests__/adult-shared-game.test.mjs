import{beforeAll,afterAll,describe,it,expect}from'vitest';
import{randomUUID}from'node:crypto';
import{createCloudApi}from'../../server/cloud.mjs';
import{createAppServer}from'../../server.mjs';
import{provisionChildAccount}from'../../server/child-account.mjs';
import{readAdminStudents}from'../../server/admin.mjs';
import{readAdminParentReport}from'../../server/admin-reports.mjs';
import{exerciseById,lessonById}from'../../build/adult.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('adult and child shared star-tide game',()=>{
 let api,server,url,adult,second,child,childIdentity,adultId,beforeChildren;
 const username='crewqa_'+randomUUID().slice(0,8),password='Synthetic-adult-crew-2026';
 async function call(path,body,c,headers={}){const r=await fetch(url+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:url,...(body===undefined?{}:{'Content-Type':'application/json'}),...(c?{Cookie:c.cookie,'X-CSRF-Token':c.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();return{status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],csrf:data.csrf};}
 async function adultCommand(c,command,envelope){const r=await call('adult/command',envelope??{username,id:randomUUID(),revision:c.learning.revision,command},c);if(r.status===200)c.learning=r.data.state;return r;}
 async function gameRead(c=adult){const r=await call(c===child?'state':'adult/game/state',undefined,c);if(r.status===200)c.game=r.data;return r;}
 async function gameCommand(c,command){const r=await call(c===child?'command':'adult/game/command',{id:randomUUID(),revision:c.game.family.revision,command:{player:'quintus',...command}},c);if(r.status===200)c.game=r.data;return r;}
 const ptr=c=>({sessionId:c.learning.session.id,index:c.learning.session.index});
 async function newAdult(label){
  const username='crewqa_'+randomUUID().slice(0,8),c=await call('adult/register',{username,password});expect(c.status).toBe(200);c.learning=c.data.state;c.username=username;
  const cmd=async command=>{const r=await call('adult/command',{username,id:randomUUID(),revision:c.learning.revision,command},c);expect(r.status,JSON.stringify(r.data)).toBe(200);c.learning=r.data.state;return r;};c.cmd=cmd;
  await cmd({type:'profile',name:label,track:'everyday',dailyGoal:6});const entered=await call('adult/game/enter',{},c);expect(entered.status).toBe(200);c.game=entered.data;return c;
 }
 async function finishLesson(id,wrong=0){
  if(adult.learning.session)expect((await adultCommand(adult,{type:'end',sessionId:adult.learning.session.id})).status).toBe(200);
  expect((await adultCommand(adult,{type:'lesson-start',lessonId:id})).status).toBe(200);
  for(let i=0;i<6;i++){
   const answer=i<wrong?'deliberately wrong':exerciseById(adult.learning.session.ids[i]).answer;
   expect((await adultCommand(adult,{type:'answer',...ptr(adult),answer})).status).toBe(200);
   if(i===2&&wrong>=3)break;
   expect((await adultCommand(adult,{type:'next',...ptr(adult)})).status).toBe(200);
  }
  await gameRead();return structuredClone(adult.game.family.profiles.quintus);
 }
 async function children(){return(await api.pool.query(`SELECT a.id,to_jsonb(a) AS account,to_jsonb(g) AS state,(SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM player_logins m WHERE m.account_id=a.id) AS members FROM accounts a JOIN game_states g ON g.account_id=a.id WHERE NOT EXISTS(SELECT 1 FROM adult_game_enrollments e WHERE e.account_id=a.id) ORDER BY a.id`)).rows;}
 beforeAll(async()=>{
  api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,npcRaidsEnabled:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;await api.pool.query('DELETE FROM request_limits');
  childIdentity=await provisionChildAccount(api.pool,{username,password:'0042',displayName:'Synthetic child',grade:4});child=await call('login',{username,password:'0042'});expect(child.status).toBe(200);child.game=child.data;
  expect((await gameCommand(child,{type:'starter-draw'})).status).toBe(200);expect((await gameCommand(child,{type:'starter-confirm'})).status).toBe(200);beforeChildren=await children();
  adult=await call('adult/register',{username,password});expect(adult.status).toBe(200);adult.learning=adult.data.state;adult.recoveryCode=adult.data.recoveryCode;
  adultId=(await api.pool.query('SELECT id FROM adult_english_users WHERE username=$1',[username])).rows[0].id;
  expect((await adultCommand(adult,{type:'profile',name:'Synthetic adult',track:'everyday',dailyGoal:6})).status).toBe(200);
  expect((await adultCommand(adult,{type:'lesson-start',lessonId:'hello'})).status).toBe(200);
  expect((await adultCommand(adult,{type:'answer',...ptr(adult),answer:lessonById('hello').questions[0].answer})).status).toBe(200);
 },30000);
 afterAll(async()=>{if(server)await new Promise(r=>server.close(r));await api?.close();});
 it('enrolls the existing adult UUID once, keeps English state and does not adopt the same-name child',async()=>{
  const saved=adult.learning,rows=await Promise.all([call('adult/game/enter',{},adult),call('adult/game/enter',{},adult)]);for(const r of rows)expect(r.status,JSON.stringify(r.data)).toBe(200);adult.game=rows[0].data;
  const link=(await api.pool.query('SELECT * FROM adult_game_enrollments WHERE user_id=$1',[adultId])).rows[0];expect(link.account_id).toBe(adultId);expect(link.member_id).toBe(adultId);expect(link.account_id).not.toBe(childIdentity.accountId);expect(link.member_id).not.toBe(childIdentity.memberId);
  expect((await api.pool.query('SELECT count(*) FROM adult_game_enrollments WHERE user_id=$1',[adultId])).rows[0].count).toBe('1');
  expect((await call('adult/state',undefined,adult)).data.state).toEqual(saved);expect(adult.game.learner).toEqual({kind:'adult',programme:'adult-english',grade:null,socialApproved:false});expect(adult.game.displayName).toBe('Synthetic adult');expect(adult.game.family.profiles.quintus.learning.school).toBeUndefined();
  const p=adult.game.family.profiles.quintus;expect(p.coins).toBe(10);expect(p.milestones.masteryPoints).toBe(20);expect(p.growth.xp).toEqual({});expect(await children()).toEqual(beforeChildren);
 });
 it('selects identities from the API namespace with both cookies, and denies forged scope/migration/school questions',async()=>{
  const both={...adult,cookie:adult.cookie+'; '+child.cookie};expect((await call('state',undefined,both)).data.displayName).toBe('Synthetic child');expect((await call('adult/game/state',undefined,both)).data.displayName).toBe('Synthetic adult');
  expect((await call('state',undefined,adult)).status).toBe(401);expect((await call('adult/game/state',undefined,child)).status).toBe(401);
  const rebound={...adult,cookie:adult.cookie.replace(/^star-tide-adult=/,'star-tide-session=')};expect((await call('state',undefined,rebound)).status).toBe(401);expect((await call('conquest?player=quintus',undefined,rebound)).status).toBe(401);expect((await call('command',{id:randomUUID(),revision:adult.game.family.revision,command:{type:'start',player:'quintus',course:'math'}},rebound)).status).toBe(401);
  expect((await call('adult/game/admin/students',undefined,adult)).status).toBe(404);
  expect((await gameCommand(adult,{type:'start',course:'math'})).status).toBe(403);
  expect((await gameCommand(adult,{type:'equip',player:'feifei',pet:adult.game.family.profiles.quintus.equipped})).status).toBe(403);
  expect((await call('adult/game/migrate',{id:randomUUID(),revision:adult.game.family.revision,snapshot:{}},adult)).status).toBe(403);
  expect((await call('adult/game/enter',{},adult,{'X-CSRF-Token':'wrong'})).status).toBe(403);
  expect(await children()).toEqual(beforeChildren);
 });
 it('uses the same starter draw and keeps the adult out of school/admin student reports',async()=>{
  expect((await gameCommand(adult,{type:'starter-draw'})).status).toBe(200);expect((await gameCommand(adult,{type:'starter-confirm'})).status).toBe(200);
  const p=adult.game.family.profiles.quintus;expect(p.onboarding.confirmed).toBe(true);expect(Object.keys(p.owned)).toHaveLength(1);expect(p.coins).toBe(10);
  expect((await readAdminStudents(api.pool)).some(s=>s.memberId===adultId)).toBe(false);expect((await readAdminStudents(api.pool)).some(s=>s.memberId===childIdentity.memberId)).toBe(true);
  await expect(readAdminParentReport(api.pool,adultId)).rejects.toMatchObject({status:404});expect(await children()).toEqual(beforeChildren);
 });
 it('credits English answers to the game atomically, binds companion and never replays rewards',async()=>{
  expect((await adultCommand(adult,{type:'next',...ptr(adult)})).status).toBe(200);
  expect((await adultCommand(adult,{type:'hint',...ptr(adult)})).status).toBe(200);
  expect((await adultCommand(adult,{type:'answer',...ptr(adult),answer:exerciseById(adult.learning.session.ids[1]).answer})).status).toBe(200);await gameRead();expect(adult.game.family.profiles.quintus.coins).toBe(10);
  expect((await adultCommand(adult,{type:'next',...ptr(adult)})).status).toBe(200);
  const command={type:'answer',...ptr(adult),answer:exerciseById(adult.learning.session.ids[2]).answer},op={username,id:randomUUID(),revision:adult.learning.revision,command};
  expect((await adultCommand(adult,command,op)).status).toBe(200);await gameRead();const p=adult.game.family.profiles.quintus;expect(p.coins).toBe(20);expect(p.milestones.masteryPoints).toBe(40);expect(p.growth.xp[p.adultAdventure.companion]).toBe(10);
  const saved=adult.game.family;expect((await adultCommand(adult,command,op)).data.replayed).toBe(true);await gameRead();expect(adult.game.family).toEqual(saved);expect(await children()).toEqual(beforeChildren);
 });
 it('blocks unpaired adult roster enumeration, battle invitations and shared-world access',async()=>{
  const friends=await call('adult/game/friends',undefined,adult);expect(friends.data.friends.every(f=>f.sameAccount)).toBe(true);expect(JSON.stringify(friends.data)).not.toContain('Synthetic child');
  expect((await call('adult/game/conquest?player=quintus',undefined,adult)).status).toBe(403);
  expect((await call('adult/game/online-battle',{player:'quintus',action:'invite',commandId:randomUUID(),friend:childIdentity.memberId,pet:adult.game.family.profiles.quintus.equipped},adult)).status).toBe(403);
 });
 it('can successfully complete a one-question review without a lesson completion star',async()=>{
  expect((await adultCommand(adult,{type:'end',sessionId:adult.learning.session.id})).status).toBe(200);expect((await adultCommand(adult,{type:'review-start',mode:'mistakes'})).status).toBe(200);expect(adult.learning.session.ids).toHaveLength(1);
  expect((await adultCommand(adult,{type:'answer',...ptr(adult),answer:exerciseById(adult.learning.session.ids[0]).answer})).status).toBe(200);expect((await adultCommand(adult,{type:'next',...ptr(adult)})).status).toBe(200);await gameRead();expect(adult.game.family.profiles.quintus.adultAdventure.outcome).toBe('won');expect(adult.game.family.profiles.quintus.rewardStars).toBe(0);expect(adult.game.family.profiles.quintus.adultAdventure.rewarded).toBe(false);expect(await children()).toEqual(beforeChildren);
 });
 it('keeps two open adult registrations unapproved even after mutual pairing',async()=>{
  const a=await newAdult('Unpaired adult one'),b=await newAdult('Unpaired adult two');
  const code=(await call('adult/game/crew',{player:'quintus',action:'create'},a)).data.code;
  const pending=await call('adult/game/crew',{player:'quintus',action:'request',code},b);expect(pending.status).toBe(200);
  const accepted=await call('adult/game/crew',{player:'quintus',action:'accept',requestId:pending.data.requests[0].id},a);expect(accepted.status).toBe(200);
  for(const c of[a,b]){expect((await call('adult/game/state',undefined,c)).data.learner.socialApproved).toBe(false);expect((await call('adult/game/conquest?player=quintus',undefined,c)).status).toBe(403);}
  const stranger=await newAdult('Unrelated adult');expect((await call('adult/game/crew?player=quintus',undefined,stranger)).data.requests).toEqual([]);
  expect((await call('adult/game/crew',{player:'quintus',action:'request',code},stranger)).status).toBe(404);expect(await children()).toEqual(beforeChildren);
 });
 it('awards completion stars and a ticket through real lessons, without same-day farming',async()=>{
  const first=await finishLesson('be-verbs');expect(first.rewardStars).toBe(1);expect(first.tickets).toBe(0);expect(first.adultAdventure.rewarded).toBe(true);
  const replay=await finishLesson('be-verbs');expect(replay.rewardStars).toBe(first.rewardStars);expect(replay.tickets).toBe(first.tickets);expect(replay.coins).toBe(first.coins);expect(replay.milestones).toEqual(first.milestones);expect(replay.growth).toEqual(first.growth);expect(replay.adultAdventure.rewarded).toBe(false);
  const second=await finishLesson('everyday-things');expect(second.rewardStars).toBe(0);expect(second.tickets).toBe(1);expect(second.milestones.completedVoyages).toBe(2);
  expect((await gameCommand(adult,{type:'draw'})).status).toBe(200);expect(adult.game.family.profiles.quintus.tickets).toBe(0);expect(Object.values(adult.game.family.profiles.quintus.owned).reduce((n,v)=>n+v,0)).toBe(2);expect(await children()).toEqual(beforeChildren);
 });
 it('ends after three mistakes, preserves earned balances and allows a fresh course',async()=>{
  const before=structuredClone(adult.game.family.profiles.quintus),failed=await finishLesson('numbers-time',3);
  expect(failed.adultAdventure.outcome).toBe('failed');expect(failed.coins).toBe(before.coins);expect(failed.growth).toEqual(before.growth);expect(failed.tickets).toBe(before.tickets);expect(failed.rewardStars).toBe(before.rewardStars);
  expect((await adultCommand(adult,{type:'next',...ptr(adult)})).status).toBe(400);expect((await adultCommand(adult,{type:'end',sessionId:adult.learning.session.id})).status).toBe(200);
  expect((await adultCommand(adult,{type:'lesson-start',lessonId:'likes-needs'})).status).toBe(200);expect(await children()).toEqual(beforeChildren);
 });
 it('requires the invite owner confirmation before linking an adult and a child',async()=>{
  const code=(await call('crew',{player:'quintus',action:'create'},child)).data.code;expect(code).toMatch(/^[A-F0-9]{16}$/);
  const pending=await call('adult/game/crew',{player:'quintus',action:'request',code},adult);expect(pending.status).toBe(200);const id=pending.data.requests[0].id;
  expect((await call('adult/game/crew',{player:'quintus',action:'accept',requestId:id},adult)).status).toBe(404);
  expect((await call('adult/game/friends',undefined,adult)).data.friends).toHaveLength(1);
  expect((await call('crew',{player:'quintus',action:'accept',requestId:id},child)).status).toBe(200);
  expect((await call('crew',{player:'quintus',action:'accept',requestId:id},child)).status).toBe(200);
  const friends=(await call('adult/game/friends',undefined,adult)).data.friends;expect(friends.find(f=>f.key===childIdentity.memberId).name).toBe('Synthetic child');expect(friends.find(f=>f.key===childIdentity.memberId).sameAccount).toBe(false);
  await gameRead();expect(adult.game.learner.socialApproved).toBe(true);expect(await children()).toEqual(beforeChildren);
 });
 it('shows adult-child presence and supports an actual accepted PvP turn with same storage slot',async()=>{
  const beat=(c,path)=>call(path,{player:'quintus',clientId:randomUUID(),sequence:1,active:true,activity:'home'},c);expect((await beat(child,'presence')).status).toBe(200);expect((await beat(adult,'adult/game/presence')).status).toBe(200);
  const friends=(await call('friends',undefined,child)).data.friends;expect(friends.find(f=>f.key===adultId).onlineUntil).toBeGreaterThan(Date.now());expect(friends.find(f=>f.key===adultId).avatarKey).toBe('unknown');
  const invite=await call('adult/game/online-battle',{player:'quintus',action:'invite',commandId:randomUUID(),friend:childIdentity.memberId,pet:adult.game.family.profiles.quintus.equipped},adult);expect(invite.status).toBe(200);const room=invite.data.room;
  const accept=await call('online-battle',{player:'quintus',action:'accept',commandId:randomUUID(),room:room.id,revision:room.revision,pet:child.game.family.profiles.quintus.equipped},child);expect(accept.status).toBe(200);expect(accept.data.room.names).toEqual(['Synthetic adult','Synthetic child']);
  const first=accept.data.room.battle.turn===0?adult:child,waiting=first===adult?child:adult;
  expect((await call(waiting===adult?'adult/game/online-battle':'online-battle',{player:'quintus',action:'move',commandId:randomUUID(),room:room.id,revision:accept.data.room.revision,move:'attack'},waiting)).status).toBe(409);
  const move=await call(first===adult?'adult/game/online-battle':'online-battle',{player:'quintus',action:'move',commandId:randomUUID(),room:room.id,revision:accept.data.room.revision,move:'attack'},first);expect(move.status,JSON.stringify(move.data)).toBe(200);expect(move.data.room.battle.turn).not.toBe(accept.data.room.battle.turn);expect(await children()).toEqual(beforeChildren);
  let current=move.data.room;for(let turn=0;current.status==='active'&&turn<50;turn++){const c=current.battle.turn===0?adult:child;const reply=await call(c===adult?'adult/game/online-battle':'online-battle',{player:'quintus',action:'move',commandId:randomUUID(),room:room.id,revision:current.revision,move:'attack'},c);expect(reply.status,JSON.stringify(reply.data)).toBe(200);current=reply.data.room;}
  expect(current.status).toBe('finished');expect([0,1]).toContain(current.battle.winner);
  for(const c of[adult,child])expect((await call(c===adult?'adult/game/online-battle':'online-battle',{player:'quintus',action:'dismiss',commandId:randomUUID(),room:room.id,revision:current.revision},c)).status).toBe(200);
  const reverse=await call('online-battle',{player:'quintus',action:'invite',commandId:randomUUID(),friend:adultId,pet:child.game.family.profiles.quintus.equipped},child);expect(reverse.status).toBe(200);
  const joined=await call('adult/game/online-battle',{player:'quintus',action:'accept',commandId:randomUUID(),room:reverse.data.room.id,revision:reverse.data.room.revision,pet:adult.game.family.profiles.quintus.equipped},adult);expect(joined.status).toBe(200);expect(joined.data.room.names).toEqual(['Synthetic child','Synthetic adult']);
  const left=await call('adult/game/online-battle',{player:'quintus',action:'leave',commandId:randomUUID(),room:reverse.data.room.id,revision:joined.data.room.revision},adult);expect(left.status).toBe(200);expect(left.data.room.battle.winner).toBe(0);expect(await children()).toEqual(beforeChildren);
 });
 it('uses the same shared conquest world and distinct actors without changing child learning',async()=>{
  const a=await call('adult/game/conquest?player=quintus',undefined,adult),b=await call('conquest?player=quintus',undefined,child);expect(a.status).toBe(200);expect(b.status).toBe(200);expect(a.data.me).not.toBe(b.data.me);expect(a.data.state.tiles).toEqual(b.data.state.tiles);
  const join=await call('adult/game/conquest',{player:'quintus',type:'join',commandId:randomUUID(),revision:b.data.revision,season:a.data.state.season,alliance:'light',hero:'hero-elf'},adult);expect(join.status,JSON.stringify(join.data)).toBe(200);expect(join.data.state.enrollment).toBeTruthy();expect(await children()).toEqual(beforeChildren);
 });
 it('credits shared-world energy exactly once from an approved adult answer and leaves children unchanged',async()=>{
  const before=(await call('adult/game/conquest?player=quintus',undefined,adult)).data.state.energy;
  const command={type:'answer',...ptr(adult),answer:exerciseById(adult.learning.session.ids[0]).answer},op={username,id:randomUUID(),revision:adult.learning.revision,command};
  expect((await adultCommand(adult,command,op)).status).toBe(200);expect((await call('adult/game/conquest?player=quintus',undefined,adult)).data.state.energy).toBe(before+10);
  expect((await adultCommand(adult,command,op)).data.replayed).toBe(true);expect((await call('adult/game/conquest?player=quintus',undefined,adult)).data.state.energy).toBe(before+10);expect(await children()).toEqual(beforeChildren);
 });
 it('allocates adult English for assist questions and never charges child curriculum to an adult',async()=>{
  await gameRead();const start=await gameCommand(adult,{type:'battle-start',course:'english',used:[]});expect(start.status).toBe(200);const q=start.data.result.question;expect(q.programme).toBe('adult-english');expect(q.grade).toBeNull();expect(q.id).toMatch(/^adult-en-v1-/);expect(q.answer).toBeUndefined();
  const source=exerciseById(q.id),answer=source.options.indexOf(source.answer);const result=await gameCommand(adult,{type:'battle-answer',token:start.data.result.token,question:q.id,choice:answer});expect(result.status).toBe(200);expect(result.data.result.answer).toBe(answer);expect(await children()).toEqual(beforeChildren);
  const school=await gameCommand(child,{type:'battle-start',course:'math',used:[]});expect(school.status).toBe(200);expect(school.data.result.question.grade).toBe(4);expect(school.data.result.question.programme).toBeUndefined();
  expect([400,409]).toContain((await gameCommand(adult,{type:'battle-answer',token:school.data.result.token,question:school.data.result.question.id,choice:0})).status);
  // Child assist allocation legitimately advances its own durable history. No adult ID may enter it.
  const after=await children(),old=beforeChildren.find(r=>r.id===childIdentity.accountId),now=after.find(r=>r.id===childIdentity.accountId);expect(now.state.verified).toEqual(old.state.verified);expect(JSON.stringify(now.state.family)).not.toContain('adult-en-v1-');beforeChildren=after;
 });
 it('retains adult progress and compatibility membership across another login, then revokes both session types on recovery',async()=>{
  second=await call('adult/login',{username,password});expect(second.status).toBe(200);expect((await call('adult/game/state',undefined,second)).status).toBe(401);expect((await call('adult/game/enter',{},second)).status).toBe(200);
  const a=(await call('adult/game/state',undefined,adult)).data,b=(await call('adult/game/state',undefined,second)).data;expect(a.family).toEqual(b.family);
  const recovered=await call('adult/recover',{username,password:password+'new',recoveryCode:adult.recoveryCode});expect(recovered.status).toBe(200);expect((await call('adult/game/state',undefined,adult)).status).toBe(401);expect((await call('adult/game/state',undefined,second)).status).toBe(401);
  expect((await api.pool.query('SELECT count(*) FROM sessions WHERE account_id=$1',[adultId])).rows[0].count).toBe('0');expect((await call('state',undefined,child)).status).toBe(200);expect(await children()).toEqual(beforeChildren);
  const restored={...recovered,learning:recovered.data.state};expect((await call('adult/game/enter',{},restored)).status).toBe(200);const saved=(await call('adult/game/state',undefined,restored)).data.family;
  await new Promise(r=>server.close(r));await api.close();api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,npcRaidsEnabled:false});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
  expect((await call('adult/game/state',undefined,restored)).data.family).toEqual(saved);
  const out=await call('adult/game/logout',{},restored);expect(out.status).toBe(200);expect(out.cookie).toBe('star-tide-adult=');expect((await call('adult/state',undefined,restored)).status).toBe(401);expect((await call('adult/game/state',undefined,restored)).status).toBe(401);expect((await call('state',undefined,child)).status).toBe(200);expect(await children()).toEqual(beforeChildren);
 });
});
