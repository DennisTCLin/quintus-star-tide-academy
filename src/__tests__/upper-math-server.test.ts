import {islandAfterDecliningCapture} from './helpers/capture';
import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { newFamily,validateFamily } from '../adventure';
import { ISLAND_UNITS,gradeUnits } from '../island/catalog';
import { emptyPlayer,kingOpen,playMixKeys,recordAnswer } from '../island/engine';
import { startIsland,answerIsland,finishIsland,quitIsland } from '../island/server';
import { publicIslandRun,validateIsland } from '../island/schema';
import { unitAbility } from '../island/ability';
const day='2026-10-26';
describe('All-grade authoritative math progress',()=>{
  it('finishes every unit and every stage with save/reload, hidden future answers and once-only rewards',()=>{
    let family=newFamily();
    const id='qingqing',other=structuredClone(family.profiles.doudou);
    for(const grade of [1,2,3,4,5,6]) {
      expect(kingOpen(family.profiles[id].mathIsland??emptyPlayer(),grade)).toBe(false);
      for(const unit of gradeUnits(grade)) for(const mode of ['learn','play','boss'] as const) {
        let run;
        try {run=islandAfterDecliningCapture(family,id,mode,unit.id,randomUUID(),day);}catch(error){throw Error(unit.id+'/'+mode+': '+String(error));}
        expect(publicIslandRun(run).items.every(q=>q.answer==='')).toBe(true);
        expect(new Set(run.items.map(q=>q.id)).size).toBe(run.items.length);
        for(let i=0;i<run.items.length;i++)expect(answerIsland(family,id,run.id,i,run.items[i].answer,day).correct).toBe(true);
        finishIsland(family,id,run.id,day);
        const before=JSON.stringify(family);finishIsland(family,id,run.id,day);expect(JSON.stringify(family)).toBe(before);
        family=validateFamily(JSON.parse(JSON.stringify(family)));
        expect(family.profiles[id].mathIsland?.units[unit.id][mode==='boss'?'boss':mode]).toBe(mode==='boss'?1:true);
        expect(unitAbility(family.profiles[id].mathIsland!,unit.id).attempts).toBeGreaterThan(0);
      }
      expect(kingOpen(family.profiles[id].mathIsland!,grade)).toBe(true);
      const king=islandAfterDecliningCapture(family,id,'mock',undefined,randomUUID(),day,0,grade);
      expect(king.items.every(q=>Number(q.unit[0])===grade)).toBe(true);
      expect(new Set(king.items.map(q=>q.unit)).size).toBe(6);
      for(let i=0;i<king.items.length;i++)answerIsland(family,id,king.id,i,king.items[i].answer,day);
      finishIsland(family,id,king.id,day);
      family=validateFamily(JSON.parse(JSON.stringify(family)));
      expect(grade===1?family.profiles[id].mathIsland?.mock:family.profiles[id].mathIsland?.mocks?.[grade]).toBe(1);
    }
    expect(Object.keys(family.profiles[id].mathIsland!.units)).toHaveLength(ISLAND_UNITS.length);
    expect(family.profiles.doudou).toEqual(other);
  });
  it('permits existing grade-two/four players to select a math grade and preserves cross-player isolation',()=>{
    const family=newFamily();
    for(const id of ['feifei','quintus'] as const) {
      const r=islandAfterDecliningCapture(family,id,'learn','6B-06',randomUUID(),day);
      answerIsland(family,id,r.id,0,r.items[0].answer,day);
      expect(()=>validateFamily(family)).not.toThrow();
      expect(()=>answerIsland(family,id,r.id,0,r.items[0].answer,day)).toThrow();
    }
    expect(family.profiles.qingqing.mathIsland).toBeUndefined();
  });
  it('keeps remedial questions in the selected grade, and rejects malformed grade and progress combinations',()=>{
    const p=emptyPlayer();
    recordAnswer(p,{k:'count'},false,new Date('2026-10-25T12:00:00'));
    const g2=gradeUnits(2)[0];recordAnswer(p,{k:g2.games[0]},false,new Date('2026-10-25T12:00:00'));
    expect(playMixKeys(p,'2A-02',day).every(x=>x.k!=='count')).toBe(true);
    const family=newFamily();
    expect(()=>islandAfterDecliningCapture(family,'qingqing','learn','2A-01',randomUUID(),day,0,6)).toThrow();
    expect(()=>islandAfterDecliningCapture(family,'qingqing','mock',undefined,randomUUID(),day,0,7)).toThrow();
    const r=islandAfterDecliningCapture(family,'qingqing','learn','2A-01',randomUUID(),day);
    r.grade=6;expect(()=>validateIsland(family.profiles.qingqing.mathIsland)).toThrow();
    r.grade=2;quitIsland(family,'qingqing',r.id);
    expect(()=>validateIsland({...p,mocks:{'7':1}})).toThrow();
  });
});
