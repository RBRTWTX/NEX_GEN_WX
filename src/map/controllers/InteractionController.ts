import type { MapMouseEvent } from 'maplibre-gl';
import type { GeoJsonFeature } from '../../types/domain';
import { LAYER_IDS } from '../map-runtime';
import type { MapController, MapControllerContext } from './controller-types';
import type { ObservationsController } from './ObservationsController';

export class InteractionController implements MapController {
  readonly id = 'interaction';

  constructor(private readonly observations: ObservationsController) {}

  onMapClick(context: MapControllerContext, event: MapMouseEvent): boolean {
    if (!context.interactive || !context.isStyleReady()) return false;
    const queryLayers = [
      LAYER_IDS.sampleDots,
      LAYER_IDS.sampleLabels,
      LAYER_IDS.observationDots,
      LAYER_IDS.observationLabels,
      LAYER_IDS.alertFill,
      LAYER_IDS.alertOutline,
    ].filter((id) => Boolean(context.map.getLayer(id)));

    const features = queryLayers.length > 0
      ? context.map.queryRenderedFeatures(event.point, { layers: queryLayers })
      : [];

    const sampleFeature = features.find((feature) => typeof feature.properties?.sampleId === 'string');
    if (sampleFeature && this.observations.handleSampleFeature(context, sampleFeature as unknown as GeoJsonFeature)) {
      return true;
    }

    const observationFeature = features.find((feature) => typeof feature.properties?.station === 'string');
    if (
      observationFeature
      && this.observations.handleObservationFeature(context, observationFeature as unknown as GeoJsonFeature)
    ) {
      return true;
    }

    const alertFeature = features.find((feature) => typeof feature.properties?.ngwsId === 'string');
    if (alertFeature) {
      context.callbacks.setSelectedAlertId(String(alertFeature.properties?.ngwsId));
      return true;
    }

    return this.observations.handleFieldSample(context, event.lngLat.lng, event.lngLat.lat);
  }
}
