import type { StudioAction } from '../studio-actions';
import type { OperatorUiState } from '../studio-state';

export function reduceOperatorUiState(state: OperatorUiState, action: StudioAction): OperatorUiState {
  switch (action.type) {
    case 'ui/open-dialog':
      return {
        ...state,
        activeDialog: action.dialog,
        settingsTab: action.settingsTab ?? state.settingsTab,
        contextMenuOpen: false,
      };
    case 'ui/close-dialog':
      return { ...state, activeDialog: 'none' };
    case 'ui/set-settings-tab':
      return { ...state, settingsTab: action.tab };
    case 'ui/toggle-left-panel':
      return { ...state, leftPanelOpen: !state.leftPanelOpen };
    case 'ui/set-context-menu':
      return { ...state, contextMenuOpen: action.value };
    case 'ui/select-scene-element':
      return { ...state, selectedSceneElement: action.selection };
    case 'ui/clear-scene-element':
      return { ...state, selectedSceneElement: null };
    case 'scene/select':
    case 'scene/select-relative':
      return { ...state, contextMenuOpen: false, selectedSceneElement: null };
    case 'presentation/start-show':
      return { ...state, activeDialog: 'none', selectedSceneElement: null };
    case 'scene/duplicate':
    case 'scene/create-graphic':
      return { ...state, activeDialog: 'none' };
    default:
      return state;
  }
}
