import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
// Standalone recovery page must not initialize the game's cloud client.
// @ts-expect-error plain browser module
import { createArchive, readOriginals } from '../../public/legacy-progress.js';
function storage(values: Record<string,string>) { return { get length(){return Object.keys(values).length;}, key:(i:number)=>Object.keys(values)[i], getItem:(k:string)=>values[k]??null }; }
describe('lossless original-browser archive',()=>{
 it('preserves scoped, unscoped, malformed and unknown JSON fields without including authentication',async()=>{
  const raw=' {"season":"season-2020-01","log":["舊戰果"],"unknown":{"retained":true}}\n';
  const values={'star-tide.conquest.v2.player':raw,'star-tide.conquest.v2.family.player':'{damaged','star-tide.conquest-heroes.v1':'{}','star-tide.conquest-heroes.v1.family':'{"player":"hero"}','star-tide.family.v1':'{"version":1}','session-token':'secret','star-tide.conquest.v20.fake':'excluded'};
  const archive=await createArchive(storage(values),'https://game.example',webcrypto.subtle,new Date('2026-11-06T00:00:00Z'));
  expect(archive.entries).toHaveLength(5);
  for(const entry of archive.entries) { expect(entry.raw).toBe(values[entry.key as keyof typeof values]); expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/); }
  expect(JSON.stringify(archive)).not.toContain('secret');
  expect(archive.entries.find((e:{key:string})=>e.key==='star-tide.conquest.v2.player').raw).toBe(raw);
  expect(readOriginals(storage(values))).toHaveLength(5);
 });
 it('rejects no originals and concurrent changes without writing anything',async()=>{
  await expect(createArchive(storage({}),'https://game.example',webcrypto.subtle)).rejects.toThrow('沒有找到');
  const values={'star-tide.conquest.v2.player':'original'};
  const changing={digest:async(...args:Parameters<SubtleCrypto['digest']>)=>{values['star-tide.conquest.v2.player']='changed'; return webcrypto.subtle.digest(...args);}};
  await expect(createArchive(storage(values),'https://game.example',changing)).rejects.toThrow('正在更新');
 });
});
