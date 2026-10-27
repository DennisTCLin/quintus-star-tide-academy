import { PLAYERS, ROSTER, taipeiDay, collectionWeekStart, creatureProgress } from '../build/game.mjs';
const pets = new Map(ROSTER.map(p=>[p.id,p]));
const originalAvatars = {quintus:'quintus',olivia:'doudou',sunny:'qingqing',feifei:'feifei',alston:'alston'};
export function collectionIdentity(row, user, player) {
  const avatarKey = ['alan','jimmy','brownie','jasper'].includes(row.username) ? row.username
    : originalAvatars[row.username] === row.player_id || Number(row.household_size)>1 || !row.member_id ? row.player_id : 'unknown';
  return {key:row.member_id ?? `household:${row.player_id}`,id:row.player_id,
    name:row.display_name || PLAYERS.find(p=>p.id===row.player_id)?.name || '航海員',avatarKey,
    isSelf:user.member_id ? row.member_id===user.member_id : row.account_id===user.id && row.player_id===player};
}
export function collectionProjection(profile, day=taipeiDay(), detail=false) {
  if(!profile?.owned || !profile.firstAcquired) return {available:false};
  const entries=Object.entries(profile.onboarding?.pet === null ? {} : profile.owned).filter(([id,count])=>pets.has(id)&&Number.isSafeInteger(count)&&count>0);
  const total=entries.reduce((n,[,count])=>n+count,0),unique=entries.length;
  const start=collectionWeekStart(day),history=Object.entries(profile.firstAcquired).filter(([id,date])=>pets.has(id)&&typeof date==='string'&&date<=day);
  return {available:true,total,unique,duplicates:total-unique,scores:{all:unique,day:history.filter(([,date])=>date===day).length,week:history.filter(([,date])=>date>=start).length},
    ...(detail?{cards:entries.map(([id,count])=>({id,count,level:creatureProgress(pets.get(id).rarity,profile.growth?.xp?.[id]??0).level}))}:{})};
}
export async function readPlayerCollections(pool,user,{player,target},assert) {
  assert(PLAYERS.some(p=>p.id===player),'請選擇航海員');
  assert(!user.member_id || player===user.player_id,'只能操作自己的航海員',403);
  assert(target===null || typeof target==='string'&&target.length<=80,'找不到這位好友',404);
  // One bounded roster query. Identity and profile always come from the same account/member row.
  const {rows}=await pool.query(`WITH viewer AS (
    SELECT id FROM player_logins WHERE account_id=$1 AND ($2::uuid IS NULL OR id=$2)
  ), roster AS (
    SELECT id FROM player_logins WHERE account_id=$1 UNION SELECT f.friend_id FROM player_friendships f JOIN viewer v ON f.member_id=v.id
  ) SELECT m.id AS member_id,m.account_id,m.player_id,m.username,m.display_name,
    (SELECT count(*) FROM player_logins h WHERE h.account_id=m.account_id) AS household_size,
    g.family->'profiles'->m.player_id AS profile
    FROM roster JOIN player_logins m ON m.id=roster.id LEFT JOIN game_states g ON g.account_id=m.account_id
    ORDER BY m.id`,[user.id,user.member_id??null]);
  if(!rows.length && !user.member_id) {
    const state=(await pool.query('SELECT family FROM game_states WHERE account_id=$1',[user.id])).rows[0];
    for(const p of PLAYERS)rows.push({account_id:user.id,player_id:p.id,display_name:p.name,profile:state?.family?.profiles?.[p.id]});
  }
  const day=taipeiDay();
  if(target!==null){const row=rows.find(r=>collectionIdentity(r,user,player).key===target);assert(row,'找不到這位好友的收藏',404);return {day,player:{...collectionIdentity(row,user,player),...collectionProjection(row.profile,day,true)}};}
  const roster=rows.map(row=>({...collectionIdentity(row,user,player),...collectionProjection(row.profile,day)}));
  return {day,players:roster};
}
