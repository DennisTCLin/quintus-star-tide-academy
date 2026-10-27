import { DRAW_WEIGHTS } from '../rarity-odds';
import { RARITY_ORDER } from '../characters';
import { describe, expect, it } from 'vitest';
import { newFamily, newOnboardingFamily, drawStarter, confirmStarter, validateFamily, startRun, proposeTrade, acceptTrade, draw, buyPet, ROSTER, type PlayerId } from '../adventure';
import { BASE_ROSTER } from '../game-view';
import { initialCompanion, needsOnboarding, pickStarter, STARTER_POOLS } from '../starter';

const begin = (id: PlayerId = 'quintus', roll = .9, pick = 0) => {
  const s = newOnboardingFamily();
  const pet = drawStarter(s,id,roll,pick);
  confirmStarter(s,id);
  return {s, pet, p:s.profiles[id]};
};
describe('one-time onboarding companion', () => {
  it('uses an 80/20 rarity split then samples every member of that rarity', () => {
    expect(pickStarter(0,0).rarity).toBe('E');
    expect(pickStarter(.799999999, .999999).rarity).toBe('E');
    expect(pickStarter(.8,0).rarity).toBe('D');
    expect(pickStarter(.999999,.999999).rarity).toBe('D');
    for (const [rarity,pool] of Object.entries(STARTER_POOLS)) {
      for (let i=0;i<pool.length;i++) expect(pickStarter(rarity==='E' ? .1:.9,(i+.5)/pool.length)).toEqual(pool[i]);
    }
    const rarities = Array.from({length:1000},(_,i)=>pickStarter(i/1000,.5).rarity);
    expect(rarities.filter(x=>x==='D')).toHaveLength(200);
    for (const invalid of [-1,1,NaN,Infinity]) {
      expect(()=>pickStarter(invalid,0)).toThrow(); expect(()=>pickStarter(0,invalid)).toThrow();
    }
  });
  it('grants exactly one, equips it, stays Lv1 and preserves the economy', () => {
    const s = newOnboardingFamily(), before=structuredClone(s.profiles.quintus);
    const pet = drawStarter(s,'quintus',.9,.3), p=s.profiles.quintus;
    expect(p.owned).toEqual({[pet]:1}); expect(p.firstAcquired).toEqual({[pet]:null});
    expect(p.equipped).toBe(pet); expect(p.onboarding).toEqual({pet,confirmed:false});
    for (const key of ['coins','tickets','draws','pity','growth','milestones','rewardStars'] as const) expect(p[key]).toEqual(before[key]);
    expect(validateFamily(JSON.parse(JSON.stringify(s)))).toEqual(s);
    const snapshot=structuredClone(p);
    expect(drawStarter(s,'quintus',0,.9)).toBe(pet); expect(p).toEqual(snapshot);
    confirmStarter(s,'quintus'); confirmStarter(s,'quintus');
    expect(needsOnboarding(p)).toBe(false);
    startRun(s,'quintus','math','starter-run',0);
    expect(p.run!.companion).toBe(pet);
    const withRun=structuredClone(p); drawStarter(s,'quintus',0,0); expect(p).toEqual(withRun);
  });
  it('keeps each player independent, and cannot confirm an undrawn capsule', () => {
    const s=newOnboardingFamily(); expect(()=>confirmStarter(s,'quintus')).toThrow();
    const other=structuredClone(s.profiles.feifei); drawStarter(s,'quintus',.9,0);
    expect(s.profiles.feifei).toEqual(other); expect(needsOnboarding(s.profiles.feifei)).toBe(true);
    drawStarter(s,'feifei',0,.5); expect(s.profiles.feifei.equipped).not.toBe(s.profiles.quintus.equipped);
  });
  it('does not enroll or reset historical players; validates corrupted states strictly', () => {
    const s=newFamily(); expect(validateFamily(s)).toEqual(s); expect(needsOnboarding(s.profiles.quintus)).toBe(false);
    expect(()=>drawStarter(s,'quintus',0,0)).toThrow(); expect(()=>confirmStarter(s,'quintus')).toThrow();
    for (const onboarding of [{pet:null,confirmed:true},{pet:'infinitywhale',confirmed:false},{pet:'missing',confirmed:true},{pet:null,confirmed:1}]) {
      const s:any=newOnboardingFamily(); s.profiles.quintus.onboarding=onboarding; expect(()=>validateFamily(s)).toThrow();
    }
    const {s:drawn,pet}=begin(); delete drawn.profiles.quintus.owned[pet]; expect(()=>validateFamily(drawn)).toThrow();
  });
  it('keeps all other collectible cards reachable under weighted ticket odds', () => {
    const {s,p,pet}=begin(); p.tickets=104;
    const pool=BASE_ROSTER.filter(x=>x.id!==pet);
    let offset=0;
    for(const rarity of RARITY_ORDER){const tier=pool.filter(c=>c.rarity===rarity);for(let i=0;i<tier.length;i++)expect(draw(s,'quintus',`pool-${rarity}-${i}`,(offset+.5)/10000,(i+.5)/tier.length).pet).toBe(tier[i].id);offset+=DRAW_WEIGHTS[rarity];}
    expect(Object.keys(p.owned)).toHaveLength(105); expect(p.owned[pet]).toBe(1);
    expect(validateFamily(s)).toEqual(s);
    const old=newFamily(); old.profiles.quintus.tickets=104;
    const oldPool=BASE_ROSTER.filter(x=>x.id!=='tideglow');
    offset=0;
    for(const rarity of RARITY_ORDER){const tier=oldPool.filter(c=>c.rarity===rarity);for(let i=0;i<tier.length;i++)expect(draw(old,'quintus',`old-${rarity}-${i}`,(offset+.5)/10000,(i+.5)/tier.length).pet).toBe(tier[i].id);offset+=DRAW_WEIGHTS[rarity];}
  });
  it('can acquire Tideglow as a later companion and exchange it between new players', () => {
    const {s,p,pet}=begin(); p.coins=300; buyPet(s,'quintus','tideglow','buy-guide');
    drawStarter(s,'feifei',.9,.2); confirmStarter(s,'feifei');
    const card=ROSTER.find(x=>!['tideglow',pet,s.profiles.feifei.equipped].includes(x.id))!;
    s.profiles.feifei.owned[card.id]=1; s.profiles.feifei.firstAcquired[card.id]=null;
    p.equipped='tideglow';
    proposeTrade(s,{id:'trade-guide',from:'quintus',to:'feifei',give:'tideglow',receive:card.id});
    expect(validateFamily(s)).toEqual(s); acceptTrade(s,'feifei','trade-guide');
    expect(p.equipped).toBe(pet); expect(s.profiles.feifei.owned.tideglow).toBe(1); expect(validateFamily(s)).toEqual(s);
  });
  it('allows historical players to receive duplicate Tideglow without giving away their anchor', () => {
    const {s,p,pet}=begin();s.profiles.feifei=newFamily().profiles.feifei;
    p.coins=300;buyPet(s,'quintus','tideglow','later-guide');
    const card=ROSTER.find(x=>!['tideglow',pet].includes(x.id))!;
    s.profiles.feifei.owned[card.id]=1;s.profiles.feifei.firstAcquired[card.id]=null;
    expect(()=>proposeTrade(s,{id:'illegal',from:'feifei',to:'quintus',give:'tideglow',receive:pet})).toThrow();
    proposeTrade(s,{id:'duplicate-guide',from:'quintus',to:'feifei',give:'tideglow',receive:card.id});
    expect(validateFamily(s)).toEqual(s); acceptTrade(s,'feifei','duplicate-guide');
    expect(s.profiles.feifei.owned.tideglow).toBe(2);expect(s.profiles.feifei.firstAcquired.tideglow).toBeNull();
    expect(validateFamily(s)).toEqual(s);
  });
  it('protects the randomized initial companion and uses it as trade fallback', () => {
    const {s,pet,p}=begin(); drawStarter(s,'feifei',.9,.2); confirmStarter(s,'feifei');
    const cards=ROSTER.filter(x=>!['tideglow',pet,s.profiles.feifei.equipped].includes(x.id)).slice(0,2);
    for (const [id,c] of [['quintus',cards[0]],['feifei',cards[1]]] as const) {s.profiles[id].owned[c.id]=1;s.profiles[id].firstAcquired[c.id]=null;}
    expect(()=>proposeTrade(s,{id:'bad',from:'quintus',to:'feifei',give:pet,receive:cards[1].id})).toThrow();
    p.equipped=cards[0].id;
    proposeTrade(s,{id:'good',from:'quintus',to:'feifei',give:cards[0].id,receive:cards[1].id});
    acceptTrade(s,'feifei','good'); expect(p.equipped).toBe(pet); expect(initialCompanion(p)).toBe(pet);
    expect(validateFamily(s)).toEqual(s);
  });
});
