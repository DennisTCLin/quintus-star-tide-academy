import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import pinned from '../../docs/adult-shared-game/rebind-4543cdeb/fixtures/main-families.json';
import digests from '../../docs/adult-shared-game/rebind-4543cdeb/fixtures/main-question-digests.json';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {questionById,validateFamily} from '../../build/game.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
it('preserves every complete child question object from exact released main4543',()=>{
  for(const [id,digest] of Object.entries(digests))expect(hash(JSON.stringify(questionById(id))),id).toBe(digest);
});
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite('adult integration retains exact-main child saves on login and state',()=>{
  let api,server,url;const accounts={};
  async function storage(id){return(await api.pool.query('SELECT family,family::text AS text,updated_at::text AS updated FROM game_states WHERE account_id=$1',[id])).rows[0];}
  beforeAll(async()=>{
    api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false,npcRaidsEnabled:false});
    server=createAppServer({api});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
    for(const item of pinned.items)if(!accounts[item.player])accounts[item.player]=await provisionChildAccount(api.pool,{username:item.username,password:'0742',displayName:'Synthetic preservation',grade:item.grade});
  },30000);
  afterAll(async()=>{if(server)await new Promise(r=>server.close(r));await api?.close();});
  for(const item of pinned.items)it(`${item.grade}.${item.course}: array/prefix storage and complete family unchanged`,async()=>{
    for(const mode of ['array','prefix']){
      const stored=structuredClone(item.expectedRuntime),account=accounts[item.player];
      if(mode==='prefix')stored.profiles[item.player].learning.seen={codec:'prefix-v1',entries:stored.profiles[item.player].learning.seen.map(id=>[0,id])};
      await api.pool.query('UPDATE game_states SET family=$2,updated_at=now() WHERE account_id=$1',[account.accountId,stored]);
      const before=await storage(account.accountId);
      const login=await fetch(url+'/api/login',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({username:item.username,password:'0742'})});expect(login.status).toBe(200);
      const cookie=login.headers.get('set-cookie')?.split(';')[0];
      const state=await fetch(url+'/api/state',{headers:{Cookie:cookie}});expect(state.status).toBe(200);const actual=await state.json();
      const after=await storage(account.accountId);expect(after.text).toBe(before.text);expect(after.updated).toBe(before.updated);expect(structuredClone(validateFamily(structuredClone(after.family)))).toEqual(item.expectedRuntime);
      const expected=structuredClone(item.expectedRuntime);for(const profile of Object.values(expected.profiles))if(profile.run)profile.run.questions=profile.run.questions.map((id,i)=>i===profile.run.index?id:'');
      expect(actual.family).toEqual(expected);
      console.info('adult-main-storage',JSON.stringify({synthetic:true,base:pinned.base,grade:item.grade,course:item.course,mode,before:hash(before.text),after:hash(after.text),timestampUnchanged:before.updated===after.updated,fullRuntimeEqual:true}));
    }
  });
});
