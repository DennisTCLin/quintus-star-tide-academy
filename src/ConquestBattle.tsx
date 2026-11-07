import { healthPose, type PortraitPose } from './character-motion';
import CharacterPortrait from './CharacterPortrait';
import ConquestLevels, { conquestLevelDescription } from './ConquestLevels';
import ConquestElementBadge from './ConquestElementBadge';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { annotateTree, ReadingContext } from './readability';
import { defenderAffinity, deploymentBlock, health, maxHealth, ELEMENT_COLOR, ELEMENT_LABEL, power, type Companion, type ConquestState } from './conquest';
import { DRILL_TIERS, prepareBattle, type BattlePlan, type BattleReport, type BattleSetup, type DrillTier } from './conquest-battle';
import { BATTLE_RESOLVE, battleDuration, battleHealth, beatAt, beatPhase, createChoreography } from './conquest-choreography';
import { heroAssist, heroMove } from './conquest-hero-motion';
import { ConquestAudio } from './conquest-audio';
import { Formation, HealthBar } from './ConquestLogistics';
import ConquestBattlefield from './ConquestBattlefield';
import './conquest-battle.css';

type Props = { onLearn: () => void; storageError?: string; now?:number; growthXp: Record<string, number>; onCombatChange?: (active: boolean) => void; heroId: string; plan: BattlePlan; state: ConquestState; roster: Companion[]; team: string[]; reduced: boolean; onToggle: (id: string) => void; onOrder: (ids: string[]) => void; onCommit: (tier: DrillTier) => Promise<BattleReport>; onClose: () => void; onSupplies: () => void };
export default function ConquestBattle({ onLearn, storageError, now = Date.now(), growthXp, onCombatChange, heroId, plan, state, roster, team, reduced, onToggle, onOrder, onCommit, onClose, onSupplies }: Props) {
  const { grade } = useContext(ReadingContext), dialog = useRef<HTMLDialogElement>(null);
  const committed = useRef(false), playbackDone = useRef(false), audio = useRef<ConquestAudio | null>(null), lastSound = useRef(0);
  audio.current ??= new ConquestAudio();
  const [artReady, setArtReady] = useState(false), [cinematic, setCinematic] = useState(true), [muted, setMuted] = useState(false), [pending, setPending] = useState(false);
  const [tier, setTier] = useState<DrillTier>('coast'), [report, setReport] = useState<BattleReport | null>(null), [progress, setProgress] = useState(-1), [error, setError] = useState('');
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const gentle = reduced || systemReduced, finished = !!report && progress >= 1;
  let setup: BattleSetup | null = report, validation = '';
  if (!setup) try { setup = prepareBattle(state, plan, team, roster, tier, now, heroId); } catch (cause) { validation = cause instanceof Error ? cause.message : '無法準備戰鬥。'; }
  const beats = useMemo(() => setup ? createChoreography(setup) : [], [setup]);
  const beat = beatAt(beats, progress);
  const activeCommander = setup?.mode === 'claim' && beat?.side === 1 ? setup.defenderCommander : setup?.commander;
  const assisting = !!activeCommander && heroAssist(beats, beat, setup?.mode === 'drill' || beat?.side === 1 ? 1 : -1);
  const resolved = !!report && progress >= .90;
  const combatActive = plan.mode === 'claim' && !!report && progress < BATTLE_RESOLVE;
  useEffect(() => { onCombatChange?.(combatActive); return () => onCombatChange?.(false); }, [combatActive, onCombatChange]);
  const performer = beat && setup ? (beat.side === -1 ? setup.attackers : setup.defenders).find(unit => `${beat.side}:${unit.id}` === beat.source) : null;
  const impactGlow = beat && progress >= beat.impact ? Math.max(0, 1 - (progress - beat.impact) / (beat.end - beat.impact) * 2) : 0;
  useEffect(() => {
    const element = dialog.current!, previous = document.activeElement as HTMLElement | null;
    element.showModal(); element.querySelector<HTMLElement>('h2')?.focus();
    return () => { element.close(); const target = previous?.isConnected && previous.getClientRects().length ? previous : document.querySelector<HTMLElement>('.cq-biome h2'); target?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'), change = () => setSystemReduced(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  useEffect(() => {
    if (!report) return;
    if (gentle) { playbackDone.current = true; audio.current?.stop(); setProgress(1); return; }
    if (!artReady || playbackDone.current) return;
    let frame = 0, previous = performance.now(), elapsed = 0, lastPaint = 0;
    const step = (now: number) => {
      if (playbackDone.current) return;
      if (!document.hidden) elapsed += Math.min(100, now - previous);
      previous = now; const value = Math.min(1, elapsed / battleDuration(report)); if (now - lastPaint >= 16 || value === 1) { setProgress(value); lastPaint = now; }
      if (value < 1) frame = requestAnimationFrame(step); else playbackDone.current = true;
    };
    frame = requestAnimationFrame(step); return () => cancelAnimationFrame(frame);
  }, [report, gentle, artReady]);
  useEffect(() => {
    const quiet = () => { if (document.hidden) audio.current?.stop(); };
    document.addEventListener('visibilitychange', quiet);
    return () => { document.removeEventListener('visibilitychange', quiet); audio.current?.close(); };
  }, []);
  useEffect(() => {
    if (report && !gentle && !muted && !playbackDone.current && !document.hidden) {
      const hit = beats.find(b => lastSound.current < b.impact && progress >= b.impact);
      if (hit) audio.current?.impact(hit.style, hit.finale);
    }
    if (report?.playerWon && !gentle && !muted && !playbackDone.current && !document.hidden && lastSound.current < BATTLE_RESOLVE && progress >= BATTLE_RESOLVE) audio.current?.victory();
    lastSound.current = Math.max(0, progress);
  }, [progress, report, beats, gentle, muted]);
  const musicActive = !!report && artReady && !gentle && progress >= 0 && progress < BATTLE_RESOLVE;
  useEffect(() => {
    const sync = () => audio.current?.setMusic(musicActive && !document.hidden);
    sync(); document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [musicActive]);
  const begin = async () => {
    if (committed.current || storageError || setup?.block || !setup) return;
    committed.current = true; setPending(true);
    if (!gentle) { audio.current?.unlock(); audio.current?.mute(muted); }
    try { const result = await onCommit(tier); setReport(result); setError(''); playbackDone.current = gentle; lastSound.current = 0; setProgress(gentle ? 1 : 0); requestAnimationFrame(() => dialog.current?.querySelector('.cq-battle-stage')?.scrollIntoView({ block: 'center' })); }
    catch (cause) { committed.current = false; setError(cause instanceof Error ? cause.message : '無法開始戰鬥。'); } finally { setPending(false); }
  };
  const skip = () => { playbackDone.current = true; audio.current?.stop(); setProgress(1); };
  const phase = !artReady ? '正在整備戰場…' : progress < .1 ? '英雄領軍 · 全隊就位' : progress >= BATTLE_RESOLVE ? '勝負揭曉' : '重整陣形';
  const reclaiming = setup?.mode === 'claim' && setup.defenders.some(unit => unit.npc);
  const shortfall = setup?.mode === 'claim' ? Math.max(0, setup.fullCost - state.energy) : 0;
  const winTitle = report?.mode === 'drill' ? (report.playerWon ? '防守成功' : '防線失守') : (report?.playerWon ? reclaiming ? '奪回成功' : '佔領成功' : '進攻未成功');
  const unitPose = (unit: { id: string; hp?: number; maxHp?: number; level: number }, side: number): PortraitPose => {
    const hp = report ? battleHealth(setup!, beats, side === 0 ? -1 : 1, unit.id, progress) : health(unit as Companion);
    if (hp <= 0) return 'defeated';
    const key = `${side === 0 ? -1 : 1}:${unit.id}`;
    if (beat?.target === key && progress >= beat.impact && progress < beat.end) return 'hit';
    if (beat?.source === key && progress >= beat.launch && progress < beat.impact) return 'attack';
    if (resolved) return (report!.result.won ? side === 0 : side === 1) ? 'victory' : 'rest';
    return healthPose(hp, maxHealth(unit as Companion));
  };
  return annotateTree(<dialog ref={dialog} className="cq-battle-dialog" aria-labelledby="cq-battle-title" aria-describedby="cq-battle-context" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }} data-gentle={gentle} data-phase={finished ? 'result' : report ? 'combat' : 'planning'}>
    <div className="cq-battle-shell" data-mode={plan.mode}>
      <header className="cq-battle-header"><div><span>{plan.mode === 'claim' ? reclaiming ? '⚔ 奪回島嶼 · 戰前整備' : '⚔ 佔領島嶼 · 戰前整備' : '🛡 防守演練'}</span><h2 id="cq-battle-title" tabIndex={-1}>{setup?.islandName ?? '重新選擇島嶼'}</h2></div><button disabled={pending} className="cq-battle-close" aria-label={report ? '關閉戰報，保留結算結果' : '取消戰鬥準備'} onClick={onClose}>×</button></header>
      <p id="cq-battle-context" className="cq-battle-context">{plan.mode === 'drill' ? '免費模擬進攻，使用目前駐島守衛；血量、領地、能量、道具與護盾都不會改變。' : report ? '本次出征已結算。略過或關閉演出都會保留戰果。' : '選擇或調整 3–5 位夥伴，再按「確認出征」。現在不扣能量；勝利後存活者留島駐守，倒地者撤回休養。'}</p>
      {!report && setup?.mode === 'claim' && <section className="cq-sortie-check" aria-label="出征確認資訊"><div><span>出征需要</span><strong>{setup.fullCost} 能量</strong></div><div><span>目前擁有</span><strong>{state.energy} 能量</strong></div><div><span>隊伍人數</span><strong>{team.length} / 5 位</strong></div><p>{reclaiming ? '擊退黯潮守軍，驅散黑霧，讓星光重返航路。' : '選好隊伍，確認目標後再出發。'}{shortfall > 0 ? `還差 ${shortfall} 能量，可先答題補充。` : setup.block ?? (setup.result.won ? '依目前血量預估可取勝。' : '目前預估難以取勝，建議調整隊伍或先治療。')}</p></section>}
      {combatActive && <p className="cq-war-note" role="status">⚔ 交戰中 · {setup?.islandName} · 正在播放本次出征戰況，戰果已儲存。</p>}
      {setup && <>
        <div className="cq-affinity-info"><ConquestElementBadge element={setup.element} /><p>同屬性守軍傷害 +{setup.facility === 'shrine' ? 10 : 5}%{setup.facility === 'shrine' ? '（元素祠總加成）' : ''} · 僅限防守，野怪也適用。</p></div>
        <div className="cq-battle-matchup"><div><span>{plan.mode === 'drill' ? '模擬進攻野怪' : '你的遠征隊'} · {setup.attackers.length} 位</span><strong>{setup.result.attack}</strong><small>攻擊戰力{setup.result.elemental ? ' · 元素相剋 ×1.25' : ''}</small></div><b aria-hidden="true">⚔</b><div><span>{plan.mode === 'drill' ? '你的駐島守衛' : setup.defenders.some(unit=>unit.npc) ? '黯潮守軍' : setup.defenders.some(unit=>!unit.wild) ? '其他玩家駐軍' : '島嶼野怪守衛'} · {setup.defenders.length} 位</span><strong>{setup.result.defense}</strong><small>防禦戰力{setup.result.affinityBonus ? ` · 駐防親和 +${setup.result.affinityBonus * 100}%（僅同屬性）` : ''}{setup.result.overextended ? ' · 領地懲罰 ×0.9' : ''}</small></div></div>
        {setup.commander && <div className="cq-battle-commander"><CharacterPortrait characterId={setup.commander.id} paused={gentle} pose={resolved ? report!.playerWon ? "victory" : "rest" : "reveal"} src={setup.commander.image} alt="" /><div><small>{plan.mode === 'drill' ? '駐島領軍英雄' : '本次領軍英雄'}</small><strong>{setup.commander.name}</strong><span>{setup.commander.role} · 協同出手 · 不額外加戰力</span></div></div>}
        {setup.defenderCommander && <div className="cq-battle-commander"><CharacterPortrait characterId={setup.defenderCommander.id} paused={gentle} src={setup.defenderCommander.image} alt=""/><div><small>防守方英雄</small><strong>{setup.defenderCommander.name}</strong><span>與駐軍共同守護領地 · 不額外加戰力</span></div></div>}
        {report && <div className="cq-battle-stage" data-progress={progress.toFixed(3)} data-beat={beat?.id ?? ""} data-hero-assist={assisting} data-strike={beat ? progress >= beat.impact ? "impact" : progress >= beat.launch ? "launch" : "charge" : "idle"}><ConquestBattlefield setup={setup} progress={progress} cinematic={cinematic} gentle={gentle} onReady={setArtReady} /><div className="cq-strike-atmosphere" aria-hidden="true" style={{ opacity: gentle ? 0 : impactGlow * .35, '--strike-color': beat?.color ?? '#95f5ff' } as React.CSSProperties} /><span className="cq-battle-stage-label">星海遠征</span>{report && !finished && progress < .07 && setup.commander && <div className="cq-commander-entrance" aria-hidden="true"><CharacterPortrait characterId={setup.commander.id} paused={gentle} pose={resolved ? report!.playerWon ? "victory" : "rest" : "reveal"} src={setup.commander.image} alt="" /><div><small>{plan.mode === 'drill' ? '領軍英雄 · 守衛集結' : '領軍英雄 · 全隊出征'}</small><strong>{setup.commander.name}</strong><span>{plan.mode === 'drill' ? '堅守陣線，守護這座島嶼' : '集結星海，奪下這座島嶼'}</span></div></div>}<div className="cq-stage-controls"><button aria-pressed={cinematic} onClick={() => setCinematic(value => !value)}>{cinematic ? '鏡頭跟隨' : '自由視角'}</button><button aria-label={muted ? '開啟戰鬥音樂與音效' : '關閉戰鬥音樂與音效'} aria-pressed={!muted} onClick={() => { const value = !muted; setMuted(value); if (!value && report && !finished && !gentle) audio.current?.unlock(); audio.current?.mute(value); }}>{muted ? '聲音：關' : '聲音：開'}</button></div>{report && progress < BATTLE_RESOLVE && <div className={`cq-combat-phase ${beat?.finale ? 'cq-finisher' : ''}`} data-side={beat?.side} style={{ '--move-color': beat?.color ?? '#e9c372' } as React.CSSProperties}>{beat ? <>{performer?.image && <CharacterPortrait key={beat.id} characterId={assisting ? activeCommander!.id : performer!.id} paused={gentle} pose="attack" className="cq-skill-portrait" src={assisting ? activeCommander!.image : performer.image} alt="" />}<small>{assisting ? `${activeCommander!.name} × ${beat.sourceName}` : beat.sourceName} <span aria-hidden="true">→</span> {beat.targetName}</small><strong>{assisting ? heroMove(activeCommander!.id) : beat.name}</strong>{assisting && <span className="cq-hero-assist-label">協同出手 · {beat.name}</span>}<span className="cq-hit-phase">第 {beat.round} 回合 · {progress >= beat.impact ? `−${beat.damage} HP${beat.knockedOut ? ' · 倒地撤回' : ''}` : beatPhase(beat, progress)}</span></> : <strong>{phase}</strong>}<div className="cq-combat-timeline" aria-label="交戰演出進度"><i style={{ width: `${progress * 100}%` }} /></div></div>}{resolved && <div className={`cq-battle-verdict ${report!.playerWon ? 'cq-victory' : 'cq-defeat'}`} role="status">
          <div className="cq-victory-crest" aria-hidden="true"><svg viewBox="0 0 280 70"><path d="M105 59C54 60 34 37 27 9M175 59C226 60 246 37 253 9" fill="none" stroke="currentColor" strokeWidth="2" />{Array.from({length:7},(_,i)=><g key={i}><ellipse cx={38+i*9} cy={19+i*5} rx="5" ry="12" transform={`rotate(${-45+i*3} ${38+i*9} ${19+i*5})`} /><ellipse cx={242-i*9} cy={19+i*5} rx="5" ry="12" transform={`rotate(${45-i*3} ${242-i*9} ${19+i*5})`} /></g>)}<path d="M140 4L148 25L172 29L153 43L158 67L140 54L122 67L127 43L108 29L132 25Z" /></svg></div>
          <div className="cq-victory-heading"><em>{report!.playerWon ? '星 海 遠 征 · 捷 報' : '重 整 旗 鼓 · 再 次 出 發'}</em><strong>{winTitle}</strong><span>{setup.islandName}</span></div>
          <div className="cq-victory-ledger">{setup.commander && <CharacterPortrait characterId={setup.commander.id} paused={gentle} pose={resolved ? report!.playerWon ? "victory" : "rest" : "reveal"} src={setup.commander.image} alt="" />}<div><b>{report!.mode === 'drill' ? '防守演練完成' : report!.playerWon ? '星海旗幟已升起' : '遠征隊已返回休養'}{setup.commander ? ` · ${setup.commander.name}` : ''}</b><small>{report!.mode === 'drill' ? '演練結束・不影響領地' : report!.playerWon ? '存活夥伴駐防・1 小時後啟動護盾' : '全隊保留傷勢撤回・只扣半價能量'}</small></div></div>
        </div>}</div>}
        {report && <div className="cq-battle-armies">{[setup.attackers, setup.defenders].map((list, side) => <div key={side}>{list.map(unit => <span className="cq-battle-unit" key={unit.id} style={{ '--unit-element': ELEMENT_COLOR[unit.element] } as React.CSSProperties}>{unit.image ? <CharacterPortrait characterId={unit.speciesId ?? unit.id} paused={gentle} pose={unitPose(unit, side)} src={unit.image} alt="" /> : <b aria-hidden="true">👾</b>}<span>{unit.npc ? `黯潮守軍・${unit.name}` : unit.wild ? `野生・${unit.name}` : unit.name}<small>{ELEMENT_LABEL[unit.element]} · Lv.{unit.level}</small>{side === 1 && defenderAffinity(setup, unit) > 0 && <small className="cq-affinity-unit">駐防親和 +{defenderAffinity(setup, unit) * 100}%</small>}<HealthBar hp={report ? battleHealth(setup!, beats, side === 0 ? -1 : 1, unit.id, progress) : health(unit)} max={maxHealth(unit)} label={`${unit.name}血量`} /></span></span>)}</div>)}</div>}
        {!report && (plan.mode === 'claim' ? <section className="cq-battle-team" aria-label="戰前編隊"><div><h3>戰前編隊</h3><span>已選 {team.length} / 5 · 基礎戰力 {power(setup.attackers)}</span></div><Formation roster={roster} team={team} onOrder={onOrder} disabled={pending} /><div className="cq-battle-roster">{roster.map(unit => <button key={unit.id} aria-pressed={team.includes(unit.id)} disabled={pending || !!deploymentBlock(state, unit) || !team.includes(unit.id) && team.length >= 5} aria-label={`出征${unit.name}，${ELEMENT_LABEL[unit.element]}屬性，${conquestLevelDescription(unit, growthXp)}`} onClick={() => onToggle(unit.id)}><CharacterPortrait characterId={unit.id} paused={gentle} pose={healthPose(health(unit), maxHealth(unit), team.includes(unit.id))} src={unit.image} alt="" /><span>{unit.name}</span><small>{team.includes(unit.id) ? '✓ ' : ''}{ELEMENT_LABEL[unit.element]}</small><ConquestLevels unit={unit} growthXp={growthXp} /><HealthBar hp={health(unit)} max={maxHealth(unit)} label={`${unit.name}血量`} /></button>)}</div></section> : <section className="cq-drill-options" aria-label="演練敵軍強度"><label>演練敵軍<select disabled={pending} value={tier} onChange={event => setTier(event.target.value as DrillTier)}>{Object.entries(DRILL_TIERS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><p>{setup.source}。若要更換守衛，請返回島嶼情報使用免費增援。</p></section>)}
        {finished && <section className="cq-battle-summary" aria-label="戰鬥結算"><div><span>本次消耗</span><strong>⚡ {report!.result.cost}</strong></div><div><span>剩餘能量</span><strong>{report!.energyAfter}</strong></div><div><span>{plan.mode === 'drill' ? '守備結果' : '島嶼狀態'}</span><strong>{plan.mode === 'drill' ? '領地與護盾不變' : report!.playerWon ? '你的領地 · 爭奪期' : '仍由原守軍駐守'}</strong></div><p>{plan.mode === 'drill' ? report!.playerWon ? '守衛擋下了這支模擬敵軍，可以繼續挑戰更強的隊伍。' : '這支模擬敵軍突破防線。試著增援更多守衛，並留意敵方多數元素。' : report!.playerWon ? '存活夥伴已駐防，倒地夥伴已撤回休養。可增援或使用補給治療；一小時後護盾才會啟動。' : '雙方傷勢已保留。先到休養與補給治療，再組成健康隊伍重試。'}</p><p className="cq-casualty-summary">{plan.mode === 'drill' ? '模擬倒地（不影響真實血量）：' : '返回休養區：'}{(plan.mode === 'drill' ? report!.defenders : report!.attackers).filter(unit => (plan.mode === 'drill' ? report!.result.defendersAfter : report!.result.attackersAfter).some(g => g.id === unit.id && health(g) === 0)).map(u => u.name).join('、') || '無倒地夥伴'}</p></section>}
      </>}
      {(error || validation || storageError) && <p className="cq-battle-error" role="alert">{error || validation || storageError}</p>}
      <footer className="cq-battle-footer">{!report ? <><div><b>{plan.mode === 'claim' && setup ? `出征需要 ${setup.fullCost} 能量` : '演練免費'}</b><small>{setup?.block ?? (plan.mode === 'claim' ? '存活並清除守軍才算勝利；失敗半價，傷勢保留。' : '演練使用目前血量的副本，不產生真實傷勢。')}</small></div><button className="cq-battle-secondary" disabled={pending} onClick={onClose}>返回海圖</button>{shortfall > 0 && <button className="cq-battle-secondary" disabled={pending} onClick={onLearn}>答題補充能量</button>}<button className="cq-battle-primary" disabled={pending || !setup || !!setup.block || !!validation || !!storageError} onClick={begin}>{pending ? '正在結算與存檔…' : plan.mode === 'claim' ? reclaiming ? '確認出征 · 奪回島嶼' : '確認出征 · 佔領島嶼' : '開始防守演練'}</button></> : <><div><b>{finished ? '本次戰報已完成' : '戰鬥回放'}</b><small>{plan.mode === 'drill' ? '演練不消耗能量，也不會失去島嶼。' : '依實際傷害結算；回放與略過不會再次扣血。'}</small></div>{!finished && <button className="cq-battle-secondary" onClick={skip}>略過演出</button>}{finished && plan.mode === 'claim' && <button className="cq-battle-secondary" onClick={onSupplies}>休養與補給</button>}<button className="cq-battle-primary" onClick={onClose}>{finished ? '返回海圖' : '結束觀看'}</button></>}</footer>
    </div>
  </dialog>, grade);
}
