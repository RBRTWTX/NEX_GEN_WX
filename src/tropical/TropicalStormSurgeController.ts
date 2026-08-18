import type { MapScene } from '../types/domain';
import type { MapController, MapControllerContext } from '../map/controllers/controller-types';
import { cleanProviderError } from '../map/controllers/controller-utils';
import {
  fetchTropicalStormSurgeCatalog,
  stormSurgeFeatureCount,
  type TropicalStormSurgeCatalog,
} from './tropical-storm-surge-provider';
import {
  applyTropicalStormSurgeVisibility,
  clearTropicalStormSurgeData,
  removeTropicalStormSurgeLayers,
  renderTropicalStormSurge,
} from './tropical-storm-surge-renderer';
import {
  clearTropicalStormSurgeRuntime,
  publishTropicalStormSurgeRuntime,
} from './tropical-storm-surge-runtime-store';
import {
  tropicalStormSurgeProductForScene,
  tropicalStormSurgeStateForScene,
  type TropicalStormSurgeProduct,
} from './tropical-storm-surge-types';

const AUTO_REFRESH_MS = 5 * 60_000;

export class TropicalStormSurgeController implements MapController {
  readonly id = 'tropical-storm-surge';
  private requestEpoch = 0;
  private catalogKey = '';
  private catalog: TropicalStormSurgeCatalog | null = null;
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
      clearTropicalStormSurgeRuntime(previous.id, context.renderPurpose);
    }
    this.configureRefreshTimer(context);
    void this.sync(context, false);
  }

  onLayerOrderChanged(context: MapControllerContext): void {
    const product = tropicalStormSurgeProductForScene(context.scene);
    if (!product || !this.catalog || this.catalog.product !== product) return;
    applyTropicalStormSurgeVisibility(
      context.map,
      tropicalStormSurgeStateForScene(context.scene),
      product,
    );
  }

  dispose(): void {
    this.disposed = true;
    this.requestEpoch += 1;
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (this.lastContext) {
      clearTropicalStormSurgeRuntime(
        this.lastContext.scene.id,
        this.lastContext.renderPurpose,
      );
    }
    this.lastContext = null;
  }

  private catalogIdentity(context: MapControllerContext, product: TropicalStormSurgeProduct): string {
    const state = tropicalStormSurgeStateForScene(context.scene);
    return [
      context.scene.id,
      context.styleGeneration,
      product,
      state.refreshToken,
    ].join('|');
  }

  private async sync(context: MapControllerContext, force: boolean): Promise<void> {
    if (this.disposed || !context.isStyleReady()) return;
    const product = tropicalStormSurgeProductForScene(context.scene);
    if (!product) {
      this.requestEpoch += 1;
      this.catalog = null;
      this.catalogKey = '';
      removeTropicalStormSurgeLayers(context.map);
      clearTropicalStormSurgeRuntime(context.scene.id, context.renderPurpose);
      context.setRenderPending(this.id, false);
      return;
    }

    const nextKey = this.catalogIdentity(context, product);
    if (force || !this.catalog || this.catalog.product !== product || nextKey !== this.catalogKey) {
      await this.loadCatalog(context, product, force, nextKey);
      return;
    }
    this.renderCatalog(context, this.catalog);
  }

  private async loadCatalog(
    context: MapControllerContext,
    product: TropicalStormSurgeProduct,
    force: boolean,
    nextKey: string,
  ): Promise<void> {
    const epoch = ++this.requestEpoch;
    const sceneId = context.scene.id;
    const styleGeneration = context.styleGeneration;
    const label = product === 'potential' ? 'Potential Storm Surge Flooding' : 'Peak Storm Surge';

    context.setRenderPending(this.id, true);
    context.callbacks.reportProviderStatus(
      'tropical-nhc',
      'loading',
      `Loading official NHC ${label}…`,
    );
    publishTropicalStormSurgeRuntime(
      sceneId,
      { loading: true, error: '', product },
      context.renderPurpose,
    );

    try {
      const catalog = await fetchTropicalStormSurgeCatalog(product, force);
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration, product)) return;
      this.catalog = catalog;
      this.catalogKey = nextKey;
      this.renderCatalog(context, catalog);

      const featureCount = stormSurgeFeatureCount(catalog);
      const degraded = catalog.cacheStatus === 'stale' || Boolean(catalog.cacheWarning);
      context.callbacks.reportProviderStatus(
        'tropical-nhc',
        degraded ? 'degraded' : 'online',
        catalog.cacheWarning || (featureCount
          ? `${label} is available from the official NHC service.`
          : `No current NHC ${label} product is published.`),
        catalog.cacheStatus,
      );
    } catch (error) {
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration, product)) return;
      const message = cleanProviderError(error);
      context.callbacks.reportProviderStatus('tropical-nhc', 'offline', message);
      clearTropicalStormSurgeData(context.map);
      publishTropicalStormSurgeRuntime(
        sceneId,
        {
          loading: false,
          error: message,
          provider: product === 'potential'
            ? 'NOAA/NWS/NHC Tropical Weather Summary'
            : 'NOAA/NWS/NHC Peak Storm Surge',
          product,
          featureCount: 0,
          updatedAt: new Date().toISOString(),
        },
        context.renderPurpose,
      );
    } finally {
      if (this.isRequestCurrent(context, epoch, sceneId, styleGeneration, product)) {
        context.setRenderPending(this.id, false);
      }
    }
  }

  private renderCatalog(context: MapControllerContext, catalog: TropicalStormSurgeCatalog): void {
    if (!context.isStyleReady()) return;
    const state = tropicalStormSurgeStateForScene(context.scene);
    renderTropicalStormSurge(context.map, catalog, context.scene.product.opacity);
    applyTropicalStormSurgeVisibility(context.map, state, catalog.product);
    context.notifyLayerOrderChanged();
    publishTropicalStormSurgeRuntime(
      context.scene.id,
      {
        loading: false,
        error: '',
        provider: catalog.provider,
        product: catalog.product,
        featureCount: stormSurgeFeatureCount(catalog),
        updatedAt: new Date().toISOString(),
      },
      context.renderPurpose,
    );
  }

  private configureRefreshTimer(context: MapControllerContext): void {
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    const product = tropicalStormSurgeProductForScene(context.scene);
    const state = tropicalStormSurgeStateForScene(context.scene);
    if (!product || !state.autoRefreshEnabled) return;
    this.refreshTimer = window.setInterval(() => {
      const current = this.lastContext;
      if (!current || !tropicalStormSurgeProductForScene(current.scene)) return;
      void this.sync(current, true);
    }, AUTO_REFRESH_MS);
  }

  private isRequestCurrent(
    context: MapControllerContext,
    epoch: number,
    sceneId: string,
    styleGeneration: number,
    product: TropicalStormSurgeProduct,
  ): boolean {
    return !this.disposed
      && epoch === this.requestEpoch
      && context.scene.id === sceneId
      && context.styleGeneration === styleGeneration
      && tropicalStormSurgeProductForScene(context.scene) === product
      && context.isStyleReady();
  }
}
