import { COURSES } from './course-catalog';
import type { Course, Grade } from './learning';
import type { ElementName } from './elements';

export const SUBJECT_ISLAND_ART_VERSION = '20261025';
export const SUBJECT_ISLANDS = [
  { id: 'metal', element: '金', name: '星械島', color: '#ffda8c', courses: { 1: 'math', 2: 'math', 4: 'math', 5: 'math', 6: 'math' } },
  { id: 'wood', element: '木', name: '森語島', color: '#a2e1a7', courses: { 1: 'medials', 2: 'medials', 4: 'chinese', 5: 'chinese', 6: 'chinese' } },
  { id: 'water', element: '水', name: '潮語島', color: '#92ddff', courses: { 1: 'english', 2: 'words', 4: 'english', 5: 'english', 6: 'english' } },
  { id: 'fire', element: '火', name: '鳴焰島', color: '#ffb28b', courses: { 1: 'tones', 2: 'tones', 4: 'science', 5: 'science', 6: 'science' } },
  { id: 'earth', element: '土', name: '回聲島', color: '#e6cd9a', courses: { 1: 'pairs', 2: 'pairs', 4: 'social', 5: 'social', 6: 'social' } },
] as const;
export type SubjectIslandId = typeof SUBJECT_ISLANDS[number]['id'];
// Independent of combat versions: an absent route is a historical mixed encounter.
export type IslandRoute = { version: 1; island: SubjectIslandId; element: ElementName };
export function islandForCourse(grade: Grade, course: Course) {
  return SUBJECT_ISLANDS.find(island => island.courses[grade] === course);
}
export function routeForCourse(grade: Grade, course: Course): IslandRoute {
  const island = islandForCourse(grade, course);
  if (!island || !COURSES[grade]?.some(c => c.id === course)) throw Error('這個年級沒有這條航線');
  return { version: 1, island: island.id, element: island.element };
}
export const islandArt = (id: SubjectIslandId) => `/assets/subject-islands/${id}.webp?v=${SUBJECT_ISLAND_ART_VERSION}`;
