import ReadAloud from './ReadAloud';
import type { CSSProperties } from 'react';
import type { Grade } from './learning';
import { annotateTree } from './readability';
import { islandCollection, type CollectionIsland, type CollectionProfile } from './island-collection';
import './island-collection-preview.css';

type Props = {
  island: CollectionIsland;
  profile: CollectionProfile;
  grade: Grade;
  onSpeak: (text: string) => void;
};
export default function IslandCollectionPreview({ island, profile, grade, onSpeak }: Props) {
  const collection = islandCollection(island, profile);
  const preview = collection.current.length > 3 ? [collection.current[0], collection.current[Math.floor(collection.current.length / 2)], collection.current[collection.current.length - 1]] : collection.current;
  const status = (owned: boolean) => owned ? '有了' : '還沒';
  const otherHint = collection.level < 5
    ? `同行夥伴再練習提升 ${5 - collection.level} 級，就有機會遇見牠們。`
    : '換成剛開始練習的同行夥伴，可以再遇見牠們。';
  const speech = `${island.name}可以收集${collection.entries.length}種夥伴，你已經有${collection.collected}種。這個階段可以遇見：${preview.map(({ monster, owned }) => `${monster.name}，${status(owned)}`).join('。')}。完成探險後，有機會邀請牠們。`;
  const list = (entries: typeof collection.entries) => <ul className="island-collection-list">
    {entries.map(({ monster, owned }) => <li key={monster.id}>
      <img src={monster.thumbnail ?? monster.image} alt="" width="64" height="64" loading="lazy"/>
      <span className="island-collection-creature-name">{monster.name}</span>
      <span className={`island-collection-status${owned ? ' is-owned' : ''}`}><span aria-hidden="true">{owned ? '✓' : '○'}</span> {status(owned)}</span>
    </li>)}
  </ul>;
  return annotateTree(<section className="island-collection" aria-label={`${island.name}可收集的夥伴`} style={{ '--collection-tone': island.color } as CSSProperties}>
    <div className="island-collection-heading"><span>收集夥伴 <b>{collection.collected}/{collection.entries.length}</b></span>
      <ReadAloud grade={grade}><button data-read-aloud className="island-collection-listen" type="button" aria-label={`聽${island.name}夥伴介紹`} onClick={() => onSpeak(speech)}>🔊</button></ReadAloud>
    </div>
    <p className="island-collection-caption">這個階段可遇見</p>
    <ul className="island-collection-strip">
      {preview.map(({ monster, owned }) => <li key={monster.id} aria-label={`${monster.name}，${status(owned)}`}>
        <img src={monster.thumbnail ?? monster.image} alt={monster.name} width="80" height="80" loading="lazy"/>
        <span className={`island-collection-status${owned ? ' is-owned' : ''}`}><span aria-hidden="true">{owned ? '✓' : '○'}</span> {status(owned)}</span>
      </li>)}
    </ul>
    <details className="island-collection-details">
      <summary>看全部 {collection.entries.length} 種</summary>
      <p className="island-collection-group">這個階段</p>
      {list(collection.current)}
      <p className="island-collection-group">島上的其他夥伴</p>
      <p className="island-collection-hint">{otherHint}</p>
      {list(collection.other)}
      <p className="island-collection-hint">完成探險後，有機會邀請牠們。</p>
    </details>
  </section>, grade);
}
