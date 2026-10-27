import {ensureTrialSchema,trialAccountRoutes} from './trial-accounts.mjs';
import {trialCurriculumFor} from './trial-curricula.mjs';
import {readAdminPresence,readAdminParentReport} from './admin-reports.mjs';
import { ensureAdminAccessSchema, adminAccessRoutes, sessionInfo, allStudents, canGrant, grantLimit, authorizeStudent } from './admin-access.mjs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { passwordHash, passwordMatches } from './credentials.mjs';
import { ensureSchema } from './schema-migration.mjs';
import { grantTickets } from './star-ticket-admin.mjs';
import { applySchoolCurriculum, SCHOOL_ROSTER } from './school-roster.mjs';
import { collectionIdentity } from './player-collections.mjs';
import { validateFamily, PLAYERS, selectAbilitySnapshot } from '../build/game.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('hex');
const need = (ok, message, status = 400) => { if (!ok) throw Object.assign(new Error(message), {status}); };
const fields = (body, allowed) => need(body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).every(k => allowed.includes(k)), '操作資料不正確');
const dummyHash = '0'.repeat(32) + ':' + '0'.repeat(128);

export async function ensureAdminSchema(pool) {
  await ensureSchema(pool, 'admin-console', `
    CREATE TABLE IF NOT EXISTS admin_users (
      id uuid PRIMARY KEY, username text UNIQUE NOT NULL CHECK(username=lower(username)),
      display_name text NOT NULL, password_hash text NOT NULL,
      role text NOT NULL CHECK(role='super_admin'), enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      csrf text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS admin_sessions_owner ON admin_sessions(admin_id);
  `);
  await ensureAdminAccessSchema(pool);
}

// Operator-only provisioning; never exposed as a registration/reset HTTP endpoint.
export async function provisionAdmin(pool, {username, password}) {
  need(typeof username === 'string' && /^[a-zA-Z0-9_]{3,32}$/.test(username), '管理員帳號格式不正確');
  need(typeof password === 'string' && password.length >= 10 && password.length <= 128, '管理員密碼須為 10–128 個字元');
  await ensureAdminSchema(pool);
  const existing = (await pool.query('SELECT * FROM admin_users WHERE username=$1', [username.toLowerCase()])).rows[0];
  if (existing) {
    need(existing.role==='super_admin' && existing.enabled && await passwordMatches(password, existing.password_hash), '管理員已存在，未覆寫既有憑證', 409);
    return {username: existing.display_name, created: false};
  }
  const stored = await passwordHash(password, undefined, 10);
  await pool.query("INSERT INTO admin_users(id,username,display_name,password_hash,role) VALUES($1,$2,$3,$4,'super_admin')", [randomUUID(), username.toLowerCase(), username, stored]);
  return {username, created: true};
}

export async function readAdminStudents(pool, admin) {
  const rows = (await pool.query(`SELECT m.id AS member_id,m.account_id,m.player_id,m.username,m.display_name,m.trial_curriculum,
      g.family,seen.seen_at,
      (SELECT count(*) FROM player_logins peers WHERE peers.account_id=m.account_id) AS household_size
    FROM player_logins m JOIN game_states g ON g.account_id=m.account_id
    LEFT JOIN player_last_seen seen ON seen.account_id=m.account_id AND seen.player_id=m.player_id
    WHERE ($1::boolean OR m.id=ANY($2::uuid[])) ORDER BY m.username`,[!admin || allStudents(admin),admin?.member_ids ?? []])).rows;
  return rows.map(row => {
    const identity = collectionIdentity(row, {}, row.player_id);
    const confirmed = SCHOOL_ROSTER.find(s=>s.username===row.username?.toLowerCase() && s.playerId===row.player_id);
    const isTrial=Boolean(trialCurriculumFor(row));
    const common = {isTrial,schoolName:isTrial?'試用教材（非學生校籍）':confirmed?.schoolName ?? null,memberId:row.member_id,username: row.username, displayName: row.display_name, playerId: row.player_id, avatarKey: identity.avatarKey,
      grade: PLAYERS.find(x => x.id === row.player_id).grade, lastSeen: row.seen_at?.toISOString() ?? null};
    let family;
    try {family = applySchoolCurriculum(validateFamily(row.family), row);}
    catch {return {...common,available:false,school:null,starTickets:null,tickets:null,coins:null,mastery:null,voyages:null,
      allocated:null,answered:null,correct:null,skills:[],run:null,island:null,ability:null};}
    const p = family.profiles[row.player_id];
    const skills = Object.entries(p.learning.skills).map(([key, value]) => ({key, level:value.level, answered:value.answered, correct:value.correct, recent:value.recent}));
    return {...common,available:true,school: p.learning.school ?? null, starTickets: p.starTickets, tickets: p.tickets,
      ability:selectAbilitySnapshot(p.milestones), coins: p.coins, mastery: p.milestones.masteryPoints, voyages: p.milestones.completedVoyages,
      allocated: p.learning.seen.length + Object.values(p.learning.cursors).reduce((a,b) => a+b,0),
      answered: skills.reduce((a,b) => a+b.answered,0), correct: skills.reduce((a,b) => a+b.correct,0), skills,
      run: p.run ? {course: p.run.course, status:p.run.status, answered:p.run.answers?.length ?? 0, total:p.run.questions.length} : null,
      island: p.mathIsland ? {answered:Object.values(p.mathIsland.stats).reduce((a,b) => a+b.a,0),
        wrong:Object.values(p.mathIsland.stats).reduce((a,b) => a+b.w,0), review:p.mathIsland.pool.length,
        completedUnits:Object.values(p.mathIsland.units).filter(u => u.boss !== undefined).length} : null};
  });
}

export async function createAdminService({pool, production, limit, readBody, send}) {
  await ensureAdminSchema(pool);
  await ensureTrialSchema(pool);
  const cookieName = production ? '__Host-star-tide-admin' : 'star-tide-admin';
  const cookie = (value, age=28800) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production ? '; Secure' : ''}`;
  async function authenticate(req, db=pool, lock=false) {
    const secret = String(req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    need(secret && /^[a-f0-9]{64}$/.test(secret), '請登入超級管理員', 401);
    const row = (await db.query(`SELECT a.*,s.csrf,s.token_hash FROM admin_sessions s
      JOIN admin_users a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.enabled
      ${lock === 'update' ? 'FOR UPDATE OF a,s' : lock ? 'FOR SHARE OF a,s' : ''}`, [hash(secret)])).rows[0];
    need(row, '管理員登入已到期，請重新登入', 401);
    return row;
  }
  const access=adminAccessRoutes({pool,authenticate,readBody,send,limit});
  const trials=trialAccountRoutes({pool,authenticate,readBody,send,limit});
  return async (req,res,path) => {
    if (path === '/api/admin/login') {
      need(req.method==='POST','不支援的方法',405);
      const ip = production ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').at(-1).trim() : req.socket.remoteAddress;
      await limit('admin-login-ip:'+ip,20,600);
      const body = await readBody(req);fields(body,['username','password']);
      need(typeof body.username==='string' && /^[a-zA-Z0-9_]{3,32}$/.test(body.username) && typeof body.password==='string' && body.password.length>=1 && body.password.length<=128,'帳號或密碼不正確',401);
      const username=body.username.toLowerCase();await limit('admin-login-user:'+username,10,600);
      const admin=(await pool.query('SELECT * FROM admin_users WHERE username=$1',[username])).rows[0];
      const valid=await passwordMatches(body.password,admin?.password_hash ?? dummyHash);
      need(admin?.enabled && valid,'帳號或密碼不正確',401);
      const secret=token(),csrf=token(),db=await pool.connect();let authorizedAdmin;
      try {
        await db.query('BEGIN');
        const current=(await db.query("SELECT * FROM admin_users WHERE id=$1 AND password_hash=$2 AND enabled FOR SHARE",[admin.id,admin.password_hash])).rows[0];
        need(current,'帳號已更新，請重新登入',401);authorizedAdmin=current;
        await db.query("DELETE FROM admin_sessions WHERE admin_id=$1 AND (expires_at<now() OR token_hash IN (SELECT token_hash FROM admin_sessions WHERE admin_id=$1 ORDER BY created_at DESC OFFSET 4))",[admin.id]);
        await db.query("INSERT INTO admin_sessions(token_hash,admin_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",[hash(secret),admin.id,csrf]);
        await db.query('COMMIT');
      } catch(e) {await db.query('ROLLBACK');throw e;} finally {db.release();}
      send(res,200,sessionInfo({...authorizedAdmin,csrf}),{'Set-Cookie':cookie(secret)});return;
    }
    const admin=await authenticate(req);
    await limit('admin-session:'+admin.token_hash,240,60);
    if(req.method==='POST') need(req.headers['x-csrf-token']===admin.csrf,'驗證已更新，請重新登入',403);
    if(path==='/api/admin/session' && req.method==='GET') {send(res,200,sessionInfo(admin));return;}
    if(path==='/api/admin/logout' && req.method==='POST') {
      await pool.query('DELETE FROM admin_sessions WHERE token_hash=$1',[admin.token_hash]);
      send(res,200,{ok:true},{'Set-Cookie':cookie('',0)});return;
    }
    if(admin.must_change_password && path!=='/api/admin/password') need(false,'請先更換初始密碼',403);
    if(await access(req,res,path,admin)) return;
    if(await trials(req,res,path,admin)) return;
    if(path==='/api/admin/presence' && req.method==='GET'){send(res,200,await readAdminPresence(pool,admin));return;}
    if(path.startsWith('/api/admin/parent/') && req.method==='GET'){
      need(admin.role==='super_admin','家長艙目前由超級管理員查看',403);
      const id=path.slice('/api/admin/parent/'.length);
      need(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),'孩子編號不正確');
      send(res,200,await readAdminParentReport(pool,id));return;
    }
    if(path==='/api/admin/students' && req.method==='GET') {send(res,200,{students:await readAdminStudents(pool,admin),updatedAt:new Date().toISOString()});return;}
    if(path==='/api/admin/grants' && req.method==='GET') {
      const exists=(await pool.query("SELECT to_regclass('star_ticket_grants') AS name")).rows[0]?.name;
      const receipts=exists ? (await pool.query('SELECT receipt,created_at FROM star_ticket_grants WHERE ($1::boolean OR member_id=ANY($2::uuid[])) ORDER BY created_at DESC LIMIT 50', [allStudents(admin),admin.member_ids])).rows.map(r=>({...r.receipt,ticketType:r.receipt.ticketType ?? 'star',createdAt:r.created_at.toISOString()})) : [];
      send(res,200,{receipts});return;
    }
    if(path==='/api/admin/tickets/status' && req.method==='POST') {
      const body=await readBody(req);fields(body,['grantId']);
      need(typeof body.grantId==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.grantId),'發放編號不正確');
      const db=await pool.connect();let applied=false;
      try {await db.query('BEGIN');const current=await authenticate(req,db,true);
        await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['star-ticket-grant:'+body.grantId.toLowerCase()]);
        const exists=(await db.query("SELECT to_regclass('star_ticket_grants') AS name")).rows[0]?.name;
        if(exists) applied=(await db.query("SELECT grant_id FROM star_ticket_grants WHERE grant_id=$1 AND payload->>'operator'=$2",[body.grantId,'admin:'+current.username])).rowCount===1;
        await db.query('COMMIT');
      }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
      // Allows reconciliation after scope loss without exposing any child's data.
      send(res,200,{grantId:body.grantId.toLowerCase(),status:applied?'applied':'not_found'});return;
    }
    if(['/api/admin/tickets/preview','/api/admin/tickets/grant'].includes(path) && req.method==='POST') {
      const body=await readBody(req);fields(body,['grantId','username','amount','reason','ticketType']);
      const ticketType=body.ticketType===undefined?'star':body.ticketType;
      need(ticketType==='star'||ticketType==='standard','券別不正確，未發券');
      // A receipt is permanently tied to this authenticated operator; clients cannot forge it.
      need(canGrant(admin),'此帳號只有查看權限，無法發券',403);
      need(ticketType!=='standard'||admin.role==='super_admin','一般扭蛋券須由超級管理員發放',403);
      let currentAdmin=admin;
      const receipt=await grantTickets(pool,{...body,ticketType,operator:'admin:'+admin.username},{apply:path.endsWith('/grant'),authorize:async db=>{
        const current=await authenticate(req,db,true);need(current.csrf===admin.csrf,'登入已更新，請重新登入',401);
        need(!current.must_change_password && canGrant(current),'發券權限已變更',403);
        need(ticketType!=='standard'||current.role==='super_admin','一般扭蛋券須由超級管理員發放',403);
        need(body.amount<=grantLimit(current),'超過這個帳號的單次發券上限',403);currentAdmin=current;
      },authorizeTarget:async (_db,memberId)=>authorizeStudent(currentAdmin,memberId)});
      send(res,200,{receipt});return;
    }
    need(false,'找不到管理操作',404);
  };
}
