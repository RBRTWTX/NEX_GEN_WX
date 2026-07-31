import { FloatingWindow } from '../components/FloatingWindow';
import type { StudioAction } from '../state/studio-actions';
import type { StudioState } from '../state/studio-state';
import type { StudioScene } from '../types/domain';
import { useModuleRegistry } from './module-context';

export function ModuleDialogHost({
  state,
  scene,
  dispatch,
}: {
  state: StudioState;
  scene: StudioScene;
  dispatch: (action: StudioAction) => void;
}) {
  const registry = useModuleRegistry();
  if (!state.ui.activeDialog.startsWith('module:')) return null;
  const contribution = registry.getDialog(state.ui.activeDialog, scene);
  if (!contribution) {
    return (
      <FloatingWindow title="Module unavailable" className="tool-window" onClose={() => dispatch({ type: 'ui/close-dialog' })} initialPosition={{ x: 360, y: 80 }}>
        <p className="settings-note">The requested module panel is not available for this scene.</p>
      </FloatingWindow>
    );
  }
  const Panel = contribution.component;
  return (
    <FloatingWindow
      title={contribution.title}
      className={`tool-window ${contribution.className ?? ''}`.trim()}
      onClose={() => dispatch({ type: 'ui/close-dialog' })}
      initialPosition={{ x: 360, y: 80 }}
    >
      <Panel
        state={state}
        project={state.project.document}
        scene={scene}
        dispatch={dispatch}
        onClose={() => dispatch({ type: 'ui/close-dialog' })}
      />
    </FloatingWindow>
  );
}
