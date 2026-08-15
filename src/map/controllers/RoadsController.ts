import { fetchRoads } from '../../engine/tauri-commands';
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

export class RoadsController implements MapController {
  readonly id = 'roads';
  private data: { key: string; value: GeoJsonFeatureCollection } | null = null;
  private requestEpoch = 0;

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

  private customRoadsRequired(context: MapControllerContext): boolean {
    return context.scene.baseMap === 'satellite' && context.scene.overlays.roads;
  }

  private applyCached(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    if (!this.customRoadsRequired(context)) {
      setGeoJson(context.map, SOURCE_IDS.roads, EMPTY_FEATURE_COLLECTION);
      return;
    }
    const zoom = context.map.getZoom();
    const key = dynamicDataKey(currentBBox(context.map), zoom, String(context.scene.display.roadDensity));
    setGeoJson(
      context.map,
      SOURCE_IDS.roads,
      this.data?.key === key ? this.data.value : EMPTY_FEATURE_COLLECTION,
    );
  }

  private async refresh(context: MapControllerContext, force: boolean): Promise<void> {
    if (!context.isStyleReady()) return;

    if (!context.scene.overlays.roads) {
      this.requestEpoch += 1;
      setGeoJson(context.map, SOURCE_IDS.roads, EMPTY_FEATURE_COLLECTION);
      context.callbacks.reportProviderStatus('roads', 'idle', 'Layer disabled');
      return;
    }

    if (context.scene.baseMap !== 'satellite') {
      this.requestEpoch += 1;
      setGeoJson(context.map, SOURCE_IDS.roads, EMPTY_FEATURE_COLLECTION);
      context.callbacks.reportProviderStatus('roads', 'online', 'OpenFreeMap vector roads and route labels', 'live');
      return;
    }

    const zoom = context.map.getZoom();
    if (zoom < 3.5) {
      this.requestEpoch += 1;
      setGeoJson(context.map, SOURCE_IDS.roads, EMPTY_FEATURE_COLLECTION);
      context.callbacks.reportProviderStatus('roads', 'idle', 'Road detail appears at closer zoom');
      return;
    }

    const bbox = currentBBox(context.map);
    const key = dynamicDataKey(bbox, zoom, String(context.scene.display.roadDensity));
    if (this.data?.key === key && !force) {
      setGeoJson(context.map, SOURCE_IDS.roads, this.data.value);
      reportProviderFreshness(context, 'roads', this.data.value);
      return;
    }

    const requestEpoch = ++this.requestEpoch;
    const styleGeneration = context.styleGeneration;
    context.callbacks.reportProviderStatus('roads', 'loading', 'Loading satellite road context…');
    try {
      const data = await fetchRoads(bbox, zoom, context.scene.display.roadDensity, force);
      if (!isRequestCurrent(context, styleGeneration, requestEpoch, this.requestEpoch)) return;
      this.data = { key, value: data };
      reportProviderFreshness(context, 'roads', data);
      setGeoJson(context.map, SOURCE_IDS.roads, data);
      context.notifyLayerOrderChanged();
    } catch (error) {
      if (requestEpoch !== this.requestEpoch || context.styleGeneration !== styleGeneration) return;
      reportProviderFailure(context, 'roads', error);
      if (this.data?.key === key && context.isStyleReady()) setGeoJson(context.map, SOURCE_IDS.roads, this.data.value);
    }
  }
}
