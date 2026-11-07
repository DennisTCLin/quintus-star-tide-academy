import { elementScenery, ELEMENT_MATERIALS } from './conquest-element-art';
import { BATTLE_FRAME_WIDTH, BATTLE_ISLAND_WIDTH, figureSpan } from './conquest-scale';
import { fitCharacter, fitPortrait, fitCameraToPoints } from './conquest-body-fit';
import { sizeOrderedOffsets } from './creature-body';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BATTLE_RESOLVE, beatAt, combatKey, createChoreography, ease, isMelee, type CombatBeat } from './conquest-choreography';
import { createCombatEffects } from './conquest-effects';
import { attachHeroMotion, assistPose, heroAssist, heroStyle } from './conquest-hero-motion';
import { createHeroEffects, createVictory } from './conquest-finale';
import { health, maxHealth, ELEMENT_COLOR } from './conquest';
import { islandSurfaceTexture, makeOcean, release } from './conquest-art';
import type { BattleSetup, BattleUnit } from './conquest-battle';

type Actor = { root: T.Group; body: T.Group; marker: T.Mesh<T.TorusGeometry, T.MeshBasicMaterial>; markerColor: T.Color; hpLabel: T.Sprite | null; initialHp: number; maxHp: number; lastHp: number; key: string; height: number; span: number; radius: number; slotOffset: number; victoryOffset: number; side: number; index: number; count: number; commander?: boolean; heroId?: string; motion?: ReturnType<typeof attachHeroMotion>; joints: { bone: T.Bone; rest: T.Quaternion }[] };
type Field = { manualView: boolean; scene: T.Scene; actors: Actor[]; units: T.Group; effects: ReturnType<typeof createCombatEffects>; victory: ReturnType<typeof createVictory>; heroEffects: ReturnType<typeof createHeroEffects>; gentle: boolean; playerSide: number; ground: number; surface: T.Object3D | null; groundCache: Map<string, number>; clock: { value: number }; camera: T.PerspectiveCamera; controls: OrbitControls; savedCamera: T.Vector3 | null; settlementCamera: T.Vector3 | null; settlementTarget: T.Vector3; savedTarget: T.Vector3; lastProgress: number; render: () => void };
// Each actor retains its real identity while its textured Higgsfield mesh loads.
// Unmodeled collection members use their original art, never a different creature.
function characterBase(unit: Pick<BattleUnit, 'image' | 'element' | 'id' | 'speciesId' | 'name' | 'level' | 'hp' | 'maxHp'>, commander = false) {
  const root = new T.Group(), body = new T.Group(), height = figureSpan(unit.speciesId ?? unit.id);
  const ring = new T.Mesh(new T.TorusGeometry(height * .32, .012, 6, 40), new T.MeshBasicMaterial({ color: commander ? '#ffda91' : ELEMENT_COLOR[unit.element] }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .025; root.add(ring);
  const label = document.createElement('canvas'); label.width = 256; label.height = 128;
  const ink = label.getContext('2d')!; ink.fillStyle = '#103346'; ink.fillRect(0, 0, 256, 128); ink.strokeStyle = '#d6b879'; ink.lineWidth = 3; ink.strokeRect(3, 3, 250, 122); ink.fillStyle = '#fff0ce'; ink.font = '24px sans-serif'; ink.textAlign = 'center'; ink.fillText(unit.name, 128, 58, 230); ink.fillStyle = '#bfd9de'; ink.font = '18px sans-serif'; ink.fillText('角色影像載入中', 128, 94);
  const portrait = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(label), transparent: true, depthWrite: false, color: '#ffffff' }));
  portrait.scale.set(height * 1.5, height * .75, 1); portrait.position.y = height / 2; body.add(portrait); root.add(body);
  return { root, body, portrait, marker: ring };
}
function groundAt(field: Field, x: number, z: number) {
  if (!field.surface) return field.ground;
  x = Math.round(x * 10) / 10; z = Math.round(z * 10) / 10;
  const key = `${x}:${z}`, cached = field.groundCache.get(key); if (cached !== undefined) return cached;
  const ray = new T.Raycaster(new T.Vector3(x, field.ground + 2, z), new T.Vector3(0, -1, 0));
  // Ignore foliage above the clearing, but follow small rocks beneath each formation slot.
  const floor = ray.intersectObject(field.surface, true).find(hit => hit.point.y <= field.ground + .55 && hit.point.y >= field.ground - .5)?.point.y ?? field.ground;
  field.groundCache.set(key, floor); return floor;
}
const home = (actor: Actor, portrait = false) => { const x = actor.side * (actor.commander ? 3.5 : 2.1 + (actor.index % 2) * .38), z = actor.commander ? .4 : actor.slotOffset; return portrait ? new T.Vector3(z, 0, -x) : new T.Vector3(x, 0, z); };
function pose(field: Field, progress: number, attackWon: boolean, beats: CombatBeat[], cinematic: boolean) {
  const portrait = field.camera.aspect < 1, slot = (actor: Actor) => home(actor, portrait);
  const p = Math.max(0, progress), active = progress >= 0 && p < 1, beat = active ? beatAt(beats, p) : undefined;
  const source = field.actors.find(a => a.key === beat?.source), target = field.actors.find(a => a.key === beat?.target);
  const direction = source && target ? slot(target).sub(slot(source)).normalize() : new T.Vector3(1, 0, 0);
  const seconds = performance.now() / 1000, settlement = ease((p - BATTLE_RESOLVE) / (1 - BATTLE_RESOLVE));
  const commander = field.actors.find(a => a.commander && a.side === (beat?.side ?? field.playerSide)), winnerSide = attackWon ? -1 : 1, playerWon = winnerSide === field.playerSide;
  const assist = commander && heroAssist(beats, beat, commander.side);
  field.clock.value = field.gentle ? 0 : seconds;
  field.effects.clear(); field.heroEffects.clear();
  for (const actor of field.actors) {
    const base = slot(actor), { side, commander, body } = actor;
    let hp = actor.initialHp;
    const impacts = beats.filter(b => b.target === actor.key && p >= b.impact);
    if (impacts.length) hp = impacts[impacts.length - 1].targetHp;
    const knockout = impacts.find(b => b.knockedOut);
    actor.root.visible = !!commander || hp > 0 || !!knockout && p < knockout.end;
    if (actor.hpLabel) actor.hpLabel.visible = settlement < .45;
    if (actor.hpLabel && Math.ceil(hp) !== actor.lastHp) {
      const map = (actor.hpLabel.material as T.SpriteMaterial).map!, canvas = map.image as HTMLCanvasElement, ink = canvas.getContext('2d')!;
      ink.clearRect(0,0,192,48); ink.fillStyle = '#082735e8'; ink.fillRect(0,0,192,48); ink.fillStyle = hp / actor.maxHp < .2 ? '#e6a068' : '#74d2ae'; ink.fillRect(7,7,178 * hp / actor.maxHp,10); ink.fillStyle = '#fff5db'; ink.font = '20px sans-serif'; ink.textAlign = 'center'; ink.fillText(hp <= 0 ? '倒地撤回' : `${Math.ceil(hp)} / ${actor.maxHp}`,96,39); map.needsUpdate = true; actor.lastHp = Math.ceil(hp);
    }
    actor.marker.material.color.copy(actor.markerColor); actor.marker.scale.setScalar(1);
    if (beat && (actor === source || actor === target)) { actor.marker.material.color.set(actor === source ? '#fff1b1' : '#ffac79'); actor.marker.scale.setScalar(actor === source ? 1.65 : 1.35); }
    actor.root.position.set(base.x, groundAt(field, base.x, base.z), base.z);
    actor.root.rotation.set(0, actor.root.userData.archer ? (side < 0 ? 0 : Math.PI) : side < 0 ? Math.PI / 3 : -Math.PI / 3, 0);
    if (portrait) actor.root.rotation.y += Math.PI / 2;
    body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); body.scale.setScalar(1);
    for (const joint of actor.motion ? [] : actor.joints) {
      joint.bone.quaternion.copy(joint.rest);
      if (active) {
        const rally = p < .1 ? Math.sin(p / .1 * Math.PI) : beat?.side === side ? Math.sin((p - beat.start) / (beat.end - beat.start) * Math.PI) * .35 : 0;
        if (joint.bone.name === 'Spine01') joint.bone.rotateZ(rally * .09);
        if (joint.bone.name === 'Head') joint.bone.rotateX(rally * .1 + Math.sin(p * 24) * .015);
      }
    }
    // Breathing is subordinate to each attack, and never runs in reduced-motion/result mode.
    if (active) body.scale.y = 1 + Math.sin(p * 50 + actor.index) * .012;
    if (commander && active && p < .1) { body.rotation.z = side * Math.sin(p / .1 * Math.PI) * .13; body.position.y = Math.sin(p / .1 * Math.PI) * .04; }
    if (commander && actor.heroId) {
      const supporting = beat && target && heroAssist(beats, beat, side), motion = supporting ? assistPose(beat!, p) : { draw: 0, recoil: 0, recovery: 0 };
      actor.motion?.pose(seconds, motion.draw, motion.recoil, side === winnerSide ? settlement : 0, !field.gentle && !document.hidden);
      if (supporting) {
        const aim = slot(target!).sub(base).normalize(), style = heroStyle(actor.heroId);
        actor.root.rotation.y = -Math.atan2(aim.z, aim.x) + (actor.root.userData.archer ? 0 : Math.PI / 3);
        body.rotation.z = -motion.draw * .10 + motion.recoil * .12;
        if (style === 'strike') {
          const fly = ease((p - beat!.launch) / (beat!.impact - beat!.launch));
          const travel = fly * (1 - motion.recovery);
          actor.root.position.addScaledVector(aim, Math.max(0, base.distanceTo(slot(target!)) - .85) * travel);
          body.position.y = Math.sin(travel * Math.PI) * .18; body.rotation.y = motion.recoil * .6;
        } else { actor.root.position.addScaledVector(aim, motion.draw * .16 - motion.recoil * .08); body.rotation.x = style === 'spell' ? -motion.draw * .15 : 0; }
        actor.marker.material.color.set('#f0cf87'); actor.marker.scale.setScalar(1.15 + motion.draw * .2);
      }
    }
    if (beat && actor === source && target) {
      actor.root.rotation.y += -Math.atan2(direction.z, direction.x) + (side > 0 ? Math.PI : 0) - (portrait ? Math.PI / 2 : 0);
      const charge = ease((p - beat.start) / (beat.launch - beat.start));
      const fly = ease((p - beat.launch) / (beat.impact - beat.launch));
      const hit = Math.max(0, (p - beat.impact) / (beat.end - beat.impact));
      const recovery = ease((hit - .15) / .85);
      const windup = p < beat.launch ? charge : 0;
      body.rotation.z = side * (windup * -.18 + (1 - recovery) * (p >= beat.launch ? .22 : 0));
      body.scale.set(1 + windup * .08, 1 - windup * .1, 1 + windup * .08);
      actor.root.position.addScaledVector(direction, -windup * .13);
      if (isMelee(beat)) {
        const destination = slot(target).addScaledVector(direction, -(actor.radius + target.radius + .12));
        const amount = fly * (1 - recovery);
        actor.root.position.x = T.MathUtils.lerp(base.x, destination.x, amount);
        actor.root.position.z = T.MathUtils.lerp(base.z, destination.z, amount) + Math.sin(amount * Math.PI) * .22 * side;
        // Endpoint floor interpolation avoids raycasting/cache growth on every animation frame.
        actor.root.position.y = T.MathUtils.lerp(groundAt(field, base.x, base.z), groundAt(field, destination.x, destination.z), amount);
        if (p >= beat.launch && p < beat.impact) body.position.y = Math.sin(fly * Math.PI) * (beat.style === 'pounce' ? .6 : .28);
        body.rotation.z += side * (p >= beat.launch && p < beat.impact ? Math.sin(fly * Math.PI) * .18 : 0);
      } else if (p >= beat.launch) {
        body.position.x = -side * Math.sin(fly * Math.PI) * .12 * (1 - recovery);
        body.rotation.y = beat.style === 'leaf' ? fly * Math.PI * 2 : Math.sin(fly * Math.PI) * side * .85 * (1 - recovery);
        if (beat.style === 'stone') { body.position.y = Math.sin(fly * Math.PI) * .15 * (1 - recovery); body.rotation.z += side * Math.sin(fly * Math.PI) * .25 * (1 - recovery); }
      }
    }
    if (beat && actor === target && p >= beat.impact) {
      const hit = (p - beat.impact) / (beat.end - beat.impact), recoil = Math.sin(Math.min(1, hit * 2.6) * Math.PI) * (1 - ease((hit - .4) / .6));
      actor.root.position.addScaledVector(direction, recoil * (beat.finale ? .48 : .24));
      body.rotation.z = -side * recoil * .32; body.position.y = Math.max(0, Math.sin(hit * Math.PI * 2)) * .08;
      body.scale.set(1 + recoil * .06, 1 - recoil * .09, 1 + recoil * .06);
    }
    if (!commander && hp <= 0) { body.rotation.z = side * .8; body.scale.setScalar(.8); }
    if (p > BATTLE_RESOLVE && side !== winnerSide) {
      const retreat = settlement; if (portrait) actor.root.position.z -= side * retreat * .3; else actor.root.position.x += side * retreat * .5; body.rotation.z = side * retreat * .13;
    }
    if (settlement > 0 && playerWon && side === winnerSide && actor.root.visible) {
      const destination = commander ? new T.Vector3(-.45, 0, .65) : new T.Vector3(actor.victoryOffset, 0, -1.1 - (actor.index % 2) * .35);
      const x = T.MathUtils.lerp(actor.root.position.x, destination.x, settlement), z = T.MathUtils.lerp(actor.root.position.z, destination.z, settlement);
      actor.root.position.set(x, groundAt(field, x, z), z);
      actor.root.rotation.y = T.MathUtils.lerp(actor.root.rotation.y, commander && actor.root.userData.archer ? -.6 : -.4, settlement);
      if (!commander && !field.gentle) body.position.y = Math.max(0, Math.sin(seconds * 3 + actor.index)) * .045 * settlement;
    }
  }
  if (beat && source && target) {
    const launch = slot(source); launch.y = groundAt(field, launch.x, launch.z) + source.height * .6;
    const landing = slot(target); landing.y = groundAt(field, landing.x, landing.z) + target.height * .48;
    field.effects.show(beat, p, launch, landing, landing.y - target.height * .48, isMelee(beat));
  }
  if (assist && commander && beat && target) {
    commander.root.updateMatrixWorld(true);
    const hand = commander.joints.find(j => j.bone.name === 'LeftHand');
    const start = hand ? hand.bone.getWorldPosition(new T.Vector3()) : commander.root.position.clone().add(new T.Vector3(0, commander.height * .65, 0));
    const end = target.root.position.clone(); end.y += target.height * .55;
    field.heroEffects.show(commander.heroId!, beat, p, start, end, groundAt(field, commander.root.position.x, commander.root.position.z));
  }
  const { camera, controls } = field;
  if (active && !field.savedCamera) { field.savedCamera = camera.position.clone(); field.savedTarget.copy(controls.target); }
  controls.enabled = !active || !cinematic;
  if (settlement === 0 || !cinematic) field.settlementCamera = null;
  if (active && cinematic && field.savedCamera && settlement === 0) {
    const focus = assist && commander && target ? slot(commander).add(slot(target)).multiplyScalar(.35) : source && target ? slot(source).add(slot(target)).multiplyScalar(.24) : new T.Vector3(); focus.y = field.ground + .55;
    const blend = ease(p / .1) * (1 - settlement);
    const focusTarget = field.savedTarget.clone().lerp(focus, blend);
    const attackPulse = beat ? Math.sin(ease((p - beat.start) / (beat.end - beat.start)) * Math.PI) : 0;
    const offset = camera.aspect < 1 ? new T.Vector3(.45, 7.1, 8.1).multiplyScalar(1.1 * Math.max(1, .7 / camera.aspect)) : new T.Vector3(1.1 + Math.sin(p * Math.PI * 2) * .85, 5.3, 7.8);
    if (assist && !portrait) offset.multiplyScalar(.88);
    offset.multiplyScalar(1 - attackPulse * (beat?.finale ? .12 : .055));
    const cameraTarget = field.savedCamera.clone().lerp(focus.clone().add(offset), blend);
    // A bounded orbit and attack dolly keep the whole formation legible without screen shake.
    const delta = Math.max(0, Math.min(.1, (p - field.lastProgress) * 12)), smooth = 1 - Math.exp(-delta * 7);
    camera.position.lerp(cameraTarget, smooth); controls.target.lerp(focusTarget, smooth); camera.lookAt(controls.target);
  } else if (!active) field.savedCamera = null;
  if (playerWon && settlement > 0 && cinematic && (active || field.lastProgress < 1)) {
    const focus = new T.Vector3(0, field.ground + .75, .1);
    const offset = portrait ? new T.Vector3(.3, 5.2, 7.8).multiplyScalar(Math.max(1, .7 / camera.aspect)) : new T.Vector3(1.0, 3.5, 6.3);
    if (!field.settlementCamera) { field.settlementCamera = camera.position.clone(); field.settlementTarget.copy(controls.target); }
    controls.target.copy(field.settlementTarget).lerp(focus, settlement); camera.position.copy(field.settlementCamera).lerp(focus.clone().add(offset), settlement); camera.lookAt(controls.target);
  }
  field.lastProgress = p;
  field.victory.show(playerWon ? settlement : 0, seconds, new T.Vector3(.55, groundAt(field, .55, .2), .2), !field.gentle && !document.hidden);
  if (!field.manualView || active && cinematic) {
    const bounds: T.Vector3[] = [];
    for (const actor of field.actors.filter(actor => actor.root.visible)) {
      const radius = actor.span / 2;
      for (const x of [-radius, radius]) for (const z of [-radius, radius]) for (const y of [-.12, actor.height + .4]) bounds.push(actor.root.position.clone().add(new T.Vector3(x, y, z)));
    }
    fitCameraToPoints(camera, controls.target, bounds);
  }
  field.render();
}
export default function ConquestBattlefield({ setup, progress, cinematic, gentle, onReady }: { setup: BattleSetup; progress: number; cinematic: boolean; gentle: boolean; onReady: (ready: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null), field = useRef<Field | null>(null), current = useRef({ setup, progress, cinematic, gentle }); current.current = { setup, progress, cinematic, gentle };
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [artState, setArtState] = useState('loading'), [terrainReady, setTerrainReady] = useState(false);
  useEffect(() => { onReady(!!error || (terrainReady && artState !== 'loading')); }, [error, terrainReady, artState, onReady]);
  const signature = [...setup.attackers, ...setup.defenders].map(u => `${u.id}:${u.speciesId}:${u.image}:${u.element}:${u.wild}:${u.model}`).join('|') + `:${setup.commander?.id ?? ''}:${setup.defenderCommander?.id ?? ''}`;
  useEffect(() => {
    const container = host.current!; let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch { setError('裝置無法顯示 3D 演出，仍可開始戰鬥並查看完整戰報。'); return; }
    let disposed = false;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', '夥伴與野怪的立體交戰場景');
    const scene = new T.Scene(); scene.background = new T.Color('#173f54'); scene.fog = new T.Fog('#356f83', 20, 65);
    const camera = new T.PerspectiveCamera(39, 1, .1, 100); camera.position.set(3.6, 5.8, 7.3); camera.lookAt(0, 1.8, 0);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 1.8, 0); controls.enablePan = false; controls.minDistance = 5.5; controls.maxDistance = 34; controls.minPolarAngle = .35; controls.maxPolarAngle = 1.35;
    scene.add(new T.HemisphereLight('#daefff', '#4a6040', 1.65));
    const sun = new T.DirectionalLight('#fff0d0', 2.6); sun.position.set(-6, 14, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 }); sun.shadow.normalBias = .025; scene.add(sun);
    const units = new T.Group(), victory = createVictory(scene), heroEffects = createHeroEffects(scene), effects = createCombatEffects(scene); scene.add(units);
    const clock = makeOcean(scene);
    const fallbackHeight = BATTLE_ISLAND_WIDTH * .215;
    const fallback = new T.Mesh(new T.CylinderGeometry(BATTLE_ISLAND_WIDTH * .45, BATTLE_ISLAND_WIDTH * .49, fallbackHeight, 20), new T.MeshStandardMaterial({ color: '#6b9561', roughness: 1 })); fallback.position.y = fallbackHeight / 2; fallback.receiveShadow = true; scene.add(fallback);
    const composer = new EffectComposer(renderer), basePass = new RenderPass(scene, camera), bloom = new UnrealBloomPass(new T.Vector2(1, 1), .24, .45, 1.35), outputPass = new OutputPass();
    composer.addPass(basePass); composer.addPass(bloom); composer.addPass(outputPass);
    const render = () => { if (!disposed) composer.render(); }; controls.addEventListener('change', render);
    const runtime: Field = { manualView: false, scene, units, effects, heroEffects, gentle, playerSide: setup.mode === 'drill' ? 1 : -1, camera, controls, savedCamera: null, settlementCamera: null, settlementTarget: new T.Vector3(), savedTarget: new T.Vector3(), lastProgress: 0, victory, actors: [], ground: fallbackHeight + .02, surface: null, groundCache: new Map(), clock, render }; field.current = runtime;
    controls.addEventListener('start', () => { runtime.manualView = true; });
    let previousFit = 0, ambientFrame = 0, lastAmbient = 0;
    const ambient = (time: number) => {
      ambientFrame = requestAnimationFrame(ambient);
      const value = current.current; if (document.hidden || value.gentle || time - lastAmbient < 33 || value.progress >= 0 && value.progress < 1) return;
      lastAmbient = time; runtime.gentle = value.gentle;
      pose(runtime, value.progress, value.setup.result.won, createChoreography(value.setup), value.cinematic);
    };
    ambientFrame = requestAnimationFrame(ambient);
    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false); composer.setSize(rect.width, rect.height);
      // Fill the wider desktop stage; portrait screens retain both battle lines.
      const fit = Math.max(10.5, (BATTLE_FRAME_WIDTH + .4) / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      const offset = camera.position.clone().sub(controls.target);
      if (!previousFit && camera.aspect < 1) offset.set(.5, 8.0, 8.4);
      if (previousFit) offset.multiplyScalar(fit / previousFit); else offset.setLength(fit);
      camera.position.copy(controls.target).add(offset); previousFit = fit; controls.update(); pose(runtime, current.current.progress, current.current.setup.result.won, createChoreography(current.current.setup), current.current.cinematic);
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize(); setReady(true);
    const terrainDeadline = setTimeout(() => { if (!disposed) setTerrainReady(true); }, 10000);
    new GLTFLoader().loadAsync('/assets/conquest/models/island.glb').then(gltf => {
      if (disposed) { release(gltf.scene); return; }
      const model = gltf.scene; model.updateMatrixWorld(true); const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3()), scale = BATTLE_ISLAND_WIDTH / Math.max(size.x, size.z);
      const ray = new T.Raycaster(new T.Vector3(center.x, bounds.max.y + 1, center.z), new T.Vector3(0, -1, 0)); const hit = ray.intersectObject(model, true)[0];
      runtime.ground = hit ? (hit.point.y - bounds.min.y) * scale : 1.72;
      model.scale.setScalar(scale); model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      const target = new T.Vector3(0, runtime.ground + .35, 0); camera.position.add(target.clone().sub(controls.target)); controls.target.copy(target); controls.update();
      model.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(model); model.updateMatrixWorld(true); runtime.surface = model; runtime.groundCache.clear(); fallback.visible = false;
      const materials = { ...Object.fromEntries(Object.entries(ELEMENT_MATERIALS).map(([key,parameters]) => [key,new T.MeshStandardMaterial(parameters)])), rock: new T.MeshStandardMaterial({color:'#888c78',map:islandSurfaceTexture('rock'),roughness:1}), stone: new T.MeshStandardMaterial({color:'#b8b39a',map:islandSurfaceTexture('stone'),roughness:.9}) } as Record<string,T.Material>;
      for (const name of ['basalt','earth']) (materials[name] as T.MeshStandardMaterial).map = (materials.rock as T.MeshStandardMaterial).map;
      const used = new Set<T.Material>();
      for (const x of [-2.8, 2.8]) {
        // Dressing stays behind the combat lanes and sits on the loaded island surface.
        const z = -2.7, y = groundAt(runtime,x,z);
        elementScenery(setup.element, `${setup.tileId}:${x}`, part => {
          const mesh = new T.Mesh(part.geometry, materials[part.material]); used.add(materials[part.material]);
          mesh.position.copy(part.position).multiplyScalar(1.3).add(new T.Vector3(x,y,z)); mesh.scale.copy(part.scale).multiplyScalar(1.3); mesh.rotation.copy(part.rotation); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh);
        });
      }
      const usedMaps = new Set([...used].map(material => (material as T.MeshStandardMaterial).map));
      const unusedMaps = new Set(Object.values(materials).map(material => (material as T.MeshStandardMaterial).map).filter(map => map && !usedMaps.has(map)));
      for (const map of unusedMaps) map!.dispose();
      for (const material of Object.values(materials)) if (!used.has(material)) material.dispose();
      pose(runtime, current.current.progress, current.current.setup.result.won, createChoreography(current.current.setup), current.current.cinematic);
    }).catch(() => { /* The local staging island keeps the entire battle usable if the art cannot load. */ }).finally(() => { clearTimeout(terrainDeadline); if (!disposed) setTerrainReady(true); });
    const lost = (event: Event) => { event.preventDefault(); setError('3D 演出暫時中斷，仍可略過演出並查看戰報。'); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => { disposed = true; cancelAnimationFrame(ambientFrame); clearTimeout(terrainDeadline); controls.dispose(); observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost); scene.remove(units); release(scene); bloom.dispose(); outputPass.dispose(); basePass.dispose(); composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); if (field.current === runtime) field.current = null; };
  }, []);
  useEffect(() => {
    const runtime = field.current; if (!runtime) return;
    let cancelled = false;
    setArtState('loading');
    const group = new T.Group(); runtime.units.add(group); runtime.actors = [];
    const containerMotionStats = () => { const hero = runtime.actors.find(a => a.commander); if (host.current && hero?.motion) { host.current.dataset.hairVertices = String(hero.motion.hairVertices); host.current.dataset.clothVertices = String(hero.motion.clothVertices); } };
    const requests: Promise<boolean>[] = [], timers = new Set<ReturnType<typeof setTimeout>>();
    const bounded = (promise: Promise<boolean>, ms: number) => new Promise<boolean>(resolve => {
      const timer = setTimeout(() => { timers.delete(timer); resolve(false); }, ms); timers.add(timer);
      void promise.then(value => { clearTimeout(timer); timers.delete(timer); resolve(value); });
    });
    const add = (unit: Pick<BattleUnit, 'id' | 'image' | 'model' | 'element' | 'speciesId' | 'name' | 'level' | 'hp' | 'maxHp'>, side: number, index: number, count: number, commander = false, slotOffset = 0, victoryOffset = 0) => {
      const { root, body, portrait, marker } = characterBase(unit, commander); root.userData.archer = unit.id === 'hero-elf'; group.add(root);
      let hpLabel: T.Sprite | null = null;
      if (!commander) { const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 48; hpLabel = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthWrite: false, depthTest: false })); hpLabel.position.y = figureSpan(unit.speciesId ?? unit.id) + .19; hpLabel.scale.set(.7,.175,1); hpLabel.renderOrder = 10; root.add(hpLabel); }
      const actor: Actor = { root, body, marker, hpLabel, initialHp: health(unit), maxHp: maxHealth(unit), lastHp: -1, markerColor: marker.material.color.clone(), key: combatKey(side, unit.id), height: figureSpan(unit.speciesId ?? unit.id), span: figureSpan(unit.speciesId ?? unit.id), radius: figureSpan(unit.speciesId ?? unit.id) * .32, slotOffset, victoryOffset, side, index, count, commander, heroId: commander ? unit.id : undefined, joints: [] }; runtime.actors.push(actor);
      const dimensions = (size: {height: number; width: number; depth?: number}, art: string) => {
        actor.height = size.height; actor.radius = Math.max(.1, Math.max(size.width, size.depth ?? size.width * .65) * .4);
        actor.hpLabel?.position.set(0, actor.height + .19, 0);
        marker.geometry.dispose(); marker.geometry = new T.TorusGeometry(actor.radius, .012, 6, 40);
        root.userData.bodySize = { id: unit.speciesId ?? unit.id, span: actor.span, ...size, radius: actor.radius, art, slotOffset };
        if (host.current) host.current.dataset.bodySizes = JSON.stringify(runtime.actors.map(a => a.root.userData.bodySize).filter(Boolean));
      };
      let meshLoaded = false;
      const portraitRequest = unit.image ? bounded(new Promise<boolean>(resolve => { new T.TextureLoader().load(unit.image!, texture => {
        if (cancelled) { texture.dispose(); resolve(false); return; }
        texture.colorSpace = T.SRGBColorSpace; portrait.material.map?.dispose(); portrait.material.map = texture; portrait.material.needsUpdate = true;
        const size = fitPortrait(texture, unit.speciesId ?? unit.id);
        portrait.scale.set(size.width, size.height, 1); portrait.position.y = size.height / 2;
        if (!meshLoaded) dimensions(size, 'portrait');
        portrait.visible = !meshLoaded; runtime.render(); resolve(true);
      }, undefined, () => resolve(false)); }), 8000) : Promise.resolve(false);
      const modelRequest = unit.model ? bounded(new GLTFLoader().loadAsync(unit.model).then(gltf => {
        if (cancelled) { release(gltf.scene); return false; }
        if (commander) { actor.motion = attachHeroMotion(gltf.scene, unit.id); containerMotionStats(); } dimensions(fitCharacter(gltf.scene, unit.speciesId ?? unit.id), 'model'); gltf.scene.traverse(object => { if (object instanceof T.Bone) actor.joints.push({ bone: object, rest: object.quaternion.clone() }); }); const facing = new T.Group(); facing.rotation.y = unit.id === 'hero-elf' ? 0 : Math.PI; facing.add(gltf.scene); body.add(facing); meshLoaded = true; portrait.visible = false;
        runtime.render(); return true;
      }).catch(() => false), 15000) : Promise.resolve(false);
      requests.push(modelRequest.then(async loaded => {
        if (!loaded) {
          const portraitLoaded = await portraitRequest;
          if (!cancelled && !meshLoaded && !portraitLoaded) {
            const map = portrait.material.map, canvas = map?.image as HTMLCanvasElement | undefined;
            if (canvas instanceof HTMLCanvasElement) { const ink = canvas.getContext('2d')!; ink.fillStyle = '#103346'; ink.fillRect(5, 72, 246, 42); ink.fillStyle = '#bfd9de'; ink.font = '18px sans-serif'; ink.textAlign = 'center'; ink.fillText('影像暫時無法載入', 128, 94); map!.needsUpdate = true; }
            runtime.render();
          }
        }
        return meshLoaded;
      }));
    };
    for (const [list, side] of [[setup.attackers, -1], [setup.defenders, 1]] as const) {
      const offsets = sizeOrderedOffsets(list.map(unit => figureSpan(unit.speciesId ?? unit.id)));
      list.forEach((unit, index) => add(unit, side, index, list.length, false, offsets[index], offsets[index]));
    }
    if (setup.commander) add({ ...setup.commander, element: 'metal', level: 0 }, setup.mode === 'drill' ? 1 : -1, 0, 1, true);
    if (setup.defenderCommander && setup.mode === 'claim') add({ ...setup.defenderCommander, element: 'metal', level: 0 }, 1, 0, 1, true);
    pose(runtime, progress, setup.result.won, createChoreography(setup), cinematic);
    void Promise.all(requests).then(results => { if (!cancelled) { setArtState(results.every(Boolean) ? 'ready' : 'portraits'); pose(runtime, current.current.progress, current.current.setup.result.won, createChoreography(current.current.setup), current.current.cinematic); } });
    return () => { cancelled = true; timers.forEach(clearTimeout); runtime.actors.forEach(a => a.motion?.dispose()); runtime.units.remove(group); release(group); };
  }, [signature]);
  useEffect(() => { if (field.current) { field.current.gentle = gentle; for (const actor of field.current.actors) { const unit = (actor.side === -1 ? setup.attackers : setup.defenders).find(u => u.id === actor.key.slice(actor.key.indexOf(':') + 1)); if (unit) { actor.initialHp = health(unit); actor.maxHp = maxHealth(unit); } } pose(field.current, progress, setup.result.won, createChoreography(setup), cinematic); } }, [progress, setup, cinematic, gentle]);
  return <div ref={host} className="cq-battlefield" data-element={setup.element} data-island-width={BATTLE_ISLAND_WIDTH} data-frame-width={BATTLE_FRAME_WIDTH} data-ready={ready ? 'true' : 'false'} data-art={artState} data-defender-commander={setup.defenderCommander?.id ?? ''} data-commander={setup.commander?.id ?? ''} data-characters={[...setup.attackers, ...setup.defenders].map(u => u.speciesId ?? u.id).join(',')}><span className="cq-art-status" role="status">{artState === 'loading' ? '正在召集角色模型…' : artState === 'portraits' ? '部分角色以原畫或名稱標示' : progress >= 0 && progress < 1 && cinematic ? '跟隨交戰視角' : '拖曳旋轉視角'}</span>{error && <div className="cq-battlefield-error" role="status">{error}</div>}</div>;
}
