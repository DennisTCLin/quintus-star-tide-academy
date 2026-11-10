import {createCloudApi} from '../../../server/cloud.mjs';
import {provisionChildAccount} from '../../../server/child-account.mjs';
import {newFamily,startIsland,answerIsland,finishIsland,enableAdaptive,taipeiDay} from '../../../build/game.mjs';
const connectionString=process.env.TEST_DATABASE_URL;
if(!connectionString?.startsWith('postgresql://127.0.0.1:5468/adaptive_child_'))throw Error('Use only task local QA database');
const api=await createCloudApi({connectionString,production:false});
try{
 const username='adaptive_progression_ui';if((await api.pool.query('SELECT id FROM player_logins WHERE username=$1',[username])).rowCount)throw Error('Fixture exists; never reset existing user');
 const child=await provisionChildAccount(api.pool,{username,password:'2947',displayName:'Synthetic capture QA',grade:1}),f=newFamily(),p=f.profiles[child.playerId],day=taipeiDay();delete p.onboarding;
 p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day,attempted:[]};const r=startIsland(f,child.playerId,'play','1A-01','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',day);
 enableAdaptive(p.learning);r.practice=true;for(let i=0;i<6;i++)answerIsland(f,child.playerId,r.id,i,i<3?r.items[i].answer:r.items[i].choices.find(a=>a!==r.items[i].answer),day);
 finishIsland(f,child.playerId,r.id,day);
 await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[child.accountId,f]);console.log({username,synthetic:true,completed:r.completed,passed:!!p.mathIsland.units['1A-01'].play});
}finally{await api.close();}
