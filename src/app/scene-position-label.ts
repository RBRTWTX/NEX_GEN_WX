import type { StudioScene } from '../types/domain';

export function scenePositionLabel(scene: StudioScene): string {
  if (scene.kind === 'graphic') return 'GRAPHIC SCENE';
  const scale = scene.camera.zoom < 4.5 ? 'CONUS' : scene.camera.zoom < 7 ? 'REGIONAL' : 'LOCAL';
  return `${scene.camera.center[1].toFixed(3)}°, ${scene.camera.center[0].toFixed(3)}° Z${scene.camera.zoom.toFixed(1)} · ${scale}`;
}
