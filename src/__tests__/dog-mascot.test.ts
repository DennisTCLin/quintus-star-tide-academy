import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { companionMascot, companionVideo, companionPoster, CARE_ICON_ATLAS, DOG_VIDEO, TIDEGLOW_MOTIONS } from '../tideglow-companion';
import TideglowActor from '../TideglowActor';
import CareActionArt from '../CareActionArt';
import { existsSync } from 'node:fs';

describe('personal dog mascot', () => {
  it('belongs only to the authenticated Olivia account and her active profile', () => {
    expect(companionMascot('olivia', 'doudou', 'doudou')).toBe('dog');
    expect(companionMascot('Olivia', 'doudou', 'doudou')).toBe('dog');
    for (const [name, account, active] of [['other', 'doudou', 'doudou'], ['olivia', 'feifei', 'doudou'], ['olivia', 'doudou', 'feifei'], ['parent', null, 'doudou'], [undefined, undefined, null]] as const)
      expect(companionMascot(name, account, active)).toBe('tideglow');
  });
  it('uses the dog assets throughout interactions and never falls back to fox artwork', () => {
    for (const motion of TIDEGLOW_MOTIONS) {
      const html = renderToStaticMarkup(createElement(TideglowActor, { motion, reduced: false, mascot: 'dog' }));
      expect(html).toContain(companionPoster('dog', motion));
      expect(html).not.toContain('/assets/tideglow');
      expect(html).toContain(companionVideo('dog', motion)); expect(html).toContain('muted');
      expect(existsSync('public' + companionVideo('dog', motion))).toBe(true);
      expect(existsSync('public' + companionPoster('dog', motion))).toBe(true);
      if (motion === 'rest') expect(html).toContain('loop=');
    }
    expect(new Set(TIDEGLOW_MOTIONS.map(m => companionVideo('dog', m))).size).toBe(12);
  });
  it('respects reduced motion and preserves the original companion for everyone else', () => {
    expect(renderToStaticMarkup(createElement(TideglowActor, { motion: 'idle', reduced: true, mascot: 'dog' }))).not.toContain('<video');
    const original = renderToStaticMarkup(createElement(TideglowActor, { motion: 'pet', reduced: false }));
    expect(original).toContain('/assets/tideglow-guide/pet.mp4');
    expect(original).not.toContain(DOG_VIDEO);
    for (const motion of TIDEGLOW_MOTIONS) expect(existsSync('public'+companionVideo('tideglow',motion))).toBe(true);
  });
});

it('renders the same Higgsfield icon atlas for all six reusable care buttons', () => {
  for (const action of ['pet','feed','play','highfive','bubbles','rest'] as const) {
    const html = renderToStaticMarkup(createElement(CareActionArt,{action}));
    expect(html).toContain(CARE_ICON_ATLAS); expect(html).not.toContain('fallback');
  }
  expect(existsSync('public'+CARE_ICON_ATLAS)).toBe(true);
});
