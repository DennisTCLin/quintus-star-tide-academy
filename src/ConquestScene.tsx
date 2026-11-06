import { ELEMENT_LABEL } from './conquest';
import ConquestElementBadge from './ConquestElementBadge';
import { HEX_STEP_X, ISLAND_WIDTH, TERRITORY_SCALE } from './conquest-scale';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { adjacent, type Tile } from './conquest';
import ConquestTerritoryBadge from './ConquestTerritoryBadge';
import ConquestIslandProtection from './ConquestIslandProtection';
import { islandProtection, territoryMarker, territoryStatus } from './conquest-presentation';
import { buildArchipelago, buildLockedFrontier, loadIslandModels, makeOcean, makeFrontierMist, point, release, type IslandHeight } from './conquest-art';

export type SceneControl = { home: () => void; rotate: (amount: number) => void; zoom: (factor: number) => void; overview: () => void; frontierInfo: () => void; focusTile: (id: string) => void };
type Props = { tiles: Tile[]; player: string; playerName: string; combatTileId?: string | null; selected: string; onSelect: (id: string) => void; reduced: boolean; now: number; suspended?: boolean };
type Runtime = { camera: THREE.PerspectiveCamera; controls: OrbitControls; overlays: THREE.Group; heights: Map<string, IslandHeight>; focus: THREE.Vector3; render: () => void };
const CHART_LENS = Math.tan(THREE.MathUtils.degToRad(21)) / Math.tan(THREE.MathUtils.degToRad(14));
function home(r: Runtime) { r.camera.fov = 28; r.camera.updateProjectionMatrix(); r.controls.target.copy(r.focus); r.camera.position.set(3, 13, 17).multiplyScalar(CHART_LENS).multiplyScalar(r.camera.aspect < 1 ? 1.35 : 1).add(r.focus); r.controls.update(); r.render(); }
function glowLine(points: THREE.Vector3[], color: string, radius = .022) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 5, radius, 5, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2) }));
}
export default forwardRef<SceneControl, Props>(function ConquestScene({ tiles, player, playerName, combatTileId, selected, onSelect, reduced, now, suspended = false }, ref) {
  const host = useRef<HTMLDivElement>(null), runtime = useRef<Runtime | null>(null);
  const labels = useRef(new Map<string, HTMLButtonElement>());
  const updateLabels = useRef<() => void>(() => {});
  updateLabels.current = () => {
    const r = runtime.current, container = host.current; if (!r || !container) return;
    const width = container.clientWidth, height = container.clientHeight;
    const bottomReserve = window.innerWidth <= 760 ? 255 : 205;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const priority = (t: Tile) => t.id === selected ? 0 : t.id === combatTileId || (t.battleUntil ?? 0) > now ? 1 : t.owner === player ? 2 : t.owner ? 3 : 4;
    for (const tile of [...tiles].sort((a, b) => priority(a) - priority(b))) {
      const node = labels.current.get(tile.id), island = r.heights.get(tile.id); if (!node) continue;
      if (!island) { node.style.visibility = 'hidden'; continue; }
      const v = point(tile); v.y = island.top + .8; v.project(r.camera);
      const w = node.offsetWidth, h = node.offsetHeight;
      let x = (v.x + 1) / 2 * width - w / 2, y = (1 - v.y) / 2 * height - h;
      // Keep the selected owner's label readable on narrow screens and tall islands.
      if (tile.id === selected && width >= w + 16 && height > h + 290) {
        x = Math.max(8, Math.min(width - w - 8, x));
        y = Math.max(81, Math.min(height - h - bottomReserve - 1, y));
      }
      const collision = placed.some(box => x < box.x + box.w + 8 && x + w + 8 > box.x && y < box.y + box.h + 8 && y + h + 8 > box.y);
      const visible = v.z > -1 && v.z < 1 && x >= 8 && x + w <= width - 8 && y > 80 && y + h < height - bottomReserve && !collision;
      node.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) { node.style.transform = `translate(${x}px, ${y}px)`; placed.push({ x, y, w, h }); }
    }
  };
  const paused = useRef(suspended); paused.current = suspended;
  const onPick = useRef(onSelect); onPick.current = onSelect;
  const [overview, setOverview] = useState(false);
  const [error, setError] = useState(''), [ready, setReady] = useState(false);
  const [lockedIsland, setLockedIsland] = useState<string | null>(null);
  const layoutKey = tiles.map(t => `${t.id}:${t.element}:${t.terrain}:${t.facility}:${t.shrineElement}`).join('|');
  useImperativeHandle(ref, () => ({
    focusTile: id => { const r = runtime.current, tile = tiles.find(t => t.id === id); if (r && tile) { r.focus.copy(point(tile)); r.focus.y = .3; setOverview(false); home(r); } },
    frontierInfo: () => setLockedIsland('外圍群島'),
    home: () => { setOverview(false); if (runtime.current) home(runtime.current); },
    overview: () => {
      const r = runtime.current; if (!r) return;
      setOverview(true); r.camera.fov = r.camera.aspect < 1 ? 50 : 42; r.camera.updateProjectionMatrix();
      const radius = HEX_STEP_X * 7 + ISLAND_WIDTH * .6;
      const distance = radius * 1.08 / (Math.sin(THREE.MathUtils.degToRad(r.camera.fov / 2)) * Math.min(1, r.camera.aspect));
      r.controls.target.set(0, 0, 0); r.camera.position.set(10, 45, 54).setLength(distance); r.controls.update(); r.render();
    },
    rotate: amount => { const r = runtime.current; if (!r) return; const d = r.camera.position.clone().sub(r.controls.target); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), amount); r.camera.position.copy(r.controls.target).add(d); r.controls.update(); r.render(); },
    zoom: factor => { const r = runtime.current; if (!r) return; const d = r.camera.position.clone().sub(r.controls.target).multiplyScalar(factor).clampLength(7, 600); r.camera.position.copy(r.controls.target).add(d); r.controls.update(); r.render(); },
  }), []);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    setReady(false); setOverview(false); setError(''); setLockedIsland(null);
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch { setError('這個裝置目前無法顯示 3D。你仍可使用下方「島嶼清單」選島與出征。'); return; }
    let disposed = false;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#207594'); scene.fog = new THREE.FogExp2('#619baf', .007 / (TERRITORY_SCALE * CHART_LENS));
    const camera = new THREE.PerspectiveCamera(28, 1, .1, 900);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', '可旋轉縮放的 3D 群島；也可使用島嶼清單操作'); renderer.domElement.setAttribute('role', 'img'); renderer.domElement.dataset.islandWidth = String(ISLAND_WIDTH);
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
    // Reserve one-finger vertical gestures for page scrolling. Set this after
    // OrbitControls connects, since its constructor writes touch-action:none.
    controls.touches = { ONE: undefined, TWO: THREE.TOUCH.DOLLY_ROTATE };
    renderer.domElement.style.touchAction = 'pan-y';
    controls.minDistance = 7; controls.maxDistance = 600; controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI * .43; controls.maxTargetRadius = 28 * TERRITORY_SCALE;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    scene.add(new THREE.HemisphereLight('#d5e8ff', '#647246', 1.25));
    const sun = new THREE.DirectionalLight('#fff0cf', 2.7); sun.position.set(-18, 28, 14); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 85 }); sun.shadow.bias = -.0002; sun.shadow.normalBias = .025; scene.add(sun);
    const fill = new THREE.DirectionalLight('#addcff', .55); fill.position.set(18, 9, -12); scene.add(fill);
    const clock = makeOcean(scene, 1800), overlays = new THREE.Group(); scene.add(overlays);
    makeFrontierMist(scene, clock);
    const composer = new EffectComposer(renderer); const base = new RenderPass(scene, camera), bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .22, .35, 1.1), output = new OutputPass();
    composer.addPass(base); composer.addPass(bloom); composer.addPass(output);
    const render = () => { if (!disposed) { composer.render(); updateLabels.current(); } };
    const castle = tiles.find(t => t.id === selected) ?? tiles.find(t => t.facility === 'castle');
    const focus = castle ? point(castle) : new THREE.Vector3(); focus.y = .3;
    const current: Runtime = { camera, controls, overlays, heights: new Map(), focus, render }; runtime.current = current;
    controls.addEventListener('change', render);
    let firstResize = true;
    const resize = () => { const { width, height } = container.getBoundingClientRect(); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); renderer.setSize(width, height, false); composer.setSize(width, height); if (firstResize) home(current); firstResize = false; render(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const pickers: THREE.Object3D[] = [], pickMat = new THREE.MeshBasicMaterial({ visible: false });
    const ray = new THREE.Raycaster(); let down = { x: 0, y: 0 }, moved = false; const pointers = new Set<number>();
    const pointerDown = (e: PointerEvent) => { pointers.add(e.pointerId); if (pointers.size > 1) moved = true; else { down = { x: e.clientX, y: e.clientY }; moved = false; } };
    const pointerMove = (e: PointerEvent) => { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) moved = true; };
    const pointerUp = (e: PointerEvent) => {
      const single = pointers.size === 1; pointers.delete(e.pointerId); if (moved || !single || e.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObjects(pickers, false)[0];
      if (hit?.object.userData.locked) setLockedIsland(`島嶼 ${hit.object.userData.id.replace('locked:', '')}`);
      else if (hit) { setLockedIsland(null); onPick.current(hit.object.userData.id); }
    };
    const pointerCancel = (e: PointerEvent) => { pointers.delete(e.pointerId); moved = true; };
    const lost = (e: Event) => { e.preventDefault(); setReady(false); setOverview(false); setError('3D 顯示暫時中斷；請用島嶼清單繼續，或離開群島後重新進入。'); };
    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerCancel); canvas.addEventListener('webglcontextlost', lost);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = 0, boats: THREE.Group[] = [];
    const animate = (time: number) => { frame = requestAnimationFrame(animate); if (paused.current || reduced || media.matches || document.hidden || time - previous < 50) return; previous = time; clock.value = time / 1700; boats.forEach((b, i) => { b.position.y = .14 + Math.sin(time / 1100 + i) * .03; b.rotation.z = Math.sin(time / 1400 + i) * .025; }); render(); };
    loadIslandModels().then(models => {
      if (disposed) { models.forEach(release); return; }
      const built = buildArchipelago(scene, tiles, models, clock); current.heights = built.heights; boats = built.boats;
      const frontier = buildLockedFrontier(scene, tiles, models); pickers.push(...frontier.pickers);
      canvas.dataset.lockedIslands = String(frontier.count);
      // Imported geometry/materials now belong to the instanced scene and are released once on unmount.
      models.forEach(m => m.clear());
      for (const tile of tiles) {
        const h = built.heights.get(tile.id)!;
        const pick = new THREE.Mesh(new THREE.CylinderGeometry(1.35 * TERRITORY_SCALE, 1.5 * TERRITORY_SCALE, h.top, 12), pickMat); pick.position.copy(point(tile)); pick.position.y = h.top / 2; pick.userData.id = tile.id; scene.add(pick); pickers.push(pick);
      }
      scene.updateMatrixWorld(true); controls.update(); render(); setReady(true);
      if (!reduced) frame = requestAnimationFrame(animate);
    }).catch(reason => { if (!disposed) setError(reason instanceof Error ? reason.message : '島嶼模型載入失敗。'); });
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.removeEventListener('change', render); controls.dispose();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerCancel); canvas.removeEventListener('webglcontextlost', lost);
      release(scene); pickMat.dispose(); bloom.dispose(); output.dispose(); base.dispose(); composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); if (runtime.current === current) runtime.current = null;
    };
    // Geography and visual settings rebuild the scene; battles only rebuild lightweight overlays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, reduced]);
  useEffect(() => {
    const r = runtime.current; if (!r || !ready || r.heights.size !== tiles.length) return;
    release(r.overlays); r.overlays.clear();
    const ring = (tile: Tile, color: string, radius: number, thickness: number) => { const p = point(tile); const points = Array.from({ length: 7 }, (_, i) => new THREE.Vector3(p.x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * radius * TERRITORY_SCALE, .1, p.z + Math.sin(i * Math.PI / 3 + Math.PI / 6) * radius * TERRITORY_SCALE)); r.overlays.add(glowLine(points, color, thickness)); };
    for (const tile of tiles) {
      const marker = territoryMarker(tile, player);
      if (!marker) continue;
      ring(tile, marker.color, 1.77, .025);
      const p = point(tile), h = r.heights.get(tile.id)!;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, 1.1, 8), new THREE.MeshStandardMaterial({ color: '#ba934c' })); pole.position.set(p.x + .75, h.top + .25, p.z + .45); r.overlays.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(.47, .25), new THREE.MeshStandardMaterial({ color: marker.color, side: THREE.DoubleSide })); flag.position.set(p.x + .98, h.top + .64, p.z + .45); r.overlays.add(flag);
      if ((tile.shieldStartsAt ?? 0) <= now && tile.shieldUntil > now) {
        const shield = new THREE.Mesh(new THREE.SphereGeometry(1.65 * TERRITORY_SCALE, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: 'varying vec3 vN;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vView=-p.xyz;vN=normalMatrix*normal;gl_Position=projectionMatrix*p;}', fragmentShader: 'varying vec3 vN;varying vec3 vView;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vView))),3.);gl_FragColor=vec4(.4,.91,1.,f*.25);}' })); shield.position.set(p.x, h.ground, p.z); shield.scale.y = Math.max(1, (h.top - h.ground + .45) / (1.65 * TERRITORY_SCALE)); r.overlays.add(shield);
      }
    }
    const tile = tiles.find(t => t.id === selected);
    if (tile) {
      ring(tile, '#ffd66b', 1.83, .045);
      const p = point(tile), height = r.heights.get(tile.id)?.top ?? 2;
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffdc83').multiplyScalar(1.8) })); marker.position.set(p.x, height + .48, p.z); marker.scale.y = 1.6; r.overlays.add(marker);
      for (const neighbor of tiles.filter(t => adjacent(tile, t))) {
        const a = point(tile), b = point(neighbor), d = b.clone().sub(a).normalize(); a.addScaledVector(d, 1.8 * TERRITORY_SCALE); b.addScaledVector(d, -1.6 * TERRITORY_SCALE); a.y = b.y = .13; r.overlays.add(glowLine([a, b], '#ffd56a', .025));
      }
    }
    r.render();
  }, [tiles, player, selected, combatTileId, playerName, now, ready, reduced]);
  return <div className="cq-canvas" data-overview={overview} ref={host} data-ready={ready ? 'true' : 'false'} data-art="higgsfield-glb-v2"><div className="cq-map-labels" hidden={!ready || !!error} aria-label="海圖領地標記">{tiles.map(tile => {
    const status = territoryStatus(tile, player, combatTileId, now);
    const protection = islandProtection(tile, now, combatTileId);
    const owner = tile.owner === player ? `${playerName}的領地` : status.ownerLabel;
    const protectionText = protection ? `，${protection.label}，${protection.detail}${protection.kind === 'preparing' ? '，仍可被進攻' : ''}` : '';
    return <button type="button" key={tile.id} ref={node => { if (node) labels.current.set(tile.id, node); else labels.current.delete(tile.id); }} className="cq-map-label" data-status={status.kind} data-owner-kind={territoryMarker(tile, player)?.kind} data-tile={tile.id} aria-label={`${tile.name}，${ELEMENT_LABEL[tile.element]}之島，${status.label}，${owner}${protectionText}`} aria-pressed={selected === tile.id} onClick={() => onPick.current(tile.id)}>
      <span className="cq-map-label-heading"><strong>{tile.name}</strong><ConquestElementBadge element={tile.element} /></span>
      <ConquestTerritoryBadge tile={tile} player={player} name={playerName} combatTileId={combatTileId} now={now} />
      {protection && <ConquestIslandProtection status={protection} />}
    </button>;
  })}</div>{lockedIsland && <div className="cq-locked-notice" role="status"><span aria-hidden="true">🔒</span><div><strong>這片群島尚未開放</strong><p>{lockedIsland}・航線已連接，等待未來開啟。</p></div><button aria-label="關閉未開放提示" onClick={() => setLockedIsland(null)}>×</button></div>}{error ? <div className="cq-render-error" role="alert">{error}</div> : !ready && <div className="cq-model-loading" role="status"><span>✥</span><strong>正在展開立體海圖</strong><small>載入岩岸、主城與島嶼材質…</small></div>}</div>;
});
