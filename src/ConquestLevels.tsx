import { useContext } from 'react';
import { annotateTree, ReadingContext } from './readability';
import { creatureProgress } from './companion-growth';
import { companionById } from './conquest-characters';
import type { Companion } from './conquest';

type Unit = Pick<Companion, 'id' | 'level' | 'loan'>;
function collectionLabel(unit: Unit, growthXp: Record<string, number>) {
  const pet = companionById(unit.id);
  if (unit.loan || !pet) return '聯盟借用';
  return `卡冊 Lv.${creatureProgress(pet.rarity, growthXp[unit.id] ?? 0).level}`;
}
export function conquestLevelDescription(unit: Unit, growthXp: Record<string, number>) {
  return `${collectionLabel(unit, growthXp)}，群島對戰 Lv.${unit.level}`;
}
/** Display both contexts; never replace the combat level or write collection XP. */
export default function ConquestLevels({ unit, growthXp }: { unit: Unit; growthXp: Record<string, number> }) {
  const { grade } = useContext(ReadingContext);
  return annotateTree(<><small>{collectionLabel(unit, growthXp)}</small><small>群島對戰 Lv.{unit.level}</small></>, grade);
}
