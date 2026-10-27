import type { Run } from "./adventure";
import { completedHits, encounterDamage } from "./companion-growth";
import { baseDamage } from "./creature-rules";
import { petElement, petSkill } from "./game-view";
import { hasElementAdvantage } from "./elements";
import { challengeHp, mistakeCount } from "./challenge-rules";

// HP is derived from the server's persisted first-answer ledger. A client click
// or an early depletion of visual HP can never award a victory or a capture.
export function allyVitals(run: Run, mistakes = mistakeCount(run)) {
  const max = run.encounter.combat?.ally.hp ?? 100;
  const hp = challengeHp(max, mistakes);
  return { max, hp, damage: mistakes ? challengeHp(max, mistakes - 1) - hp : 0 };
}
export function quizVitals(run: Run, hits = completedHits(run), resolved = true) {
  const combat = run.encounter.combat;
  const max = combat?.foe.hp ?? encounterDamage(run.encounter.level) * run.questions.length;
  const normal = combat
    ? baseDamage(combat.ally, combat.foe)
      + (hasElementAdvantage(petElement(run.companion), petElement(run.encounter.variant!)) ? 8 : 0)
      + (petSkill(run.companion) === "focus" ? 3 : 0)
    : encounterDamage(run.encounter.level);
  let hp = max, damage = 0;
  for (let i = 1; i <= hits; i++) {
    const hit = i === 1 && run.encounter.variant && petSkill(run.encounter.variant) === "shield" ? Math.max(1, normal - 8) : normal;
    damage = Math.min(Math.max(0, hp - 1), hit);
    hp -= damage;
  }
  if (resolved && run.status === "won" && hits === completedHits(run)) { damage += hp; hp = 0; }
  return { max, hp, damage };
}
