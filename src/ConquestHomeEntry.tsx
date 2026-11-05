import ConquestRaidCountdown from './ConquestRaidCountdown';
import ConquestElementBadge from './ConquestElementBadge';
import type { SharedConquestController } from './conquest-cloud';
import PlayerAvatar from './PlayerAvatar';
import type { PlayerId } from './game-view';
import { shieldActive } from './conquest';
import { allianceById } from './conquest-alliance';
import { protectionStatus } from './conquest-presentation';
import './conquest-home.css';

export type ConquestDestination = { tileId?: string; owned?: boolean; reports?: boolean };
type Props = { controller:SharedConquestController; account: string; player: PlayerId; name: string; onEnter: (destination: ConquestDestination) => void };
export default function ConquestHomeEntry({ controller, player, name, onEnter }: Props) {
  const state=controller.snapshot?.state, now=controller.now(), error=!!controller.error;
  const islands=state?.tiles.filter(t=>t.owner===controller.snapshot?.me).sort((a,b)=>(b.capturedAt??0)-(a.capturedAt??0))??[];
  const protectedCount = islands.filter(t => shieldActive(t, now)).length;
  const waitingCount = islands.filter(t => (t.shieldStartsAt ?? 0) > now).length;
  return <section className="cq-home-entry" aria-labelledby="cq-home-title">
    <div className="cq-home-copy">
      <div className="cq-home-owner"><PlayerAvatar id={player} /><span>{name} 的征服航程{state?.enrollment && <small>{allianceById(state.enrollment.allianceId)?.name}</small>}</span></div>
      <h2 id="cq-home-title">星海群島征服</h2>
      <p>{error ? '共享戰場暫時無法連線，請進入群島查看連線狀態。' : !state ? '正在讀取你的航海誌…' : islands.length ? `你已插旗 ${islands.length} 座島嶼。守護領地，航向下一座島。` : state.enrollment ? '你的第一面旗幟，將插在哪座島？帶上英雄與夥伴，展開遠征。' : '選擇聯盟與英雄，帶上三位初始夥伴，拿下第一座島。'}</p>
      {state && <p className="cq-home-summary"><span>我的領地 <b data-testid="home-conquest-count">{islands.length}</b></span><span>護盾保護 {protectedCount}</span><span>整備中 {waitingCount}</span><span>能量 {state.energy}</span></p>}
      {state?.enrollment && <ConquestRaidCountdown state={state} player={controller.snapshot!.me} serverNow={controller.now} connected={controller.connected} />}
      <div className="cq-home-actions"><button className="cq-home-primary" onClick={() => onEnter({})}>{state && !state.enrollment ? '選擇聯盟，啟航征服' : error ? '查看群島存檔' : '進入征服'}</button>{!!islands.length && <button onClick={() => onEnter({ owned: true, tileId: islands[0].id })}>查看我的領地</button>}</div>
      <small className="cq-home-local">共享五行戰場 · 與其他玩家爭奪領地</small>
    </div>
    <div className="cq-home-islands">
      <img className="cq-home-fortress" src="/assets/navigation/conquest-fortress.v-c1549f292cd3.webp" alt="" width="192" height="192" />
      {!!islands.length && <div className="cq-home-holdings" aria-label="最近佔領的島嶼">{islands.slice(0, 3).map(tile => <button key={tile.id} onClick={() => onEnter({ owned: true, tileId: tile.id })}><span aria-hidden="true">⚑</span><span><b>{tile.name}</b><ConquestElementBadge element={tile.element} /><small>{protectionStatus(tile, now)}</small></span><span aria-hidden="true">›</span></button>)}{islands.length > 3 && <small>另有 {islands.length - 3} 座，進入我的領地查看</small>}</div>}
    </div>
  </section>;
}
