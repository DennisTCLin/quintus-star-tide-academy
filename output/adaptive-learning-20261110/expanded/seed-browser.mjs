import {createCloudApi} from '../../../server/cloud.mjs';
import {provisionChildAccount} from '../../../server/child-account.mjs';
import {newFamily} from '../../../build/game.mjs';
const connectionString=process.env.TEST_DATABASE_URL;
if(!connectionString?.startsWith('postgresql://127.0.0.1:5468/adaptive_child_'))throw Error('Use only this task local QA database');
const api=await createCloudApi({connectionString,production:false});
try{for(const grade of [1,4,6]){const username=`adaptive_release_ui_g${grade}`;if((await api.pool.query('SELECT id FROM player_logins WHERE username=$1',[username])).rowCount)throw Error('Fixture already exists; do not overwrite a previous run');const c=await provisionChildAccount(api.pool,{username,password:'2947',displayName:'Synthetic browser QA',grade});await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[c.accountId,newFamily()]);console.log({username,grade,synthetic:true});}}finally{await api.close();}
