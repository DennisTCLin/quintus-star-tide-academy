import * as THREE from 'three';
import { isNpcOwner } from './conquest-enemy';
import { seededRandom, type Tile } from './conquest';
import { point, type IslandHeight } from './conquest-art';
import { ISLAND_WIDTH } from './conquest-scale';

export const NPC_SMOKE_PUFFS = 12;
// One instanced draw for the entire map; no textures, lights or per-frame JS work.
// Sharing the ocean clock inherits pause, visibility and reduced-motion behavior.
export function buildNpcSmoke(tiles: readonly Tile[], heights: ReadonlyMap<string, IslandHeight>, clock: { value: number }) {
  const occupied = tiles.filter(tile => isNpcOwner(tile.owner) && heights.has(tile.id));
  if (!occupied.length) return null;
  const centers: number[] = [], phases: number[] = [], seeds: number[] = [];
  for (const tile of occupied) {
    const random = seededRandom(`dark-tide-smoke:${tile.id}`), p = point(tile), height = heights.get(tile.id)!;
    for (let i = 0; i < NPC_SMOKE_PUFFS; i++) {
      const angle = random() * Math.PI * 2, radius = ISLAND_WIDTH * (.12 + random() * .24);
      centers.push(p.x + Math.cos(angle) * radius, height.top - .25, p.z + Math.sin(angle) * radius);
      phases.push(i / NPC_SMOKE_PUFFS); seeds.push(random() * 20);
    }
  }
  const plane = new THREE.PlaneGeometry(1, 1), geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index; geometry.attributes.position = plane.attributes.position; geometry.attributes.uv = plane.attributes.uv;
  geometry.setAttribute('smokeCenter', new THREE.InstancedBufferAttribute(new Float32Array(centers), 3));
  geometry.setAttribute('smokePhase', new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
  geometry.setAttribute('smokeSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1));
  geometry.instanceCount = phases.length;
  const material = new THREE.ShaderMaterial({
    uniforms: { time: clock }, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    vertexShader: `
      uniform float time; attribute vec3 smokeCenter; attribute float smokePhase; attribute float smokeSeed;
      varying vec2 vUv; varying float vAge; varying float vSeed;
      void main(){
        float age=fract(smokePhase+time*.085); float curl=age*4.8+smokeSeed;
        vec3 center=smokeCenter+vec3(sin(curl)*(.18+age*.45),age*3.3,cos(curl)*(.18+age*.45));
        vec4 viewCenter=modelViewMatrix*vec4(center,1.);
        float size=1.7+age*1.65;
        viewCenter.xy+=position.xy*size;
        gl_Position=projectionMatrix*viewCenter; vUv=uv; vAge=age; vSeed=smokeSeed;
      }`,
    fragmentShader: `
      uniform float time; varying vec2 vUv; varying float vAge; varying float vSeed;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 p=vUv-.5; float n=noise(vUv*5.+vec2(vSeed,time*.12));
        float detail=noise(vUv*11.-vec2(time*.09,vSeed));
        float edge=1.-smoothstep(.16,.49,length(p)+(.5-n)*.13);
        float life=smoothstep(0.,.12,vAge)*(1.-smoothstep(.65,1.,vAge));
        float alpha=edge*life*(.48+n*.28+detail*.12);
        vec3 color=mix(vec3(.018,.009,.029),vec3(.18,.045,.25),n*.65+detail*.2);
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const smoke = new THREE.Mesh(geometry, material);
  smoke.name = 'Dark Tide occupation smoke'; smoke.renderOrder = 2;
  // Shader centers span the chart, so default plane bounds cannot be used.
  smoke.frustumCulled = false;
  smoke.userData.islandIds = occupied.map(tile => tile.id);
  return smoke;
}
