import {randomUUID,randomBytes,createHash,randomInt} from 'node:crypto';
import {passwordHash,passwordMatches} from './credentials.mjs';
import {ensureSchema} from './schema-migration.mjs';
import {TRIAL_CURRICULA,trialCurriculumFor} from './trial-curricula.mjs';
import {newOnboardingFamily,PLAYERS,COURSES,validateFamily,drawStarter,confirmStarter,startRun,taipeiDay,monsterById} from '../build/game.mjs';
const need=(ok,message,status=400)=>{if(!ok)throw Object.assign(new Error(message),{status});};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const fields=(b,keys)=>need(b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).every(k=>keys.includes(k)),'操作資料不正確');
export async function ensureTrialSchema(pool){
 await ensureSchema(pool,'admin-trial-accounts-v1',`
  ALTER TABLE player_logins ADD COLUMN IF NOT EXISTS trial_curriculum text CHECK(trial_curriculum IN ('g1-yongchun','g2-yongchun','g4-yongchun','g5-dongmen','g6-jianan'));
  CREATE TABLE IF NOT EXISTS admin_trial_accounts(
   request_id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES admin_users(id),
   account_id uuid UNIQUE NOT NULL REFERENCES accounts(id),member_id uuid UNIQUE NOT NULL REFERENCES player_logins(id),
   config jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 `);
}
function inputConfig(b){
 fields(b,['requestId','username','password','displayName','grade','coins','tickets','starTickets','ready']);
 need(uuid(b.requestId),'建立編號不正確');
 need(typeof b.username==='string'&&/^[a-zA-Z0-9_]{3,32}$/.test(b.username),'帳號須為 3–32 個英文字母、數字或底線');
 need(typeof b.password==='string'&&/^\d{4}$/.test(b.password),'請設定四位數字密碼');
 need(typeof b.displayName==='string'&&b.displayName.trim().length>=1&&b.displayName.trim().length<=50,'請輸入 1–50 字的試用者稱呼');
 need(TRIAL_CURRICULA.some(t=>t.grade===b.grade),'這個年級尚未開放試用');
 for(const [key,max] of [['coins',100000],['tickets',100],['starTickets',100]])need(Number.isSafeInteger(b[key])&&b[key]>=0&&b[key]<=max,key==='coins'?'星幣須為 0–100,000':'每種扭蛋券須為 0–100 張');
 need(typeof b.ready==='boolean','請指定是否預備新怪物戰鬥');
 return {username:b.username.toLowerCase(),displayName:b.displayName.trim(),grade:b.grade,coins:b.coins,tickets:b.tickets,starTickets:b.starTickets,ready:b.ready};
}
function makeFamily(config,template){
 const family=newOnboardingFamily(),p=family.profiles[template.playerId];p.learning.school=template.school;
 p.coins=config.coins;p.tickets=config.tickets;p.starTickets=config.starTickets;
 if(config.ready){drawStarter(family,template.playerId,randomInt(2**32)/2**32,randomInt(2**32)/2**32);confirmStarter(family,template.playerId);p.growth.xp[p.equipped]=350;}
 // Fail the whole creation if any advertised subject cannot actually allocate questions.
 for(const c of COURSES[config.grade]){const probe=structuredClone(family);startRun(probe,template.playerId,c.id,randomUUID(),0,false,taipeiDay(),'relaxed');}
 let preparedMonster=null;
 if(config.ready){
  for(let seed=0;seed<40;seed++){
   const probe=structuredClone(family);startRun(probe,template.playerId,'math',randomUUID(),seed*10000,false,taipeiDay(),'relaxed');
   if(probe.profiles[template.playerId].run.encounter.variant.startsWith('wave4-')){p.run=probe.profiles[template.playerId].run;p.lastMonsterVariant=probe.profiles[template.playerId].lastMonsterVariant;preparedMonster=p.run.encounter.variant;break;}
  }
  need(preparedMonster,'新怪物挑戰暫時無法準備，帳號尚未建立',503);
 }
 family.log=[{id:randomUUID(),time:Date.now(),text:`試用帳號已準備：星幣 ${config.coins}、星願券 ${config.tickets}、星耀特邀券 ${config.starTickets}。`}];
 validateFamily(structuredClone(family));return {family,preparedMonster};
}
function receipt(row){const template=TRIAL_CURRICULA.find(t=>t.grade===row.config.grade);return {requestId:row.request_id,memberId:row.member_id,...row.config,curriculumLabel:template.label,createdAt:row.created_at.toISOString()};}
export async function createTrialAccount(pool,b,authorize){
 const config=inputConfig(b),template=TRIAL_CURRICULA.find(t=>t.grade===config.grade),requestId=b.requestId.toLowerCase();
 // Derive before acquiring database locks, and never retain a plaintext password in a receipt.
 const childHash=await passwordHash(b.password,undefined,4),ownerHash=await passwordHash(randomBytes(32).toString('hex'));
 const db=await pool.connect();
 try{
  await db.query('BEGIN');const admin=await authorize(db);need(admin.role==='super_admin'&&!admin.must_change_password,'只有超級管理員能建立試用帳號',403);
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['trial-account:'+requestId]);
  const prior=(await db.query('SELECT t.*,m.password_hash FROM admin_trial_accounts t JOIN player_logins m ON m.id=t.member_id WHERE request_id=$1',[requestId])).rows[0];
  if(prior){need(prior.actor_id===admin.id&&Object.keys(config).every(k=>prior.config[k]===config[k])&&Object.keys(prior.config).length===Object.keys(config).length&&await passwordMatches(b.password,prior.password_hash),'此建立編號已使用，請先核對原帳號',409);await db.query('COMMIT');return {...receipt(prior),replayed:true};}
  await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-player-logins'))");
  const collision=await db.query('SELECT id FROM accounts WHERE username=$1 UNION ALL SELECT id FROM player_logins WHERE username=$1',[config.username]);
  need(collision.rowCount===0,'這個登入帳號已存在，請改用其他名稱；原帳號不會變更',409);
  const {family}=makeFamily(config,template),accountId=randomUUID(),memberId=randomUUID();
  await db.query('INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',[accountId,'trial_'+randomBytes(10).toString('hex'),ownerHash,createHash('sha256').update(randomBytes(32)).digest('hex')]);
  await db.query('INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)',[accountId,family,Object.fromEntries(PLAYERS.map(p=>[p.id,0]))]);
  await db.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name,trial_curriculum) VALUES($1,$2,$3,$4,$5,$6,$7)',[memberId,accountId,config.username,childHash,template.playerId,config.displayName,template.id]);
  const row=(await db.query('INSERT INTO admin_trial_accounts(request_id,actor_id,account_id,member_id,config) VALUES($1,$2,$3,$4,$5) RETURNING *',[requestId,admin.id,accountId,memberId,config])).rows[0];
  await db.query('INSERT INTO admin_access_audit(id,actor_id,target_id,action,details) VALUES($1,$2,$2,$3,$4)',[randomUUID(),admin.id,'trial_account_created',{requestId,memberId,...config}]);
  await db.query('COMMIT');return {...receipt(row),replayed:false};
 }catch(e){await db.query('ROLLBACK');if(e.code==='23505')throw Object.assign(new Error('這個帳號已存在，請核對建立結果'),{status:409});throw e;}finally{db.release();}
}
export function trialAccountRoutes({pool,authenticate,readBody,send,limit}){
 return async(req,res,path,admin)=>{
  if(!['/api/admin/trials','/api/admin/trials/create','/api/admin/trials/status'].includes(path))return false;
  need(admin.role==='super_admin','只有超級管理員能管理試用帳號',403);
  if(path==='/api/admin/trials'&&req.method==='GET'){
   const rows=(await pool.query(`SELECT m.id AS member_id,m.username,m.player_id,m.display_name,m.trial_curriculum,g.family,a.created_at AS account_created,t.request_id,t.config,t.created_at,owner.display_name AS creator
    FROM player_logins m JOIN accounts a ON a.id=m.account_id JOIN game_states g ON g.account_id=m.account_id
    LEFT JOIN admin_trial_accounts t ON t.member_id=m.id LEFT JOIN admin_users owner ON owner.id=t.actor_id
    WHERE m.trial_curriculum IS NOT NULL OR (m.username='trial_g6' AND m.player_id='alston') ORDER BY a.created_at DESC,m.id LIMIT 100`)).rows;
   const trials=rows.flatMap(r=>{const template=trialCurriculumFor(r);if(!template)return [];let p;try{p=validateFamily(r.family).profiles[r.player_id];}catch{}
    return [{memberId:r.member_id,username:r.username,displayName:r.display_name,grade:template.grade,curriculumLabel:template.label,createdAt:(r.created_at??r.account_created).toISOString(),creator:r.creator??'先前建立',coins:p?.coins??null,tickets:p?.tickets??null,starTickets:p?.starTickets??null,ready:!!p?.onboarding?.confirmed,preparedMonster:p?.run?.encounter.variant?monsterById(p.run.encounter.variant)?.name:null}];});
   send(res,200,{trials,grades:TRIAL_CURRICULA.map(({grade,label})=>({grade,label}))});return true;
  }
  need(req.method==='POST','不支援的方法',405);const b=await readBody(req);
  if(path.endsWith('/status')){
   fields(b,['requestId']);need(uuid(b.requestId),'建立編號不正確');const db=await pool.connect();let row;
   try{await db.query('BEGIN');const current=await authenticate(req,db,true);need(current.role==='super_admin'&&!current.must_change_password&&current.csrf===admin.csrf,'權限已變更',403);await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['trial-account:'+b.requestId.toLowerCase()]);row=(await db.query('SELECT * FROM admin_trial_accounts WHERE request_id=$1 AND actor_id=$2',[b.requestId.toLowerCase(),current.id])).rows[0];await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
   send(res,200,{status:row?'created':'not_found',...(row?{trial:receipt(row)}:{})});return true;
  }
  need(path.endsWith('/create'),'不支援的方法',405);await limit('admin-trial-create:'+admin.id,30,60);
  const trial=await createTrialAccount(pool,b,async db=>{const current=await authenticate(req,db,true);need(current.csrf===admin.csrf,'登入已更新，請重新登入',401);return current;});
  send(res,200,{trial});return true;
 };
}
