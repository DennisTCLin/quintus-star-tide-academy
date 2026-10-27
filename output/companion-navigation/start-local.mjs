// Only an isolated database of synthetic accounts; never production credentials.
import {createCloudApi} from '../../server/cloud.mjs';
import {createAppServer} from '../../server.mjs';
import {provisionChildAccount} from '../../server/child-account.mjs';
import {newFamily,validateFamily} from '../../build/game.mjs';
import {writeFileSync,mkdirSync,existsSync,readFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
const connectionString=process.env.TEST_DATABASE_URL;
if(connectionString!=='postgres://127.0.0.1:55432/companion_navigation_20261027')throw Error('Dedicated local database required');
const api=await createCloudApi({connectionString,production:false});
const path='/tmp/star-tide-navigation-private/accounts.json';
if(!existsSync(path)){
 const fixtures=[];
 for(const grade of [1,2,4]){
  const username='nav_qa_'+grade,password=String(randomInt(1000,10000));
  const made=await provisionChildAccount(api.pool,{username,password,displayName:'導覽驗收',grade});
  const family=newFamily();family.profiles[made.playerId].learning.school='yongchun';validateFamily(family);
  await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,family]);
  fixtures.push({grade,username,password,player:made.playerId});
 }
 mkdirSync('/tmp/star-tide-navigation-private',{recursive:true,mode:0o700});writeFileSync(path,JSON.stringify(fixtures),{mode:0o600});
}
const server=createAppServer({api});server.listen(4386,'127.0.0.1',()=>console.log('Synthetic navigation QA on 4386'));
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
