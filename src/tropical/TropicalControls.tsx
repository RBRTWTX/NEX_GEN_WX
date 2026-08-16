import '../styles/tropical.css';
import { useTropicalRuntime } from './tropical-runtime-store';
import {
  tropicalStateForScene,
  tropicalTrackConeIsActive,
  type TropicalSceneState,
} from './tropical-types';
import type { MapScene } from '../types/domain';

interface TropicalControlsProps {
  scene: MapScene;
  onModuleStateChange: (patch: Partial<TropicalSceneState>) => void;
}

function stormLabel(storm: {
  name: string;
  stormType: string;
  wallet: string;
}): string {
  return `${storm.stormType} ${storm.name} · ${storm.wallet}`.replace(/\s+/g, ' ').trim();
}

export function TropicalControls({
  scene,
  onModuleStateChange,
}: TropicalControlsProps) {
  const state = tropicalStateForScene(scene);
  const runtime = useTropicalRuntime(scene.id);
  const trackConeActive = tropicalTrackConeIsActive(scene);
  const savedSelectionIsActive = Boolean(
    state.selectedStormId && runtime.storms.some((storm) => storm.id === state.selectedStormId),
  );
  const selectedId = savedSelectionIsActive
    ? state.selectedStormId ?? ''
    : runtime.selectedStormId ?? '';
  const selectedStorm = runtime.storms.find((storm) => storm.id === selectedId)
    ?? runtime.selectedStorm
    ?? null;

  if (!trackConeActive) {
    return (
      <div className="tropical-controls" data-operator-only="true">
        <div className="tropical-status">
          <strong>Tropical module foundation is active.</strong>
          <small>
            Official NHC forecast track, cone, forecast points, and watches/warnings are connected on the NHC Forecast Track and Cone scene.
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="tropical-controls" data-operator-only="true">
      <div className="tropical-controls__header">
        <div>
          <span className={`tropical-health-dot ${runtime.error ? 'degraded' : runtime.loading ? 'loading' : 'online'}`} />
          <strong>Official NHC Track / Cone</strong>
          <small>{runtime.provider || 'NOAA/NWS/NHC Tropical Weather Summary'}</small>
        </div>
      </div>

      <label className="tropical-storm-select">
        Active storm
        <select
          value={selectedId}
          disabled={!runtime.storms.length}
          onChange={(event) => onModuleStateChange({ selectedStormId: event.currentTarget.value || null })}
        >
          {!runtime.storms.length && <option value="">No active NHC cyclones</option>}
          {runtime.storms.map((storm) => (
            <option key={storm.id} value={storm.id}>{stormLabel(storm)}</option>
          ))}
        </select>
      </label>

      <div className="tropical-control-checks">
        <label className="setting-check">
          <input type="checkbox" checked={state.showTrack} onChange={(event) => onModuleStateChange({ showTrack: event.currentTarget.checked })} />
          <span>Forecast track</span>
        </label>
        <label className="setting-check">
          <input type="checkbox" checked={state.showCone} onChange={(event) => onModuleStateChange({ showCone: event.currentTarget.checked })} />
          <span>Forecast cone</span>
        </label>
        <label className="setting-check">
          <input type="checkbox" checked={state.showPoints} onChange={(event) => onModuleStateChange({ showPoints: event.currentTarget.checked })} />
          <span>Forecast points</span>
        </label>
        <label className="setting-check">
          <input type="checkbox" checked={state.showWarnings} onChange={(event) => onModuleStateChange({ showWarnings: event.currentTarget.checked })} />
          <span>Watches / warnings</span>
        </label>
        <label className="setting-check">
          <input type="checkbox" checked={state.autoRefreshEnabled} onChange={(event) => onModuleStateChange({ autoRefreshEnabled: event.currentTarget.checked })} />
          <span>Refresh automatically</span>
        </label>
      </div>

      <div className="tropical-action-row">
        <button
          type="button"
          onClick={() => onModuleStateChange({ refreshToken: state.refreshToken + 1 })}
        >
          Refresh now
        </button>
        <span>
          {runtime.featureCounts.points} pts · {runtime.featureCounts.track} track · {runtime.featureCounts.cone} cone · {runtime.featureCounts.warnings} warnings
        </span>
      </div>

      <div className={`tropical-status ${runtime.error ? 'tropical-status--warning' : ''}`}>
        <strong>
          {runtime.loading
            ? 'Loading official NHC tropical data…'
            : runtime.error
              ? 'NHC tropical data unavailable'
              : selectedStorm
                ? stormLabel(selectedStorm)
                : 'No active NHC tropical cyclones'}
        </strong>
        {selectedStorm && (
          <small>
            Advisory {selectedStorm.advisoryNumber || '—'}
            {selectedStorm.advisoryDate ? ` · ${selectedStorm.advisoryDate}` : ''}
            {selectedStorm.maxWindKt != null ? ` · ${selectedStorm.maxWindKt} kt` : ''}
            {selectedStorm.pressureMb != null ? ` · ${selectedStorm.pressureMb} mb` : ''}
          </small>
        )}
        {runtime.error && <small>{runtime.error}</small>}
      </div>
    </div>
  );
}
