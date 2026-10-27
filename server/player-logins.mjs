import { randomUUID } from 'node:crypto';
import { passwordHash, passwordMatches } from './credentials.mjs';

// Operator-only provisioning. No HTTP route exposes this function or its inputs.
// The existing household and all game JSON/receipts remain untouched.
export async function provisionPlayerLogins(pool, accountId, entries) {
  const ids = new Set(['quintus', 'doudou', 'qingqing', 'feifei']);
  if (!Array.isArray(entries) || entries.length !== 4 ||
      new Set(entries.map(e => e.playerId)).size !== 4 ||
      new Set(entries.map(e => String(e.username).toLowerCase())).size !== 4 ||
      entries.some(e => !ids.has(e.playerId) || !/^[a-zA-Z0-9_]{3,32}$/.test(e.username) ||
        typeof e.password !== 'string' || !/^\d{4}$/.test(e.password) ||
        typeof e.displayName !== 'string' || !e.displayName.trim() || e.displayName.length > 80)) {
    throw Error('Provide four distinct player identities, each with a four-digit string password and display name');
  }
  // Derive sequentially to bound scrypt memory before acquiring database locks.
  const prepared = [];
  for (const e of entries) prepared.push({ ...e, username: e.username.toLowerCase(), passwordHash: await passwordHash(e.password, undefined, 4) });
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-player-logins'))");
    const owner = await db.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE', [accountId]);
    const state = await db.query('SELECT account_id FROM game_states WHERE account_id=$1 FOR SHARE', [accountId]);
    if (owner.rowCount !== 1 || state.rowCount !== 1) throw Error('Existing household and game state required');
    const result = [];
    for (const e of prepared) {
      const collision = await db.query('SELECT id FROM accounts WHERE username=$1', [e.username]);
      if (collision.rowCount) throw Error('Login name already belongs to a household account');
      const rows = (await db.query('SELECT * FROM player_logins WHERE username=$1 OR (account_id=$2 AND player_id=$3) FOR UPDATE', [e.username, accountId, e.playerId])).rows;
      if (rows.some(r => r.account_id !== accountId || r.player_id !== e.playerId || r.username !== e.username)) throw Error('Refusing to reassign an existing player identity');
      const existing = rows[0];
      if (existing) {
        const unchanged = existing.display_name === e.displayName && await passwordMatches(e.password, existing.password_hash);
        if (!unchanged) {
          await db.query('UPDATE player_logins SET password_hash=$2,display_name=$3 WHERE id=$1', [existing.id, e.passwordHash, e.displayName]);
          await db.query('DELETE FROM sessions WHERE member_id=$1', [existing.id]);
        }
        result.push({ username: e.username, playerId: e.playerId, changed: !unchanged });
      } else {
        await db.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), accountId, e.username, e.passwordHash, e.playerId, e.displayName]);
        result.push({ username: e.username, playerId: e.playerId, changed: true });
      }
    }
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}
