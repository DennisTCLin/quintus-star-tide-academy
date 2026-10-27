import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { currentGuide, advanceGuide, guideCopy, guideFacts, guideOptions } from '../dragon-dialogue';
import { syllables } from '../readability';
import vocabulary from '../data/dragon-vocabulary.json';
import DragonGuide from '../DragonGuide';
import GachaVisual from '../GachaVisual';

describe('dragon guide dialogue continuity', () => {
  it('keeps preference and bounded context while deriving actual companion state', () => {
    let state = currentGuide(null, { phase: 'welcome', pet: null });
    state = advanceGuide(state, 'sea');
    expect(guideCopy(state, '測試航海員').text).toContain('大海');
    for (let i = 0; i < 12; i++) state = advanceGuide(state, 'help');
    expect(state.history).toHaveLength(8);
    const meet = currentGuide(state, { phase: 'meet', pet: 'seasprout' });
    expect(meet.preference).toBe('sea'); expect(meet.revision).toBe(13);
    expect(guideCopy(meet, '測試航海員', '海芽獸').text).toContain('海芽獸已經在你的收藏');
    expect(guideFacts({ onboarding: { pet: null, confirmed: false }, equipped: 'seasprout' })).toEqual({ phase: 'welcome', pet: null });
  });
  it('clears stale generated facts after the real pet or phase changes', () => {
    const state = advanceGuide(currentGuide(null, { phase: 'welcome', pet: null }), 'sea', { reply: 'ready', variant: 'warm', line: '海浪輕輕搖。' });
    expect(currentGuide(state, { phase: 'meet', pet: 'seasprout' }).line).toBeUndefined();
    expect(currentGuide(state, { phase: 'welcome', pet: null }).line).toBe('海浪輕輕搖。');
  });
  it('offers a break without rewards or forced continuation', () => {
    const rest = advanceGuide(currentGuide(null, { phase: 'harbor', pet: 'seasprout' }), 'rest');
    expect(guideOptions(rest)).toEqual(['hello', 'preference']);
    expect(guideCopy(rest, '測試航海員').text).toContain('休息');
  });
  it('renders listening and image choices for grade one, plain text for grade two', () => {
    const props = { player: 'doudou', csrf: 'test', name: '荳荳', grade: 1 as const, facts: { phase: 'welcome' as const, pet: null }, reduced: true, online: true };
    const first = renderToStaticMarkup(createElement(DragonGuide, props));
    expect(first).toContain('聽小龍說話'); expect(first).toContain('聽選項：大海'); expect(first).toContain('🌊'); expect(first).not.toContain('<ruby');
    const second = renderToStaticMarkup(createElement(DragonGuide, { ...props, grade: 2 }));
    expect(second).not.toContain('<ruby'); expect(second).not.toContain('<rt>');
  });
  it('uses reviewed Taiwan readings in new conversational copy', () => {
    expect(syllables('記得').map(x=>x.zy)).toEqual(['ㄐㄧˋ','˙ㄉㄜ']);
    expect(syllables('不用急著猜')[3].zy).toBe('˙ㄓㄜ');
  });
  it('preserves reviewed readings across every adjacent AI vocabulary pair', () => {
    for (const [left, leftReading] of Object.entries(vocabulary)) {
      for (const [right, rightReading] of Object.entries(vocabulary)) {
        expect(syllables(left + right).map(x => x.zy), left + right).toEqual((leftReading + ' ' + rightReading).split(' '));
      }
    }
  });
  it('uses the illustrated machine for both flows', () => {
    const html = renderToStaticMarkup(createElement(GachaVisual, { phase: 'mixing' }));
    expect(html).toContain('/assets/gacha/starwish-machine.webp');
    expect(html).not.toContain('capsule-globe');
  });
});
