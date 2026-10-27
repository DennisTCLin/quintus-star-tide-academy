import { ReadingContext, annotateTree } from "./readability";
import { useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { FURNITURE, WALLS, FLOORS, furnitureSpec, freshHomeDecor, roomCount, homeStock, type HomeDecor, type HomeItem, type FurnitureKind } from "./home-decoration";
import { FurnitureArt, LearningStars, RoomStage } from "./HomeArt";
import { petById, ROSTER, type Profile } from "./game-view";
import { RESOURCE_KEYS, RESOURCE_LABELS } from "./territory";
import BrandIcon from "./BrandIcon";
import { roomSnapshotSync } from "./home-editor-sync";

const copy = <T,>(v: T): T => structuredClone(v);
const names = ["星光客廳", "月灣臥室", "雲上遊戲室"];
export default function RoomEditor({ profile, busy, online, reduced, onAction, onBack, onTrain, onDirtyChange }: {
  profile: Profile; busy: boolean; online: boolean; reduced: boolean; onAction: (c: Record<string, unknown>) => Promise<unknown>;
  onBack: () => void; onTrain: () => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const { grade } = useContext(ReadingContext);
  const saved = profile.homeDecor;
  const [draft, setDraft] = useState<HomeDecor>(() => copy(saved ?? freshHomeDecor()));
  const [baseline, setBaseline] = useState<HomeDecor>(() => copy(saved ?? freshHomeDecor()));
  const [room, setRoom] = useState(0), [editing, setEditing] = useState(false), [selected, setSelected] = useState<number | null>(null);
  const [category, setCategory] = useState("owned"), [preview, setPreview] = useState<FurnitureKind | null>(null);
  const [ghostPoint, setGhostPoint] = useState({ x: 50, y: 73 }), [rotation, setRotation] = useState(0);
  const [past, setPast] = useState<HomeDecor[]>([]), [future, setFuture] = useState<HomeDecor[]>([]);
  const [message, setMessage] = useState(""), [sending, setSending] = useState(false);
  const lock = useRef(false), savingDraft = useRef(false);
  const dirty = !!saved && JSON.stringify(draft) !== JSON.stringify(baseline);
  const stale = !!saved && draft.revision !== saved.revision;
  const disabled = busy || !online || sending;
  const chosen = draft.items.find(i => i.id === selected), spec = preview ? furnitureSpec(preview) : chosen ? furnitureSpec(chosen.kind) : null;
  const stock = homeStock(profile);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    if (!saved) return;
    // Cloud polling returns new object identities even when the room is
    // unchanged. Preserve undo/redo until an actual saved revision arrives.
    const sync = roomSnapshotSync(saved, baseline, dirty, savingDraft.current);
    if (sync.replace) { setDraft(copy(saved)); setBaseline(copy(saved)); setPast([]); setFuture([]); }
    if (sync.clearSaving) savingDraft.current = false;
  }, [saved]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function mutate(fn: (d: HomeDecor) => void) {
    if (disabled || stale) return;
    const next = copy(draft); fn(next); setPast(h => [...h.slice(-39), copy(draft)]); setFuture([]); setDraft(next); setMessage("");
  }
  async function command(c: Record<string, unknown>) {
    if (disabled || lock.current) return false; lock.current = true; setSending(true); setMessage("");
    try { const ok = await onAction({ type: "home-decor", ...c }); if (!ok) setMessage("尚未儲存，請確認連線後再試。"); return !!ok; }
    catch { setMessage("尚未儲存，草稿仍在這裡。"); return false; }
    finally { lock.current = false; setSending(false); }
  }
  function cancel() { setDraft(copy(saved ?? freshHomeDecor())); setBaseline(copy(saved ?? freshHomeDecor())); setPast([]); setFuture([]); setSelected(null); setPreview(null); setMessage("已回到儲存的佈置"); }
  async function save() {
    savingDraft.current = true;
    if (await command({ action: "save", baseRevision: draft.revision, items: draft.items, rooms: draft.rooms, resident: draft.resident && profile.owned[draft.resident] ? draft.resident : null })) {
      setEditing(false); setSelected(null); setPreview(null); setMessage("家已收拾好了！");
    } else savingDraft.current = false;
  }
  function place(id: number, x: number, y: number) {
    mutate(d => {
      const item = d.items.find(i => i.id === id)!; const s = furnitureSpec(item.kind)!;
      item.parent = null; item.room = room;
      item.x = Math.round(Math.max(Math.ceil(8 + s.width / 2), Math.min(Math.floor(92 - s.width / 2), x)));
      item.y = Math.round(Math.max(s.category === "wall" ? 20 : 51, Math.min(s.category === "wall" ? 44 : 82, y)));
      for (const child of d.items.filter(i => i.parent === id)) child.room = room;
    });
  }
  function pick(id: number) { setSelected(id); setPreview(null); }
  function placePoint(x: number, y: number) {
    if (!editing) return;
    if (preview) { const s = furnitureSpec(preview)!; setGhostPoint({ x: Math.max(8+s.width/2, Math.min(92-s.width/2,x)), y: Math.max(s.category === "wall" ? 20 : 51, Math.min(s.category === "wall" ? 44 : 82,y)) }); }
    else if (chosen) place(chosen.id,x,y);
  }
  const ghost: HomeItem | null = preview ? { id: 0, kind: preview, room, ...ghostPoint, rotation, parent: null, layer: 0 } : null;
  return annotateTree(<section className="home-editor" aria-label="房間佈置">
    <header className="home-editor-heading"><button onClick={onBack}>← 領地</button><div><span>和夥伴住在一起</span><h1>{names[room]}</h1></div><LearningStars profile={profile} /></header>
    {!saved ? <><RoomStage decor={freshHomeDecor()} room={0} profile={profile} reduced={reduced} /><div className="home-welcome"><h2>第一個小窩，等你來佈置</h2><div>{["chair","rug","cushion"].map(k=><FurnitureArt key={k} kind={k as FurnitureKind}/>)}</div><button className="f-primary" disabled={disabled} onClick={async()=>{savingDraft.current=true;if(await command({action:"open"}))setEditing(true);else savingDraft.current=false;}}>住進我的家 · 收下迎新家具</button></div></> : <>
      <div className="home-room-tabs" role="group" aria-label="選擇房間">{names.map((name,i)=><button key={name} aria-pressed={room===i} disabled={i>=roomCount(profile.territory)} onClick={()=>{setRoom(i);setSelected(null);setPreview(null);}}>{i>=roomCount(profile.territory)?"🔒 ":""}{name}</button>)}<small>城堡擴建後增加房間</small></div>
      <div className="home-edit-toolbar">
        <button className={!editing?"active":""} aria-pressed={!editing} onClick={()=>{setEditing(false);setPreview(null);}}>看夥伴生活</button><button className={editing?"active":""} aria-pressed={editing} onClick={()=>setEditing(true)}>佈置房間</button>
        {editing && <><button disabled={!past.length||disabled||stale} onClick={()=>{setFuture(v=>[copy(draft),...v]);setDraft(past[past.length-1]);setPast(v=>v.slice(0,-1));}}>↶ 撤銷</button><button disabled={!future.length||disabled||stale} onClick={()=>{setPast(v=>[...v,copy(draft)]);setDraft(future[0]);setFuture(v=>v.slice(1));}}>↷ 重做</button><button disabled={!dirty||sending} onClick={cancel}>取消變更</button><button className="f-primary" disabled={!dirty||disabled||stale} onClick={()=>void save()}>{sending?"儲存中…":"儲存佈置"}</button></>}
      </div>
      {stale && <p role="alert">另一個畫面已更新家園。這份草稿還在；按「取消變更」載入最新版本。</p>}
      {!online && <p role="status">目前離線，草稿保留；連線後再儲存。</p>}
      <div className={`home-studio ${editing?"editing":"viewing"}`}>
        <div className="home-stage-wrap"><RoomStage decor={draft} room={room} profile={profile} selected={selected} ghost={ghost} editable={editing&&!disabled&&!stale} onPick={pick} onMove={place} onPlace={placePoint} reduced={reduced} />
          {editing && <p className="home-stage-hint">{preview?"試擺中，點房間調整位置":chosen?`${furnitureSpec(chosen.kind)!.name} · 按住直接拖拉，放開就擺好`:"按住家具直接拖拉，到喜歡的位置放開"}</p>}
          {editing && chosen && <div className="home-item-tools" aria-label="選取家具工具"><strong>{furnitureSpec(chosen.kind)!.name}</strong>
            <button disabled={disabled||stale} onClick={()=>mutate(d=>{const i=d.items.find(i=>i.id===selected)!;i.rotation=(i.rotation+1)%4;})}>↻ 轉向</button>
            <button disabled={disabled||stale} onClick={()=>mutate(d=>{const i=d.items.find(i=>i.id===selected)!;i.layer=Math.min(2,i.layer+1);})}>移到前面</button>
            <button disabled={disabled||stale} onClick={()=>mutate(d=>{const i=d.items.find(i=>i.id===selected)!;i.layer=Math.max(-2,i.layer-1);})}>移到後面</button>
            <button disabled={disabled||stale} onClick={()=>mutate(d=>{for(const i of d.items.filter(i=>i.id===selected||i.parent===selected)){i.room=null;i.parent=null;i.x=50;i.y=furnitureSpec(i.kind)!.category==="wall"?30:73;}})}>收回</button>
            {furnitureSpec(chosen.kind)!.category==="small" && <label>放在桌上<select aria-label="選擇支撐桌子" disabled={disabled||stale} value={chosen.parent??""} onChange={e=>{const parent=Number(e.target.value)||null;mutate(d=>{const i=d.items.find(i=>i.id===selected)!;i.parent=parent;i.room=room;i.x=parent?0:50;i.y=parent?0:73;});}}><option value="">放在地上</option>{draft.items.filter(i=>i.kind==="table"&&i.room===room).map(i=><option value={i.id} key={i.id}>茶几 {i.id}</option>)}</select></label>}
            <details className="home-fine-position"><summary>精細微調</summary><div className="home-nudge" aria-label="微調位置">{[["←",-2,0],["↑",0,-2],["↓",0,2],["→",2,0]].map(([label,x,y])=><button key={label} aria-label={`微調${label}`} disabled={disabled||stale||chosen.parent!==null} onClick={()=>place(chosen.id,chosen.x+Number(x),chosen.y+Number(y))}>{label}</button>)}</div></details>
          </div>}
        </div>
        {editing && <aside className="home-cabinet" aria-label="家具與佈置選項">
          <div className="home-catalog-tabs">{[["owned","我的家具"],["shop","新家具"],["wall","牆面"],["floor","地板"],["pets","住進來"]].map(([id,name])=><button key={id} aria-pressed={category===id} onClick={()=>{setCategory(id);setPreview(null);}}>{name}</button>)}</div>
          {category==="owned" && <div className="home-catalog-grid">{draft.items.map(i=><button key={i.id} className={selected===i.id?"chosen":""} aria-label={`選擇${furnitureSpec(i.kind)!.name} ${i.id}`} onClick={()=>{pick(i.id);if(i.room!==null)setRoom(i.room);else place(i.id,50,furnitureSpec(i.kind)!.category==="wall"?30:73);}}><FurnitureArt kind={i.kind}/><b>{furnitureSpec(i.kind)!.name}</b><small>{i.room===null?"收納中":names[i.room]}</small></button>)}</div>}
          {category==="shop" && <><div className="home-catalog-grid">{FURNITURE.map(s=><button key={s.id} className={preview===s.id?"chosen":""} aria-pressed={preview===s.id} onClick={()=>{setPreview(s.id);setSelected(null);setRotation(0);setGhostPoint({x:50,y:s.category==="wall"?30:73});}}><FurnitureArt kind={s.id}/><b>{s.name}</b>{draft.goal===s.id&&<small>我的目標 ✦</small>}</button>)}</div>
            {preview && spec && <div className="home-craft-detail"><strong>{spec.name}</strong><div className="home-material-cost">{RESOURCE_KEYS.map(k=><span key={k} className={stock[k]<spec.cost[k]?"short":""}><BrandIcon name={k==="wood"?"leaf":k==="stone"?"earth":"star"}/>{stock[k]}/{spec.cost[k]}<small>{RESOURCE_LABELS[k]}</small></span>)}</div>
              <button onClick={()=>setRotation(n=>(n+1)%4)}>↻ 預覽方向</button>
              <button disabled={disabled||dirty} onClick={async()=>{if(await command({action:"goal",goal:preview}))setMessage("想要的家具已記住了");}}>設為想要的家具</button>
              <button className="f-primary" disabled={disabled||dirty||RESOURCE_KEYS.some(k=>stock[k]<spec.cost[k])} onClick={async()=>{if(await command({action:"craft",kind:preview})){setPreview(null);setCategory("owned");setMessage("家具已放進收納，選它來擺放吧！");}}}>製作這件家具</button>
              {dirty&&<small>先儲存或取消這次佈置，再製作新家具。</small>}
              {RESOURCE_KEYS.some(k=>stock[k]<spec.cost[k])&&<button onClick={onTrain}>和夥伴去學習</button>}
            </div>}
          </>}
          {(category==="wall"||category==="floor") && <div className="home-finish-grid">{(category==="wall"?WALLS:FLOORS).map((id,i)=><button key={id} disabled={disabled||stale} aria-label={`${category==="wall"?"牆面":"地板"}：${["原色",category==="wall"?"月夜":"木紋",category==="wall"?"花葉":"海洋"][i]}`} aria-pressed={draft.rooms[room][category]===id} onClick={()=>mutate(d=>{(d.rooms[room] as unknown as Record<string,string>)[category]=id;})}><img src={i===0?"/assets/home/room.webp":`/assets/home/${category}-${id}.webp`} alt=""/><span>{["原色",category==="wall"?"月夜":"木紋",category==="wall"?"花葉":"海洋"][i]}</span></button>)}</div>}
          {category==="pets" && <div className="home-catalog-grid"><button aria-pressed={draft.resident===null} disabled={disabled||stale} onClick={()=>mutate(d=>{d.resident=null;})}><img src={petById(profile.equipped)!.image} alt=""/><b>陪練夥伴</b></button>{ROSTER.filter(p=>profile.owned[p.id]>0).map(p=><button key={p.id} aria-pressed={draft.resident===p.id} disabled={disabled||stale} onClick={()=>mutate(d=>{d.resident=p.id;})}><img src={p.thumbnail??p.image} alt="" loading="lazy"/><b>{p.name}</b></button>)}</div>}
        </aside>}
      </div>
    </>}
    <p className="home-save-status" role="status">{message|| (dirty?"試擺中的變更，按儲存後會帶到其他裝置。":"")}</p>
  </section>, grade);
}
