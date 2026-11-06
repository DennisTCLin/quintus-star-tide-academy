import { isNpcOwner, NPC_FACTION } from './conquest-enemy';
import { claimBlock, claimCost, deploymentBlock, hexDistance, shieldActive, territories, type Companion, type ConquestState, type Tile } from './conquest';

// Presentation composes the same rules used by combat; it never grants a claim.
export function claimGuidance(state: ConquestState, player: string, tile: Tile, team: readonly string[], roster: readonly Companion[], now: number, busy = false, storageError?: string) {
  const owned = territories(state, player), own = tile.owner === player;
  const distance = owned.length ? Math.min(...owned.map(t => hexDistance(t.q - tile.q, t.r - tile.r))) : null;
  const adjacentTarget = !own && (distance === null || distance === 1);
  const tileReason = claimBlock(state, player, tile, now, state.shared);
  const units = team.map(id => roster.find(unit => unit.id === id));
  const teamReason = team.length < 3 || team.length > 5 || new Set(team).size !== team.length || units.some(unit => !unit)
    ? '請選擇 3–5 位不同的出征夥伴。'
    : units.map(unit => deploymentBlock(state, unit!)).find(Boolean) ?? null;
  const reason = own ? tileReason : storageError || (busy ? '請等待目前操作完成。' : tileReason ?? teamReason);
  const ready = !own && !reason;
  const label = own ? '我的領地' : ready ? '可出征' : storageError ? '等待連線或確認戰果' : busy ? '操作處理中'
    : (tile.battleUntil ?? 0) > now ? '交戰中' : shieldActive(tile, now) ? '護盾保護中'
    : tile.owner && !isNpcOwner(tile.owner) && !state.shared ? '尚未開放玩家搶地' : !adjacentTarget ? `不相鄰・距領地 ${distance} 格`
    : state.energy < claimCost(tile, owned.length) ? '能量不足' : '隊伍未就緒';
  return { own, ready, adjacentTarget, label, reason: reason || null, tileReason, teamReason, distance, cost: claimCost(tile, owned.length) };
}
export type ClaimGuidance = ReturnType<typeof claimGuidance>;

// Every occupied island has a persistent 3D marker, even when its HTML label
// is hidden by collisions on a small screen. This never changes ownership.
export function territoryMarker(tile: Tile, player: string) {
  if (!tile.owner) return null;
  if (isNpcOwner(tile.owner)) return { kind: 'npc' as const, color: '#ff775c' };
  return tile.owner === player
    ? { kind: 'own' as const, color: '#ffbf4b' }
    : { kind: 'other' as const, color: '#c8a4ff' };
}

// Ownership, battle playback, and protection are independent; none is persisted here.
export function territoryStatus(tile: Tile, player: string, combatTileId?: string | null, now = Date.now()) {
  const fighting = combatTileId === tile.id || (tile.battleUntil ?? 0) > now;
  const own = tile.owner === player;
  return {
    kind: fighting ? 'war' : tile.owner ? 'occupied' : 'unoccupied',
    label: fighting ? '交戰中' : tile.owner ? '已被佔領' : '尚未佔領',
    ownerLabel: isNpcOwner(tile.owner) ? NPC_FACTION.name : own ? '我的領地' : tile.owner ? tile.ownerInfo?.name ?? '其他領主' : '野怪駐守',
    own,
  } as const;
}
// Presentation only: use the same server-aligned clock and shield predicate as combat.
// A battle lock takes precedence over the vulnerable label, but never changes shield dates.
export function islandProtection(tile: Tile, now: number, combatTileId?: string | null) {
  if (!tile.owner) return null;
  if (combatTileId === tile.id || (tile.battleUntil ?? 0) > now) {
    return { kind: 'war', label: '交戰中', detail: '戰況結算中', until: null } as const;
  }
  if (shieldActive(tile, now)) {
    return { kind: 'protected', label: '保護中', detail: `剩餘 ${remaining(tile.shieldUntil, now)}`, until: tile.shieldUntil } as const;
  }
  if ((tile.shieldStartsAt ?? 0) > now) {
    return { kind: 'preparing', label: '整備中', detail: `${remaining(tile.shieldStartsAt!, now)}後開盾`, until: tile.shieldStartsAt! } as const;
  }
  return { kind: 'vulnerable', label: '可被進攻', detail: '護盾已失效', until: null } as const;
}
export function protectionStatus(tile: Tile, now: number) {
  const status = islandProtection(tile, now);
  return status ? `${status.label} · ${status.detail}` : '';
}
function remaining(end: number, now: number) {
  const minutes = Math.max(1, Math.ceil((end - now) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小時 ${minutes % 60} 分` : `${minutes} 分`;
}
