import seeds from './data/conquest-kits.json';

export type BattleElement = 0 | 1 | 2;
export type MoveTactic = 'mark' | 'shield' | 'mend' | 'weaken' | 'charge' | 'drain' | 'pierce' | 'echo' | 'recoil' | 'burn';
export type MoveSlot = 0 | 1 | 2;
export type BattleMotif = 'tide' | 'stone' | 'leaf' | 'mist' | 'cloud' | 'star' | 'moon' | 'prism' | 'coral' | 'aurora' | 'storm';
export type CombatMove = {
  id: string;
  name: string;
  slot: MoveSlot;
  tier: 'small' | 'ultimate';
  choreography: string;
  power: number;
  cost: number;
  energy: number;
  tactic: MoveTactic | null;
  heal: number;
  shield: number;
  hits: number;
  description: string;
  icon: string;
  durationMs: number;
  impactAt: number;
};
export type BattleKit = {
  pet: string;
  name: string;
  element: BattleElement;
  motif: BattleMotif;
  tactic: MoveTactic;
  moves: readonly [CombatMove, CombatMove, CombatMove];
};

export const TACTICS: Record<MoveTactic, { name: string; icon: string; description: string }> = {
  mark: { name: '標記連段', icon: '◎', description: '標記對手，下次命中多 8 傷害' },
  shield: { name: '護盾守勢', icon: '⬡', description: '展開 22 護盾，回復 2 體力；護盾不疊加' },
  mend: { name: '回復續航', icon: '✚', description: '回復 22 體力，清除灼潮' },
  weaken: { name: '牽制削弱', icon: '≋', description: '讓對手下次攻擊少 8 傷害' },
  charge: { name: '蓄能爆發', icon: '✦', description: '這招累積 2 能量，更快使出大招' },
  drain: { name: '汲取續航', icon: '◒', description: '命中後回復 8 體力' },
  pierce: { name: '破盾強攻', icon: '➶', description: '穿過護盾，直接造成傷害' },
  echo: { name: '回聲連擊', icon: '❯', description: '兩段命中，合計 20 傷害' },
  recoil: { name: '奮力突擊', icon: '✹', description: '強力攻擊，自己也會損失 6 體力' },
  burn: { name: '持續灼潮', icon: '♨', description: '灼潮讓對手接下來兩次行動各失去 4 體力' },
};

export const MOTIFS: Record<BattleMotif, { color: string; light: string; name: string }> = {
  tide: { color: '#12c8e2', light: '#b3f7ff', name: '潮汐' },
  stone: { color: '#a5d9ae', light: '#edffd4', name: '礁石' },
  leaf: { color: '#65d88d', light: '#deffb0', name: '海芽' },
  mist: { color: '#aaa9f7', light: '#ecedff', name: '迷霧' },
  cloud: { color: '#8fd9f6', light: '#f2fcff', name: '雲帆' },
  star: { color: '#ffc95d', light: '#fff4c5', name: '星圖' },
  moon: { color: '#b5bcff', light: '#f2edff', name: '月華' },
  prism: { color: '#77e4d1', light: '#ffe0fb', name: '海璃' },
  coral: { color: '#ff826d', light: '#ffe8a8', name: '珊火' },
  aurora: { color: '#7df0cf', light: '#dac6ff', name: '極光' },
  storm: { color: '#c4a2ff', light: '#c8faff', name: '霧電' },
};

function makeMove(seed: typeof seeds[number], slot: MoveSlot): CombatMove {
  const source = seed.moves[slot];
  const tactic = seed.tactic as MoveTactic;
  const ultimate = slot === 2;
  const tactical = slot === 1;
  let power = ultimate ? 40 : 18;
  let heal = 0, shield = 0, energy = ultimate ? 0 : 1, hits = 1;
  if (tactical) {
    power = ({ mark: 12, shield: 0, mend: 0, weaken: 12, charge: 12, drain: 12, pierce: 18, echo: 20, recoil: 26, burn: 12 } as const)[tactic];
    heal = tactic === 'mend' ? 22 : tactic === 'drain' ? 8 : tactic === 'shield' ? 2 : 0;
    shield = tactic === 'shield' ? 22 : 0;
    energy = tactic === 'charge' ? 2 : 1;
    hits = tactic === 'echo' ? 2 : 1;
  }
  if (ultimate) {
    heal = tactic === 'mend' ? 14 : tactic === 'drain' ? 10 : 0;
    shield = tactic === 'shield' ? 14 : 0;
    power = tactic === 'recoil' ? 48 : tactic === 'charge' ? 44 : 40;
    hits = tactic === 'echo' ? 3 : 1;
  }
  const extra = ultimate
    ? ({ mark: '並標記對手', shield: '並獲得 14 護盾', mend: '並回復 14 體力、清除灼潮', weaken: '並削弱對手下次攻擊', charge: '', drain: '並回復 10 體力', pierce: '穿過護盾', echo: '分成三段命中', recoil: '自己也損失 6 體力', burn: '並附加兩次灼潮' } as const)[tactic]
    : tactical ? TACTICS[tactic].description : '累積 1 能量';
  return {
    ...source, slot, tier: ultimate ? 'ultimate' : 'small', power, heal, shield, energy,
    cost: ultimate ? 3 : 0, hits, tactic: slot === 0 ? null : tactic,
    description: `${power ? `威力 ${power}。` : ''}${extra}${tactical && tactic !== 'charge' ? '。累積 1 能量' : ''}`,
    icon: ultimate ? '✦' : slot === 0 ? '➶' : TACTICS[tactic].icon,
    durationMs: ultimate ? 2900 : tactical && !power ? 1500 : 1650,
    impactAt: ultimate ? 0.67 : 0.59,
  };
}

export const BATTLE_KITS: readonly BattleKit[] = seeds.map(seed => ({
  pet: seed.pet, name: seed.name, element: seed.element as BattleElement,
  motif: seed.motif as BattleMotif, tactic: seed.tactic as MoveTactic,
  moves: [makeMove(seed, 0), makeMove(seed, 1), makeMove(seed, 2)],
}));
const byPet = new Map(BATTLE_KITS.map(kit => [kit.pet, kit]));
export function battleKit(pet: string): BattleKit {
  const kit = byPet.get(pet);
  if (!kit) throw new Error('找不到這位夥伴的招式');
  return kit;
}
export function hasBattleKit(pet: string): boolean { return byPet.has(pet); }
export function elementAdvantage(attacker: BattleElement, defender: BattleElement): boolean {
  return (attacker === 0 && defender === 2) || (attacker === 2 && defender === 1) || (attacker === 1 && defender === 0);
}
