import type { StudioAction } from '../studio-actions';
import type { PresentationState } from '../studio-state';

export function reducePresentationState(state: PresentationState, action: StudioAction): PresentationState {
  switch (action.type) {
    case 'presentation/set-output-open':
      return {
        ...state,
        outputOpen: action.value,
        outputStatus: action.value ? state.outputStatus : 'closed',
        outputDetail: action.value ? state.outputDetail : 'Output window is closed.',
      };
    case 'presentation/output-sync-start':
      return {
        ...state,
        outputOpen: true,
        outputStatus: 'syncing',
        outputRenderId: action.renderId,
        outputSceneId: action.sceneId,
        outputDetail: 'Synchronizing clean output…',
      };
    case 'presentation/output-ack':
      if (state.outputRenderId !== action.renderId) return state;
      return {
        ...state,
        outputOpen: true,
        outputStatus: action.ready ? 'ready' : 'degraded',
        outputSceneId: action.sceneId,
        outputWidth: action.width,
        outputHeight: action.height,
        outputDetail: action.detail,
      };
    case 'presentation/output-error':
      return { ...state, outputStatus: 'degraded', outputDetail: action.detail };
    case 'presentation/set-playing':
      return { ...state, playing: action.value };
    case 'presentation/stop-show':
      return { ...state, playing: false, showId: null, sceneIndex: 0 };
    default:
      return state;
  }
}
