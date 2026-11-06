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
        vec3 center=smokeCenter+vec3(sin(curl)*(.18+age*.55),age*5.,cos(curl)*(.18+age*.55));
        vec4 viewCenter=modelViewMatrix*vec4(center,1.);
        float size=2.6+age*2.1;
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
        float alpha=edge*life*(.68+n*.25+detail*.12);
        vec3 color=mix(vec3(.008,.006,.018),vec3(.095,.04,.12),n*.65+detail*.2);
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

// The blockade and broken star remain legible when smoke is behind labels or
// motion is reduced. Each layer batches every occupied island into one draw.
export function buildNpcOccupation(tiles: readonly Tile[], heights: ReadonlyMap<string, IslandHeight>, clock: { value: number }) {
  const smoke = buildNpcSmoke(tiles, heights, clock);
  if (!smoke) return null;
  const occupied = tiles.filter(tile => isNpcOwner(tile.owner) && heights.has(tile.id));
  const group = new THREE.Group();
  group.name = 'Dark Tide blockade'; group.userData.islandIds = smoke.userData.islandIds;
  group.add(smoke);
  for (const kind of ['blockade', 'star'] as const) {
    const plane = new THREE.PlaneGeometry(1, 1), geometry = new THREE.InstancedBufferGeometry();
    geometry.index = plane.index; geometry.attributes.position = plane.attributes.position; geometry.attributes.uv = plane.attributes.uv;
    geometry.setAttribute('center', new THREE.InstancedBufferAttribute(new Float32Array(occupied.flatMap(tile => {
      const p = point(tile); return [p.x, kind === 'star' ? heights.get(tile.id)!.top + 2.6 : .22, p.z];
    })), 3));
    geometry.instanceCount = occupied.length;
    const material = new THREE.ShaderMaterial({
      uniforms: { time: clock, width: { value: ISLAND_WIDTH * 1.4 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
      vertexShader: `attribute vec3 center; varying vec2 vUv; uniform float width;
        void main(){vUv=uv;
        ${kind === 'blockade' ? 'vec4 p=modelViewMatrix*vec4(center+vec3(position.x*width,0.,position.y*width),1.);' : 'vec4 p=modelViewMatrix*vec4(center,1.);p.x+=2.9;p.xy+=position.xy*2.3;'}
        gl_Position=projectionMatrix*p;}`,
      fragmentShader: kind === 'blockade' ? `
        uniform float time; varying vec2 vUv;
        void main(){
          vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);
          float band=smoothstep(.73,.78,r)*(1.-smoothstep(.89,.94,r));
          float rim=smoothstep(.77,.79,r)*(1.-smoothstep(.82,.84,r));
          float breaks=step(.16,fract(a*6./6.2831853+time*.015));
          float teeth=step(.8,cos(a*12.)) * smoothstep(.65,.7,r)*(1.-smoothstep(.84,.88,r));
          float light=max(rim*breaks,teeth);
          float tide=(1.-smoothstep(.85,.97,r))*.28;
          float breath=.85+.15*sin(time*1.2);
          gl_FragColor=vec4(mix(vec3(.025,.009,.045),vec3(1.,.19,.08)*breath,light),max(tide,max(band*.9,light)));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` : `
        varying vec2 vUv;
        void main(){
          vec2 p=(vUv-.5)*2.;float d=abs(p.x)+abs(p.y);
          float plate=1.-smoothstep(.78,.84,d);
          float rim=smoothstep(.69,.73,d)*plate;
          float star=1.-smoothstep(.66,.7,pow(abs(p.x),.55)+pow(abs(p.y),.55));
          float crack=1.-smoothstep(.035,.065,abs(p.x-.13*sin(p.y*13.)));
          vec3 color=mix(vec3(.018,.008,.025),vec3(1.,.34,.13),rim);
          color=mix(color,vec3(1.,.78,.42),star*(1.-crack));
          gl_FragColor=vec4(color,plate*.96);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Dark Tide ${kind}`; mesh.frustumCulled = false; mesh.renderOrder = kind === 'star' ? 3 : 1;
    group.add(mesh);
  }
  return group;
}
