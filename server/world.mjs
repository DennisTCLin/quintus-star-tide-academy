import{randomUUID,randomInt,createHash}from'node:crypto';
import{ensureSchema}from'./schema-migration.mjs';
import{ROSTER}from'../build/game.mjs';
import{socialGuard}from'./world-identity.mjs';
const need=(v,message='世界操作無效',status=400)=>{if(!v)throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const pets=new Set(ROSTER.map(p=>p.id)),phrases=['hello','battle','thanks'];
const adjectives=['星光','晨光','海風','月光','微光','晴空'],nouns=['海豚','海獺','飛魚','海龜','星鯨','小龍'];
const avatars=['compass','boat','shell','star','dolphin','moon'];
const eligibility=`LEFT JOIN adult_game_enrollments e ON e.member_id=m.id WHERE (e.member_id IS NULL OR e.approved_at IS NOT NULL)`;
const leases=`JOIN sessions s ON s.account_id=m.account_id AND (s.member_id IS NULL OR s.member_id=m.id) AND s.expires_at>now() JOIN presence_leases l ON l.token_hash=s.token_hash AND l.player_id=m.player_id`;
export async function createWorldService({pool,transaction,lockSession,limit}){
 await ensureSchema(pool,'world-lobby-v1',`
 CREATE TABLE IF NOT EXISTS world_profiles(member_id uuid PRIMARY KEY REFERENCES player_logins(id) ON DELETE CASCADE,public_id uuid UNIQUE NOT NULL,nickname text UNIQUE NOT NULL,avatar text NOT NULL,receive_invites boolean NOT NULL DEFAULT true);
 CREATE TABLE IF NOT EXISTS world_links(member_id uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,friend_id uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,PRIMARY KEY(member_id,friend_id),CHECK(member_id<>friend_id));
 CREATE TABLE IF NOT EXISTS world_requests(id uuid PRIMARY KEY,sender uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,recipient uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,status text NOT NULL CHECK(status IN('pending','accepted','declined')),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK(sender<>recipient));
 CREATE INDEX IF NOT EXISTS world_requests_sender ON world_requests(sender,created_at DESC);
 CREATE INDEX IF NOT EXISTS world_requests_recipient ON world_requests(recipient,created_at DESC);
 CREATE TABLE IF NOT EXISTS world_mutes(member_id uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,muted_id uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,PRIMARY KEY(member_id,muted_id),CHECK(member_id<>muted_id));
 CREATE TABLE IF NOT EXISTS world_greetings(id uuid PRIMARY KEY,sender uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,target uuid REFERENCES player_logins(id) ON DELETE CASCADE,phrase text NOT NULL CHECK(phrase IN('hello','battle','thanks')),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS world_greetings_recent ON world_greetings(created_at DESC);
 CREATE TABLE IF NOT EXISTS world_commands(member_id uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,id uuid NOT NULL,payload_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(member_id,id));
 `);
 async function member(db,user,player,strict=true){
  need(!user.member_id||!player||user.player_id===player,'只能操作自己的世界入口',403);
  const m=(await db.query(`SELECT m.id FROM player_logins m ${eligibility} AND m.account_id=$1 AND m.player_id=$2 AND ($3::uuid IS NULL OR m.id=$3)`,[user.id,player??user.player_id,user.member_id??null])).rows[0];
  if(strict)need(m,'先與家人確認同玩邀請，才能進入世界',403);return m;
 }
 async function identity(db,id){
  let p=(await db.query('SELECT * FROM world_profiles WHERE member_id=$1',[id])).rows[0];if(p)return p;
  for(let i=0;i<4;i++){
   await db.query('INSERT INTO world_profiles(member_id,public_id,nickname,avatar) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,randomUUID(),adjectives[randomInt(adjectives.length)]+nouns[randomInt(nouns.length)]+String(randomInt(1000,10000)),avatars[randomInt(avatars.length)]]);
   p=(await db.query('SELECT * FROM world_profiles WHERE member_id=$1',[id])).rows[0];if(p)return p;
  }need(false,'世界暱稱正在準備，請再試一次',503);
 }
 async function target(db,key){need(uuid(key));const r=(await db.query(`SELECT m.id FROM world_profiles w JOIN player_logins m ON m.id=w.member_id ${eligibility} AND w.public_id=$1`,[key])).rows[0];need(r,'找不到這位世界航海員',404);return r.id;}
 async function present(db,id){return(await db.query(`SELECT 1 FROM player_logins m ${leases} WHERE m.id=$1 AND l.active AND l.seen_at>now()-interval '35 seconds' LIMIT 1`,[id])).rowCount>0;}
 const muted=`NOT EXISTS(SELECT 1 FROM world_mutes x WHERE (x.member_id=$1 AND x.muted_id=m.id) OR (x.member_id=m.id AND x.muted_id=$1))`;
 async function count(user,player){const me=await member(pool,user,player,false);if(!me)return{eligible:false,online:0};await identity(pool,me.id);const r=await pool.query(`SELECT count(DISTINCT m.id) AS count FROM world_profiles w JOIN player_logins m ON m.id=w.member_id ${leases} ${eligibility} AND l.active AND l.seen_at>now()-interval '35 seconds' AND ${muted}`,[me.id]);return{eligible:true,online:Number(r.rows[0].count)};}
 async function view(db,me){
  const own=await identity(db,me.id);
  const rows=(await db.query(`SELECT w.public_id,w.nickname,w.avatar,m.id AS internal_id,
   g.family->'profiles'->m.player_id->>'equipped' AS pet,
   g.family->'profiles'->m.player_id->'owned' AS owned,
   EXISTS(SELECT 1 FROM player_friendships f WHERE f.member_id=$1 AND f.friend_id=m.id) AS friend,
   bool_or(l.active AND l.seen_at>now()-interval '35 seconds') AS online,
   bool_or(l.active AND l.seen_at>now()-interval '35 seconds' AND l.activity='learning') AS learning,
   bool_or(l.active AND l.seen_at>now()-interval '35 seconds' AND l.activity IN('battle','preparing')) AS battle
   FROM world_profiles w JOIN player_logins m ON m.id=w.member_id ${leases}
   LEFT JOIN game_states g ON g.account_id=m.account_id ${eligibility} AND l.seen_at>now()-interval '120 seconds' AND ${muted}
   GROUP BY w.member_id,w.public_id,w.nickname,w.avatar,m.id,g.family
   ORDER BY (m.id=$1) DESC,friend DESC,online DESC,w.nickname LIMIT 60`,[me.id])).rows;
  const roster=rows.map(r=>({key:r.public_id,name:r.nickname,avatar:r.avatar,pet:pets.has(r.pet)&&r.owned?.[r.pet]>0?r.pet:null,friend:r.friend,self:r.internal_id===me.id,status:!r.online?'away':r.learning?'learning':r.battle?'battle':'harbor'}));
  const requests=(await db.query(`SELECT r.id,r.status,r.recipient=$1 AS incoming,w.public_id,w.nickname,r.expires_at FROM world_requests r JOIN player_logins m ON m.id=CASE WHEN r.sender=$1 THEN r.recipient ELSE r.sender END JOIN world_profiles w ON w.member_id=m.id ${eligibility} AND (r.sender=$1 OR r.recipient=$1) AND r.status='pending' AND r.expires_at>now() AND ${muted} ORDER BY r.created_at DESC LIMIT 30`,[me.id])).rows.map(r=>({id:r.id,incoming:r.incoming,key:r.public_id,name:r.nickname,expiresAt:r.expires_at.getTime()}));
  const greetings=(await db.query(`SELECT t.id,t.phrase,w.public_id,w.nickname,t.expires_at FROM world_greetings t JOIN player_logins m ON m.id=t.sender JOIN world_profiles w ON w.member_id=m.id ${eligibility} AND t.expires_at>now() AND (t.target IS NULL OR t.target=$1 OR t.sender=$1) AND ${muted} ORDER BY t.created_at DESC LIMIT 12`,[me.id])).rows.map(r=>({id:r.id,key:r.public_id,name:r.nickname,phrase:r.phrase,expiresAt:r.expires_at.getTime()}));
  const mutes=(await db.query('SELECT w.public_id AS key,w.nickname AS name FROM world_mutes x JOIN world_profiles w ON w.member_id=x.muted_id WHERE x.member_id=$1 ORDER BY w.nickname LIMIT 60',[me.id])).rows;
  return{serverNow:Date.now(),self:{key:own.public_id,name:own.nickname,avatar:own.avatar,receiveInvites:own.receive_invites},roster,requests,greetings,mutes};
 }
 return{count,read:async(user,player)=>view(pool,await member(pool,user,player)),command:async(user,b)=>{
  const allowed={greet:['phrase','target'],request:['target'],accept:['requestId'],decline:['requestId'],mute:['target','value'],invites:['enabled']};
  need(b&&typeof b==='object'&&!Array.isArray(b)&&Object.hasOwn(allowed,b.action)&&uuid(b.commandId)&&Object.keys(b).every(k=>['player','action','commandId',...allowed[b.action]].includes(k)));
  await limit('world:'+user.id,30,60);
  return transaction(async db=>{
   await lockSession(db,user);const me=await member(db,user,b.player);await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-world'))");await identity(db,me.id);
   const hash=createHash('sha256').update(JSON.stringify(b)).digest('hex'),prior=(await db.query('SELECT payload_hash FROM world_commands WHERE member_id=$1 AND id=$2',[me.id,b.commandId])).rows[0];
   if(prior){need(prior.payload_hash===hash,'操作識別碼已使用',409);return{...await view(db,me),replayed:true};}
   if(b.action==='invites'){need(typeof b.enabled==='boolean');await db.query('UPDATE world_profiles SET receive_invites=$2 WHERE member_id=$1',[me.id,b.enabled]);}
   else if(b.action==='mute'){
    need(typeof b.value==='boolean');const other=b.value?await target(db,b.target):(need(uuid(b.target)),(await db.query('SELECT member_id FROM world_profiles WHERE public_id=$1',[b.target])).rows[0]?.member_id);need(other&&other!==me.id);
    if(b.value){need(Number((await db.query('SELECT count(*) AS count FROM world_mutes WHERE member_id=$1',[me.id])).rows[0].count)<60||(await db.query('SELECT 1 FROM world_mutes WHERE member_id=$1 AND muted_id=$2',[me.id,other])).rowCount,'先取消一位靜音，再新增靜音航海員',409);await db.query('INSERT INTO world_mutes(member_id,muted_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[me.id,other]);await db.query("UPDATE world_requests SET status='declined' WHERE status='pending' AND ((sender=$1 AND recipient=$2) OR (sender=$2 AND recipient=$1))",[me.id,other]);}
    else await db.query('DELETE FROM world_mutes WHERE member_id=$1 AND muted_id=$2',[me.id,other]);
   }else if(b.action==='greet'){
    need(phrases.includes(b.phrase));let other=null;if(b.target){other=await target(db,b.target);need(other!==me.id);need(await present(db,other),'對方暫時離開了',409);await socialGuard(db,me.id,other,need);}
    need(!(await db.query("SELECT 1 FROM world_greetings WHERE sender=$1 AND created_at>now()-interval '8 seconds'",[me.id])).rowCount,'稍等一下再打招呼',429);
    await db.query("INSERT INTO world_greetings(id,sender,target,phrase,expires_at) VALUES($1,$2,$3,$4,now()+interval '45 seconds')",[b.commandId,me.id,other,b.phrase]);
   }else if(b.action==='request'){
    const other=await target(db,b.target);need(other!==me.id);await socialGuard(db,me.id,other,need);need(await present(db,other),'等對方回到港口再邀請',409);
    const linked=(await db.query('SELECT 1 FROM player_friendships WHERE member_id=$1 AND friend_id=$2',[me.id,other])).rowCount;
    const pending=(await db.query("SELECT 1 FROM world_requests WHERE sender=$1 AND recipient=$2 AND status='pending' AND expires_at>now()",[me.id,other])).rowCount;
    if(!linked&&!pending){need(!(await db.query("SELECT 1 FROM world_requests WHERE sender=$1 AND recipient=$2 AND created_at>now()-interval '10 minutes'",[me.id,other])).rowCount,'稍後再邀請這位航海員',429);need(Number((await db.query("SELECT count(*) AS count FROM world_requests WHERE sender=$1 AND created_at>now()-interval '5 minutes'",[me.id])).rows[0].count)<3,'先等已送出的邀請回覆',429);await db.query("INSERT INTO world_requests(id,sender,recipient,status,expires_at) VALUES($1,$2,$3,'pending',now()+interval '24 hours')",[b.commandId,me.id,other]);}
   }else{
    need(uuid(b.requestId));const r=(await db.query('SELECT * FROM world_requests WHERE id=$1 AND recipient=$2 FOR UPDATE',[b.requestId,me.id])).rows[0];need(r&&r.expires_at>new Date(),'邀請已到期或找不到',404);const status=b.action==='accept'?'accepted':'declined';need(r.status==='pending'||r.status===status,'邀請已回覆',409);
    if(r.status==='pending'){
     if(b.action==='accept'){
      await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-player-friends'))");
      const other=(await db.query(`SELECT m.id FROM player_logins m ${eligibility} AND m.id=$1`,[r.sender])).rows[0];need(other,'對方目前不能加入世界',403);await socialGuard(db,r.sender,me.id,need);need(await present(db,r.sender)&&await present(db,me.id),'等雙方回到港口再確認',409);
      const existing=(await db.query('SELECT 1 FROM player_friendships WHERE member_id=$1 AND friend_id=$2',[me.id,r.sender])).rowCount;
      if(!existing){await db.query('INSERT INTO world_links(member_id,friend_id) VALUES($1,$2),($2,$1) ON CONFLICT DO NOTHING',[me.id,r.sender]);await db.query('INSERT INTO player_friendships(member_id,friend_id) VALUES($1,$2),($2,$1) ON CONFLICT DO NOTHING',[me.id,r.sender]);}
     }await db.query('UPDATE world_requests SET status=$2 WHERE id=$1',[r.id,status]);
    }
   }
   await db.query('INSERT INTO world_commands(member_id,id,payload_hash) VALUES($1,$2,$3)',[me.id,b.commandId,hash]);
   await db.query("DELETE FROM world_greetings WHERE expires_at<now()-interval '1 day'; DELETE FROM world_commands WHERE created_at<now()-interval '30 days'");
   return view(db,me);
  });
 }};
}
