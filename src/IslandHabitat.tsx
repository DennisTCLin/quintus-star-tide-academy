import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { petById, type Profile } from "./game-view";
import { creatureProgress } from "./companion-growth";
import { ReadingContext, annotateTree } from "./readability";
import { createWalkMap, createWalkers, greetWalker, islandBatch, ownedIslandIds, plotGround, stepWalkers, type IslandWalker } from "./island-life";
import { plotCount } from "./territory";
import { ISLAND_MOTIONS } from "./island-motion-assets";
import { advanceMotion, motionClock, motionFrame, motionKind, type MotionClock } from "./island-motion";
import { createIslandAtlasLoader } from "./island-atlas-loader";
import "./island-life.css";

const greetings = ["一起在島上散步吧！", "和你住在一起真開心！", "休息一下，再一起去冒險！"];
function Portrait({ id }: { id: string }) {
  const pet = petById(id)!;
  const [failed, setFailed] = useState(false);
  return failed ? <span className="island-pet-fallback" aria-hidden="true">✦</span> : <img src={pet.thumbnail ?? pet.image} alt="" draggable={false} decoding="async" onError={() => setFailed(true)} />;
}

/** Cosmetic habitat only. Ownership and growth always come from the current profile. */
export default function IslandHabitat({ profile, reduced, zoom, viewportRef, editing, children }: {
  profile: Profile; reduced: boolean; zoom: number; viewportRef: RefObject<HTMLDivElement>;
  editing: boolean; children: ReactNode;
}) {
  const { grade } = useContext(ReadingContext);
  const root = useRef<HTMLDivElement>(null), mapElement = useRef<HTMLDivElement>(null);
  const actors = useRef(new Map<string, HTMLButtonElement>()), walkers = useRef<IslandWalker[]>([]);
  const canvases = useRef(new Map<string, HTMLCanvasElement>());
  const images = useRef(new Map<string, HTMLImageElement>());
  const atlasLoader = useRef<ReturnType<typeof createIslandAtlasLoader> | null>(null);
  const clocks = useRef(new Map<string, MotionClock>());
  const rendered = useRef(new Map<string, string>());
  const [page, setPage] = useState(0), [paused, setPaused] = useState(false);
  const [small, setSmall] = useState(() => matchMedia("(max-width: 600px)").matches);
  const [visible, setVisible] = useState(!document.hidden), [onScreen, setOnScreen] = useState(false);
  const [greeting, setGreeting] = useState<{id:string;text:string} | null>(null);
  const ownedKey = ownedIslandIds(profile.owned, profile.equipped).join(",");
  const ids = useMemo(() => ownedKey ? ownedKey.split(",") : [], [ownedKey]);
  const batchKey = islandBatch(ids, page, small ? 6 : 8).join(",");
  const batch = useMemo(() => batchKey ? batchKey.split(",") : [], [batchKey]);
  const plotsKey = profile.territory?.buildings.map(b => b.plot).filter((plot): plot is number => plot !== null).sort((a,b)=>a-b).join(",") ?? "";
  const navigation = useMemo(() => createWalkMap(plotsKey ? plotsKey.split(",").map(Number) : []), [plotsKey]);
  const running = !paused && !reduced && !editing && visible && onScreen;
  const layout = useRef({ width: 950, height: 530 });
  const openPlots = profile.territory ? plotCount(profile.territory) : 8;
  const openPlotsRef = useRef(openPlots); openPlotsRef.current = openPlots;
  const reducedRef = useRef(reduced); reducedRef.current=reduced;

  // DOM transforms avoid rerendering the building inspector 30 times a second.
  function paint() {
    const {width,height} = layout.current;
    const size = Math.max(44, Math.min(86, width * .055));
    for (const w of walkers.current) {
      const el = actors.current.get(w.id); if (!el) continue;
      el.style.transform = `translate3d(${w.x*width/100}px,${w.y*height/100}px,0) translate(-50%,-100%)`;
      el.style.setProperty("--pet-size", `${size}px`);
      el.style.setProperty("--pet-facing", String(w.direction));
      el.style.zIndex = String(Math.round(w.y * 10));
      el.dataset.mood = w.mood;
      // A passing companion must never intercept a land/building selection.
      const overPlot = Array.from({length:openPlotsRef.current}, (_,i)=>plotGround(i)).some(p =>
        Math.abs((p.x-w.x)*width/100) < size/2+24 &&
        (p.y-w.y)*height/100 > -size-24 && (p.y-w.y)*height/100 < 24);
      el.style.pointerEvents = overPlot ? "none" : "auto";
      const motion=ISLAND_MOTIONS[w.id], clock=clocks.current.get(w.id), canvas=canvases.current.get(w.id);
      const desired=motion && clock ? motion[clock.kind] : undefined;
      const clip=desired && images.current.has(desired.src) ? desired : motion?.idle;
      const sheet=clip && images.current.get(clip.src);
      const animated=!!(sheet && clip && clock && canvas && !reducedRef.current);
      el.dataset.animation=animated ? "frames" : "still";
      // Registered source frames face right. Mirroring changes facing, never pose.
      el.style.setProperty("--pet-facing",String(w.direction*(motion?.facing ?? 1)));
      el.style.setProperty("--sprite-offset-x",`${(0.5-(motion?.anchor?.x ?? .5))*100}%`);
      el.style.setProperty("--sprite-offset-y",`${(1-(motion?.anchor?.y ?? 1))*100}%`);
      if(animated && sheet && clip && clock && canvas && motion) {
        const frame=desired===clip ? motionFrame(clock,motion,clip) : 0;
        const key=`${clip.src}:${frame}`;
        if(rendered.current.get(w.id)!==key) {
          const ctx=canvas.getContext("2d");
          if(ctx) {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(sheet,(frame%clip.columns)*clip.cell,Math.floor(frame/clip.columns)*clip.cell,clip.cell,clip.cell,0,0,canvas.width,canvas.height);
            rendered.current.set(w.id,key);
          }
        }
        canvas.dataset.frame=String(frame);canvas.dataset.clip=clock.kind;
      }
    }
  }
  useEffect(() => {
    const query = matchMedia("(max-width: 600px)");
    const resize = () => setSmall(query.matches);
    const visibility = () => setVisible(!document.hidden);
    query.addEventListener("change", resize); document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    if (viewportRef.current) observer.observe(viewportRef.current);
    const sizes = new ResizeObserver(([entry]) => {
      layout.current = {width:entry.contentRect.width,height:entry.contentRect.height}; paint();
    });
    if (mapElement.current) sizes.observe(mapElement.current);
    return () => { query.removeEventListener("change", resize); document.removeEventListener("visibilitychange", visibility); observer.disconnect(); sizes.disconnect(); };
  }, [viewportRef]);
  useEffect(() => {
    walkers.current = createWalkers(batch, navigation, page);
    clocks.current=new Map(batch.map(id=>[id,motionClock()])); rendered.current.clear();
    setGreeting(null); paint();
  }, [batch, navigation, page]);
  useEffect(() => {
    const loader = createIslandAtlasLoader(images.current, () => {
      rendered.current.clear(); paint();
    });
    atlasLoader.current = loader;
    return () => { loader.dispose(); atlasLoader.current = null; };
  }, []);
  useEffect(() => {
    const clips = batch.flatMap(id => {
      const motion = ISLAND_MOTIONS[id];
      return motion ? [motion.idle, ...(motion.walk ? [motion.walk] : []), ...(motion.play ? [motion.play] : [])] : [];
    });
    atlasLoader.current?.sync(clips, running && !document.hidden);
    paint();
  }, [batch, reduced, running]);
  useEffect(()=>{paint();},[openPlots,reduced]);
  useEffect(() => {
    if (!running || !batch.length) return;
    let frame = 0, last = 0, elapsed = 0;
    function tick(now: number) {
      if (!last) last = now;
      if (now-last >= 1000/30) {
        const dt = Math.min(.1,(now-last)/1000); last = now; elapsed += dt;
        const before=new Map(walkers.current.map(w=>[w.id,{x:w.x,y:w.y}]));
        const walkable=new Set(batch.filter(id=>{const m=ISLAND_MOTIONS[id];return !!(m?.walk && images.current.has(m.walk.src) && images.current.has(m.idle.src));}));
        stepWalkers(walkers.current, navigation, dt, walkable);
        for(const w of walkers.current) {
          const m=ISLAND_MOTIONS[w.id],clock=clocks.current.get(w.id),p=before.get(w.id);
          if(m && clock && p) advanceMotion(clock,motionKind(w.mood,m),dt,Math.hypot((w.x-p.x)*1.8,w.y-p.y));
        }
        paint();
        // Do not replace a companion while someone is greeting or keyboard-focusing it.
        if (elapsed > 45 && !document.activeElement?.closest(".island-life-friends button, .island-pet") && !walkers.current.some(w=>w.mood==="hello")) {
          if (ids.length > batch.length) setPage(n=>n+1);
          elapsed = 0;
        }
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, batch, navigation, ids.length]);

  function greet(id: string) {
    const walker = walkers.current.find(w=>w.id===id); if (!walker) return;
    greetWalker(walker);
    const m=ISLAND_MOTIONS[id],clock=clocks.current.get(id);
    if(m?.play)walker.remaining=m.play.seconds+.2;
    if(m && clock)advanceMotion(clock,motionKind("hello",m),0,0);
    paint();
    const pet = petById(id)!;
    setGreeting({id,text:`${pet.name}：${greetings[Math.floor(Math.random()*greetings.length)]}`});
  }
  const status = reduced ? "靜態陪伴" : editing ? "搬移建築中，夥伴休息一下" : paused ? "夥伴休息中" : "散步、伸懶腰，也一起發呆";
  return <div className={`island-habitat ${running ? "is-running" : "is-resting"}`} ref={root}>
    {annotateTree(<div className="island-life-toolbar">
      <div className="island-life-title"><span aria-hidden="true">✦</span><div><strong>夥伴的小日子</strong><span>{ids.length ? `${batch.length} 位在島上 · 共 ${ids.length} 位夥伴` : "迎接第一位夥伴，一起住進星海家園"}</span></div></div>
      <div className="island-life-actions">
        {ids.length > batch.length && <button onClick={()=>setPage(n=>n+1)}>換一批夥伴</button>}
        {!!ids.length && <button disabled={reduced || editing} aria-pressed={paused || reduced || editing} onClick={()=>setPaused(p=>!p)}>{reduced ? "減少動態已開啟" : paused ? "繼續活動" : "暫停活動"}</button>}
      </div>
    </div>, grade)}
    <div className="territory-map-viewport" ref={viewportRef} tabIndex={0} aria-label="領地地圖，可左右捲動；下方也可用土地清單操作">
      <div className="territory-map" ref={mapElement} style={{"--map-zoom":zoom} as CSSProperties}>
        {children}
        <div className="island-actors" role="group" aria-label="島上的夥伴">
          {batch.map(id => { const pet=petById(id)!; return <button key={id} ref={el=>{if(el)actors.current.set(id,el);else actors.current.delete(id);}}
            className="island-pet" data-pet={id} type="button" tabIndex={-1} aria-label={`和${pet.name}打招呼`} onClick={()=>greet(id)}>
            <span className="island-pet-shadow" /><span className="island-pet-facing"><span className="island-pet-body"><Portrait id={id}/><canvas width={160} height={160} aria-hidden="true" ref={el=>{if(el)canvases.current.set(id,el);else canvases.current.delete(id);}}/></span></span>
            <span className="island-pet-emote" aria-hidden="true"/>
          </button>;})}
        </div>
      </div>
    </div>
    {annotateTree(<div className="island-life-dock">
      <div className="island-life-caption"><span className="island-life-dot" aria-hidden="true"/>{status}<span>點選頭像，和牠打招呼</span></div>
      <div className="island-life-friends" aria-label="向島上夥伴打招呼">
        {batch.map(id=>{const pet=petById(id)!;return <button key={id} className={greeting?.id===id?"greeted":""} onClick={()=>greet(id)} aria-label={`向${pet.name}打招呼，${pet.rarity}級，等級${creatureProgress(pet.rarity, profile.growth.xp[id]??0).level}`}>
          <Portrait id={id}/><span><b>{pet.name}</b><small>{pet.rarity} · Lv.{creatureProgress(pet.rarity, profile.growth.xp[id]??0).level}</small></span>
        </button>;})}
      </div>
      <p className="island-life-greeting" role="status" aria-live="polite">{greeting?.text ?? (ids.length ? "這裡是你們的家。每位夥伴都有自己的小日子。" : "抽到或降服的新夥伴，也會來島上玩。")}</p>
    </div>, grade)}
  </div>;
}
