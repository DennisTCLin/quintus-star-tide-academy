import ReadAloud from './ReadAloud';
import { CreatureBadge, StatLine } from "./CreatureInfo";
import { nativeCombatStats } from "./creature-rules";
import { BrandText } from "./BrandIcon";
import { useContext, useRef, useState, type ReactNode } from "react";
import type { Character } from "./characters";
import { ROSTER, petById, type Profile } from "./game-view";
import { creatureProgress, nextGrowthStyle } from "./companion-growth";
import { ReadingContext, annotateTree } from "./readability";
import "./training-panel.css";
import { speak } from "./voice";

function Portrait({ pet, eager = false }: { pet: Character; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  return broken ? <span className="training-art-fallback" role="img" aria-label={pet.name}><BrandText text="🐾" /></span> :
    <img src={pet.image} alt="" width={160} height={160} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setBroken(true)} />;
}

export default function TrainingPanel({ profile, day, online, busy, onSelect, onTrain, children }: {
  children?: ReactNode;
  profile: Profile; day: string; online: boolean; busy: boolean;
  onSelect: (pet: string) => Promise<boolean | undefined>; onTrain: () => void;
}) {
  const { grade } = useContext(ReadingContext);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const owned = ROSTER.filter(pet => profile.owned[pet.id] > 0);
  const journey = profile.run?.status === "active" || profile.run?.reward === "pending" ? profile.run : null;
  const current = petById(profile.equipped)!;
  const journeyPet = journey ? petById(journey.companion)! : null;
  const progress = creatureProgress(current.rarity, profile.growth.xp[current.id] ?? 0);
  const completedToday = profile.growth.day === day ? profile.growth.credited.length : 0;
  const initial = owned.slice(0, 4);
  if (!initial.some(pet => pet.id === current.id) && initial.length === 4) initial[3] = current;
  const choices = expanded ? owned : initial;
  async function select(pet: Character) {
    if (inFlight.current || busy || !online || pet.id === profile.equipped) return;
    inFlight.current = true;
    setSaving(pet.id); setMessage("");
    try {
      const saved = await onSelect(pet.id);
      setMessage(saved ? `${pet.name}已選好${journey ? "，下一趟陪你出發" : "，一起去陪練吧"}。` : "這次還沒選好，請確認雲端同步後再試。");
    } catch {
      setMessage("這次還沒選好，請確認雲端同步後再試。");
    } finally { inFlight.current = false; setSaving(null); }
  }
  return annotateTree(<section className={`training-panel f-panel ${children ? "has-home" : ""}`} aria-label="夥伴陪練" aria-busy={Boolean(saving)}>
    <div className="training-launch">
      <div className="training-launch-copy"><strong>{journey?.reward === "pending" ? "領好獎勵，再出發" : journey ? "你的冒險還在這裡" : "夥伴準備好了"}</strong>
        <span>{journeyPet?.name ?? current.name} · {journey?.status === "active" ? `第 ${journey.index + 1} / ${journey.questions.length} 題` : "一起完成六題"}</span></div>
      <button className="f-primary training-resume" disabled={!online || busy || Boolean(saving)} onClick={onTrain}>{journey?.reward === "pending" ? "🎁 領取獎勵" : journey ? "▶ 繼續挑戰" : "▶ 開始陪練"}</button>
      <ReadAloud grade={grade}><button data-read-aloud className="training-launch-audio" aria-label="聽出發說明" onClick={() => speak(journey?.reward === "pending" ? "你已經完成挑戰。按禮物領取獎勵。" : journey ? "你的冒險已經存好了。按三角形，和夥伴繼續挑戰。" : "按三角形，和夥伴一起完成六題。答錯三題，這場就要休息。", setMessage)}>🔊</button></ReadAloud>
    </div>
    {children}
    <div className="training-current">
      <div className="training-portrait"><Portrait key={current.id} pet={current} eager /></div>
      <div className="training-progress">
        <span className="training-eyebrow">已選擇的陪練夥伴</span>
        <div className="training-name"><h2>{current.name}</h2><CreatureBadge rarity={current.rarity} level={progress.level} /></div>
        <div className="training-xp-label"><span>再 {progress.remaining} XP 升到 Lv.{progress.level + 1}</span><small>{progress.current} / {progress.needed} XP</small></div>
        <div className="training-xp" role="progressbar" aria-label={`${current.name}升級進度`} aria-valuemin={0} aria-valuemax={progress.needed} aria-valuenow={progress.current}><i style={{ width: `${progress.percent}%` }} /></div>
        <StatLine stats={nativeCombatStats(current.rarity, progress.level)} />
        <small className="training-unlock">{nextGrowthStyle(progress.trainingLevel)}</small>
      </div>
    </div>
    <div className="training-picker">
      <div className="training-picker-heading"><h3>選擇陪練夥伴</h3><small>已擁有 {owned.length} 位</small></div>
      <div className={`training-choices ${expanded ? "is-expanded" : ""}`} role="group" aria-label="選擇陪練夥伴">
        {choices.map(pet => <button key={pet.id} className={`training-choice ${profile.equipped === pet.id ? "is-selected" : ""}`} aria-pressed={profile.equipped === pet.id} aria-label={`選擇${pet.name}陪練，Lv.${creatureProgress(pet.rarity, profile.growth.xp[pet.id] ?? 0).level}`} disabled={!online} aria-disabled={!online || busy || Boolean(saving)} onClick={() => void select(pet)}>
          <Portrait pet={pet} />
          <span className="training-choice-info"><b>{pet.name}</b><CreatureBadge rarity={pet.rarity} level={creatureProgress(pet.rarity, profile.growth.xp[pet.id] ?? 0).level} /><small>{saving === pet.id ? "儲存中…" : profile.equipped === pet.id ? "✓ 已選擇" : "選我陪練"}</small></span>
        </button>)}
      </div>
      {owned.length > 4 && <button className="training-expand" aria-label={expanded ? "收起夥伴" : `查看全部 ${owned.length} 位夥伴`} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "收起夥伴" : `查看全部 ${owned.length} 位夥伴`}</button>}
      <p className="training-save-state" role="status">{!online ? "目前離線，連線後就能選夥伴。" : saving ? "正在儲存陪練選擇…" : message}</p>
    </div>
    {journey && journeyPet && <aside className="training-journey-note" aria-label="先前航程">
      <div><strong>{journey.reward === "pending" ? "上一趟已完成" : "還有一趟挑戰進行中"} · {journeyPet.name}</strong>
        <p>{journey.reward === "pending" ? `先領取上一趟獎勵，就能和${current.name}開始新航程。` : `本趟仍由${journeyPet.name}完成；${current.name}已準備好陪你開始下一趟。`} 已獲得的經驗值保留給{journeyPet.name}。</p></div>
    </aside>}
    <details className="training-rules"><summary>今日已完成 {completedToday} 道成長題 · 經驗持續累積</summary><p>每道合資格題目完成後 +10 XP，不再限制每天十五題。同題每天一次；使用提示與複習題答對同樣有效；答錯不發經驗。每五道再獲得一份建材，未滿五題的進度會保留。練習航程和跨日舊航程不發經驗與建材。</p></details>
  </section>, grade);
}
