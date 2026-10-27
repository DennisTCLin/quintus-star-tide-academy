import { randomUUID } from 'node:crypto';
import { passwordHash, passwordMatches } from './credentials.mjs';
import { ensureSchema } from './schema-migration.mjs';
const need=(ok,message,status=400)=>{if(!ok)throw Object.assign(new Error(message),{status});};
const fields=(b,keys)=>need(b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).every(k=>keys.includes(k)),'操作資料不正確');
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export async function ensureAdminAccessSchema(pool){
 await ensureSchema(pool,'admin-access-v2',`
  ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
  ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK(role IN ('super_admin','staff'));
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS can_grant boolean NOT NULL DEFAULT false;
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS student_scope text NOT NULL DEFAULT 'assigned' CHECK(student_scope IN ('all','assigned'));
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS member_ids uuid[] NOT NULL DEFAULT '{}';
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS grant_limit integer NOT NULL DEFAULT 10 CHECK(grant_limit BETWEEN 1 AND 100);
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
  CREATE TABLE IF NOT EXISTS admin_access_audit(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES admin_users(id),target_id uuid NOT NULL REFERENCES admin_users(id),action text NOT NULL,details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 `);
}
export const isOwner=a=>a.role==='super_admin';
export const allStudents=a=>isOwner(a)||a.student_scope==='all';
export const canGrant=a=>isOwner(a)||a.can_grant;
export const grantLimit=a=>isOwner(a)?100:a.grant_limit;
export const publicAdmin=a=>({id:a.id,username:a.username,displayName:a.display_name,role:a.role,enabled:a.enabled,canGrant:canGrant(a),scope:allStudents(a)?'all':'assigned',memberIds:a.member_ids,grantLimit:grantLimit(a),mustChangePassword:a.must_change_password,version:a.version});
export const sessionInfo=a=>({...publicAdmin(a),csrf:a.csrf});
export function authorizeStudent(a,memberId){need(allStudents(a)||a.member_ids.includes(memberId),'沒有這位孩子的管理權限',403);}
async function audit(db,actor,target,action,details){await db.query('INSERT INTO admin_access_audit(id,actor_id,target_id,action,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor.id,target,action,details]);}
async function policy(db,b){
 need(typeof b.enabled==='boolean'&&typeof b.canGrant==='boolean'&&['all','assigned'].includes(b.scope),'請指定權限與狀態');
 need(Number.isInteger(b.grantLimit)&&b.grantLimit>=1&&b.grantLimit<=100,'每次發券上限須為 1–100 張');
 need(Array.isArray(b.memberIds)&&b.memberIds.length<=1000&&b.memberIds.every(uuid),'孩子範圍不正確');
 const ids=[...new Set(b.memberIds.map(x=>x.toLowerCase()))].sort();
 const existing=await db.query('SELECT id FROM player_logins WHERE id=ANY($1::uuid[]) FOR SHARE',[ids]);
 need(existing.rowCount===ids.length,'孩子名單已變更，請重新整理');
 return {enabled:b.enabled,canGrant:b.canGrant,scope:b.scope,memberIds:b.scope==='all'?[]:ids,grantLimit:b.grantLimit};
}
function validatePassword(p){need(typeof p==='string'&&p.length>=10&&p.length<=128,'密碼須為 10–128 個字元');}
export function adminAccessRoutes({pool,authenticate,readBody,send,limit}){
 return async(req,res,path,admin)=>{
  if(path==='/api/admin/password'&&req.method==='POST'){
   const b=await readBody(req);fields(b,['currentPassword','newPassword']);validatePassword(b.newPassword);
   need(typeof b.currentPassword==='string'&&b.currentPassword.length<=128&&b.currentPassword.length>0,'請輸入目前密碼');
   await limit('admin-password:'+admin.id,6,600);
   const prior=(await pool.query('SELECT password_hash FROM admin_users WHERE id=$1',[admin.id])).rows[0];
   need(await passwordMatches(b.currentPassword,prior.password_hash),'目前密碼不正確',403);
   need(b.newPassword!==b.currentPassword,'請使用不同的新密碼');
   const hashed=await passwordHash(b.newPassword,undefined,10),db=await pool.connect();
   try{await db.query('BEGIN');await authenticate(req,db,'update');
    const target=(await db.query('SELECT * FROM admin_users WHERE id=$1 FOR UPDATE',[admin.id])).rows[0];
    need(target.password_hash===prior.password_hash,'密碼已更新，請重新登入',409);
    await db.query('UPDATE admin_users SET password_hash=$2,must_change_password=false,version=version+1 WHERE id=$1',[admin.id,hashed]);
    await db.query('DELETE FROM admin_sessions WHERE admin_id=$1',[admin.id]);await audit(db,admin,admin.id,'password_changed',{});await db.query('COMMIT');
   }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
   send(res,200,{ok:true,reauthenticate:true});return true;
  }
  if(!['/api/admin/users','/api/admin/users/create','/api/admin/users/update','/api/admin/users/reset-password','/api/admin/audit'].includes(path))return false;
  need(isOwner(admin),'只有超級管理員能管理大人帳號與權限',403);
  if(req.method==='GET'&&path==='/api/admin/users'){
   const rows=(await pool.query('SELECT * FROM admin_users ORDER BY created_at,id')).rows;send(res,200,{users:rows.map(publicAdmin)});return true;
  }
  if(req.method==='GET'&&path==='/api/admin/audit'){
   const rows=(await pool.query('SELECT e.id,e.action,e.details,e.created_at,a.display_name AS actor,t.display_name AS target FROM admin_access_audit e JOIN admin_users a ON a.id=e.actor_id JOIN admin_users t ON t.id=e.target_id ORDER BY e.created_at DESC,e.id LIMIT 100')).rows;
   send(res,200,{events:rows.map(r=>({...r,createdAt:r.created_at.toISOString(),created_at:undefined}))});return true;
  }
  need(req.method==='POST'&&path!=='/api/admin/users'&&path!=='/api/admin/audit','不支援的方法',405);
  const b=await readBody(req),creating=path.endsWith('/create'),reset=path.endsWith('/reset-password');
  fields(b,creating?['username','displayName','password','enabled','canGrant','scope','memberIds','grantLimit']:reset?['id','version','password']:['id','version','enabled','canGrant','scope','memberIds','grantLimit']);
  if(creating){need(typeof b.username==='string'&&/^[a-zA-Z0-9_]{3,32}$/.test(b.username),'帳號須為 3–32 個英文字母、數字或底線');need(typeof b.displayName==='string'&&b.displayName.trim().length>0&&b.displayName.length<=50,'請輸入 1–50 字的稱呼');}
  else need(uuid(b.id)&&Number.isInteger(b.version)&&b.version>=0,'帳號版本不正確');
  if(creating||reset)validatePassword(b.password);
  const hashed=creating||reset?await passwordHash(b.password,undefined,10):null;
  const db=await pool.connect();let result;
  try{await db.query('BEGIN');const current=await authenticate(req,db,true);need(isOwner(current),'權限已變更',403);
   let target;
   if(!creating){target=(await db.query('SELECT * FROM admin_users WHERE id=$1 FOR UPDATE',[b.id])).rows[0];need(target,'找不到管理員',404);need(target.role==='staff','不能在這裡更動超級管理員',403);need(target.version===b.version,'此帳號已被更新，請重新整理後再操作',409);}
   if(reset){await db.query('UPDATE admin_users SET password_hash=$2,must_change_password=true,version=version+1 WHERE id=$1',[b.id,hashed]);await audit(db,current,b.id,'password_reset',{});}
   else{const p=await policy(db,b);
    if(creating){const id=randomUUID();await db.query("INSERT INTO admin_users(id,username,display_name,password_hash,role,enabled,can_grant,student_scope,member_ids,grant_limit,must_change_password) VALUES($1,$2,$3,$4,'staff',$5,$6,$7,$8,$9,true)",[id,b.username.toLowerCase(),b.displayName.trim(),hashed,p.enabled,p.canGrant,p.scope,p.memberIds,p.grantLimit]);target={id};await audit(db,current,id,'created',p);}
    else{await db.query('UPDATE admin_users SET enabled=$2,can_grant=$3,student_scope=$4,member_ids=$5,grant_limit=$6,version=version+1 WHERE id=$1',[b.id,p.enabled,p.canGrant,p.scope,p.memberIds,p.grantLimit]);await audit(db,current,b.id,'permissions_changed',{before:publicAdmin(target),after:p});}
   }
   if(!creating)await db.query('DELETE FROM admin_sessions WHERE admin_id=$1',[b.id]);
   result=publicAdmin((await db.query('SELECT * FROM admin_users WHERE id=$1',[target.id])).rows[0]);await db.query('COMMIT');
  }catch(e){await db.query('ROLLBACK');if(e.code==='23505')throw Object.assign(new Error('這個管理員帳號已存在，請重新整理名單'),{status:409});throw e;}finally{db.release();}
  send(res,200,{user:result});return true;
 };
}
