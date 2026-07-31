import { selectSceneById } from '../project-reducer';
import type { StudioAction } from '../studio-actions';
import type { StudioState } from '../studio-state';

export function coordinatePresentation(state: StudioState, action: StudioAction): StudioState | null {
  if (action.type === 'presentation/start-show') {
    const show = state.project.document.shows.find((item) => item.id === action.showId);
    const firstSceneId = show?.sceneIds[0];
    if (!show || !firstSceneId) return state;
    return {
      ...state,
      project: { ...state.project, document: selectSceneById(state.project.document, firstSceneId) },
      presentation: { ...state.presentation, playing: true, showId: show.id, sceneIndex: 0 },
      ui: { ...state.ui, activeDialog: 'none', selectedSceneElement: null },
    };
  }

  if (action.type === 'presentation/advance-show') {
    const show = state.project.document.shows.find((item) => item.id === state.presentation.showId);
    if (!show?.sceneIds.length) return state;
    const proposed = state.presentation.sceneIndex + action.direction;
    const atEndWithoutLoop = proposed >= show.sceneIds.length && !show.loop;
    const nextIndex = proposed >= show.sceneIds.length
      ? (show.loop ? 0 : show.sceneIds.length - 1)
      : proposed < 0
        ? (show.loop ? show.sceneIds.length - 1 : 0)
        : proposed;
    return {
      ...state,
      project: { ...state.project, document: selectSceneById(state.project.document, show.sceneIds[nextIndex]) },
      presentation: {
        ...state.presentation,
        playing: atEndWithoutLoop ? false : state.presentation.playing,
        sceneIndex: nextIndex,
      },
    };
  }

  return null;
}
