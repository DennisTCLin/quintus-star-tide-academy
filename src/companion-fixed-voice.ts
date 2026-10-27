// Human-selected Kiki recordings. Free conversation uses the server's OpenAI voice.
export const COMPANION_FIXED_LINES = {
  welcome: '你好，我是潮光獸！點點我的頭，或選一個圖案吧。',
  microphone: '按麥克風，和我分享今天的事吧。',
  pet: '輕輕摸摸，好舒服！',
  feed: '星星點心，慢慢吃。',
  play: '接到了！星光球又亮起來了。',
  cheer: '三顆星星都亮了！這一小局完成，謝謝你陪我玩。',
  rest: '休息一下也很棒，準備好再回來。',
} as const;
export const COMPANION_CARE_LINES = {
  'ball-start': '點亮三顆星光球，陪潮光獸玩一小局。',
  'highfive-start': '點點亮亮的手掌，和我擊掌吧！',
  highfive: '耶，擊掌成功！我們是冒險好搭檔。',
  'bubbles-start': '點點三個泡泡，找找裡面的小星星。',
  bubbles: '泡泡裡藏著小星星。',
  'bubbles-done': '三個泡泡都變成星星了！謝謝你陪我玩。',
} as const;
export function companionFixedRecording(text: string) {
  const entry = Object.entries(COMPANION_FIXED_LINES).find(([, line]) => line === text);
  if (entry) return `/assets/tideglow-voice/kiki-20261025/${entry[0]}.mp3`;
  const care = Object.entries(COMPANION_CARE_LINES).find(([, line]) => line === text);
  return care ? `/assets/tideglow-voice/kiki-care-20261025/${care[0]}.mp3` : undefined;
}
