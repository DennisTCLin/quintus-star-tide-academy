import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync } from 'node:fs';
import { companionMascot, companionName, companionPortrait, companionVideo, companionPoster, TIDEGLOW_MOTIONS } from '../tideglow-companion';
import { companionFrames } from '../companion-frames';
import TideglowActor from '../TideglowActor';

describe('Feifei personal bow companion', () => {
 it('requires her authenticated account, assigned slot and active slot together', () => {
  expect(companionMascot('feifei','feifei','feifei')).toBe('bow');
  expect(companionMascot('Feifei','feifei','feifei')).toBe('bow');
  for (const args of [['jimmy','feifei','feifei'],['parent',null,'feifei'],['feifei','doudou','feifei'],['feifei','feifei','doudou'],[undefined,undefined,'feifei']] as const) expect(companionMascot(args[0],args[1],args[2])).toBe('tideglow');
  expect(companionMascot('olivia','doudou','doudou')).toBe('dog');
  expect(companionName('bow')).toBe('蝴蝶結寶寶');
  expect(companionPortrait('bow')).toContain('/feifei-bow/');
 });
 it('has twelve distinct performances and bounded animated iPad fallbacks', () => {
  expect(new Set(TIDEGLOW_MOTIONS.map(m=>companionVideo('bow',m))).size).toBe(12);
  for (const motion of TIDEGLOW_MOTIONS) {
   for (const path of [companionVideo('bow',motion),companionPoster('bow',motion)]) expect(existsSync('public'+path)).toBe(true);
   const clip=companionFrames('bow',motion)!;expect(clip).toBeDefined();expect(clip.duration).toBe(clip.frames/clip.fps);
   expect(clip.size*clip.columns).toBeLessThanOrEqual(2048);expect(clip.sheets.length).toBeLessThanOrEqual(2);
   for(const path of clip.sheets)expect(existsSync('public'+path)).toBe(true);
   const html=renderToStaticMarkup(createElement(TideglowActor,{mascot:'bow',motion,reduced:true}));
   expect(html).toContain(companionPoster('bow',motion));expect(html).not.toContain('/assets/tideglow');expect(html).not.toContain('/assets/olivia-dog');
  }
 });
});
