import { enforceStudioLayerOrder } from '../map-runtime';
import type { MapController, MapControllerContext } from './controller-types';

export class LayerOrderController implements MapController {
  readonly id = 'layer-order';
  private scheduledFrame: number | null = null;

  onStyleReady(context: MapControllerContext): void {
    this.enforce(context);
  }

  onSceneChange(context: MapControllerContext): void {
    this.enforce(context);
  }

  onLayerOrderChanged(context: MapControllerContext): void {
    this.enforce(context);
  }

  dispose(): void {
    if (this.scheduledFrame != null) cancelAnimationFrame(this.scheduledFrame);
    this.scheduledFrame = null;
  }

  private enforce(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    if (this.scheduledFrame != null) cancelAnimationFrame(this.scheduledFrame);
    this.scheduledFrame = requestAnimationFrame(() => {
      this.scheduledFrame = null;
      if (context.isStyleReady()) enforceStudioLayerOrder(context.map);
    });
  }
}
