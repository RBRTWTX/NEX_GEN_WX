import type {
  AlertDisplaySettings,
  BaseMapKind,
  CameraState,
  HeaderState,
  LayerVisibility,
  MapDisplaySettings,
  MapSample,
  ModuleSceneState,
  ObservationDisplaySettings,
  ProductSelection,
  ProjectionKind,
  SceneCategory,
  CustomSceneObject,
  SceneElementStyle,
  SceneElementTransform,
  StudioProject,
  StudioShow,
  TransitionKind,
} from '../types/domain';
import type { SettingsTab, StudioDialogId } from './studio-state';
import type { SceneElementSelection } from './scene-element-selection';

export type StudioAction =
  | { type: 'project/load'; project: StudioProject; source: string }
  | { type: 'project/set-name'; name: string }
  | { type: 'project/persistence'; value: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' }
  | { type: 'scene/select'; sceneId: string }
  | { type: 'scene/set-camera'; sceneId: string; camera: CameraState }
  | { type: 'scene/set-basemap'; sceneId: string; baseMap: BaseMapKind }
  | { type: 'scene/set-projection'; sceneId: string; projection: ProjectionKind }
  | { type: 'scene/set-product'; sceneId: string; product: Partial<ProductSelection> }
  | { type: 'scene/set-overlay'; sceneId: string; overlay: keyof LayerVisibility; value: boolean }
  | { type: 'scene/set-map-display'; sceneId: string; key: keyof MapDisplaySettings; value: MapDisplaySettings[keyof MapDisplaySettings] }
  | { type: 'scene/set-alert-display'; sceneId: string; key: keyof AlertDisplaySettings; value: AlertDisplaySettings[keyof AlertDisplaySettings] }
  | { type: 'scene/set-observation-display'; sceneId: string; key: keyof ObservationDisplaySettings; value: ObservationDisplaySettings[keyof ObservationDisplaySettings] }
  | { type: 'scene/set-header'; sceneId: string; key: keyof HeaderState; value: HeaderState[keyof HeaderState] }
  | { type: 'scene/set-transition'; sceneId: string; transitionType: TransitionKind; durationMs?: number }
  | { type: 'scene/set-advance'; sceneId: string; value: 'manual' | 'automatic' }
  | { type: 'scene/set-hold-seconds'; sceneId: string; value: number }
  | { type: 'scene/set-graphic-setting'; sceneId: string; key: string; value: unknown }
  | { type: 'scene/set-module-active'; sceneId: string; moduleId: string; value: boolean }
  | { type: 'scene/merge-module-state'; sceneId: string; moduleId: string; patch: Record<string, unknown> }
  | { type: 'scene/replace-module-state'; sceneId: string; moduleId: string; value: ModuleSceneState[string] }
  | { type: 'scene/reset-module-state'; sceneId: string; moduleId: string }
  | { type: 'scene/normalize-module-state'; sceneId: string; moduleState: ModuleSceneState }
  | { type: 'scene/set-element-style'; sceneId: string; elementId: string; style: Partial<SceneElementStyle> }
  | { type: 'scene/set-element-transform'; sceneId: string; elementId: string; transform: Partial<SceneElementTransform> }
  | { type: 'scene/reset-element-style'; sceneId: string; elementId: string }
  | { type: 'scene/reset-element-transform'; sceneId: string; elementId: string }
  | { type: 'scene/reset-element'; sceneId: string; elementId: string }
  | { type: 'scene/add-custom-object'; sceneId: string; object: CustomSceneObject; transform?: Partial<SceneElementTransform>; style?: Partial<SceneElementStyle> }
  | { type: 'scene/update-custom-object'; sceneId: string; objectId: string; patch: Partial<CustomSceneObject> }
  | { type: 'scene/delete-custom-object'; sceneId: string; objectId: string }
  | { type: 'scene/duplicate-custom-object'; sceneId: string; objectId: string }
  | { type: 'scene/add-map-sample'; sceneId: string; sample: Omit<MapSample, 'id' | 'createdAt'> }
  | { type: 'scene/remove-map-sample'; sceneId: string; sampleId: string }
  | { type: 'scene/clear-map-samples'; sceneId: string }
  | { type: 'scene/rename'; sceneId: string; name: string }
  | { type: 'scene/set-category'; sceneId: string; category: SceneCategory }
  | { type: 'scene/duplicate'; sceneId: string; name?: string; category?: SceneCategory; transitionType?: TransitionKind; durationMs?: number; advance?: 'manual' | 'automatic'; holdSeconds?: number }
  | { type: 'scene/create-graphic'; templateId: string; name: string; settings?: Record<string, unknown> }
  | { type: 'scene/delete'; sceneId: string }
  | { type: 'scene/move'; sceneId: string; direction: -1 | 1 }
  | { type: 'scene/select-relative'; direction: -1 | 1 }
  | { type: 'presentation/set-playing'; value: boolean }
  | { type: 'presentation/start-show'; showId: string }
  | { type: 'presentation/advance-show'; direction: -1 | 1 }
  | { type: 'presentation/stop-show' }
  | { type: 'presentation/set-output-open'; value: boolean }
  | { type: 'presentation/output-sync-start'; renderId: string; sceneId: string }
  | { type: 'presentation/output-ack'; renderId: string; sceneId: string; ready: boolean; width: number; height: number; detail: string }
  | { type: 'presentation/output-error'; detail: string }
  | { type: 'ui/open-dialog'; dialog: StudioDialogId; settingsTab?: SettingsTab }
  | { type: 'ui/close-dialog' }
  | { type: 'ui/set-settings-tab'; tab: SettingsTab }
  | { type: 'ui/toggle-left-panel' }
  | { type: 'ui/set-context-menu'; value: boolean }
  | { type: 'ui/select-scene-element'; selection: SceneElementSelection }
  | { type: 'ui/clear-scene-element' }
  | { type: 'show/create'; name: string }
  | { type: 'show/delete'; showId: string }
  | { type: 'show/select'; showId: string }
  | { type: 'show/update'; showId: string; update: Partial<Omit<StudioShow, 'id' | 'sceneIds'>> }
  | { type: 'show/add-scene'; showId: string; sceneId: string }
  | { type: 'show/remove-scene'; showId: string; sceneId: string; index?: number }
  | { type: 'show/move-scene'; showId: string; index: number; direction: -1 | 1 }
  | { type: 'show/clear'; showId: string }
  | { type: 'status/set'; message: string; level?: 'info' | 'success' | 'warning' | 'error' };
