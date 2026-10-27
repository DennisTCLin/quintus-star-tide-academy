import { seededPick, type Subject } from './core'

export type { Subject } from './core'

export type Question = {
  id: string
  subject: Subject
  prompt: string
  options: string[]
  answer: number
  hint: string
  explanation: string
  difficulty: 1 | 2 | 3
}

import { SUBJECTS } from "./subject-catalog";
export { SUBJECTS } from "./subject-catalog";
export const QUESTION_BANK: Question[] = [
  {
    id: 'math-01', subject: 'math', difficulty: 1,
    prompt: '探險船一天航行 36 海里，連續 7 天共航行多少海里？',
    options: ['232 海里', '242 海里', '252 海里', '262 海里'], answer: 2,
    hint: '把 36 拆成 30 和 6，再分別乘以 7。',
    explanation: '36 × 7＝30 × 7＋6 × 7＝210＋42＝252。',
  },
  {
    id: 'math-02', subject: 'math', difficulty: 2,
    prompt: '864 顆星砂平均裝進 8 個瓶子，每瓶有幾顆？',
    options: ['98 顆', '108 顆', '118 顆', '128 顆'], answer: 1,
    hint: '先算 800 ÷ 8，再想剩下的 64。',
    explanation: '864 ÷ 8＝108，因為 108 × 8＝864。',
  },
  {
    id: 'math-03', subject: 'math', difficulty: 1,
    prompt: '一張航海圖先塗了 2/8，又塗了不同且不重疊的 3/8，合起來塗了多少？',
    options: ['5/8', '5/16', '6/8', '1/8'], answer: 0,
    hint: '分母相同，代表每一份一樣大，只要把分子相加。',
    explanation: '2/8＋3/8＝5/8；分母 8 不變，分子 2＋3＝5。',
  },
  {
    id: 'math-04', subject: 'math', difficulty: 2,
    prompt: '長方形甲板長 9 公尺、寬 6 公尺，它的周長是多少？',
    options: ['15 公尺', '30 公尺', '45 公尺', '54 公尺'], answer: 1,
    hint: '周長要把四條邊都加起來。',
    explanation: '（9＋6）× 2＝30，所以甲板周長是 30 公尺。',
  },
  {
    id: 'math-05', subject: 'math', difficulty: 1,
    prompt: '2 公斤 350 公克，合起來是多少公克？',
    options: ['235 公克', '2,035 公克', '2,350 公克', '23,500 公克'], answer: 2,
    hint: '1 公斤等於 1,000 公克。',
    explanation: '2 公斤＝2,000 公克；2,000＋350＝2,350 公克。',
  },
  {
    id: 'math-06', subject: 'math', difficulty: 2,
    prompt: '0.7 公升的淡水再加入 0.35 公升，現在共有多少公升？',
    options: ['0.42 公升', '0.75 公升', '1.05 公升', '1.5 公升'], answer: 2,
    hint: '把 0.7 寫成 0.70，再對齊小數點相加。',
    explanation: '0.70＋0.35＝1.05，所以共有 1.05 公升。',
  },
  {
    id: 'math-07', subject: 'math', difficulty: 2,
    prompt: '港口原有 1,500 枚補給幣，用掉 768 枚，還剩多少枚？',
    options: ['722 枚', '732 枚', '742 枚', '832 枚'], answer: 1,
    hint: '可以先減 700，再減 68。',
    explanation: '1,500－768＝732；用 732＋768 驗算會得到 1,500。',
  },
  {
    id: 'math-08', subject: 'math', difficulty: 1,
    prompt: '羅盤上的東方與北方互相垂直，形成幾度的角？',
    options: ['45 度', '60 度', '90 度', '180 度'], answer: 2,
    hint: '互相垂直的兩條線會形成直角。',
    explanation: '直角是 90 度，所以東方與北方之間是 90 度。',
  },
  {
    id: 'math-09', subject: 'math', difficulty: 3,
    prompt: '補給站有 6 箱飲用水，每箱 24 瓶。分給隊員 58 瓶後，還剩多少瓶？',
    options: ['76 瓶', '86 瓶', '96 瓶', '106 瓶'], answer: 1,
    hint: '先算 6 箱共有多少瓶，再減去分出的 58 瓶。',
    explanation: '6 × 24＝144，144－58＝86，所以還剩 86 瓶。',
  },
  {
    id: 'math-10', subject: 'math', difficulty: 3,
    prompt: '長方形甲板長 12 公尺、寬 8 公尺，其中一塊長 4 公尺、寬 3 公尺的區域放置器材。其餘可活動面積是多少平方公尺？',
    options: ['72 平方公尺', '84 平方公尺', '92 平方公尺', '108 平方公尺'], answer: 1,
    hint: '先算整座甲板的面積，再減去放置器材的面積。',
    explanation: '甲板面積是 12 × 8＝96，器材區面積是 4 × 3＝12；96－12＝84。',
  },

  {
    id: 'chinese-01', subject: 'chinese', difficulty: 1,
    prompt: '下面哪一個詞語搭配最恰當？',
    options: ['清澈的溪水', '響亮的棉花', '柔軟的雷聲', '鬆軟的鐵釘'], answer: 0,
    hint: '想一想「看得見水底」可以用哪個詞形容。',
    explanation: '「清澈」表示水透明、乾淨，和「溪水」搭配最恰當。',
  },
  {
    id: 'chinese-02', subject: 'chinese', difficulty: 1,
    prompt: '「一心一意」最接近下面哪一個意思？',
    options: ['同時做很多事', '專心而不分心', '心情忽好忽壞', '做事非常快速'], answer: 1,
    hint: '「一」在這裡有專一、不分散的意思。',
    explanation: '「一心一意」指心意專一，專心做好一件事。',
  },
  {
    id: 'chinese-03', subject: 'chinese', difficulty: 2,
    prompt: '哪一句的標點符號使用正確？',
    options: [
      '小華說，「我們明天去圖書館」。',
      '小華說：「我們明天去圖書館。」',
      '小華說：「我們明天去圖書館」。',
      '小華說、我們明天去圖書館。',
    ], answer: 1,
    hint: '說話內容前用冒號，內容放在引號裡，句號也要放進引號。',
    explanation: '完整引述一句話時，冒號、引號和句末標點都要放在正確位置。',
  },
  {
    id: 'chinese-04', subject: 'chinese', difficulty: 1,
    prompt: '選出最適合的關聯詞：＿＿今天下雨，＿＿運動會延期了。',
    options: ['雖然／但是', '因為／所以', '不但／而且', '如果／就'], answer: 1,
    hint: '前半句是原因，後半句是結果。',
    explanation: '「因為今天下雨，所以運動會延期了」清楚表達因果關係。',
  },
  {
    id: 'chinese-05', subject: 'chinese', difficulty: 1,
    prompt: '「救援船迅速駛向岸邊」中的「迅速」，可以換成哪個詞？',
    options: ['緩慢', '快速', '安靜', '整齊'], answer: 1,
    hint: '想一想「很快」還可以怎麼說。',
    explanation: '「迅速」和「快速」意思相近，都表示速度很快。',
  },
  {
    id: 'chinese-06', subject: 'chinese', difficulty: 1,
    prompt: '「謙虛」的相反詞是哪一個？',
    options: ['驕傲', '誠實', '勇敢', '溫柔'], answer: 0,
    hint: '謙虛的人不會覺得自己比別人都厲害。',
    explanation: '「謙虛」是不自滿；「驕傲」在這裡指自滿，兩者意思相反。',
  },
  {
    id: 'chinese-07', subject: 'chinese', difficulty: 2,
    prompt: '請選出語序正確、意思通順的句子。',
    options: [
      '我們仔細地觀察潮池裡的生物。',
      '我們觀察仔細地潮池裡的生物。',
      '仔細地我們潮池裡的生物觀察。',
      '潮池裡的生物觀察我們仔細地。',
    ], answer: 0,
    hint: '先找主角「我們」，再找怎麼做、做什麼。',
    explanation: '正確句子是「我們仔細地觀察潮池裡的生物」。',
  },
  {
    id: 'chinese-08', subject: 'chinese', difficulty: 3,
    prompt: '短文：「小澄先查潮汐表，再和大人一起到海邊觀察；離開前，他把垃圾帶走。」最適合的標題是？',
    options: ['迷路的一天', '安全又負責的觀察', '最大的海浪', '神祕的寶藏'], answer: 1,
    hint: '標題要能同時包含準備、安全與愛護環境。',
    explanation: '查資料、由大人陪同、帶走垃圾，都表現出安全且負責任的態度。',
  },
  {
    id: 'chinese-09', subject: 'chinese', difficulty: 2,
    prompt: '「雨停了，烏雲漸漸散去，陽光從雲縫灑下。」從這句話可以知道天氣正在怎麼變化？',
    options: ['由晴轉雨', '由雨轉晴', '風勢愈來愈強', '氣溫一定下降'], answer: 1,
    hint: '注意「雨停了」、「烏雲散去」和「陽光灑下」。',
    explanation: '雨已停止、烏雲散去並出現陽光，表示天氣正由雨轉晴。',
  },
  {
    id: 'chinese-10', subject: 'chinese', difficulty: 3,
    prompt: '短文：「妹妹想參加朗讀比賽，卻擔心讀錯。姊姊陪她每天練習，還把容易念錯的字記在卡片上。比賽那天，妹妹順利讀完整篇文章。」妹妹能順利完成比賽，最主要的原因是什麼？',
    options: ['她持續練習並整理容易念錯的字', '比賽文章一定很短', '裁判事先告訴她答案', '她完全沒有緊張'], answer: 0,
    hint: '找出比賽前反覆進行、能幫助朗讀的事情。',
    explanation: '每天練習並整理容易念錯的字，讓妹妹做好準備；其他選項都沒有短文依據。',
  },

  {
    id: 'english-01', subject: 'english', difficulty: 1,
    prompt: 'Choose the correct plural: One child, two ____.',
    options: ['childs', 'childes', 'children', 'child'], answer: 2,
    hint: 'This word has a special plural form.',
    explanation: 'The plural of “child” is “children.”',
  },
  {
    id: 'english-02', subject: 'english', difficulty: 1,
    prompt: 'Choose the simple present form: Amy ____ her teeth every morning.',
    options: ['brush', 'brushes', 'brushing', 'brushed'], answer: 1,
    hint: 'Amy is one person, and this happens every morning.',
    explanation: 'For a daily habit with “Amy,” use “brushes”: Amy brushes her teeth.',
  },
  {
    id: 'english-03', subject: 'english', difficulty: 1,
    prompt: 'The compass is resting on top of the desk. It is ____ the desk.',
    options: ['on', 'at', 'from', 'with'], answer: 0,
    hint: 'The compass is resting on top of the desk.',
    explanation: 'Use “on” when something is on the surface of something else.',
  },
  {
    id: 'english-04', subject: 'english', difficulty: 1,
    prompt: 'Which sentence asks about ability?',
    options: ['Do you swim every Saturday?', 'Can you swim?', 'Are you swimming?', 'Did you swim?'], answer: 1,
    hint: 'Look for the word that means 「能不能」.',
    explanation: '“Can you swim?” asks whether someone has the ability to swim.',
  },
  {
    id: 'english-05', subject: 'english', difficulty: 1,
    prompt: 'We ____ ready for the voyage.',
    options: ['am', 'is', 'are', 'be'], answer: 2,
    hint: '“We” goes with the same be verb as “you” and “they.”',
    explanation: 'Use “are” with “we”: We are ready for the voyage.',
  },
  {
    id: 'english-06', subject: 'english', difficulty: 2,
    prompt: 'Which word means 「圖書館」?',
    options: ['hospital', 'library', 'station', 'market'], answer: 1,
    hint: 'It is a place where you can read and borrow books.',
    explanation: 'A “library” is a place with books for reading or borrowing.',
  },
  {
    id: 'english-07', subject: 'english', difficulty: 2,
    prompt: 'Choose the correct sentence.',
    options: ['She have a blue bag.', 'She has a blue bag.', 'She having a blue bag.', 'She are a blue bag.'], answer: 1,
    hint: 'With “she,” the present form of “have” changes.',
    explanation: 'Use “has” with he, she, or it: She has a blue bag.',
  },
  {
    id: 'english-08', subject: 'english', difficulty: 2,
    prompt: 'Read: “Ben puts on a raincoat and takes an umbrella.” What is the weather probably like?',
    options: ['Sunny', 'Rainy', 'Snowy', 'Windy'], answer: 1,
    hint: 'Why would someone need both a raincoat and an umbrella?',
    explanation: 'A raincoat and an umbrella are useful on a rainy day.',
  },
  {
    id: 'english-09', subject: 'english', difficulty: 3,
    prompt: 'Read: “It is 7:40. The school bus comes at 7:50. Jack needs five minutes to walk to the bus stop.” Which action will get Jack to the bus stop before the bus arrives?',
    options: ['Leave home now.', 'Leave home at 7:50.', 'Wait until 8:00.', 'Go back to sleep.'], answer: 0,
    hint: 'Jack has ten minutes before the bus comes. The walk takes five minutes.',
    explanation: 'If Jack leaves at 7:40, he will arrive at 7:45, before the bus comes at 7:50.',
  },
  {
    id: 'english-10', subject: 'english', difficulty: 3,
    prompt: 'Read: “Kate goes to the park with her brother. He rides a bike, but Kate flies a kite.” Who does “He” mean?',
    options: ['Kate', 'Kate’s brother', 'The bike', 'The park'], answer: 1,
    hint: 'Look for the male person mentioned just before “He.”',
    explanation: '“He” refers to Kate’s brother. Kate is named separately in the second part.',
  },

  {
    id: 'science-01', subject: 'science', difficulty: 1,
    prompt: '海水受到陽光照射，變成水蒸氣上升，這個過程叫什麼？',
    options: ['凝結', '蒸發', '融化', '結冰'], answer: 1,
    hint: '液態的水變成看不見的水蒸氣。',
    explanation: '液態水受熱變成水蒸氣的過程叫做蒸發。',
  },
  {
    id: 'science-02', subject: 'science', difficulty: 1,
    prompt: '植物主要用哪一個部位吸收土壤中的水分？',
    options: ['花', '果實', '根', '葉'], answer: 2,
    hint: '這個部位通常在土壤裡。',
    explanation: '根能固定植物，也會吸收土壤中的水分和礦物質。',
  },
  {
    id: 'science-03', subject: 'science', difficulty: 2,
    prompt: '下面哪一種物品最容易被一般磁鐵吸引？',
    options: ['鐵製迴紋針', '塑膠尺', '木筷', '玻璃杯'], answer: 0,
    hint: '一般磁鐵會吸引鐵製品。',
    explanation: '鐵製迴紋針含有鐵，會被一般磁鐵吸引。',
  },
  {
    id: 'science-04', subject: 'science', difficulty: 2,
    prompt: '手電筒照向不透明的玩具，玩具後方會出現影子，主要原因是什麼？',
    options: ['光會轉彎', '玩具擋住光', '玩具發出黑光', '空氣變暗'], answer: 1,
    hint: '光大致沿直線前進，不透明物體無法讓光穿過。',
    explanation: '玩具擋住了光，後方接收不到光的區域就形成影子。',
  },
  {
    id: 'science-05', subject: 'science', difficulty: 2,
    prompt: '我們能看見月亮，主要是因為月亮怎麼了？',
    options: ['自己發出強光', '反射太陽光', '被星星照亮', '燃燒產生光'], answer: 1,
    hint: '月亮本身不是像太陽一樣的恆星。',
    explanation: '月亮反射太陽的光，所以我們在地球上能看見它。',
  },
  {
    id: 'science-06', subject: 'science', difficulty: 1,
    prompt: '冰塊放在室溫下一段時間變成水，這是什麼變化？',
    options: ['蒸發', '凝結', '融化', '結冰'], answer: 2,
    hint: '固態變成液態。',
    explanation: '冰是固態的水；冰變成液態水的過程叫融化。',
  },
  {
    id: 'science-07', subject: 'science', difficulty: 3,
    prompt: '食物鏈「藻類→小蝦→小魚」中，如果小蝦大量減少，小魚最可能先受到什麼影響？',
    options: ['食物變少', '游得更快', '身體變亮', '立刻變大'], answer: 0,
    hint: '箭頭表示誰提供食物給下一個生物。',
    explanation: '小魚以小蝦為食，小蝦減少時，小魚可獲得的食物也會減少。',
  },
  {
    id: 'science-08', subject: 'science', difficulty: 2,
    prompt: '撥動橡皮筋時會聽到聲音，也能看到橡皮筋快速晃動。這表示聲音和什麼有關？',
    options: ['振動', '顏色', '重量', '氣味'], answer: 0,
    hint: '注意橡皮筋發聲時正在做什麼。',
    explanation: '物體振動可以產生聲音；橡皮筋停止振動後，聲音也會停止。',
  },
  {
    id: 'science-09', subject: 'science', difficulty: 1,
    prompt: '要判斷一杯水接近 20°C 還是 40°C，最適合使用哪一種工具？',
    options: ['溫度計', '放大鏡', '直尺', '指南針'], answer: 0,
    hint: '選擇能測量冷熱程度的工具。',
    explanation: '溫度計用來測量溫度，能判斷水較接近 20°C 或 40°C。',
  },
  {
    id: 'science-10', subject: 'science', difficulty: 3,
    prompt: '小晴想比較方糖在冷水和溫水中的溶解快慢。哪一種做法最公平？',
    options: [
      '兩杯水量相同，各放一顆相同的方糖，只改變水溫',
      '溫水放兩顆方糖，冷水放一顆方糖',
      '溫水裝得多，冷水裝得少',
      '只攪拌溫水，不攪拌冷水',
    ], answer: 0,
    hint: '公平比較時，一次只改變一個條件。',
    explanation: '要比較水溫的影響，水量、方糖和其他操作都應相同，只改變水溫。',
  },

  {
    id: 'social-01', subject: 'social', difficulty: 1,
    prompt: '地圖上若有指北針，箭頭通常用來指出哪個方向？',
    options: ['東方', '南方', '西方', '北方'], answer: 3,
    hint: '「指北針」的名稱已經藏著答案。',
    explanation: '指北針的箭頭通常指出北方，幫助我們判讀其他方向。',
  },
  {
    id: 'social-02', subject: 'social', difficulty: 1,
    prompt: '過馬路時，哪一種做法最安全？',
    options: ['從車子中間穿過', '走行人穿越道並看號誌', '邊滑手機邊走', '看到沒車就闖紅燈'], answer: 1,
    hint: '遵守號誌，也要走為行人設置的地方。',
    explanation: '走行人穿越道、依號誌通行並注意來車，能降低危險。',
  },
  {
    id: 'social-03', subject: 'social', difficulty: 1,
    prompt: '社區公共圖書館最主要提供哪一種服務？',
    options: ['借閱書籍與閱讀空間', '販售所有教科書', '修理私人電腦', '保管個人玩具'], answer: 0,
    hint: '想想公共圖書館是大家共同使用的什麼場所。',
    explanation: '公共圖書館提供閱讀、借閱和查找資料等服務。',
  },
  {
    id: 'social-04', subject: 'social', difficulty: 2,
    prompt: '參觀不同族群的文化活動時，哪一種態度最合適？',
    options: ['隨意模仿取笑', '尊重規範並用心了解', '不問就拿走物品', '說自己的文化最好'], answer: 1,
    hint: '文化不同沒有高低之分，先尊重再了解。',
    explanation: '遵守活動規範、尊重並主動了解，能友善面對多元文化。',
  },
  {
    id: 'social-05', subject: 'social', difficulty: 2,
    prompt: '地震發生時，如果人在室內，第一時間較合適的做法是什麼？',
    options: ['立刻搭電梯', '趴下、掩護、穩住', '衝到窗邊看', '站在高櫃旁'], answer: 1,
    hint: '先保護頭頸，遠離容易掉落的物品。',
    explanation: '室內遇震應先「趴下、掩護、穩住」，並保護頭頸；不要搭電梯。',
  },
  {
    id: 'social-06', subject: 'social', difficulty: 2,
    prompt: '一個地方盛產某種農作物，最可能和哪些條件密切相關？',
    options: ['氣候與土壤', '門牌顏色', '居民身高', '道路名稱'], answer: 0,
    hint: '植物生長需要適合的自然環境。',
    explanation: '氣溫、雨量、日照和土壤等條件，會影響農作物的生長。',
  },
  {
    id: 'social-07', subject: 'social', difficulty: 2,
    prompt: '零用錢有限時，先購買必要的文具，再考慮玩具，這是在做什麼？',
    options: ['分辨需要與想要', '拒絕所有消費', '借錢買更多東西', '只看包裝選商品'], answer: 0,
    hint: '「需要」通常比「想要」更優先。',
    explanation: '先處理學習所需，再考慮想買的物品，是分辨需要與想要。',
  },
  {
    id: 'social-08', subject: 'social', difficulty: 3,
    prompt: '想了解一座老車站過去的樣子，哪一項資料最直接？',
    options: ['當年的車站照片', '明年的天氣預報', '現在的卡通節目', '未使用的空白紙'], answer: 0,
    hint: '找在那個年代留下來、能看見車站樣貌的資料。',
    explanation: '當年的照片是過去留下的直接資料，能幫助我們觀察老車站的樣子。',
  },
  {
    id: 'social-09', subject: 'social', difficulty: 1,
    prompt: '閱讀地圖時，「圖例」最主要的作用是什麼？',
    options: ['說明地圖上各種符號代表的事物', '把實際地點移到另一個位置', '決定使用者的出發時間', '記錄使用者當天的心情'], answer: 0,
    hint: '地圖上的線條、顏色和圖案需要有共同的解讀方式。',
    explanation: '圖例會說明地圖中各種符號、線條或顏色所代表的事物。',
  },
  {
    id: 'social-10', subject: 'social', difficulty: 3,
    prompt: '公園在學校的東方，圖書館在公園的北方。從學校看，圖書館大致位於哪個方向？',
    options: ['東北方', '西北方', '東南方', '西南方'], answer: 0,
    hint: '可以先畫出學校，再向東標出公園，最後從公園向北標出圖書館。',
    explanation: '圖書館同時位於學校的東邊和北邊，所以大致在學校的東北方。',
  },
]

const LEGACY_QUESTION_ORDER = Object.fromEntries(
  SUBJECTS.map((subject) => [
    subject.id,
    Array.from({ length: 8 }, (_, index) => `${subject.id}-${String(index + 1).padStart(2, '0')}`),
  ]),
) as Record<Subject, string[]>

export function getLegacyDailyQuestions(subject: Subject, dayKey: string): Question[] {
  const bank = getQuestionsByIds(LEGACY_QUESTION_ORDER[subject])
  return seededPick(bank, 5, `${dayKey}:${subject}:star-tide-v1`)
}

export function getDailyQuestions(subject: Subject, dayKey: string): Question[] {
  const bank = QUESTION_BANK.filter((question) => question.subject === subject)
  const select = (difficulty: Question['difficulty'], count: number) => seededPick(
    bank.filter((question) => question.difficulty === difficulty),
    count,
    `${dayKey}:${subject}:difficulty-${difficulty}:star-tide-v2`,
  )
  return [...select(1, 2), ...select(2, 2), ...select(3, 1)]
}

export function getQuestionsByIds(ids: readonly string[]): Question[] {
  const byId = new Map(QUESTION_BANK.map((question) => [question.id, question]))
  return ids.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question))
}
