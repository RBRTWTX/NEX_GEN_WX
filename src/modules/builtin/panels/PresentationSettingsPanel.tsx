import type { ModuleSettingsPanelProps } from '../../../types/module';

export function PresentationSettingsPanel({ project }: ModuleSettingsPanelProps) {
  return (
    <div className="settings-section">
      <h3>Shows</h3>
      <p>{project.shows.length} show{project.shows.length === 1 ? '' : 's'} in this project.</p>
      <p className="settings-note">Use Show Builder for rundown order, per-scene hold time, transitions, and playback.</p>
    </div>
  );
}

export function ImportExportSettingsPanel() {
  return (
    <div className="settings-section">
      <h3>Import / Export</h3>
      <p className="settings-note">Project JSON and scene PNG actions remain in the bottom-right R3 operator dock.</p>
    </div>
  );
}
