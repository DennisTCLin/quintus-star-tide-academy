import PlayerAvatar from './PlayerAvatar';
import type { PlayerId } from './game-view';
import type { Tile } from './conquest';
import { territoryStatus } from './conquest-presentation';
import './conquest-territory.css';

export default function ConquestTerritoryBadge({ tile, player, name, combatTileId, now }: { tile: Tile; player: string; name: string; combatTileId?: string | null; now?:number }) {
  const status = territoryStatus(tile, player, combatTileId, now);
  return <span className="cq-territory-badge" data-territory-status={status.kind}>
    {tile.ownerInfo ? <PlayerAvatar id={tile.ownerInfo.profile as PlayerId} avatarKey={tile.ownerInfo.avatarKey} /> : status.own ? <PlayerAvatar id={player as PlayerId} /> : <span className="cq-owner-symbol" aria-hidden="true">{tile.owner ? '⚑' : '◇'}</span>}
    <span><b>{status.label}</b><small>{status.own ? `${name} · 我的領地` : status.ownerLabel}</small></span>
  </span>;
}
