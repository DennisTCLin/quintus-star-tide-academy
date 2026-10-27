import {describe,it,expect} from 'vitest';
import {selectedOwnedPet} from '../OnlineBattle';
import {newFamily} from '../adventure';
import {ROSTER} from '../game-view';
describe('online battle owned companion selection',()=>{
 it('reconciles selected pets after trade or player changes',()=>{
  const p=newFamily().profiles.quintus;
  expect(selectedOwnedPet(p,'no-longer-owned')).toBe(p.equipped);
  const old=p.equipped, replacement=ROSTER.find(pet=>pet.id!==old)!.id;
  p.owned[replacement]=1;delete p.owned[old];
  expect(selectedOwnedPet(p,old)).toBe(replacement);
  expect(selectedOwnedPet({...p,owned:{}},p.equipped)).toBe('');
 });
});
