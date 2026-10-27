import { newFamily, validateFamily, startRun } from '../src/adventure';
import { ROSTER } from '../src/game-view';
const family = newFamily();
for (const id of ['quintus','feifei','qingqing','doudou'] as const) {
  startRun(family,id,'math',`benchmark-${id}`,0);
  const p = family.profiles[id];
  p.growth.xp = Object.fromEntries(ROSTER.map(pet => [pet.id, 1000000]));
  p.growth.credited = [...p.run!.questions];
}
const durations:number[]=[];
for (let i=0;i<1000;i++) {
  const start=performance.now(); validateFamily(JSON.parse(JSON.stringify(family)));
  durations.push(performance.now()-start);
}
durations.sort((a,b)=>a-b);
console.log(JSON.stringify({samples:1000,profiles:4,speciesPerProfile:ROSTER.length,creditedPerProfile:5,p50Ms:durations[500],p95Ms:durations[950],maxMs:durations[999],serializedBytes:Buffer.byteLength(JSON.stringify(family)),scope:'Local normalization benchmark, not production capacity'},null,2));
