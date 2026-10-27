export const TIDEGLOW_MOTIONS = ['idle', 'greet', 'pet', 'feed', 'play', 'listening', 'thinking', 'speaking', 'cheering', 'rest', 'highfive', 'bubbles'] as const;
export type TideglowMotion = typeof TIDEGLOW_MOTIONS[number];
export type CareAction = 'pet' | 'feed' | 'play' | 'highfive' | 'bubbles' | 'rest';
export const CARE_ACTIONS: { id: CareAction; label: string; fallback: string }[] = [
  { id: 'pet', label: '摸摸', fallback: '✋' },
  { id: 'feed', label: '餵點心', fallback: '🍪' },
  { id: 'play', label: '星光球', fallback: '✦' },
  { id: 'highfive', label: '擊掌', fallback: '🖐' },
  { id: 'bubbles', label: '吹泡泡', fallback: '🫧' },
  { id: 'rest', label: '一起休息', fallback: '☾' },
];
export const CARE_COPY: Record<CareAction, string> = {
  pet: '輕輕摸摸，好舒服！', feed: '星星點心，慢慢吃。', play: '接到了！星光球又亮起來了。',
  highfive: '耶，擊掌成功！我們是冒險好搭檔。',
  bubbles: '泡泡裡藏著小星星。',
  rest: '休息一下也很棒，準備好再回來。',
};
export type CareGame = 'play' | 'highfive' | 'bubbles';
export type CareRound = { game: CareGame; hits: number[] };
export const careGoal = (game: CareGame) => game === 'highfive' ? 1 : 3;
/** Local play only: repeated taps cannot advance the same target twice. */
export function hitCareTarget(round: CareRound, target: number): CareRound {
  const goal = careGoal(round.game);
  if (!Number.isInteger(target) || target < 0 || target >= goal || round.hits.includes(target)) return round;
  if (round.game === 'play' && target !== round.hits.length) return round;
  return { ...round, hits: [...round.hits, target] };
}
export function companionQuiet(page: string, activeQuiz: boolean, activeBattle: boolean, overlay: boolean) {
  return overlay || activeQuiz || activeBattle || ['island', 'parent', 'room'].includes(page);
}
/** Context is rendered locally. Answers, names and learning records never enter the model. */
export function companionContext(page: string, completed: boolean, courseName?: string) {
  if (page === 'learn' && completed) return `${courseName ? `${courseName}的` : ''}這趟挑戰已完成，先放鬆一下吧！`;
  if (page === 'territory') return '這裡是你的領地。學習得到的材料，可以慢慢蓋出喜歡的家。';
  if (page === 'collection') return '這裡是夥伴收藏。可以看看夥伴，再選一位一起冒險。';
  if (page === 'lottery') return '這裡可以用星願券迎接夥伴。想休息，也可以先陪我玩一下。';
  if (page === 'battle') return '準備出發了！可以先選好隊伍，再一起戰鬥。';
  return '我們在港口休息。想摸摸、吃點心，還是一起聊聊？';
}
export function nextBallHit(hits: number) { return Math.min(3, Math.max(0, hits) + 1); }

export type CompanionMascot = 'tideglow' | 'dog' | 'bow';
/** Profile slots are shared by accounts; the authenticated account owns its mascot. */
export function companionMascot(username: string | undefined, accountPlayer: string | null | undefined, activePlayer: string | null): CompanionMascot {
  if (username?.toLowerCase() === 'feifei' && accountPlayer === 'feifei' && activePlayer === 'feifei') return 'bow';
  return username?.toLowerCase() === 'olivia' && accountPlayer === 'doudou' && activePlayer === 'doudou' ? 'dog' : 'tideglow';
}
export const companionName = (mascot: CompanionMascot = 'tideglow') => mascot === 'dog' ? '派對狗狗' : mascot === 'bow' ? '蝴蝶結寶寶' : '潮光獸';
export const DOG_POSTER = '/assets/olivia-dog/poster-v1.png';
export const companionPortrait = (mascot: CompanionMascot = 'tideglow') => mascot === 'dog' ? DOG_POSTER : mascot === 'bow' ? '/assets/feifei-bow/v1/portrait.jpg' : '/assets/tideglow-companion.png';
export const DOG_VIDEO = '/assets/olivia-dog/hello-v1.mp4';

const TIDEGLOW_NEW_ACTIONS = ['highfive', 'bubbles', 'rest'] as const;
const tideglowHasNewClip = (motion: TideglowMotion) => TIDEGLOW_NEW_ACTIONS.some(action => action === motion);
/** Each mascot's action points to its matching performance, never a different gesture. */
export function companionVideo(mascot: CompanionMascot, motion: TideglowMotion) {
  if (mascot === 'bow') return `/assets/feifei-bow/v1/${motion}.mp4`;
  if (mascot === 'dog') return motion === 'greet' ? DOG_VIDEO : `/assets/olivia-dog/actions-v2/${motion}.mp4`;
  return tideglowHasNewClip(motion) ? `/assets/tideglow-guide/actions-v2/${motion}.mp4` : `/assets/tideglow-guide/${motion}.mp4`;
}
export function companionPoster(mascot: CompanionMascot, motion: TideglowMotion) {
  if (mascot === 'bow') return `/assets/feifei-bow/v1/${motion}.jpg`;
  if (mascot === 'dog') return motion === 'greet' ? DOG_POSTER : `/assets/olivia-dog/actions-v2/${motion}.jpg`;
  return CARE_ACTIONS.some(action => action.id === motion) ? `/assets/tideglow-guide/actions-v2/${motion}.jpg` : '/assets/tideglow-guide/poster.webp';
}
export const companionLoops = (motion: TideglowMotion) => ['idle', 'listening', 'thinking', 'speaking', 'rest'].includes(motion);
export const CARE_ICON_ATLAS = '/assets/companion-ui/care-actions-v2.webp';
