import {PLAYERS} from '../build/game.mjs';
// Teaching samples, not assertions of school attendance. Grade three is not a supported player slot yet.
export const TRIAL_CURRICULA=[
 {id:'g1-yongchun',grade:1,school:'yongchun',label:'一年級現有教材'},
 {id:'g2-yongchun',grade:2,school:'yongchun',label:'二年級現有教材'},
 {id:'g4-yongchun',grade:4,school:'yongchun',label:'四年級現有教材'},
 {id:'g5-dongmen',grade:5,school:'dongmen',label:'五年級現有教材'},
 {id:'g6-jianan',grade:6,school:'jianan',label:'六年級現有教材'},
].map(c=>({...c,playerId:PLAYERS.find(p=>p.grade===c.grade).id}));
export function trialCurriculumFor(user){
 if(!user.member_id)return undefined;
 return TRIAL_CURRICULA.find(c=>c.id===user.trial_curriculum&&c.playerId===user.player_id)
  ?? (user.username?.toLowerCase()==='trial_g6'&&user.player_id==='alston'?TRIAL_CURRICULA[4]:undefined);
}
