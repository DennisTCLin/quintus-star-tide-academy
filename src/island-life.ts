import { ROSTER } from "./game-view";

export type GroundPoint = { x: number; y: number };
export type WalkNode = GroundPoint & { neighbors: number[] };
export type IslandMood = "walk" | "rest" | "play" | "sleep" | "hello";
export type IslandWalker = GroundPoint & {
  id: string; node: number; next: number; previous: number; direction: number;
  mood: IslandMood; remaining: number; random: number; steps: number; speed: number;
};

// Grass and paved paths only: the cliff, water and upper-right towers stay out.
export const ISLAND_GROUND: readonly GroundPoint[] = [
  {x:41,y:29},{x:58,y:27},{x:65,y:34},{x:72,y:42},{x:71,y:50},
  {x:64,y:57},{x:57,y:62},{x:44,y:62},{x:35,y:58},{x:30,y:51},
  {x:31,y:44},{x:36,y:36},
];
export const plotGround = (plot: number): GroundPoint => ({
  x:42+(plot%6)*7-Math.floor(plot/6)*4,
  y:32+Math.floor(plot/6)*7+(plot%6)*2,
});
export function onIslandGround(p: GroundPoint) {
  let inside=false;
  for(let i=0,j=ISLAND_GROUND.length-1;i<ISLAND_GROUND.length;j=i++) {
    const a=ISLAND_GROUND[i],b=ISLAND_GROUND[j];
    if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
export function clearGround(p: GroundPoint, plots: readonly number[]) {
  return onIslandGround(p) && plots.every(plot=>{
    const b=plotGround(plot);
    return ((p.x-b.x)/3.5)**2+((p.y-b.y)/2.6)**2>1;
  });
}
export function createWalkMap(plots: readonly number[]): WalkNode[] {
  const nodes: WalkNode[]=[], cells=new Map<string,number>();
  const step=1.4;
  for(let row=0;row<26;row++) for(let col=0;col<32;col++) {
    const p={x:30+col*step,y:27+row*step};
    if(clearGround(p,plots)) {cells.set(`${col}:${row}`,nodes.length);nodes.push({...p,neighbors:[]});}
  }
  for(const [key,index] of cells) {
    const [col,row]=key.split(":").map(Number), a=nodes[index];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
      const target=cells.get(`${col+dx}:${row+dy}`);
      if(target===undefined) continue;
      const b=nodes[target];
      // Sampling the segment prevents diagonals cutting through a building base.
      if([.25,.5,.75].every(t=>clearGround({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},plots))) a.neighbors.push(target);
    }
  }
  return nodes;
}
export function ownedIslandIds(owned: Readonly<Record<string,number>>, equipped: string) {
  const ids=ROSTER.filter(p=>(owned[p.id]??0)>0).map(p=>p.id);
  return ids.includes(equipped)?[equipped,...ids.filter(id=>id!==equipped)]:ids;
}
export function islandBatch(ids: readonly string[], page: number, limit: number): string[] {
  if(limit<1 || !ids.length) return [];
  if(ids.length<=limit) return [...ids];
  if(limit===1) return [ids[((page%ids.length)+ids.length)%ids.length]];
  const rest=ids.slice(1), start=(Math.max(0,Math.floor(page))*(limit-1))%rest.length;
  return [ids[0],...Array.from({length:limit-1},(_,i)=>rest[(start+i)%rest.length])];
}
function seed(id: string) {let n=2166136261;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function random(w: IslandWalker) {w.random=(Math.imul(w.random,1664525)+1013904223)>>>0;return w.random/4294967296;}
export function createWalkers(ids: readonly string[], map: readonly WalkNode[], visit=0): IslandWalker[] {
  const usable=map.map((p,i)=>p.neighbors.length>1?i:-1).filter(i=>i>=0);
  if(!usable.length) return [];
  const placed: IslandWalker[]=[];
  ids.forEach((id,i)=>{
    const w: IslandWalker={id,x:0,y:0,node:0,next:0,previous:-1,direction:1,mood:i%3===0?"play":i%3===1?"walk":"rest",remaining:2+i*.7,random:seed(id+":"+visit),steps:8,speed:1.6};
    let node=usable[Math.floor(random(w)*usable.length)];
    for(let n=0;n<40 && placed.some(p=>Math.hypot((p.x-map[node].x)*1.8,p.y-map[node].y)<8);n++) node=usable[Math.floor(random(w)*usable.length)];
    Object.assign(w,{x:map[node].x,y:map[node].y,node,next:node,speed:1.4+random(w)*.65,direction:random(w)>.5?1:-1});
    placed.push(w);
  });
  return placed;
}
export function greetWalker(w: IslandWalker) {w.mood="hello";w.remaining=3.2;}
function nextStep(w: IslandWalker,map: readonly WalkNode[]) {
  const candidates=map[w.node].neighbors.filter(i=>i!==w.previous);
  const pool=candidates.length?candidates:map[w.node].neighbors;
  if(!pool.length){w.mood="rest";w.remaining=3;return;}
  const previous=map[w.previous], current=map[w.node];
  const straight=previous?pool.filter(i=>{
    const p=map[i];return (current.x-previous.x)*(p.x-current.x)+(current.y-previous.y)*(p.y-current.y)>0;
  }):[];
  const choices=straight.length&&random(w)<.8?straight:pool;
  w.next=choices[Math.floor(random(w)*choices.length)];
  const dx=map[w.next].x-w.x;if(Math.abs(dx)>.1)w.direction=dx>0?1:-1;
}
export function stepWalkers(walkers: IslandWalker[],map: readonly WalkNode[],dt: number, walkable?: ReadonlySet<string>) {
  // A hidden tab never catches up several minutes of motion in one frame.
  dt=Math.max(0,Math.min(.1,dt));
  for(const w of walkers) {
    // Never slide a portrait (or a failed/loading atlas) around the island.
    if(walkable && !walkable.has(w.id)) {
      if(w.mood==="hello") {w.remaining-=dt;if(w.remaining<=0)w.mood="rest";}
      else w.mood="rest";
      continue;
    }
    if(w.mood!=="walk") {
      w.remaining-=dt;
      if(w.remaining<=0){w.mood="walk";w.steps=5+Math.floor(random(w)*10);if(w.next===w.node)nextStep(w,map);}
      continue;
    }
    if(w.next===w.node) nextStep(w,map);
    if(w.mood!=="walk")continue;
    const p=map[w.next],dx=p.x-w.x,dy=p.y-w.y,distance=Math.hypot(dx*1.8,dy),travel=w.speed*dt;
    if(distance<=travel) {
      w.x=p.x;w.y=p.y;w.previous=w.node;w.node=w.next;w.steps--;
      if(w.steps<=0) {
        const n=random(w);w.mood=n<.4?"play":n<.78?"rest":"sleep";w.remaining=3+random(w)*5;
        const friend=walkers.find(other=>other!==w && other.mood!=="hello" && Math.hypot((other.x-w.x)*1.8,other.y-w.y)<9);
        if(friend && w.mood==="play") {friend.mood="play";friend.remaining=w.remaining;w.direction=friend.x>w.x?1:-1;friend.direction=-w.direction;}
      } else nextStep(w,map);
    } else {w.x+=dx*travel/distance;w.y+=dy*travel/distance;}
  }
}
