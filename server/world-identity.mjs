// Public-world contacts retain pseudonyms on every shared social surface.
// No game/learning identity, profile, or existing private-family relationship is rewritten.
export async function hasWorld(db){return !!(await db.query("SELECT to_regclass('world_profiles') AS table")).rows[0]?.table;}
export async function worldContacts(db,member,ids,accountId=null){
 if((!member&&!accountId)||!ids.length||!await hasWorld(db))return new Map();
 const rows=(await db.query(`SELECT w.member_id,w.public_id,w.nickname,w.avatar,(peer.member_id IS NULL OR peer.approved_at IS NOT NULL) AND (actor.member_id IS NULL OR actor.approved_at IS NOT NULL) AS allowed FROM world_links l JOIN world_profiles w ON w.member_id=l.friend_id LEFT JOIN adult_game_enrollments peer ON peer.member_id=w.member_id LEFT JOIN adult_game_enrollments actor ON actor.member_id=l.member_id WHERE (l.member_id=$1 OR ($1::uuid IS NULL AND l.member_id IN(SELECT id FROM player_logins WHERE account_id=$3))) AND l.friend_id=ANY($2::uuid[])`,[member,ids,accountId])).rows;
 return new Map(rows.map(w=>[w.member_id,w.allowed?{key:w.public_id,name:w.nickname,avatarKey:'world',worldAvatar:w.avatar,id:'quintus',sameAccount:false,lastSeenAt:null,hasActivity:false}:{hidden:true}]));
}
export async function resolveWorldContact(db,member,key){
 if(!await hasWorld(db))return key;
 return(await db.query('SELECT w.member_id FROM world_profiles w JOIN player_friendships l ON l.friend_id=w.member_id AND l.member_id=$1 WHERE w.public_id=$2',[member,key])).rows[0]?.member_id??key;
}
export async function publicBattleNames(db,left,right,names,forcePublic=false){
 const map=await worldContacts(db,left,[right]);if(!forcePublic&&!map.size)return names;
 const rows=(await db.query('SELECT member_id,nickname FROM world_profiles WHERE member_id=ANY($1::uuid[])',[[left,right]])).rows;
 return[left,right].map((id,i)=>rows.find(r=>r.member_id===id)?.nickname??(forcePublic?'星海航海員':names[i]));
}
export async function socialGuard(db,sender,recipient,need,{invite=true,busy=true}={}){
 if(await hasWorld(db)){
  const worldPair=(await db.query('SELECT 1 FROM world_links WHERE (member_id=$1 AND friend_id=$2) OR (member_id=$2 AND friend_id=$1)',[sender,recipient])).rowCount;
  if(worldPair)need(!(await db.query('SELECT 1 FROM adult_game_enrollments WHERE member_id=ANY($1::uuid[]) AND approved_at IS NULL',[[sender,recipient]])).rowCount,'這份世界同玩連結目前無法使用',403);
  need(!(await db.query('SELECT 1 FROM world_mutes WHERE (member_id=$1 AND muted_id=$2) OR (member_id=$2 AND muted_id=$1)',[sender,recipient])).rowCount,'目前無法與這位航海員互動',403);
  if(invite)need(!(await db.query('SELECT 1 FROM world_profiles WHERE member_id=$1 AND NOT receive_invites',[recipient])).rowCount,'對方暫時不收邀請',409);
 }
 if(busy)need(!(await db.query(`SELECT 1 FROM presence_leases l JOIN sessions s ON s.token_hash=l.token_hash JOIN player_logins m ON m.account_id=s.account_id AND m.player_id=l.player_id WHERE m.id=ANY($1::uuid[]) AND (s.member_id IS NULL OR s.member_id=m.id) AND s.expires_at>now() AND l.active AND l.seen_at>now()-interval '35 seconds' AND l.activity IN ('learning','battle','preparing') LIMIT 1`,[[sender,recipient]])).rowCount,'先完成目前的學習或對戰，再邀請一起玩',409);
}
export async function conquestPublicIdentities(db,user,rows,identify){
 if(!await hasWorld(db))return new Map(rows.map(r=>[r.id,{...identify(r),profile:r.player_id}]));
 const known=new Set((await db.query(`SELECT f.friend_id FROM player_friendships f JOIN player_logins m ON m.id=f.member_id WHERE m.account_id=$1 AND ($2::uuid IS NULL OR m.id=$2) AND NOT EXISTS(SELECT 1 FROM world_links w WHERE w.member_id=f.member_id AND w.friend_id=f.friend_id)`,[user.id,user.member_id??null])).rows.map(r=>r.friend_id));
 const publicRows=(await db.query('SELECT member_id,nickname FROM world_profiles WHERE member_id=ANY($1::uuid[])',[rows.map(r=>r.member_id).filter(Boolean)])).rows;
 return new Map(rows.map(r=>{const privateKnown=r.account_id===user.id||known.has(r.member_id),alias=publicRows.find(w=>w.member_id===r.member_id)?.nickname??`星海旅人${r.id.replaceAll('-','').slice(0,6).toUpperCase()}`;return[r.id,privateKnown?{...identify(r),profile:r.player_id}:{name:alias,avatarKey:'world',profile:'quintus'}];}));
}
// Typed response copies only. Historical receipt/state rows are not rewritten.
export function publicConquestState(state,identities){
 const identity=id=>{const i=identities.get(id);return{name:i?.name??'星海航海員',avatarKey:i?.avatarKey??'world',profile:i?.profile??'quintus'};};
 return{...state,tiles:state.tiles.map(t=>({...t,...(t.owner?{ownerInfo:identity(t.owner)}:{ownerInfo:undefined})})),
 ...(state.raidReports?{raidReports:state.raidReports.map(r=>'attackerName'in r?{...r,attackerName:identity(r.attackerId).name}:r)}:{}),
 log:state.log.map(line=>{
  if(line.includes('進攻'))return'StarTideActor'+line.slice(line.indexOf('進攻'));
  // Only known server-authored, identity-free templates survive older log formats.
  if(/^(已製作|已放棄|佔領成功|出征未成功|已加入|黯潮軍團)/u.test(line)||/^[^：，。]{1,30}已更新駐軍，/u.test(line)||/使用[^，]{1,20}，血量 \d+\/\d+。$/u.test(line))return line;
  return'較早的航行紀錄已保留。';
 }).map(line=>line.replace(/^StarTideActor/,'星海航海員'))};
}
