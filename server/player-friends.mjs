import { collectionIdentity } from './player-collections.mjs';
import { ensureSchema } from './schema-migration.mjs';
import { hasAdventureHistory } from './presence-history.mjs';

export async function ensurePlayerFriendships(db) {
  await ensureSchema(db, 'player-friendships', `CREATE TABLE IF NOT EXISTS player_friendships (
    member_id uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(member_id, friend_id), CHECK(member_id <> friend_id)
  )`);
}

// Operator-only: explicit member snapshot, never called on signup or from HTTP.
export async function connectCurrentPlayers(pool, memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length < 2 || memberIds.length > 100
    || new Set(memberIds).size !== memberIds.length
    || memberIds.some(id => typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)))
    throw Error('Provide distinct existing member IDs');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-player-friends'))");
    const found = await db.query('SELECT id FROM player_logins WHERE id=ANY($1::uuid[]) FOR SHARE', [memberIds]);
    if (found.rowCount !== memberIds.length) throw Error('Player snapshot changed; no friendships written');
    const result = await db.query(`INSERT INTO player_friendships(member_id,friend_id)
      SELECT a,b FROM unnest($1::uuid[]) a CROSS JOIN unnest($1::uuid[]) b
      WHERE a<>b ON CONFLICT DO NOTHING`, [memberIds]);
    await db.query('COMMIT');
    return { players: memberIds.length, added: result.rowCount };
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

export async function connectedPlayerFriends(pool, user) {
  const { rows } = await pool.query(`
    WITH viewer AS (
      SELECT id FROM player_logins WHERE account_id=$1 AND ($2::uuid IS NULL OR id=$2)
    ), linked AS (
      SELECT f.friend_id AS id FROM player_friendships f JOIN viewer v ON v.id=f.member_id
    ), roster AS (
      SELECT id FROM linked UNION SELECT id FROM player_logins WHERE account_id=$1
    )
    SELECT m.id,m.account_id,m.player_id,m.username,m.display_name,h.seen_at,
      (SELECT count(*) FROM player_logins h WHERE h.account_id=m.account_id) AS household_size,
      (SELECT l.activity FROM presence_leases l JOIN sessions s ON s.token_hash=l.token_hash
       LEFT JOIN player_logins owner ON owner.id=s.member_id AND owner.account_id=s.account_id
       WHERE s.account_id=m.account_id AND l.player_id=m.player_id AND s.expires_at>now()
         AND (s.member_id IS NULL OR owner.id=m.id) AND l.active
         AND l.seen_at>now()-interval '35 seconds' ORDER BY l.seen_at DESC LIMIT 1) AS activity,
      g.family->'profiles'->m.player_id AS profile,
      (SELECT max(l.seen_at)+interval '35 seconds'
       FROM presence_leases l JOIN sessions s ON s.token_hash=l.token_hash
       LEFT JOIN player_logins owner ON owner.id=s.member_id AND owner.account_id=s.account_id
       WHERE s.account_id=m.account_id AND l.player_id=m.player_id
         AND s.expires_at>now() AND (s.member_id IS NULL OR owner.id=m.id)
         AND l.active AND l.seen_at>now()-interval '35 seconds') AS online_until
    FROM roster JOIN player_logins m ON m.id=roster.id
    LEFT JOIN player_last_seen h ON h.account_id=m.account_id AND h.player_id=m.player_id
    LEFT JOIN game_states g ON g.account_id=m.account_id
    ORDER BY m.username,m.id`, [user.id, user.member_id ?? null]);
  if (!rows.length) return null; // Preserve the existing family roster for other accounts.
  return { serverNow: Date.now(), friends: rows.map(row => ({
    key: row.id,
    activity: row.online_until ? row.activity : null,
    id: row.player_id,
    sameAccount: row.account_id === user.id,
    name: row.display_name,
    avatarKey: collectionIdentity({...row,member_id:row.id},user,user.player_id).avatarKey,
    lastSeenAt: row.seen_at?.getTime() ?? null,
    hasActivity: hasAdventureHistory(row.profile),
    onlineUntil: row.online_until?.getTime() ?? null,
  })) };
}
