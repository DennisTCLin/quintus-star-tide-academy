import { elementScenery, elementPartMatrix, ELEMENT_MATERIALS } from './conquest-element-art';
import { ISLAND_WIDTH, TERRITORY_SCALE, HEX_STEP_X, HEX_STEP_Z } from './conquest-scale';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { adjacent, ELEMENT_COLOR, hexDistance, seededRandom, TERRAINS, type Tile } from './conquest';

export const point = (t: Pick<Tile, 'q' | 'r'>) => new T.Vector3(HEX_STEP_X * (t.q + t.r / 2), 0, t.r * HEX_STEP_Z);
export type IslandHeight = { ground: number; top: number };
export function release(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>(), skeletons = new Set<T.Skeleton>();
  root.traverse(o => {
    if (o instanceof T.InstancedMesh) o.dispose();
    if (o instanceof T.SkinnedMesh) skeletons.add(o.skeleton);
    if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points || o instanceof T.Sprite) {
      if (!(o instanceof T.Sprite)) geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
    }
  });
  materials.forEach(m => { Object.values(m).forEach(v => { if (v instanceof T.Texture) textures.add(v); }); });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); skeletons.forEach(s => s.dispose());
  textures.forEach(t => { if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap) t.image.close(); t.dispose(); });
}

// The original UVs and PBR maps are retained: repeated islands share one draw call.
export async function loadIslandModels() {
  const loader = new GLTFLoader();
  const results = await Promise.allSettled(['island', 'castle', 'mountain', 'desert'].map(name => loader.loadAsync(`/assets/conquest/models/${name}.glb`)));
  if (results.some(r => r.status === 'rejected')) {
    results.forEach(r => { if (r.status === 'fulfilled') release(r.value.scene); });
    throw Error('島嶼模型載入未完成。請重新進入群島，或先使用下方島嶼清單。');
  }
  return results.map(r => (r as PromiseFulfilledResult<Awaited<ReturnType<GLTFLoader['loadAsync']>>>).value.scene);
}

const noiseGLSL = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.27+noise(p*4.13)*.11+noise(p*8.1)*.05;}`;
export function makeOcean(scene: T.Scene, extent = 260) {
  const clock = { value: 0 };
  const ocean = new T.ShaderMaterial({ uniforms: { time: clock }, vertexShader: `varying vec2 vP;varying vec3 vWorld;uniform float time;void main(){vP=position.xy;vec3 p=position;p.z+=sin(p.x*.8+time)*cos(p.y*.6+time*.65)*.025;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`, fragmentShader: `uniform float time;varying vec2 vP;varying vec3 vWorld;${noiseGLSL}
float wave(vec2 p){return fbm(p*2.1+vec2(time*.08,time*.025))*.65+sin(p.x*3.8+p.y*.5+time*.8)*.08+sin(p.y*7.-p.x*.6+time*.7)*.025;}
void main(){vec2 p=vP;float n=fbm(p*.7+vec2(time*.025,time*.016));float w=wave(p);vec3 normal=normalize(vec3((wave(p+vec2(.04,0))-w)*-2.4,1.,(wave(p+vec2(0,.04))-w)*-2.4));vec3 viewDir=normalize(cameraPosition-vWorld);float fresnel=pow(1.-max(0.,dot(normal,viewDir)),3.);vec3 halfDir=normalize(viewDir+normalize(vec3(-.5,.9,.3)));float sunlight=pow(max(0.,dot(normal,halfDir)),150.);float ripples=pow(max(0.,sin(p.y*12.+n*18.+time*.6)),22.)*noise(p*4.);vec3 c=mix(vec3(.004,.048,.093),vec3(.01,.16,.24),n);c=mix(c,vec3(.12,.32,.44),fresnel*.6);c+=vec3(.6,.77,.78)*sunlight*.65+vec3(.07,.12,.13)*ripples*.2;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` });
  const mesh = new T.Mesh(new T.PlaneGeometry(extent, extent, 160, 160), ocean); mesh.rotation.x = -Math.PI / 2; mesh.position.y = -.06; scene.add(mesh);
  return clock;
}

// World-space fog surrounds the playable hexagon; rotating the camera never moves its boundary.
// The clear radius leaves room for the outer islands, docks and selection rings.
export function makeFrontierMist(scene: T.Scene, clock: { value: number }) {
  const group = new T.Group(); group.name = 'Unopened world — frontier mist';
  for (let layer = 0; layer < 3; layer++) {
    const material = new T.ShaderMaterial({
      uniforms: { time: clock, layer: { value: layer } },
      transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: `varying vec2 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `uniform float time;uniform float layer;varying vec2 world;${noiseGLSL}
void main(){
  float r=world.y/${HEX_STEP_Z.toFixed(8)};float q=world.x/${HEX_STEP_X.toFixed(8)}-r*.5;
  float edge=max(max(abs(q),abs(r)),abs(q+r));
  vec2 drift=vec2(time*.025,-time*.017);
  float broad=fbm(world*.18+drift+layer*3.7);
  float wisps=fbm(world*.61-drift*.7+vec2(broad*2.,layer));
  float clear=5.65+layer*.23;
  float bank=smoothstep(clear,clear+1.05,edge+(broad-.5)*.34);
  float cloud=smoothstep(.2,.82,broad*.65+wisps*.35);
  float alpha=layer<.5 ? bank*.97 : bank*(.13+cloud*.29);
  vec3 shadow=vec3(.028,.06,.09);vec3 silver=vec3(.29,.37,.41);
  vec3 color=mix(shadow,silver,cloud*.8+layer*.06);
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    });
    const fog = new T.Mesh(new T.PlaneGeometry(1800, 1800), material);
    fog.rotation.x = -Math.PI / 2; fog.position.y = .08 + layer * .65;
    fog.renderOrder = 3 + layer; fog.name = `Frontier mist layer ${layer}`;
    group.add(fog);
  }
  scene.add(group);
}

export function islandSurfaceTexture(kind: 'rock' | 'stone' | 'roof') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!, random = seededRandom(`texture:${kind}`);
  c.fillStyle = { rock: '#a6a49a', stone: '#e0ceb0', roof: '#b85f35' }[kind]; c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4500; i++) { c.fillStyle = `rgba(${random() > .5 ? '255,255,230' : '31,26,19'},${random() * .16})`; c.fillRect(random() * 128, random() * 128, 1 + random() * 3, 1 + random() * 4); }
  c.strokeStyle = kind === 'roof' ? '#79361c88' : '#4d483c66'; c.lineWidth = kind === 'rock' ? 1.5 : 1;
  for (let row = 0; row < 8; row++) {
    const y = row * 16; c.beginPath(); c.moveTo(0, y); c.lineTo(128, y + (kind === 'rock' ? random() * 9 : 0)); c.stroke();
    for (let col = 0; col < 5; col++) { const x = col * 32 + (row % 2) * 16; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (kind === 'rock' ? 10 : 0), y + 16); c.stroke(); }
  }
  const tex = new T.CanvasTexture(canvas); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; return tex;
}

export function buildArchipelago(scene: T.Scene, tiles: Tile[], models: T.Group[], clock: { value: number }) {
  const group = new T.Group(); scene.add(group);
  const heights = new Map<string, IslandHeight>();
  const rock = new T.MeshStandardMaterial({ map: islandSurfaceTexture('rock'), color: '#b4b4aa', roughness: .95 });
  const stone = new T.MeshStandardMaterial({ map: islandSurfaceTexture('stone'), roughness: .85 });
  const roof = new T.MeshStandardMaterial({ map: islandSurfaceTexture('roof'), roughness: .8 });
  const materials = new Map<string, T.MeshStandardMaterial>();
  const batches = new Map<T.Material, T.BufferGeometry[]>();
  const transform = new T.Object3D();
  const mat = (color: string, glow = false) => {
    const key = color + glow;
    if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness: glow ? .25 : .83, emissive: glow ? color : '#000000', emissiveIntensity: glow ? .7 : 0 }));
    return materials.get(key)!;
  };
  const add = (geo: T.BufferGeometry, material: string | T.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.rotation.set(rx, ry, rz); transform.updateMatrix();
    const raw = geo.index ? geo.toNonIndexed() : geo; raw.applyMatrix4(transform.matrix);
    if (!raw.getAttribute('normal')) raw.computeVertexNormals();
    if (!raw.getAttribute('uv')) raw.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(raw.getAttribute('position').count * 2), 2));
    const materialObject = typeof material === 'string' ? mat(material) : material;
    const batch = batches.get(materialObject) ?? []; batch.push(raw); batches.set(materialObject, batch);
    if (raw !== geo) geo.dispose();
  };
  const box = (x: number, y: number, z: number) => new T.BoxGeometry(x, y, z);
  const cyl = (a: number, b: number, h: number, sides = 12) => new T.CylinderGeometry(a, b, h, sides);
  const blob = (r: number, detail = 1) => new T.IcosahedronGeometry(r, detail);
  const elementMaterials = { rock, stone, ...Object.fromEntries(Object.entries(ELEMENT_MATERIALS).map(([key, parameters]) => [key, new T.MeshStandardMaterial({ ...parameters, ...(['basalt','earth'].includes(key) ? { map: rock.map } : {}) })])) } as Record<string, T.Material>;
  const modelInfo = models.map((model, modelIndex) => {
    model.updateMatrixWorld(true);
    const bound = new T.Box3().setFromObject(model), size = bound.getSize(new T.Vector3()), center = bound.getCenter(new T.Vector3());
    const scale = ISLAND_WIDTH / Math.max(size.x, size.z);
    const normalization = new T.Matrix4().makeScale(scale, scale, scale).multiply(new T.Matrix4().makeTranslation(-center.x, -bound.min.y, -center.z));
    const probe = new T.Raycaster(), candidates: T.Vector3[] = [];
    const probes = modelIndex === 2 ? Array.from({ length: 9 }, (_, i) => new T.Vector3(center.x + (i ? Math.cos(i * Math.PI / 4) * size.x * .25 : 0), bound.max.y + 1, center.z + (i ? Math.sin(i * Math.PI / 4) * size.z * .25 : 0))) : [new T.Vector3(center.x, bound.max.y + 1, center.z)];
    for (const origin of probes) { probe.set(origin, new T.Vector3(0, -1, 0)); const hit = probe.intersectObject(model, true)[0]; if (hit) candidates.push(hit.point); }
    candidates.sort((a, b) => a.y - b.y);
    const site = candidates[0] ?? new T.Vector3(center.x, bound.min.y + size.y * .45, center.z);
    // Probe a real surface beside each landmark once per GLB, before instancing.
    const offset = modelIndex === 1 ? new T.Vector3(size.x * .23, 0, size.z * .18) : new T.Vector3(.85 / scale, 0, .65 / scale);
    const origin = site.clone().add(offset); origin.y = bound.max.y + 1;
    probe.set(origin, new T.Vector3(0, -1, 0));
    const hits = probe.intersectObject(model, true);
    const ground = hits.find(h => h.point.y <= site.y + .35 / scale && h.point.y > bound.min.y + .1 / scale) ?? hits[0];
    const elementSite = (ground?.point ?? site).clone().applyMatrix4(normalization);
    return { elementSite, normalization, site: new T.Vector3((site.x - center.x) * scale, (site.y - bound.min.y) * scale, (site.z - center.z) * scale), top: size.y * scale, matrices: [] as T.Matrix4[] };
  });
  // Reuse the textured canopy geometry from the Higgsfield island, rather than primitive tree blobs.
  const canopyParts: { geometry: T.BufferGeometry; material: T.Material | T.Material[] }[] = [];
  models[0].traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    const source = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    source.applyMatrix4(modelInfo[0].normalization.clone().multiply(o.matrixWorld));
    const positions = source.getAttribute('position'), kept: number[] = [];
    const floor = modelInfo[0].site.y + .2;
    for (let i = 0; i < positions.count; i += 3) if ([0, 1, 2].every(j => positions.getY(i + j) > floor)) kept.push(i, i + 1, i + 2);
    if (kept.length) {
      const geometry = new T.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) {
        const attr = source.getAttribute(name); if (!attr) continue;
        const values = new Float32Array(kept.length * attr.itemSize);
        kept.forEach((index, n) => { for (let j = 0; j < attr.itemSize; j++) values[n * attr.itemSize + j] = attr.array[index * attr.itemSize + j]; });
        geometry.setAttribute(name, new T.BufferAttribute(values, attr.itemSize));
      }
      geometry.translate(0, -floor, 0); canopyParts.push({ geometry, material: o.material });
    }
    source.dispose();
  });
  const canopyMatrices: T.Matrix4[] = [];
  const shores = new T.InstancedMesh(new T.PlaneGeometry(5 * TERRITORY_SCALE, 5 * TERRITORY_SCALE), new T.ShaderMaterial({
    uniforms: { time: clock }, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv;varying float seed;void main(){vUv=uv;seed=instanceMatrix[3].x+instanceMatrix[3].z;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;varying float seed;uniform float time;${noiseGLSL}
void main(){vec2 p=(vUv-.5)*5.;float a=atan(p.y,p.x);float edge=1.35+.12*sin(a*5.+seed)+.065*sin(a*9.-seed);float d=length(p);float shallow=(1.-smoothstep(edge,edge+.65,d));float wave=sin((d-edge)*26.-time*1.6+fbm(p*5.)*7.);float foam=smoothstep(.66,.98,wave)*smoothstep(edge-.12,edge+.08,d)*(1.-smoothstep(edge+.15,edge+.38,d));float caustic=pow(1.-abs(sin(p.x*10.+sin(p.y*8.))*sin(p.y*9.+time*.2)),18.);vec3 c=mix(vec3(.02,.53,.56),vec3(.17,.8,.73),shallow*.4)+caustic*.08;c=mix(c,vec3(.82,.96,.87),foam*.8);gl_FragColor=vec4(c,shallow*.66);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`
  }), tiles.length);
  group.add(shores);
  const waterfallMaterial = new T.ShaderMaterial({ uniforms: { time: clock }, transparent: true, side: T.DoubleSide, depthWrite: false, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: `uniform float time;varying vec2 vUv;${noiseGLSL}void main(){float n=fbm(vec2(vUv.x*14.,vUv.y*8.+time*2.));float edge=smoothstep(0.,.16,vUv.x)*(1.-smoothstep(.84,1.,vUv.x));gl_FragColor=vec4(mix(vec3(.12,.61,.69),vec3(.88,.99,1.),n),edge*.82);}` });

  tiles.forEach((t, index) => {
    const p = point(t), random = seededRandom(`scenery-v2:${t.id}:${t.terrain}`);
    let x = p.x, z = p.z;
    const variation = .9 + random() * .18, yaw = random() * Math.PI * 2;
    const modelIndex = t.facility === 'castle' ? 1 : t.terrain === 'mountain' ? 2 : t.terrain === 'desert' ? 3 : 0;
    const info = modelInfo[modelIndex], stretch = t.terrain === 'forest' && modelIndex === 0 ? 1.2 : 1;
    transform.position.set(x, -.05, z); transform.scale.set(variation, variation * stretch, variation); transform.rotation.set(0, yaw, 0); transform.updateMatrix();
    info.matrices.push(transform.matrix.clone().multiply(info.normalization));
    const site = info.site.clone().multiplyScalar(variation); site.y *= stretch; site.applyAxisAngle(new T.Vector3(0, 1, 0), yaw);
    let y = site.y - .05, top = info.top * variation * stretch - .05;
    transform.position.set(x, .005, z); transform.rotation.set(-Math.PI / 2, 0, yaw); transform.scale.setScalar(variation); transform.updateMatrix(); shores.setMatrixAt(index, transform.matrix);
    if (modelIndex === 2 && t.facility) { x += site.x; z += site.z; add(cyl(.54, .64, .22), stone, x, y, z); y += .11; }
    if (t.facility === 'castle') y = top * .27;
    if (t.terrain === 'forest' && t.facility !== 'castle') for (let k = 0; k < 2; k++) {
      transform.position.set(x + (k ? .35 : -.3) * TERRITORY_SCALE, y, z + (k ? .25 : -.2) * TERRITORY_SCALE); transform.rotation.set(0, yaw + k * 2, 0); transform.scale.set(.7, .95 + k * .2, .7); transform.updateMatrix(); canopyMatrices.push(transform.matrix.clone());
    }

    if (t.terrain === 'river' && t.facility !== 'castle') {
      const pool = new T.Shape();
      for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, radius = .52 + Math.sin(a * 3 + yaw) * .08 + Math.sin(a * 7) * .04; const px = Math.cos(a) * radius, py = Math.sin(a) * radius; if (i === 0) pool.moveTo(px, py); else pool.lineTo(px, py); }
      add(new T.ShapeGeometry(pool), '#087f9b', x, y + .03, z, 1, 1, 1, -Math.PI / 2);
      add(box(.27, .018, 1.3 * TERRITORY_SCALE), '#2aafbd', x + .18, y + .025, z + .65 * TERRITORY_SCALE);
      for (let k = 0; k < 3; k++) add(new T.TorusGeometry(.15 + k * .1, .008, 4, 24, Math.PI * 1.1), '#53c1c6', x - .07, y + .037, z + .02, 1, 1, 1, Math.PI / 2, 0, yaw);
      const fall = new T.Mesh(new T.PlaneGeometry(.38, y + .12, 4, 10), waterfallMaterial); fall.position.set(x + .18, y / 2, z + 1.38 * TERRITORY_SCALE); group.add(fall);
      add(new T.TorusGeometry(.24, .035, 5, 24), '#a7e2dc', x + .18, .04, z + 1.42 * TERRITORY_SCALE, 1, 1, 1, Math.PI / 2);
    }
    // Landmarks are scaled to remain identifiable from the overview, with actual doors, roofs and columns.
    if (t.facility === 'tower') {
      add(cyl(.48, .62, .16), stone, x, y + .08, z);
      add(cyl(.29, .39, 1.4), stone, x, y + .85, z);
      for (let k = 0; k < 3; k++) add(cyl(.36, .37, .09), stone, x, y + .22 + k * .55, z);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; add(box(.15, .2, .16), stone, x + Math.cos(a) * .32, y + 1.65, z + Math.sin(a) * .32, 1, 1, 1, 0, -a); }
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; add(box(.09, .26, .025), '#243d40', x + Math.sin(a) * .315, y + 1.1, z + Math.cos(a) * .315, 1, 1, 1, 0, a); }
      add(cyl(.015, .018, .7), '#ad8543', x, y + 1.95, z); add(box(.4, .2, .02), '#d9903d', x + .2, y + 2.2, z); top = Math.max(top, y + 2.3);
    } else if (t.facility === 'knowledge') {
      for (let k = 0; k < 3; k++) add(box(1.3 - k * .1, .1, 1.1 - k * .1), stone, x, y + .05 + k * .1, z);
      add(box(.82, .75, .54), '#dcdac4', x, y + .65, z - .12);
      for (const dx of [-.46, 0, .46]) for (const dz of [-.3, .32]) { add(cyl(.065, .085, .85), stone, x + dx, y + .73, z + dz); add(box(.2, .07, .2), stone, x + dx, y + 1.17, z + dz); }
      add(new T.ConeGeometry(.89, .48, 4), roof, x, y + 1.43, z, 1, 1, .85, 0, Math.PI / 4);
      add(new T.SphereGeometry(.26, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#dcbf70', x, y + 1.62, z); top = Math.max(top, y + 1.9);
    } else if (t.facility === 'shrine') {
      const color = ELEMENT_COLOR[t.shrineElement!];
      for (let k = 0; k < 4; k++) add(box(1.15 - k * .08, .08, 1.15 - k * .08), stone, x, y + .04 + k * .08, z);
      for (let k = 0; k < 3; k++) {
        const size = .75 - k * .17, yy = y + .34 + k * .55;
        add(box(size * .75, .4, size * .75), stone, x, yy + .2, z);
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) add(cyl(.035, .04, .44), '#a76c39', x + dx * size * .37, yy + .2, z + dz * size * .37);
        add(new T.ConeGeometry(size * .9, .2, 4), mat(color), x, yy + .5, z, 1, 1, 1, 0, Math.PI / 4);
        add(cyl(size * .64, size * .64, .045, 4), '#d5a551', x, yy + .4, z, 1, 1, 1, 0, Math.PI / 4);
      }
      add(new T.OctahedronGeometry(.19), mat(color, true), x, y + 2.28, z, .8, 1.8, .8); top = Math.max(top, y + 2.7);
    } else if (t.facility === 'resource') {
      add(blob(.62), rock, x, y + .18, z, 1, .5, 1);
      for (let k = 0; k < 7; k++) {
        const a = k * 2.4, h = k === 0 ? 1.5 : .5 + random() * .65, px = x + Math.cos(a) * .5, pz = z + Math.sin(a) * .4;
        add(cyl(.13, .18, h * .7, 6), mat(k % 2 ? '#8244ca' : '#73d5ed', true), px, y + h * .36, pz, 1, 1, 1, .12 * Math.sin(a), a, .13 * Math.cos(a));
        add(new T.ConeGeometry(.13, h * .32, 6), mat(k % 2 ? '#c18aff' : '#b7f6ff', true), px, y + h * .86, pz);
      }
      top = Math.max(top, y + 1.65);
    }
    if (t.facility !== 'castle' && t.facility) {
      for (let k = 0; k < 7; k++) add(box(.42, .035, .11), '#a67b45', x + .7 * TERRITORY_SCALE, .22, z + 1.05 * TERRITORY_SCALE + k * .12);
      for (const dx of [-.23, .23]) for (const dz of [.05, .65]) add(cyl(.035, .04, .4), '#70573a', x + .7 * TERRITORY_SCALE + dx, .14, z + 1.05 * TERRITORY_SCALE + dz);
    }
    const elementalSite = info.elementSite.clone().multiply(new T.Vector3(variation, variation * stretch, variation)).applyAxisAngle(new T.Vector3(0,1,0), yaw).add(new T.Vector3(p.x,-.05,p.z));
    elementScenery(t.element, t.id, part => {
      part.geometry.applyMatrix4(elementPartMatrix(part, elementalSite, yaw));
      add(part.geometry, elementMaterials[part.material], 0, 0, 0);
    });
    if (t.element === 'wood' && modelIndex !== 1) {
      transform.position.copy(elementalSite).add(new T.Vector3(-.3, 0, -.25)); transform.rotation.set(0,yaw,0); transform.scale.set(.35,.5,.35); transform.updateMatrix(); canopyMatrices.push(transform.matrix.clone());
    }
    heights.set(t.id, { ground: y, top: Math.max(top, elementalSite.y + .9) });
  });
  modelInfo.forEach((info, i) => {
    models[i].traverse(o => {
      if (!(o instanceof T.Mesh)) return;
      const instanced = new T.InstancedMesh(o.geometry, o.material, info.matrices.length);
      info.matrices.forEach((m, index) => instanced.setMatrixAt(index, m.clone().multiply(o.matrixWorld)));
      if (i === 0 || i === 2) for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        if (material instanceof T.MeshStandardMaterial) {
          material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat grassMask=smoothstep(.025,.14,diffuseColor.g-diffuseColor.b)*smoothstep(-.015,.09,diffuseColor.g-diffuseColor.r); diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.88,1.18,.96),grassMask);'); };
          material.customProgramCacheKey = () => 'conquest-foliage-v2';
        }
      }
      instanced.castShadow = true; instanced.receiveShadow = true; instanced.name = ['Higgsfield cliff islands', 'Higgsfield castle', 'Higgsfield mountain islands', 'Higgsfield desert islands'][i];
      group.add(instanced);
    });
  });
  for (const part of canopyParts) {
    const trees = new T.InstancedMesh(part.geometry, part.material, canopyMatrices.length);
    canopyMatrices.forEach((matrix, index) => trees.setMatrixAt(index, matrix)); trees.castShadow = true; trees.receiveShadow = true; group.add(trees);
  }
  for (const material of Object.values(elementMaterials)) if (!batches.has(material)) material.dispose();
  for (const [material, geometries] of batches) {
    const combined = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
    const mesh = new T.Mesh(combined, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  // Dispose materials unused by an unusual season without touching shared, live material maps.
  for (const material of [rock, stone, roof, ...materials.values()]) if (!batches.has(material)) { material.map?.dispose(); material.dispose(); }
  const lines: T.Vector3[] = [], boats: T.Group[] = [];
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) if (adjacent(tiles[i], tiles[j])) {
    const a = point(tiles[i]), b = point(tiles[j]), d = b.clone().sub(a).normalize(); a.addScaledVector(d, 1.5 * TERRITORY_SCALE); b.addScaledVector(d, -1.5 * TERRITORY_SCALE); a.y = b.y = .055; lines.push(a, b);
    if ((i * 7 + j) % 27 === 0) {
      const boat = new T.Group();
      const hull = new T.Mesh(new T.SphereGeometry(.2, 10, 6), new T.MeshStandardMaterial({ color: '#714e30', roughness: .9 })); hull.scale.set(1, .55, 2.5); boat.add(hull);
      const deck = new T.Mesh(box(.3, .04, .68), new T.MeshStandardMaterial({ color: '#b99354' })); deck.position.y = .07; boat.add(deck);
      const mast = new T.Mesh(cyl(.017, .022, .85), new T.MeshStandardMaterial({ color: '#8e6a3a' })); mast.position.y = .47; boat.add(mast);
      for (const [yy, width, height] of [[.53, .46, .35], [.83, .31, .22]]) {
        const sailGeo = new T.PlaneGeometry(width, height, 6, 4), pos = sailGeo.getAttribute('position');
        for (let k = 0; k < pos.count; k++) pos.setZ(k, Math.sin((pos.getX(k) / width + .5) * Math.PI) * .12);
        sailGeo.computeVertexNormals(); const sail = new T.Mesh(sailGeo, new T.MeshStandardMaterial({ color: '#fff4d1', side: T.DoubleSide, roughness: .9 })); sail.position.y = yy; boat.add(sail);
      }
      boat.position.copy(a).add(b).multiplyScalar(.5); boat.position.y = .14; boat.rotation.y = Math.atan2(d.x, d.z); group.add(boat); boats.push(boat);
    }
  }
  const route = new T.LineSegments(new T.BufferGeometry().setFromPoints(lines), new T.LineDashedMaterial({ color: '#7cf5e9', transparent: true, opacity: .85, dashSize: .12, gapSize: .075 })); route.computeLineDistances(); group.add(route);
  return { heights, boats };
}

// These islands are scenery only: they never enter the playable tile list or combat state.
export function buildLockedFrontier(scene: T.Scene, tiles: Tile[], models: T.Group[]) {
  const islands: { id: string; q: number; r: number; top: number }[] = [];
  const placements = models.map(() => [] as T.Matrix4[]);
  const normalizations = models.map(model => {
    model.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
    const scale = (3.05 * TERRITORY_SCALE) / Math.max(size.x, size.z);
    return { matrix: new T.Matrix4().makeScale(scale, scale, scale).multiply(new T.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z)), top: size.y * scale };
  });
  const group = new T.Group(); group.name = 'Locked outer islands';
  const transform = new T.Object3D(), frontierSeed = tiles.map(t => t.terrain).join(',');
  for (let q = -7; q <= 7; q++) for (let r = -7; r <= 7; r++) {
    const distance = hexDistance(q, r); if (distance < 6 || distance > 7) continue;
    const id = `locked:${q},${r}`, random = seededRandom(`frontier:${frontierSeed}:${q},${r}`);
    const terrain = TERRAINS[Math.floor(random() * TERRAINS.length)];
    const modelIndex = terrain === 'mountain' ? 2 : terrain === 'desert' ? 3 : 0;
    const scale = .88 + random() * .15, p = point({ q, r });
    transform.position.copy(p); transform.position.y = -.03; transform.rotation.set(0, random() * Math.PI * 2, 0); transform.scale.setScalar(scale); transform.updateMatrix();
    placements[modelIndex].push(transform.matrix.clone().multiply(normalizations[modelIndex].matrix));
    islands.push({ id, q, r, top: normalizations[modelIndex].top * scale });
  }
  models.forEach((model, index) => {
    if (!placements[index].length) return;
    model.traverse(o => {
      if (!(o instanceof T.Mesh)) return;
      const muted = (Array.isArray(o.material) ? o.material : [o.material]).map(original => {
        const material = original.clone();
        if (material instanceof T.MeshStandardMaterial) { material.color.multiply(new T.Color('#71899c')); material.roughness = 1; }
        return material;
      });
      const instance = new T.InstancedMesh(o.geometry, Array.isArray(o.material) ? muted : muted[0], placements[index].length);
      placements[index].forEach((matrix, i) => instance.setMatrixAt(i, matrix.clone().multiply(o.matrixWorld)));
      instance.receiveShadow = true; group.add(instance);
    });
  });
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath(); ctx.roundRect(13, 6, 102, 116, 24); ctx.fillStyle = '#102735ed'; ctx.fill(); ctx.strokeStyle = '#acbdb8'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(64, 49, 21, Math.PI, 0); ctx.lineTo(85, 69); ctx.moveTo(43, 49); ctx.lineTo(43, 69); ctx.strokeStyle = '#e4d2a2'; ctx.lineWidth = 9; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(32, 61, 64, 42, 8); ctx.fillStyle = '#e4d2a2'; ctx.fill();
  ctx.fillStyle = '#263f4b'; ctx.beginPath(); ctx.arc(64, 79, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(61, 79, 6, 13);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const lockMaterial = new T.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, toneMapped: false });
  const pickers: T.Object3D[] = [];
  const pickMaterial = new T.MeshBasicMaterial({ visible: false });
  for (const island of islands) {
    const p = point(island);
    const lock = new T.Sprite(lockMaterial); lock.position.set(p.x, island.top + .55, p.z); lock.scale.set(.86, .98, 1); lock.renderOrder = 8; lock.userData = { id: island.id, locked: true }; group.add(lock); pickers.push(lock);
    const pick = new T.Mesh(new T.CylinderGeometry(1.3 * TERRITORY_SCALE, 1.45 * TERRITORY_SCALE, island.top, 10), pickMaterial); pick.position.copy(p); pick.position.y = island.top / 2; pick.userData = { id: island.id, locked: true }; group.add(pick); pickers.push(pick);
  }
  const all = [...tiles, ...islands], routes: T.Vector3[] = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    if (i < tiles.length && j < tiles.length || !adjacent(all[i], all[j])) continue;
    const a = point(all[i]), b = point(all[j]), direction = b.clone().sub(a).normalize();
    a.addScaledVector(direction, 1.45 * TERRITORY_SCALE); b.addScaledVector(direction, -1.45 * TERRITORY_SCALE); a.y = b.y = .16; routes.push(a, b);
  }
  const links = new T.LineSegments(new T.BufferGeometry().setFromPoints(routes), new T.LineDashedMaterial({ color: '#c5d2c2', transparent: true, opacity: .5, dashSize: .14, gapSize: .1, depthWrite: false }));
  links.computeLineDistances(); links.renderOrder = 6; group.add(links); scene.add(group);
  return { pickers, count: islands.length };
}
