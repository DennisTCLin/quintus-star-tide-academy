export const ACTIVITIES = {
  home: "在港口休息", preparing: "正在準備對戰", learning: "正在答題冒險", battle: "正在對戰", collection: "正在查看夥伴",
  territory: "正在照顧家園", lottery: "正在扭蛋", trade: "正在交換夥伴", leaderboard: "正在看排行榜",
} as const;
export type Activity = keyof typeof ACTIVITIES;
