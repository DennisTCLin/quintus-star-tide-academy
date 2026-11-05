import { describe, expect, it } from 'vitest';
import { ALLIANCES, enrollConquest, validEnrollment } from '../conquest-alliance';
import { act, createConquest, ensureSeason, health } from '../conquest';
import { expeditionRoster } from '../conquest-characters';
import { parseConquest } from '../conquest-store';
import { prepareBattle } from '../conquest-battle';
const now = Date.UTC(2026,10,3), player='quintus';
const enroll = () => enrollConquest(createConquest(undefined,now), player,'light','hero-elf',{tideglow:1},now);

describe('alliance enrollment and entitlement', () => {
  it.each(ALLIANCES)('grants exactly three starters and one valid hero for $name', alliance => {
    const state=enrollConquest(createConquest(undefined,now),player,alliance.id,alliance.heroes[0],{},now);
    expect(expeditionRoster({},state.enrollment).map(c=>c.id).sort()).toEqual([...alliance.starters].sort());
    expect(validEnrollment(state.enrollment)).toBe(true);
    expect(state.enrollment?.heroId).toBe(alliance.heroes[0]);
    expect(state.energy).toBe(50);
  });
  it('does not expose trial creatures before enrolling, and retains collected companions', () => {
    expect(expeditionRoster({})).toEqual([]);
    expect(expeditionRoster({tideglow:1}).map(c=>c.id)).toEqual(['tideglow']);
    const state=enroll();const roster=expeditionRoster({tideglow:1,bubbleyak:1},state.enrollment);
    expect(roster).toHaveLength(4);expect(roster.some(c=>c.id==='bubbleyak'&&!c.loan)).toBe(true);
    expect(roster.some(c=>c.id==='mistotter')).toBe(false);
  });
  it('rejects cross-alliance heroes, malformed enrollment and duplicate starter grants', () => {
    expect(()=>enrollConquest(createConquest(),player,'light','hero-undead',{},now)).toThrow();
    const state=enroll();expect(()=>enrollConquest(state,player,'night','hero-undead',{},now)).toThrow('重複');
    expect(()=>parseConquest(JSON.stringify({...state,enrollment:{...state.enrollment,heroId:'hero-undead'}}),player)).toThrow('存檔');
  });
  it('keeps old territory and wounds, removes unowned loans and replaces old commanders', () => {
    const old=createConquest(undefined,now);const tile=old.tiles.find(t=>t.id==='0,0')!;
    old.units={tideglow:{id:'tideglow',element:'water',level:4,hp:40},mistotter:{id:'mistotter',element:'water',level:4,hp:20}};
    tile.owner=player;tile.guards=Object.values(old.units);tile.commander='hero-undead';tile.shieldUntil=now+12345;old.inventory.herbs=7;
    const upgraded=enrollConquest(old,player,'light','hero-elf',{tideglow:1},now);
    const saved=parseConquest(JSON.stringify(upgraded),player),t=saved.tiles.find(t=>t.id==='0,0')!;
    expect(t.owner).toBe(player);expect(t.guards.map(g=>g.id)).toEqual(['tideglow']);expect(t.commander).toBe('hero-elf');
    expect(t.shieldUntil).toBe(tile.shieldUntil);expect(saved.units).toEqual(old.units);expect(saved.inventory.herbs).toBe(7);
    expect(health(saved.units.tideglow)).toBe(40);expect(old.enrollment).toBeUndefined();expect(tile.guards).toHaveLength(2);
  });
  it('keeps enrollment through reload and monthly rollover', () => {
    const state=enroll(),parsed=parseConquest(JSON.stringify(state),player),next=ensureSeason(parsed,Date.UTC(2026,11,1));
    expect(next.enrollment).toEqual(state.enrollment);expect(next.season).toBe('season-2026-12');
  });
  it('blocks locked heroes in preview and commit and uses the enrolled hero when omitted', () => {
    const state=enroll(),roster=expeditionRoster({},state.enrollment),team=roster.map(c=>c.id);
    const plan={mode:'claim' as const, player,season:state.season,tileId:'0,0'};
    expect(()=>prepareBattle(state,plan,team,roster,'coast',now,'hero-undead')).toThrow('未解鎖');
    expect(()=>act(state,player,{type:'claim',tileId:'0,0',team,commander:'hero-undead'},roster,now)).toThrow('未解鎖');
    const occupied=act(state,player,{type:'claim',tileId:'0,0',team},roster,now);
    expect(occupied.lastBattle?.won).toBe(true);expect(occupied.tiles.find(t=>t.id==='0,0')?.commander).toBe('hero-elf');
    occupied.tiles.find(t=>t.id==='0,0')!.commander='hero-undead';
    expect(prepareBattle(occupied,{...plan,mode:'drill'},[],roster,'coast',now).commander?.id).toBe('hero-elf');
  });
});
