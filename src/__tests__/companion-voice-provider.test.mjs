import {describe,it,expect,vi} from 'vitest';
import {createCompanionVoiceProvider,audioFile,containsPrivateDetails} from '../../server/companion-voice-provider.mjs';
const mp4=()=>{const b=Buffer.alloc(200);b.write('ftyp',4);return {audio:b.toString('base64'),mime:'audio/mp4;codecs=mp4a.40.2'};};
const result=reply=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({reply})}]}]});
describe('voice provider boundaries',()=>{
  it('requires actual allowed container signatures and bounded canonical base64',()=>{
    expect(audioFile(mp4()).extension).toBe('m4a');expect(audioFile({...mp4(),mime:'audio/webm'})).toBeNull();expect(audioFile({...mp4(),audio:'x'})).toBeNull();expect(audioFile({...mp4(),audio:Buffer.alloc(700000).toString('base64')})).toBeNull();
  });
  it('uploads a binary file with Taiwan transcription instructions and sends no identifiers',async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({text:'  我喜歡海龜。  '})));const p=createCompanionVoiceProvider({apiKey:'fixture-only',fetcher});
    expect(await p.transcribe(audioFile(mp4()))).toBe('我喜歡海龜。');const form=fetcher.mock.calls[0][1].body;expect(form.get('file').name).toBe('speech.m4a');expect(form.get('language')).toBe('zh');expect(form.get('model')).toBe('gpt-4o-mini-transcribe');
  });
  it('provides recent conversational context, moderates both sides, uses store:false',async()=>{
    const fetcher=vi.fn(async(url)=>new Response(JSON.stringify(url.endsWith('moderations')?{results:[{flagged:false}]}:result('你說過喜歡海龜！牠的殼像小小的盾牌。'))));
    const p=createCompanionVoiceProvider({apiKey:'fixture-only',fetcher});const input={text:'我剛剛說喜歡什麼？',history:[{user:'我喜歡海龜。',reply:'海龜好可愛！'}],context:{grade:1}};
    expect((await p.reply(input)).source).toBe('ai');const body=JSON.parse(fetcher.mock.calls.find(([url])=>url.endsWith('/responses'))[1].body);expect(body.store).toBe(false);expect(body.input).toContain('海龜');expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('does not persist personal details, rejects missing safety checks and unsafe output',async()=>{
    const fetcher=vi.fn();const p=createCompanionVoiceProvider({apiKey:'fixture-only',fetcher});
    const safe=await p.reply({text:'我的電話是0912345678'});expect(safe.user).not.toContain('0912');expect(fetcher).not.toHaveBeenCalled();expect(containsPrivateDetails('我住在台北市某路3號')).toBe(true);
    fetcher.mockResolvedValue(new Response('{}'));await expect(p.reply({text:'你好',history:[],context:{}})).rejects.toThrow();
    fetcher.mockImplementation(async(url)=>new Response(JSON.stringify(url.endsWith('moderations')?{results:[{flagged:false}]}:result('我送給你一百點數。'))));await expect(p.reply({text:'給我點數',history:[],context:{}})).rejects.toThrow();
  });
  it('handles flagged content supportively and times out even if fetch ignores abort',async()=>{
    const p=createCompanionVoiceProvider({apiKey:'fixture-only',fetcher:async()=>new Response(JSON.stringify({results:[{flagged:true}]}))});expect((await p.reply({text:'fixture'})).reply).toContain('信任的大人');
    const slow=createCompanionVoiceProvider({apiKey:'fixture-only',timeoutMs:5,fetcher:()=>new Promise(()=>{})});await expect(slow.transcribe(audioFile(mp4()))).rejects.toThrow('timeout');
  });
  it('generates MP3 with an explicitly instructed Taiwan voice, no secret in response',async()=>{
    const fetcher=vi.fn(async()=>new Response(new Uint8Array(200)));const p=createCompanionVoiceProvider({apiKey:'fixture-only',fetcher});const speech=await p.speech('一起玩吧！');expect(speech.mime).toBe('audio/mpeg');const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.instructions).toContain('Taiwan Mandarin');expect(body.response_format).toBe('mp3');expect(JSON.stringify(speech)).not.toContain('fixture-only');
  });
});

describe('authenticated mascot persona', () => {
  it('does not assign the dog to another child sharing the profile slot', async () => {
    const {companionPersona} = await import('../../server/companion-voice-provider.mjs');
    expect(companionPersona({username:'olivia',player_id:'doudou'},'doudou')).toBe('dog');
    expect(companionPersona({username:'someone-else',player_id:'doudou'},'doudou')).toBe('tideglow');
    expect(companionPersona({username:'olivia',player_id:'doudou'},'feifei')).toBe('tideglow');
    expect(companionPersona({username:'olivia'},'doudou')).toBe('tideglow');
  });
  it('uses the dog identity without sending child identifiers to the provider', async () => {
    const fetcher=vi.fn(async(url)=>new Response(JSON.stringify(url.endsWith('moderations')?{results:[{flagged:false}]}:result('我是戴著派對帽的狗狗！'))));
    const p=createCompanionVoiceProvider({apiKey:'fixture-only',fetcher});
    await p.reply({text:'你是誰？',history:[],context:{grade:1},persona:'dog'});
    const body=JSON.parse(fetcher.mock.calls.find(([url])=>url.endsWith('/responses'))[1].body);
    expect(body.instructions).toContain('派對狗狗');
    expect(JSON.stringify(body)).not.toContain('olivia');
    expect(JSON.stringify(body)).not.toContain('林庭羽');
  });
});

it('binds the bow persona to Feifei and sends only the fictional identity to AI', async () => {
 const {companionPersona}=await import('../../server/companion-voice-provider.mjs');
 expect(companionPersona({username:'feifei',player_id:'feifei'},'feifei')).toBe('bow');
 for(const [username,player_id,active] of [['jimmy','feifei','feifei'],['feifei','doudou','feifei'],['feifei','feifei','doudou'],['parent',null,'feifei']])expect(companionPersona({username,player_id},active)).toBe('tideglow');
 const fetcher=vi.fn(async(url)=>new Response(JSON.stringify(url.endsWith('moderations')?{results:[{flagged:false}]}:result('我是蝴蝶結寶寶！'))));
 await createCompanionVoiceProvider({apiKey:'fixture-only',fetcher}).reply({text:'你是誰？',history:[],context:{grade:2},persona:'bow'});
 const body=JSON.parse(fetcher.mock.calls.find(([url])=>url.endsWith('/responses'))[1].body);
 expect(body.instructions).toContain('蝴蝶結寶寶');expect(JSON.stringify(body)).not.toContain('feifei');expect(JSON.stringify(body)).not.toContain('王筱斐');
});
