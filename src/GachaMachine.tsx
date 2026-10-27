import ReadAloud from './ReadAloud';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { companionDrawPool, petById, type Profile, type DrawResult } from './game-view';
import { StarInvitation } from './StarInvitation';
import { DRAW_WEIGHTS, STAR_TICKET_WEIGHTS } from './rarity-odds';
import { RARITY_ORDER } from './characters';
import { RewardProgress } from './RewardChoice';
import { ReadingContext, annotateTree } from './readability';
import GachaVisual, { type GachaPhase as Phase } from './GachaVisual';

type Props = {
  profile: Profile; day: string; online: boolean; busy: boolean; reduced: boolean;
  onDraw: (starTicket: boolean) => Promise<DrawResult | undefined>; onEquip: (pet: string) => Promise<unknown>;
  onLearn: () => void; onCollection: () => void; onTrade: () => void;
  onSpeak: (text: string) => void; musicControl: ReactNode;
};
const stageLabels: Record<Phase, string> = {
  idle: '轉動星願，遇見新夥伴', turning: '旋鈕轉動，星願出發…', mixing: '膠囊翻滾，星光聚集…',
  waiting: '正在確認雲端結果…', dropping: '你的星願膠囊來了！', opening: '膠囊打開，夥伴登場…', revealed: '星願抵達，夥伴登場！',
};
export default function GachaMachine(props: Props) {
  const { profile: p, online, busy, reduced } = props;
  const { grade } = useContext(ReadingContext);
  const [starTicket, setStarTicket] = useState(false);
  const balance = starTicket ? (p.starTickets ?? 0) : p.tickets;
  const ticketName = starTicket ? '星耀特邀券' : '星願券';
  const [confirm, setConfirm] = useState(false), [phase, setPhase] = useState<Phase>('idle');
  const [artFailed, setArtFailed] = useState(false), [drawError, setDrawError] = useState('');
  const lock = useRef(false), dialog = useRef<HTMLDialogElement>(null), resultHeading = useRef<HTMLHeadingElement>(null);
  const heading = useRef<HTMLHeadingElement>(null), alive = useRef(true), epoch = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const skip = useRef(reduced), wake = useRef<(() => void) | null>(null);
  const [ownResult, setOwnResult] = useState<Profile["lastDraw"]>();
  const last = ownResult ?? p.lastDraw, pet = last ? petById(last.pet) : undefined;
  const drawing = phase !== 'idle' && phase !== 'revealed';
  const pool = companionDrawPool(p).filter(pet => !starTicket || STAR_TICKET_WEIGHTS[pet.rarity] > 0), copies = pet ? p.owned[pet.id] ?? 0 : 0;
  const voyage = p.run?.status === 'active' || p.run?.reward === 'pending';
  const awaitingReward = p.run?.reward === 'pending';
  const explanation = '可以選一般星願券，或管理員贈送的星耀特邀券。特邀券抽到 S 級的機率是百分之三十，A 級百分之七十。每張券轉一次扭蛋，一定得到一張夥伴卡。先抽階級，同階級的夥伴機率相同，可能抽到重複卡。不扣星幣和學習經驗。六題挑戰成功後自動存一顆星，兩顆星換一張券。';
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; epoch.current++; wake.current?.(); };
  }, []);
  useEffect(() => { if (reduced) { skip.current = true; wake.current?.(); } }, [reduced]);
  useEffect(() => setArtFailed(false), [last?.id]);
  useEffect(() => setDrawError(''), [p.lastDraw?.id]);
  useEffect(() => {
    if (phase !== 'turning' && !(reduced && phase === 'waiting')) return;
    stage.current?.focus({ preventScroll: true });
    stage.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [phase, reduced]);
  useEffect(() => {
    if (phase !== 'revealed' || !ownResult) return;
    resultHeading.current?.focus({ preventScroll: true });
    stage.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [phase, ownResult?.id]);
  useEffect(() => {
    if (!confirm || !dialog.current) return;
    const node = dialog.current, previous = document.activeElement, overflow = document.body.style.overflow;
    node.showModal(); document.body.style.overflow = 'hidden';
    node.querySelector<HTMLButtonElement>('.gacha-cancel')?.focus();
    return () => { node.close(); document.body.style.overflow = overflow; if (!lock.current && previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [confirm]);
  function pause(ms: number) {
    if (skip.current || !alive.current) return Promise.resolve();
    return new Promise<void>(resolve => {
      const finish = () => { clearTimeout(timer); if (wake.current === finish) wake.current = null; resolve(); };
      const timer = setTimeout(finish, ms); wake.current = finish;
    });
  }
  async function draw() {
    if (lock.current || busy || !online || !balance) return;
    lock.current = true; skip.current = reduced;
    const sequence = ++epoch.current, current = () => alive.current && epoch.current === sequence;
    setConfirm(false); setOwnResult(undefined); setDrawError(''); setPhase(reduced ? 'waiting' : 'turning');
    try {
      const intro = async () => {
        await pause(650); if (!current()) return;
        if (!skip.current) setPhase('mixing');
        await pause(1250); if (current()) setPhase('waiting');
      };
      const [result] = await Promise.all([props.onDraw(starTicket), intro()]);
      if (!current()) return;
      if (result?.kind !== 'pet' || !result.pet) {
        setPhase('idle'); setDrawError('請查看雲端同步訊息。已完成的扭蛋會保存在最近一次結果。'); return;
      }
      // Keep this response receipt, even if another device has since drawn again.
      setOwnResult({ id: result.receiptId ?? `${result.pet}:${result.copies}`, pet: result.pet, duplicate: !!result.duplicate, copies: result.copies ?? 1, ...(result.ticketKind ? { ticketKind: result.ticketKind } : {}) });
      if (!skip.current) { setPhase('dropping'); await pause(750); }
      if (!current()) return;
      if (!skip.current) { setPhase('opening'); await pause(850); }
      if (current()) setPhase('revealed');
    } catch {
      if (current()) { epoch.current++; wake.current?.(); lock.current = false; setPhase('idle'); setDrawError('結果尚未確認，請先確認同步，再查看最近一次扭蛋。'); }
    } finally { if (current()) lock.current = false; }
  }
  const resultArt = pet && last && <div className="gacha-result-art" key={last.id}>{artFailed ? <span aria-hidden="true">✦</span> : <img src={pet.image} alt={pet.name} width="400" height="400" onError={() => setArtFailed(true)} />}</div>;
  return annotateTree(<section className={`gacha-machine phase-${phase} ${reduced ? 'gacha-reduced' : ''}`} data-phase={phase}>
    <header className="gacha-heading"><div><h1 ref={heading} tabIndex={-1}>星海扭蛋機</h1><p>轉動一顆星願，迎接下一位冒險夥伴。</p></div><div className="gacha-controls">{props.musicControl}<ReadAloud grade={grade}><button data-read-aloud className="voice-button" aria-label="聽扭蛋機說明" onClick={() => props.onSpeak(explanation)}>🔊</button></ReadAloud></div></header>
    <div className="gacha-layout">
      <div className="gacha-play" ref={stage} tabIndex={-1} role="group" aria-label="星願扭蛋演出">
        <GachaVisual phase={phase}>{resultArt}</GachaVisual>
        <div className="gacha-stage-caption"><p role="status">{stageLabels[phase]}</p>{phase === 'revealed' && pet && <h2 className="gacha-result-heading" ref={resultHeading} tabIndex={-1}>{pet.name}</h2>}{drawing && !reduced && <button type="button" className="gacha-skip" onClick={() => { skip.current = true; wake.current?.(); }}>略過動畫</button>}{phase === 'revealed' && <button type="button" onClick={() => { setPhase('idle'); heading.current?.focus({ preventScroll: true }); }}>回到扭蛋機</button>}</div>
      </div>
      <div className="gacha-outcome">
        <fieldset className="gacha-ticket-choice" disabled={drawing || busy || confirm}><legend>選擇這次使用的券</legend><label><input type="radio" name="ticket-kind" checked={!starTicket} onChange={() => setStarTicket(false)} />星願券 · {p.tickets} 張</label><label><input type="radio" name="ticket-kind" checked={starTicket} onChange={() => setStarTicket(true)} />星耀特邀券 · {p.starTickets ?? 0} 張</label></fieldset>
        {starTicket ? <StarInvitation balance={balance} /> : <div className="gacha-balance"><span>🎟️ 星願券</span><strong>{p.tickets}<small> 張</small></strong></div>}
        {starTicket && <p className="star-invitation-note">管理員限定贈送。只抽 A 或 S 級，可能重複；每次獨立抽選，沒有保底。</p>}
        <p className="gacha-cost">一張{ticketName}，一位冒險夥伴。</p>
        <button className="f-primary gacha-draw" disabled={!online || busy || drawing || balance === 0} onClick={() => setConfirm(true)}>{drawing ? '星願旅程進行中…' : `用 1 張${ticketName}轉扭蛋`}</button>
        <p className="gacha-status" role="status">{drawError || (!online ? '先確認雲端同步，再繼續扭蛋。' : drawing ? '結果確認後，夥伴就會登場。' : balance === 0 ? (starTicket ? '這張券由管理員特別發放，收到後就能使用。' : awaitingReward ? '還沒有星願券，先去領取完成獎勵。' : '六題挑戰成功，自動存下星願；每兩場換一張券。') : '每次一定得到夥伴卡，也可能遇見熟悉的夥伴。')}</p>
        {!drawing && !starTicket && p.tickets === 0 && <button className="gacha-earn-now" onClick={props.onLearn}>{awaitingReward ? '領取完成獎勵' : '去挑戰六題'}</button>}
        {!drawing && pet && last ? <article className={`gacha-result ${phase === 'revealed' ? 'gacha-featured-result' : 'gacha-recent-result'}`} key={last.id}>
          <p className="gacha-receipt-label">{ownResult ? '這次扭蛋' : '最近一次扭蛋'} · {last.ticketKind === 'star' ? '星耀特邀券' : '星願券'} · 已存到雲端</p>
          {phase !== 'revealed' && resultArt}
          <div role="status" className="gacha-result-text">{phase !== 'revealed' && <h2 className="gacha-result-heading" ref={resultHeading} tabIndex={-1}>{pet.name}</h2>}<p>{pet.rarity} 級 · {pet.element}</p><strong>{last.duplicate ? '遇見熟悉的夥伴' : '收到了新夥伴'}</strong><p>目前持有 {copies} 張</p></div>
          {copies > 0 ? <button className="f-primary gacha-equip" disabled={!online || busy} onClick={() => void props.onEquip(pet.id)}>{voyage ? '選牠下趟陪練' : '選牠陪練'}</button> : <p>這張卡已離開收藏，可以到夥伴卡冊看看。</p>}
          {voyage && <p className="gacha-note">本趟仍由原夥伴完成，經驗值也保留給牠。</p>}
          <div className="gacha-result-actions"><ReadAloud grade={grade}><button data-read-aloud aria-label="聽扭蛋結果" onClick={() => props.onSpeak(`${pet.name}，${pet.rarity} 級。${last.duplicate ? '遇見熟悉的夥伴' : '收到了新夥伴'}，目前持有 ${copies} 張。`)}>🔊 聽結果</button></ReadAloud><button onClick={props.onCollection}>查看收藏</button>{copies > 1 && <button onClick={props.onTrade}>看看可交換的夥伴</button>}</div>
          {last.duplicate && copies > 0 && <p className="gacha-note">重複卡會留在收藏中，可和家人一起選卡交換；需要雙方確認。</p>}
        </article> : !drawing && <div className="gacha-first-result"><div className="gacha-companion-preview" aria-hidden="true">{(starTicket ? pool.slice(0, 3).map(pet => pet.id) : ['pebblefin', 'seasprout', 'foamferret']).map(id => <img key={id} src={petById(id)!.image} alt="" width="96" height="96" loading="lazy" />)}</div><p>{pool.length} 位夥伴，各有自己的模樣。<br />每一位都能陪你答題、一起成長。</p></div>}
      </div>
    </div>
    <section className="gacha-earn" aria-label="取得星願券"><div><h2>一起答題，慢慢存星願</h2><p>六題挑戰成功 → 自動存一顆星 → 每兩場換一張券。</p><p>{awaitingReward ? '上一趟的完成獎勵還沒領，先去領好獎勵。' : '成功就能繼續存，沒有每日次數上限；星星也能留到明天。'}</p><button onClick={props.onLearn}>{awaitingReward ? '領取完成獎勵' : '去挑戰六題'}</button></div><RewardProgress stars={p.rewardStars} /></section>
    <details className="gacha-odds"><summary>看看有哪些夥伴與機率</summary><p>自己的初始夥伴以外，共 {pool.length} 種。先依下表抽階級，再從同階級等機率抽一隻；單隻機率是階級機率除以種類數。同一隻可能再次出現，每次獨立抽選，沒有保底。階級與等級影響生命、攻擊和防禦；每隻都能練等成長。</p><table><caption>{ticketName}抽取機率</caption><thead><tr><th>階級</th><th>種類</th><th>機率</th></tr></thead><tbody>{RARITY_ORDER.map(r => { const count = pool.filter(c => c.rarity === r).length; return <tr key={r}><th>{r}</th><td>{count}</td><td>{((starTicket ? STAR_TICKET_WEIGHTS : DRAW_WEIGHTS)[r] / 100).toFixed(2)}%</td></tr>; })}</tbody></table><p>表格顯示目前選擇的券。星耀特邀券為 S 級 30%、A 級 70%，不含其他階級；一般星願券機率維持不變。新玩家第一次的免費扭蛋另有 E 級 80%、D 級 20% 的規則。</p></details>
    {confirm && <dialog ref={dialog} className="gacha-confirm" aria-labelledby="gacha-confirm-title" onCancel={e => { e.preventDefault(); setConfirm(false); }} onClick={e => { if (e.target === e.currentTarget) setConfirm(false); }}><div className="gacha-confirm-inner"><h2 id="gacha-confirm-title">用 1 張{ticketName}轉扭蛋？</h2><p>一定得到 1 張夥伴卡，可能重複。{starTicket && "S 級 30%、A 級 70%，沒有保底。"}</p><p>目前 {balance} 張，確認後剩 {Math.max(0, balance - 1)} 張。<br />不扣星幣和學習經驗。</p><div className="gacha-confirm-actions"><button className="gacha-cancel" onClick={() => setConfirm(false)}>先不轉</button><button className="f-primary" disabled={!online || busy || !balance} onClick={() => void draw()}>確認轉扭蛋</button></div></div></dialog>}
  </section>, grade);
}
