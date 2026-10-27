import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { newFamily, startRun, validateFamily } from '../adventure';
import { encounterStats } from '../creature-rules';
import { growthStyle } from '../companion-growth';
import { petById } from '../game-view';
import { monsterById, monsterForm } from '../monsters';
import QuizEncounter from '../QuizEncounter';

// Compact HUDs must not make saved-voyage information inaccessible.
describe('expanded quiz information for saved voyages', () => {
  for (const mode of ['current', 'legacy-species', 'legacy-generic'] as const) {
    it(`retains known metadata without inventing stats: ${mode}`, () => {
      const family = newFamily();
      startRun(family, 'quintus', 'math', 'details', 7, false, '2026-10-25');
      const saved = family.profiles.quintus.run!;
      if (mode !== 'current') { delete saved.encounter.combat; delete saved.encounter.route; }
      if (mode === 'legacy-generic') delete saved.encounter.variant;
      const profile = validateFamily(family).profiles.quintus;
      const run = profile.run!;
      const html = renderToStaticMarkup(createElement(QuizEncounter, {
        profile, run, xp: 0, day: '2026-10-25', busy: false,
        online: true, reduced: true, onRecruit: async () => undefined,
      }));
      const details = html.split('<details class="quiz-encounter-info"')[1];
      expect(details).toBeDefined();
      expect(details).toContain(growthStyle(run.encounter.level));
      expect(details).toContain(`稀有度 ${petById(run.companion)!.rarity} 級，等級 ${run.encounter.level}`);
      const species = monsterById(run.encounter.variant);
      if (species) {
        expect(details).toContain(`稀有度 ${species.rarity} 級，等級 ${run.encounter.level}`);
        expect(details).toContain(`${species.element}屬性 · ${monsterForm(species).name}`);
      }
      if (mode === 'current') expect(details).toContain('ATK 攻擊');
      else {
        expect(details).not.toContain('ATK 攻擊');
        expect(details).not.toContain('DEF 防禦');
        expect(details).not.toContain('答對依攻擊、防禦與五行');
      }
    });
  }
});

// A rare companion exposes accidental mixing of training level and native level.
describe('rare saved encounter snapshots', () => {
  it.each([1, 2] as const)('renders and continues version %s without upgrading the saved snapshot', version => {
    const family = newFamily(), profile = family.profiles.quintus;
    profile.owned.astraltide = 1; profile.equipped = 'astraltide';
    profile.firstAcquired.astraltide = '2026-10-25'; profile.growth.xp.astraltide = 50;
    startRun(family, 'quintus', 'math', 'rare-details', 7, false, '2026-10-25');
    const run = profile.run!, foe = monsterById(run.encounter.variant)!;
    run.encounter.combat = {version, ally:encounterStats(version, 'SSS', 2), foe:encounterStats(version, foe.rarity, 2)};
    profile.growth.xp.astraltide = 125; // progress after the snapshot must not rewrite this voyage
    const checked = validateFamily(JSON.parse(JSON.stringify(family))).profiles.quintus;
    const html = renderToStaticMarkup(createElement(QuizEncounter, {
      profile:checked, run:checked.run!, xp:125, day:'2026-10-25', busy:false, online:true, reduced:true, onRecruit:async()=>undefined,
    }));
    expect(html).toContain(`稀有度 SSS 級，等級 ${version === 1 ? 2 : 51}`);
    expect(html).toContain(`稀有度 ${foe.rarity} 級，等級 ${run.encounter.combat.foe.level}`);
    expect(html).toContain('元素突擊');
    expect(checked.run!.encounter.combat).toEqual(run.encounter.combat);
  });
});
