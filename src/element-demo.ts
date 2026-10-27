import { ELEMENTS, elementIndex, type ElementName } from "./elements";
import { battleMove, fighterMaxHp, newBattle, petById } from "./game-view";

export type ElementLesson = "generation" | "advantage";
export type DemoHealth = "hurt" | "near" | "full";
const EXAMPLES: Record<ElementName, string> = {
  金: "shellmole", 木: "seasprout", 水: "tideglow", 火: "coralflare", 土: "pebblefin",
};

/** Isolated teaching battle; never receives a player profile or sends a command. */
export function elementDemo(lesson: ElementLesson, selected: number, health: DemoHealth = "hurt") {
  const sourceElement = ELEMENTS[selected] ?? ELEMENTS[2];
  const targetElement = ELEMENTS[elementIndex(lesson === "generation" ? sourceElement.generates : sourceElement.overcomes)];
  const source = petById(EXAMPLES[sourceElement.name])!;
  const target = petById(EXAMPLES[targetElement.name])!;
  const generation = lesson === "generation";
  const before = newBattle(generation ? [source.id, target.id] : [source.id], generation ? [target.id, source.id] : [target.id], "duo");
  const receiver = generation ? before.teams[0][1] : before.teams[1][0];
  const maxHp = fighterMaxHp(receiver);
  if (generation) receiver.hp = maxHp - (health === "hurt" ? 40 : health === "near" ? 4 : 0);
  // This attack example has no guard or remaining shield; explain mitigation separately.
  receiver.shieldUsed = true;
  const beforeHp = receiver.hp;
  const after = battleMove(before, generation ? "swap:1" : "attack");
  return { sourceElement, targetElement, source, target, maxHp, beforeHp,
    afterHp: after.event!.targetHp, amount: after.event!.amount, nextTurn: after.turn };
}
