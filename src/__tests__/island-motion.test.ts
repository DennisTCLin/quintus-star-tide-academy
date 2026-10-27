import { describe, expect, it } from "vitest";
import { advanceMotion, motionClock, motionFrame, validIslandAtlas, type IslandMotion } from "../island-motion";
import { createWalkers, createWalkMap, greetWalker, stepWalkers } from "../island-life";
const clip={src:"test",columns:6,rows:8,frames:48,cell:160,seconds:4};
const motion: IslandMotion={facing:1,walkDistance:6,idle:clip,walk:clip,play:clip};
describe("articulated island motion",()=>{
  it("ties walking frames to ground distance, independent of time or refresh rate",()=>{
    const slow=motionClock(),fast=motionClock();
    for(let i=0;i<60;i++)advanceMotion(slow,"walk",1/60,.05);
    for(let i=0;i<30;i++)advanceMotion(fast,"walk",1/30,.1);
    expect(motionFrame(slow,motion,clip)).toBe(motionFrame(fast,motion,clip));
    expect(motionFrame(slow,motion,clip)).toBe(24);
    const frame=motionFrame(slow,motion,clip);advanceMotion(slow,"walk",.1,0);
    expect(motionFrame(slow,motion,clip)).toBe(frame);
  });
  it("uses a bounded clock for idle, resets on state change, and wraps without atlas bleed",()=>{
    const clock=motionClock();advanceMotion(clock,"idle",3600,0);expect(clock.time).toBe(.1);
    advanceMotion(clock,"play",0,0);expect(clock.time).toBe(0);
    for(let i=0;i<10000;i++){advanceMotion(clock,"play",.1,0);expect(motionFrame(clock,motion,clip)).toBeLessThan(clip.frames);}
    expect(validIslandAtlas(960,1280,clip)).toBe(true);
    expect(validIslandAtlas(960,1279,clip)).toBe(false);
    expect(validIslandAtlas(960,1280,{...clip,frames:49})).toBe(false);
  });
  it("keeps missing or failed animation residents stationary and still greets them",()=>{
    const map=createWalkMap([0]),walkers=createWalkers(["tideglow","cometcrane"],map);
    const stationary={x:walkers[1].x,y:walkers[1].y};
    for(let i=0;i<100;i++)stepWalkers(walkers,map,.1,new Set(["tideglow"]));
    expect({x:walkers[1].x,y:walkers[1].y}).toEqual(stationary);
    greetWalker(walkers[1]);stepWalkers(walkers,map,.1,new Set(["tideglow"]));expect(walkers[1].mood).toBe("hello");
    for(let i=0;i<40;i++)stepWalkers(walkers,map,.1,new Set(["tideglow"]));
    expect(walkers[1].mood).toBe("rest");expect({x:walkers[1].x,y:walkers[1].y}).toEqual(stationary);
  });
});
