import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createAppServer} from '../../server.mjs';
import {createCloudApi} from '../../server/cloud.mjs';
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('voice conversation authenticated persistence',()=>{
 let api,server,url,a,b,child,calls=[],gate=null,failTts=false;
 const body=(text='我喜歡海龜',revision=0,player='doudou')=>({id:randomUUID(),player,revision,text});
 async function call(client,path,body,headers={}) {const res=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:url,...(body?{'Content-Type':'application/json'}:{}),...(client?{Cookie:client.cookie,'X-CSRF-Token':client.csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};}
 async function register(){const username='voice_'+randomUUID().slice(0,12).replaceAll('-','');const r=await call(null,'register',{username,password:'voice-test-only-2026'});expect(r.status).toBe(200);const id=(await api.pool.query('SELECT id FROM accounts WHERE username=$1',[username])).rows[0].id;return {id,username,cookie:r.cookie,csrf:r.data.csrf};}
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,guideProvider:async()=>null,voiceProvider:{available:true,transcribe:async()=> '我喜歡海龜',reply:async input=>{calls.push(input);if(gate)await gate;return {user:input.text,reply:input.history.length?'你剛剛說過喜歡海龜。':'海龜很可愛！',source:'ai'};},speech:async()=>{if(failTts)throw new Error('fixture');return {audio:'fixture',mime:'audio/mpeg'};}}});server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;a=await register();b=await register();const username='vchild_'+randomUUID().slice(0,8);await api.pool.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) SELECT $1,id,$2,password_hash,$3,$4 FROM accounts WHERE id=$5',[randomUUID(),username,'doudou','測試孩子',a.id]);const r=await call(null,'login',{username,password:'voice-test-only-2026'});child={cookie:r.cookie,csrf:r.data.csrf};});
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it('checks auth, CSRF, child ownership and audio shape before provider',async()=>{
  expect((await call(null,'companion-talk?player=doudou')).status).toBe(401);expect((await call(a,'companion-talk',body(),{'X-CSRF-Token':'bad'})).status).toBe(403);expect((await call(child,'companion-talk?player=feifei')).status).toBe(403);expect((await call(child,'companion-talk',body('hi',0,'quintus'))).status).toBe(403);
  expect((await call(a,'companion-talk',{...body(),audio:'bad',mime:'audio/mp4'})).status).toBe(400);expect((await call(a,'companion-talk',body(''))).status).toBe(400);expect(calls).toHaveLength(0);
 });
 it('remembers free sentences, isolates children/accounts, replays same UUID and never touches family',async()=>{
  const family=(await call(a,'state')).data.family;const first=body();const r=await call(child,'companion-talk',first);expect(r.status).toBe(200);expect(r.data.history[0].user).toBe(first.text);expect((await call(child,'companion-talk',first)).data).toEqual(r.data);expect((await call(child,'companion-talk',{...first,text:'different'})).status).toBe(409);
  const next=await call(child,'companion-talk',body('我剛剛說什麼',1));expect(next.status).toBe(200);expect(calls.at(-1).history[0].user).toBe(first.text);expect((await call(a,'companion-talk?player=doudou')).data.history).toHaveLength(2);expect((await call(b,'companion-talk?player=doudou')).data.history).toHaveLength(0);expect((await call(a,'companion-talk?player=feifei')).data.history).toHaveLength(0);expect((await call(a,'state')).data.family).toEqual(family);expect(JSON.stringify(calls)).not.toContain(a.id);
 });
 it('TTS failure leaves text saved; TTS cannot speak arbitrary submitted text',async()=>{
  const state=(await call(child,'companion-talk?player=doudou')).data;const speech={id:state.history.at(-1).id,player:'doudou',revision:state.revision};failTts=true;expect((await call(child,'companion-talk/speech',speech)).status).toBe(503);failTts=false;expect((await call(child,'companion-talk/speech',speech)).status).toBe(200);expect((await call(child,'companion-talk/speech',{...speech,text:'injected'})).status).toBe(400);expect((await call(child,'companion-talk?player=doudou')).data.history).toHaveLength(2);
 });
 it('reset increments revision and prevents a slow turn and old receipt from restoring erased text',async()=>{
  let release;gate=new Promise(r=>{release=r;});const slowBody=body('這句會很慢',2);const slow=call(child,'companion-talk',slowBody);await new Promise(r=>setTimeout(r,60));const reset=await call(child,'companion-talk/reset',{id:randomUUID(),player:'doudou',revision:2});expect(reset.status).toBe(200);expect(reset.data.revision).toBe(3);release();gate=null;expect((await slow).status).toBe(409);expect((await call(child,'companion-talk',slowBody)).status).toBe(409);expect((await call(child,'companion-talk?player=doudou')).data.history).toHaveLength(0);
 });
 it('coalesces duplicate requests; races across devices commit once',async()=>{
  let release;gate=new Promise(r=>{release=r;});const same=body('我喜歡海龜',0,'feifei');const one=call(a,'companion-talk',same),two=call(a,'companion-talk',same),three=call(a,'companion-talk',body('天空',0,'feifei'));await new Promise(r=>setTimeout(r,60));release();gate=null;const results=await Promise.all([one,two,three]);expect(results[0].data).toEqual(results[1].data);expect([results[0].status,results[2].status].sort()).toEqual([200,409]);
 });
 it('retains only twelve recent turns and filters expired content',async()=>{
  // Fixture-only setup bypasses per-minute rate limit to validate persisted retention.
  const history=Array.from({length:14},(_,i)=>({id:randomUUID(),user:'海龜'+i,reply:'你好',source:'ai',at:Date.now()}));history[0].at=Date.now()-8*86400000;
  await api.pool.query('UPDATE companion_voice_conversations SET history=$3 WHERE account_id=$1 AND player_id=$2',[a.id,'feifei',JSON.stringify(history)]);const r=await call(a,'companion-talk?player=feifei');expect(r.data.history).toHaveLength(12);expect(r.data.history[0].user).toBe('海龜2');
 });
 it('revalidates session after provider work, rejecting a logged-out child',async()=>{
  let release;gate=new Promise(r=>{release=r;});const slow=call(child,'companion-talk',body('我喜歡貓',3));await new Promise(r=>setTimeout(r,60));expect((await call(child,'logout',{})).status).toBe(200);release();gate=null;expect((await slow).status).toBe(401);expect((await call(a,'companion-talk?player=doudou')).data.history).toHaveLength(0);
 });
});
