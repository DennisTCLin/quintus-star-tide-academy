import { describe, it, expect } from 'vitest';
import { newFamily, newOnboardingFamily, drawStarter, confirmStarter, draw, validateFamily, proposeTrade, acceptTrade } from '../adventure';
import { DRAW_WEIGHTS } from '../rarity-odds';
import { RARITY_ORDER } from '../characters';
import { companionDrawPool, chooseCompanionDraw } from '../game-view';

describe('permanent gacha receipt and shared odds', () => {
  it('preserves historical saves without inventing a previous result', () => {
    const s=newFamily(); expect(validateFamily(structuredClone(s))).toEqual(s);
    expect(s.profiles.quintus.lastDraw).toBeUndefined();
  });
  it('persists the committed result and duplicate count without spending other resources', () => {
    const s=newFamily(),p=s.profiles.quintus; p.tickets=2;
    const before=structuredClone(p),pet=chooseCompanionDraw(p,0,0).id;
    draw(s,'quintus','first',0,0,p.day); draw(s,'quintus','second',0,0,p.day);
    expect(p.lastDraw).toEqual({id:'second',pet,duplicate:true,copies:2});
    expect(p.tickets).toBe(0);expect(p.draws).toBe(2);expect(p.owned[pet]).toBe(2);
    for (const key of ['coins','growth','rewardStars','equipped'] as const) expect(p[key]).toEqual(before[key]);
    expect(validateFamily(JSON.parse(JSON.stringify(s)))).toEqual(s);
    const saved=structuredClone(s);expect(()=>draw(s,'quintus','third',0,0,p.day)).toThrow();expect(s).toEqual(saved);
    expect(s.profiles.feifei.lastDraw).toBeUndefined();
  });
  it('advertises exactly the eligible set for both historical and randomized starters', () => {
    for(const modern of [false,true]) {
      const s=modern?newOnboardingFamily():newFamily(),p=s.profiles.quintus;
      if(modern){drawStarter(s,'quintus',.9,0);confirmStarter(s,'quintus');}
      const pool=companionDrawPool(p);expect(pool).toHaveLength(104);p.tickets=104;
      let offset=0;
      for(const rarity of RARITY_ORDER) {
        const tier=pool.filter(pet=>pet.rarity===rarity),roll=(offset+0.5)/10000;
        for(let i=0;i<tier.length;i++) expect(draw(s,'quintus',`pool-${rarity}-${i}`,roll,(i+.5)/tier.length,p.day).pet).toBe(tier[i].id);
        offset+=DRAW_WEIGHTS[rarity];
      }
      expect(new Set(Object.keys(p.owned)).size).toBe(105);
    }
  });
  it('keeps the historical receipt valid after that card has been exchanged', () => {
    const s=newFamily(),p=s.profiles.quintus;p.tickets=1;
    const pet=draw(s,'quintus','receipt',0,0,p.day).pet!;
    const other=companionDrawPool(p)[1].id;s.profiles.feifei.owned[other]=1;s.profiles.feifei.firstAcquired[other]=null;
    proposeTrade(s,{id:'trade',from:'quintus',to:'feifei',give:pet,receive:other});acceptTrade(s,'feifei','trade');
    expect(p.owned[pet]??0).toBe(0);expect(p.lastDraw!.pet).toBe(pet);expect(validateFamily(s)).toEqual(s);
  });
  it('rejects malformed receipts without accepting a fabricated unacquired pet', () => {
    for(const bad of [null,{id:'',pet:'tideglow',duplicate:false,copies:1},{id:'x',pet:'missing',duplicate:false,copies:1},{id:'x',pet:'tideglow',duplicate:0,copies:1},{id:'x',pet:'tideglow',duplicate:false,copies:0},{id:'x',pet:companionDrawPool(newFamily().profiles.quintus)[0].id,duplicate:false,copies:1}]) {
      const s=newFamily();(s.profiles.quintus as any).lastDraw=bad;expect(()=>validateFamily(s)).toThrow();
    }
  });
});
