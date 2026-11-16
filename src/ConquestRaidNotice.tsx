import { unreadRaidReports } from './conquest-enemy';
import { round } from './conquest';
import type { SharedConquestController } from './conquest-cloud';
import './conquest-raid-notice.css';
export default function ConquestRaidNotice({ controller, onOpen }: { controller: SharedConquestController; onOpen: () => void }) {
  const state = controller.snapshot?.state;
  const reports = state ? unreadRaidReports(state) : [];
  if (!reports.length) return null;
  const npc = reports.filter(r => r.kind !== 'pvp'), pvp = reports.filter(r => r.kind === 'pvp');
  const defended = npc.filter(r => r.defended).length;
  const herbs = round(npc.reduce((total,r) => total + r.herbsLost, 0)), spring = round(npc.reduce((total,r) => total + r.springLost, 0));
  return <details className="cq-raid-notice">
    <summary aria-label={`你有 ${reports.length} 份未讀守城戰報`}>
      <svg className="cq-raid-notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8"/></svg>
      <span>戰報</span>
      <span className="cq-raid-notice-count" aria-hidden="true">{reports.length}</span>
      <svg className="cq-raid-notice-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
    </summary>
    <div className="cq-raid-notice-body">
      <div>{!!pvp.length && <p>玩家攻城 {pvp.length} 場 · 守城成功 {pvp.filter(r => r.defended).length} 場 · 領地失守 {pvp.filter(r => !r.defended).length} 場</p>}{!!npc.length && <p>成功擊退 {defended} 波 · 領地失守 {npc.filter(r => r.captured).length} 場 · 補給遭劫 {npc.length - defended} 波 · 損失 {herbs} 草藥、{spring} 靈泉</p>}{!controller.connected && <small>目前離線，這是上次同步的戰報。</small>}</div>
      <button type="button" onClick={onOpen}>查看未讀戰報</button>
    </div>
  </details>;
}
