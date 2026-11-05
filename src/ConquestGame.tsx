import { healthPose } from './character-motion';
import CharacterPortrait from './CharacterPortrait';
import ConquestRaid from './ConquestRaid';
import ConquestLevels, { conquestLevelDescription } from './ConquestLevels';
import ConquestElementBadge from './ConquestElementBadge';
import { CONQUEST_HEROES, heroById, expeditionRoster, initialExpedition, companionById, wildIdentity } from './conquest-characters';
import { allianceById } from './conquest-alliance';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS } from './game-view';
import { annotateTree, ReadingContext } from './readability';
import { speak, stopVoice } from './voice';
import ConquestLogistics, { Formation, HealthBar } from './ConquestLogistics';
import ConquestBattle from './ConquestBattle';
import { claimReport, drillReport, prepareBattle, type BattlePlan, type DrillTier } from './conquest-battle';
import ConquestScene, { type SceneControl } from './ConquestScene';
import { defenderAffinity, defensePower, ELEMENTS, knowledgeBonus, ensureSeason, syncConquestRoster, currentUnit, deploymentBlock, health, maxHealth, shieldActive, stationed, production, adjacent, battleResult, claimBlock, claimCost, ELEMENT_LABEL, ELEMENT_COLOR, FACILITIES, leaderboard, majority, power, TERRAIN_LABEL, territories, TRIAL_LEVEL, type Companion, type ConquestAction, type ConquestState } from './conquest';
import './conquest.css';
import ConquestTerritoryBadge from './ConquestTerritoryBadge';
import { territoryStatus, protectionStatus } from './conquest-presentation';
import type { ConquestDestination } from './ConquestHomeEntry';

type Props = {
  raidConnected?:boolean; onReadReports?:(ids:string[])=>Promise<unknown>; serverNow?:()=>number; destination?: ConquestDestination; player: string; sessions: Record<string, ConquestState>; owned: Record<string, number>; growthXp: Record<string, number>; equipped: string;
  onAct: (action: ConquestAction, roster: Companion[]) => Promise<ConquestState>; storageError?: string;
  onLearn: () => void; reduced: boolean; storageScope?: string; players?: { id: string; name: string }[];
};
const duration = (end: number, now: number) => { const min = Math.max(0, Math.ceil((end - now) / 60000)); return `${Math.floor(min / 60)} 小時 ${min % 60} 分`; };

export default function ConquestGame({ raidConnected=true, onReadReports, serverNow = Date.now, destination, player, sessions, owned, growthXp, equipped, onAct, onLearn, reduced, storageError, storageScope, players = [...PLAYERS] }: Props) {
  const { grade } = useContext(ReadingContext);
  const heading = useRef<HTMLHeadingElement>(null), scene = useRef<SceneControl>(null);
  const inspectorHeading = useRef<HTMLHeadingElement>(null), invitation = useRef<HTMLButtonElement>(null);
  const inspectorInvoker = useRef<HTMLElement | null>(null), focusInspector = useRef(false);
  const [selected, setSelected] = useState(destination?.tileId ?? '0,0');
  const [team, setTeam] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [now, setNow] = useState(serverNow), [busy, setBusy] = useState(false);
  const agedState = useMemo(() => ensureSeason(sessions[player], now), [sessions[player], now]);
  const collectionRoster = useMemo(() => expeditionRoster(owned, agedState.enrollment, growthXp), [owned, agedState.enrollment, growthXp]);
  const state = useMemo(() => syncConquestRoster(agedState, collectionRoster), [agedState, collectionRoster]);
  const [filter, setFilter] = useState(destination?.owned ? 'owned' : 'all');
  const [showRules, setShowRules] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(!!destination?.tileId);
  const [inCombat, setInCombat] = useState(false);
  const playerName = players.find(p => p.id === player)?.name ?? player;
  const focusSupplies = useRef(false);
  const [battlePlan, setBattlePlan] = useState<BattlePlan | null>(null);
  useEffect(() => { if (!battlePlan && focusSupplies.current) { focusSupplies.current = false; const heading = document.querySelector<HTMLElement>('#cq-logistics-title'); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start' }); } }, [battlePlan]);
  const combatTileId = inCombat && battlePlan?.season === state.season ? battlePlan.tileId : null;
  const roster = useMemo(() => collectionRoster.map(c => ({ ...c, ...currentUnit(state, c) })), [collectionRoster, state]);
  const hero = heroById(state.enrollment?.heroId)!;
  const alliance = allianceById(state.enrollment?.allianceId);
  useEffect(() => { setBattlePlan(null); setTeam(initialExpedition(roster.filter(c => !deploymentBlock(state, c)), equipped)); setSelected(destination?.tileId ?? '0,0'); setNotice(''); setConfirmAbandon(false); if(!destination?.reports)heading.current?.focus({ preventScroll: true }); }, [player, state.season, equipped]);
  useEffect(() => { setTeam(previous => { const next = previous.filter(id => roster.some(c => c.id === id && !deploymentBlock(state, c))); return next.length === previous.length ? previous : next; }); }, [roster]);
  useEffect(() => { const timer = setInterval(() => setNow(serverNow()), 5000); return () => { clearInterval(timer); stopVoice(); }; }, []);
  const tile = state.tiles.find(t => t.id === selected) ?? state.tiles.find(t => t.id === '0,0')!;
  const garrisonRoster = [...roster, ...tile.guards.filter(g => !roster.some(c => c.id === g.id)).map(g => ({ ...g, name: companionById(g.id)?.name ?? g.id, image: companionById(g.id)?.image ?? '', loan: false }))];
  const guards = team.map(id => roster.find(c => c.id === id)).filter((c): c is typeof roster[number] => !!c);
  const ownedTiles = territories(state, player);
  const isOwn = tile.owner === player;
  const block = claimBlock(state, player, tile, now, state.shared);
  const cost = claimCost(tile, ownedTiles.length);
  const preview = battleResult(guards, tile, ownedTiles.length, tile.owner ? territories(state, tile.owner).length : 0);
  const neighbors = state.tiles.filter(t => adjacent(tile, t));
  const available = state.tiles.filter(t => !t.owner && (!ownedTiles.length || ownedTiles.some(o => adjacent(o, t))));
  const rows = leaderboard(players.map(p => ({ id: p.id, name: p.name, state: p.id === player ? state : sessions[p.id] })));
  const select = (id: string, invoker?: HTMLElement) => {
    const active = invoker ?? document.activeElement as HTMLElement | null;
    if (!active?.closest('.cq-dossier')) inspectorInvoker.current = active?.closest('.cq-island-list, .cq-map-label, .cq-owner-overview') ? active : invitation.current;
    focusInspector.current = !!active?.closest('.cq-island-list, .cq-map-label, .cq-owner-overview');
    setInspectorOpen(true); setSelected(id); scene.current?.focusTile(id); setConfirmAbandon(false); setNotice('');
    // Selecting the same island while already open must still reveal the existing sheet.
    if (focusInspector.current && inspectorOpen && selected === id) { inspectorHeading.current?.focus({ preventScroll: true }); inspectorHeading.current?.scrollIntoView({ block: 'center' }); focusInspector.current = false; }
  };
  const closeInspector = () => { setInspectorOpen(false); (inspectorInvoker.current?.isConnected && getComputedStyle(inspectorInvoker.current).visibility !== 'hidden' ? inspectorInvoker.current : invitation.current)?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!inspectorOpen || !focusInspector.current) return;
    focusInspector.current = false;
    inspectorHeading.current?.focus({ preventScroll: true }); inspectorHeading.current?.scrollIntoView({ block: 'center' });
  }, [inspectorOpen, selected]);
  const dispatch = async (action: ConquestAction) => {
    if (busy) return; setBusy(true);
    try {
      const result = await onAct({ ...action, season: state.season }, roster);
      setNotice(result.log[0]); setConfirmAbandon(false); setNow(serverNow());
    } catch (error) { setNotice(error instanceof Error ? error.message : '操作未完成，請再試一次。'); } finally { setBusy(false); }
  };
  const commitBattle = async (tier: DrillTier) => {
    if (!battlePlan || battlePlan.player !== player || battlePlan.season !== state.season) throw Error('玩家或航季已變更，請重新準備戰鬥。');
    const timestamp = serverNow(), setup = prepareBattle(state, battlePlan, team, roster, tier, timestamp, hero.id);
    if (setup.block) throw Error(setup.block);
    if (battlePlan.mode === 'drill') return drillReport(setup, state, timestamp);
    const committed = await onAct({ type: 'claim', tileId: battlePlan.tileId, expectedCost: setup.fullCost, team: [...team], season: battlePlan.season, commander: hero.id }, roster);
    setNotice(committed.log[0]); setNow(timestamp);
    return claimReport(setup, committed, committed.updatedAt);
  };
  const toggle = (id: string) => {
    const unit = roster.find(c => c.id === id); if (unit && deploymentBlock(state, unit)) { setNotice(deploymentBlock(state, unit)!); return; }
    if (team.includes(id)) setTeam(team.filter(x => x !== id));
    else if (team.length < 5) setTeam([...team, id]);
    else setNotice('最多帶五位夥伴，請先取消一位再選。');
  };
  const readableTile = `${tile.name}，${ELEMENT_LABEL[tile.element]}之島，同屬性守軍傷害增加${tile.facility === 'shrine' ? 10 : 5}%，${TERRAIN_LABEL[tile.terrain]}，${tile.facility ? FACILITIES[tile.facility].name : '一般島嶼'}。${isOwn ? '你的領地' : `${tile.owner ? '領主守衛' : '野怪守衛'} ${tile.guards.length} 位，防禦力 ${defensePower(tile)}`}。${isOwn ? '可免費增援。' : `佔領需要 ${cost} 能量。${block ?? '可以出征。'}`}`;
  return annotateTree(<section className="cq-game" aria-label="星海群島征服">
    <header className="cq-header">
      <div className="cq-title"><span className="cq-emblem" aria-hidden="true">✥</span><div><h1 ref={heading} tabIndex={-1}>星海群島征服</h1><p>{state.season.replace('season-', '').replace('-', ' 年 ')} 月航季 · 共享領地戰</p></div></div>
      <div className="cq-status"><div><span>⚡ 能量</span><strong data-testid="conquest-energy">{state.energy}</strong></div><div><span>⚑ 我的領地</span><strong>{ownedTiles.length}<small> / 91</small></strong></div><button className="cq-gold" onClick={onLearn}>✦ 答題補能量</button></div>
    </header>
    <ConquestRaid state={state} player={player} now={now} serverNow={serverNow} connected={raidConnected} onReadReports={onReadReports} openReports={destination?.reports} />
    <div className="cq-status-legend" aria-label="領地狀態圖例"><span><i />尚未佔領 · 野怪駐守</span><span><i className="cq-legend-owned" />金旗 · 我的領地</span><span><i className="cq-legend-other" />紫旗 · 其他玩家領地</span><span><i className="cq-legend-war" />交戰中</span><small>整備與護盾另行標示；交戰期間暫停重複進攻，結束後可繼續爭奪。</small></div>
    <nav className="cq-owner-overview" aria-label="共享領地總覽">
      <div><strong>所有領主的領地</strong><span>點選領主，查看他的島嶼與駐軍。</span></div>
      <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>所有島嶼 · {state.tiles.length}</button>
      <button type="button" aria-pressed={filter === 'others'} onClick={event => { setFilter('others'); const first = state.tiles.find(t => t.owner && t.owner !== player); if (first) select(first.id, event.currentTarget); }}>其他玩家 · {state.tiles.filter(t => t.owner && t.owner !== player).length} 座</button>
      {rows.filter(owner => owner.count > 0).map(owner => <button type="button" key={owner.id} data-own={owner.id === player} aria-pressed={filter === `owner:${owner.id}`} onClick={event => { setFilter(`owner:${owner.id}`); const first = state.tiles.filter(t => t.owner === owner.id).sort((a,b) => a.distance-b.distance)[0]; if (first) select(first.id, event.currentTarget); }}>{owner.name}{owner.id === player ? '（我）' : ''} · {owner.count} 座</button>)}
    </nav>
    <div className="cq-element-legend" aria-label="島嶼五行圖例">{ELEMENTS.map(element => <ConquestElementBadge key={element} element={element} />)}<span>同屬性守軍傷害 +5% · 元素祠總計 +10%</span></div>
    <div className={`cq-layout ${inspectorOpen ? 'cq-inspecting' : ''}`}>
      <div className="cq-world">
        <ConquestScene playerName={playerName} combatTileId={combatTileId} ref={scene} tiles={state.tiles} player={player} selected={tile.id} onSelect={select} reduced={reduced} now={now} suspended={!!battlePlan} />
        <div className="cq-map-caption"><span className="cq-live-dot" />海圖已展開 <span>91 座島嶼</span></div>
        <button className="cq-frontier-caption" onClick={() => scene.current?.frontierInfo()}>🔒 外圍 78 座島嶼 · 尚未開放</button>
        <button ref={invitation} className="cq-map-invitation" aria-expanded={inspectorOpen} aria-controls="cq-island-inspector" onClick={event => { if (inspectorOpen) closeInspector(); else { inspectorInvoker.current = event.currentTarget; focusInspector.current = true; setInspectorOpen(true); } }}><span>你的下一站 · 點此展開島嶼情報</span><strong>{tile.name}</strong><ConquestElementBadge element={tile.element} /><p>{ownedTiles.length ? '沿著相鄰航線，拓展你的星海。' : '第一座島，自由選擇。從中央啟航最輕鬆。'}</p></button>
        <div className="cq-compass" aria-hidden="true"><b>✥</b><span>星海航圖</span></div>
        <div className="cq-map-controls" aria-label="地圖視角控制">
          <button aria-label="向左旋轉地圖" onClick={() => scene.current?.rotate(-Math.PI / 8)}>↶</button>
          <button aria-label="向右旋轉地圖" onClick={() => scene.current?.rotate(Math.PI / 8)}>↷</button>
          <button aria-label="放大地圖" onClick={() => scene.current?.zoom(.8)}>＋</button>
          <button aria-label="縮小地圖" onClick={() => scene.current?.zoom(1.25)}>−</button>
          <button aria-label="查看完整海圖" onClick={() => scene.current?.overview()}>◎</button>
          <button aria-label="重設地圖視角" onClick={() => scene.current?.home()}>⌂</button>
        </div>
        <p className="cq-map-help">拖曳旋轉 · 滾輪／雙指縮放 · 點島嶼探索</p>
      </div>
      <aside id="cq-island-inspector" className="cq-dossier" aria-label="選中島嶼詳情" hidden={!inspectorOpen} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeInspector(); } }}>
        <button className="cq-close-inspector" aria-label="收起島嶼情報" onClick={closeInspector}>收起情報 ×</button>
        <div className={`cq-biome cq-biome-${tile.terrain}`}><span>{tile.facility ? FACILITIES[tile.facility].icon : { plains: '🌱', forest: '🌲', mountain: '⛰', river: '💧', desert: '🌵' }[tile.terrain]}</span><div><small>{TERRAIN_LABEL[tile.terrain]} · 距中心 {tile.distance} 格</small><h2 ref={inspectorHeading} tabIndex={-1}>{tile.name}</h2></div><button className="cq-speak" aria-label="聽島嶼資訊" onClick={() => speak(readableTile, setNotice)}>🔊</button></div>
        <div className="cq-island-content">
          <div className="cq-owner"><ConquestTerritoryBadge tile={tile} player={player} name={playerName} combatTileId={combatTileId} now={now} /><small>座標 {tile.q}, {tile.r}</small></div>
          <div className="cq-affinity-info" style={{ '--island-element': ELEMENT_COLOR[tile.element] } as React.CSSProperties}><ConquestElementBadge element={tile.element} /><p>{ELEMENT_LABEL[tile.element]}屬性守軍傷害 +{tile.facility === 'shrine' ? 10 : 5}%{tile.facility === 'shrine' ? '（含島嶼親和，不重複疊加）' : ''}。僅限防守，野怪也適用；地形與材料產出不變。</p></div>
          {tile.facility && <p className="cq-facility"><b>{FACILITIES[tile.facility].name}{tile.shrineElement ? `・${ELEMENT_LABEL[tile.shrineElement]}` : ''}</b><span>{FACILITIES[tile.facility].effect}</span></p>}
          <div className="cq-guard-line"><span>{isOwn ? '駐島守衛' : tile.owner ? '領主守衛' : '野怪守衛'}</span><b>{tile.guards.length} 位 · 防禦 {defensePower(tile)}</b></div>
          <div className="cq-guards cq-named-guards">{tile.guards.map(g => { const identity = tile.owner ? companionById(g.id) : wildIdentity(g); return <span key={g.id} style={{ '--element': ELEMENT_COLOR[g.element] } as React.CSSProperties}>{identity && <CharacterPortrait paused={reduced} characterId={identity.id} pose={healthPose(health(g), maxHealth(g))} src={identity.image} alt="" />}<b>{identity?.name ?? '守衛'}</b><small>{ELEMENT_LABEL[g.element]} · Lv.{g.level}</small>{defenderAffinity(tile, g) > 0 && <small className="cq-affinity-unit">駐防親和 +{defenderAffinity(tile, g) * 100}%</small>}<HealthBar hp={health(g)} max={maxHealth(g)} label={`${identity?.name ?? "守衛"}血量`} /></span>; })}</div>{isOwn && tile.commander && <p className="cq-stationed-hero">駐島領軍：{heroById(tile.commander)?.name}</p>}
          {isOwn ? <>
            <p className={`cq-shield ${!shieldActive(tile, now) ? "cq-contested" : ""}`}>{shieldActive(tile, now) ? `🛡 保護中・剩餘 ${duration(tile.shieldUntil, now)}` : (tile.shieldStartsAt ?? 0) > now ? `⏳ 整備中・距護盾啟動 ${duration(tile.shieldStartsAt!, now)}` : "⚔ 護盾已到期・可被進攻"}</p><p className="cq-production">每小時產出：藥草 {production(tile).herbs}／靈泉 {production(tile).spring}{!tile.guards.length && "・空島暫停生產"}</p>
            <details className="cq-garrison-editor"><summary>🛡 調整駐軍 · {tile.guards.length} / 5</summary><p>每隻夥伴只能守一座島。撤回保留傷勢；增援不延長護盾。</p>{garrisonRoster.map(unit => { const here = tile.guards.some(g => g.id === unit.id), unavailable = deploymentBlock(state, unit, tile.id); return <button key={unit.id} data-unit={unit.id} disabled={busy || !!storageError || !here && (!!unavailable || tile.guards.length >= 5)} onClick={() => dispatch({ type: here ? 'recall' : 'station', tileId: tile.id, unitId: unit.id })}><CharacterPortrait paused={reduced} characterId={unit.id} pose={healthPose(health(unit), maxHealth(unit), here)} src={unit.image} alt=""/><span>{unit.name}<small>{here ? '目前駐軍' : unavailable ?? '可增援'} · HP {Math.ceil(health(unit))}/{maxHealth(unit)}</small>{defenderAffinity(tile, unit) > 0 && <small className="cq-affinity-unit">駐防親和 +{defenderAffinity(tile, unit) * 100}%</small>}</span><b>{here ? '撤回' : '駐守'}</b></button>; })}</details>
            <button className="cq-defense-button cq-wide" onClick={() => setBattlePlan({ mode: 'drill', player, season: state.season, tileId: tile.id })}>🛡 防守演練</button>
            <p className="cq-defense-note">駐島守衛決定防禦戰力。可免費演練敵軍進攻；不扣能量，不影響護盾。</p>
            {confirmAbandon ? <div className="cq-abandon-confirm"><p>放棄後野怪會重新進駐，確定離開這座島？</p><button onClick={() => dispatch({ type: 'abandon', tileId: tile.id })}>確認放棄</button><button onClick={() => setConfirmAbandon(false)}>保留領地</button></div> : <button className="cq-quiet cq-wide" onClick={() => setConfirmAbandon(true)}>放棄這座島嶼</button>}
          </> : <>
            <div className="cq-versus"><div><small>遠征戰力</small><strong>{preview.attack}</strong></div><span>對</span><div><small>{tile.owner ? '領主防禦' : '野怪防禦'}</small><strong>{preview.defense}</strong></div></div>
            <p className="cq-outcome">{team.length < 3 ? '請在下方選擇至少三位夥伴' : preview.won ? '✦ 目前血量預估可取勝' : '預估難以取勝，建議治療或調整編隊'}{preview.elemental && <b>元素相剋 ×1.25</b>}</p>
            <div className="cq-cost"><span>出征能量{ownedTiles.length < 3 ? ' · 新手 8 折' : ''}</span><strong>⚡ {cost}</strong></div>
            <button className="cq-gold cq-wide" disabled={busy || !!storageError || !!block || team.length < 3} onClick={() => setBattlePlan({ mode: 'claim', player, season: state.season, tileId: tile.id })}>⚔ 佔領島嶼</button>
            <p className="cq-action-note">{block ?? '佔領後先守住 1 小時，再獲得 24 小時護盾。失敗半價，傷勢仍保留。'}</p>
          </>}
          <div className="cq-neighbors"><span>相鄰島嶼</span>{neighbors.map(n => <button key={n.id} onClick={() => select(n.id)} title={`${n.name}（${n.id}）`}>{n.facility ? FACILITIES[n.facility].icon : '◇'} {n.name}</button>)}</div>
        </div>
      </aside>
    </div>
    {storageError && <p className="cq-save-error" role="alert">{storageError}</p>}
    <div className="cq-notice" role="status" aria-live="polite">{notice || `先選島，再編隊。初始能量 50，答對 +${10 + knowledgeBonus(state)}，答錯 +2。`}</div>
    <section className="cq-hero-selection" aria-label="選擇領軍英雄"><div><span>{alliance?.name} · 領軍英雄</span><h2>{hero.name}</h2><p>與你選擇的 3–5 位夥伴共同出征。英雄目前負責領軍，不額外增加戰力。</p></div><div className="cq-hero-cards">{CONQUEST_HEROES.filter(h => alliance?.heroes.some(id => id === h.id)).map(h => <button key={h.id} disabled={hero.id !== h.id} aria-pressed={hero.id === h.id} aria-label={`領軍英雄：${h.name}`}><CharacterPortrait paused={reduced} characterId={h.id} pose={hero.id === h.id ? "selected" : "locked"} src={h.image} alt="" loading="lazy" /><span>{h.name}<small>{h.role}</small><em className="cq-hero-lock">{hero.id === h.id ? "已解鎖 · 領軍中" : "🔒 尚未解鎖"}</em></span></button>)}</div></section>
    <section className="cq-fleet" aria-label="選擇出征夥伴">
      <div className="cq-section-heading"><div><h2>組成你的遠征隊</h2><p>收藏夥伴使用卡冊等級出征，練等成果會提升血量與傷害。聯盟借用夥伴為 Lv.{TRIAL_LEVEL}。選擇 3–5 位夥伴；血量至少 20%、未駐島才能出征</p></div><button className="cq-quiet" onClick={() => setTeam(initialExpedition(roster.filter(c => !deploymentBlock(state, c)), equipped))}>選擇可用夥伴</button><span className="cq-team-count">已選 {team.length} / 5 <b>戰力 {power(guards)}</b></span></div>
      <Formation roster={roster} team={team} onOrder={setTeam} disabled={busy} />
      <div className="cq-roster">{roster.map(c => <button className={`cq-companion ${team.includes(c.id) ? 'cq-picked' : ''}`} key={c.id} data-unit={c.id} disabled={!!deploymentBlock(state, c)} aria-pressed={team.includes(c.id)} aria-label={`${c.name}，${ELEMENT_LABEL[c.element]}屬性，${conquestLevelDescription(c, growthXp)}`} onClick={() => toggle(c.id)} style={{ '--element': ELEMENT_COLOR[c.element] } as React.CSSProperties}><span className="cq-pick-mark">{team.includes(c.id) ? '✓' : '＋'}</span><CharacterPortrait paused={reduced} characterId={c.id} pose={healthPose(health(c), maxHealth(c), team.includes(c.id))} src={c.image} alt="" loading="lazy" /><span className="cq-element">{ELEMENT_LABEL[c.element]}</span><b>{c.name}</b>{stationed(state, c.id) && <small>駐守・{stationed(state, c.id)!.name}</small>}<ConquestLevels unit={c} growthXp={growthXp} /><HealthBar hp={health(c)} max={maxHealth(c)} label={`${c.name}血量`} /></button>)}</div>
      <p className="cq-element-help">金剋木、木剋土、土剋水、水剋火、火剋金。隊伍最多數元素為主屬性；同票時無主屬性。<b>目前：{majority(guards) ? ELEMENT_LABEL[majority(guards)!] : '無主屬性'}</b></p>
    </section>
    <ConquestLogistics reduced={reduced} storageScope={storageScope} state={state} roster={roster} player={player} busy={busy || !!storageError} dispatch={dispatch} />
    <div className="cq-bottom-grid">
      <section className="cq-directory"><div className="cq-section-heading"><h2>島嶼清單</h2><label><span className="cq-sr-only">篩選島嶼</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">所有島嶼 · 91</option><option value="available">相鄰可探索 · {available.length}</option><option value="owned">我的領地 · {ownedTiles.length}</option><option value="others">其他玩家領地 · {state.tiles.filter(t => t.owner && t.owner !== player).length}</option>{rows.filter(owner => owner.count > 0).map(owner => <option key={owner.id} value={`owner:${owner.id}`}>{owner.name} · {owner.count} 座</option>)}<option value="facility">特殊設施</option></select></label></div><p>也可以用鍵盤選島，與 3D 地圖同步。</p><div className="cq-island-list">{state.tiles.filter(t => filter === 'all' || filter === 'available' && available.includes(t) || filter === 'owned' && t.owner === player || filter === 'facility' && t.facility || filter === 'others' && !!t.owner && t.owner !== player || filter === `owner:${t.owner}`).sort((a, b) => a.distance - b.distance || a.q - b.q || a.r - b.r).map(t => <button key={t.id} aria-pressed={t.id === tile.id} onClick={() => select(t.id)} aria-label={`${t.name}，${ELEMENT_LABEL[t.element]}之島，座標${t.id}，${territoryStatus(t, player, combatTileId, now).label}，${territoryStatus(t, player).ownerLabel}，${TERRAIN_LABEL[t.terrain]}`}><span className="cq-directory-item"><b>{t.name}</b><ConquestElementBadge element={t.element} /><ConquestTerritoryBadge tile={t} player={player} name={playerName} combatTileId={combatTileId} now={now} /><small>{TERRAIN_LABEL[t.terrain]} · {t.id}{t.owner && ` · ${protectionStatus(t, now)}`}</small></span><small>防禦 {defensePower(t)}</small></button>)}</div>{filter === 'owned' && !ownedTiles.length && <p>還沒有領地。選擇啟航之島，展開第一場遠征。</p>}</section>
      <section className="cq-logbook"><h2>本次航程排行榜</h2><p>以領地數量排序，同數量比總防禦分數。</p><ol>{rows.map((r, i) => <li key={r.id} className={r.id === player ? 'cq-current-player' : ''}><span>{r.count ? i + 1 : '—'}</span><b>{r.name}</b><div>{r.count} 座<small>防禦 {r.defense}</small></div></li>)}</ol><details><summary>遠征紀錄</summary>{state.log.length ? state.log.map((entry, i) => <p key={i}>{entry}</p>) : <p>第一頁航海誌，等你寫下。</p>}</details></section>
    </div>
    <footer className="cq-footer"><p>所有玩家共用同一張群島海圖。領地、傷勢、材料與護盾由伺服器保存，跨裝置同步。領主離線時仍由駐軍防守；野怪只駐守尚未被玩家佔領的島嶼。每次交戰有 20 秒戰況結算期，期間不能再次進攻或調整該島駐軍。</p><button className="cq-quiet" aria-expanded={showRules} onClick={() => setShowRules(!showRules)}>{showRules ? '收起航海規則' : '查看航海規則'}</button>{showRules && <div className="cq-rules"><p>每月依台北時間換季；所有島嶼初始由野怪駐守。第一座任選，其餘必須與自己的領地相鄰。每格出征 3–5 位不同夥伴。</p><p>最大血量 = 60 + 等級 × 20；基礎傷害 = 10 + 等級 × 5。防守方先行，雙方依隊伍順序交替攻擊第一名存活敵人；倒地者退出。清除守軍且仍有存活者才佔領，60 回合未分勝負則進攻失敗。元素多數在開戰時計算一次，相剋增加 25% 攻方傷害，同票無加成。</p><p>費用 = 30 × 防禦塔倍率（1.2）＋玩家防禦分數 × 0.5；領地少於三座再乘 0.8。未成功只消耗半價。增援、放棄免費；增援不延長護盾。</p><p>一般學習航程每題答對基礎 +10（殿堂可再加成）、答錯 +2，各記一次；重複點同題不重複累加。收藏夥伴與卡冊等級同步，原有傷勢按血量比例保留。尚未收藏的聯盟借用夥伴為 Lv.{TRIAL_LEVEL}；群島不扣除卡冊經驗值或收藏。</p><p>領地需有存活守軍才生產材料。每月台北時間換季，領地、能量、護盾與排行重置；血量、道具、材料保留，駐軍撤回。護盾在連續持有滿 1 小時後啟動 24 小時。主城是地標，個人休養區不需要佔有主城。每座島的五行依航季固定，與地形分開。同屬性守軍傷害 +5%，元素祠提升至總計 +10%，不疊加；野怪同樣適用，攻擊方不享有島嶼親和。佔領費用與排行仍使用基礎防禦分數；知識殿堂每座讓答對能量 +2（最多 +6），需有存活守軍。</p></div>}</footer>
    {battlePlan && <ConquestBattle now={now} growthXp={growthXp} onCombatChange={setInCombat} key={`${battlePlan.player}:${battlePlan.season}:${battlePlan.tileId}:${battlePlan.mode}`} heroId={hero.id} plan={battlePlan} state={state} roster={roster} team={team} reduced={reduced} onToggle={toggle} onOrder={setTeam} onCommit={commitBattle} onClose={() => setBattlePlan(null)} onSupplies={() => { focusSupplies.current = true; setBattlePlan(null); }} />}
  </section>, grade);
}
