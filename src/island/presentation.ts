import { isExam, type Item, type Mode } from './games';
import { CHALLENGE_QUESTIONS, MAX_MISTAKES } from '../challenge-rules';
import { cnq } from './rng';
import type { IslandRun } from './schema';
import { islandFailed } from './schema';
import { petById } from '../game-view';
// Encounter snapshots are authoritative; pre-encounter saves retain their old guardian.
const LEGACY_GUARDIANS:Record<string,string>={'1A-01':'compasscrab','1A-04':'echojelly','1A-06':'cyclonedolphin'};
export function islandGuardian(run:Pick<IslandRun,'mode'|'unit'|'encounter'>) {
  const id=run.encounter?.variant ?? (run.mode==='mock'?'atlaswhale':LEGACY_GUARDIANS[run.unit??'']);
  return id?petById(id):undefined;
}
export type Seg = {t:'demo'; k:string; again?:boolean} | {t:'item';item:Item};
export function islandSegments(run:IslandRun):Seg[] {
  const segs:Seg[]=[];
  run.items.forEach((item,i)=>{
    if(run.mode==='learn' && (i===0 || run.items[i-1].k!==item.k)) segs.push({t:'demo',k:item.k});
    segs.push({t:'item',item});
    if(run.mode==='play' && run.answers[i] !== undefined && run.answers[i] !== item.answer && !islandFailed(run)) segs.push({t:'demo',k:item.k,again:true});
  });
  return segs;
}
/** Replay a boundary/remedial demonstration after interruption; never silently skip teaching. */
export function resumePosition(run:IslandRun,segs:Seg[]) {
  const count=run.answers.length;
  if(!count) return 0;
  if(islandFailed(run)) return segs.findIndex(s=>s.t==='item'&&s.item===run.items[count-1]);
  if(count===run.items.length) return segs.length-1;
  const at=segs.findIndex(s=>s.t==='item'&&s.item===run.items[count]);
  return segs[at-1]?.t==='demo'?at-1:at;
}

/** One result contract for spoken feedback, mood and the visible completion state. */
export function islandOutcome(r: {mode:Mode;size:number;right:number;wrong:number}, guardianName = "神獸") {
  const failed=r.mode!=='learn' && r.wrong>=MAX_MISTAKES;
  const pass=r.mode==='learn' || (!failed && r.size===CHALLENGE_QUESTIONS && r.right+r.wrong===CHALLENGE_QUESTIONS);
  const head=failed ? "已經答錯三題，這次挑戰先結束。休息一下，再來試試！"
    : r.mode==='learn' ? `學一學完成了！答對${cnq(r.right)}題。接著去玩一玩，自己試試看！`
    : pass ? isExam(r.mode) ? `六題挑戰完成，你打敗了${guardianName}！` : `六題挑戰完成！答對${cnq(r.right)}題。`
    : "這次挑戰還沒完成，我們再來試試！";
  return {failed,pass,mood:pass?'happy' as const:'cheer' as const,head};
}
export function islandWrongFeedback(mode:Mode, wrong:number, answer:string) {
  const failed=mode!=='learn' && wrong>=MAX_MISTAKES;
  const reteach=mode==='play' && !failed;
  return {reteach,bubble:failed ? "已經答錯三題，這次先休息一下。" : reteach ? "沒關係，我再教你一次。" : "沒關係，這題明天會再來找你。",
    speech:failed ? "已經答錯三題，這次挑戰先結束。休息一下，再來試試！" : reteach ? `答案是${answer}。沒關係，我們再看一次怎麼做。` : `答案是${answer}。沒關係，下次再試。`};
}
