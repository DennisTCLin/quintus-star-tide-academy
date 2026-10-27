export type SpriteClip = {
  src: string;
  columns: number;
  rows: number;
  frames: number;
  cellSize: number;
};
// Generated assets are registered only after checking the returned atlas.
export const BATTLE_SPRITES: Record<string, { idle: SpriteClip; attack: SpriteClip }> = Object.fromEntries(
  [
    ["tideglow", "01767464c8a8", "a48aae4f127b"],
    ["pebblefin", "86a0f2fb8e9c", "b1b20e3e3f03"],
    ["foamferret", "db5932506f58", "a63522edfbfd"],
  ].map(([pet, idle, attack]) => [pet, {
    idle: { src: `/assets/battle/${pet}-idle.webp?v=${idle}`, columns: 6, rows: 4, frames: 24, cellSize: 320 },
    attack: { src: `/assets/battle/${pet}-attack.webp?v=${attack}`, columns: 6, rows: 4, frames: 24, cellSize: 320 },
  }]),
);
export const BATTLE_ARENA = "/assets/battle/star-ocean-arena.webp?v=d5313dbf88a8";
