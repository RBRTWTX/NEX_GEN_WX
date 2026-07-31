import type { StudioAction } from './studio-actions';
import type { StudioState } from './studio-state';
import { coordinatePresentation } from './reducers/presentation-coordinator';
import { reduceOperatorUiState } from './reducers/operator-ui-reducer';
import { reducePresentationState } from './reducers/presentation-state-reducer';
import { reduceProjectState } from './reducers/project-state-reducer';
import { reduceOperatorStatus } from './reducers/status-reducer';

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  const coordinated = coordinatePresentation(state, action);
  if (coordinated) {
    return {
      ...coordinated,
      status: reduceOperatorStatus(state.status, action, state, coordinated),
    };
  }

  const next: StudioState = {
    project: reduceProjectState(state.project, action),
    presentation: reducePresentationState(state.presentation, action),
    ui: reduceOperatorUiState(state.ui, action),
    status: state.status,
  };

  return {
    ...next,
    status: reduceOperatorStatus(state.status, action, state, next),
  };
}
