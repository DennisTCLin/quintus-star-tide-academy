import { unreadRaidReports } from './conquest-enemy';
import { round } from './conquest';
import type { SharedConquestController } from './conquest-cloud';
import './conquest-raid-notice.css';
export default function ConquestRaidNotice({ controller, onOpen }: { controller: SharedConquestController; onOpen: () => void }) {
  const state = controller.snapshot?.state;
  const reports = state ? unreadRaidReports(state) : [];
  if (!reports.length) return null;
  const defended = reports.filter(r => r.defended).length;
  const herbs = round(reports.reduce((total,r) => total + r.herbsLost, 0)), spring = round(reports.reduce((total,r) => total + r.springLost, 0));
  return <section className="cq-raid-notice" aria-label="未讀守城戰報">
    <div role="status"><strong>你有 {reports.length} 份未讀守城戰報</strong><p>成功擊退 {defended} 波 · 補給遭劫 {reports.length - defended} 波 · 損失 {herbs} 草藥、{spring} 靈泉</p><small>離線時駐軍仍會守城。查看各島戰果與傷勢，安排增援或治療。{!controller.connected && '目前離線，這是上次同步的戰報。'}</small></div>
    <button type="button" onClick={onOpen}>查看未讀戰報</button>
  </section>;
}
