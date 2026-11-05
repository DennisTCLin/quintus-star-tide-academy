import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { ALLIANCES, enrollConquest, migrateEnrollment, starterCompanions, validEnrollment } from '../conquest-alliance';
import { CONQUEST_HEROES, expeditionRoster } from '../conquest-characters';
import { createConquest, ensureSeason } from '../conquest';
import { parseConquest } from '../conquest-store';
const now=Date.UTC(2026,10,5),player='quintus';
const old=[['verdant','hero-elf','light'],['verdant','hero-druid','light'],['forge','hero-gnome','light'],['forge','hero-dwarf','light'],['forge','hero-goblin','night'],['moon','hero-necromancer','night'],['moon','hero-undead','night']];
describe('two playable alliances',()=>{
 it('has exactly the approved fourteen unique heroes, seven in each alliance, with real portrait assets',()=>{
  expect(ALLIANCES.map(a=>a.id)).toEqual(['light','night']);expect(ALLIANCES.map(a=>a.heroes.length)).toEqual([7,7]);
  expect(new Set(ALLIANCES.flatMap(a=>[...a.heroes])).size).toBe(14);expect(CONQUEST_HEROES).toHaveLength(14);
  expect(ALLIANCES[0].heroes).toEqual(['hero-tauren','hero-half-orc','hero-elf','hero-gnome','hero-dwarf','hero-druid','hero-human-paladin']);
  expect(ALLIANCES[1].heroes).toEqual(['hero-orc','hero-werewolf','hero-blood-elf','hero-goblin','hero-undead','hero-necromancer','hero-troll']);
  for(const h of CONQUEST_HEROES){expect(existsSync(`public${h.image}`)).toBe(true);if(h.model)expect(existsSync(`public${h.model}`)).toBe(true);}
 });
 it.each(old)('migrates %s / %s without replacing starters or saved progression',(allianceId,heroId,next)=>{
  const original={allianceId,heroId,joinedAt:now-1000}, migrated=migrateEnrollment(original)!;
  expect(migrated).toEqual({...original,allianceId:next,legacyAllianceId:allianceId});expect(validEnrollment(migrated)).toBe(true);
  expect(migrateEnrollment(migrated)).toEqual(migrated);expect(starterCompanions(migrated)).toEqual(starterCompanions(original));
  const state=createConquest(undefined,now);state.enrollment=original;state.energy=77;state.inventory.herbs=9;state.credited=['earned'];
  const guard={id:starterCompanions(original)[1],element:'wood' as const,level:4,hp:19};state.units[guard.id]=guard;
  const tile=state.tiles.find(t=>t.id==='0,0')!;tile.owner=player;tile.guards=[guard];tile.commander=heroId;tile.shieldUntil=now+10000;
  const saved=parseConquest(JSON.stringify(state),player);
  expect(saved.enrollment).toEqual(migrated);expect(saved.units).toEqual(state.units);expect(saved.energy).toBe(77);expect(saved.inventory).toEqual(state.inventory);expect(saved.credited).toEqual(['earned']);
  expect(saved.tiles.find(t=>t.id==='0,0')).toMatchObject({owner:player,guards:[guard],commander:heroId,shieldUntil:now+10000});
  expect(expeditionRoster({},saved.enrollment).map(c=>c.id).sort()).toEqual(starterCompanions(original).sort());
  expect(ensureSeason(saved,Date.UTC(2026,11,1)).enrollment).toEqual(migrated);
  expect(parseConquest(JSON.stringify(saved),player)).toEqual(saved);
 });
 it('rejects NPC/legacy joins, forged old pairs and mismatched legacy entitlements',()=>{
  for(const id of ['dark-tide','verdant','forge','moon'])expect(()=>enrollConquest(createConquest(),player,id,'hero-elf',{},now)).toThrow();
  expect(migrateEnrollment({allianceId:'forge',heroId:'hero-elf',joinedAt:now})).toBeUndefined();
  expect(validEnrollment({allianceId:'night',heroId:'hero-orc',joinedAt:now,legacyAllianceId:'forge'})).toBe(false);
  expect(()=>parseConquest(JSON.stringify({...createConquest(),enrollment:{allianceId:'dark-tide',heroId:'hero-orc',joinedAt:now}}),player)).toThrow();
 });
});
