import {it,expect} from 'vitest';
import {SCHOOL_ROSTER,applySchoolCurriculum} from '../../server/school-roster.mjs';
import {newFamily} from '../../build/game.mjs';
it('records ten parent-confirmed children with verified Jasper curriculum',()=>{
 expect(SCHOOL_ROSTER).toHaveLength(10);
 expect(SCHOOL_ROSTER.filter(s=>s.school)).toHaveLength(10);
 expect(SCHOOL_ROSTER.find(s=>s.username==='alan')).toMatchObject({name:'王梓鑫',grade:4,school:'nantun'});
 expect(SCHOOL_ROSTER.find(s=>s.username==='brownie')).toMatchObject({name:'林軒凱',grade:4,school:'dunhua'});
 expect(SCHOOL_ROSTER.find(s=>s.username==='jimmy')).toMatchObject({name:'王梓謙',grade:2,school:'nantun'});
});
it('never treats the shared grade slot or a supplied display name as identity',()=>{
 const f=newFamily();
 applySchoolCurriculum(f,{member_id:'test',username:'alan',player_id:'quintus'});
 expect(f.profiles.quintus.learning.school).toBe('nantun');
 applySchoolCurriculum(f,{member_id:'test',username:'quintus',player_id:'quintus'});
 expect(f.profiles.quintus.learning.school).toBe('yongchun');
 applySchoolCurriculum(f,{member_id:'test',username:'unrelated',player_id:'quintus',display_name:'王梓鑫'});
 expect(f.profiles.quintus.learning.school).toBeUndefined();
 applySchoolCurriculum(f,{username:'alan',player_id:'quintus'});
 expect(f.profiles.quintus.learning.school).toBeUndefined();
});
it('preserves game progress while deriving school from the authenticated member',()=>{
 const f=newFamily();const original=structuredClone(f);
 applySchoolCurriculum(f,{member_id:'test',username:'jimmy',player_id:'feifei'});
 expect(f.profiles.feifei.learning.school).toBe('nantun');
 delete f.profiles.feifei.learning.school;
 expect(f).toEqual(original);
});

it('derives Dunhua only for the authenticated Brownie slot and preserves progress',()=>{
 const f=newFamily();const original=structuredClone(f);
 applySchoolCurriculum(f,{member_id:'test',username:'Brownie',player_id:'quintus'});
 expect(f.profiles.quintus.learning.school).toBe('dunhua');
 delete f.profiles.quintus.learning.school;expect(f).toEqual(original);
 applySchoolCurriculum(f,{member_id:'test',username:'brownie',player_id:'feifei'});
 expect(f.profiles.feifei.learning.school).toBeUndefined();
});

it('derives Jasper verified school only from the authenticated matching member',()=>{
 expect(SCHOOL_ROSTER.find(s=>s.username==='jasper')).toMatchObject({name:'曾崇碩',grade:1,playerId:'qingqing',schoolName:'臺北市大安區幸安國小'});
 const f=newFamily();f.profiles.qingqing.learning.school='yongchun';
 applySchoolCurriculum(f,{member_id:'test',username:'jasper',player_id:'qingqing'});
 expect(f.profiles.qingqing.learning.school).toBe('xingan');
 delete f.profiles.qingqing.learning.school;
 const before=structuredClone(f);
 applySchoolCurriculum(f,{member_id:'test',username:'jasper',player_id:'feifei'});
 expect(f).toEqual(before);
});

it('derives Dongmen only for the authenticated Jay account while preserving every gameplay field',()=>{
 const f=newFamily(),before=structuredClone(f);applySchoolCurriculum(f,{member_id:'test',username:'Jay',player_id:'jay'});expect(f.profiles.jay.learning.school).toBe('dongmen');delete f.profiles.jay.learning.school;expect(f).toEqual(before);applySchoolCurriculum(f,{member_id:'test',username:'unrelated',player_id:'jay',display_name:'姚硯捷'});expect(f.profiles.jay.learning.school).toBeUndefined();
});
