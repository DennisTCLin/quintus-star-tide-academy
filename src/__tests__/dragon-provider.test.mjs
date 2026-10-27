import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { createDragonProvider, validDragonLine } from '../../server/dragon-provider.mjs';
const context = { phase: 'welcome', preference: 'sea', choice: 'sea', history: [], name: 'NEVER_SEND_NAME', accountId: 'NEVER_SEND_ID', grade: 1 };
const selected = { line: '我記得你喜歡大海。', reply: 'ready', variant: 'warm' };
const vocabulary = Object.keys(JSON.parse(readFileSync('src/data/dragon-vocabulary.json'))).sort((a,b)=>b.length-a.length);
function tokens(line) { const parts=[]; for(let i=0;i<line.length;) { const word=vocabulary.find(w=>line.startsWith(w,i)) || line[i]; parts.push(word); i+=word.length; } return parts; }
const result = selection => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ words: tokens(selection.line), ...Object.fromEntries(Object.entries(selection).filter(([k])=>k!=='line')) }) }] }] }) });
describe('anonymous contextual AI adapter', () => {
  it('uses structured, non-stored anonymous context and validates generated text', async () => {
    const fetcher = vi.fn(async () => result(selected));
    const provider = createDragonProvider({ apiKey: 'test-only', fetcher });
    expect(validDragonLine(selected.line)).toBe(true);
    expect(await provider(context)).toEqual(selected);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body.text.format.strict).toBe(true);
    expect(JSON.stringify(body)).not.toContain('NEVER_SEND');
    expect(JSON.parse(body.input).choice).toBe('sea');
    expect(JSON.parse(body.input)).not.toHaveProperty('grade');
  });
  it('includes prior anonymous replies and public traits, but not catalog extras', async () => {
    const fetcher = vi.fn(async () => result(selected));
    await createDragonProvider({ apiKey: 'test-only', fetcher })({ ...context, history: [{ choice: 'sea', reply: 'ready', line: selected.line }], companion: { element: 'water', rarity: 'E', childId: 'NEVER_SEND_ID' } });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(JSON.parse(body.input).recent_choices[0].line).toBe(selected.line);
    expect(JSON.stringify(body)).not.toContain('NEVER_SEND_ID');
  });
  it('returns a fallback for malformed, refused, unsupported or dangerous output', async () => {
    for (const selection of [{ ...selected, line: '我送你一千星幣。' }, { ...selected, line: 'https://example.com' }, { ...selected, line: '請告訴我你的電話。' }, ...['請告訴我你的名字。','請告訴我你住在哪裡。','你不可以離開我。','不要休息，繼續玩吧。','看守森林是小龍的任務。','玩到天亮也沒關係。','你不必再吃飯了。','大家都不喜歡你。','我們一起轉圈圈吧。'].map(line=>({...selected,line})), { ...selected, reply: 'rest' }, { ...selected, extra: true }, { ...selected, line: '龘𠀀龘。' }]) {
      expect(await createDragonProvider({ apiKey: 'test-only', fetcher: async () => result(selection) })(context)).toBeNull();
    }
    expect(validDragonLine('休息一下，我陪你一起冒險。','rest')).toBe(false);
    expect(await createDragonProvider({ apiKey: 'test-only', fetcher: async () => ({ ok: true, json: async () => ({ status: 'incomplete' }) }) })(context)).toBeNull();
  });
  it('works without a key and bounds a stuck provider even if it ignores AbortSignal', async () => {
    const fetcher = vi.fn();
    expect(await createDragonProvider({ apiKey: '', fetcher })(context)).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
    expect(await createDragonProvider({ apiKey: 'test-only', timeoutMs: 15, fetcher: () => new Promise(() => {}) })(context)).toBeNull();
  });
  it('rejects fluent care replies that ignore or confuse the current gesture', async () => {
    for (const choice of ['pet','feed','play']) {
      expect(validDragonLine('我們慢慢休息，看看天空和海浪。', choice)).toBe(false);
      expect(await createDragonProvider({apiKey:'test-only',fetcher:async()=>result({line:'我們一起慢慢聽聽海浪聲音，舒服喔。',reply:choice,variant:'warm'})})({...context,choice,phase:'harbor'})).toBeNull();
    }
    expect(validDragonLine('摸摸小龍，休息一下，慢慢喜歡大海。', 'pet')).toBe(false);
    expect(validDragonLine('一起玩球，休息一下，慢慢看看海浪。', 'play')).toBe(false);
    expect(validDragonLine('星光球玩球，和你一起很開心！', 'play')).toBe(false);
    expect(validDragonLine('你的摸摸很溫柔，讓我很舒服。', 'feed')).toBe(false);
    expect(validDragonLine('收到你的點心，心情很開心。', 'play')).toBe(false);
  });
  it('grounds care replies in bounded anonymous gesture intent', async () => {
    const lines = {pet:'你的摸摸很溫柔，讓我很舒服。',feed:'收到你的點心，心情很開心。',play:'星光球亮了，和你一起玩球很開心。'};
    for (const choice of ['pet','feed','play']) {
      const fetcher = vi.fn(async () => result({ line: lines[choice], reply: choice, variant: 'warm' }));
      const reply = await createDragonProvider({ apiKey: 'test-only', fetcher })({ ...context, choice, phase:'harbor' });
      expect(reply?.reply).toBe(choice);
      const sent = JSON.parse(JSON.parse(fetcher.mock.calls[0][1].body).input);
      expect(sent.intent).toBeTruthy(); expect(sent.choice).toBe(choice);
      expect(sent.required_any_words.length).toBeGreaterThan(0);
      expect(JSON.stringify(sent)).not.toContain('NEVER_SEND');
    }
  });
});
