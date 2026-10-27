// Isolated synthetic database, never production.
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionAdmin} from '../../server/admin.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
const dir='/tmp/star-tide-admin-school';mkdirSync(dir,{recursive:true,mode:0o700});
const control=new pg.Pool({connectionString:'postgresql://127.0.0.1:55432/postgres'}),dbName='qa_admin_school_'+Date.now();
await control.query('CREATE DATABASE '+dbName);
const api=await createCloudApi({connectionString:'postgresql://127.0.0.1:55432/'+dbName,production:false});
const password='LocalOnly-'+randomUUID();await provisionAdmin(api.pool,{username:'LocalOwner',password});
await provisionChildAccount(api.pool,{username:'alston',displayName:'校籍顯示測試',password:'2840',grade:6});
const server=createAppServer({api});await new Promise(r=>server.listen(4340,'127.0.0.1',r));
writeFileSync(dir+'/access.json',JSON.stringify({base:'http://127.0.0.1:4340',username:'LocalOwner',password}),{mode:0o600});
console.log('Isolated admin school fixture ready');
async function close(){await new Promise(r=>server.close(r));await api.close();await control.query('DROP DATABASE '+dbName);await control.end();unlinkSync(dir+'/access.json');process.exit(0);}
process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
