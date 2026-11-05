import { starterCompanions, type Enrollment } from './conquest-alliance';
import { ROSTER, type PlayerId } from './game-view';
import { TRIAL_LEVEL, seededRandom, type Companion, type Guard } from './conquest';
import { creatureProgress } from './companion-growth';

export type ConquestHero = { id: string; name: string; role: string; image: string; model?: string };
// Separate from collectible companions: a commander does not add a sixth combat score.
export const CONQUEST_HEROES: ConquestHero[] = [
  ['elf', '晨露弓手', '精靈・遠程'], ['necromancer', '幽燈引路者', '死靈・續航'],
  ['druid', '苔原守林人', '德魯伊・續航'], ['gnome', '齒輪修補師', '地精・工兵'],
  ['dwarf', '銅砧鍛造師', '矮人・破城'], ['undead', '古墓誓衛', '不死族・重裝'],
  ['goblin', '砂港拾寶客', '哥布林・工兵'],
  ['tauren', '赤土牧衛', '牛頭人・守護'], ['half-orc', '潮礁斥候', '半獸人・突擊'],
  ['human-paladin', '日誓聖騎士', '人族・戰術支援'], ['orc', '黑岩盾衛', '獸人・守護'],
  ['werewolf', '霜夜疾行者', '狼人・突擊'], ['blood-elf', '赤曜術士', '血精靈・遠程'],
  ['troll', '河谷石背', '食人妖・戰術支援'],
].map(([slug, name, role]) => ({ id: `hero-${slug}`, name, role, image: `/assets/conquest/portraits/hero-${slug}.webp`, model: slug === 'elf' ? '/assets/conquest/rigs/hero-elf.glb' : ['necromancer', 'druid', 'gnome', 'dwarf', 'undead', 'goblin'].includes(slug) ? `/assets/conquest/characters/hero-${slug}.glb` : undefined }));
export const heroById = (id?: string) => CONQUEST_HEROES.find(h => h.id === id);
export const companionById = (id: string) => ROSTER.find(c => c.id === id);
const elementOf = (element: string): Guard['element'] => ({ '金': 'metal', '木': 'wood', '土': 'earth', '水': 'water', '火': 'fire' } as const)[element as '金' | '木' | '土' | '水' | '火'];
const modeled = new Set(ROSTER.slice(0, 10).map(c => c.id));
export const characterModel = (id: string) => heroById(id)?.model ?? (modeled.has(id) ? `/assets/conquest/characters/${id}.glb` : undefined);
export function expeditionRoster(owned: Record<string, number>, enrollment?: Enrollment, growthXp: Record<string, number> = {}): Companion[] {
  return ROSTER.filter(c => owned[c.id] > 0 || starterCompanions(enrollment).some(id => id === c.id)).map(c => ({ id: c.id, name: c.name, image: c.image, level: owned[c.id] > 0 ? creatureProgress(c.rarity, growthXp[c.id]).level : TRIAL_LEVEL, element: elementOf(c.element), loan: !(owned[c.id] > 0) }));
}
export function initialExpedition(roster: Companion[], equipped?: string) {
  return [...new Set([...(roster.some(c => c.id === equipped) ? [equipped!] : []), ...roster.map(c => c.id)])].slice(0, 5);
}
export function wildIdentity(guard: Guard) {
  // Display species is stable per wild guard, independent of the player's collection.
  const matching = ROSTER.slice(0, 10).filter(c => elementOf(c.element) === guard.element);
  // Wild elemental variants retain the approved modeled creatures when no matching model exists.
  const species = matching.length ? matching : ROSTER.slice(0, 10);
  return species[Math.floor(seededRandom(guard.id)() * species.length)] ?? ROSTER[0];
}
export const HERO_SELECTION_KEY = 'star-tide.conquest-heroes.v1';
export const heroSelectionKey = (scope?: string) => scope ? `${HERO_SELECTION_KEY}.${encodeURIComponent(scope.toLowerCase())}` : HERO_SELECTION_KEY;
export function readHeroSelections(scope?: string): Partial<Record<PlayerId, string>> {
  try {
    const raw = JSON.parse(localStorage.getItem(heroSelectionKey(scope)) ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([, id]) => typeof id === 'string' && heroById(id)));
  } catch { return {}; }
}
