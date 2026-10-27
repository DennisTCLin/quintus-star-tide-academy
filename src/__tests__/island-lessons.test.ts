import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect } from 'vitest';
import { GAMES,type Item } from '../island/games';
import { teachingSteps } from '../island/teaching';
import { IslandLesson } from '../island/IslandLesson';

const item=(p:Item['p']):Item=>({k:'test',id:'demo',unit:'1A-01',text:'',say:'看我示範。',p,answer:'3',choices:[]});
describe('narrated animated teaching',()=>{
  it('renders every teaching beat for all 61 activities without changing its question',()=>{
    for(const game of Object.values(GAMES)) {
      const demo=game.demo(),before=structuredClone(demo.item);
      expect(demo.steps.length,game.k).toBeGreaterThanOrEqual(3);
      for(const beat of demo.steps) {
        expect(beat.say.length,game.k).toBeGreaterThan(0);
        const html=renderToStaticMarkup(createElement(game.Scene,{item:demo.item,view:beat.view,mode:'learn',demo:true,done:false,act:()=>{},choose:()=>{},eliminated:null}));
        expect(html,game.k).not.toContain('NaN');
      }
      expect(demo.item).toEqual(before);
    }
  });
  it('counts ordinal positions from the indicated direction one at a time',()=>{
    const steps=teachingSteps(item({diagram:'order',n:4,reverse:1}),'先看右邊。','完成。',1);
    expect(steps.slice(2,-1).map(s=>s.view.focus)).toEqual([3,2,1,0]);
    expect(steps.slice(2,-1).map(s=>s.view.step)).toEqual([1,2,3,4]);
    expect(steps.at(-1)?.view).toMatchObject({step:4,show:true});
  });
  it('removes one object or counts one coin per spoken beat',()=>{
    const removed=teachingSteps(item({diagram:'take',a:5,b:2}),'拿走。','剩三個。',2);
    expect(removed.slice(2,-1).map(s=>s.view.step)).toEqual([1,2]);
    expect(removed[2].say).toContain('還有四個');expect(removed[3].say).toContain('還有三個');
    const coins=teachingSteps(item({diagram:'coins',coins:[10,5,1]}),'數錢。','十六元。',3);
    expect(coins.slice(2,-1).map(s=>s.view.step)).toEqual([1,2,3]);
    expect(coins[3].say).toContain('十五元');expect(coins[4].say).toContain('十六元');
  });
  it('exposes playback, replay, step navigation, voice and a separate teaching progress',()=>{
    const game=GAMES.count;
    const html=renderToStaticMarkup(createElement(IslandLesson,{game,demo:game.demo(),voice:true,reduced:false,onContinue:()=>{},onNotice:()=>{}}));
    for(const label of ['動畫教學','暫停','上一步','下一步','語音開','從頭看','跳過示範'])expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain('教學步驟 1 / 7');expect(html).toContain('aria-pressed="true"');
  });
});
