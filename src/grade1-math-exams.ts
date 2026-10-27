import extraRows from './data/grade1-math-extra-20261026.json';
import type { LearningQuestion } from './learning';
import {EXAM_SOURCES, type ExamSource} from './exam-sources';
const rows = [
  {
    "id": "mxg1-g1k1-1",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三3(1)",
    "kind": "條件重述／選擇題改編",
    "prompt": "3 和 5 合起來是多少？",
    "options": [
      "7",
      "8",
      "9"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "3 ＋ 5 ＝ 8。"
  },
  {
    "id": "mxg1-g1k1-2",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三3(2)",
    "kind": "條件重述／選擇題改編",
    "prompt": "1 和 3 合起來是多少？",
    "options": [
      "4",
      "5",
      "3"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "1 ＋ 3 ＝ 4。"
  },
  {
    "id": "mxg1-g1k1-3",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三3(3)",
    "kind": "條件重述／選擇題改編",
    "prompt": "0 和 7 合起來是多少？",
    "options": [
      "8",
      "6",
      "7"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "0 ＋ 7 ＝ 7。"
  },
  {
    "id": "mxg1-g1k1-4",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三3(4)",
    "kind": "條件重述／選擇題改編",
    "prompt": "7 和 1 合起來是多少？",
    "options": [
      "7",
      "8",
      "9"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "7 ＋ 1 ＝ 8。"
  },
  {
    "id": "mxg1-g1k1-5",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三3(5)",
    "kind": "條件重述／選擇題改編",
    "prompt": "4 和 5 合起來是多少？",
    "options": [
      "9",
      "10",
      "8"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "4 ＋ 5 ＝ 9。"
  },
  {
    "id": "mxg1-g1k1-6",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三3(6)",
    "kind": "條件重述／選擇題改編",
    "prompt": "2 和 4 合起來是多少？",
    "options": [
      "7",
      "5",
      "6"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "2 ＋ 4 ＝ 6。"
  },
  {
    "id": "mxg1-g1k1-7",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三4(1)",
    "kind": "條件重述／選擇題改編",
    "prompt": "已經畫了 3 個圓，還要畫幾個才有 10 個？",
    "options": [
      "6",
      "7",
      "8"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "3 ＋ 7 ＝ 10，還要畫 7 個。"
  },
  {
    "id": "mxg1-g1k1-8",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三4(2)",
    "kind": "條件重述／選擇題改編",
    "prompt": "已經畫了 3 個圓，還要畫幾個才有 6 個？",
    "options": [
      "3",
      "4",
      "2"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "3 ＋ 3 ＝ 6，還要畫 3 個。"
  },
  {
    "id": "mxg1-g1k1-9",
    "sourceId": "g1k1",
    "page": 2,
    "locator": "四・合成10",
    "kind": "條件重述／選擇題改編",
    "prompt": "2 和幾合起來是 10？",
    "options": [
      "9",
      "7",
      "8"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "2 ＋ 8 ＝ 10。"
  },
  {
    "id": "mxg1-g1k1-10",
    "sourceId": "g1k1",
    "page": 2,
    "locator": "四・合成10",
    "kind": "條件重述／選擇題改編",
    "prompt": "3 和幾合起來是 10？",
    "options": [
      "6",
      "7",
      "8"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "3 ＋ 7 ＝ 10。"
  },
  {
    "id": "mxg1-g1k1-11",
    "sourceId": "g1k1",
    "page": 2,
    "locator": "四・合成10",
    "kind": "條件重述／選擇題改編",
    "prompt": "6 和幾合起來是 10？",
    "options": [
      "4",
      "5",
      "3"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "6 ＋ 4 ＝ 10。"
  },
  {
    "id": "mxg1-g1k1-12",
    "sourceId": "g1k1",
    "page": 2,
    "locator": "六2・分食物",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 6 個小朋友，漢堡有 5 個。每人分 1 個，夠不夠？",
    "options": [
      "不夠",
      "夠"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "每人分 1 個，需要 6 個；有 5 個，所以不夠。"
  },
  {
    "id": "mxg1-g1k1-13",
    "sourceId": "g1k1",
    "page": 2,
    "locator": "六2・分食物",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 6 個小朋友，蛋糕有 6 個。每人分 1 個，夠不夠？",
    "options": [
      "夠",
      "不夠"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "每人分 1 個，需要 6 個；有 6 個，所以夠。"
  },
  {
    "id": "mxg1-g1k1-14",
    "sourceId": "g1k1",
    "page": 2,
    "locator": "六2・分食物",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 6 個小朋友，飲料有 7 個。每人分 1 個，夠不夠？",
    "options": [
      "不夠",
      "夠"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "每人分 1 個，需要 6 個；有 7 個，所以夠。"
  },
  {
    "id": "mxg1-g1k1-15",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三1・數序",
    "kind": "條件重述／選擇題改編",
    "prompt": "照順序數，1、2、□、4，□ 是多少？",
    "options": [
      "4",
      "2",
      "3"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "相鄰的數相差 1，空格填 3。"
  },
  {
    "id": "mxg1-g1k1-16",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三1・數序",
    "kind": "條件重述／選擇題改編",
    "prompt": "照順序數，5、6、□、8，□ 是多少？",
    "options": [
      "6",
      "7",
      "8"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "相鄰的數相差 1，空格填 7。"
  },
  {
    "id": "mxg1-g1k1-17",
    "sourceId": "g1k1",
    "page": 1,
    "locator": "三1・數序",
    "kind": "條件重述／選擇題改編",
    "prompt": "照順序數，8、9、□，□ 是多少？",
    "options": [
      "10",
      "11",
      "9"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "相鄰的數相差 1，空格填 10。"
  },
  {
    "id": "mxg1-g1h1-18",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一1・數序",
    "kind": "條件重述／選擇題改編",
    "prompt": "照順序數，8、7、□、5，□ 是多少？",
    "options": [
      "7",
      "5",
      "6"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "相鄰的數相差 1，空格填 6。"
  },
  {
    "id": "mxg1-g1h1-19",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一1・數序",
    "kind": "條件重述／選擇題改編",
    "prompt": "照順序數，2、3、□、5，□ 是多少？",
    "options": [
      "3",
      "4",
      "5"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "相鄰的數相差 1，空格填 4。"
  },
  {
    "id": "mxg1-g1h1-20",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一3・合成10",
    "kind": "條件重述／選擇題改編",
    "prompt": "6 和幾合起來是 10？",
    "options": [
      "4",
      "5",
      "3"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "6 ＋ 4 ＝ 10。"
  },
  {
    "id": "mxg1-g1h1-21",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一3・合成10",
    "kind": "條件重述／選擇題改編",
    "prompt": "2 和幾合起來是 10？",
    "options": [
      "9",
      "7",
      "8"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "2 ＋ 8 ＝ 10。"
  },
  {
    "id": "mxg1-g1h1-22",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一3・合成10",
    "kind": "條件重述／選擇題改編",
    "prompt": "1 和幾合起來是 10？",
    "options": [
      "8",
      "9",
      "10"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "1 ＋ 9 ＝ 10。"
  },
  {
    "id": "mxg1-g1h1-23",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一3・合成10",
    "kind": "條件重述／選擇題改編",
    "prompt": "3 和幾合起來是 10？",
    "options": [
      "7",
      "8",
      "6"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "3 ＋ 7 ＝ 10。"
  },
  {
    "id": "mxg1-g1h1-24",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一5・藏花",
    "kind": "條件重述／選擇題改編",
    "prompt": "共有 4 朵花，外面看得到 2 朵，杯子裡藏了幾朵？",
    "options": [
      "3",
      "1",
      "2"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "全部 4 朵，拿掉外面 2 朵，杯子裡有 2 朵。"
  },
  {
    "id": "mxg1-g1h1-25",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一5・藏花",
    "kind": "條件重述／選擇題改編",
    "prompt": "共有 4 朵花，外面看得到 4 朵，杯子裡藏了幾朵？",
    "options": [
      "0",
      "1"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "全部 4 朵，拿掉外面 4 朵，杯子裡有 0 朵。"
  },
  {
    "id": "mxg1-g1h1-26",
    "sourceId": "g1h1",
    "page": 2,
    "locator": "三2・湊成8",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 4 顆櫻桃，再加幾顆就有 8 顆？",
    "options": [
      "4",
      "5",
      "3"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "4 ＋ 4 ＝ 8。"
  },
  {
    "id": "mxg1-g1h1-27",
    "sourceId": "g1h1",
    "page": 2,
    "locator": "三2・湊成8",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 7 顆櫻桃，再加幾顆就有 8 顆？",
    "options": [
      "2",
      "0",
      "1"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "7 ＋ 1 ＝ 8。"
  },
  {
    "id": "mxg1-g1h1-28",
    "sourceId": "g1h1",
    "page": 2,
    "locator": "三2・湊成8",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 6 顆櫻桃，再加幾顆就有 8 顆？",
    "options": [
      "1",
      "2",
      "3"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "6 ＋ 2 ＝ 8。"
  },
  {
    "id": "mxg1-g1h1-29",
    "sourceId": "g1h1",
    "page": 2,
    "locator": "三2・湊成8",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 5 顆櫻桃，再加幾顆就有 8 顆？",
    "options": [
      "3",
      "4",
      "2"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "5 ＋ 3 ＝ 8。"
  },
  {
    "id": "mxg1-g1h1-30",
    "sourceId": "g1h1",
    "page": 2,
    "locator": "三3・分球",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 4 個小朋友、3 個球。每人拿 1 個球，還少幾個球？",
    "options": [
      "2",
      "0",
      "1"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "把兩邊一個配一個，比較後相差 1 個。"
  },
  {
    "id": "mxg1-g1h1-31",
    "sourceId": "g1h1",
    "page": 2,
    "locator": "三3・比多少",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 4 個小朋友、6 個手套。手套比小朋友多幾個？",
    "options": [
      "1",
      "2",
      "3"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "把兩邊一個配一個，比較後相差 2 個。"
  },
  {
    "id": "mxg1-g1h1-32",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一2・數玩具",
    "kind": "條件重述／選擇題改編",
    "prompt": "數一數，有幾個飛機？",
    "options": [
      "4",
      "5",
      "3"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "從第一個開始，一個接著一個數，共有 4 個。",
    "visual": "✈ ✈ ✈ ✈"
  },
  {
    "id": "mxg1-g1h1-33",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一2・數玩具",
    "kind": "條件重述／選擇題改編",
    "prompt": "數一數，有幾個娃娃？",
    "options": [
      "8",
      "6",
      "7"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "從第一個開始，一個接著一個數，共有 7 個。",
    "visual": "🧸 🧸 🧸 🧸 🧸 🧸 🧸"
  },
  {
    "id": "mxg1-g1h1-34",
    "sourceId": "g1h1",
    "page": 1,
    "locator": "一2・數玩具",
    "kind": "條件重述／選擇題改編",
    "prompt": "數一數，有幾個球？",
    "options": [
      "2",
      "3",
      "4"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "從第一個開始，一個接著一個數，共有 3 個。",
    "visual": "⚽ ⚽ ⚽"
  },
  {
    "id": "mxg1-g1h2-35",
    "sourceId": "g1h2",
    "page": 1,
    "locator": "一1(1)",
    "kind": "條件重述／選擇題改編",
    "prompt": "3 和 5 合起來是多少？",
    "options": [
      "8",
      "9",
      "7"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "3 ＋ 5 ＝ 8。"
  },
  {
    "id": "mxg1-g1h2-36",
    "sourceId": "g1h2",
    "page": 1,
    "locator": "一1(2)",
    "kind": "條件重述／選擇題改編",
    "prompt": "4 和 5 合起來是多少？",
    "options": [
      "10",
      "8",
      "9"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "4 ＋ 5 ＝ 9。"
  },
  {
    "id": "mxg1-g1h2-37",
    "sourceId": "g1h2",
    "page": 1,
    "locator": "一1(3)",
    "kind": "條件重述／選擇題改編",
    "prompt": "2 和 5 合起來是多少？",
    "options": [
      "6",
      "7",
      "8"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "2 ＋ 5 ＝ 7。"
  },
  {
    "id": "mxg1-g1h2-38",
    "sourceId": "g1h2",
    "page": 1,
    "locator": "一4",
    "kind": "條件重述／選擇題改編",
    "prompt": "5 和 3 合起來是多少？",
    "options": [
      "8",
      "9",
      "7"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "5 ＋ 3 ＝ 8。"
  },
  {
    "id": "mxg1-g1h2-39",
    "sourceId": "g1h2",
    "page": 1,
    "locator": "一2・數序",
    "kind": "條件重述／選擇題改編",
    "prompt": "照順序數，10、9、□、7，□ 是多少？",
    "options": [
      "9",
      "7",
      "8"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "相鄰的數相差 1，空格填 8。"
  },
  {
    "id": "mxg1-g1h2-40",
    "sourceId": "g1h2",
    "page": 1,
    "locator": "一2・數序",
    "kind": "條件重述／選擇題改編",
    "prompt": "照順序數，6、7、□、9，□ 是多少？",
    "options": [
      "7",
      "8",
      "9"
    ],
    "answer": 1,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "相鄰的數相差 1，空格填 8。"
  },
  {
    "id": "mxg1-g1h2-41",
    "sourceId": "g1h2",
    "page": 1,
    "locator": "一8・桌椅",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 7 張椅子、6 張桌子。椅子比桌子多幾張？",
    "options": [
      "1",
      "2",
      "0"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "把兩邊一個配一個，比較後相差 1 個。"
  },
  {
    "id": "mxg1-g1h2-42",
    "sourceId": "g1h2",
    "page": 1,
    "locator": "一9・車子位置",
    "kind": "條件重述／選擇題改編",
    "prompt": "10 輛車排成一列。從左邊數第 5 輛，是從右邊數第幾輛？",
    "options": [
      "7",
      "5",
      "6"
    ],
    "answer": 2,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "從左第 5 輛，右邊還有 5 輛。從右邊連它一起數，是第 6 輛。"
  },
  {
    "id": "mxg1-g1h2-43",
    "sourceId": "g1h2",
    "page": 2,
    "locator": "三1・分點心",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 8 個小朋友、9 個杯子。每人拿 1 個杯子，夠不夠？",
    "options": [
      "夠",
      "不夠"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "每人分 1 個，需要 8 個；有 9 個，所以夠。"
  },
  {
    "id": "mxg1-g1h2-44",
    "sourceId": "g1h2",
    "page": 2,
    "locator": "三1・分點心",
    "kind": "條件重述／選擇題改編",
    "prompt": "有 8 個小朋友、7 個布丁。每人拿 1 個布丁，夠不夠？",
    "options": [
      "不夠",
      "夠"
    ],
    "answer": 0,
    "hint": "先看清楚題目的數量，再慢慢想。",
    "explanation": "每人分 1 個，需要 8 個；有 7 個，所以不夠。"
  }
];
export const GRADE1_MATH_EXAMS:LearningQuestion[]=[...rows,...extraRows].map(row=>({
 id:row.id,grade:1,course:'math',subject:'math',level:1,
 publisher:EXAM_SOURCES[row.sourceId as keyof typeof EXAM_SOURCES].publisher,
 examSources:[{id:row.sourceId as ExamSource['id'],page:row.page,locator:row.locator,kind:row.kind}],
 prompt:row.prompt,visual:row.visual,options:row.options.map(text=>({text,...(text==='夠'?{zy:'ㄍㄡˋ'}:text==='不夠'?{zy:'ㄅㄨˊ ㄍㄡˋ'}:{})})),answer:row.answer,hint:row.hint,explanation:row.explanation,
}));
