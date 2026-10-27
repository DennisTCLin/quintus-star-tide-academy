import { readFileSync } from 'node:fs';
import { guideCandidates } from '../build/game.mjs';

const lexicon = JSON.parse(readFileSync(new URL('../src/data/interface-zhuyin.json', import.meta.url), 'utf8'));
const vocabulary = JSON.parse(readFileSync(new URL('../src/data/dragon-vocabulary.json', import.meta.url), 'utf8'));
const words = Object.keys(vocabulary).sort((a,b)=>b.length-a.length);
const byFirst = new Map();
for (const word of words) byFirst.set(word[0], [...(byFirst.get(word[0]) ?? []), word]);
const careAnchors = { pet: ['摸摸'], feed: ['點心'], play: ['星光球', '玩球'] };
export function validDragonLine(line, choice) {
  if (typeof line !== 'string' || line.length < 4 || line.length > 60 || !/^[\u3400-\u9fff，。！、；「」～\s]+$/u.test(line)) return false;
  if (/請|告訴|說說|分享|給我|想知道|你叫|你住|家在|住在|姓名|名字|年齡|年紀|幾歲|生日|哪裡|哪個|什麼|怎麼|為什麼|帳號|不要|不准|不能|不可以|必須|一定|馬上|快點|離開|陪我|只愛|一直|每天|繼續玩|停下|送你|贈送|獎|星幣|金幣|免費|已經|獲得|抽到|得到|保證|一定會|只要|永遠|秘密|只有我|最愛你|永遠陪|不用休息|很安全|密碼|地址|電話|學校|父母|爸|媽|照片|加我|私訊|購買|付費|下載|網址|死亡|傷害|笨|打你|殺/u.test(line)) return false;
  // The model composes a fresh sentence, but every word must belong to a reviewed positive vocabulary.
  // No arbitrary character fallback: this closes unlisted polyphones and paraphrased pressure/PII requests.
  if (careAnchors[choice] && (!careAnchors[choice].some(word => line.includes(word)) || !/舒服|開心|心意|溫柔|放鬆|很棒/u.test(line) || /星光球玩球|玩球星光球/u.test(line))) return false;
  if (choice === 'rest' && (!line.includes('休息') || /冒險|探索|試試|按下|題目|回答|點選|學習/u.test(line))) return false;
  for (let i=0; i<line.length;) {
    if (!/[\u3400-\u9fff]/u.test(line[i])) { i++; continue; }
    const word = byFirst.get(line[i])?.find(w => line.startsWith(w,i));
    if (!word || JSON.stringify(word.length === 1 ? [lexicon.chars[word]] : lexicon.phrases[word]) !== JSON.stringify(vocabulary[word].split(' '))) return false;
    i += word.length;
  }
  return true;
}
/** No child name, ID, grade, photo, user free text, voice or account context leaves this adapter. */
export function createDragonProvider({ apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || 'gpt-4.1-mini', fetcher = fetch, timeoutMs = 6500 } = {}) {
  return async ({ phase, preference, history, choice, companion }) => {
    if (!apiKey) return null;
    const candidates = guideCandidates(choice);
    const allowed = [...words.filter(w => choice !== 'rest' || !/冒險|探索|試試|按下|題目|回答|點選|學習/.test(w)), '，', '。', '！'];
    const controller = new AbortController();
    let timer;
    try {
      const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('deadline')); }, timeoutMs); });
      const operation = async () => {
        const response = await fetcher('https://api.openai.com/v1/responses', {
          method: 'POST', signal: controller.signal,
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, store: false, max_output_tokens: 350,
            instructions: 'You are a friendly fictional animated companion in an elementary learning game. Do not assume a species or personal name. Respond to the selected picture and recent conversation with ONE fresh, concrete, natural Traditional Chinese sentence between 12 and 28 characters. Reflect the preference or publicly defined companion element when relevant, without repeating the previous line. Compose a new natural sentence using ONLY the allowed_words (plus Chinese punctuation). This reviewed vocabulary is essential for correct pronunciation. Do not insert unlisted words or split them into new characters. Prefer common words: 大海、海浪、小魚、天空、雲朵、森林、小樹、一起、喜歡、慢慢、休息、圖片、耳朵、聽聽、試試、陪你、冒險. Avoid rare words and medical or safety claims. Answer the CURRENT intent first, not just the favorite place. If required_any_words is supplied, include at least one of those tokens to acknowledge the actual interaction; do not replace a care gesture with generic scenery or rest. A care gesture has ALREADY happened: react warmly instead of instructing the child to do it. Use a concrete feeling such as 舒服 or 開心; there is no need to mention a favorite place or rest. Natural reviewed care examples: pet=你的摸摸很溫柔，讓我很舒服。 feed=收到你的點心，心情很開心。 play=星光球亮了，和你一起玩球很開心。 You may adapt or reuse an example; activity relevance and natural phrasing matter more than novelty. Do not ask for any information or use commands/pressure, including 請、告訴、不要、必須、繼續玩. Do not ask a question; the app adds one reviewed question. Do not claim any new possession, reward, progress, guaranteed result, or ability to alter the game. Do not ask for identity or personal information; no links, purchases, secrets or pressure to keep playing. Rest and nervous choices need warmth and permission to take a break. Never say you need the child or are their only friend. Return words as an array of allowed word tokens that JOIN into your new sentence, including punctuation tokens, plus one permitted reply ID and tone. Do not return a line string. Only anonymous game choices and public catalog traits are supplied.',
            input: JSON.stringify({ phase, preference, recent_choices: history.slice(-8).map(h => ({ choice: h.choice, reply: h.reply, ...(h.line ? { line: h.line } : {}) })), allowed_words: allowed, required_any_words: careAnchors[choice] ?? [], choice, intent: ({sea:'I like the sea',sky:'I like the sky',forest:'I like the forest',nervous:'I am nervous; reassure without claiming the sea or physical world is safe',help:'How do I play? Explain tapping pictures or the ear button, not rewards',ready:'I am ready',rest:'I want a break; support stopping',friend:'Tell me about my existing companion using only the provided element',learn:'I want to learn; mention listening to questions',preference:'Ask me a new topic',hello:'Say hello again',pet:'The player gently petted the fictional companion; respond warmly about comfort without dependency',feed:'The player offered a free pretend snack; acknowledge the kind gesture without claiming rewards or health effects',play:'The player played a short star-light ball game; share a cheerful reaction and support stopping'})[choice], companion: companion ? { element: companion.element, rarity: companion.rarity } : null, allowed_replies: candidates }),
            text: { format: { type: 'json_schema', name: 'dragon_reply', strict: true, schema: {
              type: 'object', properties: { words: { type: 'array', items: { type: 'string', enum: allowed } }, reply: { type: 'string', enum: candidates }, variant: { type: 'string', enum: ['warm', 'playful'] } }, required: ['words', 'reply', 'variant'], additionalProperties: false,
            } } },
          }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (data.status !== 'completed') return null;
        const content = data.output?.filter(o => o.type === 'message').flatMap(o => o.content ?? []);
        if (!content?.length || content.some(c => c.type !== 'output_text')) return null;
        const selected = JSON.parse(content.map(c => c.text).join(''));
        if (!selected || Object.keys(selected).sort().join(',') !== 'reply,variant,words' || !Array.isArray(selected.words) || selected.words.length > 40 || !selected.words.every(word => allowed.includes(word)) || !validDragonLine(selected.words.join(''), choice) || !candidates.includes(selected.reply) || !['warm', 'playful'].includes(selected.variant)) return null;
        return { line: selected.words.join(''), reply: selected.reply, variant: selected.variant };
      };
      return await Promise.race([operation(), deadline]);
    } catch { return null; }
    finally { clearTimeout(timer); }
  };
}
