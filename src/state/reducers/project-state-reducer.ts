import type { StudioProject } from '../../types/domain';
import { reduceProject } from '../project-reducer';
import type { StudioAction } from '../studio-actions';
import type { ProjectState } from '../studio-state';

function isContentEdit(action: StudioAction): boolean {
  return action.type !== 'scene/select'
    && action.type !== 'scene/select-relative'
    && action.type !== 'show/select'
    && action.type !== 'presentation/start-show'
    && action.type !== 'presentation/advance-show'
    && !action.type.startsWith('ui/')
    && !action.type.startsWith('status/')
    && !action.type.startsWith('presentation/set-')
    && action.type !== 'presentation/stop-show';
}

export function reduceProjectState(state: ProjectState, action: StudioAction): ProjectState {
  if (action.type === 'project/load') {
    return {
      document: action.project,
      hydrated: true,
      restoredFrom: action.source,
      persistence: 'saved',
    };
  }
  if (action.type === 'project/persistence') return { ...state, persistence: action.value };

  const document = reduceProject(state.document, action);
  if (document === state.document) return state;
  return {
    ...state,
    document,
    persistence: isContentEdit(action) ? 'dirty' : state.persistence,
  };
}

export function replaceProjectDocument(state: ProjectState, document: StudioProject): ProjectState {
  return { ...state, document };
}
