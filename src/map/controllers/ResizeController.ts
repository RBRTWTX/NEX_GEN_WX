import type { MapController, MapControllerContext } from './controller-types';

export class ResizeController implements MapController {
  readonly id = 'resize';
  private observer: ResizeObserver | null = null;
  private context: MapControllerContext | null = null;

  onAttach(context: MapControllerContext): void {
    this.context = context;
    this.observer = new ResizeObserver(() => context.scheduleResize());
    this.observer.observe(context.map.getContainer());
    window.addEventListener('resize', this.onWindowResize);
  }

  onStyleReady(context: MapControllerContext): void {
    context.scheduleResize();
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.context = null;
    window.removeEventListener('resize', this.onWindowResize);
  }

  private readonly onWindowResize = (): void => {
    this.context?.scheduleResize();
  };
}
