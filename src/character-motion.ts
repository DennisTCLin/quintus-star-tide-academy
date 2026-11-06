/** Presentation only: never derive or change gameplay health, ownership or rewards. */
export type PortraitPose = 'idle' | 'selected' | 'greet' | 'reveal' | 'victory' | 'rest' | 'defeated' | 'locked' | 'attack' | 'hit';
export type PortraitMotion = 'breathe' | 'stride' | 'hop' | 'crawl' | 'flutter' | 'swim' | 'float' | 'sentinel' | 'channel';

export function portraitMotion(id: string, declared?: string): PortraitMotion {
  if (['stride', 'hop', 'crawl', 'flutter', 'swim', 'float'].includes(declared ?? '')) return declared as PortraitMotion;
  if (id.startsWith('hero-')) return /necromancer|druid|blood-elf|undead/.test(id) ? 'channel' : 'sentinel';
  if (/owl|heron|finch|puffin|crane|bird|moth|butterfly|bee|firefly|sparrow|wing|griffin|phoenix/.test(id)) return 'flutter';
  if (/jelly|cloud|nebula|sprite|wisp|spirit/.test(id)) return 'float';
  if (/whale|beluga|dolphin|fish|marlin|seahorse|ray|squid|nautilus|eel|shark/.test(id)) return 'swim';
  if (/frog|rabbit|hare|kangaroo|sailskipper/.test(id)) return 'hop';
  if (/crab|snail|turtle|tortoise|gecko|caterpillar|mantis|myriapod|scorpion|spider/.test(id)) return 'crawl';
  return 'breathe';
}

export function healthPose(hp: number, maxHp: number, selected = false): PortraitPose {
  if (hp <= 0) return 'defeated';
  if (hp < maxHp * .2) return 'rest';
  return selected ? 'selected' : 'idle';
}

// Stable phase offsets keep an entire collection from moving in synchrony.
export function portraitPhase(id: string) {
  let seed = 0;
  for (const ch of id) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  return -(seed % 2400) / 1000;
}
