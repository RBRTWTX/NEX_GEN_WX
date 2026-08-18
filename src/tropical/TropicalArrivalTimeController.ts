import type { MapScene } from '../types/domain';
import type { MapController, MapControllerContext } from '../map/controllers/controller-types';
import { cleanProviderError } from '../map/controllers/controller-utils';
import {
  arrivalTimeStormWallets,
  fetchTropicalArrivalTimeCatalog,
  type TropicalArrivalTimeCatalog,
} from './tropical-arrival-time-provider';
import {
  applyTropicalArrivalTimeVisibility,
  clearTropicalArrivalTimeData,
  removeTropicalArrivalTimeLayers,
  renderTropicalArrivalTime,
} from './tropical-arrival-time-renderer';
import {
  clearTropicalArrivalTimeRuntime,
  publishTropicalArrivalTimeRuntime,
} from './tropical-arrival-time-runtime-store';
import {
  tropicalArrivalTimeModeForScene,
  tropicalArrivalTimeStateForScene,
  type TropicalArrivalTimeMode,
} from './tropical-arrival-time-types';

const AUTO_REFRESH_MS = 5 * 60_000;

export class TropicalArrivalTimeController implements MapController {
  readonly id = 'tropical-arrival-time';
  private requestEpoch = 0;
  private catalogKey = '';
  private catalog: TropicalArrivalTimeCatalog | null = null;
  private refreshTimer: number | null = null;
  private lastContext: MapControllerContext | null = null;
  private disposed = false;

  onAttach(context: MapControllerContext): void {
    this.lastContext = context;
    this.configureRefreshTimer(context);
  }

  onStyleReady(context: MapControllerContext): void {
    this.lastContext = context;
    this.catalogKey = '';
    void this.sync(context, false);
  }

  onSceneChange(context: MapControllerContext, previous: MapScene): void {
    this.lastContext = context;
    if (previous.id !== context.scene.id) {
      this.requestEpoch += 1;
      this.catalog = null;
      this.catalogKey = '';
      clearTropicalArrivalTimeRuntime(previous.id, context.renderPurpose);
    }
    this.configureRefreshTimer(context);
    void this.sync(context, false);
  }

  onLayerOrderChanged(context: MapControllerContext): void {
    if (!tropicalArrivalTimeModeForScene(context.scene)) return;
    applyTropicalArrivalTimeVisibility(
      context.map,
      tropicalArrivalTimeStateForScene(context.scene),
    );
  }

  dispose(): void {
    this.disposed = true;
    this.requestEpoch += 1;
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (this.lastContext) {
      clearTropicalArrivalTimeRuntime(
        this.lastContext.scene.id,
        this.lastContext.renderPurpose,
      );
    }
    this.lastContext = null;
  }

  private catalogIdentity(context: MapControllerContext, mode: TropicalArrivalTimeMode): string {
    const state = tropicalArrivalTimeStateForScene(context.scene);
    return [
      context.scene.id,
      context.styleGeneration,
      mode,
      state.refreshToken,
    ].join('|');
  }

  private async sync(context: MapControllerContext, force: boolean): Promise<void> {
    if (this.disposed || !context.isStyleReady()) return;
    const mode = tropicalArrivalTimeModeForScene(context.scene);
    if (!mode) {
      this.requestEpoch += 1;
      this.catalog = null;
      this.catalogKey = '';
      removeTropicalArrivalTimeLayers(context.map);
      clearTropicalArrivalTimeRuntime(context.scene.id, context.renderPurpose);
      context.setRenderPending(this.id, false);
      return;
    }

    const nextKey = this.catalogIdentity(context, mode);
    if (force || !this.catalog || this.catalog.mode !== mode || nextKey !== this.catalogKey) {
      await this.loadCatalog(context, mode, force, nextKey);
      return;
    }
    this.renderCatalog(context, this.catalog);
  }

  private async loadCatalog(
    context: MapControllerContext,
    mode: TropicalArrivalTimeMode,
    force: boolean,
    nextKey: string,
  ): Promise<void> {
    const epoch = ++this.requestEpoch;
    const sceneId = context.scene.id;
    const styleGeneration = context.styleGeneration;
    const modeLabel = mode === 'earliest' ? 'earliest reasonable' : 'most likely';

    context.setRenderPending(this.id, true);
    context.callbacks.reportProviderStatus(
      'tropical-nhc',
      'loading',
      `Loading official NHC ${modeLabel} tropical-storm-force wind arrival contours…`,
    );
    publishTropicalArrivalTimeRuntime(
      sceneId,
      { loading: true, error: '', mode },
      context.renderPurpose,
    );

    try {
      const catalog = await fetchTropicalArrivalTimeCatalog(mode, force);
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration, mode)) return;
      this.catalog = catalog;
      this.catalogKey = nextKey;
      this.renderCatalog(context, catalog);

      const contourCount = catalog.contours.features.length;
      const degraded = catalog.cacheStatus === 'stale' || Boolean(catalog.cacheWarning);
      context.callbacks.reportProviderStatus(
        'tropical-nhc',
        degraded ? 'degraded' : 'online',
        catalog.cacheWarning || (contourCount
          ? `${contourCount} NHC ${modeLabel} arrival contour${contourCount === 1 ? '' : 's'} loaded.`
          : `No current NHC ${modeLabel} arrival-time contours are published.`),
        catalog.cacheStatus,
      );
    } catch (error) {
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration, mode)) return;
      const message = cleanProviderError(error);
      context.callbacks.reportProviderStatus('tropical-nhc', 'offline', message);
      clearTropicalArrivalTimeData(context.map);
      publishTropicalArrivalTimeRuntime(
        sceneId,
        {
          loading: false,
          error: message,
          provider: 'NOAA/NWS/NHC Tropical Weather Summary',
          mode,
          contourCount: 0,
          probabilityAreaCount: 0,
          stormCount: 0,
          updatedAt: new Date().toISOString(),
        },
        context.renderPurpose,
      );
    } finally {
      if (this.isRequestCurrent(context, epoch, sceneId, styleGeneration, mode)) {
        context.setRenderPending(this.id, false);
      }
    }
  }

  private renderCatalog(context: MapControllerContext, catalog: TropicalArrivalTimeCatalog): void {
    if (!context.isStyleReady()) return;
    const state = tropicalArrivalTimeStateForScene(context.scene);
    renderTropicalArrivalTime(context.map, catalog.contours, catalog.windProbability34);
    applyTropicalArrivalTimeVisibility(context.map, state);
    context.notifyLayerOrderChanged();
    publishTropicalArrivalTimeRuntime(
      context.scene.id,
      {
        loading: false,
        error: '',
        provider: catalog.provider,
        mode: catalog.mode,
        contourCount: catalog.contours.features.length,
        probabilityAreaCount: catalog.windProbability34.features.length,
        stormCount: arrivalTimeStormWallets(catalog).length,
        updatedAt: new Date().toISOString(),
      },
      context.renderPurpose,
    );
  }

  private configureRefreshTimer(context: MapControllerContext): void {
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    const mode = tropicalArrivalTimeModeForScene(context.scene);
    const state = tropicalArrivalTimeStateForScene(context.scene);
    if (!mode || !state.autoRefreshEnabled) return;
    this.refreshTimer = window.setInterval(() => {
      const current = this.lastContext;
      if (!current || !tropicalArrivalTimeModeForScene(current.scene)) return;
      void this.sync(current, true);
    }, AUTO_REFRESH_MS);
  }

  private isRequestCurrent(
    context: MapControllerContext,
    epoch: number,
    sceneId: string,
    styleGeneration: number,
    mode: TropicalArrivalTimeMode,
  ): boolean {
    return !this.disposed
      && epoch === this.requestEpoch
      && context.scene.id === sceneId
      && context.styleGeneration === styleGeneration
      && tropicalArrivalTimeModeForScene(context.scene) === mode
      && context.isStyleReady();
  }
}
