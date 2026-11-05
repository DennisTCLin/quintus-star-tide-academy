import { shieldActive, type Tile } from './conquest';

// Ownership, battle playback, and protection are independent; none is persisted here.
export function territoryStatus(tile: Tile, player: string, combatTileId?: string | null, now = Date.now()) {
  const fighting = combatTileId === tile.id || (tile.battleUntil ?? 0) > now;
  const own = tile.owner === player;
  return {
    kind: fighting ? 'war' : tile.owner ? 'occupied' : 'unoccupied',
    label: fighting ? '交戰中' : tile.owner ? '已被佔領' : '尚未佔領',
    ownerLabel: own ? '我的領地' : tile.owner ? tile.ownerInfo?.name ?? '其他領主' : '野怪駐守',
    own,
  } as const;
}
export function protectionStatus(tile: Tile, now: number) {
  if (!tile.owner) return '';
  if (shieldActive(tile, now)) return `護盾保護 · 剩 ${remaining(tile.shieldUntil, now)}`;
  if ((tile.shieldStartsAt ?? 0) > now) return `整備中 · ${remaining(tile.shieldStartsAt!, now)}後開盾`;
  return '無護盾';
}
function remaining(end: number, now: number) {
  const minutes = Math.max(1, Math.ceil((end - now) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小時 ${minutes % 60} 分` : `${minutes} 分`;
}
