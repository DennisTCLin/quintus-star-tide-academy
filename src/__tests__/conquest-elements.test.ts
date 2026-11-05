import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import legacyHashes from './fixtures/conquest-legacy-geography.json';
import { act, battleResult, claimCost, createConquest, defenderAffinity, defensePower, ELEMENTS, seasonAt, type Companion, type Guard } from '../conquest';
import { parseConquest } from '../conquest-store';
import { prepareBattle, claimReport, drillReport } from '../conquest-battle';
import * as T from 'three';
import { elementScenery, elementPartMatrix } from '../conquest-element-art';
const now = Date.UTC(2026,10,5,3), fresh = () => createConquest(seasonAt(now),now);
const guard = (id: string, element: Guard['element'], hp = 1000): Guard => ({ id, element, level: 2, hp, maxHp:1000 });
const roster: Companion[] = ['a','b','c'].map(id => ({...guard(id,'metal',100),maxHp:100,name:id,image:'',loan:true}));

describe('seasonal island elements and legacy compatibility', () => {
  it('balances all 36 seasons while preserving every original geography, wild guard and shrine byte', () => {
    for (const [season,hash] of Object.entries(legacyHashes)) {
      const state = createConquest(season,0);
      expect(state.tiles).toHaveLength(91);
      expect(ELEMENTS.map(element => state.tiles.filter(t=>t.element===element).length).sort()).toEqual([18,18,18,18,19]);
      expect(state.tiles.filter(t=>t.facility==='shrine').every(t=>t.element===t.shrineElement)).toBe(true);
      expect(state.tiles).toEqual(createConquest(season,123).tiles);
      const legacy = state.tiles.map(({element:_,...tile})=>tile);
      expect(createHash('sha256').update(JSON.stringify(legacy)).digest('hex')).toBe(hash);
    }
    expect(fresh().tiles.map(t=>t.element)).not.toEqual(createConquest('season-2026-12').tiles.map(t=>t.element));
  });
  it('upgrades absent or forged island elements without losing progress, injury, enrollment or shields', () => {
    const state = fresh(), tile=state.tiles[0];
    state.enrollment={allianceId:'verdant',heroId:'hero-elf',joinedAt:now-100};
    state.units.a=guard('a','wood',37); state.energy=123;
    state.inventory={herbs:15,spring:9,bandage:2,potion:1}; state.credited=['answer'];state.log=['已佔領'];
    Object.assign(tile,{owner:'p',guards:[state.units.a],capturedAt:now-100,shieldStartsAt:now+3600000,shieldUntil:now+90000000,commander:'hero-elf'});
    state.tiles[1].guards[0]={...state.tiles[1].guards[0],hp:1};
    for(const forged of [undefined,'fire','invalid']) {
      const raw=JSON.parse(JSON.stringify(state));raw.tiles.forEach((t:Record<string,unknown>)=>{if(forged===undefined)delete t.element;else t.element=forged;});
      const parsed=parseConquest(JSON.stringify(raw),'p');
      for(const key of ['energy','inventory','units','credited','log','updatedAt'] as const)expect(parsed[key]).toEqual(state[key]);
      expect(parsed.enrollment).toEqual({...state.enrollment,allianceId:'light',legacyAllianceId:'verdant'});
      expect(parsed.tiles.map(t=>t.element)).toEqual(state.tiles.map(t=>t.element));
      expect(parsed.tiles[0]).toMatchObject(tile);expect(parsed.tiles[1].guards).toEqual(state.tiles[1].guards);
    }
  });
});
describe('per-defender affinity', () => {
  it.each([[null,21,.05],['shrine',22,.10]] as const)('applies %s affinity once to matching defenders, including wild guards', (facility,damage,bonus) => {
    const tile={...fresh().tiles[0],element:'wood' as const,facility,shrineElement:facility ? 'wood' as const:null,guards:[guard('matched','wood'),guard('other','water'),guard('dead','wood',0)]};
    const result=battleResult([guard('attacker','fire')],tile,0,0);
    expect(defenderAffinity(tile,tile.guards[0])).toBe(bonus);expect(defenderAffinity(tile,tile.guards[1])).toBe(0);
    expect(result.affinityBonus).toBe(bonus);expect(result.shrineBoost).toBe(facility==='shrine');
    expect(result.defense).toBe(damage+20);expect(defensePower(tile)).toBe(damage+20);
    expect(result.events.find(e=>e.source==='matched')?.damage).toBe(damage);
    expect(result.events.find(e=>e.source==='other')?.damage).toBe(20);
    expect(result.events.some(e=>e.source==='dead')).toBe(false);
    expect(result.events.find(e=>e.side===-1)?.damage).toBe(20);
    expect(battleResult([guard('a','fire')],{...tile,guards:[guard('dead','wood',0)]},0,0).affinityBonus).toBe(0);
  });
  it('does not change attacker majority counters, raw claim costs or injured unit base damage', () => {
    const tile={...fresh().tiles[0],facility:null,guards:[guard('d','wood',50)],owner:'other'};
    const values=ELEMENTS.map(element=>battleResult([guard('a','metal')],{...tile,element},3,3));
    expect(values.every(v=>v.attack===25&&v.elemental)).toBe(true);
    expect(values.every(v=>v.events.find(e=>e.side===-1)?.damage===25)).toBe(true);
    expect(ELEMENTS.map(element=>claimCost({...tile,element},3))).toEqual(Array(5).fill(40));
  });
  it.each([null,'shrine'] as const)('uses identical %s rules in preview, committed hits, receipt and defense drills', facility => {
    const state=fresh(), tile=state.tiles.find(t=>t.id==='0,0')!;
    Object.assign(tile,{element:'wood',facility,shrineElement:facility?'wood':null,guards:[guard('d','wood',80)]});
    const plan={mode:'claim' as const,player:'p',season:state.season,tileId:tile.id}, team=roster.map(c=>c.id);
    const preview=prepareBattle(state,plan,team,roster,'coast',now);
    const committed=act(state,'p',{type:'claim',tileId:tile.id,team},roster,now);
    for(const key of ['events','defense','attack','affinityBonus','cost','won'] as const)expect(committed.lastBattle![key]).toEqual(preview.result[key]);expect(claimReport(preview,committed,now).result).toEqual(committed.lastBattle);
    const owned=committed.tiles.find(t=>t.id===tile.id)!;owned.element='metal';if(facility)owned.shrineElement='metal';
    const before=JSON.stringify(committed),drill=prepareBattle(committed,{...plan,mode:'drill'},[],roster,'coast',now);
    expect(drill.result.affinityBonus).toBe(facility?.length ? .1:.05);
    expect(drill.result.defense).toBe(defensePower(owned));expect(drillReport(drill,committed,now).result).toEqual(drill.result);expect(JSON.stringify(committed)).toBe(before);
  });
});
describe('element scenery integrity',()=>{
  it('keeps water surfaces horizontal and facing up for every island orientation',()=>{
    elementScenery('water','0,0',part=>{
      if(part.material==='water') for(let i=0;i<36;i++) {
        const matrix=elementPartMatrix(part,new T.Vector3(4,2,7),i*Math.PI/18);
        const geometry=part.geometry.clone().applyMatrix4(matrix),normal=geometry.getAttribute('normal');
        expect(normal.getY(0)).toBeCloseTo(1);expect(normal.getX(0)).toBeCloseTo(0);expect(normal.getZ(0)).toBeCloseTo(0);geometry.dispose();
      }part.geometry.dispose();
    });
  });
  it('builds finite, bounded geometry for all five motifs',()=>{
    const signatures=new Set<string>();
    for(const element of ELEMENTS){const materials=new Set<string>();let count=0;
      elementScenery(element,'0,0',part=>{count++;materials.add(part.material);part.geometry.computeBoundingSphere();expect(Number.isFinite(part.geometry.boundingSphere!.radius)).toBe(true);expect(part.position.length()).toBeLessThan(2);part.geometry.dispose();});
      expect(count).toBeGreaterThan(5);expect(count).toBeLessThan(40);signatures.add([...materials].sort().join(','));
    }expect(signatures.size).toBe(5);
  });
});
