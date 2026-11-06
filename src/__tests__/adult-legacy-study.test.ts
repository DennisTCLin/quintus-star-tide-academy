import{describe,it,expect,vi}from'vitest';
import{createElement}from'react';
import{renderToStaticMarkup}from'react-dom/server';
vi.mock('../QuizEncounter',()=>({default:()=>null}));
import{AdultGameStudy}from'../adult/GameStudy';
import{adultSessionStatus}from'../adult/session-status';
import{freshState,startLesson,answerCurrent,advance,type AdultState}from'../adult/engine';
import{exerciseById}from'../adult/catalog';
import{newFamily}from'../adventure';
import type{AdultCloud}from'../adult/cloud';
const day='2026-11-06';
function initial(){const s=freshState();s.profile={name:'Legacy learner',track:'everyday',dailyGoal:6};return startLesson(s,'hello');}
function view(state:AdultState){const learning={snapshot:{state,day,username:'synthetic_legacy',csrf:'test'},busy:false,needsRetry:false,error:'',send:vi.fn(),sync:vi.fn()}as unknown as AdultCloud;return renderToStaticMarkup(createElement(AdultGameStudy,{learning,profile:newFamily().profiles.quintus,onHome:()=>{},refreshGame:async()=>{},reduced:true,onEquip:async()=>{}}));}
describe('legacy adult course without a historical game encounter',()=>{
 it('keeps the current question answerable instead of hiding it behind a sync dead end',()=>{const state=initial(),before=structuredClone(state),html=view(state);expect(html).toContain('接續原有英文挑戰');expect(html).toContain('確認答案');expect(html).toContain('<form');expect(html).not.toContain('正在同步英文挑戰與夥伴');expect(state).toEqual(before);});
 it('keeps an already saved legacy answer and its next action accessible',()=>{let state=initial();state=answerCurrent(state,exerciseById(state.session!.ids[0])!.answer,false,day);const html=view(state);expect(html).toContain('答案已保存');expect(html).toContain('下一題');expect(html).toContain(exerciseById(state.session!.ids[0])!.explanation);});
 it('does not retroactively fail an unfinished course for mistakes made before enrollment',()=>{let state=initial();for(let i=0;i<4;i++){state=answerCurrent(state,'wrong',false,day);state=advance(state,day);}const html=view(state);expect(html).toContain('<form');expect(html).toContain('確認答案');expect(html).not.toContain('這場先休息');const profile=newFamily().profiles.quintus,meta={sessionId:state.session!.id,companion:profile.equipped,outcome:'active' as const,earned:0,rewarded:false};expect(adultSessionStatus(state.session,meta).failed).toBe(true);expect(adultSessionStatus(state.session,{...meta,legacy:true}).complete).toBe(false);});
 it('shows a completed legacy result without claiming a retroactive game completion star',()=>{let state=initial();for(let i=0;i<6;i++){state=answerCurrent(state,exerciseById(state.session!.ids[state.session!.index])!.answer,false,day);state=advance(state,day);}const html=view(state);expect(html).toContain('英文挑戰完成');expect(html).toContain('原有英文成果已保留');expect(html).not.toContain('已存下星願');expect(html).toContain('查看本組答案與解析');});
});
