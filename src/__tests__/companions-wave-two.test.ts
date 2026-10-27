import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NEW_COMPANIONS } from '../companions-wave-two';
import { DRAW_WEIGHTS } from '../rarity-odds';
import { RARITY_ORDER, CHARACTERS } from '../characters';
import { BASE_ROSTER, ROSTER, companionDrawPool, petSkill, petSkillName, newBattle, battleMove } from '../game-view';
import { newFamily, draw, buyPet, proposeTrade, acceptTrade, collectionStats, collectionRanking, validateFamily } from '../adventure';
import { moveTitle } from '../battle-presentation';
import { syllables } from '../readability';
import { STARTER_POOLS } from '../starter';

describe('fifty new collectible companions', () => {
  it('adds fifty unique identities with balanced element coverage and the requested rarity mix', () => {
    expect(NEW_COMPANIONS).toHaveLength(50);
    for (const field of ['id', 'name', 'catalogNumber'] as const)
      expect(new Set(ROSTER.map(c => c[field])).size).toBe(215);
    expect(BASE_ROSTER).toHaveLength(105);
    expect(CHARACTERS).toHaveLength(50);
    expect(NEW_COMPANIONS.map(c => c.catalogNumber)).toEqual(Array.from({length:50}, (_,i) => 86+i));
    expect(Object.fromEntries(['金','木','水','火','土'].map(e=>[e,NEW_COMPANIONS.filter(c=>c.element===e).length]))).toEqual({金:10,木:10,水:10,火:10,土:10});
    expect(Object.fromEntries(['E','D','C','B','A','S','SS','SSS'].map(r=>[r,NEW_COMPANIONS.filter(c=>c.rarity===r).length]))).toEqual({E:12,D:10,C:8,B:7,A:5,S:4,SS:3,SSS:1});
    expect(new Set(NEW_COMPANIONS.map(c=>c.motion)).size).toBe(6);
    expect(new Set(NEW_COMPANIONS.map(c=>c.signatureMove)).size).toBe(50);
    expect([...STARTER_POOLS.E,...STARTER_POOLS.D].some(c=>c.id.startsWith('w2-'))).toBe(false);
  });

  it('makes every new card drawable twice, tradable, purchasable and recoverable without inflating collection ranks', () => {
    const day='2026-10-25';
    for (const card of NEW_COMPANIONS) {
      const s=newFamily(),p=s.profiles.quintus,pool=companionDrawPool(p);
      const tier=pool.filter(c=>c.rarity===card.rarity);
      const pick=(tier.findIndex(c=>c.id===card.id)+.5)/tier.length;
      const roll=(RARITY_ORDER.slice(0,RARITY_ORDER.indexOf(card.rarity)).reduce((n,r)=>n+DRAW_WEIGHTS[r],0)+.5)/10000;
      p.tickets=2;
      expect(draw(s,'quintus','new',roll,pick,day,day)).toMatchObject({pet:card.id,duplicate:false,copies:1});
      expect(draw(s,'quintus','repeat',roll,pick,day,day)).toMatchObject({pet:card.id,duplicate:true,copies:2});
      expect(collectionStats(p)).toEqual({unique:2,total:3,duplicates:1});
      expect(collectionRanking(s,'day',day).find(r=>r.id==='quintus')!.score).toBe(1);
      const exchange=NEW_COMPANIONS.find(c=>c.id!==card.id)!;
      s.profiles.feifei.coins=100000;
      buyPet(s,'feifei',exchange.id,'buy',day);
      proposeTrade(s,{id:'exchange',from:'quintus',to:'feifei',give:card.id,receive:exchange.id});
      acceptTrade(s,'feifei','exchange',day);
      expect(p.owned[card.id]).toBe(1);
      expect(s.profiles.feifei.owned[card.id]).toBe(1);
      expect(validateFamily(JSON.parse(JSON.stringify(s)))).toEqual(s);
    }
  });

  it('pairs signature animations with the corresponding combat action and keeps the actual effect', () => {
    for (const pet of NEW_COMPANIONS) {
      expect(petSkill(pet.id)).toBe(pet.supportType);
      expect(petSkillName(pet.id)).toBe(pet.signatureMove);
      const before=newBattle([pet.id],['tideglow'],'cpu');
      before.teams[0][0].energy=3; before.teams[0][0].hp=10;
      const kind=pet.supportType==='focus'?'burst':pet.supportType==='shield'?'guard':'heal';
      const after=battleMove(before,kind);
      expect(moveTitle(after.event!)).toBe(pet.signatureMove);
      if(kind==='burst') expect(after.teams[1][0].hp).toBeLessThan(before.teams[1][0].hp);
      if(kind==='guard') expect(after.teams[0][0].guard).toBe(true);
      if(kind==='heal') expect(after.teams[0][0].hp).toBe(40);
    }
  });

  it('ships full and thumbnail artwork with matching immutable versions', () => {
    for (const pet of NEW_COMPANIONS) for(const asset of [pet.image,pet.thumbnail!]) {
      const url=new URL(asset,'https://star-tide.test');
      const bytes=readFileSync(`public${url.pathname}`);
      expect(url.searchParams.get('v')).toBe(createHash('sha256').update(bytes).digest('hex').slice(0,12));
      expect(bytes.toString('ascii',8,12)).toBe('WEBP');
    }
  });

  it('annotates the complete new catalogue and retains reviewed Taiwan pronunciations', () => {
    for(const c of NEW_COMPANIONS) for(const t of [c.name,c.title,c.story,c.artBrief,c.signatureMove!,c.encouragement!])
      expect(syllables(t).filter(s=>/[\u3400-\u9fff]/u.test(s.text)).every(s=>s.zy),t).toBe(true);
    for(const [word,reading] of Object.entries({'曙焰獅蠍':['ㄕㄨˋ','ㄧㄢˋ','ㄕ','ㄒㄧㄝ'],'山脊岩犛':['ㄕㄢ','ㄐㄧˇ','ㄧㄢˊ','ㄌㄧˊ'],'緞帶水黽':['ㄉㄨㄢˋ','ㄉㄞˋ','ㄕㄨㄟˇ','ㄇㄧㄣˇ'],'梯田犰狳':['ㄊㄧ','ㄊㄧㄢˊ','ㄑㄧㄡˊ','ㄩˊ']}))
      expect(syllables(word).map(s=>s.zy)).toEqual(reading);
  });
});
