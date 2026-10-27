import type { IslandMood } from "./island-life";

export type IslandClip = {
  src: string; columns: number; rows: number; frames: number; cell: number;
  seconds: number;
};
export type IslandMotion = {
  facing: 1 | -1;
  anchor?: { x: number; y: number };
  /** Ground distance for one complete filmed walk loop (two strides). */
  walkDistance: number;
  idle: IslandClip; walk?: IslandClip; play?: IslandClip;
};
export type MotionClock = { kind: "idle" | "walk" | "play"; time: number; distance: number };
export const motionClock = (): MotionClock => ({kind:"idle",time:0,distance:0});
export function motionKind(mood: IslandMood, motion: IslandMotion): MotionClock["kind"] {
  return mood === "walk" && motion.walk ? "walk" : (mood === "play" || mood === "hello") && motion.play ? "play" : "idle";
}
export function advanceMotion(clock: MotionClock, kind: MotionClock["kind"], dt: number, distance: number) {
  if (kind !== clock.kind) { clock.kind=kind; clock.time=0; clock.distance=0; }
  clock.time += Math.max(0,Math.min(.1,dt));
  clock.distance += Math.max(0,distance);
}
export function motionFrame(clock: MotionClock, motion: IslandMotion, clip: IslandClip) {
  const phase=clock.kind === "walk" ? clock.distance/motion.walkDistance : clock.time/clip.seconds;
  const raw=Math.floor(phase*clip.frames+1e-9);
  if(clock.kind==="play")return Math.min(clip.frames-1,raw);
  // Quiet breathing/head turns return gently along their original frames.
  if(clock.kind==="idle" && clip.frames>1) {
    const cycle=2*clip.frames-2,frame=raw%cycle;
    return frame<clip.frames?frame:cycle-frame;
  }
  return raw%clip.frames;
}
export function validIslandAtlas(width: number, height: number, clip: IslandClip) {
  return width===clip.columns*clip.cell && height===clip.rows*clip.cell
    && Number.isInteger(clip.frames) && clip.frames>0 && clip.frames<=clip.columns*clip.rows;
}
