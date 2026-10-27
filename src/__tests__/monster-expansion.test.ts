import { describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DRAW_WEIGHTS } from '../rarity-odds';
import { RARITY_ORDER } from '../characters';
import { MONSTER_CATALOG, MONSTER_FAMILIES, chooseMonster, monsterById } from '../monsters';
import { chooseCompanionDraw, companionDrawPool, ROSTER, petSkill, petSkillName, petSkillDescription, petById } from '../game-view';
import { newFamily, startRun, answerRun, nextQuestion, validateFamily, settleCapture } from '../adventure';
import { CAPTURE_RATES, validCaptureRate, encounterStats } from '../creature-rules';
import { questionById } from '../learning';
import { startIsland, answerIsland, finishIsland } from '../island/server';
import GachaMachine from '../GachaMachine';
import {answerCapture} from '../capture-trial';
const day='2026-10-25';

describe('fifty new monsters and scarce S tiers',()=>{
  it('adds exactly fifty unique species, numbered after existing companions, all with usable support skills',()=>{
    expect(MONSTER_CATALOG.slice(30,80)).toHaveLength(50);
    expect(MONSTER_FAMILIES.slice(0,8)).toHaveLength(8);
    for(const field of ['id','name','catalogNumber'] as const)expect(new Set(ROSTER.map(p=>p[field])).size).toBe(215);
    for(const monster of MONSTER_CATALOG.slice(30,80)) {
      expect(['focus','shield','spark']).toContain(petSkill(monster.id));
      expect(petSkillName(monster.id)).toBe(monster.move);
      expect(petSkillDescription(monster.id).length).toBeGreaterThan(10);
      expect(petById(monster.id)!.catalogNumber).toBe(monster.number+105);
    }
  });
  it('publishes the exact tier distribution, with every species in a tier reachable independently of pool growth',()=>{
    const profile=newFamily().profiles.quintus,counts=Object.fromEntries(RARITY_ORDER.map(r=>[r,0]));
    for(let i=0;i<10000;i++) counts[chooseCompanionDraw(profile,(i+.5)/10000,.5).rarity]++;
    expect(counts).toEqual(DRAW_WEIGHTS);
    expect(counts.S+counts.SS+counts.SSS).toBe(140);
    const html=renderToStaticMarkup(createElement(GachaMachine,{profile,day,online:true,busy:false,reduced:true,onDraw:async()=>undefined,onEquip:async()=>{},onLearn:()=>{},onCollection:()=>{},onTrade:()=>{},onSpeak:()=>{},musicControl:null}));
    for(const [r,percent] of [['S','1.00'],['SS','0.30'],['SSS','0.10']])expect(html).toContain(`<th>${r}</th><td>${companionDrawPool(profile).filter(p=>p.rarity===r).length}</td><td>${percent}%</td>`);
    expect(html).not.toContain('每隻都是 1 /');
    for(const value of [NaN,Infinity,-.1,1])expect(()=>chooseCompanionDraw(profile,value,0)).toThrow();
  });
  it('loads every new family through a full earned voyage, capture and repeat settlement without duplicate awards',()=>{
    for(const m of MONSTER_CATALOG.slice(30,80)) {
      const f=newFamily(),p=f.profiles.quintus;p.growth.xp.tideglow=m.form==='scout'?0:350;
      startRun(f,'quintus','math',randomUUID(),0,false,day);
      const r=p.run!;delete r.encounter.route;r.encounter.variant=m.id;r.encounter.monster=m.family;
      r.encounter.combat!.foe=encounterStats(2,m.rarity,r.encounter.level);
      expect(validateFamily(structuredClone(f))).toEqual(f);
      while(r.status==='active') {answerRun(f,'quintus',r.id,r.index,questionById(r.questions[r.index])!.answer,day,0);if(r.status==='active')nextQuestion(f,'quintus',r.id,r.index);}
      expect(r.capture).toMatchObject({version:3,monster:m.id,chance:100,outcome:'pending'});
      for(let i=0;i<3;i++)answerCapture(f,'quintus','voyage',r.id,i,questionById(r.capture!.trial!.questions[i])!.answer,day);
      expect(r.capture).toMatchObject({outcome:'joined',copies:1});
      settleCapture(p,r,day,0);expect(p.owned[m.id]).toBe(1);p.equipped=m.id;
      expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);
    }
  });
  it('preserves historical S receipts in regular and math-island saves and rejects changed or unknown versions',()=>{
    const m=MONSTER_CATALOG.find(m=>m.rarity==='S')!;
    const f=newFamily(),p=f.profiles.quintus;p.growth.xp.tideglow=350;
    startRun(f,'quintus','math',randomUUID(),0,false,day);const r=p.run!;delete r.captureRule;delete r.encounter.route;
    r.encounter.variant=m.id;r.encounter.monster=m.family;r.encounter.combat!.foe=encounterStats(2,m.rarity,r.encounter.level);
    while(r.status==='active'){answerRun(f,'quintus',r.id,r.index,questionById(r.questions[r.index])!.answer,day,0);if(r.status==='active')nextQuestion(f,'quintus',r.id,r.index);}
    delete r.capture!.version;r.capture!.chance=6;
    expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);
    const f2=newFamily(),p2=f2.profiles.doudou;p2.growth.xp.tideglow=350;
    p2.mathIsland={units:{'1A-01':{learn:true,play:true}},pool:[],stats:{},day:'',attempted:[]};
    const island=startIsland(f2,'doudou','play','1A-01',randomUUID(),day,0);delete island.captureRule;
    island.encounter!.variant=m.id;island.encounter!.monster=m.family;island.encounter!.combat!.foe=encounterStats(2,m.rarity,island.encounter!.level);
    for(let i=0;i<island.items.length;i++)answerIsland(f2,'doudou',island.id,i,island.items[i].answer,day);
    finishIsland(f2,'doudou',island.id,day,0);delete island.capture!.version;island.capture!.chance=6;
    expect(validateFamily(JSON.parse(JSON.stringify(f2)))).toEqual(f2);
    for(const save of [f,f2]) {
      const c=save===f?r.capture!:island.capture!;
      c.version=2;expect(()=>validateFamily(save)).toThrow();c.chance=2;expect(validateFamily(save)).toEqual(save);
      (c as any).version=99;expect(()=>validateFamily(save)).toThrow();
    }
    expect(validCaptureRate({version:2,chance:2},'S')).toBe(true);
    expect(validCaptureRate({chance:6},'S')).toBe(true);
    expect(validCaptureRate({chance:2},'S')).toBe(false);
  });
  it('keeps numeric legacy families restricted and all new species reachable on their route',()=>{
    for(const m of MONSTER_CATALOG.slice(30,80)) {
      const seen=Array.from({length:30},(_,i)=>[0,6500,8500,9500,9950].map(r=>chooseMonster(m.form==='scout'?1:5,i*10000+r,undefined,m.element).id)).flat();
      expect(seen).toContain(m.id);
    }
    const f=newFamily();startRun(f,'quintus','math',randomUUID(),0,false,day);
    const e=f.profiles.quintus.run!.encounter;delete e.variant;delete e.route;delete e.combat;e.monster=3;
    expect(()=>validateFamily(f)).toThrow();
    const provenance=JSON.parse(readFileSync('docs/monster-expansion-provenance.json','utf8'));
    expect(provenance.count).toBe(50);expect(new Set(provenance.assets.map((a:any)=>a.sha256)).size).toBe(50);
    expect(provenance.bytes).toBeLessThan(8*1024*1024);
    expect(provenance.thumbnailBytes).toBeLessThan(3*1024*1024);
    for(const a of provenance.assets) for(const [suffix,hash] of [['',a.sha256],['-320',a.thumbnailSha256]])expect(createHash('sha256').update(readFileSync(`public/assets/monsters/${a.id}${suffix}.webp`)).digest('hex')).toBe(hash);
    expect(monsterById('cloud-scout-metal')!.number).toBe(1);
  });
});
