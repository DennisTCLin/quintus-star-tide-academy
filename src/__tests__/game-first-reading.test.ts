import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {readyReading} from '../ReadyReading';
import {WorldText} from '../WorldLobby';
import {ReadingContext} from '../readability';
import ChoiceView from '../ChoiceView';
describe('compact interface without removing phonetic lesson content',()=>{
 for(const grade of [1,2,4])it(`keeps grade ${grade} preparation and social controls plain`,()=>{
  const ready=renderToStaticMarkup(createElement('div',null,readyReading('▶ 出發！ 慢慢想',grade)));
  expect(ready).toContain('出發');expect(ready).not.toContain('<rt>');
  const world=renderToStaticMarkup(createElement(ReadingContext.Provider,{value:{grade,voice:true}},createElement(WorldText,{item:{text:'世界',zy:'ㄕˋ ㄐㄧㄝˋ'}})));
  expect(world).toBe('世界');
 });
 it('retains phonetic options when they are the actual learning content',()=>{
  const html=renderToStaticMarkup(createElement(ChoiceView,{grade:1,choice:{text:'貓',zy:'ㄇㄠ',icon:'🐱'}}));
  expect(html).toContain('ㄇ');expect(html).toContain('ㄠ');expect(html).toContain('data-learning-content');
 });
});
