export type SceneKind = 'map' | 'graphic';
export type AdvanceMode = 'manual' | 'automatic';
export type TransitionKind = 'cut' | 'dissolve' | 'ease' | 'fly';
export type BaseMapKind = 'gray' | 'dark' | 'satellite';
export type ProjectionKind = 'mercator' | 'globe';
export type ObservationDisplayMode = 'broadcast' | 'standard' | 'detailed';
export type BroadcastContextMode = 'off' | 'auto' | 'custom';
export type BroadcastContextDetail = 'low' | 'broadcast' | 'high';
export type SceneCategory =
  | 'Home'
  | 'National'
  | 'Regional'
  | 'Radar'
  | 'Severe'
  | 'Rainfall'
  | 'Satellite'
  | 'Forecast'
  | 'Climate'
  | 'Winter'
  | 'Observations'
  | 'Tropical'
  | 'Models'
  | 'Graphics'
  | 'Custom';
export type HeaderLegendKind =
  | 'none'
  | 'reflectivity'
  | 'temperature'
  | 'dewpoint'
  | 'rainfall'
  | 'satellite'
  | 'outlook'
  | 'custom';
export type ObservationField =
  | 'tempF'
  | 'dewpointF'
  | 'relativeHumidity'
  | 'heatIndexF'
  | 'windChillF'
  | 'windMph'
  | 'gustMph'
  | 'visibilityMi'
  | 'flightCategory';

export interface CameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface TransitionState {
  type: TransitionKind;
  durationMs: number;
}

export interface HeaderLegendState {
  kind: HeaderLegendKind;
  visible: boolean;
  lowLabel: string;
  highLabel: string;
  customLabel: string;
}

export interface HeaderState {
  title: string;
  subtitle: string;
  validLabel: string;
  visible: boolean;
  opacity: number;
  scale: number;
  legend: HeaderLegendState;
}

export interface LayerVisibility {
  states: boolean;
  counties: boolean;
  roads: boolean;
  cities: boolean;
  alerts: boolean;
  observations: boolean;
  radarSites: boolean;
  stormReports: boolean;
}

export interface MapDisplaySettings {
  cityDensity: number;
  cityLabelScale: number;
  roadDensity: number;
  boundaryWeight: number;
  dimBasemapUnderWeather: boolean;
  contextMode: BroadcastContextMode;
  contextOpacity: number;
  contextDetail: BroadcastContextDetail;
}

export interface AlertDisplaySettings {
  minimumSeverity: 'unknown' | 'minor' | 'moderate' | 'severe' | 'extreme';
  showFill: boolean;
  showOutline: boolean;
  autoZoomOnSelect: boolean;
}

export interface ObservationDisplaySettings {
  field: ObservationField;
  displayMode: ObservationDisplayMode;
  density: number;
  labelScale: number;
  showField: boolean;
  fieldOpacity: number;
  showStations: boolean;
  showStationIds: boolean;
  smoothing: 'sharp' | 'balanced' | 'smooth';
}

export interface ProductSelection {
  category: string;
  id: string;
  opacity: number;
  smoothing: 'sharp' | 'balanced' | 'smooth';
}

export interface MapSample {
  id: string;
  coordinate: [number, number];
  field: ObservationField;
  value: number | string;
  units: string;
  label: string;
  source: string;
  createdAt: string;
}

export type SceneObjectKind = 'text' | 'container' | 'legend' | 'logo' | 'shape' | 'image' | 'icon';
export type CustomSceneObjectKind = 'text' | 'shape' | 'image';

export interface SceneElementStyle {
  color?: string;
  backgroundColor?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientAngleDeg?: number;
  fontFamily?: string;
  fontSizePx?: number;
  fontWeight?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  opacity?: number;
  textShadow?: boolean;
  letterSpacingPx?: number;
  borderColor?: string;
  borderWidthPx?: number;
  borderRadiusPx?: number;
  paddingPx?: number;
  boxShadow?: boolean;
}

/**
 * Scene-object movement is stored in stage-relative units so the same edit scales
 * between the operator canvas, clean output window, and PNG export.
 */
export interface SceneElementTransform {
  xPercent?: number;
  yPercent?: number;
  scaleX?: number;
  scaleY?: number;
  rotationDeg?: number;
  zIndex?: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface SceneElementOverride {
  style: SceneElementStyle;
  transform: SceneElementTransform;
}

export interface CustomSceneObject {
  id: string;
  kind: CustomSceneObjectKind;
  label: string;
  text?: string;
  imageDataUrl?: string | null;
  shape?: 'rectangle' | 'rounded' | 'ellipse' | 'line';
}

export type ModuleSceneState = Record<string, Record<string, unknown>>;

export interface BaseScene {
  id: string;
  name: string;
  kind: SceneKind;
  category: SceneCategory;
  tags: string[];
  transition: TransitionState;
  advance: AdvanceMode;
  holdSeconds: number;
  activeModuleIds: string[];
  moduleState: ModuleSceneState;
  elementOverrides: Record<string, SceneElementOverride>;
  customObjects: CustomSceneObject[];
}

export interface MapScene extends BaseScene {
  kind: 'map';
  camera: CameraState;
  baseMap: BaseMapKind;
  projection: ProjectionKind;
  product: ProductSelection;
  overlays: LayerVisibility;
  display: MapDisplaySettings;
  alerts: AlertDisplaySettings;
  observations: ObservationDisplaySettings;
  samples: MapSample[];
  header: HeaderState;
}

export interface GraphicScene extends BaseScene {
  kind: 'graphic';
  templateId: string;
  settings: Record<string, unknown>;
}

export type StudioScene = MapScene | GraphicScene;

export interface StudioShow {
  id: string;
  name: string;
  sceneIds: string[];
  loop: boolean;
  defaultHoldSeconds: number;
}

export interface StudioBranding {
  studioName: string;
  shortName: string;
  logoDataUrl: string | null;
}

export interface StudioProject {
  schemaVersion: 8;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  scenes: StudioScene[];
  selectedSceneId: string;
  shows: StudioShow[];
  selectedShowId: string | null;
  branding: StudioBranding;
}

export interface EngineStatus {
  version: string;
  workspaceReady: boolean;
  exportDirectory: string;
  services: Array<{
    id: string;
    state: 'idle' | 'ready' | 'degraded' | 'offline';
    detail: string;
  }>;
}

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface GeoJsonGeometry {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
}

export interface GeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
  generatedAt?: string;
  provider?: string;
  cacheStatus?: string;
  cacheWarning?: string;
  [key: string]: unknown;
}

export interface ObservationGridDescriptor {
  columns: number;
  rows: number;
  bbox: BBox;
}

export interface SurfaceObservationCollection extends GeoJsonFeatureCollection {
  analysisFeatures: GeoJsonFeature[];
  field: ObservationField;
  fieldLabel: string;
  fieldUnits: string;
  displayMode: ObservationDisplayMode;
  availableCount: number;
  validCount: number;
  grid: ObservationGridDescriptor;
}

export interface ObservationSummary {
  id: string;
  station: string;
  observed: string;
  raw: string;
  tempF: number | null;
  dewpointF: number | null;
  relativeHumidity: number | null;
  heatIndexF: number | null;
  windChillF: number | null;
  windMph: number | null;
  gustMph: number | null;
  windDirection: number | null;
  visibilityMi: number | null;
  altimeterInHg: number | null;
  weather: string;
  flightCategory: string;
  coordinate: [number, number];
}

export interface AlertSummary {
  id: string;
  event: string;
  headline: string;
  areaDesc: string;
  severity: string;
  urgency: string;
  certainty: string;
  sent: string;
  effective: string;
  expires: string;
  description: string;
  instruction: string;
  hasGeometry: boolean;
}
