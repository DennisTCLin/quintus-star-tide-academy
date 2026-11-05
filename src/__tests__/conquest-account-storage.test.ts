import { afterEach, expect, it, vi } from 'vitest';
import { conquestKey, readConquest, transactConquest } from '../conquest-store';
import { heroSelectionKey, readHeroSelections } from '../conquest-characters';
import { creditAnswer } from '../conquest';

afterEach(() => vi.unstubAllGlobals());
it('isolates accounts sharing a grade slot and does not import the unscoped prototype', async () => {
  const values = new Map<string, string>();
  const request = vi.fn(async (_key: string, action: () => unknown) => action());
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  vi.stubGlobal('navigator', { locks: { request } });
  await transactConquest('feifei', s => creditAnswer(s, 'run:0', true));
  expect(readConquest('feifei', Date.now(), 'alice').energy).toBe(50);
  await transactConquest('feifei', s => creditAnswer(s, 'run:0', true), 'Alice');
  expect(readConquest('feifei', Date.now(), 'alice').energy).toBe(60);
  expect(readConquest('feifei', Date.now(), 'bob').energy).toBe(50);
  await transactConquest('feifei', s => creditAnswer(s, 'run:0', true), 'alice');
  expect(readConquest('feifei', Date.now(), 'alice').energy).toBe(60);
  expect(request).toHaveBeenCalledWith(conquestKey('feifei', 'alice'), expect.any(Function));
  values.set(heroSelectionKey('alice'), JSON.stringify({ feifei: 'hero-elf' }));
  expect(readHeroSelections('Alice')).toEqual({ feifei: 'hero-elf' });
  expect(readHeroSelections('bob')).toEqual({});
});
it('does not report a successful action when browser storage fails', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw Error('quota'); } });
  vi.stubGlobal('navigator', { locks: { request: async (_: string, run: () => unknown) => run() } });
  await expect(transactConquest('feifei', s => creditAnswer(s, 'q', true), 'alice')).rejects.toThrow('quota');
});
