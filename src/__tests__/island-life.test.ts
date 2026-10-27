import { describe, expect, it } from "vitest";
import { ROSTER } from "../game-view";
import { clearGround, createWalkMap, createWalkers, greetWalker, islandBatch, ownedIslandIds, stepWalkers } from "../island-life";

describe("island residents", () => {
  it("uses current ownership, includes rescued/garden companions, never clones duplicates", () => {
    const ids=[ROSTER[0].id,"otter",ROSTER.at(-1)!.id];
    const owned=Object.fromEntries(ids.map(id=>[id,3]));
    const before=JSON.stringify(owned);
    expect(ownedIslandIds({...owned,unknown:1},ids[2])).toEqual([ids[2],...ids.slice(0,2)]);
    expect(JSON.stringify(owned)).toBe(before);
    expect(ownedIslandIds({},ids[0])).toEqual([]);
    delete owned[ids[2]];
    expect(ownedIslandIds(owned,ids[2])).not.toContain(ids[2]);
  });
  it("keeps equipped companion present while eventually showing every owned species", () => {
    const ids=ROSTER.map(p=>p.id);
    for (const limit of [6,8]) {
      const seen=new Set<string>();
      for(let page=0;page<ids.length;page++) {
        const batch=islandBatch(ids,page,limit);
        expect(batch[0]).toBe(ids[0]);expect(new Set(batch).size).toBe(limit);
        batch.forEach(id=>seen.add(id));
      }
      expect(seen.size).toBe(ids.length);
    }
    expect(islandBatch([],0,8)).toEqual([]);
    expect(islandBatch(ids.slice(0,3),99,8)).toEqual(ids.slice(0,3));
  });
});
describe("safe island paths", () => {
  for (const plots of [[0],[0,2,7,12,19],Array.from({length:24},(_,i)=>i)]) {
    it(`stays on land and outside ${plots.length} building bases through play/greeting interruptions`, () => {
      const map=createWalkMap(plots),walkers=createWalkers(ROSTER.slice(0,8).map(p=>p.id),map,3);
      expect(walkers).toHaveLength(8);
      const start=walkers.map(w=>[w.x,w.y]),moods=new Set<string>();
      for(let frame=0;frame<4000;frame++) {
        if(frame%233===0)greetWalker(walkers[frame%walkers.length]);
        stepWalkers(walkers,map,.1);
        for(const w of walkers) {expect(clearGround(w,plots)).toBe(true);moods.add(w.mood);}
      }
      expect(walkers.map(w=>[w.x,w.y])).not.toEqual(start);
      expect([...moods]).toEqual(expect.arrayContaining(["walk","hello","play","sleep","rest"]));
    });
  }
  it("does not teleport after a suspended tab and tolerates empty ownership", () => {
    const map=createWalkMap([0]),walkers=createWalkers([ROSTER[0].id],map);
    walkers[0].mood="walk";
    const {x,y}=walkers[0];stepWalkers(walkers,map,3600);
    expect(Math.hypot(walkers[0].x-x,walkers[0].y-y)).toBeLessThan(.3);
    expect(createWalkers([],map)).toEqual([]);
    expect(createWalkers([ROSTER[0].id],[])).toEqual([]);
    expect(()=>stepWalkers([],map,1)).not.toThrow();
  });
});
