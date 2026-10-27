import { useEffect, useState } from "react";
import { PLAYERS, type PlayerId, type Profile } from "./game-view";
import PlayerAvatar from "./PlayerAvatar";
import { lastSeenLabel, otherFriends, type PresenceSnapshot } from "./presence";
import { ACTIVITIES } from "./social-activity";
import SocialDialog from "./SocialDialog";
import { PetSelect, selectedOwnedPet } from "./OnlineBattle";
import type { OnlineController } from "./online-battle";

export default function FriendsPresence({ player, snapshot, profile, social, onCollection }: { player: PlayerId; snapshot: PresenceSnapshot; profile?:Profile; social?:OnlineController; onCollection?:(key:string)=>void }) {
  const [now,setNow]=useState(Date.now()),[open,setOpen]=useState(false),[selected,setSelected]=useState<string|null>(null),[pet,setPet]=useState(profile?.equipped??"");
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const chosenPet=profile?selectedOwnedPet(profile,pet):"";
  const known=snapshot!==null&&now-snapshot.receivedAt<25000;
  const serverNow=snapshot?snapshot.data.serverNow+Math.max(0,now-snapshot.receivedAt):now;
  const friends=otherFriends(snapshot?.data.friends??PLAYERS.map(p=>({id:p.id,name:p.name,lastSeenAt:null,onlineUntil:null})),player);
  const online=(until:number|null)=>known&&until!==null&&until>serverNow;
  const count=friends.filter(f=>online(f.onlineUntil)).length;
  const friend=friends.find(f=>(f.key??f.id)===selected);
  const label=(f:typeof friends[number])=>!known?"正在確認狀態…":online(f.onlineUntil)?(f.activity&&ACTIVITIES[f.activity]||"在線上"):lastSeenLabel(f.lastSeenAt,serverNow,f.hasActivity);
  const occupied=social?.state?.room&&['pending','active'].includes(social.state.room.status);
  const close=()=>{setOpen(false);setSelected(null);};
  return <div className="friends-presence" data-learning-content="true">
    <button className="friends-toggle" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setPet(profile?.equipped??"");setOpen(true);}}>
      <span className={`presence-dot ${count?"is-online":""}`} aria-hidden="true"/><span>好友 <b>{known?`${count} 人在線`:"連線中…"}</b></span><span aria-hidden="true">⌄</span>
    </button>
    {open&&<SocialDialog title={friend?friend.name:"一起冒險的好友"} onClose={close}>
      {friend?<>
        <button onClick={()=>setSelected(null)}>← 所有好友</button>
        <div className="friend-detail"><PlayerAvatar id={friend.id} avatarKey={friend.avatarKey??null}/><strong>{friend.name}</strong><p role="status">{label(friend)}</p></div>
        {onCollection&&<button onClick={()=>{const key=friend.key??`household:${friend.id}`;close();onCollection(key);}}>看收藏 →</button>}
        <p>好友活動會自動更新；切換到背景或斷線後，狀態會暫停。</p>
        {profile&&social&&<>
          <PetSelect profile={profile} value={chosenPet} onChange={setPet}/>
          <p>邀請好友一人派一位夥伴切磋，對方接受後才會開始。邀請 90 秒後失效。</p>
          <button className="social-invite" disabled={!friend.key||!online(friend.onlineUntil)||!social.connected||!social.state?.available||social.busy||!!social.uncertain||!!occupied} onClick={async()=>{if(await social.act("invite",{friend:friend.key,pet:chosenPet}))close();}}>邀請線上對戰</button>
          <p>{occupied?"你已有邀請或對戰，請從上方通知查看。":!friend.key||!social.state?.available?"這位玩家尚未開通線上邀戰。":!online(friend.onlineUntil)?"等好友上線後就能邀請。":friend.activity==="learning"||friend.activity==="battle"?"好友正在挑戰中，可以等他有空再接受。":""}</p>
          {social.error&&<p role="alert">{social.error}</p>}
          {social.uncertain&&<button disabled={social.busy} onClick={()=>void social.retry()}>確認同步</button>}
        </>}
      </>:<><p>{friends.length} 位好友 · 點好友查看活動或邀請對戰</p><ul className="friends-list">
        {friends.map(f=><li key={f.key??f.id}><button className="friend-row" onClick={()=>setSelected(f.key??f.id)}>
          <span className="friend-avatar"><PlayerAvatar id={f.id} avatarKey={f.avatarKey??null}/><span className={`presence-dot ${online(f.onlineUntil)?"is-online":""}`} aria-hidden="true"/></span>
          <span className="friend-copy"><strong>{f.name}</strong><span className={online(f.onlineUntil)?"friend-online":""}>{label(f)}</span></span><span aria-hidden="true">›</span>
        </button></li>)}
      </ul><p>{known?"好友狀態約每 10 秒更新。":"暫時無法確認，連線恢復後會自動更新。"}</p></>}
    </SocialDialog>}
  </div>;
}
