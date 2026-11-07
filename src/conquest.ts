import { isNpcOwner, resolveNpcRaid, type NpcRaidProgress, type RaidReport } from './conquest-enemy';
import type { Enrollment } from './conquest-alliance';
// Conquest is a separately persisted PvE world. Family learning saves are never changed.
export const ELEMENTS = ['metal', 'wood', 'earth', 'water', 'fire'] as const;
export type Element = typeof ELEMENTS[number];
export const ELEMENT_LABEL: Record<Element, string> = { metal: '金', wood: '木', earth: '土', water: '水', fire: '火' };
export const ELEMENT_COLOR: Record<Element, string> = { metal: '#e6bc56', wood: '#77ad55', earth: '#b68d63', water: '#52b9d3', fire: '#e87d62' };
export const TERRAINS = ['plains', 'forest', 'mountain', 'river', 'desert'] as const;
export type Terrain = typeof TERRAINS[number];
export const TERRAIN_LABEL: Record<Terrain, string> = { plains: '草原', forest: '森林', mountain: '山岳', river: '水域', desert: '沙漠' };
export type Facility = 'castle' | 'resource' | 'tower' | 'knowledge' | 'shrine';
export const FACILITIES: Record<Facility, { name: string; icon: string; effect: string }> = {
  castle: { name: '主城', icon: '🏰', effect: '島上的主基地地標。' },
  resource: { name: '資源地', icon: '💎', effect: '本島材料產量 ×2，需有存活守軍。' },
  tower: { name: '防禦塔', icon: '🛡', effect: '基礎佔領費用增加 20%。' },
  knowledge: { name: '知識殿堂', icon: '📚', effect: '每小時另產 1 靈泉；答對額外 +2 能量，全圖加成最多 +6。需有存活守軍。' },
  shrine: { name: '元素祠', icon: '⛩', effect: '本島守軍若與祠堂元素相同，造成傷害增加 10%。' },
};
export type Guard = { id: string; level: number; element: Element; hp?: number; maxHp?: number };
export type Companion = Guard & { name: string; image: string; loan: boolean };
export type Tile = {
  id: string; q: number; r: number; distance: number; name: string; terrain: Terrain; element: Element;
  facility: Facility | null; shrineElement: Element | null; wild: Guard[];
  ownerInfo?: { name: string; profile: string; avatarKey: string }; battleUntil?: number;
  guards: Guard[]; owner: string | null; shieldUntil: number; shieldStartsAt?: number; capturedAt?: number; commander?: string;
};
export type ConquestState = {
  schema: 2; npcRaids?: NpcRaidProgress; raidReports?: RaidReport[]; raidReadIds?: string[]; playerId?: string; shared?: boolean; enrollment?: Enrollment; updatedAt: number; units: Record<string, Guard>; inventory: Inventory; season: string; energy: number; tiles: Tile[]; credited: string[];
  log: string[]; lastBattle: BattleResult | null;
};
export type Hit = { round: number; side: -1 | 1; source: string; target: string; damage: number; hp: number; knockedOut: boolean };
export type BattleResult = { won: boolean; attack: number; defense: number; elemental: boolean; catchup: boolean; overextended: boolean; shrineBoost: boolean; affinityBonus: number; cost: number; events: Hit[]; initialAttackers: Guard[]; initialDefenders: Guard[]; attackersAfter: Guard[]; defendersAfter: Guard[]; rounds: number };
export type Inventory = { herbs: number; spring: number; bandage: number; potion: number };
export const RECIPES = { bandage: { name: '草藥包', herbs: 3, spring: 0, heal: .3 }, potion: { name: '回復藥水', herbs: 5, spring: 2, heal: .6 } } as const;
export type Remedy = keyof typeof RECIPES;
export const SHIELD_DELAY_MS = 60 * 60 * 1000;
export const RECOVERY_MS = 10 * 60 * 1000;
export const MATERIAL_CAP = 200, ITEM_CAP = 99;
export const maxHealth = (guard: Guard) => guard.maxHp ?? 60 + guard.level * 20;
export const health = (guard: Guard) => guard.hp ?? maxHealth(guard);
export const alive = (guard: Guard) => health(guard) > 0;
export const readyToDeploy = (guard: Guard) => health(guard) >= maxHealth(guard) * .2;
export const withHealth = (guard: Guard): Guard => ({ ...guard, maxHp: maxHealth(guard), hp: Math.max(0, Math.min(maxHealth(guard), health(guard))) });
export const shieldActive = (tile: Tile, now: number) => !!tile.owner && (tile.shieldStartsAt ?? 0) <= now && tile.shieldUntil > now;
export const stationed = (state: ConquestState, id: string) => state.tiles.find(t => t.owner && !isNpcOwner(t.owner) && (!state.playerId || t.owner === state.playerId) && t.guards.some(g => g.id === id));
export function currentUnit(state: ConquestState, unit: Guard): Guard {
  const saved = state.units[unit.id];
  if (!saved) return withHealth(unit);
  if (saved.level === unit.level) return withHealth(saved);
  // Collection progression is authoritative. Carry wounds across both increases and
  // decreases (e.g. a loan becomes owned), without healing or reviving on refresh.
  const maxHp = 60 + unit.level * 20;
  return { ...saved, level: unit.level, element: unit.element, maxHp, hp: health(withHealth(saved)) / maxHealth(saved) * maxHp };
}
export function syncConquestRoster(state: ConquestState, roster: readonly Companion[]): ConquestState {
  const units = { ...state.units };
  for (const source of roster) if (units[source.id]) units[source.id] = currentUnit(state, source);
  // Keep absent/legacy units and historical battle receipts. Wild guards have their
  // own island difficulty and must never inherit collection levels.
  const tiles = state.tiles.map(tile => tile.owner && !isNpcOwner(tile.owner) && (!state.playerId || tile.owner === state.playerId) ? { ...tile, guards: tile.guards.map(guard => units[guard.id] ?? guard) } : tile);
  return { ...state, units, tiles };
}
export function production(tile: Tile) {
  if (!tile.owner || isNpcOwner(tile.owner) || !tile.guards.some(alive)) return { herbs: 0, spring: 0 };
  const multiplier = tile.facility === 'resource' ? 2 : 1;
  return { herbs: (tile.terrain === 'river' ? 0 : ['plains', 'forest'].includes(tile.terrain) ? 3 : 1) * multiplier, spring: ((tile.terrain === 'river' ? 2 : 0) + (tile.facility === 'knowledge' ? 1 : 0)) * multiplier };
}
export const SHIELD_MS = 24 * 60 * 60 * 1000;
// Loan companions use a fixed expedition level; injury and composition still affect victory.
export const TRIAL_LEVEL = 4;
export const DIRECTIONS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]] as const;
export const hexDistance = (q: number, r: number) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
export const adjacent = (a: Pick<Tile, 'q' | 'r'>, b: Pick<Tile, 'q' | 'r'>) => hexDistance(a.q - b.q, a.r - b.r) === 1;
export const CONQUEST_RADIUS = 5;
export const withinConquestRange = (tile: Pick<Tile, 'q' | 'r'>) => Number.isInteger(tile.q) && Number.isInteger(tile.r) && hexDistance(tile.q, tile.r) <= CONQUEST_RADIUS;
export const power = (guards: readonly Guard[]) => guards.reduce((sum, g) => sum + (alive(g) ? 10 + g.level * 5 : 0), 0);
export const round = (value: number) => Math.round(value * 100) / 100;
export function seasonAt(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `season-${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function createConquest(season = seasonAt(), now = Date.now()): ConquestState {
  const random = seededRandom(season);
  const tiles: Tile[] = [];
  const prefixes = ['晨光', '星帆', '潮歌', '琉璃', '月灣', '珊瑚', '雲航', '風語', '晴空', '虹礁', '銀浪', '海螺', '金砂'];
  const suffixes = ['淺灘', '之森', '群峰', '水灣', '沙洲'];
  for (let q = -5; q <= 5; q++) for (let r = -5; r <= 5; r++) {
    const distance = hexDistance(q, r);
    if (distance > 5) continue;
    const terrain = q === 0 && r === 0 ? 'plains' : TERRAINS[Math.floor(random() * 5)];
    const count = Math.min(5, 1 + Math.floor(distance / 2) + Math.floor(random() * 2));
    const wild = Array.from({ length: count }, (_, i) => ({ id: `wild:${q},${r}:${i}`, level: Math.max(0, distance - 1) + Math.floor(random() * 2), element: ELEMENTS[Math.floor(random() * 5)] }));
    tiles.push({ id: `${q},${r}`, q, r, distance, name: q === 0 && r === 0 ? '啟航之島' : prefixes[(q + 5 + (r + 5) * 3) % prefixes.length] + suffixes[TERRAINS.indexOf(terrain)], terrain, element: 'metal', facility: null, shrineElement: null, wild, guards: wild.map(g => ({ ...g })), owner: null, shieldUntil: 0 });
  }
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const facilities: Facility[] = ['castle', ...Array<Facility>(7).fill('resource'), ...Array<Facility>(8).fill('tower'), ...Array<Facility>(5).fill('knowledge'), ...Array<Facility>(5).fill('shrine')];
  facilities.forEach((facility, i) => { shuffled[i].facility = facility; if (facility === 'shrine') shuffled[i].shrineElement = ELEMENTS[Math.floor(random() * 5)]; });
  // Independent stream preserves existing geography, wild identities and shrine elements.
  // Reserve the legacy shrines first, then fill a balanced 18/19-island distribution.
  const elementRandom = seededRandom(`island-elements-v1:${season}`);
  const extra = ELEMENTS[Math.floor(elementRandom() * ELEMENTS.length)];
  const bag = ELEMENTS.flatMap(element => Array<Element>(18 + Number(element === extra) - tiles.filter(t => t.shrineElement === element).length).fill(element));
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(elementRandom() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  for (const tile of tiles) tile.element = tile.shrineElement ?? bag.pop()!;
  return { schema: 2, updatedAt: now, units: {}, inventory: { herbs: 0, spring: 0, bandage: 0, potion: 0 }, season, energy: 50, tiles, credited: [], log: [], lastBattle: null };
}
export function advanceConquest(state: ConquestState, now: number): ConquestState {
  if (!Number.isFinite(now) || now <= state.updatedAt) return state;
  const elapsed = now - state.updatedAt;
  const recover = (g: Guard) => ({ ...withHealth(g), hp: Math.min(maxHealth(g), health(g) + maxHealth(g) * .05 * elapsed / RECOVERY_MS) });
  const units = Object.fromEntries(Object.entries(state.units).map(([id, g]) => [id, recover(g)]));
  const rates = state.tiles.filter(t => !state.playerId || t.owner === state.playerId).map(production).reduce((a, b) => ({ herbs: a.herbs + b.herbs, spring: a.spring + b.spring }), { herbs: 0, spring: 0 });
  const inventory = { ...state.inventory, herbs: Math.min(MATERIAL_CAP, state.inventory.herbs + rates.herbs * elapsed / 3600000), spring: Math.min(MATERIAL_CAP, state.inventory.spring + rates.spring * elapsed / 3600000) };
  const tiles = state.tiles.map(t => state.playerId && t.owner && t.owner !== state.playerId ? t : ({ ...t, guards: t.owner ? t.guards.map(g => units[g.id] ?? recover(g)).filter(alive) : state.shared ? t.guards : t.guards.map(recover) }));
  return { ...state, updatedAt: now, units, inventory, tiles };
}
export function ensureSeason(state: ConquestState, now: number) {
  const season = seasonAt(now);
  if (state.season === season) return advanceConquest(state, now);
  if (state.shared) return state; // Shared season changes are committed by the server.
  const [, year, month] = state.season.split('-').map(Number);
  const boundary = Date.UTC(year, month, 1, -8);
  const settled = advanceConquest(state, Math.min(now, boundary));
  const fresh = { ...createConquest(season, Math.max(state.updatedAt, Math.min(now, boundary))), enrollment: state.enrollment, npcRaids: state.npcRaids, raidReports: state.raidReports, raidReadIds: state.raidReadIds, units: settled.units, inventory: settled.inventory, credited: settled.credited };
  return advanceConquest(fresh, now);
}
export function deploymentBlock(state: ConquestState, guard: Guard, tileId?: string) {
  const location = stationed(state, guard.id);
  if (location && location.id !== tileId) return `已駐守${location.name}，請先撤回。`;
  if (!alive(currentUnit(state, guard))) return '倒地休養中，恢復至 20% 血量才能派遣。';
  if (!readyToDeploy(currentUnit(state, guard)) && !(location && location.id === tileId)) return '血量不足 20%，請先治療。';
  return null;
}
export const territories = (state: ConquestState, player: string) => state.tiles.filter(t => t.owner === player);
export function majority(guards: readonly Guard[]): Element | null {
  const counts = ELEMENTS.map(element => ({ element, count: guards.filter(g => g.element === element).length }));
  const max = Math.max(...counts.map(c => c.count));
  const winners = counts.filter(c => c.count === max);
  return max > 0 && winners.length === 1 ? winners[0].element : null;
}
export function counters(a: Element | null, b: Element | null) {
  return !!a && !!b && ELEMENTS[(ELEMENTS.indexOf(a) + 1) % 5] === b;
}
export function claimCost(tile: Tile, owned: number) {
  let cost = 30 * (tile.facility === 'tower' ? 1.2 : 1);
  if (tile.owner) cost += power(tile.guards) * .5;
  if (owned < 3) cost *= .8;
  return round(cost);
}
// Affinity is per defender, independent of majority counters and ownership (including drills).
export const defenderAffinity = (tile: Pick<Tile, 'element' | 'facility'>, guard: Guard) => guard.element === tile.element ? (tile.facility === 'shrine' ? .10 : .05) : 0;
export const defensePower = (tile: Tile) => round(tile.guards.reduce((sum, g) => sum + (alive(g) ? (10 + g.level * 5) * (1 + defenderAffinity(tile, g)) : 0), 0));
export function battleResult(guards: Guard[], tile: Tile, attackerCount: number, defenderCount: number): BattleResult {
  const initialAttackers = guards.map(withHealth), initialDefenders = tile.guards.map(withHealth);
  const elemental = counters(majority(guards.filter(alive)), majority(tile.guards.filter(alive)));
  const catchup = !!tile.owner && attackerCount < defenderCount / 2;
  const overextended = !!tile.owner && defenderCount > attackerCount * 2;
  const attackMultiplier = (elemental ? 1.25 : 1) * (catchup ? 1.2 : 1), defenseMultiplier = overextended ? .9 : 1;
  const affinity = (g: Guard) => 1 + defenderAffinity(tile, g);
  const affinityBonus = Math.max(0, ...tile.guards.filter(alive).map(g => defenderAffinity(tile, g)));
  const shrineBoost = tile.facility === 'shrine' && affinityBonus > 0;
  const attackersAfter = initialAttackers.map(g => ({ ...g })), defendersAfter = initialDefenders.map(g => ({ ...g })), events: Hit[] = [];
  let rounds = 0;
  // Defender initiative; a knocked-out unit never takes another turn. No regeneration during simulation.
  while (attackersAfter.some(alive) && defendersAfter.some(alive) && rounds < 60) {
    rounds++;
    for (let i = 0; i < Math.max(attackersAfter.length, defendersAfter.length); i++) {
      for (const side of [1, -1] as const) {
        const own = side === -1 ? attackersAfter : defendersAfter, opponents = side === -1 ? defendersAfter : attackersAfter, source = own[i];
        if (!source || !alive(source)) continue;
        const target = opponents.find(alive); if (!target) continue;
        const damage = Math.min(health(target), Math.max(1, Math.round((10 + source.level * 5) * (side === -1 ? attackMultiplier : defenseMultiplier * affinity(source)))));
        target.hp = round(health(target) - damage);
        events.push({ round: rounds, side, source: source.id, target: target.id, damage: round(damage), hp: target.hp, knockedOut: target.hp === 0 });
      }
    }
  }
  const won = attackersAfter.some(alive) && !defendersAfter.some(alive);
  return { won, attack: round(power(guards) * attackMultiplier), defense: round(defensePower(tile) * defenseMultiplier), elemental, catchup, overextended, shrineBoost, affinityBonus, cost: round(claimCost(tile, attackerCount) * (won ? 1 : .5)), events, initialAttackers, initialDefenders, attackersAfter, defendersAfter, rounds };
}
export function claimBlock(state: ConquestState, player: string, tile: Tile, now: number, pvp = false): string | null {
  const owned = territories(state, player);
  if (tile.owner === player) return '這是你的領地，可以增援或放棄。';
  if ((tile.battleUntil ?? 0) > now) return '這座島正在交戰，請等待戰況結束。';
  if (shieldActive(tile, now)) return '這座島仍有護盾，現在無法攻擊。';
  if (tile.owner && !isNpcOwner(tile.owner) && !pvp) return '目前開放 PvE，尚未開放玩家搶地。';
  if (!withinConquestRange(tile)) return '只能出征啟航之島中心五格內的島嶼。';
  if (state.energy < claimCost(tile, owned.length)) return '能量不足，先答題補充能量。';
  return null;
}
export type ConquestAction = { type: 'claim' | 'reinforce' | 'abandon' | 'craft' | 'heal' | 'station' | 'recall' | 'defend'; raidId?: string; tileId?: string; team?: string[]; season?: string; commander?: string; unitId?: string; expectedCost?: number; remedy?: Remedy };
export function act(input: ConquestState, player: string, action: ConquestAction, roster: Companion[], now: number, pvp = false): ConquestState {
  if (!Number.isFinite(now) || input.season !== seasonAt(now) || action.season !== undefined && action.season !== input.season) throw Error('新賽季已開始，請重新選擇島嶼。');
  if (input.enrollment && action.commander && action.commander !== input.enrollment.heroId) throw Error('這位英雄尚未解鎖。');
  const state = advanceConquest(syncConquestRoster(input, roster), now), inventory = { ...state.inventory }, units = { ...state.units };
  const finish = (next: ConquestState, message: string) => ({ ...next, log: [message, ...state.log].slice(0, 30) });
  if (action.type === 'defend') return resolveNpcRaid(state, player, action.raidId, now, action.tileId);
  if (action.type === 'craft') {
    const remedy = action.remedy; if (!remedy || !RECIPES[remedy]) throw Error('未知的補給配方。');
    const recipe = RECIPES[remedy]; if (inventory.herbs < recipe.herbs || inventory.spring < recipe.spring) throw Error('材料不足，請等待駐守領地生產。');
    if (inventory[remedy] >= ITEM_CAP) throw Error('道具已達儲存上限 99。');
    inventory.herbs -= recipe.herbs; inventory.spring -= recipe.spring; inventory[remedy]++;
    return finish({ ...state, inventory }, `已製作${recipe.name}。`);
  }
  if (action.type === 'heal') {
    const source = roster.find(g => g.id === action.unitId), remedy = action.remedy;
    if (!source || !remedy || !RECIPES[remedy]) throw Error('找不到夥伴或治療道具。');
    const unit = currentUnit(state, source); if (health(unit) >= maxHealth(unit)) throw Error('血量已滿，不需要消耗道具。');
    if (!inventory[remedy]) throw Error('沒有可用的治療道具。');
    inventory[remedy]--; unit.hp = Math.min(maxHealth(unit), health(unit) + maxHealth(unit) * RECIPES[remedy].heal); units[unit.id] = unit;
    return finish({ ...state, units, inventory, tiles: state.tiles.map(t => ({ ...t, guards: t.guards.map(g => t.owner === player && g.id === unit.id ? unit : g) })) }, `${source.name}使用${RECIPES[remedy].name}，血量 ${Math.ceil(health(unit))}/${maxHealth(unit)}。`);
  }
  const tile = state.tiles.find(t => t.id === action.tileId); if (!tile) throw Error('找不到這座島嶼。');
  if ((tile.battleUntil ?? 0) > now) throw Error('這座島正在交戰，請等待戰況結束。');
  if (action.type !== 'claim' && tile.owner !== player) throw Error('只能管理自己的領地。');
  if (action.type === 'claim') { const blocked = claimBlock(state, player, tile, now, pvp); if (blocked) throw Error(blocked); if (action.expectedCost !== undefined && action.expectedCost !== claimCost(tile, territories(state, player).length)) throw Error('出征費用已變更，請重新確認戰前情報。'); }
  if (action.type === 'station' || action.type === 'recall') {
    if (!action.unitId) throw Error('請指定夥伴。');
    const ids = tile.guards.map(g => g.id), exists = ids.includes(action.unitId);
    if (action.type === 'station' && exists) throw Error('這位夥伴已經駐守本島。');
    if (action.type === 'recall' && !exists) throw Error('這位夥伴已不在本島，請更新情報。');
    action = { ...action, type: 'reinforce', team: action.type === 'station' ? [...ids, action.unitId] : ids.filter(id => id !== action.unitId) };
  }
  let guards: Guard[] = [];
  if (action.type !== 'abandon') {
    const ids = action.team ?? [];
    if (ids.length > 5 || new Set(ids).size !== ids.length || action.type === 'claim' && ids.length < 3) throw Error(action.type === 'claim' ? '請選擇 3–5 位不同的夥伴。' : '每座島最多駐守 5 位不同夥伴。');
    guards = ids.map(id => {
      const source = roster.find(c => c.id === id) ?? (action.type === 'reinforce' ? tile.guards.find(g => g.id === id) : undefined);
      if (!source || !Number.isInteger(source.level) || source.level < 0 || !ELEMENTS.includes(source.element)) throw Error('出征隊伍無效。');
      const blocked = deploymentBlock(state, source, action.type === 'reinforce' ? tile.id : undefined); if (blocked) throw Error(blocked);
      const guard = currentUnit(state, { id: source.id, level: source.level, element: source.element }); units[id] = guard; return guard;
    });
  }
  let nextTile: Tile, energy = state.energy, lastBattle = state.lastBattle, message: string;
  if (action.type === 'abandon') {
    nextTile = { ...tile, owner: null, commander: undefined, shieldStartsAt: 0, capturedAt: 0, shieldUntil: 0, guards: tile.wild.map(withHealth) };
    message = `已放棄${tile.name}，守軍保留傷勢撤回；野怪重新進駐。`;
  } else if (action.type === 'reinforce') {
    nextTile = { ...tile, guards, commander: state.enrollment?.heroId ?? action.commander ?? tile.commander }; message = `${tile.name}已更新駐軍，血量與護盾倒數不重置。`;
  } else {
    lastBattle = battleResult(guards, tile, territories(state, player).length, tile.owner ? territories(state, tile.owner).length : 0);
    energy = round(energy - lastBattle.cost);
    lastBattle.attackersAfter.forEach(g => { units[g.id] = { ...g }; });
    nextTile = lastBattle.won ? { ...tile, owner: player, guards: lastBattle.attackersAfter.filter(alive), commander: state.enrollment?.heroId ?? action.commander, capturedAt: now, shieldStartsAt: now + SHIELD_DELAY_MS, shieldUntil: now + SHIELD_DELAY_MS + SHIELD_MS } : { ...tile, guards: lastBattle.defendersAfter };
    message = `${lastBattle.won ? '佔領成功，1 小時後啟動護盾' : '出征未成功，傷勢保留'}：${tile.name}，消耗 ${lastBattle.cost} 能量；${lastBattle.attackersAfter.filter(g => !alive(g)).length} 位倒地撤回。`;
  }
  return finish({ ...state, units, energy, lastBattle, tiles: state.tiles.map(t => t.id === tile.id ? nextTile : t) }, message);
}
export const knowledgeBonus = (state: ConquestState) => Math.min(6, state.tiles.filter(t => t.owner && !isNpcOwner(t.owner) && (!state.playerId || t.owner === state.playerId) && t.facility === 'knowledge' && t.guards.some(alive)).length * 2);
// A correction can earn the correct-answer reward, but repeated wrong taps cannot farm energy.
export function creditAnswer(state: ConquestState, attempt: string, correct: boolean): ConquestState {
  const key = `${attempt}:${correct ? 'correct' : 'wrong'}`;
  if (state.credited.includes(key)) return state;
  return { ...state, energy: round(state.energy + (correct ? 10 + knowledgeBonus(state) : 2)), credited: [...state.credited, key] };
}
export function leaderboard(entries: { id: string; name: string; state: ConquestState }[]) {
  return entries.map(({ id, name, state }) => { const owned = territories(state, id); return { id, name, count: owned.length, defense: owned.reduce((sum, t) => sum + power(t.guards), 0) }; }).sort((a, b) => b.count - a.count || b.defense - a.defense || a.id.localeCompare(b.id));
}
