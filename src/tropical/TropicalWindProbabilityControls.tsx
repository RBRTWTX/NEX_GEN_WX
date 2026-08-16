import '../styles/tropical-wind-probability.css';
import { useTropicalWindProbabilityRuntime } from './tropical-wind-probability-runtime-store';
import {
  tropicalWindProbabilityStateForScene,
  tropicalWindProbabilityThresholdForScene,
  type TropicalWindProbabilitySceneState,
  type TropicalWindProbabilityThreshold,
} from './tropical-wind-probability-types';
import type { MapScene } from '../types/domain';

interface TropicalWindProbabilityControlsProps {
  scene: MapScene;
  onModuleStateChange: (patch: Partial<TropicalWindProbabilitySceneState>) => void;
}

function thresholdDescription(threshold: TropicalWindProbabilityThreshold): string {
  if (threshold === 34) return 'Tropical-storm-force winds · 39 mph or greater';
  if (threshold === 50) return 'Strong tropical-storm winds · 58 mph or greater';
  return 'Hurricane-force winds · 74 mph or greater';
}

export function TropicalWindProbabilityControls({
  scene,
  onModuleStateChange,
}: TropicalWindProbabilityControlsProps) {
  const threshold = tropicalWindProbabilityThresholdForScene(scene);
  const state = tropicalWindProbabilityStateForScene(scene);
  const runtime = useTropicalWindProbabilityRuntime(scene.id);

  if (!threshold) {
    return (
      <div className="tropical-wind-probability-controls" data-operator-only="true">
        <div className="tropical-wind-probability-status">
          <strong>NHC Wind Probability</strong>
          <small>Select the 34-, 50-, or 64-knot NHC wind-probability product.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="tropical-wind-probability-controls" data-operator-only="true">
      <div className="tropical-wind-probability-controls__header">
        <div>
          <span className={`tropical-wind-probability-health-dot ${runtime.error ? 'degraded' : runtime.loading ? 'loading' : 'online'}`} />
          <strong>Official NHC {threshold}-kt Wind Probability</strong>
          <small>{runtime.provider || 'NOAA/NWS/NHC Tropical Weather Summary'}</small>
        </div>
      </div>

      <div className="tropical-wind-probability-summary">
        <strong>{thresholdDescription(threshold)}</strong>
        <small>Cumulative probability through the official NHC forecast period.</small>
      </div>

      <div className="tropical-wind-probability-checks">
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.showProbabilities}
            onChange={(event) => onModuleStateChange({ showProbabilities: event.currentTarget.checked })}
          />
          <span>Probability areas</span>
        </label>
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.showLabels}
            onChange={(event) => onModuleStateChange({ showLabels: event.currentTarget.checked })}
          />
          <span>Probability labels</span>
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

      <div className="tropical-wind-probability-action-row">
        <button
          type="button"
          onClick={() => onModuleStateChange({ refreshToken: state.refreshToken + 1 })}
        >
          Refresh now
        </button>
        <span>{runtime.featureCount} areas · {runtime.stormCount} systems</span>
      </div>

      <div className={`tropical-wind-probability-status ${runtime.error ? 'tropical-wind-probability-status--warning' : ''}`}>
        <strong>
          {runtime.loading
            ? `Loading official NHC ${threshold}-kt probabilities…`
            : runtime.error
              ? 'NHC wind probabilities unavailable'
              : runtime.featureCount > 0
                ? `Official NHC ${threshold}-kt wind probabilities loaded`
                : `No current NHC ${threshold}-kt wind-probability areas are published`}
        </strong>
        <small>
          NHC probability colors are preserved. Areas below 5% are intentionally transparent.
        </small>
        {runtime.error && <small>{runtime.error}</small>}
      </div>
    </div>
  );
}
