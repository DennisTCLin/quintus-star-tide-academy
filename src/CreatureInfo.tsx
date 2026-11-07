import { useContext } from "react";
import type { Character, CharacterRarity } from "./characters";
import type { CombatStats } from "./creature-rules";
import { nativeCombatStats, NATIVE_LEVELS } from "./creature-rules";
import { petSkillName, petSkillDescription } from "./game-view";
import { ReadingContext, annotateTree } from "./readability";
import "./creature-info.css";
import { creatureBody, bodySizeName } from './creature-body';

export function CreatureBodyFacts({ id }: { id: string }) {
  const { grade } = useContext(ReadingContext);
  const body = creatureBody(id);
  if (!body) return null;
  const format = (value: number) => value.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  return annotateTree(<section className="creature-body-facts" aria-label="物種體型">
    <strong>物種體型 · {bodySizeName(body)}</strong>
    <dl><div><dt>全長</dt><dd>{format(body.lengthM)} 公尺</dd></div><div><dt>展寬</dt><dd>{format(body.widthM)} 公尺</dd></div><div><dt>高度</dt><dd>{format(body.heightM)} 公尺</dd></div><div><dt>體重</dt><dd>{format(body.massKg)} 公斤</dd></div></dl>
    <p>星潮物種設定。全長含尾，展寬含雙翼與鰭，高度含角冠；不含魔法光效。戰場依體型等比呈現，極小與巨型生物會適度調整，方便觀看。</p>
  </section>, grade);
}

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
    <CreatureBodyFacts id={pet.id} />
    {!stats && <p className="creature-origin">天生 Lv.{NATIVE_LEVELS[pet.rarity]} ＋ 練習提升 {level - NATIVE_LEVELS[pet.rarity]} 級</p>}
    <div className="creature-skill"><small>夥伴技能</small><h3>{petSkillName(pet.id)}</h3><p>{petSkillDescription(pet.id)}</p></div>
  </div>, grade);
}
