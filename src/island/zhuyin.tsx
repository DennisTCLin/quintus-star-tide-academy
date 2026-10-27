// 數學島共用單字與已校對詞語；以下只補數學情境的讀音。
// 課本慣例：「一」「不」標本調。
import dictionary from "../data/interface-zhuyin-packed.json";
import { PhoneticText } from "../PhoneticText";
import { phrases as reviewedPhrases } from "../data/taiwan-zhuyin-overrides.json";

const BASE = dictionary.chars as Record<string, number>;

/** 遊戲字典沒有的字，或在數學島的句子裡預設讀音不對的字。 */
const CHARS: Record<string, string> = {
  熟:'ㄕㄡˊ',
  數: "ㄕㄨˇ", // 數學島裡大多是動詞「數一數」；名詞用法列在 PHRASES
  框: "ㄎㄨㄤ",
  滿: "ㄇㄢˇ",
  樣: "ㄧㄤˋ",
  戳: "ㄔㄨㄛ",
  啵: "ㄅㄛ",
  倒: "ㄉㄠˋ",
  蘋: "ㄆㄧㄥˊ",
  鴨: "ㄧㄚ",
  牠: "ㄊㄚ",
  呢: "˙ㄋㄜ",
  七: "ㄑㄧ",
  八: "ㄅㄚ",
  螃: "ㄆㄤˊ",
  配: "ㄆㄟˋ",
  莓: "ㄇㄟˊ",
  雞: "ㄐㄧ",
  餅: "ㄅㄧㄥˇ",
  吃: "ㄔ",
  義: "ㄧˋ",
  企: "ㄑㄧˋ",
  鵝: "ㄜˊ",
  狸: "ㄌㄧˊ",
};

/** 要看上下文才知道讀音的詞（逐句校對）。 */
const PHRASES: Record<string, string[]> = {
  ...reviewedPhrases,
  重播: ['ㄔㄨㄥˊ','ㄅㄛˋ'],
  重玩: ['ㄔㄨㄥˊ','ㄨㄢˊ'],
  以內的數: ['ㄧˇ','ㄋㄟˋ','˙ㄉㄜ','ㄕㄨˋ'],
  數字: ["ㄕㄨˋ", "ㄗˋ"],
  數量: ["ㄕㄨˋ", "ㄌㄧㄤˋ"],
  數線: ["ㄕㄨˋ", "ㄒㄧㄢˋ"],
  數的: ["ㄕㄨˋ", "˙ㄉㄜ"],
  空格: ["ㄎㄨㄥˋ", "ㄍㄜˊ"],
  空幾格: ["ㄎㄨㄥˋ", "ㄐㄧˇ", "ㄍㄜˊ"],
  餅乾: ["ㄅㄧㄥˇ", "ㄍㄢ"],
  狐狸: ["ㄏㄨˊ", "˙ㄌㄧ"],
  仔細: ["ㄗˇ", "ㄒㄧˋ"],
  朋友: ["ㄆㄥˊ", "ㄧㄡˇ"],
  認識: ["ㄖㄣˋ", "ㄕˋ"],
  質數: ['ㄓˊ','ㄕㄨˋ'],
  質因數: ['ㄓˊ','ㄧㄣ','ㄕㄨˋ'],
  部分: ['ㄅㄨˋ','ㄈㄣˋ'],
  倒數: ['ㄉㄠˋ','ㄕㄨˋ'],
};
for(const word of ['分數','小數','因數','倍數','整數','位數','除數','被除數','乘數','被乘數','奇數','偶數','數列','數值','數量','數據','數學','概數','大數','正數','負數','份數','人數','時數','秒數','天數','個數','組數','層數','公因數','公倍數'])
  PHRASES[word]??=[...word].map(c=>c==='數'?'ㄕㄨˋ':dictionary.syllables[BASE[c]]??'');
const PHRASE_KEYS = Object.keys(PHRASES).sort((a, b) => b.length - a.length);

const isHan = (c: string) => /[㐀-鿿]/.test(c);

export function zhuyin(text: string): { t: string; zy: string }[] {
  const out: { t: string; zy: string }[] = [];
  for (let i = 0; i < text.length; ) {
    const ph = PHRASE_KEYS.find((k) => text.startsWith(k, i));
    if (ph) {
      for (let n = 0; n < ph.length; n++) out.push({ t: ph[n], zy: PHRASES[ph][n] });
      i += ph.length;
      continue;
    }
    const c = text[i];
    out.push({ t: c, zy: isHan(c) ? (CHARS[c] ?? dictionary.syllables[BASE[c]] ?? "") : "" });
    i++;
  }
  return out;
}

/** 沒有注音的國字（測試用）。 */
export const missingZhuyin = (text: string) => zhuyin(text).filter((x) => isHan(x.t) && !x.zy).map((x) => x.t);

/** 國字旁邊標注音；數字、標點照原樣。 */
export function Zy({ text }: { text: string }) {
  return (
    <span className="isl-zy" aria-label={text}>
      {zhuyin(text).map((x, i) =>
        x.zy ? (
          <ruby key={i} aria-hidden="true">
            <span className="isl-han">{x.t}</span>
            <rt data-zhuyin={x.zy}>
              <span className="isl-phonetic-column">
                {x.zy.startsWith('˙')&&<span className="isl-neutral"><PhoneticText text="˙" /></span>}
                {Array.from(x.zy.replace(/[˙ˊˇˋ]/g,'')).map((letter,j)=><span className="isl-phonetic-letter" key={j}>{letter}</span>)}
              </span>
              {/[ˊˇˋ]$/.test(x.zy)&&<span className="isl-phonetic-tone"><PhoneticText text={x.zy.at(-1)!} /></span>}
            </rt>
          </ruby>
        ) : (
          <span key={i} aria-hidden="true">{x.t}</span>
        ),
      )}
    </span>
  );
}
