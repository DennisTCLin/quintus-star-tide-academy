import { STORY_FILMS, type StoryId } from './story-films';
import './story-cinema.css';

export default function StoryCinemaEntry({ onOpen }: { onOpen: (id: StoryId) => void }) {
  return <section className="story-entry" aria-labelledby="story-entry-title">
    <div className="story-entry-intro"><h2 id="story-entry-title">星潮故事</h2><p>跟著一道光，認識這片星海。</p></div>
    <div className="story-entry-films">{STORY_FILMS.map(film => <button key={film.id} className="story-entry-film" onClick={() => onOpen(film.id)} aria-label={`觀看${film.chapter}：${film.title}`}>
      <img src={film.poster} alt="" width="640" height="360" loading="lazy" decoding="async" />
      <span className="story-entry-copy"><small>{film.chapter} · {film.duration}</small><strong>{film.title}</strong><span>▶ 觀看故事</span></span>
    </button>)}</div>
  </section>;
}
