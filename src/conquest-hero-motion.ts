import * as T from 'three';
import { ease, type CombatBeat } from './conquest-choreography';

export type HeroStyle = 'bow' | 'spell' | 'strike';
export const heroStyle = (id: string): HeroStyle => id === 'hero-elf' ? 'bow' : ['hero-druid', 'hero-necromancer'].includes(id) ? 'spell' : 'strike';
export const heroMove = (id: string) => ({ 'hero-elf': '晨露穿雲箭', 'hero-druid': '森靈共鳴', 'hero-necromancer': '幽燈引魂', 'hero-dwarf': '銅砧破陣', 'hero-undead': '誓衛斬擊', 'hero-gnome': '齒輪脈衝', 'hero-goblin': '砂港爆彈' }[id] ?? '英雄協擊');
export function heroAssist(beats: CombatBeat[], beat: CombatBeat | undefined, side: number) {
  return !!beat && beat.side === side && !beats.some(b => b.round === beat.round && b.side === side && b.start < beat.start);
}

// The imported elf clip is a static pose. Preserve its authored rest transforms.
// Spatial and texture masks anchor the scalp/face and exclude weapons and boots.
export function attachHeroMotion(model: T.Group, id: string) {
  const joints = new Map<string, { bone: T.Bone; rest: T.Quaternion }>();
  model.traverse(o => { if (o instanceof T.Bone) joints.set(o.name, { bone: o, rest: o.quaternion.clone() }); });
  const time = { value: 0 }, wind = { value: 0 }, cast = { value: 0 };
  let hairVertices = 0, clothVertices = 0;
  model.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const geometry = object.geometry, positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
    geometry.computeBoundingBox(); const bounds = geometry.boundingBox!, height = bounds.max.y - bounds.min.y;
    const hair = new Float32Array(positions.count), cloth = new Float32Array(positions.count), upper = new Float32Array(positions.count);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const material = materials[0] as T.MeshStandardMaterial, image = material.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
    let pixels: Uint8ClampedArray | undefined, textureWidth = 0, textureHeight = 0;
    if (image && uv) try { const canvas = document.createElement('canvas'); textureWidth = canvas.width = image.width; textureHeight = canvas.height = image.height; const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0); pixels = ctx.getImageData(0, 0, textureWidth, textureHeight).data; } catch { /* Conservative spatial masks still keep the face anchored. */ }
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = (positions.getY(i) - bounds.min.y) / height;
      let copper = 1, fabric = 1;
      if (pixels && uv) {
        const tx = Math.min(textureWidth - 1, Math.max(0, Math.floor(uv.getX(i) * textureWidth))), ty = Math.min(textureHeight - 1, Math.max(0, Math.floor((material.map?.flipY ? 1 - uv.getY(i) : uv.getY(i)) * textureHeight)));
        const at = (ty * textureWidth + tx) * 4, r = pixels[at], g = pixels[at + 1], b = pixels[at + 2];
        copper = T.MathUtils.smoothstep(r - g, 8, 40) * T.MathUtils.smoothstep(g - b, 2, 24);
        fabric = 1 - copper;
      }
      if (id === 'hero-elf') {
        const tail = T.MathUtils.smoothstep(-x / height, .06, .30);
        hair[i] = tail * T.MathUtils.smoothstep(y, .65, .78) * copper;
        cloth[i] = tail * T.MathUtils.smoothstep(y, .18, .32) * (1 - T.MathUtils.smoothstep(y, .70, .79)) * fabric;
      }
      upper[i] = joints.size ? 0 : T.MathUtils.smoothstep(y, .35, .8);
      if (hair[i] > .05) hairVertices++; if (cloth[i] > .05) clothVertices++;
    }
    geometry.setAttribute('heroHair', new T.BufferAttribute(hair, 1)); geometry.setAttribute('heroCloth', new T.BufferAttribute(cloth, 1)); geometry.setAttribute('heroUpper', new T.BufferAttribute(upper, 1));
    const decorate = (mat: T.Material) => {
      mat.onBeforeCompile = shader => {
        shader.uniforms.heroTime = time; shader.uniforms.heroWind = wind; shader.uniforms.heroCast = cast; shader.uniforms.heroExtent = { value: height };
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nattribute float heroHair;attribute float heroCloth;attribute float heroUpper;uniform float heroTime;uniform float heroWind;uniform float heroCast;uniform float heroExtent;`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
float hairWave=sin(heroTime*3.6+position.x/heroExtent*10.);float clothWave=sin(heroTime*2.5+position.y/heroExtent*9.);
transformed.z+=heroExtent*heroWind*(heroHair*hairWave*.045+heroCloth*clothWave*.035);
transformed.y+=heroExtent*heroWind*(heroHair*cos(heroTime*4.3+position.x/heroExtent*8.)*.018+heroCloth*sin(heroTime*3.1+position.x/heroExtent*7.)*.014);
transformed.x+=heroExtent*heroUpper*heroCast*.045;`);
      };
      mat.customProgramCacheKey = () => 'conquest-hero-secondary-v1'; mat.needsUpdate = true;
    };
    materials.forEach(decorate);
    object.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }); decorate(object.customDepthMaterial);
    object.customDistanceMaterial = new T.MeshDistanceMaterial(); decorate(object.customDistanceMaterial);
    // release() disposes the scene materials; custom shadow materials need explicit disposal.
  });
  const turn = (name: string, axis: 'x' | 'y' | 'z', amount: number) => { const joint = joints.get(name); if (!joint) return; if (axis === 'x') joint.bone.rotateX(amount); else if (axis === 'y') joint.bone.rotateY(amount); else joint.bone.rotateZ(amount); };
  const pose = (seconds: number, draw: number, recoil: number, victory: number, moving: boolean) => {
    time.value = seconds; wind.value = moving ? 1 + draw * .25 + recoil * .35 : 0; cast.value = draw - recoil * .75;
    joints.forEach(({ bone, rest }) => bone.quaternion.copy(rest));
    if (id !== 'hero-elf') return;
    const breath = moving ? Math.sin(seconds * 2) * .015 : 0;
    turn('Spine01', 'z', breath - draw * .07 + recoil * .10 - victory * .05);
    turn('Spine', 'y', draw * .065 - recoil * .10);
    turn('LeftArm', 'z', (1 - draw) * -.07 + recoil * .045 + victory * .19);
    turn('LeftForeArm', 'x', draw * -.045 + recoil * .06);
    turn('RightArm', 'x', draw * .13 - recoil * .22 + victory * .08);
    turn('RightForeArm', 'z', draw * -.12 + recoil * .28);
    turn('RightHand', 'y', recoil * -.16);
    turn('Head', 'z', breath * .4 - draw * .025 - victory * .04);
  };
  return { pose, hairVertices, clothVertices, dispose: () => model.traverse(o => { if (o instanceof T.Mesh) { o.customDepthMaterial?.dispose(); o.customDistanceMaterial?.dispose(); } }) };
}

export function assistPose(beat: CombatBeat, progress: number) {
  const draw = ease((progress - beat.start) / (beat.launch - beat.start));
  const recovery = ease((progress - beat.impact) / (beat.end - beat.impact));
  const released = progress >= beat.launch;
  return { draw: released ? 1 - ease((progress - beat.launch) / (beat.impact - beat.launch)) : draw, recoil: released ? Math.sin(Math.min(1, (progress - beat.launch) / (beat.end - beat.launch)) * Math.PI) : 0, recovery };
}
