import { describe, it, expect } from "vitest";
import { newFamily, validateFamily } from "../adventure";
import { FURNITURE, homeDecorTransition as go, validateHomeDecor, freshHomeDecor, itemPosition } from "../home-decoration";
import { freshLearningRewards } from "../learning-rewards";
import { MAX_STOCK, territoryTransition } from "../territory";
const now=1792860000000;
function opened(){const p=newFamily().profiles.quintus;Object.assign(p,go(p,{action:"open"},now));return p;}
function save(p:ReturnType<typeof opened>,d=p.homeDecor!){return go(p,{action:"save",baseRevision:p.homeDecor!.revision,items:d.items,rooms:d.rooms,resident:d.resident},now);}
describe("persistent free-placement companion homes",()=>{
 it("reads old saves without gifts; explicit open initializes once and preserves everything else",()=>{
  const family=newFamily(),p=family.profiles.quintus,old=structuredClone(family);validateFamily(family);expect(family).toEqual(old);expect(p.homeDecor).toBeUndefined();
  Object.assign(p,go(p,{action:"open"},now));expect(p.homeDecor!.items).toHaveLength(3);const first=structuredClone(p);
  Object.assign(p,go(p,{action:"open"},now));expect(p).toEqual(first);expect(p.owned).toEqual(old.profiles.quintus.owned);expect(p.growth).toEqual(old.profiles.quintus.growth);expect(p.coins).toBe(old.profiles.quintus.coins);validateFamily(family);
 });
 it("crafts from server prices exactly once per transition without modifying the input",()=>{
  const p=opened(),old=structuredClone(p),spec=FURNITURE.find(x=>x.id==="bed")!;const out=go(p,{action:"craft",kind:"bed"},now);
  expect(p).toEqual(old);expect(out.homeDecor!.items).toHaveLength(4);expect(out.homeDecor!.items.at(-1)).toMatchObject({kind:"bed",room:null});
  for(const k of ["wood","stone","star"] as const)expect(out.territory!.resources[k]).toBe(p.territory!.resources[k]-spec.cost[k]);
  for(const c of [{action:"craft",kind:"bed",cost:0},{action:"craft",kind:"__proto__"},{action:"save",baseRevision:0,items:[],rooms:[],resident:null}])expect(()=>go(p,c,now)).toThrow();expect(p).toEqual(old);
 });
 it("spending creates space for pending learning materials, without losing overflow",()=>{
  const p=opened();p.territory!.resources={wood:MAX_STOCK,stone:MAX_STOCK,star:MAX_STOCK};p.learningRewards=freshLearningRewards();p.learningRewards.pending={wood:100,stone:100,star:100};
  const out=go(p,{action:"craft",kind:"bed"},now);expect(out.territory!.resources).toEqual(p.territory!.resources);expect(out.learningRewards!.pending).toEqual({wood:60,stone:88,star:88});
  p.territory!.resources={wood:0,stone:0,star:0};p.learningRewards.pending={wood:1,stone:1,star:1};const before=structuredClone(p);expect(()=>go(p,{action:"craft",kind:"bed"},now)).toThrow("材料");expect(p).toEqual(before);
 });
 it("rearranging, rotating, walls, floors and storage never spend resources or mint furniture",()=>{
  const p=opened(),d=structuredClone(p.homeDecor!);d.items[1].x=60;d.items[1].rotation=3;d.items[2].room=null;d.rooms[0]={wall:"moon",floor:"wood"};d.resident=p.equipped;
  const out=save(p,d);expect(out.homeDecor!.items).toEqual(d.items);expect(out.territory).toEqual(p.territory);expect(out.homeDecor!.rooms).toEqual(d.rooms);expect(out.homeDecor!.revision).toBe(1);
  Object.assign(p,out);const again=structuredClone(p.homeDecor!);again.items[2].room=0;expect(save(p,again).homeDecor!.items).toHaveLength(3);
 });
 it("rejects forged inventory, duplicates, coordinates, skins, pets and stale drafts atomically",()=>{
  const p=opened(),old=structuredClone(p);
  const attempts=[(d:any)=>d.items.push({...d.items[0],id:99}), (d:any)=>d.items[0].kind="bed",(d:any)=>d.items[1].id=d.items[0].id,(d:any)=>d.items[1].x=Infinity,(d:any)=>d.items[1].rotation=4,(d:any)=>d.rooms[0].floor="script",(d:any)=>d.resident="not-owned"];
  for(const edit of attempts){const d=structuredClone(p.homeDecor!);edit(d);expect(()=>save(p,d)).toThrow();expect(p).toEqual(old);}
  expect(()=>go(p,{action:"save",baseRevision:999,items:p.homeDecor!.items,rooms:p.homeDecor!.rooms,resident:null},now)).toThrow("另一個");
 });
 it("tabletop objects stay attached through movement; orphaned support is rejected",()=>{
  let p=opened();Object.assign(p,go(p,{action:"craft",kind:"table"},now));Object.assign(p,go(p,{action:"craft",kind:"globe"},now));const d=structuredClone(p.homeDecor!),table=d.items[3],globe=d.items[4];table.room=0;table.x=60;table.y=73;globe.room=0;globe.parent=table.id;globe.x=2;globe.y=0;
  Object.assign(p,save(p,d));expect(itemPosition(p.homeDecor!.items[4],p.homeDecor!.items)).toMatchObject({x:62,y:63});
  const moved=structuredClone(p.homeDecor!);moved.items[3].x=50;expect(save(p,moved).homeDecor!.items[4].parent).toBe(table.id);expect(itemPosition(moved.items[4],moved.items)).toMatchObject({x:52,y:63});
  moved.items[3].room=null;expect(()=>save(p,moved)).toThrow();moved.items[4]={...moved.items[4],room:null,parent:null,x:50,y:73};expect(()=>save(p,moved)).not.toThrow();
 });
 it("rugs remain above the floor at every supported depth",()=>{
  const d=freshHomeDecor(),rug=d.items[0];for(const layer of [-2,-1,0,1,2])expect(itemPosition({...rug,layer},d.items).z).toBeGreaterThan(1);
 });
 it("expanded rooms preserve existing layout and reject locked rooms",()=>{
  const p=opened(),d=structuredClone(p.homeDecor!);d.items[0].room=1;expect(()=>save(p,d)).toThrow();
  p.territory=territoryTransition(p.territory,{action:"expand"},now,p.owned,{[p.equipped]:50});expect(save(p,d).homeDecor!.items[0].room).toBe(1);expect(p.homeDecor!.items[0].room).toBe(0);
 });
 it("goal selection is free, and stored resident history survives a lawful companion trade",()=>{
  const p=opened();const out=go(p,{action:"goal",goal:"bed"},now);expect(out.territory).toEqual(p.territory);expect(out.homeDecor!.items).toEqual(p.homeDecor!.items);
  const d=freshHomeDecor();d.resident="previously-owned";expect(()=>validateHomeDecor(d)).not.toThrow();
 });
});
