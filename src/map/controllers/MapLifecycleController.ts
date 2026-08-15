import {
  Map,
  NavigationControl,
  setWorkerUrl,
  type Map as MapLibreMap,
  type MapMouseEvent,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { MapScene } from '../../types/domain';
import type { BasemapStyle } from '../basemap-styles';

setWorkerUrl(workerUrl);

interface MapLifecycleEvents {
  onStyleLoad: () => void;
  onMoveEnd: () => void;
  onMapClick: (event: MapMouseEvent) => void;
  onMapError: (event: unknown) => void;
  onIdle: () => void;
}

interface MapLifecycleMountOptions {
  container: HTMLDivElement;
  scene: MapScene;
  interactive: boolean;
  style: BasemapStyle;
  events: MapLifecycleEvents;
}

export class MapLifecycleController {
  private mapInstance: MapLibreMap | null = null;
  private events: MapLifecycleEvents | null = null;

  get map(): MapLibreMap | null {
    return this.mapInstance;
  }

  mount(options: MapLifecycleMountOptions): MapLibreMap {
    if (this.mapInstance) return this.mapInstance;
    options.container.dataset.basemap = options.scene.baseMap;
    const map = new Map({
      container: options.container,
      style: options.style,
      center: options.scene.camera.center,
      zoom: options.scene.camera.zoom,
      pitch: options.scene.camera.pitch,
      bearing: options.scene.camera.bearing,
      interactive: options.interactive,
      canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
      attributionControl: options.interactive ? { compact: true } : false,
      crossSourceCollisions: true,
    });
    if (options.interactive) {
      map.addControl(new NavigationControl({ showCompass: true }), 'bottom-right');
    }
    this.events = options.events;
    map.on('style.load', options.events.onStyleLoad);
    map.on('moveend', options.events.onMoveEnd);
    map.on('click', options.events.onMapClick);
    map.on('error', options.events.onMapError);
    map.on('idle', options.events.onIdle);
    this.mapInstance = map;
    return map;
  }

  reloadStyle(style: BasemapStyle): void {
    this.mapInstance?.setStyle(style);
  }

  destroy(): void {
    const map = this.mapInstance;
    const events = this.events;
    if (map && events) {
      map.off('style.load', events.onStyleLoad);
      map.off('moveend', events.onMoveEnd);
      map.off('click', events.onMapClick);
      map.off('error', events.onMapError);
      map.off('idle', events.onIdle);
    }
    map?.remove();
    this.mapInstance = null;
    this.events = null;
  }
}
