import type { Subject } from './core'

export type LearningStrategy = {
  id: string
  label: string
  instruction: string
}

export const STRATEGIES_BY_SUBJECT: Record<Subject, readonly LearningStrategy[]> = {
  math: [
    { id: 'known', label: '找已知', instruction: '先找題目給了哪些數字和單位，再用一句話說出它要你求什麼。' },
    { id: 'estimate', label: '先估範圍', instruction: '先估答案大約多大，再排除明顯太大或太小的選項。' },
    { id: 'verify', label: '反向驗算', instruction: '算完後用相反運算，或把選項代回題目檢查。' },
  ],
  chinese: [
    { id: 'keywords', label: '抓關鍵詞', instruction: '圈出表示原因、轉折、時間或心情的詞，再讀一次前後句。' },
    { id: 'evidence', label: '回到原句', instruction: '每個判斷都回原文找證據，不只憑第一印象。' },
    { id: 'exclude', label: '排除無根據', instruction: '先刪掉文中沒有提到、說得太絕對或不合語意的選項。' },
  ],
  english: [
    { id: 'subject', label: '先找主詞', instruction: '先確認是 I、he、she、we 還是 they，再看動詞要怎麼變。' },
    { id: 'context', label: '找情境詞', instruction: '注意時間、地點和前後句，找出能決定意思的線索。' },
    { id: 'readback', label: '代回朗讀', instruction: '把選項放回完整句子，在心裡慢慢讀一次，檢查語意和文法。' },
  ],
  science: [
    { id: 'observe', label: '找觀察證據', instruction: '分清楚題目真正觀察到什麼，不把猜測當成證據。' },
    { id: 'variable', label: '整理條件', instruction: '把每個選項提到的材料、數量、環境和操作列出來，再逐項比較。' },
    { id: 'cause', label: '連起因果', instruction: '先問「什麼改變了」，再找最能解釋結果的原因。' },
  ],
  social: [
    { id: 'map', label: '畫位置關係', instruction: '遇到方向題時先畫起點，再一步一步標出東西南北。' },
    { id: 'purpose', label: '想用途規則', instruction: '先想這個場所、制度或規則要解決什麼生活需要。' },
    { id: 'source', label: '找可靠資料', instruction: '確認資料是不是來自那個時間、地點或事件，而不是無關資訊。' },
  ],
}

export function getLearningStrategies(subject: Subject): readonly LearningStrategy[] {
  return STRATEGIES_BY_SUBJECT[subject]
}
