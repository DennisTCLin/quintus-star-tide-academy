import type { Character } from "./characters";
import { ELEMENTS, petElement } from "./game-view";
import { creatureProgress } from "./companion-growth";
import { BrandText } from "./BrandIcon";
import "./battle-pet-picker.css";

export default function BattlePetPicker({ pets, selected, onSelect, growth = {} }: {
  pets: Character[];
  selected: string[];
  onSelect: (id: string) => void;
  growth?: Record<string, number>;
}) {
  return <div className="battle-pet-picker" data-learning-content>
    {pets.map(pet => {
      const picked = selected.includes(pet.id);
      const element = ELEMENTS[petElement(pet.id)];
      const level = creatureProgress(pet.rarity, growth[pet.id] ?? 0).level;
      return <button type="button" key={pet.id} className="battle-pet-card"
        aria-pressed={picked}
        disabled={!picked && selected.length >= 3}
        aria-label={`${pet.name}，${pet.rarity} 級，等級 ${level}，${element.name}屬性，${picked ? "已選，點擊取消" : "點擊加入隊伍"}`}
        onClick={() => onSelect(pet.id)}>
        <span className="battle-pet-meta" aria-hidden="true">
          <span className={`battle-pet-rank rank-${pet.rarity}`}>{pet.rarity}</span>
          <strong>Lv.{level}</strong>
        </span>
        <img className="battle-pet-image" src={pet.image} alt="" loading="lazy" />
        <span className="battle-pet-name">{pet.name}</span>
        <span className="battle-pet-footer" aria-hidden="true">
          <span><BrandText text={element.icon} /> {element.name}</span>
          <span className="battle-pet-selection">{picked ? "✓ 已選" : "＋ 加入"}</span>
        </span>
      </button>;
    })}
  </div>;
}
