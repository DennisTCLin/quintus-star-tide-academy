import { useEffect, useRef, useState } from 'react';
import ConquestRaidCountdown from './ConquestRaidCountdown';
import { incomingRaid, NPC_FACTION, unreadRaidReports } from './conquest-enemy';
import { health, maxHealth, round, type ConquestState } from './conquest';
import { companionById } from './conquest-characters';
const time = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(stamp);

export default function ConquestRaid({ state, player, now, serverNow, connected = true, onReadReports, openReports }: { state: ConquestState; player: string; now: number; serverNow?:()=>number; connected?:boolean; onReadReports?:(ids:string[])=>Promise<unknown>; openReports?:boolean }) {
  const heading = useRef<HTMLHeadingElement>(null), details = useRef<HTMLDetailsElement>(null);
  const [saving,setSaving] = useState(false), [message,setMessage] = useState('');
  const unread = unreadRaidReports(state), unreadIds = new Set(unread.map(r => r.id));
  useEffect(() => { if(openReports) { if(details.current)details.current.open=true;heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start'}); } }, [openReports,player]);
  const markRead = async (ids:string[]) => {
    if(!onReadReports || saving)return;
    setSaving(true);setMessage('');
    try { await onReadReports(ids);setMessage('所選戰報已標記為已讀。'); }
    catch(error) { setMessage(error instanceof Error ? error.message : '標記未完成，請重新連線後再試。'); }
    finally { setSaving(false); }
  };
  const raid = incomingRaid(state, player, now), last = state.npcRaids, reports = state.raidReports ?? [];
  return <section className="cq-raid" aria-label="黯潮軍團自動防守與戰報">
    <div><small>共同敵人 · NPC</small><h2 ref={heading} tabIndex={-1}>{NPC_FACTION.name} · 自動守城</h2>
    <p>取得領地 10 分鐘後可能來襲，每波至少間隔 6 小時。離線時駐軍仍會自動防守，護盾與交戰保護期間不受襲擊。</p>
    <p>守城不耗能量；傷勢保留，失守最多損失 5 草藥與 2 靈泉，領地保留。可提前增援與治療駐軍。</p>
    <ConquestRaidCountdown state={state} player={player} serverNow={serverNow ?? (()=>now)} connected={connected} />
    {raid && <p role="status">{raid.tileName}出現黯潮蹤跡，駐軍已進入自動防守；最新戰果將自動更新。</p>}
    <details ref={details} className="cq-raid-reports" open={reports.length > 0}>
      <summary>查看守城戰報 · {reports.length} 筆 · 未讀 {unread.length}</summary>
      <p>保留最近 30 場戰報，時間為台北時間。查看戰報不會再次結算戰鬥。</p>
      {!!unread.length && onReadReports && <button type="button" className="cq-read-reports" disabled={!connected || saving} onClick={()=>void markRead(unread.map(r=>r.id))}>{saving ? '正在儲存…' : `將這 ${unread.length} 份標記為已讀`}</button>}
      <p role="status" className="cq-raid-read-status">{message}</p>
      {!reports.length && <p>{last ? `歷史紀錄：第 ${last.wave} 波 · ${last.tileName} · ${last.defended ? '成功擊退' : '補給遭劫'}。此紀錄建立於自動守城啟用前。` : '尚無守城戰報。敵軍來襲後，戰果會自動保存於此。'}</p>}
      {reports.map(report => <details key={report.id} className="cq-raid-report">
        <summary>{unreadIds.has(report.id) && <span className="cq-raid-unread">未讀</span>}<time dateTime={new Date(report.resolvedAt).toISOString()}>{time(report.resolvedAt)}</time> · {report.tileName} · {report.defended ? '成功擊退' : '補給遭劫'} · 第 {report.wave} 波</summary>
        {unreadIds.has(report.id) && onReadReports && <button type="button" className="cq-read-reports" disabled={!connected || saving} onClick={()=>void markRead([report.id])}>標記此戰報已讀</button>}
        <p>{report.season.replace('season-', '')} 航季 · 戰鬥 {report.rounds} 回合 · 敵軍 {report.attackersBefore.length} 位 · 駐軍 {report.defendersBefore.length} 位</p>
        <p>補給損失：草藥 {round(report.herbsLost)}、靈泉 {round(report.springLost)}。領地保留。</p>
        {report.defendersBefore.length ? <ul>{report.defendersBefore.map(before => {
          const after = report.defendersAfter.find(g => g.id === before.id) ?? before;
          return <li key={before.id}>{companionById(before.id)?.name ?? '守衛'} · Lv.{before.level} · 血量 {Math.ceil(health(before))} → {Math.ceil(health(after))} / {maxHealth(after)}{health(after) <= 0 ? ' · 倒地撤回休養' : ''}</li>;
        })}</ul> : <p>本島當時沒有駐軍。</p>}
      </details>)}
    </details></div>
  </section>;
}
