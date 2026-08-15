import type { Map as MapLibreMap, RasterTileSource } from 'maplibre-gl';
import type { MapScene } from '../types/domain';
import type { MapController, MapControllerContext } from '../map/controllers/controller-types';
import { cleanProviderError } from '../map/controllers/controller-utils';
import {
  fetchAvailableRadarSites,
  fetchMrmsRadarCatalog,
  fetchSiteRadarCatalog,
  iemRadarTileUrl,
  mrmsTileUrl,
} from './radar-provider';
import { clearRadarRuntime, publishRadarRuntime } from './radar-runtime-store';
import { MAX_RADAR_RENDER_LAYERS, radarLayerId, radarSourceId } from './radar-layer-ids';
import {
  iemProductCode,
  isSiteRadarProduct,
  radarPlaybackFrameIndex,
  radarProductForScene,
  radarStateForScene,
  type RadarCatalog,
  type RadarFrame,
  type RadarSite,
} from './radar-types';

const AUTO_REFRESH_MS = 5 * 60_000;
const MAX_BLEND_SITES = MAX_RADAR_RENDER_LAYERS;

interface SiteCatalogState {
  site: string;
  catalog: RadarCatalog;
}

function clampFrame(index: number, frames: RadarFrame[]): number {
  if (!frames.length) return 0;
  if (index < 0) return frames.length - 1;
  return Math.max(0, Math.min(frames.length - 1, Math.round(index)));
}

function latestFrame(id: string): RadarFrame {
  return {
    id,
    validTime: new Date().toISOString(),
    label: 'Latest',
    timestamp: '0',
    epochMs: null,
  };
}

function centerKey(context: MapControllerContext): string {
  const center = context.map.getCenter();
  return `${center.lat.toFixed(1)},${center.lng.toFixed(1)}`;
}

function nearestFrame(frames: RadarFrame[], target: RadarFrame): RadarFrame | null {
  if (!frames.length) return null;
  const targetTime = Date.parse(target.validTime);
  if (!Number.isFinite(targetTime)) return frames.at(-1) ?? null;
  let best: RadarFrame | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    const time = Date.parse(frame.validTime);
    if (!Number.isFinite(time)) continue;
    const distance = Math.abs(time - targetTime);
    if (distance < bestDistance) {
      best = frame;
      bestDistance = distance;
    }
  }
  return bestDistance <= 12 * 60_000 ? best : frames.at(-1) ?? null;
}

export class RadarController implements MapController {
  readonly id = 'radar';
  private requestEpoch = 0;
  private catalogKey = '';
  private catalogIdentity = '';
  private frameIndex = 0;
  private frames: RadarFrame[] = [];
  private availableSites: RadarSite[] = [];
  private siteCatalogs: SiteCatalogState[] = [];
  private layerCount = 0;
  private playbackTimer: number | null = null;
  private playbackRateMs = 0;
  private loadedRefreshToken = -1;
  private refreshTimer: number | null = null;
  private lastContext: MapControllerContext | null = null;
  private disposed = false;

  onAttach(context: MapControllerContext): void {
    this.lastContext = context;
    this.configureRefreshTimer(context);
  }

  onStyleReady(context: MapControllerContext): void {
    this.lastContext = context;
    this.layerCount = 0;
    this.catalogKey = '';
    void this.sync(context, false);
  }

  onSceneChange(context: MapControllerContext, previous: MapScene): void {
    this.lastContext = context;
    if (previous.id !== context.scene.id) {
      this.stopPlayback();
      this.frames = [];
      this.siteCatalogs = [];
      this.availableSites = [];
      this.frameIndex = 0;
      this.catalogKey = '';
      this.catalogIdentity = '';
      this.loadedRefreshToken = -1;
      this.requestEpoch += 1;
      clearRadarRuntime(previous.id, context.renderPurpose);
    }
    this.configureRefreshTimer(context);
    void this.sync(context, false);
  }

  onMoveEnd(context: MapControllerContext): void {
    this.lastContext = context;
    const state = radarStateForScene(context.scene);
    const product = radarProductForScene(context.scene);
    if (context.scene.product.category !== 'radar' || !isSiteRadarProduct(product) || state.selectedSite !== 'auto') return;
    const expectedKey = this.buildCatalogKey(context);
    if (expectedKey !== this.catalogKey) void this.sync(context, false);
  }

  onLayerOrderChanged(context: MapControllerContext): void {
    this.applyPaint(context.map, context);
  }

  dispose(): void {
    this.disposed = true;
    this.requestEpoch += 1;
    this.stopPlayback();
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (this.lastContext) clearRadarRuntime(this.lastContext.scene.id, this.lastContext.renderPurpose);
    this.lastContext = null;
  }

  private buildCatalogIdentity(context: MapControllerContext): string {
    const scene = context.scene;
    const state = radarStateForScene(scene);
    const product = radarProductForScene(scene);
    const location = isSiteRadarProduct(product) && state.selectedSite === 'auto' ? centerKey(context) : '';
    return [product, state.selectedSite, state.blendEnabled, location].join('|');
  }

  private buildCatalogKey(context: MapControllerContext): string {
    const scene = context.scene;
    const state = radarStateForScene(scene);
    const product = radarProductForScene(scene);
    const location = isSiteRadarProduct(product) && state.selectedSite === 'auto' ? centerKey(context) : '';
    return [
      scene.id,
      context.styleGeneration,
      product,
      state.selectedSite,
      state.blendEnabled,
      state.frameCount,
      state.refreshToken,
      location,
    ].join('|');
  }

  private async sync(context: MapControllerContext, force: boolean): Promise<void> {
    if (this.disposed || !context.isStyleReady()) return;
    if (context.scene.product.category !== 'radar') {
      this.requestEpoch += 1;
      this.stopPlayback();
      this.removeLayers(context.map);
      clearRadarRuntime(context.scene.id, context.renderPurpose);
      context.setRenderPending(this.id, false);
      return;
    }

    this.applyPaint(context.map, context);
    const nextKey = this.buildCatalogKey(context);
    const state = radarStateForScene(context.scene);
    const manualRefresh = this.loadedRefreshToken >= 0 && state.refreshToken !== this.loadedRefreshToken;
    if (force || manualRefresh || nextKey !== this.catalogKey || !this.frames.length) {
      await this.loadCatalog(context, force || manualRefresh, nextKey);
      return;
    }

    if (!state.animationEnabled || context.renderPurpose === 'export') {
      this.stopPlayback();
      this.frameIndex = radarPlaybackFrameIndex(state, this.frames.length);
      this.renderFrame(context);
    } else {
      this.configurePlayback(context);
    }
    this.publishRuntime(context, '');
  }

  private async loadCatalog(context: MapControllerContext, force: boolean, nextKey = this.buildCatalogKey(context)): Promise<void> {
    const epoch = ++this.requestEpoch;
    const sceneId = context.scene.id;
    const styleGeneration = context.styleGeneration;
    const state = radarStateForScene(context.scene);
    const product = radarProductForScene(context.scene);
    const providerId = isSiteRadarProduct(product) ? 'radar-sites' : 'radar-mrms';
    const nextIdentity = this.buildCatalogIdentity(context);
    if (this.catalogIdentity && this.catalogIdentity !== nextIdentity) {
      this.stopPlayback();
      this.frames = [];
      this.siteCatalogs = [];
      this.availableSites = [];
      this.frameIndex = 0;
      this.removeLayers(context.map);
    }
    context.setRenderPending(this.id, true);
    context.callbacks.reportProviderStatus(providerId, 'loading', 'Loading radar frames…');
    publishRadarRuntime(sceneId, { loading: true, error: '' }, context.renderPurpose);

    // NOAA documents that exportImage without a time parameter returns the newest MRMS image.
    // Show that frame immediately so a slow history catalog cannot leave a blank radar scene.
    if (!isSiteRadarProduct(product) && !this.frames.length) {
      this.frames = [latestFrame('mrms-latest')];
      this.frameIndex = 0;
      this.siteCatalogs = [];
      this.renderFrame(context);
      publishRadarRuntime(sceneId, { loading: true, error: '' }, context.renderPurpose);
    }

    try {
      let catalog: RadarCatalog;
      let siteCatalogs: SiteCatalogState[] = [];
      let sites: RadarSite[] = [];
      const providerWarnings: string[] = [];

      if (!isSiteRadarProduct(product)) {
        catalog = await fetchMrmsRadarCatalog(state.frameCount, force);
      } else {
        const center = context.map.getCenter();
        try {
          sites = await fetchAvailableRadarSites(center.lat, center.lng, force);
        } catch (error) {
          if (state.selectedSite === 'auto') throw error;
          providerWarnings.push(`Nearby-site lookup failed; using ${state.selectedSite}: ${cleanProviderError(error)}`);
        }
        const primarySite = state.selectedSite === 'auto'
          ? sites[0]?.id
          : state.selectedSite;
        if (!primarySite) throw new Error('No operational radar site was returned for the current map center.');

        // IEM documents timestamp=0 as the most recent single-site image. Display it
        // before waiting for the historical scan list so manual/auto site scenes respond quickly.
        if (!this.frames.length) {
          const latest = latestFrame(`${primarySite}-${iemProductCode(product)}-latest`);
          const latestCatalog: RadarCatalog = {
            provider: 'iem-nexrad',
            mode: 'site',
            product,
            sites: [{ id: primarySite, label: primarySite, distanceKm: null }],
            frames: [latest],
            generatedAt: latest.validTime,
            cacheStatus: 'live',
          };
          this.frames = [latest];
          this.frameIndex = 0;
          this.availableSites = sites;
          this.siteCatalogs = [{ site: primarySite, catalog: latestCatalog }];
          this.renderFrame(context);
          publishRadarRuntime(sceneId, { loading: true, error: '' }, context.renderPurpose);
        }

        const resolvedSites = [primarySite];
        if (state.blendEnabled && product === 'site-base-reflectivity') {
          for (const site of sites) {
            if (!resolvedSites.includes(site.id)) resolvedSites.push(site.id);
            if (resolvedSites.length >= MAX_BLEND_SITES) break;
          }
        }
        const results = await Promise.allSettled(
          resolvedSites.map(async (site) => ({
            site,
            catalog: await fetchSiteRadarCatalog(site, product, state.frameCount, force),
          })),
        );
        siteCatalogs = results
          .filter((result): result is PromiseFulfilledResult<SiteCatalogState> => result.status === 'fulfilled')
          .map((result) => result.value);
        const failedCatalogs = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (failedCatalogs.length && results.length > 1) {
          providerWarnings.push(`${failedCatalogs.length} secondary radar site${failedCatalogs.length === 1 ? '' : 's'} failed during the composite.`);
        }
        const primary = siteCatalogs.find((item) => item.site === primarySite);
        if (!primary) {
          const rejection = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
          throw rejection?.reason ?? new Error(`No ${product} frames were available for ${primarySite}.`);
        }
        catalog = primary.catalog;
      }

      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) return;
      if (!catalog.frames.length) throw new Error('The radar provider returned no usable frames.');

      const latestState = radarStateForScene(context.scene);
      this.catalogKey = nextKey;
      this.catalogIdentity = nextIdentity;
      this.loadedRefreshToken = latestState.refreshToken;
      this.frames = catalog.frames;
      this.availableSites = sites;
      this.siteCatalogs = siteCatalogs;
      this.frameIndex = radarPlaybackFrameIndex(latestState, this.frames.length);
      this.renderFrame(context);
      this.configurePlayback(context);
      if (catalog.cacheWarning) providerWarnings.unshift(catalog.cacheWarning);
      const degraded = catalog.cacheStatus === 'stale' || providerWarnings.length > 0;
      context.callbacks.reportProviderStatus(
        providerId,
        degraded ? 'degraded' : 'online',
        providerWarnings.join('; ') || `${catalog.frames.length} radar frames available.`,
        catalog.cacheStatus,
      );
      this.publishRuntime(context, '');
    } catch (error) {
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) return;
      const message = cleanProviderError(error);
      const retainedLatest = this.frames.length > 0;
      context.callbacks.reportProviderStatus(
        providerId,
        retainedLatest ? 'degraded' : 'offline',
        retainedLatest ? `Latest imagery retained; history unavailable: ${message}` : message,
      );
      if (!retainedLatest) this.removeLayers(context.map);
      publishRadarRuntime(
        sceneId,
        { loading: false, error: message, updatedAt: new Date().toISOString() },
        context.renderPurpose,
      );
    } finally {
      if (this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) {
        context.setRenderPending(this.id, false);
      }
    }
  }

  private renderFrame(context: MapControllerContext): void {
    if (!context.isStyleReady() || !this.frames.length) return;
    const product = radarProductForScene(context.scene);
    const frame = this.frames[clampFrame(this.frameIndex, this.frames)];
    const tileUrls: string[] = [];
    const resolvedSites: string[] = [];

    if (!isSiteRadarProduct(product)) {
      tileUrls.push(mrmsTileUrl(frame.epochMs));
    } else {
      const catalogs = this.siteCatalogs.length ? this.siteCatalogs : [];
      for (const item of catalogs) {
        const siteFrame = item.site === catalogs[0]?.site ? frame : nearestFrame(item.catalog.frames, frame);
        if (!siteFrame) continue;
        tileUrls.push(iemRadarTileUrl(item.site, iemProductCode(product), siteFrame.timestamp));
        resolvedSites.push(item.site);
      }
    }

    if (!tileUrls.length) return;
    this.ensureRasterLayers(context, tileUrls);
    this.applyPaint(context.map, context);
    context.notifyLayerOrderChanged();
    publishRadarRuntime(context.scene.id, {
      loading: false,
      error: '',
      provider: isSiteRadarProduct(product) ? 'IEM NEXRAD Level III' : 'NOAA MRMS',
      availableSites: this.availableSites,
      resolvedSites,
      frames: this.frames,
      frameIndex: this.frameIndex,
      validTime: frame.validTime,
      updatedAt: new Date().toISOString(),
    }, context.renderPurpose);
  }

  private ensureRasterLayers(context: MapControllerContext, tileUrls: string[]): void {
    const map = context.map;
    for (let index = 0; index < tileUrls.length; index += 1) {
      const source = radarSourceId(index);
      const layer = radarLayerId(index);
      const existingSource = map.getSource(source) as RasterTileSource | undefined;
      if (existingSource && typeof existingSource.setTiles === 'function') {
        existingSource.setTiles([tileUrls[index]]);
      } else {
        if (map.getLayer(layer)) map.removeLayer(layer);
        if (map.getSource(source)) map.removeSource(source);
        map.addSource(source, {
          type: 'raster',
          tiles: [tileUrls[index]],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 12,
          attribution: 'NOAA/NWS radar; single-site rendering via Iowa Environmental Mesonet',
        });
      }
      if (!map.getLayer(layer)) {
        map.addLayer({
          id: layer,
          type: 'raster',
          source,
          paint: {
            'raster-opacity': context.scene.product.opacity,
            'raster-fade-duration': 0,
            'raster-resampling': context.scene.product.smoothing === 'sharp' ? 'nearest' : 'linear',
          },
        });
      }
    }
    for (let index = tileUrls.length; index < this.layerCount; index += 1) {
      const layer = radarLayerId(index);
      const source = radarSourceId(index);
      if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(source)) map.removeSource(source);
    }
    this.layerCount = tileUrls.length;
  }

  private applyPaint(map: MapLibreMap, context: MapControllerContext): void {
    for (let index = 0; index < this.layerCount; index += 1) {
      const layer = radarLayerId(index);
      if (!map.getLayer(layer)) continue;
      map.setPaintProperty(layer, 'raster-opacity', context.scene.product.opacity);
      map.setPaintProperty(
        layer,
        'raster-resampling',
        context.scene.product.smoothing === 'sharp' ? 'nearest' : 'linear',
      );
    }
  }

  private removeLayers(map: MapLibreMap): void {
    for (let index = this.layerCount - 1; index >= 0; index -= 1) {
      const layer = radarLayerId(index);
      const source = radarSourceId(index);
      if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(source)) map.removeSource(source);
    }
    this.layerCount = 0;
  }

  private configurePlayback(context: MapControllerContext): void {
    const state = radarStateForScene(context.scene);
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
    const state = radarStateForScene(context.scene);
    if (!this.frames.length || this.playbackTimer != null) return;
    this.playbackRateMs = state.playbackRateMs;

    const tick = () => {
      this.playbackTimer = null;
      const current = this.lastContext;
      if (!current || current.scene.id !== context.scene.id) {
        this.stopPlayback();
        return;
      }
      const currentState = radarStateForScene(current.scene);
      if (!currentState.animationEnabled || current.renderPurpose === 'export') {
        this.stopPlayback();
        return;
      }
      const nextIndex = radarPlaybackFrameIndex(currentState, this.frames.length);
      if (nextIndex !== this.frameIndex) {
        this.frameIndex = nextIndex;
        this.renderFrame(current);
      }
      const elapsed = Math.max(0, Date.now() - currentState.playbackStartedAt);
      const remainder = elapsed % currentState.playbackRateMs;
      const delay = Math.max(16, currentState.playbackRateMs - remainder + 8);
      this.playbackTimer = window.setTimeout(tick, delay);
    };

    this.frameIndex = radarPlaybackFrameIndex(state, this.frames.length);
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
    if (context.scene.product.category !== 'radar' || !radarStateForScene(context.scene).autoRefreshEnabled) return;
    this.refreshTimer = window.setInterval(() => {
      const current = this.lastContext;
      if (!current || current.scene.product.category !== 'radar') return;
      this.catalogKey = '';
      void this.sync(current, false);
    }, AUTO_REFRESH_MS);
  }

  private publishRuntime(context: MapControllerContext, error: string): void {
    const product = radarProductForScene(context.scene);
    const frame = this.frames[clampFrame(this.frameIndex, this.frames)];
    publishRadarRuntime(context.scene.id, {
      loading: false,
      error,
      provider: isSiteRadarProduct(product) ? 'IEM NEXRAD Level III' : 'NOAA MRMS',
      availableSites: this.availableSites,
      resolvedSites: this.siteCatalogs.map((item) => item.site),
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
