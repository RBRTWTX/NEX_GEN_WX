import {
  fetchCountyBoundaries,
  fetchStateBoundaries,
} from '../../engine/tauri-commands';
import type { GeoJsonFeatureCollection } from '../../types/domain';
import { EMPTY_FEATURE_COLLECTION } from '../map-layer-utils';
import { currentBBox, setGeoJson, SOURCE_IDS } from '../map-runtime';
import type { MapController, MapControllerContext } from './controller-types';
import {
  dynamicDataKey,
  isRequestCurrent,
  reportProviderFailure,
  reportProviderFreshness,
} from './controller-utils';

export class BoundaryController implements MapController {
  readonly id = 'boundaries';
  private stateData: GeoJsonFeatureCollection | null = null;
  private countyData: { key: string; data: GeoJsonFeatureCollection } | null = null;
  private stateEpoch = 0;
  private countyEpoch = 0;

  onStyleReady(context: MapControllerContext): void {
    this.applyCached(context);
    void this.refresh(context, false);
  }

  onSceneChange(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    this.applyCached(context);
    void this.refresh(context, false);
  }

  onMoveEnd(context: MapControllerContext): void {
    void this.refresh(context, false);
  }

  private applyCached(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    setGeoJson(
      context.map,
      SOURCE_IDS.states,
      context.scene.overlays.states && this.stateData ? this.stateData : EMPTY_FEATURE_COLLECTION,
    );
    const countyKey = context.scene.overlays.counties && context.map.getZoom() >= 4
      ? dynamicDataKey(currentBBox(context.map), context.map.getZoom())
      : null;
    setGeoJson(
      context.map,
      SOURCE_IDS.counties,
      countyKey && this.countyData?.key === countyKey ? this.countyData.data : EMPTY_FEATURE_COLLECTION,
    );
  }

  private async refresh(context: MapControllerContext, force: boolean): Promise<void> {
    if (!context.isStyleReady()) return;
    await Promise.allSettled([
      this.refreshStates(context, force),
      this.refreshCounties(context, force),
    ]);
  }

  private async refreshStates(context: MapControllerContext, force: boolean): Promise<void> {
    if (!context.scene.overlays.states) {
      this.stateEpoch += 1;
      setGeoJson(context.map, SOURCE_IDS.states, EMPTY_FEATURE_COLLECTION);
      context.callbacks.reportProviderStatus('states', 'idle', 'Layer disabled');
      return;
    }
    if (this.stateData && !force) {
      setGeoJson(context.map, SOURCE_IDS.states, this.stateData);
      return;
    }

    const requestEpoch = ++this.stateEpoch;
    const styleGeneration = context.styleGeneration;
    context.callbacks.reportProviderStatus('states', 'loading', 'Loading state boundaries');
    try {
      const data = await fetchStateBoundaries(force);
      if (!isRequestCurrent(context, styleGeneration, requestEpoch, this.stateEpoch)) return;
      this.stateData = data;
      reportProviderFreshness(context, 'states', data);
      setGeoJson(context.map, SOURCE_IDS.states, data);
      context.notifyLayerOrderChanged();
    } catch (error) {
      if (requestEpoch !== this.stateEpoch || context.styleGeneration !== styleGeneration) return;
      reportProviderFailure(context, 'states', error);
      if (this.stateData && context.isStyleReady()) setGeoJson(context.map, SOURCE_IDS.states, this.stateData);
    }
  }

  private async refreshCounties(context: MapControllerContext, force: boolean): Promise<void> {
    const zoom = context.map.getZoom();
    if (!context.scene.overlays.counties || zoom < 4) {
      this.countyEpoch += 1;
      setGeoJson(context.map, SOURCE_IDS.counties, EMPTY_FEATURE_COLLECTION);
      context.callbacks.reportProviderStatus(
        'counties',
        'idle',
        context.scene.overlays.counties ? 'Visible at closer zoom' : 'Layer disabled',
      );
      return;
    }

    const bbox = currentBBox(context.map);
    const key = dynamicDataKey(bbox, zoom);
    if (this.countyData?.key === key && !force) {
      setGeoJson(context.map, SOURCE_IDS.counties, this.countyData.data);
      return;
    }

    const requestEpoch = ++this.countyEpoch;
    const styleGeneration = context.styleGeneration;
    context.callbacks.reportProviderStatus('counties', 'loading', 'Loading county boundaries');
    try {
      const data = await fetchCountyBoundaries(bbox, zoom, force);
      if (!isRequestCurrent(context, styleGeneration, requestEpoch, this.countyEpoch)) return;
      this.countyData = { key, data };
      reportProviderFreshness(context, 'counties', data);
      setGeoJson(context.map, SOURCE_IDS.counties, data);
      context.notifyLayerOrderChanged();
    } catch (error) {
      if (requestEpoch !== this.countyEpoch || context.styleGeneration !== styleGeneration) return;
      reportProviderFailure(context, 'counties', error);
      if (this.countyData?.key === key && context.isStyleReady()) {
        setGeoJson(context.map, SOURCE_IDS.counties, this.countyData.data);
      }
    }
  }
}
