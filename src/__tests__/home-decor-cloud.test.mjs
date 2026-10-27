import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { createAppServer } from "../../server.mjs";
import { createCloudApi } from "../../server/cloud.mjs";
import { newFamily, homeDecorTransition } from "../../build/game.mjs";
const suite=process.env.TEST_DATABASE_URL?describe:describe.skip;
suite("home decoration transactions (real PostgreSQL)",()=>{
 let api,server,url;const password="home-decor-isolated-test-2026";
 async function call(path,body,c){const r=await fetch(url+"/api/"+path,{method:body===undefined?"GET":"POST",headers:{Origin:url,...(body===undefined?{}:{"Content-Type":"application/json"}),...(c?{Cookie:c.cookie,"X-CSRF-Token":c.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get("set-cookie")?.split(";")[0]};}
 async function client(){const username="homeqa_"+randomUUID().replaceAll("-","").slice(0,15);const r=await call("register",{username,password});expect(r.status).toBe(200);const c={username,cookie:r.cookie,csrf:r.data.csrf,state:r.data};const family=newFamily();await api.pool.query("UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)",[username,family]);c.state=(await call("state",undefined,c)).data;return c;}
 function body(c,cmd,id=randomUUID()){return {id,revision:c.state.family.revision,command:{type:"home-decor",player:"quintus",...cmd}};}
 async function open(c){const r=await call("command",body(c,{action:"open"}),c);expect(r.status).toBe(200);c.state=r.data;}
 beforeAll(async()=>{api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});await api.pool.query("DELETE FROM request_limits");server=createAppServer({api});await new Promise(r=>server.listen(0,"127.0.0.1",r));url=`http://127.0.0.1:${server.address().port}`;},30000);
 afterAll(async()=>{await new Promise(r=>server.close(r));await api.close();});
 it("deduplicates simultaneous crafts, charges once, and retains every player's original data",async()=>{
  const c=await client();await open(c);const before=structuredClone(c.state.family),cmd=body(c,{action:"craft",kind:"bed"});const replies=await Promise.all([call("command",cmd,c),call("command",cmd,c)]);expect(replies.map(r=>r.status)).toEqual([200,200]);
  for(const r of replies){const p=r.data.family.profiles.quintus;expect(p.homeDecor.items).toHaveLength(4);expect(p.territory.resources.wood).toBe(before.profiles.quintus.territory.resources.wood-40);expect(p.owned).toEqual(before.profiles.quintus.owned);for(const id of ["feifei","qingqing","doudou"])expect(r.data.family.profiles[id]).toEqual(before.profiles[id]);}
  const stale=await call("command",{...cmd,id:randomUUID()},c);expect(stale.status).toBe(409);
 });
 it("saves room layouts across login and rejects stale local drafts even with fresh family revision",async()=>{
  const c=await client();await open(c);const old=structuredClone(c.state.family.profiles.quintus.homeDecor),draft=structuredClone(old);draft.items[1].x=65;draft.items[1].rotation=2;draft.rooms[0]={wall:"moon",floor:"wood"};
  const r=await call("command",body(c,{action:"save",baseRevision:old.revision,items:draft.items,rooms:draft.rooms,resident:c.state.family.profiles.quintus.equipped}),c);expect(r.status).toBe(200);c.state=r.data;
  const login=await call("login",{username:c.username,password});expect(login.status).toBe(200);expect(login.data.family.profiles.quintus.homeDecor.items).toEqual(draft.items);expect(login.data.family.profiles.quintus.homeDecor.rooms).toEqual(draft.rooms);
  const conflict=await call("command",body(c,{action:"save",baseRevision:old.revision,items:old.items,rooms:old.rooms,resident:null}),c);expect(conflict.status).toBe(400);expect((await call("state",undefined,c)).data.family).toEqual(c.state.family);
 });
 it("rejects forged costs and furniture; legacy import cannot mint a decorated room",async()=>{
  const c=await client();await open(c);const baseline=structuredClone(c.state.family),d=baseline.profiles.quintus.homeDecor;
  for(const cmd of [{action:"craft",kind:"bed",cost:0},{action:"save",baseRevision:d.revision,items:[...d.items,{...d.items[0],id:999,kind:"bed"}],rooms:d.rooms,resident:null}])expect((await call("command",body(c,cmd),c)).status).toBe(400);
  expect((await call("state",undefined,c)).data.family).toEqual(baseline);
  const fresh=await client(),snapshot=newFamily(),p=snapshot.profiles.quintus;Object.assign(p,homeDecorTransition(p,{action:"open"},Date.now()));Object.assign(p,homeDecorTransition(p,{action:"craft",kind:"bed"},Date.now()));
  const imported=await call("migrate",{id:randomUUID(),revision:0,snapshot},fresh);expect(imported.status).toBe(200);expect(imported.data.family.profiles.quintus.homeDecor).toBeUndefined();expect(imported.data.family.profiles.quintus.territory).toBeUndefined();
 });
});
