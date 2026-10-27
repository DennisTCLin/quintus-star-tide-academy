import {allStudents} from './admin-access.mjs';
import {validateFamily,STARS_PER_TICKET,petById,PLAYERS,ACTIVITIES,studySummary,taipeiDay} from '../build/game.mjs';
import {applySchoolCurriculum} from './school-roster.mjs';

// A view never writes a heartbeat. The real member, not a shared grade slot,
// owns each lease. Multiple devices remain online while any lease is valid.
export async function readAdminPresence(pool,admin){
 const {rows}=await pool.query(`SELECT m.id,h.seen_at,live.online_until,live.activity
  FROM player_logins m LEFT JOIN player_last_seen h ON h.account_id=m.account_id AND h.player_id=m.player_id
  LEFT JOIN LATERAL (
    SELECT max(LEAST(s.expires_at,l.seen_at+interval '35 seconds')) AS online_until,
      (array_agg(l.activity ORDER BY l.seen_at DESC))[1] AS activity
    FROM presence_leases l JOIN sessions s ON s.token_hash=l.token_hash
    WHERE s.account_id=m.account_id AND l.player_id=m.player_id AND s.expires_at>now()
      AND (s.member_id IS NULL OR s.member_id=m.id) AND l.active AND l.seen_at>now()-interval '35 seconds'
  ) live ON true WHERE ($1::boolean OR m.id=ANY($2::uuid[])) ORDER BY m.id`,[allStudents(admin),admin.member_ids]);
 return {serverNow:Date.now(),students:rows.map(r=>({memberId:r.id,lastSeenAt:r.seen_at?.getTime()??null,
  onlineUntil:r.online_until?.getTime()??null,activity:r.online_until&&Object.hasOwn(ACTIVITIES,r.activity)?r.activity:null}))};
}

// The caller enforces super-admin access. Return only data attributable to this
// child; the old free-text family ledger cannot be reliably separated by member.
export async function readAdminParentReport(pool,memberId){
 const row=(await pool.query(`SELECT m.id AS member_id,m.account_id,m.player_id,m.username,m.display_name,m.trial_curriculum,
  g.family,g.verified,g.updated_at,(SELECT count(*) FROM player_logins peers WHERE peers.account_id=m.account_id) AS household_size
  FROM player_logins m JOIN game_states g ON g.account_id=m.account_id WHERE m.id=$1`,[memberId])).rows[0];
 if(!row)throw Object.assign(new Error('找不到這位孩子'),{status:404});
 let family;try{family=applySchoolCurriculum(validateFamily(row.family),row);}catch{throw Object.assign(new Error('這位孩子的學習資料暫時無法讀取，原始資料已保留'),{status:422});}
 const p=family.profiles[row.player_id],run=p.run;
 const exists=(await pool.query("SELECT to_regclass('star_ticket_grants') AS name")).rows[0]?.name;
 const grants=exists?(await pool.query('SELECT grant_id,receipt,created_at FROM star_ticket_grants WHERE member_id=$1 ORDER BY created_at DESC LIMIT 12',[memberId])).rows.map(r=>({grantId:r.grant_id,amount:r.receipt.amount,ticketType:r.receipt.ticketType??'star',reason:r.receipt.reason,createdAt:r.created_at.toISOString()})):[];
 const counts=Object.values(p.owned).filter(n=>n>0),pet=p.lastDraw?petById(p.lastDraw.pet):null;
 const verified=row.verified?.[row.player_id];
 return {memberId,username:row.username,displayName:row.display_name,grade:PLAYERS.find(x=>x.id===row.player_id).grade,
  study:studySummary(p.learning,PLAYERS.find(x=>x.id===row.player_id).grade,taipeiDay()),
  cloudSavedAt:row.updated_at.toISOString(),cloudVerified:Number.isSafeInteger(verified)&&verified>=0?verified:null,gardenImported:p.gardenImported,
  collection:{species:counts.length,copies:counts.reduce((a,b)=>a+b,0),draws:p.draws},
  rewards:{stars:p.rewardStars,starsPerTicket:STARS_PER_TICKET,completedRounds:p.rewardRounds},
  run:run?{course:run.course,day:run.day,status:run.status,answered:run.answers?.length??null,correct:run.answers?.filter(Boolean).length??null,total:run.questions.length,practice:run.practice}:null,
  lastDraw:p.lastDraw?{name:pet?.name??'夥伴',rarity:pet?.rarity??null,ticketType:p.lastDraw.ticketKind==='star'?'star':'standard',duplicate:p.lastDraw.duplicate}:null,
  grants,updatedAt:new Date().toISOString()};
}
