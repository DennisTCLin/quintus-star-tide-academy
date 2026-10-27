import {trialCurriculumFor} from './trial-curricula.mjs';
/** Parent-confirmed school roster, 2026-10-26. Server-only: never import into the browser bundle.
 * Account/grade mappings verified against prior parent instructions; a slot is NOT an identity.
 */
export const SCHOOL_ROSTER = [
  {username:'jay',name:'姚硯捷',playerId:'jay',grade:5,school:'dongmen',schoolName:'臺北市東門國小',schoolLocation:'臺北市',schoolNote:'115官方版本：國語自然翰林、數學康軒、社會南一、英文Here We Go 7；歷屆補充非當次考試範圍'},
  {username:'jasper',name:'曾崇碩',playerId:'qingqing',grade:1,school:'xingan',schoolName:'臺北市大安區幸安國小',schoolLocation:'臺北市大安區',schoolNote:'115上官方版本已核對：國語康軒1上、數學翰林1上；使用同版歷屆補充，實際評量範圍依老師公告'},
  {username:'alston',name:'曾博聖',playerId:'alston',grade:6,school:'jianan',schoolNote:'115學年度教材表草案：數學、國語、社會康軒；英文何嘉仁、自然翰林歷屆補充題'},
  {username:'quintus',name:'林沐澤',playerId:'quintus',grade:4,school:'yongchun'},
  {username:'alan',name:'王梓鑫',playerId:'quintus',grade:4,school:'nantun'},
  {username:'jimmy',name:'王梓謙',playerId:'feifei',grade:2,school:'nantun'},
  {username:'olivia',name:'林庭羽',playerId:'doudou',grade:1,school:'yongchun'},
  {username:'feifei',name:'王筱斐',playerId:'feifei',grade:2,school:'yongchun'},
  {username:'sunny',name:'鄭天晴',playerId:'qingqing',grade:1,school:'yongchun'},
  {username:'brownie',name:'林軒凱',playerId:'quintus',grade:4,school:'dunhua',schoolLocation:'臺北',schoolNote:'115學年度教科書表已核對；英文Here We Go 7題庫待補'},
];
export function applySchoolCurriculum(family,user){
  if(!user.member_id || !user.player_id)return family;
  const student=SCHOOL_ROSTER.find(s=>s.username===user.username?.toLowerCase() && s.playerId===user.player_id);
  // The authenticated account, never a supplied display name or profile slot, owns its school.
  const learning=family.profiles[user.player_id]?.learning;
  if(learning){
    // Trial curricula are independent teaching samples, not a school enrollment claim.
    const trialSchool=trialCurriculumFor(user)?.school;
    const school=student?.school ?? trialSchool;
    if(school)learning.school=school;
    else delete learning.school;
  }
  return family;
}
