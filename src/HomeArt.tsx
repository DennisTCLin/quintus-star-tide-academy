import { ReadingContext, annotateTree } from "./readability";
import { useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { furnitureSpec, itemPosition, type HomeDecor, type HomeItem, type FurnitureKind } from "./home-decoration";
import { petById, type Profile } from "./game-view";
import "./home-decoration.css";

export function FurnitureArt({ kind, rotation = 0 }: { kind: FurnitureKind; rotation?: number }) {
  return <img className="furniture-art" src={`/assets/home/${kind}-${rotation}.webp`} alt="" draggable={false} loading="lazy" />;
}
export function LearningStars({ profile }: { profile: Profile }) {
  const n = profile.learningRewards?.progress ?? 0;
  return <div className="home-learning-stars" role="progressbar" aria-label="下一份學習建材" aria-valuemin={0} aria-valuemax={5} aria-valuenow={n}>
    {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < n ? "lit" : ""} aria-hidden="true">✦</span>)}<small>{n}/5</small>
  </div>;
}
export function RoomStage({ decor, room, profile, selected, ghost, editable = false, onPick, onMove, onPlace, onVisit, reduced = false }: {
  decor: HomeDecor; room: number; profile: Profile; selected?: number | null; ghost?: HomeItem | null; editable?: boolean;
  onPick?: (id: number) => void; onMove?: (id: number, x: number, y: number) => void; onPlace?: (x: number, y: number) => void;
  onVisit?: () => void; reduced?: boolean;
}) {
  const { grade } = useContext(ReadingContext);
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; pointerId: number; x: number; y: number; offsetX: number; offsetY: number; kind: FurnitureKind; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const [activity, setActivity] = useState<{ x: number; y: number; name: string; mood: string } | null>(null);
  const pet = petById(decor.resident && profile.owned[decor.resident] ? decor.resident : profile.equipped);
  const items = decor.items.map(i => drag?.id === i.id ? { ...i, parent: null, x: drag.x, y: drag.y } : i);
  const finish = decor.rooms[room];
  function position(e: { clientX: number; clientY: number }) { const r = root.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 }; }
  useEffect(() => { if (!editable) { pointer.current = null; setDrag(null); } }, [editable]);
  function dragPosition(e: { clientX: number; clientY: number }) {
    const p = pointer.current!, pt = position(e), spec = furnitureSpec(p.kind)!;
    return { x: Math.max(Math.ceil(8 + spec.width / 2), Math.min(Math.floor(92 - spec.width / 2), pt.x + p.offsetX)),
      y: Math.max(spec.category === "wall" ? 20 : 51, Math.min(spec.category === "wall" ? 44 : 82, pt.y + p.offsetY)) };
  }
  function start(e: PointerEvent<HTMLButtonElement>, i: HomeItem) {
    if (!editable || pointer.current || !e.isPrimary || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const pt = position(e), origin = itemPosition(i, decor.items);
    suppressClick.current = false;
    pointer.current = { id: i.id, pointerId: e.pointerId, x: e.clientX, y: e.clientY,
      offsetX: origin.x - pt.x, offsetY: origin.y - pt.y, kind: i.kind, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId); onPick?.(i.id);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const p = pointer.current; if (!p || p.pointerId !== e.pointerId || !editable) return;
    e.preventDefault();
    if (p.moved || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 3) {
      p.moved = true; setDrag({ id: p.id, ...dragPosition(e) });
    }
  }
  function cancelDrag() { pointer.current = null; setDrag(null); }
  function end(e: PointerEvent<HTMLButtonElement>) {
    const p = pointer.current; if (!p || p.pointerId !== e.pointerId) return;
    e.preventDefault(); e.stopPropagation();
    if (p.moved && editable) { const pt = dragPosition(e); suppressClick.current = true; onMove?.(p.id, pt.x, pt.y); }
    cancelDrag();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function interact(i: HomeItem) {
    if (editable) { onPick?.(i.id); return; }
    const pos = itemPosition(i, decor.items), spec = furnitureSpec(i.kind)!;
    setActivity({ x: pos.x, y: Math.min(83, pos.y + 2), name: spec.activity === "sleep" ? "睡個好覺" : spec.activity === "sit" ? "坐下休息" : spec.activity === "play" ? "一起玩吧" : "喜歡這個家", mood: spec.activity });
  }
  return annotateTree(<div ref={root} className={`room-stage ${editable ? "is-editing" : ""} ${drag ? "is-dragging" : ""} ${reduced ? "reduce-motion" : ""}`} aria-label="城堡房間" onClick={e => { if (e.target instanceof Element && e.target.closest("button")) return; const p = position(e); onPlace?.(p.x, p.y); }}>
    <img className="room-background" src="/assets/home/room.webp" alt="白石拱窗望向星海，陽光照進你的房間" draggable={false} />
    {finish.wall !== "ivory" && <img className="room-skin room-wall" src={`/assets/home/wall-${finish.wall}.webp`} alt="" draggable={false} />}
    {finish.floor !== "stone" && <img className="room-skin room-floor" src={`/assets/home/floor-${finish.floor}.webp`} alt="" draggable={false} />}
    {editable && <div className="room-placement-grid" aria-hidden="true" />}
    {items.filter(i => i.room === room).map(i => {
      const pos = itemPosition(i, items), spec = furnitureSpec(i.kind)!;
      return <button key={i.id} className={`room-item ${selected === i.id ? "selected" : ""} ${drag?.id === i.id ? "dragging" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${spec.width}%`, zIndex: pos.z } as CSSProperties}
        aria-label={`${spec.name}，${editable ? "選取或拖曳" : "讓夥伴使用"}`} aria-pressed={editable ? selected === i.id : undefined}
        onPointerDown={e => start(e, i)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag} onDragStart={e=>e.preventDefault()} onClick={e => { e.stopPropagation(); if (suppressClick.current && e.detail !== 0) { suppressClick.current = false; return; } interact(i); }}>
        <FurnitureArt kind={i.kind} rotation={i.rotation} />
      </button>;
    })}
    {ghost && <div className="room-item room-ghost" style={{ left: `${ghost.x}%`, top: `${ghost.y}%`, width: `${furnitureSpec(ghost.kind)!.width}%`, zIndex: 1000 }}><FurnitureArt kind={ghost.kind} rotation={ghost.rotation} /><span>試擺</span></div>}
    {!editable && pet && <button className={`room-resident mood-${activity?.mood ?? "rest"}`} style={{ left: `${activity?.x ?? 63}%`, top: `${activity?.y ?? 76}%`, zIndex: (activity?.y ?? 76) * 10 + 30 }} onClick={() => { setActivity({ x: 63, y: 76, name: "一起佈置我們的家", mood: "hello" }); onVisit?.(); }} aria-label={`${pet.name}住在這裡`}>
      <img src={pet.thumbnail ?? pet.image} alt="" draggable={false} /><span>{activity?.name ?? pet.name}</span>
    </button>}
  </div>, grade);
}
