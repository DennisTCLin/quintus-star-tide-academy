// Synthetic local database only. No production accounts or credentials.
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionAdmin} from '../../server/admin.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {passwordHash} from '../../server/credentials.mjs';
import {grantTickets} from '../../server/star-ticket-admin.mjs';
import {newFamily,draw,validateFamily} from '../../build/game.mjs';
const dir='/tmp/star-tide-admin-live-qa';mkdirSync(dir,{recursive:true,mode:0o700});
const control=new pg.Pool({connectionString:'postgresql://127.0.0.1:55432/postgres'}),dbName='qa_admin_live_'+Date.now();
await control.query('CREATE DATABASE '+dbName);
const api=await createCloudApi({connectionString:'postgresql://127.0.0.1:55432/'+dbName,production:false});
const password='LocalOnly-'+randomUUID(),children=[];await provisionAdmin(api.pool,{username:'LocalOwner',password});
for(const [i,username,displayName] of [[0,'report_one','測試航海員一'],[1,'report_two','測試航海員二']]){
 const made=await provisionChildAccount(api.pool,{username,displayName,password:'2840',grade:4});
 const f=newFamily(),p=f.profiles.quintus;p.milestones.masteryPoints=i?24:108;p.milestones.subjectGrowth.math={masteryPoints:i?24:84,creditedAnswers:i?2:7};if(!i)p.milestones.subjectGrowth.science={masteryPoints:24,creditedAnswers:2};p.tickets=2;draw(f,'quintus',randomUUID(),.8,.2);f.log.push({id:randomUUID(),text:'UNRELATED_PRIVATE_FAMILY_LOG',time:Date.now()});
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,validateFamily(f)]);
 await grantTickets(api.pool,{grantId:randomUUID(),username,ticketType:i?'star':'standard',amount:i?3:2,reason:i?'第二位專屬鼓勵':'第一位專屬鼓勵',operator:'Synthetic operator'},{apply:true});
 children.push({...made,username,displayName});
}
await api.pool.query("INSERT INTO admin_users(id,username,display_name,password_hash,role,member_ids) VALUES($1,'localstaff','LocalStaff',$2,'staff',$3)",[randomUUID(),await passwordHash(password,undefined,10),[children[0].memberId]]);
const saved=JSON.stringify((await api.pool.query('SELECT * FROM game_states ORDER BY account_id')).rows);
const server=createAppServer({api});await new Promise(r=>server.listen(4332,'127.0.0.1',r));
writeFileSync(dir+'/access.json',JSON.stringify({base:'http://localhost:4332',username:'LocalOwner',password,children}),{mode:0o600});
console.log('Isolated admin live fixture ready');
async function close(){const unchanged=saved===JSON.stringify((await api.pool.query('SELECT * FROM game_states ORDER BY account_id')).rows);writeFileSync('outputs/admin-live-learning/no-mutation.json',JSON.stringify({pass:unchanged,syntheticGameStateUnchanged:unchanged},null,2)+'\n');await new Promise(r=>server.close(r));await api.close();await control.query('DROP DATABASE '+dbName);await control.end();unlinkSync(dir+'/access.json');process.exit(unchanged?0:1);}
process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
