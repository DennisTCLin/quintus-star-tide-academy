import * as T from 'three';
import { alphaBounds, fittedArtSize, FULL_ART } from './creature-body';
import { figureSpan } from './conquest-scale';

/** Pull back only as far as required to keep the supplied world bounds visible. */
export function fitCameraToPoints(camera: T.PerspectiveCamera, target: T.Vector3, points: readonly T.Vector3[], padding = 1.12) {
  const forward = camera.position.clone().sub(target).normalize();
  const right = new T.Vector3().crossVectors(camera.up, forward).normalize();
  const up = new T.Vector3().crossVectors(forward, right).normalize();
  const vertical = Math.tan(T.MathUtils.degToRad(camera.fov / 2)), horizontal = vertical * camera.aspect;
  let distance = camera.position.distanceTo(target);
  for (const point of points) {
    const delta = point.clone().sub(target), depth = delta.dot(forward);
    distance = Math.max(distance, depth + Math.abs(delta.dot(right)) * padding / horizontal, depth + Math.abs(delta.dot(up)) * padding / vertical);
  }
  camera.position.copy(target).addScaledVector(forward, distance); camera.lookAt(target); camera.updateMatrixWorld();
  return distance;
}

/** Uniform fit preserves the artist's proportions; feet touch the actor origin. */
export function fitCharacter(model: T.Group, id: string) {
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
  const span = figureSpan(id);
  // Commanders retain their established human-height reference.
  const scale = id.startsWith('hero-') ? Math.min(span / Math.max(size.y, 1e-6), span * 1.8 / Math.max(size.x, size.z, 1e-6)) : span / Math.max(size.x, size.y, size.z, 1e-6);
  model.scale.multiplyScalar(scale); model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  model.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { height: size.y * scale, width: size.x * scale, depth: size.z * scale };
}

export function fitPortrait(texture: T.Texture, id: string) {
  const image = texture.image as HTMLImageElement;
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  let bounds = FULL_ART;
  try {
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 320 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) { context.drawImage(image, 0, 0, canvas.width, canvas.height); bounds = alphaBounds(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height); }
  } catch { /* An opaque/cross-origin fallback still keeps the original aspect. */ }
  texture.repeat.set(bounds.width, bounds.height); texture.offset.set(bounds.x, 1 - bounds.y - bounds.height);
  texture.needsUpdate = true;
  const size = fittedArtSize(width, height, bounds, figureSpan(id));
  if (id.startsWith('hero-')) { size.width *= figureSpan(id) / size.height; size.height = figureSpan(id); }
  return size;
}
