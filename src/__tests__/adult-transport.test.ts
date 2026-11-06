import {afterEach,describe,it,expect,vi} from 'vitest';
import {requestAdult} from '../adult/cloud';
import {freshState} from '../adult/engine';
afterEach(()=>vi.unstubAllGlobals());
describe('adult cloud response integrity',()=>{
 const snapshot={username:'adult_test',csrf:'a'.repeat(64),day:'2026-11-06',state:freshState()};
 const mock=(body:string,status=200)=>vi.stubGlobal('fetch',vi.fn(async()=>new Response(body,{status,headers:{'Content-Type':'application/json'}})));
 it('rejects truncated successful JSON so callers keep the original pending command',async()=>{
  mock('{');await expect(requestAdult('command',{id:'synthetic'})).rejects.toMatchObject({status:0});
 });
 it('rejects successful responses missing the authoritative snapshot or identity',async()=>{
  for(const value of [{ok:true},{...snapshot,state:null},{...snapshot,csrf:''},{...snapshot,username:undefined},{...snapshot,state:{}}]){
   mock(JSON.stringify(value));await expect(requestAdult('state')).rejects.toMatchObject({status:0});
  }
 });
 it('accepts a complete snapshot and only the dedicated logout acknowledgement',async()=>{
  mock(JSON.stringify(snapshot));expect(await requestAdult('state')).toEqual(snapshot);
  mock('{"ok":true}');expect(await requestAdult('logout',{})).toEqual({ok:true});
  mock('{}');await expect(requestAdult('logout',{})).rejects.toMatchObject({status:0});
 });
 it('preserves HTTP errors and treats network failure as unconfirmed',async()=>{
  mock('{"error":"stale"}',409);await expect(requestAdult('command',{})).rejects.toMatchObject({status:409,message:'stale'});
  vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('network');}));await expect(requestAdult('command',{})).rejects.toMatchObject({status:0});
 });
});
