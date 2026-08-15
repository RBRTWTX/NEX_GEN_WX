import { OBSERVATION_FIELD_META } from '../observation-field';
import { applyBasemapVisibility } from '../map-layer-utils';
import {
  addStudioLayers,
  LAYER_IDS,
} from '../map-runtime';
import type { MapController, MapControllerContext } from './controller-types';

export class LayerStyleController implements MapController {
  readonly id = 'layer-style';

  onStyleReady(context: MapControllerContext): void {
    addStudioLayers(context.map, context.scene);
    this.apply(context);
  }

  onSceneChange(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    this.apply(context);
  }

  private apply(context: MapControllerContext): void {
    const { map, scene } = context;
    applyBasemapVisibility(map, scene);

    const showCustomRoads = scene.baseMap === 'satellite' && scene.overlays.roads;
    for (const roadLayer of [LAYER_IDS.roadMajor, LAYER_IDS.roadSecondary, LAYER_IDS.roadLocal, LAYER_IDS.roadLabels]) {
      if (map.getLayer(roadLayer)) {
        map.setLayoutProperty(roadLayer, 'visibility', showCustomRoads ? 'visible' : 'none');
      }
    }

    if (map.getLayer(LAYER_IDS.stateLines)) {
      map.setLayoutProperty(LAYER_IDS.stateLines, 'visibility', scene.overlays.states ? 'visible' : 'none');
      map.setPaintProperty(LAYER_IDS.stateLines, 'line-width', [
        'interpolate', ['linear'], ['zoom'],
        2, 0.7 * scene.display.boundaryWeight / 100,
        6, 1.4 * scene.display.boundaryWeight / 100,
        10, 2.1 * scene.display.boundaryWeight / 100,
      ]);
    }
    if (map.getLayer(LAYER_IDS.countyLines)) {
      map.setLayoutProperty(LAYER_IDS.countyLines, 'visibility', scene.overlays.counties ? 'visible' : 'none');
    }
    if (map.getLayer(LAYER_IDS.cityDots)) {
      map.setLayoutProperty(LAYER_IDS.cityDots, 'visibility', scene.overlays.cities ? 'visible' : 'none');
    }
    if (map.getLayer(LAYER_IDS.cityLabels)) {
      map.setLayoutProperty(LAYER_IDS.cityLabels, 'visibility', scene.overlays.cities ? 'visible' : 'none');
      map.setLayoutProperty(LAYER_IDS.cityLabels, 'text-size', [
        'interpolate', ['linear'], ['zoom'],
        3, 10 * scene.display.cityLabelScale / 100,
        7, 12 * scene.display.cityLabelScale / 100,
        11, 15 * scene.display.cityLabelScale / 100,
      ]);
    }
    if (map.getLayer(LAYER_IDS.dim)) {
      map.setPaintProperty(LAYER_IDS.dim, 'fill-opacity', scene.display.dimBasemapUnderWeather ? 0.16 : 0);
    }
    if (map.getLayer(LAYER_IDS.alertFill)) {
      map.setPaintProperty(LAYER_IDS.alertFill, 'fill-opacity', scene.alerts.showFill ? 0.28 : 0);
      map.setLayoutProperty(LAYER_IDS.alertFill, 'visibility', scene.overlays.alerts ? 'visible' : 'none');
    }
    if (map.getLayer(LAYER_IDS.alertOutline)) {
      map.setPaintProperty(LAYER_IDS.alertOutline, 'line-opacity', scene.alerts.showOutline ? 0.95 : 0);
      map.setLayoutProperty(LAYER_IDS.alertOutline, 'visibility', scene.overlays.alerts ? 'visible' : 'none');
    }

    const showObservations = scene.overlays.observations;
    const fieldMeta = OBSERVATION_FIELD_META[scene.observations.field];
    const showField = showObservations && scene.observations.showField && fieldMeta.supportsField;
    if (map.getLayer(LAYER_IDS.observationField)) {
      map.setLayoutProperty(LAYER_IDS.observationField, 'visibility', showField ? 'visible' : 'none');
      map.setPaintProperty(LAYER_IDS.observationField, 'raster-opacity', scene.observations.fieldOpacity / 100);
      map.setPaintProperty(
        LAYER_IDS.observationField,
        'raster-resampling',
        scene.observations.smoothing === 'sharp' ? 'nearest' : 'linear',
      );
    }
    if (map.getLayer(LAYER_IDS.observationDots)) {
      map.setLayoutProperty(
        LAYER_IDS.observationDots,
        'visibility',
        showObservations && scene.observations.showStations ? 'visible' : 'none',
      );
    }
    if (map.getLayer(LAYER_IDS.observationLabels)) {
      map.setLayoutProperty(
        LAYER_IDS.observationLabels,
        'visibility',
        showObservations && scene.observations.showStations ? 'visible' : 'none',
      );
      map.setLayoutProperty(LAYER_IDS.observationLabels, 'text-size', [
        'interpolate', ['linear'], ['zoom'],
        2, 10 * scene.observations.labelScale / 100,
        7, 12 * scene.observations.labelScale / 100,
        11, 14 * scene.observations.labelScale / 100,
      ]);
    }
    if (map.getLayer(LAYER_IDS.selectedObservation)) {
      map.setLayoutProperty(LAYER_IDS.selectedObservation, 'visibility', showObservations ? 'visible' : 'none');
    }

    context.notifyLayerOrderChanged();
  }
}
