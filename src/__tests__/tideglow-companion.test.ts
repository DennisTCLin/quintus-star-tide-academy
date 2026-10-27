import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import { companionQuiet, companionContext, companionVideo, companionPoster, CARE_ACTIONS, nextBallHit, hitCareTarget, careGoal, type CareRound, TIDEGLOW_MOTIONS } from '../tideglow-companion';
import { currentGuide, advanceGuide, guideAllowedChoices } from '../dragon-dialogue';
import TideglowActor from '../TideglowActor';

describe('Tideglow learning companion', () => {
  it('requires separate targets and cannot advance on repeat taps or invalid targets', () => {
    for (const game of ['play', 'highfive', 'bubbles'] as const) {
      let round: CareRound = { game, hits: [] };
      for (const invalid of [-1, NaN, 0.5, careGoal(game)]) expect(hitCareTarget(round, invalid)).toBe(round);
      for (let n = 0; n < careGoal(game); n++) {
        round = hitCareTarget(round, n);
        expect(hitCareTarget(round, n)).toBe(round);
      }
      expect(round.hits.length).toBe(careGoal(game));
      expect(Object.keys(round).sort()).toEqual(['game', 'hits']);
    }
  });
  it('lets bubbles pop in any order but keeps star balls sequential', () => {
    const ball: CareRound = { game: 'play', hits: [] };
    expect(hitCareTarget(ball, 2)).toBe(ball);
    let bubbles: CareRound = { game: 'bubbles', hits: [] };
    for (const n of [2, 0, 1]) bubbles = hitCareTarget(bubbles, n);
    expect(bubbles.hits).toEqual([2, 0, 1]);
  });
  it('keeps play silent and out of the way during quizzes, arena and island activities', () => {
    for (const page of ['home', 'collection', 'territory', 'learn', 'battle']) {
      expect(companionQuiet(page, true, false, false)).toBe(true);
      expect(companionQuiet(page, false, true, false)).toBe(true);
      expect(companionQuiet(page, false, false, true)).toBe(true);
    }
    for (const page of ['island', 'room', 'parent']) expect(companionQuiet(page, false, false, false)).toBe(true);
    expect(companionQuiet('home', false, false, false)).toBe(false);
    expect(companionQuiet('learn', false, false, false)).toBe(false);
  });
  it('only acknowledges a completed challenge when the caller confirms completion', () => {
    expect(companionContext('learn', false, '數學')).not.toContain('已完成');
    expect(companionContext('learn', true, '數學')).toContain('數學的這趟挑戰已完成');
    expect(companionContext('territory', false)).toContain('材料');
  });
  it('bounds the short game to three hits and leaves rewards outside the care model', () => {
    expect([0, 1, 2, 3, 30].map(nextBallHit)).toEqual([1, 2, 3, 3, 3]);
    let saved = currentGuide(null, { phase: 'harbor', pet: 'seasprout' });
    saved = advanceGuide(saved, 'sea');
    for (const choice of ['pet', 'feed', 'play'] as const) {
      expect(guideAllowedChoices(saved)).toContain(choice);
      saved = advanceGuide(saved, choice);
      expect(saved.preference).toBe('sea');
      expect(saved.pet).toBe('seasprout');
    }
    expect(saved.history.slice(-3).map(h => h.choice)).toEqual(['pet','feed','play']);
    expect(guideAllowedChoices(currentGuide(null,{phase:'welcome',pet:null}))).not.toContain('feed');
  });
  it('renders a static accessible fallback for every reduced-motion state', () => {
    expect(TIDEGLOW_MOTIONS).toHaveLength(12);
    for (const motion of TIDEGLOW_MOTIONS) {
      const html = renderToStaticMarkup(createElement(TideglowActor, { motion, reduced: true }));
      expect(html).not.toContain('<video'); expect(html).toContain(companionPoster('tideglow', motion));
      expect(existsSync('public' + companionPoster('tideglow', motion))).toBe(true);
    }
  });
  it('maps every care button to its own video and matching reduced-motion pose', () => {
    const videos = CARE_ACTIONS.map(({ id }) => companionVideo('tideglow', id));
    expect(new Set(videos).size).toBe(6);
    expect(companionVideo('tideglow', 'highfive')).not.toBe(companionVideo('tideglow', 'greet'));
    expect(companionVideo('tideglow', 'bubbles')).not.toBe(companionVideo('tideglow', 'play'));
    for (const { id } of CARE_ACTIONS) {
      expect(companionVideo('tideglow', id)).toMatch(new RegExp(`/${id}\\.mp4$`));
      expect(companionPoster('tideglow', id)).toMatch(new RegExp(`/${id}\\.jpg$`));
      expect(existsSync('public' + companionVideo('tideglow', id))).toBe(true);
    }
    const rest = renderToStaticMarkup(createElement(TideglowActor, { motion: 'rest', reduced: false }));
    expect(rest).toContain('loop='); expect(rest).toContain('muted');
  });
});
