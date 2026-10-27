import {islandAfterDecliningCapture} from './helpers/capture';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { randomUUID } from 'node:crypto';
import { describe,it,expect,vi } from 'vitest';
import { newFamily,validateFamily } from '../adventure';
import { IslandJourney } from '../island/IslandNavigation';
import { islandLocation,islandQuestionPosition,mustSwitchIsland,openIslandDestination } from '../island/navigation';
import { startIsland,answerIsland,finishIsland,quitIsland } from '../island/server';
import { zhuyin } from '../island/zhuyin';

const day='2026-10-25',player='qingqing';
function fixture(){const family=newFamily();return {family,run:islandAfterDecliningCapture(family,player,'learn','1A-01',randomUUID(),day)};}

describe('Math Island navigation and orientation',()=>{
  it('resumes the same destination, confirms a different unit or stage, and ignores finished rounds',()=>{
    const {run}=fixture();
    expect(mustSwitchIsland(run,{mode:'learn',unit:'1A-01'})).toBe(false);
    expect(mustSwitchIsland(run,{mode:'learn',unit:'1A-02'})).toBe(true);
    expect(mustSwitchIsland(run,{mode:'play',unit:'1A-01'})).toBe(true);
    expect(mustSwitchIsland({...run,completed:true},{mode:'learn',unit:'1A-02'})).toBe(false);
  });
  it('does not start a replacement before a successful quit acknowledgement',async()=>{
    const {run}=fixture();let release:(value:boolean|undefined)=>void=()=>{};
    const quit=vi.fn(()=>new Promise<boolean|undefined>(resolve=>{release=resolve;}));
    const start=vi.fn(async()=>run),finish=vi.fn(async()=>run);
    const pending=openIslandDestination(run,{mode:'learn',unit:'1A-02'},{quit,start,finish});
    expect(quit).toHaveBeenCalledWith(run.id);expect(start).not.toHaveBeenCalled();
    release(undefined);expect(await pending).toBeUndefined();expect(start).not.toHaveBeenCalled();expect(finish).not.toHaveBeenCalled();
    await openIslandDestination(run,{mode:'learn',unit:'1A-01'},{quit,start,finish});
    expect(start).toHaveBeenCalledExactlyOnceWith('learn','1A-01');expect(quit).toHaveBeenCalledTimes(1);
  });
  it('preserves saved answers, coins, review statistics and other players when switching units',async()=>{
    const {family,run}=fixture();answerIsland(family,player,run.id,0,run.items[0].answer,day);
    const p=family.profiles[player],before=structuredClone(p),other=structuredClone(family.profiles.doudou);
    const next=await openIslandDestination(run,{mode:'learn',unit:'1B-04'},{
      quit:async id=>quitIsland(family,player,id),finish:async id=>finishIsland(family,player,id,day),
      start:async (mode,unit)=>islandAfterDecliningCapture(family,player,mode,unit,randomUUID(),day),
    });
    expect(next?.unit).toBe('1B-04');expect(next?.answers).toEqual([]);
    expect(p.coins).toBe(before.coins);expect(p.mathIsland?.stats).toEqual(before.mathIsland?.stats);
    expect(p.mathIsland?.attempted).toEqual(before.mathIsland?.attempted);
    expect(family.profiles.doudou).toEqual(other);expect(()=>validateFamily(family)).not.toThrow();
  });
  it('settles a fully answered challenge before switching, preserving its earned completion reward',async()=>{
    const {family,run}=fixture();for(let i=0;i<run.items.length;i++)answerIsland(family,player,run.id,i,run.items[i].answer,day);finishIsland(family,player,run.id,day);
    const play=islandAfterDecliningCapture(family,player,'play','1A-01',randomUUID(),day);
    for(let i=0;i<play.items.length;i++)answerIsland(family,player,play.id,i,play.items[i].answer,day);
    const before=family.profiles[player].rewardStars;
    const quit=vi.fn(async(id:string)=>quitIsland(family,player,id));
    await openIslandDestination(play,{mode:'learn',unit:'1A-02'},{quit,
      finish:async id=>finishIsland(family,player,id,day),start:async(mode,unit)=>islandAfterDecliningCapture(family,player,mode,unit,randomUUID(),day),
    });
    expect(quit).not.toHaveBeenCalled();expect(family.profiles[player].mathIsland?.units['1A-01'].play).toBe(true);
    expect(family.profiles[player].rewardStars).toBe(before+1);expect(()=>validateFamily(family)).not.toThrow();
  });
  it('counts questions independently of demonstrations and never displays question seven of six',()=>{
    expect(islandQuestionPosition(6,0,0,true)).toMatchObject({number:1,completed:0});
    expect(islandQuestionPosition(6,1,1,true,true)).toMatchObject({number:1,completed:1});
    expect(islandQuestionPosition(6,1,1,true)).toMatchObject({number:2,completed:1});
    expect(islandQuestionPosition(6,6,6,false)).toMatchObject({number:6,completed:6,total:6});
    expect(islandQuestionPosition(6,0,0,true).label).toContain('共 6 題');
    expect(islandQuestionPosition(5,4,4,false).label).toBe('第 5 題 / 共 5 題');
  });
  it('shows the semester, curriculum unit, stage, numeric question and direct map action',()=>{
    const html=renderToStaticMarkup(createElement(IslandJourney,{unit:'1B-04',mode:'play',progress:{learn:true},
      position:islandQuestionPosition(6,2,2,false),coins:20,busy:false,onMap:()=>{},
    }));
    expect(islandLocation('1B-04')).toBe('下學期・第 4 單元・100以內的數');
    for(const label of ['下學期','第 4 單元','100以內的數','換小島','玩一玩','第 3 題 / 共 6 題'])expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain('aria-current="step"');expect(html).toContain('value="2"');expect(html).toContain('max="6"');
    expect(zhuyin('重玩').map(x=>x.zy)).toEqual(['ㄔㄨㄥˊ','ㄨㄢˊ']);
    expect(zhuyin('100以內的數').at(-1)?.zy).toBe('ㄕㄨˋ');
  });
});
