import { expect, it } from 'vitest';
import { createConquest, SHIELD_DELAY_MS, SHIELD_MS } from '../conquest';
import { islandProtection, protectionStatus, territoryMarker, territoryStatus } from '../conquest-presentation';

const now = Date.UTC(2026, 10, 3);
const wild = createConquest(undefined, now).tiles[0];
const owned = { ...wild, owner: 'quintus', capturedAt: now, shieldStartsAt: now + SHIELD_DELAY_MS, shieldUntil: now + SHIELD_DELAY_MS + SHIELD_MS };
it('keeps wild occupation distinct from player-owned territory', () => {
  expect(territoryStatus(wild, 'quintus')).toMatchObject({ label: '尚未佔領', ownerLabel: '野怪駐守', own: false });
  expect(territoryStatus(owned, 'quintus')).toMatchObject({ label: '已被佔領', ownerLabel: '我的領地', own: true });
  expect(territoryStatus(owned, 'alston')).toMatchObject({ label: '已被佔領', ownerLabel: '其他領主', own: false });
});
it('does not mistake shield delay or expiration for a battle', () => {
  expect(protectionStatus(owned, now)).toContain('整備中');
  expect(protectionStatus(owned, now + SHIELD_DELAY_MS)).toContain('保護中');
  expect(protectionStatus(owned, owned.shieldUntil)).toContain('可被進攻');
  expect(territoryStatus(owned, 'quintus').kind).toBe('occupied');
  expect(protectionStatus(wild, now)).toBe('');
});
it('only marks the active battle island and restores its actual ownership after playback', () => {
  expect(territoryStatus(owned, 'quintus', owned.id)).toMatchObject({ kind: 'war', own: true });
  expect(territoryStatus(wild, 'quintus', 'another-island').kind).toBe('unoccupied');
  expect(territoryStatus(owned, 'quintus', null).kind).toBe('occupied');
  expect(territoryStatus({ ...owned, owner: null }, 'quintus', null).kind).toBe('unoccupied');
});
it('shows every occupied island to either viewer, and updates markers as ownership changes', () => {
  const board = createConquest(undefined, now).tiles;
  board.slice(0,10).forEach(t => {t.owner = 'owner-a';});
  board[10].owner = 'owner-b';
  const original = JSON.stringify(board);
  for (const viewer of ['owner-a','owner-b','new-viewer']) {
    expect(board.filter(t => territoryMarker(t,viewer))).toHaveLength(11);
  }
  expect(board.filter(t => territoryMarker(t,'owner-b')?.kind === 'other')).toHaveLength(10);
  expect(territoryMarker(board[0],'owner-b')?.color).not.toBe(territoryMarker(board[10],'owner-b')?.color);
  expect(JSON.stringify(board)).toBe(original);
  const tile = {...wild};
  expect(territoryMarker(tile,'viewer')).toBeNull();
  tile.owner='other'; expect(territoryMarker(tile,'viewer')?.kind).toBe('other');
  tile.owner='viewer'; expect(territoryMarker(tile,'viewer')?.kind).toBe('own');
  tile.owner=null; expect(territoryMarker(tile,'viewer')).toBeNull();
});

it('switches island countdown at the exact shield boundaries without changing the tile', () => {
  const before = JSON.stringify(owned);
  expect(islandProtection(owned, owned.shieldStartsAt - 1)).toMatchObject({ kind: 'preparing', detail: '1 分後開盾' });
  expect(islandProtection(owned, owned.shieldStartsAt)).toMatchObject({ kind: 'protected', detail: '剩餘 24 小時 0 分' });
  expect(islandProtection(owned, owned.shieldUntil - 1)).toMatchObject({ kind: 'protected', detail: '剩餘 1 分' });
  expect(islandProtection(owned, owned.shieldUntil)).toMatchObject({ kind: 'vulnerable', until: null });
  expect(islandProtection({ ...owned, owner: 'another-player' }, now)).toEqual(islandProtection(owned, now));
  expect(islandProtection({ ...owned, owner: null }, now)).toBeNull();
  expect(JSON.stringify(owned)).toBe(before);
});
it('never advertises a currently locked battle as attackable, including after shield expiry', () => {
  const expired = { ...owned, battleUntil: owned.shieldUntil + 20000 };
  expect(islandProtection(expired, owned.shieldUntil)).toMatchObject({ kind: 'war', until: null });
  expect(islandProtection(expired, expired.battleUntil)).toMatchObject({ kind: 'vulnerable' });
  expect(islandProtection(owned, owned.shieldUntil, owned.id)).toMatchObject({ kind: 'war' });
  const legacy = { ...owned, shieldStartsAt: undefined };
  expect(islandProtection(legacy, now)).toMatchObject({ kind: 'protected' });
});
