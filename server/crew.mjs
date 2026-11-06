import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {ensureSchema} from './schema-migration.mjs';
const need=(v,message='同玩資料不正確',status=400)=>{if(!v)throw Object.assign(Error(message),{status});};
const hash=v=>createHash('sha256').update(v).digest('hex');
const fields=(b,keys)=>need(b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).every(k=>keys.includes(k)));
export async function createCrewService({pool,transaction,lockSession,limit}){
 await ensureSchema(pool,'crew-pairing-v1',`
 CREATE TABLE IF NOT EXISTS crew_invites(token_hash text PRIMARY KEY,owner_id uuid NOT NULL REFERENCES player_logins(id),expires_at timestamptz NOT NULL,used_by uuid REFERENCES player_logins(id));
 CREATE TABLE IF NOT EXISTS crew_requests(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES player_logins(id),requester_id uuid NOT NULL REFERENCES player_logins(id),status text NOT NULL CHECK(status IN('pending','accepted','declined')),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK(owner_id<>requester_id));
 CREATE INDEX IF NOT EXISTS crew_owner_requests ON crew_requests(owner_id,created_at);
 CREATE INDEX IF NOT EXISTS crew_requester_requests ON crew_requests(requester_id,created_at);
 `);
 async function member(db,user,player){need(typeof player==='string');need(!user.member_id||user.player_id===player,'只能操作自己的同玩邀請',403);const row=(await db.query('SELECT id,display_name FROM player_logins WHERE account_id=$1 AND player_id=$2',[user.id,player])).rows[0];need(row,'這個帳號尚未開通同玩邀請',403);return row;}
 async function view(db,id){
  const requests=(await db.query(`SELECT r.id,r.status,r.owner_id=$1 AS incoming,r.expires_at,o.display_name AS owner_name,q.display_name AS requester_name FROM crew_requests r JOIN player_logins o ON o.id=r.owner_id JOIN player_logins q ON q.id=r.requester_id WHERE (r.owner_id=$1 OR r.requester_id=$1) AND r.expires_at>now() ORDER BY r.created_at DESC LIMIT 30`,[id])).rows;
  return{requests:requests.map(r=>({id:r.id,status:r.status,incoming:r.incoming,name:r.incoming?r.requester_name:r.owner_name,expiresAt:r.expires_at.toISOString()}))};
 }
 return{
  read:async(user,player)=>{const me=await member(pool,user,player);return view(pool,me.id);},
  command:async(user,b)=>{
   fields(b,['player','action','code','requestId']);need(['create','request','accept','decline'].includes(b.action));await limit('crew:'+user.id,30,600);
   return transaction(async db=>{
    await lockSession(db,user);const me=await member(db,user,b.player);
    await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-crew-pairing'))");
    if(b.action==='create'){
     const code=randomBytes(8).toString('hex').toUpperCase();await db.query('DELETE FROM crew_invites WHERE owner_id=$1 AND used_by IS NULL',[me.id]);
     await db.query("INSERT INTO crew_invites(token_hash,owner_id,expires_at) VALUES($1,$2,now()+interval '24 hours')",[hash(code),me.id]);return{...await view(db,me.id),code};
    }
    if(b.action==='request'){
     need(typeof b.code==='string'&&/^[A-F0-9]{16}$/.test(b.code.trim().toUpperCase()),'邀請碼格式不正確');
     const invite=(await db.query('SELECT * FROM crew_invites WHERE token_hash=$1 AND expires_at>now() FOR UPDATE',[hash(b.code.trim().toUpperCase())])).rows[0];need(invite&&(!invite.used_by||invite.used_by===me.id),'邀請碼無效或已使用',404);need(invite.owner_id!==me.id,'請輸入家人的邀請碼');
     const pending=(await db.query("SELECT id FROM crew_requests WHERE owner_id=$1 AND requester_id=$2 AND status='pending' AND expires_at>now()",[invite.owner_id,me.id])).rows[0];
     if(!pending)await db.query("INSERT INTO crew_requests(id,owner_id,requester_id,status,expires_at) VALUES($1,$2,$3,'pending',now()+interval '24 hours')",[randomUUID(),invite.owner_id,me.id]);
     await db.query('UPDATE crew_invites SET used_by=$2 WHERE token_hash=$1',[invite.token_hash,me.id]);return view(db,me.id);
    }
    need(typeof b.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(b.requestId));
    const request=(await db.query('SELECT * FROM crew_requests WHERE id=$1 AND owner_id=$2 AND expires_at>now() FOR UPDATE',[b.requestId,me.id])).rows[0];need(request,'找不到這份同玩邀請',404);
    if(request.status!=='pending'){need(request.status===(b.action==='accept'?'accepted':'declined'),'這份邀請已回覆',409);return view(db,me.id);}
    await db.query('UPDATE crew_requests SET status=$2 WHERE id=$1',[request.id,b.action==='accept'?'accepted':'declined']);
    if(b.action==='accept'){
     await db.query('INSERT INTO player_friendships(member_id,friend_id) VALUES($1,$2),($2,$1) ON CONFLICT DO NOTHING',[me.id,request.requester_id]);
     // Only an existing school member or an already vouched-for adult can sponsor
     // shared-world access. Two untrusted public signups cannot self-approve.
     const trusted=await db.query(`SELECT m.id FROM player_logins m LEFT JOIN adult_game_enrollments e ON e.member_id=m.id WHERE m.id=ANY($1::uuid[]) AND (e.member_id IS NULL OR e.approved_at IS NOT NULL)`,[[me.id,request.requester_id]]);
     if(trusted.rowCount)await db.query('UPDATE adult_game_enrollments SET approved_at=COALESCE(approved_at,now()) WHERE member_id=ANY($1::uuid[])',[[me.id,request.requester_id]]);
    }
    return view(db,me.id);
   });
  },
 };
}
