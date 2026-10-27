import reviewedReadings from "../data/taiwan-zhuyin-overrides.json";
import generatedDictionary from "../data/interface-zhuyin.json";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AutoRuby, ReadingContext, annotateTree, textOf, syllables } from "../readability";
it("removes grade-two interface and explicit auxiliary ruby while retaining grade-one helpers", () => {
  const text = "建材庫存";
  const wrapped = (grade: number) => renderToStaticMarkup(createElement(ReadingContext.Provider, {value:{grade,voice:true}}, createElement(AutoRuby,{text})));
  expect(wrapped(2)).toContain(text);
  expect(wrapped(2)).not.toContain("<ruby");
  expect(wrapped(1)).toContain("<ruby");
  expect(renderToStaticMarkup(annotateTree(createElement("button",null,text),2))).toBe(`<button>${text}</button>`);
});
describe("child-facing zhuyin", () => {
  it("annotates consequence-bearing exchange, failure and battle instructions", () => {
    for (const s of [
      "你會送出右邊的夥伴，收到左邊的夥伴。",
      "連續錯三次，這次挑戰結束。",
      "普通攻擊累積能量",
      "存一顆星，一定加一顆，兩顆換一張券。",
      "試手氣，一半機會拿券，也可能沒有。",
      "這次沒抽到券，存好的星星和學習紀錄都還在。",
      "防守減傷並蓄能",
    ])
      for (const x of syllables(s))
        if (/[\u3400-\u9fff]/.test(x.text)) expect(x.zy).toMatch(/[ㄅ-ㄩ]/);
  });
  it("preserves contextual polyphones and curated island words", () => {
    expect(syllables("家長").map((x) => x.zy)).toEqual(["ㄐㄧㄚ", "ㄓㄤˇ"]);
    expect(syllables("重新").map((x) => x.zy)).toEqual(["ㄔㄨㄥˊ", "ㄒㄧㄣ"]);
    expect(syllables("紅蘿蔔").map((x) => x.zy)).toEqual([
      "ㄏㄨㄥˊ",
      "ㄌㄨㄛˊ",
      "˙ㄅㄛ",
    ]);
  });
});

it("uses correct readings inside complete instructions", () => {
  for (const [text, char, reading] of [
    ["四聲混合挑戰", "挑", "ㄊㄧㄠˇ"],
    ["普通攻擊累積能量", "累", "ㄌㄟˇ"],
    ["仔細看", "仔", "ㄗˇ"],
    ["再處理修復", "處", "ㄔㄨˇ"],
    ["及調整閱讀設定", "調", "ㄊㄧㄠˊ"],
  ])
    expect(syllables(text).find((x) => x.text === char)?.zy).toBe(reading);
});
it("retains plain narration through annotations", () => {
  expect(textOf(createElement(AutoRuby, { text: "交換夥伴" }))).toBe(
    "交換夥伴",
  );
});


it("uses Taiwanese educational readings in full UI sentences and unseen text", () => {
  const readings = (s: string) => syllables(s).map(x => x.zy);
  expect(readings("知識")).toEqual(["ㄓ", "ㄕˋ"]);
  expect(readings("知識護盾")).toEqual(["ㄓ", "ㄕˋ", "ㄏㄨˋ", "ㄉㄨㄣˋ"]);
  expect(readings("認識夥伴")).toEqual(["ㄖㄣˋ", "ㄕˋ", "ㄏㄨㄛˇ", "ㄅㄢˋ"]);
  expect(readings("未知的知識星舟")[4]).toBe("ㄕˋ");
  expect(readings("識")).toEqual(["ㄕˋ"]);
  expect(readings("暫停並回到港口").slice(0,2)).toEqual(["ㄓㄢˋ", "ㄊㄧㄥˊ"]);
  expect(readings("比較測量員").slice(2,4)).toEqual(["ㄘㄜˋ", "ㄌㄧㄤˊ"]);
  expect(readings("音樂")).toEqual(["ㄧㄣ", "ㄩㄝˋ"]);
  expect(readings("快樂")).toEqual(["ㄎㄨㄞˋ", "ㄌㄜˋ"]);
  expect(readings("能量")).toEqual(["ㄋㄥˊ", "ㄌㄧㄤˋ"]);
  expect(readings("長方形長")).toEqual(["ㄔㄤˊ", "ㄈㄤ", "ㄒㄧㄥˊ", "ㄔㄤˊ"]);
  expect(readings("休息")).toEqual(["ㄒㄧㄡ", "ㄒㄧˊ"]);
  expect(readings("攻擊")).toEqual(["ㄍㄨㄥ", "ㄐㄧˊ"]);
});

it("does not mistake cross-word substrings for dictionary words", () => {
  const readings = (s: string) => syllables(s).map(x => x.zy);
  expect(readings("正在行動")).toEqual(["ㄓㄥˋ", "ㄗㄞˋ", "ㄒㄧㄥˊ", "ㄉㄨㄥˋ"]);
  expect(readings("每次航程結束都會收起一根新羽")[6]).toBe("ㄉㄡ");
  expect(readings("交換到從未有過的卡種也會計分")[11]).toBe("ㄏㄨㄟˋ");
  expect(readings("用手指數一數")[3]).toBe("ㄕㄨˇ");
});

it("reads inventory difference in context without changing shortage readings", () => {
  const readings = (text: string, fragment: string) => {
    const start = text.indexOf(fragment);
    return syllables(text).slice(start, start + fragment.length).map(x => x.zy);
  };
  // MOE concise dictionary, entry 31530: 差額 is chā é.
  for (const text of [
    "差額",
    "道合資格題目可補齊目前庫存差額",
    "只靠新增學習建材，約 10 道合資格題目可補齊目前庫存差額；待入庫材料、生產和委託也能補充。",
  ]) expect(readings(text, "差額"), text).toEqual(["ㄔㄚ", "ㄜˊ"]);
  for (const text of ["材料還差一點", "目前還差"])
    expect(readings(text, "差"), text).toEqual(["ㄔㄚˋ"]);
  for (const text of ["差異", "差很多"])
    expect(readings(text, "差"), text).toEqual(["ㄔㄚ"]);
});

it("keeps reviewed readings inside generated sentence entries after rebuilding", () => {
  for (const [word, expected] of Object.entries(reviewedReadings.phrases)) {
    expect(syllables(word).map(x => x.zy), word).toEqual(expected);
    for (const [sentence, readings] of Object.entries(generatedDictionary.phrases)) {
      let start = sentence.indexOf(word);
      while (start !== -1) {
        expect(readings.slice(start, start + word.length), sentence).toEqual(expected);
        start = sentence.indexOf(word, start + 1);
      }
    }
  }
});

it("does not narrate ruby pronunciation hints a second time", () => {
  const node = createElement('ruby', null, '知', createElement('rt', null, 'ㄓ'), createElement('rp', null, '('));
  expect(textOf(node).trim()).toBe('知');
});

it("distinguishes length, growth, repeat and neutral-tone particles in complete text", () => {
  for (const [text, char, expected] of [
    ['計算長方形的周長', '長', 'ㄔㄤˊ'], ['重新選擇角色', '重', 'ㄔㄨㄥˊ'],
    ['跟著夥伴一起前進', '著', '˙ㄓㄜ'], ['背著金色尖塔城堡', '背', 'ㄅㄟ'],
    ['重設閱讀設定', '重', 'ㄔㄨㄥˊ'], ['選為出戰夥伴', '為', 'ㄨㄟˊ'],
    ['垃圾分類', '垃', 'ㄌㄜˋ'], ['鑽石', '鑽', 'ㄗㄨㄢˋ'],
    ['危險', '危', 'ㄨㄟˊ'], ['檔案', '檔', 'ㄉㄤˇ'],
  ]) expect(syllables(text).find(x => x.text === char)?.zy, text).toBe(expected);
});

it("covers polyphones discovered by independent context review", () => {
  for (const [text, fragment, expected] of [
    ['只返還一半原始建造材料', '還', 'ㄏㄨㄢˊ'],
    ['長方形甲板長', '板長', 'ㄅㄢˇ ㄔㄤˊ'],
    ['其中一塊長', '塊長', 'ㄎㄨㄞˋ ㄔㄤˊ'],
    ['在玻璃屋裡種下星海的奇花異草', '種下', 'ㄓㄨㄥˋ ㄒㄧㄚˋ'],
    ['帶回另一種解法', '解法', 'ㄐㄧㄝˇ ㄈㄚˇ'],
    ['說得太絕對或不合語意的選項', '說得', 'ㄕㄨㄛ ˙ㄉㄜ'],
    ['沒中不補存星星', '沒中', 'ㄇㄟˊ ㄓㄨㄥˋ'],
    ['只要把分子相加', '分子', 'ㄈㄣ ㄗˇ'],
    ['實際數量以雲端結算為準', '為準', 'ㄨㄟˊ ㄓㄨㄣˇ'],
    ['方向校準員', '校準', 'ㄐㄧㄠˋ ㄓㄨㄣˇ'],
    ['分數由伺服器依答題結果計算', '伺服器', 'ㄙˋ ㄈㄨˊ ㄑㄧˋ'],
  ]) {
    const start = text.indexOf(fragment);
    expect(syllables(text).slice(start, start + fragment.length).map(x => x.zy).join(' '), text).toBe(expected);
  }
});

it("keeps inquiry instructions in Taiwanese readings instead of isolated-character guesses", () => {
  for (const [text, fragment, expected] of [
    ["三次量到十五公分", "量到", "ㄌㄧㄤˊ ㄉㄠˋ"],
    ["上午九點的影子長八十公分", "影子長", "ㄧㄥˇ ˙ㄗ ㄔㄤˊ"],
    ["現在地面是乾的", "乾的", "ㄍㄢ ˙ㄉㄜ"],
    ["同一支沒削過的鉛筆", "削過", "ㄒㄧㄠ ㄍㄨㄛˋ"],
    ["猜想試著解釋為什麼", "試著", "ㄕˋ ˙ㄓㄜ"],
    ["停止時甲仍承受著五顆", "承受著", "ㄔㄥˊ ㄕㄡˋ ˙ㄓㄜ"],
    ["薄紙在室內飛", "薄紙", "ㄅㄛˊ ㄓˇ"],
    ["會讓人誤以為每次表現完全相同", "以為", "ㄧˇ ㄨㄟˊ"],
    ["放手方式應儘量相同", "儘量", "ㄐㄧㄣˇ ㄌㄧㄤˋ"],
  ]) {
    const start = text.indexOf(fragment);
    expect(syllables(text).slice(start, start + fragment.length).map(x => x.zy).join(" "), text).toBe(expected);
  }
});
