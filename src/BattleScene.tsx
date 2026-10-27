import MonsterMotion, {hasMonsterMotion} from "./MonsterMotion";
import {monsterById} from "./monsters";
import BattleCinematic from './BattleCinematic';
import { battleCinematic } from './battle-cinematics';
import { CreatureBadge } from "./CreatureInfo";
import { BrandText } from "./BrandIcon";
import { useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { BATTLE_BUFFS, ELEMENTS, fighterMaxHp, petById, petElement, type Battle, type Fighter } from "./game-view";
import { ReadingContext, AutoRuby, annotateTree } from "./readability";
import { BATTLE_ARENA, BATTLE_SPRITES, type SpriteClip } from "./battle-assets";
import { hasLanded, moveTitle, visibleBattle, visibleFighter, type BattlePlayback } from "./battle-presentation";
import "./battle-scene.css";
import "./companion-motion.css";
import { useStageVisibility } from "./useStageVisibility";

export function Sprite({ pet, attacking, reduced, nonce, hit=false }: { pet: string; attacking: boolean; reduced: boolean; nonce: number; hit?:boolean }) {
  const art = petById(pet)!;
  const animations = BATTLE_SPRITES[pet];
  const clip: SpriteClip | undefined = animations?.[attacking ? "attack" : "idle"];
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const clipReady = !!clip && !!ready[clip.src];
  const [broken, setBroken] = useState(false);
  const sheet = useRef<HTMLSpanElement>(null);
  useEffect(() => { setBroken(false); }, [pet]);
  useEffect(() => {
    if (!animations || reduced) return;
    let valid = true;
    // Warm both sheets so the first attack can start on the same clock as its effects.
    for (const animation of Object.values(animations)) {
      const image = new Image();
      image.onload = () => {
        const validAtlas = image.naturalWidth === animation.columns * animation.cellSize
          && image.naturalHeight === animation.rows * animation.cellSize
          && Number.isInteger(animation.frames) && animation.frames > 0
          && animation.frames <= animation.columns * animation.rows;
        if (valid && validAtlas) setReady(previous => ({ ...previous, [animation.src]: true }));
      };
      image.src = animation.src;
    }
    return () => { valid = false; };
  }, [animations, reduced]);
  useEffect(() => {
    if (!clip || reduced || !clipReady) return;
    let raf = 0;
    let previous = -1;
    const start = performance.now();
    const duration = attacking ? 1050 : 2200;
    const tick = (now: number) => {
      const progress = (now - start) / duration;
      const frame = attacking ? Math.min(clip.frames - 1, Math.floor(progress * clip.frames)) : Math.floor(progress * clip.frames) % clip.frames;
      if (frame !== previous && sheet.current) {
        const x = frame % clip.columns;
        const y = Math.floor(frame / clip.columns);
        sheet.current.style.backgroundPosition = `${clip.columns > 1 ? x / (clip.columns - 1) * 100 : 0}% ${clip.rows > 1 ? y / (clip.rows - 1) * 100 : 0}%`;
        previous = frame;
      }
      if (!attacking || progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clip, clipReady, reduced, attacking, nonce]);
  if(hasMonsterMotion(pet))return <MonsterMotion key={pet} monster={monsterById(pet)!} action={attacking?"attack":hit?"hit":"idle"} nonce={nonce} reduced={reduced}/>;
  const showSheet = clip && clipReady && !reduced;
  const content = <div className="duel-art" data-motion={art.motion} data-rarity={art.rarity} data-series={art.series} role="img" aria-label={art.name} data-sprite={showSheet ? "animated" : "still"}>
    {showSheet ? <span ref={sheet} className="duel-spritesheet" style={{ backgroundImage: `url("${clip.src}")`, backgroundSize: `${clip.columns * 100}% ${clip.rows * 100}%` }} />
      : broken ? <span className="duel-art-fallback" aria-hidden="true"><BrandText text="✦" /></span> : <img src={art.image} alt="" onError={() => setBroken(true)} draggable={false} />}
  </div>;
  return art.motion ? <div className="duel-entry" data-motion={art.motion} key={pet}>{content}</div> : content;
}

function Energy({ value }: { value: number }) {
  return <span className="duel-energy" role="img" aria-label={`能量 ${value}，最多 3`}>
    {[0, 1, 2].map(i => <i key={i} className={i < value ? "filled" : ""} />)}
  </span>;
}
function Health({ fighter, side, active }: { fighter: Fighter; side: number; active: boolean }) {
  const art = petById(fighter.pet)!;
  const max = fighterMaxHp(fighter);
  const { grade } = useContext(ReadingContext);
  const affinity = ELEMENTS[petElement(fighter.pet)];
  return <div className={`duel-health side-${side} ${active ? "is-turn" : ""}`}>
    <div className="duel-health-label"><strong>{grade === 2 ? <AutoRuby text={art.name} /> : art.name}</strong><span className="duel-element">{grade === 2 ? <AutoRuby text={`${affinity.icon} ${affinity.name}`} /> : <BrandText text={`${affinity.icon} ${affinity.name}`} />}</span></div>
    <CreatureBadge rarity={art.rarity} level={fighter.stats?.level ?? 1} />
    {fighter.stats && <div className="duel-health-stats">ATK {fighter.stats.attack} · DEF {fighter.stats.defense}</div>}
    <div className="duel-hp" role="meter" aria-label={`${art.name}體力`} aria-valuenow={fighter.hp} aria-valuemin={0} aria-valuemax={max}>
      <span className={fighter.hp <= max * .25 ? "low" : ""} style={{ width: `${fighter.hp / max * 100}%` }} />
    </div>
    <div className="duel-health-bottom"><span>{fighter.hp}<small> / {max}</small></span><Energy value={fighter.energy} /></div>
  </div>;
}
export function Spell({ element }: { element: number }) {
  // Paths stay inside the stage; direction is mirrored by the effect container.
  return <svg className={`duel-spell spell-${element}`} viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
    {element === 2 ? <>
      <path className="spell-trail" d="M220 330 Q350 180 480 300 T760 290" />
      <path className="spell-trail secondary" d="M220 350 Q370 250 480 340 T760 315" />
      <path className="spell-crest" d="M610 310 Q680 170 780 265 Q730 245 718 280 Q760 265 790 310 Q712 360 610 310Z" />
    </> : element === 1 ? <>
      <path className="spell-trail" d="M220 330 Q390 370 500 290 Q620 200 780 310" />
      <path className="spell-vine" d="M740 450 Q640 350 770 250 Q800 230 770 180 M700 390 Q780 340 800 310 M735 320 Q650 285 680 260" />
      {[0, 1, 2, 3, 4].map(i => <ellipse className="spell-leaf" key={i} cx={685 + i * 22} cy={330 - i * 32} rx="25" ry="10" transform={`rotate(${i % 2 ? -35 : 35} ${685 + i * 22} ${330 - i * 32})`} />)}
    </> : element === 3 ? <>
      <path className="spell-trail" d="M220 330 Q430 250 740 300" />
      <path className="spell-flame" d="M560 320 Q660 290 620 240 Q710 255 730 280 Q710 230 700 220 Q800 260 790 305 Q780 370 670 340 Q630 350 560 320Z" />
      <path className="spell-core" d="M680 320 Q735 305 725 275 Q780 295 760 325 Q730 345 680 320Z" />
    </> : element === 0 ? <>
      <path className="spell-trail" d="M220 330 745 300" />
      <path className="spell-metal" d="m570 300 120-38 108 38-108 38Z" />
      <path className="spell-core" d="m610 300 80-13 75 13-75 9Z" />
      <path className="spell-metal" d="m650 250 22-22 22 22-22 22Zm75 110 18-18 18 18-18 18Z" />
    </> : <>
      <path className="spell-trail" d="M220 360 Q480 410 760 360" />
      <path className="spell-earth" d="m600 370 24-64 45-17 25 81Zm72 0 26-106 46-23 38 129Zm87 0 26-52 36-12 14 64Z" />
      <path className="spell-core" d="m698 264 46-23-16 52-34 24Z" />
    </>}
  </svg>;
}

export default function BattleScene({ battle, playback, reduced, names }: { battle: Battle; playback: BattlePlayback | null; reduced: boolean; names: [string, string] }) {
  const { grade } = useContext(ReadingContext);
  const { stageRef, visible } = useStageVisibility();
  const cosmeticReduced = reduced || !visible;
  const shown = visibleBattle(battle, playback);
  const event = playback?.event;
  const cinematic = event ? battleCinematic(event.source, event.kind) : undefined;
  const landed = hasLanded(playback);
  const hostile = event?.kind === "attack" || event?.kind === "burst";
  const theme = event?.element ?? petElement(shown.teams[shown.turn][shown.active[shown.turn]].pet);
  const title = event ? moveTitle(event) : "星海競技場";
  const winner = !playback && battle.winner !== null;
  const status = event ? landed ? event.message : `${petById(event.source)!.name} · ${title}` : winner ? battle.winner === "draw" ? "勢均力敵，再挑戰一次！" : `${names[battle.winner as 0 | 1]}獲勝！` : `${names[battle.turn]}，選擇招式。`;
  return <>{annotateTree(<>
    <div className="duel-topline"><span>第 {Math.min(shown.round, 60)} 回合</span><strong>{winner ? "對戰完成" : event ? `${petById(event.source)!.name} 正在行動` : `${names[battle.turn]}的回合`}</strong></div>
    <div ref={stageRef} className={`duel-stage battle-field ${cinematic ? "has-cinematic" : ""} theme-${theme} phase-${playback?.phase ?? "idle"} action-${event?.kind ?? "idle"} ${cosmeticReduced ? "duel-reduced" : ""} ${winner ? "duel-finished" : ""}`}
      style={{ "--arena-image": `url("${BATTLE_ARENA}")` } as CSSProperties} data-round={shown.round} data-phase={playback?.phase ?? "idle"} data-event={event?.kind ?? "idle"}>
      <div className="duel-sky" aria-hidden="true" />
      {playback && cinematic && !cosmeticReduced && <BattleCinematic key={`cinematic:${playback.nonce}`} clip={cinematic} startedAt={playback.startedAt ?? performance.now()} reverse={event?.actor === 1} phase={playback.phase} />}
      <div className="duel-hud">{[0, 1].map(side => <Health key={side} side={side} fighter={visibleFighter(battle, playback, side)} active={!event && battle.turn === side && !winner} />)}</div>
      <div className="duel-stage-title" aria-hidden="true">{event ? title : "星海競技場"}</div>
      {event && !cinematic && !cosmeticReduced && hostile && <div key={playback.nonce} className={`duel-effect-layer ${event.actor === 1 ? "reverse" : ""}`}><Spell element={event.element} /></div>}
      {[0, 1].map(side => {
        const f = visibleFighter(battle, playback, side);
        const acting = event?.actor === side;
        const target = event?.targetSide === side;
        const isHit = target && hostile && landed;
        const reaction = target && landed;
        const n = (event?.kind === "heal" || (event?.kind === "swap" && event.amount > 0)) ? `+${event.amount}` : hostile ? `−${event?.amount}` : event?.kind === "guard" ? "守護" : event?.kind === "swap" ? "登場" : "強化";
        return <div key={side} className={`duel-combatant side-${side} ${acting ? "duel-casting" : ""} ${isHit ? "duel-hit" : ""} ${isHit && event.knockout ? "duel-knockout" : ""} ${winner && battle.winner === side ? "duel-victor" : ""}`}>
          <div className="duel-summon-circle" aria-hidden="true" />
          <div className="duel-body"><div className="duel-facing">
            <Sprite key={f.pet} pet={f.pet} attacking={!!acting && !!hostile} hit={!!isHit} nonce={playback?.nonce ?? 0} reduced={cosmeticReduced} />
          </div></div>
          {(f.guard || f.buff?.skill === "shield" || (reaction && event.shielded)) && <span className="duel-shield" aria-hidden="true"><svg viewBox="0 0 100 120"><path d="M50 5L91 25V61Q91 91 50 115Q9 91 9 61V25Z" /><path d="M50 23L75 35V61Q75 80 50 96Q25 80 25 61V35Z" /></svg></span>}
          {reaction && <div key={playback?.nonce} className={`duel-reaction reaction-${event.kind}`} aria-hidden="true"><span className="duel-impact-ring" /><b className="duel-damage">{n}</b>{event.shielded && hostile && <small className="duel-blocked">護盾減傷</small>}{Array.from({ length: 8 }, (_, i) => <i key={i} className="duel-mote" style={{ "--i": i } as CSSProperties} />)}</div>}
          {acting && event && !landed && <span className="duel-charge" aria-hidden="true" />}
          {f.buff && <span className="duel-buff combat-buff">{BATTLE_BUFFS[f.buff.skill].icon} {BATTLE_BUFFS[f.buff.skill].name}<small>剩 {f.buff.turns} 次行動</small></span>}
        </div>;
      })}
      {winner && <div className="duel-victory" role="status"><span aria-hidden="true"><BrandText text="✦" /></span><strong>{battle.winner === "draw" ? "精彩平手" : `${names[battle.winner as 0 | 1]}獲勝`}</strong><small>每一次出招，都是新的成長。</small></div>}
    </div>
    <div className="duel-reserves">{shown.teams.map((team, side) => <div key={side} className={`duel-roster side-${side}`} aria-label={`${names[side]}的隊伍`} role="group">{team.map((f, i) => <span className={`${i === shown.active[side] ? "selected" : ""} ${f.hp === 0 ? "exhausted" : ""}`} key={f.pet} title={`${petById(f.pet)!.name}，體力 ${f.hp}`}><img src={petById(f.pet)!.image} alt={petById(f.pet)!.name} /><small>{f.hp}</small></span>)}</div>)}</div>
    <div className="duel-caption" role="status" aria-live="polite"><span className="duel-caption-dot" aria-hidden="true" /><span className="duel-caption-copy">{status}</span></div>
  </>, grade)}</>;
}
