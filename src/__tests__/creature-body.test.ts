import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { ROSTER } from '../game-view';
import { MONSTER_CATALOG } from '../monsters';
import { CREATURE_BODIES, alphaBounds, creatureBattleSpan, creatureBody, fittedArtSize, formationOffsets, sizeOrderedOffsets, FULL_ART } from '../creature-body';
import { fitCharacter, fitCameraToPoints } from '../conquest-body-fit';
import { figureSpan } from '../conquest-scale';

describe('species body specifications and presentation', () => {
  it('explicitly covers every companion and monster with positive physical dimensions', () => {
    expect(Object.keys(CREATURE_BODIES).sort()).toEqual(ROSTER.map(pet => pet.id).sort());
    for (const pet of ROSTER) {
      const body = creatureBody(pet.id);
      expect(body, pet.id).toBeDefined();
      for (const value of Object.values(body)) expect(Number.isFinite(value) && value > 0, pet.id).toBe(true);
    }
    for (const monster of MONSTER_CATALOG) expect(creatureBody(monster.id)).toEqual(creatureBody(ROSTER.find(pet => pet.id === monster.id)!.id));
  });
  it('gives small insects, foxes, dragons and giant whales visibly distinct spans', () => {
    const ordered = ['w3-harphummingbird', 'moth-scout-metal', 'tideglow', 'aetherdragon', 'wave4-metal-02', 'w5-abyssfirmament'].map(creatureBattleSpan);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    expect(ordered.at(-1)! / ordered[0]).toBeGreaterThan(4);
    expect(creatureBody('moth-scout-metal').massKg).toBeLessThan(creatureBody('tideglow').massKg);
    expect(creatureBody('wave4-metal-02').massKg).toBeGreaterThan(1000);
    expect(new Set(ROSTER.map(pet => creatureBattleSpan(pet.id))).size).toBeGreaterThan(70);
  });
  it('fits the visible silhouette equally despite extra transparent image padding', () => {
    const rectangle = (w: number, h: number, left: number, top: number) => {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let y = top; y < top + 40; y++) for (let x = left; x < left + 20; x++) data[(y * w + x) * 4 + 3] = 255;
      return alphaBounds(data, w, h);
    };
    expect(fittedArtSize(80, 80, rectangle(80,80,30,20), 1)).toEqual(fittedArtSize(160,120,rectangle(160,120,70,40),1));
    expect(alphaBounds(new Uint8Array(16),2,2)).toEqual(FULL_ART);
    expect(alphaBounds(new Uint8Array(16).fill(255),2,2)).toEqual(FULL_ART);
  });
  it('preserves model axis ratios and anchors the fitted feet at zero', () => {
    const group = new T.Group(), mesh = new T.Mesh(new T.BoxGeometry(4,2,1),new T.MeshBasicMaterial());
    mesh.position.set(2,5,-3); group.add(mesh);
    const size = fitCharacter(group, 'aetherdragon');
    group.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(group);
    expect(size.width / size.height).toBeCloseTo(2);
    expect(size.width / size.depth).toBeCloseTo(4);
    expect(size.width).toBeCloseTo(figureSpan('aetherdragon'));
    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.getCenter(new T.Vector3()).x).toBeCloseTo(0);
    expect(bounds.getCenter(new T.Vector3()).z).toBeCloseTo(0);
    mesh.geometry.dispose(); mesh.material.dispose();
  });
  it('keeps a gap between all mixed and maximum-size formation slots', () => {
    for (const spans of [[.35,.7,1.6,.5,2.2],Array(5).fill(2.35)]) {
      const positions = formationOffsets(spans);
      for (let i=1;i<spans.length;i++) expect(positions[i]-positions[i-1]-(spans[i]+spans[i-1])/2).toBeCloseTo(.22);
      expect(positions[0]-spans[0]/2).toBeCloseTo(-(positions.at(-1)!+spans.at(-1)!/2));
    }
    expect(formationOffsets([])).toEqual([]);
  });
  it('stages larger silhouettes behind smaller ones without changing roster identity', () => {
    const spans = [.4, 1.8, .7, 1.2, .3], slots = sizeOrderedOffsets(spans);
    const order = slots.map((z, index) => ({ z, index })).sort((a,b) => a.z-b.z);
    expect(order.map(item => item.index)).toEqual([1,3,2,0,4]);
    for (let i=1;i<order.length;i++) expect(order[i].z-order[i-1].z).toBeGreaterThan((spans[order[i].index]+spans[order[i-1].index])/2);
  });
  it('keeps the full giant formation and labels inside desktop/mobile cinematic frames', () => {
    for (const aspect of [1.67, .55, 1.15]) {
      const camera = new T.PerspectiveCamera(39, aspect, .1, 100), target = new T.Vector3(0,1,0);
      camera.position.set(1,3.5,6.3);
      const points = [-6,6].flatMap(x => [-4,4].flatMap(z => [0,3].map(y => new T.Vector3(x,y,z))));
      fitCameraToPoints(camera,target,points);
      for (const point of points) {
        const projected=point.clone().project(camera);
        expect(Math.abs(projected.x)).toBeLessThanOrEqual(1/1.12+.001);
        expect(Math.abs(projected.y)).toBeLessThanOrEqual(1/1.12+.001);
      }
    }
  });
});
