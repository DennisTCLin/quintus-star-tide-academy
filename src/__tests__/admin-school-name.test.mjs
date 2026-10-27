import {it,expect} from 'vitest';
import {readAdminStudents} from '../../server/admin.mjs';
import {newFamily} from '../../build/game.mjs';
it('projects confirmed school names independently from curriculum and never rewrites stored progress',async()=>{
 const rows=[['jasper','qingqing'],['jay','jay'],['alston','alston'],['sunny','qingqing'],['stranger','qingqing']].map(([username,player_id])=>({member_id:username,account_id:username,username,player_id,display_name:username,family:newFamily(),household_size:1}));
 const before=structuredClone(rows);const pool={query:async()=>({rows})};const result=await readAdminStudents(pool);
 expect(result[0]).toMatchObject({schoolName:'臺北市大安區幸安國小',school:'xingan'});
 expect(result[1]).toMatchObject({schoolName:'臺北市東門國小',school:'dongmen'});
 expect(result[2]).toMatchObject({schoolName:null,school:'jianan'});
 expect(result[3]).toMatchObject({schoolName:null,school:'yongchun'});
 expect(result[4]).toMatchObject({schoolName:null,school:null});
 expect(rows).toEqual(before);
});
