import type { RewardState } from "./adventure";
export type { RewardState } from "./adventure";
export function rewardMessage(reward: RewardState): string {
  switch (reward) {
    case "saved": return "存好一顆星！再存一顆，就有一張券。";
    case "exchanged": return "兩顆星集滿了！已換成一張星願券。";
    case "won": return "拿到一張星願券！";
    case "miss": return "這次沒抽到券。存好的星星和學習紀錄都還在。";
    case "pending": return "先前的獎勵還在，按存一顆星領取。";
    default: return "學習紀錄已保存。";
  }
}
