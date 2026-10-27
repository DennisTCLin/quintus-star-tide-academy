import type { LearningQuestion } from './learning';

export const ENGLISH_CONTEXT_CONCEPTS = {
  schedule: '讀懂時間與活動安排',
  sequence: '依照文字理解先後順序',
  location: '依照參照物判斷位置',
  dialogue: '理解生活對話的目的',
} as const;
type Item = {
  concept: keyof typeof ENGLISH_CONTEXT_CONCEPTS;
  context: string;
  prompt: string;
  answer: string;
  distractors: [string, string, string];
  hint: string;
  explanation: string;
};

// Original fictional contexts. Published order, wording and answer rotation are immutable.
const authored: Item[] = [
  {
    concept: 'schedule', context: '選擇社團日期',
    prompt: 'Art club meets on Monday. Music club meets on Wednesday. Ben joins music club. Which day should he come?',
    answer: 'Wednesday', distractors: ['Monday', 'Friday', 'Sunday'],
    hint: '先找出 Ben 參加哪個社團，再對照那個社團的活動日期。',
    explanation: 'Ben 參加 music club，也就是音樂社。音樂社在 Wednesday（星期三）活動；Monday（星期一）是美術社的時間。',
  },
  {
    concept: 'sequence', context: '吃香蕉前的步驟',
    prompt: 'First, Tim washes his hands. Next, he peels a banana. Finally, he eats it. What does Tim do before peeling the banana?',
    answer: 'He washes his hands.', distractors: ['He eats the banana.', 'He buys a banana.', 'He washes a plate.'],
    hint: 'before 表示在某件事之前。找出剝香蕉前的那個步驟。',
    explanation: '步驟是先洗手，再剝香蕉，最後吃香蕉。所以剝香蕉之前是 washes his hands（洗手）；買香蕉和洗盤子都沒有出現在步驟裡。',
  },
  {
    concept: 'location', context: '尋找藍色書包',
    prompt: 'A red bag is on the chair. A blue bag is under the desk. Where is the blue bag?',
    answer: 'Under the desk.', distractors: ['On the chair.', 'Near the door.', 'Under the bed.'],
    hint: '先確認要找的顏色，再找 under 後面是哪個物品。',
    explanation: '題目說 blue bag is under the desk，所以藍色書包在桌子下面。椅子上的是紅色書包，不能把兩個位置對調。',
  },
  {
    concept: 'dialogue', context: '向同學借鉛筆',
    prompt: 'Nina needs a pencil. She wants to borrow one from Sam. What can Nina say to ask for it politely?',
    answer: 'May I borrow your pencil?', distractors: ['How old are you?', 'This is my sister.', 'It is Monday today.'],
    hint: 'borrow 是借用。找出詢問能不能借鉛筆的句子。',
    explanation: 'May I borrow your pencil? 是「我可以借你的鉛筆嗎？」。其他句子在問年齡、介紹家人或說日期，沒有提出借用的請求。',
  },
  {
    concept: 'schedule', context: '公園開放時間',
    prompt: 'Today, the park opens at nine in the morning and closes at noon. Which time is within its opening hours?',
    answer: 'Ten in the morning.', distractors: ['Eight in the morning.', 'One in the afternoon.', 'Six in the evening.'],
    hint: '找出開放和關閉時間，再選出落在這段時間裡的選項。noon 是中午。',
    explanation: '公園今天上午九點開放，中午關閉。上午十點在這段時間內；上午八點還沒開放，下午一點和晚上六點都已經關閉。',
  },
  {
    concept: 'sequence', context: '完成圖畫',
    prompt: 'Mia draws a fish. Then she colors it. After coloring, she writes her name on the picture. What does she do after coloring?',
    answer: 'She writes her name.', distractors: ['She draws the fish.', 'She washes the picture.', 'She buys some paper.'],
    hint: 'after 表示在某件事之後。找出塗完顏色接著做的事。',
    explanation: 'After coloring 後面接著 writes her name，所以塗完顏色後寫名字。畫魚是在塗色之前，另外兩件事沒有出現在短文裡。',
  },
  {
    concept: 'location', context: '同學的座位',
    prompt: 'Ben sits between Amy and Leo. Nora sits behind Amy. Who has Amy on one side and Leo on the other?',
    answer: 'Ben', distractors: ['Amy', 'Leo', 'Nora'],
    hint: 'between 表示在兩者之間；behind 表示在後面。',
    explanation: 'Ben sits between Amy and Leo，表示 Ben 坐在 Amy 和 Leo 中間。Nora 在 Amy 後面，不是題目所說的中間位置。',
  },
  {
    concept: 'dialogue', context: '回應別人的感謝',
    prompt: 'Sam says, "Thank you for helping me carry these books." Which reply responds to his thanks?',
    answer: "You're welcome.", distractors: ['Please open your book.', 'My shoes are black.', 'I have a new bag.'],
    hint: '先判斷 Sam 正在感謝還是詢問，再選擇回應感謝的說法。',
    explanation: "Sam 正在感謝幫忙搬書的人。You're welcome. 是「不客氣」。其他選項在要求翻書、說鞋子顏色或介紹書包，沒有回應感謝。",
  },
  {
    concept: 'schedule', context: '更新校外活動通知',
    prompt: 'The school trip was planned for Tuesday. A new note says, "The trip is now on Friday. The time is still nine in the morning." What changed?',
    answer: 'The day of the trip.', distractors: ['The starting time.', 'The place to visit.', 'The food for lunch.'],
    hint: '比較原來與更新後的日期，並注意 still 表示仍然相同。',
    explanation: '日期從 Tuesday（星期二）改成 Friday（星期五）。時間仍然是上午九點，地點和午餐沒有提到改變，所以能確定改變的是日期。',
  },
  {
    concept: 'sequence', context: '種下種子的順序',
    prompt: 'Jo puts soil in a pot, makes a small hole, puts a seed in the hole, and covers it with soil. What does Jo do just before covering the seed?',
    answer: 'Puts a seed in the hole.', distractors: ['Makes a small hole.', 'Puts soil in the pot.', 'Moves the pot outside.'],
    hint: 'just before 要找緊接在前面的那一步，不是前面任何一個步驟。',
    explanation: '順序是裝土、挖小洞、放種子、蓋土。蓋土的前一步是把種子放進洞裡；挖洞和裝土都更早，搬到外面則沒有提到。',
  },
  {
    concept: 'location', context: '依照指示找到操場',
    prompt: 'To reach the playground, walk from the gate to the pond. Turn left at the pond. The playground is at the end of that path. Where do you turn left?',
    answer: 'At the pond.', distractors: ['At the gate.', 'At the library.', 'At the classroom.'],
    hint: '找出 Turn left 這個動作後面指定的地點。',
    explanation: '指示明確說 Turn left at the pond，也就是在池塘處左轉。大門是起點，圖書館和教室沒有出現在這條路線中。',
  },
  {
    concept: 'dialogue', context: '請老師再說一次',
    prompt: "Lucy did not hear the teacher's question clearly. She wants the teacher to repeat it. What can she say?",
    answer: 'Could you say that again, please?', distractors: ['I can answer it.', 'The book is on the desk.', 'See you tomorrow.'],
    hint: 'repeat 表示重複。找出請對方把剛才的話再說一次的句子。',
    explanation: 'Could you say that again, please? 是禮貌地請對方再說一次。其他句子表示可以回答、說明書的位置或道別，都沒有請老師重複問題。',
  },
  {
    concept: 'schedule', context: '避開已經有事的日期',
    prompt: 'Tennis is on Tuesday and Thursday. Swimming is only on Saturday. May is busy on Tuesday and wants to play tennis. When can she go?',
    answer: 'Thursday', distractors: ['Tuesday', 'Saturday', 'Sunday'],
    hint: '先找網球的兩個活動日，再排除 May 已經有事的那一天。',
    explanation: '網球在星期二和星期四，May 星期二有事，所以可以選 Thursday（星期四）。題目把游泳安排在星期六，沒有列出星期六、星期日的網球活動。',
  },
  {
    concept: 'sequence', context: '睡前活動的中間步驟',
    prompt: 'Before bed, Anna packs her bag. After packing, she reads a story. Then she brushes her teeth. What does she do between packing and brushing?',
    answer: 'She reads a story.', distractors: ['She packs her bag.', 'She brushes her teeth.', 'She eats breakfast.'],
    hint: '把三件事依序排好，between 要找兩個指定動作中間的事。',
    explanation: '依序是整理書包、讀故事、刷牙。整理書包和刷牙中間是 reads a story（讀故事）；吃早餐沒有出現在這段睡前活動中。',
  },
  {
    concept: 'location', context: '用地點判斷方向',
    prompt: 'The shop is directly north of the park. The library is directly south of the park. Ken walks from the shop to the park and then to the library. Which direction does he go?',
    answer: 'South', distractors: ['North', 'East', 'West'],
    hint: '把商店、公園、圖書館依照 north（北）和 south（南）的位置排好。',
    explanation: '商店在公園北邊，圖書館在公園南邊。從商店到公園，再到圖書館，兩段都是向南，也就是 South。',
  },
  {
    concept: 'dialogue', context: '詢問風箏的價格',
    prompt: 'Eva points to a kite in a shop and asks, "How much is this kite?" Which reply gives the information she asks for?',
    answer: 'It is fifty dollars.', distractors: ['It is blue and white.', 'It is next to the ball.', 'It is very big.'],
    hint: 'How much 在這個買東西的情境中，是詢問價格。',
    explanation: 'Eva 問風箏多少錢，fifty dollars（五十元）回答了價格。顏色、位置和大小都不是她正在詢問的資訊。',
  },
];

export const ENGLISH_CONTEXTS_V1: LearningQuestion[] = authored.map((item, i) => {
  const choices = [item.answer, ...item.distractors];
  // Each concept rotates independently so a concept cannot reveal an answer position.
  const offset = (i + Math.floor(i / 4)) % 4;
  const options = [...choices.slice(offset), ...choices.slice(0, offset)];
  return {
    id: `c1-g4-english-${String(i + 1).padStart(2, '0')}`,
    grade: 4, course: 'english', subject: 'english', skill: 'englishread', level: i < 8 ? 1 : 2,
    prompt: item.prompt, options: options.map(text => ({text})), answer: options.indexOf(item.answer),
    hint: item.hint, explanation: item.explanation,
  };
});
export const ENGLISH_CONTEXT_MANIFEST = {
  version: 1,
  authoredAt: '2026-10-25',
  provenance: 'Original fictional situations. All answers follow the supplied text; no textbook-specific coverage claim.',
  items: authored.map((item, i) => ({id: ENGLISH_CONTEXTS_V1[i].id, concept: item.concept, context: item.context})),
};
