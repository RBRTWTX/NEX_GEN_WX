import type { GeoJsonFeature } from '../../types/domain';
import {
  EMPTY_FEATURE_COLLECTION,
  featureBounds,
  filterAlertsForScene,
} from '../map-layer-utils';
import { setGeoJson, SOURCE_IDS } from '../map-runtime';
import type { MapController, MapControllerContext } from './controller-types';

export class AlertsController implements MapController {
  readonly id = 'alerts';
  private lastAutoZoomKey = '';

  onStyleReady(context: MapControllerContext): void {
    this.syncAlerts(context);
    this.syncSelection(context, false);
    if (context.scene.overlays.alerts && context.alerts.features.length === 0) {
      void context.callbacks.refreshAlerts(false);
    }
  }

  onSceneChange(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    this.syncAlerts(context);
    this.syncSelection(context, false);
  }

  onMoveEnd(context: MapControllerContext): void {
    this.syncLeader(context);
  }

  onAlertsChange(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    this.syncAlerts(context);
    this.syncSelection(context, true);
  }

  onSelectedAlertChange(context: MapControllerContext): void {
    if (!context.isStyleReady()) return;
    this.syncSelection(context, true);
  }

  private selectedFeature(context: MapControllerContext): GeoJsonFeature | undefined {
    if (!context.selectedAlertId) return undefined;
    return context.alerts.features.find(
      (feature) => feature.properties.ngwsId === context.selectedAlertId,
    );
  }

  private syncAlerts(context: MapControllerContext): void {
    setGeoJson(context.map, SOURCE_IDS.alerts, filterAlertsForScene(context.alerts, context.scene));
    context.notifyLayerOrderChanged();
  }

  private syncSelection(context: MapControllerContext, allowAutoZoom: boolean): void {
    const selectedFeature = this.selectedFeature(context);
    setGeoJson(
      context.map,
      SOURCE_IDS.selectedAlert,
      selectedFeature
        ? { type: 'FeatureCollection', features: [selectedFeature] }
        : EMPTY_FEATURE_COLLECTION,
    );
    this.syncLeader(context, selectedFeature);

    const bounds = featureBounds(selectedFeature);
    if (!bounds || !allowAutoZoom || !context.interactive || !context.scene.alerts.autoZoomOnSelect) return;
    const zoomKey = `${context.styleGeneration}|${context.scene.id}|${context.selectedAlertId}`;
    if (zoomKey === this.lastAutoZoomKey) return;
    this.lastAutoZoomKey = zoomKey;
    context.map.fitBounds(bounds, {
      padding: { top: 110, right: 360, bottom: 80, left: 80 },
      duration: 900,
      maxZoom: 9,
    });
  }

  private syncLeader(context: MapControllerContext, feature = this.selectedFeature(context)): void {
    if (!context.isStyleReady()) return;
    const bounds = featureBounds(feature);
    if (!bounds) {
      setGeoJson(context.map, SOURCE_IDS.alertLeader, EMPTY_FEATURE_COLLECTION);
      return;
    }
    const polygonCenter: [number, number] = [
      (bounds[0][0] + bounds[1][0]) / 2,
      (bounds[0][1] + bounds[1][1]) / 2,
    ];
    const canvas = context.map.getCanvas();
    const anchor = context.map.unproject([
      Math.max(24, canvas.clientWidth - 44),
      Math.min(Math.max(150, canvas.clientHeight * 0.22), canvas.clientHeight - 28),
    ]);
    setGeoJson(context.map, SOURCE_IDS.alertLeader, {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [polygonCenter, [anchor.lng, anchor.lat]],
        },
      }],
    });
  }
}
