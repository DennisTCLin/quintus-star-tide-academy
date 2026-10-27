import {createCloudApi} from '../../server/cloud.mjs';
import {newFamily,startRun,questionById,validateFamily} from '../../build/game.mjs';
import {readFileSync} from 'node:fs';
const api=await createCloudApi({connectionString:'postgres://127.0.0.1:55432/ready_screen_20261026',production:false});
await api.pool.query('DELETE FROM request_limits');
const grade=Number(process.argv[2]||6);if(![4,6].includes(grade))throw Error('Fixture grade');
const fixture=JSON.parse(readFileSync('output/ready-screen/fixtures.json')).find(x=>x.grade===grade);const f=newFamily(),p=f.profiles[fixture.player];p.learning.school=grade===6?'jianan':'yongchun';startRun(f,fixture.player,grade===6?'science':'math',fixture.run,5,false,undefined,'standard');p.run.questions=fixture.questions.map(x=>x.id);p.run.challenge.difficultyLevels=p.run.questions.map(id=>questionById(id).level??1);validateFamily(f);
const result=await api.pool.query("UPDATE game_states SET family=$1 WHERE account_id=(SELECT account_id FROM player_logins WHERE username=$2)",[f,'ready_'+grade]);if(result.rowCount!==1)throw Error('Synthetic fixture missing');await api.close();
