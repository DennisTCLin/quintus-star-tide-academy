import { describe, it, expect } from 'vitest';
import { newFamily, validateFamily, draw } from '../adventure';
import { chooseRarity, DRAW_WEIGHTS, STAR_TICKET_WEIGHTS } from '../rarity-odds';
import { companionDrawPool, chooseCompanionDraw, petById } from '../game-view';

describe('administrator star invitation', () => {
  it('defaults old saves to zero, rejects malformed balances and receipts', () => {
    const family = newFamily(); delete (family.profiles.quintus as any).starTickets;
    expect(validateFamily(family).profiles.quintus.starTickets).toBe(0);
    for (const bad of [-1, 1.5, '3', 10001, null]) {
      const f = newFamily(); (f.profiles.quintus as any).starTickets = bad;
      expect(() => validateFamily(f)).toThrow();
    }
    const f = newFamily(); f.profiles.quintus.starTickets = 1;
    draw(f,'quintus','special',.8,0,undefined,undefined,true);
    expect(validateFamily(f)).toEqual(f);
    (f.profiles.quintus.lastDraw as any).ticketKind = 'free';
    expect(() => validateFamily(f)).toThrow();
  });
  it('has exactly S 30% / A 70% and leaves all normal probabilities unchanged', () => {
    const pool = companionDrawPool(newFamily().profiles.quintus), counts: Record<string, number> = {}, regular: Record<string, number> = {};
    for(let i=0;i<10000;i++) {
      const r=chooseRarity(pool,STAR_TICKET_WEIGHTS,(i+.5)/10000);counts[r]=(counts[r]??0)+1;
      const n=chooseRarity(pool,DRAW_WEIGHTS,(i+.5)/10000);regular[n]=(regular[n]??0)+1;
    }
    expect(counts).toEqual({A:7000,S:3000}); expect(regular).toEqual({E:5000,D:2800,C:1200,B:600,A:260,S:100,SS:30,SSS:10});
    for(const rarity of ['A','S']) {
      const tier=pool.filter(p=>p.rarity===rarity);
      for(let i=0;i<tier.length;i++) expect(chooseCompanionDraw(newFamily().profiles.quintus,rarity==='A'?0:.7,(i+.5)/tier.length,true).id).toBe(tier[i].id);
    }
  });
  it('consumes only the selected type and retains cloud receipt, collection and other players', () => {
    const f=newFamily(),p=f.profiles.quintus;p.starTickets=2;p.tickets=3;
    const before=structuredClone(f);
    const first=draw(f,'quintus','star1',.7,0,p.day,undefined,true);
    const second=draw(f,'quintus','star2',.7,0,p.day,undefined,true);
    expect(first.ticketKind).toBe('star');expect(petById(first.pet!)?.rarity).toBe('S');
    expect(second.duplicate).toBe(true);expect(p.lastDraw?.ticketKind).toBe('star');
    expect(p.starTickets).toBe(0);expect(p.tickets).toBe(3);
    for (const key of ['coins','growth','rewardStars','milestones','equipped'] as const) expect(p[key]).toEqual(before.profiles.quintus[key]);
    expect(f.profiles.feifei).toEqual(before.profiles.feifei);
    const saved=structuredClone(f);expect(()=>draw(f,'quintus','empty',.7,0,p.day,undefined,true)).toThrow();expect(f).toEqual(saved);
    draw(f,'quintus','normal',0,0,p.day);expect(p.starTickets).toBe(0);expect(p.tickets).toBe(2);expect(p.lastDraw?.ticketKind).toBeUndefined();
  });
  it('rejects invalid rolls and duplicate IDs without spending an invitation', () => {
    const f=newFamily();f.profiles.quintus.starTickets=3;
    for(const roll of [NaN,-1,1,Infinity]) expect(()=>draw(f,'quintus','bad',roll,0,undefined,undefined,true)).toThrow();
    draw(f,'quintus','once',0,0,undefined,undefined,true);
    const saved=structuredClone(f);expect(()=>draw(f,'quintus','once',0,0,undefined,undefined,true)).toThrow();expect(f).toEqual(saved);
  });
});
