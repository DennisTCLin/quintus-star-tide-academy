import {completePendingCaptures} from './helpers/capture';
import {createElement} from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {randomUUID} from 'node:crypto';
import IslandApp,{resultFromIslandRun} from '../island/IslandApp';
import {newFamily} from '../adventure';
import {startIsland,answerIsland,finishIsland} from '../island/server';
import {publicIslandRun} from '../island/schema';
describe('persisted island capture result recovery',()=>{
 function completed(){const f=newFamily();f.profiles.doudou.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day:'',attempted:[]};const r=startIsland(f,'doudou','play','1A-01',randomUUID(),'2026-10-25');for(let i=0;i<6;i++)answerIsland(f,'doudou',r.id,i,r.items[i].answer,'2026-10-25');finishIsland(f,'doudou',r.id,'2026-10-25',0);completePendingCaptures(f,'2026-10-25');return f.profiles.doudou.mathIsland!;}
 it('offers a result action after remount and reconstructs saved rewards without issuing commands',()=>{
  const p=completed(),r=publicIslandRun(p.run!),out=resultFromIslandRun(r);
  expect(out.capture?.outcome).toBe('joined');expect(out.round.right).toBe(6);expect(out.savedStar).toBe(true);
  const noCommand=async()=>{throw Error('render must not issue commands');};
  const html=renderToStaticMarkup(createElement(IslandApp,{player:{id:'doudou',name:'測試',icon:'🌸'},companion:{name:'測試',image:'/test.webp',skill:'shield',skillName:'護盾',skillIcon:'🛡️'},embed:{voice:false,reduced:true,online:true,day:'2026-10-25',progress:{...p,run:r},onStart:noCommand,onAnswer:noCommand,onHelp:noCommand,onRound:noCommand,onQuit:noCommand,onExit:()=>{}}}));
  expect(html).toContain('查看上次結果');
 });
 it('distinguishes legacy battles without retroactive capture',()=>{const p=completed(),r=p.run!;delete r.encounter;delete r.capture;expect(resultFromIslandRun(r).legacyCapture).toBe(true);});
});
