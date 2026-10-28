import {randomUUID, randomBytes, createHash} from 'node:crypto';
import {passwordHash} from './credentials.mjs';
import {ensureSchema} from './schema-migration.mjs';
import {TRIAL_CURRICULA} from './trial-curricula.mjs';
import {newOnboardingFamily, PLAYERS, COURSES, validateFamily, drawStarter, confirmStarter, taipeiDay} from '../build/game.mjs';

const need = (ok, message, status = 400) => { if (!ok) throw Object.assign(new Error(message), {status}); };

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return code;
}

export async function ensureInviteSchema(pool) {
  await ensureSchema(pool, 'invite-codes-v1', `
    CREATE TABLE IF NOT EXISTS invite_codes(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text UNIQUE NOT NULL,
      grade integer NOT NULL,
      school text,
      label text NOT NULL,
      max_uses integer NOT NULL DEFAULT 1,
      used_count integer NOT NULL DEFAULT 0,
      created_by uuid REFERENCES admin_users(id),
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS invite_redemptions(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invite_id uuid NOT NULL REFERENCES invite_codes(id),
      account_id uuid NOT NULL REFERENCES accounts(id),
      member_id uuid NOT NULL REFERENCES player_logins(id),
      username text NOT NULL,
      display_name text NOT NULL,
      redeemed_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function createInviteCode(pool, {grade, label, maxUses, expiresInDays}, authorize) {
  need(TRIAL_CURRICULA.some(t => t.grade === grade), '這個年級尚未開放');
  need(typeof label === 'string' && label.trim().length >= 1 && label.trim().length <= 100, '請輸入邀請說明（1–100字）');
  need(Number.isSafeInteger(maxUses) && maxUses >= 1 && maxUses <= 200, '使用次數須為 1–200');
  need(Number.isSafeInteger(expiresInDays) && expiresInDays >= 1 && expiresInDays <= 90, '有效天數須為 1–90');

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const admin = await authorize(db);
    need(admin.role === 'super_admin' && !admin.must_change_password, '只有超級管理員能建立邀請碼', 403);

    let code;
    for (let attempt = 0; attempt < 10; attempt++) {
      code = generateCode();
      const exists = await db.query('SELECT id FROM invite_codes WHERE code=$1', [code]);
      if (exists.rowCount === 0) break;
      if (attempt === 9) throw new Error('邀請碼產生失敗，請重試');
    }

    const row = (await db.query(
      `INSERT INTO invite_codes(code, grade, school, label, max_uses, created_by, expires_at)
       VALUES($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval) RETURNING *`,
      [code, grade, TRIAL_CURRICULA.find(t => t.grade === grade)?.school ?? null,
       label.trim(), maxUses, admin.id, String(expiresInDays)]
    )).rows[0];

    await db.query('INSERT INTO admin_access_audit(id, actor_id, target_id, action, details) VALUES($1,$2,$2,$3,$4)',
      [randomUUID(), admin.id, 'invite_code_created', {code, grade, label: label.trim(), maxUses, expiresInDays}]);

    await db.query('COMMIT');
    return {id: row.id, code: row.code, grade: row.grade, label: row.label, maxUses: row.max_uses, usedCount: 0, expiresAt: row.expires_at.toISOString(), createdAt: row.created_at.toISOString()};
  } catch (e) { await db.query('ROLLBACK'); throw e; }
  finally { db.release(); }
}

export async function redeemInviteCode(pool, {code, username, password, displayName}, newSession) {
  need(typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code.toUpperCase()), '邀請碼格式不正確');
  need(typeof username === 'string' && /^[a-zA-Z0-9_]{3,32}$/.test(username), '帳號須為 3–32 個英文字母、數字或底線');
  need(typeof password === 'string' && /^\d{4}$/.test(password), '請設定四位數字密碼');
  need(typeof displayName === 'string' && displayName.trim().length >= 1 && displayName.trim().length <= 50, '請輸入 1–50 字的顯示名稱');

  const normalCode = code.toUpperCase();
  username = username.toLowerCase();
  const childHash = await passwordHash(password, undefined, 4);
  const ownerHash = await passwordHash(randomBytes(32).toString('hex'));

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-player-logins'))");

    const invite = (await db.query(
      'SELECT * FROM invite_codes WHERE code=$1 AND expires_at > now() FOR UPDATE', [normalCode]
    )).rows[0];
    need(invite, '邀請碼不存在或已過期', 404);
    need(invite.used_count < invite.max_uses, '這組邀請碼已達使用上限', 410);

    const collision = await db.query(
      'SELECT id FROM accounts WHERE username=$1 UNION ALL SELECT id FROM player_logins WHERE username=$1',
      [username]
    );
    need(collision.rowCount === 0, '這個帳號已有人使用，請換一個', 409);

    const template = TRIAL_CURRICULA.find(t => t.grade === invite.grade);
    need(template, '這個年級尚未開放');

    const family = newOnboardingFamily();
    const p = family.profiles[template.playerId];
    p.learning.school = invite.school ?? template.school;
    p.coins = 2000;
    p.tickets = 5;
    p.starTickets = 1;
    family.log = [{id: randomUUID(), time: Date.now(), text: `歡迎加入星潮學院！透過邀請碼加入。`}];
    validateFamily(structuredClone(family));

    const accountId = randomUUID(), memberId = randomUUID();
    await db.query('INSERT INTO accounts(id, username, password_hash, recovery_hash) VALUES($1,$2,$3,$4)',
      [accountId, 'invited_' + randomBytes(10).toString('hex'), ownerHash,
       createHash('sha256').update(randomBytes(32)).digest('hex')]);
    await db.query('INSERT INTO game_states(account_id, family, verified) VALUES($1,$2,$3)',
      [accountId, family, Object.fromEntries(PLAYERS.map(p => [p.id, 0]))]);
    await db.query('INSERT INTO player_logins(id, account_id, username, password_hash, player_id, display_name, trial_curriculum) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [memberId, accountId, username, childHash, template.playerId, displayName.trim(), template.id]);

    await db.query('UPDATE invite_codes SET used_count = used_count + 1 WHERE id=$1', [invite.id]);
    await db.query('INSERT INTO invite_redemptions(invite_id, account_id, member_id, username, display_name) VALUES($1,$2,$3,$4,$5)',
      [invite.id, accountId, memberId, username, displayName.trim()]);

    const session = await newSession(db, accountId, memberId);
    await db.query('COMMIT');
    return {session, accountId, memberId, playerId: template.playerId, grade: invite.grade, label: invite.label};
  } catch (e) { await db.query('ROLLBACK'); throw e; }
  finally { db.release(); }
}

export async function listInviteCodes(pool) {
  const codes = (await pool.query(`
    SELECT c.*, u.display_name AS creator_name,
      (SELECT json_agg(json_build_object('username', r.username, 'displayName', r.display_name, 'redeemedAt', r.redeemed_at) ORDER BY r.redeemed_at)
       FROM invite_redemptions r WHERE r.invite_id = c.id) AS redemptions
    FROM invite_codes c LEFT JOIN admin_users u ON u.id = c.created_by
    ORDER BY c.created_at DESC LIMIT 100
  `)).rows;
  return codes.map(c => ({
    id: c.id, code: c.code, grade: c.grade, label: c.label,
    maxUses: c.max_uses, usedCount: c.used_count,
    expired: new Date(c.expires_at) < new Date(),
    expiresAt: c.expires_at.toISOString(),
    createdAt: c.created_at.toISOString(),
    creator: c.creator_name ?? '系統',
    redemptions: c.redemptions ?? [],
  }));
}

export async function revokeInviteCode(pool, {codeId}, authorize) {
  need(typeof codeId === 'string', '請指定邀請碼');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const admin = await authorize(db);
    need(admin.role === 'super_admin', '只有超級管理員能撤銷邀請碼', 403);
    const result = await db.query('UPDATE invite_codes SET expires_at = now() WHERE id=$1 AND expires_at > now() RETURNING id', [codeId]);
    need(result.rowCount === 1, '邀請碼不存在或已過期', 404);
    await db.query('COMMIT');
    return {revoked: true};
  } catch (e) { await db.query('ROLLBACK'); throw e; }
  finally { db.release(); }
}

export function inviteCodeRoutes({pool, authenticate, readBody, send, limit}) {
  return async (req, res, path, admin) => {
    if (!['/api/admin/invites', '/api/admin/invites/create', '/api/admin/invites/revoke'].includes(path)) return false;
    need(admin.role === 'super_admin', '只有超級管理員能管理邀請碼', 403);
    if (path === '/api/admin/invites' && req.method === 'GET') {
      const codes = await listInviteCodes(pool);
      send(res, 200, {codes});
      return true;
    }
    need(req.method === 'POST', '不支援的方法', 405);
    const b = await readBody(req);
    if (path.endsWith('/create')) {
      await limit('admin-invite-create:' + admin.id, 30, 60);
      const code = await createInviteCode(pool, b, async db => {
        const current = await authenticate(req, db, true);
        need(current.csrf === admin.csrf, '登入已更新，請重新登入', 401);
        return current;
      });
      send(res, 200, {code});
      return true;
    }
    if (path.endsWith('/revoke')) {
      const result = await revokeInviteCode(pool, b, async db => {
        const current = await authenticate(req, db, true);
        need(current.csrf === admin.csrf, '登入已更新，請重新登入', 401);
        return current;
      });
      send(res, 200, result);
      return true;
    }
    return false;
  };
}
