import type { MapScene } from '../types/domain';
import type { MapController, MapControllerContext } from '../map/controllers/controller-types';
import { cleanProviderError } from '../map/controllers/controller-utils';
import { MODEL_FIELD_LAYER_ID } from './model-layer-ids';
import { ModelFieldLayer } from './ModelFieldLayer';
import { fetchModelCatalog, fetchModelFieldGrid } from './model-provider';
import {
  clearModelRuntime,
  publishModelRuntime,
} from './model-runtime-store';
import {
  modelIsActive,
  modelStateForScene,
  nearestForecastHour,
  type ModelCatalog,
  type ModelFieldGrid,
} from './model-types';

export class ModelController implements MapController {
  readonly id = 'models';

  private requestEpoch = 0;
  private catalogKey = '';
  private loadedRefreshToken = -1;
  private catalog: ModelCatalog | null = null;
  private fieldLayer = new ModelFieldLayer();
  private fieldCache = new Map<string, ModelFieldGrid>();
  private lastContext: MapControllerContext | null = null;
  private disposed = false;

  onAttach(context: MapControllerContext): void {
    this.lastContext = context;
  }

  onStyleReady(context: MapControllerContext): void {
    this.lastContext = context;
    void this.sync(context);
  }

  onSceneChange(context: MapControllerContext, previous: MapScene): void {
    this.lastContext = context;
    if (previous.id !== context.scene.id) {
      this.requestEpoch += 1;
      this.catalogKey = '';
      this.loadedRefreshToken = -1;
      this.catalog = null;
        clearModelRuntime(previous.id, context.renderPurpose);
    }
    void this.sync(context);
  }

  dispose(): void {
    this.disposed = true;
    this.requestEpoch += 1;
    if (this.lastContext) {
      this.removeLayer(this.lastContext);
      clearModelRuntime(this.lastContext.scene.id, this.lastContext.renderPurpose);
    }
    this.lastContext = null;
    this.catalog = null;
    this.fieldCache.clear();
  }

  private buildCatalogKey(context: MapControllerContext): string {
    const state = modelStateForScene(context.scene);
    return [
      context.scene.id,
      state.model,
      state.runMode,
      state.runId,
      state.refreshToken,
    ].join('|');
  }

  private buildFieldKey(run: ModelCatalog['run'], state: ReturnType<typeof modelStateForScene>, hour: number): string {
    return [run.id, state.field, hour, state.smoothing].join('|');
  }

  private ensureLayer(context: MapControllerContext): void {
    if (context.map.getLayer(MODEL_FIELD_LAYER_ID)) return;
    context.map.addLayer(this.fieldLayer);
    context.notifyLayerOrderChanged();
  }

  private removeLayer(context: MapControllerContext): void {
    if (context.map.getLayer(MODEL_FIELD_LAYER_ID)) context.map.removeLayer(MODEL_FIELD_LAYER_ID);
  }

  private trimCache(): void {
    while (this.fieldCache.size > 24) {
      const first = this.fieldCache.keys().next().value as string | undefined;
      if (!first) break;
      this.fieldCache.delete(first);
    }
  }

  private async sync(context: MapControllerContext): Promise<void> {
    if (this.disposed) return;
    if (!modelIsActive(context.scene)) {
      this.requestEpoch += 1;
      this.removeLayer(context);
      clearModelRuntime(context.scene.id, context.renderPurpose);
      context.setRenderPending(this.id, false);
      return;
    }

    const epoch = ++this.requestEpoch;
    const sceneId = context.scene.id;
    const state = modelStateForScene(context.scene);
    const nextCatalogKey = this.buildCatalogKey(context);
    const manualRefresh = this.loadedRefreshToken >= 0 && state.refreshToken !== this.loadedRefreshToken;
    context.setRenderPending(this.id, true);

    try {
      let catalog = this.catalog;
      if (!catalog || manualRefresh || nextCatalogKey !== this.catalogKey) {
        context.callbacks.reportProviderStatus(
          'model-hrrr-nodd',
          'loading',
          'Resolving the latest NOAA NODD HRRR run…',
        );
        publishModelRuntime(sceneId, {
          loading: true,
          error: '',
          provider: 'NOAA NODD HRRR',
          model: state.model,
          field: state.field,
          forecastHour: state.forecastHour,
          fieldReady: false,
        }, context.renderPurpose);

        catalog = await fetchModelCatalog(state, manualRefresh);
        if (!this.isRequestCurrent(context, epoch, sceneId)) return;
        this.catalog = catalog;
        this.catalogKey = this.buildCatalogKey(context);
        this.loadedRefreshToken = state.refreshToken;
      }

      const latestState = modelStateForScene(context.scene);
      const forecastHour = nearestForecastHour(latestState.forecastHour, catalog.run.forecastHours);
      const fieldKey = this.buildFieldKey(catalog.run, latestState, forecastHour);
      publishModelRuntime(sceneId, {
        loading: true,
        error: '',
        provider: 'NOAA NODD HRRR',
        model: catalog.model,
        field: latestState.field,
        run: catalog.run,
        availableHours: catalog.run.forecastHours,
        forecastHour,
        fieldReady: false,
      }, context.renderPurpose);

      let grid = this.fieldCache.get(fieldKey);
      if (!grid || manualRefresh) {
        grid = await fetchModelFieldGrid(latestState, catalog.run, forecastHour, manualRefresh);
        if (!this.isRequestCurrent(context, epoch, sceneId)) return;
        this.fieldCache.set(fieldKey, grid);
        this.trimCache();
      }

      this.ensureLayer(context);
      this.fieldLayer.setField(grid, latestState.opacity);
      const degraded = catalog.cacheStatus === 'stale'
        || Boolean(catalog.cacheWarning)
        || grid.cacheStatus === 'stale'
        || Boolean(grid.cacheWarning);
      const warning = grid.cacheWarning || catalog.cacheWarning;

      publishModelRuntime(sceneId, {
        loading: false,
        error: '',
        provider: 'NOAA NODD HRRR',
        model: catalog.model,
        field: latestState.field,
        run: catalog.run,
        availableHours: catalog.run.forecastHours,
        forecastHour,
        fieldReady: true,
        sampleCount: grid.values.length,
        unit: grid.unit,
        updatedAt: new Date().toISOString(),
      }, context.renderPurpose);

      context.callbacks.reportProviderStatus(
        'model-hrrr-nodd',
        degraded ? 'degraded' : 'online',
        warning || `${catalog.run.label} F${String(forecastHour).padStart(2, '0')} decoded from NOAA NODD GRIB2.`,
        grid.cacheStatus || catalog.cacheStatus,
      );
    } catch (error) {
      if (!this.isRequestCurrent(context, epoch, sceneId)) return;
      const message = cleanProviderError(error);
      this.fieldLayer.clear();
      publishModelRuntime(sceneId, {
        loading: false,
        error: message,
        fieldReady: false,
        sampleCount: 0,
        updatedAt: new Date().toISOString(),
      }, context.renderPurpose);
      context.callbacks.reportProviderStatus(
        'model-hrrr-nodd',
        'offline',
        `HRRR field unavailable: ${message}`,
      );
    } finally {
      if (this.isRequestCurrent(context, epoch, sceneId)) context.setRenderPending(this.id, false);
    }
  }

  private isRequestCurrent(
    context: MapControllerContext,
    epoch: number,
    sceneId: string,
  ): boolean {
    return !this.disposed
      && epoch === this.requestEpoch
      && context.scene.id === sceneId
      && modelIsActive(context.scene);
  }
}
