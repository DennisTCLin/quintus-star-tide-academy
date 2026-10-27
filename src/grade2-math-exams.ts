import type {LearningQuestion} from './learning';
import type {ExamSource} from './exam-sources';
const rows = [
  {
    "id": "mxg2-45232e5d7b2892ac",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "一(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，□、239、238、□、236，空格依序應填什麼？",
    "options": [
      "240、235",
      "240、237",
      "241、237"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次減 1，空格依序填 240、237。"
  },
  {
    "id": "mxg2-6bd9152bb2b5dc5d",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "一(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，180、□、200、210、□，空格依序應填什麼？",
    "options": [
      "190、220",
      "181、211",
      "190、230"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次加 10，空格依序填 190、220。"
  },
  {
    "id": "mxg2-22eed7dd59041518",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "一(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，296、297、□、299、□，空格依序應填什麼？",
    "options": [
      "297、300",
      "298、300",
      "298、301"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次加 1，空格依序填 298、300。"
  },
  {
    "id": "mxg2-04c83cadb575957d",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "一(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，185、190、□、□、205，空格依序應填什麼？",
    "options": [
      "195、200",
      "191、200",
      "195、201"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次加 5，空格依序填 195、200。"
  },
  {
    "id": "mxg2-c07987a2ccb899cd",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "二(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "26（　）22＋4，括號中應填哪個符號？",
    "options": [
      "＞",
      "＜",
      "＝"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 26，右邊是 26，所以應填 ＝。"
  },
  {
    "id": "mxg2-415f60f503ba3fca",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "二(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "37＋38（　）71，括號中應填哪個符號？",
    "options": [
      "＜",
      "＝",
      "＞"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 75，右邊是 71，所以應填 ＞。"
  },
  {
    "id": "mxg2-6d0d259175c7a730",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "二(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "99（　）300，括號中應填哪個符號？",
    "options": [
      "＝",
      "＜",
      "＞"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 99，右邊是 300，所以應填 ＜。"
  },
  {
    "id": "mxg2-fc1d461c26914d47",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "二(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "211（　）198，括號中應填哪個符號？",
    "options": [
      "＝",
      "＞",
      "＜"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 211，右邊是 198，所以應填 ＞。"
  },
  {
    "id": "mxg2-3762c6678c568eaa",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "二(5)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "92－22（　）75，括號中應填哪個符號？",
    "options": [
      "＜",
      "＞",
      "＝"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 70，右邊是 75，所以應填 ＜。"
  },
  {
    "id": "mxg2-a87329d7898dc81a",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "二(6)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "41－3（　）38，括號中應填哪個符號？",
    "options": [
      "＞",
      "＜",
      "＝"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 38，右邊是 38，所以應填 ＝。"
  },
  {
    "id": "mxg2-632b42758107b4e9",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "三(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "23 ＋ 36 ＝（　），應填多少？",
    "options": [
      "69",
      "49",
      "59"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "23 ＋ 36 ＝ 59。"
  },
  {
    "id": "mxg2-985efcde3172428a",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "三(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "29 ＋ 72 ＝（　），應填多少？",
    "options": [
      "101",
      "111",
      "91"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "29 ＋ 72 ＝ 101。"
  },
  {
    "id": "mxg2-bfc6897221d27e4e",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "三(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "98 － 65 ＝（　），應填多少？",
    "options": [
      "23",
      "33",
      "43"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "98 － 65 ＝ 33。"
  },
  {
    "id": "mxg2-e7eb1c90dbb87b2b",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "三(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "81 － 36 ＝（　），應填多少？",
    "options": [
      "55",
      "35",
      "45"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "81 － 36 ＝ 45。"
  },
  {
    "id": "mxg2-0dd0ff732860e189",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(1)",
        "kind": "原圖杯數轉為完整文字條件"
      }
    ],
    "prompt": "甲、乙容器各裝滿水，再全部倒出，分別剛好裝滿 5 個、7 個同樣大小的小杯，沒有剩餘。哪個容器的容量比較少？",
    "options": [
      "一樣多",
      "甲容器",
      "乙容器"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "小杯相同，能倒滿的杯數越少，容量越少；5 小於 7。"
  },
  {
    "id": "mxg2-7bb273b49f4cff4a",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(2)①②③-1",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "迴紋針的兩端對齊尺上的 1 公分和 4 公分刻度，長幾公分？",
    "options": [
      "13公分",
      "4公分",
      "3公分"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：4 － 1 ＝ 3 公分。"
  },
  {
    "id": "mxg2-824c0feb926ee942",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(2)①②③-2",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "水彩的兩端對齊尺上的 7 公分和 14 公分刻度，長幾公分？",
    "options": [
      "8公分",
      "7公分",
      "17公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：14 － 7 ＝ 7 公分。"
  },
  {
    "id": "mxg2-c6999decd19f3e82",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(2)①②③-3",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "自動鉛筆的兩端對齊尺上的 0 公分和 10 公分刻度，長幾公分？",
    "options": [
      "10公分",
      "20公分",
      "0公分"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：10 － 0 ＝ 10 公分。"
  },
  {
    "id": "mxg2-a472baa80f933851",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(2)④",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "3＋7（　）10，括號中應填哪個符號？",
    "options": [
      "＜",
      "＝",
      "＞"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 10，右邊是 10，所以應填 ＝。"
  },
  {
    "id": "mxg2-3f2c8e122709d7d7",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(4)①",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "用尺從刻度 1 畫到刻度 5，長度是 5 公分。這個說法正確嗎？",
    "options": [
      "不正確",
      "正確"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "5 － 1 ＝ 4 公分。"
  },
  {
    "id": "mxg2-2a706f1f1eb52b51",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(4)②",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "相同容器中，裝的水越多，水面越高。這個說法正確嗎？",
    "options": [
      "正確",
      "不正確"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "容器相同時，水面較高表示裝的水較多。"
  },
  {
    "id": "mxg2-ea7d4435120a6aa2",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(4)③",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "13 個 1 公分合起來是 130 公分。這個說法正確嗎？",
    "options": [
      "正確",
      "不正確"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "13 個 1 公分合起來是 13 公分。"
  },
  {
    "id": "mxg2-fdbecaa5ad76e0d0",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(4)④",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "一個杯子裝滿的水量，就是這個杯子的容量。這個說法正確嗎？",
    "options": [
      "正確",
      "不正確"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "容量指容器裝滿時可容納的量。"
  },
  {
    "id": "mxg2-b70e5664aa4c4c45",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 1,
        "locator": "四(4)⑤",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "1 個百、12 個十和 5 個一合起來是 125。這個說法正確嗎？",
    "options": [
      "不正確",
      "正確"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "100 ＋ 120 ＋ 5 ＝ 225。"
  },
  {
    "id": "mxg2-887862cc3a7cbaf1",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "四(5)①",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "1 個百、5 個十和 19 個一合起來是多少？",
    "options": [
      "179",
      "159",
      "169"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "100 ＋ 50 ＋ 19 ＝ 169。"
  },
  {
    "id": "mxg2-66dd9951e787d3b3",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "四(5)②-個",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "208 的個位數字是多少？",
    "options": [
      "9",
      "8",
      "18"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "208 有 2 個百、0 個十、8 個一，個位數字是 8。"
  },
  {
    "id": "mxg2-9fc72486216d268a",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "四(5)②-十",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "208 的十位數字是多少？",
    "options": [
      "10",
      "1",
      "0"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "208 有 2 個百、0 個十、8 個一，十位數字是 0。"
  },
  {
    "id": "mxg2-b6fcdf4d7136e961",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "四(5)②-百",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "208 的百位數字是多少？",
    "options": [
      "3",
      "2",
      "12"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "208 有 2 個百、0 個十、8 個一，百位數字是 2。"
  },
  {
    "id": "mxg2-4bbcbec987ad527e",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "四(6)①",
        "kind": "原圖價格轉為完整文字條件"
      }
    ],
    "prompt": "班長帶 100 元，剪刀 28 元、鉛筆盒 51 元，各買一個，錢夠不夠？",
    "options": [
      "夠",
      "不夠"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "28 ＋ 51 ＝ 79，79 小於 100，所以夠。"
  },
  {
    "id": "mxg2-5aa6b8e30b01aa38",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "四(6)②",
        "kind": "原圖價格轉為完整文字條件"
      }
    ],
    "prompt": "布偶 47 元、故事書 82 元，各買一個，總價最接近多少元？",
    "options": [
      "110元",
      "120元",
      "130元"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "47 ＋ 82 ＝ 129，最接近 130 元。"
  },
  {
    "id": "mxg2-93de8646208ee0f7",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "四(6)③",
        "kind": "原圖價格轉為完整文字條件"
      }
    ],
    "prompt": "帶 50 元買一把 28 元的剪刀，剩下的錢最接近多少元？",
    "options": [
      "20元",
      "10元",
      "30元"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "50 － 28 ＝ 22，最接近 20 元。"
  },
  {
    "id": "mxg2-a046735f4d0cd49d",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "五(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "56 個人排隊，瑋峻排第 27 個，他後面還有幾個人？",
    "options": [
      "19人",
      "29人",
      "39人"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "56 － 27 ＝ 29 人。"
  },
  {
    "id": "mxg2-abfe28bda48a1d43",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "五(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "博物館成人票 45 元、兒童票 37 元，各買 1 張共付幾元？",
    "options": [
      "72元",
      "82元",
      "92元"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "45 ＋ 37 ＝ 82 元。"
  },
  {
    "id": "mxg2-fda6f324a367ad0c",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "五(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "弟弟給哥哥 54 張寶可夢卡後，還剩 72 張，弟弟原有幾張？",
    "options": [
      "116張",
      "126張",
      "136張"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "54 ＋ 72 ＝ 126 張。"
  },
  {
    "id": "mxg2-8673761bc143e9e3",
    "examSources": [
      {
        "id": "g2mn1",
        "page": 2,
        "locator": "五(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "彩色筆 90 元，粉蠟筆比彩色筆便宜 39 元，粉蠟筆賣幾元？",
    "options": [
      "51元",
      "61元",
      "41元"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "90 － 39 ＝ 51 元。"
  },
  {
    "id": "mxg2-55cdc2750a37b3a7",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "一(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，185、190、□、200、□、210，空格依序應填什麼？",
    "options": [
      "195、200",
      "195、205",
      "191、201"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次加 5，空格依序填 195、205。"
  },
  {
    "id": "mxg2-f949c9a6ccfd31fd",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "一(3)-合起來",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "2 個百、6 個十和 19 個一合起來是多少？",
    "options": [
      "289",
      "269",
      "279"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "200 ＋ 60 ＋ 19 ＝ 279。"
  },
  {
    "id": "mxg2-fc287a8abb712a72",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "一(3)-再多十",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "2 個百、6 個十和 19 個一，再多 1 個十，合起來是多少？",
    "options": [
      "299",
      "279",
      "289"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "200 ＋ 60 ＋ 19 ＋ 10 ＝ 289。"
  },
  {
    "id": "mxg2-d5f95c3e7bbfc961",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "一(4)-原有",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "每桶糖果 100 顆、每盒 10 顆。2 桶、5 盒又 3 顆，共有幾顆？",
    "options": [
      "253顆",
      "263顆",
      "243顆"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "200 ＋ 50 ＋ 3 ＝ 253 顆。"
  },
  {
    "id": "mxg2-e1bd38521ca3bd8d",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "一(4)-再加一盒",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "每桶糖果 100 顆、每盒 10 顆。2 桶、5 盒又 3 顆，再加 1 盒，共有幾顆？",
    "options": [
      "263顆",
      "273顆",
      "253顆"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "200 ＋ 50 ＋ 3 ＋ 10 ＝ 263 顆。"
  },
  {
    "id": "mxg2-760dd76ead5d7701",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "二(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "52 ＋ 37 ＝（　），應填多少？",
    "options": [
      "79",
      "89",
      "99"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "52 ＋ 37 ＝ 89。"
  },
  {
    "id": "mxg2-cfe01ad87b14dcec",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "二(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "58 ＋ 74 ＝（　），應填多少？",
    "options": [
      "122",
      "132",
      "142"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "58 ＋ 74 ＝ 132。"
  },
  {
    "id": "mxg2-bfd6eed9dc1c1911",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "二(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "66 － 28 ＝（　），應填多少？",
    "options": [
      "38",
      "48",
      "28"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "66 － 28 ＝ 38。"
  },
  {
    "id": "mxg2-8e367f95119a87aa",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "二(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "92 － 59 ＝（　），應填多少？",
    "options": [
      "43",
      "23",
      "33"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "92 － 59 ＝ 33。"
  },
  {
    "id": "mxg2-22971cfb77254cab",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "三(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "95 － 56 ＝（　），應填多少？",
    "options": [
      "29",
      "39",
      "49"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "95 － 56 ＝ 39。"
  },
  {
    "id": "mxg2-822a68ca75e2d22a",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "三(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "68 － 49 ＝（　），應填多少？",
    "options": [
      "29",
      "9",
      "19"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "68 － 49 ＝ 19。"
  },
  {
    "id": "mxg2-fc1308ca83c593db",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "四(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "下面哪一項不是容器？",
    "options": [
      "炒菜鍋",
      "保溫杯",
      "尼龍繩"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "尼龍繩不能用來盛裝物品；炒菜鍋與保溫杯是容器。"
  },
  {
    "id": "mxg2-c9bb21bac14236a3",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "四(2)①",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "筆記本 59 元、螢光筆 11 元，價錢相差最接近多少元？",
    "options": [
      "30元",
      "40元",
      "50元"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "59 － 11 ＝ 48，最接近 50 元。"
  },
  {
    "id": "mxg2-a7b26f987edd9264",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "四(2)②",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "筆記本 59 元、螢光筆 11 元，各買一個，總價最接近多少元？",
    "options": [
      "70元",
      "60元",
      "80元"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "59 ＋ 11 ＝ 70 元。"
  },
  {
    "id": "mxg2-ebfbed66e9149d50",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 1,
        "locator": "五(1)",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "鉛筆的兩端對齊尺上的 4 公分和 11 公分刻度，長幾公分？",
    "options": [
      "7公分",
      "17公分",
      "8公分"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：11 － 4 ＝ 7 公分。"
  },
  {
    "id": "mxg2-f4e8e3920fc64b0b",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "五(3)・圖在第1頁",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "膠水的兩端對齊尺上的 0 公分和 7 公分刻度，長幾公分？",
    "options": [
      "8公分",
      "7公分",
      "17公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：7 － 0 ＝ 7 公分。"
  },
  {
    "id": "mxg2-27f6d67dc548126e",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "七(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "107（　）170，括號中應填哪個符號？",
    "options": [
      "＜",
      "＞",
      "＝"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 107，右邊是 170，所以應填 ＜。"
  },
  {
    "id": "mxg2-becc3c0db22924da",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "七(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "299（　）290，括號中應填哪個符號？",
    "options": [
      "＜",
      "＝",
      "＞"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 299，右邊是 290，所以應填 ＞。"
  },
  {
    "id": "mxg2-3bd2ca8683d84150",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "七(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "62－6（　）58－2，括號中應填哪個符號？",
    "options": [
      "＜",
      "＝",
      "＞"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 56，右邊是 56，所以應填 ＝。"
  },
  {
    "id": "mxg2-d83c8e7e38e7bdfb",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "七(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "16＋14（　）9＋30，括號中應填哪個符號？",
    "options": [
      "＜",
      "＞",
      "＝"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 30，右邊是 39，所以應填 ＜。"
  },
  {
    "id": "mxg2-c6a2c41412634865",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "七(5)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "55＋77（　）22＋88，括號中應填哪個符號？",
    "options": [
      "＞",
      "＜",
      "＝"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 132，右邊是 110，所以應填 ＞。"
  },
  {
    "id": "mxg2-56b4ab57800ebb4a",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "八(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "故事書有 88 頁，弟弟看完 40 頁，還剩幾頁？",
    "options": [
      "38頁",
      "48頁",
      "58頁"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "88 － 40 ＝ 48 頁。"
  },
  {
    "id": "mxg2-6d708389fd58832a",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "八(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "咚咚買 85 元的壽司和 35 元的果汁，共花幾元？",
    "options": [
      "110元",
      "120元",
      "130元"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "85 ＋ 35 ＝ 120 元。"
  },
  {
    "id": "mxg2-8b4224cf211e2a47",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "八(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "農場原有 95 頭羊，再買進 44 頭，現在有幾頭羊？",
    "options": [
      "149頭",
      "129頭",
      "139頭"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "95 ＋ 44 ＝ 139 頭。"
  },
  {
    "id": "mxg2-853fab23754ff4da",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "八(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "溪溪昨天存 76 元、今天存 59 元，兩天共存幾元？",
    "options": [
      "145元",
      "125元",
      "135元"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "76 ＋ 59 ＝ 135 元。"
  },
  {
    "id": "mxg2-90ed41d23f8ccdac",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "八(5)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "鳳梨大丸子 12 歲，媽媽比她大 29 歲，媽媽幾歲？",
    "options": [
      "41歲",
      "51歲",
      "31歲"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "12 ＋ 29 ＝ 41 歲。"
  },
  {
    "id": "mxg2-888b09544555ac4c",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "八(6)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "爸爸包 71 個水餃，哥哥比爸爸少包 35 個，哥哥包幾個？",
    "options": [
      "26個",
      "36個",
      "46個"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "71 － 35 ＝ 36 個。"
  },
  {
    "id": "mxg2-66d8dc2a3bd71b25",
    "examSources": [
      {
        "id": "g2mn2",
        "page": 2,
        "locator": "八(7)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "北北原有 48 元，買青草茶後剩 23 元，青草茶賣幾元？",
    "options": [
      "25元",
      "35元",
      "15元"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "48 － 23 ＝ 25 元。"
  },
  {
    "id": "mxg2-810d9bbd5720f222",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一1-1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "100 － 3 ＝（　），應填多少？",
    "options": [
      "107",
      "87",
      "97"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "100 － 3 ＝ 97。"
  },
  {
    "id": "mxg2-8f351482342da94b",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一1-2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "101 － 4 ＝（　），應填多少？",
    "options": [
      "107",
      "87",
      "97"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "101 － 4 ＝ 97。"
  },
  {
    "id": "mxg2-8140704d2eae7b3c",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一1-3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "103 － 5 ＝（　），應填多少？",
    "options": [
      "108",
      "88",
      "98"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "103 － 5 ＝ 98。"
  },
  {
    "id": "mxg2-4bb9503ca366a18a",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一2-個",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "106 的個位數字是多少？",
    "options": [
      "7",
      "6",
      "16"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "106 有 1 個百、0 個十、6 個一，個位數字是 6。"
  },
  {
    "id": "mxg2-3b5f62c803a41408",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一2-十",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "106 的十位數字是多少？",
    "options": [
      "10",
      "1",
      "0"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "106 有 1 個百、0 個十、6 個一，十位數字是 0。"
  },
  {
    "id": "mxg2-32055393b2d9fd30",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一2-百",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "106 的百位數字是多少？",
    "options": [
      "11",
      "2",
      "1"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "106 有 1 個百、0 個十、6 個一，百位數字是 1。"
  },
  {
    "id": "mxg2-6da4dcf440e5c3d4",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "個位是 3、十位是 7、百位是 2，這個數是多少？",
    "options": [
      "273",
      "283",
      "263"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "200 ＋ 70 ＋ 3 ＝ 273。"
  },
  {
    "id": "mxg2-21c26a96e710c099",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一4-8",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "278 的 8 在哪個位？",
    "options": [
      "百位",
      "個位",
      "十位"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "278 的 8 表示 8 個一，在個位。"
  },
  {
    "id": "mxg2-9578f188a3008e26",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一4-2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "278 的 2 表示幾個百？",
    "options": [
      "3",
      "2",
      "12"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "278 ＝ 200 ＋ 70 ＋ 8，200 是 2 個百。"
  },
  {
    "id": "mxg2-0a061e286bea6538",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一5",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "1 個百、5 個十和 14 個一合起來是多少？",
    "options": [
      "174",
      "154",
      "164"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "100 ＋ 50 ＋ 14 ＝ 164。"
  },
  {
    "id": "mxg2-daeb82a0a47b0cab",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一6(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，202、201、□、□、198、□，空格依序應填什麼？",
    "options": [
      "200、199、197",
      "200、199、196",
      "203、204、205"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次減 1，空格依序填 200、199、197。"
  },
  {
    "id": "mxg2-d6c9da1142927b98",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一6(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，256、□、□、262、264、□，空格依序應填什麼？",
    "options": [
      "257、258、265",
      "258、261、266",
      "258、260、266"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次加 2，空格依序填 258、260、266。"
  },
  {
    "id": "mxg2-40ad62ac3c853f61",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一6(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，115、120、□、□、□、140，空格依序應填什麼？",
    "options": [
      "125、130、135",
      "121、122、123",
      "125、135、139"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次加 5，空格依序填 125、130、135。"
  },
  {
    "id": "mxg2-3ed33852d6978482",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "一6(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，□、206、196、□、176、□，空格依序應填什麼？",
    "options": [
      "216、186、166",
      "207、195、175",
      "216、185、165"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次減 10，空格依序填 216、186、166。"
  },
  {
    "id": "mxg2-0ceb3d799a711b97",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "二(一)(3)",
        "kind": "原圖杯數轉為完整文字條件"
      }
    ],
    "prompt": "甲、乙杯各裝滿水，再全部倒出，分別剛好裝滿 3 個、4 個同樣大小的小杯，沒有剩餘。哪個杯子的容量較少？",
    "options": [
      "乙杯",
      "一樣多",
      "甲杯"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "小杯相同，甲杯倒滿的杯數較少，所以容量較少。"
  },
  {
    "id": "mxg2-4d777dc2e5db01a6",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "二(一)(4)",
        "kind": "原圖杯數轉為完整文字條件"
      }
    ],
    "prompt": "甲、乙杯各裝滿水，再全部倒出，分別剛好裝滿 3 個、4 個同樣大小的小杯，沒有剩餘。乙比甲多倒滿幾個小杯？",
    "options": [
      "11個",
      "2個",
      "1個"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "4 － 3 ＝ 1 個小杯。"
  },
  {
    "id": "mxg2-8fd592707c52489c",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "二(三)(1)",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "橡皮擦的兩端對齊尺上的 9 公分和 12 公分刻度，長幾公分？",
    "options": [
      "4公分",
      "3公分",
      "13公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：12 － 9 ＝ 3 公分。"
  },
  {
    "id": "mxg2-d48a3de31a053f3d",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "二(三)(2)",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "玩具車的兩端對齊尺上的 1 公分和 5 公分刻度，長幾公分？",
    "options": [
      "5公分",
      "4公分",
      "14公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：5 － 1 ＝ 4 公分。"
  },
  {
    "id": "mxg2-ce7db0f136352738",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "二(三)(3)",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "刷子的兩端對齊尺上的 0 公分和 13 公分刻度，長幾公分？",
    "options": [
      "23公分",
      "3公分",
      "13公分"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：13 － 0 ＝ 13 公分。"
  },
  {
    "id": "mxg2-3a91c0badd14da65",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 1,
        "locator": "二(三)(4)",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "橡皮擦長 3 公分、玩具車長 4 公分、刷子長 13 公分，哪件最長？",
    "options": [
      "玩具車",
      "刷子",
      "橡皮擦"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "13 大於 4 和 3，所以刷子最長。"
  },
  {
    "id": "mxg2-09c1ca90d86dc292",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "三(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "109（　）201，括號中應填哪個符號？",
    "options": [
      "＞",
      "＝",
      "＜"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 109，右邊是 201，所以應填 ＜。"
  },
  {
    "id": "mxg2-10827f064ed528d1",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "三(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "274（　）247，括號中應填哪個符號？",
    "options": [
      "＝",
      "＞",
      "＜"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 274，右邊是 247，所以應填 ＞。"
  },
  {
    "id": "mxg2-c0791f5ba61a344c",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "三(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "72（　）45＋27，括號中應填哪個符號？",
    "options": [
      "＞",
      "＜",
      "＝"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 72，右邊是 72，所以應填 ＝。"
  },
  {
    "id": "mxg2-d5590a84fe0d62eb",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "三(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "35＋15（　）60，括號中應填哪個符號？",
    "options": [
      "＝",
      "＜",
      "＞"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 50，右邊是 60，所以應填 ＜。"
  },
  {
    "id": "mxg2-546f13b2b6cbb882",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "三(5)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "48－8（　）68－28，括號中應填哪個符號？",
    "options": [
      "＝",
      "＞",
      "＜"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 40，右邊是 40，所以應填 ＝。"
  },
  {
    "id": "mxg2-53c8aeb11eefd476",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "四1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "33 ＋ 42 ＝（　），應填多少？",
    "options": [
      "85",
      "65",
      "75"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "33 ＋ 42 ＝ 75。"
  },
  {
    "id": "mxg2-e47b905e247c63e4",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "四2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "37 ＋ 15 ＝（　），應填多少？",
    "options": [
      "52",
      "62",
      "42"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "37 ＋ 15 ＝ 52。"
  },
  {
    "id": "mxg2-9591c66ad226259e",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "四3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "83 ＋ 46 ＝（　），應填多少？",
    "options": [
      "129",
      "139",
      "119"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "83 ＋ 46 ＝ 129。"
  },
  {
    "id": "mxg2-5f974d2045a99d7a",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "四4",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "8 ＋ 97 ＝（　），應填多少？",
    "options": [
      "105",
      "115",
      "95"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "8 ＋ 97 ＝ 105。"
  },
  {
    "id": "mxg2-37e40d14d1b35297",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "四5",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "58 － 31 ＝（　），應填多少？",
    "options": [
      "37",
      "17",
      "27"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "58 － 31 ＝ 27。"
  },
  {
    "id": "mxg2-280b3d9d3d6e1861",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "四6",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "35 － 6 ＝（　），應填多少？",
    "options": [
      "29",
      "39",
      "19"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "35 － 6 ＝ 29。"
  },
  {
    "id": "mxg2-dd1953e74b18ee3b",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "四7",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "81 － 46 ＝（　），應填多少？",
    "options": [
      "35",
      "45",
      "25"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "81 － 46 ＝ 35。"
  },
  {
    "id": "mxg2-0b21695870463005",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "五(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "操場原有 35 人，又來 25 人，現在共有幾人？",
    "options": [
      "50人",
      "60人",
      "70人"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "35 ＋ 25 ＝ 60 人。"
  },
  {
    "id": "mxg2-f3315292d1fe558f",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "五(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "哥哥從 7 樓搭電梯到 28 樓，上升幾層樓？",
    "options": [
      "31層",
      "11層",
      "21層"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "28 － 7 ＝ 21 層。"
  },
  {
    "id": "mxg2-0e602a1269673c63",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "五(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "一球冰淇淋 98 元，加價 18 元可多買一球，買兩球共付幾元？",
    "options": [
      "106元",
      "116元",
      "126元"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "98 ＋ 18 ＝ 116 元。"
  },
  {
    "id": "mxg2-3bb516237c50da25",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "五(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "老師慶生會用了 49 顆糖果，還剩 27 顆，原有幾顆？",
    "options": [
      "76顆",
      "86顆",
      "66顆"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "49 ＋ 27 ＝ 76 顆。"
  },
  {
    "id": "mxg2-8add7dd802fada2d",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "五(5)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "彩帶原長 86 公分，用掉一些後剩 14 公分，用掉幾公分？",
    "options": [
      "62公分",
      "72公分",
      "82公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "86 － 14 ＝ 72 公分。"
  },
  {
    "id": "mxg2-1dd7044190ffeb10",
    "examSources": [
      {
        "id": "g2mn3",
        "page": 2,
        "locator": "五(6)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "哥哥跳繩 72 下，比弟弟少跳 27 下，弟弟跳幾下？",
    "options": [
      "109下",
      "89下",
      "99下"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "72 ＋ 27 ＝ 99 下。"
  },
  {
    "id": "mxg2-0a6fd9d376ffe6ae",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "一1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "29＋32 的答案最接近哪個數？",
    "options": [
      "50",
      "70",
      "60"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "29 ＋ 32 ＝ 61，最接近 60。"
  },
  {
    "id": "mxg2-84999675c8461359",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "一2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "一般鉛筆盒的長度，大約是幾公分？",
    "options": [
      "22公分",
      "8公分",
      "100公分"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "一般鉛筆盒要放得下鉛筆，約 22 公分較合理。"
  },
  {
    "id": "mxg2-698d51a774c21610",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "一3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "用尺畫一條 9 公分的線，下面哪個畫法正確？",
    "options": [
      "從刻度 1 畫到刻度 9",
      "從刻度 0 畫到刻度 9"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "9 － 0 ＝ 9；9 － 1 ＝ 8。"
  },
  {
    "id": "mxg2-0d85be5a41ca887f",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "一4",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "原有 69 元，買東西後剩下 41 元，花了幾元？",
    "options": [
      "18元",
      "28元",
      "38元"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "69 － 41 ＝ 28 元。"
  },
  {
    "id": "mxg2-fa0f8cbe391fcc60",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，298、288、□、268、□、□，空格依序應填什麼？",
    "options": [
      "278、259、249",
      "287、267、266",
      "278、258、248"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次減 10，空格依序填 278、258、248。"
  },
  {
    "id": "mxg2-6b88a6a011ffa325",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "1 個百和 15 個一合起來是多少？",
    "options": [
      "115",
      "125",
      "105"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "100 ＋ 15 ＝ 115。"
  },
  {
    "id": "mxg2-9ce3db02e74b0ef0",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "1 個百和 3 個十合起來是多少？",
    "options": [
      "120",
      "130",
      "140"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "100 ＋ 30 ＝ 130。"
  },
  {
    "id": "mxg2-5753673c62da4879",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二4",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "1 個百和 7 個十合起來是幾個十？",
    "options": [
      "7",
      "17",
      "27"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "1 個百是 10 個十，10 ＋ 7 ＝ 17 個十。"
  },
  {
    "id": "mxg2-050b2762594554d5",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二5-位",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "286 的 2 是哪個位的數字？",
    "options": [
      "十位",
      "個位",
      "百位"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "286 的 2 在百位。"
  },
  {
    "id": "mxg2-5d924bac3b7b74b1",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二5-值",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "286 的 2 表示多少？",
    "options": [
      "190",
      "200",
      "210"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "2 在百位，表示 2 個百，也就是 200。"
  },
  {
    "id": "mxg2-655d764f4035142a",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二6",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "106、160、116 由大排到小，哪個順序正確？",
    "options": [
      "116＞160＞106",
      "160＞116＞106",
      "160＞106＞116"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "百位相同，先比十位，再比個位。"
  },
  {
    "id": "mxg2-7d5ae6aa6156829d",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二7(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "239（　）193，括號中應填哪個符號？",
    "options": [
      "＝",
      "＞",
      "＜"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 239，右邊是 193，所以應填 ＞。"
  },
  {
    "id": "mxg2-866f14d1e9c5b2ff",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二7(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "122（　）119，括號中應填哪個符號？",
    "options": [
      "＝",
      "＞",
      "＜"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 122，右邊是 119，所以應填 ＞。"
  },
  {
    "id": "mxg2-c00e43905bb0b92f",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二7(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "一百九十八（　）189，括號中應填哪個符號？",
    "options": [
      "＝",
      "＞",
      "＜"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 198，右邊是 189，所以應填 ＞。"
  },
  {
    "id": "mxg2-6bbf3ca6f6fbb752",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二7(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "5 個 5 元（　）5 個 10 元，括號中應填哪個符號？",
    "options": [
      "＞",
      "＝",
      "＜"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 25，右邊是 50，所以應填 ＜。"
  },
  {
    "id": "mxg2-7aea3b490afa448e",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二7(5)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "33－9（　）33－19，括號中應填哪個符號？",
    "options": [
      "＝",
      "＞",
      "＜"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 24，右邊是 14，所以應填 ＞。"
  },
  {
    "id": "mxg2-4c445164eb4a4334",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二8-1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "29＋38＝67，所以 67－29＝多少？",
    "options": [
      "38",
      "48",
      "28"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "加法和減法互相對應：67 － 29 ＝ 38。"
  },
  {
    "id": "mxg2-e35a34a1af288de8",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二8-2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "29＋38＝67，67－□＝29，□ 是多少？",
    "options": [
      "28",
      "38",
      "48"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "67 － 38 ＝ 29。"
  },
  {
    "id": "mxg2-c8d66194ed237da8",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二8-3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "29＋38＝67，38＋□＝67，□ 是多少？",
    "options": [
      "29",
      "39",
      "19"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "38 ＋ 29 ＝ 67。"
  },
  {
    "id": "mxg2-30d9c7ecf7e0a130",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 1,
        "locator": "二9(3)",
        "kind": "原圖個數轉為完整文字條件"
      }
    ],
    "prompt": "量同一把刷子，用了 5 個橡皮擦或 2 把剪刀。哪一種量的個數比較少？",
    "options": [
      "橡皮擦",
      "剪刀"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "2 小於 5，所以用剪刀量的個數較少。"
  },
  {
    "id": "mxg2-e9f8fccab828fc33",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "三1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "27 ＋ 9 ＝（　），應填多少？",
    "options": [
      "46",
      "26",
      "36"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "27 ＋ 9 ＝ 36。"
  },
  {
    "id": "mxg2-ea61b7431c9baec1",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "三2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "7 ＋ 38 ＝（　），應填多少？",
    "options": [
      "55",
      "35",
      "45"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "7 ＋ 38 ＝ 45。"
  },
  {
    "id": "mxg2-67db5bd78353a7ee",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "三3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "95 ＋ 68 ＝（　），應填多少？",
    "options": [
      "173",
      "153",
      "163"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "95 ＋ 68 ＝ 163。"
  },
  {
    "id": "mxg2-d04a83af19317157",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "三4",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "55 ＋ 43 ＝（　），應填多少？",
    "options": [
      "98",
      "108",
      "88"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "55 ＋ 43 ＝ 98。"
  },
  {
    "id": "mxg2-e2190a5c7191650a",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "三5",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "76 － 29 ＝（　），應填多少？",
    "options": [
      "37",
      "47",
      "57"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "76 － 29 ＝ 47。"
  },
  {
    "id": "mxg2-2a94d3045e5b2ef1",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "三6",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "56 － 18 ＝（　），應填多少？",
    "options": [
      "48",
      "28",
      "38"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "56 － 18 ＝ 38。"
  },
  {
    "id": "mxg2-e2bf272a0b7c2f60",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "三7",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "85 － 43 ＝（　），應填多少？",
    "options": [
      "42",
      "52",
      "32"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "85 － 43 ＝ 42。"
  },
  {
    "id": "mxg2-f3463bd47369919b",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "三8",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "96 － 4 ＝（　），應填多少？",
    "options": [
      "102",
      "82",
      "92"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "96 － 4 ＝ 92。"
  },
  {
    "id": "mxg2-3f75c60d72796492",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "五1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "小晴送給同學 40 顆糖，還剩 6 顆，求原來的糖果數應用哪個算式？",
    "options": [
      "40－6＝34",
      "40＋6＝46"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "把送出與剩下合起來，或求較多的數，用加法。求剩下或較少的數，用減法。"
  },
  {
    "id": "mxg2-077761bd96706078",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "五2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "小瑋跳繩 40 下，小虎比他少跳 6 下，求小虎跳的次數應用哪個算式？",
    "options": [
      "40＋6＝46",
      "40－6＝34"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "把送出與剩下合起來，或求較多的數，用加法。求剩下或較少的數，用減法。"
  },
  {
    "id": "mxg2-ac45c4f7038743f3",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "五3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "班上有 40 人，6 人去操場，求留在教室的人數應用哪個算式？",
    "options": [
      "40＋6＝46",
      "40－6＝34"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "把送出與剩下合起來，或求較多的數，用加法。求剩下或較少的數，用減法。"
  },
  {
    "id": "mxg2-bfdbd4b9ef5f603f",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "五4",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "媽媽 40 歲，比爸爸少 6 歲，求爸爸的年齡應用哪個算式？",
    "options": [
      "40－6＝34",
      "40＋6＝46"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "把送出與剩下合起來，或求較多的數，用加法。求剩下或較少的數，用減法。"
  },
  {
    "id": "mxg2-7d5361c58b047644",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "六1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "小澤從 12 樓搭電梯到 24 樓，上升幾層樓？",
    "options": [
      "22層",
      "2層",
      "12層"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "24 － 12 ＝ 12 層。"
  },
  {
    "id": "mxg2-d9e90d119a06188a",
    "examSources": [
      {
        "id": "g2mn4",
        "page": 2,
        "locator": "六2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "冰箱原有 36 個果凍，媽媽又買 55 個，現在共有幾個？",
    "options": [
      "91個",
      "101個",
      "81個"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "36 ＋ 55 ＝ 91 個。"
  },
  {
    "id": "mxg2-0aa6d1d77ee9a8d1",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "一1(1)",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "鉛筆的兩端對齊尺上的 0 公分和 12 公分刻度，長幾公分？",
    "options": [
      "2公分",
      "12公分",
      "22公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：12 － 0 ＝ 12 公分。"
  },
  {
    "id": "mxg2-81e357220e7ec49b",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "一1(2)",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "鑰匙的兩端對齊尺上的 0 公分和 5 公分刻度，長幾公分？",
    "options": [
      "6公分",
      "5公分",
      "15公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：5 － 0 ＝ 5 公分。"
  },
  {
    "id": "mxg2-20ebef111d887917",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "一1(3)",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "橡皮擦的兩端對齊尺上的 10 公分和 13 公分刻度，長幾公分？",
    "options": [
      "3公分",
      "13公分",
      "4公分"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：13 － 10 ＝ 3 公分。"
  },
  {
    "id": "mxg2-e9ed3f025704b8ff",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "一2",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "釘書機的兩端對齊尺上的 0 公分和 9 公分刻度，長幾公分？",
    "options": [
      "10公分",
      "9公分",
      "19公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：9 － 0 ＝ 9 公分。"
  },
  {
    "id": "mxg2-aece9304ccf013f1",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "一3",
        "kind": "原圖刻度轉為完整文字條件"
      }
    ],
    "prompt": "花瓣的兩端對齊尺上的 0 公分和 3 公分刻度，長幾公分？",
    "options": [
      "4公分",
      "3公分",
      "13公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "終點刻度減起點刻度：3 － 0 ＝ 3 公分。"
  },
  {
    "id": "mxg2-fe48a0e2a3ecd065",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "一1(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "鉛筆長 12 公分，鑰匙長 5 公分，相差幾公分？",
    "options": [
      "8公分",
      "7公分",
      "17公分"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "12 － 5 ＝ 7 公分。"
  },
  {
    "id": "mxg2-1c1469989c9e64a5",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "一4",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "把 93 分成兩部分，其中一部分是 64，另一部分是多少？",
    "options": [
      "29",
      "39",
      "19"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "93 － 64 ＝ 29 。"
  },
  {
    "id": "mxg2-226c7731b893ac57",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "二1(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "300 應該怎麼讀？",
    "options": [
      "三十",
      "三百零一",
      "三百"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "300 讀作「三百」。"
  },
  {
    "id": "mxg2-c473a86ac14c208d",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "二1(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "145 應該怎麼讀？",
    "options": [
      "一百零四",
      "一百四十五",
      "一百五十四"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "145 讀作「一百四十五」。"
  },
  {
    "id": "mxg2-b6a8a0c0fc09f17f",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "二1(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "106 應該怎麼讀？",
    "options": [
      "一百零九",
      "一百零六",
      "一百六十"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "106 讀作「一百零六」。"
  },
  {
    "id": "mxg2-303d1c224b892773",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "二1(4)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "276 應該怎麼讀？",
    "options": [
      "二百六十七",
      "七百二十六",
      "二百七十六"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "276 讀作「二百七十六」。"
  },
  {
    "id": "mxg2-2e8721ad4b878c93",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三1(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，319、□、299、289、□，空格依序應填什麼？",
    "options": [
      "310、280",
      "318、288",
      "309、279"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次減 10，空格依序填 309、279。"
  },
  {
    "id": "mxg2-3539b5022daeda29",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三1(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "依照規律，212、211、□、209、□，空格依序應填什麼？",
    "options": [
      "213、214",
      "210、208",
      "210、207"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "每次減 1，空格依序填 210、208。"
  },
  {
    "id": "mxg2-9110966c23885334",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "19 個十和 5 個一合起來是多少？",
    "options": [
      "185",
      "195",
      "205"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "190 ＋ 5 ＝ 195。"
  },
  {
    "id": "mxg2-c28faf1e8d781138",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三3-50",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "100 元可換成幾個 50 元？",
    "options": [
      "12個",
      "3個",
      "2個"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "50 ＋ 50 ＝ 100，可換 2 個。"
  },
  {
    "id": "mxg2-70284637dabad63a",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三3-10",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "100 元可換成幾個 10 元？",
    "options": [
      "0個",
      "10個",
      "20個"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "10 個 10 元合起來是 100 元。"
  },
  {
    "id": "mxg2-f67a78786800c73c",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三4(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "18＋51＝69，□－18＝51，□ 是多少？",
    "options": [
      "59",
      "69",
      "79"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "69 － 18 ＝ 51。"
  },
  {
    "id": "mxg2-a1c102861a295e61",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三4(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "18＋51＝69，所以 69－51＝多少？",
    "options": [
      "18",
      "28",
      "8"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "69 － 51 ＝ 18。"
  },
  {
    "id": "mxg2-bc115f09f8ed6b75",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三4(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "18＋51＝69，69－□＝18，□ 是多少？",
    "options": [
      "61",
      "41",
      "51"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "69 － 51 ＝ 18。"
  },
  {
    "id": "mxg2-9946395d8263ae7e",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三5(1)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "245（　）254＋15，括號中應填哪個符號？",
    "options": [
      "＞",
      "＝",
      "＜"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 245，右邊是 269，所以應填 ＜。"
  },
  {
    "id": "mxg2-64e1c0c62af46317",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三5(2)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "200（　）189＋11，括號中應填哪個符號？",
    "options": [
      "＞",
      "＜",
      "＝"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 200，右邊是 200，所以應填 ＝。"
  },
  {
    "id": "mxg2-30ccf7575afc095c",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "三5(3)",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "201（　）198－18，括號中應填哪個符號？",
    "options": [
      "＞",
      "＜",
      "＝"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "左邊是 201，右邊是 180，所以應填 ＞。"
  },
  {
    "id": "mxg2-3a9e9199e857676d",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "四1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "46 ＋ 9 ＝（　），應填多少？",
    "options": [
      "55",
      "65",
      "45"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "46 ＋ 9 ＝ 55。"
  },
  {
    "id": "mxg2-eb7d08627f9471d3",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "四2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "23 ＋ 56 ＝（　），應填多少？",
    "options": [
      "79",
      "89",
      "69"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "23 ＋ 56 ＝ 79。"
  },
  {
    "id": "mxg2-c307244db08bf9f1",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "四3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "78 － 29 ＝（　），應填多少？",
    "options": [
      "59",
      "39",
      "49"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "78 － 29 ＝ 49。"
  },
  {
    "id": "mxg2-747925d39ea68b4e",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "四4",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "45 － 19 ＝（　），應填多少？",
    "options": [
      "26",
      "36",
      "16"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "45 － 19 ＝ 26。"
  },
  {
    "id": "mxg2-0a955cdfc63f77f3",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "五1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "51 － 15 ＝（　），應填多少？",
    "options": [
      "36",
      "46",
      "26"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "51 － 15 ＝ 36。"
  },
  {
    "id": "mxg2-e4e49c0942009a41",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 1,
        "locator": "五2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "76 ＋ 67 ＝（　），應填多少？",
    "options": [
      "143",
      "153",
      "133"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "76 ＋ 67 ＝ 143。"
  },
  {
    "id": "mxg2-bc8159394efc8088",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "六1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "魯夫有 100 元，買 38 元的蠟筆和 49 元的鉛筆盒，錢夠不夠？",
    "options": [
      "不夠",
      "夠"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "38 ＋ 49 ＝ 87，小於 100，所以夠。"
  },
  {
    "id": "mxg2-2fe5554c217ef6ad",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "六2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "101＋28 的答案最接近哪個數？",
    "options": [
      "130",
      "120",
      "140"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "101 ＋ 28 ＝ 129，最接近 130。"
  },
  {
    "id": "mxg2-af4e063cdbf7f33f",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "六3",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "99－28 的答案最接近哪個數？",
    "options": [
      "80",
      "90",
      "70"
    ],
    "answer": 2,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "99 － 28 ＝ 71，最接近 70。"
  },
  {
    "id": "mxg2-8abc37e05c7629aa",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "六4",
        "kind": "補足等長測量條件後改編"
      }
    ],
    "prompt": "量同一根吸管，愛心貼紙要排 11 個，蝴蝶貼紙要排 12 個，且都無空隙、不重疊。哪種貼紙比較長？",
    "options": [
      "愛心貼紙",
      "蝴蝶貼紙"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "量同樣長度，較長的貼紙需要的個數較少；11 小於 12。"
  },
  {
    "id": "mxg2-d410aa4a1c19fe57",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "六5",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "小愛高 81 公分，小新高 99 公分，身高相差最接近幾公分？",
    "options": [
      "20公分",
      "10公分",
      "30公分"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "99 － 81 ＝ 18，最接近 20 公分。"
  },
  {
    "id": "mxg2-4808c3bb33ab6860",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "七1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "小新有 58 元，風間比他多 74 元，風間有幾元？",
    "options": [
      "122元",
      "132元",
      "142元"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "58 ＋ 74 ＝ 132 元。"
  },
  {
    "id": "mxg2-15716763ff4a7395",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "七2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "冰箱原有 42 個雞蛋，用掉 18 個，還剩幾個？",
    "options": [
      "14個",
      "24個",
      "34個"
    ],
    "answer": 1,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "42 － 18 ＝ 24 個。"
  },
  {
    "id": "mxg2-258cd25ccfdef523",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "八1",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "玩具箱原有 36 個玩具，拿走 29 個，還剩幾個？",
    "options": [
      "7個",
      "17個",
      "8個"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "36 － 29 ＝ 7 個。"
  },
  {
    "id": "mxg2-42b1f94f260eafaf",
    "examSources": [
      {
        "id": "g2mn5",
        "page": 2,
        "locator": "八2",
        "kind": "填答改編為選擇題"
      }
    ],
    "prompt": "小正有 46 張遊戲王卡，比小信少 38 張，小信有幾張？",
    "options": [
      "84張",
      "94張",
      "74張"
    ],
    "answer": 0,
    "hint": "先看清楚數量和條件，再選出答案。",
    "explanation": "46 ＋ 38 ＝ 84 張。"
  }
];
export const GRADE2_MATH_EXAMS:LearningQuestion[]=rows.map(row=>({...row,grade:2,course:'math',subject:'math',publisher:'南一',level:1,examSources:row.examSources as ExamSource[],options:row.options.map(text=>({text}))}));
