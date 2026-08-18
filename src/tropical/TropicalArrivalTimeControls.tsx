import '../styles/tropical-arrival-time.css';
import type { MapScene } from '../types/domain';
import { useTropicalArrivalTimeRuntime } from './tropical-arrival-time-runtime-store';
import {
  tropicalArrivalTimeModeForScene,
  tropicalArrivalTimeStateForScene,
  type TropicalArrivalTimeSceneState,
} from './tropical-arrival-time-types';

interface TropicalArrivalTimeControlsProps {
  scene: MapScene;
  onModuleStateChange: (patch: Partial<TropicalArrivalTimeSceneState>) => void;
}

export function TropicalArrivalTimeControls({
  scene,
  onModuleStateChange,
}: TropicalArrivalTimeControlsProps) {
  const mode = tropicalArrivalTimeModeForScene(scene);
  const state = tropicalArrivalTimeStateForScene(scene);
  const runtime = useTropicalArrivalTimeRuntime(scene.id);

  if (!mode) {
    return (
      <div className="tropical-arrival-controls" data-operator-only="true">
        <strong>NHC Arrival Time</strong>
        <small>Select an NHC tropical-storm-force wind arrival-time product.</small>
      </div>
    );
  }

  const title = mode === 'earliest'
    ? 'Earliest Reasonable TS-Wind Arrival'
    : 'Most Likely TS-Wind Arrival';
  const explanation = mode === 'earliest'
    ? 'Preparation-oriented threshold: no more than a 10% chance of tropical-storm-force winds arriving before the labeled contour time.'
    : 'Median onset timing: tropical-storm-force winds are equally likely to begin before or after the labeled contour time.';

  return (
    <div className="tropical-arrival-controls" data-operator-only="true">
      <div className="tropical-arrival-controls__header">
        <div>
          <span className={`tropical-arrival-health-dot ${runtime.error ? 'degraded' : runtime.loading ? 'loading' : 'online'}`} />
          <strong>{title}</strong>
          <small>{runtime.provider || 'NOAA/NWS/NHC Tropical Weather Summary'}</small>
        </div>
      </div>

      <div className="tropical-arrival-summary">
        <strong>Official NHC labeled arrival contours</strong>
        <small>{explanation}</small>
      </div>

      <div className="tropical-arrival-checks">
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.showContours}
            onChange={(event) => onModuleStateChange({ showContours: event.currentTarget.checked })}
          />
          <span>Arrival contours</span>
        </label>
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.showLabels}
            onChange={(event) => onModuleStateChange({ showLabels: event.currentTarget.checked })}
          />
          <span>Contour time labels</span>
        </label>
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.showWindProbability}
            onChange={(event) => onModuleStateChange({ showWindProbability: event.currentTarget.checked })}
          />
          <span>34-kt probability background</span>
        </label>
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.autoRefreshEnabled}
            onChange={(event) => onModuleStateChange({ autoRefreshEnabled: event.currentTarget.checked })}
          />
          <span>Refresh automatically</span>
        </label>
      </div>

      <div className="tropical-arrival-action-row">
        <button
          type="button"
          onClick={() => onModuleStateChange({ refreshToken: state.refreshToken + 1 })}
        >
          Refresh now
        </button>
        <span>{runtime.contourCount} contours · {runtime.stormCount} systems</span>
      </div>

      <div className={`tropical-arrival-status ${runtime.error ? 'tropical-arrival-status--warning' : ''}`}>
        <strong>
          {runtime.loading
            ? 'Loading official NHC arrival-time contours…'
            : runtime.error
              ? 'NHC arrival-time data unavailable'
              : runtime.contourCount > 0
                ? 'Official NHC arrival-time contours loaded'
                : 'No current NHC arrival-time contours are published'}
        </strong>
        <small>
          Arrival times are labeled directly on the contour lines. The optional shaded background is the official cumulative 34-kt wind probability.
        </small>
        {runtime.error && <small>{runtime.error}</small>}
      </div>
    </div>
  );
}
