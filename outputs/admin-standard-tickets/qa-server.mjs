// Isolated synthetic database only. Never connect this fixture to production.
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionAdmin} from '../../server/admin.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {passwordHash} from '../../server/credentials.mjs';
import {newFamily} from '../../build/game.mjs';
const dir='/tmp/star-tide-admin-standard-qa';mkdirSync(dir,{recursive:true,mode:0o700});
const control=new pg.Pool({connectionString:'postgresql://127.0.0.1:55432/postgres'}),dbName='qa_admin_tickets_'+Date.now();
await control.query('CREATE DATABASE '+dbName);
const api=await createCloudApi({connectionString:'postgresql://127.0.0.1:55432/'+dbName,production:false});
const password='LocalOnly-'+randomUUID();await provisionAdmin(api.pool,{username:'LocalOwner',password});
for(const [username,displayName] of [['ticket_one','測試航海員一'],['ticket_two','測試航海員二']]){
 const made=await provisionChildAccount(api.pool,{username,displayName,password:'2840',grade:4});
 const f=newFamily();f.profiles.quintus.tickets=1;f.profiles.quintus.starTickets=2;
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,f]);
}
await api.pool.query("INSERT INTO admin_users(id,username,display_name,password_hash,role,can_grant,student_scope,grant_limit) VALUES($1,'localstaff','LocalStaff',$2,'staff',true,'all',3)",[randomUUID(),await passwordHash(password,undefined,10)]);
const server=createAppServer({api});await new Promise(r=>server.listen(4331,'127.0.0.1',r));
writeFileSync(dir+'/access.json',JSON.stringify({base:'http://localhost:4331',username:'LocalOwner',password}),{mode:0o600});
console.log('Isolated admin tickets fixture ready');
async function close(){await new Promise(r=>server.close(r));await api.close();await control.query('DROP DATABASE '+dbName);await control.end();unlinkSync(dir+'/access.json');process.exit(0);}
process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
