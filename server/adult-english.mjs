import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { passwordHash, passwordMatches } from './credentials.mjs';
import { ensureSchema } from './schema-migration.mjs';
import { freshState, parseState, startLesson, startReview, answerCurrent, advance, taipeiDay, exerciseById } from '../build/adult.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('hex');
const need = (v,message='操作資料不正確',status=400) => { if(!v)throw Object.assign(Error(message),{status}); };
const object = v => !!v && typeof v==='object' && !Array.isArray(v);
const fields=(v,keys)=>need(object(v)&&Object.keys(v).every(k=>keys.includes(k)));
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v);
const transition=fn=>{try{return fn();}catch(error){throw Object.assign(error,{status:400});}};
const view=(state,user)=>({state:parseState(JSON.stringify(state)),username:user.username,csrf:user.csrf,day:taipeiDay(),serverNow:Date.now()});
export async function createAdultEnglishService({pool,transaction,limit,readBody,send,production}) {
  await ensureSchema(pool,'adult-english-v1',`
    CREATE TABLE IF NOT EXISTS adult_english_users(id uuid PRIMARY KEY,username text UNIQUE NOT NULL CHECK(username=lower(username)),password_hash text NOT NULL,recovery_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS adult_english_states(user_id uuid PRIMARY KEY REFERENCES adult_english_users(id),state jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS adult_english_sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES adult_english_users(id),csrf text NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS adult_sessions_expiry ON adult_english_sessions(expires_at);
    CREATE TABLE IF NOT EXISTS adult_english_receipts(user_id uuid NOT NULL REFERENCES adult_english_users(id),command_id uuid NOT NULL,payload_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,command_id));
    CREATE INDEX IF NOT EXISTS adult_receipts_created ON adult_english_receipts(created_at);
  `);
  const name=production?'__Host-star-tide-adult':'star-tide-adult';
  const cookie=(token,age=2592000)=>`${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production?'; Secure':''}`;
  async function session(db,user){const token=secret(),csrf=secret();await db.query("INSERT INTO adult_english_sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '30 days')",[hash(token),user.id,csrf]);return {token,csrf};}
  async function authenticate(req){const token=String(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);need(token&&/^[a-f\d]{64}$/.test(token),'請登入成人英文帳號',401);const user=(await pool.query('SELECT u.id,u.username,s.csrf,s.token_hash FROM adult_english_sessions s JOIN adult_english_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hash(token)])).rows[0];need(user,'登入已到期，請重新登入',401);return user;}
  async function lockSession(db,user){need((await db.query('SELECT token_hash FROM adult_english_sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>now() FOR UPDATE',[user.token_hash,user.id])).rowCount===1,'登入已到期，請重新登入',401);}
  return async function adult(req,res,path){
    const ip=production?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress;
    const auth=['/api/adult/register','/api/adult/login','/api/adult/recover'].includes(path);
    if(auth){
      need(req.method==='POST','不支援的方法',405);await limit('adult-auth-ip:'+ip,30,600);const body=await readBody(req);fields(body,path.endsWith('/recover')?['username','password','recoveryCode']:['username','password']);
      need(typeof body.username==='string'&&/^[a-zA-Z0-9_]{3,32}$/.test(body.username),'帳號請使用 3–32 個英文字母、數字或底線');need(typeof body.password==='string'&&body.password.length>=12&&body.password.length<=128,'成人密碼請使用 12–128 個字元');const username=body.username.toLowerCase();await limit('adult-auth-user:'+username,12,600);
      let user=(await pool.query('SELECT * FROM adult_english_users WHERE username=$1',[username])).rows[0],password,recoveryCode;
      if(path.endsWith('/register')){need(!user,'這個成人帳號已有人使用',409);password=await passwordHash(body.password);recoveryCode=secret();}
      else if(path.endsWith('/recover')){const code=typeof body.recoveryCode==='string'?body.recoveryCode.trim():'';need(user&&code.length===64&&timingSafeEqual(Buffer.from(hash(code)),Buffer.from(user.recovery_hash)),'帳號或復原碼不正確',401);password=await passwordHash(body.password);recoveryCode=secret();}
      else {const matches=await passwordMatches(body.password,user?.password_hash||'0'.repeat(32)+':'+ '0'.repeat(128));need(user&&matches,'帳號或密碼不正確',401);}
      const payload=await transaction(async db=>{
        if(path.endsWith('/register')){user={id:randomUUID(),username};await db.query('INSERT INTO adult_english_users(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',[user.id,username,password,hash(recoveryCode)]);await db.query('INSERT INTO adult_english_states(user_id,state) VALUES($1,$2)',[user.id,JSON.stringify(freshState())]);}
        else {const current=(await db.query('SELECT * FROM adult_english_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];need(current&&current.password_hash===user.password_hash&&current.recovery_hash===user.recovery_hash,'帳號已更新，請重新登入',401);if(password){await db.query('UPDATE adult_english_users SET password_hash=$2,recovery_hash=$3 WHERE id=$1',[user.id,password,hash(recoveryCode)]);await db.query('DELETE FROM adult_english_sessions WHERE user_id=$1',[user.id]);}}
        const login=await session(db,user),state=(await db.query('SELECT state FROM adult_english_states WHERE user_id=$1',[user.id])).rows[0].state;return {...view(state,{...user,csrf:login.csrf}),token:login.token,...(recoveryCode?{recoveryCode}:{})};
      });const {token,...data}=payload;send(res,200,data,{'Set-Cookie':cookie(token)});return;
    }
    const user=await authenticate(req);await limit('adult-account:'+user.id,240,60);
    if(req.method==='GET'&&path==='/api/adult/state'){const row=(await pool.query('SELECT state FROM adult_english_states WHERE user_id=$1',[user.id])).rows[0];send(res,200,view(row.state,user));return;}
    need(req.method==='POST','找不到服務',404);need(req.headers['x-csrf-token']===user.csrf,'安全驗證已更新，請重新登入',403);
    if(path==='/api/adult/recovery-code'){
      await limit('adult-recovery:'+user.id,5,600);const body=await readBody(req);fields(body,['password']);
      need(typeof body.password==='string'&&body.password.length>=12&&body.password.length<=128,'請輸入目前的成人密碼');
      const original=(await pool.query('SELECT password_hash FROM adult_english_users WHERE id=$1',[user.id])).rows[0];
      need(await passwordMatches(body.password,original.password_hash),'密碼不正確',401);const recoveryCode=secret();
      const payload=await transaction(async db=>{
        const current=(await db.query('SELECT password_hash FROM adult_english_users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];await lockSession(db,user);
        need(current.password_hash===original.password_hash,'帳號已更新，請重新登入',401);
        await db.query('UPDATE adult_english_users SET recovery_hash=$2 WHERE id=$1',[user.id,hash(recoveryCode)]);
        const state=(await db.query('SELECT state FROM adult_english_states WHERE user_id=$1',[user.id])).rows[0].state;
        return {...view(state,user),recoveryCode};
      });send(res,200,payload);return;
    }
    if(path==='/api/adult/logout'){await transaction(async db=>{await lockSession(db,user);await db.query('DELETE FROM adult_english_sessions WHERE token_hash=$1',[user.token_hash]);});send(res,200,{ok:true},{'Set-Cookie':cookie('',0)});return;}
    need(path==='/api/adult/command','找不到服務',404);const body=await readBody(req);fields(body,['username','id','revision','command']);need(body.username===user.username,'成人帳號已切換，請重新同步',409);need(uuid(body.id)&&Number.isSafeInteger(body.revision)&&body.revision>=0&&object(body.command));const digest=hash(JSON.stringify(body));
    const response=await transaction(async db=>{
      await lockSession(db,user);const row=(await db.query('SELECT state FROM adult_english_states WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];const previous=(await db.query('SELECT payload_hash FROM adult_english_receipts WHERE user_id=$1 AND command_id=$2',[user.id,body.id])).rows[0];
      if(previous){need(previous.payload_hash===digest,'操作編號已使用',409);return {...view(row.state,user),replayed:true};}
      need(row.state.revision===body.revision,'其他裝置已更新進度，請先重新同步',409);let state=parseState(JSON.stringify(row.state));const c=body.command,day=taipeiDay();
      const current=()=>{need(state.session&&!state.session.complete&&c.sessionId===state.session.id&&c.index===state.session.index,'這組練習已更新，請重新同步',409);};
      switch(c.type){
        case 'profile': fields(c,['type','name','track','dailyGoal']);need(typeof c.name==='string'&&c.name.trim().length>0&&c.name.trim().length<=24&&['everyday','travel','work'].includes(c.track)&&[6,12].includes(c.dailyGoal));state.profile={name:c.name.trim(),track:c.track,dailyGoal:c.dailyGoal};break;
        case 'lesson-start': fields(c,['type','lessonId']);need(state.profile,'請先完成學習設定');need(typeof c.lessonId==='string');state=transition(()=>startLesson(state,c.lessonId));break;
        case 'review-start': fields(c,['type','mode']);need(state.profile,'請先完成學習設定');need(['due','mistakes','all'].includes(c.mode));state=transition(()=>startReview(state,c.mode,day));break;
        case 'answer': fields(c,['type','sessionId','index','answer']);current();need(typeof c.answer==='string'&&c.answer.trim().length>0&&c.answer.length<=300);state=transition(()=>answerCurrent(state,c.answer,false,day));break;
        case 'hint': fields(c,['type','sessionId','index']);current();need(state.session.results.length===state.session.index,'這題已送出');need(exerciseById(state.session.ids[state.session.index])?.kind==='listen','此題沒有聽力文字提示');state.session.assistedIds=[...new Set([...(state.session.assistedIds??[]),state.session.ids[state.session.index]])];break;
        case 'next': fields(c,['type','sessionId','index']);current();state=transition(()=>advance(state,day));break;
        case 'end': fields(c,['type','sessionId']);need(state.session&&c.sessionId===state.session.id,'這組練習已更新',409);state.session=null;break;
        default:need(false,'找不到這個成人學習操作');
      }
      state.revision++;parseState(JSON.stringify(state));await db.query('UPDATE adult_english_states SET state=$2,updated_at=now() WHERE user_id=$1',[user.id,JSON.stringify(state)]);await db.query('INSERT INTO adult_english_receipts(user_id,command_id,payload_hash) VALUES($1,$2,$3)',[user.id,body.id,digest]);return {...view(state,user),replayed:false};
    });send(res,200,response);
  };
}
