/** The model composes bounded words and selects reviewed follow-ups, never rewards or navigation. */
export const GUIDE_CHOICES = {
  sea: { icon: '🌊', label: '大海' }, sky: { icon: '☁️', label: '天空' }, forest: { icon: '🌳', label: '森林' },
  ready: { icon: '✨', label: '準備好了' }, help: { icon: '🎟️', label: '怎麼玩' },
  nervous: { icon: '🐣', label: '有點緊張' }, friend: { icon: '🐾', label: '認識夥伴' },
  learn: { icon: '🧭', label: '一起冒險' }, rest: { icon: '🌙', label: '休息一下' },
  preference: { icon: '🌈', label: '換個話題' }, hello: { icon: '👋', label: '和小龍說話' },
  pet: { icon: '✋', label: '摸摸' }, feed: { icon: '🍪', label: '吃點心' }, play: { icon: '✨', label: '玩星光球' },
} as const;
export type GuideChoice = keyof typeof GUIDE_CHOICES;
export type GuidePreference = 'sea' | 'sky' | 'forest' | null;
export type GuidePhase = 'welcome' | 'meet' | 'harbor';
export type GuideMood = 'welcome' | 'listening' | 'thinking' | 'speaking' | 'cheering';
export const GUIDE_REPLIES = ['welcome', 'preference', 'ready', 'help', 'nervous', 'friend', 'learn', 'rest', 'hello', 'pet', 'feed', 'play'] as const;
export type GuideReply = typeof GUIDE_REPLIES[number];
export type GuideState = {
  revision: number; phase: GuidePhase; pet: string | null; preference: GuidePreference;
  reply: GuideReply; variant: 'warm' | 'playful'; source: 'ai' | 'guided'; line?: string;
  history: { choice: GuideChoice; reply: GuideReply; line?: string }[];
};
export type GuideFacts = Pick<GuideState, 'phase' | 'pet'>;
export function guideFacts(profile: { onboarding?: { pet: string | null; confirmed: boolean }; equipped: string }): GuideFacts {
  return profile.onboarding && !profile.onboarding.confirmed
    ? { phase: profile.onboarding.pet ? 'meet' : 'welcome', pet: profile.onboarding.pet }
    : { phase: 'harbor', pet: profile.equipped };
}
export function currentGuide(saved: GuideState | null | undefined, facts: GuideFacts): GuideState {
  const same = saved?.phase === facts.phase && saved?.pet === facts.pet;
  return {
    revision: saved?.revision ?? 0, ...facts, preference: saved?.preference ?? null,
    reply: same ? saved.reply : facts.phase === 'welcome' ? 'welcome' : facts.phase === 'meet' ? 'friend' : 'hello',
    variant: same ? saved.variant : 'warm', source: same ? saved.source : 'guided', line: same ? saved.line : undefined, history: saved?.history?.slice(-8) ?? [],
  };
}
export function guideOptions(state: GuideState): GuideChoice[] {
  if (state.reply === 'welcome' || state.reply === 'preference') return ['sea', 'sky', 'forest'];
  if (state.reply === 'rest') return ['hello', 'preference'];
  if (state.phase === 'welcome') return ['ready', 'help', 'nervous'];
  return state.reply === 'friend' ? ['learn', 'preference', 'rest'] : ['friend', 'learn', 'rest'];
}
export function guideCandidates(choice: GuideChoice): GuideReply[] {
  if (choice === 'sea' || choice === 'sky' || choice === 'forest') return ['ready', 'hello'];
  return [choice === 'hello' ? 'hello' : choice === 'preference' ? 'preference' : choice];
}
/** Care is a conversation event only; it never modifies learning or collection rewards. */
export function guideAllowedChoices(state: GuideState): GuideChoice[] {
  return state.phase === 'harbor' ? [...new Set<GuideChoice>([...guideOptions(state), 'hello', 'help', 'preference', 'nervous', 'rest', 'pet', 'feed', 'play'])] : guideOptions(state);
}
export function advanceGuide(state: GuideState, choice: GuideChoice, selection?: { reply: GuideReply; variant: 'warm' | 'playful'; line?: string }): GuideState {
  const reply = selection?.reply ?? guideCandidates(choice)[0];
  return { ...state, revision: state.revision + 1,
    preference: choice === 'sea' || choice === 'sky' || choice === 'forest' ? choice : state.preference,
    reply, variant: selection?.variant ?? 'warm', source: selection ? 'ai' : 'guided', line: selection?.line,
    history: [...state.history, { choice, reply, ...(selection?.line ? { line: selection.line } : {}) }].slice(-8),
  };
}
/** Names and actual companion details are substituted locally, never sent to the model. */
export function guideCopy(state: GuideState, name: string, petName?: string) {
  const place = state.preference ? GUIDE_CHOICES[state.preference].label : '';
  const memory = place ? `我記得你喜歡${place}。` : '';
  const friend = petName || '你的夥伴';
  const warm = state.variant === 'warm';
  const next = state.phase === 'welcome' ? '要一起迎接第一位夥伴嗎？' : '想和夥伴一起冒險，還是先休息？';
  const lines: Record<GuideReply, string> = {
    welcome: `${name}，你好！我是帶路的小龍，你喜歡大海、天空，還是森林？`,
    preference: '換你告訴我吧！你喜歡大海、天空，還是森林？',
    ready: `${place ? `${place}，我記住了！` : warm ? '準備好了，我陪你！' : '把小小的勇氣帶上吧！'}${next}`,
    help: state.phase === 'welcome' ? '按下免費轉一次，就能迎接一位夥伴，不用星幣或券。要試試看，還是再聊一聊？' : '回答問題可以幫夥伴戰鬥，答錯也能慢慢學。想認識夥伴，還是一起冒險？',
    nervous: warm ? '有點緊張也沒關係，我們一步一步來。想先看看怎麼玩嗎？' : '不用急，先深呼吸，我陪你慢慢試。想先看看怎麼玩嗎？',
    friend: state.pet ? `${memory}${friend}已經在你的收藏裡了！想和牠一起冒險，還是聊聊你喜歡的地方？` : '還沒抽到第一位夥伴呢。要先看看怎麼玩嗎？',
    learn: `${memory}冒險時可以按耳朵聽題目，不用急著猜。想先認識夥伴，還是先休息？`,
    rest: '好呀，休息也很棒！想再聊時，按小龍就可以了。',
    hello: `${memory}${warm ? '很高興和你聊天！' : '小龍收到你的心意了！'}${next}`,
    pet: `${memory}輕輕摸摸，好舒服！我好開心，尾巴輕輕搖。`,
    feed: '點心香香的，謝謝你的心意！我們慢慢吃。',
    play: '星光球亮亮的，和你一起玩真開心！隨時可以休息。',
  };
  const question = state.reply === 'rest' ? '想再聊時，按小龍就可以了。' : state.reply === 'preference' || state.reply === 'welcome' ? '你喜歡大海、天空，還是森林？' : state.reply === 'nervous' ? '想先看看怎麼玩嗎？' : next;
  return { text: state.line ? `${state.line}${question}` : lines[state.reply], mood: (state.reply === 'nervous' || state.reply === 'rest' ? 'listening' : state.reply === 'friend' || state.reply === 'ready' ? 'cheering' : 'welcome') as GuideMood };
}
