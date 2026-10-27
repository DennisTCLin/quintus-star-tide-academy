import { useEffect, useRef, useState } from "react";
import { petById, type Profile } from "./game-view";
import { creatureProgress } from "./companion-growth";
import BattleScene from "./BattleScene";
import { battlePresentationTiming, advanceBattlePhase, type BattlePlayback } from "./battle-presentation";
import SocialDialog from "./SocialDialog";
import type { OnlineController } from "./online-battle";

export function selectedOwnedPet(profile:Profile, preferred:string) {
  return [preferred,profile.equipped,...Object.keys(profile.owned)].find(id=>profile.owned[id]>0&&petById(id))??"";
}
export function PetSelect({profile,value,onChange}:{profile:Profile;value:string;onChange:(value:string)=>void}) {
  return <label className="social-pet-select">選擇出戰夥伴<select value={value} onChange={e=>onChange(e.target.value)}>
    {Object.keys(profile.owned).filter(id=>profile.owned[id]>0&&petById(id)).map(id=>{const pet=petById(id)!;return <option key={id} value={id}>{pet.name} · {pet.rarity} · Lv.{creatureProgress(pet.rarity,profile.growth.xp[id]??0).level}</option>;})}
  </select></label>;
}
export default function OnlineBattle({controller:c,profile,reduced,onOpenChange}:{controller:OnlineController;profile:Profile;reduced:boolean;onOpenChange?:(value:boolean)=>void}) {
  const [open,setOpen]=useState(false),[pet,setPet]=useState(profile.equipped),[now,setNow]=useState(Date.now()),[confirmLeave,setConfirmLeave]=useState(false);
  const [playback,setPlayback]=useState<BattlePlayback|null>(null);
  const previous=useRef(c.state?.room);const room=c.state?.room;
  const chosenPet=selectedOwnedPet(profile,pet);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{onOpenChange?.(open);},[open,onOpenChange]);
  useEffect(()=>{
    const before=previous.current;previous.current=room;
    if(before?.id===room?.id && before?.battle && room?.battle?.event && room.battle.round===before.battle.round+1)
      setPlayback({before:before.battle,after:room.battle,event:room.battle.event,nonce:room.revision,phase:"windup",startedAt:performance.now()});
    else setPlayback(null);
    setConfirmLeave(false);
  },[room?.id,room?.revision]);
  useEffect(()=>{
    if(!playback)return;
    const timing=battlePresentationTiming(playback.event,reduced), nonce=playback.nonce;
    const elapsed=performance.now()-(playback.startedAt??performance.now());
    const timers=(["flight","impact","settle"] as const).map(phase=>setTimeout(()=>setPlayback(p=>p?.nonce===nonce?advanceBattlePhase(p,phase):p),Math.max(0,timing[phase]-elapsed)));
    timers.push(setTimeout(()=>setPlayback(p=>p?.nonce===nonce?null:p),Math.max(0,timing.end-elapsed)));
    return()=>timers.forEach(clearTimeout);
  },[playback?.nonce,reduced]);
  if(!room&&!c.uncertain)return null;
  const seconds=room?Math.max(0,Math.ceil((room.deadline-now-c.clockOffset.current)/1000)):0;
  const terminal=room&&!['pending','active'].includes(room.status);
  const title=!room?"確認邀請狀態":room.status==="pending"?(room.side===1?`${room.names[0]}邀你對戰`:`等待${room.names[1]}接受邀請`):room.status==="active"?"好友線上對戰":"好友對戰結果";
  const close=()=>setOpen(false);
  const allowed=c.connected&&!c.busy&&!c.uncertain;
  const battle=room?.battle;
  const own=battle&&room?battle.teams[room.side][battle.active[room.side]]:null;
  return <>
    <div className="online-battle-banner" role="status"><span>{title}{room?.status==="pending"?` · ${seconds} 秒`:""}</span><button type="button" onClick={()=>setOpen(true)}>查看{room?.status==="active"?"對戰":"邀請"}</button></div>
    {open&&<SocialDialog title={title} onClose={close} wide={!!battle}>
      {!c.connected&&<p role="status">正在重新連線，暫停操作；連回後會同步最新進度。</p>}
      {c.error&&<p role="alert">{c.error}</p>}
      {c.uncertain&&<button disabled={c.busy} onClick={()=>void c.retry()}>確認同步</button>}
      {room?.status==="pending"&&<>
        <p>{room.names[0]}派出{petById(room.hostPet)?.name}。邀請剩下 {seconds} 秒。</p>
        <p>雙方各派一位夥伴，使用目前等級。普通攻擊蓄能，2 能量可用絕招或回復；防守可以減傷。每回合 120 秒，逾時或離開即認輸。</p>
        <p>這是好友切磋，不扣星幣、券，也不影響學習進度。</p>
        {room.side===1?<><PetSelect profile={profile} value={chosenPet} onChange={setPet}/><div className="social-actions"><button disabled={!allowed||seconds===0} onClick={()=>void c.act("accept",{pet:chosenPet})}>接受並開始對戰</button><button disabled={!allowed} onClick={()=>void c.act("decline")}>這次先不了</button></div></>:<button disabled={!allowed} onClick={()=>void c.act("cancel")}>取消邀請</button>}
      </>}
      {room&&battle&&<>
        <p>你是{room.names[room.side]} · {room.side===0?"左方":"右方"}{room.status==="active"?` · 本回合剩 ${seconds} 秒`:""}</p>
        <div className="arena duel-arena"><BattleScene battle={battle} playback={playback} reduced={reduced} names={room.names}/></div>
        {room.status==="active"&&<><p role="status">{battle.turn===room.side?"輪到你，選擇招式！":"等待好友出招…"}</p><div className="social-battle-actions">
          {([['attack','普通攻擊'],['guard','防守蓄能'],['burst','絕招 · 2 能量'],['heal','回復 · 2 能量']] as const).map(([move,label])=><button key={move} disabled={!allowed||seconds===0||!!playback||battle.turn!==room.side||(['burst','heal'].includes(move)&&(own?.energy??0)<2)} onClick={()=>void c.act("move",{move})}>{label}</button>)}
        </div>{confirmLeave?<div className="social-actions"><span>離開會判定這場認輸。</span><button disabled={!allowed} onClick={()=>void c.act("leave")}>確認認輸</button><button onClick={()=>setConfirmLeave(false)}>繼續對戰</button></div>:<button className="social-leave" onClick={()=>setConfirmLeave(true)}>離開對戰</button>}</>}
        {room.status==="finished"&&<p>{room.reason==="timeout"?"有一方超過回合時間，這場已結束。":room.reason==="leave"?"有一方離開對戰，這場已結束。":"切磋完成！"}學習進度與夥伴經驗不受影響。</p>}
      </>}
      {terminal&&<><p>{room.status==="declined"?"好友這次先不了，下次再一起玩。":room.status==="cancelled"?"邀請已取消。":room.status==="expired"?"邀請已逾時，可以稍後再邀請。":""}</p><button disabled={!allowed} onClick={async()=>{if(await c.act("dismiss"))close();}}>完成</button></>}
    </SocialDialog>}
  </>;
}
