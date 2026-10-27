import { grantStarTickets } from "../../server/star-ticket-admin.mjs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { request as httpRequest } from "node:http";
import { randomUUID } from "node:crypto";
import { createAppServer } from "../../server.mjs";
import { createCloudApi } from "../../server/cloud.mjs";
import { monsterById, newOnboardingFamily, newFamily, questionById, selectQuestions, ROSTER, startRun, answerRun, nextQuestion, taipeiDay, hasMastered } from "../../build/game.mjs";
const connectionString = process.env.TEST_DATABASE_URL;
const suite = connectionString ? describe : describe.skip;
suite("authoritative cloud game (real PostgreSQL)", () => {
  let api, server, url, a, b, other, account, recovery;
  const password = "a-test-only-passphrase-2026";
  async function open() {
    api = await createCloudApi({ connectionString, production: false });
    server = createAppServer({ api });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${server.address().port}`;
  }
  async function call(path, body, client, headers = {}) {
    const response = await fetch(url + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Origin: url,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(client
          ? { Cookie: client.cookie, "X-CSRF-Token": client.csrf }
          : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    return {
      status: response.status,
      data,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  async function registration() {
    const username = "qa_" + randomUUID().replaceAll("-", "").slice(0, 16);
    const r = await call("register", { username, password });
    expect(r.status).toBe(200);
    return {
      username,
      cookie: r.cookie,
      csrf: r.data.csrf,
      state: r.data,
      recovery: r.data.recoveryCode,
    };
  }
  async function state(c) {
    const r = await call("state", undefined, c);
    expect(r.status).toBe(200);
    c.state = r.data;
    return r.data;
  }
  const command = (
    c,
    value,
    id = randomUUID(),
    revision = c.state.family.revision,
  ) => ({ id, revision, command: value });
  beforeAll(async () => {
    await open();
    await api.pool.query("DELETE FROM request_limits");
    a = await registration();
    // The existing suite exercises a historical account, independently of onboarding.
    await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)', [a.username, newFamily()]);
    await state(a);
    account = a.username;
    recovery = a.recovery;
    const r = await call("login", { username: account, password });
    b = {
      username: account,
      cookie: r.cookie,
      csrf: r.data.csrf,
      state: r.data,
    };
    other = await registration();
  }, 30000);
  afterAll(async () => {
    await new Promise((r) => server.close(r));
    await api.close();
  });
  it('upgrades a four-slot v7 verified ledger without null or changed legacy scores',async()=>{
    const c=await registration();const legacy=newFamily();legacy.version=7;delete legacy.profiles.alston;
    const scores={quintus:20,feifei:40,qingqing:60,doudou:80};
    await api.pool.query('UPDATE game_states SET family=$2,verified=$3 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username,legacy,scores]);
    await state(c);
    const result=await call('command',command(c,{type:'home-decor',player:'quintus',action:'open'}),c);
    expect(result.status,JSON.stringify(result.data)).toBe(200);expect(result.data.verified).toEqual({...scores,alston:0,jay:0});
    const persisted=(await api.pool.query('SELECT verified FROM game_states WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username])).rows[0].verified;
    expect(persisted).toEqual({...scores,alston:0,jay:0});
  });
  it("atomically credits the fifth learning answer and pending materials once across receipt retries", async () => {
    const c=await registration(),f=newFamily(),p=f.profiles.quintus,day=taipeiDay();
    startRun(f,'quintus','math','material-r',1,false,day);
    for(let i=0;i<4;i++){const q=questionById(p.run.questions[i]);answerRun(f,'quintus','material-r',i,q.answer,day);nextQuestion(f,'quintus','material-r',i);}
    await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username,f]);await state(c);
    const q=questionById(p.run.questions[4]),body=command(c,{type:'answer',player:'quintus',runId:'material-r',index:4,choice:q.answer});
    const raced=await Promise.all([call('command',body,c),call('command',body,c)]);
    expect(raced.map(r=>r.status)).toEqual([200,200]);await state(c);
    expect(c.state.family.profiles.quintus.growth.xp[p.equipped]).toBe(50);
    expect(c.state.family.profiles.quintus.learningRewards).toEqual({progress:0,packs:1,pending:{wood:20,stone:12,star:6},goal:null});
    expect(c.state.family.profiles.quintus.run.materials).toEqual({credited:5,packs:1});
    expect((await call('command',{...body,id:randomUUID()},c)).status).toBe(409);
    expect((await call('command',command(c,{...body.command}),c)).status).toBe(400);
    expect((await call('command',command(c,{type:'learning-goal',player:'quintus',goal:'grove',amount:999}),c)).status).toBe(400);
    const goal=await call('command',command(c,{type:'learning-goal',player:'quintus',goal:'grove'}),c);expect(goal.status).toBe(200);c.state=goal.data;
    const opened=await call('command',command(c,{type:'territory',player:'quintus',action:'start'}),c);expect(opened.status).toBe(200);
    expect(opened.data.family.profiles.quintus.territory.resources).toEqual({wood:200,stone:162,star:96});
    expect(opened.data.family.profiles.quintus.learningRewards.pending).toEqual({wood:0,stone:0,star:0});
    const otherLogin=await call('login',{username:c.username,password});expect(otherLogin.data.family.profiles.quintus.learningRewards.goal).toBe('grove');
    expect(otherLogin.data.family.profiles.quintus.run.materials).toEqual({credited:5,packs:1});
    for(const id of ['doudou','qingqing','feifei'])expect(opened.data.family.profiles[id]).toEqual(f.profiles[id]);
  });
  it("clears client-authored construction rewards on legacy import",async()=>{
    const c=await registration(),f=newFamily();f.profiles.quintus.learningRewards={progress:4,pending:{wood:9000,stone:9000,star:9000},goal:'academy'};
    startRun(f,'quintus','math','client-authored-materials',1,false,taipeiDay());
    f.profiles.quintus.run.materials={credited:0,packs:0};
    const r=await call('migrate',{id:randomUUID(),revision:0,snapshot:f},c);expect(r.status).toBe(200);expect(r.data.family.profiles.quintus.learningRewards).toBeUndefined();
    expect(r.data.family.profiles.quintus.run).toBeNull();
  });
  it("authorizes castle expansion from server growth, retains land, and persists cosmetics across devices", async () => {
    const c=await registration(), f=newFamily();
    f.profiles.quintus.growth.xp[ROSTER[0].id]=350;
    f.profiles.quintus.learningRewards={progress:2,pending:{wood:20,stone:12,star:6},goal:'grove'};
    await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username,f]);
    await state(c);
    const send=async(cmd)=>{const r=await call('command',command(c,{type:'territory',player:'quintus',...cmd}),c);if(r.status===200)c.state=r.data;return r;};
    expect((await send({action:'start'})).status).toBe(200);
    const resources=structuredClone(c.state.family.profiles.quintus.territory.resources);
    expect(resources).toEqual({wood:200,stone:162,star:96});
    const expansion=command(c,{type:'territory',player:'quintus',action:'expand'});
    const repeat=await Promise.all([call('command',expansion,c),call('command',expansion,c)]);
    expect(repeat.map(r=>r.status)).toEqual([200,200]);
    expect(repeat.map(r=>r.data.family.profiles.quintus.territory.expansion)).toEqual([1,1]);
    await state(c);
    expect(c.state.family.profiles.quintus.territory.resources).toEqual(resources);
    expect((await send({action:'expand',growthXp:{[ROSTER[0].id]:9999}})).status).toBe(400);
    const revision=c.state.family.revision;
    const races=await Promise.all(['moon-bay','coral'].map(style=>call('command',command(c,{type:'territory',player:'quintus',action:'castle-style',style},randomUUID(),revision),c)));
    expect(races.map(r=>r.status).sort()).toEqual([200,409]); await state(c);
    expect((await send({action:'castle-style',style:'forest'})).status).toBe(200);
    expect((await send({action:'expand'})).status).toBe(200);
    const current=c.state.family.profiles.quintus;
    expect(current.territory.expansion).toBe(2);
    expect(current.learningRewards.goal).toBe('grove');
    expect(current.learningRewards.pending).toEqual({wood:0,stone:0,star:0});
    const second=await call('login',{username:c.username,password});
    expect(second.data.family.profiles.quintus.territory).toEqual(current.territory);
    for(const id of ['feifei','qingqing','doudou'])expect(second.data.family.profiles[id]).toEqual(f.profiles[id]);
    expect((await send({action:'castle-style',style:'__proto__'})).status).toBe(400);
    await state(c);expect(c.state.family.profiles.quintus.territory.castleStyle).toBe('forest');
    expect((await call('command',command(c,{type:'territory',player:'feifei',action:'start'}),c)).status).toBe(200);
    await state(c);
    expect((await call('command',command(c,{type:'territory',player:'feifei',action:'expand'}),c)).status).toBe(400);
  });
  it("preserves all player progress through territory transactions, conflict and replay", async () => {
    const c=await registration(), old=newFamily();
    for(const p of Object.values(old.profiles)){p.coins=456;p.tickets=3;p.milestones.masteryPoints=123;p.growth.xp[ROSTER[0].id]=77;p.owned[ROSTER[1].id]=2;p.firstAcquired[ROSTER[1].id]='2026-10-20';}
    await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username,old]);
    await state(c);
    const before=structuredClone(c.state.family.profiles);
    const send=async(cmd)=>{const r=await call('command',command(c,{type:'territory',player:'quintus',...cmd}),c);if(r.status===200)c.state=r.data;return r;};
    expect((await send({action:'start'})).status).toBe(200);
    const body=command(c,{type:'territory',player:'quintus',action:'build',kind:'grove',plot:1});
    const raced=await Promise.all([call('command',body,c),call('command',body,c)]);
    expect(raced.map(r=>r.status)).toEqual([200,200]);
    expect(raced[0].data.family.profiles.quintus.territory.buildings).toHaveLength(2);
    expect(raced[1].data.family.profiles.quintus.territory.resources.wood).toBe(raced[0].data.family.profiles.quintus.territory.resources.wood);
    expect((await call('command',{...body,command:{...body.command,plot:2}},c)).status).toBe(409);
    await state(c);
    const rev=c.state.family.revision;
    const races=await Promise.all(['harvest','commission'].map(action=>call('command',command(c,{type:'territory',player:'quintus',action},randomUUID(),rev),c)));
    expect(races.map(r=>r.status).sort()).toEqual([200,409]);await state(c);
    expect((await send({action:'harvest',now:Date.now()+10000000})).status).toBe(400);
    expect((await send({action:'build',kind:'grove',plot:1})).status).toBe(400);
    const latest=await state(c);
    for(const id of Object.keys(before)){const p={...latest.family.profiles[id]};delete p.territory;expect(p).toEqual(before[id]);}
    expect(latest.verified).toEqual({quintus:0,doudou:0,qingqing:0,feifei:0,alston:0,jay:0});
    expect(latest.serverNow).toBeGreaterThan(0);
    const logged=await call('login',{username:c.username,password});expect(logged.data.family.profiles.quintus.territory).toEqual(latest.family.profiles.quintus.territory);
  });
  it("persists one randomized starter across competing devices, reloads and fresh request IDs", async () => {
    const c=await registration(), fresh=c.state.family;
    expect(fresh.profiles.quintus.onboarding).toEqual({pet:null,confirmed:false});
    const send=async(cmd,bodyId=randomUUID(),revision=c.state.family.revision)=>{
      const r=await call('command',command(c,cmd,bodyId,revision),c);
      if(r.status===200)c.state=r.data;
      return r;
    };
    expect((await send({type:'start',player:'quintus',course:'math',practice:false})).status).toBe(400);
    expect((await send({type:'starter-confirm',player:'quintus'})).status).toBe(400);
    expect((await send({type:'starter-draw',player:'quintus',pet:'infinitywhale',roll:.9})).status).toBe(400);
    expect((await state(c)).family.revision).toBe(0);
    const body=command(c,{type:'starter-draw',player:'quintus'});
    const login=await call('login',{username:c.username,password});
    const device={cookie:login.cookie,csrf:login.data.csrf,state:login.data};
    const results=await Promise.all([call('command',body,c),call('command',body,device)]);
    expect(results.map(r=>r.status)).toEqual([200,200]);
    const pet=results[0].data.result;
    expect(results[1].data.result).toBe(pet); expect(['D','E']).toContain(ROSTER.find(x=>x.id===pet).rarity);
    c.state=results[0].data;
    const p=c.state.family.profiles.quintus;
    expect(p.owned).toEqual({[pet]:1}); expect(p.equipped).toBe(pet); expect(p.tickets).toBe(0); expect(p.draws).toBe(0);
    expect(p.growth.xp).toEqual({}); expect(p.onboarding).toEqual({pet,confirmed:false});
    const retry=await send({type:'starter-draw',player:'quintus'});
    expect(retry.data.result).toBe(pet); expect(retry.data.family.profiles.quintus).toEqual(p);
    const race=await Promise.all([send({type:'starter-draw',player:'feifei'}),send({type:'starter-draw',player:'feifei'})]);
    expect(race.map(r=>r.status).sort()).toEqual([200,409]);
    expect((await state(c)).family.profiles.feifei.onboarding.pet).toBeTruthy();
    expect((await state(device)).family.profiles.quintus.onboarding).toEqual({pet,confirmed:false});
    expect((await send({type:'starter-confirm',player:'quintus'})).status).toBe(200);
    expect((await send({type:'starter-confirm',player:'quintus'})).status).toBe(200);
    expect((await send({type:'start',player:'quintus',course:'math',practice:false})).data.family.profiles.quintus.run.companion).toBe(pet);
    expect((await send({type:'starter-draw',player:'quintus'})).data.family.profiles.quintus.owned).toEqual({[pet]:1});
    expect(c.state.family.profiles.qingqing.onboarding).toEqual({pet:null,confirmed:false});
  });
  it("only operators issue invitations; grants and draws are atomic, replayable and import-safe", async () => {
    const c=await registration(),f=newFamily();f.profiles.quintus.starTickets=99;
    const imported=await call('migrate',{id:randomUUID(),revision:0,snapshot:f},c);
    expect(imported.status).toBe(200);c.state=imported.data;
    expect(c.state.family.profiles.quintus.starTickets).toBe(0);
    const memberId=randomUUID(),accountId=(await api.pool.query('SELECT id FROM accounts WHERE username=$1',[c.username])).rows[0].id;
    await api.pool.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,$5,$6)',[memberId,accountId,c.username+'_m','unused','quintus','QA only']);
    const grant={grantId:randomUUID(),username:c.username+'_m',amount:2,reason:'QA invitation',operator:'test'};
    const before=structuredClone(c.state.family);
    const preview=await grantStarTickets(api.pool,grant);expect(preview.preview).toBe(true);
    expect((await state(c)).family).toEqual(before);
    const issued=await Promise.all([grantStarTickets(api.pool,grant,{apply:true}),grantStarTickets(api.pool,grant,{apply:true})]);
    expect(issued.filter(r=>r.replayed)).toHaveLength(1);
    await expect(grantStarTickets(api.pool,{...grant,amount:3},{apply:true})).rejects.toThrow('不同內容');
    expect((await call('command',command(c,{type:'draw-star',player:'quintus'},randomUUID(),before.revision),c)).status).toBe(409);
    await state(c);expect(c.state.family.profiles.quintus.starTickets).toBe(2);
    expect(c.state.family.profiles.feifei).toEqual(before.profiles.feifei);
    for(const cmd of [{type:'grant-star',amount:99},{type:'draw-star',roll:0},{type:'draw-star',pet:'tideglow'}]) expect((await call('command',command(c,{player:'quintus',...cmd}),c)).status).toBe(400);
    const original=command(c,{type:'draw-star',player:'quintus'});
    const results=await Promise.all([call('command',original,c),call('command',original,c)]);
    expect(results.map(r=>r.status)).toEqual([200,200]);expect(results[0].data.result).toEqual(results[1].data.result);
    expect(results[0].data.result.ticketKind).toBe('star');
    const once=await state(c);expect(once.family.profiles.quintus.starTickets).toBe(1);expect(once.family.profiles.quintus.tickets).toBe(0);
    const second=await call('command',command(c,{type:'draw-star',player:'quintus'}),c);expect(second.status).toBe(200);c.state=second.data;
    const replay=await call('command',original,c);expect(replay.data.result).toEqual(results[0].data.result);expect(replay.data.family.profiles.quintus.starTickets).toBe(0);
    expect((await call('command',command(c,{type:'draw-star',player:'quintus'}),c)).status).toBe(400);
    expect((await state(other)).family.profiles.quintus.starTickets).toBe(0);
    // A permanent grant receipt survives draws; re-running the grant must not refill spent tickets.
    await grantStarTickets(api.pool,grant,{apply:true});expect((await state(c)).family.profiles.quintus.starTickets).toBe(0);
    expect((await grantStarTickets(api.pool,grant)).replayed).toBe(true);
    await expect(grantStarTickets(api.pool,{...grant,amount:3})).rejects.toThrow('不同內容');
    await expect(grantStarTickets(api.pool,{...grant,grantId:randomUUID(),amount:101},{apply:true})).rejects.toThrow();
    await expect(grantStarTickets(api.pool,{...grant,grantId:randomUUID(),username:'no_such_qa_member'},{apply:true})).rejects.toThrow();
  });
  it("recovers a charged gacha across retries/devices, isolates players and strips imported receipts", async () => {
    const c=await registration(),family=newFamily();family.profiles.quintus.tickets=1;
    family.profiles.quintus.lastDraw={id:'forged-history',pet:'tideglow',duplicate:false,copies:1};
    const migrated=await call('migrate',{id:randomUUID(),revision:0,snapshot:family},c);
    expect(migrated.status).toBe(200);c.state=migrated.data;
    expect(c.state.family.profiles.quintus.lastDraw).toBeUndefined();
    const login=await call('login',{username:c.username,password});
    const device={cookie:login.cookie,csrf:login.data.csrf,state:login.data};
    const body=command(c,{type:'draw',player:'quintus'});
    // Simulate losing the first response: recover only via the same request ID and state GET.
    const first=await call('command',body,c);
    const retry=await call('command',body,device);
    expect(first.status).toBe(200);expect(retry.status).toBe(200);expect(retry.data.replayed).toBe(true);
    const receipt=first.data.family.profiles.quintus.lastDraw;
    expect(receipt).toMatchObject({id:expect.any(String),pet:first.data.result.pet,copies:1,duplicate:false});
    expect(retry.data.result).toEqual(first.data.result);
    await state(device);const p=device.state.family.profiles.quintus;
    expect(p.lastDraw).toEqual(receipt);expect(p.tickets).toBe(0);expect(p.draws).toBe(1);
    expect(device.state.family.profiles.feifei.lastDraw).toBeUndefined();
    expect((await state(other)).family.profiles.quintus.lastDraw).toBeUndefined();
    expect((await call('command',command(device,{type:'draw',player:'quintus'}),device)).status).toBe(400);
    expect((await call('command',{...body,id:randomUUID()},c)).status).toBe(409);
    expect((await state(c)).family.profiles.quintus.lastDraw).toEqual(receipt);
  });
  it("replays the original draw result even if another device has since drawn again", async () => {
    const c=await registration(),family=newFamily();family.profiles.quintus.tickets=2;
    await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username,family]);await state(c);
    const original=command(c,{type:'draw',player:'quintus'});
    const first=await call('command',original,c);expect(first.status).toBe(200);c.state=first.data;
    const second=await call('command',command(c,{type:'draw',player:'quintus'}),c);expect(second.status).toBe(200);
    const replay=await call('command',original,c);expect(replay.status).toBe(200);
    expect(replay.data.result).toEqual(first.data.result);
    expect(replay.data.result.receiptId).toBe(first.data.family.profiles.quintus.lastDraw.id);
    expect(replay.data.result.receiptId).not.toBe(second.data.result.receiptId);
    expect(replay.data.family.profiles.quintus.lastDraw).toEqual(second.data.family.profiles.quintus.lastDraw);
    expect(replay.data.family.profiles.quintus.tickets).toBe(0);expect(replay.data.family.profiles.quintus.draws).toBe(2);
  });
  it("resumes retired grade-one words but starts new English voyages and battle questions", async () => {
    const c=await registration(),family=newFamily();startRun(family,'qingqing','english','legacy-words',1);
    const p=family.profiles.qingqing,ids=selectQuestions(1,'words',[],0);
    delete p.run.answers;delete p.run.encounter.route;p.run.review=Array(5).fill(false);p.run.course='words';p.run.questions=ids;p.learning.seen=ids;p.learning.review.words=1;
    p.learning.skills.words={level:1,recent:'1',answered:1,correct:1,reviewDay:''};
    await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)',[c.username,family]);await state(c);
    expect(c.state.questions.qingqing.course).toBe('words');expect(c.state.questions.qingqing.answer).toBeUndefined();
    const send=async value=>{const r=await call('command',command(c,{player:'qingqing',...value}),c);if(r.status===200)c.state=r.data;return r;};
    expect((await send({type:'answer',runId:'legacy-words',index:0,choice:questionById(ids[0]).answer})).status).toBe(200);
    expect((await send({type:'quit',runId:'legacy-words'})).status).toBe(200);
    expect((await send({type:'start',course:'words',practice:false})).status).toBe(400);
    expect((await send({type:'start',course:'english',practice:false})).status).toBe(200);
    expect(c.state.questions.qingqing).toBeUndefined();
    expect((await send({type:'ready-question',runId:c.state.family.profiles.qingqing.run.id,index:0})).status).toBe(200);
    expect(c.state.questions.qingqing).toMatchObject({grade:1,course:'english',subject:'english'});
    expect(c.state.questions.qingqing.answer).toBeUndefined();expect(c.state.questions.qingqing.speechText).toBeTruthy();
    const battle=await send({type:'battle-start',course:'english',used:[]});expect(battle.status).toBe(200);
    expect(battle.data.result.question.course).toBe('english');expect(battle.data.result.question.answer).toBeUndefined();
    const practice=await call('practice',{type:'start',player:'qingqing',used:[]},c);
    expect(practice.status).toBe(200);expect(practice.data.course).toBe('english');
    expect((await state(c)).family.profiles.qingqing.learning.skills.words.answered).toBe(2);
  });
  it("imports do not grant new starter eligibility", async () => {
    const c=await registration();
    const r=await call('migrate',{id:randomUUID(),revision:0,snapshot:newOnboardingFamily()},c);
    expect(r.status).toBe(200); c.state=r.data;
    expect(c.state.family.profiles.quintus.onboarding).toBeUndefined();
    expect((await call('command',command(c,{type:'starter-draw',player:'quintus'}),c)).status).toBe(400);
  });
  it("requires authentication, exact origin and session CSRF; rejects snapshot/foreign-account fields", async () => {
    expect((await call("state")).status).toBe(401);
    expect(
      (
        await call(
          "command",
          command(a, { type: "draw", player: "quintus" }),
          a,
          { Origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          "command",
          command(a, { type: "draw", player: "quintus" }),
          a,
          { "X-CSRF-Token": "wrong" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          "command",
          {
            ...command(a, { type: "draw", player: "quintus" }),
            family: newFamily(),
          },
          a,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(
          "command",
          command(a, {
            type: "start",
            player: "quintus",
            course: "math",
            practice: false,
            accountId: other.username,
          }),
          a,
        )
      ).status,
    ).toBe(400);
  });
  it("commits once across simultaneous devices and withholds answer keys", async () => {
    const body = command(a, {
      type: "start",
      player: "quintus",
      course: "math",
      practice: false,
    });
    const [r1, r2] = await Promise.all([
      call("command", body, a),
      call("command", body, b),
    ]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(r1.data.family.revision).toBe(1);
    expect(r2.data.family.revision).toBe(1);
    const encounter = r1.data.family.profiles.quintus.run.encounter;
    expect(monsterById(encounter.variant)).toMatchObject({ family: encounter.monster, form: "scout", element: "金" });
    expect(r2.data.family.profiles.quintus.run.encounter).toEqual(encounter);
    expect(r1.data.family.profiles.quintus.lastMonsterVariant).toBe(encounter.variant);
    expect([r1.data.replayed, r2.data.replayed].sort()).toEqual([false, true]);
    a.state = r1.data;
    expect(a.state.questions.quintus).toBeUndefined();
    expect(a.state.family.profiles.quintus.run.questions.filter(Boolean)).toHaveLength(0);
    const ready=await call('command',command(a,{type:'ready-question',player:'quintus',runId:a.state.family.profiles.quintus.run.id,index:0}),a);
    expect(ready.status).toBe(200);a.state=ready.data;
    expect(a.state.questions.quintus.answer).toBeUndefined();
    expect(a.state.questions.quintus.explanation).toBeUndefined();
    expect(
      a.state.family.profiles.quintus.run.questions.filter(Boolean),
    ).toHaveLength(1);
    expect((await state(b)).family).toEqual(a.state.family);
    expect((await state(other)).family.revision).toBe(0);
  });
  it("server grades and awards points once; replay after lost response returns the committed result", async () => {
    const run = a.state.family.profiles.quintus.run,
      q = questionById(run.questions[run.index]);
    const body = command(a, {
      type: "answer",
      player: "quintus",
      runId: run.id,
      index: run.index,
      choice: q.answer,
    });
    const first = await call("command", body, a),
      retry = await call("command", body, b);
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(retry.data.replayed).toBe(true);
    expect(first.data.verified.quintus).toBe(20);
    expect(first.data.family.profiles.quintus.growth.xp[run.companion]).toBe(10);
    expect(retry.data.family.profiles.quintus.growth.xp[run.companion]).toBe(10);
    expect(retry.data.family.profiles.quintus.run.encounter.earned).toBe(10);
    expect(retry.data.family.profiles.quintus.run.encounter.variant).toBe(run.encounter.variant);
    const freshReplay = await call("command", { ...body, id: randomUUID(), revision: retry.data.family.revision }, b);
    expect(freshReplay.status).toBe(400);
    expect((await state(b)).family.profiles.quintus.growth.xp[run.companion]).toBe(10);
    expect(retry.data.family.profiles.quintus.coins).toBe(10);
    expect(retry.data.questions.quintus.answer).toBe(q.answer);
    a.state = retry.data;
    expect(
      (
        await call(
          "command",
          { ...body, command: { ...body.command, choice: (q.answer + 1) % 4 } },
          a,
        )
      ).status,
    ).toBe(409);
    // After receipt expiry the old expected revision still prevents double spend/award.
    await api.pool.query("DELETE FROM command_receipts WHERE command_id=$1", [
      body.id,
    ]);
    expect((await call("command", body, a)).status).toBe(409);
  });
  it("rejects stale different commands and forged time/randomness, without changing state", async () => {
    const rev = a.state.family.revision;
    expect(
      (
        await call(
          "command",
          command(a, {
            type: "next",
            player: "quintus",
            runId: a.state.family.profiles.quintus.run.id,
            index: 0,
            day: "2099-01-01",
          }),
          a,
        )
      ).status,
    ).toBe(400);
    const ops = ["feifei", "qingqing"].map((player) =>
      call(
        "command",
        command(a, { type: "start", player, course: "math", practice: false }),
        a,
      ),
    );
    const results = await Promise.all(ops);
    expect(results.map((x) => x.status).sort()).toEqual([200, 409]);
    expect((await state(a)).family.revision).toBe(rev + 1);
  });
  it("imports once without overwriting, archives original and keeps historical points out of verified scores", async () => {
    const snapshot = newFamily();
    snapshot.profiles.quintus.coins = 1000;
    snapshot.profiles.quintus.tickets = 3;
    snapshot.profiles.quintus.growth.xp.tideglow = 999999;
    const card = ROSTER.find((c) => c.catalogNumber === 2).id;
    const second = ROSTER.find((c) => c.catalogNumber === 3).id;
    snapshot.profiles.quintus.owned[card] = 1;
    snapshot.profiles.quintus.firstAcquired[card] = "2026-01-01";
    snapshot.profiles.feifei.owned[second] = 1;
    snapshot.profiles.feifei.firstAcquired[second] = "2026-01-02";
    const body = { id: randomUUID(), revision: 0, snapshot };
    const imported = await call("migrate", body, other),
      retry = await call("migrate", body, other);
    expect(imported.status).toBe(200);
    expect(retry.data.replayed).toBe(true);
    other.state = imported.data;
    expect(other.state.verified.quintus).toBe(0);
    expect(other.state.family.profiles.quintus.growth.xp).toEqual({});
    expect(other.state.family.profiles.quintus.coins).toBe(1000);
    expect(other.state.family.profiles.quintus.firstAcquired[card]).toBeNull();
    expect(
      (await call("migrate", { ...body, id: randomUUID(), revision: 1 }, other))
        .status,
    ).toBe(409);
    const stored = await api.pool.query(
      "SELECT legacy_archive FROM game_states g JOIN accounts a ON a.id=g.account_id WHERE username=$1",
      [other.username],
    );
    expect(stored.rows[0].legacy_archive).toEqual(snapshot);
  });
  it("atomically swaps both inventories, rejects duplicate acceptance, and draws once", async () => {
    const card = ROSTER.find((c) => c.catalogNumber === 2).id,
      second = ROSTER.find((c) => c.catalogNumber === 3).id;
    let r = await call(
      "command",
      command(other, {
        type: "trade-propose",
        player: "quintus",
        to: "feifei",
        give: card,
        receive: second,
      }),
      other,
    );
    expect(r.status).toBe(200);
    other.state = r.data;
    const body = command(other, {
      type: "trade-accept",
      player: "feifei",
      tradeId: r.data.family.pendingTrade.id,
    });
    const results = await Promise.all([
      call("command", body, other),
      call("command", body, other),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    other.state = results[0].data;
    expect(other.state.family.profiles.quintus.owned[second]).toBe(1);
    expect(other.state.family.profiles.feifei.owned[card]).toBe(1);
    expect(other.state.family.pendingTrade).toBeNull();
    const drawBody = command(other, { type: "draw", player: "quintus" }),
      d = await call("command", drawBody, other),
      again = await call("command", drawBody, other);
    expect(d.status).toBe(200);
    expect(again.data.result).toEqual(d.data.result);
    expect(again.data.family.profiles.quintus.tickets).toBe(2);
    other.state = again.data;
  });
  async function send(c, value) {
    const r = await call("command", command(c, value), c);
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    c.state = r.data;
    return r;
  }
  async function finish(c, player = "doudou", correction = false) {
    const prior = structuredClone(c.state.family.profiles[player]);
    const legacy=(await api.pool.query("SELECT family FROM game_states WHERE account_id=(SELECT id FROM accounts WHERE username=$1)",[c.username])).rows[0].family;
    startRun(legacy,player,'math',randomUUID(),1,false,taipeiDay());delete legacy.profiles[player].run.captureRule;
    await api.pool.query("UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)",[c.username,legacy]);await state(c);
    for (let i = 0; i < 6; i++) {
      const run = c.state.family.profiles[player].run;
      const q = questionById(run.questions[i]);
      const base = { player, runId: run.id, index: i };
      await send(c, { ...base, type: "answer", choice: correction && i === 0 ? (q.answer + 1) % q.options.length : q.answer });
      if (i < 5) await send(c, { ...base, type: "next" });
    }
    // This suite exercises the retained pre-v7 pending-choice reader.
    const family = (await api.pool.query("SELECT family FROM game_states WHERE account_id=(SELECT id FROM accounts WHERE username=$1)",[c.username])).rows[0].family, p = family.profiles[player];
    p.rewardStars = prior.rewardStars; p.tickets = prior.tickets; p.run.reward = "pending";
    await api.pool.query("UPDATE game_states SET family=$1 WHERE account_id=(SELECT id FROM accounts WHERE username=$2)", [family,c.username]);
    await state(c);
  }
  it("normalizes existing schema3 cloud rows on read without retroactive awards", async () => {
    const saved = await state(other), old = structuredClone(saved.family);
    old.version = 3;
    for (const p of Object.values(old.profiles)) {
      delete p.rewardStars; delete p.rewardRounds;
      if (p.run) delete p.run.reward;
    }
    await api.pool.query("UPDATE game_states SET family=$1 WHERE account_id=(SELECT id FROM accounts WHERE username=$2)", [old, other.username]);
    const read = await state(other);
    expect(read.family.version).toBe(9);
    expect(read.family.revision).toBe(old.revision);
    expect(read.family.profiles.quintus.tickets).toBe(old.profiles.quintus.tickets);
    expect(read.family.profiles.quintus.firstAcquired).toEqual(old.profiles.quintus.firstAcquired);
    expect(read.family.profiles.quintus.rewardStars).toBe(0);
    expect(read.verified).toEqual(saved.verified);
  });
  it("legacy server completion choices survive devices and concurrent/replayed claims without double rewards", async () => {
    await state(a);
    await finish(a, "doudou", true);
    const runId = a.state.family.profiles.doudou.run.id;
    expect(a.state.family.profiles.doudou.run.reward).toBe("pending");
    const before = structuredClone(a.state.verified);
    for (const op of [
      { type: "quit", player: "doudou", runId },
      { type: "start", player: "doudou", course: "math", practice: false },
      { type: "claim-reward", player: "doudou", runId, choice: "save", roll: 0 },
      { type: "claim-reward", player: "doudou", runId: "stale", choice: "save" },
      { type: "claim-reward", player: "doudou", runId, choice: "fake" },
    ]) expect((await call("command", command(a, op), a)).status).toBe(400);
    const body = command(a, { type: "claim-reward", player: "doudou", runId, choice: "save" });
    const pair = await Promise.all([call("command", body, a), call("command", body, b)]);
    expect(pair.map(r => r.status)).toEqual([200, 200]);
    expect(pair.map(r => r.data.result)).toEqual(["saved", "saved"]);
    await state(a); await state(b);
    expect(a.state.family).toEqual(b.state.family);
    expect(a.state.family.profiles.doudou.rewardStars).toBe(1);
    expect(a.state.verified).toEqual(before);
    expect((await call("command", command(a, body.command), a)).status).toBe(400);
    await api.pool.query("DELETE FROM command_receipts WHERE command_id=$1", [body.id]);
    expect((await call("command", body, a)).status).toBe(409);
    await finish(a);
    const second = a.state.family.profiles.doudou.run.id;
    const savedScores = structuredClone(a.state.verified);
    expect((await send(a, { type: "claim-reward", player: "doudou", runId: second, choice: "save" })).data.result).toBe("exchanged");
    expect(a.state.family.profiles.doudou).toMatchObject({ rewardStars: 0, tickets: 1 });
    const coins = a.state.family.profiles.doudou.coins;
    expect((await send(a, { type: "draw", player: "doudou" })).data.result.kind).toBe("pet");
    expect(a.state.family.profiles.doudou.coins).toBe(coins);
    expect(a.state.verified).toEqual(savedScores);
    await finish(a);
    const third = a.state.family.profiles.doudou.run.id;
    const choice = command(a, { type: "claim-reward", player: "doudou", runId: third, choice: "chance" });
    const rival = { ...choice, id: randomUUID(), command: { ...choice.command, choice: "save" } };
    const competing = await Promise.all([call("command", choice, a), call("command", rival, b)]);
    expect(competing.map(r => r.status).sort()).toEqual([200, 409]);
    const winner = competing.findIndex(r => r.status === 200);
    const replay = await call("command", winner === 0 ? choice : rival, a);
    expect(replay.data.result).toBe(competing[winner].data.result);
    await state(a);
    await finish(a);
    expect(a.state.family.profiles.doudou).toMatchObject({ rewardRounds: 4, run: { reward: "pending" } });
  });
  it.each([false, true])("imports a pending local reward once, retaining stars and resetting only old-day quota (%s)", async (oldDay) => {
    const c = await registration(), snapshot = newFamily();
    const date = oldDay ? "2026-01-01" : taipeiDay();
    startRun(snapshot, "qingqing", "math", "import-pending", 0, false, date);
    for (let i = 0; i < 6; i++) {
      const run = snapshot.profiles.qingqing.run;
      answerRun(snapshot, "qingqing", run.id, i, questionById(run.questions[i]).answer, date);
      if (i < 5) nextQuestion(snapshot, "qingqing", run.id, i);
    }
    snapshot.profiles.qingqing.rewardStars = 1;
    snapshot.profiles.qingqing.run.reward = "pending";
    const body = { id: randomUUID(), revision: 0, snapshot };
    const imported = await call("migrate", body, c);
    expect(imported.status).toBe(200);
    c.state = imported.data;
    expect(c.state.family.profiles.qingqing).toMatchObject({ rewardStars: 1, rewardRounds: oldDay ? 0 : 1, run: { reward: "pending" } });
    expect(c.state.family.profiles.qingqing.run.materials).toBeUndefined();
    expect(c.state.family.profiles.qingqing.learningRewards).toBeUndefined();
    expect((await call("migrate", body, c)).data.replayed).toBe(true);
    const claimed = await send(c, { type: "claim-reward", player: "qingqing", runId: "import-pending", choice: "save" });
    expect(claimed.data.result).toBe("exchanged");
    expect(c.state.family.profiles.qingqing.tickets).toBe(1);
    expect(c.state.verified.qingqing).toBe(0);
    expect(c.state.family.profiles.qingqing.growth.xp).toEqual({});
    expect(c.state.family.profiles.qingqing.run.encounter.earned).toBe(0);
  });
  it("persists adaptive allocation and battle answers through one authoritative transaction path", async () => {
    await state(other);
    const before = structuredClone(other.state.verified);
    const start = command(other, { type: "battle-start", player: "quintus", course: "math", used: [] });
    const pair = await Promise.all([call("command", start, other), call("command", start, other)]);
    expect(pair.map(r => r.status)).toEqual([200, 200]);
    expect(pair[0].data.result).toEqual(pair[1].data.result);
    other.state = pair[0].data;
    const allocation = pair[0].data.result;
    expect(allocation.question.id).toMatch(/^n1-/);
    expect(allocation.question.answer).toBeUndefined();
    expect(allocation.question.explanation).toBeUndefined();
    const input = { type: "battle-answer", player: "quintus", token: allocation.token, question: allocation.question.id, choice: questionById(allocation.question.id).answer };
    expect((await call("command", command(other, {...input, correct: true}), other)).status).toBe(400);
    const answer = command(other, input);
    const result = await call("command", answer, other), replay = await call("command", answer, other);
    expect(result.status).toBe(200);
    expect(replay.data.result).toEqual(result.data.result);
    other.state = result.data;
    const learned = structuredClone(other.state.family.profiles.quintus.learning);
    expect(Object.values(learned.skills).reduce((sum,x) => sum + x.answered, 0)).toBe(1);
    expect(learned.pending).toBeNull();
    expect(other.state.verified).toEqual(before);
    expect((await call("command", command(other, input), other)).status).toBe(400);
    await send(other, { type: "start", player: "quintus", course: "math", practice: true });
    await send(other,{type:'ready-question',player:'quintus',runId:other.state.family.profiles.quintus.run.id,index:0});
    const run = other.state.family.profiles.quintus.run;
    expect(run.questions[0]).not.toBe(allocation.question.id);
    const q = questionById(run.questions[0]);
    await send(other, { type: "hint", player: "quintus", runId: run.id, index: 0 });
    expect(other.state.family.profiles.quintus.run.assisted).toBe(true);
    await send(other, { type: "answer", player: "quintus", runId: run.id, index: 0, choice: q.answer });
    expect(other.state.verified).toEqual(before);
    expect((await state(other)).family.profiles.quintus.learning.cursors).toEqual(other.state.family.profiles.quintus.learning.cursors);
  });
  it("survives full application restart with the same account and receipts", async () => {
    const before = await state(other);
    await new Promise((r) => server.close(r));
    await api.close();
    await open();
    expect((await state(other)).family).toEqual(before.family);
  });
  it("rejects a delayed command body after its session was revoked", async () => {
    const login = await call("login", { username: other.username, password });
    expect(login.status).toBe(200);
    const session = {
      cookie: login.cookie,
      csrf: login.data.csrf,
      state: login.data,
    };
    const before = session.state.family.revision;
    const encoded = JSON.stringify(
      command(session, {
        type: "start",
        player: "quintus",
        course: "math",
        practice: false,
      }),
    );
    const existing = Number(
      (
        await api.pool.query(
          "SELECT coalesce(sum(count),0) AS n FROM request_limits",
        )
      ).rows[0].n,
    );
    let finish;
    const received = new Promise((resolve, reject) => {
      const req = httpRequest(
        url + "/api/command",
        {
          method: "POST",
          headers: {
            Origin: url,
            "Content-Type": "application/json",
            Cookie: session.cookie,
            "X-CSRF-Token": session.csrf,
            "Content-Length": Buffer.byteLength(encoded),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (part) => (data += part));
          res.on("end", () =>
            resolve({ status: res.statusCode, data: JSON.parse(data) }),
          );
        },
      );
      req.on("error", reject);
      req.write(encoded.slice(0, 1));
      finish = () => req.end(encoded.slice(1));
    });
    // Wait until the handler authenticated and reached its body read.
    for (let i = 0; i < 100; i++) {
      const count = Number(
        (
          await api.pool.query(
            "SELECT coalesce(sum(count),0) AS n FROM request_limits",
          )
        ).rows[0].n,
      );
      if (count > existing) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect((await call("logout", {}, session)).status).toBe(200);
    finish();
    expect((await received).status).toBe(401);
    expect((await state(other)).family.revision).toBe(before);
  });
  it("migrates oldest milestone format and can replace a lost recovery code with password confirmation", async () => {
    const old = await registration();
    const snapshot = {
      format: "legacy-academy",
      milestones: JSON.stringify(newFamily().profiles.quintus.milestones),
      equipped: "cloudwhale",
    };
    const migrated = await call(
      "migrate",
      { id: randomUUID(), revision: 0, snapshot },
      old,
    );
    expect(migrated.status).toBe(200);
    expect(migrated.data.legacy).toBe(true);
    const rotated = await call("recovery-code", { password }, old);
    expect(rotated.status).toBe(200);
    expect(rotated.data.recoveryCode).not.toBe(old.recovery);
    expect(
      (
        await call("recover", {
          username: old.username,
          password,
          recoveryCode: old.recovery,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await call("recover", {
          username: old.username,
          password,
          recoveryCode: rotated.data.recoveryCode,
        })
      ).status,
    ).toBe(200);
  });
  it("serves practice questions without bundling answers and awards no persistent points", async () => {
    const before = await state(other);
    const q = await call(
      "practice",
      { type: "start", player: "quintus", used: [] },
      other,
    );
    expect(q.status).toBe(200);
    expect(q.data.answer).toBeUndefined();
    expect(
      (
        await call(
          "practice",
          { type: "answer", question: "wrong", choice: 0 },
          other,
        )
      ).status,
    ).toBe(409);
    const result = await call(
      "practice",
      { type: "answer", question: q.data.id, choice: questionById(q.data.id).answer },
      other,
    );
    expect(result.status).toBe(200);
    expect(Number.isInteger(result.data.answer)).toBe(true);
    const after = (await state(other)).family;
    expect(hasMastered(after.profiles.quintus.learning,q.data.id)).toBe(true);
    expect({...after,revision:before.family.revision,profiles:{...after.profiles,quintus:{...after.profiles.quintus,learning:before.family.profiles.quintus.learning}}}).toEqual(before.family);
    const retry=await call('practice',{type:'answer',question:q.data.id,choice:questionById(q.data.id).answer},other);
    expect(retry.status).toBe(200);expect((await state(other)).family.revision).toBe(after.revision);
  });
  it("rotates one-time recovery code and revokes old device sessions", async () => {
    const r = await call("recover", {
      username: account,
      password: "a-new-test-passphrase-2026",
      recoveryCode: recovery,
    });
    expect(r.status).toBe(200);
    expect(r.data.recoveryCode).not.toBe(recovery);
    expect((await call("state", undefined, a)).status).toBe(401);
    expect((await call("state", undefined, b)).status).toBe(401);
    expect(
      (
        await call("recover", {
          username: account,
          password,
          recoveryCode: recovery,
        })
      ).status,
    ).toBe(401);
    const fresh = { cookie: r.cookie, csrf: r.data.csrf };
    expect((await call("logout", {}, fresh)).status).toBe(200);
    expect((await call("state", undefined, fresh)).status).toBe(401);
  });
});
