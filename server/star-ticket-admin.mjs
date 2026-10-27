import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { validateFamily } from '../build/game.mjs';
import { ensureSchema } from './schema-migration.mjs';

const grantError = message => Object.assign(new Error(message), {status:400});
const validatedProgress = family => {try {return validateFamily(family);} catch {throw grantError('玩家進度格式不正確，未發券');}};

// CLI operators use database access; the authenticated admin API supplies a
// transaction-level authorization check. This module is never browser-imported.
export async function grantTickets(pool, input, { apply = false, authorize, authorizeTarget } = {}) {
  const { grantId, username, amount, reason, operator, ticketType = 'star' } = input;
  if (ticketType!=='standard' && ticketType!=='star') throw grantError('券別不正確，未發券');
  const balance = ticketType === 'standard' ? 'tickets' : 'starTickets';
  const maxBalance = ticketType === 'standard' ? 10000000 : 10000;
  if (typeof grantId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(grantId) ||
      typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(username) ||
      !Number.isSafeInteger(amount) || amount < 1 || amount > 100 ||
      typeof reason !== 'string' || !reason.trim() || reason.length > 200 ||
      typeof operator !== 'string' || !operator.trim() || operator.length > 80) throw grantError('需要有效發放編號、玩家帳號、1–100 張、原因與管理員名稱');
  const normalizedId = grantId.toLowerCase();
  const payload = { ticketType, username: username.toLowerCase(), amount, reason: reason.trim(), operator: operator.trim() };
  if (apply) await ensureSchema(pool, 'star-ticket-grants', `CREATE TABLE IF NOT EXISTS star_ticket_grants (
    grant_id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), member_id uuid NOT NULL,
    payload jsonb NOT NULL, receipt jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    if (authorize) await authorize(db);
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['star-ticket-grant:' + normalizedId]);
    const ledgerExists = apply || (await db.query("SELECT to_regclass('star_ticket_grants') AS name")).rows[0]?.name;
    if (ledgerExists) {
      const old = (await db.query('SELECT payload,receipt,member_id FROM star_ticket_grants WHERE grant_id=$1', [normalizedId])).rows[0];
      if (old) {
        if (authorizeTarget) await authorizeTarget(db,old.member_id);
        if (Object.keys(payload).some(key => (key==='ticketType' ? old.payload[key] ?? 'star' : old.payload[key]) !== payload[key])) throw grantError('發放編號已用於不同內容，未重複發券');
        await db.query('COMMIT');
        return { ...old.receipt, ticketType:old.payload.ticketType ?? 'star', preview: !apply, replayed: true };
      }
    }
    // Resolve the real login, never a shared grade/profile name such as quintus.
    const member = (await db.query('SELECT id,account_id,player_id,display_name FROM player_logins WHERE username=$1 FOR SHARE', [payload.username])).rows[0];
    if (!member) throw grantError('找不到玩家登入帳號，未發券');
    if (authorizeTarget) await authorizeTarget(db,member.id);
    const row = (await db.query('SELECT family FROM game_states WHERE account_id=$1 FOR UPDATE', [member.account_id])).rows[0];
    if (!row) throw grantError('玩家進度不存在，未發券');
    const validated = validatedProgress(row.family), before = validated.profiles[member.player_id][balance];
    if (before + amount > maxBalance) throw grantError('所選券別餘額超過上限，未發券');
    // Keep the raw state unchanged apart from balance/revision; validation must
    // not incidentally upgrade unrelated players during an administrative grant.
    const family = structuredClone(row.family);
    family.profiles[member.player_id][balance] = before + amount;
    family.revision++;
    validatedProgress(family);
    const receipt = { grantId: normalizedId, ...payload, displayName: member.display_name, playerId: member.player_id, before, after: before + amount, revision: family.revision };
    if (apply) {
      await db.query('UPDATE game_states SET family=$2,updated_at=now() WHERE account_id=$1', [member.account_id, family]);
      await db.query('INSERT INTO star_ticket_grants(grant_id,account_id,member_id,payload,receipt) VALUES($1,$2,$3,$4,$5)', [normalizedId, member.account_id, member.id, payload, receipt]);
    }
    await db.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { ...receipt, preview: !apply, replayed: false };
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

// Keep the existing operator CLI/import contract specifically for star tickets.
export function grantStarTickets(pool,input,options) {
  if(input.ticketType!==undefined && input.ticketType!=='star') throw grantError('此工具僅支援星耀券');
  return grantTickets(pool,{...input,ticketType:'star'},options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let pool;
  try {
    const args = process.argv.slice(2), values = {}, allowed = new Set(['grant-id','username','amount','reason','operator']);
    let apply = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--apply') { if (apply) throw Error('重複 --apply'); apply = true; continue; }
      const key = args[i].replace(/^--/, '');
      if (!args[i].startsWith('--') || !allowed.has(key) || key in values || !args[i+1] || args[i+1].startsWith('--')) throw Error('參數格式不正確');
      values[key] = args[++i];
    }
    if (!process.env.DATABASE_URL) throw Error('需要管理員 DATABASE_URL');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const result = await grantStarTickets(pool, { grantId: values['grant-id'], username: values.username, amount: Number(values.amount), reason: values.reason, operator: values.operator }, { apply });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // Avoid printing connection strings or SQL error details to operator logs.
    console.error(error.code ? '資料庫操作失敗，未確認發券；請用原發放編號重試。' : error.message);
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
