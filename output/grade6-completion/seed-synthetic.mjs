import pg from 'pg';
import fs from 'node:fs';
import {newFamily,markMastered,validateFamily} from '../../build/game.mjs';
const pool=new pg.Pool({connectionString:'postgresql://localhost:55432/alston_english_browser'});
try {
 const {rows}=await pool.query('SELECT g.account_id,g.family,p.display_name FROM game_states g JOIN player_logins p ON p.account_id=g.account_id WHERE p.username=$1',['alston']);
 if(rows.length!==1||rows[0].display_name!=='English QA')throw Error('Synthetic fixture identity mismatch');
 const f=rows[0].family;f.profiles.alston.run=null;f.profiles.alston.learning=newFamily().profiles.alston.learning;f.profiles.alston.learning.school='jianan';
 const baseline=JSON.parse(fs.readFileSync('scripts/imports/grade6-supplement-baseline.json','utf8'));
 for(const id of Object.values(baseline.idsByCourse).flat())markMastered(f.profiles.alston.learning,id);
 validateFamily(f);
 await pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[rows[0].account_id,f]);
 console.log('Synthetic local profile mastered all 100 released supplemental questions');
}finally {await pool.end();}
