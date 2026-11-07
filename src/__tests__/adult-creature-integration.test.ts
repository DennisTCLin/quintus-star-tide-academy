import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { newFamily, startRun } from '../adventure';
import { AdultGameStudy } from '../adult/GameStudy';
import type { AdultCloud } from '../adult/cloud';
import { freshState, startLesson } from '../adult/engine';
import { MONSTER_CATALOG } from '../monsters';
import { bodyExtent, creatureBody, creatureStageScale } from '../creature-body';

// Exercise the real shared encounter, including both sides of the main/adult merge.
describe('adult courses retain shared creature proportions and adult rules', () => {
  const ordered = [...MONSTER_CATALOG].sort((a, b) => bodyExtent(creatureBody(a.id)) - bodyExtent(creatureBody(b.id)));
  for (const foe of [ordered[0], ordered.at(-1)!]) {
    it(`renders the real adult encounter once per fighter: ${foe.id}`, () => {
      const state = startLesson(freshState(), 'hello'), family = newFamily();
      const profile = family.profiles.quintus;
      startRun(family, 'quintus', 'math', 'adult-body-merge', 7, false, '2026-11-07');
      const encounter = structuredClone(profile.run!.encounter);
      encounter.variant = foe.id;
      profile.adultAdventure = { sessionId: state.session!.id, companion: profile.equipped, outcome: 'active', earned: 0, rewarded: false, encounter };
      const before = structuredClone({ state, profile });
      const learning = { snapshot: { state, day: '2026-11-07', username: 'synthetic_body', csrf: 'test' }, busy: false, needsRetry: false, error: '', send: vi.fn(), sync: vi.fn() } as unknown as AdultCloud;
      const html = renderToStaticMarkup(createElement(AdultGameStudy, { learning, profile, onHome: () => {}, refreshGame: async () => {}, reduced: true, onEquip: async () => {} }));
      expect(html).toContain('答題怪物戰鬥');
      expect(html).toContain('確認答案');
      expect(html.match(/class="creature-stage-size"/g)).toHaveLength(2);
      expect(html.match(new RegExp(`data-body-species="${foe.id}"`, 'g'))).toHaveLength(1);
      expect(html).toContain(`--creature-stage-scale:${creatureStageScale(foe.id)}`);
      expect(html).toContain('英文每題每日第一次獨立答對');
      expect(html).not.toContain('舊版航程：降服機率');
      expect(html).not.toContain('六題挑戰成功後，再連續答對三題就能降服');
      expect({ state, profile }).toEqual(before);
    });
  }
});
