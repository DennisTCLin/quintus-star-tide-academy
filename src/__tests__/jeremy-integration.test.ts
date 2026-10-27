import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { newFamily, validateFamily, startRun } from '../adventure';
import { startIsland, answerIsland, finishIsland } from '../island/server';
import { publicIslandRun } from '../island/schema';
import { MONSTER_CATALOG } from '../monsters';
import { encounterStats } from '../creature-rules';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { IslandJourney } from '../island/IslandNavigation';

const day='2026-10-26';
describe('Jeremy integration compatibility with the current game',()=>{
  it.each([7,8,9])('reads version %s with an active original island round without losing earned data',version=>{
    const family=newFamily(),r=startIsland(family,'doudou','learn','1A-01',randomUUID(),day);
    answerIsland(family,'doudou',r.id,0,r.items[0].answer,day);
    const original=structuredClone(family.profiles.doudou),input=JSON.parse(JSON.stringify(family));
    input.version=version;
    if(version<9)delete input.profiles.jay;
    if(version<8)delete input.profiles.alston;
    const loaded=validateFamily(input);
    expect(loaded.version).toBe(9);
    expect(loaded.profiles.doudou).toEqual(original);
    expect(loaded.profiles.jay).toBeDefined();
    expect(publicIslandRun(loaded.profiles.doudou.mathIsland!.run!).items.slice(1).every(q=>q.answer==='')).toBe(true);
    expect(input.version).toBe(version);
  });
  it('continues to reject Math Island IDs injected into ordinary course runs',()=>{
    const family=newFamily(),math=startIsland(family,'doudou','learn','5A-01',randomUUID(),day);
    startRun(family,'jay','math',randomUUID(),12,false,day);
    family.profiles.jay.run!.questions[0]=math.items[0].id;
    expect(()=>validateFamily(family)).toThrow();
  });
  it('retains historical capture receipts and the current rate validator after the island expansion',()=>{
    const family=newFamily(),p=family.profiles.doudou;
    p.mathIsland={units:{'1A-01':{learn:true,play:true}},pool:[],stats:{},day:'',attempted:[]};
    p.growth.xp[p.equipped]=1000;
    const run=startIsland(family,'doudou','boss','1A-01',randomUUID(),day);
    const monster=MONSTER_CATALOG.find(m=>m.rarity==='S'&&m.form==='warden')!;
    expect(monster).toBeDefined();
    run.encounter!.variant=monster.id;run.encounter!.monster=monster.family;
    run.encounter!.combat!.foe=encounterStats(2,monster.rarity,run.encounter!.level);
    for(let i=0;i<run.items.length;i++)answerIsland(family,'doudou',run.id,i,run.items[i].answer,day);
    finishIsland(family,'doudou',run.id,day,0.99);
    run.capture={monster:monster.id,chance:6,outcome:'escaped'};
    expect(validateFamily(family).profiles.doudou.mathIsland!.run!.capture).toEqual(run.capture);
    run.capture={version:2,monster:monster.id,chance:2,outcome:'escaped'};
    expect(()=>validateFamily(family)).not.toThrow();
    run.capture.chance=6;expect(()=>validateFamily(family)).toThrow();
  });
  it('labels the first grade and grade-specific year review explicitly',()=>{
    const props={mode:'mock' as const,progress:{},position:{number:1,completed:0,total:6,label:'第 1 題 / 共 6 題'},coins:0,busy:false,onMap:()=>{}};
    for(const [grade,name] of [[1,'一年級'],[5,'五年級']] as const){
      const html=renderToStaticMarkup(createElement(IslandJourney,{...props,grade}));
      expect(html).toContain(`aria-label="${name}"`);expect(html).toContain('aria-label="全學年複習"');
    }
    expect(renderToStaticMarkup(createElement(IslandJourney,{...props,unit:'1B-04'}))).toContain('aria-label="一年級"');
  });
});
