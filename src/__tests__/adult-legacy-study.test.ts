import{describe,it,expect,vi}from'vitest';
import{createElement}from'react';
import{renderToStaticMarkup}from'react-dom/server';
vi.mock('../QuizEncounter',()=>({default:()=>null}));
import{AdultGameStudy}from'../adult/GameStudy';
import{adultSessionStatus}from'../adult/session-status';
import{freshState,startLesson,answerCurrent,advance,type AdultState}from'../adult/engine';
import{exerciseById}from'../adult/catalog';
import{newFamily,type Profile}from'../adventure';
import type{AdultCloud}from'../adult/cloud';
const day='2026-11-06';
function initial(){const s=freshState();s.profile={name:'Legacy learner',track:'everyday',dailyGoal:6};return startLesson(s,'hello');}
function view(state:AdultState,adventure?:Profile['adultAdventure']){const learning={snapshot:{state,day,username:'synthetic_legacy',csrf:'test'},busy:false,needsRetry:false,error:'',send:vi.fn(),sync:vi.fn()}as unknown as AdultCloud;return renderToStaticMarkup(createElement(AdultGameStudy,{learning,profile:{...newFamily().profiles.quintus,...(adventure?{adultAdventure:adventure}:{})},onHome:()=>{},refreshGame:async()=>{},reduced:true,onEquip:async()=>{}}));}
describe('legacy adult course without a historical game encounter',()=>{
 it('keeps the current question answerable instead of hiding it behind a sync dead end',()=>{const state=initial(),before=structuredClone(state),html=view(state);expect(html).toContain('接續原有英文挑戰');expect(html).toContain('確認答案');expect(html).toContain('<form');expect(html).not.toContain('正在同步英文挑戰與夥伴');expect(state).toEqual(before);});
 it('keeps an already saved legacy answer and its next action accessible',()=>{let state=initial();state=answerCurrent(state,exerciseById(state.session!.ids[0])!.answer,false,day);const html=view(state);expect(html).toContain('答案已保存');expect(html).toContain('下一題');expect(html).toContain(exerciseById(state.session!.ids[0])!.explanation);});
 it('does not retroactively fail an unfinished course for mistakes made before enrollment',()=>{let state=initial();for(let i=0;i<4;i++){state=answerCurrent(state,'wrong',false,day);state=advance(state,day);}const html=view(state);expect(html).toContain('<form');expect(html).toContain('確認答案');expect(html).not.toContain('這場先休息');const profile=newFamily().profiles.quintus,meta={sessionId:state.session!.id,companion:profile.equipped,outcome:'active' as const,earned:0,rewarded:false};expect(adultSessionStatus(state.session,meta).failed).toBe(true);expect(adultSessionStatus(state.session,{...meta,legacy:true}).complete).toBe(false);});
 it('shows a completed legacy result without claiming a retroactive game completion star',()=>{let state=initial();for(let i=0;i<6;i++){state=answerCurrent(state,exerciseById(state.session!.ids[state.session!.index])!.answer,false,day);state=advance(state,day);}const html=view(state);expect(html).toContain('英文挑戰完成');expect(html).toContain('原有英文成果已保留');expect(html).not.toContain('已存下星願');expect(html).toContain('查看本組答案與解析');});
});

// Original courses have completion, not the game rule introduced at enrollment.
describe('completed legacy course with a persisted game outcome',()=>{
 it('shows original course completion after four old mistakes and two new correct answers without inventing game rewards',()=>{
  let state=initial();for(let i=0;i<6;i++){state=answerCurrent(state,i<4?'wrong':exerciseById(state.session!.ids[state.session!.index])!.answer,false,day);state=advance(state,day);}
  const profile=newFamily().profiles.quintus,adventure={legacy:true,sessionId:state.session!.id,companion:profile.equipped,outcome:'failed' as const,earned:2,rewarded:false};
  const before=structuredClone({state,adventure}),html=view(state,adventure);
  expect(adultSessionStatus(state.session,adventure)).toMatchObject({legacy:true,failed:false,complete:true});
  expect(html).toContain('英文挑戰完成');expect(html).toContain('原有英文成果已保留');expect(html).toContain('本組 6 題');
  expect(html).not.toContain('這場先休息');expect(html).not.toContain('本次獨立答對不足四題');expect(html).not.toContain('已存下星願');
  expect({state,adventure}).toEqual(before);
  const rewarded=view(state,{...adventure,rewarded:true});expect(rewarded).toContain('已存下星願');expect(rewarded).not.toContain('這場先休息');
 });
 it('keeps a new game course failed after three mistakes',()=>{
  let state=initial();for(let i=0;i<3;i++){state=answerCurrent(state,'wrong',false,day);if(i<2)state=advance(state,day);}
  const adventure={sessionId:state.session!.id,companion:newFamily().profiles.quintus.equipped,outcome:'failed' as const,earned:0,rewarded:false};
  expect(adultSessionStatus(state.session,adventure)).toMatchObject({legacy:false,failed:true,complete:true});expect(view(state,adventure)).toContain('這場先休息');
 });
});
