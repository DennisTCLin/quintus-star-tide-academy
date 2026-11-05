import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ALLIANCES, allianceById } from './conquest-alliance';
import { CONQUEST_HEROES, companionById, heroById } from './conquest-characters';
import { annotateTree, ReadingContext } from './readability';
import './conquest-enrollment.css';

type Props = { onJoin: (alliance: string, hero: string) => Promise<void>; error: string; veteran: boolean; onBackup: () => void };
export default function ConquestEnrollment({ onJoin, error, veteran, onBackup }: Props) {
  const { grade } = useContext(ReadingContext);
  const [allianceId, setAlliance] = useState(''), [heroId, setHero] = useState('');
  const [step, setStep] = useState(1), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const alliance = allianceById(allianceId), hero = heroById(heroId);
  const join = async () => {
    if (!alliance || !hero || busy || error) return;
    setBusy(true); setNotice('');
    try { await onJoin(alliance.id, hero.id); } catch (e) { setNotice(e instanceof Error ? e.message : '選擇尚未儲存，請再試一次。'); } finally { setBusy(false); }
  };
  return annotateTree(<section className="cq-enrollment" aria-label="建立群島遠征隊">
    <header><p>星海群島征服</p><h1 ref={heading} tabIndex={-1}>{step === 1 ? '選擇你的聯盟' : '選擇你的初始英雄'}</h1><p>{step === 1 ? '兩大聯盟，各有七位英雄。選擇與你同行的旗幟。' : `加入${alliance?.name}，選一位英雄帶領你的遠征隊。`}</p><ol aria-label="建立隊伍步驟"><li aria-current={step === 1 ? 'step' : undefined}>1 · 選擇聯盟</li><li aria-current={step === 2 ? 'step' : undefined}>2 · 選擇英雄</li></ol></header>
    {step === 1 ? <div className="cq-alliance-cards">{ALLIANCES.map(a => <button key={a.id} className="cq-alliance-card" aria-pressed={a.id === allianceId} style={{ '--alliance-color': a.color } as CSSProperties} onClick={() => { setAlliance(a.id); setHero(''); }}><img src={`/assets/conquest/portraits/${a.image}.webp`} alt=""/><div><span aria-hidden="true">{a.mark}</span><h2>{a.name}</h2><p>{a.motto}</p><small>七位英雄 · {a.heroes.map(id => heroById(id)!.role.split('・')[0]).join(' ／ ')}</small><b>{a.id === allianceId ? '已選擇聯盟' : '選擇此聯盟'}</b></div></button>)}</div> : <div className="cq-recruit-cards">{CONQUEST_HEROES.filter(h => alliance?.heroes.some(id => id === h.id)).map(h => <button key={h.id} aria-pressed={h.id === heroId} onClick={() => setHero(h.id)}><img src={h.image} alt=""/><span><strong>{h.name}</strong><small>{h.role}</small><b>{h.id === heroId ? '已選擇英雄' : '選擇此英雄'}</b></span></button>)}</div>}
    <p className="cq-enemy-note">共同敵人：黯潮軍團。這支 NPC 敵軍會襲擊玩家領地，不能加入或選為聯盟。</p>
    <div className="cq-enrollment-details"><div><h2>{step === 1 ? '一個聯盟，一位初始英雄' : hero?.name ?? '從聯盟中選一位英雄'}</h2><p>確認後只解鎖選中的一位英雄，其他英雄保持未解鎖。目前不開放更換聯盟或初始英雄；聯盟不額外增加戰力。</p><p>聯盟、英雄與群島進度由伺服器保存，所有玩家共用同一片海圖。</p>{veteran && <p>既有領地、能量、材料與傷勢保留；未擁有的試玩駐軍會撤回，駐島英雄改為本次選擇。</p>}</div>{alliance && <div className="cq-starter-party"><h3>聯盟初始夥伴 · 3 位</h3><div>{alliance.starters.map(id => { const c = companionById(id)!; return <figure key={id}><img src={c.image} alt=""/><figcaption>{c.name}</figcaption></figure>; })}</div><p>僅在群島使用，不加入卡冊。你原本收藏的夥伴也能出征。</p></div>}</div>
    {(error || notice) && <p role="alert" className="cq-enrollment-error">{error || notice}</p>}
    {error && <button className="cq-enrollment-backup" onClick={onBackup}>匯出群島備份</button>}
    <footer><span>{step === 1 ? '下一步將選擇初始英雄' : hero ? `${alliance?.name} · ${hero.name}` : '請先選擇一位英雄'}</span>{step === 2 && <button disabled={busy} onClick={() => setStep(1)}>返回聯盟選擇</button>}<button className="cq-enrollment-primary" disabled={busy || !!error || !alliance || step === 2 && !hero} onClick={() => step === 1 ? setStep(2) : void join()}>{busy ? '正在儲存遠征隊…' : step === 1 ? '下一步：選擇英雄' : '加入聯盟，與英雄啟航'}</button></footer>
  </section>, grade);
}
