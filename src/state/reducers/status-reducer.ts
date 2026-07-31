import type { StudioAction } from '../studio-actions';
import type { OperatorStatusState, StudioState } from '../studio-state';

function status(message: string, level: OperatorStatusState['level'] = 'info'): OperatorStatusState {
  return { message, level, updatedAt: Date.now() };
}

export function reduceOperatorStatus(
  current: OperatorStatusState,
  action: StudioAction,
  previous: StudioState,
  next: StudioState,
): OperatorStatusState {
  if (action.type === 'status/set') return status(action.message, action.level ?? 'info');
  switch (action.type) {
    case 'project/load': return status(`Project restored from ${action.source}`, 'success');
    case 'scene/select': return status('Scene selected');
    case 'scene/set-basemap': return status(`Basemap changed to ${action.baseMap}`);
    case 'scene/set-projection': return status(`Projection changed to ${action.projection}`);
    case 'scene/set-product': return action.product.id ? status(`Product selected: ${action.product.id}`) : current;
    case 'scene/set-overlay': return status(`${action.overlay} ${action.value ? 'shown' : 'hidden'}`);
    case 'scene/set-observation-display': return action.key === 'field' ? status(`Observation field changed to ${String(action.value)}`) : current;
    case 'scene/set-header': return status('Broadcast header updated');
    case 'scene/set-element-style': return status('Scene object appearance updated');
    case 'scene/set-element-transform': return status('Scene object position updated');
    case 'scene/reset-element-style': return status('Scene object appearance reset');
    case 'scene/reset-element-transform': return status('Scene object position reset');
    case 'scene/reset-element': return status('Scene object reset');
    case 'scene/add-custom-object': return status('Scene object added', 'success');
    case 'scene/update-custom-object': return status('Scene object updated');
    case 'scene/delete-custom-object': return status('Scene object deleted');
    case 'scene/duplicate-custom-object': return status('Scene object duplicated', 'success');
    case 'scene/set-transition': return status(`Transition set to ${action.transitionType}`);
    case 'scene/set-advance': return status(`Scene advance set to ${action.value}`);
    case 'scene/set-module-active': return status(`${action.moduleId} ${action.value ? 'enabled' : 'disabled'}`);
    case 'scene/merge-module-state':
    case 'scene/replace-module-state':
    case 'scene/reset-module-state': return status(`${action.moduleId} settings updated`);
    case 'scene/add-map-sample': return status('Map value sampled');
    case 'scene/remove-map-sample': return status('Map sample removed');
    case 'scene/clear-map-samples': return status('Map samples cleared');
    case 'scene/duplicate': return status('Scene saved', 'success');
    case 'scene/create-graphic': return status('Graphic scene added', 'success');
    case 'scene/delete': return previous.project.document.scenes.length <= 1 ? status('A project must keep at least one scene', 'warning') : status('Scene deleted');
    case 'presentation/set-playing': return status(action.value ? 'Presentation running' : 'Presentation paused');
    case 'presentation/start-show': {
      const show = next.project.document.shows.find((item) => item.id === action.showId);
      return show?.sceneIds.length ? status(`Playing ${show.name}`, 'success') : status('The selected show has no scenes', 'warning');
    }
    case 'presentation/advance-show': {
      const show = next.project.document.shows.find((item) => item.id === next.presentation.showId);
      if (!show) return current;
      return status(next.presentation.playing ? `Playing ${show.name}` : `${show.name} finished`);
    }
    case 'presentation/stop-show': return status('Presentation stopped');
    default: return current;
  }
}
