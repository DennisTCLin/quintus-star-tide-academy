import type { LearningQuestion } from "./learning";

export const INQUIRY_CONCEPTS = {
  observation: "分辨觀察與猜想",
  fairTest: "安排公平的比較",
  repeat: "重複測量與查核紀錄",
  evidence: "依證據說明結果",
} as const;
type Concept = keyof typeof INQUIRY_CONCEPTS;
type AuthoredItem = {
  concept: Concept;
  context: string;
  prompt: string;
  answer: string;
  distractors: [string, string, string];
  hint: string;
  explanation: string;
};

// Original, fictional classroom situations. These assess reasoning from the
// supplied evidence, not unverified experimental facts or textbook coverage.
// This ordered v1 list defines persisted IDs. Append new IDs; never reorder it.
const authored: AuthoredItem[] = [
  {
    concept: "observation", context: "葉片紀錄",
    prompt: "小羽看著盆栽，記下「有三片葉子，其中一片變黃」。下面哪一句也是可以直接觀察的紀錄？",
    answer: "盆栽的土表有一道裂縫",
    distractors: ["盆栽一定缺水了", "盆栽明天會長新葉", "盆栽不喜歡這個花盆"],
    hint: "找出眼睛能看到的現象，不先猜原因或明天的變化。",
    explanation: "土表的裂縫能直接看到。缺水是可能的原因，還要查證；明天長葉是預測，喜不喜歡花盆也不是直接觀察。",
  },
  {
    concept: "fairTest", context: "小車坡道",
    prompt: "想比較同一輛小車從不同高度的斜坡滑下，滑行距離有沒有不同。哪個安排最公平？",
    answer: "改變起點高度，其餘條件相同，都不推車",
    distractors: ["高處用大車，低處用小車", "高處不推，低處用力推", "高處用木板，低處用毛巾當坡道"],
    hint: "這次要比較的是高度。其他也會影響距離的條件，要儘量相同。",
    explanation: "只改變起點高度，保持小車、坡道表面、地面和放手方式相同，才容易比較高度的影響。換車、推力或坡道表面都會讓原因混在一起。",
  },
  {
    concept: "repeat", context: "鉛筆長度",
    prompt: "同一支沒削過的鉛筆，三次量到 15、15、51 公分。下一步怎麼做最合理？",
    answer: "保留紀錄，檢查刻度和抄寫，再量一次",
    distractors: ["把 51 改成 15，不用再量", "只留下最長的 51 公分", "說鉛筆第三次突然變長了"],
    hint: "不一樣的數字需要查核，不能先改成自己希望的答案。",
    explanation: "51 公分和另外兩次差很多。先保留原紀錄，檢查尺的起點、刻度與抄寫，再重新測量，才能找出差異的原因。",
  },
  {
    concept: "evidence", context: "紙巾吸水",
    prompt: "在這次相同條件的測試中，同樣大小的紙巾甲吸了 8 毫升水，乙吸了 5 毫升水。哪個結論有紀錄支持？",
    answer: "這次測試中，甲吸的水比乙多",
    distractors: ["甲在任何情況都比乙好", "乙完全不能吸水", "甲的價格一定比較高"],
    hint: "結論要留在這次測試的範圍內，沒有測的事不能一起推定。",
    explanation: "8 毫升比 5 毫升多，所以只能說這次甲吸水較多。乙也吸了水；紀錄沒有價格，也不能代表任何情況下的表現。",
  },
  {
    concept: "observation", context: "冰塊變化",
    prompt: "桌上的盤子裡有一塊冰。過了十分鐘，冰塊變小，盤裡多了水。哪一句屬於原因的猜想，需要進一步查證？",
    answer: "可能是周圍較暖，讓冰融化了",
    distractors: ["盤裡出現了水", "冰塊比剛才小", "兩次觀察相隔十分鐘"],
    hint: "觀察說明看到了什麼；猜想試著解釋為什麼。",
    explanation: "「周圍較暖」是在解釋原因，需要溫度等證據。冰變小、盤裡有水及相隔十分鐘，是題目已提供的紀錄。",
  },
  {
    concept: "fairTest", context: "紙飛機材質",
    prompt: "想知道紙張厚薄會不會影響紙飛機的飛行距離。哪一組最適合比較？",
    answer: "兩張同樣大小、厚薄不同的紙，折法和投擲方式相同",
    distractors: ["一張薄紙折飛機，一張厚紙揉成球", "薄紙在室內飛，厚紙在有風的戶外飛", "厚紙用力丟，薄紙輕輕丟"],
    hint: "保留要比較的厚薄差異，其他可能影響飛行的條件要相同。",
    explanation: "紙的厚薄是這次要改變的條件。紙張大小、折法、場所和投擲方式應儘量相同；否則無法分清距離差異來自哪個條件。",
  },
  {
    concept: "repeat", context: "種子發芽",
    prompt: "兩組用相同方法照顧豆子，一組只放一顆，另一組放十顆。想看同樣照顧下發芽情況是否一致，為什麼要觀察多顆？",
    answer: "可以看見個別差異，不只依一顆就下結論",
    distractors: ["豆子多就保證每顆都發芽", "只要豆子多，就不必記錄", "十顆一定會在同一分鐘發芽"],
    hint: "同樣照顧，也可能有不同結果。多次觀察能讓我們看見這些差異。",
    explanation: "觀察多顆能看見同樣條件下是否仍有差異，避免只靠一顆代表全部。數量增加不保證全部發芽，也不能取代紀錄。",
  },
  {
    concept: "evidence", context: "影子紀錄",
    prompt: "同一根固定直立的竿子，上午九點的影子長 80 公分，中午十二點長 30 公分。只依這兩次紀錄，可以說什麼？",
    answer: "這次中午量到的影子比上午九點短",
    distractors: ["竿子中午縮短了", "所有地方的影子中午都是 30 公分", "下午三點的影子一定長 80 公分"],
    hint: "比較題目真的量過的兩次，不猜沒有量過的時間或地點。",
    explanation: "30 公分小於 80 公分，支持這兩次影長的比較。沒有測量竿子長度變化、其他地點或下午三點，不能用這份紀錄判定那些結果。",
  },
  {
    concept: "observation", context: "磁鐵紀錄",
    prompt: "小安把磁鐵靠近一個迴紋針，記下「迴紋針往磁鐵移動」。哪一句把猜想當成了觀察結果？",
    answer: "所有金屬一定都會被這塊磁鐵吸住",
    distractors: ["磁鐵靠近了迴紋針", "這個迴紋針移動了", "這次只測了一個迴紋針"],
    hint: "測過一個物品，是否等於測過所有金屬？",
    explanation: "這次只觀察一個迴紋針，不能說所有金屬都一樣。其他三句都限於題目描述的操作或現象。",
  },
  {
    concept: "fairTest", context: "紙巾測試時間",
    prompt: "想比較兩種紙巾的吸水量。紙巾大小、水量、放入方式都相同，但甲泡十秒，乙泡一分鐘。還要先改哪一點？",
    answer: "讓兩種紙巾吸水的時間相同",
    distractors: ["把吸水較少的那張換大一點", "只記錄自己喜歡的紙巾", "把甲的水量改成乙的兩倍"],
    hint: "找出除了紙巾種類之外，還不相同的條件。",
    explanation: "時間不同也可能影響吸水量。先統一吸水時間，才能較公平地比較紙巾種類；改大小或水量會再加入其他差異。",
  },
  {
    concept: "repeat", context: "小車多次試驗",
    prompt: "同一輛小車從同一高度放手，三次滑了 60、64、62 公分。要向同學報告結果，哪種做法最清楚？",
    answer: "列出三次距離，說明三次稍有不同",
    distractors: ["只報最遠的 64 公分，說每次都一樣", "刪掉 60 和 62，讓紀錄整齊", "沒再測量就把三次都改成 64"],
    hint: "保留每次量到的結果，別把差異藏起來。",
    explanation: "三次紀錄都有用，能讓同學看見測量結果的差異。只報最好的一次或修改數字，會讓人誤以為每次表現完全相同。",
  },
  {
    concept: "evidence", context: "植物同時改條件",
    prompt: "盆栽甲放窗邊、每天澆水，乙放暗處、一週才澆一次。甲長得較高。能只靠這次結果說「一定是光線造成」嗎？",
    answer: "還不能，光線和澆水都不同，原因混在一起",
    distractors: ["可以，因為甲比較高", "可以，不必考慮澆水", "只要再量一次高度，就能排除澆水影響"],
    hint: "想一想，兩盆除了光線，還有哪個條件不同？",
    explanation: "兩盆同時有光線和澆水的差異，這次無法單獨判斷光線的影響。只重測高度，並沒有讓澆水條件相同。",
  },
  {
    concept: "observation", context: "天空紀錄",
    prompt: "戶外觀察時，小晴記下「天空有灰雲，地面是乾的」。下列哪一句是預測，還不是已觀察到的事？",
    answer: "待會兒可能會下雨",
    distractors: ["天空有灰雲", "現在地面是乾的", "這份紀錄寫了雲和地面的樣子"],
    hint: "留意句子說的是現在，還是尚未發生的事情。",
    explanation: "「待會兒可能下雨」描述未來，是預測。灰雲和乾的地面是當時觀察到的現象，並不能保證接下來一定下雨。",
  },
  {
    concept: "fairTest", context: "降落傘面積",
    prompt: "想比較傘面大小對玩具降落傘落地時間的影響。兩個傘面材質相同，繩長和載重也相同。哪個放手方法最公平？",
    answer: "從同一高度，用相同方式放手",
    distractors: ["大傘從較高處放，小傘從較低處放", "放大傘時向下用力推", "只替小傘加一個重物再放"],
    hint: "除傘面大小以外，放手高度、方式與載重都要儘量相同。",
    explanation: "同高度、同方式放手，才能較公平地比較傘面大小。改高度、推力或載重，都可能另外影響落地時間。",
  },
  {
    concept: "repeat", context: "相同溫度讀值",
    prompt: "兩人用同一支溫度計讀同一杯水，一人讀 24 度，一人讀 29 度。想查明讀值差異，先怎麼做？",
    answer: "一起確認刻度和讀取方式，再記錄讀值",
    distractors: ["直接採用年紀較大的人說的數字", "選自己喜歡的溫度", "把兩人的紀錄都丟掉，不再測量"],
    hint: "用可以檢查的方法處理差異，不用年紀或喜好決定數字。",
    explanation: "先確認是否看同一刻度、讀取方法是否一致，再重新讀值並保留紀錄。年紀和喜好都不能判斷這杯水的實際溫度。",
  },
  {
    concept: "evidence", context: "資料不足",
    prompt: "同學想比較兩種紙橋能承受多少顆相同的積木，卻只測了紙橋甲。放上第五顆後，紙橋仍沒有垮，同學就停止加積木。哪個說法最合理？",
    answer: "目前只知道甲承受過五顆，還不能比較甲乙",
    distractors: ["甲最多只能承受五顆", "乙一定比甲弱", "甲和乙一定一樣強"],
    hint: "有沒有測到甲的極限？有沒有測過乙？",
    explanation: "停止時甲仍承受著五顆，沒有測出極限；乙也尚未測試。因此只能報告已觀察到的結果，還不能比較兩種紙橋。",
  },
];

export const SCIENCE_INQUIRY_V1: LearningQuestion[] = authored.map((item, i) => {
  const answers = [item.answer, ...item.distractors];
  const offset = i % answers.length;
  const choices = [...answers.slice(offset), ...answers.slice(0, offset)];
  return {
    id: `c1-g4-science-${String(i + 1).padStart(2, "0")}`,
    grade: 4, course: "science", subject: "science", skill: "observation", level: i < 8 ? 1 : 2,
    prompt: item.prompt, options: choices.map(text => ({ text })), answer: choices.indexOf(item.answer),
    hint: item.hint, explanation: item.explanation,
  };
});

export const SCIENCE_INQUIRY_MANIFEST = {
  version: 1,
  authoredAt: "2026-10-25",
  provenance: "Original fictional classroom scenarios; general inquiry practice, not publisher-specific coverage.",
  reference: "https://www.nextgenscience.org/topic-arrangement/3-5engineering-design",
  review: "Agent content review and automated contract checks; no teacher review claimed.",
  items: authored.map((item, i) => ({ id: SCIENCE_INQUIRY_V1[i].id, concept: item.concept, context: item.context })),
};
