import {it,expect} from 'vitest';
import {packSeen,unpackSeen} from '../family-seen-codec';
import {newFamily,validateFamily,startRun,answerRun} from '../adventure';
import {LEARNING_BANK,questionById} from '../learning';
import {hasMastered} from '../mastered-questions';
import {exportBackup,parseBackup,restoreFamily} from '../family-store';
const seed=()=>{
 const f=newFamily();f.profiles.quintus.learning.seen=LEARNING_BANK.filter(q=>q.grade===4&&q.course!=='math').map(q=>q.id);
 f.profiles.quintus.coins=1234;f.profiles.quintus.tickets=3;return f;
};
it('roundtrips ordered IDs including unknown history without catalog indices or deduplication',()=>{
 const ids=['unknown-prefix-001','unknown-prefix-002','unknown-prefix-001','跨版本-😀一','跨版本-😀二'];
 expect(unpackSeen(packSeen(ids))).toEqual(ids);
 expect(()=>validateFamily({...newFamily(),profiles:{...newFamily().profiles,quintus:{...newFamily().profiles.quintus,learning:{...newFamily().profiles.quintus.learning,seen:packSeen(ids)}}}})).toThrow();
});
it('rejects malformed and over-budget streams without changing their input',()=>{
 for(const entries of [[[1,'x']],[[-1,'x']],[[0,'a'],[2,'b']],[[0,7]],[[0,'x','extra']],[[0,'a'.repeat(513)]],Array(100001).fill([0,'x'])]){
  const input={codec:'prefix-v1',entries};const before=JSON.stringify(input);
  expect(()=>unpackSeen(input)).toThrow();expect(JSON.stringify(input)).toBe(before);
 }
 expect(()=>unpackSeen({codec:'prefix-v2',entries:[]})).toThrow();
 expect(()=>unpackSeen({codec:'prefix-v1',entries:Array(10000).fill([0,'x'.repeat(512)])})).toThrow();
});
it('uses actual JSON persistence while keeping runtime and cloned values as arrays',()=>{
 const f=seed(),before=structuredClone(f),raw=JSON.stringify(f);
 expect(JSON.parse(raw).profiles.quintus.learning.seen.codec).toBe('prefix-v1');
 expect(f).toEqual(before);expect(JSON.stringify(f)).toBe(raw);
 expect(Array.isArray(structuredClone(f).profiles.quintus.learning.seen)).toBe(true);
 const restored=validateFamily(JSON.parse(raw));expect(restored).toEqual(before);
 expect(JSON.parse(JSON.stringify(restored))).toEqual(JSON.parse(raw));
 // Cloning intentionally drops hooks; the actual save boundary reinstalls it.
 expect(JSON.parse(JSON.stringify(validateFamily(structuredClone(f))))).toEqual(JSON.parse(raw));
 expect(hasMastered(restored.profiles.quintus.learning,before.profiles.quintus.learning.seen[0])).toBe(false);
});
it('reads legacy array backups and compact backups and merges their distinct seen history',()=>{
 const current=seed(),legacy=structuredClone(current);legacy.profiles.quintus.learning.seen=legacy.profiles.quintus.learning.seen.slice(0,3);
 const old=JSON.stringify({format:'star-tide-family',version:1,family:legacy});
 expect(parseBackup(old)).toEqual(legacy);
 const imported=parseBackup(JSON.stringify(exportBackup(current)));expect(imported).toEqual(current);
 restoreFamily(legacy,imported);const merged=legacy;
 expect(merged.profiles.quintus.learning.seen).toEqual(current.profiles.quintus.learning.seen);
 expect(merged.profiles.quintus.coins).toBe(1234);expect(merged.profiles.quintus.tickets).toBe(3);
});
it('preserves an active run and settles its answer only once after compact reload',()=>{
 const f=seed();startRun(f,'quintus','math','codec-reload-run',0);
 const restored=validateFamily(JSON.parse(JSON.stringify(f))),run=restored.profiles.quintus.run!;
 expect(run).toEqual(f.profiles.quintus.run);
 answerRun(restored,'quintus',run.id,0,questionById(run.questions[0])!.answer);
 const once=validateFamily(JSON.parse(JSON.stringify(restored))),coins=once.profiles.quintus.coins;
 expect(()=>answerRun(once,'quintus',run.id,0,questionById(run.questions[0])!.answer)).toThrow();
 expect(once.profiles.quintus.coins).toBe(coins);
});

it('can stop compact writes while retaining the reader and existing rewards',()=>{
 const f=seed(),encoded=JSON.stringify(f),previous=process.env.STAR_TIDE_COMPACT_SEEN_WRITES;
 try{
  process.env.STAR_TIDE_COMPACT_SEEN_WRITES='off';
  const restored=validateFamily(JSON.parse(encoded));
  const plain=JSON.parse(JSON.stringify(restored));
  expect(Array.isArray(plain.profiles.quintus.learning.seen)).toBe(true);
  expect(validateFamily(plain)).toEqual(f);
  expect(restored.profiles.quintus.coins).toBe(1234);
 }finally{if(previous===undefined)delete process.env.STAR_TIDE_COMPACT_SEEN_WRITES;else process.env.STAR_TIDE_COMPACT_SEEN_WRITES=previous;}
});
it('preserves tolerated extra profile values and never emits an unreadable codec',()=>{
 const f=newFamily() as ReturnType<typeof newFamily>&{profiles:Record<string,unknown>};
 f.profiles.historicalExtra=null;
 expect(()=>JSON.stringify(validateFamily(f))).not.toThrow();
 const ids=['u'.repeat(600)+'1','u'.repeat(600)+'2'];
 expect(unpackSeen(packSeen(ids))).toEqual(ids);
});
