import * as T from 'three';
import { type Element, seededRandom } from './conquest';

export type ElementMaterial = 'rock' | 'stone' | 'metal' | 'gold' | 'leaf' | 'vine' | 'water' | 'ice' | 'basalt' | 'lava' | 'amber' | 'earth';
export type ElementPlacement = { geometry: T.BufferGeometry; material: ElementMaterial; position: T.Vector3; rotation: T.Euler; scale: T.Vector3 };
export const ELEMENT_MATERIALS: Record<Exclude<ElementMaterial, 'rock' | 'stone'>, T.MeshStandardMaterialParameters> = {
  metal: { color: '#b2c3bb', metalness: .65, roughness: .4 }, gold: { color: '#d6ae50', metalness: .65, roughness: .4, emissive: '#b5862b', emissiveIntensity: .12 },
  leaf: { color: '#5d9255', roughness: .85, side: T.DoubleSide }, vine: { color: '#425d35', roughness: .9 },
  water: { color: '#168b9a', metalness: .3, roughness: .2 }, ice: { color: '#81cfe0', roughness: .28, emissive: '#45a9c5', emissiveIntensity: .3 },
  basalt: { color: '#494946', roughness: .95 }, lava: { color: '#e8a146', emissive: '#f56e28', emissiveIntensity: .85, roughness: .7 },
  amber: { color: '#cda957', emissive: '#bd7f20', emissiveIntensity: .24, roughness: .38 }, earth: { color: '#967d56', roughness: 1 },
};
export function elementPartMatrix(part: ElementPlacement, origin: T.Vector3, yaw: number) {
  return new T.Matrix4().makeTranslation(origin.x, origin.y, origin.z)
    .multiply(new T.Matrix4().makeRotationY(yaw))
    .multiply(new T.Matrix4().compose(part.position, new T.Quaternion().setFromEuler(part.rotation), part.scale));
}
// Small authored outcrops complement the original textured cliffs. Both chart and
// close-up use this vocabulary; all chart geometry is merged into material batches.
export function elementScenery(element: Element, seed: string, emit: (part: ElementPlacement) => void) {
  const random = seededRandom(`element-art-v1:${seed}`);
  const add = (geometry: T.BufferGeometry, material: ElementMaterial, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => emit({ geometry, material, position: new T.Vector3(x, y, z), scale: new T.Vector3(sx, sy, sz), rotation: new T.Euler(rx, ry, rz) });
  const rock = (x: number, z: number, h: number, material: ElementMaterial = 'rock') => add(new T.IcosahedronGeometry(.24, 1), material, x, h * .25, z, 1.1, h * 2, .85, .12, random() * 6, .1);
  const crystal = (x: number, z: number, h: number, material: ElementMaterial) => {
    add(new T.CylinderGeometry(.07, .12, h * .7, 5), material, x, .1 + h * .35, z, 1, 1, 1, 0, random() * 6, .14);
    add(new T.ConeGeometry(.07, h * .3, 5), material, x - h * .05, .1 + h * .85, z, 1, 1, 1, 0, 0, .14);
  };
  const vein = (points: number[][], material: ElementMaterial, radius: number) => add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p as [number, number, number]))), 14, radius, 5, false), material, 0, 0, 0);
  if (element === 'metal') {
    for (let i = 0; i < 6; i++) { const a = i * 2.4; rock(Math.cos(a) * .4, Math.sin(a) * .35, .4 + random() * .3); crystal(Math.cos(a) * .35, Math.sin(a) * .3, .28 + random() * .4, i % 2 ? 'gold' : 'metal'); }
    add(new T.BoxGeometry(.18, .72, .2), 'stone', -.48, .36, -.22, 1, 1, 1, 0, .2, -.12);
    add(new T.BoxGeometry(.18, .58, .2), 'stone', .28, .29, -.22, 1, 1, 1, 0, -.15, .12);
    add(new T.BoxGeometry(.88, .13, .24), 'metal', -.1, .67, -.22, 1, 1, 1, 0, 0, -.12);
    vein([[-.5,.13,.35],[-.2,.24,.15],[.1,.22,.3],[.5,.12,.15]], 'gold', .018);
  } else if (element === 'wood') {
    rock(0, 0, .65); rock(.4, .2, .35);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1, points = Array.from({ length: 8 }, (_, k) => { const b = a + k * .55; return [Math.cos(b) * (.26 + k * .018), .06 + k * .085, Math.sin(b) * .25]; });
      vein(points, 'vine', .022);
      points.filter((_,k) => k % 2).forEach(([x,y,z],k) => { add(new T.SphereGeometry(.1, 6, 4), 'leaf', x,y,z, 1.7,.12,.65,.2,a+k,.4); });
    }
    for (let i = 0; i < 7; i++) { const a = i * 2.4; crystal(Math.cos(a) * .55, Math.sin(a) * .4, .12 + random() * .12, 'leaf'); }
  } else if (element === 'water') {
    add(new T.CylinderGeometry(.62,.63,.07,24), 'stone',0,.025,0,1,1,.75);
    add(new T.CircleGeometry(.56,32), 'water',0,.064,0,1,.73,1,-Math.PI/2);
    for (let i = 0; i < 3; i++) add(new T.TorusGeometry(.18+i*.11,.006,4,32,Math.PI*1.6), 'ice',0,.069+i*.002,0,1,.75,1,Math.PI/2,0,i);
    for (let i = 0; i < 5; i++) { const a = .2 + i * .6; rock(Math.cos(a)*.5,Math.sin(a)*.4,.35); crystal(Math.cos(a)*.48,Math.sin(a)*.38,.3+random()*.45,'ice'); }
  } else if (element === 'fire') {
    add(new T.CylinderGeometry(.56,.65,.22,9), 'basalt',0,.1,0,1,1,.8);
    add(new T.CircleGeometry(.36,18),'lava',0,.225,0,1,.8,1,-Math.PI/2);
    for (let i = 0; i < 7; i++) { const a=i*2.4; rock(Math.cos(a)*.44,Math.sin(a)*.34,.35+random()*.4,'basalt'); }
    for (let i = 0; i < 3; i++) { const a=i*2.1, points=Array.from({length:5},(_,k)=>[Math.cos(a+k*.24)*k*.12,.23+Math.sin(k)*.01,Math.sin(a+k*.24)*k*.1]); vein(points,'lava',.028); }
    add(new T.IcosahedronGeometry(.13,1),'lava',0,.23,0,1,.4,1);
    for (let i = 0; i < 5; i++) add(new T.OctahedronGeometry(.013),'lava',(random()-.5)*.45,.3+random()*.5,(random()-.5)*.4);
  } else {
    for (let i = 0; i < 5; i++) { const a=i*1.256,h=.42+random()*.35; add(new T.CylinderGeometry(.12,.18,h,6),'stone',Math.cos(a)*.47,h/2,Math.sin(a)*.35,1,1,1,.06,a,.12); }
    rock(0,0,.35,'earth'); crystal(0,0,.65,'amber'); crystal(.2,.12,.35,'amber'); crystal(-.22,-.1,.28,'amber');
    vein([[-.5,.035,.4],[-.15,.055,.48],[.2,.045,.4],[.55,.035,.3]],'earth',.04);
  }
}
