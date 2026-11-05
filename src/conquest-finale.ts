import * as T from 'three';
import { ease, type CombatBeat } from './conquest-choreography';
import { heroStyle } from './conquest-hero-motion';

export function createHeroEffects(scene: T.Scene) {
  const root = new T.Group(), projectile = new T.Group(); root.add(projectile); scene.add(root);
  const gold = new T.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: .9, depthWrite: false });
  const shaft = new T.Mesh(new T.CylinderGeometry(.012, .012, .58, 6), gold); shaft.rotation.z = -Math.PI / 2; projectile.add(shaft);
  const tip = new T.Mesh(new T.ConeGeometry(.055, .14, 5), gold); tip.rotation.z = -Math.PI / 2; tip.position.x = .35; projectile.add(tip);
  const fletching = new T.Mesh(new T.OctahedronGeometry(.065), gold); fletching.scale.set(1.5, 1, .2); fletching.position.x = -.25; projectile.add(fletching);
  const orb = new T.Mesh(new T.IcosahedronGeometry(.12, 1), new T.MeshBasicMaterial({ color: '#aaeed4', transparent: true, opacity: .75 })); projectile.add(orb);
  const arc = new T.Mesh(new T.TorusGeometry(.38, .018, 5, 36, Math.PI * 1.3), gold); projectile.add(arc);
  const lineGeometry = new T.BufferGeometry().setFromPoints(Array.from({ length: 14 }, () => new T.Vector3()));
  const line = new T.Line(lineGeometry, new T.LineBasicMaterial({ color: '#f5d497', transparent: true, opacity: .55, depthWrite: false })); line.frustumCulled = false; root.add(line);
  const rune = new T.Mesh(new T.RingGeometry(.35, .37, 32), gold); rune.rotation.x = -Math.PI / 2; root.add(rune);
  const clear = () => { root.visible = false; };
  const show = (id: string, beat: CombatBeat, progress: number, start: T.Vector3, end: T.Vector3, ground: number) => {
    root.visible = true; const style = heroStyle(id), t = T.MathUtils.clamp((progress - beat.launch) / (beat.impact - beat.launch), 0, 1);
    projectile.visible = progress >= beat.launch && progress < beat.impact; line.visible = projectile.visible;
    shaft.visible = tip.visible = fletching.visible = style === 'bow'; orb.visible = style === 'spell'; arc.visible = style === 'strike';
    projectile.position.lerpVectors(start, end, t); projectile.position.y += Math.sin(t * Math.PI) * (style === 'bow' ? .12 : .38);
    projectile.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), end.clone().sub(start).normalize()); arc.rotation.x = t * 5;
    const points = line.geometry.getAttribute('position');
    for (let i = 0; i < 14; i++) { const q = Math.max(0, t - i * .018), p = start.clone().lerp(end, q); p.y += Math.sin(q * Math.PI) * (style === 'bow' ? .12 : .38); points.setXYZ(i, p.x, p.y, p.z); } points.needsUpdate = true;
    rune.visible = progress < beat.launch; rune.position.set(start.x, ground + .035, start.z); rune.scale.setScalar(.6 + ease((progress - beat.start) / (beat.launch - beat.start)) * .7);
  };
  clear(); return { clear, show };
}

export function createVictory(scene: T.Scene) {
  const root = new T.Group(), standard = new T.Group(); root.add(standard); scene.add(root); root.visible = false;
  const brass = new T.MeshStandardMaterial({ color: '#d3ac5c', metalness: .65, roughness: .35 });
  const pole = new T.Mesh(new T.CylinderGeometry(.018, .025, 1.65, 8), brass); pole.position.y = .825; standard.add(pole);
  const finial = new T.Mesh(new T.OctahedronGeometry(.085), brass); finial.position.y = 1.72; standard.add(finial);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 320;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#0a384b'; ctx.fillRect(0, 0, 512, 320); ctx.strokeStyle = '#e3bb68'; ctx.lineWidth = 12; ctx.strokeRect(9, 9, 494, 302);
  ctx.translate(256, 160); ctx.strokeStyle = '#edce88'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 77, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -98); ctx.lineTo(19, 0); ctx.lineTo(0, 30); ctx.lineTo(-19, 0); ctx.closePath(); ctx.fillStyle = i % 2 ? '#ba8d44' : '#ffe7aa'; ctx.fill(); ctx.restore(); }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const fabric = new T.MeshStandardMaterial({ map: texture, side: T.DoubleSide, roughness: .85 }); const clock = { value: 0 }, breeze = { value: 1 };
  fabric.onBeforeCompile = shader => { shader.uniforms.flagTime = clock; shader.uniforms.flagWind = breeze; shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float flagTime;uniform float flagWind;').replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat freeEdge=(position.x+.43)/.86; transformed.z+=sin(flagTime*3.+position.x*8.+position.y*3.)*.065*freeEdge*flagWind;'); };
  const flag = new T.Mesh(new T.PlaneGeometry(.86, .54, 20, 8), fabric); flag.position.set(.43, 1.27, .015); standard.add(flag);
  const seal = new T.Mesh(new T.RingGeometry(1.1, 1.12, 64), new T.MeshBasicMaterial({ color: '#f8d78f', transparent: true, opacity: .65, side: T.DoubleSide, depthWrite: false })); seal.rotation.x = -Math.PI / 2; seal.position.y = .025; root.add(seal);
  const positions = new Float32Array(56 * 3), geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
  const petals = new T.Points(geometry, new T.PointsMaterial({ color: '#ffd78b', size: .045, transparent: true, opacity: .85, depthWrite: false })); petals.frustumCulled = false; root.add(petals);
  const light = new T.PointLight('#ffc76b', .6, 5); light.position.set(0, 1.8, 0); root.add(light);
  const show = (reveal: number, seconds: number, position: T.Vector3, moving: boolean) => {
    root.visible = reveal > 0; root.position.copy(position); clock.value = seconds; breeze.value = moving ? 1 : 0;
    standard.position.y = -.8 * (1 - ease(reveal * 2)); standard.scale.setScalar(.45 + ease(reveal * 2) * .55);
    seal.scale.setScalar(.35 + ease(reveal) * 1.05); seal.material.opacity = .6 * ease(reveal * 3);
    petals.visible = moving;
    for (let i = 0; i < 56; i++) { const phase = (seconds * .22 + i * .618) % 1, angle = i * 2.4 + seconds * .18, r = .5 + (i % 7) * .23; positions.set([Math.cos(angle) * r, .2 + phase * 2.4, Math.sin(angle) * r], i * 3); } geometry.attributes.position.needsUpdate = true;
  };
  return { root, show };
}
