import type { MapScene } from '../types/domain';
import type { MapController, MapControllerContext } from '../map/controllers/controller-types';
import { cleanProviderError } from '../map/controllers/controller-utils';
import {
  fetchTropicalWindProbabilityCatalog,
  windProbabilityStormWallets,
  type TropicalWindProbabilityCatalog,
} from './tropical-wind-probability-provider';
import {
  applyTropicalWindProbabilityVisibility,
  clearTropicalWindProbabilityData,
  removeTropicalWindProbabilityLayers,
  renderTropicalWindProbability,
} from './tropical-wind-probability-renderer';
import {
  clearTropicalWindProbabilityRuntime,
  publishTropicalWindProbabilityRuntime,
} from './tropical-wind-probability-runtime-store';
import {
  tropicalWindProbabilityStateForScene,
  tropicalWindProbabilityThresholdForScene,
  type TropicalWindProbabilityThreshold,
} from './tropical-wind-probability-types';

const AUTO_REFRESH_MS = 5 * 60_000;

export class TropicalWindProbabilityController implements MapController {
  readonly id = 'tropical-wind-probability';
  private requestEpoch = 0;
  private catalogKey = '';
  private catalog: TropicalWindProbabilityCatalog | null = null;
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
      clearTropicalWindProbabilityRuntime(previous.id, context.renderPurpose);
    }
    this.configureRefreshTimer(context);
    void this.sync(context, false);
  }

  onLayerOrderChanged(context: MapControllerContext): void {
    if (!tropicalWindProbabilityThresholdForScene(context.scene)) return;
    applyTropicalWindProbabilityVisibility(
      context.map,
      tropicalWindProbabilityStateForScene(context.scene),
    );
  }

  dispose(): void {
    this.disposed = true;
    this.requestEpoch += 1;
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (this.lastContext) {
      clearTropicalWindProbabilityRuntime(
        this.lastContext.scene.id,
        this.lastContext.renderPurpose,
      );
    }
    this.lastContext = null;
  }

  private catalogIdentity(
    context: MapControllerContext,
    thresholdKnots: TropicalWindProbabilityThreshold,
  ): string {
    const state = tropicalWindProbabilityStateForScene(context.scene);
    return [
      context.scene.id,
      context.styleGeneration,
      thresholdKnots,
      state.refreshToken,
    ].join('|');
  }

  private async sync(context: MapControllerContext, force: boolean): Promise<void> {
    if (this.disposed || !context.isStyleReady()) return;
    const thresholdKnots = tropicalWindProbabilityThresholdForScene(context.scene);
    if (!thresholdKnots) {
      this.requestEpoch += 1;
      this.catalog = null;
      this.catalogKey = '';
      removeTropicalWindProbabilityLayers(context.map);
      clearTropicalWindProbabilityRuntime(context.scene.id, context.renderPurpose);
      context.setRenderPending(this.id, false);
      return;
    }

    const nextKey = this.catalogIdentity(context, thresholdKnots);
    if (
      force
      || !this.catalog
      || this.catalog.thresholdKnots !== thresholdKnots
      || nextKey !== this.catalogKey
    ) {
      await this.loadCatalog(context, thresholdKnots, force, nextKey);
      return;
    }
    this.renderCatalog(context, this.catalog);
  }

  private async loadCatalog(
    context: MapControllerContext,
    thresholdKnots: TropicalWindProbabilityThreshold,
    force: boolean,
    nextKey: string,
  ): Promise<void> {
    const epoch = ++this.requestEpoch;
    const sceneId = context.scene.id;
    const styleGeneration = context.styleGeneration;

    context.setRenderPending(this.id, true);
    context.callbacks.reportProviderStatus(
      'tropical-nhc',
      'loading',
      `Loading official NHC ${thresholdKnots}-kt wind probabilities…`,
    );
    publishTropicalWindProbabilityRuntime(
      sceneId,
      {
        loading: true,
        error: '',
        thresholdKnots,
      },
      context.renderPurpose,
    );

    try {
      const catalog = await fetchTropicalWindProbabilityCatalog(thresholdKnots, force);
      if (!this.isRequestCurrent(
        context,
        epoch,
        sceneId,
        styleGeneration,
        thresholdKnots,
      )) return;
      this.catalog = catalog;
      this.catalogKey = nextKey;
      this.renderCatalog(context, catalog);

      const featureCount = catalog.probabilities.features.length;
      const stormCount = windProbabilityStormWallets(catalog).length;
      const degraded = catalog.cacheStatus === 'stale' || Boolean(catalog.cacheWarning);
      context.callbacks.reportProviderStatus(
        'tropical-nhc',
        degraded ? 'degraded' : 'online',
        catalog.cacheWarning || (featureCount
          ? `${featureCount} NHC ${thresholdKnots}-kt probability area${featureCount === 1 ? '' : 's'} across ${stormCount || 1} active tropical system${stormCount === 1 ? '' : 's'}.`
          : `No current NHC ${thresholdKnots}-kt wind-probability areas are published.`),
        catalog.cacheStatus,
      );
    } catch (error) {
      if (!this.isRequestCurrent(
        context,
        epoch,
        sceneId,
        styleGeneration,
        thresholdKnots,
      )) return;
      const message = cleanProviderError(error);
      context.callbacks.reportProviderStatus('tropical-nhc', 'offline', message);
      clearTropicalWindProbabilityData(context.map);
      publishTropicalWindProbabilityRuntime(
        sceneId,
        {
          loading: false,
          error: message,
          provider: 'NOAA/NWS/NHC Tropical Weather Summary',
          thresholdKnots,
          featureCount: 0,
          stormCount: 0,
          updatedAt: new Date().toISOString(),
        },
        context.renderPurpose,
      );
    } finally {
      if (this.isRequestCurrent(
        context,
        epoch,
        sceneId,
        styleGeneration,
        thresholdKnots,
      )) {
        context.setRenderPending(this.id, false);
      }
    }
  }

  private renderCatalog(
    context: MapControllerContext,
    catalog: TropicalWindProbabilityCatalog,
  ): void {
    if (!context.isStyleReady()) return;
    const state = tropicalWindProbabilityStateForScene(context.scene);
    renderTropicalWindProbability(context.map, catalog.probabilities);
    applyTropicalWindProbabilityVisibility(context.map, state);
    context.notifyLayerOrderChanged();
    publishTropicalWindProbabilityRuntime(
      context.scene.id,
      {
        loading: false,
        error: '',
        provider: catalog.provider,
        thresholdKnots: catalog.thresholdKnots,
        featureCount: catalog.probabilities.features.length,
        stormCount: windProbabilityStormWallets(catalog).length,
        updatedAt: new Date().toISOString(),
      },
      context.renderPurpose,
    );
  }

  private configureRefreshTimer(context: MapControllerContext): void {
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    const thresholdKnots = tropicalWindProbabilityThresholdForScene(context.scene);
    const state = tropicalWindProbabilityStateForScene(context.scene);
    if (!thresholdKnots || !state.autoRefreshEnabled) return;
    this.refreshTimer = window.setInterval(() => {
      const current = this.lastContext;
      if (!current || !tropicalWindProbabilityThresholdForScene(current.scene)) return;
      void this.sync(current, true);
    }, AUTO_REFRESH_MS);
  }

  private isRequestCurrent(
    context: MapControllerContext,
    epoch: number,
    sceneId: string,
    styleGeneration: number,
    thresholdKnots: TropicalWindProbabilityThreshold,
  ): boolean {
    return !this.disposed
      && epoch === this.requestEpoch
      && context.scene.id === sceneId
      && context.styleGeneration === styleGeneration
      && tropicalWindProbabilityThresholdForScene(context.scene) === thresholdKnots
      && context.isStyleReady();
  }
}
