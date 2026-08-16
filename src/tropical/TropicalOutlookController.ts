import type { MapScene } from '../types/domain';
import type { MapController, MapControllerContext } from '../map/controllers/controller-types';
import { cleanProviderError } from '../map/controllers/controller-utils';
import {
  fetchTropicalOutlookCatalog,
  type TropicalOutlookCatalog,
} from './tropical-outlook-provider';
import {
  applyTropicalOutlookVisibility,
  clearTropicalOutlookData,
  removeTropicalOutlookLayers,
  renderTropicalOutlook,
} from './tropical-outlook-renderer';
import {
  clearTropicalOutlookRuntime,
  publishTropicalOutlookRuntime,
} from './tropical-outlook-runtime-store';
import {
  tropicalOutlookPeriodForScene,
  tropicalOutlookStateForScene,
  type TropicalOutlookPeriod,
} from './tropical-outlook-types';

const AUTO_REFRESH_MS = 5 * 60_000;

export class TropicalOutlookController implements MapController {
  readonly id = 'tropical-outlook';
  private requestEpoch = 0;
  private catalogKey = '';
  private catalog: TropicalOutlookCatalog | null = null;
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
      clearTropicalOutlookRuntime(previous.id, context.renderPurpose);
    }
    this.configureRefreshTimer(context);
    void this.sync(context, false);
  }

  onLayerOrderChanged(context: MapControllerContext): void {
    const period = tropicalOutlookPeriodForScene(context.scene);
    if (!period) return;
    applyTropicalOutlookVisibility(
      context.map,
      tropicalOutlookStateForScene(context.scene),
      period === '7day',
    );
  }

  dispose(): void {
    this.disposed = true;
    this.requestEpoch += 1;
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (this.lastContext) {
      clearTropicalOutlookRuntime(this.lastContext.scene.id, this.lastContext.renderPurpose);
    }
    this.lastContext = null;
  }

  private catalogIdentity(context: MapControllerContext, period: TropicalOutlookPeriod): string {
    const state = tropicalOutlookStateForScene(context.scene);
    return [context.scene.id, context.styleGeneration, period, state.refreshToken].join('|');
  }

  private async sync(context: MapControllerContext, force: boolean): Promise<void> {
    if (this.disposed || !context.isStyleReady()) return;
    const period = tropicalOutlookPeriodForScene(context.scene);
    if (!period) {
      this.requestEpoch += 1;
      this.catalog = null;
      this.catalogKey = '';
      removeTropicalOutlookLayers(context.map);
      clearTropicalOutlookRuntime(context.scene.id, context.renderPurpose);
      context.setRenderPending(this.id, false);
      return;
    }

    const nextKey = this.catalogIdentity(context, period);
    if (force || !this.catalog || this.catalog.period !== period || nextKey !== this.catalogKey) {
      await this.loadCatalog(context, period, force, nextKey);
      return;
    }
    this.renderCatalog(context, this.catalog);
  }

  private async loadCatalog(
    context: MapControllerContext,
    period: TropicalOutlookPeriod,
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
      `Loading official NHC ${period === '2day' ? '2-Day' : '7-Day'} Tropical Weather Outlook…`,
    );
    publishTropicalOutlookRuntime(
      sceneId,
      { loading: true, error: '', period },
      context.renderPurpose,
    );

    try {
      const catalog = await fetchTropicalOutlookCatalog(period, force);
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration, period)) return;
      this.catalog = catalog;
      this.catalogKey = nextKey;
      this.renderCatalog(context, catalog);
      const total = catalog.locations.features.length + catalog.regions.features.length + catalog.motion.features.length;
      const degraded = catalog.cacheStatus === 'stale' || Boolean(catalog.cacheWarning);
      context.callbacks.reportProviderStatus(
        'tropical-nhc',
        degraded ? 'degraded' : 'online',
        catalog.cacheWarning || (total
          ? `${total} official NHC outlook feature${total === 1 ? '' : 's'} available.`
          : `No NHC ${period === '2day' ? '2-Day' : '7-Day'} formation areas are currently published.`),
        catalog.cacheStatus,
      );
    } catch (error) {
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration, period)) return;
      const message = cleanProviderError(error);
      context.callbacks.reportProviderStatus('tropical-nhc', 'offline', message);
      clearTropicalOutlookData(context.map);
      publishTropicalOutlookRuntime(sceneId, {
        loading: false,
        error: message,
        provider: 'NOAA/NWS/NHC Tropical Weather Summary',
        period,
        featureCounts: { locations: 0, regions: 0, motion: 0 },
        updatedAt: new Date().toISOString(),
      }, context.renderPurpose);
    } finally {
      if (this.isRequestCurrent(context, epoch, sceneId, styleGeneration, period)) {
        context.setRenderPending(this.id, false);
      }
    }
  }

  private renderCatalog(context: MapControllerContext, catalog: TropicalOutlookCatalog): void {
    if (!context.isStyleReady()) return;
    const state = tropicalOutlookStateForScene(context.scene);
    renderTropicalOutlook(context.map, catalog);
    applyTropicalOutlookVisibility(context.map, state, catalog.period === '7day');
    context.notifyLayerOrderChanged();
    publishTropicalOutlookRuntime(context.scene.id, {
      loading: false,
      error: '',
      provider: catalog.provider,
      period: catalog.period,
      featureCounts: {
        locations: catalog.locations.features.length,
        regions: catalog.regions.features.length,
        motion: catalog.motion.features.length,
      },
      updatedAt: new Date().toISOString(),
    }, context.renderPurpose);
  }

  private configureRefreshTimer(context: MapControllerContext): void {
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    const period = tropicalOutlookPeriodForScene(context.scene);
    const state = tropicalOutlookStateForScene(context.scene);
    if (!period || !state.autoRefreshEnabled) return;
    this.refreshTimer = window.setInterval(() => {
      const current = this.lastContext;
      if (!current || !tropicalOutlookPeriodForScene(current.scene)) return;
      void this.sync(current, true);
    }, AUTO_REFRESH_MS);
  }

  private isRequestCurrent(
    context: MapControllerContext,
    epoch: number,
    sceneId: string,
    styleGeneration: number,
    period: TropicalOutlookPeriod,
  ): boolean {
    return !this.disposed
      && epoch === this.requestEpoch
      && context.scene.id === sceneId
      && context.styleGeneration === styleGeneration
      && tropicalOutlookPeriodForScene(context.scene) === period
      && context.isStyleReady();
  }
}
