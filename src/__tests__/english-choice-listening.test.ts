import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ENGLISH_FOUNDATIONS } from '../english-foundations';
import { canListenToEnglishChoices } from '../english-choice-listening';
import AnswerOption from '../AnswerOption';

describe('grade-one English listening without answering', () => {
  it('adds access to 54 words/sentences and preserves all 26 letter-shape tasks', () => {
    const eligible: string[]=[],excluded: string[]=[];
    for(const q of ENGLISH_FOUNDATIONS) {
      const before=JSON.stringify(q);
      const {answer,explanation,target,...publicQuestion}=q;
      const enabled=canListenToEnglishChoices(1,publicQuestion);
      expect(enabled).toBe(!q.prompt.includes('對應的小寫字母'));
      (enabled?eligible:excluded).push(q.id);
      expect(JSON.stringify(q)).toBe(before);
    }
    expect(eligible).toHaveLength(54);expect(excluded).toHaveLength(26);
  });
  it('fails closed for unknown versions, grades, recordings or mixed letter choices', () => {
    const q=ENGLISH_FOUNDATIONS.find(q=>q.prompt.includes('這個數字'))!;
    expect(canListenToEnglishChoices(1,q)).toBe(true);
    for(const id of ['g1-en-v2-002','g1-en-v1-000','g1-en-v1-081','g1-en-v1-2','g1-en-v1-002extra'])
      expect(canListenToEnglishChoices(1,{...q,id})).toBe(false);
    expect(canListenToEnglishChoices(2,q)).toBe(false);
    expect(canListenToEnglishChoices(1,{...q,grade:2})).toBe(false);
    expect(canListenToEnglishChoices(1,{...q,course:'words'})).toBe(false);
    expect(canListenToEnglishChoices(1,{...q,audio:'/lesson.mp3'})).toBe(false);
    expect(canListenToEnglishChoices(1,{...q,options:q.options.slice(0,2)})).toBe(false);
    for(const text of ['a','two 二','🔊','', '<script>'])
      expect(canListenToEnglishChoices(1,{...q,options:[{text},...q.options.slice(1)]})).toBe(false);
  });
  it('uses sibling actions; repeated listening never calls answer or changes disabled answer state', () => {
    const onAnswer=vi.fn(),play=vi.fn(),stop=vi.fn();
    const props={children:'My name is Tom.',disabled:false,className:'',label:'answer',onAnswer,
      listening:{text:'My name is Tom.',play,stop}};
    const tree=AnswerOption(props) as ReactElement<{children:ReactElement<any>[]}>;
    expect(tree.type).toBe('div');
    const [answer,listen]=tree.props.children;
    expect(answer.type).toBe('button');expect(listen.type).toBe('button');
    listen.props.onClick();listen.props.onClick();listen.props.onClick();
    expect(play).toHaveBeenCalledTimes(3);expect(stop).not.toHaveBeenCalled();expect(onAnswer).not.toHaveBeenCalled();
    answer.props.onClick();expect(stop).toHaveBeenCalledTimes(1);expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(stop.mock.invocationCallOrder[0]).toBeLessThan(onAnswer.mock.invocationCallOrder[0]);
    const html=renderToStaticMarkup(createElement(AnswerOption,{...props,disabled:true,listening:{...props.listening,disabled:true}}));
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('type="button"');expect(html).toContain('data-answer-option');
    expect(html).toContain('聽選項 My name is Tom. 的英文發音');
  });
  it('retains one ordinary answer button for every other question', () => {
    const onAnswer=vi.fn();
    const tree=AnswerOption({children:'b',disabled:false,className:'correct',label:'選擇 b',onAnswer});
    expect(tree.type).toBe('button');tree.props.onClick();expect(onAnswer).toHaveBeenCalledTimes(1);
    const html=renderToStaticMarkup(tree);expect(html).not.toContain('option-listen');expect(html).not.toContain('選這個');
  });
});
