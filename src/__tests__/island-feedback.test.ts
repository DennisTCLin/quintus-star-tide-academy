import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GAMES, type Mode } from '../island/games';
import { islandOutcome, islandWrongFeedback } from '../island/presentation';
import { sayThen, speakOnDemand } from '../island/speech';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Math Island child-facing feedback', () => {
  it('ends the third mistake honestly, without a success mood or a promised fourth teaching segment', () => {
    for (const mode of ['play','boss','mock'] as Mode[]) {
      const outcome=islandOutcome({mode,size:6,right:0,wrong:3});
      expect(outcome).toMatchObject({failed:true,pass:false,mood:'cheer'});
      expect(outcome.head).toContain('挑戰先結束');
      expect(outcome.head).not.toContain('完成了');
      const feedback=islandWrongFeedback(mode,3,'四');
      expect(feedback.reteach).toBe(false);
      expect(feedback.bubble+feedback.speech).not.toContain('再教');
      expect(feedback.speech).toContain('挑戰先結束');
    }
    expect(islandWrongFeedback('play',2,'四').reteach).toBe(true);
  });

  it('announces a win only after all six challenge answers, allowing at most two mistakes', () => {
    for (const mode of ['play','boss','mock'] as Mode[]) {
      expect(islandOutcome({mode,size:6,right:4,wrong:1}).pass).toBe(false);
      expect(islandOutcome({mode,size:6,right:4,wrong:2})).toMatchObject({pass:true,failed:false,mood:'happy'});
      expect(islandOutcome({mode,size:6,right:3,wrong:3}).pass).toBe(false);
    }
    expect(islandOutcome({mode:'learn',size:5,right:1,wrong:4}).head).toContain('學一學完成');
  });

  it('keeps sound recognition solvable visually without changing its answer or choices', () => {
    const demo=GAMES.find.demo().item;
    const item={...demo,choices:[...demo.p.opts]};
    // This is also the silent/no-speech-engine presentation: dots are always present.
    const snapshot=structuredClone(item);
    const html=renderToStaticMarkup(createElement(GAMES.find.Scene,{item,view:{},mode:'play',demo:false,done:false,act:()=>{},choose:()=>{},eliminated:null}));
    expect(html.match(/class="cell full"/g)).toHaveLength(Number(item.answer));
    expect(html.match(/class="isl-bubble /g)).toHaveLength(item.choices.length);
    expect(item).toEqual(snapshot);
  });

  it('allows deliberate replay after automatic voice was disabled', () => {
    vi.useFakeTimers();
    const speak=vi.fn();
    vi.stubGlobal('window',{setTimeout,speechSynthesis:{speak,cancel:vi.fn(),getVoices:()=>[{lang:'zh-TW'}]}});
    vi.stubGlobal('SpeechSynthesisUtterance',class {text:string;constructor(text:string){this.text=text;}});
    sayThen('自動語音',undefined,false);
    expect(speak).not.toHaveBeenCalled();
    speakOnDemand('找出數字四');
    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0][0].text).toBe('找出數字四');
  });
});
