import { ensureSchema } from './schema-migration.mjs';
import { createHash } from 'node:crypto';
import { PLAYERS, petById, validateFamily, guideFacts, currentGuide, guideAllowedChoices, advanceGuide } from '../build/game.mjs';

export async function createGuideService({ pool, transaction, lockSession, assert, limit, provider }) {
  await ensureSchema(pool, 'dragon-conversations', `
    CREATE TABLE IF NOT EXISTS dragon_conversations (
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      player_id text NOT NULL, state jsonb NOT NULL,
      PRIMARY KEY(account_id,player_id));
    CREATE TABLE IF NOT EXISTS dragon_receipts (
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      player_id text NOT NULL, request_id uuid NOT NULL, fingerprint text NOT NULL,
      response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(account_id,player_id,request_id));
  `);
  function access(user, player) {
    assert(PLAYERS.some(p => p.id === player), '找不到航海員');
    assert(!user.member_id || user.player_id === player, '只能和自己的小龍對話', 403);
  }
  async function state(db, user, player, lock = false) {
    const game = (await db.query(`SELECT family FROM game_states WHERE account_id=$1${lock ? ' FOR SHARE' : ''}`, [user.id])).rows[0];
    const saved = (await db.query(`SELECT state FROM dragon_conversations WHERE account_id=$1 AND player_id=$2${lock ? ' FOR UPDATE' : ''}`, [user.id, player])).rows[0]?.state;
    return currentGuide(saved, guideFacts(validateFamily(game.family).profiles[player]));
  }
  async function receipt(db, user, body, fingerprint) {
    const row = (await db.query('SELECT fingerprint,response FROM dragon_receipts WHERE account_id=$1 AND player_id=$2 AND request_id=$3', [user.id, body.player, body.id])).rows[0];
    if (row) assert(row.fingerprint === fingerprint, '對話已更新，請重新讀取', 409);
    return row?.response;
  }
  const pending = new Map();
  return {
    async read(user, player) { access(user, player); return state(pool, user, player); },
    async turn(user, body) {
      assert(body && typeof body === 'object' && Object.keys(body).sort().join(',') === 'choice,id,player,revision');
      access(user, body.player);
      assert(typeof body.id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.id));
      assert(Number.isSafeInteger(body.revision) && body.revision >= 0 && typeof body.choice === 'string');
      const fingerprint = createHash('sha256').update(JSON.stringify([body.player, body.revision, body.choice])).digest('hex');
      const prior = await receipt(pool, user, body, fingerprint);
      if (prior) return prior;
      // Coalesce only the same authenticated session; another device still revalidates its own session.
      const key = `${user.token_hash}:${body.player}:${body.id}`;
      if (pending.has(key)) {
        assert(pending.get(key).fingerprint === fingerprint, '對話已更新，請重新讀取', 409);
        return pending.get(key).promise;
      }
      const execute = async () => {
        await limit(`guide:${user.id}`, 20, 60);
        const before = await state(pool, user, body.player);
        assert(before.revision === body.revision, '對話已更新，請重新讀取', 409);
        assert(guideAllowedChoices(before).includes(body.choice), '請選擇小龍提供的圖卡');
        // Provider is outside transactions and receives only anonymous, bounded symbolic context.
        let selection = null;
        const companion = ['pet', 'feed', 'play'].includes(body.choice) ? petById('tideglow') : before.pet ? petById(before.pet) : null;
        try { selection = await provider({ phase: before.phase, preference: before.preference, history: before.history, choice: body.choice, companion }); } catch { /* Preserve a useful reviewed reply if the provider fails. */ }
        return transaction(async db => {
          await lockSession(db, user);
          // Session lock alone does not serialize different devices. This also covers first insertion.
          await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`dragon:${user.id}:${body.player}`]);
          const replay = await receipt(db, user, body, fingerprint);
          if (replay) return replay;
          const latest = await state(db, user, body.player, true);
          assert(latest.revision === body.revision, '對話已更新，請重新讀取', 409);
          const changed = latest.phase !== before.phase || latest.pet !== before.pet;
          const next = changed ? { ...latest, revision: latest.revision + 1 } : advanceGuide(latest, body.choice, selection ?? undefined);
          await db.query('INSERT INTO dragon_conversations(account_id,player_id,state) VALUES($1,$2,$3) ON CONFLICT(account_id,player_id) DO UPDATE SET state=EXCLUDED.state', [user.id, body.player, next]);
          await db.query('INSERT INTO dragon_receipts(account_id,player_id,request_id,fingerprint,response) VALUES($1,$2,$3,$4,$5)', [user.id, body.player, body.id, fingerprint, next]);
          await db.query("DELETE FROM dragon_receipts WHERE account_id=$1 AND player_id=$2 AND created_at<now()-interval '1 day'", [user.id, body.player]);
          return next;
        });
      };
      const promise = execute(); pending.set(key, { fingerprint, promise });
      try { return await promise; } finally { pending.delete(key); }
    },
  };
}
