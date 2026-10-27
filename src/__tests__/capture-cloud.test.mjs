import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
const rng = vi.hoisted(() => ({ value: 0 }));
vi.mock("node:crypto", async importOriginal => ({ ...await importOriginal(), randomInt: (_min, max) => Math.min(rng.value, max - 1) }));
import { randomUUID } from "node:crypto";
import { createAppServer } from "../../server.mjs";
import { createCloudApi } from "../../server/cloud.mjs";
import { newFamily, startRun, answerRun, nextQuestion, questionById, taipeiDay, MONSTER_CATALOG } from "../../build/game.mjs";

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("capture transactions, legacy receipts and three-question guarantees (PostgreSQL)", () => {
  let api, server, url;
  const password = "capture-isolated-test-password-2026";
  async function call(path, body, client) {
    const response = await fetch(url + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { Origin: url, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(client ? { Cookie: client.cookie, "X-CSRF-Token": client.csrf } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  async function client() {
    rng.value = 0;
    const username = "cap_" + randomUUID().replaceAll("-", "").slice(0, 16);
    const res = await call("register", { username, password }); expect(res.status).toBe(200);
    return { username, cookie: res.cookie, csrf: res.data.csrf, state: res.data };
  }
  async function state(c) { const res = await call("state", undefined, c); expect(res.status).toBe(200); c.state = res.data; return res.data; }
  async function seed(c, alter = () => {}) {
    const family = newFamily(), day = taipeiDay();
    startRun(family, "quintus", "math", randomUUID(), 0, false, day);
    for (let i = 0; i < 5; i++) { const r = family.profiles.quintus.run; answerRun(family, "quintus", r.id, i, questionById(r.questions[i]).answer, day); nextQuestion(family, "quintus", r.id, i); }
    // Most cases below explicitly protect persisted pre-upgrade fights.
    delete family.profiles.quintus.run.captureRule;
    alter(family);
    await api.pool.query("UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)", [c.username, family]);
    await state(c);
  }
  function command(c, cmd, id = randomUUID()) { return { id, revision: c.state.family.revision, command: { player: "quintus", ...cmd } }; }
  function lastAnswer(c) { const r = c.state.family.profiles.quintus.run; return command(c, { type: "answer", runId: r.id, index: 5, choice: questionById(r.questions[5]).answer }); }
  beforeAll(async () => {
    api = await createCloudApi({ connectionString: process.env.TEST_DATABASE_URL, production: false });
    // Each serial integration suite starts with its own rate-limit window.
    await api.pool.query("DELETE FROM request_limits");
    server = createAppServer({ api }); await new Promise(r => server.listen(0, "127.0.0.1", r)); url = `http://127.0.0.1:${server.address().port}`;
  }, 30000);
  afterAll(async () => { await new Promise(r => server.close(r)); await api.close(); });

  it("hides future capture questions and commits three correct answers exactly once across competing devices",async()=>{
    const c=await client();await seed(c,f=>f.profiles.quintus.run.captureRule='three-correct-v1');
    const finish=await call('command',lastAnswer(c),c);expect(finish.status).toBe(200);c.state=finish.data;
    const run=c.state.family.profiles.quintus.run,monster=run.encounter.variant;
    expect(run.capture.outcome).toBe('pending');expect(c.state.family.profiles.quintus.owned[monster]).toBeUndefined();
    expect(finish.data.captureReceipt.trial.questions).toEqual(['','','']);
    const reward=structuredClone(c.state.family.profiles.quintus);
    for(let i=0;i<3;i++){
      const stateRun=c.state.family.profiles.quintus.run,q=c.state.captureQuestions[run.id];
      expect(stateRun.capture.trial.questions.filter(Boolean)).toEqual([q.id]);
      for(const key of ['answer','explanation','target'])expect(q).not.toHaveProperty(key);
      const body=command(c,{type:'capture-answer',source:'voyage',runId:run.id,index:i,choice:questionById(q.id).answer});
      const forged=await call('command',{...body,command:{...body.command,correct:true}},c);expect(forged.status).toBe(400);
      const responses=await Promise.all([call('command',body,c),call('command',i===1?{...body,id:randomUUID()}:body,c)]);
      expect(responses.map(r=>r.status).sort()).toEqual(i===1?[200,409]:[200,200]);
      await state(c);
      expect(c.state.family.profiles.quintus.run.capture.trial.answers).toHaveLength(i+1);
      expect(c.state.family.profiles.quintus.owned[monster]??0).toBe(i===2?1:0);
    }
    const p=c.state.family.profiles.quintus;expect(p.run.capture.outcome).toBe('joined');
    for(const k of ['coins','tickets','growth','rewardStars','rewardRounds','learning'])expect(p[k]).toEqual(reward[k]);
    const replay=await call('command',command(c,{type:'capture-answer',source:'voyage',runId:run.id,index:2,choice:0}),c);expect(replay.status).toBe(400);
    const login=await call('login',{username:c.username,password});expect(login.data.family.profiles.quintus.owned[monster]).toBe(1);
  });
  it("persists a wrong capture answer without retry, keeps rewards and isolates another account",async()=>{
    const c=await client();await seed(c,f=>f.profiles.quintus.run.captureRule='three-correct-v1');
    c.state=(await call('command',lastAnswer(c),c)).data;
    const r=c.state.family.profiles.quintus.run,q=c.state.captureQuestions[r.id],before=structuredClone(c.state.family.profiles.quintus);
    expect((await call('command',command(c,{type:'start',course:'math',practice:false}),c)).status).toBe(400);
    const other=await client();const cmd={type:'capture-answer',source:'voyage',runId:r.id,index:0,choice:(questionById(q.id).answer+1)%q.options.length};
    expect((await call('command',command(other,cmd),other)).status).toBe(400);
    const wrong=await call('command',command(c,cmd),c);expect(wrong.status).toBe(200);c.state=wrong.data;
    const p=c.state.family.profiles.quintus;expect(p.run.capture.outcome).toBe('escaped');expect(p.owned).toEqual(before.owned);expect(p.coins).toBe(before.coins);
    expect((await call('command',command(c,{...cmd,choice:questionById(q.id).answer}),c)).status).toBe(400);
    expect((await state(c)).family.profiles.quintus.run.capture.outcome).toBe('escaped');
  });
  it("compensates legacy mastery once across concurrent commands, reads and another device", async () => {
    const c=await client(), old=newFamily();old.version=6;
    old.profiles.quintus.coins=7;old.profiles.quintus.milestones.masteryPoints=39;
    for(const p of Object.values(old.profiles)) delete p.masteryConversion;
    await api.pool.query("UPDATE game_states SET family=$2 WHERE account_id=(SELECT id FROM accounts WHERE username=$1)",[c.username,old]);
    for(let i=0;i<3;i++) expect((await state(c)).family.profiles.quintus.coins).toBe(17);
    const payload=command(c,{type:"equip",pet:"tideglow"});
    const replies=await Promise.all([call("command",payload,c),call("command",payload,c)]);
    expect(replies.map(r=>r.status)).toEqual([200,200]);
    for(const r of replies) {
      expect(r.data.family.profiles.quintus.coins).toBe(17);
      expect(r.data.family.profiles.quintus.masteryConversion).toEqual({version:1,points:39,coins:10});
      expect(r.data.verified.quintus).toBe(0);
    }
    const login=await call("login",{username:c.username,password});expect(login.status).toBe(200);
    expect(login.data.family.profiles.quintus.coins).toBe(17);
    const raw=(await api.pool.query("SELECT family FROM game_states WHERE account_id=(SELECT id FROM accounts WHERE username=$1)",[c.username])).rows[0].family;
    expect(raw.version).toBe(9);expect(raw.profiles.quintus.coins).toBe(17);
    await state(c);
    const started=await call("command",command(c,{type:"start",course:"math",practice:false}),c);c.state=started.data;
    const preparation=c.state.family.profiles.quintus.run;
    const ready=await call('command',command(c,{type:'ready-question',runId:preparation.id,index:0}),c);expect(ready.status).toBe(200);c.state=ready.data;
    const r=c.state.family.profiles.quintus.run,q=questionById(r.questions[0]);
    const answer=await call("command",command(c,{type:"answer",runId:r.id,index:0,choice:q.answer}),c);
    expect(answer.status).toBe(200);expect(answer.data.family.profiles.quintus.coins).toBe(27);
    expect((await state(c)).family.profiles.quintus.masteryConversion.points).toBe(39);
    expect(c.state.verified.quintus).toBe(20);
  });
  it("persists third-mistake defeat once across concurrent replay and a second device", async () => {
    const c = await client();
    await seed(c, f => {
      const p = f.profiles.quintus;
      // Keep prior learned XP, but start a fresh six-question challenge.
      p.run = null; startRun(f, "quintus", "math", randomUUID(), 1, false, taipeiDay());
      for (const correct of [false, true, false, true]) {
        const r = p.run, q = questionById(r.questions[r.index]);
        answerRun(f, "quintus", r.id, r.index, correct ? q.answer : (q.answer + 1) % q.options.length, taipeiDay());
        nextQuestion(f, "quintus", r.id, r.index);
      }
    });
    const before = structuredClone(c.state.family.profiles.quintus), r = before.run;
    const q = questionById(r.questions[r.index]);
    const body = command(c, {type: "answer", runId: r.id, index: r.index, choice: (q.answer + 1) % q.options.length});
    const responses = await Promise.all([call("command", body, c), call("command", body, c)]);
    expect(responses.map(r => r.status)).toEqual([200, 200]);
    for (const res of responses) {
      const p = res.data.family.profiles.quintus;
      expect(p.run).toMatchObject({status: "failed", settled: true, streak: 3, answers: [false, true, false, true, false], reward: "none"});
      expect(p.run.capture).toBeUndefined(); expect(p.captureQuota).toBeUndefined();
      expect(p.owned).toEqual(before.owned); expect(p.growth).toEqual(before.growth);
      expect(p.rewardRounds).toBe(before.rewardRounds); expect(p.tickets).toBe(before.tickets);
    }
    const login = await call("login", {username: c.username, password});
    const other = {cookie: login.cookie, csrf: login.data.csrf};
    const reloaded = await call("state", undefined, other);
    expect(reloaded.data.family.profiles.quintus.run).toEqual(responses[0].data.family.profiles.quintus.run);
    c.state = reloaded.data;
    for (const cmd of [{type: "next", runId:r.id, index:r.index}, {type:"answer", runId:r.id, index:r.index, choice:q.answer}, {type:"claim-reward", runId:r.id, choice:"save"}]) {
      expect((await call("command", command(c, cmd), c)).status).toBe(400);
    }
  });
  it("does not double-count a wrong answer submitted with competing request IDs", async () => {
    const c = await client(); await seed(c);
    const r = c.state.family.profiles.quintus.run, q = questionById(r.questions[r.index]);
    const body = command(c, {type: "answer", runId:r.id, index:r.index, choice:(q.answer+1)%q.options.length});
    const raced = await Promise.all([call("command", body, c), call("command", {...body, id:randomUUID()}, c)]);
    expect(raced.map(r=>r.status).sort()).toEqual([200,409]);
    const p = (await state(c)).family.profiles.quintus;
    expect(p.run.streak).toBe(1); expect(p.run.answers.filter(x=>!x)).toHaveLength(1);
  });
  it("commits capture, quota and ownership once across concurrent receipt replay and another login", async () => {
    const c = await client(); await seed(c); const body = lastAnswer(c), monster = c.state.family.profiles.quintus.run.encounter.variant;
    const responses = await Promise.all([call("command", body, c), call("command", body, c)]);
    expect(responses.map(r => r.status)).toEqual([200, 200]);
    for (const res of responses) {
      const p = res.data.family.profiles.quintus;
      expect(p.run.capture).toMatchObject({ monster, outcome: "joined", copies: 1 });
      expect(p.owned[monster]).toBe(1); expect(p.captureQuota.attempts).toBe(1);
    }
    await state(c);
    const denied = await call("command", { ...lastAnswer(c), id: randomUUID() }, c);
    expect(denied.status).toBe(400);
    const login = await call("login", { username: c.username, password }); expect(login.status).toBe(200);
    const other = { cookie: login.cookie, csrf: login.data.csrf };
    const otherState = await call("state", undefined, other);
    expect(otherState.data.family.profiles.quintus.run.capture).toEqual(c.state.family.profiles.quintus.run.capture);
    const equipped = await call("command", command(c, { type: "equip", pet: monster }), c); expect(equipped.status).toBe(200);
    expect(equipped.data.family.profiles.quintus.equipped).toBe(monster); c.state = equipped.data;
    const territory = await call("command", command(c, { type: "territory", action: "start" }), c); expect(territory.status).toBe(200); c.state = territory.data;
    const resident = await call("command", command(c, { type: "territory", action: "resident", building: 1, pet: monster }), c);
    expect(resident.status).toBe(200); expect(resident.data.family.profiles.quintus.territory.buildings[0].resident).toBe(monster);
    c.state = resident.data;
    expect(c.state.family.profiles.quintus.run.reward).toBe("saved");
    const started = await call("command", command(c, { type: "start", course: "math", practice: false }), c); expect(started.status).toBe(200); c.state = started.data;
    const replay = await call("command", body, c);
    expect(replay.data.result).toBe(true);
    expect(replay.data.family.profiles.quintus.run.id).not.toBe(body.command.runId);
    expect(replay.data.family.profiles.quintus.owned[monster]).toBe(1);
    expect(replay.data.captureReceipt).toEqual(responses[0].data.captureReceipt);
    expect(replay.data.captureReceipt).toMatchObject({ runId: body.command.runId, monster, outcome: "joined", copies: 1 });
  });
  it("rejects a competing request ID and all client-authored capture fields", async () => {
    const c = await client(); await seed(c); const body = lastAnswer(c);
    const forged = await call("command", { ...body, command: { ...body.command, captureRoll: 0 } }, c); expect(forged.status).toBe(400);
    const raced = await Promise.all([call("command", body, c), call("command", { ...body, id: randomUUID() }, c)]);
    expect(raced.map(r => r.status).sort()).toEqual([200, 409]);
    const p = (await state(c)).family.profiles.quintus;
    expect(p.captureQuota.attempts).toBe(1); expect(p.owned[p.run.encounter.variant]).toBe(1);
  });
  it("persists misses without rerolling and still allows a fourth capture", async () => {
    const c = await client(); await seed(c); const body = lastAnswer(c); rng.value = 2 ** 32 - 1;
    const miss = await call("command", body, c); expect(miss.status).toBe(200);
    expect(miss.data.family.profiles.quintus.run.capture.outcome).toBe("escaped");
    rng.value = 0;
    expect((await call("command", body, c)).data.family.profiles.quintus.run.capture.outcome).toBe("escaped");
    await seed(c, s => { s.profiles.quintus.captureQuota = { day: taipeiDay(), attempts: 3 }; });
    const exhausted = await call("command", lastAnswer(c), c);
    expect(exhausted.status).toBe(200); expect(exhausted.data.family.profiles.quintus.run.capture.outcome).toBe("joined");
    expect(exhausted.data.family.profiles.quintus.captureQuota.attempts).toBe(4);
  });
  it("preserves legacy fights and rejects forged monster import atomically", async () => {
    const c = await client(); await seed(c, s => { delete s.profiles.quintus.run.encounter.combat; delete s.profiles.quintus.run.encounter.route; });
    const res = await call("command", lastAnswer(c), c); expect(res.status).toBe(200);
    expect(res.data.family.profiles.quintus.run.capture.reason).toBe("legacy");
    const fresh = await client(), snapshot = newFamily(), monster = MONSTER_CATALOG[0].id;
    snapshot.profiles.quintus.owned[monster] = 1; snapshot.profiles.quintus.firstAcquired[monster] = taipeiDay();
    const rejected = await call("migrate", { id: randomUUID(), revision: 0, snapshot }, fresh);
    expect(rejected.status).toBe(400);
    const after = await state(fresh); expect(after.family.revision).toBe(0); expect(after.family.profiles.quintus.owned[monster]).toBeUndefined();
    const row = await api.pool.query("SELECT legacy_archive FROM game_states WHERE account_id=(SELECT id FROM accounts WHERE username=$1)", [fresh.username]);
    expect(row.rows[0].legacy_archive).toBeNull();
  });
});
