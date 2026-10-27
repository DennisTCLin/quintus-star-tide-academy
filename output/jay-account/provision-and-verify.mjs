// Operator-only; identity and password arrive on stdin, never in the repository.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
const {provisionChildAccount}=await import(process.cwd()+'/server/child-account.mjs');
const {connectCurrentPlayers}=await import(process.cwd()+'/server/player-friends.mjs');
const {PLAYERS}=await import(process.cwd()+'/build/game.mjs');
const {SCHOOL_ROSTER}=await import(process.cwd()+'/server/school-roster.mjs');
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const {identity,base,expectedPeers}=JSON.parse(raw);raw='';
assert.equal(PLAYERS.find(p=>p.id==='jay')?.grade,5);
assert.equal(identity.grade,5);
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:4,statement_timeout:10000,lock_timeout:5000});
const guard=await pool.connect();let committed=false,cookie,csrf;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
async function call(path,body){
 const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie,'X-CSRF-Token':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
try {
 await guard.query('BEGIN');
 const existing=(await guard.query('SELECT id,account_id FROM player_logins WHERE username=$1',[identity.username.toLowerCase()])).rows[0];
 const excluded=existing?.account_id??'00000000-0000-0000-0000-000000000000';
 // Shared row locks prevent unrelated progress writes during the bounded preservation check.
 const accountIds=(await guard.query('SELECT id FROM accounts WHERE id<>$1 ORDER BY id FOR SHARE',[excluded])).rows.map(r=>r.id);
 await guard.query('SELECT account_id FROM game_states WHERE account_id=ANY($1::uuid[]) ORDER BY account_id FOR SHARE',[accountIds]);
 const peers=(await guard.query('SELECT id,account_id FROM player_logins WHERE account_id=ANY($1::uuid[]) ORDER BY id FOR SHARE',[accountIds])).rows;
 assert.equal(peers.length,expectedPeers,'Player snapshot count changed; inspect before proceeding');
 async function snapshot(){return (await guard.query(`SELECT a.id,to_jsonb(a) AS account,to_jsonb(g) AS state,
 (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM player_logins m WHERE m.account_id=a.id) AS members
 FROM accounts a LEFT JOIN game_states g ON g.account_id=a.id WHERE a.id=ANY($1::uuid[]) ORDER BY a.id`,[accountIds])).rows;}
 const before=digest(await snapshot());
 const edges=()=>guard.query('SELECT * FROM player_friendships WHERE member_id=ANY($1::uuid[]) AND friend_id=ANY($1::uuid[]) ORDER BY member_id,friend_id',[peers.map(p=>p.id)]);
 const oldEdges=digest((await edges()).rows);
 const result=await provisionChildAccount(pool,identity);assert.equal(result.playerId,'jay');
 let added=0;for(const peer of peers)added+=(await connectCurrentPlayers(pool,[result.memberId,peer.id])).added;
 for(const peer of peers)assert.equal((await connectCurrentPlayers(pool,[result.memberId,peer.id])).added,0);
 assert.equal((await provisionChildAccount(pool,identity)).created,false);
 assert.equal(digest(await snapshot()),before,'Existing account or progress changed');
 assert.equal(digest((await edges()).rows),oldEdges,'Existing friendships changed');
 const links=(await guard.query('SELECT member_id,friend_id FROM player_friendships WHERE member_id=$1 OR friend_id=$1',[result.memberId])).rows;
 assert.equal(links.length,peers.length*2);
 for(const peer of peers){assert(links.some(r=>r.member_id===result.memberId&&r.friend_id===peer.id));assert(links.some(r=>r.friend_id===result.memberId&&r.member_id===peer.id));}
 await guard.query('COMMIT');committed=true;
 const beforeLogin=digest((await pool.query('SELECT * FROM game_states WHERE account_id=$1',[result.accountId])).rows);
 const login=await call('login',{username:identity.username,password:identity.password});assert.equal(login.status,200);cookie=login.cookie;csrf=login.data.csrf;assert(cookie&&csrf);
 assert.equal(login.data.playerId,'jay');assert.equal(login.data.displayName,identity.displayName);assert.equal(login.data.family.version,9);
 assert.equal(login.data.family.revision,0);assert.deepEqual(login.data.family.profiles.jay.onboarding,{pet:null,confirmed:false});
 assert(Object.values(login.data.verified).every(n=>n===0));
 const friends=await call('friends');assert.equal(friends.status,200);assert.deepEqual(friends.data.friends.filter(f=>!f.sameAccount).map(f=>f.key).sort(),peers.map(p=>p.id).sort());
 const denied=await call('command',{id:randomUUID(),revision:0,command:{type:'home-decor',player:'alston',action:'open'}});assert.equal(denied.status,403);
 assert.equal((await call('logout',{})).status,200);cookie=undefined;
 assert.equal(digest((await pool.query('SELECT * FROM game_states WHERE account_id=$1',[result.accountId])).rows),beforeLogin);
 const school=SCHOOL_ROSTER.find(s=>s.username===identity.username.toLowerCase());assert.equal(school?.grade,5);assert.equal(school?.schoolName,'臺北市東門國小');
 console.log(JSON.stringify({created:result.created,playerId:result.playerId,grade:5,school:school.schoolName,existingPlayers:peers.length,friendshipsAdded:added,mutualFriends:peers.length,existingAccountsAndProgressUnchanged:true,existingFriendshipsUnchanged:true,retrySafe:true,loginVerified:true,untouchedOnboarding:true,crossPlayerDenied:true,logoutVerified:true},null,2));
}finally{
 if(!committed)await guard.query('ROLLBACK');
 if(cookie)try{await call('logout',{});}catch{}
 guard.release();await pool.end();
}
