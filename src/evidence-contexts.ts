import type { LearningQuestion } from "./learning";

export const EVIDENCE_CONCEPTS = {
  mainIdea: "整合文章重點",
  comparison: "比較文字與依據",
  mapInformation: "使用地圖資訊",
  changeOverTime: "比較過去與現在",
} as const;
type AuthoredItem = {
  course: "chinese" | "social";
  concept: keyof typeof EVIDENCE_CONCEPTS;
  context: string;
  prompt: string;
  speechText?: string;
  answer: string;
  distractors: [string, string, string];
  hint: string;
  explanation: string;
};

// Original fictional situations with all necessary evidence inside each prompt.
// This v1 order and its answer rotation define saved IDs. Never reorder items.
const authored: AuthoredItem[] = [
  {
    course: "chinese", concept: "mainIdea", context: "班級圖書角",
    prompt: "同學先把圖書角的書分類，再貼上書架標籤。大家還討論借書規則，讓借還更方便。哪個標題最能涵蓋整段內容？",
    answer: "一起整理與使用圖書角",
    distractors: ["書架標籤的顏色", "校外圖書館的歷史", "停止借書的決定"],
    hint: "標題要同時包含整理書籍和討論使用方式，不能只抓一個小細節。",
    explanation: "這段先說分類、貼標籤，再說借書規則，重點是一起整理和使用圖書角。標籤顏色太狹窄，歷史與停止借書都沒有出現在內容裡。",
  },
  {
    course: "chinese", concept: "comparison", context: "兩張活動通知",
    prompt: "通知甲：週三下午在教室畫畫，請帶彩色筆。通知乙：週三下午在操場觀察雲，請帶筆記本。兩個活動哪一項相同？",
    answer: "舉行的時間",
    distractors: ["活動的地點", "要帶的物品", "進行的內容"],
    hint: "分別找出兩張通知的時間、地點、物品和活動，再逐項比較。",
    explanation: "兩張通知都寫週三下午，所以時間相同。教室和操場不同，彩色筆和筆記本不同，畫畫與觀察雲也不是同一活動。",
  },
  {
    course: "chinese", concept: "mainIdea", context: "豆苗觀察本",
    prompt: "小晴每天畫下豆苗的樣子，在旁邊寫日期和高度。一週後，她把圖畫排好，比較豆苗的變化。哪個標題最適合？",
    answer: "記錄豆苗每天的變化",
    distractors: ["買畫筆的一天", "豆苗最好吃的煮法", "只看一次就知道結果"],
    hint: "找出每天做的事，以及把圖畫排好之後要了解什麼。",
    explanation: "畫樣子、寫日期和高度、比較一週的圖畫，都在記錄豆苗的變化。文章沒有買筆或煮豆苗，也不是只觀察一次。",
  },
  {
    course: "chinese", concept: "comparison", context: "兩個袋子的說明",
    prompt: "袋子甲的說明：有三個口袋，外層防水。袋子乙的說明：有三個口袋，可以摺成小包。只依這兩份說明，哪句正確？",
    answer: "兩個袋子的口袋數相同",
    distractors: ["兩個袋子都寫著外層防水", "只有乙有三個口袋", "甲一定比乙更輕"],
    hint: "只能比較說明裡真的寫出的資料，沒有寫的特點不能猜。",
    explanation: "甲和乙都寫有三個口袋。防水只出現在甲的說明，重量則兩份都沒提到，所以不能判斷誰更輕。",
  },
  {
    course: "chinese", concept: "mainIdea", context: "珍惜紙張",
    prompt: "班上把只用過一面的紙留下來當草稿紙，也把舊海報的背面拿來畫圖。大家說，先把紙用完，再拿新紙。主要在說什麼？",
    answer: "把還能使用的紙充分利用",
    distractors: ["只有海報可以拿來畫圖", "每次畫圖都要拿新紙", "草稿紙只能用一面"],
    hint: "想一想，留下單面紙和使用海報背面，有什麼共同目的？",
    explanation: "兩種做法都把還沒用過的紙面利用起來，最後一句也說先把紙用完。文章沒有禁止用其他紙畫圖，也沒有要求每次換新紙。",
  },
  {
    course: "chinese", concept: "comparison", context: "準備材料的方法",
    prompt: "小平先列出材料清單，再照清單裝袋。小樂先把材料裝袋，再拿清單檢查。關於兩人的做法，哪句有文字依據？",
    answer: "兩人都使用清單，但裝袋前後的做法不同",
    distractors: ["兩人都先裝袋才使用清單", "只有小平使用清單", "小樂一定忘了帶材料"],
    hint: "注意兩句中的「先」和「再」，也找出兩人共同使用的東西。",
    explanation: "小平先列清單再裝袋，小樂先裝袋再用清單檢查；兩人都有用清單。文章沒說誰漏帶材料，不能只憑順序就猜測結果。",
  },
  {
    course: "chinese", concept: "mainIdea", context: "社區介紹手冊",
    prompt: "同學訪問社區店家，記下各店的特色，再畫出位置圖。最後把訪問內容和位置圖裝訂在一起，送給新搬來的鄰居。哪個標題最完整？",
    answer: "製作給新鄰居的社區介紹手冊",
    distractors: ["只學習如何裝訂紙張", "搬家時怎麼整理行李", "每一家店的商品都相同"],
    hint: "除了最後的裝訂動作，也要包含前面的訪問、畫圖和送給誰。",
    explanation: "訪問特色、畫位置圖、裝訂和送給新鄰居，合起來是在製作社區介紹手冊。只說裝訂不夠完整，另外兩項不是文章提供的重點。",
  },
  {
    course: "chinese", concept: "comparison", context: "更新的手作通知",
    prompt: "原通知：週五到教室做手作，請帶水壺。更新通知：時間和地點不變，仍要帶水壺，另外請帶剪刀。更新後多了哪項要求？",
    answer: "帶剪刀",
    distractors: ["換到操場集合", "改到週四上課", "不必帶水壺"],
    hint: "留意「不變」「仍要」和「另外」，找出真正新增的要求。",
    explanation: "「另外請帶剪刀」是新增要求。時間、地點都不變，而且仍要帶水壺，所以其他選項都和更新通知不符。",
  },
  {
    course: "social", concept: "mapInformation", context: "校園方向",
    prompt: "校園圖以上方為北。操場在圖書館正東方，花園在操場正北方。從圖書館先到操場，再到花園，依序往哪兩個方向走？",
    answer: "先向東，再向北",
    distractors: ["先向北，再向東", "先向西，再向北", "先向東，再向南"],
    hint: "把路程分成圖書館到操場、操場到花園兩段，不要交換起點。",
    explanation: "第一段從圖書館到正東方的操場，所以向東；第二段從操場到正北方的花園，所以向北。題目問的是依序兩段的方向。",
  },
  {
    course: "social", concept: "changeOverTime", context: "市場開放紀錄",
    prompt: "星河村的市場紀錄：十年前只有週六開放；現在週一到週日都開放。只依這份資料，哪個改變可以確定？",
    answer: "每週開放的天數增加了",
    distractors: ["攤位的數量增加了", "所有商品都變便宜了", "每天來的人都更多了"],
    hint: "資料提供的是開放日期，沒有提供攤位、價格或人數。",
    explanation: "十年前每週開放一天，現在每週七天，所以開放天數增加。攤位數量、商品價格和來客人數都沒有資料，不能一起推定。",
  },
  {
    course: "social", concept: "mapInformation", context: "社區圖例",
    prompt: "社區圖的圖例：●是圖書館，▲是公園，■是車站。圖上■的東邊是▲，▲的北邊是●。公園北邊是哪個設施？",
    speechText: "社區圖的圖例：圓形是圖書館，三角形是公園，正方形是車站。圖上正方形的東邊是三角形，三角形的北邊是圓形。公園北邊是哪個設施？",
    answer: "圖書館",
    distractors: ["車站", "另一座公園", "圖上沒有標示設施"],
    hint: "先用圖例認出公園的符號，再找它北邊的符號代表什麼。",
    explanation: "三角形代表公園，它北邊的圓形代表圖書館。正方形是車站，位在公園西邊；題目並沒有標出另一座公園。",
  },
  {
    course: "social", concept: "changeOverTime", context: "廣場的新舊照片",
    prompt: "同一座廣場的舊照片只有草地；新照片同一位置除了草地，還有長椅和樹木。這兩張照片能直接支持哪個說法？",
    answer: "廣場增加了長椅和樹木",
    distractors: ["廣場的草地全部消失了", "照片能告訴我們所有人的想法", "長椅一定是昨天放好的"],
    hint: "比較照片中看得見的東西，別猜沒有拍到的想法或確切日期。",
    explanation: "舊照片沒有、新照片有的長椅和樹木，是能直接比較的改變。新照片仍有草地，也無法看出所有人的想法或長椅放置的確切日期。",
  },
  {
    course: "social", concept: "mapInformation", context: "封閉路段",
    prompt: "簡圖上從甲到丁只有兩條路：甲到乙再到丁，或甲到丙再到丁。今天乙到丁封閉，其餘路段都開放。要走到丁，應選哪條路？",
    answer: "甲到丙，再到丁",
    distractors: ["甲到乙，再到丁", "甲到乙後直接穿過封閉路段", "甲到丁，走圖上沒有的直達路"],
    hint: "逐段檢查候選路線，有沒有經過封閉路段，或使用圖上沒有的路。",
    explanation: "甲到丙、丙到丁都開放，可以到達目的地。經過乙到丁會遇到封閉路段；圖上也沒有甲到丁的直達路，不能自行加上一條。",
  },
  {
    course: "social", concept: "changeOverTime", context: "接駁車紀錄",
    prompt: "星河村的接駁車紀錄：以前每天六班，只停車站；現在每天六班，停車站和市場。哪句完整說明資料中的相同與不同？",
    answer: "每天班次相同，停靠地點增加了",
    distractors: ["每天班次變多，停靠地點不變", "每天班次和停靠地點都減少", "現在不再停靠車站"],
    hint: "把每天班次和停靠地點分開比較，一項相同不代表全部相同。",
    explanation: "兩個時期都是每天六班，這點相同。以前只停車站，現在多停市場且仍停車站，所以停靠地點增加。",
  },
  {
    course: "social", concept: "mapInformation", context: "步道路線",
    prompt: "導覽圖用虛線表示步道，實線表示車道。這次活動規定全程走步道。甲路全是虛線，乙路前半虛線、後半實線。哪條符合規定？",
    answer: "甲路，因為全程都是步道",
    distractors: ["乙路，因為起點是步道就夠了", "兩條都符合，因為都有虛線", "兩條都不符合，因為虛線是車道"],
    hint: "先確認線條代表什麼，再檢查是不是整條路都符合規定。",
    explanation: "虛線代表步道，甲路全是虛線，符合全程走步道的活動規定。乙路後半是實線車道，只有前半符合，不能當成全程符合。",
  },
  {
    course: "social", concept: "changeOverTime", context: "老屋用途紀錄",
    prompt: "星河村的紀錄寫著：三十年前，老屋用來存放稻米；現在，同一棟老屋用來展示村莊照片。資料確實說明了什麼改變？",
    answer: "老屋的使用用途改變了",
    distractors: ["老屋的位置搬到另一條街", "老屋已經拆掉重蓋", "村裡已經沒有人種稻米"],
    hint: "比較兩個時期老屋用來做什麼，別把用途改變當成其他事情也改變。",
    explanation: "從存放稻米改成展示照片，是使用用途改變。資料說是同一棟老屋，並未說搬家、拆除重蓋，也沒有提供全村種稻的情況。",
  },
];

export const EVIDENCE_CONTEXTS_V1: LearningQuestion[] = authored.map((item, i) => {
  const choices = [item.answer, ...item.distractors];
  const offset = i % choices.length;
  const options = [...choices.slice(offset), ...choices.slice(0, offset)];
  return {
    id: `c1-g4-${item.course}-${String(i % 8 + 1).padStart(2, "0")}`,
    grade: 4, course: item.course, subject: item.course, skill: item.course,
    level: i % 8 < 4 ? 1 : 2,
    prompt: item.prompt, ...(item.speechText ? { speechText: item.speechText } : {}),
    options: options.map(text => ({ text })), answer: options.indexOf(item.answer),
    hint: item.hint, explanation: item.explanation,
  };
});

export const EVIDENCE_CONTEXT_MANIFEST = {
  version: 1,
  authoredAt: "2026-10-25",
  provenance: "Original fictional situations; answers follow only the supplied text or map facts. Not publisher-specific coverage.",
  review: "Agent content/pronunciation review plus automated contract checks; no teacher or human listening approval claimed.",
  items: authored.map((item, i) => ({ id: EVIDENCE_CONTEXTS_V1[i].id, concept: item.concept, context: item.context })),
};
