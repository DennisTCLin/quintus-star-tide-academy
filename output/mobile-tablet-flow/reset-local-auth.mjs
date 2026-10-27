// Only synthetic usernames and loopback IPs in the fixed local QA database.
import pg from 'pg';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
const pool=new pg.Pool({connectionString:'postgres://127.0.0.1:55432/mobile_tablet_flow_20261027'});
const keys=['auth-ip:127.0.0.1','auth-ip:::ffff:127.0.0.1',...JSON.parse(readFileSync('/tmp/star-tide-flow-private/accounts.json')).map(f=>'auth-user:'+f.username)];
for(const k of keys)await pool.query('DELETE FROM request_limits WHERE key LIKE $1',[createHash('sha256').update(k).digest('hex')+':%']);await pool.end();
