import type {
  Map as MapLibreMap,
  MapMouseEvent,
} from 'maplibre-gl';
import type {
  GeoJsonFeatureCollection,
  MapScene,
  ObservationSummary,
} from '../../types/domain';
import {
  createBasemapFallbackStyle,
  createBasemapStyle,
  type BasemapStyle,
} from '../basemap-styles';
import { moduleRegistry } from '../../modules/registry';
import type {
  MapController,
  MapControllerCallbacks,
  MapControllerContext,
  MapRenderPurpose,
} from './controller-types';
import { cleanProviderError } from './controller-utils';
import { MapLifecycleController } from './MapLifecycleController';

interface MapControllerHostOptions {
  scene: MapScene;
  interactive: boolean;
  renderPurpose: MapRenderPurpose;
  callbacks: MapControllerCallbacks;
  alerts: GeoJsonFeatureCollection;
  selectedAlertId: string | null;
  selectedObservation: ObservationSummary | null;
  onRenderReady?: () => void;
}

export class MapControllerHost implements MapControllerContext {
  private readonly lifecycle = new MapLifecycleController();
  private currentScene: MapScene;
  private currentCallbacks: MapControllerCallbacks;
  private currentAlerts: GeoJsonFeatureCollection;
  private currentSelectedAlertId: string | null;
  private currentSelectedObservation: ObservationSummary | null;
  private styleReady = false;
  private generation = 1;
  private disposed = false;
  private resizeFrame: number | null = null;
  private lastBasemapError = '';
  private remoteStylePending = false;
  private readonly controllers: MapController[];
  private readonly onRenderReady?: () => void;
  private readyGeneration = 0;
  private readonly pendingRenderControllers = new Set<string>();

  readonly interactive: boolean;
  readonly renderPurpose: MapRenderPurpose;

  constructor(options: MapControllerHostOptions) {
    this.currentScene = options.scene;
    this.interactive = options.interactive;
    this.renderPurpose = options.renderPurpose;
    this.currentCallbacks = options.callbacks;
    this.currentAlerts = options.alerts;
    this.currentSelectedAlertId = options.selectedAlertId;
    this.currentSelectedObservation = options.selectedObservation;
    this.onRenderReady = options.onRenderReady;

    this.controllers = moduleRegistry.createMapControllers();
  }

  get map(): MapLibreMap {
    const map = this.lifecycle.map;
    if (!map) throw new Error('Map controller host is not mounted.');
    return map;
  }

  get scene(): MapScene {
    return this.currentScene;
  }

  get styleGeneration(): number {
    return this.generation;
  }

  get alerts(): GeoJsonFeatureCollection {
    return this.currentAlerts;
  }

  get selectedAlertId(): string | null {
    return this.currentSelectedAlertId;
  }

  get selectedObservation(): ObservationSummary | null {
    return this.currentSelectedObservation;
  }

  get callbacks(): MapControllerCallbacks {
    return this.currentCallbacks;
  }

  mount(container: HTMLDivElement): boolean {
    if (this.lifecycle.map || this.disposed) return false;
    try {
      const style = createBasemapStyle(this.currentScene.baseMap);
      this.remoteStylePending = typeof style === 'string';
      this.lifecycle.mount({
        container,
        scene: this.currentScene,
        interactive: this.interactive,
        style,
        events: {
          onStyleLoad: this.handleStyleLoad,
          onMoveEnd: this.handleMoveEnd,
          onMapClick: this.handleMapClick,
          onMapError: this.handleMapError,
          onIdle: this.handleIdle,
        },
      });
    } catch (error) {
      this.currentCallbacks.reportProviderStatus(
        'basemap',
        'offline',
        `Map could not initialize: ${cleanProviderError(error)}`,
      );
      return false;
    }
    for (const controller of this.controllers) this.invoke(controller, 'onAttach');
    return true;
  }

  updateCallbacks(callbacks: MapControllerCallbacks): void {
    this.currentCallbacks = callbacks;
  }

  updateScene(scene: MapScene): void {
    const previous = this.currentScene;
    this.currentScene = scene;
    this.readyGeneration = 0;
    if (!this.lifecycle.map) return;
    for (const controller of this.controllers) this.invoke(controller, 'onSceneChange', previous);
  }

  updateAlerts(alerts: GeoJsonFeatureCollection): void {
    this.currentAlerts = alerts;
    if (!this.lifecycle.map) return;
    for (const controller of this.controllers) this.invoke(controller, 'onAlertsChange');
  }

  updateSelectedAlert(id: string | null): void {
    this.currentSelectedAlertId = id;
    if (!this.lifecycle.map) return;
    for (const controller of this.controllers) this.invoke(controller, 'onSelectedAlertChange');
  }

  updateSelectedObservation(observation: ObservationSummary | null): void {
    this.currentSelectedObservation = observation;
    if (!this.lifecycle.map) return;
    for (const controller of this.controllers) this.invoke(controller, 'onSelectedObservationChange');
  }

  refreshObservations(force: boolean): void {
    if (!this.lifecycle.map) return;
    for (const controller of this.controllers) this.invoke(controller, 'onObservationRefresh', force);
  }

  isStyleReady(): boolean {
    return Boolean(this.lifecycle.map && this.styleReady && this.lifecycle.map.isStyleLoaded());
  }

  reloadStyle(style: BasemapStyle): void {
    if (!this.lifecycle.map) return;
    this.remoteStylePending = typeof style === 'string';
    this.styleReady = false;
    this.generation += 1;
    this.readyGeneration = 0;
    this.lifecycle.reloadStyle(style);
  }

  scheduleResize(): void {
    if (!this.lifecycle.map) return;
    if (this.resizeFrame != null) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.lifecycle.map?.resize();
    });
  }

  notifyLayerOrderChanged(): void {
    if (!this.lifecycle.map) return;
    for (const controller of this.controllers) this.invoke(controller, 'onLayerOrderChanged');
  }

  setRenderPending(id: string, pending: boolean): void {
    if (pending) {
      this.pendingRenderControllers.add(id);
      this.readyGeneration = 0;
      return;
    }
    this.pendingRenderControllers.delete(id);
    this.lifecycle.map?.triggerRepaint();
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.resizeFrame != null) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = null;
    this.pendingRenderControllers.clear();
    for (const controller of [...this.controllers].reverse()) controller.dispose?.();
    this.lifecycle.destroy();
  }

  private readonly handleStyleLoad = (): void => {
    if (!this.lifecycle.map || this.disposed) return;
    this.styleReady = true;
    this.lastBasemapError = '';
    this.remoteStylePending = false;
    this.scheduleResize();
    for (const controller of this.controllers) this.invoke(controller, 'onStyleReady');
  };

  private readonly handleMoveEnd = (): void => {
    if (!this.lifecycle.map || this.disposed) return;
    for (const controller of this.controllers) this.invoke(controller, 'onMoveEnd');
  };

  private readonly handleMapClick = (event: MapMouseEvent): void => {
    if (!this.lifecycle.map || this.disposed) return;
    for (const controller of this.controllers) {
      if (controller.onMapClick?.(this, event)) break;
    }
  };


  private readonly handleIdle = (): void => {
    if (!this.lifecycle.map || this.disposed || !this.styleReady) return;
    if (this.pendingRenderControllers.size > 0) return;
    if (this.readyGeneration === this.generation) return;
    this.readyGeneration = this.generation;
    this.onRenderReady?.();
  };

  private readonly handleMapError = (event: unknown): void => {
    const candidate = event && typeof event === 'object' && 'error' in event
      ? (event as { error?: unknown }).error
      : event;
    const message = cleanProviderError(candidate ?? 'Basemap rendering error');
    if (!message || message === this.lastBasemapError) return;
    this.lastBasemapError = message;

    if (!this.styleReady && this.remoteStylePending) {
      this.remoteStylePending = false;
      this.currentCallbacks.reportProviderStatus(
        'basemap',
        'degraded',
        `Vector basemap failed; using raster fallback: ${message}`,
      );
      this.lifecycle.reloadStyle(createBasemapFallbackStyle(this.currentScene.baseMap));
      return;
    }

    this.currentCallbacks.reportProviderStatus('basemap', 'degraded', message);
  };

  private invoke<K extends keyof MapController>(
    controller: MapController,
    method: K,
    ...args: unknown[]
  ): void {
    const handler = controller[method];
    if (typeof handler !== 'function') return;
    try {
      const result = (handler as (...values: unknown[]) => unknown).call(controller, this, ...args);
      if (result instanceof Promise) {
        void result.catch((error) => {
          console.error(`[MapController:${controller.id}] ${String(method)} failed`, error);
        });
      }
    } catch (error) {
      console.error(`[MapController:${controller.id}] ${String(method)} failed`, error);
    }
  }
}
