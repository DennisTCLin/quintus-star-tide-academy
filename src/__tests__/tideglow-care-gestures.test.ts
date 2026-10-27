import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';
import * as React from 'react';
import * as careModel from '../tideglow-companion';
import * as fixedVoice from '../companion-fixed-voice';
import * as readAloud from '../ReadAloud';

// Exercise the actual component event handlers without a browser or real microphone.
// These tests deliberately hold a pointer past the animation lock's expiry.
const require = createRequire(import.meta.url);
const source = transformSync(readFileSync(new URL('../TideglowCompanion.tsx', import.meta.url), 'utf8') + '\nexport { TideglowPanel };', { loader: 'tsx', format: 'cjs', jsx: 'automatic' }).code;
function harness(reduced = true) {
  let cursor = 0;
  const slots: any[] = [];
  const guide = { copy: { text: '你好' }, current: { reply: 'idle' }, loaded: false, busy: false, pending: {}, speaking: false, listen: vi.fn(), stop: vi.fn() };
  const hooks = { ...React, useContext: () => ({ voice: true }), useEffect: () => { cursor++; },
    useState: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (v: any) => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useRef: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
  };
  const localRequire = (name: string) => {
    if (name === 'react') return hooks;
    if (name === './useDragonDialogue') return { useDragonDialogue: () => guide };
    if (name === './readability') return { annotateTree: (x: any) => x, ReadingContext: {} };
    if (name === './dragon-dialogue') return { guideOptions: () => [], GUIDE_CHOICES: {} };
    if (name === './useCompanionConversation') return { useCompanionConversation: () => ({ stop: vi.fn(), status: 'idle' }) };
    if (name === './ReadAloud') return readAloud;
    if (name === './tideglow-companion') return careModel;
    if (name === './companion-fixed-voice') return fixedVoice;
    if (name.startsWith('./')) return name.endsWith('.css') ? {} : { default: () => null };
    return require(name);
  };
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', source)(localRequire, module, module.exports, setTimeout, clearTimeout);
  const render = () => { cursor = 0; return module.exports.TideglowPanel({ grade: 1, reduced, paused: false, online: false, facts: { phase: 'harbor' }, page: 'home' }); };
  const nodes = (n: any): any[] => n && typeof n === 'object' ? [n, ...[n.props?.children].flat(Infinity).flatMap(nodes)] : [];
  const find = (predicate: (n: any) => boolean) => nodes(render()).find(predicate);
  return { guide, find, actor: () => find(n => typeof n.props?.onComplete === 'function' && n.props?.motion), touch: () => find(n => n.props?.className === 'tide-touch') };
}
afterEach(() => vi.useRealTimers());

describe('care gesture and cancellation regressions', () => {
  it.each([true, false])('does not pet twice after holding a completed swipe (reduced=%s)', reduced => {
    vi.useFakeTimers(); const h = harness(reduced);
    h.touch().props.onPointerDown({ clientX: 0, clientY: 0 });
    h.touch().props.onPointerMove({ clientX: 25, clientY: 0 });
    vi.advanceTimersByTime(reduced ? 300 : 5200);
    if (!reduced) h.actor().props.onComplete();
    h.touch().props.onPointerUp(); h.touch().props.onClick();
    expect(h.guide.listen).toHaveBeenCalledTimes(1);
    h.touch().props.onClick();
    expect(h.guide.listen).toHaveBeenCalledTimes(2);
  });
  it('does not swallow the next keyboard activation after a cancelled swipe', () => {
    vi.useFakeTimers(); const h = harness();
    h.touch().props.onPointerDown({ clientX: 0, clientY: 0 }); h.touch().props.onPointerMove({ clientX: 25, clientY: 0 });
    h.touch().props.onPointerCancel(); vi.advanceTimersByTime(300); h.touch().props.onClick();
    expect(h.guide.listen).toHaveBeenCalledTimes(2);
  });
  it('rest interrupts an animation immediately and frees the next action', () => {
    vi.useFakeTimers(); const h = harness(false);
    h.touch().props.onClick(); expect(h.touch().props.disabled).toBe(true);
    h.find(n => n.props?.['aria-label'] === '一起休息').props.onClick();
    expect(h.touch().props.disabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(h.guide.listen).toHaveBeenLastCalledWith(careModel.CARE_COPY.rest);
  });
});


describe('distinct care animation routing and lifecycle', () => {
  it('does not interrupt a care clip when replaying its spoken feedback', () => {
    vi.useFakeTimers(); const h = harness(false);
    h.find(n => n.props?.['aria-label'] === '餵點心').props.onClick();
    h.find(n => n.props?.['aria-label'] === '聽潮光獸的互動回應').props.onClick();
    expect(h.actor().props.motion).toBe('feed');
    expect(h.touch().props.disabled).toBe(true);
    h.actor().props.onComplete();
    expect(h.touch().props.disabled).toBe(false);
  });
  it('keeps each game on its own motion, including the final high-five', () => {
    vi.useFakeTimers(); const h = harness(false);
    for (const [label, motion] of [['星光球','play'],['擊掌','highfive'],['吹泡泡','bubbles']] as const) {
      h.find(n => n.props?.['aria-label'] === label).props.onClick();
      expect(h.actor().props.motion).toBe(motion);
      const target = motion === 'play' ? '接第 1 顆星光球' : motion === 'highfive' ? '和潮光獸擊掌' : '點第 1 個泡泡';
      h.find(n => n.props?.['aria-label'] === target).props.onClick();
      expect(h.actor().props.motion).toBe(motion);
      vi.advanceTimersByTime(1000);
      expect(h.touch().props.disabled).toBe(true);
      h.actor().props.onComplete();
      expect(h.touch().props.disabled).toBe(false);
    }
  });
  it('uses actual playback completion and ignores a stale end callback after rest', () => {
    vi.useFakeTimers(); const h = harness(false);
    h.touch().props.onClick();
    const oldEnd = h.actor().props.onComplete;
    vi.advanceTimersByTime(6000); // A delayed load must not be cut off by the old 5.2s timer.
    expect(h.touch().props.disabled).toBe(true);
    h.actor().props.onPlaying(4);
    h.find(n => n.props?.['aria-label'] === '一起休息').props.onClick();
    oldEnd();
    expect(h.actor().props.motion).toBe('rest');
    expect(h.touch().props.disabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
