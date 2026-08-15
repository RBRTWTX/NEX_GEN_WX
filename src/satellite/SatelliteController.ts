import type {
  ImageSource,
  Map as MapLibreMap,
  RasterTileSource,
} from 'maplibre-gl';
import type { BBox, MapScene } from '../types/domain';
import type { MapController, MapControllerContext } from '../map/controllers/controller-types';
import { cleanProviderError } from '../map/controllers/controller-utils';
import {
  fetchSatelliteFrameCatalog,
  iemArchiveImageUrl,
  iemLatestTileUrl,
  noaaGeoColorTileUrl,
} from './satellite-provider';
import {
  clearSatelliteRuntime,
  publishSatelliteRuntime,
} from './satellite-runtime-store';
import {
  SATELLITE_LAYER_ID,
  SATELLITE_SOURCE_ID,
} from './satellite-layer-ids';
import {
  satelliteDisplaySourceLabel,
  satelliteIsActive,
  satellitePlaybackFrameIndex,
  satelliteStateForScene,
  type SatelliteCatalog,
  type SatelliteFrame,
  type SatelliteProductId,
} from './satellite-types';

const AUTO_REFRESH_MS = 5 * 60_000;

type SourceKind = 'raster' | 'image' | null;

function clampFrame(index: number, frames: SatelliteFrame[]): number {
  if (!frames.length) return 0;
  if (index < 0) return frames.length - 1;
  return Math.max(0, Math.min(frames.length - 1, Math.round(index)));
}

function satelliteMapError(event: unknown): { satellite: boolean; detail: string } {
  const object = event && typeof event === 'object' ? event as Record<string, unknown> : null;
  const sourceId = String(object?.sourceId ?? object?.source ?? '');
  const candidate = object && 'error' in object ? object.error : event;
  const detail = cleanProviderError(candidate ?? 'Satellite imagery request failed');
  const text = `${sourceId} ${detail}`.toLowerCase();
  return {
    satellite: sourceId === SATELLITE_SOURCE_ID
      || text.includes('mesonet.agron.iastate.edu')
      || text.includes('satellitemaps.nesdis.noaa.gov'),
    detail,
  };
}

function mapBBox(context: MapControllerContext): BBox {
  const bounds = context.map.getBounds();
  return {
    west: Math.max(-179.9, bounds.getWest()),
    south: Math.max(-85, bounds.getSouth()),
    east: Math.min(179.9, bounds.getEast()),
    north: Math.min(85, bounds.getNorth()),
  };
}

function imageCoordinates(bbox: BBox): [[number, number], [number, number], [number, number], [number, number]] {
  return [
    [bbox.west, bbox.north],
    [bbox.east, bbox.north],
    [bbox.east, bbox.south],
    [bbox.west, bbox.south],
  ];
}

export class SatelliteController implements MapController {
  readonly id = 'satellite';
  private requestEpoch = 0;
  private catalogKey = '';
  private catalogIdentity = '';
  private frames: SatelliteFrame[] = [];
  private frameIndex = 0;
  private playbackTimer: number | null = null;
  private playbackRateMs = 0;
  private refreshTimer: number | null = null;
  private loadedRefreshToken = -1;
  private layerPresent = false;
  private sourceKind: SourceKind = null;
  private catalog: SatelliteCatalog | null = null;
  private lastContext: MapControllerContext | null = null;
  private disposed = false;

  onAttach(context: MapControllerContext): void {
    this.lastContext = context;
    this.configureRefreshTimer(context);
  }

  onStyleReady(context: MapControllerContext): void {
    this.lastContext = context;
    this.layerPresent = false;
    this.sourceKind = null;
    this.catalogKey = '';
    void this.sync(context, false);
  }

  onSceneChange(context: MapControllerContext, previous: MapScene): void {
    this.lastContext = context;
    if (previous.id !== context.scene.id) {
      this.stopPlayback();
      this.frames = [];
      this.frameIndex = 0;
      this.catalogKey = '';
      this.catalogIdentity = '';
      this.catalog = null;
      this.loadedRefreshToken = -1;
      this.requestEpoch += 1;
      clearSatelliteRuntime(previous.id, context.renderPurpose);
    }
    this.configureRefreshTimer(context);
    void this.sync(context, false);
  }

  onMoveEnd(context: MapControllerContext): void {
    this.lastContext = context;
    if (!satelliteIsActive(context.scene) || !this.frames.length) return;
    const frame = this.frames[clampFrame(this.frameIndex, this.frames)];
    if (frame?.mode === 'archive-image') this.renderFrame(context);
  }

  onLayerOrderChanged(context: MapControllerContext): void {
    this.applyPaint(context.map, context);
  }

  onMapError(context: MapControllerContext, event: unknown): boolean {
    if (!satelliteIsActive(context.scene)) return false;
    const failure = satelliteMapError(event);
    if (!failure.satellite) return false;
    const message = `Satellite imagery request failed: ${failure.detail}`;
    context.callbacks.reportProviderStatus('satellite-goes', 'degraded', message);
    publishSatelliteRuntime(context.scene.id, {
      loading: false,
      error: message,
      updatedAt: new Date().toISOString(),
    }, context.renderPurpose);
    context.setRenderPending(this.id, false);
    return true;
  }

  dispose(): void {
    this.disposed = true;
    this.requestEpoch += 1;
    this.stopPlayback();
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (this.lastContext) clearSatelliteRuntime(this.lastContext.scene.id, this.lastContext.renderPurpose);
    this.lastContext = null;
  }

  private buildCatalogIdentity(context: MapControllerContext): string {
    const state = satelliteStateForScene(context.scene);
    return [state.source, state.product, state.overlayEnabled].join('|');
  }

  private buildCatalogKey(context: MapControllerContext): string {
    const state = satelliteStateForScene(context.scene);
    return [
      context.scene.id,
      context.styleGeneration,
      state.source,
      state.product,
      state.overlayEnabled,
      state.frameCount,
      state.refreshToken,
    ].join('|');
  }

  private async sync(context: MapControllerContext, force: boolean): Promise<void> {
    if (this.disposed || !context.isStyleReady()) return;
    if (!satelliteIsActive(context.scene)) {
      this.requestEpoch += 1;
      this.stopPlayback();
      this.removeLayer(context.map);
      clearSatelliteRuntime(context.scene.id, context.renderPurpose);
      context.setRenderPending(this.id, false);
      return;
    }

    this.applyPaint(context.map, context);
    const state = satelliteStateForScene(context.scene);
    const nextKey = this.buildCatalogKey(context);
    const manualRefresh = this.loadedRefreshToken >= 0 && state.refreshToken !== this.loadedRefreshToken;
    if (force || manualRefresh || nextKey !== this.catalogKey || !this.frames.length) {
      await this.loadCatalog(context, force || manualRefresh, nextKey);
      return;
    }

    if (!state.animationEnabled || context.renderPurpose === 'export') {
      this.stopPlayback();
      this.frameIndex = satellitePlaybackFrameIndex(state, this.frames.length);
      this.renderFrame(context);
    } else {
      this.configurePlayback(context);
    }
    this.publishRuntime(context, '');
  }

  private async loadCatalog(
    context: MapControllerContext,
    force: boolean,
    nextKey = this.buildCatalogKey(context),
  ): Promise<void> {
    const epoch = ++this.requestEpoch;
    const sceneId = context.scene.id;
    const styleGeneration = context.styleGeneration;
    const state = satelliteStateForScene(context.scene);
    const nextIdentity = this.buildCatalogIdentity(context);

    if (this.catalogIdentity && this.catalogIdentity !== nextIdentity) {
      this.stopPlayback();
      this.frames = [];
      this.frameIndex = 0;
      this.catalog = null;
      this.removeLayer(context.map);
    }

    context.setRenderPending(this.id, true);
    context.callbacks.reportProviderStatus('satellite-goes', 'loading', 'Loading GOES satellite frames…');
    publishSatelliteRuntime(sceneId, {
      loading: true,
      error: '',
      source: state.source,
      product: state.product,
    }, context.renderPurpose);

    try {
      const catalog = await fetchSatelliteFrameCatalog(
        state.source,
        state.product,
        state.frameCount,
        force,
      );
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) return;
      if (!catalog.frames.length) throw new Error('The satellite provider returned no usable frames.');

      const latestState = satelliteStateForScene(context.scene);
      this.catalogKey = nextKey;
      this.catalogIdentity = nextIdentity;
      this.catalog = catalog;
      this.loadedRefreshToken = latestState.refreshToken;
      this.frames = catalog.frames;
      this.frameIndex = satellitePlaybackFrameIndex(latestState, this.frames.length);
      this.renderFrame(context);
      this.configurePlayback(context);
      const degraded = catalog.cacheStatus === 'stale' || Boolean(catalog.cacheWarning);
      context.callbacks.reportProviderStatus(
        'satellite-goes',
        degraded ? 'degraded' : 'online',
        catalog.cacheWarning || `${catalog.frames.length} GOES satellite frames available.`,
        catalog.cacheStatus,
      );
      this.publishRuntime(context, '');
    } catch (error) {
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) return;
      const message = cleanProviderError(error);
      context.callbacks.reportProviderStatus('satellite-goes', 'offline', message);
      this.removeLayer(context.map);
      publishSatelliteRuntime(sceneId, {
        loading: false,
        error: message,
        updatedAt: new Date().toISOString(),
      }, context.renderPurpose);
    } finally {
      if (this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) {
        context.setRenderPending(this.id, false);
      }
    }
  }

  private renderFrame(context: MapControllerContext): void {
    if (!context.isStyleReady() || !this.frames.length) return;
    const state = satelliteStateForScene(context.scene);
    const frame = this.frames[clampFrame(this.frameIndex, this.frames)];

    if (state.product === 'goes-geocolor') {
      this.ensureRasterLayer(context, noaaGeoColorTileUrl(frame.epochMs));
    } else if (frame.mode === 'archive-image') {
      const bbox = mapBBox(context);
      const canvas = context.map.getCanvas();
      const width = Math.max(320, canvas.clientWidth || canvas.width || 1024);
      const height = Math.max(240, canvas.clientHeight || canvas.height || 768);
      const url = iemArchiveImageUrl(state.product, frame, bbox, width, height);
      this.ensureImageLayer(context, url, imageCoordinates(bbox));
    } else {
      this.ensureRasterLayer(context, iemLatestTileUrl(state.source, state.product));
    }

    this.applyPaint(context.map, context);
    context.notifyLayerOrderChanged();
    this.publishRuntime(context, '');
  }

  private ensureRasterLayer(context: MapControllerContext, tileUrl: string): void {
    const map = context.map;
    if (this.sourceKind !== 'raster') {
      this.removeLayer(map);
    }
    const existingSource = map.getSource(SATELLITE_SOURCE_ID) as RasterTileSource | undefined;
    if (existingSource && typeof existingSource.setTiles === 'function') {
      existingSource.setTiles([tileUrl]);
    } else {
      if (map.getLayer(SATELLITE_LAYER_ID)) map.removeLayer(SATELLITE_LAYER_ID);
      if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID);
      map.addSource(SATELLITE_SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 12,
        attribution: 'NOAA GOES imagery via Iowa Environmental Mesonet / NOAA NESDIS',
      });
    }
    this.ensureLayer(map, context);
    this.sourceKind = 'raster';
  }

  private ensureImageLayer(
    context: MapControllerContext,
    url: string,
    coordinates: [[number, number], [number, number], [number, number], [number, number]],
  ): void {
    const map = context.map;
    if (this.sourceKind !== 'image') {
      this.removeLayer(map);
    }
    const existingSource = map.getSource(SATELLITE_SOURCE_ID) as ImageSource | undefined;
    if (existingSource && typeof existingSource.updateImage === 'function') {
      existingSource.updateImage({ url, coordinates });
    } else {
      if (map.getLayer(SATELLITE_LAYER_ID)) map.removeLayer(SATELLITE_LAYER_ID);
      if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID);
      map.addSource(SATELLITE_SOURCE_ID, {
        type: 'image',
        url,
        coordinates,
      });
    }
    this.ensureLayer(map, context);
    this.sourceKind = 'image';
  }

  private ensureLayer(map: MapLibreMap, context: MapControllerContext): void {
    if (!map.getLayer(SATELLITE_LAYER_ID)) {
      map.addLayer({
        id: SATELLITE_LAYER_ID,
        type: 'raster',
        source: SATELLITE_SOURCE_ID,
        paint: {
          'raster-opacity': context.scene.product.category === 'satellite'
            ? context.scene.product.opacity
            : 0.78,
          'raster-fade-duration': 0,
          'raster-resampling': context.scene.product.smoothing === 'sharp' ? 'nearest' : 'linear',
        },
      });
    }
    this.layerPresent = true;
  }

  private applyPaint(map: MapLibreMap, context: MapControllerContext): void {
    if (!this.layerPresent || !map.getLayer(SATELLITE_LAYER_ID)) return;
    const opacity = context.scene.product.category === 'satellite'
      ? context.scene.product.opacity
      : 0.78;
    map.setPaintProperty(SATELLITE_LAYER_ID, 'raster-opacity', opacity);
    map.setPaintProperty(
      SATELLITE_LAYER_ID,
      'raster-resampling',
      context.scene.product.smoothing === 'sharp' ? 'nearest' : 'linear',
    );
  }

  private removeLayer(map: MapLibreMap): void {
    if (map.getLayer(SATELLITE_LAYER_ID)) map.removeLayer(SATELLITE_LAYER_ID);
    if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID);
    this.layerPresent = false;
    this.sourceKind = null;
  }

  private configurePlayback(context: MapControllerContext): void {
    const state = satelliteStateForScene(context.scene);
    if (!state.animationEnabled || context.renderPurpose === 'export') {
      this.stopPlayback();
      return;
    }
    if (this.playbackTimer != null && this.playbackRateMs !== state.playbackRateMs) {
      this.stopPlayback();
    }
    this.startPlayback(context);
  }

  private startPlayback(context: MapControllerContext): void {
    const state = satelliteStateForScene(context.scene);
    if (!this.frames.length || this.playbackTimer != null) return;
    this.playbackRateMs = state.playbackRateMs;

    const tick = () => {
      this.playbackTimer = null;
      const current = this.lastContext;
      if (!current || current.scene.id !== context.scene.id) {
        this.stopPlayback();
        return;
      }
      const currentState = satelliteStateForScene(current.scene);
      if (!currentState.animationEnabled || current.renderPurpose === 'export') {
        this.stopPlayback();
        return;
      }
      const nextIndex = satellitePlaybackFrameIndex(currentState, this.frames.length);
      if (nextIndex !== this.frameIndex) {
        this.frameIndex = nextIndex;
        this.renderFrame(current);
      }
      const elapsed = Math.max(0, Date.now() - currentState.playbackStartedAt);
      const remainder = elapsed % currentState.playbackRateMs;
      const delay = Math.max(16, currentState.playbackRateMs - remainder + 8);
      this.playbackTimer = window.setTimeout(tick, delay);
    };

    this.frameIndex = satellitePlaybackFrameIndex(state, this.frames.length);
    this.renderFrame(context);
    const elapsed = Math.max(0, Date.now() - state.playbackStartedAt);
    const remainder = elapsed % state.playbackRateMs;
    this.playbackTimer = window.setTimeout(tick, Math.max(16, state.playbackRateMs - remainder + 8));
  }

  private stopPlayback(): void {
    if (this.playbackTimer != null) window.clearTimeout(this.playbackTimer);
    this.playbackTimer = null;
    this.playbackRateMs = 0;
  }

  private configureRefreshTimer(context: MapControllerContext): void {
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (!satelliteIsActive(context.scene) || !satelliteStateForScene(context.scene).autoRefreshEnabled) return;
    this.refreshTimer = window.setInterval(() => {
      const current = this.lastContext;
      if (!current || !satelliteIsActive(current.scene)) return;
      this.catalogKey = '';
      void this.sync(current, false);
    }, AUTO_REFRESH_MS);
  }

  private publishRuntime(context: MapControllerContext, error: string): void {
    const state = satelliteStateForScene(context.scene);
    const frame = this.frames[clampFrame(this.frameIndex, this.frames)];
    const provider = this.catalog?.provider === 'noaa-nesdis-geocolor'
      ? 'NOAA/NESDIS GeoColor ImageServer'
      : frame?.mode === 'archive-image'
        ? 'Iowa Environmental Mesonet GOES archive composite · closest to requested time'
        : `Iowa Environmental Mesonet / ${satelliteDisplaySourceLabel(state.source, state.product)}`;
    publishSatelliteRuntime(context.scene.id, {
      loading: false,
      error,
      provider,
      source: state.source,
      product: state.product,
      frames: this.frames,
      frameIndex: this.frameIndex,
      validTime: frame?.validTime ?? '',
      updatedAt: new Date().toISOString(),
    }, context.renderPurpose);
  }

  private isRequestCurrent(
    context: MapControllerContext,
    epoch: number,
    sceneId: string,
    styleGeneration: number,
  ): boolean {
    return !this.disposed
      && epoch === this.requestEpoch
      && context.scene.id === sceneId
      && context.styleGeneration === styleGeneration
      && context.isStyleReady();
  }
}