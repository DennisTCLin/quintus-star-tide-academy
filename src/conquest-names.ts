import type { ConquestState, Tile } from './conquest';

const PREFIXES = ['曙色', '浪花', '藍帆', '海風', '星汐', '碧潮', '白帆', '流光', '銀月', '朝露', '暮霞', '逐浪', '星燈', '青珀', '遠帆', '晴嵐', '海棠', '琥珀', '青岬', '落星', '月影', '浮光', '海歌', '霧帆', '白露', '晨曦', '雲汐', '銀沙', '彩霞', '星泉'];
const SUFFIX: Record<Tile['terrain'], string> = { plains: '淺灘', forest: '之森', mountain: '群峰', river: '水灣', desert: '沙洲' };

// Resolve the complete map before filtering. Names never depend on ownership,
// array order, the viewer, or RNG, and are never written back to the world.
export function islandDisplayTiles(tiles: readonly Tile[]): Tile[] {
  const ordered = [...tiles].sort((a, b) => a.distance - b.distance || a.q - b.q || a.r - b.r || a.id.localeCompare(b.id));
  const reserved = new Set(tiles.map(tile => tile.name)), seen = new Set<string>(), names = new Map<string, string>();
  for (const tile of ordered) {
    let name = tile.name;
    if (seen.has(name)) {
      name = PREFIXES.map(prefix => prefix + SUFFIX[tile.terrain]).find(candidate => !reserved.has(candidate)) ?? '';
      // Defensive fallback for unusual imported maps; still unique and stable.
      for (let index = 1; !name; index++) {
        const candidate = `海圖 ${index} 號島`;
        if (!reserved.has(candidate)) name = candidate;
      }
    }
    names.set(tile.id, name); seen.add(tile.name); reserved.add(name);
  }
  return tiles.map(tile => names.get(tile.id) === tile.name ? tile : { ...tile, name: names.get(tile.id)! });
}

export function displayConquest(state: ConquestState): ConquestState {
  return { ...state, tiles: islandDisplayTiles(state.tiles) };
}

export const islandCoordinates = (tile: Pick<Tile, 'q' | 'r'>) => `(${tile.q}, ${tile.r})`;
export const islandLabel = (tile: Pick<Tile, 'name' | 'q' | 'r'>) => `${tile.name} ${islandCoordinates(tile)}`;

// Structured reports can be linked by season and tile ID; unstructured historic
// log text is deliberately left unchanged rather than guessing which island it meant.
export function reportIslandLabel(state: ConquestState, report: { season: string; tileId: string; tileName: string }) {
  const tile = report.season === state.season ? state.tiles.find(tile => tile.id === report.tileId) : undefined;
  return tile ? islandLabel(tile) : `${report.tileName} (${report.tileId})`;
}
