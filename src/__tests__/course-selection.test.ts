import { Children, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import CourseSelection, { unfinishedJourney } from '../CourseSelection';
import { COURSES } from '../course-catalog';
import type { Run } from '../game-view';
import type { IslandRun } from '../island/schema';
import { journeyProgress, mathJourneyProgress } from '../journey-progress';
import { islandEntry } from '../island-entry';
const journey = (fields: Partial<Run> = {}): Run => ({ id:'r', course:'english', status:'active', reward:'none', index:2, questions:['a','b','c','d','e','f'], settled:false,...fields } as Run);
const mathRun = (fields: Partial<IslandRun> = {}): IslandRun => ({id:'math',mode:'play',completed:false,items:Array.from({length:6},()=>({answer:'1'})),answers:['1','1'],...fields} as IslandRun);
function buttons(node: ReactNode): any[] {
  return Children.toArray(node).flatMap(child => isValidElement<{children?:ReactNode}>(child) ? [...(child.type === 'button' ? [child] : []),...buttons(child.props.children)] : []);
}
function view(run:Run|null, options:Partial<Parameters<typeof CourseSelection>[0]> = {}) {
  const onStart=vi.fn(),onResume=vi.fn(),onSpeak=vi.fn(),onIsland=vi.fn();
  const tree=CourseSelection({grade:4,profile:{owned:{},equipped:'',growth:{xp:{},day:'',credited:[]}},online:true,busy:false,run,onStart,onResume,onSpeak,onIsland,...options});
  return {tree,html:renderToStaticMarkup(tree),actions:buttons(tree),onStart,onResume,onSpeak,onIsland};
}
describe('clickable island entries',()=>{
  it('starts the exact subject in all grades and keeps collection controls outside entry buttons',()=>{
    for(const grade of [1,2,4,5,6] as const){
      const v=view(null,{grade});
      for(const c of COURSES[grade]){
        v.actions.find(b=>b.props['aria-label']===`開始${c.name}`).props.onClick();expect(v.onStart).toHaveBeenLastCalledWith(c.id);
        v.actions.find(b=>b.props['aria-label']===`從群島開始${c.name}`).props.onClick();expect(v.onStart).toHaveBeenLastCalledWith(c.id);
      }
      expect(v.onStart).toHaveBeenCalledTimes(10);
      expect(v.html).not.toMatch(/<button[^>]*subject-island-card[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
      expect(v.html.match(/class="island-collection"/g)).toHaveLength(5);
      expect(v.html).not.toContain('下一趟再來');
    }
  });
  it('resumes current subject and delegates other islands to the guarded App entry flow',()=>{
    for(const pending of [false,true]){
      const run=journey({reward:pending?'pending':'none'}),before=structuredClone(run),v=view(run);
      expect(unfinishedJourney(run)).toBe(run);
      v.actions.find(b=>b.props['aria-label']===(pending?'領取英文獎勵':'繼續英文挑戰') && b.props.className.includes('subject-island-card')).props.onClick();
      expect(v.onResume).toHaveBeenCalledOnce();
      v.actions.find(b=>b.props['aria-label']==='開始數學').props.onClick();expect(v.onStart).toHaveBeenCalledWith('math');
      expect(run).toEqual(before);
    }
  });
  it('keeps math minigame and normal maths accessible; resumes active minigame from the island art',()=>{
    const idle=view(null,{grade:1});idle.actions.find(b=>b.props['aria-label']==='去數學島').props.onClick();expect(idle.onIsland).toHaveBeenCalledOnce();
    const v=view(null,{grade:1,islandRun:mathRun()});v.actions.find(b=>b.props['aria-label']==='繼續數學島冒險').props.onClick();expect(v.onIsland).toHaveBeenCalledOnce();
    expect(v.html).toContain('value="2" max="6"');
  });
  it('keeps completed math history distinct from the ordinary maths challenge',()=>{
    for(const answers of [['1','1','1','1','1','1'],['0','0','0']]){
      const v=view(null,{grade:1,islandRun:mathRun({answers,completed:true})});
      expect(v.html).toContain('上次動手玩數學');
      expect(v.html).toContain(`value="${answers.length}" max="6"`);
      expect(v.actions.find(b=>b.props['aria-label']==='開始數學')).toBeDefined();
    }
  });
  it('blocks all entry callbacks offline/busy but preserves explanation',()=>{
    for(const state of [{online:false},{busy:true}])for(const run of [null,journey()]){
      const v=view(run,{grade:1,...state});
      for(const b of v.actions){b.props.onClick();if(b.props['aria-label']!=='聽介紹：航線說明')expect(b.props.disabled).toBe(true);}
      expect(v.onSpeak).toHaveBeenCalledOnce();expect(v.onStart).not.toHaveBeenCalled();expect(v.onResume).not.toHaveBeenCalled();expect(v.onIsland).not.toHaveBeenCalled();
    }
  });
  it('retains historical five-question picture course and scoped grade-two subject ruby',()=>{
    const v=view(journey({course:'words',index:4,questions:['a','b','c','d','e']}),{grade:1});expect(v.html).toContain('聽音找圖');expect(v.html).toContain('value="4" max="5"');
    expect(view(journey(),{grade:2}).html).toContain('class="island-ruby"');
    expect(view(journey(),{grade:4}).html).not.toContain('<rt>');
  });
});
describe('honest challenge progress and switching policy',()=>{
  it('counts submitted answers, including mistakes, without counting the next unanswered question',()=>{
    expect(journeyProgress(journey({index:0}))).toMatchObject({done:0,total:6});
    expect(journeyProgress(journey({settled:true}))).toMatchObject({done:3,total:6});
    expect(journeyProgress(journey({answers:[false,true,false],status:'failed',settled:true}))).toMatchObject({done:3,total:6,label:'本趟已結束'});
    expect(journeyProgress(journey({index:4,settled:true,questions:['a','b','c','d','e'],status:'won',reward:'pending'}))).toMatchObject({done:5,total:5,label:'待領獎勵'});
    expect(mathJourneyProgress(mathRun({answers:['0','0','0'],completed:true}))).toMatchObject({done:3,total:6,label:'本趟已結束'});
  });
  it('uses existing progress without changing state and never discards unclaimed rewards/results',()=>{
    const r=journey(),m=mathRun();expect(islandEntry('english',r)).toBe('resume');expect(islandEntry('math',r)).toBe('confirm');
    expect(islandEntry('island',r)).toBe('confirm');expect(islandEntry('math',journey({status:'won',reward:'pending'}))).toBe('reward');
    expect(islandEntry('english',null,m)).toBe('confirm');expect(islandEntry('island',null,m)).toBe('math-resume');
    for(const answers of [['1','1','1','1','1','1'],['0','0','0']])expect(islandEntry('english',null,mathRun({answers}))).toBe('math-result');
    expect(islandEntry('english',null,mathRun({completed:true}))).toBe('start');expect(islandEntry('island',null)).toBe('math-open');
  });
});


describe('compact journey presentation',()=>{
 it('keeps zero and five-question progress truthful and marks only the actual current island',()=>{
   const zero=view(journey({index:0}));
   expect(zero.html).toContain('已答 0 / 6 題');
   expect(zero.html.match(/aria-current="location"/g)).toHaveLength(1);
   const historical=view(journey({course:'words',index:2,questions:['a','b','c','d','e']}),{grade:1});
   expect(historical.html).toContain('已答 2 / 5 題');
   expect(historical.html).not.toContain('aria-current="location"');
 });
 it('preserves pending rewards and failed remediation instead of calling them a new challenge',()=>{
   expect(view(journey({status:'won',reward:'pending',settled:true,index:5})).html).toContain('領取獎勵：英文');
   const failed=view(journey({status:'failed',remediation:{receipt:null} as Run['remediation']}));
   expect(failed.html).toContain('錯題待補練');expect(failed.html).toContain('繼續玩：英文');
 });
 it('does not allow a missing math handler and keeps math result label',()=>{
   const v=view(null,{grade:1,islandRun:mathRun({answers:['1','1','1','1','1','1']}),onIsland:undefined});
   expect(v.html).toContain('查看結果');expect(v.html).toMatch(/disabled="" aria-label="繼續玩：動手玩數學"/);
 });
});
