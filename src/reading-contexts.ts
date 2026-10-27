import type { LearningQuestion } from "./learning";

export const READING_CONTEXT_CONCEPTS = {
  sequence: "讀懂先後順序",
  position: "讀懂位置詞",
  reference: "找出話語指的是誰",
  cause: "找出句子說明的原因",
} as const;
type Concept = keyof typeof READING_CONTEXT_CONCEPTS;
type ReadingItem = {
  concept: Concept; context: string; prompt: string; answer: string;
  distractors: [string, string, string]; hint: string; explanation: string;
};

// Original short, fictional situations for grade-two language practice.
// Persisted c1 IDs follow this immutable order; append new IDs, never reorder.
const authored: ReadingItem[] = [
  {
    concept: "sequence", context: "吃點心前",
    prompt: "小安先洗手，再吃點心。小安先做哪一件事？",
    answer: "洗手", distractors: ["吃點心", "收玩具", "穿鞋子"],
    hint: "找出「先」後面的動作，再看看「再」後面的動作。",
    explanation: "句子說「先洗手，再吃點心」，所以先做的是洗手。吃點心在洗手之後，另外兩件事沒有出現在句子裡。",
  },
  {
    concept: "position", context: "盒子裡外",
    prompt: "紅球在盒子裡，藍球在盒子外。哪一顆球在盒子裡？",
    answer: "紅球", distractors: ["藍球", "黃球", "綠球"],
    hint: "把顏色和位置連在一起讀，留意「裡」和「外」。",
    explanation: "句子把紅球的位置說成「盒子裡」，藍球則在盒子外。黃球和綠球的位置沒有提到。",
  },
  {
    concept: "reference", context: "小美畫花",
    prompt: "小美拿起畫筆。她開始畫花。「她」指的是誰？",
    answer: "小美", distractors: ["畫筆", "花朵", "畫紙"],
    hint: "回頭找前一句正在做事的人。",
    explanation: "前一句做事的人是小美，後一句用「她」接著說小美開始畫花。畫筆、花朵和畫紙都不是這裡指的人。",
  },
  {
    concept: "cause", context: "雨天帶傘",
    prompt: "因為外面下雨，小禾帶了雨傘。小禾為什麼帶雨傘？",
    answer: "因為外面下雨", distractors: ["因為要畫畫", "因為肚子餓", "因為想睡覺"],
    hint: "「因為」後面的事情，說明了這次帶傘的原因。",
    explanation: "句子明白說出原因是外面下雨。其他事情可能讓人想做別的活動，但都不是這個句子提供的原因。",
  },
  {
    concept: "sequence", context: "收好書包",
    prompt: "樂樂先把書放進書包，再拉上拉鍊。放好書以後，樂樂接著做什麼？",
    answer: "拉上拉鍊", distractors: ["打開水壺", "把書拿出來", "穿上雨衣"],
    hint: "題目問的是放好書「以後」，找下一個動作。",
    explanation: "兩個動作依序是放書、拉上拉鍊。放好書之後接著拉上拉鍊；另外三個動作沒有寫在句子裡。",
  },
  {
    concept: "position", context: "大樹兩邊",
    prompt: "小熊站在大樹左邊，小兔站在大樹右邊。大樹右邊是誰？",
    answer: "小兔", distractors: ["小熊", "小狗", "小貓"],
    hint: "先找「右邊」，再找和它放在同一句的動物。",
    explanation: "題目已說小兔站在大樹右邊，小熊在左邊。不用猜動物的習慣，只要依句子提供的位置作答。",
  },
  {
    concept: "reference", context: "小狗送球",
    prompt: "小狗叼著球跑來。牠把球放在門口。「牠」指的是什麼？",
    answer: "小狗", distractors: ["球", "門", "繩子"],
    hint: "找出前一句會跑、會把球放下的動物。",
    explanation: "「牠」接著指前一句的小狗。是小狗叼球跑來，再把球放下；球和門不是做這些動作的動物。",
  },
  {
    concept: "cause", context: "桌面溼了",
    prompt: "杯裡的水灑出來，所以桌面溼了。桌面為什麼會溼？",
    answer: "杯裡的水灑出來", distractors: ["窗戶關起來", "書本放好了", "椅子移開了"],
    hint: "「所以」前面的事情，說明桌面變溼的原因。",
    explanation: "水灑到桌面，造成桌面變溼。句子沒有說關窗、放書或移椅子造成桌面溼，所以不能選那些原因。",
  },
  {
    concept: "sequence", context: "摺紙三步驟",
    prompt: "小青先對折紙張，再壓平摺痕，最後打開紙張。第二步是什麼？",
    answer: "壓平摺痕", distractors: ["對折紙張", "打開紙張", "拿出蠟筆"],
    hint: "把「先、再、最後」分別排成第一、第二、第三步。",
    explanation: "第一步是對折，第二步是壓平摺痕，第三步才打開紙張。「再」後面的動作正是題目問的第二步。",
  },
  {
    concept: "position", context: "書櫃三層",
    prompt: "書櫃上層放故事書，中層放字典，下層放畫冊。故事書和畫冊中間是哪一本？",
    answer: "字典", distractors: ["故事書", "畫冊", "筆記本"],
    hint: "上、中、下排成三層；找出中間那一層的書。",
    explanation: "故事書在上層，畫冊在下層，中層的字典就在兩者之間。筆記本的位置沒有出現在這份說明裡。",
  },
  {
    concept: "reference", context: "借書的話",
    prompt: "小蘭借給小明一本書。小明說：「我明天還書。」「我」指的是誰？",
    answer: "小明", distractors: ["小蘭", "老師", "作者"],
    hint: "引號裡的「我」是正在說話的人。找找是誰說這句話。",
    explanation: "說「我明天還書」的人是小明，所以這裡的「我」指小明。小蘭是借出書的人，沒有說這句話。",
  },
  {
    concept: "cause", context: "停下來綁鞋帶",
    prompt: "小秋的鞋帶鬆了，所以她停下來綁鞋帶。小秋停下來的原因是什麼？",
    answer: "鞋帶鬆了", distractors: ["想數星星", "忘了帶書", "準備喝水"],
    hint: "先讀鞋帶發生了什麼事，再想為什麼要停下來。",
    explanation: "句子把鞋帶鬆了和停下來綁鞋帶連在一起。鞋帶鬆了是原因；數星星、忘帶書和喝水都沒有在句子裡說明。",
  },
  {
    concept: "sequence", context: "課程先後",
    prompt: "今天先上音樂課，再上體育課，最後上美術課。體育課之前是哪一堂課？",
    answer: "音樂課", distractors: ["美術課", "國語課", "自然課"],
    hint: "先排出三堂課，再找體育課前面的那一堂。",
    explanation: "課程順序是音樂、體育、美術，所以體育課之前是音樂課。美術課在體育課之後；另外兩堂課沒有列出。",
  },
  {
    concept: "position", context: "尋找橡皮擦",
    prompt: "鉛筆在筆盒裡，橡皮擦在筆盒旁邊。要拿到橡皮擦，應該往哪裡找？",
    answer: "筆盒旁邊", distractors: ["筆盒裡面", "書包底下", "椅子上面"],
    hint: "不要把鉛筆的位置和橡皮擦的位置交換了。",
    explanation: "句子說橡皮擦在筆盒旁邊；筆盒裡是鉛筆。書包底下和椅子上面都沒有被說成橡皮擦的位置。",
  },
  {
    concept: "reference", context: "一起畫畫",
    prompt: "小方和小雨一起畫畫。小方說：「小雨，我幫你拿紅筆。」「你」指的是誰？",
    answer: "小雨", distractors: ["小方", "老師", "爸爸"],
    hint: "「你」是說話的人正在對話的對象，前面有叫出名字。",
    explanation: "小方先叫「小雨」，接著對小雨說「我幫你拿紅筆」，所以「你」指小雨。「我」才是正在說話的小方。",
  },
  {
    concept: "cause", context: "尋找水壺",
    prompt: "小文因為找不到水壺，所以請老師幫忙。小文請老師幫忙，是因為什麼？",
    answer: "找不到水壺", distractors: ["想借一本書", "忘了帶作業", "想學唱歌"],
    hint: "找出「因為」後面直接寫出的事情，不替故事加上其他原因。",
    explanation: "故事直接說小文找不到水壺，所以請老師幫忙。借書、忘帶作業或學唱歌都可能需要協助，但不是這次提供的原因。",
  },
];

export const READING_CONTEXTS_V1: LearningQuestion[] = authored.map((item, i) => {
  const choices = [item.answer, ...item.distractors];
  const offset = i % choices.length;
  const options = [...choices.slice(offset), ...choices.slice(0, offset)];
  return {
    id: `c1-g2-words-${String(i + 1).padStart(2, "0")}`,
    grade: 2, course: "words", subject: "chinese", skill: "words", level: i < 8 ? 1 : 2,
    format: "short-passage",
    prompt: item.prompt, options: options.map(text => ({ text })), answer: options.indexOf(item.answer),
    hint: item.hint, explanation: item.explanation,
  };
});

export const READING_CONTEXT_MANIFEST = {
  version: 1,
  authoredAt: "2026-10-25",
  provenance: "Original fictional short passages. General language practice, not textbook-specific or teacher-reviewed content.",
  review: "Independent read-only answer, wording and Taiwan Zhuyin review passed on 2026-10-25. Device TTS and teacher/child review remain unverified.",
  items: authored.map((item, i) => ({ id: READING_CONTEXTS_V1[i].id, concept: item.concept, context: item.context })),
};
