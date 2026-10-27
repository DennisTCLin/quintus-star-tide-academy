import {afterEach, describe, expect, it, vi} from 'vitest';
import {clientId} from '../client-id';
afterEach(()=>vi.unstubAllGlobals());
describe('client command IDs',()=>{
 it('uses the native UUID implementation in secure contexts',()=>{
  const native=vi.fn(()=> '00000000-0000-4000-8000-000000000000');
  vi.stubGlobal('crypto',{randomUUID:native});
  expect(clientId()).toBe('00000000-0000-4000-8000-000000000000');
  expect(native).toHaveBeenCalledOnce();
 });
 it('uses cryptographic bytes with UUID v4 version and variant over LAN HTTP',()=>{
  const fill=vi.fn((bytes:Uint8Array)=>{bytes.fill(255);return bytes;});
  vi.stubGlobal('crypto',{getRandomValues:fill});
  expect(clientId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  expect(fill).toHaveBeenCalledOnce();
 });
 it('preserves zero padding',()=>{
  vi.stubGlobal('crypto',{getRandomValues:(bytes:Uint8Array)=>bytes});
  expect(clientId()).toBe('00000000-0000-4000-8000-000000000000');
 });
});
