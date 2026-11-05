import * as T from 'three';
import type { CombatBeat } from './conquest-choreography';

// Fixed pools belong to the battlefield scene; every effect follows a real hit.
export function createCombatEffects(scene: T.Scene) {
  const root = new T.Group(), flight = new T.Group(), impact = new T.Group(), charge = new T.Group();
  root.add(flight, impact, charge); scene.add(root);
  const glow = (color: string, opacity = .8) => new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(1.2), transparent: true, opacity, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending });
  const ring = (radius: number, width: number, parent: T.Group, segments = 64) => {
    const mesh = new T.Mesh(new T.RingGeometry(radius, radius + width, segments), glow('#a5ffff'));
    mesh.rotation.x = -Math.PI / 2; parent.add(mesh); return mesh;
  };
  const glyph = ring(.64, .025, charge), inner = ring(.42, .016, charge, 6);
  const runes = Array.from({ length: 10 }, (_, i) => {
    const mesh = new T.Mesh(new T.OctahedronGeometry(.065), glow('#d5ffff'));
    const a = i / 10 * Math.PI * 2; mesh.position.set(Math.cos(a) * .68, .045, Math.sin(a) * .68); mesh.scale.y = .3; charge.add(mesh); return mesh;
  });
  const crescents = Array.from({ length: 3 }, (_, i) => {
    const mesh = new T.Mesh(new T.TorusGeometry(.36 + i * .12, .035, 5, 40, Math.PI * 1.45), glow('#8ffaff'));
    flight.add(mesh); return mesh;
  });
  const core = new T.Mesh(new T.OctahedronGeometry(.19), glow('#ffffff')); flight.add(core);
  const chunks = Array.from({ length: 7 }, (_, i) => {
    const mesh = new T.Mesh(new T.IcosahedronGeometry(.09 + i * .012), glow('#a6ebdc')); flight.add(mesh); return mesh;
  });
  const trailPositions = new Float32Array(25 * 2 * 3), trailIndices: number[] = [];
  for (let i = 0; i < 24; i++) { const j = i * 2; trailIndices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  const trailGeometry = new T.BufferGeometry(); trailGeometry.setAttribute('position', new T.BufferAttribute(trailPositions, 3)); trailGeometry.setIndex(trailIndices);
  const trail = new T.Mesh(trailGeometry, glow('#aaffff', .55)); trail.frustumCulled = false; root.add(trail);
  const waves = [ring(.35, .055, impact), ring(.27, .018, impact)];
  const slashes = Array.from({ length: 3 }, (_, i) => {
    const mesh = new T.Mesh(new T.TorusGeometry(.4 + i * .17, .025, 5, 36, Math.PI * 1.25), glow('#f1ffff'));
    mesh.rotation.set(.3 + i * .45, i * .8, -.6 + i * 1.1); impact.add(mesh); return mesh;
  });
  const haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 128;
  const ink = haloCanvas.getContext('2d')!, gradient = ink.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.13, '#ffffffbb'); gradient.addColorStop(.45, '#ffffff33'); gradient.addColorStop(1, '#ffffff00');
  ink.fillStyle = gradient; ink.fillRect(0, 0, 128, 128);
  const halo = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(haloCanvas), color: '#adffff', transparent: true, depthWrite: false, blending: T.AdditiveBlending })); impact.add(halo);
  const sparksGeometry = new T.BufferGeometry(), sparkPositions = new Float32Array(64 * 3);
  sparksGeometry.setAttribute('position', new T.BufferAttribute(sparkPositions, 3));
  const sparks = new T.Points(sparksGeometry, new T.PointsMaterial({ color: '#caffff', size: .075, map: halo.material.map, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  sparks.frustumCulled = false; root.add(sparks);
  const dust = Array.from({ length: 12 }, () => {
    const mesh = new T.Mesh(new T.IcosahedronGeometry(.085), new T.MeshBasicMaterial({ color: '#c7b89b', transparent: true, opacity: .35, depthWrite: false })); root.add(mesh); return mesh;
  });
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 128;
  const labelTexture = new T.CanvasTexture(labelCanvas);
  const damage = new T.Sprite(new T.SpriteMaterial({ map: labelTexture, transparent: true, depthWrite: false, depthTest: false })); damage.renderOrder = 12; root.add(damage);
  let labelId = '';
  const light = new T.PointLight('#b7ffff', 0, 6); root.add(light);
  const paint = (object: T.Object3D, color: T.Color, opacity: number) => object.traverse(o => {
    if (o instanceof T.Mesh) { const mat = o.material as T.MeshBasicMaterial; mat.color.copy(color).multiplyScalar(1.05); mat.opacity = opacity; }
  });
  const clear = () => { root.visible = false; light.intensity = 0; };
  const show = (beat: CombatBeat, progress: number, start: T.Vector3, end: T.Vector3, floor: number, melee: boolean) => {
    root.visible = true;
    const color = new T.Color(beat.color), local = (progress - beat.start) / (beat.end - beat.start);
    const travel = T.MathUtils.clamp((progress - beat.launch) / (beat.impact - beat.launch), 0, 1), hit = (progress - beat.impact) / (beat.end - beat.impact);
    const landed = hit >= 0 && hit < 1, h = Math.max(0, hit), fade = Math.max(0, 1 - h), strength = beat.finale ? 1.65 : beat.knockedOut ? 1.3 : 1;
    const direction = end.clone().sub(start).normalize(), ribbonSide = new T.Vector3(-direction.z, 0, direction.x).normalize();
    charge.visible = progress < beat.impact; charge.position.set(start.x, floor + .05, start.z);
    charge.scale.setScalar(strength * (.65 + Math.min(local, .5) * 1.2)); charge.rotation.y = local * 2;
    glyph.rotation.z = local * 2; inner.rotation.z = -local * 4; runes.forEach((m, i) => m.position.y = .05 + Math.sin(local * Math.PI + i) * .06); paint(charge, color, progress < beat.launch ? .65 : .3);
    flight.visible = !melee && progress >= beat.launch && progress < beat.impact;
    flight.position.lerpVectors(start, end, travel); flight.position.y += Math.sin(travel * Math.PI) * (beat.style === 'stone' ? .7 : .28);
    flight.rotation.set(0, -Math.atan2(direction.z, direction.x), 0); flight.scale.setScalar(strength);
    crescents.forEach((m, i) => { m.visible = ['crescent', 'mist', 'star'].includes(beat.style); m.rotation.set(local * 7 + i, local * 4, i * 1.3); });
    core.rotation.set(local * 9, local * 12, 0); core.scale.setScalar(beat.style === 'star' ? 1.4 : .8);
    chunks.forEach((m, i) => { m.visible = beat.style === 'stone' || beat.style === 'leaf'; const a = i * 2.4 + local * 8; m.position.set(-i * .12, Math.sin(a) * .24, Math.cos(a) * .24); m.rotation.set(a, a * .7, i); m.scale.set(1, beat.style === 'leaf' ? .18 : 1, beat.style === 'leaf' ? 2.6 : 1); }); paint(flight, color, .85);
    trail.visible = progress >= beat.launch && progress < beat.impact;
    for (let i = 0; i <= 24; i++) {
      const t = Math.max(0, travel - i * .024), point = start.clone().lerp(end, t);
      point.y += Math.sin(t * Math.PI) * (beat.style === 'stone' ? .7 : .28);
      const width = (melee ? .16 : .13) * (1 - i / 24) * strength;
      for (let edge = 0; edge < 2; edge++) point.clone().addScaledVector(ribbonSide, (edge ? 1 : -1) * width).toArray(trailPositions, (i * 2 + edge) * 3);
    }
    trailGeometry.attributes.position.needsUpdate = true; trail.material.color.copy(color).multiplyScalar(2);
    impact.visible = landed; impact.position.copy(end); paint(impact, color.clone().lerp(new T.Color('#ffffff'), .3), fade * .8);
    waves.forEach((wave, i) => { wave.position.y = floor - end.y + .055 + i * .02; wave.scale.setScalar((1 + h * (i ? 4 : 6)) * strength); });
    slashes.forEach((m, i) => { m.scale.setScalar((.7 + h * 1.7) * strength); m.rotation.z = -.6 + i * 1.1 + h * 1.5; });
    halo.material.color.copy(color).lerp(new T.Color('#ffffff'), .35); halo.material.opacity = Math.max(0, 1 - h * 2) * .12; halo.scale.setScalar((2 + h) * strength);
    sparks.visible = landed; sparks.material.color.copy(color).multiplyScalar(2); sparks.material.opacity = fade;
    for (let i = 0; i < 64; i++) {
      const a = i * 2.39996, speed = .55 + (i % 9) * .12, distance = h * speed * 1.6 * strength;
      sparkPositions.set([end.x + Math.cos(a) * distance, end.y + Math.sin(i * 1.7) * distance * .7 + Math.sin(h * Math.PI) * .25, end.z + Math.sin(a) * distance], i * 3);
    }
    sparksGeometry.attributes.position.needsUpdate = true;
    dust.forEach((m, i) => { m.visible = landed; const a = i * 2.4; m.position.set(end.x + Math.cos(a) * h * 1.25, floor + .08 + Math.sin(h * Math.PI) * .3, end.z + Math.sin(a) * h * 1.25); m.scale.setScalar(.6 + h * 2.2); m.material.opacity = fade * .3; });
    damage.visible = landed;
    if (landed && labelId !== beat.id) {
      labelId = beat.id; const ctx = labelCanvas.getContext('2d')!; ctx.clearRect(0, 0, 256, 128); ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.font = '900 62px Georgia'; ctx.strokeStyle = '#082536'; ctx.lineWidth = 9; ctx.strokeText(`−${Math.round(beat.damage * 10) / 10}`, 128, 69); ctx.fillStyle = beat.knockedOut ? '#ffe294' : '#ffffff'; ctx.fillText(`−${Math.round(beat.damage * 10) / 10}`, 128, 69);
      if (beat.knockedOut) { ctx.font = 'bold 25px sans-serif'; ctx.strokeText('倒地撤回', 128, 108); ctx.fillText('倒地撤回', 128, 108); } labelTexture.needsUpdate = true;
    }
    damage.position.copy(end).add(new T.Vector3(0, .55 + h * .6, 0)); damage.scale.set(1.25 * strength, .625 * strength, 1); damage.material.opacity = Math.min(1, fade * 3);
    light.position.copy(end); light.color.copy(color); light.intensity = landed ? Math.max(0, 1 - h * 3) * 2.4 * strength : 0;
  };
  clear(); return { root, clear, show };
}
