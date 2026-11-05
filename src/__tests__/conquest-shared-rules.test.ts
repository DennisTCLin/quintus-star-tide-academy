import { it,expect } from 'vitest';
import { advanceConquest, createConquest, syncConquestRoster, stationed, knowledgeBonus, ensureSeason, type Companion } from '../conquest';
const now=Date.UTC(2026,10,5), roster:Companion[]=[{id:'same',level:63,element:'water',name:'same',image:'',loan:false}];
it('scopes collection growth, stationing, recovery and production to the owner',()=>{
 const state={...createConquest('season-2026-11',now),playerId:'A',shared:true};
 state.units.same={id:'same',level:62,element:'water',hp:650,maxHp:1300};
 const own=state.tiles[0],other=state.tiles[1];Object.assign(own,{owner:'A',terrain:'plains',facility:null,guards:[state.units.same]});
 Object.assign(other,{owner:'B',terrain:'river',facility:'knowledge',guards:[{id:'same',level:40,element:'water',hp:100,maxHp:860}]});
 expect(stationed(state,'same')?.id).toBe(own.id);expect(knowledgeBonus(state)).toBe(0);
 const changed=syncConquestRoster(state,roster);expect(changed.units.same).toMatchObject({level:63,hp:660,maxHp:1320});expect(changed.tiles[1]).toEqual(other);
 const next=advanceConquest(changed,now+3600000);expect(next.inventory.herbs).toBe(3);expect(next.inventory.spring).toBe(0);expect(next.tiles[1]).toEqual(other);
 expect(stationed({...state,tiles:[other]},'same')).toBeUndefined();
});
it('preserves repeated level-up ratios and KO when no recovery time elapsed',()=>{
 let state={...createConquest('season-2026-11',now),playerId:'A',shared:true};state.units.same={id:'same',level:62,element:'water',hp:650,maxHp:1300};
 for(const [level,hp,maxHp] of [[63,660,1320],[64,670,1340],[62,650,1300]]){state=syncConquestRoster(state,[{...roster[0],level}]) as typeof state;expect(state.units.same).toMatchObject({level,hp,maxHp});expect(advanceConquest(state,now).units.same.hp).toBe(hp);}
 state.units.same.hp=0;expect(syncConquestRoster(state,roster).units.same.hp).toBe(0);
 expect(ensureSeason(state,Date.UTC(2026,11,1))).toBe(state);
});
