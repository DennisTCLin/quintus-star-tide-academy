// Local-only synthetic UI fixture. Never run against production.
import pg from 'pg';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {newFamily,startRun,answerRun,nextQuestion,questionById,taipeiDay,validateFamily} from '../../build/game.mjs';
const connectionString=process.env.TEST_DATABASE_URL;
if(!/^postgres(?:ql)?:\/\/(?:[^@]+@)?127\.0\.0\.1:55432\/tideglow_voice_battle_release_ui$/.test(connectionString??''))throw Error('Dedicated local synthetic UI database required');
const access=JSON.parse(readFileSync('/tmp/tideglow-integrated-qa.json','utf8'));
if(!/^voiceqa_[a-f0-9]{8}$/.test(access.username))throw Error('Synthetic account required');
const mode=process.argv[2]??'failed',course=process.argv[3]??'math';
const pool=new pg.Pool({connectionString});
try {
 const row=(await pool.query('SELECT g.family,g.account_id FROM game_states g JOIN accounts a ON a.id=g.account_id WHERE a.username=$1',[access.username])).rows[0];
 if(!row)throw Error('Missing fixture account');
 const family=row.family;family.profiles.doudou=newFamily().profiles.doudou;family.revision++;
 startRun(family,'doudou',course,randomUUID(),8,false,taipeiDay());
 const run=family.profiles.doudou.run;
 if(mode==='failed')for(let i=0;i<3;i++){const q=questionById(run.questions[run.index]);answerRun(family,'doudou',run.id,run.index,(q.answer+1)%q.options.length,taipeiDay());if(run.status==='active')nextQuestion(family,'doudou',run.id,run.index);}
 validateFamily(family);
 await pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[row.account_id,family]);
 const evidence={mode,course,runId:run.id,answers:run.questions.map(id=>{const q=questionById(id);return {id,answer:q.answer,audio:q.audio,positions:q.options.map(c=>c.position??null)};}),before:{coins:family.profiles.doudou.coins,xp:family.profiles.doudou.growth.xp[run.companion]??0}};
 writeFileSync('outputs/voice-battle-release/fixture.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({mode,course,status:run.status}));
} finally {await pool.end();}
