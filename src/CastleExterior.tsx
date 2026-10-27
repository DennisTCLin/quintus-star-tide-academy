import { useContext, useEffect, useRef, useState } from "react";
import { castleGrowth, castleStage, castleStyle, CASTLE_STYLES, type CastleStyleId } from "./castle-growth";
import CastleIllustration from "./CastleIllustration";
import { petById, type Profile } from "./game-view";
import { ReadingContext, annotateTree } from "./readability";
import "./castle.css";

export function CastleExpansion({ profile, disabled, onExpand, onTrain }: {
  profile: Profile; disabled: boolean; onExpand: () => void; onTrain?: () => void;
}) {
  const { grade } = useContext(ReadingContext);
  const t = profile.territory!;
  const progress = castleGrowth(t.expansion, profile.growth.xp);
  const pet = petById(progress.companionId ?? profile.equipped);
  return annotateTree(<section className="castle-growth" aria-label="城堡擴建">
    <h2>{progress.next ? "讓我們的家長大" : "我們的星海大城"}</h2>
    {progress.next ? <>
      <div className="castle-next"><CastleIllustration styleId={castleStyle(t.castleStyle).id} expansion={t.expansion + 1} decorative /><div><strong>{progress.next.name}</strong><p>{progress.next.detail}</p></div></div>
      <p>任一夥伴靠練習提升 <strong>{progress.next.companionLevel - 1} 級</strong>，就能免費擴建。</p>
      {pet && <div className="castle-companion"><img src={pet.image} alt="" width="56" height="56" loading="lazy"/><span>{pet.name}的成長{!profile.owned[pet.id] ? "紀錄" : ""}<strong>{progress.eligible ? "已達成！" : `再 ${progress.remaining} XP`}</strong></span></div>}
      <progress aria-label="下一次擴建的夥伴成長進度" max={progress.required} value={Math.min(progress.required, progress.earned)} />
      <button className="territory-primary" disabled={disabled || !progress.eligible} onClick={onExpand}>擴建我的家</button>
      {!progress.eligible && onTrain && <button className="castle-train" disabled={disabled} onClick={onTrain}>和夥伴去陪練</button>}
      <small>不用花建材。擴建後，空間永久保留。</small>
    </> : <><p>24 塊土地已全部開放！</p><p>蓋更多生產建築，再幫建築升級，讓家園持續變強。</p></>}
  </section>, grade);
}

export default function CastleExterior({ profile, disabled, onStyle, onExpand, onTrain }: {
  profile: Profile; disabled: boolean;
  onStyle: (style: CastleStyleId) => Promise<boolean>; onExpand: () => void; onTrain?: () => void;
}) {
  const { grade } = useContext(ReadingContext), t = profile.territory!;
  const saved = castleStyle(t.castleStyle).id;
  const [preview, setPreview] = useState<CastleStyleId>(saved);
  const [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  const lock = useRef(false);
  useEffect(() => { setPreview(saved); }, [saved]);
  const s = castleStyle(preview), stage = castleStage(t.expansion);
  async function save() {
    if (disabled || lock.current || preview === saved) return;
    lock.current = true; setSaving(true); setMessage("");
    try {
      const ok = await onStyle(preview);
      setMessage(ok ? `已換成${s.name}城堡，土地和建築都保留。` : "外觀還沒儲存，請確認連線後再試。");
    } catch { setMessage("外觀還沒儲存，請確認連線後再試。"); }
    finally { lock.current = false; setSaving(false); }
  }
  return annotateTree(<div className="castle-exterior">
    <div className="castle-overview">
      <section className="castle-scene" aria-label="城堡全景">
        <div className="castle-scene-heading"><div><h2>{s.name}城堡</h2><p>{stage.name} · {stage.plots} 塊土地</p></div><span>{preview === saved ? "目前外觀" : "外觀預覽"}</span></div>
        <div className="castle-landscape"><CastleIllustration styleId={preview} expansion={t.expansion} /></div>
        <p className="castle-scene-caption">{s.description}</p>
      </section>
      <CastleExpansion profile={profile} disabled={disabled || saving} onExpand={onExpand} onTrain={onTrain}/>
    </div>
    <section className="castle-wardrobe" aria-label="城堡外觀選擇" aria-busy={saving}>
      <div className="castle-wardrobe-heading"><div><h2>挑一座喜歡的城堡</h2><p>六款都能免費換，土地和建築不會改變。</p></div><button className="territory-primary" disabled={disabled || saving || preview===saved} onClick={() => void save()}>{saving ? "儲存中…" : preview===saved ? "正在使用" : "使用這個外觀"}</button></div>
      <div className="castle-style-list" role="group" aria-label="六款免費城堡外觀">
        {CASTLE_STYLES.map(style=><button key={style.id} className="castle-style" aria-label={`預覽${style.name}城堡${style.id===saved?'，目前使用':''}`} aria-pressed={preview===style.id} disabled={saving} onClick={()=>{setPreview(style.id);setMessage("");}}><CastleIllustration styleId={style.id} expansion={t.expansion} decorative/><strong>{style.name}</strong><span>{style.id===saved?'使用中':preview===style.id?'預覽中':'免費'}</span></button>)}
      </div>
      <p className="castle-save-status" role="status">{disabled && !saving ? "連線並完成同步後，就能儲存外觀與擴建。" : message || "先看預覽，再按「使用這個外觀」。"}</p>
    </section>
  </div>, grade);
}
