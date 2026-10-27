import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { passwordHash, passwordMatches } from './credentials.mjs';
import { newOnboardingFamily, PLAYERS } from '../build/game.mjs';

// Operator-only. Never reset or adopt an existing player's data.
export async function provisionChildAccount(pool, { username, password, displayName, grade }) {
  const player = PLAYERS.find(p => p.grade === grade);
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(username) ||
      typeof password !== 'string' || !/^\d{4}$/.test(password) ||
      typeof displayName !== 'string' || !displayName.trim() || displayName.length > 80 || !player) {
    throw Error('Valid child identity, four-digit string password and supported grade required');
  }
  username = username.toLowerCase();
  const childHash = await passwordHash(password, undefined, 4);
  const ownerHash = await passwordHash(randomBytes(32).toString('hex'));
  const recoveryHash = createHash('sha256').update(randomBytes(32)).digest('hex');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-player-logins'))");
    if ((await db.query('SELECT id FROM accounts WHERE username=$1', [username])).rowCount) {
      throw Error('Login name already belongs to a household account');
    }
    const existing = (await db.query('SELECT * FROM player_logins WHERE username=$1 FOR UPDATE', [username])).rows[0];
    if (existing) {
      const count = (await db.query('SELECT count(*) FROM player_logins WHERE account_id=$1', [existing.account_id])).rows[0].count;
      const state = await db.query('SELECT account_id FROM game_states WHERE account_id=$1 FOR SHARE', [existing.account_id]);
      if (existing.player_id !== player.id || existing.display_name !== displayName || count !== '1' ||
          state.rowCount !== 1 || !await passwordMatches(password, existing.password_hash)) {
        throw Error('Refusing to change an existing player identity');
      }
      await db.query('COMMIT');
      return { accountId: existing.account_id, memberId: existing.id, playerId: player.id, created: false };
    }
    const accountId = randomUUID(), memberId = randomUUID();
    await db.query('INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',
      [accountId, 'child_' + randomBytes(10).toString('hex'), ownerHash, recoveryHash]);
    await db.query('INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)',
      [accountId, newOnboardingFamily(), Object.fromEntries(PLAYERS.map(p => [p.id, 0]))]);
    await db.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$2,$3,$4,$5,$6)',
      [memberId, accountId, username, childHash, player.id, displayName]);
    await db.query('COMMIT');
    return { accountId, memberId, playerId: player.id, created: true };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}
