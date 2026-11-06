import {createHash} from 'node:crypto';
import {ensureSchema} from './schema-migration.mjs';
import {validateFamily,petById,initialCompanion,needsOnboarding,taipeiDay} from '../build/game.mjs';
const need=(v,message='交換資料無效',status=400)=>{if(!v)throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const digest=b=>createHash('sha256').update(JSON.stringify(b)).digest('hex');
const ongoing=p=>p.run?.status==='active'||p.run?.capture?.outcome==='pending'||(p.mathIsland?.run&&!p.mathIsland.run.completed)||p.mathIsland?.run?.capture?.outcome==='pending'||p.learning.study?.session?.status==='active';
export async function createFriendTradeService({pool,transaction,lockSession,limit}){
 await ensureSchema(pool,'friend-trades-v1',`
 CREATE TABLE IF NOT EXISTS friend_trades(id uuid PRIMARY KEY,sender uuid NOT NULL REFERENCES player_logins(id),recipient uuid NOT NULL REFERENCES player_logins(id),give text NOT NULL,receive text NOT NULL,status text NOT NULL CHECK(status IN('pending','accepted','declined','cancelled')),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK(sender<>recipient),CHECK(give<>receive));
 CREATE INDEX IF NOT EXISTS friend_trade_sender ON friend_trades(sender,created_at DESC);
 CREATE INDEX IF NOT EXISTS friend_trade_recipient ON friend_trades(recipient,created_at DESC);
 CREATE TABLE IF NOT EXISTS friend_trade_commands(member uuid NOT NULL REFERENCES player_logins(id),id uuid NOT NULL,payload_hash text NOT NULL,PRIMARY KEY(member,id));
 `);
 async function actor(db,user,player){need(!user.member_id||user.player_id===player,'只能操作自己的交換',403);const m=(await db.query('SELECT id,account_id,player_id,display_name FROM player_logins WHERE account_id=$1 AND player_id=$2',[user.id,player])).rows[0];need(m,'請使用自己的玩家帳號',403);return m;}
 async function friend(db,me,id){need(uuid(id)&&id!==me.id);const m=(await db.query('SELECT m.id,m.account_id,m.player_id,m.display_name FROM player_logins m JOIN player_friendships f ON f.friend_id=m.id AND f.member_id=$1 WHERE m.id=$2',[me.id,id])).rows[0];need(m,'只能與已確認的好友交換',403);need(m.account_id!==me.account_id,'同家庭請使用原本的交換所');return m;}
 async function view(db,me,friendId){
  const offers=(await db.query(`SELECT t.*,s.display_name AS sender_name,r.display_name AS recipient_name FROM friend_trades t JOIN player_logins s ON s.id=t.sender JOIN player_logins r ON r.id=t.recipient WHERE sender=$1 OR recipient=$1 ORDER BY created_at DESC LIMIT 30`,[me.id])).rows;
  const result={offers:offers.map(o=>({id:o.id,incoming:o.recipient===me.id,friend:o.recipient===me.id?o.sender:o.recipient,name:o.recipient===me.id?o.sender_name:o.recipient_name,give:o.give,receive:o.receive,status:o.status==='pending'&&o.expires_at<=new Date()?'expired':o.status,expiresAt:o.expires_at.toISOString()}))};
  if(friendId){const other=await friend(db,me,friendId),rows=(await db.query('SELECT account_id,family FROM game_states WHERE account_id=ANY($1::uuid[])',[[me.account_id,other.account_id]])).rows;const cards=m=>{const p=rows.find(r=>r.account_id===m.account_id)?.family.profiles[m.player_id];need(p,'收藏暫時無法讀取',409);return Object.entries(p.owned).filter(([id,n])=>n>0&&id!==initialCompanion(p)).map(([id,copies])=>({id,copies}));};Object.assign(result,{friend:other.id,name:other.display_name,mine:cards(me),theirs:cards(other)});}
  return result;
 }
 async function validProfiles(db,me,other,give,receive,locked=false){
  need(typeof give==='string'&&typeof receive==='string'&&petById(give)&&petById(receive)&&give!==receive,'請選擇兩隻不同且可交換的夥伴');
  const rows=(await db.query(`SELECT * FROM game_states WHERE account_id=ANY($1::uuid[]) ORDER BY account_id ${locked?'FOR UPDATE':''}`,[[me.account_id,other.account_id]])).rows;
  const families=rows.map(row=>({row,family:validateFamily(row.family)})),get=m=>families.find(x=>x.row.account_id===m.account_id)?.family.profiles[m.player_id];
  const a=get(me),b=get(other);need(a&&b,'收藏暫時無法讀取',409);
  for(const [m,p,card]of[[me,a,give],[other,b,receive]]){
   need(!needsOnboarding(p)&&card!==initialCompanion(p)&&p.owned[card]>0,'夥伴已不在收藏中，或是不能交換的初始夥伴',409);
   need(!ongoing(p)&&!families.find(x=>x.row.account_id===m.account_id).family.pendingTrade,'請先結束雙方目前的學習或交換，再進行交換',409);
   const learning=(await db.query('SELECT state FROM adult_english_states WHERE user_id=$1',[m.id])).rows[0]?.state;
   need(!learning?.session||learning.session.complete,'請先結束雙方目前的英文挑戰，再進行交換',409);
  }
  return{families,a,b};
 }
 return{
  read:async(user,player,friendId)=>view(pool,await actor(pool,user,player),friendId),
  command:async(user,b)=>{
   const allowed=b?.action==='propose'?['player','action','commandId','friend','give','receive']:['player','action','commandId','offer'];need(b&&Object.keys(b).every(k=>allowed.includes(k))&&['propose','accept','decline','cancel'].includes(b.action)&&uuid(b.commandId));await limit('friend-trade:'+user.id,60,600);
   return transaction(async db=>{
    await lockSession(db,user);const me=await actor(db,user,b.player);await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-friend-trades'))");
    const previous=(await db.query('SELECT payload_hash FROM friend_trade_commands WHERE member=$1 AND id=$2',[me.id,b.commandId])).rows[0];if(previous){need(previous.payload_hash===digest(b),'操作識別碼已使用',409);return view(db,me);}
    if(b.action==='propose'){
     const other=await friend(db,me,b.friend);await validProfiles(db,me,other,b.give,b.receive);
     await db.query("INSERT INTO friend_trades(id,sender,recipient,give,receive,status,expires_at) VALUES($1,$2,$3,$4,$5,'pending',now()+interval '24 hours')",[b.commandId,me.id,other.id,b.give,b.receive]);
    }else{
     need(uuid(b.offer));const offer=(await db.query('SELECT * FROM friend_trades WHERE id=$1 AND (sender=$2 OR recipient=$2) FOR UPDATE',[b.offer,me.id])).rows[0];need(offer,'找不到自己的交換邀請',404);
     need(b.action==='cancel'?offer.sender===me.id:offer.recipient===me.id,'只能回覆自己收到的交換，或取消自己送出的邀請',403);
     const status={accept:'accepted',decline:'declined',cancel:'cancelled'}[b.action];
     if(offer.status!=='pending')need(offer.status===status,'交換已回覆',409);
     else{
      need(offer.expires_at>new Date(),'交換邀請已到期',409);
      if(b.action==='accept'){
       const other=await friend(db,me,offer.sender),{families,a,b:otherProfile}=await validProfiles(db,me,other,offer.receive,offer.give,true),day=taipeiDay();
       for(const[p,give,receive]of[[a,offer.receive,offer.give],[otherProfile,offer.give,offer.receive]]){p.owned[give]--;if(!p.owned[give]){delete p.owned[give];if(p.equipped===give)p.equipped=initialCompanion(p);}p.owned[receive]=(p.owned[receive]??0)+1;if(!Object.hasOwn(p.firstAcquired,receive))p.firstAcquired[receive]=day;}
       for(const {row,family}of families){family.revision++;family.log=[{id:offer.id,text:`${petById(offer.give).name} ↔ ${petById(offer.receive).name} 好友交換完成`,time:Date.now()},...family.log].slice(0,100);await db.query('UPDATE game_states SET family=$2,updated_at=now() WHERE account_id=$1',[row.account_id,validateFamily(family)]);}
       // The existing conquest roster reads the collection from these same accounts on its next refresh.
      }
      await db.query('UPDATE friend_trades SET status=$2 WHERE id=$1',[offer.id,status]);
     }
    }
    await db.query('INSERT INTO friend_trade_commands(member,id,payload_hash) VALUES($1,$2,$3)',[me.id,b.commandId,digest(b)]);return view(db,me);
   });
  },
 };
}
