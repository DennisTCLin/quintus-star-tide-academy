import {describe,it,expect} from 'vitest';
import {collectionProjection,collectionIdentity} from '../../server/player-collections.mjs';
import {newFamily,ROSTER,creatureProgress} from '../../build/game.mjs';
describe('public collection projection',()=>{
 it('recognizes Alston’s supplied portrait for friends and collections without sharing it with other grade-six accounts',()=>{
  const row={member_id:'alston-member',account_id:'alston-household',player_id:'alston',username:'alston',display_name:'曾博聖',household_size:1};
  expect(collectionIdentity(row,{id:'viewer',member_id:'viewer-member'},'quintus')).toMatchObject({avatarKey:'alston',name:'曾博聖',isSelf:false});
  expect(collectionIdentity({...row,username:'anotherchild'},{id:'viewer'},'quintus').avatarKey).toBe('unknown');
  expect(collectionIdentity({...row,player_id:'quintus'},{id:'viewer'},'quintus').avatarKey).toBe('unknown');
 });
 it('counts distinct owned cards and dated first acquisitions, including traded-away discoveries',()=>{
  const p=newFamily().profiles.quintus;const ids=[Object.keys(p.owned)[0],ROSTER.find(x=>!p.owned[x.id]).id];p.owned[ids[0]]=3;p.firstAcquired[ids[0]]='2026-10-25';p.firstAcquired[ids[1]]='2026-10-19';delete p.owned[ids[1]];
  const result=collectionProjection(p,'2026-10-25',true);expect(result.total-result.unique).toBe(result.duplicates);expect(result.scores.day).toBe(1);expect(result.scores.week).toBe(2);
  expect(collectionProjection(p,'2026-10-26').scores.week).toBe(0);expect(collectionProjection(null)).toEqual({available:false});
 });
 it('shows the same rarity-adjusted levels as companion and battle screens',()=>{
  const p=newFamily().profiles.quintus;
  for(const rarity of ['E','D','C','B','A','S']){
   const pet=ROSTER.find(x=>x.rarity===rarity);p.owned[pet.id]=1;p.growth.xp[pet.id]=1250;
   expect(collectionProjection(p,'2026-10-25',true).cards.find(c=>c.id===pet.id).level).toBe(creatureProgress(rarity,1250).level);
  }
 });
 it('does not inherit a viewer portrait for a same-grade standalone friend',()=>{
  const row={member_id:'friend',account_id:'other',player_id:'quintus',username:'newchild',display_name:'新玩家',household_size:1};
  expect(collectionIdentity(row,{id:'viewer',member_id:'self'},'quintus')).toMatchObject({name:'新玩家',isSelf:false,avatarKey:'unknown'});
  expect(collectionIdentity({...row,username:'alan'},{id:'viewer'},'quintus').avatarKey).toBe('alan');
 });
});

it('maps Jasper account to his own avatar without changing Sunny',()=>{
 const row={username:'jasper',player_id:'qingqing',member_id:'jasper-member',account_id:'jasper-account',household_size:1,display_name:'曾崇碩'};
 expect(collectionIdentity(row,{id:'viewer'},'qingqing').avatarKey).toBe('jasper');
 expect(collectionIdentity({...row,username:'sunny'},{id:'viewer'},'qingqing').avatarKey).toBe('qingqing');
});
