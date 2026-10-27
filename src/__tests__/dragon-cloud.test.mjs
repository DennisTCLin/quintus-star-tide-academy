import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createAppServer } from '../../server.mjs';
import { createCloudApi } from '../../server/cloud.mjs';
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('dragon guide authenticated PostgreSQL persistence', () => {
  let api, server, url, a, b, child, calls = [], gate;
  async function call(client, path, body, headers = {}) {
    const response = await fetch(url + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { Origin: url, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(client ? { Cookie: client.cookie, 'X-CSRF-Token': client.csrf } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  const body = (choice = 'sea', revision = 0, player = 'doudou') => ({ id: randomUUID(), player, choice, revision });
  async function register() {
    const username = 'dragon_' + randomUUID().slice(0, 12).replaceAll('-', '');
    const response = await call(null, 'register', { username, password: 'isolated-dragon-2026' });
    expect(response.status).toBe(200);
    const id = (await api.pool.query('SELECT id FROM accounts WHERE username=$1', [username])).rows[0].id;
    return { id, username, cookie: response.cookie, csrf: response.data.csrf };
  }
  beforeAll(async () => {
    api = await createCloudApi({ connectionString: process.env.TEST_DATABASE_URL, production: false, guideProvider: async input => {
      calls.push(input); if (gate) await gate;
      return { reply: ['sea', 'sky', 'forest'].includes(input.choice) ? 'ready' : input.choice, variant: 'warm', line: '我記得你喜歡大海。' };
    } });
    server = createAppServer({ api }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); url = `http://127.0.0.1:${server.address().port}`;
    a = await register(); b = await register();
    const username = 'child_' + randomUUID().slice(0, 12).replaceAll('-', '');
    await api.pool.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) SELECT $1,id,$2,password_hash,$3,$4 FROM accounts WHERE id=$5', [randomUUID(), username, 'doudou', '本機測試孩子', a.id]);
    const login = await call(null, 'login', { username, password: 'isolated-dragon-2026' }); expect(login.status).toBe(200);
    child = { cookie: login.cookie, csrf: login.data.csrf };
  });
  afterAll(async () => { await new Promise(resolve => server.close(resolve)); await api.close(); });
  it('requires auth, CSRF, valid choice and own child slot', async () => {
    expect((await call(null, 'guide?player=doudou')).status).toBe(401);
    expect((await call(a, 'guide', body(), { 'X-CSRF-Token': 'wrong' })).status).toBe(403);
    expect((await call(child, 'guide?player=quintus')).status).toBe(403);
    expect((await call(child, 'guide', body('sea', 0, 'quintus'))).status).toBe(403);
    expect((await call(a, 'guide', { ...body(), name: 'injected' })).status).toBe(400);
    expect((await call(a, 'guide', body('give-coins'))).status).toBe(400);
    expect((await call(a, 'guide', body('feed'))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
  it('replays requests, rejects changed payload and keeps family untouched', async () => {
    const before = (await call(a, 'state')).data.family;
    const request = body(); const first = await call(a, 'guide', request); expect(first.status).toBe(200);
    expect(first.data.source).toBe('ai'); expect(first.data.preference).toBe('sea'); expect(first.data.revision).toBe(1);
    expect((await call(a, 'guide', request)).data).toEqual(first.data);
    expect((await call(a, 'guide', { ...request, choice: 'sky' })).status).toBe(409);
    expect((await call(a, 'state')).data.family).toEqual(before);
    expect((await call(child, 'guide?player=doudou')).data).toEqual(first.data);
    expect((await call(b, 'guide?player=doudou')).data.preference).toBeNull();
    expect((await call(a, 'guide?player=feifei')).data.preference).toBeNull();
    expect(JSON.stringify(calls)).not.toContain('本機測試孩子'); expect(JSON.stringify(calls)).not.toContain(a.id);
  });
  it('serializes competing turns and coalesces same-session retries', async () => {
    let release; gate = new Promise(resolve => { release = resolve; });
    const same = body('sea', 0, 'feifei');
    const replies = [call(a, 'guide', same), call(a, 'guide', same), call(a, 'guide', body('sky', 0, 'feifei'))];
    await new Promise(resolve => setTimeout(resolve, 50)); release(); gate = null;
    const responses = await Promise.all(replies);
    expect(responses[0].status).toBe(responses[1].status); expect(responses[1].data).toEqual(responses[0].data); expect([responses[0].status, responses[2].status].sort()).toEqual([200, 409]);
    expect((await call(a, 'guide?player=feifei')).data.revision).toBe(1);
  });
  it('caps history, preserves preference and reads actual starter result after refresh', async () => {
    for (let revision = 1; revision < 10; revision++) expect((await call(a, 'guide', body('help', revision))).status).toBe(200);
    const saved = (await call(a, 'guide?player=doudou')).data; expect(saved.history).toHaveLength(8); expect(saved.preference).toBe('sea');
    const state = (await call(a, 'state')).data;
    const draw = await call(a, 'command', { id: randomUUID(), revision: state.family.revision, command: { type: 'starter-draw', player: 'doudou' } });
    expect(draw.status).toBe(200);
    const meet = (await call(a, 'guide?player=doudou')).data;
    expect(meet.phase).toBe('meet'); expect(meet.pet).toBe(draw.data.family.profiles.doudou.onboarding.pet);
    expect(meet.line).toBeUndefined(); expect(meet.preference).toBe('sea');
  });
  it('does not retain stale phase claims when the draw finishes during AI generation', async () => {
    let release; gate = new Promise(resolve => { release = resolve; });
    const pending = call(b, 'guide', body());
    await new Promise(resolve => setTimeout(resolve, 30));
    const state = (await call(b, 'state')).data;
    expect((await call(b, 'command', { id: randomUUID(), revision: state.family.revision, command: { type: 'starter-draw', player: 'doudou' } })).status).toBe(200);
    release(); gate = null;
    const result = await pending; expect(result.status).toBe(200); expect(result.data.phase).toBe('meet'); expect(result.data.source).toBe('guided'); expect(result.data.line).toBeUndefined();
  });
  it('persists isolated care turns without changing family, grants or the equipped companion', async () => {
    const state = (await call(a, 'state')).data;
    expect((await call(a, 'command', { id: randomUUID(), revision: state.family.revision, command: { type: 'starter-confirm', player: 'doudou' } })).status).toBe(200);
    const family = (await call(a, 'state')).data.family;
    for (const choice of ['pet', 'feed', 'play']) {
      const prior = (await call(child, 'guide?player=doudou')).data;
      const payload = body(choice, prior.revision);
      const first = await call(child, 'guide', payload);
      expect(first.status).toBe(200); expect(first.data.history.at(-1).choice).toBe(choice);
      expect(first.data.preference).toBe('sea'); expect(first.data.pet).toBe(family.profiles.doudou.equipped);
      expect((await call(child, 'guide', payload)).data).toEqual(first.data);
      expect(calls.at(-1).companion.id).toBe('tideglow');
    }
    expect((await call(a, 'state')).data.family).toEqual(family);
    expect((await call(b, 'guide?player=doudou')).data.history.some(h => ['pet','feed','play'].includes(h.choice))).toBe(false);
  });
});
