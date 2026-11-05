import { describe, expect, it } from 'vitest';
import { portraitMotion, portraitPhase, healthPose } from '../character-motion';
import { ROSTER } from '../game-view';
import { CONQUEST_HEROES } from '../conquest-characters';

describe('character presentation policy', () => {
  it('preserves authored locomotion and gives every currently released character a supported presentation', () => {
    const supported = new Set(['breathe', 'stride', 'hop', 'crawl', 'flutter', 'swim', 'float', 'sentinel', 'channel']);
    for (const character of [...ROSTER, ...CONQUEST_HEROES]) {
      const motion = 'motion' in character ? character.motion : undefined;
      expect(supported.has(portraitMotion(character.id, motion)), character.id).toBe(true);
      if (motion) expect(portraitMotion(character.id, motion)).toBe(motion);
      expect(portraitPhase(character.id)).toBeLessThanOrEqual(0);
      expect(portraitPhase(character.id)).toBeGreaterThan(-2.4);
    }
  });
  it('does not celebrate a selected defeated or critically wounded unit', () => {
    expect(healthPose(0, 100, true)).toBe('defeated');
    expect(healthPose(19, 100, true)).toBe('rest');
    expect(healthPose(20, 100, true)).toBe('selected');
    expect(healthPose(20, 100)).toBe('idle');
  });
  it('keeps heroes, swimmers, flyers and ground creatures visually distinct', () => {
    expect(portraitMotion('hero-elf')).toBe('sentinel');
    expect(portraitMotion('hero-necromancer')).toBe('channel');
    expect(portraitMotion('atlaswhale')).toBe('swim');
    expect(portraitMotion('starheron')).toBe('flutter');
    expect(portraitMotion('covegecko')).toBe('crawl');
    expect(portraitMotion('sailskipper')).toBe('hop');
    expect(portraitMotion('nebulafox')).toBe('float');
    expect(portraitMotion('tideglow')).toBe('breathe');
    expect(portraitMotion('future-character')).toBe('breathe');
  });
});
