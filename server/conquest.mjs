import { randomUUID, createHash } from 'node:crypto';
import { ensureSchema } from './schema-migration.mjs';
import { collectionIdentity } from './player-collections.mjs';
import { PLAYERS, createConquest, advanceConquest, ensureSeason, syncConquestRoster, conquestAct, conquestCreditAnswer, seasonAt, conquestAlive, conquestPower, enrollConquest, validEnrollment, expeditionRoster, incomingRaid, resolveNpcRaid, acknowledgeRaidReports } from '../build/game.mjs';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const privateState = ({ tiles, lastBattle, playerId, shared, ...state }) => state;
const digest = body => createHash('sha256').update(JSON.stringify(body, Object.keys(body).sort())).digest('hex');
const combatMs = 20000;

export async function createConquestService({ pool, transaction, lockSession, assert }) {
  await ensureSchema(pool, 'shared-conquest-v1', `
    CREATE TABLE IF NOT EXISTS conquest_worlds(id text PRIMARY KEY, season text NOT NULL, revision bigint NOT NULL DEFAULT 0, tiles jsonb NOT NULL, updated_at bigint NOT NULL);
    CREATE TABLE IF NOT EXISTS conquest_players(id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, player_id text NOT NULL, state jsonb NOT NULL, UNIQUE(account_id,player_id));
    CREATE TABLE IF NOT EXISTS conquest_commands(player_id uuid NOT NULL REFERENCES conquest_players(id) ON DELETE CASCADE,id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(player_id,id));
    CREATE INDEX IF NOT EXISTS conquest_command_retention ON conquest_commands(created_at);
  `);
  await ensureSchema(pool, 'conquest-npc-clock-v1', `CREATE TABLE IF NOT EXISTS conquest_npc_clock(id text PRIMARY KEY,last_tick_at bigint NOT NULL,last_raid_at bigint NOT NULL DEFAULT 0);`);
  const scope = (user,player) => {
    assert(PLAYERS.some(p=>p.id===player),'請先選擇航海員',400);
    assert(!user.member_id || user.player_id===player,'只能操作自己的群島領地',403);
  };
  const lockWorld = db => db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-shared-conquest-v1'))");
  async function load(db,user,player,now,create = true) {
    await lockWorld(db);
    now = Math.max(now, Date.now());
    let base=createConquest(seasonAt(now),now);
    await db.query("INSERT INTO conquest_worlds(id,season,tiles,updated_at) VALUES('global',$1,$2,$3) ON CONFLICT DO NOTHING",[base.season,JSON.stringify(base.tiles),now]);
    const world=(await db.query("SELECT * FROM conquest_worlds WHERE id='global' FOR UPDATE")).rows[0];
    now = Math.max(now, Date.now(), Number(world.updated_at));
    base = createConquest(seasonAt(now),now);
    if(create) await db.query('INSERT INTO conquest_players(id,account_id,player_id,state) VALUES($1,$2,$3,$4) ON CONFLICT(account_id,player_id) DO NOTHING',[randomUUID(),user.id,player,JSON.stringify(privateState(base))]);
    // Collection/XP are read from committed account data; never lock another family's learning row.
    const rows=(await db.query(`SELECT c.*,m.id AS member_id,m.username,m.display_name,
      (SELECT count(*) FROM player_logins siblings WHERE siblings.account_id=c.account_id) AS household_size,
      g.family->'profiles'->c.player_id AS profile
      FROM conquest_players c JOIN game_states g ON g.account_id=c.account_id
      LEFT JOIN player_logins m ON m.account_id=c.account_id AND m.player_id=c.player_id`)).rows;
    const me=user ? rows.find(row=>row.account_id===user.id&&row.player_id===player) : undefined;
    const rolled=world.season!==base.season;
    if(rolled) {
      for(const row of rows) {
        // Old ownership is used only to settle its final production before rollover.
        const previous={...row.state,tiles:world.tiles,playerId:row.id,lastBattle:null};
        const next=ensureSeason(previous,now);
        row.state=privateState(next);
        await db.query('UPDATE conquest_players SET state=$2 WHERE id=$1',[row.id,JSON.stringify(row.state)]);
      }
      world.tiles=base.tiles;world.season=base.season;world.updated_at=now;world.revision=Number(world.revision)+1;
      await saveWorld(db,world);
    }
    // Wild wounds have a world clock; personal recovery has each owner's clock.
    const agedWild=advanceConquest({...base,updatedAt:Number(world.updated_at),tiles:world.tiles.filter(t=>!t.owner)},now);
    const wildById=new Map(agedWild.tiles.map(t=>[t.id,t]));
    world.tiles=world.tiles.map(t=>!t.owner?wildById.get(t.id):t);
    const livingOwners=new Set(rows.map(r=>r.id));
    world.tiles=world.tiles.map(t=>t.owner&&!livingOwners.has(t.owner)?{...t,owner:null,guards:t.wild.map(g=>({...g})),commander:undefined,shieldUntil:0,shieldStartsAt:0,battleUntil:0}:t);
    for(const row of rows) {
      row.roster=expeditionRoster(row.profile?.owned??{},row.state.enrollment,row.profile?.growth?.xp??{});
      row.current=syncConquestRoster(advanceConquest({...row.state,tiles:world.tiles,playerId:row.id,shared:true,lastBattle:null},now),row.roster);
      const entitled=new Set(row.roster.map(unit=>unit.id));
      row.current.tiles=row.current.tiles.map(t=>t.owner===row.id?{...t,guards:t.guards.filter(g=>entitled.has(g.id))}:t);
      const own=new Map(row.current.tiles.filter(t=>t.owner===row.id).map(t=>[t.id,t]));
      world.tiles=world.tiles.map(t=>own.get(t.id)??t);
      if (user) row.identity=collectionIdentity(row,user,player);
    }
    world.updated_at=now;
    for(const row of rows)row.current.tiles=world.tiles;
    return {world,rows,me,now};
  }
  const saveWorld = (db,world) => db.query("UPDATE conquest_worlds SET season=$1,revision=$2,tiles=$3,updated_at=$4 WHERE id='global'",[world.season,world.revision,JSON.stringify(world.tiles),world.updated_at]);
  const savePlayer = (db,row) => db.query('UPDATE conquest_players SET state=$2 WHERE id=$1',[row.id,JSON.stringify(privateState(row.current))]);
  function snapshot(context) {
    const {world,rows,me,now}=context;
    assert(me,'找不到群島玩家資料',409);
    const identities=new Map(rows.map(row=>[row.id,{name:row.identity.name,profile:row.player_id,avatarKey:row.identity.avatarKey}]));
    const tiles=world.tiles.map(tile=>({...tile,ownerInfo:tile.owner?identities.get(tile.owner):undefined}));
    const players=rows.filter(row=>row.current.enrollment).map(row=>({id:row.id,...identities.get(row.id),allianceId:row.current.enrollment.allianceId,heroId:row.current.enrollment.heroId,count:tiles.filter(t=>t.owner===row.id).length,defense:tiles.filter(t=>t.owner===row.id).reduce((sum,t)=>sum+conquestPower(t.guards),0)}));
    return {serverNow:now,revision:Number(world.revision),me:me.id,state:{...me.current,tiles,lastBattle:null},collection:{owned:me.profile?.owned??{},growthXp:me.profile?.growth?.xp??{}},players};
  }
  const allowed = {join:['alliance','hero'],claim:['tileId','team','commander','expectedCost'],reinforce:['tileId','team','commander'],abandon:['tileId'],station:['tileId','unitId'],recall:['tileId','unitId'],craft:['remedy'],heal:['unitId','remedy']};
  return {
    // No auth/session or HTTP call is needed. Share the existing world lock with
    // PvP, healing and learning; never acquire account/learning locks from here.
    tickNpcRaids: async () => transaction(async db => {
      const {world,rows,now} = await load(db,null,null,Date.now(),false);
      let raids = 0;
      for (const row of rows) {
        row.current.tiles = world.tiles;
        const raid = validEnrollment(row.current.enrollment) && incomingRaid(row.current,row.id,now);
        if (raid) {
          row.current = resolveNpcRaid(row.current,row.id,raid.id,now,raid.tileId);
          world.tiles = row.current.tiles.map(t => t.id === raid.tileId ? {...t,battleUntil:now+combatMs} : t);
          raids++;
        }
        // Persist each owner's clock and recovery together with wounds/reports.
        await savePlayer(db,row);
      }
      if (raids) world.revision = Number(world.revision) + 1;
      await saveWorld(db,world);
      await db.query(`INSERT INTO conquest_npc_clock(id,last_tick_at,last_raid_at) VALUES('global',$1,$2)
        ON CONFLICT(id) DO UPDATE SET last_tick_at=EXCLUDED.last_tick_at,last_raid_at=CASE WHEN EXCLUDED.last_raid_at>0 THEN EXCLUDED.last_raid_at ELSE conquest_npc_clock.last_raid_at END`,[now,raids ? now : 0]);
      return {raids,at:now};
    }),
    read: async(user,player)=>{scope(user,player);return transaction(async db=>{await lockSession(db,user);return snapshot(await load(db,user,player,Date.now()));});},
    markReportsRead: async(user,body)=>{
      assert(body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).every(k=>['player','reportIds'].includes(k)),'操作無效',400);
      scope(user,body.player);
      assert(Array.isArray(body.reportIds)&&body.reportIds.length>0&&body.reportIds.length<=30&&body.reportIds.every(id=>typeof id==='string'&&id.length<=200),'戰報識別碼無效',400);
      return transaction(async db=>{
        await lockSession(db,user);
        await lockWorld(db);
        const me=(await db.query('SELECT id,state FROM conquest_players WHERE account_id=$1 AND player_id=$2 FOR UPDATE',[user.id,body.player])).rows[0];
        assert(me,'請先同步群島戰況',409);
        // Acknowledge only submitted retained IDs; do not invoke world loading,
        // season rollover, recovery, combat or command receipts for this metadata.
        const raidReadIds=acknowledgeRaidReports(me.state,body.reportIds);
        await db.query("UPDATE conquest_players SET state=jsonb_set(state,'{raidReadIds}',$2::jsonb) WHERE id=$1",[me.id,JSON.stringify(raidReadIds)]);
        return {raidReadIds};
      });
    },
    command: async(user,body)=>{
      assert(body&&typeof body==='object'&&!Array.isArray(body),'操作無效',400);scope(user,body.player);
      assert(Object.hasOwn(allowed,body.type)&&Object.keys(body).every(k=>['player','type','commandId','season','revision',...allowed[body.type]].includes(k))&&uuid(body.commandId)&&Number.isSafeInteger(body.revision)&&body.revision>=0,'操作無效',400);
      if(body.remedy!==undefined)assert(['bandage','potion'].includes(body.remedy),'未知的補給配方',400);
      if(body.unitId!==undefined)assert(typeof body.unitId==='string'&&body.unitId.length<=100,'夥伴無效',400);
      if(body.team!==undefined)assert(Array.isArray(body.team)&&body.team.length<=5&&body.team.every(id=>typeof id==='string'&&id.length<=100),'隊伍無效',400);
      return transaction(async db=>{
        await lockSession(db,user);
        const context=await load(db,user,body.player,Date.now()),{world,me,rows,now}=context;
        const hash=digest(body),old=(await db.query('SELECT payload_hash,result FROM conquest_commands WHERE player_id=$1 AND id=$2',[me.id,body.commandId])).rows[0];
        if(old){assert(old.payload_hash===hash,'操作識別碼已使用，請勿更改內容',409);return {...snapshot(context),result:old.result,replayed:true};}
        assert(body.season===world.season&&body.revision===Number(world.revision),'群島戰況已更新，請重新查看後操作',409);
        let next;
        const tile=world.tiles.find(t=>t.id===body.tileId),defender=tile?.owner&&rows.find(r=>r.id===tile.owner);
        try {
          if(body.type==='join')next=enrollConquest(me.current,me.id,body.alliance,body.hero,me.profile.owned,now);
          else {
            assert(validEnrollment(me.current.enrollment),'請先選擇聯盟與英雄',400);
            const {player,commandId,revision,...action}=body;
            next=conquestAct(me.current,me.id,action,me.roster,now,true);
          }
        }catch(error){if(error.status)throw error;assert(false,error.message,400);}
        me.current=next;world.tiles=next.tiles;world.revision=Number(world.revision)+1;
        if(body.type==='claim') {
          if(defender&&defender.id!==me.id) {
            const units={...defender.current.units};
            for(const guard of next.lastBattle.defendersAfter)units[guard.id]={...guard};
            defender.current={...defender.current,units,tiles:world.tiles,log:[`${me.identity.name}進攻${tile.name}：${next.lastBattle.won?'領地失守，守軍返回休養':'守軍成功防守'}。`,...defender.current.log].slice(0,30)};
            await savePlayer(db,defender);
          }
          world.tiles=world.tiles.map(t=>t.id===body.tileId?{...t,guards:t.guards.filter(conquestAlive),battleUntil:now+combatMs}:t);
        }
        me.current.tiles=world.tiles;
        await savePlayer(db,me);await saveWorld(db,world);
        // Original outcome is immutable even if a retry happens after another player attacks.
        const result={state:{...me.current,tiles:world.tiles},occurredAt:now};
        await db.query('INSERT INTO conquest_commands(player_id,id,payload_hash,result) VALUES($1,$2,$3,$4)',[me.id,body.commandId,hash,JSON.stringify(result)]);
        return {...snapshot(context),result,replayed:false};
      });
    },
    syncAccount:async(db,user,player)=>{
      const {world,rows}=await load(db,user,player,Date.now(),false);
      const affected=rows.filter(row=>row.account_id===user.id);
      if(!affected.length)return;
      for(const row of affected)await savePlayer(db,row);
      world.revision=Number(world.revision)+1;await saveWorld(db,world);
    },
    // Called inside the authenticated learning transaction, never by a client reward endpoint.
    credit:async(db,user,player,attempt,correct,now)=>{
      scope(user,player);
      const context=await load(db,user,player,now,false),{me,world}=context;
      if(!me?.current.enrollment)return;
      const next=conquestCreditAnswer(me.current,attempt,correct);
      if(next===me.current)return;
      me.current=next;await savePlayer(db,me);
      // Energy is private and does not invalidate everyone else's chart revision.
      await saveWorld(db,world);
    },
  };
}
