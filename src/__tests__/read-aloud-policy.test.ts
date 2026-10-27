import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ReadAloud, { allowsReadAloud } from '../ReadAloud';
import CaptureChallenge from '../CaptureChallenge';
import { MONSTER_CATALOG } from '../monsters';
import type { CaptureOutcome } from '../creature-rules';
import { ReadingContext } from '../readability';
import CourseSelection from '../CourseSelection';
import CompanionVoiceChat from '../CompanionVoiceChat';
import { LEARNING_BANK } from '../learning';
import type { useCompanionConversation } from '../useCompanionConversation';

const profile = { owned:{}, equipped:'', growth:{xp:{},day:'',credited:[]} };
describe('grade-specific reading assistance', () => {
  it('keeps assistance for grades one/two and excludes every higher grade', () => {
    for (const grade of [1,2,3,4,5,6]) {
      const html = renderToStaticMarkup(h(ReadAloud,{grade,children:h('button',{'aria-label':'聽說明'},'朗讀')}));
      expect(html.includes('聽說明')).toBe(grade<=2);
      expect(allowsReadAloud(grade)).toBe(grade<=2);
    }
  });
  it('keeps subject entry actions while removing all grade-four map/collection narration', () => {
    for (const grade of [1,2,4] as const) {
      const html=renderToStaticMarkup(h(ReadingContext.Provider,{value:{grade,voice:true}},h(CourseSelection,{
        grade,profile,online:true,busy:false,onStart:()=>{},onResume:()=>{},onSpeak:()=>{},
      })));
      expect(html.includes('聽介紹：航線說明')).toBe(grade<=2);
      expect(html.includes('island-collection-listen')).toBe(grade<=2);
      expect(html.match(/aria-label="從群島開始/g)).toHaveLength(5);
      expect(/class="archipelago-toolbar"[\s\S]*<button[^>]*aria-pressed/.test(html)).toBe(true);
    }
  });
  it('has no higher-grade question that becomes unanswerable without a recording control', () => {
    const older=LEARNING_BANK.filter(q=>q.grade>=3);
    expect(older.length).toBeGreaterThan(0);
    expect(older.filter(q=>q.audio || q.options.some(o=>o.audio)).map(q=>q.id)).toEqual([]);
    expect(LEARNING_BANK.some(q=>q.grade<=2 && q.audio)).toBe(true);
  });
  it('uses the same reading-assistance policy in the capture challenge', () => {
    for (const grade of [1,2,4,5,6] as const) {
      const question=LEARNING_BANK.find(q=>q.grade===grade&&q.course==='math'&&!q.audio)!;
      const capture:CaptureOutcome={version:3,monster:MONSTER_CATALOG[0].id,chance:100,outcome:'pending',trial:{version:1,grade,course:'math',questions:[question.id,'unused-2','unused-3'],answers:[]}};
      const html=renderToStaticMarkup(h(CaptureChallenge,{capture,question,busy:false,online:true,reduced:true,onAnswer:async()=>{},onSkip:async()=>{},onClose:()=>{},onListen:()=>{}}));
      expect(html.includes('aria-label="聽題目"')).toBe(grade<=2);
      expect(html.includes('class="capture-answers"')).toBe(true);
    }
  });
  it('retains a necessary recording control even when general read-aloud is disabled', () => {
    const question={...LEARNING_BANK.find(q=>q.grade===5&&q.course==='english')!,audio:'/synthetic-listening-question.mp3'};
    const capture:CaptureOutcome={version:3,monster:MONSTER_CATALOG[0].id,chance:100,outcome:'pending',trial:{version:1,grade:5,course:'english',questions:[question.id,'unused-2','unused-3'],answers:[]}};
    const html=renderToStaticMarkup(h(CaptureChallenge,{capture,question,busy:false,online:true,reduced:true,onAnswer:async()=>{},onSkip:async()=>{},onClose:()=>{},onListen:()=>{}}));
    expect(html.includes('aria-label="播放題目音檔"')).toBe(true);
    expect(html.includes('aria-label="聽題目"')).toBe(false);
    expect(html).toMatch(/capture-answers[^]*?<button[^>]*disabled/);
  });
  it('retains stop for an explicitly started conversation without exposing a higher-grade replay speaker', () => {
    for (const grade of [1,4]) for (const status of ['idle','speaking'] as const) {
      const voice = {status,state:{history:[{id:'t',user:'hello',reply:'hello'}],available:true},loaded:true,seconds:0,error:'',hasPending:false,
        finish:()=>{},start:()=>{},stop:()=>{},play:async()=>{},retry:()=>{},reset:async()=>{},type:()=>{}} as unknown as ReturnType<typeof useCompanionConversation>;
      const html=renderToStaticMarkup(h(CompanionVoiceChat,{grade,voice,online:true,onHelp:()=>{}}));
      expect(html.includes('聽怎麼和潮光獸說話')).toBe(grade<=2);
      // Text in the explanatory footer is separate from the real playback action.
      expect(/<button[^>]*>[^<]*<span[^>]*>[^<]*<\/span> 停止播放<\/button>/.test(html)).toBe(status==='speaking');
      expect(html.includes('>聽回覆</button>') || html.includes(' 聽回覆</button>')).toBe(grade<=2 && status==='idle');
      expect(html.includes('class="tide-mic"')).toBe(true);
    }
  });
  it('offers failed conversational audio recovery at every grade without adding general replay speakers', () => {
    for (const grade of [1,2,4,6]) {
      const voice = {status:'idle',state:{history:[{id:'t',user:'hello',reply:'hello'}],available:true},loaded:true,seconds:0,error:'音訊無法播放',playbackFailed:true,hasPending:false,
        finish:()=>{},start:()=>{},stop:()=>{},play:async()=>{},retry:()=>{},reset:async()=>{},type:()=>{}} as unknown as ReturnType<typeof useCompanionConversation>;
      const html=renderToStaticMarkup(h(CompanionVoiceChat,{grade,voice,online:true,onHelp:()=>{}}));
      expect(html).toContain('再聽一次</button>');
      expect(html).not.toContain('重新連線</button>');
      expect(html.includes(' 聽回覆</button>')).toBe(grade<=2);
    }
  });

});
