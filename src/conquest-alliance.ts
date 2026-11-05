import type { ConquestState } from './conquest';

export const ALLIANCES = [
  { id: 'light', name: '光明聯盟', motto: '點亮航路，守護共同的家園。', mark: '☀', color: '#efc77e', image: 'hero-human-paladin', heroes: ['hero-tauren', 'hero-half-orc', 'hero-elf', 'hero-gnome', 'hero-dwarf', 'hero-druid', 'hero-human-paladin'], starters: ['tideglow', 'seasprout', 'kelpcub'] },
  { id: 'night', name: '暗夜聯盟', motto: '循星而行，捍衛自由與誓約。', mark: '☽', color: '#b6a7dc', image: 'hero-necromancer', heroes: ['hero-orc', 'hero-werewolf', 'hero-blood-elf', 'hero-goblin', 'hero-undead', 'hero-necromancer', 'hero-troll'], starters: ['tideglow', 'foamferret', 'mistotter'] },
] as const;
// Historical grants are retained on migration; they are never selectable alliances.
const LEGACY_ALLIANCES = [
  { id: 'verdant', heroes: ['hero-elf', 'hero-druid'], starters: ['tideglow', 'seasprout', 'kelpcub'] },
  { id: 'forge', heroes: ['hero-gnome', 'hero-dwarf', 'hero-goblin'], starters: ['tideglow', 'pebblefin', 'shellmole'] },
  { id: 'moon', heroes: ['hero-necromancer', 'hero-undead'], starters: ['tideglow', 'foamferret', 'mistotter'] },
];
export type Enrollment = { allianceId: string; heroId: string; joinedAt: number; legacyAllianceId?: string };
export const allianceById = (id?: string) => ALLIANCES.find(a => a.id === id);
const heroAlliance = (id: string) => ALLIANCES.find(a => a.heroes.some(h => h === id));
export function validEnrollment(value: unknown): value is Enrollment {
  const v = value as Enrollment | undefined;
  return !!v && typeof v === 'object' && !Array.isArray(v) && !!allianceById(v.allianceId)?.heroes.some(h => h === v.heroId) && Number.isFinite(v.joinedAt) && v.joinedAt >= 0
    && (v.legacyAllianceId === undefined || LEGACY_ALLIANCES.some(a => a.id === v.legacyAllianceId && a.heroes.includes(v.heroId)));
}
export function migrateEnrollment(value: unknown): Enrollment | undefined {
  if (validEnrollment(value)) return value;
  const v = value as Enrollment | undefined;
  if (!v || typeof v !== 'object' || Array.isArray(v) || !Number.isFinite(v.joinedAt) || v.joinedAt < 0 || v.legacyAllianceId !== undefined) return undefined;
  const old = LEGACY_ALLIANCES.find(a => a.id === v.allianceId && a.heroes.includes(v.heroId));
  const next = old && heroAlliance(v.heroId);
  return next ? { allianceId: next.id, heroId: v.heroId, joinedAt: v.joinedAt, legacyAllianceId: old.id } : undefined;
}
export function starterCompanions(enrollment?: Enrollment): string[] {
  const current = migrateEnrollment(enrollment);
  if (!current) return [];
  const legacy = LEGACY_ALLIANCES.find(a => a.id === current.legacyAllianceId);
  return [...(legacy ?? allianceById(current.allianceId)!).starters];
}
export function enrollConquest(state: ConquestState, player: string, allianceId: string, heroId: string, owned: Record<string, number>, now: number): ConquestState {
  if (state.enrollment) throw Error('已完成聯盟選擇，不能重複領取初始角色。');
  const enrollment = { allianceId, heroId, joinedAt: now };
  if (!validEnrollment(enrollment)) throw Error('請選擇光明或暗夜聯盟及所屬的一位英雄。');
  const allowed = new Set([...starterCompanions(enrollment), ...Object.keys(owned).filter(id => owned[id] > 0)]);
  return { ...state, enrollment, lastBattle: null, tiles: state.tiles.map(t => t.owner === player ? { ...t, commander: heroId, guards: t.guards.filter(g => allowed.has(g.id)) } : t) };
}
