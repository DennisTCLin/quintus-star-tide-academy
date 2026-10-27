import pg from 'pg';
import {spawn} from 'node:child_process';
const name='all_child_routing_'+Date.now(),control=new pg.Pool({connectionString:'postgres://127.0.0.1:55432/postgres'});
await control.query('CREATE DATABASE '+name);
try {
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run','src/__tests__/all-child-curriculum-cloud.test.mjs'],{stdio:'inherit',env:{...process.env,TEST_DATABASE_URL:'postgres://127.0.0.1:55432/'+name}});child.on('error',reject);child.on('close',resolve);});
 if(code)process.exitCode=Number(code);
} finally {await control.query('DROP DATABASE '+name+' WITH (FORCE)');await control.end();}
