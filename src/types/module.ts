import type { ComponentType } from 'react';
import type { MapController } from '../map/controllers/controller-types';
import type { LayerVisibility, StudioProject, StudioScene } from './domain';
import type { StudioAction } from '../state/studio-actions';
import type { StudioState, StudioDialogId, SettingsTab } from '../state/studio-state';

export type ModuleDomain =
  | 'foundation'
  | 'map'
  | 'data'
  | 'weather'
  | 'graphics'
  | 'presentation'
  | 'output';

export type ModuleMaturity = 'foundation' | 'operational' | 'migration-next' | 'planned';
export type ModuleSceneKind = 'map' | 'graphic';

export interface StudioModuleManifest {
  id: string;
  name: string;
  domain: ModuleDomain;
  maturity: ModuleMaturity;
  description: string;
  sceneKinds: ModuleSceneKind[];
  tools: string[];
  legacyFiles: string[];
  dependencies: string[];
}

export interface ModuleRuntimeContext {
  state: StudioState;
  project: StudioProject;
  scene: StudioScene;
  dispatch: (action: StudioAction) => void;
}

export interface ModuleDialogPanelProps extends ModuleRuntimeContext {
  onClose: () => void;
}

export interface ModuleSettingsPanelProps extends ModuleRuntimeContext {}

export interface ModuleProviderContribution {
  id: string;
  label: string;
}

export interface ModuleDialogContribution {
  id: StudioDialogId;
  title: string;
  className?: string;
  order?: number;
  sceneKinds?: ModuleSceneKind[];
  requiresActiveModule?: boolean;
  component: ComponentType<ModuleDialogPanelProps>;
}

export interface ModuleSettingsTabContribution {
  id: SettingsTab;
  label: string;
  order: number;
  sceneKinds: ModuleSceneKind[];
  requiresActiveModule?: boolean;
  component: ComponentType<ModuleSettingsPanelProps>;
}

export type ModuleCommand =
  | { kind: 'open-dialog'; dialog: StudioDialogId }
  | { kind: 'open-settings'; tab: SettingsTab }
  | { kind: 'toggle-overlay'; overlay: keyof LayerVisibility }
  | { kind: 'clear-samples' }
  | { kind: 'map-home' }
  | { kind: 'map-zoom'; amount: number }
  | { kind: 'status'; message: string };

export type ModuleToolPlacement = 'dock-layer' | 'dock-tool' | 'quick' | 'context';

export interface ModuleToolContribution {
  id: string;
  label: string;
  placement: ModuleToolPlacement;
  order: number;
  sceneKinds: ModuleSceneKind[];
  requiresActiveModule?: boolean;
  command: ModuleCommand;
}

export type MapControllerPhase = 'foundation' | 'data' | 'interaction' | 'finalize';

export interface ModuleMapControllerFactoryContext {
  getController<T extends MapController = MapController>(id: string): T | undefined;
  requireController<T extends MapController = MapController>(id: string): T;
  setService<T>(id: string, value: T): void;
  getService<T>(id: string): T | undefined;
}

export interface ModuleMapControllerContribution {
  id: string;
  phase: MapControllerPhase;
  order: number;
  create: (context: ModuleMapControllerFactoryContext) => MapController;
}

export interface StudioModuleDefinition {
  manifest: StudioModuleManifest;
  isActiveForScene?: (scene: StudioScene) => boolean;
  providers?: ModuleProviderContribution[];
  dialogs?: ModuleDialogContribution[];
  settingsTabs?: ModuleSettingsTabContribution[];
  tools?: ModuleToolContribution[];
  mapControllers?: ModuleMapControllerContribution[];
  defaultSceneState?: Record<string, unknown>;
  migrateSceneState?: (
    value: Record<string, unknown>,
    scene: StudioScene,
  ) => Record<string, unknown>;
}
