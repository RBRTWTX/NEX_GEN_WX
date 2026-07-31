import { fetchPlaces } from '../../engine/tauri-commands';
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

export class CitiesController implements MapController {
  readonly id = 'cities';
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

  private applyCached(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    const zoom = context.map.getZoom();
    const key = context.scene.overlays.cities && zoom >= 4.25
      ? dynamicDataKey(currentBBox(context.map), zoom, String(context.scene.display.cityDensity))
      : null;
    setGeoJson(
      context.map,
      SOURCE_IDS.places,
      key && this.data?.key === key ? this.data.value : EMPTY_FEATURE_COLLECTION,
    );
  }

  private async refresh(context: MapControllerContext, force: boolean): Promise<void> {
    if (!context.isStyleReady()) return;
    const zoom = context.map.getZoom();
    if (!context.scene.overlays.cities || zoom < 4.25) {
      this.requestEpoch += 1;
      setGeoJson(context.map, SOURCE_IDS.places, EMPTY_FEATURE_COLLECTION);
      context.callbacks.reportProviderStatus(
        'cities',
        'idle',
        context.scene.overlays.cities ? 'Visible at closer zoom' : 'Layer disabled',
      );
      return;
    }

    const bbox = currentBBox(context.map);
    const key = dynamicDataKey(bbox, zoom, String(context.scene.display.cityDensity));
    if (this.data?.key === key && !force) {
      setGeoJson(context.map, SOURCE_IDS.places, this.data.value);
      return;
    }

    const requestEpoch = ++this.requestEpoch;
    const styleGeneration = context.styleGeneration;
    context.callbacks.reportProviderStatus('cities', 'loading', 'Loading cities and places');
    try {
      const data = await fetchPlaces(bbox, zoom, context.scene.display.cityDensity, force);
      if (!isRequestCurrent(context, styleGeneration, requestEpoch, this.requestEpoch)) return;
      this.data = { key, value: data };
      reportProviderFreshness(context, 'cities', data);
      setGeoJson(context.map, SOURCE_IDS.places, data);
      context.notifyLayerOrderChanged();
    } catch (error) {
      if (requestEpoch !== this.requestEpoch || context.styleGeneration !== styleGeneration) return;
      reportProviderFailure(context, 'cities', error);
      if (this.data?.key === key && context.isStyleReady()) setGeoJson(context.map, SOURCE_IDS.places, this.data.value);
    }
  }
}
