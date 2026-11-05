import { createElement } from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ConquestLevels, { conquestLevelDescription } from '../ConquestLevels';
import { expeditionRoster } from '../conquest-characters';
import { xpForLevel, creatureProgress } from '../companion-growth';
import { petById } from '../game-view';
import { TRIAL_LEVEL } from '../conquest';

it('shows the earned collection level in battle without changing XP or ownership', () => {
  const owned = { aetherdragon: 1, tideglow: 1 };
  const xp = Object.freeze({ aetherdragon: xpForLevel(23), tideglow: xpForLevel(2) });
  const roster = expeditionRoster(owned, undefined, xp), before = structuredClone(roster);
  for (const unit of roster) {
    const level = creatureProgress(petById(unit.id)!.rarity, xp[unit.id as keyof typeof xp]).level;
    const html = renderToStaticMarkup(createElement(ConquestLevels, {unit, growthXp:xp}));
    expect(html).toContain(`卡冊 Lv.${level}`);
    expect(html).toContain(`群島對戰 Lv.${level}`);
    expect(unit.level).toBe(level);
    expect(conquestLevelDescription(unit, xp)).toBe(`卡冊 Lv.${level}，群島對戰 Lv.${level}`);
  }
  expect(roster).toEqual(before);
  expect(xp.aetherdragon).toBe(xpForLevel(23));
  expect(owned).toEqual({ aetherdragon: 1, tideglow: 1 });
});
it('does not present borrowed alliance units as earned collection levels', () => {
  const unit = { id: 'tideglow', level: TRIAL_LEVEL, loan: true };
  const html = renderToStaticMarkup(createElement(ConquestLevels, {unit, growthXp:{ tideglow: 5000 }}));
  expect(html).toContain('聯盟借用');
  expect(html).not.toContain('卡冊 Lv.');
  expect(html).toContain(`群島對戰 Lv.${TRIAL_LEVEL}`);
});
