import type { MapScene } from '../types/domain';
import type { MapController, MapControllerContext } from '../map/controllers/controller-types';
import { cleanProviderError } from '../map/controllers/controller-utils';
import {
  fetchTropicalCatalog,
  selectTropicalStorm,
  type TropicalCatalog,
} from './tropical-provider';
import {
  applyTropicalVisibility,
  clearTropicalData,
  removeTropicalLayers,
  renderTropicalSelection,
} from './tropical-renderer';
import {
  clearTropicalRuntime,
  publishTropicalRuntime,
} from './tropical-runtime-store';
import {
  tropicalStateForScene,
  tropicalTrackConeIsActive,
} from './tropical-types';

const AUTO_REFRESH_MS = 5 * 60_000;

export class TropicalController implements MapController {
  readonly id = 'tropical';
  private requestEpoch = 0;
  private catalogKey = '';
  private catalog: TropicalCatalog | null = null;
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
      clearTropicalRuntime(previous.id, context.renderPurpose);
    }
    this.configureRefreshTimer(context);
    void this.sync(context, false);
  }

  onLayerOrderChanged(context: MapControllerContext): void {
    if (!tropicalTrackConeIsActive(context.scene)) return;
    applyTropicalVisibility(context.map, tropicalStateForScene(context.scene));
  }

  dispose(): void {
    this.disposed = true;
    this.requestEpoch += 1;
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (this.lastContext) clearTropicalRuntime(this.lastContext.scene.id, this.lastContext.renderPurpose);
    this.lastContext = null;
  }

  private catalogIdentity(context: MapControllerContext): string {
    const state = tropicalStateForScene(context.scene);
    return [context.scene.id, context.styleGeneration, state.refreshToken].join('|');
  }

  private async sync(context: MapControllerContext, force: boolean): Promise<void> {
    if (this.disposed || !context.isStyleReady()) return;
    if (!tropicalTrackConeIsActive(context.scene)) {
      this.requestEpoch += 1;
      this.catalog = null;
      this.catalogKey = '';
      removeTropicalLayers(context.map);
      clearTropicalRuntime(context.scene.id, context.renderPurpose);
      context.setRenderPending(this.id, false);
      return;
    }

    const nextKey = this.catalogIdentity(context);
    if (force || !this.catalog || nextKey !== this.catalogKey) {
      await this.loadCatalog(context, force, nextKey);
      return;
    }
    this.renderCatalog(context, this.catalog);
  }

  private async loadCatalog(
    context: MapControllerContext,
    force: boolean,
    nextKey = this.catalogIdentity(context),
  ): Promise<void> {
    const epoch = ++this.requestEpoch;
    const sceneId = context.scene.id;
    const styleGeneration = context.styleGeneration;

    context.setRenderPending(this.id, true);
    context.callbacks.reportProviderStatus('tropical-nhc', 'loading', 'Loading official NHC forecast track and cone…');
    publishTropicalRuntime(sceneId, { loading: true, error: '' }, context.renderPurpose);

    try {
      const catalog = await fetchTropicalCatalog(force);
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) return;
      this.catalog = catalog;
      this.catalogKey = nextKey;
      this.renderCatalog(context, catalog);
      const selection = selectTropicalStorm(catalog, tropicalStateForScene(context.scene).selectedStormId);
      const degraded = catalog.cacheStatus === 'stale' || Boolean(catalog.cacheWarning);
      context.callbacks.reportProviderStatus(
        'tropical-nhc',
        degraded ? 'degraded' : 'online',
        catalog.cacheWarning || (selection.storms.length
          ? `${selection.storms.length} active NHC tropical cyclone${selection.storms.length === 1 ? '' : 's'} available.`
          : 'No active NHC forecast track/cone is currently published.'),
        catalog.cacheStatus,
      );
    } catch (error) {
      if (!this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) return;
      const message = cleanProviderError(error);
      context.callbacks.reportProviderStatus('tropical-nhc', 'offline', message);
      clearTropicalData(context.map);
      publishTropicalRuntime(sceneId, {
        loading: false,
        error: message,
        provider: 'NOAA/NWS/NHC Tropical Weather Summary',
        storms: [],
        selectedStormId: null,
        selectedStorm: null,
        featureCounts: { points: 0, track: 0, cone: 0, warnings: 0 },
        updatedAt: new Date().toISOString(),
      }, context.renderPurpose);
    } finally {
      if (this.isRequestCurrent(context, epoch, sceneId, styleGeneration)) {
        context.setRenderPending(this.id, false);
      }
    }
  }

  private renderCatalog(context: MapControllerContext, catalog: TropicalCatalog): void {
    if (!context.isStyleReady()) return;
    const state = tropicalStateForScene(context.scene);
    const selection = selectTropicalStorm(catalog, state.selectedStormId);
    renderTropicalSelection(context.map, selection);
    applyTropicalVisibility(context.map, state);
    context.notifyLayerOrderChanged();
    publishTropicalRuntime(context.scene.id, {
      loading: false,
      error: '',
      provider: catalog.provider,
      storms: selection.storms,
      selectedStormId: selection.selected?.id ?? null,
      selectedStorm: selection.selected,
      featureCounts: {
        points: selection.points.features.length,
        track: selection.track.features.length,
        cone: selection.cone.features.length,
        warnings: selection.warnings.features.length,
      },
      updatedAt: new Date().toISOString(),
    }, context.renderPurpose);
  }

  private configureRefreshTimer(context: MapControllerContext): void {
    if (this.refreshTimer != null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    const state = tropicalStateForScene(context.scene);
    if (!state.autoRefreshEnabled || !tropicalTrackConeIsActive(context.scene)) return;
    this.refreshTimer = window.setInterval(() => {
      const current = this.lastContext;
      if (!current || !tropicalTrackConeIsActive(current.scene)) return;
      void this.sync(current, true);
    }, AUTO_REFRESH_MS);
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
