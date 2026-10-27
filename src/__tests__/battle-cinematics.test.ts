import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BATTLE_CINEMATICS, quizMoveSlot, quizCinematic, quizAnimationMs, battleCinematic, cinematicTiming, cinematicPosition } from '../battle-cinematics';
import { battlePresentationTiming, FAST_BATTLE_TIMING, BATTLE_TIMING } from '../battle-presentation';
import { newBattle, battleMove, ROSTER } from '../game-view';

describe('reviewed cinematics in production', () => {
  it('alternates small moves and reserves the ultimate for the last actual question', () => {
    expect(Array.from({length:6}, (_, i) => quizMoveSlot(i, 6))).toEqual([0,1,0,1,0,2]);
    expect(Array.from({length:5}, (_, i) => quizMoveSlot(i, 5))).toEqual([0,1,0,1,2]);
    for (const pet of [...new Set(Object.values(BATTLE_CINEMATICS).map(c => c.pet))]) {
      for (let i=0;i<6;i++) {
        const clip = quizCinematic(pet, i, 6)!;
        expect(clip.slot).toBe([0,1,0,1,0,2][i]);
        expect(quizAnimationMs(pet, i, 6)).toBe(i===5?4000:2800);
      }
    }
    expect(quizCinematic('new-creature',5,6)).toBeUndefined();
    expect(quizAnimationMs('new-creature',5,6)).toBe(1100);
  });
  it('packages 55 complete three-move sets with unique jobs and matching version hashes', () => {
    const clips = Object.values(BATTLE_CINEMATICS);
    expect(clips).toHaveLength(165);
    expect(new Set(clips.map(c => c.jobId)).size).toBe(165);
    const pets = [...new Set(clips.map(c => c.pet))];
    expect(pets).toHaveLength(55);
    for (const pet of pets) {
      expect(ROSTER.some(p => p.id === pet)).toBe(true);
      expect(clips.filter(c => c.pet === pet).map(c => c.slot).sort()).toEqual([0, 1, 2]);
    }
    for (const c of clips) for (const url of [c.src, c.poster]) {
      const [file, version] = url.split('?v=');
      const path = new URL('../../public' + file, import.meta.url);
      expect(existsSync(path)).toBe(true);
      expect(createHash('sha256').update(readFileSync(path)).digest('hex').startsWith(version)).toBe(true);
    }
  });
  it('does not impersonate new creatures or play an attack on a swap', () => {
    for (const pet of ROSTER) {
      const clip = battleCinematic(pet.id, 'attack');
      if (clip) expect(clip.pet).toBe(pet.id);
    }
    expect(battleCinematic('unknown', 'burst')).toBeUndefined();
    expect(battleCinematic('tideglow', 'swap')).toBeUndefined();
  });
  it('keeps each existing action on its own actor and leaves committed server state unchanged', () => {
    for (const kind of ['attack', 'burst', 'guard', 'heal'] as const) {
      const b = newBattle(['tideglow'], ['pebblefin'], 'duo'); b.teams[0][0].energy = 3;
      const after = battleMove(b, kind), original = JSON.stringify(after);
      const clip = battleCinematic(after.event!.source, kind)!;
      expect(clip.pet).toBe('tideglow');
      const timing = battlePresentationTiming(after.event!, false);
      expect(timing.flight < timing.impact && timing.impact < timing.settle && timing.settle < timing.end).toBe(true);
      expect(battlePresentationTiming(after.event!, true)).toBe(FAST_BATTLE_TIMING);
      expect(JSON.stringify(after)).toBe(original);
    }
    const after = battleMove(newBattle(['cloud-scout-water'], ['tideglow'], 'cpu'), 'attack');
    expect(battlePresentationTiming(after.event!, false)).toBe(BATTLE_TIMING);
  });
  it('seeks a late load to the shared clock and suppresses footage arriving after its impact', () => {
    for (const clip of Object.values(BATTLE_CINEMATICS)) {
      const t = cinematicTiming(clip);
      expect(cinematicPosition(clip, 500)).toBeCloseTo(500 / t.end * clip.duration);
      expect(cinematicPosition(clip, t.impact)).toBeNull();
      expect(cinematicPosition(clip, t.end)).toBeNull();
    }
  });
});
