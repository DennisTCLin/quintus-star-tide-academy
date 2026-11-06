import {randomBytes,randomUUID,randomInt,createHash} from 'node:crypto';
import {ensureSchema} from './schema-migration.mjs';
import {passwordHash} from './credentials.mjs';
import {parseState,exerciseById,EXERCISES} from '../build/adult.mjs';
import {newOnboardingFamily,validateFamily,PLAYERS,petById,growthProgress,chooseMonster,encounterStats,awardQuestion,completeVoyage,awardLearningMaterials,saveCompletionStar,QUESTION_XP,MAX_COMPANION_XP} from '../build/game.mjs';
const slot='quintus'; // Storage slot only. Identity is the original adult user UUID.
const need=(v,message='操作無效',status=400)=>{if(!v)throw Object.assign(Error(message),{status});};
const hash=v=>createHash('sha256').update(v).digest('hex');
export async function createAdultGameService({pool,transaction,adultAuth,publicState,conquest,lockSession}){
 await ensureSchema(pool,'adult-game-enrollment-v1',`
 CREATE TABLE IF NOT EXISTS adult_game_enrollments(user_id uuid PRIMARY KEY REFERENCES adult_english_users(id),account_id uuid UNIQUE NOT NULL REFERENCES accounts(id),member_id uuid UNIQUE NOT NULL REFERENCES player_logins(id),carry_xp bigint NOT NULL,approved_at timestamptz,CHECK(user_id=account_id AND user_id=member_id));
 CREATE TABLE IF NOT EXISTS adult_game_runs(user_id uuid NOT NULL REFERENCES adult_english_users(id),session_id text NOT NULL,companion text NOT NULL,outcome text NOT NULL DEFAULT 'active' CHECK(outcome IN('active','won','failed')),earned_answers integer NOT NULL DEFAULT 0,rewarded boolean NOT NULL DEFAULT false,PRIMARY KEY(user_id,session_id));
 CREATE TABLE IF NOT EXISTS adult_game_completions(user_id uuid NOT NULL REFERENCES adult_english_users(id),day text NOT NULL,lesson_id text NOT NULL,session_id text NOT NULL,PRIMARY KEY(user_id,day,lesson_id));
 `);
 await ensureSchema(pool,'adult-game-encounter-v1','ALTER TABLE adult_game_runs ADD COLUMN IF NOT EXISTS encounter jsonb');
 async function enter(req){
  const adult=await adultAuth.authenticate(req);need(req.headers['x-csrf-token']===adult.csrf,'請重新登入成人帳號',403);
  const existing=(await pool.query('SELECT user_id FROM adult_game_enrollments WHERE user_id=$1',[adult.id])).rowCount;
  // Disabled compatibility credentials never become another way to log into an adult.
  const disabled=existing?null:await passwordHash(randomBytes(32).toString('hex'));
  return transaction(async db=>{
   await db.query('SELECT id FROM adult_english_users WHERE id=$1 FOR UPDATE',[adult.id]);
   const parent=(await db.query('SELECT * FROM adult_english_sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>now() FOR UPDATE',[adult.token_hash,adult.id])).rows[0];need(parent,'登入已到期',401);
   const learning=parseState(JSON.stringify((await db.query('SELECT state FROM adult_english_states WHERE user_id=$1 FOR UPDATE',[adult.id])).rows[0].state));need(learning.profile,'請先設定成人學習名稱');
   let enrollment=(await db.query('SELECT * FROM adult_game_enrollments WHERE user_id=$1',[adult.id])).rows[0];
   if(!enrollment){
    need(learning.xp%10===0,'原英文成果需要核對，資料未更動',422);
    const family=newOnboardingFamily(),p=family.profiles[slot],points=learning.xp*2;
    // Carry existing verified English achievement/currency once; do not invent pet XP or past voyages.
    p.milestones.masteryPoints=points;p.milestones.subjectGrowth.english={masteryPoints:points,creditedAnswers:learning.xp/10};p.coins=learning.xp;
    const verified=Object.fromEntries(PLAYERS.map(p=>[p.id,p.id===slot?points:0]));
    const internal='adult_game_'+adult.id.replaceAll('-','');
    await db.query('INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',[adult.id,internal,disabled,hash(randomBytes(32))]);
    await db.query('INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)',[adult.id,validateFamily(family),verified]);
    await db.query('INSERT INTO player_logins(id,account_id,username,password_hash,player_id,display_name) VALUES($1,$1,$2,$3,$4,$5)',[adult.id,internal,disabled,slot,learning.profile.name]);
    enrollment=(await db.query('INSERT INTO adult_game_enrollments(user_id,account_id,member_id,carry_xp) VALUES($1,$1,$1,$2) RETURNING *',[adult.id,learning.xp])).rows[0];
   }
   await db.query(`INSERT INTO sessions(token_hash,account_id,member_id,csrf,expires_at) VALUES($1,$2,$2,$3,$4) ON CONFLICT(token_hash) DO NOTHING`,[adult.token_hash,adult.id,adult.csrf,parent.expires_at]);
   const compat=(await db.query('SELECT account_id,member_id FROM sessions WHERE token_hash=$1',[adult.token_hash])).rows[0];need(compat.account_id===adult.id&&compat.member_id===adult.id,'登入資料不符',409);
   const row=(await db.query('SELECT * FROM game_states WHERE account_id=$1',[adult.id])).rows[0];
   return publicState(row,{...adult,adult_id:adult.id,member_id:adult.id,player_id:slot,display_name:learning.profile.name,social_approved:!!enrollment.approved_at},adult.csrf);
  });
 }
 async function authenticate(req){
  const adult=await adultAuth.authenticate(req);
  const row=(await pool.query(`SELECT s.*,e.approved_at,m.display_name FROM sessions s JOIN adult_game_enrollments e ON e.user_id=s.account_id AND e.member_id=s.member_id JOIN player_logins m ON m.id=e.member_id WHERE s.token_hash=$1 AND s.account_id=$2 AND s.expires_at>now()`,[adult.token_hash,adult.id])).rows[0];
  need(row,'請重新開啟成人遊戲',401);
  return {...adult,adult_id:adult.id,member_id:adult.id,player_id:slot,display_name:row.display_name,social_approved:!!row.approved_at};
 }
 async function afterCommand(db,user,before,next,command,day){
  const enrollment=(await db.query('SELECT * FROM adult_game_enrollments WHERE user_id=$1',[user.id])).rows[0];if(!enrollment)return;
  if(command.type==='profile'){await db.query('UPDATE player_logins SET display_name=$2 WHERE id=$1 AND account_id=$1',[user.id,next.profile.name]);return;}
  if(!['lesson-start','review-start','answer','hint','next','end'].includes(command.type))return;
  const session=next.session;if(!session)return;
  const answeredId=command.type==='answer'?before.session.ids[before.session.index]:undefined;
  const row=(await db.query('SELECT * FROM game_states WHERE account_id=$1 FOR UPDATE',[user.id])).rows[0],family=validateFamily(row.family),p=family.profiles[slot];
  need(p.onboarding?.confirmed,'請先迎接你的初始夥伴');
  await db.query('INSERT INTO adult_game_runs(user_id,session_id,companion) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[user.id,session.id,p.equipped]);
  let run=(await db.query('SELECT * FROM adult_game_runs WHERE user_id=$1 AND session_id=$2 FOR UPDATE',[user.id,session.id])).rows[0];
  if(!run.encounter){const level=growthProgress(p.growth.xp[run.companion]??0).level,monster=chooseMonster(level,randomInt(2**32));run.encounter={monster:monster.family,variant:monster.id,level,earned:0,combat:{version:2,ally:encounterStats(2,petById(run.companion).rarity,level),foe:encounterStats(2,monster.rarity,level)}};await db.query('UPDATE adult_game_runs SET encounter=$3 WHERE user_id=$1 AND session_id=$2',[user.id,session.id,run.encounter]);}
  need(run.outcome!=='failed'||command.type==='end','這場挑戰已結束，回港口後再出發');
  let changed=false;
  const delta=next.xp-before.xp;
  if(command.type==='answer'&&delta>0){
   need(delta===10,'英文獎勵資料不符',422);
   const id=answeredId,awarded=awardQuestion(p.milestones,{questionId:id,subject:'english',dayKey:day,attempts:1});need(awarded.awarded,'英文獎勵已領取',409);
   p.milestones=awarded.state;p.coins+=10;const oldXp=p.growth.xp[run.companion]??0;p.growth.xp[run.companion]=Math.min(MAX_COMPANION_XP,oldXp+QUESTION_XP);run.encounter.earned+=p.growth.xp[run.companion]-oldXp;awardLearningMaterials(p);
   row.verified[slot]=(row.verified[slot]??0)+20;run.earned_answers++;changed=true;
   await db.query('UPDATE adult_game_runs SET earned_answers=$3,encounter=$4 WHERE user_id=$1 AND session_id=$2',[user.id,session.id,run.earned_answers,run.encounter]);
  }
  if(command.type==='answer'&&session.results.filter(r=>!r.correct).length>=3){run.outcome='failed';await db.query("UPDATE adult_game_runs SET outcome='failed' WHERE user_id=$1 AND session_id=$2",[user.id,session.id]);}
  if((command.type==='next'||command.type==='answer')&&session.complete){
   const won=session.results.filter(r=>r.correct).length>=Math.min(4,session.ids.length);
   run.outcome=won?'won':'failed';await db.query('UPDATE adult_game_runs SET outcome=$3 WHERE user_id=$1 AND session_id=$2',[user.id,session.id,run.outcome]);
   if(won&&session.mode==='lesson'&&session.ids.length===6&&run.earned_answers>=4){
    const claim=await db.query('INSERT INTO adult_game_completions(user_id,day,lesson_id,session_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING user_id',[user.id,day,session.lessonId,session.id]);
    if(claim.rowCount){p.milestones=completeVoyage(p.milestones,run.earned_answers*20);if(p.day!==day){p.day=day;p.rewardRounds=0;p.draws=0;}p.rewardRounds++;saveCompletionStar(p);changed=true;run.rewarded=true;await db.query('UPDATE adult_game_runs SET rewarded=true WHERE user_id=$1 AND session_id=$2',[user.id,session.id]);}
   }
  }
  p.adultAdventure={sessionId:session.id,companion:run.companion,outcome:run.outcome,earned:run.earned_answers,rewarded:!!run.rewarded,encounter:run.encounter};changed=true;
  if(changed){family.revision++;await db.query('UPDATE game_states SET family=$2,verified=$3,updated_at=now() WHERE account_id=$1',[user.id,validateFamily(family),row.verified]);if(enrollment.approved_at)await conquest.syncAccount(db,{...user,member_id:user.id,player_id:slot,adult_id:user.id},slot);}
  // Private energy follows the same first daily independent answer gate; no duplicate reward endpoint.
  if(enrollment.approved_at&&command.type==='answer'&&delta>0)await conquest.credit(db,{...user,member_id:user.id,player_id:slot},slot,`adult:${day}:${answeredId}`,true,Date.now());
 }
 function practiceQuestion(id,revealed=false){
  const q=exerciseById(id);need(q?.options,'找不到成人英文題目',409);
  const answer=q.options.indexOf(q.answer);
  return{id:q.id,programme:'adult-english',grade:null,subject:'english',course:'english',skill:'adult-en',prompt:q.kind==='listen'?`閱讀英文句子，選出意思：${q.prompt}`:q.prompt,options:q.options.map(text=>({text})),hint:'依情境選出完整且自然的英文說法。',...(revealed?{answer,explanation:q.explanation,target:q.prompt}:{})};
 }
 async function practiceInTransaction(db,user,b,battle=false){
  const allowed=battle?(b.type==='battle-start'?['type','player','course','used']:['type','player','token','question','choice']):(b.type==='start'?['type','player','used']:['type','question','choice']);
  need(Object.keys(b).every(k=>allowed.includes(k)));const starting=b.type==='start'||b.type==='battle-start';
  if(starting){
   need(b.player===slot&&Array.isArray(b.used)&&b.used.length<3&&b.used.every(id=>typeof id==='string'&&id.length<=100));
   if(battle)need(b.course==='english','成人助戰使用英文');
   const pool=EXERCISES.filter(q=>q.options&&!b.used.includes(q.id)),q=pool[randomInt(pool.length)],token=randomUUID();
   await db.query('UPDATE sessions SET practice_question=$2 WHERE token_hash=$1',[user.token_hash,{id:q.id,player:slot,answered:false,token}]);
   return battle?{question:practiceQuestion(q.id),token,review:false}:practiceQuestion(q.id);
  }
  need(b.type===(battle?'battle-answer':'answer'));const saved=(await db.query('SELECT practice_question FROM sessions WHERE token_hash=$1',[user.token_hash])).rows[0]?.practice_question;
  need(saved&&saved.id===b.question&&(!battle||saved.token===b.token),'助戰題目已更新',409);const q=practiceQuestion(saved.id,true);need(Number.isInteger(b.choice)&&b.choice>=0&&b.choice<q.options.length);
  if(saved.answered)need(saved.choice===b.choice,'這題已送出',409);
  else await db.query('UPDATE sessions SET practice_question=$2 WHERE token_hash=$1',[user.token_hash,{...saved,answered:true,choice:b.choice}]);
  return q;
 }
 async function practice(user,b){return transaction(async db=>{await lockSession(db,user);return practiceInTransaction(db,user,b);});}
 function guard(user,path,body){
  if(!user.adult_id)return;
  need(path!=='/api/migrate','成人不能轉入或覆寫兒童存檔',403);
  if(path==='/api/command')need(['starter-draw','starter-confirm','equip','buy','draw','draw-star','home-decor','territory','learning-goal','battle-start','battle-answer'].includes(body.command?.type),'請使用成人英文航線',403);
  if(path.startsWith('/api/conquest'))need(user.social_approved,'先與家人確認同玩邀請，就能一起進入共享群島',403);
 }
 return{revokeSessions:(db,id,token=null)=>db.query('DELETE FROM sessions s USING adult_game_enrollments e WHERE e.user_id=$1 AND e.account_id=s.account_id AND e.member_id=s.member_id AND ($2::text IS NULL OR s.token_hash=$2)',[id,token]),enter,authenticate,afterCommand,practice,battleCommand:(db,user,b)=>practiceInTransaction(db,user,b,true),guard,slot};
}
