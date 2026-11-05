import media from './data/story-media.json';

export type StoryId = 'opening' | 'lighthouse';
export function storyFromSearch(search: string): StoryId | null {
  const id = new URLSearchParams(search).get('story');
  return id === 'opening' || id === 'lighthouse' ? id : null;
}
export const STORY_FILMS = [
  { id: 'opening' as const, chapter: '開篇', title: '最後一道光', duration: '48 秒', seconds: 48,
    description: '星光墜入大海，群島失去航路。光明與暗夜，將一起守住最後的希望。', ...media.opening },
  { id: 'lighthouse' as const, chapter: '第一篇', title: '最後一座燈塔', duration: '2 分 26 秒', seconds: 146,
    description: '避難船困在黯潮之中。晨露弓手與幽燈引路者，必須付出代價，才能重新點亮回家的路。', ...media.lighthouse },
];
export type StoryFilm = typeof STORY_FILMS[number];
