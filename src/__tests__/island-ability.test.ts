import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { randomUUID } from 'node:crypto';
import { describe,it,expect } from 'vitest';
import { unitAbility } from '../island/ability';
import { emptyPlayer,recordAnswer } from '../island/engine';
import { UNIT_BY_ID } from '../island/catalog';
import { validateIsland } from '../island/schema';
import { newFamily,validateFamily } from '../adventure';
import { startIsland,answerIsland } from '../island/server';
import { IslandAbility } from '../island/IslandAbility';
import { IslandJourney } from '../island/IslandNavigation';
import { islandQuestionPosition } from '../island/navigation';
import { Zy,zhuyin } from '../island/zhuyin';

const unit='1A-01',keys=UNIT_BY_ID[unit].games,day='2026-10-25';
const now=new Date(`${day}T12:00:00`);
describe('Math Island chapter ability',()=>{
  it('starts unassessed and gives equal weight to every chapter concept',()=>{
    const p=emptyPlayer();expect(unitAbility(p,unit)).toMatchObject({score:0,attempts:0,practiced:0,total:keys.length});
    recordAnswer(p,{k:keys[0]},true,now);
    expect(unitAbility(p,unit).score).toBe(Math.round(33/keys.length));
    expect(unitAbility(p,unit).practiced).toBe(1);
    expect(unitAbility(p,unit).score).toBeLessThan(100);
    for(let i=0;i<2;i++)recordAnswer(p,{k:keys[0]},true,now);
    expect(unitAbility(p,unit).concepts[0].score).toBe(100);
    expect(unitAbility(p,unit).score).toBeLessThan(100);
    for(const k of keys.slice(1))for(let i=0;i<3;i++)recordAnswer(p,{k},true,now);
    expect(unitAbility(p,unit)).toMatchObject({score:100,practiced:keys.length});
  });
  it('responds to recent mistakes and lets three later correct answers restore a concept',()=>{
    const p=emptyPlayer(),k=keys[0];
    for(const ok of [true,true,true,false])recordAnswer(p,{k},ok,now);
    expect(unitAbility(p,unit).concepts[0].score).toBe(67);
    expect(p.recent?.[k]).toEqual([true,true,false]);
    for(let i=0;i<3;i++)recordAnswer(p,{k},true,now);
    expect(unitAbility(p,unit).concepts[0].score).toBe(100);
    expect(p.recent?.[k]).toEqual([true,true,true]);
    expect(()=>validateIsland(p)).not.toThrow();
  });
  it('estimates missing legacy evidence without changing saved progress or stage unlocks',()=>{
    const p=emptyPlayer(),k=keys[0];p.stats[k]={a:8,w:2};
    const before=structuredClone(p);
    expect(unitAbility(p,unit).concepts[0].score).toBe(75);expect(p).toEqual(before);
    recordAnswer(p,{k},false,now);
    expect(unitAbility(p,unit).concepts[0].score).toBe(50);
    recordAnswer(p,{k},true,now);recordAnswer(p,{k},true,now);
    expect(unitAbility(p,unit).concepts[0].score).toBe(67);
    expect(p.units).toEqual({});expect(()=>validateIsland(p)).not.toThrow();
  });
  it('saves only the original server answer, survives reload and retains old saves',()=>{
    const family=newFamily(),id='qingqing';
    const run=startIsland(family,id,'learn',unit,randomUUID(),day),q=run.items[0];
    answerIsland(family,id,run.id,0,q.answer,day);
    expect(family.profiles[id].mathIsland?.recent?.[q.k]).toEqual([true]);
    expect(()=>answerIsland(family,id,run.id,0,q.answer,day)).toThrow();
    expect(family.profiles[id].mathIsland?.recent?.[q.k]).toEqual([true]);
    const loaded=JSON.parse(JSON.stringify(family));expect(()=>validateFamily(loaded)).not.toThrow();
    expect(loaded.profiles[id].mathIsland.recent[q.k]).toEqual([true]);
    delete loaded.profiles[id].mathIsland.recent;expect(()=>validateFamily(loaded)).not.toThrow();
  });
  it('rejects malformed or inconsistent answer evidence',()=>{
    const p=emptyPlayer(),k=keys[0];p.stats[k]={a:4,w:1};
    for(const recent of [{[k]:[true,true,true,true]},{[k]:[1]},{unknown:[true]},{[k]:[false,false]}]) {
      expect(()=>validateIsland({...p,recent})).toThrow();
    }
  });
  it('shows chapter ability separately from the current round question progress',()=>{
    const p=emptyPlayer();recordAnswer(p,{k:keys[0]},true,now);
    const html=renderToStaticMarkup(createElement(IslandJourney,{unit,mode:'learn',progress:{},abilityProgress:p,
      position:islandQuestionPosition(9,2,2,false),coins:2,busy:false,onMap:()=>{},}));
    expect(html).toContain('本關已完成 2 / 9 題');
    expect(html).toContain(`本單元熟練度 ${unitAbility(p,unit).score}%`);
    const fresh=renderToStaticMarkup(createElement(IslandAbility,{progress:emptyPlayer(),unit,details:true}));
    expect(fresh).toContain('還沒練習');expect(fresh).toContain('看看小本領');
    expect(fresh).toContain('最近三次');
  });
});

describe('right-side phonetic annotations',()=>{
  it('keeps one Chinese character with its vertical phonetic column and separate tone mark',()=>{
    const html=renderToStaticMarkup(createElement(Zy,{text:'好的數學'}));
    expect(html).toContain('aria-label="好的數學"');
    expect(html).toContain('<span class="isl-han">好</span><rt data-zhuyin="ㄏㄠˇ">');
    expect(html).toContain('<span class="isl-neutral"><span class="phonetic-tone">˙</span></span>');
    expect(html).toContain('<span class="isl-phonetic-tone"><span class="phonetic-tone">ˇ</span></span>');
    expect(zhuyin('熟練度')[0].zy).toBe('ㄕㄡˊ');
  });
});
