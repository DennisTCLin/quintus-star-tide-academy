import { useContext } from "react";
import type { Character, CharacterRarity } from "./characters";
import type { CombatStats } from "./creature-rules";
import { nativeCombatStats, NATIVE_LEVELS } from "./creature-rules";
import { petSkillName, petSkillDescription } from "./game-view";
import { ReadingContext, annotateTree } from "./readability";
import "./creature-info.css";

export function CreatureBadge({ rarity, level }: { rarity: CharacterRarity; level: number }) {
  const { grade } = useContext(ReadingContext);
  return annotateTree(<span className="creature-badges" aria-label={`稀有度 ${rarity} 級，等級 ${level}`}>
    <b className={`creature-rarity rank-${rarity}`}><small>稀有度</small>{rarity}<small>級</small></b>
    <strong className="creature-level">Lv.{level}</strong>
  </span>, grade);
}

export function StatLine({ stats }: { stats: CombatStats }) {
  const { grade } = useContext(ReadingContext);
  return annotateTree(<span className="creature-stats" aria-label="戰鬥能力">
    <span><small>HP 生命</small><b>{stats.hp}</b></span>
    <span><small>ATK 攻擊</small><b>{stats.attack}</b></span>
    <span><small>DEF 防禦</small><b>{stats.defense}</b></span>
  </span>, grade);
}

export function CreatureSheet({ pet, level, stats }: { pet: Character; level: number; stats?: CombatStats }) {
  const { grade } = useContext(ReadingContext);
  return annotateTree(<div className="creature-sheet">
    <CreatureBadge rarity={pet.rarity} level={level} />
    <StatLine stats={stats ?? nativeCombatStats(pet.rarity, level)} />
    {!stats && <p className="creature-origin">天生 Lv.{NATIVE_LEVELS[pet.rarity]} ＋ 練習提升 {level - NATIVE_LEVELS[pet.rarity]} 級</p>}
    <div className="creature-skill"><small>夥伴技能</small><h3>{petSkillName(pet.id)}</h3><p>{petSkillDescription(pet.id)}</p></div>
  </div>, grade);
}
