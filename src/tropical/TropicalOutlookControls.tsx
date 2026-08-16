import '../styles/tropical-outlook.css';
import { useTropicalOutlookRuntime } from './tropical-outlook-runtime-store';
import {
  tropicalOutlookPeriodForScene,
  tropicalOutlookStateForScene,
  type TropicalOutlookSceneState,
} from './tropical-outlook-types';
import type { MapScene } from '../types/domain';

interface TropicalOutlookControlsProps {
  scene: MapScene;
  onModuleStateChange: (patch: Partial<TropicalOutlookSceneState>) => void;
}

export function TropicalOutlookControls({
  scene,
  onModuleStateChange,
}: TropicalOutlookControlsProps) {
  const period = tropicalOutlookPeriodForScene(scene);
  const state = tropicalOutlookStateForScene(scene);
  const runtime = useTropicalOutlookRuntime(scene.id);

  if (!period) {
    return (
      <div className="tropical-outlook-controls" data-operator-only="true">
        <div className="tropical-outlook-status">
          <strong>NHC Tropical Outlook</strong>
          <small>Select the NHC 2-Day or 7-Day Tropical Outlook product.</small>
        </div>
      </div>
    );
  }

  const sevenDay = period === '7day';
  return (
    <div className="tropical-outlook-controls" data-operator-only="true">
      <div className="tropical-outlook-controls__header">
        <div>
          <span className={`tropical-outlook-health-dot ${runtime.error ? 'degraded' : runtime.loading ? 'loading' : 'online'}`} />
          <strong>Official NHC {sevenDay ? '7-Day' : '2-Day'} Outlook</strong>
          <small>{runtime.provider || 'NOAA/NWS/NHC Tropical Weather Summary'}</small>
        </div>
      </div>

      <div className="tropical-outlook-control-checks">
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.showLocations}
            onChange={(event) => onModuleStateChange({ showLocations: event.currentTarget.checked })}
          />
          <span>Disturbance locations / probabilities</span>
        </label>
        {sevenDay && (
          <>
            <label className="setting-check">
              <input
                type="checkbox"
                checked={state.showRegions}
                onChange={(event) => onModuleStateChange({ showRegions: event.currentTarget.checked })}
              />
              <span>Potential development regions</span>
            </label>
            <label className="setting-check">
              <input
                type="checkbox"
                checked={state.showMotion}
                onChange={(event) => onModuleStateChange({ showMotion: event.currentTarget.checked })}
              />
              <span>Development motion</span>
            </label>
          </>
        )}
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.autoRefreshEnabled}
            onChange={(event) => onModuleStateChange({ autoRefreshEnabled: event.currentTarget.checked })}
          />
          <span>Refresh automatically</span>
        </label>
      </div>

      <div className="tropical-outlook-action-row">
        <button
          type="button"
          onClick={() => onModuleStateChange({ refreshToken: state.refreshToken + 1 })}
        >
          Refresh now
        </button>
        <span>
          {runtime.featureCounts.locations} locations
          {sevenDay ? ` · ${runtime.featureCounts.regions} regions · ${runtime.featureCounts.motion} motion` : ''}
        </span>
      </div>

      <div className={`tropical-outlook-status ${runtime.error ? 'tropical-outlook-status--warning' : ''}`}>
        <strong>
          {runtime.loading
            ? `Loading official NHC ${sevenDay ? '7-Day' : '2-Day'} outlook…`
            : runtime.error
              ? 'NHC tropical outlook unavailable'
              : runtime.featureCounts.locations + runtime.featureCounts.regions + runtime.featureCounts.motion > 0
                ? `Official NHC ${sevenDay ? '7-Day' : '2-Day'} outlook loaded`
                : `No ${sevenDay ? '7-Day' : '2-Day'} development areas currently published`}
        </strong>
        <small>
          Formation risk colors follow the NHC service: 30% or less, 40–60%, and 70% or greater.
        </small>
        {runtime.error && <small>{runtime.error}</small>}
      </div>
    </div>
  );
}
