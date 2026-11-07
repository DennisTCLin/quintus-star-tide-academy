import * as THREE from 'three';
import { isNpcOwner } from './conquest-enemy';
import { seededRandom, type Tile } from './conquest';
import { point, type IslandHeight } from './conquest-art';
import { ISLAND_WIDTH } from './conquest-scale';

export const NPC_SMOKE_LAYERS = 1;
export const NPC_SMOKE_ATLAS = { url: '/assets/conquest/fx/dark-tide-smoke-v2.webp', frames: 48, columns: 8, rows: 6, frameWidth: 512, frameHeight: 288, duration: 7.2 } as const;

// One atlas per mounted chart, shared by all islands. The scene owns disposal;
// rebuilding ownership meshes must not dispose their shared uniform texture.
export async function loadNpcSmokeAtlas() {
  const texture = await new THREE.TextureLoader().loadAsync(NPC_SMOKE_ATLAS.url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.name = 'Dark Tide reference smoke atlas';
  return texture;
}

// One detailed camera-facing plume per island, in one instanced draw. The
// supplied animation already rises and curls: don't move/reset entire quads.
export function buildNpcSmoke(tiles: readonly Tile[], heights: ReadonlyMap<string, IslandHeight>, clock: { value: number }, atlas: THREE.Texture) {
  const occupied = tiles.filter(tile => isNpcOwner(tile.owner) && heights.has(tile.id));
  if (!occupied.length) return null;
  const centers: number[] = [], phases: number[] = [];
  for (const tile of occupied) {
    const random = seededRandom(`dark-tide-smoke:${tile.id}`), p = point(tile), height = heights.get(tile.id)!;
    centers.push(p.x, height.ground + .8, p.z);
    phases.push(random());
  }
  const plane = new THREE.PlaneGeometry(1, 1), geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index; geometry.attributes.position = plane.attributes.position; geometry.attributes.uv = plane.attributes.uv;
  geometry.setAttribute('smokeCenter', new THREE.InstancedBufferAttribute(new Float32Array(centers), 3));
  geometry.setAttribute('smokePhase', new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
  geometry.instanceCount = phases.length;
  const material = new THREE.ShaderMaterial({
    uniforms: { time: clock, atlas: { value: atlas } }, toneMapped: false, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    vertexShader: `
      attribute vec3 smokeCenter; attribute float smokePhase;
      varying vec2 vUv; varying float vPhase;
      void main(){
        vec4 viewCenter=modelViewMatrix*vec4(smokeCenter,1.);
        viewCenter.z+=1.1;
        viewCenter.xy+=vec2(position.x*6.4,(position.y+.5)*7.2);
        gl_Position=projectionMatrix*viewCenter; vUv=uv; vPhase=smokePhase;
      }`,
    fragmentShader: `
      uniform float time; uniform sampler2D atlas;
      varying vec2 vUv; varying float vPhase;
      vec4 frame(float index,vec2 uv){
        // TextureLoader flips the image vertically. Index zero is the top-left
        // frame; sample pixel centers so linear filtering cannot cross cells.
        vec2 cell=vec2(mod(index,8.),5.-floor(index/8.));
        vec2 pixel=vec2(.5)+uv*(vec2(512.,288.)-1.);
        return texture2D(atlas,(cell*vec2(512.,288.)+pixel)/vec2(4096.,1728.));
      }
      void main(){
        float index=fract(time*1.7/7.2+vPhase)*48.;
        vec2 uv=vec2(.325+vUv.x*.35,vUv.y*.65);
        vec4 a=frame(floor(index),uv),b=frame(mod(floor(index)+1.,48.),uv);
        // Blend in premultiplied space, then return straight alpha: faint wisps
        // keep their color instead of fading through black between frames.
        float alpha=mix(a.a,b.a,fract(index));
        vec3 color=mix(a.rgb*a.a,b.rgb*b.a,fract(index))/max(alpha,.0001);
        float edge=smoothstep(0.,.13,vUv.x)*(1.-smoothstep(.87,1.,vUv.x));
        float base=smoothstep(0.,.04,vUv.y)*(1.-smoothstep(.9,1.,vUv.y));
        // Daylight reveals the original charcoal ridges while retaining black cores.
        gl_FragColor=vec4(color*2.8,alpha*edge*base);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const smoke = new THREE.Mesh(geometry, material);
  smoke.name = 'Dark Tide reference smoke'; smoke.renderOrder = 2;
  smoke.frustumCulled = false;
  smoke.userData.islandIds = occupied.map(tile => tile.id);
  return smoke;
}

// The blockade and broken star remain legible when smoke is behind labels or
// motion is reduced. Each layer batches every occupied island into one draw.
export function buildNpcOccupation(tiles: readonly Tile[], heights: ReadonlyMap<string, IslandHeight>, clock: { value: number }, atlas: THREE.Texture | null = null) {
  const occupied = tiles.filter(tile => isNpcOwner(tile.owner) && heights.has(tile.id));
  if (!occupied.length) return null;
  const group = new THREE.Group();
  group.name = 'Dark Tide blockade'; group.userData.islandIds = occupied.map(tile => tile.id);
  const smoke = atlas ? buildNpcSmoke(tiles, heights, clock, atlas) : null;
  if (smoke) group.add(smoke);
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
