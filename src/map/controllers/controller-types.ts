import type {
  Map as MapLibreMap,
  MapMouseEvent,
} from 'maplibre-gl';
import type {
  CameraState,
  GeoJsonFeatureCollection,
  MapSample,
  MapScene,
  ObservationSummary,
} from '../../types/domain';
import type { BasemapStyle } from '../basemap-styles';
import type {
  ProviderId,
  ProviderState,
} from '../../data/weather-data-context';

export type MapRenderPurpose = 'operator' | 'output' | 'export';

export interface MapControllerCallbacks {
  onCameraChange?: (camera: CameraState) => void;
  onAddSample?: (sample: Omit<MapSample, 'id' | 'createdAt'>) => void;
  onRemoveSample?: (sampleId: string) => void;
  setSelectedAlertId: (id: string | null) => void;
  setSelectedObservation: (observation: ObservationSummary | null) => void;
  refreshAlerts: (force?: boolean) => Promise<void>;
  reportProviderStatus: (
    id: ProviderId,
    state: ProviderState,
    message?: string,
    cacheStatus?: string,
  ) => void;
}

export interface MapControllerContext {
  readonly map: MapLibreMap;
  readonly scene: MapScene;
  readonly interactive: boolean;
  readonly renderPurpose: MapRenderPurpose;
  readonly styleGeneration: number;
  readonly alerts: GeoJsonFeatureCollection;
  readonly selectedAlertId: string | null;
  readonly selectedObservation: ObservationSummary | null;
  readonly callbacks: MapControllerCallbacks;

  isStyleReady(): boolean;
  reloadStyle(style: BasemapStyle): void;
  scheduleResize(): void;
  notifyLayerOrderChanged(): void;
  setRenderPending(id: string, pending: boolean): void;
}

export interface MapController {
  readonly id: string;
  onAttach?(context: MapControllerContext): void;
  onStyleReady?(context: MapControllerContext): void | Promise<void>;
  onSceneChange?(context: MapControllerContext, previous: MapScene): void | Promise<void>;
  onMoveEnd?(context: MapControllerContext): void | Promise<void>;
  onMapClick?(context: MapControllerContext, event: MapMouseEvent): boolean;
  onMapError?(context: MapControllerContext, event: unknown): boolean;
  onAlertsChange?(context: MapControllerContext): void;
  onSelectedAlertChange?(context: MapControllerContext): void;
  onSelectedObservationChange?(context: MapControllerContext): void;
  onObservationRefresh?(context: MapControllerContext, force: boolean): void | Promise<void>;
  onLayerOrderChanged?(context: MapControllerContext): void;
  dispose?(): void;
}
