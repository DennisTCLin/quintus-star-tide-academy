import { describe, it, expect } from 'vitest';
import { newTerritory, territoryTransition as go, validateTerritory, plotCount, production } from '../territory';
import { newFamily, validateFamily } from '../adventure';
import { CASTLE_STYLES } from '../castle-growth';
const now=1_790_000_000_000;
describe('permanent castle and territory evolution',()=>{
  it('requires trusted growth instead of city levels, materials or copies',()=>{
    const t=newTerritory(now); t.renown=1900;
    expect(()=>go(t,{action:'expand'},now,{tideglow:100},{})).toThrow('練習提升 1 級');
    expect(()=>go(t,{action:'expand',xp:350},now,{},{})).toThrow('欄位');
    t.resources={wood:0,stone:0,star:0}; t.renown=0;
    const expanded=go(t,{action:'expand'},now,{}, {tideglow:50});
    expect(plotCount(expanded)).toBe(16); expect(expanded.resources).toEqual(t.resources);
    expect(()=>go(expanded,{action:'expand'},now,{}, {tideglow:349})).toThrow('練習提升 4 級');
    const full=go(expanded,{action:'expand'},now,{}, {tideglow:350});
    expect(plotCount(full)).toBe(24);
    expect(()=>go(full,{action:'expand'},now,{}, {tideglow:350})).toThrow('整座島');
    expect(t.expansion).toBe(0);
  });
  it('preserves old expanded land and every placement through six identities and loss of ownership',()=>{
    let t=newTerritory(now);t.expansion=2;t.nextId=3;
    t.buildings.push({id:2,kind:'grove',plot:23,level:5,resident:null});
    const old=structuredClone(t), rate=production(t);
    for(const s of CASTLE_STYLES) {
      t=go(t,{action:'castle-style',style:s.id},now,{},{});
      expect(t.castleStyle).toBe(s.id);expect(t.expansion).toBe(2);
      expect(t.buildings).toEqual(old.buildings);expect(t.resources).toEqual(old.resources);
      expect(production(t)).toEqual(rate);
      validateTerritory(JSON.parse(JSON.stringify(t)));
    }
    const f=newFamily();f.profiles.quintus.territory=t;
    const roundTrip=validateFamily(JSON.parse(JSON.stringify(f)));
    expect(roundTrip.profiles.quintus.territory).toEqual(t);
    expect(go(t,{action:'harvest'},now,{},{}).expansion).toBe(2);
  });
  it('rejects unrecognized cosmetics and forged expansion metadata atomically',()=>{
    const t=newTerritory(now),old=structuredClone(t);
    for(const style of [null,'__proto__','castle7',{},42]) {
      expect(()=>go(t,{action:'castle-style',style},now,{},{})).toThrow();
      expect(()=>validateTerritory({...t,castleStyle:style})).toThrow();
    }
    for(const field of ['growthXp','eligible','expansion','resources']) expect(()=>go(t,{action:'expand',[field]:350},now,{}, {tideglow:350})).toThrow();
    expect(t).toEqual(old);
    expect(()=>validateTerritory({...t,expansion:3})).toThrow();
    expect(()=>validateTerritory(t)).not.toThrow();
  });
});
