import { fetchSurfaceObservations } from '../../engine/tauri-commands';
import type {
  GeoJsonFeature,
  SurfaceObservationCollection,
} from '../../types/domain';
import { summarizeObservation } from '../../data/weather-data-context';
import { EMPTY_FEATURE_COLLECTION } from '../map-layer-utils';
import {
  formatObservationValue,
  nearestAnalysisValue,
  OBSERVATION_FIELD_META,
  renderObservationField,
  TRANSPARENT_FIELD_IMAGE,
} from '../observation-field';
import {
  currentBBox,
  sampleCollection,
  selectedObservationCollection,
  setGeoJson,
  SOURCE_IDS,
  styledObservationCollection,
  type MutableImageSource,
  WORLD_IMAGE_COORDINATES,
} from '../map-runtime';
import type { MapController, MapControllerContext } from './controller-types';
import {
  dynamicDataKey,
  isRequestCurrent,
  reportProviderFailure,
  reportProviderFreshness,
} from './controller-utils';

export class ObservationsController implements MapController {
  readonly id = 'observations';
  private data: { key: string; value: SurfaceObservationCollection } | null = null;
  private requestEpoch = 0;

  onStyleReady(context: MapControllerContext): void {
    this.syncSelection(context);
    this.syncSamples(context);
    this.applyCached(context);
    void this.refresh(context, false);
  }

  onSceneChange(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    this.syncSamples(context);
    this.syncSelection(context);
    this.applyCached(context);
    void this.refresh(context, false);
  }

  onMoveEnd(context: MapControllerContext): void {
    void this.refresh(context, false);
  }

  onSelectedObservationChange(context: MapControllerContext): void {
    this.syncSelection(context);
  }

  onObservationRefresh(context: MapControllerContext, force: boolean): void {
    this.data = null;
    void this.refresh(context, force);
  }

  handleSampleFeature(context: MapControllerContext, feature: GeoJsonFeature): boolean {
    const sampleId = feature.properties?.sampleId;
    if (typeof sampleId !== 'string') return false;
    context.callbacks.onRemoveSample?.(sampleId);
    return true;
  }

  handleObservationFeature(context: MapControllerContext, feature: GeoJsonFeature): boolean {
    if (typeof feature.properties?.station !== 'string') return false;
    const summary = summarizeObservation(feature);
    if (summary) context.callbacks.setSelectedObservation(summary);
    return Boolean(summary);
  }

  handleFieldSample(context: MapControllerContext, longitude: number, latitude: number): boolean {
    const scene = context.scene;
    if (!scene.overlays.observations || !scene.observations.showField) return false;
    const collection = this.data?.value ?? null;
    const nearest = nearestAnalysisValue(collection, longitude, latitude);
    if (!nearest) return false;

    const grid = collection?.grid;
    if (grid && grid.columns > 0 && grid.rows > 0) {
      const longitudeStep = (grid.bbox.east - grid.bbox.west) / grid.columns;
      const latitudeStep = (grid.bbox.north - grid.bbox.south) / grid.rows;
      const maximumDistanceSquared = Math.max(longitudeStep, latitudeStep) ** 2 * 9;
      if (nearest.distanceSquared > maximumDistanceSquared) return false;
    }

    const meta = OBSERVATION_FIELD_META[scene.observations.field];
    context.callbacks.onAddSample?.({
      coordinate: [longitude, latitude],
      field: scene.observations.field,
      value: Math.round(nearest.value * 10) / 10,
      units: meta.units,
      label: formatObservationValue(scene.observations.field, nearest.value),
      source: 'NOAA AWC surface observation analysis',
    });
    return true;
  }

  private syncSelection(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    setGeoJson(
      context.map,
      SOURCE_IDS.selectedObservation,
      selectedObservationCollection(context.selectedObservation),
    );
  }

  private syncSamples(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    setGeoJson(context.map, SOURCE_IDS.samples, sampleCollection(context.scene.samples));
    context.notifyLayerOrderChanged();
  }

  private applyCached(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    const key = this.currentKey(context);
    if (!key || !this.data || this.data.key !== key) {
      this.clearData(context);
      return;
    }
    this.applyData(context, this.data.value);
  }

  private currentKey(context: MapControllerContext): string | null {
    const zoom = context.map.getZoom();
    if (!context.scene.overlays.observations || zoom < 2) return null;
    const settings = context.scene.observations;
    return dynamicDataKey(
      currentBBox(context.map),
      zoom,
      [settings.field, settings.displayMode, settings.density, settings.showStationIds].join('|'),
    );
  }

  private clearData(context: MapControllerContext): void {
    setGeoJson(context.map, SOURCE_IDS.observations, EMPTY_FEATURE_COLLECTION);
    (context.map.getSource(SOURCE_IDS.observationField) as unknown as MutableImageSource | undefined)?.updateImage({
      url: TRANSPARENT_FIELD_IMAGE,
      coordinates: WORLD_IMAGE_COORDINATES,
    });
  }

  private applyData(context: MapControllerContext, data: SurfaceObservationCollection): void {
    setGeoJson(context.map, SOURCE_IDS.observations, styledObservationCollection(data, context.scene));
    const rendered = renderObservationField(data, context.scene.observations);
    if (rendered) {
      (context.map.getSource(SOURCE_IDS.observationField) as unknown as MutableImageSource | undefined)?.updateImage({
        url: rendered.url,
        coordinates: rendered.coordinates,
      });
    }
    context.notifyLayerOrderChanged();
  }

  private async refresh(context: MapControllerContext, force: boolean): Promise<void> {
    if (!context.isStyleReady()) return;
    const zoom = context.map.getZoom();
    if (!context.scene.overlays.observations || zoom < 2) {
      this.requestEpoch += 1;
      this.clearData(context);
      context.callbacks.reportProviderStatus(
        'observations',
        'idle',
        context.scene.overlays.observations ? 'Visible at closer zoom' : 'Layer disabled',
      );
      return;
    }

    const bbox = currentBBox(context.map);
    const settings = context.scene.observations;
    const key = this.currentKey(context);
    if (!key) return;
    if (this.data?.key === key && !force) {
      this.applyData(context, this.data.value);
      return;
    }

    const requestEpoch = ++this.requestEpoch;
    const styleGeneration = context.styleGeneration;
    context.callbacks.reportProviderStatus('observations', 'loading', 'Loading surface observations');
    try {
      const data = await fetchSurfaceObservations(
        bbox,
        zoom,
        settings.density,
        settings.displayMode,
        settings.field,
        force,
      );
      if (!isRequestCurrent(context, styleGeneration, requestEpoch, this.requestEpoch)) return;
      this.data = { key, value: data };
      reportProviderFreshness(context, 'observations', data);
      this.applyData(context, data);
    } catch (error) {
      if (requestEpoch !== this.requestEpoch || context.styleGeneration !== styleGeneration) return;
      reportProviderFailure(context, 'observations', error);
      if (this.data?.key === key && context.isStyleReady()) this.applyData(context, this.data.value);
    }
  }
}
