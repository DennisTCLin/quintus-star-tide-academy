import { useEffect, useState } from 'react';
import { nextRaidWindow } from './conquest-enemy';
import type { ConquestState } from './conquest';
import './conquest-raid-notice.css';
export const raidDuration = (milliseconds: number) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
};
export default function ConquestRaidCountdown({ state, player, serverNow = Date.now, connected = true }: { state: ConquestState; player: string; serverNow?: () => number; connected?: boolean }) {
  const [,tick] = useState(0);
  useEffect(() => { const timer = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(timer); }, []);
  const now = serverNow(), next = nextRaidWindow(state, player, now);
  return <div className="cq-raid-countdown" data-testid="raid-countdown">
    <span>黯潮軍團 · 第 {next.wave} 波</span>
    <strong>{!connected ? '重新連線後更新倒數' : next.at === null ? '尚無可進攻領地' : next.reason === 'due' ? '敵軍即將來襲，等待伺服器進攻' : <>預計進攻倒數 <time aria-label="距離最早進攻時間">{raidDuration(next.at - now)}</time></>}</strong>
    <small>{next.at === null ? '取得領地後，會顯示下一波進攻時間。' : '依目前領地、護盾與交戰狀態估算；歸零後由伺服器自動進攻，駐軍自動防守。'}</small>
  </div>;
}
