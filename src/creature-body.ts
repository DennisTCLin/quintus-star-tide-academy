import bodies from './data/creature-bodies.json';

/** Authored Star Tide species specifications, not measurements of real animals.
 * Length includes the tail; width is the widest natural spread (wings/fins included);
 * height includes horns/crowns, excludes floating light and magical effects.
 * These are species traits, independent of rarity, level, ownership and combat stats.
 */
export type CreatureBody = { lengthM: number; widthM: number; heightM: number; massKg: number };
export const CREATURE_BODIES: Readonly<Record<string, Readonly<CreatureBody>>> = bodies;
export const creatureBody = (id: string) => CREATURE_BODIES[id];
export const bodyExtent = (body: CreatureBody) => Math.max(body.lengthM, body.widthM, body.heightM);
export function bodySizeName(body: CreatureBody) {
  const extent = bodyExtent(body);
  return extent < .5 ? '微型' : extent < 1.2 ? '小型' : extent < 3 ? '中型' : extent < 7 ? '大型' : '巨型';
}
/** Continuous, monotone readability compression: tiny species remain visible,
 * giants remain larger without filling the island. Never stretches artwork axes.
 */
export function creatureBattleSpan(id: string) {
  const body = creatureBody(id);
  return body ? .25 + 2.1 * bodyExtent(body) / (bodyExtent(body) + 3.2) : .7;
}
export const creatureStageScale = (id: string) => creatureBattleSpan(id) / 2.35;

export type ArtBounds = { x: number; y: number; width: number; height: number };
export const FULL_ART: ArtBounds = { x: 0, y: 0, width: 1, height: 1 };
/** Ignore almost-transparent glow; keep a two-pixel guard around the silhouette. */
export function alphaBounds(pixels: ArrayLike<number>, width: number, height: number): ArtBounds {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return FULL_ART;
  left = Math.max(0, left - 2); top = Math.max(0, top - 2);
  right = Math.min(width, right + 3); bottom = Math.min(height, bottom + 3);
  return { x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height };
}
export function fittedArtSize(width: number, height: number, bounds: ArtBounds, span: number) {
  const w = Math.max(1e-6, width * bounds.width), h = Math.max(1e-6, height * bounds.height);
  const scale = span / Math.max(w, h);
  return { width: w * scale, height: h * scale };
}
/** Centered positions with a minimum gap, shared by staging and victory poses. */
export function formationOffsets(spans: readonly number[], gap = .22) {
  const positions: number[] = [];
  for (let i = 0; i < spans.length; i++) positions.push(i ? positions[i - 1] + (spans[i - 1] + spans[i]) / 2 + gap : 0);
  const center = positions.length ? (positions[0] - spans[0] / 2 + positions.at(-1)! + spans.at(-1)! / 2) / 2 : 0;
  return positions.map(position => position - center);
}

/** Taller silhouettes stand at the back so they do not hide tiny teammates.
 * Returned positions retain the original roster/attack order.
 */
export function sizeOrderedOffsets(spans: readonly number[]) {
  const order = spans.map((span, index) => ({ span, index })).sort((a, b) => b.span - a.span || a.index - b.index);
  const slots = formationOffsets(order.map(item => item.span));
  const result = Array<number>(spans.length);
  order.forEach((item, index) => { result[item.index] = slots[index]; });
  return result;
}
