import { createHash } from 'node:crypto';
import { ensureSchema } from './schema-migration.mjs';
import { PLAYERS } from '../build/game.mjs';
import { audioFile, normalizeSpeech, companionPersona } from './companion-voice-provider.mjs';
const WEEK = 7*24*60*60*1000;
const uuid = value => typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export async function createCompanionVoiceService({pool,transaction,lockSession,assert,limit,provider,guide}) {
  await ensureSchema(pool,'companion-voice-v1',`
    CREATE TABLE IF NOT EXISTS companion_voice_conversations(account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,player_id text NOT NULL,revision integer NOT NULL DEFAULT 0,history jsonb NOT NULL DEFAULT '[]',updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(account_id,player_id));
    CREATE TABLE IF NOT EXISTS companion_voice_receipts(account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,player_id text NOT NULL,request_id uuid NOT NULL,fingerprint text NOT NULL,revision integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(account_id,player_id,request_id));
  `);
  function access(user,player) { assert(PLAYERS.some(p=>p.id===player),'找不到航海員'); assert(!user.member_id || user.player_id===player,'只能和自己的學伴對話',403); }
  async function state(db,user,player) {
    const row = (await db.query('SELECT revision,history FROM companion_voice_conversations WHERE account_id=$1 AND player_id=$2',[user.id,player])).rows[0];
    return {revision:row?.revision ?? 0,history:(row?.history ?? []).filter(h=>h.at>Date.now()-WEEK).slice(-12),available:provider.available};
  }
  async function lock(db,user,player) { await lockSession(db,user); await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`voice:${user.id}:${player}`]); }
  function validate(user,body,keys) { assert(body && typeof body==='object' && Object.keys(body).sort().join(',')===keys.sort().join(',')); access(user,body.player); assert(uuid(body.id)&&Number.isSafeInteger(body.revision)&&body.revision>=0); }
  const pending = new Map();
  return {
    async read(user,player) { access(user,player); return state(pool,user,player); },
    async reset(user,body) {
      validate(user,body,['id','player','revision']);
      return transaction(async db=>{
        await lock(db,user,body.player);
        const latest=await state(db,user,body.player);
        assert(latest.revision===body.revision,'對話已更新，請重新讀取',409);
        await db.query("INSERT INTO companion_voice_conversations(account_id,player_id,revision,history) VALUES($1,$2,$3,'[]') ON CONFLICT(account_id,player_id) DO UPDATE SET revision=EXCLUDED.revision,history='[]',updated_at=now()",[user.id,body.player,latest.revision+1]);
        await db.query('DELETE FROM companion_voice_receipts WHERE account_id=$1 AND player_id=$2',[user.id,body.player]);
        return {revision:latest.revision+1,history:[],available:provider.available};
      });
    },
    async turn(user,body) {
      const isAudio=Object.hasOwn(body ?? {},'audio');
      validate(user,body,isAudio?['id','player','revision','audio','mime']:['id','player','revision','text']);
      const file=isAudio?audioFile(body):null;
      const typed=isAudio?'':normalizeSpeech(body.text);
      assert(isAudio?Boolean(file):typeof body.text==='string'&&body.text.length<=400&&Boolean(typed),'沒有聽清楚，請再說一句短短的話');
      assert(provider.available,'語音學伴暫時無法連線，還可以用圖卡聊天',503);
      const fingerprint=createHash('sha256').update(JSON.stringify([body.player,body.revision,isAudio?file.mime:'text',isAudio?body.audio:typed])).digest('hex');
      async function replay(db) {
        const prior=(await db.query('SELECT fingerprint,revision FROM companion_voice_receipts WHERE account_id=$1 AND player_id=$2 AND request_id=$3',[user.id,body.player,body.id])).rows[0];
        if (!prior) return null;
        assert(prior.fingerprint===fingerprint,'這句已更新，請重新讀取',409);
        const latest=await state(db,user,body.player);
        assert(latest.history.some(h=>h.id===body.id),'對話已更新，請重新讀取',409);
        return latest;
      }
      const previous=await replay(pool); if(previous)return previous;
      const key=`${user.token_hash}:${body.player}:${body.id}`;
      if(pending.has(key)) { assert(pending.get(key).fingerprint===fingerprint,'這句已更新，請重新讀取',409);return pending.get(key).promise; }
      const execute=async()=>{
        await limit(`voice:${user.id}`,12,60); await limit(`voice-hour:${user.id}`,120,3600);
        const before=await state(pool,user,body.player);
        assert(before.revision===body.revision,'對話已更新，請重新讀取',409);
        let text,reply;
        try {
          text=isAudio?await provider.transcribe(file):typed;
          assert(Boolean(normalizeSpeech(text)),'沒有聽清楚，請再說一句短短的話',422);
          const facts=await guide.read(user,body.player);
          reply=await provider.reply({text,persona:companionPersona(user,body.player),history:before.history,context:{grade:PLAYERS.find(p=>p.id===body.player).grade,preference:facts.preference,recent_choices:facts.history.slice(-4).map(h=>h.choice)}});
        } catch(e) { if(e.status)throw e; assert(false,'學伴暫時沒有聽清楚，請稍後再試。圖卡還可以使用。',503); }
        assert(reply && typeof reply.user==='string'&&reply.user.length<=400&&typeof reply.reply==='string'&&reply.reply.length>0&&reply.reply.length<=140,'回覆暫時無法使用',503);
        return transaction(async db=>{
          await lock(db,user,body.player);
          const replayed=await replay(db); if(replayed)return replayed;
          const latest=await state(db,user,body.player);
          assert(latest.revision===before.revision,'對話已更新，請重新讀取',409);
          const next={revision:latest.revision+1,history:[...latest.history,{id:body.id,user:reply.user,reply:reply.reply,source:reply.source,at:Date.now()}].slice(-12),available:provider.available};
          await db.query('INSERT INTO companion_voice_conversations(account_id,player_id,revision,history) VALUES($1,$2,$3,$4) ON CONFLICT(account_id,player_id) DO UPDATE SET revision=EXCLUDED.revision,history=EXCLUDED.history,updated_at=now()',[user.id,body.player,next.revision,JSON.stringify(next.history)]);
          await db.query('INSERT INTO companion_voice_receipts(account_id,player_id,request_id,fingerprint,revision) VALUES($1,$2,$3,$4,$5)',[user.id,body.player,body.id,fingerprint,next.revision]);
          return next;
        });
      };
      const promise=execute();pending.set(key,{fingerprint,promise});try{return await promise;}finally{pending.delete(key);}
    },
    async speech(user,body) {
      validate(user,body,['id','player','revision']);
      await limit(`voice-speech:${user.id}`,20,60);
      const before=await state(pool,user,body.player),turn=before.history.find(h=>h.id===body.id);
      assert(turn&&before.revision===body.revision,'對話已更新，請重新讀取',409);
      let audio;try {audio=await provider.speech(turn.reply);}catch {assert(false,'聲音暫時沒有準備好，請再按聽回覆',503);}
      // Do not release an old reply after logout or a concurrent clear.
      await transaction(async db=>{await lock(db,user,body.player);const latest=await state(db,user,body.player);assert(latest.revision===body.revision,'對話已更新，請重新讀取',409);});
      return audio;
    },
  };
}
