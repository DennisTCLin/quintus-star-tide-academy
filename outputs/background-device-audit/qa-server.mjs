// Local, synthetic accounts only. This fixture is never part of the production server.
import { randomUUID, createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { passwordHash } from '../../server/credentials.mjs';
import { connectCurrentPlayers } from '../../server/player-friends.mjs';
import { newFamily } from '../../build/game.mjs';
const connectionString = 'postgresql://127.0.0.1:55432/star_tide_background_qa_20261025';
const api = await createCloudApi({ connectionString, production: false });
const players = [], password = randomUUID(), hash = await passwordHash(password, undefined, 4);
for (const [i, player] of ['feifei', 'doudou'].entries()) {
  const account = randomUUID(), member = randomUUID(), username = 'deviceqa_' + randomUUID().slice(0, 8);
  const family = newFamily();
  const display = ['測試手機航海員', '測試平板航海員'][i];
  await api.pool.query('INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)', [account, username, hash, '0'.repeat(64)]);
  await api.pool.query('INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)', [account, family, {}]);
  await api.pool.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,$5,$6)', [member, account, username, hash, player, display]);
  players.push({ account, member, username, player, display });
}
await connectCurrentPlayers(api.pool, players.map(p => p.member));
const digest = async () => createHash('sha256').update(JSON.stringify((await api.pool.query('SELECT account_id,family FROM game_states WHERE account_id=ANY($1::uuid[]) ORDER BY account_id', [players.map(p => p.account)])).rows)).digest('hex');
const baseline = await digest();
const app = createAppServer({ api }).listeners('request')[0];
const server = createServer(async (req, res) => {
  if (req.url === '/qa/expire' && req.method === 'POST') {
    await api.pool.query("UPDATE online_battles SET deadline=now()-interval '1 second' WHERE host=ANY($1::uuid[]) AND guest=ANY($1::uuid[]) AND status='active'", [players.map(p => p.member)]);
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true })); return;
  }
  if (req.url === '/qa/evidence') {
    const rows = (await api.pool.query('SELECT id,status,revision,battle FROM online_battles WHERE host=ANY($1::uuid[]) ORDER BY created_at', [players.map(p => p.member)])).rows;
    const receipts = (await api.pool.query('SELECT room,member,id,payload FROM online_battle_commands WHERE member=ANY($1::uuid[])', [players.map(p => p.member)])).rows;
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ learningUnchanged: baseline === await digest(), rooms: rows, receipts })); return;
  }
  app(req, res);
});
await new Promise(r => server.listen(4314, '127.0.0.1', r));
writeFileSync('/tmp/background-device-qa-access.json', JSON.stringify({ base: 'http://127.0.0.1:4314', password, players }), { mode: 0o600 });
console.log('Local synthetic two-member QA ready on port 4314');
async function close() { server.close(); await api.close(); process.exit(0); }
process.on('SIGINT', close); process.on('SIGTERM', close);
