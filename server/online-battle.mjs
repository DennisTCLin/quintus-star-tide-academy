import { randomInt } from 'node:crypto';
import { newBattle, battleMove, PLAYERS } from '../build/game.mjs';
import { ensureSchema } from './schema-migration.mjs';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const terminal = status => !['pending','active'].includes(status);

export async function createOnlineBattleService({ pool, transaction, lockSession, assert }) {
  await ensureSchema(pool, 'online-battles-v1', `
    CREATE TABLE IF NOT EXISTS online_battles (
      id uuid PRIMARY KEY, host uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,
      guest uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE CHECK(host<>guest),
      status text NOT NULL, revision integer NOT NULL DEFAULT 0, host_pet text NOT NULL,
      battle jsonb, names jsonb NOT NULL, reason text, dismissed uuid[] NOT NULL DEFAULT '{}',
      deadline timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS online_battles_host ON online_battles(host,created_at DESC);
    CREATE INDEX IF NOT EXISTS online_battles_guest ON online_battles(guest,created_at DESC);
    CREATE TABLE IF NOT EXISTS online_battle_commands (
      room uuid NOT NULL REFERENCES online_battles(id) ON DELETE CASCADE,
      member uuid NOT NULL REFERENCES player_logins(id) ON DELETE CASCADE,
      id uuid NOT NULL, payload jsonb NOT NULL, PRIMARY KEY(room,member,id));
  `);
  async function member(db,user,player) {
    assert(PLAYERS.some(p=>p.id===player), '請先選擇玩家',400);
    assert(!user.member_id || player===user.player_id,'只能操作自己的對戰',403);
    return (await db.query('SELECT id,account_id,player_id,display_name FROM player_logins WHERE account_id=$1 AND player_id=$2',[user.id,player])).rows[0];
  }
  async function expire(db) {
    await db.query("UPDATE online_battles SET status='expired',revision=revision+1,updated_at=now() WHERE status='pending' AND deadline<=now()");
    const old=(await db.query("SELECT * FROM online_battles WHERE status='active' AND deadline<=now() FOR UPDATE")).rows;
    for(const row of old) {
      row.battle.winner=row.battle.turn===0?1:0;
      await db.query("UPDATE online_battles SET status='finished',battle=$2,reason='timeout',revision=revision+1,updated_at=now() WHERE id=$1",[row.id,row.battle]);
    }
    // Terminal receipts only; active rooms never expire through retention cleanup.
    await db.query("DELETE FROM online_battles WHERE status NOT IN ('pending','active') AND updated_at<now()-interval '7 days'");
  }
  async function snapshot(db, me) {
    const row=me && (await db.query(`SELECT * FROM online_battles WHERE (host=$1 OR guest=$1)
      AND NOT ($1=ANY(dismissed)) AND (status IN ('pending','active') OR updated_at>now()-interval '10 minutes')
      ORDER BY CASE WHEN status IN ('pending','active') THEN 0 ELSE 1 END,created_at DESC LIMIT 1`,[me.id])).rows[0];
    return { serverNow:Date.now(), available:!!me, room:row?{
      id:row.id,status:row.status,revision:row.revision,side:row.host===me.id?0:1,
      names:row.names,battle:row.battle,hostPet:row.host_pet,deadline:row.deadline.getTime(),reason:row.reason,
    }:null };
  }
  async function serialized(user,player,fn) {
    return transaction(async db=>{
      await lockSession(db,user);
      // One short social transaction serializes cross-account accepts/invites and busy checks.
      // It never locks or writes another account's learning progress.
      await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-online-battle'))");
      await expire(db);
      const me=await member(db,user,player);
      if(fn) { assert(me,'請使用玩家帳號才能邀戰',409); await fn(db,me); }
      return snapshot(db,me);
    });
  }
  async function profile(db,me,pet) {
    const row=(await db.query('SELECT family FROM game_states WHERE account_id=$1',[me.account_id])).rows[0];
    const p=row?.family?.profiles?.[me.player_id];
    assert(typeof pet==='string' && p?.owned?.[pet]>0,'請選擇已擁有的夥伴',400);
    return p;
  }
  async function online(db,id) {
    return (await db.query(`SELECT 1 FROM player_logins m JOIN sessions s ON s.account_id=m.account_id
      JOIN presence_leases l ON l.token_hash=s.token_hash AND l.player_id=m.player_id
      WHERE m.id=$1 AND (s.member_id IS NULL OR s.member_id=m.id) AND s.expires_at>now()
      AND l.active AND l.seen_at>now()-interval '35 seconds' LIMIT 1`,[id])).rowCount>0;
  }
  return {
    read:(user,player)=>serialized(user,player),
    command:async(user,body)=>{
      assert(body && typeof body==='object' && !Array.isArray(body),'操作無效',400);
      const allowed={invite:['player','action','commandId','friend','pet'],accept:['player','action','commandId','room','revision','pet'],move:['player','action','commandId','room','revision','move'],decline:['player','action','commandId','room','revision'],cancel:['player','action','commandId','room','revision'],leave:['player','action','commandId','room','revision'],dismiss:['player','action','commandId','room','revision']};
      assert(Object.hasOwn(allowed,body.action) && Object.keys(body).every(k=>allowed[body.action].includes(k)) && uuid(body.commandId),'操作無效',400);
      return serialized(user,body.player,async(db,me)=>{
        if(body.action==='invite') {
          assert(uuid(body.friend)&&body.friend!==me.id,'請選擇好友',400);
          const existing=(await db.query('SELECT * FROM online_battles WHERE id=$1',[body.commandId])).rows[0];
          if(existing) { assert(existing.host===me.id && existing.guest===body.friend && existing.host_pet===body.pet,'邀請識別碼已使用',409);return; }
          const linked=(await db.query('SELECT 1 FROM player_friendships WHERE member_id=$1 AND friend_id=$2',[me.id,body.friend])).rowCount;
          assert(linked,'只能邀請自己的好友',403);
          assert(await online(db,me.id) && await online(db,body.friend),'好友目前不在線，請稍後再邀請',409);
          const busy=(await db.query("SELECT 1 FROM online_battles WHERE status IN ('pending','active') AND (host=ANY($1::uuid[]) OR guest=ANY($1::uuid[]))",[[me.id,body.friend]])).rowCount;
          assert(!busy,'你或好友已有邀請或對戰，請先完成',409);
          const recent=(await db.query("SELECT 1 FROM online_battles WHERE host=$1 AND created_at>now()-interval '30 seconds'",[me.id])).rowCount;
          assert(!recent,'請等 30 秒再發出邀請',429);
          await profile(db,me,body.pet);
          const guest=(await db.query('SELECT display_name FROM player_logins WHERE id=$1',[body.friend])).rows[0];
          await db.query("INSERT INTO online_battles(id,host,guest,status,host_pet,names,deadline) VALUES($1,$2,$3,'pending',$4,$5,now()+interval '90 seconds')",[body.commandId,me.id,body.friend,body.pet,JSON.stringify([me.display_name,guest.display_name])]);
          return;
        }
        assert(uuid(body.room)&&Number.isSafeInteger(body.revision)&&body.revision>=0,'操作無效',400);
        const row=(await db.query('SELECT * FROM online_battles WHERE id=$1 FOR UPDATE',[body.room])).rows[0];
        assert(row && [row.host,row.guest].includes(me.id),'找不到這場對戰',404);
        const receipt=(await db.query('SELECT payload FROM online_battle_commands WHERE room=$1 AND member=$2 AND id=$3',[row.id,me.id,body.commandId])).rows[0];
        if(receipt) {assert(Object.keys(receipt.payload).length===Object.keys(body).length && Object.keys(body).every(key=>receipt.payload[key]===body[key]), '操作識別碼已使用',409);return;}
        // Each participant acknowledges the result independently; the other
        // participant's acknowledgement must not invalidate an already-seen result.
        assert(body.action==='dismiss' ? body.revision<=row.revision : row.revision===body.revision,'對戰已更新，請確認最新畫面',409);
        const side=row.host===me.id?0:1;
        if(body.action==='accept') {
          assert(row.status==='pending' && side===1,'邀請已結束或無法接受',409);
          assert(await online(db,row.host) && await online(db,row.guest),'對方目前已離線，請重新邀請',409);
          const host=(await db.query('SELECT * FROM player_logins WHERE id=$1',[row.host])).rows[0];
          const left=await profile(db,host,row.host_pet), right=await profile(db,me,body.pet);
          row.battle=newBattle([row.host_pet],[body.pet],'duo',[left.growth?.xp??{},right.growth?.xp??{}]);
          row.battle.turn=randomInt(2);row.status='active';
        } else if(body.action==='move') {
          assert(row.status==='active' && row.battle.turn===side,'請等待你的回合',409);
          assert(['attack','guard','heal','burst'].includes(body.move),'招式無效',400);
          try { row.battle=battleMove(row.battle,body.move); } catch(e) {assert(false,e.message,400);}
          if(row.battle.winner!==null)row.status='finished';
        } else if(body.action==='leave') {
          assert(row.status==='active','對戰已結束',409);row.status='finished';row.reason='leave';row.battle.winner=side===0?1:0;
        } else if(body.action==='decline' || body.action==='cancel') {
          assert(row.status==='pending' && side===(body.action==='decline'?1:0),'邀請已結束',409);
          row.status=body.action==='decline'?'declined':'cancelled';
        } else {
          assert(terminal(row.status),'請先結束邀請或對戰',409);
          row.dismissed=[...new Set([...row.dismissed,me.id])];
        }
        await db.query(`UPDATE online_battles SET status=$2,battle=$3,reason=$4,dismissed=$5,revision=revision+1,
          deadline=CASE WHEN $2='active' THEN now()+interval '120 seconds' ELSE deadline END,updated_at=now() WHERE id=$1`,[row.id,row.status,row.battle,row.reason,row.dismissed]);
        await db.query('INSERT INTO online_battle_commands(room,member,id,payload) VALUES($1,$2,$3,$4)',[row.id,me.id,body.commandId,JSON.stringify(body)]);
      });
    }
  };
}
