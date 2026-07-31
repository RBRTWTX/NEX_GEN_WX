import { useModuleRegistry } from '../modules/module-context';
import type { StudioAction } from '../state/studio-actions';
import type { SettingsTab, StudioState } from '../state/studio-state';
import type { StudioScene } from '../types/domain';
import { FloatingWindow } from './FloatingWindow';

interface SettingsDialogProps {
  state: StudioState;
  scene: StudioScene;
  tab: SettingsTab;
  dispatch: (action: StudioAction) => void;
  onTabChange: (tab: SettingsTab) => void;
  onClose: () => void;
}

export function SettingsDialog({ state, scene, tab, dispatch, onTabChange, onClose }: SettingsDialogProps) {
  const registry = useModuleRegistry();
  const tabs = registry.getSettingsTabs(scene);
  const active = tabs.find((item) => item.id === tab) ?? tabs[0];
  const Panel = active?.component;

  return (
    <FloatingWindow title="Settings" className="settings-window" onClose={onClose} initialPosition={{ x: 330, y: 70 }}>
      <div className="settings-layout">
        <nav className="settings-tabs">
          {tabs.map((item) => (
            <button type="button" key={item.id} className={active?.id === item.id ? 'active' : ''} onClick={() => onTabChange(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <section className="settings-content">
          {Panel ? (
            <Panel
              state={state}
              project={state.project.document}
              scene={scene}
              dispatch={dispatch}
            />
          ) : (
            <div className="settings-section"><h3>No settings</h3><p className="settings-note">No module settings are registered for this scene.</p></div>
          )}
        </section>
      </div>
    </FloatingWindow>
  );
}
