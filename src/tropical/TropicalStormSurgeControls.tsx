import '../styles/tropical-storm-surge.css';
import type { MapScene } from '../types/domain';
import { useTropicalStormSurgeRuntime } from './tropical-storm-surge-runtime-store';
import {
  tropicalStormSurgeProductForScene,
  tropicalStormSurgeStateForScene,
  type TropicalStormSurgeSceneState,
} from './tropical-storm-surge-types';

interface TropicalStormSurgeControlsProps {
  scene: MapScene;
  onModuleStateChange: (patch: Partial<TropicalStormSurgeSceneState>) => void;
}

export function TropicalStormSurgeControls({
  scene,
  onModuleStateChange,
}: TropicalStormSurgeControlsProps) {
  const product = tropicalStormSurgeProductForScene(scene);
  const state = tropicalStormSurgeStateForScene(scene);
  const runtime = useTropicalStormSurgeRuntime(scene.id);

  if (!product) {
    return (
      <div className="tropical-surge-controls" data-operator-only="true">
        <strong>NHC Storm Surge</strong>
        <small>Select Potential Storm Surge or Peak Storm Surge.</small>
      </div>
    );
  }

  const potential = product === 'potential';
  return (
    <div className="tropical-surge-controls" data-operator-only="true">
      <div className="tropical-surge-controls__header">
        <div>
          <span className={`tropical-surge-health-dot ${runtime.error ? 'degraded' : runtime.loading ? 'loading' : 'online'}`} />
          <strong>{potential ? 'Potential Storm Surge Flooding' : 'Peak Storm Surge Forecast'}</strong>
          <small>{runtime.provider || (potential
            ? 'NOAA/NWS/NHC Tropical Weather Summary'
            : 'NOAA/NWS/NHC Peak Storm Surge')}</small>
        </div>
      </div>

      <div className="tropical-surge-summary">
        <strong>Height above normally dry ground</strong>
        <small>
          {potential
            ? 'Official NHC reasonable worst-case potential inundation shading.'
            : 'Official NHC coastal forecast ranges from the tropical cyclone public advisory.'}
        </small>
      </div>

      <div className="tropical-surge-checks">
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.showSurge}
            onChange={(event) => onModuleStateChange({ showSurge: event.currentTarget.checked })}
          />
          <span>{potential ? 'Potential inundation' : 'Peak surge forecast'}</span>
        </label>
        {!potential && (
          <label className="setting-check">
            <input
              type="checkbox"
              checked={state.showLabels}
              onChange={(event) => onModuleStateChange({ showLabels: event.currentTarget.checked })}
            />
            <span>Forecast labels</span>
          </label>
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

      <div className="tropical-surge-action-row">
        <button
          type="button"
          onClick={() => onModuleStateChange({ refreshToken: state.refreshToken + 1 })}
        >
          Refresh now
        </button>
        <span>{runtime.featureCount} source features</span>
      </div>

      <div className={`tropical-surge-status ${runtime.error ? 'tropical-surge-status--warning' : ''}`}>
        <strong>
          {runtime.loading
            ? 'Loading official NHC storm-surge product…'
            : runtime.error
              ? 'NHC storm-surge data unavailable'
              : runtime.featureCount > 0
                ? 'Official NHC storm-surge product loaded'
                : 'No current NHC storm-surge product is published'}
        </strong>
        <small>
          {potential
            ? 'The map uses the official NHC inundation raster; leveed/intertidal context remains part of the NHC product.'
            : 'Peak-surge colors represent the upper value of the forecast range.'}
        </small>
        {runtime.error && <small>{runtime.error}</small>}
      </div>
    </div>
  );
}
