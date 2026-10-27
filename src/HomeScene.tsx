import { ReadingContext, annotateTree } from "./readability";
import { useContext, useState, type CSSProperties } from "react";
import { petById, type Profile } from "./game-view";
import { BUILDINGS, RESOURCE_KEYS } from "./territory";
import { furnitureSpec, freshHomeDecor, homeStock } from "./home-decoration";
import { FurnitureArt, LearningStars, RoomStage } from "./HomeArt";
import CastleIllustration from "./CastleIllustration";

export default function HomeScene({ profile, onTerritory, onRoom, reduced }: { profile: Profile; onTerritory: () => void; onRoom: () => void; reduced: boolean }) {
  const { grade } = useContext(ReadingContext);
  const [view, setView] = useState<"land"|"room">("land"), [greet, setGreet] = useState(false);
  const t = profile.territory, pet = petById(profile.equipped)!;
  const goal = furnitureSpec(profile.homeDecor?.goal), stock = homeStock(profile);
  const ready = goal && RESOURCE_KEYS.every(k=>stock[k]>=goal.cost[k]);
  const fraction = goal ? Math.min(...RESOURCE_KEYS.filter(k=>goal.cost[k]>0).map(k=>Math.min(1,stock[k]/goal.cost[k]))) : 0;
  return annotateTree(<div className="companion-home" aria-label="夥伴的家">
    <div className="home-scene-heading"><div><span>和你一起住在星海</span><h2>{pet.name}的家</h2></div><LearningStars profile={profile}/></div>
    <div className="home-scene-tabs"><button aria-pressed={view==="land"} onClick={()=>setView("land")}>我的領地</button><button aria-pressed={view==="room"} onClick={()=>setView("room")}>城堡房間</button></div>
    {view==="land" ? <div className={`home-island ${t?.theme==="night"?"night":""}`}>
      <img className="home-island-bg" src="/assets/territory/island.webp" alt="你的城堡、花園與已建成的領地" draggable={false}/>
      {(t?.buildings ?? [{id:0,kind:"hall",plot:0,level:1}]).filter(b=>b.plot!==null).map(b=>{
        const plot=b.plot!,s=BUILDINGS.find(s=>s.id===b.kind)!;
        return <button key={b.id} className={`home-island-building ${b.kind==="hall"?"castle":""}`} style={{left:`${42+(plot%6)*7-Math.floor(plot/6)*4}%`,top:`${32+Math.floor(plot/6)*7+(plot%6)*2}%`,zIndex:30+plot} as CSSProperties} aria-label={b.kind==="hall"?"進入城堡房間":`佈置${s.name}`} onClick={b.kind==="hall"?onRoom:onTerritory}>
          {b.kind==="hall"?<CastleIllustration styleId={t?.castleStyle??"star-tide"} expansion={t?.expansion??0} decorative/>:<span className="territory-art" style={{backgroundPosition:`${(s.art%4)*100/3}% ${Math.floor(s.art/4)*100/3}%`}}/>}
        </button>;
      })}
      <button className={`home-island-friend ${greet&&!reduced?"greeting":""}`} aria-label={`和${pet.name}打招呼`} onClick={()=>setGreet(v=>!v)}><img src={pet.thumbnail??pet.image} alt=""/><span>{greet?"一起佈置我們的家吧！":pet.name}</span></button>
      <div className="home-scene-actions"><button onClick={onTerritory}>佈置領地</button><button onClick={onRoom}>進屋佈置</button></div>
    </div>:<><RoomStage decor={profile.homeDecor??freshHomeDecor()} room={0} profile={profile} reduced={reduced}/><div className="home-room-entry"><button className="f-primary" onClick={onRoom}>{profile.homeDecor?"佈置我的房間":"住進我的家"}</button></div></>}
    <button className="home-wish" onClick={onRoom} aria-label={goal?`我的家具目標：${goal.name}，${ready?"可以製作":"繼續累積材料"}`:"挑選想要的家具"}>
      <span className="home-wish-art" style={{"--wish-progress":`${fraction*360}deg`} as CSSProperties}><FurnitureArt kind={goal?.id??"bed"}/></span>
      <span><small>{goal?"想為家裡添一件":"下一個小心願"}</small><b>{goal?.name??"挑選喜歡的家具"}</b></span><span className="home-wish-cta">{ready?"可以做了 ✦":"去看看 ›"}</span>
    </button>
  </div>, grade);
}
