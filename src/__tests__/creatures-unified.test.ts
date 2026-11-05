import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CREATURE_ART} from '../creature-art';
import {CHARACTERS,getCharacter} from '../characters';
import {NEW_COMPANIONS} from '../companions-wave-two';
import {WAVE3_COMPANIONS} from '../companions-wave-three';
import {WAVE5_MONSTERS} from '../monster-wave-five';
import {ROSTER,petById} from '../game-view';
import {MONSTER_CATALOG,monsterById} from '../monsters';
import {expeditionRoster} from '../conquest-characters';
import {prepareBattle} from '../conquest-battle';
import {createConquest,seasonAt} from '../conquest';
import {companionPortrait} from '../tideglow-companion';
const baseline=JSON.parse(readFileSync('outputs/creatures-unified/baseline.json','utf8'));
const withoutArt=({image,thumbnail,...data}: Record<string,unknown>)=>data;
describe('original artwork restored across the full existing roster',()=>{
 it('restores portrait paths while preserving all 375 gameplay records and ordering',()=>{
  expect(Object.keys(CREATURE_ART)).toHaveLength(275);
  expect(ROSTER.map(c=>c.id)).toEqual(baseline.characters.map((c:{id:string})=>c.id));
  expect(MONSTER_CATALOG.map(c=>c.id)).toEqual(baseline.monsters.map((c:{id:string})=>c.id));
  for(const [current,old] of [[ROSTER,baseline.characters],[MONSTER_CATALOG,baseline.monsters]] as const){
   for(let i=0;i<current.length;i++){
    expect(withoutArt(current[i]),current[i].id).toEqual(withoutArt(old[i]));
    if(CREATURE_ART[current[i].id])expect(current[i]).toMatchObject(CREATURE_ART[current[i].id]);
    else expect(current[i].image).toContain("/assets/creatures-classic/");
   }
  }
 });
 it('uses identical art in direct catalog imports, lookups, conquest portraits and guide launcher',()=>{
  for(const c of [...CHARACTERS,...NEW_COMPANIONS,...WAVE3_COMPANIONS,...WAVE5_MONSTERS])expect(c.image,c.id).toBe(petById(c.id)?.image);
  for(const c of CHARACTERS)expect(getCharacter(c.id)?.image).toBe(petById(c.id)?.image);
  for(const c of MONSTER_CATALOG)expect(monsterById(c.id)?.image).toBe(petById(c.id)?.image);
  const all=expeditionRoster(Object.fromEntries(ROSTER.map(c=>[c.id,1])));
  expect(all).toHaveLength(375);
  for(const c of all)expect(c.image).toBe(petById(c.id)?.image);
  const now=Date.UTC(2026,10,3),state=createConquest(seasonAt(now),now);
  const setup=prepareBattle(state,{mode:'claim',player:'qa',season:state.season,tileId:'0,0'},all.slice(0,5).map(c=>c.id),all,'coast',now);
  for(const unit of [...setup.attackers,...setup.defenders])expect(unit.image).toBe(petById(unit.speciesId!)?.image);
  expect(companionPortrait('tideglow')).toBe(petById('tideglow')?.image);
 });
 it('ships all 375 original portraits and thumbnails with content-addressed cache keys',()=>{
  const hashes=new Set<string>();
  for(const pet of ROSTER){
   for(const url of [pet.image,pet.thumbnail].filter((url):url is string=>Boolean(url))){
    const parsed=new URL(url,'https://test.invalid'),bytes=readFileSync('public'+parsed.pathname);
    const hash=createHash('sha256').update(bytes).digest('hex');
    expect(bytes.length).toBeGreaterThan(0);expect(parsed.searchParams.get('v')).toBe(hash.slice(0,12));hashes.add(hash);
   }
  }
  expect(hashes.size).toBeGreaterThanOrEqual(275);
 });
});
