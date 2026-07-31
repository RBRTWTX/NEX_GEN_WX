import type { StudioProject } from '../types/domain';
import type { SceneElementSelection } from './scene-element-selection';

export type CoreDialogId =
  | 'none'
  | 'products'
  | 'settings'
  | 'graphic-builder'
  | 'save-scene'
  | 'show-builder';

export type ModuleDialogId = `module:${string}`;
export type StudioDialogId = CoreDialogId | ModuleDialogId;
export type SettingsTab = string;

export interface ProjectState {
  document: StudioProject;
  hydrated: boolean;
  restoredFrom: string;
  persistence: 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
}

export interface PresentationState {
  outputOpen: boolean;
  outputStatus: 'closed' | 'syncing' | 'ready' | 'degraded';
  outputRenderId: string | null;
  outputSceneId: string | null;
  outputWidth: number;
  outputHeight: number;
  outputDetail: string;
  playing: boolean;
  showId: string | null;
  sceneIndex: number;
}

export interface OperatorUiState {
  leftPanelOpen: boolean;
  activeDialog: StudioDialogId;
  settingsTab: SettingsTab;
  contextMenuOpen: boolean;
  selectedSceneElement: SceneElementSelection | null;
}

export interface OperatorStatusState {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  updatedAt: number;
}

export interface StudioState {
  project: ProjectState;
  presentation: PresentationState;
  ui: OperatorUiState;
  status: OperatorStatusState;
}

export function createInitialStudioState(project: StudioProject): StudioState {
  return {
    project: {
      document: project,
      hydrated: false,
      restoredFrom: '',
      persistence: 'idle',
    },
    presentation: {
      outputOpen: false,
      outputStatus: 'closed',
      outputRenderId: null,
      outputSceneId: null,
      outputWidth: 0,
      outputHeight: 0,
      outputDetail: 'Output window is closed.',
      playing: false,
      showId: null,
      sceneIndex: 0,
    },
    ui: {
      leftPanelOpen: true,
      activeDialog: 'none',
      settingsTab: 'header',
      contextMenuOpen: false,
      selectedSceneElement: null,
    },
    status: {
      message: 'Loading project…',
      level: 'info',
      updatedAt: Date.now(),
    },
  };
}
