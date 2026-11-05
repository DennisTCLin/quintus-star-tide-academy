// World proportions shared by the chart and close-up battlefield.
// Buildings keep their authored size while territories gain surrounding land.
export const ISLAND_EXPANSION = 1.5;
export const ISLAND_WIDTH = 4.5 * ISLAND_EXPANSION;
export const TERRITORY_SCALE = ISLAND_WIDTH / 3.15;
export const HEX_RADIUS = 2.22 * TERRITORY_SCALE;
export const HEX_STEP_X = Math.sqrt(3) * HEX_RADIUS;
export const HEX_STEP_Z = 1.5 * HEX_RADIUS;
export const BATTLE_SCALE = 2.5;
export const BATTLE_ISLAND_WIDTH = ISLAND_WIDTH * BATTLE_SCALE;
// Framing stays independent of land size so enlarged territories remain visible.
export const BATTLE_FRAME_WIDTH = 4.5 * BATTLE_SCALE;

// Heights are in chart-world units, before the battle close-up scale.
const HEIGHTS: Record<string, number> = {
  'hero-elf': .4, 'hero-necromancer': .44, 'hero-druid': .45,
  'hero-gnome': .25, 'hero-dwarf': .3, 'hero-undead': .43, 'hero-goblin': .27,
  'hero-tauren': .52, 'hero-half-orc': .42, 'hero-human-paladin': .44, 'hero-orc': .48, 'hero-werewolf': .47, 'hero-blood-elf': .43, 'hero-troll': .53,
  tideglow: .29, pebblefin: .22, foamferret: .17, seasprout: .17,
  mistotter: .22, sailskipper: .15, kelpcub: .34, shellmole: .17,
  starheron: .34, reefrabbit: .23,
};
export function figureHeight(id: string) { return (HEIGHTS[id] ?? .28) * BATTLE_SCALE; }
