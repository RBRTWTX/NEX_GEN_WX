import type { CameraState, MapScene } from '../../types/domain';
import type { MapController, MapControllerContext } from './controller-types';

function currentCamera(context: MapControllerContext): CameraState {
  const center = context.map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: context.map.getZoom(),
    pitch: context.map.getPitch(),
    bearing: context.map.getBearing(),
  };
}

function cameraChanged(left: CameraState, right: CameraState): boolean {
  return Math.abs(left.center[0] - right.center[0]) > 0.0001
    || Math.abs(left.center[1] - right.center[1]) > 0.0001
    || Math.abs(left.zoom - right.zoom) > 0.001
    || Math.abs(left.pitch - right.pitch) > 0.001
    || Math.abs(left.bearing - right.bearing) > 0.001;
}

export class CameraController implements MapController {
  readonly id = 'camera';
  private programmaticTarget: CameraState | null = null;

  onSceneChange(context: MapControllerContext, previous: MapScene): void {
    if (previous.id === context.scene.id && !cameraChanged(previous.camera, context.scene.camera)) return;
    const current = currentCamera(context);
    if (!cameraChanged(current, context.scene.camera)) return;
    this.programmaticTarget = context.scene.camera;
    context.map.easeTo({
      center: context.scene.camera.center,
      zoom: context.scene.camera.zoom,
      pitch: context.scene.camera.pitch,
      bearing: context.scene.camera.bearing,
      duration: context.scene.transition.type === 'cut' ? 0 : context.scene.transition.durationMs,
    });
  }

  onMoveEnd(context: MapControllerContext): void {
    const current = currentCamera(context);
    if (this.programmaticTarget && !cameraChanged(current, this.programmaticTarget)) {
      this.programmaticTarget = null;
      return;
    }
    this.programmaticTarget = null;
    context.callbacks.onCameraChange?.(current);
  }
}
