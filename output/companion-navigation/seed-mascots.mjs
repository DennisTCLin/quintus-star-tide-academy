// These are synthetic rows in the disposable local QA database, not real child accounts.
import pg from 'pg';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,validateFamily} from '../../build/game.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
const pool=new pg.Pool({connectionString:'postgres://127.0.0.1:55432/companion_navigation_20261027'});
const path='/tmp/star-tide-navigation-private/accounts.json',fixtures=JSON.parse(readFileSync(path));
for(const [username,grade,player,mascot] of [['feifei',2,'feifei','bow'],['olivia',1,'doudou','dog']]){
 if(fixtures.some(f=>f.username===username))continue;
 const password=String(randomInt(1000,10000));
 const made=await provisionChildAccount(pool,{username,password,displayName:'合成學伴驗收',grade});
 const family=newFamily();family.profiles[player].learning.school='yongchun';validateFamily(family);
 await pool.query('UPDATE player_logins SET player_id=$2 WHERE id=$1',[made.memberId,player]);
 await pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,family]);
 fixtures.push({username,password,grade,player,mascot});
}
writeFileSync(path,JSON.stringify(fixtures),{mode:0o600});await pool.end();console.log('Two synthetic mascot fixtures ready');
